import { Avatar, Button, Space } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/useAuth';
import companyLogo from '../assets/company-logo.svg';

const items = [{ key: '/student/exams', label: '考试大厅' }];

export function StudentLayout() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const current = items.find((item) => location.pathname.startsWith(item.key))?.key ?? '/student/exams';
  const currentLabel = items.find((item) => item.key === current)?.label ?? '学生工作台';
  const displayName = auth.user?.displayName ?? auth.user?.username ?? '学生';
  const userInitial = displayName.slice(0, 1).toUpperCase();
  const isHall = location.pathname === '/student/exams';

  return (
    <div className="app-shell app-shell-student">
      <div className="workspace-ambient workspace-ambient-a" style={{ background: 'rgba(14, 165, 233, 0.2)' }} />
      <div className="workspace-ambient workspace-ambient-c" style={{ background: 'rgba(59, 130, 246, 0.2)' }} />

      <aside className="app-sider student-sider-v2">
        <div className="app-brand student-brand-v2">
          <img src={companyLogo} alt="争锋科技" className="student-brand-logo-v2" />
          <div>
            <h1>在线考试中心</h1>
            <span className="eyebrow">Student</span>
          </div>
        </div>
        <nav className="app-nav">
          {items.map((item) => (
            <button
              key={item.key}
              className={`app-nav-btn ${current === item.key ? 'active' : ''}`}
              onClick={() => navigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="app-user-section student-user-section-v2">
          <div className="app-user-info student-user-info-v2">
            <span className="app-user-name">{displayName}</span>
            <span className="app-user-role">学生账号</span>
          </div>
          <Avatar className="student-user-avatar-v2">{userInitial}</Avatar>
        </div>
      </aside>

      <main className="app-main student-main-v2">
        <header className="app-header student-header-v2">
          <div>
            <span className="student-header-subtitle-v2">学生工作台</span>
            <h2 className="app-header-title">{currentLabel}</h2>
          </div>
          <Space className="app-header-actions">
            {!isHall ? (
              <Button className="ghost-btn student-ghost-btn-v2" onClick={() => navigate('/student/exams')}>
                返回大厅
              </Button>
            ) : null}
            <Button className="ghost-btn student-ghost-btn-v2" onClick={() => void auth.clearSession()}>
              退出登录
            </Button>
          </Space>
        </header>
        <div className="app-content student-content-v2 page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
