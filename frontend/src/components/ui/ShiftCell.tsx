import React from 'react';
import type { ShiftTemplate } from '../../types';

interface ShiftCellProps {
  template?: ShiftTemplate;
  isPinned?: boolean;
  isCompact?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ShiftCell: React.FC<ShiftCellProps> = ({
  template,
  isPinned = false,
  isCompact = false,
  onClick,
  className = '',
}) => {
  if (!template || template.code === 'OFF') {
    return (
      <div
        onClick={onClick}
        className={`shift-cell off ${isCompact ? 'compact' : ''} ${className}`}
        style={{
          backgroundColor: 'var(--shift-off-bg)',
          color: 'var(--shift-off-text)',
          border: '1px solid var(--shift-off-border)',
        }}
      >
        <span className="code">OFF</span>
        {isPinned && <span className="pin-indicator">📌</span>}
      </div>
    );
  }

  const bgVar = `var(--${template.colorToken}-bg)`;
  const textVar = `var(--${template.colorToken}-text)`;
  const borderVar = `var(--${template.colorToken}-border)`;

  return (
    <div
      onClick={onClick}
      className={`shift-cell ${isCompact ? 'compact' : ''} ${className}`}
      style={{
        backgroundColor: bgVar,
        color: textVar,
        border: `1px solid ${borderVar}`,
      }}
      title={`${template.label} (${template.startsAtLocal} ~ ${template.endsAtLocal}${template.endDayOffset ? ' 익일' : ''})`}
    >
      <span className="code">{template.code[0]}</span>
      {!isCompact && <span className="label">{template.label}</span>}
      {isPinned && <span className="pin-indicator" title="관리자 고정 배정">📌</span>}

      <style>{`
        .shift-cell {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: var(--font-size-xs);
          cursor: pointer;
          user-select: none;
          min-height: 28px;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .shift-cell:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }
        .shift-cell.compact {
          padding: 2px 4px;
          min-height: 22px;
          font-size: 11px;
        }
        .pin-indicator {
          font-size: 10px;
        }
      `}</style>
    </div>
  );
};
