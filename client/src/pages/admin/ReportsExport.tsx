import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { FileSpreadsheet, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const ReportsExport: React.FC = () => {
  const [programs, setPrograms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  const [programId, setProgramId] = useState<string>('');
  const [classSectionId, setClassSectionId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const [pRes, cRes] = await Promise.all([api.get('/academic/programs'), api.get('/academic/classes')]);
      if (pRes.data.success) setPrograms(pRes.data.programs);
      if (cRes.data.success) setClasses(cRes.data.classes);
    } catch {
      // ignore
    }
  };

  const exportUrl = `/api/reports/export-excel?startDate=${startDate}&endDate=${endDate}${
    programId ? `&programId=${programId}` : ''
  }${classSectionId ? `&classSectionId=${classSectionId}` : ''}${
    statusFilter !== 'ALL' ? `&status=${statusFilter}` : ''
  }`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Reports & Data Archiving</h1>
        <p className="text-xs text-slate-500 mt-1">
          Export official Sindh Education Department attendance sheets and manage 2-year retention.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Excel Export Generator */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>Custom Attendance Sheet Generator</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Program</label>
                <select
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="">All Programs</option>
                  {programs.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Class</label>
                <select
                  value={classSectionId}
                  onChange={(e) => setClassSectionId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Attendance Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="ALL">All Records</option>
                  <option value="PRESENT">Present Only</option>
                  <option value="ABSENT">Absentees Only</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Formatted in standard .xlsx spreadsheet format</span>

              <a
                href={exportUrl}
                download
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Excel Sheet</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: 2-Year Auto Retention & Pruning */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 text-indigo-900 font-black text-sm mb-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>2-Year Rolling Retention</span>
              </div>
              <h3 className="text-base font-black text-slate-900 mb-2">Database Cleanliness Policy</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                To guarantee Database remains well forever, attendance logs
                older than <strong>730 days (2 years)</strong> are automatically pruned every month.
              </p>

              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                <p>• Student term total percentages are permanently kept.</p>
                <p>• Scheduled monthly on 1st at 3:00 AM PKT.</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-50/80 px-4 py-3 rounded-2xl border border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Autonomous Engine Active</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold">Zero Action Needed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
