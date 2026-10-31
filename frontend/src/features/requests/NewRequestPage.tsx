import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { TimeOffType } from '../../types';
import { Check, AlertCircle, Info, Send } from 'lucide-react';

export const NewRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDate = searchParams.get('date');

  // 다중 날짜 선택 상태
  const [selectedDates, setSelectedDates] = useState<string[]>(
    initialDate ? [initialDate] : []
  );
  const [requestType, setRequestType] = useState<TimeOffType>('PREFERENCE_OFF');
  const [isImportant, setIsImportant] = useState(false);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const daysInMonth = 30; // 2026-11
  const startDayOfWeek = 0;

  const toggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter((d) => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDates.length === 0) return;
    setSubmitted(true);
    setTimeout(() => {
      navigate('/me/requests');
    }, 1200);
  };

  return (
    <div className="new-req-container">
      <div className="page-header">
        <h2 className="title">오프 / 휴가 신청</h2>
        <span className="deadline-badge">11월 15일 24:00 마감</span>
      </div>

      <div className="step-card">
        <div className="step-title">
          <span className="step-num">1</span>
          <h3>날짜를 선택하세요 (다중 선택 가능)</h3>
        </div>
        <p className="step-desc">원하시는 날짜를 터치하여 선택하거나 해제할 수 있습니다.</p>

        {/* 미니 캘린더 */}
        <div className="req-calendar">
          {['일', '월', '화', '수', '목', '금', '토'].map((dow, idx) => (
            <div key={dow} className={`dow ${idx === 0 ? 'sun' : idx === 6 ? 'sat' : ''}`}>
              {dow}
            </div>
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
            const isSelected = selectedDates.includes(dateStr);
            const dow = (startDayOfWeek + i) % 7;
            const isWeekend = dow === 0 || dow === 6;

            return (
              <button
                type="button"
                key={day}
                className={`date-btn ${isSelected ? 'selected' : ''} ${isWeekend ? 'weekend' : ''}`}
                onClick={() => toggleDate(dateStr)}
              >
                <span className="d-num">{day}</span>
                {isSelected && <Check size={14} className="check-icon" />}
              </button>
            );
          })}
        </div>

        <div className="selected-summary">
          선택된 일자: <strong>{selectedDates.length}일</strong>
          {selectedDates.length > 0 && ` (${selectedDates.map((d) => d.split('-')[2] + '일').join(', ')})`}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="step-card">
        <div className="step-title">
          <span className="step-num">2</span>
          <h3>신청 유형 및 사유</h3>
        </div>

        <div className="type-selector">
          <label className={`type-option ${requestType === 'PREFERENCE_OFF' ? 'active' : ''}`}>
            <input
              type="radio"
              name="type"
              checked={requestType === 'PREFERENCE_OFF'}
              onChange={() => setRequestType('PREFERENCE_OFF')}
            />
            <div className="opt-content">
              <strong>일반 희망 OFF</strong>
              <span>스케줄 편성 시 경합 점수에 따라 우선순위가 반영됩니다.</span>
            </div>
          </label>

          <label className={`type-option ${requestType === 'ANNUAL_LEAVE' ? 'active' : ''}`}>
            <input
              type="radio"
              name="type"
              checked={requestType === 'ANNUAL_LEAVE'}
              onChange={() => setRequestType('ANNUAL_LEAVE')}
            />
            <div className="opt-content">
              <strong>법정 연차 휴가</strong>
              <span>권리 보장 휴가로, 점수 경합 대상이 아니며 벌점이 부과되지 않습니다.</span>
            </div>
          </label>

          <label className={`type-option ${requestType === 'PROTECTED_LEAVE' ? 'active' : ''}`}>
            <input
              type="radio"
              name="type"
              checked={requestType === 'PROTECTED_LEAVE'}
              onChange={() => setRequestType('PROTECTED_LEAVE')}
            />
            <div className="opt-content">
              <strong>모성보호 / 법정보호 휴가</strong>
              <span>법령에 의해 보호되며, 상세 사유는 수집되지 않습니다.</span>
            </div>
          </label>
        </div>

        {requestType === 'PREFERENCE_OFF' && (
          <div className="important-box">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
              />
              <span className="chk-label">중요 희망으로 지정 (+10점 가산)</span>
            </label>
            <p className="chk-hint">
              <Info size={14} /> 월 최대 1회만 지정 가능하며, 꼭 필요한 사정이 있을 때 사용하세요.
            </p>
          </div>
        )}

        <div className="form-group">
          <label className="input-label">신청 사유 (선택 사항)</label>
          <input
            type="text"
            className="text-input"
            placeholder="사유를 입력하지 않아도 신청 가능합니다."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <span className="privacy-note">
            <AlertCircle size={12} /> 동료 간호사에게는 사유가 일체 공개되지 않습니다.
          </span>
        </div>

        <div className="sticky-footer">
          <button
            type="submit"
            className="submit-cta"
            disabled={selectedDates.length === 0 || submitted}
          >
            <Send size={18} />
            <span>{submitted ? '접수 완료! 이동 중...' : `${selectedDates.length}일 오프 신청 접수하기`}</span>
          </button>
        </div>
      </form>

      <style>{`
        .new-req-container {
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .title {
          font-size: var(--font-size-lg);
          font-weight: 700;
        }
        .deadline-badge {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-danger);
          background-color: var(--color-danger-bg);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }
        .step-card {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          box-shadow: var(--shadow-sm);
        }
        .step-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: 4px;
        }
        .step-num {
          width: 22px;
          height: 22px;
          border-radius: var(--radius-full);
          background-color: var(--color-brand-primary);
          color: white;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .step-title h3 {
          font-size: var(--font-size-base);
          font-weight: 700;
        }
        .step-desc {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
          margin-bottom: var(--space-3);
        }
        .req-calendar {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: var(--space-3);
        }
        .dow {
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          color: var(--color-text-secondary);
          padding: 4px 0;
        }
        .dow.sun { color: var(--color-danger); }
        .dow.sat { color: var(--color-brand-primary); }
        .date-btn {
          min-height: 44px;
          background-color: var(--color-bg-muted);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          cursor: pointer;
          transition: background-color 0.1s, border-color 0.1s;
        }
        .date-btn.weekend {
          background-color: #F8FAFC;
        }
        .date-btn.selected {
          background-color: var(--color-brand-light);
          border-color: var(--color-brand-primary);
          color: var(--color-brand-primary);
          font-weight: 700;
        }
        .check-icon {
          color: var(--color-brand-primary);
        }
        .selected-summary {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
          padding-top: var(--space-2);
          border-top: 1px dashed var(--color-border);
        }
        .type-selector {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          margin-bottom: var(--space-4);
        }
        .type-option {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          padding: var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
        }
        .type-option.active {
          border-color: var(--color-brand-primary);
          background-color: var(--color-brand-light);
        }
        .opt-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .opt-content strong {
          font-size: var(--font-size-sm);
        }
        .opt-content span {
          font-size: 11px;
          color: var(--color-text-secondary);
        }
        .important-box {
          background-color: var(--color-warning-bg);
          border: 1px solid #FDE68A;
          border-radius: var(--radius-md);
          padding: var(--space-3);
          margin-bottom: var(--space-4);
        }
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          cursor: pointer;
        }
        .chk-label {
          font-size: var(--font-size-sm);
          font-weight: 700;
          color: var(--color-warning);
        }
        .chk-hint {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #92400E;
          margin-top: 4px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          margin-bottom: var(--space-4);
        }
        .input-label {
          font-size: var(--font-size-xs);
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        .text-input {
          padding: 10px 12px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-sm);
        }
        .privacy-note {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--color-text-muted);
        }
        .sticky-footer {
          margin-top: var(--space-4);
        }
        .submit-cta {
          width: 100%;
          min-height: var(--min-touch-target);
          background-color: var(--color-brand-primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 700;
          font-size: var(--font-size-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          cursor: pointer;
        }
        .submit-cta:disabled {
          background-color: var(--color-border);
          color: var(--color-text-muted);
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
