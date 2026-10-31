import React, { useState } from 'react';
import { MOCK_SHIFT_TEMPLATES, generateMockAssignments } from '../../data/mockData';
import { ShiftCell } from '../../components/ui/ShiftCell';
import { BottomSheet } from '../../components/ui/BottomSheet';
import type { ShiftAssignment } from '../../types';
import { ChevronLeft, ChevronRight, ChevronRight as ArrowRight } from 'lucide-react';

export const MySchedulePage: React.FC = () => {
  // 2026년 10월 기준 (1일이 목요일, 31일까지)
  const currentStaffId = 'staff-1'; // 이은솔 간호사
  const [assignments] = useState<ShiftAssignment[]>(generateMockAssignments());
  const [selectedDay, setSelectedDay] = useState<number>(24); // 기본 10월 24일 선택 상태

  const daysInMonth = 31;
  const startDayOfWeek = 4; // 목요일 시작 (0: 일, 1: 월, 2: 화, 3: 수, 4: 목, 5: 금, 6: 토)

  const myAssignments = assignments.filter((a) => a.staffId === currentStaffId);
  const templateMap = new Map(MOCK_SHIFT_TEMPLATES.map((t) => [t.id, t]));

  const myAssignmentMap = new Map<string, ShiftAssignment>();
  myAssignments.forEach((a) => {
    myAssignmentMap.set(a.localStartDate, a);
  });

  const selectedDateStr = `2026-11-${String(selectedDay).padStart(2, '0')}`;
  const selectedAssignment = myAssignmentMap.get(selectedDateStr);
  const selectedTemplate = selectedAssignment
    ? templateMap.get(selectedAssignment.shiftTemplateId)
    : undefined;

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <div className="mobile-my-schedule">
      {/* 캘린더 월 헤더 */}
      <div className="mobile-month-nav">
        <h2 className="month-title font-mono">2026년 10월</h2>
        <div className="nav-arrows">
          <button className="arrow-btn" aria-label="이전 달"><ChevronLeft size={16} /></button>
          <button className="arrow-btn" aria-label="다음 달"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* 캘린더 그리드 */}
      <div className="mobile-cal-card">
        <div className="cal-dow-row">
          <div className="dow-col sun">일</div>
          <div className="dow-col">월</div>
          <div className="dow-col">화</div>
          <div className="dow-col">수</div>
          <div className="dow-col">목</div>
          <div className="dow-col">금</div>
          <div className="dow-col sat">토</div>
        </div>

        <div className="cal-days-grid">
          {/* 빈 셀 (일~수: 4개) */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="cal-cell empty" />
          ))}

          {/* 1일 ~ 31일 */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
            const assign = myAssignmentMap.get(dateStr);
            const tmpl = assign ? templateMap.get(assign.shiftTemplateId) : undefined;
            const dow = (day + startDayOfWeek - 1) % 7;
            const isSun = dow === 0;
            const isSat = dow === 6;
            const isSelected = selectedDay === day;

            return (
              <div
                key={day}
                className={`cal-cell ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                <div className="cell-num-wrapper">
                  <span className={`cell-num font-mono ${isSun ? 'sun' : isSat ? 'sat' : ''}`}>
                    {day}
                  </span>
                  {(day === 30 || day === 31) && <span className="mini-dot" />}
                </div>
                <div className="cell-shift-pill">
                  <ShiftCell template={tmpl} isCompact />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 선택 근무 카드 (레퍼런스 이미지 정확 매칭) */}
      <div className="selected-shift-card" onClick={() => setIsSheetOpen(true)}>
        <div className="card-date-label">10월 {selectedDay}일 ({['일', '월', '화', '수', '목', '금', '토'][(selectedDay + startDayOfWeek - 1) % 7]})</div>
        <div className="card-shift-row">
          <div className="shift-info-left">
            <div className={`shift-circle-badge ${selectedTemplate?.code === 'NIGHT' ? 'n' : selectedTemplate?.code === 'DAY' ? 'd' : 'off'}`}>
              {selectedTemplate?.code === 'NIGHT' ? 'N' : selectedTemplate?.code === 'DAY' ? 'D' : 'OFF'}
            </div>
            <div className="shift-texts">
              <span className="shift-name">{selectedTemplate?.label || '오프 (OFF)'}</span>
              <span className="shift-time font-mono">
                {selectedTemplate?.startsAtLocal && selectedTemplate?.endsAtLocal
                  ? `${selectedTemplate.startsAtLocal} - ${selectedTemplate.endsAtLocal}`
                  : '휴무일'}
              </span>
            </div>
          </div>
          <ArrowRight size={18} className="chevron-icon" />
        </div>
      </div>

      {/* 상세 바텀 시트 */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={`2026년 10월 ${selectedDay}일 상세 근무`}
      >
        <div className="sheet-body">
          <div className="sheet-main-info">
            <ShiftCell template={selectedTemplate} />
            <div>
              <h4 className="sheet-title">{selectedTemplate?.label || '오프'}</h4>
              <p className="sheet-time-desc">
                {selectedTemplate?.startsAtLocal
                  ? `${selectedTemplate.startsAtLocal} ~ ${selectedTemplate.endsAtLocal}`
                  : '근무 없음 (보장 휴식)'}
              </p>
            </div>
          </div>

          <div className="sheet-meta-list">
            <div className="meta-item">
              <span className="m-label">근무 구역</span>
              <span className="m-value">마더케어 산부인과 3병동</span>
            </div>
            <div className="meta-item">
              <span className="m-label">배정 출처</span>
              <span className="m-value">{selectedAssignment?.isPinned ? '관리자 수동 고정(PIN)' : 'AI 자동 편성'}</span>
            </div>
            <div className="meta-item">
              <span className="m-label">법적 휴식 보장</span>
              <span className="m-value text-emerald">11시간 최소 휴식 보장 충족</span>
            </div>
          </div>
        </div>
      </BottomSheet>

      <style>{`
        .mobile-my-schedule {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .mobile-month-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 4px;
        }
        .month-title {
          font-size: 19px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
        }
        .nav-arrows {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .arrow-btn {
          background: none;
          border: none;
          color: #64748B;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .arrow-btn:hover {
          color: #0F172A;
        }

        /* Cal Card */
        .mobile-cal-card {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 14px 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .cal-dow-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          margin-bottom: 12px;
        }
        .dow-col {
          font-size: 11px;
          font-weight: 600;
          color: #64748B;
        }
        .dow-col.sun {
          color: #F43F5E;
        }
        .dow-col.sat {
          color: #3B82F6;
        }

        .cal-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          row-gap: 8px;
          column-gap: 4px;
        }
        .cal-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4px 2px 6px;
          border-radius: 8px;
          cursor: pointer;
          min-height: 52px;
          transition: background-color 0.12s;
        }
        .cal-cell:hover {
          background-color: #F8FAFC;
        }
        .cal-cell.selected {
          background-color: #FFF1F2;
        }
        .cal-cell.empty {
          cursor: default;
        }
        .cell-num-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 100%;
          margin-bottom: 4px;
        }
        .cell-num {
          font-size: 12px;
          font-weight: 600;
          color: #1E293B;
        }
        .cell-num.sun {
          color: #F43F5E;
        }
        .cell-num.sat {
          color: #3B82F6;
        }
        .mini-dot {
          position: absolute;
          right: 4px;
          top: 2px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: #10B981;
        }
        .cell-shift-pill {
          display: flex;
          justify-content: center;
          width: 100%;
        }

        /* 하단 선택 근무 카드 */
        .selected-shift-card {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
          cursor: pointer;
          transition: transform 0.12s, box-shadow 0.12s;
        }
        .selected-shift-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
        }
        .card-date-label {
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 12px;
        }
        .card-shift-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .shift-info-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .shift-circle-badge {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }
        .shift-circle-badge.n {
          background-color: #DCFCE7;
          color: #15803D;
        }
        .shift-circle-badge.d {
          background-color: #FCE7F3;
          color: #E11D48;
        }
        .shift-circle-badge.off {
          background-color: #E0F2FE;
          color: #0369A1;
        }
        .shift-texts {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .shift-name {
          font-size: 14px;
          font-weight: 700;
          color: #0F172A;
        }
        .shift-time {
          font-size: 12px;
          color: #64748B;
        }
        .chevron-icon {
          color: #94A3B8;
        }

        /* 시트 내부 스타일 */
        .sheet-body {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 8px 0;
        }
        .sheet-main-info {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 16px;
          border-bottom: 1px solid #F1F5F9;
        }
        .sheet-title {
          font-size: 15px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
        }
        .sheet-time-desc {
          font-size: 12px;
          color: #64748B;
          margin: 2px 0 0;
        }
        .sheet-meta-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .meta-item {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }
        .m-label {
          color: #64748B;
        }
        .m-value {
          font-weight: 600;
          color: #0F172A;
        }
        .text-emerald {
          color: #059669;
        }
      `}</style>
    </div>
  );
};
