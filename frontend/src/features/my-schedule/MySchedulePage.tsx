import React, { useState } from 'react';
import { MOCK_SHIFT_TEMPLATES } from '../../data/mockData';
import { ShiftCell } from '../../components/ui/ShiftCell';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  ShieldCheck, 
  ArrowRight,
  Clock,
  Sparkles,
  HeartHandshake
} from 'lucide-react';

export const MySchedulePage: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<number>(24); // 10월 24일 기본 선택

  const daysInMonth = 31;
  const startDayOfWeek = 4; // 목요일 시작

  const templateMap = new Map(MOCK_SHIFT_TEMPLATES.map((t) => [t.id, t]));

  // 10월 표준 배정 맵 (D: 8, N: 8, OFF: 10)
  const OCT_REF_SHIFTS: Record<number, string> = {
    1: 'shift-off', 2: 'shift-day', 3: 'shift-day', 4: 'shift-night', 5: 'shift-off',
    6: 'shift-day', 7: 'shift-day', 8: 'shift-night', 9: 'shift-night', 10: 'shift-off',
    11: 'shift-off', 12: 'shift-day', 13: 'shift-night', 14: 'shift-off', 15: 'shift-day',
    16: 'shift-day', 17: 'shift-off', 18: 'shift-off', 19: 'shift-night', 20: 'shift-day',
    21: 'shift-off', 22: 'shift-day', 23: 'shift-night', 24: 'shift-night', 25: 'shift-off',
    26: 'shift-day', 27: 'shift-day', 28: 'shift-day', 29: 'shift-off', 30: 'shift-night', 31: 'shift-night'
  };

  const selectedTmplId = OCT_REF_SHIFTS[selectedDay] || 'shift-off';
  const selectedTemplate = templateMap.get(selectedTmplId);

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const dowNames = ['일', '월', '화', '수', '목', '금', '토'];
  const selectedDow = dowNames[(selectedDay + startDayOfWeek - 1) % 7];

  return (
    <div className="mobile-my-schedule">
      {/* 1. 상단 월 탐색 및 요약 칩 */}
      <div className="month-header-strip">
        <div className="month-nav">
          <h2 className="month-text">2026년 10월</h2>
          <div className="month-arrows">
            <button className="arrow-btn" aria-label="이전 달"><ChevronLeft size={16} /></button>
            <button className="arrow-btn" aria-label="다음 달"><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* 미니멀 통계 칩스 */}
        <div className="summary-chips-row">
          <span className="sum-chip d">D <strong>8</strong></span>
          <span className="sum-chip n">N <strong>8</strong></span>
          <span className="sum-chip off">OFF <strong>10</strong></span>
          <span className="sum-chip rest" title="근무 간 11시간 휴식 준수">
            <ShieldCheck size={11} /> 100% 보장
          </span>
        </div>
      </div>

      {/* 2. 캘린더 그리드 (카드 감옥 제거, 플랫 보더) */}
      <div className="mobile-calendar-container">
        <div className="cal-dow-header">
          <span className="dow sun">일</span>
          <span className="dow">월</span>
          <span className="dow">화</span>
          <span className="dow">수</span>
          <span className="dow">목</span>
          <span className="dow">금</span>
          <span className="dow sat">토</span>
        </div>

        <div className="cal-days-grid">
          {/* 빈 셀 4칸 */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="cal-cell empty" />
          ))}

          {/* 1일 ~ 31일 */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const tmplId = OCT_REF_SHIFTS[day] || 'shift-off';
            const tmpl = templateMap.get(tmplId);
            const dow = (day + startDayOfWeek - 1) % 7;
            const isSun = dow === 0;
            const isSat = dow === 6;
            const isSelected = selectedDay === day;

            return (
              <div
                key={day}
                className={`cal-cell ${isSelected ? 'is-selected' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                <span className={`day-number font-mono ${isSun ? 'sun' : isSat ? 'sat' : ''}`}>
                  {day}
                </span>

                <div className="shift-badge-wrap">
                  <ShiftCell template={tmpl} isCompact />
                </div>

                {/* 특이사항 닷 인디케이터 */}
                {day === 3 && <span className="cell-dot pink" />}
                {day === 21 && <span className="cell-dot blue" />}
                {day === 31 && <span className="cell-dot green" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 선택된 날짜의 상세 근무 카드 (Linear/iOS 플랫 카드) */}
      <div className="selected-day-card" onClick={() => setIsSheetOpen(true)}>
        <div className="day-card-top">
          <div className="date-info">
            <span className="full-date font-mono">10월 {selectedDay}일 ({selectedDow})</span>
            {selectedDay === 24 && <span className="today-badge">선택됨</span>}
          </div>
          <button className="detail-arrow-btn">
            <span>상세보기</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="day-shift-main">
          <div className="shift-badge-box">
            <ShiftCell template={selectedTemplate} />
          </div>
          <div className="shift-time-info">
            <span className="time-range font-mono">
              <Clock size={12} />
              {selectedTemplate?.startsAtLocal && selectedTemplate?.endsAtLocal
                ? `${selectedTemplate.startsAtLocal} ~ ${selectedTemplate.endsAtLocal}`
                : '종일 휴무 (OFF)'}
            </span>
            <span className="location-text">산부인과 3병동 (분만실/모아센터)</span>
          </div>
        </div>

        {/* 함께 일하는 팀원 정보 */}
        {selectedTemplate?.code !== 'OFF' && (
          <div className="colleagues-row">
            <div className="colleagues-left">
              <Users size={12} className="user-icon" />
              <span>함께 근무: <strong>최서연, 김지은, 정하윤</strong></span>
            </div>
            <span className="shift-lead-pill">수간호사 승인</span>
          </div>
        )}
      </div>

      {/* 4. 빠른 근무 교환/신청 바로가기 배너 */}
      <div className="quick-action-strip">
        <div className="qa-left">
          <Sparkles size={14} className="qa-icon" />
          <span>이 날짜에 근무 변경이나 OFF가 필요하신가요?</span>
        </div>
        <button className="btn-quick-request" onClick={() => alert('근무 맞교환 신청 페이지로 연결합니다.')}>
          <HeartHandshake size={13} /> 교환 신청
        </button>
      </div>

      {/* 상세 바텀 시트 */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={`2026년 10월 ${selectedDay}일 (${selectedDow}) 상세 배정`}
      >
        <div className="sheet-content-linear">
          <div className="sheet-shift-highlight">
            <ShiftCell template={selectedTemplate} />
            <div className="sh-title-box">
              <h4>{selectedTemplate?.label || '오프 (OFF)'}</h4>
              <p className="font-mono">
                {selectedTemplate?.startsAtLocal
                  ? `${selectedTemplate.startsAtLocal} ~ ${selectedTemplate.endsAtLocal} (14시간)`
                  : '휴무일 (충분한 회복 시간)'}
              </p>
            </div>
          </div>

          <div className="sheet-detail-grid">
            <div className="s-detail-row">
              <span className="sd-label">배정 상태</span>
              <span className="sd-val green">확정 배정 (수간호사 검토 완료)</span>
            </div>
            <div className="s-detail-row">
              <span className="sd-label">법적 연속 휴식</span>
              <span className="sd-val green">근무 전/후 11시간 이상 휴식 충족</span>
            </div>
            <div className="s-detail-row">
              <span className="sd-label">당직/책임 간호사</span>
              <span className="sd-val">최서연 책임간호사</span>
            </div>
            <div className="s-detail-row">
              <span className="sd-label">예상 환자군</span>
              <span className="sd-val">고위험 산모 및 분만 대기 6병상</span>
            </div>
          </div>

          <button className="btn-sheet-action" onClick={() => setIsSheetOpen(false)}>
            확인 완료
          </button>
        </div>
      </BottomSheet>

      <style>{`
        .mobile-my-schedule {
          display: flex;
          flex-direction: column;
          background-color: #FFFFFF;
          min-height: 100%;
        }

        /* 1. 월 헤더 */
        .month-header-strip {
          padding: 12px 16px 8px 16px;
          border-bottom: 1px solid #F1F5F9;
        }
        .month-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .month-text {
          font-size: 17px;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .month-arrows {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .arrow-btn {
          background: none;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 4px;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .arrow-btn:hover {
          background-color: #F8FAFC;
          color: #0F172A;
        }

        .summary-chips-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .sum-chip {
          font-size: 12px;
          padding: 3px 8px;
          border-radius: 5px;
          font-weight: 500;
        }
        .sum-chip.d { background-color: #FFF1F2; color: #E11D48; }
        .sum-chip.n { background-color: #F0FDF4; color: #166534; }
        .sum-chip.off { background-color: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; }
        .sum-chip.rest {
          margin-left: auto;
          background-color: #ECFDF5;
          color: #059669;
          display: flex;
          align-items: center;
          gap: 3px;
          font-weight: 600;
        }

        /* 2. 캘린더 그리드 */
        .mobile-calendar-container {
          padding: 8px 12px;
          border-bottom: 1px solid #F1F5F9;
        }
        .cal-dow-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          padding: 6px 0;
          font-size: 12px;
          font-weight: 600;
          color: #94A3B8;
        }
        .dow.sun { color: #E11D48; }
        .dow.sat { color: #2563EB; }

        .cal-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        .cal-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4px 2px;
          border-radius: 8px;
          cursor: pointer;
          position: relative;
          min-height: 52px;
          transition: background-color 0.1s;
        }
        .cal-cell:hover {
          background-color: #F8FAFC;
        }
        .cal-cell.is-selected {
          background-color: #F1F5F9;
          box-shadow: inset 0 0 0 1.5px #0F172A;
        }
        .cal-cell.empty {
          cursor: default;
        }

        .day-number {
          font-size: 12px;
          font-weight: 600;
          color: #0F172A;
          margin-bottom: 2px;
        }
        .day-number.sun { color: #E11D48; }
        .day-number.sat { color: #2563EB; }

        .shift-badge-wrap {
          width: 100%;
          display: flex;
          justify-content: center;
        }
        .cell-dot {
          position: absolute;
          bottom: 3px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
        }
        .cell-dot.pink { background-color: #E11D48; }
        .cell-dot.blue { background-color: #2563EB; }
        .cell-dot.green { background-color: #10B981; }

        /* 3. 선택된 날짜 카드 */
        .selected-day-card {
          margin: 14px 16px 8px 16px;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 14px;
          background-color: #FFFFFF;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          cursor: pointer;
          transition: border-color 0.12s, box-shadow 0.12s;
        }
        .selected-day-card:hover {
          border-color: #CBD5E1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .day-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .date-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .full-date {
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
        }
        .today-badge {
          font-size: 12px;
          font-weight: 600;
          color: #0F172A;
          background-color: #F1F5F9;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .detail-arrow-btn {
          background: none;
          border: none;
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
          display: flex;
          align-items: center;
          gap: 3px;
          cursor: pointer;
        }

        .day-shift-main {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .shift-badge-box {
          flex-shrink: 0;
        }
        .shift-time-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .time-range {
          font-size: 12px;
          font-weight: 700;
          color: #0F172A;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .location-text {
          font-size: 12px;
          color: #64748B;
        }

        .colleagues-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid #F1F5F9;
          padding-top: 10px;
          font-size: 12px;
          color: #475569;
        }
        .colleagues-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .user-icon { color: #94A3B8; }
        .shift-lead-pill {
          font-size: 12px;
          font-weight: 600;
          color: #059669;
          background-color: #ECFDF5;
          padding: 1px 6px;
          border-radius: 4px;
        }

        /* 4. 빠른 액션 바 */
        .quick-action-strip {
          margin: 6px 16px 16px 16px;
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
        }
        .qa-left {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #475569;
        }
        .qa-icon { color: #E11D48; }
        .btn-quick-request {
          background-color: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 600;
          color: #0F172A;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .btn-quick-request:hover {
          background-color: #F1F5F9;
        }

        /* BottomSheet 내용 */
        .sheet-content-linear {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 8px 0;
        }
        .sheet-shift-highlight {
          display: flex;
          align-items: center;
          gap: 12px;
          background-color: #F8FAFC;
          border-radius: 10px;
          padding: 12px;
        }
        .sh-title-box h4 {
          font-size: 14px;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 2px 0;
        }
        .sh-title-box p {
          font-size: 12px;
          color: #64748B;
          margin: 0;
        }

        .sheet-detail-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .s-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          border-bottom: 1px solid #F1F5F9;
          padding-bottom: 8px;
        }
        .sd-label { color: #64748B; }
        .sd-val { font-weight: 600; color: #0F172A; }
        .sd-val.green { color: #166534; }

        .btn-sheet-action {
          width: 100%;
          background-color: #0F172A;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 10px 0;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
};
