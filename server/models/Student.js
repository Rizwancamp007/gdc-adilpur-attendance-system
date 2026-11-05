import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    rollNo: {
      type: String,
      required: [true, 'Roll number is required'],
      trim: true,
    },
    registrationNo: {
      type: String,
      trim: true,
      default: '',
    },
    fullName: {
      type: String,
      required: [true, 'Student full name is required'],
      trim: true,
    },
    fatherName: {
      type: String,
      required: [true, "Father's name is required"],
      trim: true,
    },
    caste: {
      type: String,
      trim: true,
      default: '',
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male',
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: [true, 'Program reference is required'],
    },
    classSectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSection',
      required: [true, 'Class / Section reference is required'],
    },
    parentPhone: {
      type: String,
      required: [true, "Parent's contact number is required"],
      trim: true,
    },
    studentPhone: {
      type: String,
      trim: true,
      default: '',
    },
    consecutiveAbsences: {
      type: Number,
      default: 0,
    },
    totalDaysPresent: {
      type: Number,
      default: 0,
    },
    totalDaysAbsent: {
      type: Number,
      default: 0,
    },
    totalDaysLeave: {
      type: Number,
      default: 0,
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

// Compound indexes for ultra-fast queries across classes, sections & active status
studentSchema.index({ classSectionId: 1, rollNo: 1 }, { unique: true });
studentSchema.index({ classSectionId: 1, isActive: 1 });
studentSchema.index({ programId: 1, isActive: 1 });
studentSchema.index({ isActive: 1, fullName: 1 });

const Student = mongoose.model('Student', studentSchema);
export default Student;
