import { App as AntApp, Button, Card, DatePicker, Drawer, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageMotion } from '../../components/PageMotion';
import { usePermission } from '../../app/useAuth';
import { closeExam, createExam, deleteExam, examScoreboard, listExams, publishExam, unpublishExam, updateExam } from '../../services/exams';
import { listQuestions } from '../../services/questions';
import { listRoles } from '../../services/roles';
import { listUsers } from '../../services/users';
import type { Exam, ExamScoreboardResult, PagedResult, Question, Role, UserRow } from '../../types';

export function ExamsPage() {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [list, setList] = useState<PagedResult<Exam>>({ total: 0, page: 1, pageSize: 20, rows: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [form] = Form.useForm();
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const [scoreboard, setScoreboard] = useState<ExamScoreboardResult>({ total: 0, page: 1, pageSize: 20, rows: [] });
  const [scoreboardTitle, setScoreboardTitle] = useState('');
  const [scoreboardExamId, setScoreboardExamId] = useState<number | null>(null);
  const [scoreboardLatestOnly, setScoreboardLatestOnly] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [openTypeFilter, setOpenTypeFilter] = useState<string | undefined>();
  const canCreate = usePermission('exams.create');
  const canUpdate = usePermission('exams.update');
  const canPublish = usePermission('exams.publish');
  const canClose = usePermission('exams.close');
  const canResultsView = usePermission('results.view');

  async function load(page = 1, pageSize = 20) {
    setLoading(true);
    try {
      const [examRows, questionRows, roleRows, userRows] = await Promise.all([
        listExams({ page, pageSize }),
        listQuestions({ page: 1, pageSize: 500 }),
        listRoles(),
        listUsers({ page: 1, pageSize: 200 }),
      ]);
      setList(examRows);
      setQuestions(questionRows.rows);
      setRoles(roleRows);
      setUsers(userRows.rows);
    } finally {
      setLoading(false);
    }
  }

  async function loadScoreboard(examId: number, latestOnly = scoreboardLatestOnly) {
    const data = await examScoreboard(examId, { latestOnly });
    setScoreboard(data);
  }

  useEffect(() => {
    void load();
  }, []);

  const questionOptions = useMemo(() => questions.map((question) => ({ value: question.id, label: `${question.content.slice(0, 32)}...` })), [questions]);
  const roleOptions = useMemo(() => roles.map((role) => ({ value: role.id, label: role.name })), [roles]);
  const userOptions = useMemo(() => users.map((user) => ({ value: user.id, label: user.displayName || user.username })), [users]);
  const filteredRows = useMemo(() => list.rows.filter((row) => {
    if (statusFilter && row.status !== statusFilter) return false;
    if (openTypeFilter && row.openType !== openTypeFilter) return false;
    if (!keyword) return true;
    return `${row.title} ${row.description || ''}`.toLowerCase().includes(keyword.toLowerCase());
  }), [list.rows, statusFilter, openTypeFilter, keyword]);

  return (
    <PageMotion>
      <Card
        className="glass-list-card admin-crud-card"
        title="考试管理"
        extra={(
          <Space>
            <Button onClick={() => navigate('/admin/dashboard')}>返回首页</Button>
            {canCreate ? (
              <Button
                type="primary"
                onClick={() => {
                  setEditing(null);
                  form.resetFields();
                  form.setFieldsValue({
                    openType: 'PUBLIC',
                    allowReview: true,
                    antiCheatEnabled: true,
                    antiCheatThreshold: 3,
                    maxAttempts: 1,
                    questionConfigs: [],
                  });
                  setOpen(true);
                }}
              >
                创建考试
              </Button>
            ) : null}
          </Space>
        )}
      >
        <Space wrap className="filter-toolbar">
          <Input placeholder="按考试名/说明搜索" style={{ width: 260 }} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 140 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[{ value: 'DRAFT', label: '草稿' }, { value: 'PUBLISHED', label: '已发布' }, { value: 'CLOSED', label: '已关闭' }]}
          />
          <Select
            allowClear
            placeholder="开放范围"
            style={{ width: 160 }}
            value={openTypeFilter}
            onChange={setOpenTypeFilter}
            options={[{ value: 'PUBLIC', label: '全员开放' }, { value: 'USERS', label: '指定用户' }, { value: 'ROLES', label: '指定角色' }]}
          />
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={filteredRows}
          scroll={{ x: 1180 }}
          locale={{ emptyText: '暂无考试数据' }}
          pagination={{ current: list.page, pageSize: list.pageSize, total: filteredRows.length, onChange: (p, ps) => void load(p, ps) }}
          columns={[
            { title: '考试名称', dataIndex: 'title' },
            { title: '总分', render: (_, row) => row.examQuestions.reduce((sum, item) => sum + (item.scoreOverride || 0), 0) },
            { title: '及格分', dataIndex: 'passScore' },
            { title: '人数', render: (_, row) => row._count?.attempts ?? 0 },
            { title: '开放范围', dataIndex: 'openType', render: (value) => <Tag color="blue">{value}</Tag> },
            { title: '状态', dataIndex: 'status', render: (value) => <Tag color={value === 'PUBLISHED' ? 'green' : value === 'CLOSED' ? 'default' : 'gold'}>{value === 'DRAFT' ? '草稿' : value === 'PUBLISHED' ? '已发布' : '已关闭'}</Tag> },
            { title: '时间', render: (_, row) => `${row.startsAt ? dayjs(row.startsAt).format('YYYY-MM-DD HH:mm') : '不限'} - ${row.endsAt ? dayjs(row.endsAt).format('YYYY-MM-DD HH:mm') : '不限'}` },
            {
              title: '操作',
              render: (_, row) => (
                <Space size={0} wrap>
                  {canUpdate ? <Button type="link" onClick={() => {
                    setEditing(row);
                    form.setFieldsValue({
                      ...row,
                      startsAt: row.startsAt ? dayjs(row.startsAt) : null,
                      endsAt: row.endsAt ? dayjs(row.endsAt) : null,
                      questionConfigs: row.examQuestions.map((item) => ({ questionId: item.questionId, score: item.scoreOverride || 0 })),
                    });
                    setOpen(true);
                  }}>编辑</Button> : null}
                  {canPublish && row.status !== 'PUBLISHED' ? <Button type="link" onClick={async () => { await publishExam(row.id); message.success('考试已发布'); await load(list.page, list.pageSize); }}>发布</Button> : null}
                  {canPublish && row.status === 'PUBLISHED' ? <Button type="link" onClick={async () => { await unpublishExam(row.id); message.success('已撤回发布'); await load(list.page, list.pageSize); }}>撤回</Button> : null}
                  {canClose && row.status !== 'CLOSED' ? <Button type="link" onClick={async () => { await closeExam(row.id); message.success('考试已关闭'); await load(list.page, list.pageSize); }}>关闭</Button> : null}
                  {canResultsView ? <Button type="link" onClick={async () => {
                    setScoreboardTitle(row.title);
                    setScoreboardExamId(row.id);
                    setScoreboardLatestOnly(true);
                    await loadScoreboard(row.id, true);
                    setScoreboardOpen(true);
                  }}>成绩单</Button> : null}
                  {canUpdate ? <Button type="link" danger onClick={async () => { await deleteExam(row.id); message.success('考试已删除'); await load(list.page, list.pageSize); }}>删除</Button> : null}
                </Space>
              ),
            },
          ]}
        />
        <Modal open={open} title={editing ? '编辑考试' : '创建考试'} width={860} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
          <Form
            form={form}
            layout="vertical"
            onFinish={async (values) => {
              const payload = {
                ...values,
                startsAt: values.startsAt ? values.startsAt.toISOString() : undefined,
                endsAt: values.endsAt ? values.endsAt.toISOString() : undefined,
                questionConfigs: values.questionConfigs,
              };
              if (editing) await updateExam(editing.id, payload);
              else await createExam(payload);
              message.success('考试已保存');
              setOpen(false);
              await load(list.page, list.pageSize);
            }}
          >
            <Typography.Title level={5}>基本信息</Typography.Title>
            <Form.Item name="title" label="考试名称" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="description" label="考试说明"><Input.TextArea rows={2} /></Form.Item>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="durationMinutes" label="考试时长（分钟）" rules={[{ required: true }]} style={{ width: '25%' }}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="passScore" label="及格分" rules={[{ required: true }]} style={{ width: '25%' }}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="maxAttempts" label="最大次数" style={{ width: '25%' }}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="openType" label="开放范围" style={{ width: '25%' }}><Select options={[{ value: 'PUBLIC', label: '全员开放' }, { value: 'USERS', label: '指定用户' }, { value: 'ROLES', label: '指定角色' }]} /></Form.Item>
            </Space.Compact>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="startsAt" label="开始时间" style={{ width: '50%' }}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="endsAt" label="结束时间" style={{ width: '50%' }}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
            </Space.Compact>
            <Form.Item shouldUpdate noStyle>
              {({ getFieldValue }) => getFieldValue('openType') === 'USERS' ? <Form.Item name="allowedUserIds" label="指定用户"><Select mode="multiple" options={userOptions} /></Form.Item> : null}
            </Form.Item>
            <Form.Item shouldUpdate noStyle>
              {({ getFieldValue }) => getFieldValue('openType') === 'ROLES' ? <Form.Item name="allowedRoleIds" label="指定角色"><Select mode="multiple" options={roleOptions} /></Form.Item> : null}
            </Form.Item>
            <Typography.Title level={5}>规则配置</Typography.Title>
            <Space size="large" wrap>
              <Form.Item name="allowReview" label="允许回顾" valuePropName="checked"><Switch /></Form.Item>
              <Form.Item name="shuffleQuestions" label="题目乱序" valuePropName="checked"><Switch /></Form.Item>
              <Form.Item name="shuffleOptions" label="选项乱序" valuePropName="checked"><Switch /></Form.Item>
              <Form.Item name="antiCheatEnabled" label="启用防作弊" valuePropName="checked"><Switch /></Form.Item>
            </Space>
            <Form.Item name="antiCheatThreshold" label="防作弊阈值"><InputNumber min={1} max={10} style={{ width: 160 }} /></Form.Item>
            <Form.Item name="showResultMode" label="成绩公布方式"><Select options={[{ value: 'AFTER_SUBMIT', label: '交卷后展示' }, { value: 'IMMEDIATE', label: '即时展示' }, { value: 'MANUAL', label: '手动公布' }]} /></Form.Item>
            <Typography.Title level={5}>组卷</Typography.Title>
            <Form.List name="questionConfigs">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {fields.map((field) => (
                    <Space key={field.key} align="start" style={{ display: 'flex' }}>
                      <Form.Item {...field} name={[field.name, 'questionId']} rules={[{ required: true }]}><Select style={{ width: 420 }} options={questionOptions} showSearch /></Form.Item>
                      <Form.Item {...field} name={[field.name, 'score']} rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
                      <Button onClick={() => remove(field.name)}>移除</Button>
                    </Space>
                  ))}
                  <Button onClick={() => add({ score: 5 })}>添加题目</Button>
                </Space>
              )}
            </Form.List>
          </Form>
        </Modal>
        <Drawer
          open={scoreboardOpen}
          title={`成绩单 · ${scoreboardTitle}`}
          width={760}
          onClose={() => setScoreboardOpen(false)}
          extra={<Button onClick={() => setScoreboardOpen(false)}>关闭</Button>}
        >
          <Space style={{ marginBottom: 12 }} align="center">
            <span>统计口径：</span>
            <Select
              style={{ width: 220 }}
              value={scoreboardLatestOnly ? 'latest' : 'all'}
              options={[
                { value: 'latest', label: '按每位学生最近一次' },
                { value: 'all', label: '按全部作答记录' },
              ]}
              onChange={async (value) => {
                const nextLatestOnly = value === 'latest';
                setScoreboardLatestOnly(nextLatestOnly);
                if (scoreboardExamId) {
                  await loadScoreboard(scoreboardExamId, nextLatestOnly);
                }
              }}
            />
            <span>
              人数：{scoreboard.stats?.participantCount ?? scoreboard.rows.length}
            </span>
            <span>
              均分：{(scoreboard.stats?.avgScore ?? 0).toFixed(2)}
            </span>
            <span>
              通过率：{((scoreboard.stats?.passRate ?? 0) * 100).toFixed(1)}%
            </span>
          </Space>
          <Table
            rowKey="id"
            dataSource={scoreboard.rows}
            pagination={false}
            columns={[
              { title: '用户', render: (_, row) => row.displayName || row.username },
              { title: '第几次', dataIndex: 'attemptNo' },
              { title: '状态', dataIndex: 'status' },
              { title: '分数', dataIndex: 'score' },
              { title: '开始时间', render: (_, row) => row.startedAt ? dayjs(row.startedAt).format('YYYY-MM-DD HH:mm:ss') : '-' },
              { title: '提交时间', render: (_, row) => row.submittedAt ? dayjs(row.submittedAt).format('YYYY-MM-DD HH:mm:ss') : '-' },
            ]}
          />
        </Drawer>
      </Card>
    </PageMotion>
  );
}
