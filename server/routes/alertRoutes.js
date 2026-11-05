import express from 'express';
import TruancyAlert from '../models/TruancyAlert.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/alerts (Admin & Teachers view 3+ days truants)
router.get('/', protect, async (req, res, next) => {
  try {
    const { status, programId, classSectionId } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (programId) filter.programId = programId;
    if (classSectionId) filter.classSectionId = classSectionId;

    const alerts = await TruancyAlert.find(filter)
      .populate('studentId', 'rollNo fullName fatherName parentPhone')
      .populate('classSectionId', 'name yearLevel section')
      .populate('programId', 'name code')
      .populate('resolvedBy', 'fullName username')
      .sort({ consecutiveDays: -1, dateTriggered: -1 });

    res.json({ success: true, count: alerts.length, alerts });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/alerts/:id/resolve (Admin only)
router.put('/:id/resolve', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const alert = await TruancyAlert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.status = status || 'RESOLVED';
    if (notes) alert.notes = notes;
    alert.resolvedBy = req.user._id;
    alert.resolvedAt = new Date();

    await alert.save();
    res.json({ success: true, message: 'Truancy alert updated successfully', alert });
  } catch (error) {
    next(error);
  }
});

export default router;
