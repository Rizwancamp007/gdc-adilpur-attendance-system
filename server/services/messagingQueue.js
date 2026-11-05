import MessageLog from '../models/MessageLog.js';
import SystemConfig from '../models/SystemConfig.js';
import AttendanceSession from '../models/AttendanceSession.js';
import Student from '../models/Student.js';
import { sendWhatsAppMessage, isWhatsAppConnected } from './whatsappService.js';
import { sendCapcomSms } from './smsService.js';

class MessagingQueue {
  constructor() {
    this.isProcessing = false;
    this.queue = [];
    this.currentJob = null;
  }

  // Sleep utility for throttle
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Enqueue absentee records from an attendance session
  async enqueueSessionAbsentees(sessionId) {
    try {
      const session = await AttendanceSession.findById(sessionId).populate('classSectionId');
      if (!session) return;

      const config = (await SystemConfig.findOne()) || (await SystemConfig.create({}));
      if (!config.autoSendOnSubmit) {
        console.log('ℹ️ Auto-send is disabled in SystemConfig. Skipping automatic queue.');
        return;
      }

      const absentees = session.records.filter((r) => r.status === 'ABSENT');
      if (absentees.length === 0) {
        session.messagingStatus = 'COMPLETED';
        await session.save();
        return;
      }

      session.messagingStatus = 'IN_PROGRESS';
      await session.save();

      const className = session.classSectionId?.name || 'Class';
      const todayDate = session.date;

      // Determine active channel: WhatsApp, SMS Gateway, or Default
      const hasWhatsApp = Boolean(config.whatsappLinked && isWhatsAppConnected());
      const hasSms = Boolean(config.smsCapcomLogin && config.smsCapcomPassword);

      let activeChannel = config.defaultChannel || 'WHATSAPP';
      if (hasWhatsApp && !hasSms) {
        activeChannel = 'WHATSAPP';
      } else if (!hasWhatsApp && hasSms) {
        activeChannel = 'SMS_GATEWAY';
      } else if (hasWhatsApp && hasSms) {
        activeChannel = config.defaultChannel || 'WHATSAPP';
      }

      let enqueuedCount = 0;
      let duplicateSkippedCount = 0;

      for (const record of absentees) {
        // 🚨 DAILY DEDUPLICATION CHECK:
        // Ensure no student receives duplicate absentee notices on the same date
        const todayStart = new Date(todayDate + 'T00:00:00.000Z');
        const todayEnd = new Date(todayDate + 'T23:59:59.999Z');

        const existingNotificationToday = await MessageLog.findOne({
          studentId: record.studentId,
          createdAt: { $gte: todayStart, $lte: todayEnd },
          status: { $in: ['QUEUED', 'SENDING', 'SENT'] },
        });

        if (existingNotificationToday) {
          console.log(
            `ℹ️ [DEDUP] Already notified parent of Roll #${record.rollNo} (${record.studentName}) today. Skipping duplicate.`
          );
          duplicateSkippedCount++;
          continue;
        }

        // Retrieve student's fatherName and gender
        const student = await Student.findById(record.studentId).select('fatherName gender');
        const fatherName = student?.fatherName || 'والد';
        const isFemale = String(student?.gender || '').toLowerCase() === 'female';
        const relation = isFemale ? 'توهان جي نياڻي' : 'توهان جو پٽ';

        // Build personalized template with flexible case-insensitive tags ({name}, {fathername}, {relationship}, {date}, etc.)
        let messageText = (config.messageTemplate || '')
          .replace(/{(?:STUDENT_NAME|STUDENT|NAME)}/gi, record.studentName)
          .replace(/{(?:FATHER_NAME|FATHERNAME|FATHER)}/gi, fatherName)
          .replace(/{(?:RELATION|RELATIONSHIP)}/gi, relation)
          .replace(/{(?:ROLL_NO|ROLLNO|ROLL)}/gi, record.rollNo)
          .replace(/{(?:CLASS_NAME|CLASSNAME|CLASS)}/gi, className)
          .replace(/{DATE}/gi, todayDate);

        // Auto-adapt if template contains legacy phrases
        if (messageText.includes('Mohtaram Walid')) {
          messageText = messageText.replace(/Mohtaram Walid/g, `Mohtaram ${fatherName}`);
        }
        if (isFemale && messageText.includes('apka farzand')) {
          messageText = messageText.replace(/apka farzand/g, 'apki dukhtar');
        }
        if (isFemale && messageText.includes('توهان جو پٽ')) {
          messageText = messageText.replace(/توهان جو پٽ/g, 'توهان جي نياڻي');
        }

        // Create MessageLog entry
        const log = await MessageLog.create({
          recipientPhone: record.parentPhone,
          studentId: record.studentId,
          studentName: record.studentName,
          rollNo: record.rollNo,
          classSectionName: className,
          messageText,
          channel: activeChannel,
          status: 'QUEUED',
        });

        this.queue.push(log._id.toString());
        enqueuedCount++;
      }

      console.log(
        `📥 Enqueued ${enqueuedCount} absentee messages (Skipped ${duplicateSkippedCount} duplicates) for session ${sessionId}`
      );

      // Trigger runner if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    } catch (error) {
      console.error('❌ Error enqueuing absentees:', error);
    }
  }

