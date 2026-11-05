import mongoose from 'mongoose';
import dns from 'dns';

// Fix for Windows / Pakistani ISP DNS SRV timeout on mongodb+srv://
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // ignore if not permitted
}

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.warn('⚠️ MONGO_URI is not defined in environment variables. Falling back to local default.');
    }
    const conn = await mongoose.connect(mongoUri || 'mongodb://127.0.0.1:27017/gdc_attendance');
    console.log(`✅ MongoDB Connected: ${conn.connection.host} (Database: ${conn.connection.name})`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
