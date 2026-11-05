import SystemConfig from '../models/SystemConfig.js';

/**
 * Normalizes any Pakistani mobile number format to standard E.164 (+923...)
 * Handles: 03073614973, 3073614973, +923073614973, 923073614973, 00923073614973, 0308-5265439
 */
export const formatPakistanPhone = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  if (cleaned.startsWith('03')) {
    cleaned = '92' + cleaned.substring(1);
  } else if (cleaned.startsWith('3') && cleaned.length === 10) {
    cleaned = '92' + cleaned;
  }

  // Ensure minimum valid length (923XXXXXXXXX = 12 digits)
  if (!cleaned.startsWith('92') && cleaned.length === 10) {
    cleaned = '92' + cleaned;
  }

  return '+' + cleaned;
};

/**
 * Sends an SMS through Capcom6 Android SMS Gateway (Cloud or Local mode)
 * Official endpoint: https://api.sms-gate.app/3rdparty/v1/message (or /messages)
 */
export const sendCapcomSms = async (recipientPhone, messageText, overrideConfig = {}) => {
  let config = null;
  if (!overrideConfig.login || !overrideConfig.password || !overrideConfig.endpoint) {
    config = await SystemConfig.findOne();
  }

  const login = (overrideConfig.login || config?.smsCapcomLogin || '').trim();
  const password = (overrideConfig.password || config?.smsCapcomPassword || '').trim();
  const rawBase = (overrideConfig.endpoint || config?.smsGatewayEndpoint || 'https://api.sms-gate.app/3rdparty/v1').trim().replace(/\/+$/, '');

  if (!login || !password) {
    throw new Error(
      'Capcom6 SMS Gateway is not configured. Please enter your Device Login and Password in Messaging Hub.'
    );
  }

  const formattedPhone = formatPakistanPhone(recipientPhone);
  if (!formattedPhone || formattedPhone.length < 11) {
    throw new Error(`Invalid phone number format: "${recipientPhone}"`);
  }

  // Capcom6 accepts POST to /message or /messages
  const endpoint = rawBase.endsWith('/message') || rawBase.endsWith('/messages')
    ? rawBase
    : `${rawBase}/message`;

  const authHeader = 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');

  // Capcom6 schema requires exactly ONE of: message / textMessage, dataMessage, or mmsMessage
  const payload = {
    message: messageText,
    phoneNumbers: [formattedPhone],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errDetail =
        responseBody.message ||
        responseBody.error ||
        `HTTP ${response.status} ${response.statusText}`;

      if (response.status === 401 || response.status === 403) {
        throw new Error(`Authentication failed. Check your Capcom6 Device Login & Password: ${errDetail}`);
      }
      throw new Error(`Capcom6 Gateway error: ${errDetail}`);
    }

    return {
      success: true,
      data: responseBody,
      phone: formattedPhone,
      usedLogin: login,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Capcom6 Gateway request timed out (20s). Ensure Android phone has an active internet/SIM connection.');
    }
    throw err;
  }
};
