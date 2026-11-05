import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Toaster } from 'react-hot-toast';

// High-performance code-splitting: Pages loaded on demand
const TeacherDashboard = lazy(() =>
  import('./pages/teacher/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard }))
);
const RollCall = lazy(() =>
  import('./pages/teacher/RollCall').then((m) => ({ default: m.RollCall }))
);
const ClassStudentStats = lazy(() =>
  import('./pages/teacher/ClassStudentStats').then((m) => ({ default: m.ClassStudentStats }))
);
const AdminDashboard = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const StudentManager = lazy(() =>
  import('./pages/admin/StudentManager').then((m) => ({ default: m.StudentManager }))
);
const AcademicManager = lazy(() =>
  import('./pages/admin/AcademicManager').then((m) => ({ default: m.AcademicManager }))
);
const TeacherManager = lazy(() =>
  import('./pages/admin/TeacherManager').then((m) => ({ default: m.TeacherManager }))
);
const MessagingHub = lazy(() =>
  import('./pages/admin/MessagingHub').then((m) => ({ default: m.MessagingHub }))
);
const ReportsExport = lazy(() =>
  import('./pages/admin/ReportsExport').then((m) => ({ default: m.ReportsExport }))
);
const AdminSettings = lazy(() =>
  import('./pages/admin/AdminSettings').then((m) => ({ default: m.AdminSettings }))
);

const PageLoader: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center">
    <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    <span className="mt-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Loading GDC Portal...</span>
  </div>
);

// Smart Home Redirector based on user role
const HomeRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
  return <Navigate to="/admin" replace />;
};

export const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 pb-20 lg:pb-0">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomeRedirect />} />

              {/* Teacher Routes */}
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/roll-call" element={<RollCall />} />
              <Route path="/teacher/stats" element={<ClassStudentStats />} />
            </Route>

            {/* Admin & Principal Guarded Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'principal']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/students" element={<StudentManager />} />
              <Route path="/admin/academic" element={<AcademicManager />} />
              <Route path="/admin/teachers" element={<TeacherManager />} />
              <Route path="/admin/messaging" element={<MessagingHub />} />
              <Route path="/admin/reports" element={<ReportsExport />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </Suspense>
      </main>

      <Toaster
        position="top-right"
        toastOptions={{
          className: 'text-xs font-semibold rounded-2xl shadow-lg border border-slate-100',
          duration: 3500,
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
