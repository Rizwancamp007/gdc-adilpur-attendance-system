import mongoose from 'mongoose';

const classSectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
    }, // e.g. "XI Pre-Medical (Sec A)"
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: [true, 'Program reference is required'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required (e.g. 2026-2027)'],
      trim: true,
      default: '2026-2027',
    },
    yearLevel: {
      type: String,
      required: [true, 'Year/Level is required (e.g. 1st Year, 2nd Year, BS Sem 1)'],
      trim: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: 'A',
    },
    shift: {
      type: String,
      enum: ['Morning', 'Evening'],
      default: 'Morning',
    },
    inchargeTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness per section in an academic year
classSectionSchema.index({ programId: 1, yearLevel: 1, section: 1, academicYear: 1 }, { unique: true });

const ClassSection = mongoose.model('ClassSection', classSectionSchema);
export default ClassSection;
