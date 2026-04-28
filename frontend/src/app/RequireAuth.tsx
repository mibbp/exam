import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

export function RequireAuth({ role }: { role?: 'ADMIN' | 'STUDENT' }) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.accessToken || !auth.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role && auth.user.role !== role) {
    return <Navigate to={auth.user.role === 'ADMIN' ? '/admin/dashboard' : '/student/exams'} replace />;
  }

  return <Outlet />;
}

