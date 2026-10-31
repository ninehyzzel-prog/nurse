import React, { useState, useEffect } from 'react';
import { MOCK_SHIFT_TEMPLATES, generateMockAssignments } from '../../data/mockData';
import type { ShiftAssignment } from '../../types';
import { ShiftCell } from '../../components/ui/ShiftCell';
import { TossIcon } from '../../components/ui/TossIcon';
import { 
  ChevronLeft, 
  ChevronRight, 
  X,
  Check,
  Plus,
  Download
} from 'lucide-react';
import {
  fetchSchedulePeriod,
  updateAssignment,
  validateScheduleVersion,
  applyScheduleCandidate,
  fetchLatestScheduleRun,
  getExcelExportUrl,
  getCsvExportUrl,
  type ValidationReport,
  type ApiCandidate,
} from '../../api/scheduleApi';

type DrawerMode = 'NONE' | 'AI_OPTIMIZE' | 'CONFLICT' | 'REQUEST' | 'STAFF';

export const RosterEditorPage: React.FC = () => {
  // 스케줄 데이터 상태
  const [assignments, setAssignments] = useState<ShiftAssignment[]>(generateMockAssignments());
  const [versionId, setVersionId] = useState<string>('version-2026-11-v1');
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 자동 최적화 솔버 상태
  const [candidates, setCandidates] = useState<ApiCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number>(1);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // 슬라이드 드로어(Drawer) 상태
  const [activeDrawer, setActiveDrawer] = useState<DrawerMode>('NONE');

  // 뷰 모드: 월간 / 주간 / 간호사별
  const [viewMode, setViewMode] = useState<'MONTH' | 'WEEK' | 'STAFF'>('MONTH');

  // 근무 신청 폼 상태
  const [reqDates, setReqDates] = useState<number[]>([10, 11, 12]);
  const [reqType, setReqType] = useState('연차 휴가');
  const [reqReason, setReqReason] = useState('');

  const templateMap = new Map(MOCK_SHIFT_TEMPLATES.map((t) => [t.id, t]));

  // 초기 백엔드 스케줄 로드
  useEffect(() => {
    const loadBackend = async () => {
      try {
        const periodData = await fetchSchedulePeriod('ward-obgyn', 'period-2026-11');
        if (periodData.current_version) {
          setVersionId(periodData.current_version.id);

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

        const latestRun = await fetchLatestScheduleRun('period-2026-11');
        if (latestRun && latestRun.candidates.length > 0) {
          setCandidates(latestRun.candidates);
        }
      } catch {
        // 목 데이터 유지
      }
    };
    loadBackend();
  }, []);

  // 10월 1~31일 표준 배정 맵
  const OCT_REF_SHIFTS: Record<number, string> = {
    1: 'shift-off', 2: 'shift-day', 3: 'shift-day', 4: 'shift-night', 5: 'shift-off',
    6: 'shift-day', 7: 'shift-day', 8: 'shift-night', 9: 'shift-night', 10: 'shift-off',
    11: 'shift-off', 12: 'shift-day', 13: 'shift-night', 14: 'shift-off', 15: 'shift-day',
    16: 'shift-day', 17: 'shift-off', 18: 'shift-off', 19: 'shift-night', 20: 'shift-day',
    21: 'shift-off', 22: 'shift-day', 23: 'shift-night', 24: 'shift-night', 25: 'shift-off',
    26: 'shift-day', 27: 'shift-day', 28: 'shift-day', 29: 'shift-off', 30: 'shift-night', 31: 'shift-night'
  };

  // 이은솔 간호사(staff-1) 배정
  const currentStaffId = 'staff-1';
  const myAssignments = assignments.filter((a) => a.staffId === currentStaffId);
  const myAssignmentMap = new Map<string, ShiftAssignment>();
  myAssignments.forEach((a) => {
    myAssignmentMap.set(a.localStartDate, a);
  });

  // 셀 클릭하여 근무 변경
  const handleToggleCellShift = async (dateStr: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const existing = myAssignmentMap.get(dateStr);
    if (!existing) return;

    let nextTmplId = 'shift-day';
    if (existing.shiftTemplateId === 'shift-day') nextTmplId = 'shift-night';
    else if (existing.shiftTemplateId === 'shift-night') nextTmplId = 'shift-off';
    else nextTmplId = 'shift-day';

    setAssignments((prev) =>
      prev.map((a) =>
        a.staffId === currentStaffId && a.localStartDate === dateStr
          ? { ...a, shiftTemplateId: nextTmplId, source: 'MANUAL' }
          : a
      )
    );

    try {
      await updateAssignment(versionId, existing.id, {
        shift_template_id: nextTmplId,
        is_pinned: existing.isPinned,
      });
      const report = await validateScheduleVersion(versionId);
      setValidationReport(report);
      setSuccessMessage(`${dateStr} 근무가 변경되었습니다.`);
    } catch (err: any) {
      setErrorMessage(err.message || '근무 변경에 실패했습니다.');
    }
  };

  // AI 편성안 적용 핸들러
  const handleApplyCandidate = async (candidateId: number) => {
    try {
      setIsApplying(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await applyScheduleCandidate('period-2026-11', String(candidateId));
      if (res && res.version_id) {
        setVersionId(res.version_id);
        setValidationReport(res.validation_report);

        const periodData = await fetchSchedulePeriod('ward-obgyn', 'period-2026-11');
        if (periodData.current_version) {
          const mapped = periodData.current_version.assignments.map((a: any) => {
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
        }

        setSelectedCandidate(candidateId);
        setSuccessMessage(`후보안 ${candidateId}번이 성공적으로 배정되었습니다.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || '후보안 적용에 실패했습니다.');
    } finally {
      setIsApplying(false);
    }
  };

  const candBalanced = candidates.find((c) => c.name.includes('균형')) || candidates[0];
  const candPref = candidates.find((c) => c.name.includes('희망')) || candidates[1];
  const candFatigue = candidates.find((c) => c.name.includes('피로')) || candidates[2];

  // 10월 한 달 31개 날짜 목록
  const calendarCells = Array.from({ length: 35 }).map((_, idx) => {
    const day = idx - 3; // 10월 1일은 목요일(index 4)
    if (day < 1 || day > 31) {
      return { day: day < 1 ? 27 + day : day - 31, isCurrentMonth: false };
    }
    return { day, isCurrentMonth: true };
  });

  return (
    <div className="linear-roster-container">
      {/* 1. 상단 Linear 스타일 툴바 */}
      <header className="roster-toolbar">
        {/* 좌측: 탐색 및 뷰 컨트롤 */}
        <div className="toolbar-left">
          <div className="month-title-wrap">
            <h2 className="month-heading">2026년 10월</h2>
            <div className="month-nav-group">
              <button className="nav-icon-btn" aria-label="이전 달"><ChevronLeft size={16} /></button>
              <button className="nav-icon-btn" aria-label="다음 달"><ChevronRight size={16} /></button>
              <button className="btn-today-text">오늘</button>
            </div>
          </div>

          <div className="view-mode-tabs">
            <button 
              className={`view-tab ${viewMode === 'MONTH' ? 'active' : ''}`}
              onClick={() => setViewMode('MONTH')}
            >
              월간
            </button>
            <button 
              className={`view-tab ${viewMode === 'WEEK' ? 'active' : ''}`}
              onClick={() => setViewMode('WEEK')}
            >
              주간
            </button>
            <button 
              className={`view-tab ${viewMode === 'STAFF' ? 'active' : ''}`}
              onClick={() => setViewMode('STAFF')}
            >
              간호사별
            </button>
          </div>
        </div>

        {/* 중앙: 미니멀 통계 지표 (도넛 제거, 텍스트 카운터) */}
        <div className="toolbar-center">
          <div className="metric-pill">
            <span className="m-label">근무일</span>
            <span className="m-val font-mono">21일</span>
            <span className="m-divider">/</span>
            <span className="m-label">OFF</span>
            <span className="m-val font-mono">10일</span>
          </div>

          <div className="shift-counts-group">
            <span className="count-tag d">D <strong>8</strong></span>
            <span className="count-tag n">N <strong>8</strong></span>
            <span className="count-tag off">OFF <strong>10</strong></span>
          </div>

          <div className="fatigue-score-tag" title="병동 평균(96점) 대비 우수">
            <span className="score-dot" />
            <span className="score-text">부담 점수 <strong>84점</strong> (-12)</span>
          </div>

          {validationReport && (
            <div className={`validation-status-pill ${validationReport.is_feasible ? 'valid' : 'invalid'}`} title="규칙 준수 여부">
              {validationReport.is_feasible ? (
                <>
                  <TossIcon name="check" size={12} style={{ marginRight: '4px' }} />
                  <span>적합 (규칙 100% 준수)</span>
                </>
              ) : (
                <>
                  <TossIcon name="warning" size={12} style={{ marginRight: '4px' }} />
                  <span>위반 {validationReport.error_count}건</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* 우측: 서랍(Drawer) 트리거 액션 버튼 */}
        <div className="toolbar-right">
          <button 
            className={`action-btn optimize ${activeDrawer === 'AI_OPTIMIZE' ? 'active' : ''}`}
            onClick={() => setActiveDrawer(activeDrawer === 'AI_OPTIMIZE' ? 'NONE' : 'AI_OPTIMIZE')}
          >
            <TossIcon name="robot" size={14} style={{ marginRight: '4px' }} />
            <span>AI 최적화</span>
          </button>

          <button 
            className={`action-btn conflict ${activeDrawer === 'CONFLICT' ? 'active' : ''}`}
            onClick={() => setActiveDrawer(activeDrawer === 'CONFLICT' ? 'NONE' : 'CONFLICT')}
          >
            <TossIcon name="warning" size={14} style={{ marginRight: '4px' }} />
            <span>OFF 충돌 (1)</span>
          </button>

          <button 
            className={`action-btn subtle ${activeDrawer === 'REQUEST' ? 'active' : ''}`}
            onClick={() => setActiveDrawer(activeDrawer === 'REQUEST' ? 'NONE' : 'REQUEST')}
          >
            <TossIcon name="calendar" size={14} style={{ marginRight: '4px' }} />
            <span>신청 관리</span>
          </button>

          <button 
            className={`action-btn subtle ${activeDrawer === 'STAFF' ? 'active' : ''}`}
            onClick={() => setActiveDrawer(activeDrawer === 'STAFF' ? 'NONE' : 'STAFF')}
          >
            <TossIcon name="people" size={14} style={{ marginRight: '4px' }} />
            <span>인력 현황</span>
          </button>

          <div className="export-btn-group">
            <button 
              className="action-btn export-btn"
              title="병원 공식 서식 엑셀 파일 다운로드"
              onClick={() => window.open(getExcelExportUrl(versionId), '_blank')}
            >
              <Download size={13} style={{ marginRight: '4px' }} />
              <span>엑셀 (.xlsx)</span>
            </button>
            <button 
              className="action-btn export-btn"
              title="한국어 호환 UTF-8-BOM CSV 다운로드"
              onClick={() => window.open(getCsvExportUrl(versionId), '_blank')}
            >
              <Download size={13} style={{ marginRight: '4px' }} />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* 시스템 알림 배너 (있을 때만 표시) */}
      {errorMessage && (
        <div className="linear-banner error">
          <TossIcon name="warning" size={14} style={{ marginRight: '4px' }} />
          <span>{errorMessage}</span>
          <button className="banner-close" onClick={() => setErrorMessage(null)}><X size={12} /></button>
        </div>
      )}
      {successMessage && (
        <div className="linear-banner success">
          <TossIcon name="check" size={14} style={{ marginRight: '4px' }} />
          <span>{successMessage}</span>
          <button className="banner-close" onClick={() => setSuccessMessage(null)}><X size={12} /></button>
        </div>
      )}

      {/* 2. 메인 와이드 작업 영역 (캘린더 + 우측 슬라이드 패널) */}
      <div className="roster-workspace">
        {/* Full-Width 캘린더 그리드 */}
        <div className="calendar-viewport">
          {/* 요일 헤더 */}
          <div className="grid-dow-header">
            <div className="dow-cell sun">일</div>
            <div className="dow-cell">월</div>
            <div className="dow-cell">화</div>
            <div className="dow-cell">수</div>
            <div className="dow-cell">목</div>
            <div className="dow-cell">금</div>
            <div className="dow-cell sat">토</div>
          </div>

          {/* 35칸 캘린더 그리드 */}
          <div className="grid-body">
            {calendarCells.map((cell, idx) => {
              const { day, isCurrentMonth } = cell;
              const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
              const assign = isCurrentMonth ? myAssignmentMap.get(dateStr) : undefined;
              const isManualModified = assign && assign.source === 'MANUAL';
              const refTmplId = isManualModified ? assign.shiftTemplateId : (OCT_REF_SHIFTS[day] || 'shift-off');
              const tmpl = isCurrentMonth ? templateMap.get(refTmplId) : undefined;
              const dow = idx % 7;
              const isSun = dow === 0;
              const isSat = dow === 6;

              return (
                <div 
                  key={idx} 
                  className={`grid-cell ${!isCurrentMonth ? 'other-month' : ''}`}
                  onClick={() => isCurrentMonth && handleToggleCellShift(dateStr)}
                >
                  <div className="cell-header">
                    <span className={`cell-day-num font-mono ${isSun ? 'sun' : isSat ? 'sat' : ''}`}>
                      {day}
                    </span>
                    {isCurrentMonth && day === 9 && (
                      <span className="subtle-holiday">한글날</span>
                    )}
                    {isCurrentMonth && day === 3 && (
                      <span className="cell-note-dot pink" title="희망 근무 반영">
                        <TossIcon name="heart" size={12} />
                      </span>
                    )}
                    {isCurrentMonth && day === 21 && (
                      <span className="cell-note-dot blue" title="신청 승인">
                        <TossIcon name="sparkles" size={12} />
                      </span>
                    )}
                    {isCurrentMonth && day === 31 && (
                      <span className="cell-note-icon" title="휴가 예정">
                        <TossIcon name="airplane" size={12} />
                      </span>
                    )}
                  </div>

                  <div className="cell-content">
                    {isCurrentMonth && (
                      <ShiftCell 
                        template={tmpl} 
                        isPinned={assign?.isPinned} 
                      />
                    )}
                  </div>

                  {/* 병동 전체 배정 요약 인디케이터 (Linear 스타일) */}
                  {isCurrentMonth && (
                    <div className="cell-footer">
                      <span className="staff-indicator font-mono">D 4 · N 3</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. 우측 슬라이드 드로어 (Drawer / Side Sheet) */}
        {activeDrawer !== 'NONE' && (
          <aside className="linear-drawer">
            <div className="drawer-header">
              <div className="drawer-title-group">
                {activeDrawer === 'AI_OPTIMIZE' && (
                  <>
                    <TossIcon name="robot" size={18} style={{ marginRight: '6px' }} />
                    <h3>AI 최적화 자동 편성</h3>
                  </>
                )}
                {activeDrawer === 'CONFLICT' && (
                  <>
                    <TossIcon name="warning" size={18} style={{ marginRight: '6px' }} />
                    <h3>10월 10일 OFF 신청 충돌</h3>
                  </>
                )}
                {activeDrawer === 'REQUEST' && (
                  <>
                    <TossIcon name="calendar" size={18} style={{ marginRight: '6px' }} />
                    <h3>근무 및 휴가 신청</h3>
                  </>
                )}
                {activeDrawer === 'STAFF' && (
                  <>
                    <TossIcon name="people" size={18} style={{ marginRight: '6px' }} />
                    <h3>병동 간호사 인력 현황</h3>
                  </>
                )}
              </div>
              <button className="drawer-close-btn" onClick={() => setActiveDrawer('NONE')}>
                <X size={16} />
              </button>
            </div>

            <div className="drawer-body">
              {/* 드로어 1: AI 최적화 편성안 */}
              {activeDrawer === 'AI_OPTIMIZE' && (
                <div className="drawer-section">
                  <p className="drawer-desc">
                    OR-Tools CP-SAT 솔버가 공정성, 간호사 희망, 피로도를 반영해 산출한 3가지 최적 편성안입니다.
                  </p>

                  <div className="candidate-list">
                    {/* 균형형 (추천) */}
                    <div className={`cand-box ${selectedCandidate === 1 ? 'selected' : ''}`}>
                      <div className="cand-box-header">
                        <div className="cand-title-wrap">
                          <span className="cand-badge rec">추천</span>
                          <span className="cand-name">{candBalanced?.name || '균형형 (추천)'}</span>
                        </div>
                        <span className="cand-score font-mono">
                          {candBalanced ? Math.round(candBalanced.total_score) : 92}<small>점</small>
                        </span>
                      </div>
                      <ul className="cand-spec-list">
                        <li><Check size={12} /> 공정성 우선 배정</li>
                        <li><Check size={12} /> 희망 근무 반영률 87%</li>
                        <li><Check size={12} /> 안정적 병동 인력 운영</li>
                      </ul>
                      <button 
                        className="btn-apply-plan primary"
                        disabled={isApplying}
                        onClick={() => handleApplyCandidate(1)}
                      >
                        {isApplying && selectedCandidate === 1 ? '적용 중...' : '이 편성안으로 적용'}
                      </button>
                    </div>

                    {/* 희망형 */}
                    <div className={`cand-box ${selectedCandidate === 2 ? 'selected' : ''}`}>
                      <div className="cand-box-header">
                        <span className="cand-name">{candPref?.name || '희망형'}</span>
                        <span className="cand-score font-mono">
                          {candPref ? Math.round(candPref.total_score) : 86}<small>점</small>
                        </span>
                      </div>
                      <ul className="cand-spec-list">
                        <li><Check size={12} /> 간호사 희망 우선 (94% 반영)</li>
                        <li><Check size={12} /> 일부 개인별 편차 발생 가능</li>
                      </ul>
                      <button 
                        className="btn-apply-plan outline"
                        disabled={isApplying}
                        onClick={() => handleApplyCandidate(2)}
                      >
                        미리보기 및 적용
                      </button>
                    </div>

                    {/* 피로 최소형 */}
                    <div className={`cand-box ${selectedCandidate === 3 ? 'selected' : ''}`}>
                      <div className="cand-box-header">
                        <span className="cand-name">{candFatigue?.name || '피로 최소형'}</span>
                        <span className="cand-score font-mono">
                          {candFatigue ? Math.round(candFatigue.total_score) : 89}<small>점</small>
                        </span>
                      </div>
                      <ul className="cand-spec-list">
                        <li><Check size={12} /> 연속근무 3일 이내 제한</li>
                        <li><Check size={12} /> 야간 후 34시간 충분 휴식</li>
                      </ul>
                      <button 
                        className="btn-apply-plan outline"
                        disabled={isApplying}
                        onClick={() => handleApplyCandidate(3)}
                      >
                        미리보기 및 적용
                      </button>
                    </div>
                  </div>

                  <div className="ai-insight-box">
                    <span className="insight-title"><TossIcon name="sparkles" size={14} style={{ marginRight: '4px' }} /> 배정 주요 근거</span>
                    <p>• 10월 10일 OFF 신청 3명 충돌 건은 최근 주말 근무 이력과 공정성 점수를 비교하여 이은솔 간호사가 우선 승인되었습니다.</p>
                    <p>• 10월 27일 나이트 인력 부족 구간에 숙련 간호사를 우선 배치했습니다.</p>
                  </div>
                </div>
              )}

              {/* 드로어 2: OFF 충돌 안내 */}
              {activeDrawer === 'CONFLICT' && (
                <div className="drawer-section">
                  <div className="conflict-banner">
                    <TossIcon name="warning" size={15} style={{ marginRight: '6px' }} />
                    <span>10월 10일에 간호사 3명이 동시에 OFF를 신청했습니다.</span>
                  </div>

                  <div className="rank-table-wrap">
                    <div className="rank-item approved">
                      <div className="rank-left">
                        <span className="rank-num">1</span>
                        <div className="rank-info">
                          <span className="rank-name">이은솔 간호사</span>
                          <span className="rank-sub">최근 3개월 주말 OFF 2회</span>
                        </div>
                      </div>
                      <div className="rank-right">
                        <span className="score font-mono">85점</span>
                        <span className="status-pill green">승인됨</span>
                      </div>
                    </div>

                    <div className="rank-item suggest">
                      <div className="rank-left">
                        <span className="rank-num">2</span>
                        <div className="rank-info">
                          <span className="rank-name">김지은 선임간호사</span>
                          <span className="rank-sub">최근 3개월 주말 OFF 5회</span>
                        </div>
                      </div>
                      <div className="rank-right">
                        <span className="score font-mono">67점</span>
                        <span className="status-pill blue">대체일 추천</span>
                      </div>
                    </div>

                    <div className="rank-item rejected">
                      <div className="rank-left">
                        <span className="rank-num">3</span>
                        <div className="rank-info">
                          <span className="rank-name">박수민 간호사</span>
                          <span className="rank-sub">최근 3개월 주말 OFF 4회</span>
                        </div>
                      </div>
                      <div className="rank-right">
                        <span className="score font-mono">62점</span>
                        <span className="status-pill gray">반려</span>
                      </div>
                    </div>
                  </div>

                  <div className="suggest-action-box">
                    <span className="suggest-title">추천 대체일 제안</span>
                    <p className="suggest-desc">10월 17일(토) 또는 24일(토)은 병동 최소 인력이 여유로워 승인 가능합니다.</p>
                    <button className="btn-send-suggest" onClick={() => alert('김지은/박수민 간호사에게 대체일 제안 알림을 발송했습니다.')}>
                      대체 휴무일 제안 알림 보내기
                    </button>
                  </div>
                </div>
              )}

              {/* 드로어 3: 근무 신청 */}
              {activeDrawer === 'REQUEST' && (
                <div className="drawer-section">
                  <div className="field-block">
                    <label className="input-label">신청 날짜</label>
                    <div className="date-chips-wrap">
                      {reqDates.map((d) => (
                        <span key={d} className="date-chip">
                          10월 {d}일
                          <button onClick={() => setReqDates(reqDates.filter((x) => x !== d))}><X size={10} /></button>
                        </span>
                      ))}
                      <button 
                        className="btn-add-date"
                        onClick={() => {
                          const nextD = Math.max(...reqDates, 10) + 1;
                          if (nextD <= 31) setReqDates([...reqDates, nextD]);
                        }}
                      >
                        <Plus size={11} /> 추가
                      </button>
                    </div>
                  </div>

                  <div className="field-block">
                    <label className="input-label">신청 유형</label>
                    <select className="linear-select" value={reqType} onChange={(e) => setReqType(e.target.value)}>
                      <option value="연차 휴가">연차 휴가</option>
                      <option value="OFF 신청">OFF 신청</option>
                      <option value="희망 근무">희망 근무 (데이/나이트)</option>
                      <option value="근무 불가">근무 불가일 등록</option>
                    </select>
                  </div>

                  <div className="field-block">
                    <label className="input-label">사유 (선택)</label>
                    <textarea 
                      className="linear-textarea" 
                      placeholder="신청 사유를 입력하세요 (선택 사항)"
                      rows={3}
                      value={reqReason}
                      onChange={(e) => setReqReason(e.target.value)}
                    />
                  </div>

                  <button className="btn-submit-req" onClick={() => {
                    alert('근무 신청이 등록되었습니다.');
                    setActiveDrawer('NONE');
                  }}>
                    신청서 제출하기
                  </button>
                </div>
              )}

              {/* 드로어 4: 병동 인력 현황 */}
              {activeDrawer === 'STAFF' && (
                <div className="drawer-section">
                  <div className="staff-list-linear">
                    {[
                      { name: '이은솔', role: '간호사', status: '재직', pref: 'D 선호', count: 'D 8 · N 8 · OFF 10' },
                      { name: '김지은', role: '선임간호사', status: '재직', pref: 'N 선호', count: 'D 6 · N 11 · OFF 9' },
                      { name: '박수민', role: '간호사', status: '재직', pref: '모든 근무', count: 'D 9 · N 8 · OFF 9' },
                      { name: '최서연', role: '책임간호사', status: '재직', pref: 'N 선호', count: 'D 5 · N 12 · OFF 9' },
                      { name: '정하윤', role: '간호사', status: '재직', pref: 'D/E 가능', count: 'D 10 · N 7 · OFF 9' },
                      { name: '이민지', role: '간호사', status: '육아휴직', pref: '-', count: '휴직 중' },
                    ].map((s, i) => (
                      <div key={i} className="staff-card-row">
                        <div className="st-left">
                          <span className="st-name">{s.name} <small>{s.role}</small></span>
                          <span className="st-count font-mono">{s.count}</span>
                        </div>
                        <div className="st-right">
                          <span className="st-tag">{s.pref}</span>
                          <span className={`st-status ${s.status === '재직' ? 'active' : 'leave'}`}>{s.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      <style>{`
        .linear-roster-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background-color: #FFFFFF;
          overflow: hidden;
        }

        /* 1. 상단 Linear 툴바 */
        .roster-toolbar {
          height: 52px;
          min-height: 52px;
          border-bottom: 1px solid #EFEFEF;
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #FFFFFF;
          gap: 16px;
        }

        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .month-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .month-heading {
          font-size: 15px;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .month-nav-group {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .nav-icon-btn {
          background: none;
          border: 1px solid #E2E8F0;
          border-radius: 5px;
          padding: 3px;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.12s;
        }
        .nav-icon-btn:hover {
          background-color: #F8FAFC;
          color: #0F172A;
          border-color: #CBD5E1;
        }
        .btn-today-text {
          background: none;
          border: 1px solid #E2E8F0;
          border-radius: 5px;
          padding: 3px 8px;
          font-size: 12px;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
          margin-left: 4px;
        }
        .btn-today-text:hover {
          background-color: #F8FAFC;
          color: #0F172A;
        }

        .view-mode-tabs {
          display: flex;
          background-color: #F1F5F9;
          padding: 2px;
          border-radius: 6px;
          gap: 2px;
        }
        .view-tab {
          border: none;
          background: none;
          padding: 4px 10px;
          border-radius: 5px;
          font-size: 12px;
          font-weight: 500;
          color: #64748B;
          cursor: pointer;
          transition: all 0.12s;
        }
        .view-tab.active {
          background-color: #FFFFFF;
          color: #0F172A;
          font-weight: 600;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        /* 툴바 중앙: 미니멀 통계 카운터 */
        .toolbar-center {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .metric-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: #475569;
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          padding: 3px 10px;
          border-radius: 6px;
        }
        .m-val {
          font-weight: 700;
          color: #0F172A;
        }
        .m-divider {
          color: #CBD5E1;
        }

        .shift-counts-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .count-tag {
          font-size: 12px;
          padding: 2px 7px;
          border-radius: 4px;
          font-weight: 500;
        }
        .count-tag.d {
          background-color: #FFF1F2;
          color: #E11D48;
        }
        .count-tag.n {
          background-color: #F0FDF4;
          color: #166534;
        }
        .count-tag.off {
          background-color: #F8FAFC;
          color: #475569;
          border: 1px solid #E2E8F0;
        }

        .fatigue-score-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #059669;
          background-color: #ECFDF5;
          padding: 3px 9px;
          border-radius: 6px;
          font-weight: 500;
        }
        .score-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: #10B981;
        }

        .validation-status-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          padding: 3px 9px;
          border-radius: 6px;
          font-weight: 600;
        }
        .validation-status-pill.valid {
          background-color: #F0FDF4;
          color: #166534;
          border: 1px solid #DCFCE7;
        }
        .validation-status-pill.invalid {
          background-color: #FEF2F2;
          color: #DC2626;
          border: 1px solid #FECACA;
        }

        /* 툴바 우측 액션 버튼 */
        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 11px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.12s;
          border: 1px solid transparent;
        }
        .action-btn.optimize {
          background-color: #0F172A;
          color: #FFFFFF;
        }
        .action-btn.optimize:hover {
          background-color: #1E293B;
        }
        .action-btn.conflict {
          background-color: #FFF7ED;
          color: #C2410C;
          border-color: #FFEDD5;
        }
        .action-btn.conflict:hover {
          background-color: #FFEDD5;
        }
        .action-btn.subtle {
          background-color: #FFFFFF;
          color: #475569;
          border-color: #E2E8F0;
        }
        .action-btn.subtle:hover {
          background-color: #F8FAFC;
          color: #0F172A;
        }
        .action-btn.active {
          ring: 2px solid #0F172A;
          border-color: #0F172A;
        }

        .export-btn-group {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: 6px;
          padding-left: 8px;
          border-left: 1px solid #E2E8F0;
        }
        .action-btn.export-btn {
          background-color: #F8FAFC;
          color: #1E293B;
          border-color: #CBD5E1;
        }
        .action-btn.export-btn:hover {
          background-color: #F1F5F9;
          border-color: #94A3B8;
        }

        /* Linear Alert Banner */
        .linear-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 20px;
          font-size: 12px;
          font-weight: 500;
        }
        .linear-banner.error {
          background-color: #FEF2F2;
          color: #DC2626;
          border-bottom: 1px solid #FECACA;
        }
        .linear-banner.success {
          background-color: #F0FDF4;
          color: #166534;
          border-bottom: 1px solid #DCFCE7;
        }
        .banner-close {
          margin-left: auto;
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
        }

        /* 2. 메인 워크스페이스 */
        .roster-workspace {
          flex: 1;
          display: flex;
          overflow: hidden;
          position: relative;
        }

        /* Full Width 캘린더 */
        .calendar-viewport {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background-color: #FFFFFF;
        }

        .grid-dow-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          border-bottom: 1px solid #EFEFEF;
          background-color: #FAFAFA;
        }
        .dow-cell {
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
          text-align: left;
        }
        .dow-cell.sun { color: #E11D48; }
        .dow-cell.sat { color: #2563EB; }

        .grid-body {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          grid-template-rows: repeat(5, 1fr);
          overflow-y: auto;
        }

        .grid-cell {
          border-right: 1px solid #EFEFEF;
          border-bottom: 1px solid #EFEFEF;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background-color: #FFFFFF;
          cursor: pointer;
          transition: background-color 0.08s;
          min-height: 80px;
        }
        .grid-cell:nth-child(7n) {
          border-right: none;
        }
        .grid-cell:hover {
          background-color: #F8FAFC;
        }
        .grid-cell.other-month {
          background-color: #FAFAFB;
          cursor: default;
        }

        .cell-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .cell-day-num {
          font-size: 12px;
          font-weight: 600;
          color: #0F172A;
        }
        .cell-day-num.sun { color: #E11D48; }
        .cell-day-num.sat { color: #2563EB; }
        .other-month .cell-day-num {
          color: #CBD5E1;
        }

        .subtle-holiday {
          font-size: 12px;
          font-weight: 600;
          color: #E11D48;
          background-color: #FFF1F2;
          padding: 1px 5px;
          border-radius: 3px;
        }
        .cell-note-dot {
          font-size: 12px;
          margin-left: auto;
        }
        .cell-note-dot.pink { color: #E11D48; }
        .cell-note-dot.blue { color: #2563EB; }
        .cell-note-icon {
          font-size: 12px;
          margin-left: auto;
          color: #059669;
        }

        .cell-content {
          margin: 6px 0;
          display: flex;
          align-items: center;
        }

        .cell-footer {
          display: flex;
          justify-content: flex-end;
        }
        .staff-indicator {
          font-size: 12px;
          color: #94A3B8;
        }

        /* 3. 우측 슬라이드 드로어 (Drawer) */
        .linear-drawer {
          width: 360px;
          min-width: 360px;
          border-left: 1px solid #EFEFEF;
          background-color: #FFFFFF;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.03);
          animation: slideIn 0.15s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .drawer-header {
          height: 52px;
          min-height: 52px;
          border-bottom: 1px solid #EFEFEF;
          padding: 0 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .drawer-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .drawer-title-group h3 {
          font-size: 14px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
        }
        .drawer-icon { color: #475569; }
        .drawer-icon.warn { color: #C2410C; }
        .drawer-close-btn {
          background: none;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        .drawer-close-btn:hover {
          color: #0F172A;
          background-color: #F1F5F9;
        }

        .drawer-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .drawer-desc {
          font-size: 12px;
          color: #64748B;
          line-height: 1.4;
          margin: 0 0 12px 0;
        }

        /* 후보안 리스트 */
        .candidate-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .cand-box {
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: border-color 0.12s;
        }
        .cand-box.selected {
          border-color: #0F172A;
          background-color: #F8FAFC;
        }
        .cand-box-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .cand-title-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .cand-badge.rec {
          font-size: 12px;
          font-weight: 700;
          color: #E11D48;
          background-color: #FFE4E6;
          padding: 1px 5px;
          border-radius: 3px;
        }
        .cand-name {
          font-size: 13px;
          font-weight: 600;
          color: #0F172A;
        }
        .cand-score {
          font-size: 18px;
          font-weight: 800;
          color: #0F172A;
        }
        .cand-score small {
          font-size: 12px;
          font-weight: 500;
        }

        .cand-spec-list {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 12px;
          color: #64748B;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .cand-spec-list li {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .btn-apply-plan {
          border: none;
          border-radius: 6px;
          padding: 7px 0;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 4px;
          transition: all 0.12s;
        }
        .btn-apply-plan.primary {
          background-color: #0F172A;
          color: #FFFFFF;
        }
        .btn-apply-plan.primary:hover {
          background-color: #1E293B;
        }
        .btn-apply-plan.outline {
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          color: #334155;
        }
        .btn-apply-plan.outline:hover {
          background-color: #F8FAFC;
          border-color: #CBD5E1;
        }

        .ai-insight-box {
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 12px;
          color: #475569;
          line-height: 1.4;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .insight-title {
          font-weight: 600;
          color: #0F172A;
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 2px;
        }

        /* 충돌 안내 */
        .conflict-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #FFF7ED;
          color: #C2410C;
          border: 1px solid #FFEDD5;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 12px;
        }
        .rank-table-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rank-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
        }
        .rank-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rank-num {
          font-size: 12px;
          font-weight: 700;
          color: #94A3B8;
        }
        .rank-info {
          display: flex;
          flex-direction: column;
        }
        .rank-name {
          font-size: 12px;
          font-weight: 600;
          color: #0F172A;
        }
        .rank-sub {
          font-size: 12px;
          color: #64748B;
        }
        .rank-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rank-right .score {
          font-size: 12px;
          font-weight: 700;
          color: #0F172A;
        }
        .status-pill {
          font-size: 12px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
        }
        .status-pill.green { background-color: #DCFCE7; color: #166534; }
        .status-pill.blue { background-color: #E0F2FE; color: #0369A1; }
        .status-pill.gray { background-color: #F1F5F9; color: #64748B; }

        .suggest-action-box {
          margin-top: 12px;
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 10px 12px;
        }
        .suggest-title {
          font-size: 12px;
          font-weight: 600;
          color: #0F172A;
          display: block;
          margin-bottom: 3px;
        }
        .suggest-desc {
          font-size: 12px;
          color: #64748B;
          margin: 0 0 8px 0;
          line-height: 1.3;
        }
        .btn-send-suggest {
          width: 100%;
          background-color: #FFFFFF;
          border: 1px solid #CBD5E1;
          color: #0F172A;
          border-radius: 5px;
          padding: 6px 0;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-send-suggest:hover {
          background-color: #F1F5F9;
        }

        /* 근무 신청 폼 */
        .field-block {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 12px;
        }
        .input-label {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }
        .date-chips-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          align-items: center;
        }
        .date-chip {
          background-color: #F1F5F9;
          color: #0F172A;
          font-size: 12px;
          font-weight: 500;
          padding: 3px 7px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .date-chip button {
          border: none;
          background: none;
          color: #64748B;
          cursor: pointer;
          display: flex;
          padding: 0;
        }
        .btn-add-date {
          border: 1px dashed #CBD5E1;
          background: none;
          border-radius: 4px;
          font-size: 12px;
          padding: 2px 7px;
          color: #64748B;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .linear-select, .linear-textarea {
          border: 1px solid #CBD5E1;
          border-radius: 5px;
          padding: 6px 8px;
          font-size: 12px;
          color: #0F172A;
          background-color: #FFFFFF;
          outline: none;
        }
        .linear-select:focus, .linear-textarea:focus {
          border-color: #0F172A;
        }
        .btn-submit-req {
          width: 100%;
          background-color: #0F172A;
          color: #FFFFFF;
          border: none;
          border-radius: 6px;
          padding: 8px 0;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 8px;
        }
        .btn-submit-req:hover {
          background-color: #1E293B;
        }

        /* 간호사 인력 현황 */
        .staff-list-linear {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .staff-card-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border: 1px solid #EFEFEF;
          border-radius: 6px;
          background-color: #FFFFFF;
        }
        .st-left {
          display: flex;
          flex-direction: column;
        }
        .st-name {
          font-size: 12px;
          font-weight: 600;
          color: #0F172A;
        }
        .st-name small {
          font-weight: 400;
          color: #64748B;
          margin-left: 3px;
        }
        .st-count {
          font-size: 12px;
          color: #94A3B8;
        }
        .st-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .st-tag {
          font-size: 12px;
          background-color: #F1F5F9;
          color: #475569;
          padding: 1px 6px;
          border-radius: 3px;
        }
        .st-status {
          font-size: 12px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 3px;
        }
        .st-status.active { background-color: #DCFCE7; color: #166534; }
        .st-status.leave { background-color: #E0F2FE; color: #0369A1; }
      `}</style>
    </div>
  );
};
