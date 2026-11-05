import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import {
  Lock,
  User,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Building2,
  Clock,
  Sliders,
  Send,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export const AdminSettings: React.FC = () => {
  const { user } = useAuth();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.department || 'College Administration');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Validation
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const hasSpecial = /[@$!%*?&#^]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial;
  const doPasswordsMatch = newPassword && newPassword === confirmPassword;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Please enter your current password.');
      return;
    }

    if (!isPasswordValid) {
      toast.error('New password must satisfy all security requirements.');
      return;
    }

    if (!doPasswordsMatch) {
      toast.error('New passwords do not match.');
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await api.put('/auth/update-password', {
        currentPassword,
        newPassword,
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    setUpdatingProfile(true);
    try {
      const res = await api.put('/auth/update-profile', {
        fullName,
        phone,
        department,
      });

      if (res.data.success) {
        toast.success('Administrative profile updated successfully!');
        // Update user in localStorage so navbar immediately updates
        const stored = localStorage.getItem('gdc_auth_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.fullName = fullName;
          parsed.phone = phone;
          parsed.department = department;
          localStorage.setItem('gdc_auth_user', JSON.stringify(parsed));
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Account & System Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Admin Settings & Security</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your credentials, administrative profile, and institutional configuration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/messaging"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs shadow-xs transition flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp & SMS Hub</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Password & Profile */}
        <div className="lg:col-span-2 space-y-8">
          {/* Change Password Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">Change Admin Password</h2>
                <p className="text-xs text-slate-500">Update your account login password with enterprise-grade encryption.</p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter existing password"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password & Confirm Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Min 8 chars, 1 Upper, 1 Special"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Re-type new password"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] space-y-1.5">
                <span className="font-bold text-slate-700 block mb-1">Security Checklist:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className={`flex items-center gap-1.5 font-medium ${hasMinLength ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>8+ Characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-medium ${hasUpper ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>1 Uppercase (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-medium ${hasLower ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>1 Lowercase (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-medium ${hasDigit ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>1 Number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-medium ${hasSpecial ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>1 Special (@$!%*?&#)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-medium ${doPasswordsMatch ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Passwords Match</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updatingPassword || !isPasswordValid || !doPasswordsMatch}
                  className="px-5 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{updatingPassword ? 'Saving Password...' : 'Save New Password'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Administrative Profile Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">Administrator Profile</h2>
                <p className="text-xs text-slate-500">Update officer name and institutional contact info.</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Login Email / Username
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.username || ''}
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Primary login identifier (managed by college IT)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Full Name / Title
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="e.g. System Administrator (Principal Office)"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Department / Office
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. College Administration"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Official Contact Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 03001234567"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{updatingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Institutional Details & System Parameters */}
        <div className="space-y-6">
          {/* Institutional Specs Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-indigo-700" />
              <h3 className="font-black text-slate-900 text-sm">Institutional Specs</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">College Name</span>
                <span className="font-bold text-slate-800">Govt. Degree College Adilpur</span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Affiliation</span>
                <span className="font-semibold text-slate-700">BISE Sukkur • Higher Education Sindh</span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Official Subdomain</span>
                <span className="font-mono text-indigo-700 font-bold">attendance.gdcadilpur.edu.pk</span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Operational Window</span>
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>7:00 AM – 6:00 PM PKT (Zero Cold Start)</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Data Retention Policy</span>
                <span className="font-semibold text-slate-700">2-Year Rolling Auto-Cleanup Active</span>
              </div>
            </div>
          </div>

          {/* Quick Module Shortcuts */}
          <div className="bg-indigo-950 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Quick Configuration</span>
              <h3 className="text-base font-black text-white mt-1 mb-2">Automated Messaging</h3>
              <p className="text-xs text-indigo-200 mb-5">
                Configure your active WhatsApp Bot noise-handshake or Android SMS SIM Gateway secret key.
              </p>

              <Link
                to="/admin/messaging"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-xs"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Open Messaging Hub</span>
              </Link>
            </div>

            {/* Ambient background decoration */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-800/40 rounded-full blur-xl pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};
