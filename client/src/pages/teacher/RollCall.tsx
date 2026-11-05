import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { db, type IOfflineStudent } from '../../offline/db';
import { saveAttendanceLocally } from '../../offline/syncEngine';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertTriangle,
  Save,
  Check,
  ShieldAlert,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';

type StatusType = 'PRESENT' | 'ABSENT' | 'LEAVE';

interface StudentAttendanceItem {
  studentId: string;
  rollNo: string;
  studentName: string;
  fatherName?: string;
  parentPhone: string;
  status: StatusType;
  consecutiveAbsences: number;
}

export const RollCall: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Date Boundaries: Past max 1 day (yesterday); Future max end of current week (Sunday)
  const bounds = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + daysUntilSunday);

    const formatYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      todayStr: formatYMD(today),
      yesterdayStr: formatYMD(yesterday),
      minDateStr: formatYMD(yesterday),
      maxDateStr: formatYMD(endOfWeek),
    };
  }, []);

  const classIdParam = searchParams.get('classId') || '';
  const [selectedClassId, setSelectedClassId] = useState<string>(classIdParam);
  const [classes, setClasses] = useState<any[]>([]);
  const [currentClass, setCurrentClass] = useState<any>(null);
  const [date, setDate] = useState<string>(bounds.todayStr);

  const [records, setRecords] = useState<StudentAttendanceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Validate current date selection
  const isDateOutOfRange = date < bounds.minDateStr || date > bounds.maxDateStr;

  // Load available classes
  useEffect(() => {
    const loadClasses = async () => {
      try {
        let list: any[] = [];
        if (navigator.onLine) {
          const res = await api.get('/academic/classes');
          if (res.data.success) list = res.data.classes;
        } else {
          list = await db.classes.toArray();
        }
        setClasses(list);

        if (!selectedClassId && list.length > 0) {
          setSelectedClassId(list[0]._id);
        }
      } catch {
        const local = await db.classes.toArray();
        setClasses(local);
        if (!selectedClassId && local.length > 0) {
          setSelectedClassId(local[0]._id);
        }
      }
    };
    loadClasses();
  }, []);

  // When class or date changes, load student list & existing session
  useEffect(() => {
    if (!selectedClassId) return;

    const loadRosterAndSession = async () => {
      setLoading(true);
      try {
        const cls = classes.find((c) => c._id === selectedClassId);
        setCurrentClass(cls || null);

        let studentList: IOfflineStudent[] = [];

        // Check if there's already an attendance session for this date & class
        let existingSession: any = null;
        if (navigator.onLine) {
          try {
            const sessRes = await api.get(`/attendance/session?date=${date}&classSectionId=${selectedClassId}`);
            if (sessRes.data.session) {
              existingSession = sessRes.data.session;
            }
          } catch {
            // ignore
          }

          const stdRes = await api.get(`/students?classSectionId=${selectedClassId}&status=active`);
          if (stdRes.data.success) {
            studentList = stdRes.data.students;
          }
        } else {
          studentList = await db.students.where('classSectionId').equals(selectedClassId).toArray();
        }

        if (existingSession && existingSession.records && existingSession.records.length > 0) {
          const recordMap = new Map(existingSession.records.map((r: any) => [r.studentId, r]));
          const merged: StudentAttendanceItem[] = studentList.map((s) => {
            const existing: any = recordMap.get(s._id);
            return {
              studentId: s._id,
              rollNo: s.rollNo,
              studentName: s.fullName,
              fatherName: s.fatherName || existing?.fatherName || '',
              parentPhone: s.parentPhone,
              status: (existing?.status as StatusType) || 'PRESENT',
              consecutiveAbsences: existing?.consecutiveAbsences ?? (s.consecutiveAbsences || 0),
            };
          });
          setRecords(merged);
          setIsConfirmed(!!existingSession.isConfirmed);
        } else {
          // Initialize fresh roll call (Default all PRESENT)
          const initial: StudentAttendanceItem[] = studentList.map((s) => ({
            studentId: s._id,
            rollNo: s.rollNo,
            studentName: s.fullName,
            fatherName: s.fatherName || '',
            parentPhone: s.parentPhone,
            status: 'PRESENT',
            consecutiveAbsences: s.consecutiveAbsences || 0,
          }));
          setRecords(initial);
          setIsConfirmed(false);
        }
      } catch (err: any) {
        toast.error('Could not load student roster.');
      } finally {
        setLoading(false);
      }
    };

    loadRosterAndSession();
  }, [selectedClassId, date, classes]);

  // Toggle status for a student
  const toggleStatus = (index: number) => {
    setRecords((prev) => {
      const updated = [...prev];
      const current = updated[index].status;
      let nextStatus: StatusType = 'PRESENT';
      if (current === 'PRESENT') nextStatus = 'ABSENT';
      else if (current === 'ABSENT') nextStatus = 'LEAVE';
      else nextStatus = 'PRESENT';

      updated[index] = { ...updated[index], status: nextStatus };
      return updated;
    });
  };

  const markAll = (status: StatusType) => {
    setRecords((prev) => prev.map((r) => ({ ...r, status })));
    toast.success(`Marked all as ${status}!`);
  };

  const presentCount = records.filter((r) => r.status === 'PRESENT').length;
  const absentCount = records.filter((r) => r.status === 'ABSENT').length;
  const leaveCount = records.filter((r) => r.status === 'LEAVE').length;

  // Handle Save (Draft vs Final Confirm)
  const handleSave = async (confirmNow: boolean) => {
    if (!selectedClassId || records.length === 0) return;

    if (isDateOutOfRange) {
      toast.error(
        'Faculty Policy: Teachers can only record or edit attendance for yesterday, today, or current week days. Older records require Admin assistance.'
      );
      return;
    }

    setSubmitting(true);
    const payload = {
      date,
      classSectionId: selectedClassId,
      programId: currentClass?.programId?._id || currentClass?.programId,
      academicYear: currentClass?.academicYear || '2026-2027',
      records,
      isConfirmed: confirmNow,
    };

    try {
      if (navigator.onLine) {
        const response = await api.post('/attendance/submit', payload);
        if (response.data.success) {
          setIsConfirmed(response.data.session.isConfirmed);
          toast.success(response.data.message);
          setShowConfirmModal(false);
        }
      } else {
        // Save locally in IndexedDB
        await saveAttendanceLocally({
          idempotencyKey: `${date}_${selectedClassId}`,
          date,
          classSectionId: selectedClassId,
          programId: currentClass?.programId?._id || currentClass?.programId || '',
          academicYear: currentClass?.academicYear || '2026-2027',
          records,
          presentCount,
          absentCount,
          leaveCount,
        });
        toast('Saved locally in offline mode! Will auto-sync when online.', { icon: '💾' });
        setShowConfirmModal(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28">
      {/* Top Header & Back Button */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={() => navigate('/teacher')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-900 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>My Classes</span>
        </button>

        <div className="flex items-center gap-2">
          {isConfirmed ? (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
              Confirmed & Finalized
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              <Clock className="w-4 h-4" />
              Draft Mode
            </span>
          )}
        </div>
      </div>

      {/* Class & Date Selector Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Select Class / Section
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.programId?.code || 'Class'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Attendance Date
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDate(bounds.todayStr)}
                  className={`px-2 py-0.5 rounded-md font-bold transition ${
                    date === bounds.todayStr
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDate(bounds.yesterdayStr)}
                  className={`px-2 py-0.5 rounded-md font-bold transition ${
                    date === bounds.yesterdayStr
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Yesterday
                </button>
              </div>
            </div>
            <input
              type="date"
              value={date}
              min={bounds.minDateStr}
              max={bounds.maxDateStr}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                isDateOutOfRange
                  ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/50'
                  : 'border-slate-200 focus:ring-indigo-600'
              }`}
            />
          </div>
        </div>

        {/* Date Policy Context Banner */}
        <div className="mt-3">
          {date === bounds.yesterdayStr ? (
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Editing Yesterday's Attendance: You can review and update this session.</span>
            </div>
          ) : date === bounds.todayStr ? (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Today's Official Roll Call: Ready to record student presence.</span>
            </div>
          ) : isDateOutOfRange ? (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Date Restricted: Faculty policy allows only yesterday, today, and current week days. Older records require Admin modification.
              </span>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Scheduled Current Week Session: Permitted within current week schedule.</span>
            </div>
          )}
        </div>

        {/* Quick Summary Pill Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-slate-500">Total: {records.length}</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Present: {presentCount}
            </span>
            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Absent: {absentCount}
            </span>
            {leaveCount > 0 && (
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Leave: {leaveCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => markAll('PRESENT')}
              className="text-xs font-bold text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
            >
              All Present
            </button>
            <button
              onClick={() => markAll('ABSENT')}
              className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 transition"
            >
              All Absent
            </button>
          </div>
        </div>
      </div>

      {/* Student Roll Call List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-4 border border-slate-200 animate-pulse h-16" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
          <p className="text-sm font-bold text-slate-600">No students enrolled in this class section.</p>
          <p className="text-xs text-slate-400 mt-1">Add students via the Admin portal to begin taking roll call.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Quick Classroom Roll Search */}
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Find student by roll number or name..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-xs"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {records.map((record, index) => {
            const isMatch =
              !searchFilter ||
              record.studentName.toLowerCase().includes(searchFilter.toLowerCase()) ||
              (record.fatherName && record.fatherName.toLowerCase().includes(searchFilter.toLowerCase())) ||
              record.rollNo.toLowerCase().includes(searchFilter.toLowerCase());

            if (!isMatch) return null;

            const isPresent = record.status === 'PRESENT';
            const isAbsent = record.status === 'ABSENT';
            const isLeave = record.status === 'LEAVE';
            const isChronicTruant = record.consecutiveAbsences >= 2;

            return (
              <div
                key={record.studentId}
                onClick={() => toggleStatus(index)}
                className={`p-4 rounded-2xl border transition duration-150 flex items-center justify-between gap-4 cursor-pointer select-none tap-touch shadow-xs ${
                  isAbsent
                    ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/60'
                    : isLeave
                    ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/60'
                    : 'bg-white border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      isAbsent
                        ? 'bg-rose-600 text-white'
                        : isLeave
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {record.rollNo}
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm leading-tight">{record.studentName}</span>
                      {isChronicTruant && (
                        <span className="flex items-center gap-0.5 text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          {record.consecutiveAbsences} Days Absent
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      {record.fatherName && (
                        <span className="text-[11px] font-bold text-indigo-700">
                          s/o {record.fatherName}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">Parent: {record.parentPhone || 'No Phone'}</span>
                    </div>
                  </div>
                </div>

                {/* Status Toggle Badge */}
                <div>
                  {isPresent && (
                    <span className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      PRESENT
                    </span>
                  )}
                  {isAbsent && (
                    <span className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-rose-600 text-white shadow-xs flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" />
                      ABSENT
                    </span>
                  )}
                  {isLeave && (
                    <span className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-amber-500 text-white shadow-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      LEAVE
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Action Drawer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-black text-slate-900">
              {presentCount} Present • {absentCount} Absent
            </span>
            <span className="text-[11px] text-slate-500">
              {isConfirmed ? 'Attendance confirmed' : 'Tap student to toggle status'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave(false)}
              disabled={submitting || isDateOutOfRange}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
                isDateOutOfRange
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
              }`}
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>Save Draft</span>
            </button>

            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={submitting || isDateOutOfRange}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition ${
                isDateOutOfRange
                  ? 'bg-indigo-300 text-white cursor-not-allowed'
                  : 'bg-indigo-900 hover:bg-indigo-800 text-white cursor-pointer'
              }`}
            >
              <Send className="w-4 h-4 text-indigo-300" />
              <span>Confirm & Finalize</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation & Dispatch Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-900 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6 text-indigo-600" />
            </div>

            <h3 className="text-lg font-black text-slate-900 tracking-tight">Confirm & Finalize Attendance?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              You are confirming attendance for{' '}
              <strong className="text-slate-800">{currentClass?.name}</strong> on{' '}
              <strong className="text-slate-800">{date}</strong>.
            </p>

            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Enrolled:</span>
                <span className="font-bold text-slate-800">{records.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700 font-semibold">Marked Present:</span>
                <span className="font-bold text-emerald-700">{presentCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-700 font-semibold">Marked Absent:</span>
                <span className="font-bold text-rose-700">{absentCount}</span>
              </div>
            </div>

            {absentCount > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>{absentCount} absentees</strong> will be automatically placed in the queue for automated parent
                  notifications (spaced with the 15-20s pacer).
                </span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-900 hover:bg-indigo-800 text-white shadow-md transition flex items-center gap-2"
              >
                {submitting ? 'Confirming...' : 'Yes, Confirm & Queue Notices'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
