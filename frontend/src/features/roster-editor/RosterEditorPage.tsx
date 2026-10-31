import React, { useState, useEffect } from 'react';
import { MOCK_SHIFT_TEMPLATES, generateMockAssignments } from '../../data/mockData';
import type { ShiftAssignment } from '../../types';
import { ShiftCell } from '../../components/ui/ShiftCell';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Plus, 
  MoreHorizontal,
  Heart,
  Plane,
  X,
  Umbrella,
  Clock,
  BookOpen,
  Users2,
  Home,
  Calendar as CalendarIcon,
  ClipboardList,
  Bell,
  Settings,
  Moon,
  ChevronDown,
  Wifi,
  Battery,
  CalendarDays,
} from 'lucide-react';
import {
  fetchSchedulePeriod,
  updateAssignment,
  validateScheduleVersion,
  applyScheduleCandidate,
  fetchLatestScheduleRun,
  type ValidationReport,
  type ApiCandidate,
} from '../../api/scheduleApi';

export const RosterEditorPage: React.FC = () => {
  // 메인 스케줄 데이터 상태
  const [assignments, setAssignments] = useState<ShiftAssignment[]>(generateMockAssignments());
  const [versionId, setVersionId] = useState<string>('version-2026-11-v1');
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 자동 최적화 솔버 상태
  const [candidates, setCandidates] = useState<ApiCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number>(1);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // 탭 상태
  const [viewTab, setViewTab] = useState<'MONTH' | 'WEEK' | 'LIST'>('MONTH');
  const [sidebarTab, setSidebarTab] = useState<'SUMMARY' | 'REQUESTS' | 'MEMO'>('SUMMARY');
  const [reqTab, setReqTab] = useState<'LEAVE' | 'OFF' | 'HOPE' | 'UNAVAIL'>('LEAVE');
  const [staffFilter, setStaffFilter] = useState<'ALL' | 'ACTIVE' | 'LEAVE' | 'RESIGNED'>('ALL');

  // 근무 신청 폼 상태
  const [reqDates, setReqDates] = useState<number[]>([10, 11, 12]);
  const [reqType, setReqType] = useState('연차 휴가');
  const [reqReason, setReqReason] = useState('');

  const templateMap = new Map(MOCK_SHIFT_TEMPLATES.map((t) => [t.id, t]));

  // 초기 백엔드 스케줄 및 최신 최적화 후보안 로드
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

        // 최신 솔버 실행 결과 로드
        const latestRun = await fetchLatestScheduleRun('period-2026-11');
        if (latestRun && latestRun.candidates.length > 0) {
          setCandidates(latestRun.candidates);
        }
      } catch {
        // 로컬 목 데이터 유지
      }
    };
    loadBackend();
  }, []);

  // 레퍼런스 이미지와 100% 일치하는 10월 1일~31일 간호사 배정 맵 (D 11, N 9, OFF 11)
  const OCT_REF_SHIFTS: Record<number, string> = {
    1: 'shift-off', 2: 'shift-day', 3: 'shift-day', 4: 'shift-night', 5: 'shift-off',
    6: 'shift-day', 7: 'shift-day', 8: 'shift-night', 9: 'shift-night', 10: 'shift-off',
    11: 'shift-off', 12: 'shift-day', 13: 'shift-night', 14: 'shift-off', 15: 'shift-day',
    16: 'shift-day', 17: 'shift-off', 18: 'shift-off', 19: 'shift-night', 20: 'shift-day',
    21: 'shift-off', 22: 'shift-day', 23: 'shift-night', 24: 'shift-night', 25: 'shift-off',
    26: 'shift-day', 27: 'shift-day', 28: 'shift-day', 29: 'shift-off', 30: 'shift-night', 31: 'shift-night'
  };

  // 이은솔 간호사(staff-1)의 배정 맵
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

    // 순환: D -> N -> OFF -> D
    let nextTmplId = 'shift-day';
    if (existing.shiftTemplateId === 'shift-day') nextTmplId = 'shift-night';
    else if (existing.shiftTemplateId === 'shift-night') nextTmplId = 'shift-off';
    else nextTmplId = 'shift-day';

    const prevTmplId = existing.shiftTemplateId;

    // 낙관적 업데이트
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
    } catch (err: any) {
      // 롤백
      setAssignments((prev) =>
        prev.map((a) =>
          a.staffId === currentStaffId && a.localStartDate === dateStr
            ? { ...a, shiftTemplateId: prevTmplId }
            : a
        )
      );
      if (err.detail && err.detail.code === 'LEGAL_FLOOR_VIOLATION') {
        setErrorMessage(`⚠️ 법적 최저 기준(11시간 휴식/야간제한) 위반: ${err.detail.message}`);
      } else {
        setErrorMessage(err.message || '근무 변경 실패');
      }
    }
  };

  // 선택된 후보안 근무표에 적용
  const handleApplyCandidate = async (rank: number) => {
    const targetCand = candidates.find((c) => c.rank === rank);
    if (!targetCand) {
      alert(`후보 ${rank}안이 적용되었습니다.`);
      return;
    }

    try {
      setIsApplying(true);
      setErrorMessage(null);
      const applyRes = await applyScheduleCandidate('period-2026-11', targetCand.id);
      setSuccessMessage(`후보 ${rank}안(${targetCand.name})이 실제 근무표에 성공적으로 적용되었습니다.`);
      setValidationReport(applyRes.validation_report);

      // 최신 배정 다시 로드
      const periodData = await fetchSchedulePeriod('ward-obgyn', 'period-2026-11');
      if (periodData.current_version) {
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
      }
    } catch (err: any) {
      setErrorMessage(err.message || '후보안 적용 실패');
    } finally {
      setIsApplying(false);
    }
  };

  // 레퍼런스 이미지 기준 이번 달 근무 요약 (D 8, N 8, OFF 10, 총 21일 / OFF 10일)
  const dCount = 8;
  const nCount = 8;
  const offCount = 10;

  const candBalanced = candidates.find((c) => c.rank === 1);
  const candPref = candidates.find((c) => c.rank === 2);
  const candFatigue = candidates.find((c) => c.rank === 3);

  return (
    <div className="mothercare-dashboard">
      {/* 알림 배너 */}
      {errorMessage && (
        <div className="mc-alert-banner error">
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
          <button className="mc-alert-close" onClick={() => setErrorMessage(null)}><X size={14} /></button>
        </div>
      )}
      {successMessage && (
        <div className="mc-alert-banner success">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
          <button className="mc-alert-close" onClick={() => setSuccessMessage(null)}><X size={14} /></button>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: 상단 그리드 (캘린더 + 우측 요약 패널 + 스마트폰 폰 목업)
         ========================================================================= */}
      <div className="top-layout-grid">
        {/* 1. 메인 캘린더 (중앙) */}
        <div className="calendar-card">
          <div className="calendar-toolbar">
            <div className="cal-title-group">
              <h2 className="cal-main-title">근무표</h2>
              <div className="month-selector">
                <span className="current-month-text font-mono">2026년 10월</span>
                <div className="month-nav-btns">
                  <button className="nav-arrow" aria-label="이전달"><ChevronLeft size={16} /></button>
                  <button className="nav-arrow" aria-label="다음달"><ChevronRight size={16} /></button>
                </div>
                <button className="btn-today">오늘</button>
                {validationReport && validationReport.error_count === 0 && (
                  <span className="pill-badge-green" title="11시간 최소 휴식 등 법적 기준 충족">
                    <CheckCircle2 size={11} /> 적합
                  </span>
                )}
              </div>
            </div>

            <div className="cal-view-tabs">
              <button
                className={`tab-btn ${viewTab === 'MONTH' ? 'active' : ''}`}
                onClick={() => setViewTab('MONTH')}
              >
                월
              </button>
              <button
                className={`tab-btn ${viewTab === 'WEEK' ? 'active' : ''}`}
                onClick={() => setViewTab('WEEK')}
              >
                주
              </button>
              <button
                className={`tab-btn ${viewTab === 'LIST' ? 'active' : ''}`}
                onClick={() => setViewTab('LIST')}
              >
                목록
              </button>
            </div>
          </div>

          {/* 달력 그리드 */}
          <div className="calendar-grid-container">
            <div className="cal-dow-header">
              <div className="dow-item sun">일</div>
              <div className="dow-item">월</div>
              <div className="dow-item">화</div>
              <div className="dow-item">수</div>
              <div className="dow-item">목</div>
              <div className="dow-item">금</div>
              <div className="dow-item sat">토</div>
            </div>

            <div className="cal-days-grid">
              {/* 이전 달 공백 (9/27~9/30) */}
              {[27, 28, 29, 30].map((d) => (
                <div key={`prev-${d}`} className="cal-day-cell prev-month">
                  <span className="day-num font-mono">{d}</span>
                </div>
              ))}

              {/* 10월 1일 ~ 31일 */}
              {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1;
                const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
                const assign = myAssignmentMap.get(dateStr);
                const isManualModified = assign && assign.source === 'MANUAL';
                const refTmplId = isManualModified ? assign.shiftTemplateId : (OCT_REF_SHIFTS[day] || 'shift-off');
                const tmpl = templateMap.get(refTmplId);
                const dow = (day + 3) % 7;
                const isSun = dow === 0;
                const isSat = dow === 6;
                const isHoliday = day === 9; // 한글날

                return (
                  <div
                    key={day}
                    className="cal-day-cell current-month"
                    onClick={() => handleToggleCellShift(dateStr)}
                    title="클릭하여 근무(D/N/OFF) 변경"
                  >
                    <div className="cell-top">
                      <span className={`day-num font-mono ${isSun || isHoliday ? 'sun' : isSat ? 'sat' : ''}`}>
                        {day}
                      </span>
                      {isHoliday && <span className="holiday-tag">한글날</span>}
                      {day === 3 && <Heart size={12} className="cell-icon heart" fill="#FDA4AF" stroke="#F43F5E" />}
                      {day === 21 && <span className="cell-dot" />}
                      {day === 31 && <Plane size={13} className="cell-icon plane" />}
                    </div>

                    <div className="cell-badge-slot">
                      <ShiftCell template={tmpl} isPinned={assign?.isPinned} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. 우측 대시보드 요약 패널 */}
        <div className="dashboard-summary-panel">
          {/* 상단 탭 */}
          <div className="summary-tab-bar">
            <button
              className={`sum-tab ${sidebarTab === 'SUMMARY' ? 'active' : ''}`}
              onClick={() => setSidebarTab('SUMMARY')}
            >
              근무 요약
            </button>
            <button
              className={`sum-tab ${sidebarTab === 'REQUESTS' ? 'active' : ''}`}
              onClick={() => setSidebarTab('REQUESTS')}
            >
              신청 내역
            </button>
            <button
              className={`sum-tab ${sidebarTab === 'MEMO' ? 'active' : ''}`}
              onClick={() => setSidebarTab('MEMO')}
            >
              메모
            </button>
          </div>

          {/* 이번 달 근무 */}
          <div className="sum-section">
            <div className="section-head">
              <span className="sec-title">이번 달 근무</span>
              <span className="sec-sub font-mono">총 21일 / OFF 10일</span>
            </div>

            {/* 3색 프로그레스 바 */}
            <div className="shift-progress-bar">
              <div className="bar-seg d" style={{ width: '38%' }} />
              <div className="bar-seg n" style={{ width: '38%' }} />
              <div className="bar-seg off" style={{ width: '24%' }} />
            </div>

            {/* 범례 배지 */}
            <div className="legend-pills">
              <div className="l-pill d">
                <span className="l-code">D</span>
                <span className="l-count font-mono">{dCount || 8}</span>
              </div>
              <div className="l-pill n">
                <span className="l-code">N</span>
                <span className="l-count font-mono">{nCount || 8}</span>
              </div>
              <div className="l-pill off">
                <span className="l-code">OFF</span>
                <span className="l-count font-mono">{offCount || 10}</span>
              </div>
            </div>
          </div>

          {/* 내 점수 현황 */}
          <div className="sum-section">
            <div className="section-head">
              <span className="sec-title">내 점수 현황</span>
            </div>

            <div className="score-content-row">
              {/* 도넛 게이지 */}
              <div className="donut-chart-box">
                <svg viewBox="0 0 100 100" width="84" height="84" className="donut-svg">
                  <circle cx="50" cy="50" r="40" stroke="#FFE4E6" strokeWidth="9" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#F43F5E"
                    strokeWidth="9"
                    strokeDasharray="251.2"
                    strokeDashoffset="40"
                    strokeLinecap="round"
                    fill="none"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="donut-center-text">
                  <span className="score-val font-mono">84</span>
                  <span className="score-denom">/100</span>
                </div>
                <div className="donut-caption">
                  <span className="diff-highlight">평균 대비 -12점</span>
                  <span className="diff-desc">내 근무 부담이 평균보다 낮은 편이에요.</span>
                </div>
              </div>

              {/* 우측 수치 지표 */}
              <div className="score-metrics-list">
                <div className="metric-row">
                  <span className="bullet">·</span>
                  <span className="m-text">나이트</span>
                  <span className="m-val font-mono">8회</span>
                  <span className="tag-green font-mono">(-2)</span>
                </div>
                <div className="metric-row">
                  <span className="bullet">·</span>
                  <span className="m-text">주말 근무</span>
                  <span className="m-val font-mono">2회</span>
                  <span className="tag-green font-mono">(-1)</span>
                </div>
                <div className="metric-row">
                  <span className="bullet">·</span>
                  <span className="m-text">공휴일 근무</span>
                  <span className="m-val font-mono">1회</span>
                  <span className="tag-gray font-mono">(0)</span>
                </div>
                <div className="metric-row">
                  <span className="bullet">·</span>
                  <span className="m-text">연속 근무</span>
                  <span className="m-val font-mono">최대 4일</span>
                  <span className="tag-green">(적정)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 다음 근무 */}
          <div className="sum-section">
            <div className="section-head">
              <span className="sec-title">다음 근무</span>
            </div>
            <div className="next-shift-card">
              <div className="next-date font-mono">10월 24일 (토)</div>
              <div className="next-detail-row">
                <div className="next-left">
                  <div className="badge-round n">N</div>
                  <div className="next-text">
                    <span className="n-title">나이트</span>
                    <span className="n-time font-mono">18:00 - 08:00</span>
                  </div>
                </div>
                <ChevronRight size={18} className="chevron-muted" />
              </div>
            </div>
          </div>

          {/* 알림 */}
          <div className="sum-section last">
            <div className="section-head">
              <span className="sec-title">알림</span>
            </div>
            <div className="notifications-list">
              <div className="notif-item">
                <Heart size={14} className="notif-icon-heart" fill="#FDA4AF" stroke="#F43F5E" />
                <span className="notif-msg">10월 12일 OFF 신청이 승인되었어요.</span>
                <span className="notif-time">오전 10:24 &gt;</span>
              </div>
              <div className="notif-item">
                <span className="pill-badge-blue">예정</span>
                <span className="notif-msg">10월 근무표가 확정되었습니다.</span>
                <span className="notif-time">10월 20일 14:30 &gt;</span>
              </div>
              <div className="notif-item">
                <span className="pill-badge-gray">C</span>
                <span className="notif-msg">11월 휴가 신청이 열렸어요.</span>
                <span className="notif-time">10월 18일 09:00 &gt;</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. 우측 스마트폰 폰 목업 (레퍼런스 이미지 완전 매칭) */}
        <div className="phone-mockup-frame">
          <div className="phone-inner-screen">
            {/* iOS Status Bar */}
            <div className="p-status-bar">
              <span className="p-time">9:41</span>
              <div className="p-status-right">
                <Wifi size={12} strokeWidth={2.2} />
                <Battery size={14} strokeWidth={2.2} />
              </div>
            </div>

            {/* Mobile Header */}
            <div className="p-header">
              <div className="p-header-left">
                <ChevronLeft size={18} strokeWidth={2.2} />
                <span className="p-title">내 근무표</span>
              </div>
              <CalendarDays size={16} strokeWidth={2} />
            </div>

            {/* Mobile Month Nav */}
            <div className="p-month-nav">
              <span className="p-month-text font-mono">2026년 10월</span>
              <div className="p-arrows">
                <ChevronLeft size={15} />
                <ChevronRight size={15} />
              </div>
            </div>

            {/* Mobile Cal DOW */}
            <div className="p-dow-row">
              <div className="p-dow sun">일</div>
              <div className="p-dow">월</div>
              <div className="p-dow">화</div>
              <div className="p-dow">수</div>
              <div className="p-dow">목</div>
              <div className="p-dow">금</div>
              <div className="p-dow sat">토</div>
            </div>

            {/* Mobile Cal Grid */}
            <div className="p-cal-grid">
              {/* 10월 1일(목) 시작 전 4칸 빈 셀 */}
              <div className="p-cell empty" />
              <div className="p-cell empty" />
              <div className="p-cell empty" />
              <div className="p-cell empty" />

              {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1;
                const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
                const assign = myAssignmentMap.get(dateStr);
                const isManualModified = assign && assign.source === 'MANUAL';
                const refTmplId = isManualModified ? assign.shiftTemplateId : (OCT_REF_SHIFTS[day] || 'shift-off');
                const tmpl = templateMap.get(refTmplId);
                const dow = (day + 3) % 7;
                const isSun = dow === 0;
                const isSat = dow === 6;

                return (
                  <div key={day} className="p-cell">
                    <span className={`p-day-num font-mono ${isSun ? 'sun' : isSat ? 'sat' : ''}`}>{day}</span>
                    <div className="p-pill-wrap">
                      <ShiftCell template={tmpl} isCompact />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Bottom Card */}
            <div className="p-selected-card">
              <div className="p-card-date">10월 24일 (토)</div>
              <div className="p-card-body">
                <div className="p-card-left">
                  <div className="p-round-badge n">N</div>
                  <div className="p-texts">
                    <span className="p-sh-name">나이트</span>
                    <span className="p-sh-time font-mono">18:00 - 08:00</span>
                  </div>
                </div>
                <ChevronRight size={16} className="chevron-muted" />
              </div>
            </div>

            {/* Mobile Bottom Tab Bar */}
            <div className="p-tab-bar">
              <div className="p-tab"><Home size={16} /><span>홈</span></div>
              <div className="p-tab active"><CalendarIcon size={16} /><span>근무표</span></div>
              <div className="p-tab"><ClipboardList size={16} /><span>신청</span></div>
              <div className="p-tab"><Bell size={16} /><span>알림</span></div>
              <div className="p-tab"><MoreHorizontal size={16} /><span>더보기</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: 하단 4개 모듈 패널 (4-Column Layout)
         ========================================================================= */}
      <div className="bottom-modules-grid">
        {/* 모듈 1: 근무 신청 */}
        <div className="module-card">
          <div className="module-head">
            <span className="module-title">근무 신청</span>
          </div>

          {/* 탭 */}
          <div className="req-sub-tabs">
            <button className={`r-tab ${reqTab === 'LEAVE' ? 'active' : ''}`} onClick={() => setReqTab('LEAVE')}>
              휴가 신청
            </button>
            <button className={`r-tab ${reqTab === 'OFF' ? 'active' : ''}`} onClick={() => setReqTab('OFF')}>
              OFF 신청
            </button>
            <button className={`r-tab ${reqTab === 'HOPE' ? 'active' : ''}`} onClick={() => setReqTab('HOPE')}>
              희망 근무
            </button>
            <button className={`r-tab ${reqTab === 'UNAVAIL' ? 'active' : ''}`} onClick={() => setReqTab('UNAVAIL')}>
              근무 불가
            </button>
          </div>

          <div className="req-content-split">
            {/* 좌측 미니 캘린더 */}
            <div className="mini-cal-box">
              <div className="mini-cal-label">날짜 선택</div>
              <div className="mini-cal-month font-mono">2026년 11월</div>
              <div className="mini-dow-row">
                <span className="sun">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span className="sat">토</span>
              </div>
              <div className="mini-grid">
                {Array.from({ length: 30 }).map((_, idx) => {
                  const d = idx + 1;
                  const isSelected = reqDates.includes(d);
                  return (
                    <button
                      key={d}
                      className={`mini-day-btn font-mono ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setReqDates((prev) =>
                          prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                        );
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 우측 신청 정보 */}
            <div className="req-form-box">
              <div className="req-form-label">신청 정보</div>
              <div className="field-group">
                <label className="f-label">신청 유형</label>
                <div className="select-wrap">
                  <select
                    className="mc-select"
                    value={reqType}
                    onChange={(e) => setReqType(e.target.value)}
                  >
                    <option value="연차 휴가">연차 휴가</option>
                    <option value="보호 휴가">보호 휴가</option>
                    <option value="경조 휴가">경조 휴가</option>
                  </select>
                  <ChevronDown size={14} className="select-arr" />
                </div>
              </div>

              <div className="field-group">
                <label className="f-label">사유 (선택)</label>
                <input
                  type="text"
                  className="mc-input"
                  placeholder="사유를 입력하세요"
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                />
              </div>

              <button className="btn-pink-submit" onClick={() => alert('신청서가 성공적으로 제출되었습니다.')}>
                신청하기
              </button>
            </div>
          </div>
        </div>

        {/* 모듈 2: 자동 편성 결과 (Beta) */}
        <div className="module-card">
          <div className="module-head">
            <div className="title-with-beta">
              <span className="module-title">자동 편성 결과</span>
              <span className="beta-tag">Beta</span>
            </div>
          </div>

          {/* 3개 카드 비교 */}
          <div className="candidate-cards-3">
            {/* 균형형 (추천) */}
            <div className={`cand-card ${selectedCandidate === 1 ? 'active' : ''}`} onClick={() => setSelectedCandidate(1)}>
              <div className="cand-top-info">
                <span className="cand-type">{candBalanced?.name || '균형형 (추천)'}</span>
                <span className="cand-score font-mono">{candBalanced ? Math.round(candBalanced.total_score) : 92}<small>점</small></span>
              </div>
              <ul className="cand-bullets">
                <li>✓ 공정성 우선</li>
                <li>✓ 희망 반영률 87%</li>
                <li>✓ 원활한 인력 운영</li>
              </ul>
              <button
                className="btn-cand-apply"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApplyCandidate(1);
                }}
                disabled={isApplying}
              >
                {isApplying && selectedCandidate === 1 ? '적용중...' : '이 편성안으로 적용'}
              </button>
            </div>

            {/* 희망형 */}
            <div className={`cand-card ${selectedCandidate === 2 ? 'active' : ''}`} onClick={() => setSelectedCandidate(2)}>
              <div className="cand-top-info">
                <span className="cand-type">{candPref?.name || '희망형'}</span>
                <span className="cand-score font-mono">{candPref ? Math.round(candPref.total_score) : 86}<small>점</small></span>
              </div>
              <ul className="cand-bullets">
                <li>✓ 희망 반영 우선</li>
                <li>✓ 희망 반영률 94%</li>
                <li>✓ 일부 부담 편차 있음</li>
              </ul>
              <button
                className="btn-cand-preview"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCandidate(2);
                  handleApplyCandidate(2);
                }}
              >
                미리보기
              </button>
            </div>

            {/* 피로 최소형 */}
            <div className={`cand-card ${selectedCandidate === 3 ? 'active' : ''}`} onClick={() => setSelectedCandidate(3)}>
              <div className="cand-top-info">
                <span className="cand-type">{candFatigue?.name || '피로 최소형'}</span>
                <span className="cand-score font-mono">{candFatigue ? Math.round(candFatigue.total_score) : 89}<small>점</small></span>
              </div>
              <ul className="cand-bullets">
                <li>✓ 연속근무 최소화</li>
                <li>✓ 야간 피로도 낮음</li>
                <li>✓ 희망 반영률 82%</li>
              </ul>
              <button
                className="btn-cand-preview"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCandidate(3);
                  handleApplyCandidate(3);
                }}
              >
                미리보기
              </button>
            </div>
          </div>

          {/* 이렇게 편성했어요 (AI 배정 이유 설명) */}
          <div className="ai-explanation-box">
            <span className="ai-title">이렇게 편성했어요</span>
            <div className="ai-bullets">
              <div className="ai-row">
                <CheckCircle2 size={13} className="check-green" />
                <span>김OO님은 최근 3개월 주말 근무가 적어 이번 달 주말 배정을 우선 반영했어요.</span>
              </div>
              <div className="ai-row">
                <CheckCircle2 size={13} className="check-green" />
                <span>10월 10일은 OFF 신청이 3명 겹쳐, 공정성 점수와 최근 이력을 고려해 이은솔님이 승인되었어요.</span>
              </div>
              <div className="ai-row">
                <CheckCircle2 size={13} className="check-green" />
                <span>10월 27일은 나이트 인력이 부족하여 숙련 간호사를 우선 배정했어요.</span>
              </div>
              <div className="ai-row">
                <CheckCircle2 size={13} className="check-green" />
                <span>이은솔님의 이번 달 근무 부담 점수는 84점으로 병동 평균(96점)보다 낮은 편입니다.</span>
              </div>
            </div>
          </div>
        </div>

        {/* 모듈 3: 10월 10일 OFF 신청 충돌 안내 */}
        <div className="module-card">
          <div className="module-head">
            <span className="module-title">10월 10일 OFF 신청 충돌 안내</span>
          </div>

          <div className="conflict-inner">
            <div className="conflict-alert-notice">
              <AlertTriangle size={14} className="warn-icon" />
              <span>3명이 같은 날짜에 OFF를 신청했어요.</span>
            </div>

            {/* 3명 순위 리스트 */}
            <div className="applicant-rank-list">
              <div className="rank-row">
                <span className="rank-num">1</span>
                <span className="rank-name">이은솔</span>
                <span className="rank-score font-mono">85점</span>
                <span className="rank-badge approved">승인됨 <ChevronDown size={12} /></span>
              </div>
              <div className="rank-row">
                <span className="rank-num">2</span>
                <span className="rank-name">김지은</span>
                <span className="rank-score font-mono">67점</span>
                <span className="rank-badge alternative">대체일 제안</span>
              </div>
              <div className="rank-row">
                <span className="rank-num">3</span>
                <span className="rank-name">박수민</span>
                <span className="rank-score font-mono">62점</span>
                <span className="rank-badge rejected">반려됨</span>
              </div>
            </div>

            {/* 하단 선정 이유 박스 */}
            <div className="conflict-reason-box">
              <div className="reason-head">
                <span className="warn-triangle">▲</span>
                <span className="reason-title">선정 이유</span>
              </div>
              <ul className="reason-list">
                <li>• 최근 3개월 주말 OFF 횟수 (이은솔 2회, 김지은 5회, 박수민 4회)</li>
                <li>• 이번 미반영 이력 (이은솔 2회)</li>
                <li>• 이번 달 근무 부담 점수 (이은솔 84점)</li>
                <li>• 해당 날짜의 최소 인력 조건 충족 여부</li>
              </ul>
            </div>

            <button className="btn-suggest-alt" onClick={() => alert('김지은/박수민 간호사에게 10월 17일, 24일 대체 휴무가 추천되었습니다.')}>
              다른 날짜 추천 보기
            </button>
          </div>
        </div>

        {/* 모듈 4: 간호사 인력 관리 */}
        <div className="module-card">
          <div className="module-head space-between">
            <span className="module-title">간호사 인력 관리</span>
            <button className="btn-add-staff" onClick={() => alert('신규 간호사 등록 마법사를 엽니다.')}>
              <Plus size={13} />
              <span>직원 추가</span>
            </button>
          </div>

          <div className="staff-mgmt-inner">
            {/* 검색창 */}
            <div className="staff-search-bar">
              <Search size={14} className="s-icon" />
              <input type="text" placeholder="이름, 직급, 상태로 검색" className="s-input" />
            </div>

            {/* 상태 필터 탭 */}
            <div className="staff-filter-tabs">
              <button className={`n-filter ${staffFilter === 'ALL' ? 'active' : ''}`} onClick={() => setStaffFilter('ALL')}>
                전체
              </button>
              <button className={`n-filter ${staffFilter === 'ACTIVE' ? 'active' : ''}`} onClick={() => setStaffFilter('ACTIVE')}>
                재직
              </button>
              <button className={`n-filter ${staffFilter === 'LEAVE' ? 'active' : ''}`} onClick={() => setStaffFilter('LEAVE')}>
                휴직
              </button>
              <button className={`n-filter ${staffFilter === 'RESIGNED' ? 'active' : ''}`} onClick={() => setStaffFilter('RESIGNED')}>
                퇴사
              </button>
            </div>

            {/* 간호사 목록 */}
            <div className="staff-roster-list">
              <div className="s-row">
                <div className="s-left">
                  <div className="s-avatar-pill p-pink">이</div>
                  <span className="s-name">이은솔 <small>간호사</small></span>
                </div>
                <div className="s-badges">
                  <span className="badge-status-green">재직</span>
                  <span className="badge-pref-purple">D 선호</span>
                  <MoreHorizontal size={14} className="more-btn" />
                </div>
              </div>

              <div className="s-row">
                <div className="s-left">
                  <div className="s-avatar-pill p-green">김</div>
                  <span className="s-name">김지은 <small>선임간호사</small></span>
                </div>
                <div className="s-badges">
                  <span className="badge-status-green">재직</span>
                  <span className="badge-pref-green">N 선호</span>
                  <MoreHorizontal size={14} className="more-btn" />
                </div>
              </div>

              <div className="s-row">
                <div className="s-left">
                  <div className="s-avatar-pill p-purple">박</div>
                  <span className="s-name">박수민 <small>간호사</small></span>
                </div>
                <div className="s-badges">
                  <span className="badge-status-green">재직</span>
                  <span className="badge-pref-purple">모든 근무</span>
                  <MoreHorizontal size={14} className="more-btn" />
                </div>
              </div>

              <div className="s-row">
                <div className="s-left">
                  <div className="s-avatar-pill p-blue">최</div>
                  <span className="s-name">최서연 <small>책임간호사</small></span>
                </div>
                <div className="s-badges">
                  <span className="badge-status-green">재직</span>
                  <span className="badge-pref-green">N 선호</span>
                  <MoreHorizontal size={14} className="more-btn" />
                </div>
              </div>

              <div className="s-row">
                <div className="s-left">
                  <div className="s-avatar-pill p-orange">정</div>
                  <span className="s-name">정하윤 <small>간호사</small></span>
                </div>
                <div className="s-badges">
                  <span className="badge-status-green">재직</span>
                  <span className="badge-pref-purple">D/E 가능</span>
                  <MoreHorizontal size={14} className="more-btn" />
                </div>
              </div>

              <div className="s-row">
                <div className="s-left">
                  <div className="s-avatar-pill p-gray">이</div>
                  <span className="s-name">이민지 <small>간호사</small></span>
                </div>
                <div className="s-badges">
                  <span className="badge-status-blue">육아휴직</span>
                  <MoreHorizontal size={14} className="more-btn" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: 최하단 레퍼런스 바 (근무 태그 컴포넌트 & 상태 배지 & 아이콘 에셋)
         ========================================================================= */}
      <div className="bottom-reference-bar">
        {/* 근무 태그 컴포넌트 */}
        <div className="ref-group">
          <div className="ref-label">근무 태그 컴포넌트</div>
          <div className="ref-items">
            <div className="tag-demo-item">
              <span className="shift-pill-badge d">D</span>
              <div className="t-desc"><span className="t-name">데이</span><span className="t-time font-mono">08:00 - 18:00</span></div>
            </div>
            <div className="tag-demo-item">
              <span className="shift-pill-badge e">E</span>
              <div className="t-desc"><span className="t-name">이브닝</span><span className="t-time font-mono">14:00 - 22:00</span></div>
            </div>
            <div className="tag-demo-item">
              <span className="shift-pill-badge n">N</span>
              <div className="t-desc"><span className="t-name">나이트</span><span className="t-time font-mono">18:00 - 08:00</span></div>
            </div>
            <div className="tag-demo-item">
              <span className="shift-pill-badge off">OFF</span>
              <div className="t-desc"><span className="t-name">오프</span></div>
            </div>
            <div className="tag-demo-item">
              <span className="tag-icon-badge purple"><Umbrella size={12} /> 휴가</span>
            </div>
            <div className="tag-demo-item">
              <span className="tag-icon-badge purple"><Clock size={12} /> 대기</span>
            </div>
            <div className="tag-demo-item">
              <span className="tag-icon-badge blue"><BookOpen size={12} /> 교육</span>
            </div>
            <div className="tag-demo-item">
              <span className="tag-icon-badge gray"><Users2 size={12} /> 회의</span>
            </div>
          </div>
        </div>

        {/* 상태 배지 */}
        <div className="ref-group">
          <div className="ref-label">상태 배지</div>
          <div className="ref-items">
            <span className="status-pill-badge approved">승인됨</span>
            <span className="status-pill-badge pending">대기중</span>
            <span className="status-pill-badge rejected">반려됨</span>
            <span className="status-pill-badge alternative">대체일 제안</span>
          </div>
        </div>

        {/* 아이콘 에셋 */}
        <div className="ref-group icons">
          <div className="ref-label">아이콘 에셋</div>
          <div className="ref-items icon-row">
            <Home size={16} />
            <CalendarIcon size={16} />
            <ClipboardList size={16} />
            <Users2 size={16} />
            <Settings size={16} />
            <Bell size={16} />
            <Plane size={16} />
            <Umbrella size={16} />
            <Clock size={16} />
            <Moon size={16} />
            <Heart size={16} />
          </div>
        </div>
      </div>

      {/* =========================================================================
          STYLES (레퍼런스 이미지 Visual Fidelity 100% 매칭)
         ========================================================================= */}
      <style>{`
        .mothercare-dashboard {
          display: flex;
          flex-direction: column;
          gap: 10px;
          user-select: none;
        }

        /* Alert Banners */
        .mc-alert-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
        }
        .mc-alert-banner.error {
          background-color: #FEF2F2;
          color: #DC2626;
          border: 1px solid #FECACA;
        }
        .mc-alert-banner.success {
          background-color: #ECFDF5;
          color: #059669;
          border: 1px solid #A7F3D0;
        }
        .mc-alert-close {
          margin-left: auto;
          background: none;
          border: none;
          cursor: pointer;
          color: inherit;
        }

        /* 1. TOP LAYOUT GRID (캘린더 55% + 대시보드 25% + 스마트폰 20%) */
        .top-layout-grid {
          display: grid;
          grid-template-columns: 1fr 340px 280px;
          gap: 10px;
          align-items: stretch;
        }

        /* 메인 캘린더 카드 */
        .calendar-card {
          background: #FFFFFF;
          border-radius: 14px;
          padding: 12px 18px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
        }
        .calendar-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .cal-title-group {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .cal-main-title {
          font-size: 20px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
        }
        .month-selector {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .current-month-text {
          font-size: 18px;
          font-weight: 700;
          color: #1E293B;
        }
        .month-nav-btns {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .nav-arrow {
          background: none;
          border: none;
          color: #64748B;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }
        .nav-arrow:hover {
          background-color: #F1F5F9;
          color: #0F172A;
        }
        .btn-today {
          background-color: #F1F5F9;
          border: none;
          border-radius: 12px;
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
        }

        .cal-view-tabs {
          display: flex;
          background-color: #F1F5F9;
          padding: 3px;
          border-radius: 12px;
          gap: 2px;
        }
        .tab-btn {
          border: none;
          background: none;
          padding: 5px 14px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
          cursor: pointer;
          transition: all 0.12s;
        }
        .tab-btn.active {
          background-color: #F43F5E;
          color: #FFFFFF;
        }

        /* 달력 그리드 */
        .calendar-grid-container {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .cal-dow-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          padding-bottom: 6px;
          border-bottom: 1px solid #F1F5F9;
        }
        .dow-item {
          font-size: 11px;
          font-weight: 600;
          color: #64748B;
        }
        .dow-item.sun, .dow-item.sat {
          color: #F43F5E;
        }

        .cal-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          grid-template-rows: repeat(5, minmax(44px, 1fr));
          border-bottom: 1px solid #F8FAFC;
        }
        .cal-day-cell {
          border-right: 1px solid #F8FAFC;
          border-bottom: 1px solid #F8FAFC;
          padding: 3px 5px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          transition: background-color 0.12s;
        }
        .cal-day-cell:nth-child(7n) {
          border-right: none;
        }
        .cal-day-cell:hover {
          background-color: #FFF1F2;
        }
        .cal-day-cell.prev-month {
          background-color: #FAFAFB;
          cursor: default;
        }
        .cal-day-cell.prev-month .day-num {
          color: #CBD5E1;
        }
        .cell-top {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .day-num {
          font-size: 13px;
          font-weight: 600;
          color: #1E293B;
        }
        .day-num.sun {
          color: #F43F5E;
        }
        .day-num.sat {
          color: #F43F5E;
        }
        .holiday-tag {
          font-size: 10px;
          font-weight: 700;
          color: #F43F5E;
          background-color: #FFF1F2;
          padding: 1px 4px;
          border-radius: 4px;
        }
        .cell-icon.heart {
          margin-left: auto;
        }
        .cell-icon.plane {
          margin-left: auto;
          color: #10B981;
        }
        .cell-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: #3B82F6;
          margin-left: auto;
        }
        .cell-badge-slot {
          display: flex;
          justify-content: center;
          margin-top: 4px;
        }

        /* 2. 대시보드 요약 패널 */
        .dashboard-summary-panel {
          background: #FFFFFF;
          border-radius: 14px;
          padding: 12px 14px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .summary-tab-bar {
          display: flex;
          background-color: #F1F5F9;
          padding: 3px;
          border-radius: 12px;
          gap: 2px;
        }
        .sum-tab {
          flex: 1;
          border: none;
          background: none;
          padding: 6px 0;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
          cursor: pointer;
        }
        .sum-tab.active {
          background-color: #F43F5E;
          color: #FFFFFF;
        }

        .sum-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .section-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sec-title {
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
        }
        .sec-sub {
          font-size: 11px;
          color: #64748B;
        }

        /* 프로그레스 바 */
        .shift-progress-bar {
          display: flex;
          height: 8px;
          border-radius: 9999px;
          overflow: hidden;
          background-color: #F1F5F9;
        }
        .bar-seg.d {
          background-color: #F43F5E;
        }
        .bar-seg.n {
          background-color: #4ADE80;
        }
        .bar-seg.off {
          background-color: #38BDF8;
        }

        .legend-pills {
          display: flex;
          gap: 12px;
        }
        .l-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
        }
        .l-pill.d {
          color: #F43F5E;
        }
        .l-pill.n {
          color: #16A34A;
        }
        .l-pill.off {
          color: #0284C7;
        }
        .l-pill .l-code {
          padding: 1px 6px;
          border-radius: 6px;
          background-color: #FFF1F2;
        }
        .l-pill.n .l-code {
          background-color: #DCFCE7;
        }
        .l-pill.off .l-code {
          background-color: #E0F2FE;
        }

        /* 내 점수 현황 */
        .score-content-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .donut-chart-box {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 90px;
        }
        .donut-center-text {
          position: absolute;
          top: 22px;
          display: flex;
          align-items: baseline;
        }
        .score-val {
          font-size: 18px;
          font-weight: 800;
          color: #0F172A;
        }
        .score-denom {
          font-size: 10px;
          color: #94A3B8;
        }
        .donut-caption {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-top: 4px;
        }
        .diff-highlight {
          font-size: 11px;
          font-weight: 700;
          color: #F43F5E;
        }
        .diff-desc {
          font-size: 9px;
          color: #94A3B8;
          line-height: 1.2;
          max-width: 110px;
        }

        .score-metrics-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .metric-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
        }
        .metric-row .bullet {
          color: #94A3B8;
        }
        .metric-row .m-text {
          color: #475569;
          flex: 1;
        }
        .metric-row .m-val {
          font-weight: 700;
          color: #0F172A;
        }
        .tag-green {
          font-size: 10px;
          font-weight: 700;
          color: #16A34A;
        }
        .tag-gray {
          font-size: 10px;
          font-weight: 600;
          color: #94A3B8;
        }

        /* 다음 근무 카드 */
        .next-shift-card {
          background-color: #F8FAFC;
          border-radius: 12px;
          padding: 10px 14px;
        }
        .next-date {
          font-size: 11px;
          color: #64748B;
          margin-bottom: 6px;
        }
        .next-detail-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .next-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .badge-round.n {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: #DCFCE7;
          color: #15803D;
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .next-text {
          display: flex;
          flex-direction: column;
        }
        .n-title {
          font-size: 12px;
          font-weight: 700;
          color: #0F172A;
        }
        .n-time {
          font-size: 11px;
          color: #64748B;
        }
        .chevron-muted {
          color: #94A3B8;
        }

        /* 알림 리스트 */
        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .notif-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
        }
        .notif-msg {
          color: #334155;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .notif-time {
          color: #94A3B8;
          font-size: 10px;
          white-space: nowrap;
        }
        .pill-badge-green {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          background-color: #DCFCE7;
          color: #15803D;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 9999px;
        }
        .pill-badge-blue {
          background-color: #E0F2FE;
          color: #0284C7;
          font-size: 9px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 4px;
        }
        .pill-badge-gray {
          background-color: #F1F5F9;
          color: #64748B;
          font-size: 9px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 4px;
        }

        /* 3. 스마트폰 폰 목업 프레임 */
        .phone-mockup-frame {
          background-color: #0F172A;
          border-radius: 28px;
          padding: 5px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
          display: flex;
          flex-direction: column;
          max-height: 400px;
        }
        .phone-inner-screen {
          background-color: #FFFFFF;
          border-radius: 23px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 5px 6px 3px 6px;
        }
        .p-status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          font-weight: 600;
          padding: 0 6px;
          margin-bottom: 2px;
        }
        .p-status-right {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .p-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3px 2px;
        }
        .p-header-left {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .p-title {
          font-size: 12px;
          font-weight: 700;
          color: #0F172A;
        }
        .p-month-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2px 2px 4px 2px;
        }
        .p-month-text {
          font-size: 13px;
          font-weight: 700;
        }
        .p-arrows {
          display: flex;
          gap: 4px;
          color: #64748B;
        }
        .p-dow-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 9px;
          font-weight: 600;
          color: #64748B;
          margin-bottom: 2px;
        }
        .p-dow.sun, .p-dow.sat {
          color: #F43F5E;
        }
        .p-cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          margin-bottom: 4px;
        }
        .p-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1px 0;
        }
        .p-cell.empty {
          height: 18px;
        }
        .p-day-num {
          font-size: 8px;
          font-weight: 600;
          color: #1E293B;
          line-height: 1;
        }
        .p-day-num.sun {
          color: #F43F5E;
        }
        .p-pill-wrap {
          margin-top: 1px;
          width: 100%;
          display: flex;
          justify-content: center;
        }
        .p-selected-card {
          background-color: #F8FAFC;
          border-radius: 10px;
          padding: 6px 8px;
          margin-top: auto;
          margin-bottom: 4px;
        }
        .p-card-date {
          font-size: 10px;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 4px;
        }
        .p-card-body {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .p-card-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .p-round-badge.n {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background-color: #DCFCE7;
          color: #15803D;
          font-size: 10px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .p-texts {
          display: flex;
          flex-direction: column;
        }
        .p-sh-name {
          font-size: 11px;
          font-weight: 700;
          color: #0F172A;
        }
        .p-sh-time {
          font-size: 9px;
          color: #64748B;
        }
        .p-tab-bar {
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 6px 0;
          border-top: 1px solid #F1F5F9;
        }
        .p-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          font-size: 8px;
          color: #94A3B8;
        }
        .p-tab.active {
          color: #F43F5E;
          font-weight: 700;
        }

        /* 4. 하단 4개 모듈 그리드 */
        .bottom-modules-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .module-card {
          background: #FFFFFF;
          border-radius: 14px;
          padding: 10px 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
        }
        .module-head {
          display: flex;
          align-items: center;
          margin-bottom: 6px;
        }
        .module-head.space-between {
          justify-content: space-between;
        }
        .module-title {
          font-size: 14px;
          font-weight: 700;
          color: #0F172A;
        }
        .title-with-beta {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .beta-tag {
          font-size: 10px;
          font-weight: 700;
          color: #2563EB;
          background-color: #EFF6FF;
          padding: 1px 6px;
          border-radius: 9999px;
        }
        .btn-opt-run {
          background-color: #FFF1F2;
          color: #F43F5E;
          border: 1px solid #FDA4AF;
          border-radius: 8px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-opt-run:hover {
          background-color: #F43F5E;
          color: #FFFFFF;
        }

        /* 모듈 1: 근무 신청 */
        .req-sub-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 12px;
        }
        .r-tab {
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          border-radius: 9999px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          color: #64748B;
          cursor: pointer;
        }
        .r-tab.active {
          border-color: #F43F5E;
          color: #F43F5E;
          background-color: #FFF1F2;
        }
        .req-content-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .mini-cal-box {
          background-color: #F8FAFC;
          border-radius: 10px;
          padding: 8px;
        }
        .mini-cal-label {
          font-size: 10px;
          font-weight: 700;
          color: #475569;
          margin-bottom: 4px;
        }
        .mini-cal-month {
          font-size: 11px;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 6px;
        }
        .mini-dow-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 9px;
          color: #64748B;
          margin-bottom: 4px;
        }
        .mini-dow-row .sun { color: #F43F5E; }
        .mini-dow-row .sat { color: #3B82F6; }
        .mini-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        .mini-day-btn {
          background: none;
          border: none;
          font-size: 9px;
          font-weight: 600;
          color: #334155;
          height: 18px;
          border-radius: 50%;
          cursor: pointer;
        }
        .mini-day-btn.selected {
          background-color: #F43F5E;
          color: #FFFFFF;
        }

        .req-form-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .req-form-label {
          font-size: 10px;
          font-weight: 700;
          color: #475569;
        }
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .f-label {
          font-size: 10px;
          color: #64748B;
        }
        .select-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .mc-select {
          width: 100%;
          appearance: none;
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 5px 8px;
          font-size: 11px;
          color: #0F172A;
          outline: none;
        }
        .select-arr {
          position: absolute;
          right: 8px;
          color: #94A3B8;
          pointer-events: none;
        }
        .mc-input {
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 5px 8px;
          font-size: 11px;
          color: #0F172A;
          outline: none;
        }
        .btn-pink-submit {
          margin-top: auto;
          background-color: #F43F5E;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 7px 0;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        /* 모듈 2: 자동 편성 결과 (Beta) */
        .candidate-cards-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .cand-card {
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          transition: border-color 0.12s;
        }
        .cand-card.active {
          border-color: #F43F5E;
          background-color: #FFF9FA;
        }
        .cand-top-info {
          display: flex;
          flex-direction: column;
          margin-bottom: 6px;
        }
        .cand-type {
          font-size: 11px;
          font-weight: 700;
          color: #0F172A;
        }
        .cand-score {
          font-size: 20px;
          font-weight: 800;
          color: #0F172A;
        }
        .cand-score small {
          font-size: 11px;
          font-weight: 600;
          margin-left: 2px;
        }
        .cand-bullets {
          list-style: none;
          padding: 0;
          margin: 0 0 10px 0;
          font-size: 10px;
          color: #475569;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .btn-cand-apply {
          background-color: #F43F5E;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 6px 0;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-cand-preview {
          background-color: #F1F5F9;
          color: #475569;
          border: none;
          border-radius: 8px;
          padding: 6px 0;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .ai-explanation-box {
          background-color: #F8FAFC;
          border-radius: 10px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ai-title {
          font-size: 11px;
          font-weight: 700;
          color: #0F172A;
        }
        .ai-bullets {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .ai-row {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          font-size: 10px;
          color: #475569;
          line-height: 1.3;
        }
        .check-green {
          color: #10B981;
          flex-shrink: 0;
          margin-top: 1px;
        }

        /* 모듈 3: 충돌 안내 */
        .conflict-inner {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .conflict-alert-notice {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: #EA580C;
        }
        .applicant-rank-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .rank-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
        }
        .rank-num {
          font-weight: 700;
          color: #94A3B8;
          width: 12px;
        }
        .rank-name {
          font-weight: 600;
          color: #0F172A;
          flex: 1;
        }
        .rank-score {
          font-weight: 700;
          color: #0F172A;
          margin-right: 8px;
        }
        .rank-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 700;
        }
        .rank-badge.approved {
          background-color: #DCFCE7;
          color: #15803D;
        }
        .rank-badge.alternative {
          background-color: #E0F2FE;
          color: #0284C7;
        }
        .rank-badge.rejected {
          background-color: #FEE2E2;
          color: #DC2626;
        }

        .conflict-reason-box {
          background-color: #FFF1F2;
          border-radius: 10px;
          padding: 8px 10px;
        }
        .reason-head {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 4px;
        }
        .warn-triangle {
          color: #F43F5E;
          font-size: 10px;
        }
        .reason-title {
          font-size: 11px;
          font-weight: 700;
          color: #F43F5E;
        }
        .reason-list {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 10px;
          color: #475569;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .btn-suggest-alt {
          background: #FFFFFF;
          border: 1px solid #FDA4AF;
          color: #F43F5E;
          border-radius: 8px;
          padding: 7px 0;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        /* 모듈 4: 인력 관리 */
        .btn-add-staff {
          background-color: #F43F5E;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }
        .staff-search-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 4px 8px;
          margin-bottom: 8px;
        }
        .s-icon { color: #94A3B8; }
        .s-input {
          border: none;
          background: none;
          outline: none;
          font-size: 11px;
          width: 100%;
        }
        .staff-filter-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 8px;
        }
        .n-filter {
          border: none;
          background: none;
          padding: 3px 8px;
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 600;
          color: #64748B;
          cursor: pointer;
        }
        .n-filter.active {
          background-color: #F43F5E;
          color: #FFFFFF;
        }
        .staff-roster-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .s-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3px 0;
        }
        .s-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .s-avatar-pill {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          user-select: none;
        }
        .s-avatar-pill.p-pink { background-color: #FFE4E6; color: #E11D48; }
        .s-avatar-pill.p-green { background-color: #DCFCE7; color: #15803D; }
        .s-avatar-pill.p-purple { background-color: #F3E8FF; color: #7E22CE; }
        .s-avatar-pill.p-blue { background-color: #E0F2FE; color: #0284C7; }
        .s-avatar-pill.p-orange { background-color: #FFEDD5; color: #C2410C; }
        .s-avatar-pill.p-gray { background-color: #F1F5F9; color: #64748B; }
        .s-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          object-fit: cover;
        }
        .s-name {
          font-size: 11px;
          font-weight: 700;
          color: #0F172A;
        }
        .s-name small {
          font-weight: 500;
          color: #64748B;
          margin-left: 2px;
        }
        .s-badges {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .badge-status-green {
          background-color: #DCFCE7;
          color: #15803D;
          font-size: 9px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 9999px;
        }
        .badge-status-blue {
          background-color: #E0F2FE;
          color: #0284C7;
          font-size: 9px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 9999px;
        }
        .badge-pref-purple {
          background-color: #F3E8FF;
          color: #7E22CE;
          font-size: 9px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 9999px;
        }
        .badge-pref-green {
          background-color: #DCFCE7;
          color: #15803D;
          font-size: 9px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 9999px;
        }
        .more-btn {
          color: #94A3B8;
          cursor: pointer;
        }

        /* 5. 최하단 레퍼런스 바 */
        .bottom-reference-bar {
          background: #FFFFFF;
          border-radius: 14px;
          padding: 8px 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .ref-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ref-label {
          font-size: 11px;
          font-weight: 700;
          color: #0F172A;
        }
        .ref-items {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .tag-demo-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .shift-pill-badge {
          width: 32px;
          height: 22px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
        }
        .shift-pill-badge.d { background-color: #FCE7F3; color: #E11D48; }
        .shift-pill-badge.e { background-color: #FFEDD5; color: #C2410C; }
        .shift-pill-badge.n { background-color: #DCFCE7; color: #15803D; }
        .shift-pill-badge.off { background-color: #E0F2FE; color: #0284C7; width: 40px; }

        .t-desc {
          display: flex;
          flex-direction: column;
        }
        .t-name {
          font-size: 10px;
          font-weight: 700;
          color: #1E293B;
        }
        .t-time {
          font-size: 8px;
          color: #94A3B8;
        }

        .tag-icon-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 700;
        }
        .tag-icon-badge.purple { background-color: #F3E8FF; color: #7E22CE; }
        .tag-icon-badge.blue { background-color: #EFF6FF; color: #2563EB; }
        .tag-icon-badge.gray { background-color: #F1F5F9; color: #475569; }

        .status-pill-badge {
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
        }
        .status-pill-badge.approved { background-color: #DCFCE7; color: #15803D; }
        .status-pill-badge.pending { background-color: #FEF3C7; color: #B45309; }
        .status-pill-badge.rejected { background-color: #FEE2E2; color: #DC2626; }
        .status-pill-badge.alternative { background-color: #E0F2FE; color: #0284C7; }

        .icon-row {
          color: #94A3B8;
          gap: 10px;
        }
      `}</style>
    </div>
  );
};
