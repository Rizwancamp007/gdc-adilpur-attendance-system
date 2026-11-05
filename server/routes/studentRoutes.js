import express from 'express';
import Student from '../models/Student.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Helper to normalize Pakistani phone numbers to clean format e.g. "03001234567"
const cleanPhone = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('92') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.substring(2);
  } else if (cleaned.length === 10 && cleaned.startsWith('3')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
};

// @route   GET /api/students
router.get('/', protect, async (req, res, next) => {
  try {
    const { classSectionId, programId, search, status } = req.query;
    const filter = {};

    if (classSectionId) filter.classSectionId = classSectionId;
    if (programId) filter.programId = programId;
    if (status === 'active') filter.isActive = true;

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { rollNo: { $regex: search, $options: 'i' } },
        { fatherName: { $regex: search, $options: 'i' } },
      ];
    }

    const students = await Student.find(filter)
      .populate('programId', 'name code')
      .populate('classSectionId', 'name section yearLevel')
      .sort({ rollNo: 1 })
      .lean();

    res.json({ success: true, count: students.length, students });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/students (Admin only)
router.post('/', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const { rollNo, registrationNo, fullName, fatherName, gender, programId, classSectionId, parentPhone, studentPhone } =
      req.body;

    const student = await Student.create({
      rollNo,
      registrationNo: registrationNo || '',
      fullName,
      fatherName,
      gender: gender || 'Male',
      programId,
      classSectionId,
      parentPhone: cleanPhone(parentPhone),
      studentPhone: cleanPhone(studentPhone),
    });

    res.status(201).json({ success: true, student });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Roll number already exists in this class section.' });
    }
    next(error);
  }
});

// @route   POST /api/students/bulk-import (Admin only - Accepts array of parsed Excel/CSV student objects)
router.post('/bulk-import', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const { classSectionId, programId, studentsList } = req.body;

    if (!classSectionId || !programId || !Array.isArray(studentsList) || studentsList.length === 0) {
      return res.status(400).json({ success: false, message: 'Valid class, program, and non-empty student list required.' });
    }

    let insertedCount = 0;
    let duplicateCount = 0;
    const errors = [];

    for (const item of studentsList) {
      try {
        const roll = String(item.rollNo || item['Roll No'] || item['RollNo'] || '').trim();
        const name = String(item.fullName || item['Student Name'] || item['Name'] || '').trim();
        const fName = String(item.fatherName || item["Father's Name"] || item['Father Name'] || '').trim();
        const pPhone = cleanPhone(item.parentPhone || item['Parent Phone'] || item['Phone'] || item['Mobile']);

        if (!roll || !name) continue;

        await Student.findOneAndUpdate(
          { classSectionId, rollNo: roll },
          {
            rollNo: roll,
            fullName: name,
            fatherName: fName || 'Father',
            gender: item.gender || 'Male',
            programId,
            classSectionId,
            parentPhone: pPhone || '03000000000',
            registrationNo: item.registrationNo || '',
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        insertedCount++;
      } catch (err) {
        duplicateCount++;
        errors.push(`Roll ${item.rollNo}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Bulk import completed: ${insertedCount} students processed successfully.`,
      insertedCount,
      duplicateCount,
      errors: errors.slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/students/:id (Admin only)
router.put('/:id', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    if (req.body.parentPhone) req.body.parentPhone = cleanPhone(req.body.parentPhone);
    const updated = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, student: updated });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/students/:id (Admin only)
router.delete('/:id', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
