import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import SystemConfig from '../models/SystemConfig.js';

let sock = null;
let latestQrImage = null;
let isInitializing = false;

const AUTH_DIR = path.resolve(process.cwd(), 'whatsapp_auth');

export const initWhatsAppSocket = async () => {
  if (isInitializing) return;
  isInitializing = true;

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['GDC Adilpur Portal', 'Chrome', '1.0.0'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          // This `qr` is the official, real WhatsApp Multi-Device noise protocol handshake string!
          latestQrImage = await QRCode.toDataURL(qr);
          console.log('📱 [WHATSAPP] Genuine WhatsApp Multi-Device QR code generated.');
        } catch (err) {
          console.error('❌ Failed to convert Baileys QR to image:', err);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`🔌 [WHATSAPP] Connection closed (code: ${statusCode}). Reconnect allowed: ${shouldReconnect}`);

        latestQrImage = null;
        sock = null;

        if (shouldReconnect) {
          isInitializing = false;
          setTimeout(() => initWhatsAppSocket(), 5000);
        } else {
          // Permanently logged out
          console.log('🚪 [WHATSAPP] Device logged out.');
          cleanAuthDir();
          await updateConfigStatus(false, '');
          isInitializing = false;
        }
      } else if (connection === 'open') {
        console.log('✅ [WHATSAPP] Device successfully linked to GDC Adilpur Attendance Portal!');
        latestQrImage = null;
        isInitializing = false;

        const userPhone = sock.user?.id ? sock.user.id.split(':')[0] : 'Linked';
        await updateConfigStatus(true, userPhone);
      }
    });
  } catch (error) {
    console.error('❌ [WHATSAPP] Error initializing socket:', error);
    isInitializing = false;
  }
};

const updateConfigStatus = async (linked, phone) => {
  try {
    let config = await SystemConfig.findOne();
    if (!config) config = new SystemConfig();
    config.whatsappLinked = linked;
    config.whatsappPhone = phone;
    await config.save();
  } catch (e) {
    console.error('Error updating SystemConfig for WhatsApp:', e);
  }
};

const cleanAuthDir = () => {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
  } catch (e) {
    console.error('Error cleaning whatsapp_auth dir:', e);
  }
};

export const getLatestWhatsAppQr = async () => {
  if (isWhatsAppConnected()) {
    return { isConnected: true, qrImage: null, message: 'WhatsApp is already connected and active.' };
  }

  if (!sock) {
    await initWhatsAppSocket();
  }

  // Allow up to 3 seconds for initial QR emission if not yet ready
  let attempts = 0;
  while (!latestQrImage && attempts < 6) {
    await new Promise((r) => setTimeout(r, 500));
    attempts++;
  }

  return {
    isConnected: false,
    qrImage: latestQrImage,
    message: latestQrImage
      ? 'Scan this official WhatsApp Web QR code using Linked Devices on your WhatsApp phone.'
      : 'Generating live WhatsApp pairing challenge. Please retry in a few seconds.',
  };
};

export const unlinkWhatsAppDevice = async () => {
  try {
    if (sock) {
      try {
        await sock.logout();
      } catch {
        // ignore
      }
      sock = null;
    }
    cleanAuthDir();
    latestQrImage = null;
    await updateConfigStatus(false, '');
    return { success: true, message: 'WhatsApp unlinked successfully.' };
  } catch (err) {
    console.error('Error unlinking WhatsApp:', err);
    return { success: false, message: err.message };
  }
};

export const sendWhatsAppMessage = async (recipientPhone, messageText) => {
  if (!sock || !sock.user) {
    throw new Error('WhatsApp Gateway is not currently connected.');
  }

  let clean = recipientPhone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '92' + clean.substring(1);
  }

  // Pre-flight check: verify if the phone number is registered on WhatsApp
  try {
    const results = await sock.onWhatsApp(clean);
    const target = results && results[0];
    if (target && target.exists === false) {
      throw new Error(
        `Phone number ${recipientPhone} is not registered on WhatsApp (No active WhatsApp account).`
      );
    }
  } catch (err) {
    if (err.message && err.message.includes('not registered on WhatsApp')) {
      throw err;
    }
    // If checking onWhatsApp timed out or errored on network, continue with direct send attempt
  }

  const jid = `${clean}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text: messageText });
  return true;
};

export const isWhatsAppConnected = () => {
  return Boolean(sock && sock.user);
};

export const initWhatsAppIfSessionExists = () => {
  if (fs.existsSync(path.join(AUTH_DIR, 'creds.json'))) {
    console.log('🔄 [WHATSAPP] Saved session credentials detected. Auto-reconnecting WhatsApp socket...');
    initWhatsAppSocket().catch((err) => console.error('Error auto-connecting WhatsApp:', err));
  }
};
