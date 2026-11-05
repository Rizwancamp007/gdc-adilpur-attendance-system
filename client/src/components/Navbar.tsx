import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NetworkStatusPill } from './NetworkStatusPill';
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  Send,
  FileSpreadsheet,
  LogOut,
  UserCheck,
  LayoutDashboard,
  Settings,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  // Generate 2-letter initials
  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('')
    : 'U';

  const isMoreActive =
    isActive('/admin/teachers') ||
    isActive('/admin/reports') ||
    isActive('/admin/settings');

  return (
    <>
      {/* ============================================================== */}
      {/* TOP DESKTOP & MOBILE HEADER                                     */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2.5 group">
                <img
                  src="/logo.png"
                  alt="GDC Adilpur Logo"
                  className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-xs group-hover:scale-105 transition duration-200"
                />
                <div className="flex flex-col">
                  <span className="font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight leading-tight">
                    Govt Degree College Adilpur
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-indigo-700 font-bold uppercase tracking-wider">
                    Attendance Portal
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {isAdmin ? (
                <>
                  <Link
                    to="/admin"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      isActive('/admin')
                        ? 'bg-indigo-50 text-indigo-900 font-bold shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                    Overview
                  </Link>
                  <Link
                    to="/admin/students"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      isActive('/admin/students')
                        ? 'bg-indigo-50 text-indigo-900 font-bold shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-4 h-4 text-slate-500" />
                    Students
                  </Link>
                  <Link
                    to="/admin/academic"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      isActive('/admin/academic')
                        ? 'bg-indigo-50 text-indigo-900 font-bold shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-slate-500" />
                    Classes
                  </Link>
                  <Link
                    to="/admin/teachers"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      isActive('/admin/teachers')
                        ? 'bg-indigo-50 text-indigo-900 font-bold shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-slate-500" />
                    Teachers
                  </Link>
                  <Link
                    to="/admin/messaging"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      isActive('/admin/messaging')
                        ? 'bg-indigo-50 text-indigo-900 font-bold shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Send className="w-4 h-4 text-slate-500" />
                    Messaging
                  </Link>
                  <Link
                    to="/admin/reports"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      isActive('/admin/reports')
                        ? 'bg-indigo-50 text-indigo-900 font-bold shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                    Reports
                  </Link>
                  <Link
                    to="/admin/settings"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      isActive('/admin/settings')
                        ? 'bg-indigo-50 text-indigo-900 font-bold shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    Settings
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/teacher"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      isActive('/teacher')
                        ? 'bg-indigo-50 text-indigo-900 font-bold shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                    My Classes
                  </Link>
                  <Link
                    to="/teacher/roll-call"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      isActive('/teacher/roll-call')
                        ? 'bg-indigo-50 text-indigo-900 font-bold shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                    Mark Attendance
                  </Link>
                  <Link
                    to="/teacher/stats"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      isActive('/teacher/stats')
                        ? 'bg-indigo-50 text-indigo-900 font-bold shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-4 h-4 text-indigo-600" />
                    Student Stats
                  </Link>
                </>
              )}
            </nav>

            {/* Right Status Pill & User Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              <NetworkStatusPill />

              {/* User Avatar & Info */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <div
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-xs select-none"
                  title={user.fullName}
                >
                  {initials}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                    {user.fullName}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium capitalize">
                    {user.role} {user.department ? `• ${user.department}` : ''}
                  </span>
                </div>
              </div>

              {/* Logout Button (Desktop) */}
              <button
                onClick={logout}
                title="Logout from session"
                className="hidden sm:flex p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition duration-150"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile Drawer Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MOBILE SLIDE-OVER DRAWER (FULL MENU & PROFILE)                 */}
      {/* ============================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {initials}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 truncate max-w-[160px]">{user.fullName}</h3>
                  <span className="text-[10px] text-indigo-700 font-semibold capitalize flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {user.role} {user.department ? `(${user.department})` : ''}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Nav Links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1 block">
                Menu Navigation
              </span>

              {isAdmin ? (
                <>
                  <Link
                    to="/admin"
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive('/admin')
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                      Overview Dashboard
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  <Link
                    to="/admin/students"
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive('/admin/students')
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-slate-500" />
                      Student Management
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  <Link
                    to="/admin/academic"
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive('/admin/academic')
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className="w-4 h-4 text-slate-500" />
                      Classes & Sections
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  <Link
                    to="/admin/teachers"
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive('/admin/teachers')
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <UserCheck className="w-4 h-4 text-slate-500" />
                      Faculty & Incharges
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  <Link
                    to="/admin/messaging"
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive('/admin/messaging')
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Send className="w-4 h-4 text-slate-500" />
                      Messaging Hub & WhatsApp
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  <Link
                    to="/admin/reports"
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive('/admin/reports')
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                      Attendance Reports & Excel
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  <Link
                    to="/admin/settings"
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive('/admin/settings')
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4 text-slate-500" />
                      Settings & Password
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/teacher"
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive('/teacher')
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                      My Assigned Classes
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  <Link
                    to="/teacher/roll-call"
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive('/teacher/roll-call')
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                      Mark Daily Roll Call
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  <Link
                    to="/teacher/stats"
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive('/teacher/stats')
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Student Attendance Stats
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                </>
              )}
            </div>

            {/* Drawer Footer with Logout */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition duration-150"
              >
                <LogOut className="w-4 h-4" />
                Sign Out of Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MOBILE / IOS FIXED BOTTOM NAVIGATION BAR                        */}
      {/* ============================================================== */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1"
      >
        <div className="grid grid-cols-5 h-12 max-w-md mx-auto items-center text-center">
          {isAdmin ? (
            <>
              {/* Tab 1: Overview */}
              <Link
                to="/admin"
                className={`flex flex-col items-center justify-center py-1 transition relative ${
                  isActive('/admin') ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className={`text-[10px] leading-tight font-medium ${isActive('/admin') ? 'font-bold' : ''}`}>
                  Overview
                </span>
                {isActive('/admin') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute bottom-0.5" />
                )}
              </Link>

              {/* Tab 2: Students */}
              <Link
                to="/admin/students"
                className={`flex flex-col items-center justify-center py-1 transition relative ${
                  isActive('/admin/students') ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Users className="w-5 h-5" />
                <span
                  className={`text-[10px] leading-tight font-medium ${
                    isActive('/admin/students') ? 'font-bold' : ''
                  }`}
                >
                  Students
                </span>
                {isActive('/admin/students') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute bottom-0.5" />
                )}
              </Link>

              {/* Tab 3: Classes */}
              <Link
                to="/admin/academic"
                className={`flex flex-col items-center justify-center py-1 transition relative ${
                  isActive('/admin/academic') ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
                <span
                  className={`text-[10px] leading-tight font-medium ${
                    isActive('/admin/academic') ? 'font-bold' : ''
                  }`}
                >
                  Classes
                </span>
                {isActive('/admin/academic') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute bottom-0.5" />
                )}
              </Link>

              {/* Tab 4: Messaging */}
              <Link
                to="/admin/messaging"
                className={`flex flex-col items-center justify-center py-1 transition relative ${
                  isActive('/admin/messaging') ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Send className="w-5 h-5" />
                <span
                  className={`text-[10px] leading-tight font-medium ${
                    isActive('/admin/messaging') ? 'font-bold' : ''
                  }`}
                >
                  Messaging
                </span>
                {isActive('/admin/messaging') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute bottom-0.5" />
                )}
              </Link>

              {/* Tab 5: More Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className={`flex flex-col items-center justify-center py-1 transition relative ${
                  isMoreActive || mobileMenuOpen ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Menu className="w-5 h-5" />
                <span
                  className={`text-[10px] leading-tight font-medium ${
                    isMoreActive ? 'font-bold' : ''
                  }`}
                >
                  More
                </span>
                {isMoreActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute bottom-0.5" />
                )}
              </button>
            </>
          ) : (
            <div className="col-span-5 grid grid-cols-3">
              {/* Teacher Tab 1: My Classes */}
              <Link
                to="/teacher"
                className={`flex flex-col items-center justify-center py-1 transition relative ${
                  isActive('/teacher') ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className={`text-[10px] leading-tight font-medium ${isActive('/teacher') ? 'font-bold' : ''}`}>
                  My Classes
                </span>
                {isActive('/teacher') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute bottom-0.5" />
                )}
              </Link>

              {/* Teacher Tab 2: Mark Roll Call */}
              <Link
                to="/teacher/roll-call"
                className={`flex flex-col items-center justify-center py-1 transition relative ${
                  isActive('/teacher/roll-call') ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <ClipboardCheck className="w-5 h-5" />
                <span
                  className={`text-[10px] leading-tight font-medium ${
                    isActive('/teacher/roll-call') ? 'font-bold' : ''
                  }`}
                >
                  Attendance
                </span>
                {isActive('/teacher/roll-call') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 absolute bottom-0.5" />
                )}
              </Link>

              {/* Teacher Tab 3: Stats */}
              <Link
                to="/teacher/stats"
                className={`flex flex-col items-center justify-center py-1 transition relative ${
                  isActive('/teacher/stats') ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Users className="w-5 h-5" />
                <span
                  className={`text-[10px] leading-tight font-medium ${
                    isActive('/teacher/stats') ? 'font-bold' : ''
                  }`}
                >
                  Stats
                </span>
                {isActive('/teacher/stats') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute bottom-0.5" />
                )}
              </Link>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};
