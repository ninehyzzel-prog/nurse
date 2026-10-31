import React from 'react';
import type { ShiftTemplate } from '../../types';
import { Pin } from 'lucide-react';
import { useShiftColors } from '../../context/ShiftColorContext';

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
  const { colors } = useShiftColors();

  const isOff = !template || template.code === 'OFF';
  const code = isOff ? 'OFF' : template.code;

  // 동적 테마 색상 적용 (기본: D 핑크, N 연두, OFF 하늘색)
  const currentTheme =
    code === 'DAY'
      ? colors.DAY
      : code === 'NIGHT'
      ? colors.NIGHT
      : code === 'EVENING'
      ? colors.EVENING
      : colors.OFF;

  const bg = currentTheme.bg;
  const textColor = currentTheme.text;
  const border = currentTheme.border || bg;
  const label = isCompact 
    ? (code === 'DAY' ? 'D' : code === 'NIGHT' ? 'N' : code === 'EVENING' ? 'E' : 'OFF')
    : currentTheme.label;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
      className={`shift-badge-capsule ${isCompact ? 'compact' : ''} ${className}`}
      style={{
        backgroundColor: bg,
        color: textColor,
        borderColor: border,
      }}
    >
      <span className="badge-text font-mono">{label}</span>

      {showTime && !isOff && (
        <span className="badge-time font-mono">
          {template?.startsAtLocal || '08:00'}
        </span>
      )}

      {isPinned && (
        <span className="badge-pin-icon" title="고정된 근무">
          <Pin size={isCompact ? 9 : 11} />
        </span>
      )}

      <style>{`
        .shift-badge-capsule {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border-radius: 9999px;
          border: 1px solid transparent;
          font-weight: 700;
          cursor: pointer;
          user-select: none;
          transition: transform 0.08s, box-shadow 0.08s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          padding: 4px 10px;
          min-width: 48px;
          height: 26px;
        }
        .shift-badge-capsule:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.12);
        }
        .shift-badge-capsule:active {
          transform: translateY(0);
        }
        .shift-badge-capsule.compact {
          padding: 2px 8px;
          min-width: 38px;
          height: 22px;
          font-size: 12px;
          letter-spacing: 0.02em;
        }
        .badge-text {
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
        }
        .badge-time {
          font-size: 12px;
          opacity: 0.9;
        }
        .badge-pin-icon {
          display: flex;
          align-items: center;
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};
