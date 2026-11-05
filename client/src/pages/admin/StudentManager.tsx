import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import * as XLSX from 'xlsx';
import {
  UserPlus,
  Upload,
  Edit2,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const StudentManager: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 100;

  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Add / Edit Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [formData, setFormData] = useState({
    rollNo: '',
    registrationNo: '',
    fullName: '',
    fatherName: '',
    gender: 'Male',
    programId: '',
    classSectionId: '',
    parentPhone: '',
    studentPhone: '',
  });

  // Bulk Import
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkClassId, setBulkClassId] = useState<string>('');
  const [bulkProgramId, setBulkProgramId] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);

  useEffect(() => {
    loadFiltersAndStudents();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    loadStudents();
  }, [selectedClass, search]);

  const loadFiltersAndStudents = async () => {
    try {
      const [progRes, clsRes] = await Promise.all([api.get('/academic/programs'), api.get('/academic/classes')]);
      if (progRes.data.success) setPrograms(progRes.data.programs);
      if (clsRes.data.success) {
        setClasses(clsRes.data.classes);
        if (clsRes.data.classes.length > 0) {
          setBulkClassId(clsRes.data.classes[0]._id);
          setBulkProgramId(clsRes.data.classes[0].programId?._id || '');
        }
      }
    } catch {
      // ignore
    }
    loadStudents();
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClass) params.append('classSectionId', selectedClass);
      if (search) params.append('search', search);

      const res = await api.get(`/students?${params.toString()}`);
      if (res.data.success) {
        setStudents(res.data.students);
      }
    } catch {
      toast.error('Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      rollNo: '',
      registrationNo: '',
      fullName: '',
      fatherName: '',
      gender: 'Male',
      programId: programs[0]?._id || '',
      classSectionId: classes[0]?._id || '',
      parentPhone: '',
      studentPhone: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (st: any) => {
    setEditingStudent(st);
    setFormData({
      rollNo: st.rollNo,
      registrationNo: st.registrationNo || '',
      fullName: st.fullName,
      fatherName: st.fatherName,
      gender: st.gender || 'Male',
      programId: st.programId?._id || st.programId,
      classSectionId: st.classSectionId?._id || st.classSectionId,
      parentPhone: st.parentPhone,
      studentPhone: st.studentPhone || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the student records?`)) return;

    try {
      const res = await api.delete(`/students/${id}`);
      if (res.data.success) {
        toast.success('Student removed successfully.');
        loadStudents();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.rollNo || !formData.fullName || !formData.fatherName || !formData.parentPhone) {
      toast.error('Please fill all required fields.');
      return;
    }

    try {
      if (editingStudent) {
        const res = await api.put(`/students/${editingStudent._id}`, formData);
        if (res.data.success) {
          toast.success('Student details updated.');
          setShowModal(false);
          loadStudents();
        }
      } else {
        const res = await api.post('/students', formData);
        if (res.data.success) {
          toast.success('Student added successfully.');
          setShowModal(false);
          loadStudents();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save student.');
    }
  };

  // Bulk Excel File Import
  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile || !bulkClassId || !bulkProgramId) {
      toast.error('Please select an Excel file, program, and target class.');
      return;
    }

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data: any[] = XLSX.utils.sheet_to_json(ws);

          if (!data || data.length === 0) {
            toast.error('The uploaded Excel sheet contains no rows.');
            setImporting(false);
            return;
          }

          const res = await api.post('/students/bulk-import', {
            classSectionId: bulkClassId,
            programId: bulkProgramId,
            studentsList: data,
          });

          if (res.data.success) {
            toast.success(res.data.message);
            setShowBulkModal(false);
            setBulkFile(null);
            loadStudents();
          }
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to parse Excel file.');
        } finally {
          setImporting(false);
        }
      };
      reader.readAsBinaryString(bulkFile);
    } catch (err: any) {
      toast.error('Error reading file.');
      setImporting(false);
    }
  };

  const totalStudents = students.length;
  const totalPages = Math.ceil(totalStudents / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalStudents);
  const paginatedStudents = students.slice(startIndex, endIndex);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Student Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Add, update, or remove student profiles. Import entire class rosters via Excel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Bulk Excel Import</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Filter by Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">All Classes & Sections</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.programId?.code || 'Class'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Search Student</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name, roll number, or father's name..."
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Student Records Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-sm text-slate-900">
            Enrolled Students ({totalStudents})
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Page {currentPage} of {totalPages} (100 students / page)
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-semibold animate-pulse">
            Loading student directory...
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-semibold">
            No students found. Use "Add Student" or "Bulk Excel Import" to enroll students.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Roll</th>
                  <th className="py-3 px-4">Student & Father Details</th>
                  <th className="py-3 px-4">Class / Section</th>
                  <th className="py-3 px-4">Parent Phone</th>
                  <th className="py-3 px-4">Attendance Stats</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {paginatedStudents.map((st) => (
                  <tr key={st._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-black text-slate-900">{st.rollNo}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm leading-tight">{st.fullName}</span>
                        <span className="text-[11px] font-bold text-indigo-700 tracking-wide mt-0.5">
                          {st.gender === 'Female' ? 'd/o' : 's/o'} {st.fatherName || 'N/A'}{' '}
                          {st.caste && <span className="text-slate-500 font-medium">({st.caste})</span>}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700">{st.classSectionId?.name || 'Class'}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-indigo-700">{st.parentPhone}</td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-700 font-bold">{st.totalDaysPresent || 0} P</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-rose-700 font-bold">{st.totalDaysAbsent || 0} A</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(st)}
                          title="Edit Student"
                          className="p-1.5 text-slate-500 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(st._id, st.fullName)}
                          title="Remove Student"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalStudents > 0 && (
          <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Showing <strong className="text-slate-800">{totalStudents > 0 ? startIndex + 1 : 0}</strong> to{' '}
              <strong className="text-slate-800">{endIndex}</strong> of{' '}
              <strong className="text-slate-800">{totalStudents}</strong> students
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="font-bold text-slate-700 px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Student Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {editingStudent ? 'Edit Student Details' : 'Add New Student'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Fill out the student's academic and parent contact information.</p>

            <form onSubmit={handleSaveStudent} className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Roll Number *</label>
                  <input
                    type="text"
                    value={formData.rollNo}
                    onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                    required
                    placeholder="e.g. 101"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Registration No (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.registrationNo}
                    onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
                    placeholder="BISE Sukkur Reg #"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    placeholder="e.g. Ali Raza"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Father's Name *</label>
                  <input
                    type="text"
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    required
                    placeholder="e.g. Ghulam Qadir"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Program *</label>
                  <select
                    value={formData.programId}
                    onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    {programs.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Class Section *</label>
                  <select
                    value={formData.classSectionId}
                    onChange={(e) => setFormData({ ...formData, classSectionId: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Parent Contact Mobile *
                  </label>
                  <input
                    type="text"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    required
                    placeholder="03001234567"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                  <span className="text-[10px] text-slate-400">Used for WhatsApp & SIM absent alerts</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Student Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.studentPhone}
                    onChange={(e) => setFormData({ ...formData, studentPhone: e.target.value })}
                    placeholder="03011234567"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-900 hover:bg-indigo-800 text-white shadow-md"
                >
                  {editingStudent ? 'Update Student' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Excel Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Bulk Excel Student Import</h3>
            <p className="text-xs text-slate-500 mt-1">
              Upload an Excel (.xlsx or .csv) sheet. Columns should include: <strong>RollNo</strong>,{' '}
              <strong>Name</strong>, <strong>FatherName</strong>, and <strong>ParentPhone</strong>.
            </p>

            <form onSubmit={handleBulkUpload} className="space-y-4 mt-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Target Program</label>
                <select
                  value={bulkProgramId}
                  onChange={(e) => setBulkProgramId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  {programs.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Target Class / Section
                </label>
                <select
                  value={bulkClassId}
                  onChange={(e) => setBulkClassId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Select Excel File (.xlsx, .csv)
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-900 file:text-white"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md flex items-center gap-2"
                >
                  {importing ? 'Processing Sheet...' : 'Import Students Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
