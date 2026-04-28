import { App as AntApp, Button, Card, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageMotion } from '../../components/PageMotion';
import { usePermission } from '../../app/useAuth';
import {
  approveRejoinRequest,
  examMonitor,
  examRejoinRequests,
  listExams,
  rejectRejoinRequest,
} from '../../services/exams';
import type { Exam, ExamMonitorRow, ExamRejoinRequestRow } from '../../types';

const refreshIntervalMs = 5000;

export function AdminExamMonitorPage() {
  const { message } = AntApp.useApp();
  const canReview = usePermission('monitor.rejoin.review');

  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState<number | null>(null);
  const [monitorRows, setMonitorRows] = useState<ExamMonitorRow[]>([]);
  const [requests, setRequests] = useState<ExamRejoinRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState<ExamRejoinRequestRow | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNote, setReviewNote] = useState('');

  const loadExamOptions = useCallback(async () => {
    const result = await listExams({ page: 1, pageSize: 200, status: 'PUBLISHED' });
    setExams(result.rows);
    if (!examId && result.rows.length > 0) {
      setExamId(result.rows[0].id);
    }
  }, [examId]);

  const loadMonitorData = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    try {
      const [monitor, rejoinList] = await Promise.all([
        examMonitor(examId, { page: 1, pageSize: 200 }),
        examRejoinRequests(examId),
      ]);
      setMonitorRows(monitor.rows);
      setRequests(rejoinList);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    void loadExamOptions().catch(() => {
      message.error('加载考试列表失败');
    });
  }, [loadExamOptions, message]);

  useEffect(() => {
    if (!examId) return;

    void loadMonitorData().catch(() => {
      message.error('加载监控数据失败');
    });

    const timer = window.setInterval(() => {
      void loadMonitorData().catch(() => {
        message.error('刷新监控数据失败');
      });
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [examId, loadMonitorData, message]);

  const abnormalRows = useMemo(
    () => monitorRows.filter((row) => row.antiCheatViolationCount > 0 || row.status === 'FORCED_SUBMITTED'),
    [monitorRows],
  );

  const examOptions = exams.map((exam) => ({ label: exam.title, value: exam.id }));

  async function submitReview() {
    if (!reviewing) return;
    try {
      if (reviewAction === 'approve') {
        await approveRejoinRequest(reviewing.id, reviewNote);
        message.success('已批准重入申请');
      } else {
        await rejectRejoinRequest(reviewing.id, reviewNote);
        message.success('已拒绝重入申请');
      }
      setReviewing(null);
      setReviewNote('');
      await loadMonitorData();
    } catch {
      message.error('处理申请失败');
    }
  }

  return (
    <PageMotion>
      <Card
        className="glass-list-card admin-crud-card"
        title="考试监控"
        extra={(
          <Space>
            <Select
              style={{ minWidth: 280 }}
              placeholder="选择考试"
              options={examOptions}
              value={examId ?? undefined}
              onChange={(value) => setExamId(value)}
            />
            <Button onClick={() => void loadMonitorData()}>刷新</Button>
          </Space>
        )}
      >
        <Typography.Paragraph type="secondary">
          页面每 {Math.round(refreshIntervalMs / 1000)} 秒自动刷新一次。
        </Typography.Paragraph>

        <Table
          rowKey="attemptId"
          loading={loading}
          dataSource={monitorRows}
          size="small"
          scroll={{ x: 1200 }}
          title={() => '在考监控'}
          pagination={false}
          locale={{ emptyText: '当前暂无在考数据' }}
          columns={[
            { title: '考生', render: (_, row) => row.displayName || row.username },
            {
              title: '状态',
              dataIndex: 'status',
              render: (value) => (
                <Tag color={value === 'IN_PROGRESS' ? 'green' : 'orange'}>
                  {value === 'IN_PROGRESS' ? '进行中' : '已强制交卷'}
                </Tag>
              ),
            },
            { title: '作答进度', render: (_, row) => `${row.answeredCount}/${row.questionCount} (${row.progressPercent}%)` },
            {
              title: '切屏次数',
              dataIndex: 'antiCheatViolationCount',
              render: (value) => <Tag color={value > 0 ? 'red' : 'default'}>{value}</Tag>,
            },
            { title: '开始时间', render: (_, row) => dayjs(row.startedAt).format('YYYY-MM-DD HH:mm:ss') },
            {
              title: '最近活动',
              render: (_, row) => (row.lastActivityAt ? dayjs(row.lastActivityAt).format('YYYY-MM-DD HH:mm:ss') : '-'),
            },
            {
              title: '重入申请',
              dataIndex: 'hasPendingRejoinRequest',
              render: (value) => (value ? <Tag color="gold">待处理</Tag> : <span>-</span>),
            },
          ]}
        />

        <Table
          rowKey="attemptId"
          loading={loading}
          dataSource={abnormalRows}
          size="small"
          scroll={{ x: 980 }}
          title={() => '异常考生'}
          pagination={false}
          locale={{ emptyText: '暂无异常考生' }}
          style={{ marginTop: 16 }}
          columns={[
            { title: '考生', render: (_, row) => row.displayName || row.username },
            { title: '状态', dataIndex: 'status' },
            { title: '切屏次数', dataIndex: 'antiCheatViolationCount' },
            {
              title: '最近异常时间',
              render: (_, row) => (row.latestAntiCheatAt ? dayjs(row.latestAntiCheatAt).format('YYYY-MM-DD HH:mm:ss') : '-'),
            },
          ]}
        />

        <Table
          rowKey="id"
          loading={loading}
          dataSource={requests}
          size="small"
          scroll={{ x: 1200 }}
          title={() => '重入申请'}
          pagination={false}
          locale={{ emptyText: '暂无重入申请' }}
          style={{ marginTop: 16 }}
          columns={[
            { title: '考生', render: (_, row) => row.student.displayName || row.student.username },
            { title: 'Attempt', dataIndex: 'attemptId' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (value) => (
                <Tag color={value === 'PENDING' ? 'gold' : value === 'APPROVED' ? 'green' : 'red'}>{value}</Tag>
              ),
            },
            { title: '申请原因', dataIndex: 'reason', render: (value) => value || '-' },
            { title: '申请时间', render: (_, row) => dayjs(row.createdAt).format('YYYY-MM-DD HH:mm:ss') },
            { title: '审批备注', dataIndex: 'reviewNote', render: (value) => value || '-' },
            {
              title: '操作',
              render: (_, row) => (
                <Space>
                  <Button
                    type="link"
                    disabled={!canReview || row.status !== 'PENDING'}
                    onClick={() => {
                      setReviewAction('approve');
                      setReviewing(row);
                      setReviewNote('');
                    }}
                  >
                    批准
                  </Button>
                  <Button
                    type="link"
                    danger
                    disabled={!canReview || row.status !== 'PENDING'}
                    onClick={() => {
                      setReviewAction('reject');
                      setReviewing(row);
                      setReviewNote('');
                    }}
                  >
                    拒绝
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={Boolean(reviewing)}
        title={reviewAction === 'approve' ? '批准重入申请' : '拒绝重入申请'}
        onCancel={() => setReviewing(null)}
        onOk={() => void submitReview()}
        okText={reviewAction === 'approve' ? '确认批准' : '确认拒绝'}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text>
            申请人：{reviewing ? (reviewing.student.displayName || reviewing.student.username) : '-'}
          </Typography.Text>
          <Input.TextArea
            rows={4}
            placeholder="可选：填写审批备注"
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
          />
        </Space>
      </Modal>
    </PageMotion>
  );
}

