import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { db } from '../../offline/db';
import { cacheRostersForOffline } from '../../offline/syncEngine';
import { GraduationCap, Calendar, ArrowRight, CheckCircle2, Clock, Sparkles, Users } from 'lucide-react';
import { SkeletonClassCards } from '../../components/SkeletonLoader';
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

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [todayDate] = useState<string>(getTodayPkt());
  const [markedMap, setMarkedMap] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  const fetchTeacherClasses = async () => {
    // ⚡ Fast Initial Paint: Load cached classes from Dexie instantly (<50ms)
    try {
      const cached = await db.classes.toArray();
      if (cached && cached.length > 0) {
        setClasses(cached);
        setLoading(false);
      }
    } catch {
      // ignore
    }

    try {
      let classList: any[] = [];

      if (navigator.onLine) {
        const res = await api.get('/academic/classes');
        if (res.data.success) {
          classList = res.data.classes;

          // Fetch all students for offline caching
          const stdRes = await api.get('/students');
          if (stdRes.data.success) {
            await cacheRostersForOffline(classList, stdRes.data.students);
          }
        }
      } else {
        // Load from IndexedDB
        classList = await db.classes.toArray();
      }

      setClasses(classList);

      // Check today's attendance sessions
      if (navigator.onLine && classList.length > 0) {
        const map: Record<string, any> = {};
        for (const cls of classList) {
          try {
            const sessionRes = await api.get(`/attendance/session?date=${todayDate}&classSectionId=${cls._id}`);
            if (sessionRes.data.session) {
              map[cls._id] = sessionRes.data.session;
            }
          } catch {
            // ignore
          }
        }
        setMarkedMap(map);
      }
    } catch (err: any) {
      toast.error('Could not load classes. Operating from local cache.');
      const localClasses = await db.classes.toArray();
      setClasses(localClasses);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClass = (classId: string) => {
    navigate(`/teacher/roll-call?classId=${classId}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Teacher Attendance Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome, {user?.fullName || 'Professor'}
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Department of {user?.department || 'General'} • Date: {todayDate}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-xs font-semibold">
            <Calendar className="w-4 h-4 text-indigo-300" />
            <span>Today's Sessions</span>
          </div>
        </div>
      </div>

      {/* Class Sessions Section */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Assigned Classes & Sections</h2>
          <p className="text-xs text-slate-500">Select a class below to take or review today's roll call.</p>
        </div>
        <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          {classes.length} Classes Assigned
        </span>
      </div>

      {loading && classes.length === 0 ? (
        <SkeletonClassCards />
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
          <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Classes Assigned</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Please ask the college Administrator to assign your subject classes and sections in the Admin panel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => {
            const session = markedMap[cls._id];
            const isMarked = !!session;
            const isConfirmed = session?.isConfirmed;

            return (
              <div
                key={cls._id}
                onClick={() => handleSelectClass(cls._id)}
                className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition duration-200 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                      {cls.programId?.code || 'Degree'}
                    </span>
                    {isConfirmed ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirmed
                      </span>
                    ) : isMarked ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        Draft Saved
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        Not Marked
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-900 transition">
                    {cls.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {cls.yearLevel} • Section {cls.section} • {cls.shift || 'Morning'}
                  </p>

                  {session && (
                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 text-center text-xs">
                      <div>
                        <span className="block text-slate-400 text-[10px]">Total</span>
                        <span className="font-bold text-slate-800">{session.totalStudents}</span>
                      </div>
                      <div>
                        <span className="block text-emerald-600 text-[10px]">Present</span>
                        <span className="font-bold text-emerald-700">{session.presentCount}</span>
                      </div>
                      <div>
                        <span className="block text-rose-600 text-[10px]">Absent</span>
                        <span className="font-bold text-rose-700">{session.absentCount}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/teacher/stats?classId=${cls._id}`);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-900 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Student Stats</span>
                  </button>

                  <div className="flex items-center gap-1 text-xs font-bold text-indigo-900 group-hover:text-indigo-700">
                    <span>{isConfirmed ? 'Edit Session' : 'Take Roll Call'}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
