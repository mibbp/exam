import type { AxiosError } from 'axios';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MotionButtonShell, PageMotion } from '../../components/PageMotion';
import { startAttempt } from '../../services/attempts';
import { getExam } from '../../services/exams';
import type { Exam } from '../../types';

function startErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<{ message?: string }>;
  const message = axiosError.response?.data?.message || '';
  if (message.includes('No attempt quota left')) return '当前考试次数已用尽，可在结果页查看本次成绩。';
  if (message.includes('Exam not started')) return '考试尚未开始，请在开始时间后参加。';
  if (message.includes('Exam ended')) return '考试已结束，无法继续参加。';
  if (message.includes('No permission')) return '你没有该考试的参与权限。';
  return '当前考试不可开始，请稍后重试。';
}

export function StudentExamCheckPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        if (!params.examId) return;
        setLoading(true);
        setError('');
        setExam(await getExam(Number(params.examId)));
      } catch {
        setError('加载考试信息失败，请刷新后重试。');
      } finally {
        setLoading(false);
      }
    })();
  }, [params.examId]);

  if (!params.examId) {
    return (
      <div className="native-empty-state">
        <h2>考试不存在</h2>
      </div>
    );
  }

  if (loading) {
    return <div className="native-loading">加载中...</div>;
  }

  if (error || !exam) {
    return <div className="native-error">{error || '考试不存在'}</div>;
  }

  return (
    <PageMotion className="student-stack">
      <section className="native-card workspace-hero-card">
        <div>
          <p className="eyebrow">Exam Check</p>
          <h2>{exam.title}</h2>
        </div>

        <dl className="detail-list">
          <div><dt>考试时长</dt><dd>{exam.durationMinutes} 分钟</dd></div>
          <div><dt>总题量</dt><dd>{exam.examQuestions.length} 题</dd></div>
          <div><dt>及格分</dt><dd>{exam.passScore} 分</dd></div>
          <div><dt>考试时间</dt><dd>{exam.startsAt ? dayjs(exam.startsAt).format('YYYY-MM-DD HH:mm') : '不限'} - {exam.endsAt ? dayjs(exam.endsAt).format('YYYY-MM-DD HH:mm') : '不限'}</dd></div>
          <div><dt>防作弊</dt><dd>{exam.antiCheatEnabled ? `开启，阈值 ${exam.antiCheatThreshold}` : '关闭'}</dd></div>
          <div><dt>结果公布</dt><dd>{exam.showResultMode === 'MANUAL' ? '手动公布' : exam.showResultMode === 'IMMEDIATE' ? '即时展示' : '交卷后展示'}</dd></div>
        </dl>

        <div className="rule-box-native">
          <p>开始考试前请确认网络稳定。考试过程会自动保存作答内容，并在切屏异常时记录防作弊事件。</p>
          <label className="checkbox-row">
            <input type="checkbox" checked={ready} onChange={(event) => setReady(event.target.checked)} />
            <span>我已完成设备检查并理解考试规则</span>
          </label>
        </div>

        <div className="inline-actions">
          <MotionButtonShell>
            <button type="button" className="soft-btn" onClick={() => navigate('/student/exams')}>
              返回大厅
            </button>
          </MotionButtonShell>
          <MotionButtonShell>
            <button
              type="button"
              className="primary-btn"
              disabled={!ready || starting}
              onClick={async () => {
                try {
                  setStarting(true);
                  setError('');
                  const attempt = await startAttempt(Number(params.examId));
                  navigate(`/student/attempts/${attempt.id}`);
                } catch (err) {
                  setError(startErrorMessage(err));
                } finally {
                  setStarting(false);
                }
              }}
            >
              {starting ? '正在开始...' : '开始考试'}
            </button>
          </MotionButtonShell>
        </div>
      </section>
    </PageMotion>
  );
}
