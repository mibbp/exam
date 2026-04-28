import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './app/AuthContext';
import { RequireAuth } from './app/RequireAuth';
import { RequirePermission } from './app/RequirePermission';

const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const AdminAppShell = lazy(() => import('./layouts/AdminAppShell').then((module) => ({ default: module.AdminAppShell })));
const StudentLayout = lazy(() => import('./layouts/StudentLayout').then((module) => ({ default: module.StudentLayout })));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));
const RepositoryPage = lazy(() => import('./pages/admin/RepositoryPage').then((module) => ({ default: module.RepositoryPage })));
const QuestionsPage = lazy(() => import('./pages/admin/QuestionsPage').then((module) => ({ default: module.QuestionsPage })));
const RolesPage = lazy(() => import('./pages/admin/RolesPage').then((module) => ({ default: module.RolesPage })));
const UsersPage = lazy(() => import('./pages/admin/UsersPage').then((module) => ({ default: module.UsersPage })));
const ExamsPage = lazy(() => import('./pages/admin/ExamsPage').then((module) => ({ default: module.ExamsPage })));
const AdminExamMonitorPage = lazy(() => import('./pages/admin/AdminExamMonitorPage').then((module) => ({ default: module.AdminExamMonitorPage })));
const StudentExamHallPage = lazy(() => import('./pages/student/StudentExamHallPage').then((module) => ({ default: module.StudentExamHallPage })));
const StudentExamCheckPage = lazy(() => import('./pages/student/StudentExamCheckPage').then((module) => ({ default: module.StudentExamCheckPage })));
const StudentExamSessionPage = lazy(() => import('./pages/student/StudentExamSessionPage').then((module) => ({ default: module.StudentExamSessionPage })));
const StudentAttemptResultPage = lazy(() => import('./pages/student/StudentAttemptResultPage').then((module) => ({ default: module.StudentAttemptResultPage })));
const StudentWrongQuestionsPage = lazy(() => import('./pages/student/StudentWrongQuestionsPage').then((module) => ({ default: module.StudentWrongQuestionsPage })));

function RouteFallback() {
  return (
    <div className="route-fallback">
      <div className="route-spinner" />
      <span>页面加载中...</span>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth role="ADMIN" />}>
              <Route path="/admin" element={<AdminAppShell />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route element={<RequirePermission permission="dashboard.view" />}><Route path="dashboard" element={<AdminDashboardPage />} /></Route>
                <Route element={<RequirePermission permission="repositories.view" />}><Route path="repositories" element={<RepositoryPage />} /></Route>
                <Route element={<RequirePermission permission="questions.view" />}><Route path="questions" element={<QuestionsPage />} /></Route>
                <Route element={<RequirePermission permission="exams.view" />}><Route path="exams" element={<ExamsPage />} /></Route>
                <Route element={<RequirePermission permission="monitor.view" />}><Route path="exam-monitor" element={<AdminExamMonitorPage />} /></Route>
                <Route element={<RequirePermission permission="roles.view" />}><Route path="access/roles" element={<RolesPage />} /></Route>
                <Route element={<RequirePermission permission="users.view" />}><Route path="access/users" element={<UsersPage />} /></Route>
              </Route>
            </Route>
            <Route element={<RequireAuth role="STUDENT" />}>
              <Route path="/student" element={<StudentLayout />}>
                <Route index element={<Navigate to="/student/exams" replace />} />
                <Route path="exams" element={<StudentExamHallPage />} />
                <Route path="exams/:examId/check" element={<StudentExamCheckPage />} />
                <Route path="attempts/:attemptId" element={<StudentExamSessionPage />} />
                <Route path="attempts/:attemptId/result" element={<StudentAttemptResultPage />} />
                <Route path="wrong-questions/:attemptId" element={<StudentWrongQuestionsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
