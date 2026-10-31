import React from 'react';
import type { RequestStatus } from '../../types';

interface StatusBadgeProps {
  status: RequestStatus | 'FEASIBLE' | 'INFEASIBLE' | 'DRAFT' | 'PUBLISHED';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  let label = status as string;
  let variant = 'neutral';

  switch (status) {
    case 'SUBMITTED':
      label = '접수됨';
      variant = 'blue';
      break;
    case 'UNDER_REVIEW':
      label = '검토 중';
      variant = 'amber';
      break;
    case 'APPROVED':
      label = '승인 완료';
      variant = 'emerald';
      break;
    case 'NOT_GRANTED':
      label = '미반영';
      variant = 'rose';
      break;
    case 'WITHDRAWN':
      label = '철회됨';
      variant = 'neutral';
      break;
    case 'FEASIBLE':
      label = '편성 가능 (Feasible)';
      variant = 'emerald';
      break;
    case 'INFEASIBLE':
      label = '편성 불가 (Infeasible)';
      variant = 'rose';
      break;
    case 'DRAFT':
      label = '초안 작성중';
      variant = 'amber';
      break;
    case 'PUBLISHED':
      label = '확정 발행됨';
      variant = 'emerald';
      break;
  }

  return (
    <span className={`status-badge ${variant} ${className}`}>
      <span className="badge-dot" />
      <span className="badge-text">{label}</span>

      <style>{`
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 20px;
          padding: 0 7px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: -0.01em;
          border-width: 1px;
          border-style: solid;
          white-space: nowrap;
          line-height: 1;
        }
        .badge-dot {
          width: 5px;
          height: 5px;
          border-radius: var(--radius-full);
          flex-shrink: 0;
        }
        
        .status-badge.neutral {
          background-color: var(--color-bg-subtle);
          border-color: var(--color-border);
          color: var(--color-text-secondary);
        }
        .status-badge.neutral .badge-dot { background-color: var(--color-text-muted); }

        .status-badge.blue {
          background-color: #EFF6FF;
          border-color: #BFDBFE;
          color: #1D4ED8;
        }
        .status-badge.blue .badge-dot { background-color: #2563EB; }

        .status-badge.emerald {
          background-color: #ECFDF5;
          border-color: #A7F3D0;
          color: #047857;
        }
        .status-badge.emerald .badge-dot { background-color: #10B981; }

        .status-badge.amber {
          background-color: #FFFBEB;
          border-color: #FDE68A;
          color: #B45309;
        }
        .status-badge.amber .badge-dot { background-color: #F59E0B; }

        .status-badge.rose {
          background-color: #FEF2F2;
          border-color: #FECACA;
          color: #B91C1C;
        }
        .status-badge.rose .badge-dot { background-color: #EF4444; }
      `}</style>
    </span>
  );
};
