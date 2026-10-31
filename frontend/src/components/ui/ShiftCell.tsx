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
  const codeChar = isOff ? 'OFF' : template.code === 'DAY' ? 'D' : template.code === 'NIGHT' ? 'N' : template.code === 'EVENING' ? 'E' : template.code[0];

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
      <span className="code-text">{codeChar}</span>
      {!isCompact && <span className="label-text">{label}</span>}
      {isPinned && (
        <span className="pin-badge" title="고정(Pin)">
          <Pin size={9} strokeWidth={2.8} />
        </span>
      )}

      <style>{`
        .shift-capsule {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          height: 28px;
          padding: 0 10px;
          border-width: 1px;
          border-style: solid;
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          user-select: none;
          transition: transform 0.1s ease, filter 0.1s ease, box-shadow 0.1s ease;
          font-feature-settings: "tnum";
        }
        .shift-capsule:hover {
          filter: brightness(0.97);
          transform: translateY(-0.5px);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .shift-capsule:active {
          transform: translateY(0.5px);
        }
        .shift-capsule.compact {
          height: 24px;
          padding: 0 7px;
          font-size: 11px;
          border-radius: var(--radius-full);
          min-width: 28px;
        }
        .code-text {
          font-weight: 800;
        }
        .label-text {
          font-size: 11px;
          font-weight: 600;
          opacity: 0.9;
        }
        .pin-badge {
          display: inline-flex;
          align-items: center;
          color: currentColor;
          opacity: 0.9;
          margin-left: 1px;
        }
        .shift-capsule.is-off {
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};
