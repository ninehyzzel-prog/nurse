import React from 'react';

export type TossIconName =
  | 'heart'          // 💖
  | 'calendar'       // 📅
  | 'megaphone'      // 📢
  | 'refresh'        // 🔄
  | 'clock'          // ⏱️
  | 'check'          // ✅
  | 'bell'           // 🔔
  | 'airplane'       // ✈️
  | 'umbrella'       // ☂️
  | 'moon'           // 🌙
  | 'sun'            // ☀️
  | 'star'           // ⭐
  | 'sparkles'       // ✨
  | 'flower'         // 🌸
  | 'party'          // 🎉
  | 'home'           // 🏠
  | 'clipboard'      // 📋
  | 'memo'           // 📝
  | 'chart'          // 📊
  | 'people'         // 👥
  | 'user'           // 👤
  | 'settings'       // ⚙️
  | 'robot'          // 🤖
  | 'shield'         // 🛡️
  | 'warning'        // ⚠️
  | 'search'         // 🔍
  | 'plus'           // ➕
  | 'book'           // 📖
  | 'hospital'       // 🏥
  | 'stethoscope'    // 🩺
  | 'pin'            // 📌
  | 'scale'          // ⚖️
  | 'arrow-right'    // ➡️
  | 'chevron-right'; // ›

const TOSS_ICON_MAP: Record<TossIconName, string> = {
  heart: '💖',
  calendar: '📅',
  megaphone: '📢',
  refresh: '🔄',
  clock: '⏱️',
  check: '✅',
  bell: '🔔',
  airplane: '✈️',
  umbrella: '☂️',
  moon: '🌙',
  sun: '☀️',
  star: '⭐',
  sparkles: '✨',
  flower: '🌸',
  party: '🎉',
  home: '🏠',
  clipboard: '📋',
  memo: '📝',
  chart: '📊',
  people: '👥',
  user: '👤',
  settings: '⚙️',
  robot: '🤖',
  shield: '🛡️',
  warning: '⚠️',
  search: '🔍',
  plus: '➕',
  book: '📖',
  hospital: '🏥',
  stethoscope: '🩺',
  pin: '📌',
  scale: '⚖️',
  'arrow-right': '➡️',
  'chevron-right': '›',
};

export interface TossIconProps {
  name: TossIconName | string;
  size?: number; // pixel size (minimum 12px enforced)
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export const TossIcon: React.FC<TossIconProps> = ({
  name,
  size = 16,
  className = '',
  style = {},
  title,
}) => {
  const glyph = (TOSS_ICON_MAP as Record<string, string>)[name] || name;
  const pixelSize = Math.max(12, size);

  return (
    <span
      className={`tossface ${className}`}
      style={{
        fontFamily: 'var(--font-family-tossface, "Tossface", sans-serif)',
        fontSize: `${pixelSize}px`,
        width: `${pixelSize}px`,
        height: `${pixelSize}px`,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
      title={title}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
    >
      {glyph}
    </span>
  );
};
