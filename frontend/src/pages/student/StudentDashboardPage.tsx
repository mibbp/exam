import { Card, Col, Row } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MotionButtonShell, PageMotion } from '../../components/PageMotion';
import { getStudentDashboard } from '../../services/attempts';
import type { StudentDashboardOverview } from '../../types';

export function StudentDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<StudentDashboardOverview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setData(await getStudentDashboard());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="native-loading">加载中...</div>;
  if (!data) return <div className="native-empty-state"><h3>暂无数据</h3></div>;

  return (
    <PageMotion className="student-stack">
      <section className="native-card workspace-hero-card">
        <p className="eyebrow">Dashboard</p>
        <h2>个人学习概览</h2>
      </section>
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12} xl={6}><Card title="总参加次数">{data.summary.totalAttempts}</Card></Col>
        <Col xs={24} md={12} xl={6}><Card title="最近一次成绩">{data.summary.latestScore ?? '-'}</Card></Col>
        <Col xs={24} md={12} xl={6}><Card title="通过率">{(data.summary.passRate * 100).toFixed(1)}%</Card></Col>
        <Col xs={24} md={12} xl={6}><Card title="待处理重入">{data.summary.pendingRejoinCount}</Card></Col>
      </Row>

      <section className="native-card student-stack">
        <h3>快捷入口</h3>
        <div className="inline-actions">
          {data.shortcuts.continueAttempt ? (
            <MotionButtonShell>
              <button
                type="button"
                className="primary-btn"
                onClick={() => navigate(`/student/attempts/${data.shortcuts.continueAttempt?.attemptId}`)}
              >
                继续考试
              </button>
            </MotionButtonShell>
          ) : null}
          <MotionButtonShell>
            <button type="button" className="soft-btn" onClick={() => navigate('/student/exams')}>
              去考试大厅
            </button>
          </MotionButtonShell>
          <MotionButtonShell>
            <button type="button" className="soft-btn" onClick={() => navigate('/student/history')}>
              查看历史成绩单
            </button>
          </MotionButtonShell>
          {data.latestAttempt ? (
            <MotionButtonShell>
              <button
                type="button"
                className="soft-btn"
                onClick={() => navigate(`/student/wrong-questions/${data.latestAttempt?.attemptId}`)}
              >
                最近错题
              </button>
            </MotionButtonShell>
          ) : null}
        </div>
      </section>
    </PageMotion>
  );
}
