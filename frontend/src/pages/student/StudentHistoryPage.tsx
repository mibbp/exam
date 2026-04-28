import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedItem, MotionButtonShell, PageMotion } from '../../components/PageMotion';
import { listMyExams } from '../../services/attempts';
import type { MyExamGrouped } from '../../types';

export function StudentHistoryPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<MyExamGrouped[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const data = await listMyExams();
        setRows(data.grouped ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="native-loading">加载中...</div>;

  return (
    <PageMotion className="student-stack">
      <section className="native-card workspace-hero-card">
        <p className="eyebrow">History</p>
        <h2>历史成绩单</h2>
      </section>
      {rows.length === 0 ? (
        <div className="native-empty-state">
          <h3>暂无历史记录</h3>
        </div>
      ) : rows.map((group) => (
        <AnimatedItem key={group.examId} as="article" className="native-card student-stack glass-exam-card">
          <div className="title-row">
            <h3>{group.title}</h3>
            <span className="chip">最近一次: {group.latestAttempt?.score ?? 0}/{group.totalScore}</span>
          </div>
          <div className="inline-actions">
            <MotionButtonShell>
              <button type="button" className="soft-btn" onClick={() => setExpanded((prev) => ({ ...prev, [group.examId]: !prev[group.examId] }))}>
                {expanded[group.examId] ? '收起记录' : '展开记录'}
              </button>
            </MotionButtonShell>
            <MotionButtonShell>
              <button
                type="button"
                className="primary-btn"
                disabled={!group.canRetake}
                onClick={() => navigate(`/student/exams/${group.examId}/check`)}
              >
                再次考试
              </button>
            </MotionButtonShell>
          </div>
          {expanded[group.examId] ? (
            <div className="records-list">
              {group.attempts.map((attempt) => (
                <article key={attempt.attemptId} className="record-item">
                  <div>
                    <strong>第 {attempt.attemptNo} 次</strong>
                    <p className="muted-text">提交：{attempt.submittedAt ? dayjs(attempt.submittedAt).format('YYYY-MM-DD HH:mm:ss') : '未提交'}</p>
                  </div>
                  <div className="record-right">
                    <span>{attempt.score ?? 0}/{attempt.totalScore}</span>
                    <span className={`chip ${attempt.isLatest ? 'chip-success' : ''}`}>{attempt.isLatest ? '最近一次' : attempt.status}</span>
                    <button type="button" className="soft-btn" disabled={!attempt.canViewResult} onClick={() => navigate(`/student/attempts/${attempt.attemptId}/result`)}>
                      查看结果
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </AnimatedItem>
      ))}
    </PageMotion>
  );
}
