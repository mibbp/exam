import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedItem, MotionButtonShell, PageMotion } from '../../components/PageMotion';
import { listMyExams } from '../../services/attempts';
import type { MyExamAvailable, MyExamGrouped, MyExamGroupedAttempt, MyExamHistory } from '../../types';

type HallStatus = 'ALL' | 'UPCOMING' | 'READY' | 'ONGOING' | 'FINISHED';

const statusLabels: Record<HallStatus, string> = {
  ALL: '全部',
  UPCOMING: '未开始',
  READY: '可参加',
  ONGOING: '进行中',
  FINISHED: '已结束',
};

const displayStatusLabels: Record<MyExamAvailable['displayStatus'], string> = {
  CAN_START: '可参加',
  NO_QUOTA: '次数用尽',
  NOT_STARTED: '未开始',
  ENDED: '已结束',
  IN_PROGRESS: '进行中',
};

const attemptStatusLabels: Record<string, string> = {
  SUBMITTED: '已提交',
  FORCED_SUBMITTED: '强制交卷',
  IN_PROGRESS: '进行中',
};

function formatAttemptStatus(status: string) {
  return attemptStatusLabels[status] ?? status;
}

function fallbackGrouped(available: MyExamAvailable[], history: MyExamHistory[]): MyExamGrouped[] {
  const groups = new Map<number, MyExamGrouped>();

  for (const exam of available) {
    groups.set(exam.examId, {
      examId: exam.examId,
      title: exam.title,
      durationMinutes: exam.durationMinutes,
      startsAt: exam.startsAt,
      endsAt: exam.endsAt,
      questionCount: exam.questionCount,
      passScore: exam.passScore,
      totalScore: exam.totalScore,
      latestAttempt: null,
      finalScore: null,
      canRetake: false,
      attempts: [],
    });
  }

  for (const item of history) {
    const existing = groups.get(item.examId) ?? {
      examId: item.examId,
      title: item.title,
      durationMinutes: 0,
      startsAt: null,
      endsAt: null,
      questionCount: 0,
      passScore: item.passScore,
      totalScore: item.totalScore,
      latestAttempt: null,
      finalScore: null,
      canRetake: false,
      attempts: [],
    };

    const attempt: MyExamGroupedAttempt = {
      attemptId: item.attemptId,
      attemptNo: item.attemptNo,
      status: item.status,
      score: item.score,
      startedAt: item.startedAt,
      submittedAt: item.submittedAt,
      wrongCount: item.wrongCount,
      passScore: item.passScore,
      totalScore: item.totalScore,
      canRetake: Boolean(item.canRetake),
      canViewResult: item.canViewResult,
      isLatest: Boolean(item.isLatest),
    };

    existing.attempts.push(attempt);
    groups.set(item.examId, existing);
  }

  return Array.from(groups.values())
    .map((group) => {
      const sortedAttempts = [...group.attempts].sort((a, b) => (b.attemptNo - a.attemptNo) || (b.attemptId - a.attemptId));
      const latest = sortedAttempts[0] ?? null;
      return {
        ...group,
        attempts: sortedAttempts,
        latestAttempt: latest,
        finalScore: latest?.score ?? null,
        canRetake: Boolean(latest?.canRetake),
      };
    })
    .sort((a, b) => b.examId - a.examId);
}

