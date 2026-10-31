import React from 'react';
import type { ShiftTemplate } from '../../types';
import { Pin } from 'lucide-react';

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
  const isOff = !template || template.code === 'OFF';
  const colorToken = isOff ? 'shift-off' : template.colorToken;
  const codeChar = isOff
    ? 'OFF'
    : template.code === 'DAY'
    ? 'D'
    : template.code === 'NIGHT'
    ? 'N'
    : template.code === 'EVENING'
    ? 'E'
    : template.code;

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
      className={`shift-capsule ${isOff ? 'is-off' : ''} ${isCompact ? 'compact' : ''} ${className}`}
      style={{
        backgroundColor: `var(--${colorToken}-bg)`,
        color: `var(--${colorToken}-text)`,
        borderColor: `var(--${colorToken}-border)`,
      }}
      title={template ? `${template.label} (${template.startsAtLocal} ~ ${template.endsAtLocal})` : '오프 (OFF)'}
    >
      <span className="code-text font-mono">{codeChar}</span>
      {isPinned && (
        <span className="pin-badge" title="고정(Pin)">
          <Pin size={8} strokeWidth={2.8} />
        </span>
      )}

      <style>{`
        .shift-capsule {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 86%;
          height: 28px;
          border-radius: 9999px;
          border: 1px solid transparent;
          font-weight: 800;
          font-size: 13px;
          line-height: 1;
          letter-spacing: 0.02em;
          transition: transform 0.12s, box-shadow 0.12s;
          user-select: none;
        }
        .shift-capsule:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }
        .shift-capsule.compact {
          width: 90%;
          height: 18px;
          font-size: 9px;
          font-weight: 800;
        }
        .code-text {
          display: inline-block;
          line-height: 1;
        }
        .pin-badge {
          margin-left: 2px;
          display: flex;
          align-items: center;
        }
      `}</style>
    </div>
  );
};
