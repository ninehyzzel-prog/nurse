import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_STAFF, MOCK_SHIFT_TEMPLATES, generateMockAssignments } from '../../data/mockData';
import { ShiftCell } from '../../components/ui/ShiftCell';
import { BottomSheet } from '../../components/ui/BottomSheet';
import type { ShiftAssignment } from '../../types';
import { ChevronLeft, ChevronRight, CalendarPlus } from 'lucide-react';

export const MySchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const currentStaff = MOCK_STAFF[0]; // 김간호사 (staff-1)
  const [assignments] = useState<ShiftAssignment[]>(generateMockAssignments());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const daysInMonth = 30; // 2026-11
  const startDayOfWeek = 0; // 2026-11-01 is Sun (0)

  const myAssignments = assignments.filter((a) => a.staffId === currentStaff.id);

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
      totalWorkMinutes += 540;
    } else if (t.code === 'NIGHT') {
      nightCount++;
      totalWorkMinutes += 780;
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
    <div className="mobile-schedule-view">
      {/* Month Navigation & Stats Bar */}
      <div className="month-control-bar">
        <div className="nav-row">
          <button className="nav-btn" aria-label="이전 달"><ChevronLeft size={16} /></button>
          <span className="month-heading">2026년 11월</span>
          <button className="nav-btn" aria-label="다음 달"><ChevronRight size={16} /></button>
        </div>

        <div className="summary-strip">
          <div className="sum-item">
            <span className="lbl">데이 (D)</span>
            <span className="val font-mono">{dayCount}일</span>
          </div>
          <div className="sum-item">
            <span className="lbl">나이트 (N)</span>
            <span className="val font-mono">{nightCount}일</span>
          </div>
          <div className="sum-item">
            <span className="lbl">오프 (OFF)</span>
            <span className="val font-mono">{offCount}일</span>
          </div>
          <div className="sum-item highlight">
            <span className="lbl">총 실근로</span>
            <span className="val font-mono">{Math.round(totalWorkMinutes / 60)}h</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-panel">
        <div className="dow-header-row">
          {['일', '월', '화', '수', '목', '금', '토'].map((dow, idx) => (
            <div key={dow} className={`dow-cell ${idx === 0 ? 'is-sun' : idx === 6 ? 'is-sat' : ''}`}>
              {dow}
            </div>
          ))}
        </div>

        <div className="days-grid">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="day-cell is-empty" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
            const assign = myAssignments.find((a) => a.localStartDate === dateStr);
            const tmpl = assign ? templateMap.get(assign.shiftTemplateId) : undefined;
            const dow = (day + startDayOfWeek - 1) % 7;
            const isToday = day === 14;

            return (
              <div
                key={day}
                className={`day-cell ${isToday ? 'is-today' : ''} ${selectedDay === day ? 'is-active' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                <span className={`date-number ${dow === 0 ? 'text-sun' : dow === 6 ? 'text-sat' : ''}`}>
                  {day}
                </span>
                <div className="shift-slot">
                  <ShiftCell template={tmpl} isCompact />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Time-Off CTA */}
      <div className="bottom-action-bar">
        <button className="btn-request-off" onClick={() => navigate('/me/requests/new')}>
          <CalendarPlus size={15} />
          <span>이 달의 희망 오프 신청하기</span>
        </button>
      </div>

      {/* Shift Detail BottomSheet */}
      <BottomSheet
        isOpen={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={`2026년 11월 ${selectedDay}일 근무 상세`}
      >
        {selectedTemplate ? (
          <div className="sheet-content">
            <div className="sheet-shift-header">
              <ShiftCell template={selectedTemplate} />
              <div>
                <h4 className="shift-title">{selectedTemplate.label}</h4>
                <span className="shift-hours font-mono">
                  {selectedTemplate.startsAtLocal} ~ {selectedTemplate.endsAtLocal}
                  {selectedTemplate.endDayOffset > 0 && ' (익일)'}
                </span>
              </div>
            </div>

            <div className="detail-rows">
              <div className="d-row">
                <span className="d-lbl">예정 체류 시간</span>
                <span className="d-val font-mono">
                  {selectedTemplate.code === 'NIGHT' ? '14시간 (840분)' : '10시간 (600분)'}
                </span>
              </div>
              <div className="d-row">
                <span className="d-lbl">보장 휴게 시간</span>
                <span className="d-val font-mono">{selectedTemplate.breakMinutes}분 (확인됨)</span>
              </div>
              <div className="d-row">
                <span className="d-lbl">인정 실근로시간</span>
                <span className="d-val font-mono">
                  {selectedTemplate.code === 'NIGHT' ? '13시간' : '9시간'}
                </span>
              </div>
              <div className="d-row">
                <span className="d-lbl">배정 출처</span>
                <span className="d-val">
                  {selectedAssignment?.isPinned ? '관리자 수동 고정(PIN)' : '자동 최적화 배정'}
                </span>
              </div>
            </div>

            <div className="colleague-box">
              <span className="colleague-title">함께 근무하는 팀원:</span>
              <div className="colleague-pills">
                <span className="colleague-pill">이간호사 (선임)</span>
                <span className="colleague-pill">박간호사</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="no-detail">선택된 근무 배정이 없습니다.</p>
        )}
      </BottomSheet>

      <style>{`
        .mobile-schedule-view {
          display: flex;
          flex-direction: column;
          padding: var(--space-3);
          gap: var(--space-3);
        }

        /* Month Control Bar */
        .month-control-bar {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: 8px var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .nav-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .nav-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary);
          border-radius: var(--radius-sm);
        }
        .nav-btn:hover {
          background-color: var(--color-bg-subtle);
        }
        .month-heading {
          font-size: var(--text-sm);
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .summary-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background-color: var(--color-bg-subtle);
          border-radius: var(--radius-xs);
          padding: 6px var(--space-2);
        }
        .sum-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
        }
        .sum-item .lbl {
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .sum-item .val {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .sum-item.highlight .val {
          color: #2563EB;
        }

        /* Calendar Grid */
        .calendar-panel {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        .dow-header-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background-color: var(--color-bg-subtle);
          border-bottom: 1px solid var(--color-border);
        }
        .dow-cell {
          text-align: center;
          padding: 6px 0;
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-muted);
        }
        .dow-cell.is-sun { color: #DC2626; }
        .dow-cell.is-sat { color: #2563EB; }

        .days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
        }
        .day-cell {
          min-height: 58px;
          padding: 4px;
          border-bottom: 1px solid var(--color-border-subtle);
          border-right: 1px solid var(--color-border-subtle);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 2px;
          cursor: pointer;
          transition: background-color 0.1s;
        }
        .day-cell:hover {
          background-color: #FAFAFA;
        }
        .day-cell.is-active {
          background-color: #EFF6FF;
        }
        .day-cell.is-today {
          background-color: #F8FAFC;
        }
        .day-cell.is-empty {
          background-color: #FAFAFA;
          cursor: default;
        }
        .date-number {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-secondary);
          font-feature-settings: "tnum";
        }
        .text-sun { color: #DC2626; }
        .text-sat { color: #2563EB; }

        .shift-slot {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        /* Action CTA */
        .bottom-action-bar {
          margin-top: auto;
        }
        .btn-request-off {
          width: 100%;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background-color: var(--color-primary);
          color: var(--color-primary-text);
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 600;
          transition: background-color 0.12s;
        }
        .btn-request-off:hover {
          background-color: var(--color-primary-hover);
        }

        /* BottomSheet Inner */
        .sheet-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .sheet-shift-header {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding-bottom: var(--space-2);
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .shift-title {
          font-size: 14px;
          font-weight: 700;
          margin: 0;
        }
        .shift-hours {
          font-size: 12px;
          color: var(--color-text-muted);
        }
        .detail-rows {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .d-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }
        .d-lbl { color: var(--color-text-muted); }
        .d-val { font-weight: 600; color: var(--color-text-primary); }
        .font-mono { font-feature-settings: "tnum"; }

        .colleague-box {
          background-color: var(--color-bg-subtle);
          padding: var(--space-2);
          border-radius: var(--radius-xs);
          font-size: 11px;
        }
        .colleague-title {
          font-weight: 600;
          color: var(--color-text-secondary);
          display: block;
          margin-bottom: 4px;
        }
        .colleague-pills {
          display: flex;
          gap: 4px;
        }
        .colleague-pill {
          background-color: #FFFFFF;
          border: 1px solid var(--color-border);
          padding: 2px 6px;
          border-radius: 2px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};
