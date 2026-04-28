import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/useAuth';
import companyLogo from '../assets/company-logo.svg';
import { login } from '../services/auth';

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="login-shell login-shell-modern">
      <section className="login-brand-section login-brand-modern page-enter">
        <div className="login-brand-inner">
          <span className="login-brand-tag">Exam GPT Platform</span>
          <img src={companyLogo} alt="争锋科技" className="login-brand-logo-modern" />
          <h1 className="login-title-modern">
            在线考试
            <br />
            管理中台
          </h1>
          <p className="login-copy-modern">统一管理题库、发布考试、查看结果，并为学生提供更清晰顺滑的答题体验。</p>

          <div className="login-chip-row-modern">
            <span className="chip chip-dark">管理后台</span>
            <span className="chip chip-dark">学生考试</span>
            <span className="chip chip-light">结果闭环</span>
          </div>
        </div>
      </section>

      <section className="login-form-section login-form-modern">
        <div className="login-card login-card-modern page-enter" style={{ animationDelay: '0.1s' }}>
          <span className="login-form-badge">欢迎使用</span>
          <h2>欢迎回来</h2>
          <p className="login-hint">演示账号：admin / student</p>
          <form
            className="login-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setError('');
              try {
                setLoading(true);
                const data = await login(username, password);
                auth.setSession({ accessToken: data.accessToken, user: data.user });
                const fallback = data.user.role === 'ADMIN' ? '/admin/dashboard' : '/student/exams';
                const next = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? fallback;
                navigate(next, { replace: true });
              } catch {
                setError('用户名或密码错误');
              } finally {
                setLoading(false);
              }
            }}
          >
            <label className="login-field">
              用户名
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入用户名" autoComplete="username" />
            </label>
            <label className="login-field">
              密码
              <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" type="password" autoComplete="current-password" />
            </label>
            {error ? <div className="login-error">{error}</div> : null}
            <button className="login-submit" type="submit" disabled={loading} style={{ marginTop: '12px' }}>
              {loading ? '登录中...' : '登录系统'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
