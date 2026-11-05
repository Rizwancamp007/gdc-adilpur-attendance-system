import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  Users,
  GraduationCap,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Filter,
  PhoneCall,
  Search,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { SkeletonStats, SkeletonTable } from '../../components/SkeletonLoader';
import toast from 'react-hot-toast';

const getTodayPkt = () => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);

  // Filters
  const [programs, setPrograms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayPkt());
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // ALL, ABSENT, CHRONIC_TRUANT
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Attendance Sessions & Alerts
  const [sessions, setSessions] = useState<any[]>([]);
  const [truancyAlerts, setTruancyAlerts] = useState<any[]>([]);
  const [loadingTable, setLoadingTable] = useState<boolean>(true);

  // Truancy Note Modal
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [adminNote, setAdminNote] = useState<string>('');

  useEffect(() => {
    loadOverviewStats(selectedDate);
    loadAcademicFilters();
    loadTruancyAlerts();
  }, []);

  useEffect(() => {
    loadFilteredAttendance();
    loadOverviewStats(selectedDate);
  }, [selectedProgram, selectedClass, selectedDate, statusFilter]);

  const loadOverviewStats = async (targetDate?: string) => {
    try {
      const qDate = targetDate || selectedDate;
      const res = await api.get(`/reports/overview?date=${qDate}`);
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch {
      // ignore
    }
  };

  const loadAcademicFilters = async () => {
    try {
      const [progRes, clsRes] = await Promise.all([api.get('/academic/programs'), api.get('/academic/classes')]);
      if (progRes.data.success) setPrograms(progRes.data.programs);
      if (clsRes.data.success) setClasses(clsRes.data.classes);
    } catch {
      // ignore
    }
  };

  const loadTruancyAlerts = async () => {
    try {
      const res = await api.get('/alerts?status=ACTIVE');
      if (res.data.success) {
        setTruancyAlerts(res.data.alerts);
      }
    } catch {
      // ignore
    }
  };

  const loadFilteredAttendance = async () => {
    setLoadingTable(true);
    try {
      const params = new URLSearchParams();
      if (selectedProgram) params.append('programId', selectedProgram);
      if (selectedClass) params.append('classSectionId', selectedClass);
      if (selectedDate) params.append('date', selectedDate);
      if (statusFilter === 'ABSENT') params.append('status', 'ABSENT');
      if (statusFilter === 'CHRONIC_TRUANT') params.append('onlyChronicTruants', 'true');

      const res = await api.get(`/attendance/history?${params.toString()}`);
      if (res.data.success) {
        setSessions(res.data.sessions);
      }
    } catch (err) {
      toast.error('Failed to load attendance records.');
    } finally {
      setLoadingTable(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const res = await api.put(`/alerts/${alertId}/resolve`, {
        status: 'PARENT_CONTACTED',
        notes: adminNote,
      });
      if (res.data.success) {
        toast.success('Alert marked as Parent Contacted.');
        setSelectedAlert(null);
        setAdminNote('');
        loadTruancyAlerts();
      }
    } catch {
      toast.error('Failed to update alert.');
    }
  };

  // Flatten session records for the audit table
  const allRows: any[] = [];
  for (const sess of sessions) {
    for (const r of sess.records) {
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        if (
          !r.studentName.toLowerCase().includes(lower) &&
          !r.rollNo.includes(lower) &&
          !r.parentPhone.includes(lower)
        ) {
          continue;
        }
      }
      allRows.push({
        date: sess.date,
        programName: sess.programId?.name || 'Program',
        className: sess.classSectionId?.name || 'Class',
        rollNo: r.rollNo,
        studentName: r.studentName,
        parentPhone: r.parentPhone,
        status: r.status,
        consecutiveAbsences: r.consecutiveAbsences,
      });
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Admin Attendance Overview</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time daily metrics, multi-faceted filtering, and chronic truancy detection.
          </p>
        </div>

        <a
          href={`/api/reports/export-excel?date=${selectedDate}${selectedProgram ? `&programId=${selectedProgram}` : ''}`}
          download
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Excel Report</span>
        </a>
      </div>

      {/* Gateway Disconnect or Failed Delivery Alert Banner */}
      {stats && !stats.whatsappLinked && !stats.smsConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-bold text-amber-950 text-sm">
                Parent Notification Gateways Are Disconnected
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Automated WhatsApp and SMS gateways are currently unlinked. Absentees cannot be notified automatically until you connect college WhatsApp.
              </p>
            </div>
          </div>
          <a
            href="/admin/messaging"
            className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition shrink-0 self-start sm:self-auto text-center"
          >
            Connect Gateway in Messaging Hub
          </a>
        </div>
      )}

      {stats && stats.failedToday > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-700" />
            </div>
            <div>
              <h3 className="font-bold text-rose-950 text-sm">
                {stats.failedToday} Absentee Notice(s) Failed Delivery Today
              </h3>
              <p className="text-xs text-rose-800 mt-0.5">
                Some parent numbers are not on WhatsApp or the gateway was offline. You can retry dispatch or send 1-click WhatsApp web notices.
              </p>
            </div>
          </div>
          <a
            href="/admin/messaging"
            className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition shrink-0 self-start sm:self-auto text-center"
          >
            Review & Retry in Hub
          </a>
        </div>
      )}

      {/* Overview Stat Cards */}
      {!stats ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Students</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-2xl font-black text-slate-900">{stats?.totalStudents || 0}</span>
            <span className="block text-[11px] text-slate-400 mt-1">Enrolled across college</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Turnout</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-2xl font-black text-emerald-700">{stats?.turnoutPercentage || 0}%</span>
            <span className="block text-[11px] text-slate-400 mt-1">{stats?.presentToday || 0} Present Today</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Classes Marked</span>
              <GraduationCap className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-2xl font-black text-slate-900">
              {stats?.classesMarkedToday || 0} / {stats?.totalClasses || 0}
            </span>
            <span className="block text-[11px] text-slate-400 mt-1">Submitted sessions</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Absentees Today</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <span className="text-2xl font-black text-rose-700">{stats?.absentToday || 0}</span>
            <span className="block text-[11px] text-slate-400 mt-1">Notices auto-queued</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-xs col-span-2 lg:col-span-1 bg-rose-50/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Chronic Truancy</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <span className="text-2xl font-black text-rose-700">{truancyAlerts.length}</span>
            <span className="block text-[11px] text-rose-600 font-semibold mt-1">🚨 3+ Days Consecutive</span>
          </div>
        </div>
      )}

      {/* Visual Analytics & Turnout Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Turnout by Class / Program Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-700" />
              <h2 className="text-base font-black text-slate-900 tracking-tight">Turnout Rate by Class</h2>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Date: {selectedDate}
            </span>
          </div>

          {sessions.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 font-semibold">
              No sessions submitted for {selectedDate}. Attendance rates will appear once roll calls are marked.
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((sess) => {
                const total = sess.totalStudents || 1;
                const pct = Math.round((sess.presentCount / total) * 100);
                const isHigh = pct >= 85;
                const isMed = pct >= 70 && pct < 85;

                return (
                  <div key={sess._id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        {sess.classSectionId?.name || 'Class'}{' '}
                        <span className="text-slate-400 font-normal">({sess.programId?.code || 'Prog'})</span>
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-500 text-[11px]">
                          {sess.presentCount}/{sess.totalStudents} Present
                        </span>
                        <span
                          className={`font-black text-xs px-2 py-0.5 rounded-md ${
                            isHigh
                              ? 'text-emerald-700 bg-emerald-50'
                              : isMed
                              ? 'text-indigo-700 bg-indigo-50'
                              : 'text-rose-700 bg-rose-50'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex shadow-inner">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHigh ? 'bg-emerald-500' : isMed ? 'bg-indigo-600' : 'bg-rose-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Turnout Ratio & College Overview Stacked Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-indigo-700" />
              <h2 className="text-base font-black text-slate-900 tracking-tight">Today's Attendance Ratio</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Overall Turnout</span>
                <span className="font-black text-slate-900 text-sm">{stats?.turnoutPercentage || 0}%</span>
              </div>

              {/* Stacked Ratio Bar */}
              <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${stats?.turnoutPercentage || 0}%` }}
                  className="bg-emerald-500 h-full transition-all duration-500"
                  title="Present"
                />
                <div
                  style={{
                    width: `${
                      stats && stats.presentToday + stats.absentToday > 0
                        ? 100 - (stats?.turnoutPercentage || 0)
                        : 0
                    }%`,
                  }}
                  className="bg-rose-500 h-full transition-all duration-500"
                  title="Absent"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="block text-[10px] font-bold text-emerald-600 uppercase">Present</span>
                  <span className="font-black text-emerald-800 text-base">{stats?.presentToday || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                  <span className="block text-[10px] font-bold text-rose-600 uppercase">Absent</span>
                  <span className="font-black text-rose-800 text-base">{stats?.absentToday || 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            Automatic keep-alive active (7:00 AM – 6:00 PM PKT)
          </div>
        </div>
      </div>

      {/* Chronic Truancy Urgent Action Strip (If Any) */}
      {truancyAlerts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 mb-8 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
              <h3 className="text-sm font-black text-rose-900 uppercase tracking-wider">
                Urgent Action Required: Chronic Absentees ({truancyAlerts.length} Students &gt;= 3 Days)
              </h3>
            </div>
            <span className="text-xs text-rose-700 font-semibold">Immediate Parent Call Recommended</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {truancyAlerts.slice(0, 6).map((alert) => (
              <div
                key={alert._id}
                className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-xs flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{alert.studentId?.fullName}</span>
                    <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      {alert.consecutiveDays} Days
                    </span>
                  </div>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Roll #{alert.studentId?.rollNo} • {alert.classSectionId?.name}
                  </span>
                  <span className="block text-[11px] font-medium text-indigo-700">
                    Parent: {alert.studentId?.parentPhone}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedAlert(alert)}
                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>Log</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Faceted Filters Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs mb-6">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
          <Filter className="w-4 h-4 text-indigo-600" />
          <span>Filter Attendance by Program, Class, Date & Truancy</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Program Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Program</label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
            >
              <option value="">All Programs</option>
              {programs.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Class / Section</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
            >
              <option value="ALL">All Students</option>
              <option value="ABSENT">Absentees Only</option>
              <option value="CHRONIC_TRUANT">3+ Days Consecutive Absent</option>
            </select>
          </div>

          {/* Search Term */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search Student / Roll</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name or Roll No..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filtered Attendance Audit Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-sm text-slate-900">Attendance Audit Records ({allRows.length})</span>
          <span className="text-xs text-slate-500 font-medium">Date: {selectedDate}</span>
        </div>

        {loadingTable ? (
          <SkeletonTable rows={5} />
        ) : allRows.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-semibold">
            No attendance records match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Roll</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Class / Section</th>
                  <th className="py-3 px-4">Parent Phone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Consecutive</th>
                  <th className="py-3 px-4 text-right">3-Day Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {allRows.map((row, idx) => {
                  const isAbsent = row.status === 'ABSENT';
                  const isChronic = row.consecutiveAbsences >= 3;

                  return (
                    <tr key={idx} className={isAbsent ? 'bg-rose-50/20 hover:bg-rose-50/40' : 'hover:bg-slate-50'}>
                      <td className="py-3 px-4 font-bold text-slate-900">{row.rollNo}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{row.studentName}</td>
                      <td className="py-3 px-4">{row.className}</td>
                      <td className="py-3 px-4 text-indigo-700 font-semibold">{row.parentPhone}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                            row.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.status === 'ABSENT'
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold">
                        {row.consecutiveAbsences > 0 ? `${row.consecutiveAbsences} days` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isChronic ? (
                          <span className="text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full">
                            🚨 CRITICAL TRUANT
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Normal</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Truancy Log Action Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Log Parent Action</h3>
            <p className="text-xs text-slate-500 mt-1">
              Student: <strong className="text-slate-800">{selectedAlert.studentId?.fullName}</strong> (Roll #
              {selectedAlert.studentId?.rollNo})
            </p>

            <div className="mt-4">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Administrative Notes
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="e.g. Called father. Student was unwell, will attend tomorrow..."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolveAlert(selectedAlert._id)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-900 hover:bg-indigo-800 text-white"
              >
                Save & Mark Contacted
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
