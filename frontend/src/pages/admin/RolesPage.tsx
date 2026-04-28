import { App as AntApp, Button, Card, Checkbox, Drawer, Form, Input, Modal, Select, Space, Table, Tag } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageMotion } from '../../components/PageMotion';
import { usePermission } from '../../app/useAuth';
import { createRole, listPermissions, listRoles, updateRole, updateRolePermissions } from '../../services/roles';
import type { Permission, Role } from '../../types';

export function RolesPage() {
  const { message } = AntApp.useApp();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [open, setOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [checkedPermissions, setCheckedPermissions] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');
  const [isSystem, setIsSystem] = useState<string | undefined>();
  const [form] = Form.useForm();
  const canCreate = usePermission('roles.create');
  const canUpdate = usePermission('roles.update');
  const canAssign = usePermission('roles.assign');

  const load = useCallback(async () => {
    const [roleRows, permissionRows] = await Promise.all([listRoles(), listPermissions()]);
    setRoles(roleRows);
    setPermissions(permissionRows);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const groupedPermissions = useMemo(() => permissions.reduce<Record<string, Permission[]>>((acc, permission) => {
    acc[permission.category] = acc[permission.category] || [];
    acc[permission.category].push(permission);
    return acc;
  }, {}), [permissions]);

  const filteredRoles = useMemo(() => roles.filter((item) => {
    if (isSystem === 'true' && !item.isSystem) return false;
    if (isSystem === 'false' && item.isSystem) return false;
    if (!keyword) return true;
    const text = `${item.code} ${item.name} ${item.description || ''}`.toLowerCase();
    return text.includes(keyword.toLowerCase());
  }), [roles, keyword, isSystem]);

  return (
    <PageMotion>
      <Card title="角色管理" className="glass-list-card admin-crud-card" extra={canCreate ? <Button type="primary" onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>新建角色</Button> : null}>
        <Space wrap className="filter-toolbar">
          <Input placeholder="按编码、名称或描述搜索" style={{ width: 280 }} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Select
            allowClear
            placeholder="系统角色"
            style={{ width: 140 }}
            value={isSystem}
            onChange={setIsSystem}
            options={[{ value: 'true', label: '系统角色' }, { value: 'false', label: '自定义角色' }]}
          />
        </Space>
        <Table
          rowKey="id"
          dataSource={filteredRoles}
          scroll={{ x: 860 }}
          locale={{ emptyText: '暂无角色数据' }}
          columns={[
            { title: '角色编码', dataIndex: 'code' },
            { title: '角色名称', dataIndex: 'name' },
            { title: '描述', dataIndex: 'description', render: (value) => value || '未填写' },
            { title: '系统角色', dataIndex: 'isSystem', render: (value) => <Tag color={value ? 'gold' : 'default'}>{value ? '系统' : '自定义'}</Tag> },
            { title: '绑定用户', render: (_, row) => row._count?.userAssignments ?? 0 },
            {
              title: '操作',
              render: (_, row) => (
                <Space>
                  {canUpdate ? <Button type="link" onClick={() => { setEditing(row); form.setFieldsValue(row); setOpen(true); }}>编辑</Button> : null}
                  {canAssign ? <Button type="link" onClick={() => {
                    setSelectedRole(row);
                    setCheckedPermissions((row.permissions || []).map((item) => item.permission.code));
                    setPermissionsOpen(true);
                  }}>菜单授权</Button> : null}
                </Space>
              ),
            },
          ]}
        />
        <Modal open={open} title={editing ? '编辑角色' : '新建角色'} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
          <Form
            form={form}
            layout="vertical"
            onFinish={async (values) => {
              if (editing) await updateRole(editing.id, values);
              else await createRole(values);
              message.success('角色已保存');
              setOpen(false);
              await load();
            }}
          >
            {!editing && <Form.Item name="code" label="角色编码" rules={[{ required: true }]}><Input /></Form.Item>}
            <Form.Item name="name" label="角色名称" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="description" label="描述"><Input.TextArea rows={4} /></Form.Item>
          </Form>
        </Modal>
        <Drawer
          open={permissionsOpen}
          title={`菜单授权 · ${selectedRole?.name || ''}`}
          width={560}
          onClose={() => setPermissionsOpen(false)}
          extra={canAssign ? <Button type="primary" onClick={async () => {
            if (!selectedRole) return;
            await updateRolePermissions(selectedRole.id, checkedPermissions);
            message.success('权限已更新');
            setPermissionsOpen(false);
            await load();
          }}>保存权限</Button> : null}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {Object.entries(groupedPermissions).map(([category, items]) => (
              <Card key={category} size="small" title={category}>
                <Checkbox.Group
                  value={checkedPermissions}
                  onChange={(values) => setCheckedPermissions(values as string[])}
                  options={items.map((item) => ({ label: item.name, value: item.code }))}
                />
              </Card>
            ))}
          </Space>
        </Drawer>
      </Card>
    </PageMotion>
  );
}
