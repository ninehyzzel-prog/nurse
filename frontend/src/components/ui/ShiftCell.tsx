import React from 'react';
import type { ShiftTemplate } from '../../types';
import { Pin } from 'lucide-react';

interface ShiftCellProps {
  template?: ShiftTemplate;
  isPinned?: boolean;
  isCompact?: boolean;
  showTime?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ShiftCell: React.FC<ShiftCellProps> = ({
  template,
  isPinned = false,
  isCompact = false,
  showTime = false,
  onClick,
  className = '',
}) => {
  const isOff = !template || template.code === 'OFF';
  const code = isOff ? 'OFF' : template.code;

  // Linear / Shadcn 정제된 디자인 토큰
  const badgeStyle = isOff
    ? {
        bg: '#F8FAFC',
        text: '#475569',
        border: '#E2E8F0',
        label: '오프',
      }
    : code === 'DAY'
    ? {
        bg: '#FFF1F2',
        text: '#E11D48',
        border: '#FFE4E6',
        label: '데이',
      }
    : code === 'NIGHT'
    ? {
        bg: '#F0FDF4',
        text: '#166534',
        border: '#DCFCE7',
        label: '나이트',
      }
    : {
        bg: '#FFF7ED',
        text: '#C2410C',
        border: '#FFEDD5',
        label: '이브닝',
      };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`linear-shift-badge ${isOff ? 'is-off' : ''} ${isCompact ? 'compact' : ''} ${className}`}
      style={{
        backgroundColor: badgeStyle.bg,
        color: badgeStyle.text,
        borderColor: badgeStyle.border,
      }}
      title={template ? `${template.label} (${template.startsAtLocal} ~ ${template.endsAtLocal})` : '오프 (OFF)'}
    >
      <span className="badge-code font-mono">{code === 'OFF' ? 'OFF' : code.slice(0, 1)}</span>
      {!isCompact && <span className="badge-name">{badgeStyle.label}</span>}
      {showTime && template && (
        <span className="badge-time font-mono">
          {template.startsAtLocal.slice(0, 5)}
        </span>
      )}
      {isPinned && (
        <span className="pin-indicator" title="고정(Pin)">
          <Pin size={9} strokeWidth={2.4} />
        </span>
      )}

      <style>{`
        .linear-shift-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid transparent;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.2;
          cursor: pointer;
          transition: background-color 0.12s, border-color 0.12s, transform 0.08s;
          user-select: none;
          max-width: 100%;
        }
        .linear-shift-badge:hover {
          filter: brightness(0.97);
          transform: translateY(-0.5px);
        }
        .linear-shift-badge.compact {
          padding: 2px 7px;
          gap: 3px;
          font-size: 12px;
          border-radius: 5px;
        }
        .badge-code {
          font-weight: 700;
          font-size: 12px;
          letter-spacing: -0.01em;
        }
        .compact .badge-code {
          font-size: 12px;
        }
        .badge-name {
          font-size: 12px;
          font-weight: 500;
          opacity: 0.9;
        }
        .badge-time {
          font-size: 12px;
          opacity: 0.7;
          margin-left: 2px;
        }
        .pin-indicator {
          margin-left: auto;
          display: flex;
          align-items: center;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
};
