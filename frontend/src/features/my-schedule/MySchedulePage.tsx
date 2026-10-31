import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_STAFF, MOCK_SHIFT_TEMPLATES, generateMockAssignments } from '../../data/mockData';
import { ShiftCell } from '../../components/ui/ShiftCell';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { ShiftAssignment } from '../../types';
import { ChevronLeft, ChevronRight, Clock, UserCheck, CalendarPlus } from 'lucide-react';

export const MySchedulePage: React.FC = () => {
  const navigate = useNavigate();
  // 기본 사용자: 김간호사 (staff-1)
  const currentStaff = MOCK_STAFF[0];
  const [assignments] = useState<ShiftAssignment[]>(generateMockAssignments());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const daysInMonth = 30; // 2026-11
  const startDayOfWeek = 0; // 2026-11-01 is Sunday (0)

  // 김간호사의 11월 배정 목록
  const myAssignments = assignments.filter((a) => a.staffId === currentStaff.id);

  // 월간 통계 계산
  const templateMap = new Map(MOCK_SHIFT_TEMPLATES.map((t) => [t.id, t]));
  let dayCount = 0;
  let nightCount = 0;
  let offCount = 0;
  let totalWorkMinutes = 0;

  myAssignments.forEach((a) => {
    const t = templateMap.get(a.shiftTemplateId);
    if (!t) return;
    if (t.code === 'DAY') {
      dayCount++;
      totalWorkMinutes += 540; // 10h - 1h break = 9h
    } else if (t.code === 'NIGHT') {
      nightCount++;
      totalWorkMinutes += 780; // 14h - 1h break = 13h
    } else {
      offCount++;
    }
  });

  const selectedAssignment = selectedDay
    ? myAssignments.find((a) => a.localStartDate === `2026-11-${String(selectedDay).padStart(2, '0')}`)
    : null;
  const selectedTemplate = selectedAssignment
    ? templateMap.get(selectedAssignment.shiftTemplateId)
    : null;

  return (
    <div className="schedule-container">
      {/* 상단 월 네비게이션 & 상태 */}
      <div className="month-header">
        <div className="month-title-row">
          <button className="nav-arrow" aria-label="이전 달"><ChevronLeft size={20} /></button>
          <h2 className="month-text">2026년 11월</h2>
          <button className="nav-arrow" aria-label="다음 달"><ChevronRight size={20} /></button>
        </div>
        <div className="status-row">
          <StatusBadge status="PUBLISHED" />
          <span className="demo-pill">데모 목업</span>
        </div>
      </div>

      {/* 월간 요약 카드 */}
      <div className="summary-card">
        <div className="summary-item">
          <span className="label">데이</span>
          <span className="val day">{dayCount}</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="label">나이트</span>
          <span className="val night">{nightCount}</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="label">오프</span>
          <span className="val off">{offCount}</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="label">예상 실근로</span>
          <span className="val total">{Math.round(totalWorkMinutes / 60)}h</span>
        </div>
      </div>

      {/* 달력 그리드 */}
      <div className="calendar-grid">
        {['일', '월', '화', '수', '목', '금', '토'].map((dow, idx) => (
          <div key={dow} className={`dow-header ${idx === 0 ? 'sun' : idx === 6 ? 'sat' : ''}`}>
            {dow}
          </div>
        ))}

        {/* 빈 칸 (일요일 시작이므로 2026-11-01은 offset 0) */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-cell empty" />
        ))}

        {/* 일자 셀 */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
          const assign = myAssignments.find((a) => a.localStartDate === dateStr);
          const tmpl = assign ? templateMap.get(assign.shiftTemplateId) : undefined;
          const dow = (startDayOfWeek + i) % 7;
          const isWeekend = dow === 0 || dow === 6;

          return (
            <div
              key={day}
              className={`calendar-cell ${isWeekend ? 'weekend' : ''}`}
              onClick={() => setSelectedDay(day)}
            >
              <div className="date-number">{day}</div>
              <div className="chip-slot">
                <ShiftCell template={tmpl} isCompact isPinned={assign?.isPinned} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 일자 상세 바텀시트 */}
      <BottomSheet
        isOpen={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? `2026년 11월 ${selectedDay}일 근무 상세` : ''}
      >
        {selectedTemplate && (
          <div className="sheet-detail-content">
            <div className="detail-shift-row">
              <ShiftCell template={selectedTemplate} isPinned={selectedAssignment?.isPinned} />
              <div className="time-info">
                <div className="time-range">
                  <Clock size={16} />
                  <span>
                    {selectedTemplate.code === 'OFF'
                      ? '휴일 (근무 배정 없음)'
                      : `${selectedTemplate.startsAtLocal} ~ ${selectedTemplate.endsAtLocal}`}
                  </span>
                </div>
                {selectedTemplate.endDayOffset > 0 && (
                  <span className="next-day-alert">⚠️ 익일(다음 날) 아침 08:00에 퇴근합니다.</span>
                )}
              </div>
            </div>

            {selectedTemplate.code !== 'OFF' && (
              <div className="duty-info-box">
                <div className="info-line">
                  <span className="k">체류 시간:</span>
                  <span className="v">{selectedTemplate.code === 'DAY' ? '10시간' : '14시간'}</span>
                </div>
                <div className="info-line">
                  <span className="k">보장 휴게:</span>
                  <span className="v">{selectedTemplate.breakMinutes}분 (실근로시간에서 차감)</span>
                </div>
                <div className="info-line">
                  <span className="k">당일 팀 구성:</span>
                  <span className="v"><UserCheck size={14} /> 김간호사, 최간호사</span>
                </div>
              </div>
            )}

            <div className="sheet-cta-row">
              <button
                className="btn-apply-off"
                onClick={() => {
                  navigate(`/me/requests/new?date=2026-11-${String(selectedDay).padStart(2, '0')}`);
                }}
              >
                <CalendarPlus size={18} />
                <span>이 날짜 오프/휴가 신청하기</span>
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      <style>{`
        .schedule-container {
          padding: var(--space-4);
        }
        .month-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-3);
        }
        .month-title-row {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .month-text {
          font-size: var(--font-size-lg);
          font-weight: 700;
        }
        .nav-arrow {
          background: none;
          border: none;
          cursor: pointer;
          min-width: 36px;
          min-height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary);
        }
        .status-row {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .demo-pill {
          font-size: 10px;
          font-weight: 700;
          color: var(--color-brand-primary);
          background-color: var(--color-brand-light);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
        }
        .summary-card {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          display: flex;
          align-items: center;
          justify-content: space-around;
          margin-bottom: var(--space-4);
          box-shadow: var(--shadow-sm);
        }
        .summary-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .summary-item .label {
          font-size: 11px;
          color: var(--color-text-secondary);
          margin-bottom: 2px;
        }
        .summary-item .val {
          font-size: var(--font-size-base);
          font-weight: 700;
        }
        .summary-item .val.day { color: #0284C7; }
        .summary-item .val.night { color: #7C3AED; }
        .summary-item .val.off { color: #64748B; }
        .summary-item .val.total { color: var(--color-text-primary); }
        .summary-divider {
          width: 1px;
          height: 24px;
          background-color: var(--color-border);
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
          background-color: var(--color-border);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .dow-header {
          background-color: var(--color-bg-muted);
          padding: 8px 0;
          text-align: center;
          font-size: var(--font-size-xs);
          font-weight: 700;
          color: var(--color-text-secondary);
        }
        .dow-header.sun { color: var(--color-danger); }
        .dow-header.sat { color: var(--color-brand-primary); }
        .calendar-cell {
          background-color: var(--color-bg-surface);
          min-height: 56px;
          padding: 4px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
        }
        .calendar-cell.weekend {
          background-color: #FAFAFA;
        }
        .calendar-cell:active {
          background-color: var(--color-brand-light);
        }
        .date-number {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        .chip-slot {
          display: flex;
          justify-content: center;
        }
        .sheet-detail-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .detail-shift-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .time-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .time-range {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: var(--font-size-sm);
          font-weight: 600;
        }
        .next-day-alert {
          font-size: 12px;
          color: var(--color-warning);
          font-weight: 600;
        }
        .duty-info-box {
          background-color: var(--color-bg-muted);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          font-size: var(--font-size-xs);
        }
        .info-line {
          display: flex;
          justify-content: space-between;
        }
        .info-line .k { color: var(--color-text-secondary); }
        .info-line .v { font-weight: 600; display: flex; align-items: center; gap: 4px; }
        .sheet-cta-row {
          margin-top: var(--space-2);
        }
        .btn-apply-off {
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
        .btn-apply-off:hover {
          background-color: var(--color-brand-hover);
        }
      `}</style>
    </div>
  );
};
