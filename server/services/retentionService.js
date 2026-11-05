import cron from 'node-cron';
import AttendanceSession from '../models/AttendanceSession.js';
import MessageLog from '../models/MessageLog.js';
import SystemConfig from '../models/SystemConfig.js';

export const runRetentionCleanup = async () => {
  try {
    const config = (await SystemConfig.findOne()) || { retentionYears: 2 };
    const years = config.retentionYears || 2;
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - years);

    const cutoffDateString = cutoffDate.toISOString().split('T')[0];
    console.log(`🧹 [RETENTION] Running auto-cleanup for records older than ${years} years (before ${cutoffDateString})...`);

    // Delete attendance sessions older than 2 years
    const sessionResult = await AttendanceSession.deleteMany({
      date: { $lt: cutoffDateString },
    });

    // Delete old message logs older than 2 years
    const logResult = await MessageLog.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    console.log(
      `✅ [RETENTION] Cleaned up ${sessionResult.deletedCount} old attendance sessions and ${logResult.deletedCount} old message logs.`
    );

    return {
      success: true,
      sessionsDeleted: sessionResult.deletedCount,
      logsDeleted: logResult.deletedCount,
      cutoffDate: cutoffDateString,
    };
  } catch (error) {
    console.error('❌ [RETENTION] Error running retention cleanup:', error);
    return { success: false, error: error.message };
  }
};

// Schedule automated monthly cleanup (Runs 1st of every month at 3:00 AM PKT)
export const initRetentionScheduler = () => {
  cron.schedule('0 3 1 * *', () => {
    console.log('⏰ Monthly scheduled retention cleanup starting...');
    runRetentionCleanup();
  });
  console.log('📅 Retention scheduler initialized (Runs monthly to purge records > 2 years).');
};
