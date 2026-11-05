import mongoose from 'mongoose';

const programSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Program name is required'],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Program code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    }, // e.g. "FSC-MED", "FSC-ENG", "ICS", "BS-ENG"
    level: {
      type: String,
      enum: ['Intermediate', 'Bachelor', 'Associate', 'Other'],
      default: 'Intermediate',
    },
    durationYears: {
      type: Number,
      default: 2,
    },
    description: {
      type: String,
      default: '',
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

const Program = mongoose.model('Program', programSchema);
export default Program;
