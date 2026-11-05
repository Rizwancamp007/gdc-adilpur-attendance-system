import express from 'express';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Rate limiter for login: 10 attempts per 15 mins per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password validation regex: min 8 chars, 1 upper, 1 lower, 1 digit, 1 special char
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^])[A-Za-z\d@$!%*?&#^]{8,}$/;

// Helper to set secure cookie
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken({ id: user._id, role: user.role });

  const cookieOptions = {
    expires: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        phone: user.phone,
        assignedClasses: user.assignedClasses,
      },
    });
};

// @route   POST /api/auth/login
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both username and password.' });
    }

    const cleanLogin = username.toLowerCase().trim();
    const user = await User.findOne({
      $or: [
        { username: cleanLogin },
        { email: cleanLogin },
      ],
    }).populate('assignedClasses');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account is deactivated. Contact Admin.' });
    }

    user.lastLogin = new Date();
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate('assignedClasses');
  res.json({
    success: true,
    user: {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      phone: user.phone,
      assignedClasses: user.assignedClasses,
    },
  });
});

// @route   PUT /api/auth/update-password (Logged-in user: Admin, Teacher, Principal)
router.put('/update-password', protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your current password and a new password.',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          'New password too weak. Must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.',
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully. Please use your new password next time you log in.' });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/auth/update-profile (Logged-in user)
router.put('/update-profile', protect, async (req, res, next) => {
  try {
    const { fullName, phone, email, department } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    if (fullName) user.fullName = fullName.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (email !== undefined) user.email = email.trim().toLowerCase();
    if (department !== undefined) user.department = department.trim();

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        assignedClasses: user.assignedClasses,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });
  res.json({ success: true, message: 'Successfully logged out.' });
});

// @route   GET /api/auth/users (Admin only - List all teachers and staff)
router.get('/users', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const users = await User.find().select('-password').populate('assignedClasses').sort({ role: 1, fullName: 1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/create-user (Admin only - Create Teacher/Staff account)
router.post('/create-user', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const { username, fullName, password, role, department, phone, assignedClasses } = req.body;

    if (!username || !fullName || !password) {
      return res.status(400).json({ success: false, message: 'Username, Full Name, and Password are required.' });
    }

    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password too weak. Must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.',
      });
    }

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already taken.' });
    }

    const newUser = await User.create({
      username: username.toLowerCase().trim(),
      fullName: fullName.trim(),
      password,
      role: role || 'teacher',
      department: department || 'General',
      phone: phone || '',
      assignedClasses: assignedClasses || [],
    });

    res.status(201).json({
      success: true,
      message: `Account for ${newUser.fullName} (${newUser.username}) created successfully.`,
      user: {
        id: newUser._id,
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
        department: newUser.department,
        assignedClasses: newUser.assignedClasses,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/auth/users/:id (Admin only - Edit Teacher details or reset password)
router.put('/users/:id', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User account not found.' });

    const { fullName, department, phone, assignedClasses, role, isActive, newPassword } = req.body;

    if (fullName) user.fullName = fullName.trim();
    if (department !== undefined) user.department = department;
    if (phone !== undefined) user.phone = phone;
    if (assignedClasses !== undefined) user.assignedClasses = assignedClasses;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    if (newPassword) {
      if (!strongPasswordRegex.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message:
            'New password too weak. Must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.',
        });
      }
      user.password = newPassword;
    }

    await user.save();

    res.json({
      success: true,
      message: `Account for ${user.fullName} updated successfully.`,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        assignedClasses: user.assignedClasses,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/auth/users/:id (Admin only - Delete User)
router.delete('/users/:id', protect, authorize('admin', 'principal'), async (req, res, next) => {
  try {
    // Prevent admin from deleting themselves
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own administrative account.' });
    }

    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'User not found.' });

    res.json({ success: true, message: `Account ${deleted.username} deleted successfully.` });
  } catch (error) {
    next(error);
  }
});

export default router;
