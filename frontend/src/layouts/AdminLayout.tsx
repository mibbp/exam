import {
  AlertOutlined,
  AuditOutlined,
  FileTextOutlined,
  HomeOutlined,
  LogoutOutlined,
  TeamOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Space } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/useAuth';
import companyLogo from '../assets/company-logo.svg';

const items = [
  { key: '/admin/dashboard', label: '管理首页', permission: 'dashboard.view', icon: HomeOutlined },
  { key: '/admin/repositories', label: '题库管理', permission: 'repositories.view', icon: AuditOutlined },
  { key: '/admin/questions', label: '试题管理', permission: 'questions.view', icon: FileTextOutlined },
  { key: '/admin/exams', label: '考试管理', permission: 'exams.view', icon: TrophyOutlined },
  { key: '/admin/exam-monitor', label: '考试监控', permission: 'monitor.view', icon: AlertOutlined },
  { key: '/admin/anti-cheat-logs', label: '反作弊日志', permission: 'monitor.view', icon: AlertOutlined },
  { key: '/admin/access/roles', label: '角色管理', permission: 'roles.view', icon: TeamOutlined },
  { key: '/admin/access/users', label: '用户管理', permission: 'users.view', icon: TeamOutlined },
];

export function AdminLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const displayName = auth.user?.displayName ?? auth.user?.username ?? '管理员';
  const userInitial = displayName.slice(0, 1).toUpperCase();
  const visibleItems = items.filter((item) => auth.user?.permissions.includes(item.permission));
  const menuItems = visibleItems.length > 0 ? visibleItems : items;
  const current = menuItems.find((item) => location.pathname.startsWith(item.key)) ?? menuItems[0];

  return (
    <div className="app-shell app-shell-admin">
      <div className="workspace-ambient workspace-ambient-a" />
      <div className="workspace-ambient workspace-ambient-b" />

      <aside className="app-sider admin-sider-v2">
        <div className="app-brand admin-brand-v2">
          <img src={companyLogo} alt="争锋科技" className="admin-brand-logo-v2" />
          <div className="admin-brand-copy-v2">
            <span className="admin-brand-badge-v2">Exam Console</span>
            <h1>争锋科技</h1>
            <span className="eyebrow">考试管理中心</span>
          </div>
        </div>

        <nav className="app-nav admin-nav-v2">
          {menuItems.map((item) => (
            <button
              key={item.key}
              className={`app-nav-btn admin-nav-btn-v2 ${current.key === item.key ? 'active' : ''}`}
              onClick={() => navigate(item.key)}
            >
              <item.icon />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="app-user-section admin-user-section-v2">
          <Avatar size={46} className="admin-user-avatar-v2">
            {userInitial}
          </Avatar>
          <div className="app-user-info admin-user-info-v2">
            <span className="app-user-name">{displayName}</span>
            <span className="app-user-role">管理员账号</span>
          </div>
        </div>
      </aside>

      <main className="app-main admin-main-v2">
        <header className="app-header admin-header-v2">
          <div>
            <span className="admin-header-subtitle-v2">管理后台 / {current.label}</span>
            <h2 className="app-header-title">{current.label}</h2>
          </div>
          <Space className="app-header-actions admin-header-actions-v2">
            <span className="admin-header-tip-v2">专注稳定交付与高质量考试运营</span>
            <Button type="primary" icon={<LogoutOutlined />} onClick={() => void auth.clearSession()}>
              退出登录
            </Button>
          </Space>
        </header>
        <div className="app-content admin-content-v2 page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

