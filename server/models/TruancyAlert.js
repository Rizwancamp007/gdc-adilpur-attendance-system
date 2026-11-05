import mongoose from 'mongoose';

const truancyAlertSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    classSectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSection',
      required: true,
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
    },
    consecutiveDays: {
      type: Number,
      required: true,
      default: 3,
    },
    dateTriggered: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PARENT_CONTACTED', 'MEDICAL_EXCUSE', 'RESOLVED'],
      default: 'ACTIVE',
    },
    notes: {
      type: String,
      default: '',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

truancyAlertSchema.index({ status: 1, dateTriggered: -1 });

const TruancyAlert = mongoose.model('TruancyAlert', truancyAlertSchema);
export default TruancyAlert;
