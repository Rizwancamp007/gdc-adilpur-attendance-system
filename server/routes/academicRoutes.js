import express from 'express';
import Program from '../models/Program.js';
import ClassSection from '../models/ClassSection.js';
import Student from '../models/Student.js';
import AttendanceSession from '../models/AttendanceSession.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { migrateTo4Cohorts } from '../services/cohortMigration.js';
import { seed4CohortsAndStudents } from '../services/seedCollegeService.js';

const router = express.Router();

// ─────────── PROGRAMS ───────────

// @route   GET /api/academic/programs
router.get('/programs', protect, async (req, res, next) => {
  try {
    const programs = await Program.find().sort({ level: 1, name: 1 }).lean();
    res.json({ success: true, count: programs.length, programs });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/academic/programs (Admin only)
router.post('/programs', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const { name, code, level, durationYears, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Program name and code are required.' });
    }

    const program = await Program.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      level: level || 'Intermediate',
      durationYears: Number(durationYears) || 2,
      description: description || '',
    });

    res.status(201).json({ success: true, program });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A program with this name or code already exists.' });
    }
    next(error);
  }
});

// @route   PUT /api/academic/programs/:id (Admin only)
router.put('/programs/:id', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const { name, code, level, durationYears, description } = req.body;
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (code) updateData.code = code.trim().toUpperCase();
    if (level) updateData.level = level;
    if (durationYears !== undefined) updateData.durationYears = Number(durationYears);
    if (description !== undefined) updateData.description = description;

    const program = await Program.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!program) return res.status(404).json({ success: false, message: 'Program not found.' });
    res.json({ success: true, program });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A program with this name or code already exists.' });
    }
    next(error);
  }
});

// @route   DELETE /api/academic/programs/:id (Admin only)
router.delete('/programs/:id', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const programId = req.params.id;

    // Safety checks: ensure no classes or students depend on this program
    const classCount = await ClassSection.countDocuments({ programId });
    if (classCount > 0) {
      if (req.query.force === 'true') {
        await ClassSection.deleteMany({ programId });
      } else {
        return res.status(400).json({
          success: false,
          message: `Cannot delete program: ${classCount} active class section(s) are linked to it. Please reassign or delete those classes first.`,
        });
      }
    }

    const studentCount = await Student.countDocuments({ programId });
    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete program: ${studentCount} enrolled student(s) are linked to it. Please reassign or remove those students first.`,
      });
    }

    const deleted = await Program.findByIdAndDelete(programId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Program not found.' });

    res.json({ success: true, message: 'Program deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

// ─────────── CLASS SECTIONS ───────────

// @route   GET /api/academic/classes
router.get('/classes', protect, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.programId) filter.programId = req.query.programId;
    if (req.query.academicYear) filter.academicYear = req.query.academicYear;

    // If teacher, return all classes where they are incharge OR in their assignedClasses
    if (req.user && req.user.role === 'teacher') {
      const teacherUser = await User.findById(req.user._id);
      const assigned = (teacherUser?.assignedClasses || []).map((c) => (c._id ? c._id : c));
      filter.$or = [{ inchargeTeacherId: req.user._id }, { _id: { $in: assigned } }];
    }

    const classes = await ClassSection.find(filter)
      .populate('programId', 'name code level durationYears')
      .populate('inchargeTeacherId', 'fullName username department')
      .sort({ academicYear: -1, name: 1 })
      .lean();

    res.json({ success: true, count: classes.length, classes });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/academic/classes (Admin only)
router.post('/classes', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const { name, programId, academicYear, yearLevel, section, shift, inchargeTeacherId } = req.body;

    if (!name || !programId || !yearLevel) {
      return res.status(400).json({ success: false, message: 'Class name, program, and year/level are required.' });
    }

    const newClass = await ClassSection.create({
      name: name.trim(),
      programId,
      academicYear: academicYear || '2026-2027',
      yearLevel: yearLevel.trim(),
      section: (section || 'A').trim().toUpperCase(),
      shift: shift || 'Morning',
      inchargeTeacherId: inchargeTeacherId || null,
    });

    // Bidirectional sync: If incharge is selected, ensure this class is in the teacher's assignedClasses
    if (inchargeTeacherId) {
      await User.findByIdAndUpdate(inchargeTeacherId, {
        $addToSet: { assignedClasses: newClass._id },
      });
    }

    const populated = await newClass.populate('programId inchargeTeacherId');
    res.status(201).json({ success: true, classSection: populated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A class section with this year level and section already exists for this program and academic year.',
      });
    }
    next(error);
  }
});

// @route   PUT /api/academic/classes/:id (Admin only)
router.put('/classes/:id', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const { name, programId, academicYear, yearLevel, section, shift, inchargeTeacherId } = req.body;
    const updateData = {};

    if (name) updateData.name = name.trim();
    if (programId) updateData.programId = programId;
    if (academicYear) updateData.academicYear = academicYear.trim();
    if (yearLevel) updateData.yearLevel = yearLevel.trim();
    if (section) updateData.section = section.trim().toUpperCase();
    if (shift) updateData.shift = shift;
    updateData.inchargeTeacherId = inchargeTeacherId || null;

    const updated = await ClassSection.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('programId inchargeTeacherId');

    if (!updated) return res.status(404).json({ success: false, message: 'Class section not found.' });

    // Bidirectional sync: If incharge is selected, ensure this class is in the teacher's assignedClasses
    if (inchargeTeacherId) {
      await User.findByIdAndUpdate(inchargeTeacherId, {
        $addToSet: { assignedClasses: req.params.id },
      });
    }

    res.json({ success: true, classSection: updated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A class section with this year level and section already exists for this program and academic year.',
      });
    }
    next(error);
  }
});

// @route   DELETE /api/academic/classes/:id (Admin only)
router.delete('/classes/:id', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const classId = req.params.id;

    // Safety checks: check if students are currently enrolled in this class
    const studentCount = await Student.countDocuments({ classSectionId: classId });
    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete class section: ${studentCount} enrolled student(s) belong to this class. Please reassign or delete the students first.`,
      });
    }

    // Safety check: check if historical attendance sessions exist
    const sessionCount = await AttendanceSession.countDocuments({ classSectionId: classId });
    if (sessionCount > 0) {
      if (req.query.force === 'true') {
        await AttendanceSession.deleteMany({ classSectionId: classId });
      } else {
        return res.status(400).json({
          success: false,
          message: `Cannot delete class section: ${sessionCount} attendance session records exist for it. Please archive instead or confirm deletion.`,
        });
      }
    }

    const deleted = await ClassSection.findByIdAndDelete(classId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Class section not found.' });

    res.json({ success: true, message: 'Class section deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/academic/migrate-cohorts (Admin only - Initialize 4 Cohorts & 384 Students)
router.post('/migrate-cohorts', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const result = await seed4CohortsAndStudents();
    res.json({
      success: true,
      message: 'Successfully initialized 4 cohorts and 384 students: XI Boys (133), XI Girls (52), XII Boys (192), XII Girls (7).',
      result,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/academic/seed-4-cohorts (Admin only)
router.post('/seed-4-cohorts', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const result = await seed4CohortsAndStudents();
    res.json({
      success: true,
      message: 'Successfully initialized 4 cohorts and 384 students.',
      result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
