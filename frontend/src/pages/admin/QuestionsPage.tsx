import { App as AntApp, Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageMotion } from '../../components/PageMotion';
import { usePermission } from '../../app/useAuth';
import { createQuestion, deleteQuestion, downloadQuestionImportTemplate, exportQuestionsFile, importQuestions, listQuestions, updateQuestion } from '../../services/questions';
import { listRepositories } from '../../services/repositories';
import type { PagedResult, Question, QuestionRepository } from '../../types';

function parseList(raw: string) {
  return raw.split(/[,\uff0c]/).map((item) => item.trim()).filter(Boolean);
}

export function QuestionsPage() {
  const { message, modal } = AntApp.useApp();
  const [repositories, setRepositories] = useState<QuestionRepository[]>([]);
  const [list, setList] = useState<PagedResult<Question>>({ total: 0, page: 1, pageSize: 20, rows: [] });
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [repositoryId, setRepositoryId] = useState<number | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form] = Form.useForm();
  const canCreate = usePermission('questions.create');
  const canUpdate = usePermission('questions.update');
  const canDelete = usePermission('questions.delete');
  const canImport = usePermission('questions.import');
  const canExport = usePermission('questions.export');

  function triggerFileDownload(blob: Blob, fileName: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  const currentFilters = useMemo(() => ({
    keyword: keyword || undefined,
    repositoryId,
    status,
  }), [keyword, repositoryId, status]);

  const load = useCallback(async (
    page = 1,
    pageSize = 20,
    filters: { keyword?: string; repositoryId?: number; status?: string } = {},
  ) => {
    setLoading(true);
    try {
      setList(await listQuestions({ page, pageSize, ...filters }));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrentPage = useCallback((page = list.page, pageSize = list.pageSize) => {
    return load(page, pageSize, currentFilters);
  }, [currentFilters, list.page, list.pageSize, load]);

  const uploadProps: UploadProps = {
    beforeUpload: async (file) => {
      try {
        const result = await importQuestions(file as File, repositoryId);
        message.success(`导入完成：${result.successCount}/${result.total}`);
        if (result.errors.length > 0) {
          modal.warning({
            title: `导入失败 ${result.errors.length} 条`,
            width: 760,
            content: (
              <div style={{ maxHeight: 360, overflow: 'auto' }}>
                {result.errors.slice(0, 80).map((item) => (
                  <div key={`${item.row}-${item.reason}`}>第 {item.row} 行：{item.reason}</div>
                ))}
                {result.errors.length > 80 ? <div>... 其余 {result.errors.length - 80} 条请修正后重新导入</div> : null}
              </div>
            ),
          });
        }
        await loadCurrentPage();
      } catch {
        message.error('导入失败，请检查文件格式。');
      }
      return false;
    },
    showUploadList: false,
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        const repositoriesResult = await listRepositories({ page: 1, pageSize: 200 });
        setRepositories(repositoriesResult.rows);
        await load(1, 20);
      })();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const repositoryOptions = useMemo(() => repositories.map((item) => ({ value: item.id, label: item.name })), [repositories]);

  return (
    <PageMotion>
      <Card
        title="试题管理"
        className="glass-list-card admin-crud-card"
        extra={(
          <Space>
            <Button onClick={() => void loadCurrentPage(1, list.pageSize)}>刷新</Button>
            {canExport ? (
              <Button onClick={async () => {
                const blob = await exportQuestionsFile(repositoryId);
                triggerFileDownload(blob, `questions-${Date.now()}.xlsx`);
                message.success('导出文件已下载');
              }}
              >
                导出 XLSX
              </Button>
            ) : null}
            {canImport ? (
              <Button onClick={async () => {
                const blob = await downloadQuestionImportTemplate();
                triggerFileDownload(blob, 'questions-import-template.xlsx');
                message.success('模板已下载');
              }}
              >
                下载模板
              </Button>
            ) : null}
            {canImport ? <Upload {...uploadProps}><Button>导入</Button></Upload> : null}
            {canCreate ? (
              <Button
                type="primary"
                onClick={() => {
                  setEditing(null);
                  form.resetFields();
                  form.setFieldsValue({ type: 'SINGLE', score: 5, difficulty: 1, status: 'ACTIVE' });
                  setOpen(true);
                }}
              >
                新建试题
              </Button>
            ) : null}
          </Space>
        )}
      >
        <Space wrap className="filter-toolbar">
          <Select allowClear placeholder="选择题库" style={{ width: 220 }} value={repositoryId} onChange={setRepositoryId} options={repositoryOptions} />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 140 }}
            value={status}
            onChange={setStatus}
            options={[{ value: 'ACTIVE', label: '启用' }, { value: 'DISABLED', label: '停用' }]}
          />
          <Input placeholder="搜索题干关键词" style={{ width: 280 }} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Button type="primary" onClick={() => void loadCurrentPage(1, list.pageSize)}>查询</Button>
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={list.rows}
          scroll={{ x: 980 }}
          locale={{ emptyText: '暂无试题数据' }}
          pagination={{ current: list.page, pageSize: list.pageSize, total: list.total, onChange: (p, ps) => void loadCurrentPage(p, ps) }}
          columns={[
            { title: '题库', render: (_, row) => row.repository?.name || '未归档' },
            { title: '题型', dataIndex: 'type', width: 120, render: (value) => <Tag color="blue">{value}</Tag> },
            { title: '题干', dataIndex: 'content', ellipsis: true },
            { title: '难度', dataIndex: 'difficulty', width: 80 },
            { title: '分值', dataIndex: 'score', width: 80 },
            { title: '状态', dataIndex: 'status', render: (value) => <Tag color={value === 'ACTIVE' ? 'green' : 'default'}>{value === 'ACTIVE' ? '启用' : '停用'}</Tag> },
            {
              title: '操作',
              render: (_, row) => (
                <Space>
                  {canUpdate ? (
                    <Button
                      type="link"
                      onClick={() => {
                        setEditing(row);
                        form.setFieldsValue({
                          ...row,
                          optionsText: row.options.join(', '),
                          tagsText: (row.tags || []).join(', '),
                          knowledgePointsText: (row.knowledgePoints || []).join(', '),
                        });
                        setOpen(true);
                      }}
                    >
                      编辑
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      type="link"
                      danger
                      onClick={() => void (async () => {
                        await deleteQuestion(row.id);
                        message.success('试题已删除');
                        await loadCurrentPage(list.page, list.pageSize);
                      })()}
                    >
                      删除
                    </Button>
                  ) : null}
                </Space>
              ),
            },
          ]}
        />
        <Modal open={open} title={editing ? '编辑试题' : '新建试题'} width={720} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
          <Form
            form={form}
            layout="vertical"
            onFinish={async (values) => {
              const payload = {
                repositoryId: values.repositoryId,
                type: values.type,
                content: values.content,
                options: parseList(values.optionsText),
                answer: values.answer,
                score: values.score,
                difficulty: values.difficulty,
                analysis: values.analysis,
                tags: parseList(values.tagsText || ''),
                knowledgePoints: parseList(values.knowledgePointsText || ''),
                source: values.source,
                status: values.status,
              };
              if (editing) await updateQuestion(editing.id, payload);
              else await createQuestion(payload);
              message.success('试题已保存');
              setOpen(false);
              await loadCurrentPage(list.page, list.pageSize);
            }}
          >
            <Form.Item name="repositoryId" label="所属题库"><Select options={repositoryOptions} allowClear /></Form.Item>
            <Form.Item name="type" label="题型" rules={[{ required: true }]}><Select options={[{ value: 'SINGLE', label: '单选题' }, { value: 'MULTIPLE', label: '多选题' }, { value: 'TRUE_FALSE', label: '判断题' }]} /></Form.Item>
            <Form.Item name="content" label="题干" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
            <Form.Item name="optionsText" label="选项（逗号分隔）" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="answer" label="答案" rules={[{ required: true }]} style={{ width: '40%' }}><Input /></Form.Item>
              <Form.Item name="score" label="分值" rules={[{ required: true }]} style={{ width: '20%' }}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="difficulty" label="难度" rules={[{ required: true }]} style={{ width: '20%' }}><InputNumber min={1} max={5} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="status" label="状态" style={{ width: '20%' }}><Select options={[{ value: 'ACTIVE', label: '启用' }, { value: 'DISABLED', label: '停用' }]} /></Form.Item>
            </Space.Compact>
            <Form.Item name="analysis" label="解析"><Input.TextArea rows={3} /></Form.Item>
            <Form.Item name="tagsText" label="标签"><Input /></Form.Item>
            <Form.Item name="knowledgePointsText" label="知识点"><Input /></Form.Item>
            <Form.Item name="source" label="来源"><Input /></Form.Item>
          </Form>
        </Modal>
      </Card>
    </PageMotion>
  );
}
