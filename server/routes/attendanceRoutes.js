import express from 'express';
import AttendanceSession from '../models/AttendanceSession.js';
import Student from '../models/Student.js';
import ClassSection from '../models/ClassSection.js';
import User from '../models/User.js';
import TruancyAlert from '../models/TruancyAlert.js';
import messagingQueue from '../services/messagingQueue.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * Validates attendance date range for teachers:
 * - Allowed past: Maximum 1 day ago (Yesterday). Anything older is forbidden.
 * - Allowed future: Current week upcoming days only (up to Sunday). Next week and beyond is forbidden.
 * - Admins and Principals bypass these restrictions for administrative corrections.
 */
export const validateAttendanceDateForUser = (dateStr, userRole) => {
  if (userRole === 'admin' || userRole === 'principal') {
    return { valid: true };
  }

  if (!dateStr) {
    return { valid: false, message: 'Attendance date is required.' };
  }

  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return { valid: false, message: 'Invalid date format. Expected YYYY-MM-DD.' };
  }

  const [tYear, tMonth, tDay] = parts.map(Number);
  const targetDate = new Date(Date.UTC(tYear, tMonth - 1, tDay));

  // Current date in PKT (UTC + 5)
  const now = new Date();
  const pktOffsetMinutes = 5 * 60;
  const currentPktMillis = now.getTime() + (pktOffsetMinutes + now.getTimezoneOffset()) * 60000;
  const pktDate = new Date(currentPktMillis);
  const todayDate = new Date(Date.UTC(pktDate.getFullYear(), pktDate.getMonth(), pktDate.getDate()));

  // Yesterday (1 day before today in PKT)
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setUTCDate(todayDate.getUTCDate() - 1);

  // Check 1: Past boundary (cannot be older than yesterday)
  if (targetDate < yesterdayDate) {
    return {
      valid: false,
      message:
        'Faculty Policy Restriction: Teachers cannot record or edit attendance older than yesterday. For older corrections, contact College Administration.',
    };
  }

  // Check 2: Future boundary (cannot be next week; only up to Sunday of current week)
  const dayOfWeek = todayDate.getUTCDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const endOfWeekDate = new Date(todayDate);
  endOfWeekDate.setUTCDate(todayDate.getUTCDate() + daysUntilSunday);

  if (targetDate > endOfWeekDate) {
    return {
      valid: false,
      message:
        'Faculty Policy Restriction: Teachers cannot create attendance sessions for next week. You can only record for today and upcoming days of the current week.',
    };
  }

  return { valid: true };
};

