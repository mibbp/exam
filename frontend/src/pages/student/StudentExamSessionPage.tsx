import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MotionButtonShell, PageMotion } from '../../components/PageMotion';
import { getAttempt, reportAntiCheat, saveAnswer, submitAttempt } from '../../services/attempts';
import type { AttemptDetail } from '../../types';

export function StudentExamSessionPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string>('');
  const [violationCount, setViolationCount] = useState(0);
  const pendingSaveRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!params.attemptId) return;
    try {
      setError('');
      const data = await getAttempt(Number(params.attemptId));
      setAttempt(data);
      setViolationCount(data.antiCheatViolationCount || 0);
      setAnswers(Object.fromEntries(data.details.map((detail) => [detail.questionId, detail.answer || ''])));
      setRemaining(data.exam.durationMinutes * 60 - Math.max(data.durationSeconds || 0, 0));
    } catch {
      setError('加载考试失败，请返回考试大厅后重试。');
    }
  }, [params.attemptId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!attempt) return;
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          void (async () => {
            const submitted = await submitAttempt(attempt.id);
            window.alert('考试时间已结束，系统已自动交卷。');
            navigate(`/student/attempts/${submitted.id}/result`);
          })();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, navigate]);

  useEffect(() => {
    if (!attempt) return;
    if (pendingSaveRef.current) {
      window.clearTimeout(pendingSaveRef.current);
    }
    pendingSaveRef.current = window.setTimeout(() => {
      void Promise.all(
        attempt.details.map((detail) => saveAnswer(attempt.id, detail.questionId, answers[detail.questionId] || '')),
      )
        .then(() => setLastSavedAt(dayjs().format('HH:mm:ss')))
        .catch(() => setError('自动保存失败，请继续作答后稍后重试。'));
    }, 700);
    return () => {
      if (pendingSaveRef.current) window.clearTimeout(pendingSaveRef.current);
    };
  }, [answers, attempt]);

  useEffect(() => {
    if (!attempt?.exam.antiCheatEnabled) return;
    const handler = async () => {
      if (document.visibilityState !== 'hidden' || !attempt) return;
      const result = await reportAntiCheat(attempt.id, 'visibility-hidden', '考生切换到其他窗口或标签页');
      setViolationCount(result.antiCheatViolationCount);
      if (result.forcedSubmit) {
        window.alert('检测到多次切屏，系统已强制交卷。你可在结果页发起重入申请。');
        navigate(`/student/attempts/${attempt.id}/result`);
        return;
      }

      const remainingCount = Math.max(attempt.exam.antiCheatThreshold - result.antiCheatViolationCount, 0);
      window.alert(`检测到切屏行为（${result.antiCheatViolationCount}/${attempt.exam.antiCheatThreshold}），剩余可容忍次数：${remainingCount}`);
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [attempt, navigate]);

  const currentQuestion = useMemo(() => attempt?.details[currentIndex], [attempt, currentIndex]);

  if (error && !attempt) {
    return <div className="native-error">{error}</div>;
  }
  if (!attempt || !currentQuestion) {
    return <div className="native-loading">加载中...</div>;
  }

  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');
  const remainingViolationCount = Math.max(attempt.exam.antiCheatThreshold - violationCount, 0);

  return (
    <PageMotion className="exam-session-shell-native">
      <aside className="exam-nav-native">
        <h3>{attempt.exam.title}</h3>
        <p className="timer-text">{minutes}:{seconds}</p>
        <p className="warning-text">切屏超出 {attempt.exam.antiCheatThreshold} 次将强制交卷</p>
        <p className="warning-text">当前切屏次数：{violationCount}，剩余容忍：{remainingViolationCount}</p>
        {lastSavedAt ? <p className="muted-text">最近保存：{lastSavedAt}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        <ul className="question-nav-list">
          {attempt.details.map((detail, index) => (
            <li key={detail.questionId}>
              <button
                type="button"
                className={`question-nav-btn ${index === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index)}
              >
                <span className={`chip ${answers[detail.questionId] ? 'chip-ready' : ''}`}>{index + 1}</span>
                <span>{detail.question.content}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="native-card exam-content-native glass-exam-card">
        <header className="exam-question-header">
          <div>
            <p className="eyebrow">Question {currentIndex + 1}</p>
            <h2>{currentQuestion.question.content}</h2>
          </div>
          <div className="chip-group">
            <span className="chip">{currentQuestion.question.type}</span>
            <span className="chip">分值 {currentQuestion.question.score}</span>
          </div>
        </header>
        <div className="option-list-native">
          {currentQuestion.question.options.map((option, index) => {
            const value = String.fromCharCode(65 + index);
            if (currentQuestion.question.type === 'MULTIPLE') {
              const selectedValues = (answers[currentQuestion.questionId] || '').split(',').filter(Boolean);
              const checked = selectedValues.includes(value);
              return (
                <label key={value} className="option-row">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...selectedValues, value]
                        : selectedValues.filter((item) => item !== value);
                      setAnswers((prev) => ({ ...prev, [currentQuestion.questionId]: next.join(',') }));
                    }}
                  />
                  <span>{value}. {option}</span>
                </label>
              );
            }
            return (
              <label key={value} className="option-row">
                <input
                  type="radio"
                  name={`question-${currentQuestion.questionId}`}
                  checked={(answers[currentQuestion.questionId] || '') === value}
                  onChange={() => setAnswers((prev) => ({ ...prev, [currentQuestion.questionId]: value }))}
                />
                <span>{value}. {option}</span>
              </label>
            );
          })}
        </div>
        <div className="inline-actions">
          <MotionButtonShell>
            <button type="button" className="soft-btn" onClick={() => navigate('/student/exams')}>
              返回考试大厅
            </button>
          </MotionButtonShell>
          <MotionButtonShell>
            <button type="button" className="soft-btn" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => index - 1)}>
              上一题
            </button>
          </MotionButtonShell>
          <MotionButtonShell>
            <button
              type="button"
              className="soft-btn"
              disabled={currentIndex === attempt.details.length - 1}
              onClick={() => setCurrentIndex((index) => index + 1)}
            >
              下一题
            </button>
          </MotionButtonShell>
          <MotionButtonShell>
            <button
              type="button"
              className="danger-btn"
              onClick={async () => {
                const submitted = await submitAttempt(attempt.id);
                window.alert(`交卷成功，时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}`);
                navigate(`/student/attempts/${submitted.id}/result`);
              }}
            >
              提交试卷
            </button>
          </MotionButtonShell>
        </div>
      </section>
    </PageMotion>
  );
}