  // Process the queue with 15-20s pacing
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const config = (await SystemConfig.findOne()) || { dispatchIntervalSeconds: 18 };
      const intervalMs = (config.dispatchIntervalSeconds || 18) * 1000;

      while (this.queue.length > 0) {
        const messageLogId = this.queue.shift();
        const log = await MessageLog.findById(messageLogId);
        if (!log) continue;

        this.currentJob = {
          id: log._id,
          studentName: log.studentName,
          recipientPhone: log.recipientPhone,
          channel: log.channel,
          remainingInQueue: this.queue.length,
        };

        log.status = 'SENDING';
        await log.save();

        console.log(
          `🚀 [DISPATCH] Sending to ${log.studentName} (${log.recipientPhone}) via ${log.channel}. Queue remaining: ${this.queue.length}`
        );

        // Dispatch via WhatsApp or Capcom6 SMS Gateway
        if (log.channel === 'WHATSAPP') {
          if (isWhatsAppConnected()) {
            try {
              await sendWhatsAppMessage(log.recipientPhone, log.messageText);
              log.status = 'SENT';
              log.sentAt = new Date();
              console.log(`✅ [WHATSAPP] Delivered absentee alert to ${log.recipientPhone} (${log.studentName})`);
            } catch (waErr) {
              console.error(`❌ [WHATSAPP] Failed to send to ${log.recipientPhone}:`, waErr.message);
              log.status = 'FAILED';
              log.errorMessage = waErr.message;
            }
          } else {
            console.warn(`⚠️ [WHATSAPP] Device is not linked. Absentees remain available for 1-click manual dispatch.`);
            log.status = 'FAILED';
            log.errorMessage = 'WhatsApp bot not linked. Use 1-Click WhatsApp or connect phone in Messaging Hub.';
          }
        } else if (log.channel === 'SMS_GATEWAY') {
          try {
            await sendCapcomSms(log.recipientPhone, log.messageText);
            log.status = 'SENT';
            log.sentAt = new Date();
            console.log(`✅ [SMS GATEWAY] Delivered SMS alert to ${log.recipientPhone} (${log.studentName})`);
          } catch (smsErr) {
            console.error(`❌ [SMS GATEWAY] Failed to send to ${log.recipientPhone}:`, smsErr.message);
            log.status = 'FAILED';
            log.errorMessage = smsErr.message;
          }
        }

        await log.save();

        // Safe pacing throttle (18s) to prevent Telco SIM or WhatsApp ban
        if (this.queue.length > 0) {
          console.log(`⏳ Pacer: Waiting ${config.dispatchIntervalSeconds || 18}s before next message...`);
          await this.sleep(intervalMs);
        }
      }

      this.currentJob = null;
      console.log('✅ Messaging queue completed all active dispatches.');
    } catch (error) {
      console.error('❌ Error processing messaging queue:', error);
    } finally {
      this.isProcessing = false;
      this.currentJob = null;
    }
  }

  // Live status for Admin Dashboard
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.queue.length,
      currentJob: this.currentJob,
    };
  }
}

export const messagingQueue = new MessagingQueue();
export default messagingQueue;
