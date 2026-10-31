import React, { useState, useEffect } from 'react';
import { MOCK_STAFF, MOCK_SHIFT_TEMPLATES, generateMockAssignments } from '../../data/mockData';
import type { ShiftAssignment } from '../../types';
import { ShiftCell } from '../../components/ui/ShiftCell';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { 
  Undo2, 
  Redo2, 
  Lock, 
  Pin,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Info,
  X
} from 'lucide-react';
import {
  fetchSchedulePeriod,
  updateAssignment,
  validateScheduleVersion,
  publishSchedule,
  type ValidationReport,
} from '../../api/scheduleApi';

export const RosterEditorPage: React.FC = () => {
  const [assignments, setAssignments] = useState<ShiftAssignment[]>(generateMockAssignments());
  const [versionId, setVersionId] = useState<string>('version-2026-11-v1');
  const [selectedCell, setSelectedCell] = useState<{ staffId: string; date: string } | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'SAVED' | 'SAVING' | 'ERROR'>('SAVED');
  const [isPublished, setIsPublished] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showIssueDrawer, setShowIssueDrawer] = useState(false);

  const daysInMonth = 30; // 2026-11
  const templateMap = new Map(MOCK_SHIFT_TEMPLATES.map((t) => [t.id, t]));

  // 1. 초기 백엔드 스케줄 및 검증 리포트 로드
  const loadScheduleFromBackend = async () => {
    try {
      setSaveStatus('SAVING');
      const periodData = await fetchSchedulePeriod('ward-obgyn', 'period-2026-11');
      if (periodData.current_version) {
        setVersionId(periodData.current_version.id);
        setIsPublished(periodData.current_version.status === 'PUBLISHED');

        const mapped = periodData.current_version.assignments.map((a) => {
          let tId = 'shift-off';
          if (a.shift_template_code === 'DAY') tId = 'shift-day';
          else if (a.shift_template_code === 'NIGHT') tId = 'shift-night';

          return {
            id: a.id,
            scheduleVersionId: a.schedule_version_id,
            staffId: a.staff_id,
            shiftTemplateId: tId,
            localStartDate: a.local_start_date,
            startAtUtc: a.start_at_utc,
            endAtUtc: a.end_at_utc,
            isPinned: a.is_pinned,
            source: a.source as any,
          };
        });
        setAssignments(mapped);

        const report = await validateScheduleVersion(periodData.current_version.id);
        setValidationReport(report);
      }
      setSaveStatus('SAVED');
    } catch {
      setSaveStatus('SAVED');
    }
  };

  useEffect(() => {
    loadScheduleFromBackend();
  }, []);

  // 빠른 룩업 맵 생성: "staffId:date" -> assignment
  const assignmentMap = new Map<string, ShiftAssignment>();
  assignments.forEach((a) => {
    assignmentMap.set(`${a.staffId}:${a.localStartDate}`, a);
  });

  // 셀 편집 (백엔드 실시간 유효성 검사 연동)
  const handleAssignShift = async (templateId: string) => {
    if (!selectedCell || isLocked) return;
    setErrorMessage(null);
    setSaveStatus('SAVING');

    const key = `${selectedCell.staffId}:${selectedCell.date}`;
    const targetAssign = assignmentMap.get(key);
    if (!targetAssign) {
      setSaveStatus('SAVED');
      return;
    }

    const prevTmplId = targetAssign.shiftTemplateId;

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

    try {
      await updateAssignment(versionId, targetAssign.id, {
        shift_template_id: templateId,
        is_pinned: targetAssign.isPinned,
      });

      const report = await validateScheduleVersion(versionId);
      setValidationReport(report);
      setSaveStatus('SAVED');
    } catch (err: any) {
      setAssignments(
        assignments.map((a) => (a.id === targetAssign.id ? { ...a, shiftTemplateId: prevTmplId } : a))
      );
      setSaveStatus('ERROR');
      const detail = err.detail;
      if (detail && detail.code === 'LEGAL_FLOOR_VIOLATION') {
        setErrorMessage(`법적 최저 기준 위반: ${detail.message}`);
      } else {
        setErrorMessage(err.message || '근무 배정 중 오류가 발생했습니다.');
      }
    }
  };

  // 핀 토글
  const handleTogglePin = async () => {
    if (!selectedCell || isLocked) return;
    const key = `${selectedCell.staffId}:${selectedCell.date}`;
    const targetAssign = assignmentMap.get(key);
    if (!targetAssign) return;

    const newPinned = !targetAssign.isPinned;
    const updated = assignments.map((a) => {
      if (a.staffId === selectedCell.staffId && a.localStartDate === selectedCell.date) {
        return {
          ...a,
          isPinned: newPinned,
          source: (newPinned ? 'PINNED' : 'MANUAL') as any,
        };
      }
      return a;
    });
    setAssignments(updated);

    try {
      await updateAssignment(versionId, targetAssign.id, {
        shift_template_id: targetAssign.shiftTemplateId,
        is_pinned: newPinned,
      });
    } catch {
      // 롤백
    }
  };

  // 근무표 확정 발행
  const handlePublish = async () => {
    try {
      setSaveStatus('SAVING');
      await publishSchedule(versionId, false);
      setIsPublished(true);
      setSaveStatus('SAVED');
      alert('근무표가 성공적으로 확정 발행되었습니다.');
    } catch (err: any) {
      setSaveStatus('SAVED');
      if (err.status === 400) {
        const proceed = confirm(
          `[경고] 하드 제약 조건 위반 사항이 있습니다:\n${err.message}\n\n수간호사 승인으로 강제 확정(Override) 하시겠습니까?`
        );
        if (proceed) {
          try {
            await publishSchedule(versionId, true, '수간호사 긴급 승인');
            setIsPublished(true);
            alert('근무표가 관리자 승인으로 강제 확정되었습니다.');
          } catch (innerErr: any) {
            alert(`강제 확정 실패: ${innerErr.message}`);
          }
        }
      } else {
        alert(`확정 실패: ${err.message}`);
      }
    }
  };

  // 일자별 커버리지 계산
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
    const isSufficient = d >= 1 && n >= 1;
    return { d, n, isSufficient };
  };

  return (
    <div className="roster-view">
      {/* 법적 제약 위반 알림 배너 */}
      {errorMessage && (
        <div className="alert-banner">
          <AlertOctagon size={15} className="alert-icon" />
          <span className="alert-text">{errorMessage}</span>
          <button className="alert-dismiss" onClick={() => setErrorMessage(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* 액션 툴바 (Linear Bar) */}
      <div className="workspace-toolbar">
        <div className="toolbar-left">
          <div className="title-group">
            <h2 className="page-heading">전체 근무 매트릭스</h2>
            <span className="period-tag">2026-11</span>
          </div>
          <StatusBadge status={isPublished ? 'PUBLISHED' : 'DRAFT'} />
          <span className={`sync-indicator ${saveStatus.toLowerCase()}`}>
            {saveStatus === 'SAVED' && '동기화됨'}
            {saveStatus === 'SAVING' && '저장 중...'}
            {saveStatus === 'ERROR' && '오류 발생'}
          </span>

          {validationReport && (
            <button
              className={`validation-pill ${validationReport.is_feasible ? 'feasible' : 'infeasible'}`}
              onClick={() => setShowIssueDrawer(!showIssueDrawer)}
            >
              {validationReport.is_feasible ? (
                <>
                  <CheckCircle2 size={13} />
                  <span>적합 (0건)</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={13} />
                  <span>위반 {validationReport.error_count}건</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="toolbar-right">
          <button className="btn-secondary btn-sm" onClick={loadScheduleFromBackend} title="새로고침">
            <RefreshCw size={13} />
            <span>새로고침</span>
          </button>
          <button className="btn-secondary btn-sm" title="실행 취소">
            <Undo2 size={13} />
          </button>
          <button className="btn-secondary btn-sm" title="다시 실행">
            <Redo2 size={13} />
          </button>
          <button
            className={`btn-secondary btn-sm ${isLocked ? 'is-locked' : ''}`}
            onClick={() => setIsLocked(!isLocked)}
          >
            <Lock size={13} />
            <span>{isLocked ? '잠금 해제' : '편집 잠금'}</span>
          </button>
          <button
            className="btn-primary btn-sm"
            onClick={handlePublish}
            disabled={isPublished}
          >
            <CheckCircle2 size={13} />
            <span>{isPublished ? '확정 완료' : '근무표 확정'}</span>
          </button>
        </div>
      </div>

      {/* 팔레트 도구 모음 */}
      <div className="shift-palette">
        <span className="palette-label">근무 팔레트</span>
        <div className="palette-items">
          {MOCK_SHIFT_TEMPLATES.map((tmpl) => (
            <ShiftCell
              key={tmpl.id}
              template={tmpl}
              onClick={() => handleAssignShift(tmpl.id)}
            />
          ))}
        </div>
        {selectedCell && (
          <button className="pin-toggle" onClick={handleTogglePin}>
            <Pin size={12} />
            <span>선택 셀 핀(고정) 토글</span>
          </button>
        )}
        <span className="palette-guide">셀 클릭 후 팔레트를 누르면 변경 및 유효성 검사가 즉시 수행됩니다.</span>
      </div>

      {/* 이슈 드로어 */}
      {showIssueDrawer && validationReport && (
        <div className="drawer-panel">
          <div className="drawer-header">
            <div className="drawer-title">
              <Info size={14} />
              <span>실시간 규칙 검증 결과 ({validationReport.issues.length}건)</span>
            </div>
            <button className="drawer-close-btn" onClick={() => setShowIssueDrawer(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="drawer-list">
            {validationReport.issues.length === 0 ? (
              <p className="drawer-empty">모든 제약 조건을 만족합니다.</p>
            ) : (
              validationReport.issues.map((iss, idx) => (
                <div key={idx} className={`issue-row ${iss.severity.toLowerCase()}`}>
                  <div className="issue-meta">
                    <span className="rule-code">{iss.rule_code}</span>
                    <span className="rule-badge">{iss.severity === 'ERROR' ? '오류' : '주의'}</span>
                    {iss.is_legal_floor && <span className="legal-badge">법적 최저 기준</span>}
                    {iss.date && <span className="issue-date">{iss.date}</span>}
                  </div>
                  <div className="issue-desc">{iss.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 매트릭스 그리드 (Linear Compact Table) */}
      <div className="grid-viewport">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="staff-header-cell sticky-col">간호사 (6인)</th>
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dow = (day + 6) % 7; // 2026-11-01 is Sun (0)
                const isSun = dow === 0;
                const isSat = dow === 6;
                const dows = ['일', '월', '화', '수', '목', '금', '토'];

                return (
                  <th key={day} className={`day-header-cell ${isSun ? 'is-sun' : isSat ? 'is-sat' : ''}`}>
                    <div className="day-num">{day}</div>
                    <div className="day-name">{dows[dow]}</div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {MOCK_STAFF.map((staff) => (
              <tr key={staff.id} className="staff-row">
                <td className="staff-info-cell sticky-col">
                  <div className="staff-meta-box">
                    <span className="staff-name">{staff.name}</span>
                    <div className="staff-badge-row">
                      <span className="staff-code">{staff.staffCode}</span>
                      {staff.skillTags.includes('CHARGE_CAPABLE') && (
                        <span className="role-tag charge">책임</span>
                      )}
                      {staff.skillTags.includes('NEW_GRAD') && (
                        <span className="role-tag grad">신규</span>
                      )}
                      {staff.employmentType === 'PART_TIME' && (
                        <span className="role-tag part">단시간</span>
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
                      className={`shift-matrix-cell ${isSelected ? 'is-selected' : ''}`}
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

          {/* 하단 커버리지 요약 행 */}
          <tfoot>
            <tr className="coverage-footer-row">
              <td className="cov-label-cell sticky-col">
                <span className="cov-main-text">최소 인원 충족</span>
                <span className="cov-sub-text">D ≥ 1 · N ≥ 1</span>
              </td>
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const { d, n, isSufficient } = getDayCoverage(day);

                return (
                  <td key={day} className={`cov-metric-cell ${isSufficient ? 'ok' : 'shortage'}`}>
                    <div className="cov-numbers">
                      <span>D:{d}</span>
                      <span>N:{n}</span>
                    </div>
                    <span className="cov-pill">
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
        .roster-view {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          height: calc(100vh - 84px);
        }

        /* Alert Banner */
        .alert-banner {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          background-color: var(--color-danger-bg);
          border: 1px solid var(--color-danger-border);
          color: var(--color-danger);
          padding: 8px var(--space-3);
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          font-weight: 500;
        }
        .alert-icon {
          flex-shrink: 0;
        }
        .alert-text {
          flex: 1;
        }
        .alert-dismiss {
          color: currentColor;
          opacity: 0.8;
          display: flex;
          align-items: center;
          padding: 2px;
        }

        /* Toolbar */
        .workspace-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: 6px var(--space-3);
          flex-shrink: 0;
        }
        .toolbar-left, .toolbar-right {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .title-group {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-right: 4px;
        }
        .page-heading {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }
        .period-tag {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-muted);
          background-color: var(--color-bg-subtle);
          padding: 1px 5px;
          border-radius: var(--radius-xs);
        }
        .sync-indicator {
          font-size: 11px;
          color: var(--color-text-muted);
        }
        .sync-indicator.error {
          color: var(--color-danger);
        }
        .validation-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 22px;
          padding: 0 8px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 600;
          border: 1px solid transparent;
          cursor: pointer;
        }
        .validation-pill.feasible {
          background-color: #ECFDF5;
          border-color: #A7F3D0;
          color: #047857;
        }
        .validation-pill.infeasible {
          background-color: #FEF3C7;
          border-color: #FDE68A;
          color: #B45309;
        }

        /* Button styles */
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 26px;
          padding: 0 8px;
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
          font-size: 12px;
          font-weight: 500;
          transition: background-color 0.12s, border-color 0.12s;
        }
        .btn-secondary:hover {
          background-color: var(--color-bg-subtle);
          color: var(--color-text-primary);
        }
        .btn-secondary.is-locked {
          background-color: #FEF2F2;
          border-color: #FECACA;
          color: #B91C1C;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 26px;
          padding: 0 10px;
          background-color: var(--color-primary);
          color: var(--color-primary-text);
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 600;
          transition: background-color 0.12s;
        }
        .btn-primary:hover:not(:disabled) {
          background-color: var(--color-primary-hover);
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Palette */
        .shift-palette {
          display: flex;
          align-items: center;
          gap: var(--space-2-5);
          background-color: var(--color-bg-subtle);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: 5px var(--space-3);
          flex-shrink: 0;
        }
        .palette-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-muted);
        }
        .palette-items {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .pin-toggle {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 24px;
          padding: 0 7px;
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: 11px;
          color: var(--color-text-secondary);
        }
        .pin-toggle:hover {
          background-color: var(--color-bg-muted);
          color: var(--color-text-primary);
        }
        .palette-guide {
          margin-left: auto;
          font-size: 11px;
          color: var(--color-text-muted);
        }

        /* Drawer */
        .drawer-panel {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-2) var(--space-3);
          max-height: 180px;
          overflow-y: auto;
          box-shadow: var(--shadow-sm);
        }
        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .drawer-title {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .drawer-close-btn {
          color: var(--color-text-muted);
        }
        .drawer-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .drawer-empty {
          font-size: 12px;
          color: var(--color-text-muted);
          padding: 4px 0;
        }
        .issue-row {
          padding: 6px 8px;
          border-radius: var(--radius-xs);
          border-left: 2px solid;
          font-size: 11px;
        }
        .issue-row.error {
          background-color: #FEF2F2;
          border-left-color: #EF4444;
          color: #991B1B;
        }
        .issue-row.warning {
          background-color: #FFFBEB;
          border-left-color: #F59E0B;
          color: #92400E;
        }
        .issue-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 600;
          margin-bottom: 2px;
        }
        .legal-badge {
          background-color: #FEE2E2;
          color: #991B1B;
          font-size: 10px;
          padding: 0 4px;
          border-radius: 2px;
        }
        .issue-date {
          color: var(--color-text-muted);
          font-weight: 400;
        }
        .issue-desc {
          line-height: 1.3;
        }

        /* Matrix Table */
        .grid-viewport {
          flex: 1;
          overflow: auto;
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
        }
        .matrix-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 1540px;
          font-size: var(--text-xs);
        }
        .sticky-col {
          position: sticky;
          left: 0;
          background-color: var(--color-bg-surface);
          z-index: 5;
        }
        
        .staff-header-cell {
          width: 150px;
          min-width: 150px;
          height: 38px;
          padding: 0 var(--space-3);
          text-align: left;
          font-weight: 600;
          font-size: 12px;
          color: var(--color-text-secondary);
          background-color: var(--color-bg-subtle);
          border-bottom: 1px solid var(--color-border);
          border-right: 1px solid var(--color-border);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .day-header-cell {
          width: 44px;
          min-width: 44px;
          padding: 4px 0;
          text-align: center;
          background-color: var(--color-bg-subtle);
          border-bottom: 1px solid var(--color-border);
          border-right: 1px solid var(--color-border-subtle);
          position: sticky;
          top: 0;
          z-index: 4;
        }
        .day-num {
          font-weight: 600;
          font-size: 12px;
          line-height: 1.1;
          font-feature-settings: "tnum";
        }
        .day-name {
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .day-header-cell.is-sun .day-name { color: #DC2626; font-weight: 600; }
        .day-header-cell.is-sat .day-name { color: #2563EB; font-weight: 600; }

        .staff-row:hover .staff-info-cell {
          background-color: #FAFAFA;
        }
        .staff-info-cell {
          padding: 6px var(--space-3);
          border-bottom: 1px solid var(--color-border-subtle);
          border-right: 1px solid var(--color-border);
        }
        .staff-meta-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .staff-name {
          font-weight: 600;
          font-size: 13px;
          color: var(--color-text-primary);
        }
        .staff-badge-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .staff-code {
          font-size: 10px;
          color: var(--color-text-muted);
          font-feature-settings: "tnum";
        }
        .role-tag {
          font-size: 9px;
          padding: 0 4px;
          border-radius: 2px;
          font-weight: 600;
          line-height: 1.3;
        }
        .role-tag.charge { background-color: #EEF2FF; color: #4338CA; }
        .role-tag.grad { background-color: #FEF3C7; color: #B45309; }
        .role-tag.part { background-color: #F3E8FF; color: #7E22CE; }

        .shift-matrix-cell {
          padding: 3px 2px;
          text-align: center;
          border-bottom: 1px solid var(--color-border-subtle);
          border-right: 1px solid var(--color-border-subtle);
          cursor: pointer;
        }
        .shift-matrix-cell:hover {
          background-color: rgba(0, 0, 0, 0.02);
        }
        .shift-matrix-cell.is-selected {
          background-color: var(--color-bg-selected);
          box-shadow: inset 0 0 0 1.5px var(--color-accent);
        }

        /* Coverage Footer */
        .coverage-footer-row {
          position: sticky;
          bottom: 0;
          background-color: #F8FAFC;
          z-index: 6;
        }
        .cov-label-cell {
          padding: 6px var(--space-3);
          border-top: 1px solid var(--color-border);
          border-right: 1px solid var(--color-border);
          background-color: #F8FAFC;
          display: flex;
          flex-direction: column;
        }
        .cov-main-text {
          font-weight: 600;
          font-size: 11px;
          color: var(--color-text-primary);
        }
        .cov-sub-text {
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .cov-metric-cell {
          padding: 4px 2px;
          text-align: center;
          border-top: 1px solid var(--color-border);
          border-right: 1px solid var(--color-border-subtle);
          font-feature-settings: "tnum";
        }
        .cov-numbers {
          display: flex;
          justify-content: center;
          gap: 3px;
          font-size: 10px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        .cov-pill {
          display: inline-block;
          font-size: 9px;
          font-weight: 600;
          padding: 0 4px;
          border-radius: 2px;
          margin-top: 1px;
        }
        .cov-metric-cell.ok .cov-pill {
          background-color: #DCFCE7;
          color: #166534;
        }
        .cov-metric-cell.shortage .cov-pill {
          background-color: #FEE2E2;
          color: #991B1B;
        }
      `}</style>
    </div>
  );
};
