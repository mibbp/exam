import { Button, Tooltip } from 'antd';
import type { ReactNode } from 'react';

interface ActionTextButtonProps {
  children: ReactNode;
  tooltip: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function ActionTextButton({ children, tooltip, onClick, danger, disabled }: ActionTextButtonProps) {
  return (
    <Tooltip title={tooltip}>
      <Button type="link" danger={danger} disabled={disabled} onClick={onClick}>
        {children}
      </Button>
    </Tooltip>
  );
}
