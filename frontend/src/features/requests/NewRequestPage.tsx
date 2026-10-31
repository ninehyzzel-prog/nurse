import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { TimeOffType } from '../../types';
import { Check, Info } from 'lucide-react';

export const NewRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDate = searchParams.get('date');

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
    }, 800);
  };

  return (
    <div className="new-req-view">
      <div className="page-head">
        <div>
          <h2 className="page-title">오프 / 휴가 신청</h2>
          <span className="deadline-text">11월 15일 24:00 마감</span>
        </div>
      </div>

      {/* Date Picker Section */}
      <div className="form-section">
        <div className="section-label-row">
          <span className="section-title">희망 일자 선택 (다중 선택)</span>
          <span className="selected-count font-mono">선택: {selectedDates.length}일</span>
        </div>

        <div className="mini-calendar">
          <div className="cal-dow-row">
            {['일', '월', '화', '수', '목', '금', '토'].map((dow, idx) => (
              <div key={dow} className={`dow-label ${idx === 0 ? 'sun' : idx === 6 ? 'sat' : ''}`}>
                {dow}
              </div>
            ))}
          </div>

          <div className="cal-days-grid">
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
                  className={`date-cell-btn ${isSelected ? 'is-selected' : ''} ${isWeekend ? 'is-weekend' : ''}`}
                  onClick={() => toggleDate(dateStr)}
                >
                  <span className="d-num font-mono">{day}</span>
                  {isSelected && <Check size={11} strokeWidth={3} className="check-mark" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Type & Reason Form Section */}
      <form onSubmit={handleSubmit} className="form-section">
        <span className="section-title">신청 유형 선택</span>

        <div className="type-options-stack">
          <label className={`type-box ${requestType === 'PREFERENCE_OFF' ? 'is-active' : ''}`}>
            <input
              type="radio"
              name="type"
              checked={requestType === 'PREFERENCE_OFF'}
              onChange={() => setRequestType('PREFERENCE_OFF')}
            />
            <div className="type-info">
              <span className="type-name">일반 희망 OFF</span>
              <span className="type-hint">편성 시 경합 점수(QA-SCORE-02)에 따라 우선순위가 반영됩니다.</span>
            </div>
          </label>

          <label className={`type-box ${requestType === 'ANNUAL_LEAVE' ? 'is-active' : ''}`}>
            <input
              type="radio"
              name="type"
              checked={requestType === 'ANNUAL_LEAVE'}
              onChange={() => setRequestType('ANNUAL_LEAVE')}
            />
            <div className="type-info">
              <span className="type-name">법정 연차 휴가</span>
              <span className="type-hint">권리 보장 휴가로 점수 경합 대상이 아니며 결손 점수가 발생하지 않습니다.</span>
            </div>
          </label>

          <label className={`type-box ${requestType === 'PROTECTED_LEAVE' ? 'is-active' : ''}`}>
            <input
              type="radio"
              name="type"
              checked={requestType === 'PROTECTED_LEAVE'}
              onChange={() => setRequestType('PROTECTED_LEAVE')}
            />
            <div className="type-info">
              <span className="type-name">모성보호 / 법정보호 휴가</span>
              <span className="type-hint">법령에 의해 보호되며, 상세 사유는 수집되지 않습니다.</span>
            </div>
          </label>
        </div>

        {requestType === 'PREFERENCE_OFF' && (
          <div className="important-toggle-strip">
            <label className="checkbox-control">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
              />
              <span className="cb-label">중요 희망 오프로 지정 (+10점 가산)</span>
            </label>
            <span className="cb-desc">
              <Info size={12} /> 연 3회 한도이며 꼭 필요한 사정이 있을 때 가산됩니다.
            </span>
          </div>
        )}

        <div className="reason-field">
          <label className="field-label">신청 사유 (선택 입력)</label>
          <textarea
            rows={2}
            placeholder="수간호사 및 팀장 참고용 메모를 남겨주세요."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-input"
          />
        </div>

        <button
          type="submit"
          className="btn-submit"
          disabled={selectedDates.length === 0 || submitted}
        >
          {submitted ? '신청서 제출 완료...' : `선택한 ${selectedDates.length}일 신청서 제출`}
        </button>
      </form>

      <style>{`
        .new-req-view {
          display: flex;
          flex-direction: column;
          padding: var(--space-3);
          gap: var(--space-3);
        }

        .page-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 2px;
        }
        .page-title {
          font-size: var(--text-md);
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }
        .deadline-text {
          font-size: 11px;
          color: var(--color-text-muted);
        }

        /* Form Section */
        .form-section {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-2-5);
        }
        .section-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .section-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .selected-count {
          font-size: 11px;
          font-weight: 600;
          color: #2563EB;
        }

        /* Mini Calendar */
        .mini-calendar {
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-xs);
          overflow: hidden;
        }
        .cal-dow-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background-color: var(--color-bg-subtle);
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .dow-label {
          text-align: center;
          padding: 4px 0;
          font-size: 10px;
          font-weight: 600;
          color: var(--color-text-muted);
        }
        .dow-label.sun { color: #DC2626; }
        .dow-label.sat { color: #2563EB; }

        .cal-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
        }
        .date-cell-btn {
          min-height: 40px;
          border-right: 1px solid var(--color-border-subtle);
          border-bottom: 1px solid var(--color-border-subtle);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
          background: none;
          cursor: pointer;
          transition: background-color 0.1s;
        }
        .date-cell-btn:hover {
          background-color: #FAFAFA;
        }
        .date-cell-btn.is-selected {
          background-color: #0F172A;
          color: #FFFFFF;
        }
        .date-cell-btn.is-weekend:not(.is-selected) {
          background-color: #FCFDFE;
        }
        .d-num {
          font-size: 12px;
          font-weight: 600;
        }
        .check-mark {
          color: #FFFFFF;
        }
        .font-mono {
          font-feature-settings: "tnum";
        }

        /* Type Stack */
        .type-options-stack {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .type-box {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px var(--space-2-5);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: border-color 0.1s, background-color 0.1s;
        }
        .type-box.is-active {
          border-color: #2563EB;
          background-color: #F8FAFC;
        }
        .type-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .type-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .type-hint {
          font-size: 11px;
          color: var(--color-text-muted);
          line-height: 1.3;
        }

        /* Important Strip */
        .important-toggle-strip {
          padding: 8px var(--space-2-5);
          background-color: #FFFBEB;
          border: 1px solid #FDE68A;
          border-radius: var(--radius-xs);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .checkbox-control {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #92400E;
          cursor: pointer;
        }
        .cb-desc {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: #B45309;
        }

        /* Reason Field */
        .reason-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .field-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        .text-input {
          padding: 6px 8px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: 12px;
          resize: none;
        }
        .text-input:focus {
          border-color: #2563EB;
          outline: none;
        }

        .btn-submit {
          height: 38px;
          background-color: var(--color-primary);
          color: var(--color-primary-text);
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 600;
          transition: background-color 0.12s;
        }
        .btn-submit:hover:not(:disabled) {
          background-color: var(--color-primary-hover);
        }
        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
