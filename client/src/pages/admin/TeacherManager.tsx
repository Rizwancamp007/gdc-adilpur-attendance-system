import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { UserPlus, Trash2, Edit2, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';

export const TeacherManager: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    password: '',
    newPassword: '',
    department: 'General Science',
    phone: '',
    role: 'teacher',
    assignedClasses: [] as string[],
  });

  useEffect(() => {
    loadUsersAndClasses();
  }, []);

  const loadUsersAndClasses = async () => {
    setLoading(true);
    try {
      const [uRes, cRes] = await Promise.all([api.get('/auth/users'), api.get('/academic/classes')]);
      if (uRes.data.success) setUsers(uRes.data.users);
      if (cRes.data.success) setClasses(cRes.data.classes);
    } catch {
      toast.error('Failed to load teachers.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      fullName: '',
      password: '',
      newPassword: '',
      department: 'General Science',
      phone: '',
      role: 'teacher',
      assignedClasses: [],
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    const assignedIds = (user.assignedClasses || []).map((c: any) => (typeof c === 'object' ? c._id : c));
    setFormData({
      username: user.username,
      fullName: user.fullName,
      password: '',
      newPassword: '',
      department: user.department || 'General Science',
      phone: user.phone || '',
      role: user.role,
      assignedClasses: assignedIds,
    });
    setShowModal(true);
  };

  const toggleClassAssignment = (classId: string) => {
    setFormData((prev) => {
      const exists = prev.assignedClasses.includes(classId);
      if (exists) {
        return { ...prev, assignedClasses: prev.assignedClasses.filter((id) => id !== classId) };
      } else {
        return { ...prev, assignedClasses: [...prev.assignedClasses, classId] };
      }
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const payload: any = {
          fullName: formData.fullName,
          department: formData.department,
          phone: formData.phone,
          role: formData.role,
          assignedClasses: formData.assignedClasses,
        };
        if (formData.newPassword) payload.newPassword = formData.newPassword;

        const res = await api.put(`/auth/users/${editingUser._id}`, payload);
        if (res.data.success) {
          toast.success('Teacher account updated successfully.');
          setShowModal(false);
          loadUsersAndClasses();
        }
      } else {
        if (!formData.username || !formData.fullName || !formData.password) {
          toast.error('Username, Full Name, and Password are required.');
          return;
        }
        const res = await api.post('/auth/create-user', formData);
        if (res.data.success) {
          toast.success(res.data.message);
          setShowModal(false);
          loadUsersAndClasses();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Delete teacher account for "${name}"?`)) return;
    try {
      const res = await api.delete(`/auth/users/${id}`);
      if (res.data.success) {
        toast.success(res.data.message);
        loadUsersAndClasses();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Teacher & Staff Accounts</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create teacher logins, reset passwords, and assign classes for mobile roll call.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Teacher Account</span>
        </button>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-sm text-slate-900">Faculty & Staff Accounts ({users.length})</span>
          <span className="text-xs text-slate-400">Role-Based Access Protected</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-semibold animate-pulse">
            Loading teacher accounts...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Assigned Classes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{u.fullName}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-indigo-900">{u.username}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          u.role === 'admin' || u.role === 'principal'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{u.department || 'General'}</td>
                    <td className="py-3.5 px-4">
                      {u.assignedClasses && u.assignedClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {u.assignedClasses.map((cls: any) => (
                            <span
                              key={cls._id || cls}
                              className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
                            >
                              {cls.name || 'Class'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">No classes assigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-slate-400 hover:text-indigo-900 transition"
                          title="Edit Account / Reset Password"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(u._id, u.fullName)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                            title="Delete Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {editingUser ? `Edit Account: ${editingUser.fullName}` : 'Create Teacher / Staff Account'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure credentials and assign classes for attendance recording.
            </p>

            <form onSubmit={handleSaveUser} className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={!!editingUser}
                    required
                    placeholder="e.g. tariq_science"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    placeholder="Prof. Tariq Mehmood"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {!editingUser ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    placeholder="Min 8 chars, 1 uppercase, 1 number, 1 symbol (e.g. Teacher@2026!)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                  <span className="text-[10px] text-slate-400">Strong password required by security policy</span>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Reset Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    placeholder="Leave blank to keep existing password"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Physics / Science"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="teacher">Teacher / Lecturer</option>
                    <option value="admin">Administrator</option>
                    <option value="principal">Principal</option>
                  </select>
                </div>
              </div>

              {/* Assigned Classes Checkbox Grid */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">
                  Assign Classes for Attendance Roll Call
                </label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-2">
                  {classes.map((c) => {
                    const isSelected = formData.assignedClasses.includes(c._id);
                    return (
                      <div
                        key={c._id}
                        onClick={() => toggleClassAssignment(c._id)}
                        className="flex items-center gap-2.5 cursor-pointer select-none p-1.5 hover:bg-white rounded-lg transition"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-700" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                        <span className="text-xs font-semibold text-slate-800">{c.name}</span>
                        <span className="text-[10px] text-slate-400">({c.programId?.code || 'Class'})</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-900 text-white">
                  {editingUser ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
