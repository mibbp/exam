import type { ThemeConfig } from 'antd';

export const modernTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2563eb',
    colorInfo: '#2563eb',
    colorSuccess: '#10b981', // emerald-500
    colorWarning: '#f59e0b', // amber-500
    colorError: '#ef4444', // red-500
    borderRadius: 8,
    borderRadiusSM: 6,
    borderRadiusLG: 12,
    fontFamily: '"Inter", "system-ui", "-apple-system", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    colorTextBase: '#0f172a',
    colorTextSecondary: '#64748b',
    colorBgBase: '#ffffff',
    colorBgLayout: '#f1f5f9',
    colorBorder: '#dbe5f2',
    colorBorderSecondary: '#edf2f7',
    boxShadow: '0 8px 20px -12px rgb(37 99 235 / 0.35)',
    boxShadowSecondary: '0 18px 40px -24px rgb(37 99 235 / 0.42)',
  },
  components: {
    Button: {
      controlHeight: 40,
      controlHeightSM: 32,
      controlHeightLG: 48,
      borderRadius: 8,
      paddingInline: 16,
      defaultBg: '#ffffff',
      defaultBorderColor: '#dbe5f2',
      defaultColor: '#0f172a',
      defaultShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      primaryShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      algorithm: true,
    },
    Input: {
      controlHeight: 40,
      colorBgContainer: '#ffffff',
      colorBorder: '#dbe5f2',
      hoverBorderColor: '#93c5fd',
      activeBorderColor: '#2563eb',
      activeShadow: '0 0 0 2px rgba(37, 99, 235, 0.16)',
    },
    Select: {
      controlHeight: 40,
      colorBorder: '#dbe5f2',
      hoverBorderColor: '#93c5fd',
      colorPrimaryHover: '#3b82f6',
      colorPrimary: '#2563eb',
    },
    Card: {
      colorBorderSecondary: '#dbe5f2',
      borderRadiusLG: 12,
      boxShadowTertiary: '0 10px 26px -20px rgb(37 99 235 / 0.55)',
      headerBg: '#ffffff',
    },
    Table: {
      headerBg: '#f8fbff',
      headerColor: '#475569',
      headerBorderRadius: 8,
      rowHoverBg: '#f1f7ff',
      borderColor: '#edf2f7',
    },
    Menu: {
      itemBg: 'transparent',
      itemHoverBg: '#f1f7ff',
      itemSelectedBg: '#e8f0ff',
      itemSelectedColor: '#1d4ed8',
      itemColor: '#64748b',
      itemBorderRadius: 8,
    },
    Layout: {
      bodyBg: '#f1f5f9',
      headerBg: '#ffffff',
      siderBg: '#ffffff',
    }
  },
};
