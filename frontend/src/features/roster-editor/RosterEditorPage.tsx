import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MOCK_STAFF, generateMockAssignments } from '../../data/mockData';
import type { ShiftAssignment } from '../../types';
import { TossIcon } from '../../components/ui/TossIcon';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check, 
  Plus, 
  Download, 
  RefreshCw, 
  Pin,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import {
  fetchSchedulePeriod,
  updateAssignment,
  validateScheduleVersion,
  applyScheduleCandidate,
  generateScheduleCandidates,
  fetchLatestScheduleRun,
  getExcelExportUrl,
  getCsvExportUrl,
  fetchStaffList,
  fetchRequestsConflict,
  decideTimeOffRequest,
  createTimeOffRequest,
  type ValidationReport,
  type ApiCandidate,
  type ApiStaffMember,
  type ConflictReport,
} from '../../api/scheduleApi';

type DrawerMode = 'NONE' | 'AI_OPTIMIZE' | 'CONFLICT' | 'REQUEST' | 'STAFF';
type ViewMode = 'STAFF' | 'MONTH' | 'WEEK';

export const RosterEditorPage: React.FC = () => {
  const { periodId: routePeriodId } = useParams<{ periodId?: string }>();

  // 1. 기간 및 버전 상태 (URL 파라미터 파싱)
  const initialYear = useMemo(() => {
    if (routePeriodId && routePeriodId.includes('-')) {
      const parts = routePeriodId.replace('period-', '').split('-');
      if (parts[0] && parts[0].length === 4) return parseInt(parts[0], 10);
    }
    return 2026;
  }, [routePeriodId]);

  const initialMonth = useMemo(() => {
    if (routePeriodId && routePeriodId.includes('-')) {
      const parts = routePeriodId.replace('period-', '').split('-');
      if (parts[1]) return parseInt(parts[1], 10);
    }
    return 11;
  }, [routePeriodId]);

  const [currentYear, setCurrentYear] = useState<number>(initialYear);
  const [currentMonth, setCurrentMonth] = useState<number>(initialMonth);
  const periodId = `period-${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const [versionId, setVersionId] = useState<string>('ver-d37e15bd');

  // 2. 핵심 데이터 상태
  const [staffList, setStaffList] = useState<ApiStaffMember[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>(generateMockAssignments());
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [candidates, setCandidates] = useState<ApiCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number>(1);
  const [conflictReport, setConflictReport] = useState<ConflictReport | null>(null);

  // 3. UI 뷰 & 드로어 상태
  const [viewMode, setViewMode] = useState<ViewMode>('STAFF');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('staff-1');
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [activeDrawer, setActiveDrawer] = useState<DrawerMode>('NONE');

  // 4. 로딩 및 피드백 상태
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 5. 근무 신청 폼 상태 (Drawer용)
  const [reqStaffId, setReqStaffId] = useState<string>('staff-1');
  const [reqDates, setReqDates] = useState<number[]>([14, 15]);
  const [reqType, setReqType] = useState<string>('PREFERENCE_OFF');
  const [reqIsImportant, setReqIsImportant] = useState<boolean>(false);
  const [reqReason, setReqReason] = useState<string>('');
  const [isSubmittingReq, setIsSubmittingReq] = useState<boolean>(false);

  // 표시할 대상 간호사 목록 (staff-1 ~ staff-6 정렬 보장)
  const displayStaffList = useMemo(() => {
    if (staffList.length > 0) {
      // staff-1 ~ staff-6이 우선 오도록 정렬하고 없으면 앞 6명
      const core = staffList.filter((s) => ['staff-1', 'staff-2', 'staff-3', 'staff-4', 'staff-5', 'staff-6'].includes(s.id));
      if (core.length >= 6) {
        return core.sort((a, b) => a.id.localeCompare(b.id));
      }
      return staffList.slice(0, 6);
    }
    // 백엔드 미로딩 시 MOCK_STAFF를 ApiStaffMember 형태로 매핑
    return MOCK_STAFF.map((m) => ({
      id: m.id,
      display_name: m.name,
      staff_code: m.staffCode,
      role: m.role,
      active_status: m.activeStatus,
      employment_type: m.employmentType,
      target_work_minutes: m.targetWorkMinutes,
      can_work_night: m.canWorkNight,
      skill_tags: m.skillTags,
    }));
  }, [staffList]);

  // 해당 월의 총 일수 및 날짜 목록 생성 (2026년 11월은 30일)
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  const monthDates = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dt = new Date(currentYear, currentMonth - 1, day);
      const dow = dt.getDay(); // 0: 일, 6: 토
      const dowKorean = ['일', '월', '화', '수', '목', '금', '토'][dow];
      return { day, dateStr, dow, dowKorean, isWeekend: dow === 0 || dow === 6 };
    });
  }, [currentYear, currentMonth, daysInMonth]);

  // 배정 맵: Key = `${staffId}_${dateStr}`
  const assignmentMap = useMemo(() => {
    const map = new Map<string, ShiftAssignment>();
    assignments.forEach((a) => {
      map.set(`${a.staffId}_${a.localStartDate}`, a);
    });
    return map;
  }, [assignments]);

  // 데이터 로드 함수
  const loadRosterData = useCallback(async () => {
    try {
      // 1. 직원 목록 로드
      try {
        const staffRes = await fetchStaffList('ward-obgyn');
        if (staffRes && staffRes.length > 0) {
          setStaffList(staffRes);
        }
      } catch (err) {
        console.warn('직원 목록 로드 fallback 사용:', err);
      }

      // 2. 근무표 기간 및 배정 로드
      const periodData = await fetchSchedulePeriod('ward-obgyn', periodId);
      if (periodData.current_version) {
        setVersionId(periodData.current_version.id);

        const mapped: ShiftAssignment[] = periodData.current_version.assignments.map((a) => {
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
            note: a.note,
          };
        });
        setAssignments(mapped);

        // 검증 리포트 로드
        try {
          const report = await validateScheduleVersion(periodData.current_version.id);
          setValidationReport(report);
        } catch (vErr) {
          console.warn('검증 리포트 로드 실패:', vErr);
        }
      }

      // 3. 최신 솔버 실행 결과 로드
      try {
        const latestRun = await fetchLatestScheduleRun(periodId);
        if (latestRun && latestRun.candidates.length > 0) {
          setCandidates(latestRun.candidates);
        }
      } catch (runErr) {
        console.warn('최신 솔버 실행 조회 실패:', runErr);
      }

      // 4. 경합 정보 사전 로드 (11월 14일 기준)
      try {
        const confRes = await fetchRequestsConflict('ward-obgyn', '2026-11-14');
        setConflictReport(confRes);
      } catch (cErr) {
        console.warn('경합 조회 실패:', cErr);
      }
    } catch (err: any) {
      console.error('근무표 로드 실패:', err);
      setErrorMessage(err.message || '근무표 데이터를 불러오지 못했습니다.');
    }
  }, [periodId]);

  useEffect(() => {
    loadRosterData();
  }, [loadRosterData]);

  // 셀 클릭하여 근무 토글 (D -> N -> OFF -> D)
  const handleToggleShift = async (staffId: string, dateStr: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const key = `${staffId}_${dateStr}`;
    const existing = assignmentMap.get(key);

    let nextTmplId = 'shift-day';
    let isPinned = false;
    let assignId = existing?.id;

    if (existing) {
      if (existing.shiftTemplateId === 'shift-day') nextTmplId = 'shift-night';
      else if (existing.shiftTemplateId === 'shift-night') nextTmplId = 'shift-off';
      else nextTmplId = 'shift-day';
      isPinned = existing.isPinned;
    }

    // 낙관적 UI 업데이트
    setAssignments((prev) => {
      const idx = prev.findIndex((a) => a.staffId === staffId && a.localStartDate === dateStr);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          shiftTemplateId: nextTmplId,
          source: 'MANUAL',
        };
        return updated;
      } else {
        const newAssign: ShiftAssignment = {
          id: `manual-${Date.now()}`,
          scheduleVersionId: versionId,
          staffId,
          shiftTemplateId: nextTmplId,
          localStartDate: dateStr,
          startAtUtc: `${dateStr}T00:00:00Z`,
          endAtUtc: `${dateStr}T00:00:00Z`,
          isPinned: false,
          source: 'MANUAL',
        };
        return [...prev, newAssign];
      }
    });

    // 백엔드 API 연동
    if (assignId) {
      try {
        const res = await updateAssignment(versionId, assignId, {
          shift_template_id: nextTmplId,
          is_pinned: isPinned,
        });
        if (res.validation_summary) {
          const report = await validateScheduleVersion(versionId);
          setValidationReport(report);
        }
      } catch (err: any) {
        setErrorMessage(err.message || '근무 변경에 실패했습니다.');
        loadRosterData();
      }
    }
  };

  // 핀 고정 토글 (우클릭 또는 핀 버튼 클릭)
  const handleTogglePin = async (staffId: string, dateStr: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const key = `${staffId}_${dateStr}`;
    const existing = assignmentMap.get(key);
    if (!existing) return;

    const nextPinned = !existing.isPinned;

    setAssignments((prev) =>
      prev.map((a) =>
        a.id === existing.id ? { ...a, isPinned: nextPinned, source: 'MANUAL' } : a
      )
    );

    try {
      await updateAssignment(versionId, existing.id, {
        shift_template_id: existing.shiftTemplateId,
        is_pinned: nextPinned,
      });
      setSuccessMessage(`${existing.localStartDate} 핀이 ${nextPinned ? '고정' : '해제'}되었습니다.`);
    } catch (err: any) {
      setErrorMessage(err.message || '핀 상태 변경에 실패했습니다.');
      loadRosterData();
    }
  };

  // AI 솔버 자동 생성 실행
  const handleRunOptimizer = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const run = await generateScheduleCandidates(periodId, 5.0, 2, 1);
      if (run && run.candidates.length > 0) {
        setCandidates(run.candidates);
        setSuccessMessage('OR-Tools 최적화 솔버가 3가지 추천 편성안을 산출했습니다.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'AI 최적화 실행에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  // AI 후보안 근무표 적용
  const handleApplyCandidate = async (candidateId: number) => {
    setIsApplying(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await applyScheduleCandidate(periodId, String(candidateId));
      if (res && res.version_id) {
        setVersionId(res.version_id);
        setValidationReport(res.validation_report);
        setSelectedCandidate(candidateId);
        setSuccessMessage(`후보안 ${candidateId}번이 성공적으로 배정되었습니다. (${res.applied_count}건 반영)`);
        await loadRosterData();
      }
    } catch (err: any) {
      setErrorMessage(err.message || '후보안 적용에 실패했습니다.');
    } finally {
      setIsApplying(false);
    }
  };

  // 경합 신청 결정 (승인/반려)
  const handleDecideRequest = async (requestId: string, decision: 'APPROVED' | 'NOT_GRANTED') => {
    try {
      await decideTimeOffRequest(requestId, decision, 'user-headnurse');
      setSuccessMessage(`신청 건이 ${decision === 'APPROVED' ? '승인' : '반려/대체'} 처리되었습니다.`);
      const updated = await fetchRequestsConflict('ward-obgyn', '2026-11-14');
      setConflictReport(updated);
    } catch (err: any) {
      setErrorMessage(err.message || '결정 처리에 실패했습니다.');
    }
  };

  // 근무 신청 제출
  const handleSubmitTimeOffRequest = async () => {
    if (reqDates.length === 0) {
      alert('신청할 날짜를 1개 이상 선택해주세요.');
      return;
    }
    setIsSubmittingReq(true);
    try {
      const dateStrings = reqDates.map(
        (d) => `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      );
      await createTimeOffRequest('ward-obgyn', {
        staff_id: reqStaffId,
        leave_type_code: reqType,
        dates: dateStrings,
        is_important: reqIsImportant,
        reason_note: reqReason || undefined,
      });
      setSuccessMessage('신청서가 성공적으로 접수되었습니다.');
      setActiveDrawer('NONE');
      setReqReason('');
    } catch (err: any) {
      setErrorMessage(err.message || '신청 등록 실패');
    } finally {
      setIsSubmittingReq(false);
    }
  };

  // 간호사별 실시간 통계 계산 (D, N, OFF, 총 근무일, 부담점수)
  const staffStats = useMemo(() => {
    const stats = new Map<string, { d: number; n: number; off: number; workDays: number; burden: number }>();
    displayStaffList.forEach((s) => {
      let d = 0;
      let n = 0;
      let off = 0;
      let burden = 0;

      monthDates.forEach((m) => {
        const assign = assignmentMap.get(`${s.id}_${m.dateStr}`);
        const tId = assign?.shiftTemplateId || 'shift-off';
        if (tId === 'shift-day') {
          d++;
          burden += m.isWeekend ? 3.0 : 1.0;
        } else if (tId === 'shift-night') {
          n++;
          burden += m.isWeekend ? 3.5 : 2.0;
        } else {
          off++;
        }
      });
      stats.set(s.id, { d, n, off, workDays: d + n, burden: Math.round(burden * 10) });
    });
    return stats;
  }, [displayStaffList, monthDates, assignmentMap]);

  // 병동 전체 실시간 지표
  const wardOverallStats = useMemo(() => {
    let totalD = 0;
    let totalN = 0;
    let totalOff = 0;
    let totalBurden = 0;

    staffStats.forEach((st) => {
      totalD += st.d;
      totalN += st.n;
      totalOff += st.off;
      totalBurden += st.burden;
    });

    const avgBurden = staffStats.size > 0 ? Math.round(totalBurden / staffStats.size) : 84;
    return { totalD, totalN, totalOff, avgBurden };
  }, [staffStats]);

  // 일자별 병동 투입 인원 (Day, Night)
  const dailyCoverage = useMemo(() => {
    const cov = new Map<string, { dayCount: number; nightCount: number }>();
    monthDates.forEach((m) => {
      let dayCount = 0;
      let nightCount = 0;
      displayStaffList.forEach((s) => {
        const assign = assignmentMap.get(`${s.id}_${m.dateStr}`);
        if (assign?.shiftTemplateId === 'shift-day') dayCount++;
        else if (assign?.shiftTemplateId === 'shift-night') nightCount++;
      });
      cov.set(m.dateStr, { dayCount, nightCount });
    });
    return cov;
  }, [monthDates, displayStaffList, assignmentMap]);

  // 현재 선택된 간호사(단일 뷰용)의 통계
  const currentStaffStat = staffStats.get(selectedStaffId) || { d: 0, n: 0, off: 0, workDays: 0, burden: 0 };

  // 35칸 달력 셀 생성 (월간 캘린더 뷰용)
  const calendarGridCells = useMemo(() => {
    // 2026년 11월 1일의 요일 (0: 일, 1: 월, ...)
    const firstDow = new Date(currentYear, currentMonth - 1, 1).getDay();
    const cells = [];

    // 앞쪽 이전 달 빈칸 채우기
    const prevMonthLastDate = new Date(currentYear, currentMonth - 1, 0).getDate();
    for (let i = firstDow - 1; i >= 0; i--) {
      const day = prevMonthLastDate - i;
      cells.push({ day, isCurrentMonth: false, dateStr: `prev-${day}` });
    }

    // 이번 달 날짜
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ day, isCurrentMonth: true, dateStr });
    }

    // 뒤쪽 다음 달 빈칸 채우기 (총 35칸 맞춤)
    let nextDay = 1;
    while (cells.length % 7 !== 0 || cells.length < 35) {
      cells.push({ day: nextDay, isCurrentMonth: false, dateStr: `next-${nextDay}` });
      nextDay++;
    }

    return cells;
  }, [currentYear, currentMonth, daysInMonth]);

  // 주간 뷰용 7일 날짜 목록
  const weekDates = useMemo(() => {
    const startIdx = (selectedWeek - 1) * 7;
    return monthDates.slice(startIdx, startIdx + 7);
  }, [selectedWeek, monthDates]);

  return (
    <div className="linear-roster-container">
      {/* 1. 상단 Linear 스타일 툴바 */}
      <header className="roster-toolbar">
        {/* 좌측: 연월 탐색 및 뷰 컨트롤 */}
        <div className="toolbar-left">
          <div className="month-title-wrap">
            <h2 className="month-heading font-mono">
              {currentYear}년 {currentMonth}월
            </h2>
            <div className="month-nav-group">
              <button 
                className="nav-icon-btn" 
                aria-label="이전 달"
                onClick={() => {
                  if (currentMonth === 1) {
                    setCurrentYear((y) => y - 1);
                    setCurrentMonth(12);
                  } else {
                    setCurrentMonth((m) => m - 1);
                  }
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                className="nav-icon-btn" 
                aria-label="다음 달"
                onClick={() => {
                  if (currentMonth === 12) {
                    setCurrentYear((y) => y + 1);
                    setCurrentMonth(1);
                  } else {
                    setCurrentMonth((m) => m + 1);
                  }
                }}
              >
                <ChevronRight size={16} />
              </button>
              <button 
                className="btn-today-text"
                onClick={() => {
                  setCurrentYear(2026);
                  setCurrentMonth(11);
                }}
              >
                오늘
              </button>
            </div>
          </div>

          <div className="view-mode-tabs">
            <button 
              className={`view-tab ${viewMode === 'STAFF' ? 'active' : ''}`}
              onClick={() => setViewMode('STAFF')}
            >
              간호사별 (전체)
            </button>
            <button 
              className={`view-tab ${viewMode === 'MONTH' ? 'active' : ''}`}
              onClick={() => setViewMode('MONTH')}
            >
              월간 캘린더
            </button>
            <button 
              className={`view-tab ${viewMode === 'WEEK' ? 'active' : ''}`}
              onClick={() => setViewMode('WEEK')}
            >
              주간 집중
            </button>
          </div>
        </div>

        {/* 중앙: 실시간 통계 카운터 (D/N/OFF, 부담점수, 검증 상태) */}
        <div className="toolbar-center">
          {viewMode === 'STAFF' ? (
            <>
              <div className="metric-pill">
                <span className="m-label">병동 6인 총 근무</span>
                <span className="m-val font-mono">{wardOverallStats.totalD + wardOverallStats.totalN}건</span>
                <span className="m-divider">/</span>
                <span className="m-label">OFF</span>
                <span className="m-val font-mono">{wardOverallStats.totalOff}건</span>
              </div>
              <div className="shift-counts-group">
                <span className="count-tag d">D <strong>{wardOverallStats.totalD}</strong></span>
                <span className="count-tag n">N <strong>{wardOverallStats.totalN}</strong></span>
                <span className="count-tag off">OFF <strong>{wardOverallStats.totalOff}</strong></span>
              </div>
              <div className="fatigue-score-tag" title="병동 평균 부담점수">
                <span className="score-dot" />
                <span className="score-text">평균 부담 <strong>{wardOverallStats.avgBurden}점</strong></span>
              </div>
            </>
          ) : (
            <>
              <div className="metric-pill">
                <span className="m-label">근무일</span>
                <span className="m-val font-mono">{currentStaffStat.workDays}일</span>
                <span className="m-divider">/</span>
                <span className="m-label">OFF</span>
                <span className="m-val font-mono">{currentStaffStat.off}일</span>
              </div>
              <div className="shift-counts-group">
                <span className="count-tag d">D <strong>{currentStaffStat.d}</strong></span>
                <span className="count-tag n">N <strong>{currentStaffStat.n}</strong></span>
                <span className="count-tag off">OFF <strong>{currentStaffStat.off}</strong></span>
              </div>
              <div className="fatigue-score-tag" title="개인 부담점수">
                <span className="score-dot" />
                <span className="score-text">부담점수 <strong>{currentStaffStat.burden}점</strong></span>
              </div>
            </>
          )}

          {validationReport && (
            <div 
              className={`validation-status-pill ${validationReport.is_feasible ? 'valid' : 'invalid'}`}
              title={validationReport.is_feasible ? '법정 규칙 및 교대 휴식 기준 100% 충족' : `위반 건수 ${validationReport.error_count}건`}
            >
              {validationReport.is_feasible ? (
                <>
                  <Check size={13} style={{ marginRight: '4px' }} />
                  <span>적합 (규칙 100% 준수)</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={13} style={{ marginRight: '4px' }} />
                  <span>위반 {validationReport.error_count}건</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* 우측: 서랍 액션 버튼 & 내보내기 */}
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
            <span>OFF 경합 ({conflictReport?.applicant_count || 3})</span>
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

      {/* 시스템 알림 배너 */}
      {errorMessage && (
        <div className="linear-banner error">
          <AlertTriangle size={14} style={{ marginRight: '4px' }} />
          <span>{errorMessage}</span>
          <button className="banner-close" onClick={() => setErrorMessage(null)}><X size={12} /></button>
        </div>
      )}
      {successMessage && (
        <div className="linear-banner success">
          <Check size={14} style={{ marginRight: '4px' }} />
          <span>{successMessage}</span>
          <button className="banner-close" onClick={() => setSuccessMessage(null)}><X size={12} /></button>
        </div>
      )}

      {/* 2. 메인 와이드 작업 영역 */}
      <div className="roster-workspace">
        {/* ========================================================= */}
        {/* VIEW 1: 간호사별 전체 매트릭스 뷰 (STAFF Matrix View) */}
        {/* ========================================================= */}
        {viewMode === 'STAFF' && (
          <div className="matrix-viewport">
            <div className="matrix-table-container">
              <table className="matrix-table">
                <thead>
                  {/* 행 1: 요일 및 날짜 헤더 */}
                  <tr>
                    <th className="th-staff-fixed">간호사 (6인)</th>
                    {monthDates.map((m) => (
                      <th 
                        key={m.dateStr} 
                        className={`th-day-col ${m.isWeekend ? (m.dow === 0 ? 'sun' : 'sat') : ''}`}
                      >
                        <span className="th-dow">{m.dowKorean}</span>
                        <span className="th-day-num font-mono">{m.day}</span>
                      </th>
                    ))}
                    <th className="th-stat-fixed">D</th>
                    <th className="th-stat-fixed">N</th>
                    <th className="th-stat-fixed">OFF</th>
                    <th className="th-stat-fixed wide">부담점수</th>
                  </tr>
                </thead>
                <tbody>
                  {displayStaffList.map((staff) => {
                    const stat = staffStats.get(staff.id) || { d: 0, n: 0, off: 0, burden: 0 };
                    const hasDelivery = staff.skill_tags.includes('DELIVERY_ROOM');
                    const hasCharge = staff.skill_tags.includes('CHARGE_CAPABLE');
                    const isNewGrad = staff.skill_tags.includes('NEW_GRAD');

                    return (
                      <tr key={staff.id} className="matrix-row">
                        {/* 고정 첫 번째 열: 간호사 정보 */}
                        <td className="td-staff-fixed">
                          <div className="staff-info-cell">
                            <div className="staff-name-wrap">
                              <span className="staff-name">{staff.display_name}</span>
                              <span className="staff-role-badge">
                                {staff.employment_type === 'PART_TIME' ? '단시간' : staff.role}
                              </span>
                            </div>
                            <div className="staff-skill-tags">
                              {hasCharge && <span className="skill-tag charge">책임</span>}
                              {hasDelivery && <span className="skill-tag delivery">분만</span>}
                              {isNewGrad && <span className="skill-tag newgrad">신규</span>}
                            </div>
                          </div>
                        </td>

                        {/* 1일 ~ 30일 근무 셀 */}
                        {monthDates.map((m) => {
                          const key = `${staff.id}_${m.dateStr}`;
                          const assign = assignmentMap.get(key);
                          const tId = assign?.shiftTemplateId || 'shift-off';
                          const isPinned = assign?.isPinned || false;

                          let badgeClass = 'cell-shift-off';
                          let label = 'OFF';
                          if (tId === 'shift-day') {
                            badgeClass = 'cell-shift-day';
                            label = 'D';
                          } else if (tId === 'shift-night') {
                            badgeClass = 'cell-shift-night';
                            label = 'N';
                          }

                          return (
                            <td 
                              key={m.dateStr} 
                              className={`td-matrix-cell ${m.isWeekend ? 'weekend' : ''}`}
                              onClick={() => handleToggleShift(staff.id, m.dateStr)}
                              onContextMenu={(e) => handleTogglePin(staff.id, m.dateStr, e)}
                              title={`${staff.display_name} | ${m.dateStr} (${label})\n클릭: 교대 순환 (D->N->OFF)\n우클릭: 핀 고정 토글`}
                            >
                              <div className={`matrix-shift-pill ${badgeClass}`}>
                                <span className="shift-text font-mono">{label}</span>
                                {isPinned && (
                                  <span 
                                    className="pin-indicator" 
                                    onClick={(e) => handleTogglePin(staff.id, m.dateStr, e)}
                                    title="수동 고정 (AI 편성 시 보존됨)"
                                  >
                                    <Pin size={9} />
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* 우측 실시간 통계 열 */}
                        <td className="td-stat-fixed d font-mono">{stat.d}</td>
                        <td className="td-stat-fixed n font-mono">{stat.n}</td>
                        <td className="td-stat-fixed off font-mono">{stat.off}</td>
                        <td className="td-stat-fixed burden font-mono">
                          <span className="burden-badge">{stat.burden}점</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  {/* 하단 고정 행: 일자별 인력 충족 집계 (Day >= 2, Night >= 1) */}
                  <tr className="matrix-foot-row">
                    <td className="td-staff-fixed foot-label">
                      <span>일일 배치 합계</span>
                      <small>최소 기준 (D 2 / N 1)</small>
                    </td>
                    {monthDates.map((m) => {
                      const cov = dailyCoverage.get(m.dateStr) || { dayCount: 0, nightCount: 0 };
                      const isDayOk = cov.dayCount >= 2;
                      const isNightOk = cov.nightCount >= 1;
                      const isCoverageShort = !isDayOk || !isNightOk;

                      return (
                        <td 
                          key={m.dateStr} 
                          className={`td-coverage-cell ${isCoverageShort ? 'shortage' : 'ok'}`}
                          title={`D: ${cov.dayCount}명, N: ${cov.nightCount}명`}
                        >
                          <div className="cov-counts font-mono">
                            <span className={`c-day ${isDayOk ? 'ok' : 'warn'}`}>D {cov.dayCount}</span>
                            <span className={`c-night ${isNightOk ? 'ok' : 'warn'}`}>N {cov.nightCount}</span>
                          </div>
                        </td>
                      );
                    })}
                    <td colSpan={4} className="td-foot-summary">
                      병동 6인 총 가동
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: 월간 캘린더 뷰 (Month Calendar View) */}
        {/* ========================================================= */}
        {viewMode === 'MONTH' && (
          <div className="calendar-viewport">
            {/* 상단 간호사 선택 드롭다운 툴바 */}
            <div className="sub-view-bar">
              <span className="bar-label">대상 간호사 선택:</span>
              <select 
                className="staff-select-box"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                {displayStaffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name} ({s.staff_code}) - {s.employment_type === 'PART_TIME' ? '단시간' : s.role}
                  </option>
                ))}
              </select>
              <div className="legend-strip">
                <span className="legend-item"><span className="dot d" /> 데이 (D)</span>
                <span className="legend-item"><span className="dot n" /> 나이트 (N)</span>
                <span className="legend-item"><span className="dot off" /> 오프 (OFF)</span>
                <span className="legend-item"><Pin size={11} /> 핀 고정</span>
              </div>
            </div>

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
              {calendarGridCells.map((cell, idx) => {
                const { day, isCurrentMonth, dateStr } = cell;
                const assign = isCurrentMonth ? assignmentMap.get(`${selectedStaffId}_${dateStr}`) : undefined;
                const tId = assign?.shiftTemplateId || 'shift-off';
                const isPinned = assign?.isPinned || false;
                const cov = isCurrentMonth ? dailyCoverage.get(dateStr) : undefined;

                const dow = idx % 7;
                const isSun = dow === 0;
                const isSat = dow === 6;

                let badgeClass = 'cell-shift-off';
                let label = 'OFF';
                if (tId === 'shift-day') {
                  badgeClass = 'cell-shift-day';
                  label = '데이 (D)';
                } else if (tId === 'shift-night') {
                  badgeClass = 'cell-shift-night';
                  label = '나이트 (N)';
                }

                return (
                  <div 
                    key={idx} 
                    className={`grid-cell ${!isCurrentMonth ? 'other-month' : ''}`}
                    onClick={() => isCurrentMonth && handleToggleShift(selectedStaffId, dateStr)}
                    onContextMenu={(e) => isCurrentMonth && handleTogglePin(selectedStaffId, dateStr, e)}
                  >
                    <div className="cell-header">
                      <span className={`cell-day-num font-mono ${isSun ? 'sun' : isSat ? 'sat' : ''}`}>
                        {day}
                      </span>
                      {isPinned && (
                        <span className="pin-tag" title="관리자 수동 고정됨">
                          <Pin size={10} />
                        </span>
                      )}
                    </div>

                    <div className="cell-content">
                      {isCurrentMonth && (
                        <div className={`cal-shift-badge ${badgeClass}`}>
                          <span>{label}</span>
                        </div>
                      )}
                    </div>

                    {isCurrentMonth && cov && (
                      <div className="cell-footer">
                        <span className="staff-indicator font-mono">
                          D {cov.dayCount} · N {cov.nightCount}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: 주간 집중 뷰 (Week Focus View) */}
        {/* ========================================================= */}
        {viewMode === 'WEEK' && (
          <div className="week-viewport">
            {/* 주차 선택 탭 */}
            <div className="sub-view-bar">
              <span className="bar-label">주차 선택:</span>
              <div className="week-pill-tabs">
                {[1, 2, 3, 4, 5].map((w) => (
                  <button 
                    key={w}
                    className={`week-pill-tab ${selectedWeek === w ? 'active' : ''}`}
                    onClick={() => setSelectedWeek(w)}
                  >
                    {w}주차 ({Math.min((w - 1) * 7 + 1, daysInMonth)}일 ~ {Math.min(w * 7, daysInMonth)}일)
                  </button>
                ))}
              </div>
            </div>

            {/* 주간 그리드 */}
            <div className="week-table-wrap">
              <table className="matrix-table week-table">
                <thead>
                  <tr>
                    <th className="th-staff-fixed">간호사</th>
                    {weekDates.map((m) => (
                      <th 
                        key={m.dateStr} 
                        className={`th-day-col wide ${m.isWeekend ? (m.dow === 0 ? 'sun' : 'sat') : ''}`}
                      >
                        <span className="th-dow">{m.dowKorean}요일</span>
                        <span className="th-day-num font-mono">{m.day}일</span>
                      </th>
                    ))}
                    <th className="th-stat-fixed wide">주간 근무</th>
                  </tr>
                </thead>
                <tbody>
                  {displayStaffList.map((staff) => {
                    let weekWorkCount = 0;
                    return (
                      <tr key={staff.id} className="matrix-row">
                        <td className="td-staff-fixed">
                          <span className="staff-name">{staff.display_name}</span>
                          <span className="staff-role-badge">{staff.role}</span>
                        </td>
                        {weekDates.map((m) => {
                          const key = `${staff.id}_${m.dateStr}`;
                          const assign = assignmentMap.get(key);
                          const tId = assign?.shiftTemplateId || 'shift-off';
                          const isPinned = assign?.isPinned || false;

                          let badgeClass = 'cell-shift-off';
                          let label = 'OFF';
                          let timeStr = '휴무';
                          if (tId === 'shift-day') {
                            badgeClass = 'cell-shift-day';
                            label = '데이';
                            timeStr = '08:00 - 18:00';
                            weekWorkCount++;
                          } else if (tId === 'shift-night') {
                            badgeClass = 'cell-shift-night';
                            label = '나이트';
                            timeStr = '18:00 - 익일 08:00';
                            weekWorkCount++;
                          }

                          return (
                            <td 
                              key={m.dateStr} 
                              className="td-week-cell"
                              onClick={() => handleToggleShift(staff.id, m.dateStr)}
                              onContextMenu={(e) => handleTogglePin(staff.id, m.dateStr, e)}
                            >
                              <div className={`week-shift-card ${badgeClass}`}>
                                <div className="card-top">
                                  <span className="card-label">{label}</span>
                                  {isPinned && <Pin size={10} />}
                                </div>
                                <span className="card-time font-mono">{timeStr}</span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="td-stat-fixed font-mono">{weekWorkCount}일 근무</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. 우측 슬라이드 드로어 (Drawer / Side Sheet) */}
        {/* ========================================================= */}
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
                    <h3>OFF 신청 경합 분석</h3>
                  </>
                )}
                {activeDrawer === 'REQUEST' && (
                  <>
                    <TossIcon name="calendar" size={18} style={{ marginRight: '6px' }} />
                    <h3>근무 및 휴가 신청 등록</h3>
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
              {/* ---------------------------------------------------- */}
              {/* 드로어 1: AI 최적화 편성안 */}
              {/* ---------------------------------------------------- */}
              {activeDrawer === 'AI_OPTIMIZE' && (
                <div className="drawer-section">
                  <div className="drawer-actions-top">
                    <p className="drawer-desc">
                      OR-Tools 솔버가 공정성, 주 52시간 상한, H-SKILL, H-BOUNDARY를 반영해 산출한 편성안입니다.
                    </p>
                    <button 
                      className="btn-rerun-solver"
                      disabled={isGenerating}
                      onClick={handleRunOptimizer}
                    >
                      <RefreshCw size={12} className={isGenerating ? 'spin' : ''} />
                      <span>{isGenerating ? '솔버 최적화 실행 중...' : '새로운 최적 편성안 생성'}</span>
                    </button>
                  </div>

                  <div className="candidate-list">
                    {/* 균형형 (추천) */}
                    {candidates.length > 0 ? (
                      candidates.map((cand, idx) => {
                        const isSelected = selectedCandidate === (idx + 1);
                        return (
                          <div key={cand.id} className={`cand-box ${isSelected ? 'selected' : ''}`}>
                            <div className="cand-box-header">
                              <div className="cand-title-wrap">
                                {idx === 0 && <span className="cand-badge rec">추천</span>}
                                <span className="cand-name">{cand.name}</span>
                              </div>
                              <span className="cand-score font-mono">
                                {Math.round(cand.total_score)}<small>점</small>
                              </span>
                            </div>
                            <ul className="cand-spec-list">
                              {cand.explanation_points?.slice(0, 3).map((pt, pIdx) => (
                                <li key={pIdx}><Check size={12} /> {pt}</li>
                              ))}
                            </ul>
                            <button 
                              className={`btn-apply-plan ${idx === 0 ? 'primary' : 'outline'}`}
                              disabled={isApplying}
                              onClick={() => handleApplyCandidate(idx + 1)}
                            >
                              {isApplying && isSelected ? '적용 중...' : '이 편성안으로 적용'}
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className={`cand-box ${selectedCandidate === 1 ? 'selected' : ''}`}>
                          <div className="cand-box-header">
                            <div className="cand-title-wrap">
                              <span className="cand-badge rec">추천</span>
                              <span className="cand-name">균형 최적화형 (기본)</span>
                            </div>
                            <span className="cand-score font-mono">92<small>점</small></span>
                          </div>
                          <ul className="cand-spec-list">
                            <li><Check size={12} /> 공정성 우선 배정 (정규직 편차 2점 이내)</li>
                            <li><Check size={12} /> 희망 근무 반영률 88% 달성</li>
                            <li><Check size={12} /> H-SKILL 책임/분만실 자격 100% 충족</li>
                          </ul>
                          <button 
                            className="btn-apply-plan primary"
                            disabled={isApplying}
                            onClick={() => handleApplyCandidate(1)}
                          >
                            이 편성안으로 적용
                          </button>
                        </div>

                        <div className={`cand-box ${selectedCandidate === 2 ? 'selected' : ''}`}>
                          <div className="cand-box-header">
                            <span className="cand-name">개인 희망 우선형</span>
                            <span className="cand-score font-mono">87<small>점</small></span>
                          </div>
                          <ul className="cand-spec-list">
                            <li><Check size={12} /> 간호사 희망 오프 최우선 승인</li>
                            <li><Check size={12} /> 주말 분산 배정 다소 완화</li>
                          </ul>
                          <button 
                            className="btn-apply-plan outline"
                            disabled={isApplying}
                            onClick={() => handleApplyCandidate(2)}
                          >
                            이 편성안으로 적용
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="ai-insight-box">
                    <span className="insight-title">
                      <Sparkles size={14} style={{ marginRight: '4px' }} /> 배정 검증 핵심 포인트
                    </span>
                    <p>• <strong>H-SKILL</strong>: 매 야간 근무마다 분만실 및 책임 자격 최소 1인 필수 충족</p>
                    <p>• <strong>H-WEEK</strong>: 7일 롤링 52시간(3,120분) 상한 엄격 준수</p>
                    <p>• <strong>H-BOUNDARY</strong>: 전월 말 10/31 N 배치 인원 11/1 100% OFF 강제</p>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* 드로어 2: OFF 경합 분석 */}
              {/* ---------------------------------------------------- */}
              {activeDrawer === 'CONFLICT' && (
                <div className="drawer-section">
                  <div className="conflict-banner">
                    <AlertTriangle size={15} style={{ marginRight: '6px' }} />
                    <span>
                      {conflictReport?.conflict_date || '2026-11-14'}에 간호사 {conflictReport?.applicant_count || 3}명이 동시에 OFF를 신청했습니다.
                    </span>
                  </div>

                  <p className="drawer-desc">
                    {conflictReport?.recommendation_summary || '공정성 누적 우선순위 점수가 가장 높은 간호사가 자동 승인 대상입니다.'}
                  </p>

                  <div className="rank-table-wrap">
                    {conflictReport?.requests && conflictReport.requests.length > 0 ? (
                      conflictReport.requests.map((req, idx) => {
                        const isWinner = req.staff_id === conflictReport.recommended_winner_id;
                        return (
                          <div key={req.request_id} className={`rank-item ${isWinner ? 'approved' : 'suggest'}`}>
                            <div className="rank-left">
                              <span className="rank-num">{idx + 1}</span>
                              <div className="rank-info">
                                <span className="rank-name">{req.staff_name} <small>{req.staff_role}</small></span>
                                <span className="rank-sub">{req.reason_note || '사유 미입력'}</span>
                              </div>
                            </div>
                            <div className="rank-right">
                              <span className="score font-mono">{req.priority_points || 85}점</span>
                              <button 
                                className={`status-action-btn ${isWinner ? 'green' : 'blue'}`}
                                onClick={() => handleDecideRequest(req.request_id, isWinner ? 'APPROVED' : 'NOT_GRANTED')}
                              >
                                {isWinner ? '승인 확정' : '대체일 권고'}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rank-item approved">
                        <div className="rank-left">
                          <span className="rank-num">1</span>
                          <div className="rank-info">
                            <span className="rank-name">김간호사 (책임)</span>
                            <span className="rank-sub">최근 3개월 주말 OFF 부족 누적</span>
                          </div>
                        </div>
                        <div className="rank-right">
                          <span className="score font-mono">92점</span>
                          <span className="status-pill green">승인 권고</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="suggest-action-box">
                    <span className="suggest-title">대체 권고 휴무일</span>
                    <p className="suggest-desc">11월 21일(토) 또는 28일(토)은 병동 최소 인력이 여유로워 승인 가능합니다.</p>
                    <button 
                      className="btn-send-suggest" 
                      onClick={() => alert('신청 간호사들에게 권고 대체일 알림이 발송되었습니다.')}
                    >
                      대체 휴무일 제안 알림 발송
                    </button>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* 드로어 3: 근무 신청 등록 */}
              {/* ---------------------------------------------------- */}
              {activeDrawer === 'REQUEST' && (
                <div className="drawer-section">
                  <div className="field-block">
                    <label className="input-label">신청 간호사</label>
                    <select 
                      className="linear-select"
                      value={reqStaffId}
                      onChange={(e) => setReqStaffId(e.target.value)}
                    >
                      {displayStaffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.display_name} ({s.staff_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-block">
                    <label className="input-label">신청 날짜 (11월)</label>
                    <div className="date-chips-wrap">
                      {reqDates.map((d) => (
                        <span key={d} className="date-chip">
                          11월 {d}일
                          <button onClick={() => setReqDates(reqDates.filter((x) => x !== d))}><X size={10} /></button>
                        </span>
                      ))}
                      <button 
                        className="btn-add-date"
                        onClick={() => {
                          const nextD = Math.max(...reqDates, 0) + 1;
                          if (nextD <= daysInMonth && !reqDates.includes(nextD)) {
                            setReqDates([...reqDates, nextD]);
                          }
                        }}
                      >
                        <Plus size={11} /> 추가
                      </button>
                    </div>
                  </div>

                  <div className="field-block">
                    <label className="input-label">신청 유형</label>
                    <select 
                      className="linear-select" 
                      value={reqType} 
                      onChange={(e) => setReqType(e.target.value)}
                    >
                      <option value="PREFERENCE_OFF">일반 희망 OFF</option>
                      <option value="ANNUAL_LEAVE">연차 휴가</option>
                      <option value="UNAVAILABLE">근무 불가일 등록</option>
                    </select>
                  </div>

                  <div className="field-block checkbox-block">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={reqIsImportant}
                        onChange={(e) => setReqIsImportant(e.target.checked)}
                      />
                      <span>반드시 보장 필요한 중요 신청 (+10점 가산)</span>
                    </label>
                  </div>

                  <div className="field-block">
                    <label className="input-label">신청 사유</label>
                    <textarea 
                      className="linear-textarea" 
                      placeholder="신청 사유를 입력하세요 (선택 사항)"
                      rows={3}
                      value={reqReason}
                      onChange={(e) => setReqReason(e.target.value)}
                    />
                  </div>

                  <button 
                    className="btn-submit-req" 
                    disabled={isSubmittingReq}
                    onClick={handleSubmitTimeOffRequest}
                  >
                    {isSubmittingReq ? '등록 중...' : '신청서 백엔드 제출하기'}
                  </button>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* 드로어 4: 병동 인력 현황 */}
              {/* ---------------------------------------------------- */}
              {activeDrawer === 'STAFF' && (
                <div className="drawer-section">
                  <div className="staff-list-linear">
                    {displayStaffList.map((s) => {
                      const stat = staffStats.get(s.id) || { d: 0, n: 0, off: 0, burden: 0 };
                      return (
                        <div 
                          key={s.id} 
                          className="staff-card-row clickable"
                          onClick={() => {
                            setSelectedStaffId(s.id);
                            setViewMode('MONTH');
                            setActiveDrawer('NONE');
                          }}
                          title="클릭하여 해당 간호사 월간 캘린더로 이동"
                        >
                          <div className="st-left">
                            <span className="st-name">
                              {s.display_name} <small>{s.role}</small>
                            </span>
                            <span className="st-count font-mono">
                              D {stat.d} · N {stat.n} · OFF {stat.off}
                            </span>
                          </div>
                          <div className="st-right">
                            <span className="burden-score-pill font-mono">{stat.burden}점</span>
                            <span className={`st-status ${s.active_status === 'ACTIVE' ? 'active' : 'leave'}`}>
                              {s.employment_type === 'PART_TIME' ? '단시간' : '재직'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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
          padding: 0 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #FFFFFF;
          gap: 10px;
          overflow-x: auto;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
          position: sticky;
          left: 0;
          background-color: #FFFFFF;
          z-index: 5;
        }
        .month-title-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .month-heading {
          font-size: 14px;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.02em;
          margin: 0;
          white-space: nowrap;
        }
        .month-nav-group {
          display: flex;
          align-items: center;
          gap: 3px;
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
          margin-left: 2px;
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
          gap: 10px;
          flex-shrink: 0;
        }
        .metric-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: #475569;
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          padding: 3px 9px;
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
          gap: 4px;
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
          gap: 6px;
          flex-shrink: 0;
        }
        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
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
          border-color: #0F172A;
          background-color: #F1F5F9;
        }

        .export-btn-group {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: 4px;
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
          padding: 6px 16px;
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

        /* ========================================================= */
        /* VIEW 1: 매트릭스 스타일 (STAFF Matrix) */
        /* ========================================================= */
        .matrix-viewport {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background-color: #FFFFFF;
        }
        .matrix-table-container {
          flex: 1;
          overflow: auto;
          background-color: #FFFFFF;
        }
        .matrix-table {
          width: max-content;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 12px;
        }

        .th-staff-fixed, .td-staff-fixed {
          position: sticky;
          left: 0;
          z-index: 20;
          background-color: #FFFFFF;
          border-right: 2px solid #E2E8F0;
          width: 140px;
          min-width: 140px;
          max-width: 140px;
          padding: 8px 10px;
          text-align: left;
        }
        thead th.th-staff-fixed {
          top: 0;
          z-index: 30;
          background-color: #F8FAFC;
          font-weight: 700;
          color: #334155;
          border-bottom: 1px solid #CBD5E1;
        }
        .matrix-row:hover .td-staff-fixed {
          background-color: #F8FAFC;
        }

        .staff-info-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .staff-name-wrap {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .staff-name {
          font-size: 12px;
          font-weight: 700;
          color: #0F172A;
          white-space: nowrap;
        }
        .staff-role-badge {
          font-size: 12px;
          color: #64748B;
          background-color: #F1F5F9;
          padding: 1px 4px;
          border-radius: 3px;
        }
        .staff-skill-tags {
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .skill-tag {
          font-size: 12px;
          padding: 0 4px;
          border-radius: 2px;
          font-weight: 600;
        }
        .skill-tag.charge { background-color: #FFE4E6; color: #E11D48; }
        .skill-tag.delivery { background-color: #E0E7FF; color: #4338CA; }
        .skill-tag.newgrad { background-color: #FEF3C7; color: #B45309; }

        .th-day-col {
          position: sticky;
          top: 0;
          z-index: 10;
          background-color: #F8FAFC;
          border-bottom: 1px solid #CBD5E1;
          border-right: 1px solid #E2E8F0;
          padding: 6px 4px;
          text-align: center;
          min-width: 42px;
          width: 42px;
        }
        .th-day-col.sun { color: #E11D48; background-color: #FFF5F5; }
        .th-day-col.sat { color: #2563EB; background-color: #F0F7FF; }
        .th-dow {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: inherit;
        }
        .th-day-num {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: inherit;
        }

        .td-matrix-cell {
          border-bottom: 1px solid #F1F5F9;
          border-right: 1px solid #F1F5F9;
          padding: 4px;
          text-align: center;
          cursor: pointer;
          background-color: #FFFFFF;
          transition: background-color 0.1s;
        }
        .td-matrix-cell.weekend {
          background-color: #FCFDFE;
        }
        .td-matrix-cell:hover {
          background-color: #F1F5F9;
        }

        .matrix-shift-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 28px;
          border-radius: 5px;
          font-weight: 700;
          font-size: 12px;
          position: relative;
          user-select: none;
        }
        .cell-shift-day {
          background-color: #FFE4E6;
          color: #E11D48;
          border: 1px solid #FECDD3;
        }
        .cell-shift-night {
          background-color: #DCFCE7;
          color: #166534;
          border: 1px solid #BBF7D0;
        }
        .cell-shift-off {
          background-color: #F1F5F9;
          color: #64748B;
          border: 1px solid #E2E8F0;
        }

        .pin-indicator {
          position: absolute;
          top: 1px;
          right: 1px;
          color: #0F172A;
          cursor: pointer;
        }

        .th-stat-fixed {
          position: sticky;
          top: 0;
          z-index: 10;
          background-color: #F8FAFC;
          border-bottom: 1px solid #CBD5E1;
          border-right: 1px solid #E2E8F0;
          padding: 8px 6px;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          width: 44px;
        }
        .th-stat-fixed.wide {
          width: 72px;
        }
        .td-stat-fixed {
          border-bottom: 1px solid #F1F5F9;
          border-right: 1px solid #F1F5F9;
          padding: 6px 4px;
          text-align: center;
          font-size: 12px;
          font-weight: 600;
        }
        .td-stat-fixed.d { color: #E11D48; background-color: #FFFBFB; }
        .td-stat-fixed.n { color: #166534; background-color: #FBFDFB; }
        .td-stat-fixed.off { color: #64748B; }
        .td-stat-fixed.burden {
          background-color: #FAFAFA;
        }
        .burden-badge {
          background-color: #F1F5F9;
          color: #0F172A;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 700;
        }

        /* 하단 고정 요약 행 */
        .matrix-foot-row {
          position: sticky;
          bottom: 0;
          z-index: 25;
          background-color: #F8FAFC;
          border-top: 2px solid #CBD5E1;
        }
        .foot-label {
          background-color: #F8FAFC !important;
          border-top: 2px solid #CBD5E1;
        }
        .foot-label span {
          font-size: 12px;
          font-weight: 700;
          color: #0F172A;
          display: block;
        }
        .foot-label small {
          font-size: 12px;
          color: #64748B;
        }
        .td-coverage-cell {
          border-right: 1px solid #E2E8F0;
          border-top: 2px solid #CBD5E1;
          padding: 6px 2px;
          text-align: center;
        }
        .td-coverage-cell.ok {
          background-color: #F8FAFC;
        }
        .td-coverage-cell.shortage {
          background-color: #FEF2F2;
        }
        .cov-counts {
          display: flex;
          flex-direction: column;
          font-size: 12px;
          line-height: 1.2;
          gap: 1px;
        }
        .c-day.ok { color: #E11D48; font-weight: 700; }
        .c-day.warn { color: #DC2626; font-weight: 800; background-color: #FEE2E2; }
        .c-night.ok { color: #166534; font-weight: 700; }
        .c-night.warn { color: #DC2626; font-weight: 800; background-color: #FEE2E2; }
        .td-foot-summary {
          border-top: 2px solid #CBD5E1;
          background-color: #F8FAFC;
          padding: 6px 10px;
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
        }

        /* ========================================================= */
        /* VIEW 2: 월간 캘린더 (MONTH View) */
        /* ========================================================= */
        .sub-view-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          background-color: #FAFAFA;
          border-bottom: 1px solid #EFEFEF;
          flex-shrink: 0;
        }
        .bar-label {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }
        .staff-select-box {
          border: 1px solid #CBD5E1;
          border-radius: 5px;
          padding: 4px 8px;
          font-size: 12px;
          color: #0F172A;
          background-color: #FFFFFF;
          font-weight: 600;
          outline: none;
        }
        .legend-strip {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: #64748B;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .legend-item .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .legend-item .dot.d { background-color: #E11D48; }
        .legend-item .dot.n { background-color: #166534; }
        .legend-item .dot.off { background-color: #94A3B8; }

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
        .pin-tag {
          margin-left: auto;
          color: #0F172A;
        }

        .cell-content {
          margin: 6px 0;
          display: flex;
          align-items: center;
        }
        .cal-shift-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 5px;
          font-size: 12px;
          font-weight: 700;
        }

        .cell-footer {
          display: flex;
          justify-content: flex-end;
        }
        .staff-indicator {
          font-size: 12px;
          color: #94A3B8;
        }

        /* ========================================================= */
        /* VIEW 3: 주간 집중 (WEEK View) */
        /* ========================================================= */
        .week-viewport {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background-color: #FFFFFF;
        }
        .week-pill-tabs {
          display: flex;
          gap: 4px;
        }
        .week-pill-tab {
          border: 1px solid #CBD5E1;
          background: #FFFFFF;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 12px;
          color: #475569;
          cursor: pointer;
        }
        .week-pill-tab.active {
          background: #0F172A;
          color: #FFFFFF;
          border-color: #0F172A;
          font-weight: 600;
        }
        .week-table-wrap {
          flex: 1;
          overflow: auto;
        }
        .th-day-col.wide {
          width: 140px;
          min-width: 140px;
        }
        .td-week-cell {
          border-bottom: 1px solid #F1F5F9;
          border-right: 1px solid #F1F5F9;
          padding: 6px;
          cursor: pointer;
        }
        .td-week-cell:hover {
          background-color: #F8FAFC;
        }
        .week-shift-card {
          padding: 6px 8px;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .card-label {
          font-size: 12px;
          font-weight: 700;
        }
        .card-time {
          font-size: 12px;
          opacity: 0.8;
        }

        /* ========================================================= */
        /* 3. 우측 슬라이드 드로어 (Drawer) */
        /* ========================================================= */
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
          margin: 0 0 10px 0;
        }
        .btn-rerun-solver {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background-color: #F8FAFC;
          border: 1px solid #CBD5E1;
          color: #0F172A;
          border-radius: 6px;
          padding: 7px 0;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 12px;
        }
        .btn-rerun-solver:hover {
          background-color: #F1F5F9;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
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

        /* 경합 안내 */
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
        .status-action-btn {
          border: none;
          font-size: 12px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
          cursor: pointer;
        }
        .status-action-btn.green {
          background-color: #DCFCE7;
          color: #166534;
        }
        .status-action-btn.blue {
          background-color: #E0F2FE;
          color: #0369A1;
        }
        .status-pill.green { background-color: #DCFCE7; color: #166534; }

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
        .checkbox-block {
          margin-bottom: 10px;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #0F172A;
          cursor: pointer;
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
        .staff-card-row.clickable {
          cursor: pointer;
          transition: background-color 0.1s;
        }
        .staff-card-row.clickable:hover {
          background-color: #F8FAFC;
          border-color: #CBD5E1;
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
        .burden-score-pill {
          font-size: 12px;
          font-weight: 700;
          color: #059669;
          background-color: #ECFDF5;
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
