import { Spin, Table } from 'antd';
import type { ReactNode } from 'react';

interface DataStateTableProps<T> {
  rowKey: string | ((record: T) => string);
  loading: boolean;
  dataSource: T[];
  columns: Array<Record<string, unknown>>;
  pagination?: Record<string, unknown> | false;
  localeEmptyText?: ReactNode;
  scroll?: Record<string, unknown>;
  title?: () => ReactNode;
  size?: 'small' | 'middle' | 'large';
  style?: React.CSSProperties;
}

export function DataStateTable<T>({
  loading,
  localeEmptyText,
  ...rest
}: DataStateTableProps<T>) {
  return (
    <Table
      loading={loading}
      locale={{ emptyText: loading ? <Spin size="small" /> : (localeEmptyText ?? '暂无数据') }}
      {...rest}
    />
  );
}
