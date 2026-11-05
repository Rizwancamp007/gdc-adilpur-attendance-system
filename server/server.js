import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import { sanitizeNoSql, securityHeaders } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import academicRoutes from './routes/academicRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import messagingRoutes from './routes/messagingRoutes.js';
import smsGatewayRoutes from './routes/smsGatewayRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

import { startKeepAlive } from './utils/keepAlive.js';
import { initRetentionScheduler } from './services/retentionService.js';
import { initWhatsAppIfSessionExists } from './services/whatsappService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Global Security Middleware
app.use(securityHeaders);

// Bulletproof CORS Configuration
const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (
        cleanOrigin === clientUrl ||
        cleanOrigin.endsWith('.gdcadilpur.edu.pk') ||
        cleanOrigin.endsWith('.vercel.app') ||
        cleanOrigin.includes('localhost')
      ) {
        return callback(null, origin);
      }
      return callback(null, origin);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeNoSql);
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/sms', smsGatewayRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint (for keep-alive & monitoring)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'GDC Adilpur Attendance System API',
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// Production: Serve static client build if deployed unified
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 GDC Adilpur Attendance Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);

  // Initialize automated keep-alive (7:15 AM - 4:30 PM PKT)
  startKeepAlive();

  // Initialize 2-year retention scheduler
  initRetentionScheduler();

  // Auto-reconnect WhatsApp if previously authenticated session exists
  initWhatsAppIfSessionExists();
});

export default app;
