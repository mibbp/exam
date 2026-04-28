import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedItem, MotionButtonShell, PageMotion } from '../../components/PageMotion';
import { listMyExamRecords, listMyExams } from '../../services/attempts';
import type { MyExamAvailable, MyExamHistory, MyExamRecordList } from '../../types';

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
  NO_QUOTA: '已完成（次数用尽）',
  NOT_STARTED: '未开始',
  ENDED: '已结束',
  IN_PROGRESS: '进行中',
};

const attemptStatusLabels: Record<string, string> = {
  SUBMITTED: '已提交',
  FORCED_SUBMITTED: '强制交卷',
  IN_PROGRESS: '进行中',
};

export function StudentExamHallPage() {
  const navigate = useNavigate();
  const [available, setAvailable] = useState<MyExamAvailable[]>([]);
  const [history, setHistory] = useState<MyExamHistory[]>([]);
  const [status, setStatus] = useState<HallStatus>('ALL');
  const [tab, setTab] = useState<'hall' | 'history'>('hall');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [records, setRecords] = useState<MyExamRecordList | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await listMyExams();
        setAvailable(data.available);
        setHistory(data.history);
      } catch {
        setError('加载考试列表失败，请稍后重试。');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function openRecords(examId: number) {
    try {
      setRecordsOpen(true);
      setRecordsLoading(true);
      const result = await listMyExamRecords(examId);
      setRecords(result);
    } catch {
      setRecords(null);
      setError('加载考试记录失败，请稍后重试。');
    } finally {
      setRecordsLoading(false);
    }
  }

  const filtered = useMemo(
    () => available.filter((item) => status === 'ALL' || item.status === status),
    [available, status],
  );

  const historyByExamId = useMemo(() => {
    const map = new Map<number, MyExamHistory>();
    for (const item of history) {
      if (!map.has(item.examId)) {
        map.set(item.examId, item);
      }
    }
    return map;
  }, [history]);

  return (
    <PageMotion className="student-stack">
      <AnimatedItem className="native-card workspace-hero-card hall-hero" as="section">
        <p className="eyebrow">Exam Hall</p>
        <h2>考试大厅</h2>
        <p className="muted-text">查看可参加考试、当前状态和历史成绩，在一个工作区里完成报名、答题和结果回看。</p>
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
          我的考试
        </button>
      </AnimatedItem>

      {error ? <div className="native-error">{error}</div> : null}
      {loading ? <div className="native-loading">加载中...</div> : null}

      {!loading && tab === 'hall' && (
        filtered.length === 0 ? (
          <div className="native-empty-state">
            <h3>暂无可显示考试</h3>
            <p>当前筛选条件下没有考试。</p>
          </div>
        ) : (
          <div className="exam-grid">
            {filtered.map((item) => {
              const latest = historyByExamId.get(item.examId);
              const score = latest?.score ?? item.score ?? 0;
              return (
                <AnimatedItem key={item.examId} as="article" className="native-card exam-item-card glass-exam-card">
                  <header>
                    <h3>{item.title}</h3>
                    <span className={`chip chip-${item.displayStatus.toLowerCase()}`}>{displayStatusLabels[item.displayStatus]}</span>
                  </header>
                  <p className="muted-text">
                    {item.startsAt ? dayjs(item.startsAt).format('YYYY-MM-DD HH:mm') : '随时开始'} - {item.endsAt ? dayjs(item.endsAt).format('YYYY-MM-DD HH:mm') : '不限结束'}
                  </p>
                  <div className="card-main-metrics">
                    <div className="score-ring">
                      <strong>{score}</strong>
                      <span>/{item.totalScore}</span>
                    </div>
                    <div className="metric-list">
                      <span className="chip">时长 {item.durationMinutes} 分钟</span>
                      <span className="chip">及格分 {item.passScore}</span>
                      <span className="chip">剩余次数 {item.remainingAttempts === null ? '不限' : item.remainingAttempts}/{item.maxAttempts ?? '不限'}</span>
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
                          继续答题
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
                      <button type="button" className="soft-btn" onClick={() => openRecords(item.examId)}>
                        考试记录
                      </button>
                    </MotionButtonShell>
                    <MotionButtonShell>
                      <button type="button" className="soft-btn" onClick={() => navigate(`/student/exams/${item.examId}/check`)}>
                        考试说明
                      </button>
                    </MotionButtonShell>
                  </div>
                </AnimatedItem>
              );
            })}
          </div>
        )
      )}

      {!loading && tab === 'history' && (
        history.length === 0 ? (
          <div className="native-empty-state">
            <h3>暂无历史记录</h3>
            <p>完成考试后会在这里展示成绩。</p>
          </div>
        ) : (
          <div className="exam-grid">
            {history.map((item) => (
              <AnimatedItem key={item.attemptId} as="article" className="native-card exam-item-card glass-exam-card">
                <header>
                  <h3>{item.title}</h3>
                  <span className={`chip chip-${item.status.toLowerCase()}`}>{attemptStatusLabels[item.status] ?? item.status}</span>
                </header>
                <div className="card-main-metrics">
                  <div className="score-ring">
                    <strong>{item.score ?? 0}</strong>
                    <span>/{item.totalScore}</span>
                  </div>
                  <div className="metric-list">
                    <span className={`chip ${item.wrongCount > 0 ? 'chip-danger' : 'chip-success'}`}>错题 {item.wrongCount}</span>
                    <span className={`chip ${(item.score ?? 0) >= item.passScore ? 'chip-success' : 'chip-danger'}`}>
                      {(item.score ?? 0) >= item.passScore ? '通过' : '未通过'}
                    </span>
                    <span className="chip">第 {item.attemptNo} 次</span>
                  </div>
                </div>
                <p className="muted-text">提交时间：{item.submittedAt ? dayjs(item.submittedAt).format('YYYY-MM-DD HH:mm:ss') : '未提交'}</p>
                <div className="inline-actions">
                  <MotionButtonShell>
                    <button type="button" className="soft-btn" onClick={() => navigate(`/student/wrong-questions/${item.attemptId}`)}>
                      错题回顾
                    </button>
                  </MotionButtonShell>
                  <MotionButtonShell>
                    <button
                      type="button"
                      className="soft-btn"
                      disabled={!item.canViewResult}
                      onClick={() => navigate(`/student/attempts/${item.attemptId}/result`)}
                    >
                      查看结果
                    </button>
                  </MotionButtonShell>
                  <MotionButtonShell>
                    <button
                      type="button"
                      className="primary-btn"
                      disabled={!item.canRetake}
                      onClick={() => navigate(`/student/exams/${item.examId}/check`)}
                    >
                      再次考试
                    </button>
                  </MotionButtonShell>
                  <MotionButtonShell>
                    <button type="button" className="soft-btn" onClick={() => openRecords(item.examId)}>
                      考试记录
                    </button>
                  </MotionButtonShell>
                </div>
              </AnimatedItem>
            ))}
          </div>
        )
      )}

      {recordsOpen ? (
        <div className="modal-mask" onClick={() => setRecordsOpen(false)}>
          <section className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <div className="title-row">
              <h3>{records?.examTitle || '考试记录'}</h3>
              <button type="button" className="soft-btn" onClick={() => setRecordsOpen(false)}>关闭</button>
            </div>
            {recordsLoading ? <div className="native-loading">加载中...</div> : null}
            {!recordsLoading && records && records.records.length === 0 ? (
              <div className="native-empty-state">
                <h3>暂无作答记录</h3>
              </div>
            ) : null}
            {!recordsLoading && records && records.records.length > 0 ? (
              <div className="records-list">
                {records.records.map((record) => (
                  <article key={record.attemptId} className="record-item">
                    <div>
                      <strong>第 {record.attemptNo} 次</strong>
                      <p className="muted-text">提交：{record.submittedAt ? dayjs(record.submittedAt).format('YYYY-MM-DD HH:mm:ss') : '未提交'}</p>
                    </div>
                    <div className="record-right">
                      <span>{record.score}/{records.totalScore}</span>
                      <span className="chip">错题 {record.wrongCount}</span>
                      <button
                        type="button"
                        className="soft-btn"
                        disabled={!record.canViewResult}
                        onClick={() => {
                          setRecordsOpen(false);
                          navigate(`/student/attempts/${record.attemptId}/result`);
                        }}
                      >
                        查看结果
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </PageMotion>
  );
}
