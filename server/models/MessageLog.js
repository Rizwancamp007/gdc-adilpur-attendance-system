import mongoose from 'mongoose';

const messageLogSchema = new mongoose.Schema(
  {
    recipientPhone: {
      type: String,
      required: true,
      trim: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    rollNo: {
      type: String,
      required: true,
    },
    classSectionName: {
      type: String,
      required: true,
    },
    messageText: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      enum: ['WHATSAPP', 'SMS_GATEWAY'],
      default: 'WHATSAPP',
    },
    status: {
      type: String,
      enum: ['QUEUED', 'SENDING', 'SENT', 'FAILED'],
      default: 'QUEUED',
    },
    sentAt: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

messageLogSchema.index({ status: 1, createdAt: -1 });

const MessageLog = mongoose.model('MessageLog', messageLogSchema);
export default MessageLog;