// Helper to calculate consecutive absences and apply confirmation triggers
const finalizeSessionConfirmation = async (session, user) => {
  session.isConfirmed = true;
  session.confirmedAt = new Date();
  session.confirmedBy = user._id;

  for (const record of session.records) {
    const student = await Student.findById(record.studentId);
    if (!student) continue;

    let consecutive = student.consecutiveAbsences || 0;

    if (record.status === 'ABSENT') {
      consecutive += 1;
      student.totalDaysAbsent = (student.totalDaysAbsent || 0) + 1;

      // 🚨 CRITICAL RULE: If absent 3 or more consecutive days, trigger/update Truancy Alert
      if (consecutive >= 3) {
        await TruancyAlert.findOneAndUpdate(
          { studentId: student._id, status: { $in: ['ACTIVE', 'PARENT_CONTACTED'] } },
          {
            studentId: student._id,
            classSectionId: session.classSectionId,
            programId: session.programId,
            consecutiveDays: consecutive,
            dateTriggered: session.date,
            status: 'ACTIVE',
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    } else if (record.status === 'PRESENT') {
      consecutive = 0; // Reset consecutive counter
      student.totalDaysPresent = (student.totalDaysPresent || 0) + 1;
    } else if (record.status === 'LEAVE') {
      student.totalDaysLeave = (student.totalDaysLeave || 0) + 1;
    }

    student.consecutiveAbsences = consecutive;
    record.consecutiveAbsences = consecutive;
    await student.save();
  }

  // Queue absentees for automated parent messaging
  if (session.absentCount > 0) {
    session.messagingStatus = 'PENDING';
    await session.save();
    messagingQueue.enqueueSessionAbsentees(session._id);
  } else {
    session.messagingStatus = 'COMPLETED';
    await session.save();
  }

  return session;
};

// @route   POST /api/attendance/submit (Save Draft or Save & Confirm)
router.post('/submit', protect, async (req, res, next) => {
  try {
    const { date, classSectionId, programId, records, academicYear, isConfirmed } = req.body;

    if (!date || !classSectionId || !programId || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Invalid attendance submission payload.' });
    }

    // Enforce date policy for teachers
    const dateValidation = validateAttendanceDateForUser(date, req.user.role);
    if (!dateValidation.valid) {
      return res.status(403).json({ success: false, message: dateValidation.message });
    }

    const idempotencyKey = `${date}_${classSectionId}`;
    let session = await AttendanceSession.findOne({ idempotencyKey });

    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    const formattedRecords = records.map((item) => {
      if (item.status === 'PRESENT') presentCount++;
      else if (item.status === 'ABSENT') absentCount++;
      else if (item.status === 'LEAVE') leaveCount++;

      return {
        studentId: item.studentId,
        rollNo: item.rollNo,
        studentName: item.studentName,
        fatherName: item.fatherName || '',
        parentPhone: item.parentPhone,
        status: item.status,
        consecutiveAbsences: item.consecutiveAbsences || 0,
      };
    });

    if (session) {
      session.records = formattedRecords;
      session.presentCount = presentCount;
      session.absentCount = absentCount;
      session.leaveCount = leaveCount;
      session.totalStudents = formattedRecords.length;
      session.teacherId = req.user._id;
    } else {
      session = new AttendanceSession({
        idempotencyKey,
        date,
        academicYear: academicYear || '2026-2027',
        classSectionId,
        programId,
        teacherId: req.user._id,
        totalStudents: formattedRecords.length,
        presentCount,
        absentCount,
        leaveCount,
        records: formattedRecords,
        isConfirmed: false,
        messagingStatus: 'DRAFT',
      });
    }

    await session.save();

    // If teacher explicitly confirmed the attendance
    if (isConfirmed) {
      session = await finalizeSessionConfirmation(session, req.user);
    }

    res.status(200).json({
      success: true,
      message: session.isConfirmed
        ? `Attendance confirmed! ${session.presentCount} Present, ${session.absentCount} Absent. Notifications queued.`
        : 'Attendance draft saved successfully. You can review or edit before confirming.',
      session,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/attendance/confirm/:sessionId (Explicit confirmation endpoint)
router.post('/confirm/:sessionId', protect, async (req, res, next) => {
  try {
    let session = await AttendanceSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Attendance session not found.' });
    }

    // Enforce date policy for teachers
    const dateValidation = validateAttendanceDateForUser(session.date, req.user.role);
    if (!dateValidation.valid) {
      return res.status(403).json({ success: false, message: dateValidation.message });
    }

    session = await finalizeSessionConfirmation(session, req.user);

    res.json({
      success: true,
      message: `Attendance confirmed and finalized! ${session.absentCount} absentee notifications queued for dispatch.`,
      session,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/attendance/batch-sync (PWA Offline Background Sync)
router.post('/batch-sync', protect, async (req, res, next) => {
  try {
    const { sessions } = req.body;
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ success: false, message: 'No offline sessions provided.' });
    }

    const syncedResults = [];
    for (const item of sessions) {
      // Validate date for teacher role
      const dateValidation = validateAttendanceDateForUser(item.date, req.user.role);
      if (!dateValidation.valid) {
        continue; // Skip out-of-bounds offline sessions
      }

      const idempotencyKey = `${item.date}_${item.classSectionId}`;
      let session = await AttendanceSession.findOne({ idempotencyKey });

      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;

      const formattedRecords = item.records.map((r) => {
        if (r.status === 'PRESENT') presentCount++;
        else if (r.status === 'ABSENT') absentCount++;
        else if (r.status === 'LEAVE') leaveCount++;
        return { ...r };
      });

      if (!session) {
        session = await AttendanceSession.create({
          idempotencyKey,
          date: item.date,
          academicYear: item.academicYear || '2026-2027',
          classSectionId: item.classSectionId,
          programId: item.programId,
          teacherId: req.user._id,
          totalStudents: formattedRecords.length,
          presentCount,
          absentCount,
          leaveCount,
          records: formattedRecords,
          source: 'OFFLINE_SYNC',
          isConfirmed: true,
        });
        await finalizeSessionConfirmation(session, req.user);
      }
      syncedResults.push(session.idempotencyKey);
    }

    res.json({
      success: true,
      message: `Synchronized ${syncedResults.length} offline sessions.`,
      syncedKeys: syncedResults,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/attendance/session
router.get('/session', protect, async (req, res, next) => {
  try {
    const { date, classSectionId } = req.query;
    if (!date || !classSectionId) {
      return res.status(400).json({ success: false, message: 'Date and classSectionId query parameters required.' });
    }

    const session = await AttendanceSession.findOne({ date, classSectionId })
      .populate('classSectionId', 'name yearLevel section')
      .populate('programId', 'name code')
      .populate('teacherId', 'fullName username');

    res.json({ success: true, session });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/attendance/class-stats/:classSectionId (Detailed Student Attendance Breakdown for Teachers & Admin)
router.get('/class-stats/:classSectionId', protect, async (req, res, next) => {
  try {
    const { classSectionId } = req.params;

    let studentFilter = { isActive: true };
    let sessionFilter = { isConfirmed: true };

    if (req.user.role === 'teacher') {
      const teacherUser = await User.findById(req.user._id).select('assignedClasses').lean();
      const userAssigned = (teacherUser?.assignedClasses || []).map((c) =>
        typeof c === 'object' ? c._id.toString() : c.toString()
      );
      // Fetch all classes where teacher is Incharge OR explicitly assigned
      const teacherClasses = await ClassSection.find({
        $or: [{ inchargeTeacherId: req.user._id }, { _id: { $in: userAssigned } }],
      })
        .select('_id')
        .lean();
      const allowedClassIds = teacherClasses.map((c) => c._id.toString());

      if (classSectionId === 'all') {
        if (allowedClassIds.length > 0) {
          studentFilter.classSectionId = { $in: allowedClassIds };
          sessionFilter.classSectionId = { $in: allowedClassIds };
        }
      } else {
        if (allowedClassIds.length > 0 && !allowedClassIds.includes(classSectionId)) {
          return res.status(403).json({ success: false, message: 'You are not assigned to this class section.' });
        }
        studentFilter.classSectionId = classSectionId;
        sessionFilter.classSectionId = classSectionId;
      }
    } else {
      // Admin / Principal
      if (classSectionId !== 'all') {
        studentFilter.classSectionId = classSectionId;
        sessionFilter.classSectionId = classSectionId;
      }
    }

    // Retrieve active students for this class section (or all assigned)
    const students = await Student.find(studentFilter)
      .populate('classSectionId', 'name yearLevel section')
      .populate('programId', 'name code')
      .sort({ rollNo: 1 })
      .lean();

    // Count confirmed attendance sessions
    const totalSessions = await AttendanceSession.countDocuments(sessionFilter);

    let totalAttendancePercentageSum = 0;
    let shortageCount = 0;
    let chronicTruantsCount = 0;

    const studentStats = students.map((std) => {
      const present = std.totalDaysPresent || 0;
      const absent = std.totalDaysAbsent || 0;
      const leave = std.totalDaysLeave || 0;
      const studentTotalDays = present + absent + leave;

      // Base percentage calculation on total class sessions if > 0, else student's marked days
      const sessionBase = totalSessions > 0 ? totalSessions : studentTotalDays;
      const percentage = sessionBase > 0 ? Number(((present / sessionBase) * 100).toFixed(1)) : 100.0;

      totalAttendancePercentageSum += percentage;

      if (percentage < 75.0) shortageCount++;
      if ((std.consecutiveAbsences || 0) >= 3) chronicTruantsCount++;

      let bracket = 'GOOD'; // >= 75%
      if (percentage < 60.0) bracket = 'CRITICAL';
      else if (percentage < 75.0) bracket = 'WARNING';

      return {
        _id: std._id,
        rollNo: std.rollNo,
        fullName: std.fullName,
        fatherName: std.fatherName,
        caste: std.caste || '',
        gender: std.gender || 'Male',
        className: std.classSectionId?.name || 'Class',
        classSectionId: std.classSectionId?._id || std.classSectionId,
        programCode: std.programId?.code || '',
        parentPhone: std.parentPhone,
        studentPhone: std.studentPhone || '',
        totalDaysPresent: present,
        totalDaysAbsent: absent,
        totalDaysLeave: leave,
        consecutiveAbsences: std.consecutiveAbsences || 0,
        percentage,
        bracket,
      };
    });

    const avgAttendance =
      students.length > 0 ? Number((totalAttendancePercentageSum / students.length).toFixed(1)) : 0;

    res.json({
      success: true,
      classSectionId,
      summary: {
        totalStudents: students.length,
        totalSessions,
        avgAttendance,
        shortageCount,
        chronicTruantsCount,
      },
      students: studentStats,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/attendance/history (Multi-faceted filter for Admin & Teachers)
router.get('/history', protect, async (req, res, next) => {
  try {
    const { programId, classSectionId, date, startDate, endDate, status, onlyChronicTruants } = req.query;
    const filter = {};

    if (programId) filter.programId = programId;
    if (classSectionId) filter.classSectionId = classSectionId;

    if (date) {
      filter.date = date;
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    let sessions = await AttendanceSession.find(filter)
      .populate('classSectionId', 'name yearLevel section')
      .populate('programId', 'name code')
      .populate('teacherId', 'fullName')
      .sort({ date: -1 });

    // Client-level status filtering if specified
    if (status && status !== 'ALL') {
      sessions = sessions.map((s) => {
        const filteredRecords = s.records.filter((r) => r.status === status);
        return {
          ...s.toObject(),
          records: filteredRecords,
        };
      });
    }

    if (onlyChronicTruants === 'true') {
      sessions = sessions.map((s) => {
        const filteredRecords = s.records.filter((r) => r.consecutiveAbsences >= 3);
        return {
          ...s.toObject(),
          records: filteredRecords,
        };
      });
    }

    res.json({ success: true, count: sessions.length, sessions });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/attendance/session/:id (Admin only)
router.delete('/session/:id', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const session = await AttendanceSession.findByIdAndDelete(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Attendance session not found.' });
    }
    res.json({ success: true, message: 'Attendance session deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
