import jwt from 'jsonwebtoken';

export const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'gdc_adilpur_attendance_secret_2026', {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'gdc_adilpur_attendance_secret_2026');
};
