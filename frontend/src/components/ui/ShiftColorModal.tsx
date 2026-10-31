import React, { useState } from 'react';
import { useShiftColors, SHIFT_COLOR_PRESETS, type ShiftColorTheme } from '../../context/ShiftColorContext';
import { X, Check, RotateCcw, Palette, Sparkles } from 'lucide-react';

const QUICK_SWATCHES = [
  '#EC8FBE', '#F472B6', '#E11D48', '#FF4081',
  '#95D66C', '#84CC16', '#10B981', '#059669',
  '#5DC3EB', '#38BDF8', '#0EA5E9', '#2563EB',
  '#FFA352', '#FB923C', '#F59E0B', '#64748B',
];

export const ShiftColorModal: React.FC = () => {
  const { colors, updateShiftColor, applyPreset, resetToDefault, isModalOpen, closeColorModal } = useShiftColors();
  const [activeTab, setActiveTab] = useState<'PALETTE' | 'PRESET'>('PALETTE');

  if (!isModalOpen) return null;

  const shifts: Array<{ key: keyof ShiftColorTheme; code: string; label: string; desc: string }> = [
    { key: 'DAY', code: 'D', label: '데이 (DAY)', desc: '주간 정규 근무 (08:00 - 18:00)' },
    { key: 'NIGHT', code: 'N', label: '나이트 (NIGHT)', desc: '야간 교대 근무 (18:00 - 익일 08:00)' },
    { key: 'OFF', code: 'OFF', label: '오프 (OFF)', desc: '휴무 및 비번일' },
  ];

  return (
    <div className="shift-color-modal-backdrop" onClick={closeColorModal}>
      <div className="shift-color-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div className="modal-header">
          <div className="header-title-wrap">
            <div className="icon-badge">
              <Palette size={16} />
            </div>
            <div>
              <h3 className="modal-title">근무 배지 색상 관리</h3>
              <p className="modal-subtitle">데이, 나이트, 오프 배지 색상을 원하는 컬러로 커스텀 설정합니다.</p>
            </div>
          </div>
          <button className="close-btn" onClick={closeColorModal} aria-label="닫기">
            <X size={16} />
          </button>
        </div>

        {/* 상단 실시간 미니 캘린더 미리보기 */}
        <div className="color-preview-banner">
          <span className="preview-label">
            <Sparkles size={12} style={{ marginRight: '4px' }} /> 실시간 캘린더 미리보기
          </span>
          <div className="mini-cal-strip">
            <div className="mini-cal-cell">
              <span className="mini-date">1 (목)</span>
              <div 
                className="mini-shift-badge" 
                style={{ backgroundColor: colors.OFF.bg, color: colors.OFF.text }}
              >
                OFF
              </div>
            </div>
            <div className="mini-cal-cell">
              <span className="mini-date">2 (금)</span>
              <div 
                className="mini-shift-badge" 
                style={{ backgroundColor: colors.DAY.bg, color: colors.DAY.text }}
              >
                D
              </div>
            </div>
            <div className="mini-cal-cell">
              <span className="mini-date">3 (토)</span>
              <div 
                className="mini-shift-badge" 
                style={{ backgroundColor: colors.DAY.bg, color: colors.DAY.text }}
              >
                D
              </div>
            </div>
            <div className="mini-cal-cell">
              <span className="mini-date">4 (일)</span>
              <div 
                className="mini-shift-badge" 
                style={{ backgroundColor: colors.NIGHT.bg, color: colors.NIGHT.text }}
              >
                N
              </div>
            </div>
            <div className="mini-cal-cell">
              <span className="mini-date">5 (월)</span>
              <div 
                className="mini-shift-badge" 
                style={{ backgroundColor: colors.OFF.bg, color: colors.OFF.text }}
              >
                OFF
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="modal-tab-row">
          <button 
            className={`tab-btn ${activeTab === 'PALETTE' ? 'active' : ''}`}
            onClick={() => setActiveTab('PALETTE')}
          >
            개별 색상 커스텀
          </button>
          <button 
            className={`tab-btn ${activeTab === 'PRESET' ? 'active' : ''}`}
            onClick={() => setActiveTab('PRESET')}
          >
            추천 테마 프리셋
          </button>
        </div>

        {/* 탭 1: 개별 색상 피커 */}
        {activeTab === 'PALETTE' && (
          <div className="color-config-list">
            {shifts.map(({ key, code, label, desc }) => {
              const current = colors[key];
              return (
                <div key={key} className="shift-color-card">
                  <div className="card-left">
                    <div 
                      className="live-sample-badge"
                      style={{ backgroundColor: current.bg, color: current.text }}
                    >
                      {code}
                    </div>
                    <div className="shift-info">
                      <span className="shift-label">{label}</span>
                      <span className="shift-desc">{desc}</span>
                    </div>
                  </div>

                  <div className="card-right">
                    {/* 컬러 피커 & HEX */}
                    <div className="picker-group">
                      <label className="picker-label">배경색</label>
                      <div className="input-wrap">
                        <input
                          type="color"
                          className="native-color-picker"
                          value={current.bg}
                          onChange={(e) => updateShiftColor(key, { bg: e.target.value })}
                        />
                        <input
                          type="text"
                          className="hex-input font-mono"
                          value={current.bg}
                          onChange={(e) => updateShiftColor(key, { bg: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* 글자색 토글 (흰색 / 검은색) */}
                    <div className="picker-group">
                      <label className="picker-label">글자색</label>
                      <div className="text-color-toggle">
                        <button
                          type="button"
                          className={`txt-btn white ${current.text.toLowerCase() === '#ffffff' ? 'selected' : ''}`}
                          onClick={() => updateShiftColor(key, { text: '#FFFFFF' })}
                          title="흰색 글자"
                        >
                          가
                        </button>
                        <button
                          type="button"
                          className={`txt-btn dark ${current.text.toLowerCase() !== '#ffffff' ? 'selected' : ''}`}
                          onClick={() => updateShiftColor(key, { text: '#1E293B' })}
                          title="어두운 글자"
                        >
                          가
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 퀵 스와치 팔레트 */}
                  <div className="swatch-strip">
                    <span className="swatch-label">추천 컬러:</span>
                    <div className="swatch-items">
                      {QUICK_SWATCHES.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          className={`swatch-dot ${current.bg.toUpperCase() === hex.toUpperCase() ? 'active' : ''}`}
                          style={{ backgroundColor: hex }}
                          onClick={() => updateShiftColor(key, { bg: hex })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 탭 2: 추천 테마 프리셋 */}
        {activeTab === 'PRESET' && (
          <div className="presets-grid">
            {SHIFT_COLOR_PRESETS.map((preset) => {
              const isCurrent = 
                colors.DAY.bg.toUpperCase() === preset.theme.DAY.bg.toUpperCase() &&
                colors.NIGHT.bg.toUpperCase() === preset.theme.NIGHT.bg.toUpperCase() &&
                colors.OFF.bg.toUpperCase() === preset.theme.OFF.bg.toUpperCase();

              return (
                <div 
                  key={preset.id} 
                  className={`preset-card ${isCurrent ? 'active' : ''}`}
                  onClick={() => applyPreset(preset.id)}
                >
                  <div className="preset-head">
                    <span className="preset-name">{preset.name}</span>
                    {isCurrent && <span className="preset-badge"><Check size={11} /> 적용됨</span>}
                  </div>
                  <p className="preset-desc">{preset.desc}</p>
                  <div className="preset-preview-pills">
                    <span className="pill" style={{ backgroundColor: preset.theme.DAY.bg, color: preset.theme.DAY.text }}>D 데이</span>
                    <span className="pill" style={{ backgroundColor: preset.theme.NIGHT.bg, color: preset.theme.NIGHT.text }}>N 나이트</span>
                    <span className="pill" style={{ backgroundColor: preset.theme.OFF.bg, color: preset.theme.OFF.text }}>OFF 오프</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 모달 푸터 */}
        <div className="modal-footer">
          <button type="button" className="btn-reset" onClick={resetToDefault}>
            <RotateCcw size={12} style={{ marginRight: '4px' }} />
            기본 색상 복원
          </button>
          <div className="footer-right">
            <button type="button" className="btn-confirm" onClick={closeColorModal}>
              설정 완료 및 적용
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .shift-color-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.15s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .shift-color-modal-content {
          width: 540px;
          max-width: 92vw;
          max-height: 88vh;
          background-color: #FFFFFF;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: scaleUp 0.15s ease-out;
        }
        @keyframes scaleUp {
          from { transform: scale(0.97); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #EFEFEF;
        }
        .header-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .icon-badge {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background-color: #FFF1F2;
          color: #E11D48;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-title {
          font-size: 15px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
        }
        .modal-subtitle {
          font-size: 12px;
          color: #64748B;
          margin: 2px 0 0 0;
        }
        .close-btn {
          background: none;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          padding: 4px;
          border-radius: 5px;
        }
        .close-btn:hover {
          color: #0F172A;
          background-color: #F1F5F9;
        }

        /* 캘린더 미리보기 배너 */
        .color-preview-banner {
          background-color: #F8FAFC;
          border-bottom: 1px solid #E2E8F0;
          padding: 12px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .preview-label {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          display: flex;
          align-items: center;
        }
        .mini-cal-strip {
          display: flex;
          gap: 10px;
        }
        .mini-cal-cell {
          flex: 1;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .mini-date {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }
        .mini-shift-badge {
          width: 100%;
          text-align: center;
          padding: 3px 0;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
          letter-spacing: 0.02em;
        }

        /* 탭 */
        .modal-tab-row {
          display: flex;
          padding: 8px 20px 0 20px;
          border-bottom: 1px solid #EFEFEF;
          gap: 8px;
        }
        .tab-btn {
          border: none;
          background: none;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
          cursor: pointer;
          border-bottom: 2px solid transparent;
        }
        .tab-btn.active {
          color: #0F172A;
          border-bottom-color: #0F172A;
        }

        /* 개별 리스트 */
        .color-config-list {
          padding: 16px 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 400px;
        }
        .shift-color-card {
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 12px;
          background-color: #FFFFFF;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .card-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .live-sample-badge {
          width: 44px;
          height: 28px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        .shift-info {
          display: flex;
          flex-direction: column;
        }
        .shift-label {
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
        }
        .shift-desc {
          font-size: 12px;
          color: #64748B;
        }

        .card-right {
          display: flex;
          align-items: center;
          gap: 16px;
          padding-top: 6px;
          border-top: 1px solid #F1F5F9;
        }
        .picker-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .picker-label {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }
        .input-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: #F8FAFC;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          padding: 2px 6px;
        }
        .native-color-picker {
          width: 22px;
          height: 22px;
          border: none;
          background: none;
          cursor: pointer;
          padding: 0;
        }
        .hex-input {
          width: 72px;
          border: none;
          background: none;
          font-size: 12px;
          font-weight: 600;
          color: #0F172A;
          outline: none;
        }

        .text-color-toggle {
          display: flex;
          background-color: #F1F5F9;
          border-radius: 5px;
          padding: 2px;
          gap: 2px;
        }
        .txt-btn {
          border: none;
          padding: 2px 8px;
          font-size: 12px;
          font-weight: 700;
          border-radius: 4px;
          cursor: pointer;
        }
        .txt-btn.white { background: #FFFFFF; color: #0F172A; }
        .txt-btn.dark { background: #1E293B; color: #FFFFFF; }
        .txt-btn.selected {
          box-shadow: 0 0 0 2px #0F172A;
        }

        /* 퀵 스와치 */
        .swatch-strip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-top: 4px;
        }
        .swatch-label {
          font-size: 12px;
          color: #94A3B8;
        }
        .swatch-items {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .swatch-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: transform 0.1s;
        }
        .swatch-dot:hover {
          transform: scale(1.2);
        }
        .swatch-dot.active {
          box-shadow: 0 0 0 2px #0F172A;
        }

        /* 프리셋 그리드 */
        .presets-grid {
          padding: 16px 20px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          overflow-y: auto;
          max-height: 400px;
        }
        .preset-card {
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 12px;
          cursor: pointer;
          background-color: #FFFFFF;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: all 0.12s;
        }
        .preset-card:hover {
          border-color: #94A3B8;
          background-color: #F8FAFC;
        }
        .preset-card.active {
          border-color: #0F172A;
          background-color: #F8FAFC;
          box-shadow: 0 0 0 1px #0F172A;
        }
        .preset-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .preset-name {
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
        }
        .preset-badge {
          font-size: 12px;
          font-weight: 600;
          color: #059669;
          background-color: #ECFDF5;
          padding: 1px 5px;
          border-radius: 3px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .preset-desc {
          font-size: 12px;
          color: #64748B;
          margin: 0;
          line-height: 1.3;
        }
        .preset-preview-pills {
          display: flex;
          gap: 6px;
        }
        .preset-preview-pills .pill {
          font-size: 12px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 9999px;
        }

        /* 푸터 */
        .modal-footer {
          padding: 12px 20px;
          border-top: 1px solid #EFEFEF;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #FAFAFA;
        }
        .btn-reset {
          background: none;
          border: 1px solid #CBD5E1;
          color: #475569;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
        }
        .btn-reset:hover {
          background-color: #F1F5F9;
          color: #0F172A;
        }
        .btn-confirm {
          background-color: #0F172A;
          color: #FFFFFF;
          border: none;
          padding: 7px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-confirm:hover {
          background-color: #1E293B;
        }
      `}</style>
    </div>
  );
};
