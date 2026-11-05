import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  Layers,
  Users,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ProgramItem {
  _id: string;
  name: string;
  code: string;
  level: string;
  durationYears: number;
  description?: string;
}

interface ClassItem {
  _id: string;
  name: string;
  programId: ProgramItem;
  academicYear: string;
  yearLevel: string;
  section: string;
  shift: string;
  inchargeTeacherId?: {
    _id: string;
    fullName: string;
    username: string;
    department?: string;
  };
}

export const AcademicManager: React.FC = () => {
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Program Modal State
  const [showProgramModal, setShowProgramModal] = useState<boolean>(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [programForm, setProgramForm] = useState({
    name: '',
    code: '',
    level: 'Intermediate',
    durationYears: 2,
    description: '',
  });

  // Class Section Modal State
  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classForm, setClassForm] = useState({
    name: '',
    programId: '',
    academicYear: '2026-2027',
    yearLevel: '1st Year (XI)',
    section: 'A',
    shift: 'Morning',
    inchargeTeacherId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [progRes, clsRes, userRes, stdRes] = await Promise.all([
        api.get('/academic/programs'),
        api.get('/academic/classes'),
        api.get('/auth/users'),
        api.get('/students'),
      ]);

      if (progRes.data.success) {
        setPrograms(progRes.data.programs);
        if (progRes.data.programs.length > 0 && !classForm.programId) {
          setClassForm((prev) => ({ ...prev, programId: progRes.data.programs[0]._id }));
        }
      }
      if (clsRes.data.success) setClasses(clsRes.data.classes);
      if (userRes.data.success) {
        const teacherUsers = userRes.data.users.filter((u: any) => u.role === 'teacher');
        setTeachers(teacherUsers);
      }

      // Compute student count per class section
      if (stdRes.data.success) {
        const counts: Record<string, number> = {};
        for (const s of stdRes.data.students) {
          const cid = typeof s.classSectionId === 'object' ? s.classSectionId?._id : s.classSectionId;
          if (cid) counts[cid] = (counts[cid] || 0) + 1;
        }
        setStudentCounts(counts);
      }
    } catch {
      toast.error('Failed to load academic data.');
    } finally {
      setLoading(false);
    }
  };

  // ────────── PROGRAM ACTIONS ──────────

  const openAddProgram = () => {
    setEditingProgramId(null);
    setProgramForm({
      name: '',
      code: '',
      level: 'Intermediate',
      durationYears: 2,
      description: '',
    });
    setShowProgramModal(true);
  };

  const openEditProgram = (prog: ProgramItem) => {
    setEditingProgramId(prog._id);
    setProgramForm({
      name: prog.name,
      code: prog.code,
      level: prog.level || 'Intermediate',
      durationYears: prog.durationYears || 2,
      description: prog.description || '',
    });
    setShowProgramModal(true);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProgramId) {
        const res = await api.put(`/academic/programs/${editingProgramId}`, programForm);
        if (res.data.success) {
          toast.success('Program updated successfully.');
        }
      } else {
        const res = await api.post('/academic/programs', programForm);
        if (res.data.success) {
          toast.success('New program added successfully.');
        }
      }
      setShowProgramModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving program.');
    }
  };

  const handleDeleteProgram = async (prog: ProgramItem) => {
    if (
      !window.confirm(
        `Are you sure you want to delete program "${prog.name}" (${prog.code})? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await api.delete(`/academic/programs/${prog._id}`);
      if (res.data.success) {
        toast.success(`Program "${prog.code}" deleted.`);
        loadData();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete program.';
      if (msg.includes('active class section(s) are linked')) {
        if (
          window.confirm(
            `${msg}\n\nDo you want to FORCE DELETE this program along with its empty class sections?`
          )
        ) {
          try {
            const forceRes = await api.delete(`/academic/programs/${prog._id}?force=true`);
            if (forceRes.data.success) {
              toast.success(`Program "${prog.code}" and linked classes deleted.`);
              loadData();
              return;
            }
          } catch (fErr: any) {
            toast.error(fErr.response?.data?.message || 'Force delete failed.');
            return;
          }
        }
      }
      toast.error(msg);
    }
  };

  // ────────── CLASS SECTION ACTIONS ──────────

  const openAddClass = () => {
    setEditingClassId(null);
    setClassForm({
      name: '',
      programId: programs[0]?._id || '',
      academicYear: '2026-2027',
      yearLevel: '1st Year (XI)',
      section: 'A',
      shift: 'Morning',
      inchargeTeacherId: '',
    });
    setShowClassModal(true);
  };

  const openEditClass = (cls: ClassItem) => {
    setEditingClassId(cls._id);
    setClassForm({
      name: cls.name,
      programId: cls.programId?._id || '',
      academicYear: cls.academicYear || '2026-2027',
      yearLevel: cls.yearLevel || '1st Year (XI)',
      section: cls.section || 'A',
      shift: cls.shift || 'Morning',
      inchargeTeacherId: cls.inchargeTeacherId?._id || '',
    });
    setShowClassModal(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClassId) {
        const res = await api.put(`/academic/classes/${editingClassId}`, classForm);
        if (res.data.success) {
          toast.success('Class section updated successfully.');
        }
      } else {
        const res = await api.post('/academic/classes', classForm);
        if (res.data.success) {
          toast.success('Class section added successfully.');
        }
      }
      setShowClassModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving class section.');
    }
  };

  const handleDeleteClass = async (cls: ClassItem) => {
    const enrolled = studentCounts[cls._id] || 0;
    if (enrolled > 0) {
      toast.error(`Cannot delete "${cls.name}": ${enrolled} active students enrolled. Remove students first.`);
      return;
    }

    if (!window.confirm(`Delete class section "${cls.name}"?`)) return;

    try {
      const res = await api.delete(`/academic/classes/${cls._id}`);
      if (res.data.success) {
        toast.success('Class section deleted.');
        loadData();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Delete failed.';
      if (msg.includes('attendance session records exist')) {
        if (
          window.confirm(
            `${msg}\n\nDo you want to FORCE DELETE this class along with its attendance records?`
          )
        ) {
          try {
            const forceRes = await api.delete(`/academic/classes/${cls._id}?force=true`);
            if (forceRes.data.success) {
              toast.success(`Class section "${cls.name}" deleted.`);
              loadData();
              return;
            }
          } catch (fErr: any) {
            toast.error(fErr.response?.data?.message || 'Force delete failed.');
            return;
          }
        }
      }
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Curriculum & Hierarchy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Academic Programs & Class Sections
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure dynamic degree offerings (Intermediate, ADP, BS 4-Year) and manage assigned classroom sections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddProgram}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Program</span>
          </button>

          <button
            onClick={openAddClass}
            className="px-4 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Class Section</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Programs List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-slate-900 text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Degree Programs ({programs.length})</span>
              </h2>
              <span className="text-[11px] font-bold text-slate-400">Dynamic</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((n) => (
                  <div key={n} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 animate-pulse h-20" />
                ))}
              </div>
            ) : programs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No programs configured. Click "Add Program" to create one.
              </div>
            ) : (
              <div className="space-y-3">
                {programs.map((prog) => (
                  <div
                    key={prog._id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition duration-150 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-indigo-950 bg-indigo-100 px-2 py-0.5 rounded">
                        {prog.code}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditProgram(prog)}
                          title="Edit Program"
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProgram(prog)}
                          title="Delete Program"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-2">{prog.name}</h3>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 font-semibold">
                      <span>{prog.level}</span>
                      <span>{prog.durationYears} Years</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Class Sections */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Active Classroom Sections ({classes.length})</span>
              </h2>
              <span className="text-xs text-slate-400">Total Enrolled: {Object.values(studentCounts).reduce((a, b) => a + b, 0)}</span>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-12 bg-slate-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : classes.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No active classes found. Click "Add Class Section" to register a class.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Class Section</th>
                      <th className="py-3 px-4">Program</th>
                      <th className="py-3 px-4">Year / Level</th>
                      <th className="py-3 px-4 text-center">Enrolled</th>
                      <th className="py-3 px-4">In-Charge Teacher</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {classes.map((cls) => {
                      const enrolled = studentCounts[cls._id] || 0;
                      return (
                        <tr key={cls._id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-black text-slate-900">{cls.name}</div>
                            <div className="text-[10px] text-slate-400">
                              Section {cls.section} • {cls.shift} Shift
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="bg-indigo-50 text-indigo-900 font-bold px-2 py-0.5 rounded text-[11px]">
                              {cls.programId?.code || '—'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-slate-700">{cls.yearLevel}</td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full text-[11px]">
                              <Users className="w-3 h-3 text-slate-500" />
                              {enrolled}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            {cls.inchargeTeacherId?.fullName ? (
                              <div className="font-semibold text-slate-900">
                                {cls.inchargeTeacherId.fullName}
                                <span className="block text-[10px] text-slate-400">
                                  {cls.inchargeTeacherId.department || 'Faculty'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Not Assigned</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditClass(cls)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Edit Class Details"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClass(cls)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete Class Section"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Program Modal (Add or Edit) */}
      {showProgramModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {editingProgramId ? 'Edit Academic Program' : 'Add New Academic Program'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure degree titles, codes, and study duration.
            </p>

            <form onSubmit={handleSaveProgram} className="space-y-4 mt-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Program Title *
                </label>
                <input
                  type="text"
                  value={programForm.name}
                  onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                  placeholder="e.g. Associate Degree in Science (ADS)"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Program Code *
                  </label>
                  <input
                    type="text"
                    value={programForm.code}
                    onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })}
                    placeholder="e.g. ADS-SCI"
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Degree Level
                  </label>
                  <select
                    value={programForm.level}
                    onChange={(e) => setProgramForm({ ...programForm, level: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Intermediate">Intermediate (XI-XII)</option>
                    <option value="Associate">Associate Degree (ADP/ADS)</option>
                    <option value="Bachelor">Bachelor (BS 4-Year)</option>
                    <option value="Other">Other / Certificate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Program Duration (Years)
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={programForm.durationYears}
                  onChange={(e) => setProgramForm({ ...programForm, durationYears: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowProgramModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-900 hover:bg-indigo-800 text-white shadow-md transition"
                >
                  {editingProgramId ? 'Update Program' : 'Save Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Section Modal (Add or Edit) */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {editingClassId ? 'Edit Class Section' : 'Add New Class Section'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Define the classroom title, degree program, section, and in-charge faculty.
            </p>

            <form onSubmit={handleSaveClass} className="space-y-4 mt-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Class Display Name *
                </label>
                <input
                  type="text"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  placeholder="e.g. XI Pre-Medical (Boys)"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Parent Program *
                </label>
                <select
                  value={classForm.programId}
                  onChange={(e) => setClassForm({ ...classForm, programId: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {programs.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Year / Level *
                  </label>
                  <input
                    type="text"
                    value={classForm.yearLevel}
                    onChange={(e) => setClassForm({ ...classForm, yearLevel: e.target.value })}
                    placeholder="e.g. 1st Year (XI)"
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Section *
                  </label>
                  <input
                    type="text"
                    value={classForm.section}
                    onChange={(e) => setClassForm({ ...classForm, section: e.target.value })}
                    placeholder="e.g. A, Boys, Girls"
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={classForm.academicYear}
                    onChange={(e) => setClassForm({ ...classForm, academicYear: e.target.value })}
                    placeholder="2026-2027"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Shift
                  </label>
                  <select
                    value={classForm.shift}
                    onChange={(e) => setClassForm({ ...classForm, shift: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  In-Charge Teacher (Optional)
                </label>
                <select
                  value={classForm.inchargeTeacherId}
                  onChange={(e) => setClassForm({ ...classForm, inchargeTeacherId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">None (Can assign later)</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.fullName} ({t.department || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-900 hover:bg-indigo-800 text-white shadow-md transition"
                >
                  {editingClassId ? 'Update Section' : 'Save Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};