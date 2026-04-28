import { App as AntApp } from 'antd';
import { AdminLayout } from './AdminLayout';

export function AdminAppShell() {
  return (
    <AntApp>
      <AdminLayout />
    </AntApp>
  );
}
