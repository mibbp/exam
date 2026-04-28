import { App as AntApp, Button, Card, Form, Input, Modal, Select, Space, Table, Tag } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageMotion } from '../../components/PageMotion';
import { usePermission } from '../../app/useAuth';
import { createRepository, listRepositories, updateRepository } from '../../services/repositories';
import type { PagedResult, QuestionRepository } from '../../types';

export function RepositoryPage() {
  const { message } = AntApp.useApp();
  const [list, setList] = useState<PagedResult<QuestionRepository>>({ total: 0, page: 1, pageSize: 20, rows: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionRepository | null>(null);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [form] = Form.useForm();
  const canCreate = usePermission('repositories.create');
  const canUpdate = usePermission('repositories.update');

  const load = useCallback(async (
    page = 1,
    pageSize = 20,
    filters: { keyword?: string; status?: string } = {},
  ) => {
    setLoading(true);
    try {
      const data = await listRepositories({ page, pageSize });
      const rows = data.rows.filter((item) => {
        if (filters.status && item.status !== filters.status) return false;
        if (!filters.keyword) return true;
        const text = `${item.name} ${item.category || ''} ${item.description || ''}`.toLowerCase();
        return text.includes(filters.keyword.toLowerCase());
      });
      setList({ ...data, rows, total: filters.status || filters.keyword ? rows.length : data.total });
    } finally {
      setLoading(false);
    }
  }, []);

  const currentFilters = useMemo(() => ({
    keyword: keyword || undefined,
    status,
  }), [keyword, status]);

  const loadCurrentPage = useCallback((page = list.page, pageSize = list.pageSize) => {
    return load(page, pageSize, currentFilters);
  }, [currentFilters, list.page, list.pageSize, load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const columns = useMemo(() => ([
    { title: '题库名称', dataIndex: 'name' },
    { title: '分类', dataIndex: 'category', render: (value: string | null) => value || '未分类' },
    { title: '状态', dataIndex: 'status', render: (value: string) => <Tag color={value === 'ACTIVE' ? 'green' : 'default'}>{value === 'ACTIVE' ? '启用' : '归档'}</Tag> },
    { title: '题量', render: (_: unknown, row: QuestionRepository) => row._count?.questions ?? 0 },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '操作', render: (_: unknown, row: QuestionRepository) => (canUpdate ? <Button type="link" onClick={() => { setEditing(row); form.setFieldsValue(row); setOpen(true); }}>编辑</Button> : '-') },
  ]), [canUpdate, form]);

  return (
    <PageMotion>
      <Card
        title="题库管理"
        className="glass-list-card admin-crud-card"
        extra={canCreate ? (
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({ status: 'ACTIVE' });
              setOpen(true);
            }}
          >
            新建题库
          </Button>
        ) : null}
      >
        <Space wrap className="filter-toolbar">
          <Input placeholder="按题库名、分类或描述搜索" style={{ width: 280 }} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 140 }}
            value={status}
            onChange={setStatus}
            options={[{ value: 'ACTIVE', label: '启用' }, { value: 'ARCHIVED', label: '归档' }]}
          />
          <Button type="primary" onClick={() => void loadCurrentPage(1, list.pageSize)}>查询</Button>
          <Button onClick={() => { setKeyword(''); setStatus(undefined); void load(1, list.pageSize); }}>重置</Button>
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={list.rows}
          scroll={{ x: 860 }}
          locale={{ emptyText: '暂无题库数据' }}
          pagination={{ current: list.page, pageSize: list.pageSize, total: list.total, onChange: (p, ps) => void loadCurrentPage(p, ps) }}
          columns={columns}
        />
        <Modal open={open} title={editing ? '编辑题库' : '新建题库'} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
          <Form
            form={form}
            layout="vertical"
            onFinish={async (values) => {
              try {
                if (editing) await updateRepository(editing.id, values);
                else await createRepository(values);
                message.success('题库已保存');
                setOpen(false);
                await loadCurrentPage(list.page, list.pageSize);
              } catch {
                message.error('保存题库失败');
              }
            }}
          >
            <Form.Item label="题库名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item label="分类" name="category"><Input /></Form.Item>
            <Form.Item label="状态" name="status"><Select options={[{ value: 'ACTIVE', label: '启用' }, { value: 'ARCHIVED', label: '归档' }]} /></Form.Item>
            <Form.Item label="描述" name="description"><Input.TextArea rows={4} /></Form.Item>
          </Form>
        </Modal>
      </Card>
    </PageMotion>
  );
}
