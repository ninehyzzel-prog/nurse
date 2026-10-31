import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import type { TimeOffType } from '../../types';
import { Check } from 'lucide-react';
import { TossIcon } from '../../components/ui/TossIcon';

export const NewRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDate = searchParams.get('date');

  const [selectedDates, setSelectedDates] = useState<string[]>(
    initialDate ? [initialDate] : ['2026-11-10', '2026-11-11']
  );
  const [requestType, setRequestType] = useState<TimeOffType>('PREFERENCE_OFF');
  const [isImportant, setIsImportant] = useState(false);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const daysInMonth = 30; // 2026년 11월
  const startDayOfWeek = 0; // 일요일 시작

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
    }, 600);
  };

  return (
    <div className="mobile-request-view">
      {/* 1. 상단 탭 및 기한 안내 바 */}
      <div className="request-top-nav">
        <div className="type-toggle-pill">
          <button className="tab-pill active">새 신청 작성</button>
          <Link to="/me/requests" className="tab-pill link">
            <span>신청 내역</span>
            <span className="count-badge">3</span>
          </Link>
        </div>

        <div className="deadline-banner">
          <TossIcon name="clock" size={13} style={{ marginRight: '4px' }} />
          <span>11월 근무표 신청 마감: <strong>10월 20일 24:00</strong> (D-4)</span>
        </div>
      </div>

      {/* 2. 희망 날짜 선택 (모던 캘린더 피커) */}
      <div className="form-card">
        <div className="card-header-row">
          <div className="ch-left">
            <TossIcon name="calendar" size={15} style={{ marginRight: '6px' }} />
            <span className="ch-title">희망 일자 선택</span>
          </div>
          <span className="selected-tag font-mono">
            {selectedDates.length > 0 ? `${selectedDates.length}일 선택됨` : '날짜를 탭하세요'}
          </span>
        </div>

        <div className="mini-picker-wrap">
          <div className="picker-dow">
            <span className="sun">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span className="sat">토</span>
          </div>
          <div className="picker-grid">
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
              const isSelected = selectedDates.includes(dateStr);
              const dow = (startDayOfWeek + i) % 7;
              const isSun = dow === 0;
              const isSat = dow === 6;

              return (
                <button
                  type="button"
                  key={day}
                  className={`picker-day ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleDate(dateStr)}
                >
                  <span className={`p-num font-mono ${isSun ? 'sun' : isSat ? 'sat' : ''}`}>{day}</span>
                  {isSelected && <span className="p-check"><Check size={8} strokeWidth={3} /></span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 선택된 날짜 태그 리스트 */}
        {selectedDates.length > 0 && (
          <div className="selected-dates-chips">
            {selectedDates.sort().map((d) => (
              <span key={d} className="s-chip">
                11월 {parseInt(d.split('-')[2])}일
                <button type="button" onClick={() => toggleDate(d)}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 3. 신청 유형 선택 (플랫 선택 카드) */}
      <form onSubmit={handleSubmit} className="request-form-body">
        <div className="form-card">
          <div className="card-header-row">
            <span className="ch-title">신청 유형</span>
          </div>

          <div className="type-tiles-group">
            {/* 1. 일반 희망 OFF */}
            <div 
              className={`type-tile ${requestType === 'PREFERENCE_OFF' ? 'selected' : ''}`}
              onClick={() => setRequestType('PREFERENCE_OFF')}
            >
              <div className="tile-radio">
                <span className={`radio-dot ${requestType === 'PREFERENCE_OFF' ? 'on' : ''}`} />
              </div>
              <div className="tile-content">
                <div className="tile-title-row">
                  <span className="tile-name">
                    <TossIcon name="calendar" size={15} style={{ marginRight: '4px' }} />
                    일반 희망 OFF
                  </span>
                  <span className="tile-badge gray">경합 점수 반영</span>
                </div>
                <p className="tile-desc">동일 날짜 신청 경합 시 공정성 점수(최근 주말 근무 등)로 자동 조율됩니다.</p>
              </div>
            </div>

            {/* 2. 법정 연차 휴가 */}
            <div 
              className={`type-tile ${requestType === 'ANNUAL_LEAVE' ? 'selected' : ''}`}
              onClick={() => setRequestType('ANNUAL_LEAVE')}
            >
              <div className="tile-radio">
                <span className={`radio-dot ${requestType === 'ANNUAL_LEAVE' ? 'on' : ''}`} />
              </div>
              <div className="tile-content">
                <div className="tile-title-row">
                  <span className="tile-name">
                    <TossIcon name="umbrella" size={15} style={{ marginRight: '4px' }} />
                    법정 연차 휴가
                  </span>
                  <span className="tile-badge blue">권리 보장</span>
                </div>
                <p className="tile-desc">법정 연차로 우선 배정되며, 잔여 연차(12일)에서 1일 차감됩니다.</p>
              </div>
            </div>

            {/* 3. 모성보호 / 법정보호 */}
            <div 
              className={`type-tile ${requestType === 'PROTECTED_LEAVE' ? 'selected' : ''}`}
              onClick={() => setRequestType('PROTECTED_LEAVE')}
            >
              <div className="tile-radio">
                <span className={`radio-dot ${requestType === 'PROTECTED_LEAVE' ? 'on' : ''}`} />
              </div>
              <div className="tile-content">
                <div className="tile-title-row">
                  <span className="tile-name">
                    <TossIcon name="flower" size={15} style={{ marginRight: '4px' }} />
                    모성 / 법정보호 휴가
                  </span>
                  <span className="tile-badge green">100% 필수 보장</span>
                </div>
                <p className="tile-desc">임신/수유기 간호사 법정 보호 규정으로 솔버에서 최우선 배정됩니다.</p>
              </div>
            </div>
          </div>

          {/* 중요 희망 토글 */}
          <div className="important-toggle-box">
            <label className="toggle-label">
              <input 
                type="checkbox" 
                checked={isImportant} 
                onChange={(e) => setIsImportant(e.target.checked)} 
              />
              <div className="toggle-text">
                <span className="t-main">
                  <TossIcon name="star" size={13} style={{ marginRight: '4px' }} />
                  중요 희망 오프로 지정 (+10점 가산)
                </span>
                <span className="t-sub">연 3회 한도이며, 결혼식·시험 등 불가피한 사정이 있을 때 가산점을 부여합니다.</span>
              </div>
            </label>
          </div>
        </div>

        {/* 4. 사유 입력 */}
        <div className="form-card">
          <div className="card-header-row">
            <span className="ch-title">신청 사유 (선택 입력)</span>
          </div>
          <textarea
            className="reason-input"
            rows={3}
            placeholder="수간호사 및 팀장 참고용 메모를 남겨주세요."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* 5. 제출 버튼 */}
        <div className="form-action-sticky">
          <button 
            type="submit" 
            className="btn-submit-linear"
            disabled={selectedDates.length === 0 || submitted}
          >
            {submitted ? '신청서 등록 중...' : `${selectedDates.length}일 신청서 제출하기`}
          </button>
        </div>
      </form>

      <style>{`
        .mobile-request-view {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px 16px;
          background-color: #FAFAFA;
          min-height: 100%;
        }

        /* 1. 상단 탭 */
        .request-top-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .type-toggle-pill {
          display: flex;
          background-color: #F1F5F9;
          padding: 3px;
          border-radius: 8px;
          gap: 2px;
        }
        .tab-pill {
          flex: 1;
          border: none;
          background: none;
          padding: 7px 0;
          font-size: 12px;
          font-weight: 500;
          color: #64748B;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.12s;
        }
        .tab-pill.active {
          background-color: #FFFFFF;
          color: #0F172A;
          font-weight: 700;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        .count-badge {
          font-size: 12px;
          background-color: #E2E8F0;
          color: #475569;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .deadline-banner {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: #EFF6FF;
          color: #1D4ED8;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
        }

        /* 폼 카드 공통 */
        .form-card {
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .card-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ch-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .icon-slate { color: #64748B; }
        .ch-title {
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
        }
        .selected-tag {
          font-size: 12px;
          font-weight: 600;
          color: #E11D48;
        }

        /* 미니 캘린더 */
        .mini-picker-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .picker-dow {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: #94A3B8;
          padding-bottom: 2px;
        }
        .picker-dow .sun { color: #E11D48; }
        .picker-dow .sat { color: #2563EB; }

        .picker-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        .picker-day {
          height: 36px;
          border: none;
          background: none;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition: background-color 0.1s;
        }
        .picker-day:hover {
          background-color: #F8FAFC;
        }
        .picker-day.selected {
          background-color: #0F172A;
          color: #FFFFFF;
        }
        .p-num {
          font-size: 12px;
          font-weight: 600;
        }
        .picker-day.selected .p-num {
          color: #FFFFFF !important;
        }
        .p-num.sun { color: #E11D48; }
        .p-num.sat { color: #2563EB; }
        .p-check {
          position: absolute;
          bottom: 2px;
          display: flex;
        }

        .selected-dates-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding-top: 6px;
          border-top: 1px solid #F1F5F9;
        }
        .s-chip {
          background-color: #F1F5F9;
          color: #0F172A;
          font-size: 12px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 5px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .s-chip button {
          border: none;
          background: none;
          color: #64748B;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
          padding: 0;
        }

        /* 신청 유형 타일 */
        .request-form-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .type-tiles-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .type-tile {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 10px 12px;
          cursor: pointer;
          transition: all 0.12s;
        }
        .type-tile:hover {
          background-color: #F8FAFC;
        }
        .type-tile.selected {
          border-color: #0F172A;
          background-color: #F8FAFC;
        }
        .tile-radio {
          margin-top: 2px;
        }
        .radio-dot {
          display: inline-block;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1.5px solid #CBD5E1;
          position: relative;
        }
        .radio-dot.on {
          border-color: #0F172A;
          background-color: #0F172A;
        }
        .radio-dot.on::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: #FFFFFF;
        }
        .tile-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .tile-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .tile-name {
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
        }
        .tile-badge {
          font-size: 12px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .tile-badge.gray { background-color: #F1F5F9; color: #475569; }
        .tile-badge.blue { background-color: #EFF6FF; color: #1D4ED8; }
        .tile-badge.green { background-color: #F0FDF4; color: #166534; }
        .tile-desc {
          font-size: 12px;
          color: #64748B;
          margin: 0;
          line-height: 1.3;
        }

        /* 중요 토글 */
        .important-toggle-box {
          border-top: 1px solid #F1F5F9;
          padding-top: 8px;
        }
        .toggle-label {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          cursor: pointer;
        }
        .toggle-label input {
          margin-top: 2px;
          accent-color: #0F172A;
        }
        .toggle-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .t-main {
          font-size: 12px;
          font-weight: 700;
          color: #0F172A;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .star-icon { color: #EAB308; }
        .t-sub {
          font-size: 12px;
          color: #64748B;
          line-height: 1.3;
        }

        /* 사유 인풋 */
        .reason-input {
          width: 100%;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 12px;
          color: #0F172A;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
        }
        .reason-input:focus {
          border-color: #0F172A;
        }

        /* 제출 버튼 */
        .form-action-sticky {
          margin-top: 4px;
        }
        .btn-submit-linear {
          width: 100%;
          background-color: #0F172A;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 12px 0;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 0.12s;
        }
        .btn-submit-linear:hover {
          background-color: #1E293B;
        }
        .btn-submit-linear:disabled {
          background-color: #CBD5E1;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
