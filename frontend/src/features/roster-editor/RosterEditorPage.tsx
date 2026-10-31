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
  Info
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

        // ApiShiftAssignment -> 프론트엔드 ShiftAssignment 매핑
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

        // 검증 리포트 조회
        const report = await validateScheduleVersion(periodData.current_version.id);
        setValidationReport(report);
      }
      setSaveStatus('SAVED');
    } catch {
      // 로컬 개발 중 백엔드 연결 불가 시 Mock 유지
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

    // 낙관적 UI 업데이트
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

    // 백엔드 API 호출
    try {
      await updateAssignment(versionId, targetAssign.id, {
        shift_template_id: templateId,
        is_pinned: targetAssign.isPinned,
      });

      // 검증 보고서 갱신
      const report = await validateScheduleVersion(versionId);
      setValidationReport(report);
      setSaveStatus('SAVED');
    } catch (err: any) {
      // 위반(특히 legal_floor: H-REST, H-ELIG 등) 발생 시 롤백 및 에러 표시
      setAssignments(
        assignments.map((a) => (a.id === targetAssign.id ? { ...a, shiftTemplateId: prevTmplId } : a))
      );
      setSaveStatus('ERROR');
      const detail = err.detail;
      if (detail && detail.code === 'LEGAL_FLOOR_VIOLATION') {
        setErrorMessage(`⚠️ 법적 최저 기준 위반: ${detail.message}`);
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
        // 일반 하드 위반 존재 시 관리자 승인 옵션 제공
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
    const isSufficient = d >= 1 && n >= 1;
    return { d, n, isSufficient };
  };

  return (
    <div className="roster-editor-container">
      {/* 법적 제약 위반 알림 배너 */}
      {errorMessage && (
        <div className="error-banner">
          <AlertOctagon size={20} className="banner-icon" />
          <span className="banner-text">{errorMessage}</span>
          <button className="banner-close" onClick={() => setErrorMessage(null)}>✕</button>
        </div>
      )}

      {/* 툴바 */}
      <div className="roster-toolbar">
        <div className="left-tools">
          <h2 className="title">전체 근무표 매트릭스</h2>
          <span className="period-badge">2026-11 (30일)</span>
          <StatusBadge status={isPublished ? 'PUBLISHED' : 'DRAFT'} />
          <span className={`save-status ${saveStatus.toLowerCase()}`}>
            {saveStatus === 'SAVED' && '✓ 동기화됨'}
            {saveStatus === 'SAVING' && '동기화 중...'}
            {saveStatus === 'ERROR' && '⚠️ 동기화 실패'}
          </span>

          {/* 유효성 검사 요약 배지 */}
          {validationReport && (
            <button
              className={`validation-badge-btn ${validationReport.is_feasible ? 'valid' : 'invalid'}`}
              onClick={() => setShowIssueDrawer(!showIssueDrawer)}
              title="클릭하여 제약 검증 상세 확인"
            >
              {validationReport.is_feasible ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>적합 (Feasible)</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={15} />
                  <span>위반 {validationReport.error_count}건 · 경고 {validationReport.warning_count}건</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="right-tools">
          <button className="tool-btn" onClick={loadScheduleFromBackend} title="새로고침">
            <RefreshCw size={15} /> 동기화
          </button>
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
            onClick={handlePublish}
            disabled={isPublished}
          >
            <CheckCircle2 size={16} />
            <span>{isPublished ? '확정 완료됨' : '근무표 최종 확정'}</span>
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
        <span className="help-text">💡 셀을 클릭한 후 팔레트의 근무를 누르면 백엔드 검증을 거쳐 즉시 반영됩니다.</span>
      </div>

      {/* 제약 검증 상세 드로어 */}
      {showIssueDrawer && validationReport && (
        <div className="issue-drawer">
          <div className="drawer-header">
            <div className="drawer-title">
              <Info size={16} />
              <span>실시간 검증 리포트 (총 {validationReport.issues.length}건)</span>
            </div>
            <button className="drawer-close" onClick={() => setShowIssueDrawer(false)}>✕</button>
          </div>
          <div className="drawer-body">
            {validationReport.issues.length === 0 ? (
              <p className="empty-issues">위반 또는 주의가 필요한 규칙이 없습니다.</p>
            ) : (
              validationReport.issues.map((iss, idx) => (
                <div key={idx} className={`issue-card ${iss.severity.toLowerCase()}`}>
                  <div className="issue-top">
                    <span className="issue-code">{iss.rule_code}</span>
                    <span className="issue-severity">{iss.severity === 'ERROR' ? '오류 (차단)' : '주의 (경고)'}</span>
                    {iss.is_legal_floor && <span className="legal-tag">법적 최소 기준</span>}
                    {iss.date && <span className="issue-date">{iss.date}</span>}
                  </div>
                  <div className="issue-msg">{iss.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
                <span className="sub">(D ≥ 1, N ≥ 1)</span>
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
        .error-banner {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          background: #fef2f2;
          border: 1px solid #f87171;
          color: #991b1b;
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          font-weight: 500;
          font-size: var(--text-sm);
        }
        .banner-icon {
          flex-shrink: 0;
          color: #dc2626;
        }
        .banner-text {
          flex: 1;
        }
        .banner-close {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          color: #991b1b;
        }
        .validation-badge-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: var(--text-xs);
          font-weight: 600;
          border: none;
          cursor: pointer;
        }
        .validation-badge-btn.valid {
          background: #dcfce7;
          color: #166534;
        }
        .validation-badge-btn.invalid {
          background: #fef3c7;
          color: #92400e;
        }
        .issue-drawer {
          background: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          max-height: 200px;
          overflow-y: auto;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-2);
          font-weight: 600;
          font-size: var(--text-sm);
        }
        .drawer-close {
          background: none;
          border: none;
          cursor: pointer;
        }
        .drawer-body {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .issue-card {
          padding: var(--space-2);
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
        }
        .issue-card.error {
          background: #fef2f2;
          border-left: 3px solid #ef4444;
        }
        .issue-card.warning {
          background: #fffbeb;
          border-left: 3px solid #f59e0b;
        }
        .issue-top {
          display: flex;
          gap: 6px;
          align-items: center;
          margin-bottom: 2px;
          font-weight: 600;
        }
        .legal-tag {
          background: #fee2e2;
          color: #b91c1c;
          padding: 1px 4px;
          border-radius: 2px;
          font-size: 10px;
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
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }
        .period-badge {
          background: var(--color-bg-subtle);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          font-weight: 600;
        }
        .save-status {
          font-size: var(--text-xs);
          color: var(--color-text-muted);
        }
        .save-status.error {
          color: #dc2626;
          font-weight: 600;
        }
        .right-tools {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .tool-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 32px;
          padding: 0 var(--space-3);
          background: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          font-weight: 500;
          cursor: pointer;
        }
        .tool-btn.locked {
          background: var(--color-status-danger-bg);
          color: var(--color-status-danger-text);
          border-color: var(--color-status-danger-border);
        }
        .publish-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 32px;
          padding: 0 var(--space-4);
          background: var(--color-primary);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          font-weight: 600;
          cursor: pointer;
        }
        .palette-bar {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          background: var(--color-bg-subtle);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
        }
        .pal-label {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        .pin-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          cursor: pointer;
        }
        .help-text {
          margin-left: auto;
          font-size: var(--text-xs);
          color: var(--color-text-muted);
        }
        .grid-scroll-wrapper {
          flex: 1;
          overflow: auto;
          background: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        .roster-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 1600px;
        }
        .sticky-col {
          position: sticky;
          left: 0;
          z-index: 10;
          background: var(--color-bg-surface);
        }
        .header-cell {
          position: sticky;
          top: 0;
          z-index: 9;
          background: var(--color-bg-subtle);
          border-bottom: 2px solid var(--color-border);
          border-right: 1px solid var(--color-border);
          padding: var(--space-2);
          text-align: center;
        }
        .staff-head {
          z-index: 20;
          width: 160px;
          min-width: 160px;
          text-align: left;
          padding-left: var(--space-3);
          font-size: var(--text-xs);
          font-weight: 700;
        }
        .day-head .d-num {
          font-size: var(--text-xs);
          font-weight: 700;
        }
        .day-head .d-name {
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .day-head.sun .d-name { color: var(--color-status-danger-text); }
        .day-head.sat .d-name { color: var(--color-primary); }
        .staff-cell {
          padding: var(--space-2) var(--space-3);
          border-bottom: 1px solid var(--color-border);
          border-right: 2px solid var(--color-border);
        }
        .staff-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .s-name {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-text-primary);
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
          font-weight: 600;
        }
        .skill-badge.charge { background: #e0e7ff; color: #3730a3; }
        .skill-badge.grad { background: #fef3c7; color: #92400e; }
        .skill-badge.part { background: #f3e8ff; color: #6b21a8; }
        .grid-cell {
          padding: 4px;
          border-bottom: 1px solid var(--color-border);
          border-right: 1px solid var(--color-border);
          text-align: center;
          cursor: pointer;
        }
        .grid-cell.selected {
          outline: 2px solid var(--color-primary);
          outline-offset: -2px;
          background: rgba(14, 165, 233, 0.08);
        }
        .coverage-row {
          position: sticky;
          bottom: 0;
          z-index: 10;
          background: #f8fafc;
        }
        .cov-header {
          padding: var(--space-2) var(--space-3);
          border-top: 2px solid var(--color-border);
          border-right: 2px solid var(--color-border);
          font-size: var(--text-xs);
          display: flex;
          flex-direction: column;
        }
        .cov-header .sub {
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .cov-cell {
          padding: 4px;
          border-top: 2px solid var(--color-border);
          border-right: 1px solid var(--color-border);
          text-align: center;
          font-size: 10px;
        }
        .cov-cell.ok { background: #f0fdf4; }
        .cov-cell.danger { background: #fef2f2; }
        .cov-counts {
          font-weight: 600;
          margin-bottom: 2px;
        }
        .cov-badge {
          display: inline-block;
          font-size: 9px;
          padding: 1px 4px;
          border-radius: 2px;
        }
        .cov-cell.ok .cov-badge { background: #bbf7d0; color: #166534; }
        .cov-cell.danger .cov-badge { background: #fecaca; color: #991b1b; }
      `}</style>
    </div>
  );
};
