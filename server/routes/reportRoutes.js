import express from 'express';
import AttendanceSession from '../models/AttendanceSession.js';
import Student from '../models/Student.js';
import ClassSection from '../models/ClassSection.js';
import TruancyAlert from '../models/TruancyAlert.js';
import { generateAttendanceExcel } from '../services/exportService.js';
import { runRetentionCleanup } from '../services/retentionService.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/reports/overview (Dashboard stats)
router.get('/overview', protect, async (req, res, next) => {
  try {
    // Current date in Pakistan Time (Asia/Karachi, UTC+5)
    let today = req.query.date;
    if (!today) {
      try {
        today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
      } catch {
        today = new Date().toISOString().split('T')[0];
      }
    }

    // Counts
    const totalStudents = await Student.countDocuments({ isActive: true });
    const totalClasses = await ClassSection.countDocuments({ isActive: true });
    const activeTruancyAlerts = await TruancyAlert.countDocuments({ status: 'ACTIVE' });

    // Today's attendance sessions
    const todaySessions = await AttendanceSession.find({ date: today });
    const classesMarkedToday = todaySessions.length;

    let presentToday = 0;
    let absentToday = 0;

    for (const s of todaySessions) {
      presentToday += s.presentCount;
      absentToday += s.absentCount;
    }

    const totalMarked = presentToday + absentToday;
    const turnoutPercentage = totalMarked > 0 ? ((presentToday / totalMarked) * 100).toFixed(1) : 0;

    // Check gateway status and failed dispatches
    const SystemConfig = (await import('../models/SystemConfig.js')).default;
    const MessageLog = (await import('../models/MessageLog.js')).default;
    const config = (await SystemConfig.findOne()) || {};

    const todayDateStart = new Date(today + 'T00:00:00.000Z');
    const failedToday = await MessageLog.countDocuments({
      status: 'FAILED',
      createdAt: { $gte: todayDateStart },
    });

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalClasses,
        classesMarkedToday,
        presentToday,
        absentToday,
        turnoutPercentage: Number(turnoutPercentage),
        activeTruancyAlerts,
        date: today,
        whatsappLinked: Boolean(config.whatsappLinked),
        smsConfigured: Boolean(config.smsGatewayApiKey),
        failedToday,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/reports/export-excel (Download formatted Excel sheet)
router.get('/export-excel', protect, async (req, res, next) => {
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

    const sessions = await AttendanceSession.find(filter)
      .populate('classSectionId', 'name')
      .populate('programId', 'name')
      .sort({ date: -1 });

    const buffer = generateAttendanceExcel(sessions, {
      status,
      onlyChronicTruants: onlyChronicTruants === 'true',
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=GDC_Adilpur_Attendance_${date || 'Report'}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/reports/run-retention (Admin only - Requires administrator password confirmation)
router.post('/run-retention', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const { adminPassword } = req.body;
    if (!adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Administrator password confirmation is required to run manual retention cleanup.',
      });
    }

    const User = (await import('../models/User.js')).default;
    const bcrypt = (await import('bcryptjs')).default;
    const adminUser = await User.findById(req.user._id);
    if (!adminUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(adminPassword, adminUser.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect administrator password. Purge aborted.' });
    }

    const result = await runRetentionCleanup();
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
});

export default router;
