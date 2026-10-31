import React, { useState } from 'react';
import { MOCK_STAFF, MOCK_SHIFT_TEMPLATES, generateMockAssignments } from '../../data/mockData';
import type { ShiftAssignment } from '../../types';
import { ShiftCell } from '../../components/ui/ShiftCell';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { 
  Undo2, 
  Redo2, 
  Lock, 
  Pin,
  CheckCircle2
} from 'lucide-react';

export const RosterEditorPage: React.FC = () => {
  const [assignments, setAssignments] = useState<ShiftAssignment[]>(generateMockAssignments());
  const [selectedCell, setSelectedCell] = useState<{ staffId: string; date: string } | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'SAVED' | 'SAVING'>('SAVED');
  const [isPublished, setIsPublished] = useState(false);

  const daysInMonth = 30; // 2026-11
  const templateMap = new Map(MOCK_SHIFT_TEMPLATES.map((t) => [t.id, t]));

  // 빠른 룩업 맵 생성: "staffId:date" -> assignment
  const assignmentMap = new Map<string, ShiftAssignment>();
  assignments.forEach((a) => {
    assignmentMap.set(`${a.staffId}:${a.localStartDate}`, a);
  });

  // 셀 편집
  const handleAssignShift = (templateId: string) => {
    if (!selectedCell || isLocked) return;
    setSaveStatus('SAVING');

    const updated = assignments.map((a) => {
      if (a.staffId === selectedCell.staffId && a.localStartDate === selectedCell.date) {
        return {
          ...a,
          shiftTemplateId: templateId,
          source: 'MANUAL' as const,
        };
      }
      return a;
    });

    setAssignments(updated);
    setTimeout(() => setSaveStatus('SAVED'), 300);
  };

  // 핀 토글
  const handleTogglePin = () => {
    if (!selectedCell || isLocked) return;
    const updated = assignments.map((a) => {
      if (a.staffId === selectedCell.staffId && a.localStartDate === selectedCell.date) {
        return {
          ...a,
          isPinned: !a.isPinned,
          source: (!a.isPinned ? 'PINNED' : 'MANUAL') as any,
        };
      }
      return a;
    });
    setAssignments(updated);
  };

  // 일자별 커버리지 계산 (Day 몇 명, Night 몇 명)
  const getDayCoverage = (day: number) => {
    const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
    let d = 0;
    let n = 0;
    assignments.forEach((a) => {
      if (a.localStartDate === dateStr) {
        const tmpl = templateMap.get(a.shiftTemplateId);
        if (tmpl?.code === 'DAY') d++;
        if (tmpl?.code === 'NIGHT') n++;
      }
    });
    // 기준: Day 최소 1명, Night 최소 1명
    const isSufficient = d >= 1 && n >= 1;
    return { d, n, isSufficient };
  };

  return (
    <div className="roster-editor-container">
      {/* 툴바 */}
      <div className="roster-toolbar">
        <div className="left-tools">
          <h2 className="title">전체 근무표 매트릭스</h2>
          <span className="period-badge">2026-11 (30일)</span>
          <StatusBadge status={isPublished ? 'PUBLISHED' : 'DRAFT'} />
          <span className="save-status">
            {saveStatus === 'SAVED' ? '✓ 자동저장됨' : '저장 중...'}
          </span>
        </div>

        <div className="right-tools">
          <button className="tool-btn" title="실행 취소 (Undo)"><Undo2 size={16} /> 취소</button>
          <button className="tool-btn" title="다시 실행 (Redo)"><Redo2 size={16} /> 복귀</button>
          <button
            className={`tool-btn ${isLocked ? 'locked' : ''}`}
            onClick={() => setIsLocked(!isLocked)}
          >
            <Lock size={16} />
            <span>{isLocked ? '편집 잠금 해제' : '편집 잠금'}</span>
          </button>
          <button
            className="publish-cta"
            onClick={() => setIsPublished(!isPublished)}
          >
            <CheckCircle2 size={16} />
            <span>{isPublished ? '확정 취소 (초안 전환)' : '근무표 최종 확정'}</span>
          </button>
        </div>
      </div>

      {/* 교대 템플릿 팔레트 (선택 시 빠른 입력) */}
      <div className="palette-bar">
        <span className="pal-label">빠른 배정 팔레트:</span>
        {MOCK_SHIFT_TEMPLATES.map((tmpl) => (
          <ShiftCell
            key={tmpl.id}
            template={tmpl}
            onClick={() => handleAssignShift(tmpl.id)}
          />
        ))}
        {selectedCell && (
          <button className="pin-toggle-btn" onClick={handleTogglePin}>
            <Pin size={14} />
            <span>선택 셀 핀(고정) 토글</span>
          </button>
        )}
        <span className="help-text">💡 셀을 클릭한 후 팔레트의 근무를 누르면 즉시 변경됩니다.</span>
      </div>

      {/* 고성능 표 컨테이너 (내부 가로 스크롤) */}
      <div className="grid-scroll-wrapper">
        <table className="roster-table">
          <thead>
            <tr>
              <th className="sticky-col header-cell staff-head">간호사 (6인)</th>
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dow = (day + 6) % 7; // 2026-11-01 is Sunday (0)
                const isSun = dow === 0;
                const isSat = dow === 6;
                const dows = ['일', '월', '화', '수', '목', '금', '토'];

                return (
                  <th key={day} className={`header-cell day-head ${isSun ? 'sun' : isSat ? 'sat' : ''}`}>
                    <div className="d-num">{day}</div>
                    <div className="d-name">{dows[dow]}</div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {MOCK_STAFF.map((staff) => (
              <tr key={staff.id}>
                <td className="sticky-col staff-cell">
                  <div className="staff-info">
                    <span className="s-name">{staff.name}</span>
                    <div className="tag-row">
                      <span className="s-code">{staff.staffCode}</span>
                      {staff.skillTags.includes('CHARGE_CAPABLE') && (
                        <span className="skill-badge charge">책임</span>
                      )}
                      {staff.skillTags.includes('NEW_GRAD') && (
                        <span className="skill-badge grad">신규</span>
                      )}
                      {staff.employmentType === 'PART_TIME' && (
                        <span className="skill-badge part">단시간</span>
                      )}
                    </div>
                  </div>
                </td>

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
                  const key = `${staff.id}:${dateStr}`;
                  const assign = assignmentMap.get(key);
                  const tmpl = assign ? templateMap.get(assign.shiftTemplateId) : undefined;
                  const isSelected = selectedCell?.staffId === staff.id && selectedCell?.date === dateStr;

                  return (
                    <td
                      key={day}
                      className={`grid-cell ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedCell({ staffId: staff.id, date: dateStr })}
                    >
                      <ShiftCell
                        template={tmpl}
                        isCompact
                        isPinned={assign?.isPinned}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>

          {/* 하단 인력 커버리지 충족 상태 행 */}
          <tfoot>
            <tr className="coverage-row">
              <td className="sticky-col cov-header">
                <strong>필수 인원 충족</strong>
                <span className="sub">(D $\ge$ 1, N $\ge$ 1)</span>
              </td>
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const { d, n, isSufficient } = getDayCoverage(day);

                return (
                  <td key={day} className={`cov-cell ${isSufficient ? 'ok' : 'danger'}`}>
                    <div className="cov-counts">D:{d} N:{n}</div>
                    <span className="cov-badge">
                      {isSufficient ? '충족' : '부족'}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <style>{`
        .roster-editor-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          height: calc(100vh - 120px);
        }
        .roster-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--color-bg-surface);
          padding: var(--space-3) var(--space-4);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        .left-tools {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .title {
          font-size: var(--font-size-base);
          font-weight: 700;
        }
        .period-badge {
          font-size: var(--font-size-xs);
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        .save-status {
          font-size: 11px;
          color: var(--color-success);
          font-weight: 600;
        }
        .right-tools {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .tool-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background-color: var(--color-bg-muted);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-weight: 600;
          color: var(--color-text-secondary);
          cursor: pointer;
        }
        .tool-btn:hover { background-color: var(--color-border); }
        .tool-btn.locked {
          background-color: var(--color-warning-bg);
          color: var(--color-warning);
          border-color: #FDE68A;
        }
        .publish-cta {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background-color: var(--color-brand-primary);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-weight: 700;
          cursor: pointer;
        }
        .publish-cta:hover { background-color: var(--color-brand-hover); }
        .palette-bar {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          background-color: var(--color-bg-surface);
          padding: var(--space-2) var(--space-4);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        .pal-label {
          font-size: var(--font-size-xs);
          font-weight: 700;
          color: var(--color-text-secondary);
        }
        .pin-toggle-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background-color: var(--color-bg-muted);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
        .help-text {
          margin-left: auto;
          font-size: 11px;
          color: var(--color-text-muted);
        }
        /* 테이블 스크롤 컨테이너 */
        .grid-scroll-wrapper {
          flex: 1;
          overflow: auto;
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
        }
        .roster-table {
          border-collapse: collapse;
          width: 100%;
          table-layout: fixed;
        }
        .sticky-col {
          position: sticky;
          left: 0;
          background-color: var(--color-bg-surface);
          z-index: 20;
          width: 160px;
          min-width: 160px;
          border-right: 2px solid var(--color-border-strong);
        }
        .header-cell {
          position: sticky;
          top: 0;
          background-color: var(--color-bg-muted);
          z-index: 10;
          border-bottom: 2px solid var(--color-border-strong);
          border-right: 1px solid var(--color-border);
          padding: 6px 4px;
          text-align: center;
          font-size: 11px;
        }
        .staff-head {
          z-index: 30; /* 교차점 */
          text-align: left;
          padding-left: var(--space-3);
        }
        .day-head {
          width: 44px;
          min-width: 44px;
        }
        .day-head.sun { color: var(--color-danger); }
        .day-head.sat { color: var(--color-brand-primary); }
        .staff-cell {
          padding: 8px var(--space-3);
          border-bottom: 1px solid var(--color-border);
        }
        .staff-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .s-name {
          font-size: var(--font-size-xs);
          font-weight: 700;
        }
        .tag-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .s-code {
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .skill-badge {
          font-size: 9px;
          padding: 1px 4px;
          border-radius: 2px;
          font-weight: 700;
        }
        .skill-badge.charge { background: #FEF3C7; color: #B45309; }
        .skill-badge.grad { background: #E0F2FE; color: #0369A1; }
        .skill-badge.part { background: #F1F5F9; color: #475569; }
        .grid-cell {
          border-bottom: 1px solid var(--color-border);
          border-right: 1px solid var(--color-border);
          text-align: center;
          padding: 2px;
          cursor: pointer;
        }
        .grid-cell:hover {
          background-color: var(--color-brand-light);
        }
        .grid-cell.selected {
          outline: 2px solid var(--color-brand-primary);
          outline-offset: -2px;
          background-color: var(--color-brand-light);
        }
        .coverage-row {
          position: sticky;
          bottom: 0;
          background-color: var(--color-bg-muted);
          z-index: 10;
          border-top: 2px solid var(--color-border-strong);
        }
        .cov-header {
          padding: 8px var(--space-3);
          font-size: 11px;
          display: flex;
          flex-direction: column;
        }
        .cov-header .sub { font-size: 10px; color: var(--color-text-secondary); }
        .cov-cell {
          padding: 4px 2px;
          text-align: center;
          border-right: 1px solid var(--color-border);
        }
        .cov-counts {
          font-size: 9px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        .cov-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 1px 3px;
          border-radius: 2px;
          display: inline-block;
          margin-top: 2px;
        }
        .cov-cell.ok .cov-badge { background: #DCFCE7; color: #15803D; }
        .cov-cell.danger .cov-badge { background: #FEE2E2; color: #B91C1C; }
      `}</style>
    </div>
  );
};
