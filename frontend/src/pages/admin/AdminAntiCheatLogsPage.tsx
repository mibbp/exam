import { Button, Card, Input, Select, Space } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataStateTable } from '../../components/DataStateTable';
import { PageMotion } from '../../components/PageMotion';
import { antiCheatLogs, listExams } from '../../services/exams';
import type { AntiCheatLogRow, Exam, PagedResult } from '../../types';

export function AdminAntiCheatLogsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PagedResult<AntiCheatLogRow>>({ total: 0, page: 1, pageSize: 20, rows: [] });
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [examId, setExamId] = useState<number | undefined>();
  const [eventType, setEventType] = useState<string | undefined>();

  const load = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const data = await antiCheatLogs({ page, pageSize, keyword: keyword || undefined, examId, eventType });
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [eventType, examId, keyword]);

  useEffect(() => {
    void (async () => {
      const examRows = await listExams({ page: 1, pageSize: 200 });
      setExams(examRows.rows);
      await load();
    })();
  }, [load]);

  return (
    <PageMotion>
      <Card
        className="glass-list-card admin-crud-card"
        title="反作弊历史日志"
        extra={<Button onClick={() => navigate('/admin/dashboard')}>返回首页</Button>}
      >
        <Space wrap className="filter-toolbar">
          <Input placeholder="搜索考生" style={{ width: 220 }} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Select
            allowClear
            style={{ width: 240 }}
            placeholder="考试"
            value={examId}
            onChange={(value) => setExamId(value)}
            options={exams.map((item) => ({ label: item.title, value: item.id }))}
          />
          <Select
            allowClear
            style={{ width: 180 }}
            placeholder="事件类型"
            value={eventType}
            onChange={(value) => setEventType(value)}
            options={[
              { label: '切屏', value: 'visibility-hidden' },
              { label: '其他', value: 'other' },
            ]}
          />
          <Button type="primary" onClick={() => void load(1, rows.pageSize)}>查询</Button>
        </Space>

        <DataStateTable
          rowKey="id"
          loading={loading}
          dataSource={rows.rows}
          localeEmptyText="暂无日志数据"
          pagination={{ current: rows.page, pageSize: rows.pageSize, total: rows.total, onChange: (p: number, ps: number) => void load(p, ps) }}
          columns={[
            { title: '时间', render: (_: unknown, row: AntiCheatLogRow) => dayjs(row.createdAt).format('YYYY-MM-DD HH:mm:ss') },
            { title: '考试', dataIndex: 'examTitle' },
            { title: '考生', render: (_: unknown, row: AntiCheatLogRow) => row.displayName || row.username },
            { title: 'Attempt', dataIndex: 'attemptId' },
            { title: '事件类型', dataIndex: 'eventType' },
            { title: '备注', dataIndex: 'message', render: (value: string | null) => value || '-' },
            { title: '结果', render: (_: unknown, row: AntiCheatLogRow) => row.forcedSubmitted ? '触发强制交卷' : row.attemptStatus },
          ]}
        />
      </Card>
    </PageMotion>
  );
}
