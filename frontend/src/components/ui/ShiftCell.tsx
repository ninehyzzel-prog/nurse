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
  const label = isOff ? 'OFF' : template.label;
  const codeChar = isOff ? 'OFF' : template.code[0];

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
      className={`shift-badge ${isOff ? 'is-off' : ''} ${isCompact ? 'compact' : ''} ${className}`}
      style={{
        backgroundColor: `var(--${colorToken}-bg)`,
        color: `var(--${colorToken}-text)`,
        borderColor: `var(--${colorToken}-border)`,
      }}
      title={template ? `${template.label} (${template.startsAtLocal} ~ ${template.endsAtLocal})` : '오프 (휴식)'}
    >
      <span className="shift-code">{codeChar}</span>
      {!isCompact && <span className="shift-label">{label}</span>}
      {isPinned && (
        <span className="shift-pin" title="고정(Pin) 배정">
          <Pin size={10} strokeWidth={2.5} />
        </span>
      )}

      <style>{`
        .shift-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          height: 26px;
          padding: 0 8px;
          border-width: 1px;
          border-style: solid;
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          font-weight: 600;
          line-height: 1;
          letter-spacing: -0.01em;
          cursor: pointer;
          user-select: none;
          transition: background-color 0.12s ease, border-color 0.12s ease, transform 0.08s ease;
          font-feature-settings: "tnum";
        }
        .shift-badge:hover {
          filter: brightness(0.96);
          transform: translateY(-0.5px);
        }
        .shift-badge:active {
          transform: translateY(0.5px);
        }
        .shift-badge.compact {
          height: 22px;
          padding: 0 5px;
          font-size: 11px;
          border-radius: 3px;
        }
        .shift-code {
          font-weight: 700;
        }
        .shift-label {
          font-size: 11px;
          font-weight: 500;
          opacity: 0.9;
        }
        .shift-pin {
          display: inline-flex;
          align-items: center;
          color: currentColor;
          opacity: 0.85;
          margin-left: 1px;
        }
        .shift-badge.is-off {
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};
