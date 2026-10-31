import React from 'react';
import type { RequestStatus } from '../../types';

interface StatusBadgeProps {
  status: RequestStatus | 'FEASIBLE' | 'INFEASIBLE' | 'DRAFT' | 'PUBLISHED';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let label = status as string;
  let bg = 'var(--color-bg-muted)';
  let color = 'var(--color-text-secondary)';

  switch (status) {
    case 'SUBMITTED':
      label = '접수됨';
      bg = 'var(--color-brand-light)';
      color = 'var(--color-brand-primary)';
      break;
    case 'UNDER_REVIEW':
      label = '검토 중';
      bg = 'var(--color-warning-bg)';
      color = 'var(--color-warning)';
      break;
    case 'APPROVED':
      label = '확정 반영';
      bg = 'var(--color-success-bg)';
      color = 'var(--color-success)';
      break;
    case 'NOT_GRANTED':
      label = '미반영';
      bg = 'var(--color-danger-bg)';
      color = 'var(--color-danger)';
      break;
    case 'WITHDRAWN':
      label = '철회됨';
      break;
    case 'FEASIBLE':
      label = '편성 가능 (FEASIBLE)';
      bg = 'var(--color-success-bg)';
      color = 'var(--color-success)';
      break;
    case 'INFEASIBLE':
      label = '편성 불가 (INFEASIBLE)';
      bg = 'var(--color-danger-bg)';
      color = 'var(--color-danger)';
      break;
    case 'DRAFT':
      label = '초안 작성중';
      bg = 'var(--color-warning-bg)';
      color = 'var(--color-warning)';
      break;
    case 'PUBLISHED':
      label = '확정 발행됨';
      bg = 'var(--color-success-bg)';
      color = 'var(--color-success)';
      break;
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 600,
        backgroundColor: bg,
        color: color,
      }}
    >
      {label}
    </span>
  );
};
