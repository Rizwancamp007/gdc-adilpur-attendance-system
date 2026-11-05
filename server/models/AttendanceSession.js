import mongoose from 'mongoose';

const attendanceRecordItemSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    rollNo: {
      type: String,
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    fatherName: {
      type: String,
      default: '',
    },
    parentPhone: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'LEAVE'],
      required: true,
      default: 'PRESENT',
    },
    consecutiveAbsences: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const attendanceSessionSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    }, // e.g., "2026-10-28_651234567890abcdef123456"
    date: {
      type: String,
      required: true,
      trim: true,
    }, // Format: YYYY-MM-DD
    academicYear: {
      type: String,
      required: true,
      default: '2026-2027',
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
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalStudents: {
      type: Number,
      required: true,
      default: 0,
    },
    presentCount: {
      type: Number,
      required: true,
      default: 0,
    },
    absentCount: {
      type: Number,
      required: true,
      default: 0,
    },
    leaveCount: {
      type: Number,
      default: 0,
    },
    records: [attendanceRecordItemSchema],
    isConfirmed: {
      type: Boolean,
      default: false,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    messagingStatus: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'],
      default: 'DRAFT',
    },
    source: {
      type: String,
      enum: ['ONLINE', 'OFFLINE_SYNC'],
      default: 'ONLINE',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast queries by date, class, and confirmation status
attendanceSessionSchema.index({ date: 1, classSectionId: 1 });
attendanceSessionSchema.index({ date: 1, programId: 1 });
attendanceSessionSchema.index({ classSectionId: 1, isConfirmed: 1 });
attendanceSessionSchema.index({ isConfirmed: 1, date: -1 });

const AttendanceSession = mongoose.model('AttendanceSession', attendanceSessionSchema);
export default AttendanceSession;
