import https from 'https';
import http from 'http';

export const startKeepAlive = () => {
  const serverUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL;
  if (!serverUrl || process.env.NODE_ENV !== 'production') {
    console.log('ℹ️ Keep-Alive Ping Service idle in development mode.');
    return;
  }

  const pingUrl = `${serverUrl.replace(/\/+$/, '')}/api/health`;
  const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

  const ping = () => {
    // Current Pakistan Standard Time (PKT is UTC+5)
    const now = new Date();
    const utcHours = now.getUTCHours();
    const pktHours = (utcHours + 5) % 24;

    // Active College Hours: 7:00 AM (7) to 6:00 PM (18) PKT
    if (pktHours >= 7 && pktHours < 18) {
      const client = pingUrl.startsWith('https') ? https : http;
      client
        .get(pingUrl, (res) => {
          console.log(`💓 [KEEP-ALIVE] Pinged ${pingUrl} at ${now.toLocaleTimeString()} PKT — Status: ${res.statusCode}`);
        })
        .on('error', (err) => {
          console.warn(`⚠️ [KEEP-ALIVE] Ping error: ${err.message}`);
        });
    } else {
      console.log(`💤 [KEEP-ALIVE] Outside active hours (${pktHours}:00 PKT). Sleeping to conserve free hours.`);
    }
  };

  // Immediate initial warm-up ping, then schedule every 14 mins
  ping();
  setInterval(ping, PING_INTERVAL_MS);
  console.log('⚡ Keep-Alive Ping Service initialized (7:00 AM – 6:00 PM PKT).');
};
