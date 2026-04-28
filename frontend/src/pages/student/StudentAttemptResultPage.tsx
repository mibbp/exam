import { Input, Tag } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatedItem, MotionButtonShell, PageMotion } from '../../components/PageMotion';
import { createRejoinRequest, getAttemptResult } from '../../services/attempts';
import type { AttemptResult } from '../../types';

function statusLabel(status: string) {
  if (status === 'SUBMITTED') return '已提交';
  if (status === 'FORCED_SUBMITTED') return '强制交卷';
  return status;
}

function formatAnswer(raw: string | undefined) {
  if (!raw) return '未作答';
  return raw.split(',').join(' / ');
}

export function StudentAttemptResultPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [submittingRejoin, setSubmittingRejoin] = useState(false);

  const loadResult = useCallback(async () => {
    if (!params.attemptId) return;
    try {
      setLoading(true);
      setError('');
      setResult(await getAttemptResult(Number(params.attemptId)));
    } catch {
      setError('加载结果失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, [params.attemptId]);

  useEffect(() => {
    void loadResult();
  }, [loadResult]);

  const accuracy = useMemo(() => {
    if (!result?.questions || result.questions.length === 0) return 0;
    const correct = result.questions.filter((item) => item.isCorrect).length;
    return Math.round((correct / result.questions.length) * 100);
  }, [result?.questions]);

  async function submitRejoinRequest() {
    if (!params.attemptId) return;
    try {
      setSubmittingRejoin(true);
      await createRejoinRequest(Number(params.attemptId), reason.trim() || undefined);
      window.alert('重入申请已提交，请等待管理员审批');
      await loadResult();
    } catch {
      window.alert('重入申请提交失败');
    } finally {
      setSubmittingRejoin(false);
    }
  }

  if (loading) return <div className="native-loading">加载中...</div>;
  if (error) return <div className="native-error">{error}</div>;
  if (!result) return <div className="native-empty-state"><h2>结果不存在</h2></div>;

  const canApplyRejoin = result.status === 'FORCED_SUBMITTED' && result.rejoinRequest?.status !== 'PENDING';

  return (
    <PageMotion className="student-stack">
      <AnimatedItem className="native-card workspace-hero-card result-hero" as="section">
        <p className="eyebrow">Result</p>
        <h2>{result.examTitle}</h2>
        <div className="result-summary-grid">
          <div className="score-ring score-ring-large">
            <strong>{result.score}</strong>
            <span>/{result.totalScore}</span>
          </div>
          <div className="metric-list">
            <span className={`chip ${result.score >= result.passScore ? 'chip-success' : 'chip-danger'}`}>
              {result.score >= result.passScore ? '通过' : '未通过'}
            </span>
            <span className="chip">状态 {statusLabel(result.status)}</span>
            <span className="chip">错题 {result.wrongCount}</span>
            <span className="chip">正确率 {accuracy}%</span>
            {result.submittedAt ? <span className="chip">提交时间 {dayjs(result.submittedAt).format('YYYY-MM-DD HH:mm:ss')}</span> : null}
          </div>
        </div>

        {result.status === 'FORCED_SUBMITTED' ? (
          <div className="native-card" style={{ marginTop: 12 }}>
            <h3>重入申请</h3>
            <p className="muted-text">本次考试因异常行为被强制交卷。你可以申请重新加入考试。</p>
            {result.rejoinRequest ? (
              <div className="chip-group" style={{ marginBottom: 12 }}>
                <Tag color={result.rejoinRequest.status === 'PENDING' ? 'gold' : result.rejoinRequest.status === 'APPROVED' ? 'green' : 'red'}>
                  {result.rejoinRequest.status}
                </Tag>
                <span>申请时间：{dayjs(result.rejoinRequest.createdAt).format('YYYY-MM-DD HH:mm:ss')}</span>
                {result.rejoinRequest.reviewNote ? <span>审批备注：{result.rejoinRequest.reviewNote}</span> : null}
              </div>
            ) : null}

            {canApplyRejoin ? (
              <>
                <Input.TextArea
                  rows={3}
                  placeholder="可选：补充说明，帮助管理员快速处理"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                <div className="inline-actions" style={{ marginTop: 8 }}>
                  <MotionButtonShell>
                    <button type="button" className="primary-btn" disabled={submittingRejoin} onClick={() => void submitRejoinRequest()}>
                      {submittingRejoin ? '提交中...' : '申请重新加入考试'}
                    </button>
                  </MotionButtonShell>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="inline-actions">
          <MotionButtonShell>
            <button type="button" className="soft-btn" onClick={() => navigate('/student/exams')}>返回考试大厅</button>
          </MotionButtonShell>
          <MotionButtonShell>
            <button type="button" className="soft-btn" onClick={() => navigate(`/student/wrong-questions/${result.attemptId}`)}>错题回顾</button>
          </MotionButtonShell>
        </div>
      </AnimatedItem>

      {!result.resultAvailable ? (
        <div className="native-empty-state">
          <h3>结果暂不可查看</h3>
          <p>{result.message || '该考试结果尚未公布。'}</p>
        </div>
      ) : null}

      {result.resultAvailable && result.questions && result.questions.length > 0 ? (
        <section className="student-stack">
          {result.questions.map((item, index) => (
            <AnimatedItem key={item.questionId} as="article" className="native-card student-stack glass-exam-card">
              <div className="title-row">
                <h3>第 {index + 1} 题</h3>
                <span className={`chip ${item.isCorrect ? 'chip-success' : 'chip-danger'}`}>{item.isCorrect ? '正确' : '错误'}</span>
              </div>
              <p>{item.content}</p>
              <div className="chip-group">
                {item.options.map((option, optionIndex) => (
                  <span key={`${item.questionId}-${optionIndex}`} className="chip">
                    {String.fromCharCode(65 + optionIndex)}. {option}
                  </span>
                ))}
              </div>
              <p>你的答案：{formatAnswer(item.myAnswer)}</p>
              <p>正确答案：{formatAnswer(item.answer)}</p>
              <p>得分：{item.score}/{item.fullScore}</p>
              <p className="muted-text">解析：{item.analysis || '暂无解析'}</p>
            </AnimatedItem>
          ))}
        </section>
      ) : null}
    </PageMotion>
  );
}



