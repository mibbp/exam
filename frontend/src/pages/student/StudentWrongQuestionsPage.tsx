import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatedItem, MotionButtonShell, PageMotion } from '../../components/PageMotion';
import { listMyWrongQuestions } from '../../services/attempts';
import type { WrongQuestion } from '../../types';

function formatAnswer(raw: string | null | undefined) {
  if (!raw) return '未作答';
  return raw.split(',').join(' / ');
}

export function StudentWrongQuestionsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [rows, setRows] = useState<WrongQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!params.attemptId) return;
      setLoading(true);
      try {
        setRows(await listMyWrongQuestions(Number(params.attemptId)));
      } finally {
        setLoading(false);
      }
    })();
  }, [params.attemptId]);

  return (
    <PageMotion className="student-stack">
      <AnimatedItem className="native-card workspace-hero-card" as="section">
        <div className="title-row">
          <h2>错题回顾</h2>
          <MotionButtonShell>
            <button type="button" className="soft-btn" onClick={() => navigate('/student/exams')}>返回考试大厅</button>
          </MotionButtonShell>
        </div>
      </AnimatedItem>
      {loading ? <div className="native-loading">加载中...</div> : null}
      {!loading && rows.length === 0 ? (
        <div className="native-empty-state">
          <h3>本次没有错题</h3>
        </div>
      ) : null}
      {!loading && rows.map((row) => (
        <AnimatedItem key={row.questionId} as="article" className="native-card student-stack glass-exam-card">
          <h3>{row.content}</h3>
          <div className="chip-group">
            {row.options.map((option, index) => (
              <span key={`${row.questionId}-${index}`} className="chip">{String.fromCharCode(65 + index)}. {option}</span>
            ))}
          </div>
          <p>你的答案：{formatAnswer(row.myAnswer)}</p>
          <p>正确答案：{formatAnswer(row.answer)}</p>
          <p className="muted-text">解析：{row.analysis || '暂无解析'}</p>
        </AnimatedItem>
      ))}
    </PageMotion>
  );
}
