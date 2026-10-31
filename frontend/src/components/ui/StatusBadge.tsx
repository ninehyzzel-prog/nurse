import React from 'react';
import type { RequestStatus } from '../../types';

interface StatusBadgeProps {
  status: RequestStatus | 'FEASIBLE' | 'INFEASIBLE' | 'DRAFT' | 'PUBLISHED' | 'ALTERNATIVE_SUGGESTED';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  let label = status as string;
  let variant = 'neutral';

  switch (status) {
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      label = '대기중';
      variant = 'warning';
      break;
    case 'APPROVED':
    case 'PUBLISHED':
    case 'FEASIBLE':
      label = status === 'FEASIBLE' ? '편성 가능' : status === 'PUBLISHED' ? '확정 발행' : '승인됨';
      variant = 'success';
      break;
    case 'NOT_GRANTED':
    case 'INFEASIBLE':
      label = status === 'INFEASIBLE' ? '편성 불가' : '반려됨';
      variant = 'danger';
      break;
    case 'ALTERNATIVE_SUGGESTED':
      label = '대체일 제안';
      variant = 'info';
      break;
    case 'DRAFT':
      label = '초안 작성중';
      variant = 'warning';
      break;
    case 'WITHDRAWN':
      label = '철회됨';
      variant = 'neutral';
      break;
  }

  return (
    <span className={`status-pill ${variant} ${className}`}>
      {label}

      <style>{`
        .status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 22px;
          padding: 0 8px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: -0.01em;
          border-width: 1px;
          border-style: solid;
          white-space: nowrap;
          line-height: 1;
        }

        .status-pill.success {
          background-color: var(--color-success-bg);
          border-color: #BBF7D0;
          color: var(--color-success-text);
        }

        .status-pill.warning {
          background-color: var(--color-warning-bg);
          border-color: #FDE68A;
          color: var(--color-warning-text);
        }

        .status-pill.danger {
          background-color: var(--color-danger-bg);
          border-color: #FECDD3;
          color: var(--color-danger-text);
        }

        .status-pill.info {
          background-color: var(--color-info-bg);
          border-color: #BAE6FD;
          color: var(--color-info-text);
        }

        .status-pill.neutral {
          background-color: var(--color-bg-muted);
          border-color: var(--color-border-card);
          color: var(--color-text-secondary);
        }
      `}</style>
    </span>
  );
};
