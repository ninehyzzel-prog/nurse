import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface ShiftColorConfig {
  bg: string;
  text: string;
  border?: string;
  label: string;
}

export interface ShiftColorTheme {
  DAY: ShiftColorConfig;
  NIGHT: ShiftColorConfig;
  OFF: ShiftColorConfig;
  EVENING: ShiftColorConfig;
}

export const DEFAULT_SHIFT_COLORS: ShiftColorTheme = {
  DAY: {
    bg: '#EC8FBE',   // 산뜻한 핑크 (이미지 기준)
    text: '#FFFFFF',
    border: '#E278AB',
    label: '데이',
  },
  NIGHT: {
    bg: '#95D66C',   // 산뜻한 연두 (이미지 기준)
    text: '#FFFFFF',
    border: '#83C857',
    label: '나이트',
  },
  OFF: {
    bg: '#5DC3EB',   // 맑은 하늘색 (이미지 기준)
    text: '#FFFFFF',
    border: '#46B4DF',
    label: '오프',
  },
  EVENING: {
    bg: '#FFA352',   // 화사한 오렌지
    text: '#FFFFFF',
    border: '#F48E33',
    label: '이브닝',
  },
};

export interface ColorPreset {
  id: string;
  name: string;
  desc: string;
  theme: ShiftColorTheme;
}

export const SHIFT_COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'user_uploaded',
    name: '파스텔 젤리 (추천 기본)',
    desc: '요청 이미지 기준 화사한 핑크(D), 연두(N), 하늘색(OFF)',
    theme: DEFAULT_SHIFT_COLORS,
  },
  {
    id: 'classic_hospital',
    name: '병원 클래식',
    desc: '전통적인 진한 로즈(D), 딥그린(N), 라이트슬레이트(OFF)',
    theme: {
      DAY: { bg: '#E11D48', text: '#FFFFFF', border: '#BE123C', label: '데이' },
      NIGHT: { bg: '#166534', text: '#FFFFFF', border: '#14532D', label: '나이트' },
      OFF: { bg: '#64748B', text: '#FFFFFF', border: '#475569', label: '오프' },
      EVENING: { bg: '#D97706', text: '#FFFFFF', border: '#B45309', label: '이브닝' },
    },
  },
  {
    id: 'vivid_pop',
    name: '비비드 팝',
    desc: '선명하고 눈에 띄는 마젠타(D), 라임(N), 시안(OFF)',
    theme: {
      DAY: { bg: '#FF4081', text: '#FFFFFF', border: '#F50057', label: '데이' },
      NIGHT: { bg: '#00E676', text: '#FFFFFF', border: '#00C853', label: '나이트' },
      OFF: { bg: '#00B0FF', text: '#FFFFFF', border: '#0091EA', label: '오프' },
      EVENING: { bg: '#FF9100', text: '#FFFFFF', border: '#FF6D00', label: '이브닝' },
    },
  },
  {
    id: 'calm_soft',
    name: '차분한 뮤티드',
    desc: '눈의 피로를 덜어주는 부드러운 톤다운 색상',
    theme: {
      DAY: { bg: '#D8829D', text: '#FFFFFF', border: '#C76F8B', label: '데이' },
      NIGHT: { bg: '#7BAE7F', text: '#FFFFFF', border: '#689B6C', label: '나이트' },
      OFF: { bg: '#76A9C5', text: '#FFFFFF', border: '#6093AF', label: '오프' },
      EVENING: { bg: '#E09F67', text: '#FFFFFF', border: '#CC8A51', label: '이브닝' },
    },
  },
];

interface ShiftColorContextType {
  colors: ShiftColorTheme;
  updateShiftColor: (code: keyof ShiftColorTheme, config: Partial<ShiftColorConfig>) => void;
  applyPreset: (presetId: string) => void;
  resetToDefault: () => void;
  isModalOpen: boolean;
  openColorModal: () => void;
  closeColorModal: () => void;
}

const STORAGE_KEY = 'nurse_shift_color_theme';

const ShiftColorContext = createContext<ShiftColorContextType | undefined>(undefined);

export const ShiftColorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colors, setColors] = useState<ShiftColorTheme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SHIFT_COLORS,
          ...parsed,
        };
      }
    } catch (e) {
      console.warn('Failed to parse saved shift colors:', e);
    }
    return DEFAULT_SHIFT_COLORS;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  // CSS 변수 동기화
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--shift-day-bg', colors.DAY.bg);
    root.style.setProperty('--shift-day-text', colors.DAY.text);
    root.style.setProperty('--shift-night-bg', colors.NIGHT.bg);
    root.style.setProperty('--shift-night-text', colors.NIGHT.text);
    root.style.setProperty('--shift-off-bg', colors.OFF.bg);
    root.style.setProperty('--shift-off-text', colors.OFF.text);
    root.style.setProperty('--shift-evening-bg', colors.EVENING.bg);
    root.style.setProperty('--shift-evening-text', colors.EVENING.text);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
    } catch (e) {
      console.warn('Failed to save shift colors:', e);
    }
  }, [colors]);

  const updateShiftColor = useCallback((code: keyof ShiftColorTheme, config: Partial<ShiftColorConfig>) => {
    setColors((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        ...config,
      },
    }));
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const found = SHIFT_COLOR_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setColors(found.theme);
    }
  }, []);

  const resetToDefault = useCallback(() => {
    setColors(DEFAULT_SHIFT_COLORS);
  }, []);

  const openColorModal = useCallback(() => setIsModalOpen(true), []);
  const closeColorModal = useCallback(() => setIsModalOpen(false), []);

  return (
    <ShiftColorContext.Provider
      value={{
        colors,
        updateShiftColor,
        applyPreset,
        resetToDefault,
        isModalOpen,
        openColorModal,
        closeColorModal,
      }}
    >
      {children}
    </ShiftColorContext.Provider>
  );
};

export const useShiftColors = () => {
  const ctx = useContext(ShiftColorContext);
  if (!ctx) {
    // Context 외부 폴백
    return {
      colors: DEFAULT_SHIFT_COLORS,
      updateShiftColor: () => {},
      applyPreset: () => {},
      resetToDefault: () => {},
      isModalOpen: false,
      openColorModal: () => {},
      closeColorModal: () => {},
    };
  }
  return ctx;
};
