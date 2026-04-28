import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

const fallbackRoutes: Record<string, string> = {
  'dashboard.view': '/admin/dashboard',
  'repositories.view': '/admin/repositories',
  'questions.view': '/admin/questions',
  'exams.view': '/admin/exams',
  'monitor.view': '/admin/exam-monitor',
  'roles.view': '/admin/access/roles',
  'users.view': '/admin/access/users',
};

function getFallbackPath(permissions: string[]) {
  const candidate = Object.entries(fallbackRoutes).find(([permission]) => permissions.includes(permission));
  return candidate?.[1] ?? '/login';
}

export function RequirePermission({ permission }: { permission: string }) {
  const auth = useAuth();

  if (!auth.user) {
    return <Navigate to="/login" replace />;
  }

  if (!auth.user.permissions.includes(permission)) {
    const fallback = getFallbackPath(auth.user.permissions);
    if (fallback === '/login') {
      return (
        <div className="native-empty-state">
          <h2>403</h2>
          <p>无权限访问该页面</p>
        </div>
      );
    }
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
