import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('gdc_remember_user');
    if (saved) {
      setUsername(saved);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error('Please enter both username/email and password.');
      return;
    }

    if (rememberMe) {
      localStorage.setItem('gdc_remember_user', username.trim());
    } else {
      localStorage.removeItem('gdc_remember_user');
    }

    setLoading(true);
    try {
      const success = await login(username.trim(), password);
      if (success) {
        toast.success('Login successful! Welcome to GDC Adilpur Attendance Portal.');
        const savedUser = JSON.parse(localStorage.getItem('gdc_auth_user') || '{}');
        if (savedUser.role === 'teacher') {
          navigate('/teacher');
        } else {
          navigate('/admin');
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please check credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 sm:p-10">
        {/* Header with College Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <img
            src="/logo.png"
            alt="Govt Degree College Adilpur Logo"
            className="w-20 h-20 object-contain drop-shadow-md mb-3"
          />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">GDC Adilpur</h1>
          <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest mt-0.5">
            Attendance Portal
          </p>
          <span className="text-xs text-slate-500 mt-2">
            Official portal for daily student roll calls, parent notices, and academic attendance records.
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email or Username
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username@gdcadilpur.edu.pk"
                autoCapitalize="none"
                autoCorrect="off"
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-700 focus:ring-indigo-600 border-slate-300"
              />
              <span className="text-xs font-semibold text-slate-600">Remember Me on this device</span>
            </label>
            <span className="text-[11px] text-slate-400">1-Day Session</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-indigo-900/30 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Log In to Portal</span>
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Role-Based Access Protected</span>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-slate-400">
        © 2026 Government Degree College Adilpur, District Ghotki, Sindh.
      </footer>
    </div>
  );
};