export function StudentExamHallPage() {
  const navigate = useNavigate();
  const [available, setAvailable] = useState<MyExamAvailable[]>([]);
  const [history, setHistory] = useState<MyExamHistory[]>([]);
  const [groupedFromApi, setGroupedFromApi] = useState<MyExamGrouped[]>([]);
  const [status, setStatus] = useState<HallStatus>('ALL');
  const [tab, setTab] = useState<'hall' | 'history'>('hall');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await listMyExams();
        setAvailable(data.available);
        setHistory(data.history);
        setGroupedFromApi(data.grouped ?? []);
      } catch {
        setError('加载考试列表失败，请稍后重试。');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = useMemo(
    () => (groupedFromApi.length > 0 ? groupedFromApi : fallbackGrouped(available, history)),
    [available, groupedFromApi, history],
  );

  const filteredAvailable = useMemo(
    () => available.filter((item) => status === 'ALL' || item.status === status),
    [available, status],
  );

  function toggleExam(examId: number) {
    setExpanded((prev) => ({ ...prev, [examId]: !prev[examId] }));
  }

  return (
    <PageMotion className="student-stack">
      <AnimatedItem className="native-card workspace-hero-card hall-hero" as="section">
        <p className="eyebrow">Exam Hall</p>
        <h2>考试大厅</h2>
        <p className="muted-text">考试大厅用于开始/继续考试；我的考试按考试分组展示，最终成绩按最近一次考试计算。</p>
        <div className="segmented-native">
          {(Object.keys(statusLabels) as HallStatus[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`segment-btn ${status === key ? 'active' : ''}`}
              onClick={() => setStatus(key)}
            >
              {statusLabels[key]}
            </button>
          ))}
        </div>
      </AnimatedItem>

      <AnimatedItem as="section" className="tab-strip-native">
        <button type="button" className={tab === 'hall' ? 'active' : ''} onClick={() => setTab('hall')}>
          考试大厅
        </button>
        <button type="button" className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          我的考试（按考试分组）
        </button>
      </AnimatedItem>

      {error ? <div className="native-error">{error}</div> : null}
      {loading ? <div className="native-loading">加载中...</div> : null}

      {!loading && tab === 'hall' && (
        filteredAvailable.length === 0 ? (
          <div className="native-empty-state">
            <h3>暂无可显示考试</h3>
            <p>当前筛选条件下没有考试。</p>
          </div>
        ) : (
          <div className="exam-grid">
            {filteredAvailable.map((item) => (
              <AnimatedItem key={item.examId} as="article" className="native-card exam-item-card glass-exam-card">
                <header>
                  <h3>{item.title}</h3>
                  <span className={`chip chip-${item.displayStatus.toLowerCase()}`}>{displayStatusLabels[item.displayStatus]}</span>
                </header>
                <p className="muted-text">
                  {item.startsAt ? dayjs(item.startsAt).format('YYYY-MM-DD HH:mm') : '随时开始'}
                  {' - '}
                  {item.endsAt ? dayjs(item.endsAt).format('YYYY-MM-DD HH:mm') : '不限结束'}
                </p>
                <div className="card-main-metrics">
                  <div className="score-ring">
                    <strong>{item.score ?? 0}</strong>
                    <span>/{item.totalScore}</span>
                  </div>
                  <div className="metric-list">
                    <span className="chip">时长 {item.durationMinutes} 分钟</span>
                    <span className="chip">及格 {item.passScore}</span>
                    <span className="chip">
                      剩余次数 {item.remainingAttempts === null ? '不限' : item.remainingAttempts}/{item.maxAttempts ?? '不限'}
                    </span>
                  </div>
                </div>
                <div className="inline-actions">
                  {item.cta === 'START' ? (
                    <MotionButtonShell>
                      <button type="button" className="primary-btn" onClick={() => navigate(`/student/exams/${item.examId}/check`)}>
                        开始考试
                      </button>
                    </MotionButtonShell>
                  ) : null}
                  {item.cta === 'CONTINUE' && item.ctaAttemptId ? (
                    <MotionButtonShell>
                      <button type="button" className="primary-btn" onClick={() => navigate(`/student/attempts/${item.ctaAttemptId}`)}>
                        继续作答
                      </button>
                    </MotionButtonShell>
                  ) : null}
                  {item.cta === 'VIEW_RESULT' && item.ctaAttemptId ? (
                    <MotionButtonShell>
                      <button type="button" className="primary-btn" onClick={() => navigate(`/student/attempts/${item.ctaAttemptId}/result`)}>
                        查看结果
                      </button>
                    </MotionButtonShell>
                  ) : null}
                  <MotionButtonShell>
                    <button type="button" className="soft-btn" onClick={() => navigate(`/student/exams/${item.examId}/check`)}>
                      考试说明
                    </button>
                  </MotionButtonShell>
                </div>
              </AnimatedItem>
            ))}
          </div>
        )
      )}

      {!loading && tab === 'history' && (
        grouped.length === 0 ? (
          <div className="native-empty-state">
            <h3>暂无考试记录</h3>
            <p>完成考试后会在这里按考试分组展示记录。</p>
          </div>
        ) : (
          <div className="student-stack">
            {grouped.map((group) => {
              const isOpen = Boolean(expanded[group.examId]);
              const latest = group.latestAttempt;
              const latestStatus = latest ? formatAttemptStatus(latest.status) : '暂无记录';
              return (
                <AnimatedItem key={group.examId} as="article" className="native-card student-stack glass-exam-card">
                  <div className="title-row">
                    <div>
                      <h3>{group.title}</h3>
                      <p className="muted-text">最终成绩按最近一次考试计算</p>
                    </div>
                    <span className="chip">{latestStatus}</span>
                  </div>
                  <div className="card-main-metrics">
                    <div className="score-ring">
                      <strong>{group.finalScore ?? 0}</strong>
                      <span>/{group.totalScore}</span>
                    </div>
                    <div className="metric-list">
                      <span className="chip">考试次数 {group.attempts.length}</span>
                      <span className="chip">及格线 {group.passScore}</span>
                      <span className={`chip ${group.canRetake ? 'chip-success' : 'chip-danger'}`}>
                        {group.canRetake ? '可重考（仅最近一次）' : '不可重考'}
                      </span>
                    </div>
                  </div>
                  <div className="inline-actions">
                    <MotionButtonShell>
                      <button type="button" className="soft-btn" onClick={() => toggleExam(group.examId)}>
                        {isOpen ? '收起记录' : '展开记录'}
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
                    {latest ? (
                      <MotionButtonShell>
                        <button
                          type="button"
                          className="soft-btn"
                          disabled={!latest.canViewResult}
                          onClick={() => navigate(`/student/attempts/${latest.attemptId}/result`)}
                        >
                          最近一次结果
                        </button>
                      </MotionButtonShell>
                    ) : null}
                  </div>

                  {isOpen ? (
                    <div className="records-list">
                      {group.attempts.map((attempt) => (
                        <article key={attempt.attemptId} className="record-item">
                          <div>
                            <strong>第 {attempt.attemptNo} 次</strong>
                            <p className="muted-text">
                              提交：{attempt.submittedAt ? dayjs(attempt.submittedAt).format('YYYY-MM-DD HH:mm:ss') : '未提交'}
                            </p>
                          </div>
                          <div className="record-right">
                            <span>{attempt.score ?? 0}/{attempt.totalScore}</span>
                            <span className={`chip ${attempt.isLatest ? 'chip-success' : ''}`}>{attempt.isLatest ? '最近一次' : formatAttemptStatus(attempt.status)}</span>
                            <button
                              type="button"
                              className="soft-btn"
                              disabled={!attempt.canViewResult}
                              onClick={() => navigate(`/student/attempts/${attempt.attemptId}/result`)}
                            >
                              查看结果
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </AnimatedItem>
              );
            })}
          </div>
        )
      )}
    </PageMotion>
  );
}
