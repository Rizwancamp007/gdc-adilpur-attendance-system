import express from 'express';
import MessageLog from '../models/MessageLog.js';
import SystemConfig from '../models/SystemConfig.js';

const router = express.Router();

// Middleware to authenticate Android SMS Gateway using secret API key
const verifyGatewayKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const config = (await SystemConfig.findOne()) || { smsGatewayApiKey: 'gdc_sms_default' };

  if (!apiKey || apiKey !== config.smsGatewayApiKey) {
    return res.status(401).json({ success: false, message: 'Invalid or missing SMS Gateway API Key.' });
  }
  next();
};

// @route   GET /api/sms/poll (Android phone pulls next message to send)
router.get('/poll', verifyGatewayKey, async (req, res, next) => {
  try {
    // Find next pending message
    const message = await MessageLog.findOneAndUpdate(
      { channel: 'SMS_GATEWAY', status: 'QUEUED' },
      { status: 'SENDING' },
      { sort: { createdAt: 1 }, new: true }
    );

    if (!message) {
      return res.json({ success: true, hasMessage: false, message: 'No messages in queue' });
    }

    res.json({
      success: true,
      hasMessage: true,
      jobId: message._id,
      phone: message.recipientPhone,
      text: message.messageText,
      pacerDelaySeconds: 18,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/sms/callback (Android phone reports message status)
router.post('/callback', verifyGatewayKey, async (req, res, next) => {
  try {
    const { jobId, status, error } = req.body;

    const message = await MessageLog.findById(jobId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    message.status = status === 'DELIVERED' || status === 'SENT' ? 'SENT' : 'FAILED';
    message.sentAt = new Date();
    if (error) message.error = error;
    await message.save();

    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    next(error);
  }
});

export default router;
