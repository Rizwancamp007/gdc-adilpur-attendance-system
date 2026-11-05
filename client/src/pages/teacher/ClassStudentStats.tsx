import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import {
  GraduationCap,
  Search,
  Users,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Phone,
  MessageCircle,
  ArrowLeft,
  Printer,
  ShieldAlert,
  Percent,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface StudentStatItem {
  _id: string;
  rollNo: string;
  fullName: string;
  fatherName: string;
  caste?: string;
  gender?: string;
  className?: string;
  classSectionId?: string;
  programCode?: string;
  parentPhone: string;
  studentPhone?: string;
  totalDaysPresent: number;
  totalDaysAbsent: number;
  totalDaysLeave: number;
  consecutiveAbsences: number;
  percentage: number;
  bracket: 'GOOD' | 'WARNING' | 'CRITICAL';
}

interface ClassSummary {
  totalStudents: number;
  totalSessions: number;
  avgAttendance: number;
  shortageCount: number;
  chronicTruantsCount: number;
}

export const ClassStudentStats: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const classIdParam = searchParams.get('classId') || '';
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(classIdParam || 'all');
  const [currentClass, setCurrentClass] = useState<any>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<ClassSummary | null>(null);
  const [students, setStudents] = useState<StudentStatItem[]>([]);

  // Filtering & Search
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'GOOD' | 'WARNING' | 'CRITICAL' | 'CHRONIC'>('ALL');

  // High-performance Pagination State (Defaults to 50 students per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Load classes assigned to teacher
  useEffect(() => {
    const loadTeacherClasses = async () => {
      try {
        const res = await api.get('/academic/classes');
        if (res.data.success && res.data.classes.length > 0) {
          setClasses(res.data.classes);
          if (!classIdParam) {
            setSelectedClassId('all');
          }
        }
      } catch {
        toast.error('Failed to load class list.');
      }
    };
    loadTeacherClasses();
  }, [classIdParam]);

  // When selectedClassId changes, fetch detailed attendance statistics
  useEffect(() => {
    if (!selectedClassId) return;

    const fetchClassStats = async () => {
      setLoading(true);
      try {
        if (selectedClassId === 'all') {
          setCurrentClass({ name: 'All Assigned Classes', yearLevel: 'Composite', section: 'All' });
        } else {
          const cls = classes.find((c) => c._id === selectedClassId);
          setCurrentClass(cls || null);
        }

        const res = await api.get(`/attendance/class-stats/${selectedClassId}`);
        if (res.data.success) {
          setSummary(res.data.summary);
          setStudents(res.data.students);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Error loading attendance stats.');
      } finally {
        setLoading(false);
      }
    };

    fetchClassStats();
  }, [selectedClassId, classes]);

  // Reset pagination to page 1 whenever search, filter, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, selectedClassId, pageSize]);

  // Filter students based on search and selected health filter
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(search.toLowerCase()) ||
      s.fatherName.toLowerCase().includes(search.toLowerCase()) ||
      (s.caste && s.caste.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'GOOD') return s.bracket === 'GOOD';
    if (statusFilter === 'WARNING') return s.bracket === 'WARNING';
    if (statusFilter === 'CRITICAL') return s.bracket === 'CRITICAL';
    if (statusFilter === 'CHRONIC') return s.consecutiveAbsences >= 3;

    return true;
  });

  // Pagination Math
  const totalFiltered = filteredStudents.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalFiltered / pageSize) || 1;
  const startIndex = pageSize === -1 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = pageSize === -1 ? totalFiltered : Math.min(startIndex + pageSize, totalFiltered);
  const paginatedStudents = pageSize === -1 ? filteredStudents : filteredStudents.slice(startIndex, endIndex);

  const generateWhatsAppLink = (student: StudentStatItem) => {
    let phone = student.parentPhone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '92' + phone.substring(1);
    }
    const isFemale = student.gender === 'Female';
    const relation = isFemale ? 'توهان جي نياڻي' : 'توهان جو پٽ';
    const fatherGreeting = student.fatherName ? `محترم ${student.fatherName}` : 'محترم والد';
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());

    const message = encodeURIComponent(
      `${fatherGreeting}، ${relation} ${student.fullName}، رول نمبر ${student.rollNo}، ڪلاس ${
        student.className || currentClass?.name || 'Class'
      } اڄ ${todayStr} گورنمينٽ ڊگري ڪاليج عادلپور مان غير حاضر (غير حاضر) آهي. مھرباني ڪري حاضري کي يقيني بڻايو. پرنسپال، جي ڊي سي عادلپور.`
    );
    return `https://wa.me/${phone}?text=${message}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => navigate('/teacher')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs transition mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Student Attendance & Eligibility Roster
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Individual student percentages, board exam eligibility thresholds, and parent contacts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Sheet</span>
          </button>

          <button
            onClick={() =>
              navigate(
                `/teacher/roll-call${selectedClassId && selectedClassId !== 'all' ? `?classId=${selectedClassId}` : ''}`
              )
            }
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-indigo-300" />
            <span>Take Roll Call</span>
          </button>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-900 shrink-0">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Selected Cohort
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="mt-0.5 bg-transparent font-black text-slate-900 text-base focus:outline-none cursor-pointer"
            >
              <option value="all">All Assigned Classes ({classes.length} Sections)</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} ({cls.programId?.code || 'Class'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {currentClass && (
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="bg-slate-100 px-3 py-1 rounded-xl">Year: {currentClass.yearLevel}</span>
            <span className="bg-slate-100 px-3 py-1 rounded-xl">Section: {currentClass.section}</span>
            <span className="bg-indigo-50 text-indigo-900 px-3 py-1 rounded-xl font-bold">
              Shift: {currentClass.shift || 'Morning'}
            </span>
          </div>
        )}
      </div>

      {/* Analytics Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase">Enrolled Students</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{summary.totalStudents}</div>
            <span className="text-[10px] text-slate-500 font-medium">Active roster</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase">Sessions Held</span>
              <Percent className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{summary.totalSessions}</div>
            <span className="text-[10px] text-slate-500 font-medium">Confirmed sessions</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase">Class Average</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700">{summary.avgAttendance}%</div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full"
                style={{ width: `${Math.min(summary.avgAttendance, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase">Exam Shortage</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600">{summary.shortageCount}</div>
            <span className="text-[10px] text-slate-500 font-medium">Below 75% Board rule</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase">Chronic Truants</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600">{summary.chronicTruantsCount}</div>
            <span className="text-[10px] text-slate-500 font-medium">≥ 3 consecutive absent</span>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Roll No, Student Name, Father Name, or Caste..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-bold">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({students.length})
          </button>
          <button
            onClick={() => setStatusFilter('GOOD')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              statusFilter === 'GOOD'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Eligible ≥75%
          </button>
          <button
            onClick={() => setStatusFilter('WARNING')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              statusFilter === 'WARNING'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Warning 60–74%
          </button>
          <button
            onClick={() => setStatusFilter('CRITICAL')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              statusFilter === 'CRITICAL'
                ? 'bg-rose-700 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Shortage &lt;60%
          </button>
          <button
            onClick={() => setStatusFilter('CHRONIC')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              statusFilter === 'CHRONIC'
                ? 'bg-rose-900 text-white'
                : 'bg-rose-100 text-rose-900 hover:bg-rose-200'
            }`}
          >
            Chronic (≥3 Days)
          </button>
        </div>
      </div>

      {/* Top Pagination Summary & Page Size Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 text-xs font-semibold text-slate-500">
        <div>
          Showing <span className="font-bold text-slate-900">{totalFiltered === 0 ? 0 : startIndex + 1}</span> to{' '}
          <span className="font-bold text-slate-900">{endIndex}</span> of{' '}
          <span className="font-bold text-slate-900">{totalFiltered}</span> students
          {totalFiltered !== students.length && ` (filtered from ${students.length})`}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px]">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={-1}>All ({totalFiltered})</option>
            </select>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <span className="px-2 text-xs font-bold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Student List View */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-4 border border-slate-200 animate-pulse h-16" />
          ))}
        </div>
      ) : paginatedStudents.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">No Students Found</h3>
          <p className="text-xs text-slate-500 mt-1">Try clearing your search query or changing the filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Roll</th>
                  <th className="py-3 px-4">Student Details</th>
                  <th className="py-3 px-4 text-center">Present / Total</th>
                  <th className="py-3 px-4 text-center">Turnout Rate</th>
                  <th className="py-3 px-4 text-center">Eligibility Status</th>
                  <th className="py-3 px-4 text-center">Parent Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedStudents.map((std) => {
                  const isEligible = std.percentage >= 75.0;
                  const isWarning = std.percentage >= 60.0 && std.percentage < 75.0;
                  const isChronic = std.consecutiveAbsences >= 3;

                  return (
                    <tr
                      key={std._id}
                      className={`hover:bg-slate-50/80 transition ${isChronic ? 'bg-rose-50/30' : ''}`}
                    >
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        <span className="bg-slate-100 px-2 py-1 rounded-md">#{std.rollNo}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-xs sm:text-sm">{std.fullName}</span>
                          <span className="text-[11px] font-bold text-indigo-700 tracking-wide mt-0.5">
                            {std.gender === 'Female' ? 'd/o' : 's/o'} {std.fatherName || 'N/A'}{' '}
                            {std.caste && `(${std.caste})`}
                          </span>
                          {selectedClassId === 'all' && std.className && (
                            <span className="inline-block mt-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded w-max">
                              {std.className}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-800">
                          {std.totalDaysPresent}{' '}
                          <span className="text-slate-400 font-normal">/ {summary?.totalSessions || 0}</span>
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {std.totalDaysAbsent} Absent • {std.totalDaysLeave} Leave
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span
                            className={`font-black text-sm ${
                              isEligible ? 'text-emerald-700' : isWarning ? 'text-amber-600' : 'text-rose-700'
                            }`}
                          >
                            {std.percentage}%
                          </span>
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isEligible ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(std.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {isEligible ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              Eligible (≥75%)
                            </span>
                          ) : isWarning ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              Shortage Risk
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                              <ShieldAlert className="w-3 h-3" />
                              Ineligible (&lt;75%)
                            </span>
                          )}

                          {isChronic && (
                            <span className="text-[10px] font-black text-rose-800 bg-rose-100 px-2 py-0.2 rounded">
                              🚨 {std.consecutiveAbsences} days absent
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <a
                            href={generateWhatsAppLink(std)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Send WhatsApp Notice"
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>

                          <a
                            href={`tel:${std.parentPhone}`}
                            title="Call Parent"
                            className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{std.parentPhone}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination Controls Bar */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <span className="text-xs text-slate-500 font-semibold">
                Page <span className="font-bold text-slate-900">{currentPage}</span> of{' '}
                <span className="font-bold text-slate-900">{totalPages}</span> ({totalFiltered} total students)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = Math.min(currentPage - 2 + i, totalPages);
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-indigo-900 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};