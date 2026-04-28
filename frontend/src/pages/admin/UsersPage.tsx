import { App as AntApp, Button, Card, Form, Input, Modal, Select, Space, Table, Tag } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageMotion } from '../../components/PageMotion';
import { usePermission } from '../../app/useAuth';
import { listRoles } from '../../services/roles';
import { createUser, listUsers, resetUserPassword, updateUser, updateUserRoles } from '../../services/users';
import type { PagedResult, Role, UserRow } from '../../types';

export function UsersPage() {
  const { message } = AntApp.useApp();
  const [roles, setRoles] = useState<Role[]>([]);
  const [list, setList] = useState<PagedResult<UserRow>>({ total: 0, page: 1, pageSize: 20, rows: [] });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [roleFilter, setRoleFilter] = useState<number | undefined>();
  const [form] = Form.useForm();
  const canCreate = usePermission('users.create');
  const canUpdate = usePermission('users.update');
  const canReset = usePermission('users.reset-password');
  const canAssign = usePermission('roles.assign');

  const roleOptions = useMemo(() => roles.map((role) => ({ value: role.id, label: role.name })), [roles]);

  const load = useCallback(async (page = 1, pageSize = 20) => {
    const [users, roleRows] = await Promise.all([listUsers({ page, pageSize }), listRoles()]);
    setList(users);
    setRoles(roleRows);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const filteredRows = useMemo(() => list.rows.filter((row) => {
    if (status && row.status !== status) return false;
    if (roleFilter && !row.roles.some((role) => role.id === roleFilter)) return false;
    if (!keyword) return true;
    const text = `${row.username} ${row.displayName || ''}`.toLowerCase();
    return text.includes(keyword.toLowerCase());
  }), [list.rows, status, roleFilter, keyword]);

  return (
    <PageMotion>
      <Card title="用户管理" className="glass-list-card admin-crud-card" extra={canCreate ? <Button type="primary" onClick={() => { setEditing(null); form.resetFields(); form.setFieldsValue({ role: 'STUDENT', status: 'ACTIVE' }); setOpen(true); }}>新建用户</Button> : null}>
        <Space wrap className="filter-toolbar">
          <Input placeholder="按用户名或姓名搜索" style={{ width: 280 }} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 140 }}
            value={status}
            onChange={setStatus}
            options={[{ value: 'ACTIVE', label: '启用' }, { value: 'DISABLED', label: '禁用' }]}
          />
          <Select allowClear placeholder="授权角色" style={{ width: 180 }} value={roleFilter} onChange={setRoleFilter} options={roleOptions} />
        </Space>
        <Table
          rowKey="id"
          dataSource={filteredRows}
          scroll={{ x: 1080 }}
          locale={{ emptyText: '暂无用户数据' }}
          pagination={{ current: list.page, pageSize: list.pageSize, total: filteredRows.length, onChange: (p, ps) => void load(p, ps) }}
          columns={[
            { title: '用户名', dataIndex: 'username' },
            { title: '姓名', dataIndex: 'displayName', render: (value) => value || '未填写' },
            { title: '内置角色', dataIndex: 'role', render: (value) => <Tag color={value === 'ADMIN' ? 'volcano' : 'blue'}>{value === 'ADMIN' ? '管理员' : '学生'}</Tag> },
            { title: '系统状态', dataIndex: 'status', render: (value) => <Tag color={value === 'ACTIVE' ? 'green' : 'default'}>{value === 'ACTIVE' ? '启用' : '禁用'}</Tag> },
            { title: '授权角色', render: (_, row) => row.roles.length === 0 ? <Tag>未授权</Tag> : row.roles.map((role) => <Tag key={role.id}>{role.name}</Tag>) },
            {
              title: '操作',
              render: (_, row) => (
                <Space>
                  {canUpdate ? <Button type="link" onClick={() => {
                    setEditing(row);
                    form.setFieldsValue({ ...row, roleIds: row.roles.map((role) => role.id) });
                    setOpen(true);
                  }}>编辑</Button> : null}
                  {canReset ? <Button type="link" onClick={async () => {
                    await resetUserPassword(row.id, row.role === 'ADMIN' ? 'Admin@123' : 'Student@123');
                    message.success('密码已重置为演示默认值');
                  }}>重置密码</Button> : null}
                </Space>
              ),
            },
          ]}
        />
        <Modal open={open} title={editing ? '编辑用户' : '新建用户'} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
          <Form
            form={form}
            layout="vertical"
            onFinish={async (values) => {
              if (editing) {
                await updateUser(editing.id, { displayName: values.displayName, role: values.role, status: values.status });
                if (canAssign) await updateUserRoles(editing.id, values.roleIds || []);
              } else {
                await createUser(values);
              }
              message.success('用户已保存');
              setOpen(false);
              await load(list.page, list.pageSize);
            }}
          >
            {!editing && <Form.Item name="username" label="用户名" rules={[{ required: true }]}><Input /></Form.Item>}
            {!editing && <Form.Item name="password" label="初始密码" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>}
            <Form.Item name="displayName" label="姓名"><Input /></Form.Item>
            <Form.Item name="role" label="内置角色" rules={[{ required: true }]}><Select options={[{ value: 'ADMIN', label: '管理员' }, { value: 'STUDENT', label: '学生' }]} /></Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}><Select options={[{ value: 'ACTIVE', label: '启用' }, { value: 'DISABLED', label: '禁用' }]} /></Form.Item>
            {canAssign ? <Form.Item name="roleIds" label="授权角色"><Select mode="multiple" options={roleOptions} /></Form.Item> : null}
          </Form>
        </Modal>
      </Card>
    </PageMotion>
  );
}
