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
  X
} from 'lucide-react';
import {
  fetchSchedulePeriod,
  updateAssignment,
  validateScheduleVersion,
  type ValidationReport,
} from '../../api/scheduleApi';

export const RosterEditorPage: React.FC = () => {
  // 메인 스케줄 데이터 상태
  const [assignments, setAssignments] = useState<ShiftAssignment[]>(generateMockAssignments());
  const [versionId, setVersionId] = useState<string>('version-2026-11-v1');
  const [isPublished, setIsPublished] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 탭 상태
  const [viewTab, setViewTab] = useState<'MONTH' | 'WEEK' | 'LIST'>('MONTH');
  const [sidebarTab, setSidebarTab] = useState<'SUMMARY' | 'REQUESTS' | 'MEMO'>('SUMMARY');
  const [reqTab, setReqTab] = useState<'LEAVE' | 'OFF' | 'HOPE' | 'UNAVAIL'>('LEAVE');
  const [staffFilter, setStaffFilter] = useState<'ALL' | 'ACTIVE' | 'LEAVE' | 'RESIGNED'>('ALL');
  const [selectedCandidate, setSelectedCandidate] = useState<number>(1);

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
      } catch {
        // 로컬 목 데이터 유지
      }
    };
    loadBackend();
  }, []);

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

  // 통계 계산
  let dCount = 0;
  let nCount = 0;
  let offCount = 0;
  myAssignments.forEach((a) => {
    const tmpl = templateMap.get(a.shiftTemplateId);
    if (tmpl?.code === 'DAY') dCount++;
    else if (tmpl?.code === 'NIGHT') nCount++;
    else offCount++;
  });

  const handleApplyCandidate = () => {
    alert(`후보 ${selectedCandidate}안이 근무표에 성공적으로 적용되었습니다.`);
  };

  return (
    <div className="mothercare-dashboard">
      {/* 법적 제약 위반 알림 배너 */}
      {errorMessage && (
        <div className="mc-alert-banner">
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
          <button className="mc-alert-close" onClick={() => setErrorMessage(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: 상단 메인 캘린더 & 우측 대시보드 요약 패널
         ========================================================================= */}
      <div className="top-dashboard-grid">
        {/* 메인 캘린더 영역 */}
        <div className="calendar-card">
          <div className="calendar-toolbar">
            <div className="cal-title-group">
              <h2 className="cal-main-title">근무표</h2>
              <div className="month-selector">
                <span className="current-month-text">2026년 10월</span>
                <div className="month-nav-btns">
                  <button className="nav-arrow" aria-label="이전달"><ChevronLeft size={16} /></button>
                  <button className="nav-arrow" aria-label="다음달"><ChevronRight size={16} /></button>
                </div>
                <button className="btn-today">오늘</button>
                {isPublished && <span className="mc-chip-published">확정</span>}
                {validationReport && validationReport.error_count === 0 && (
                  <span className="mc-chip-legal" title="11시간 최소 휴식 및 야간 제약 100% 충족">
                    <CheckCircle2 size={11} /> 법적 최저 충족
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
                const tmpl = assign ? templateMap.get(assign.shiftTemplateId) : undefined;
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
                      <span className={`day-num font-mono ${isSun ? 'sun' : isSat ? 'sat' : ''}`}>
                        {day}
                      </span>
                      {isHoliday && <span className="holiday-tag">한글날</span>}
                      {day === 3 && <Heart size={12} className="cell-icon heart" fill="#FDA4AF" stroke="#F43F5E" />}
                      {day === 21 && <span className="cell-dot" />}
                      {day === 31 && <Plane size={13} className="cell-icon plane" />}
                    </div>

                    <div className="shift-capsule-wrapper">
                      <ShiftCell template={tmpl} isCompact isPinned={assign?.isPinned} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 우측 패널: 근무 요약, 내 점수, 다음 근무, 알림 */}
        <div className="summary-sidebar-panel">
          <div className="sidebar-tabs">
            <button
              className={`side-tab-btn ${sidebarTab === 'SUMMARY' ? 'active' : ''}`}
              onClick={() => setSidebarTab('SUMMARY')}
            >
              근무 요약
            </button>
            <button
              className={`side-tab-btn ${sidebarTab === 'REQUESTS' ? 'active' : ''}`}
              onClick={() => setSidebarTab('REQUESTS')}
            >
              신청 내역
            </button>
            <button
              className={`side-tab-btn ${sidebarTab === 'MEMO' ? 'active' : ''}`}
              onClick={() => setSidebarTab('MEMO')}
            >
              메모
            </button>
          </div>

          <div className="sidebar-card-body">
            {/* 이번 달 근무 요약 */}
            <div className="widget-card">
              <div className="widget-head">
                <span className="w-title">이번 달 근무</span>
                <span className="w-sub">총 21일 / OFF 10일</span>
              </div>

              {/* 3색 바 */}
              <div className="shift-progress-bar">
                <div className="p-segment day" style={{ width: '38%' }} />
                <div className="p-segment night" style={{ width: '38%' }} />
                <div className="p-segment off" style={{ width: '24%' }} />
              </div>

              <div className="shift-legend-row">
                <div className="legend-item">
                  <span className="dot day" />
                  <span className="l-name">D</span>
                  <strong className="l-count font-mono">{dCount}</strong>
                </div>
                <div className="legend-item">
                  <span className="dot night" />
                  <span className="l-name">N</span>
                  <strong className="l-count font-mono">{nCount}</strong>
                </div>
                <div className="legend-item">
                  <span className="dot off" />
                  <span className="l-name">OFF</span>
                  <strong className="l-count font-mono">{offCount}</strong>
                </div>
              </div>
            </div>

            {/* 내 점수 현황 */}
            <div className="widget-card score-widget">
              <div className="widget-head">
                <span className="w-title">내 점수 현황</span>
              </div>

              <div className="score-content-row">
                {/* 원형 도넛 차트 */}
                <div className="donut-box">
                  <div className="donut-circle">
                    <span className="donut-score font-mono">84</span>
                    <span className="donut-total">/ 100</span>
                  </div>
                </div>

                <div className="score-desc-box">
                  <div className="compare-text">
                    평균 대비 <strong className="highlight-text">-12점</strong>
                  </div>
                  <p className="compare-sub">내 근무 부담이 평균보다 낮은 편이에요.</p>

                  <div className="metric-mini-list">
                    <div className="mini-row">
                      <span>• 나이트</span>
                      <strong>8회 (-2)</strong>
                    </div>
                    <div className="mini-row">
                      <span>• 주말 근무</span>
                      <strong>2회 (-1)</strong>
                    </div>
                    <div className="mini-row">
                      <span>• 공휴일 근무</span>
                      <strong>1회 (0)</strong>
                    </div>
                    <div className="mini-row">
                      <span>• 연속 근무</span>
                      <strong className="status-good">최대 4일 (적정)</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 다음 근무 */}
            <div className="widget-card next-shift-card">
              <div className="next-shift-left">
                <span className="next-lbl">다음 근무</span>
                <span className="next-date">10월 24일 (토)</span>
              </div>
              <div className="next-shift-right">
                <div className="capsule-box">
                  <span className="mini-n-capsule">N</span>
                  <div className="shift-text-box">
                    <span className="s-name">나이트</span>
                    <span className="s-time font-mono">18:00 ~ 08:00</span>
                  </div>
                </div>
                <ChevronRight size={16} className="chevron" />
              </div>
            </div>

            {/* 알림 */}
            <div className="widget-card notify-widget">
              <div className="widget-head">
                <span className="w-title">알림</span>
              </div>
              <div className="notify-list">
                <div className="notify-row">
                  <span className="notify-icon heart">♥</span>
                  <div className="notify-text">
                    <p className="n-msg">10월 12일 OFF 신청이 승인되었어요.</p>
                    <span className="n-time">오전 10:24</span>
                  </div>
                </div>
                <div className="notify-row">
                  <span className="notify-tag scheduled">예정</span>
                  <div className="notify-text">
                    <p className="n-msg">10월 근무표가 확정되었습니다.</p>
                    <span className="n-time">10월 20일 14:30</span>
                  </div>
                </div>
                <div className="notify-row">
                  <span className="notify-tag open">신청</span>
                  <div className="notify-text">
                    <p className="n-msg">11월 휴가 신청이 열렸어요.</p>
                    <span className="n-time">10월 18일 09:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: 하단 4개 핵심 모듈 그리드 (레퍼런스 이미지 정확히 재현)
         ========================================================================= */}
      <div className="bottom-modules-grid">
        {/* 모듈 1: 근무 신청 */}
        <div className="module-card">
          <div className="module-head">
            <span className="module-title">근무 신청</span>
          </div>

          <div className="req-type-pill-tabs">
            <button className={`pill-tab ${reqTab === 'LEAVE' ? 'active' : ''}`} onClick={() => setReqTab('LEAVE')}>
              휴가 신청
            </button>
            <button className={`pill-tab ${reqTab === 'OFF' ? 'active' : ''}`} onClick={() => setReqTab('OFF')}>
              OFF 신청
            </button>
            <button className={`pill-tab ${reqTab === 'HOPE' ? 'active' : ''}`} onClick={() => setReqTab('HOPE')}>
              희망 근무
            </button>
            <button className={`pill-tab ${reqTab === 'UNAVAIL' ? 'active' : ''}`} onClick={() => setReqTab('UNAVAIL')}>
              근무 불가
            </button>
          </div>

          <div className="req-form-body">
            {/* 좌: 날짜 선택 미니 캘린더 */}
            <div className="mini-picker-col">
              <span className="picker-lbl">날짜 선택</span>
              <div className="mini-cal-box">
                <div className="mini-cal-header font-mono">2026년 11월</div>
                <div className="mini-cal-dows">
                  {['일', '월', '화', '수', '목', '금', '토'].map((w, idx) => (
                    <span key={w} className={`mini-dow ${idx === 0 ? 'sun' : idx === 6 ? 'sat' : ''}`}>{w}</span>
                  ))}
                </div>
                <div className="mini-cal-days">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const day = i + 1;
                    const isPicked = reqDates.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        className={`mini-day-btn font-mono ${isPicked ? 'picked' : ''}`}
                        onClick={() => {
                          if (reqDates.includes(day)) setReqDates(reqDates.filter((d) => d !== day));
                          else setReqDates([...reqDates, day]);
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 우: 신청 정보 폼 */}
            <div className="req-input-col">
              <div className="field-group">
                <label>신청 유형</label>
                <select value={reqType} onChange={(e) => setReqType(e.target.value)} className="select-input">
                  <option value="연차 휴가">연차 휴가</option>
                  <option value="일반 희망 OFF">일반 희망 OFF</option>
                  <option value="모성보호 휴가">모성보호 휴가</option>
                </select>
              </div>

              <div className="field-group">
                <label>사유 (선택)</label>
                <input
                  type="text"
                  placeholder="사유를 입력하세요"
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  className="text-input"
                />
              </div>

              <button className="btn-pink-submit" onClick={() => alert('신청서가 제출되었습니다.')}>
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
            <div className={`cand-card ${selectedCandidate === 1 ? 'active' : ''}`} onClick={() => setSelectedCandidate(1)}>
              <div className="cand-top-info">
                <span className="cand-type">균형형 (추천)</span>
                <span className="cand-score font-mono">92<small>점</small></span>
              </div>
              <ul className="cand-bullets">
                <li>✓ 공정성 우선</li>
                <li>✓ 희망 반영률 87%</li>
                <li>✓ 원활한 인력 운영</li>
              </ul>
              <button className="btn-cand-apply" onClick={handleApplyCandidate}>
                이 편성안으로 적용
              </button>
            </div>

            <div className={`cand-card ${selectedCandidate === 2 ? 'active' : ''}`} onClick={() => setSelectedCandidate(2)}>
              <div className="cand-top-info">
                <span className="cand-type">희망형</span>
                <span className="cand-score font-mono">86<small>점</small></span>
              </div>
              <ul className="cand-bullets">
                <li>✓ 희망 반영 우선</li>
                <li>✓ 희망 반영률 94%</li>
                <li>✓ 일부 부담 편차 있음</li>
              </ul>
              <button className="btn-cand-preview" onClick={() => setSelectedCandidate(2)}>
                미리보기
              </button>
            </div>

            <div className={`cand-card ${selectedCandidate === 3 ? 'active' : ''}`} onClick={() => setSelectedCandidate(3)}>
              <div className="cand-top-info">
                <span className="cand-type">피로 최소형</span>
                <span className="cand-score font-mono">89<small>점</small></span>
              </div>
              <ul className="cand-bullets">
                <li>✓ 연속근무 최소화</li>
                <li>✓ 야간 피로도 낮음</li>
                <li>✓ 희망 반영률 82%</li>
              </ul>
              <button className="btn-cand-preview" onClick={() => setSelectedCandidate(3)}>
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
                <span className="rank-badge approved">승인됨</span>
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

            {/* 선정 이유 */}
            <div className="selection-reason-box">
              <div className="reason-header">
                <span className="r-warn">▲</span>
                <strong className="r-title">선정 이유</strong>
              </div>
              <ul className="reason-list">
                <li>• 최근 3개월 주말 OFF 횟수 (이은솔 2회, 김지은 5회, 박수민 4회)</li>
                <li>• 이번 미반영 이력 (이은솔 2회)</li>
                <li>• 이번 달 근무 부담 점수 (이은솔 84점)</li>
                <li>• 해당 날짜의 최소 인력 조건 충족 여부</li>
              </ul>
            </div>

            <button className="btn-recommend-other" onClick={() => alert('10월 14일, 10월 18일 대체 일정이 추천되었습니다.')}>
              다른 날짜 추천 보기
            </button>
          </div>
        </div>

        {/* 모듈 4: 간호사 인력 관리 */}
        <div className="module-card">
          <div className="module-head">
            <span className="module-title">간호사 인력 관리</span>
            <button className="btn-add-nurse" onClick={() => alert('신규 간호사 등록 창을 엽니다.')}>
              <Plus size={12} />
              <span>직원 추가</span>
            </button>
          </div>

          <div className="nurse-manager-inner">
            <div className="nurse-search-box">
              <Search size={14} className="s-icon" />
              <input type="text" placeholder="이름, 직급, 상태로 검색" className="n-search-input" />
            </div>

            <div className="nurse-filter-tabs">
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

            <div className="nurse-list-stack">
              <div className="nurse-row">
                <div className="n-avatar green-av">이</div>
                <div className="n-name-box">
                  <span className="n-name">이은솔 간호사</span>
                  <span className="n-badge-status active">재직</span>
                </div>
                <span className="n-pref-tag d-pref">D 선호</span>
                <MoreHorizontal size={14} className="n-more" />
              </div>

              <div className="nurse-row">
                <div className="n-avatar purple-av">김</div>
                <div className="n-name-box">
                  <span className="n-name">김지은 선임간호사</span>
                  <span className="n-badge-status active">재직</span>
                </div>
                <span className="n-pref-tag n-pref">N 선호</span>
                <MoreHorizontal size={14} className="n-more" />
              </div>

              <div className="nurse-row">
                <div className="n-avatar rose-av">박</div>
                <div className="n-name-box">
                  <span className="n-name">박수민 간호사</span>
                  <span className="n-badge-status active">재직</span>
                </div>
                <span className="n-pref-tag all-pref">모든 근무</span>
                <MoreHorizontal size={14} className="n-more" />
              </div>

              <div className="nurse-row">
                <div className="n-avatar blue-av">최</div>
                <div className="n-name-box">
                  <span className="n-name">최서연 책임간호사</span>
                  <span className="n-badge-status active">재직</span>
                </div>
                <span className="n-pref-tag n-pref">N 선호</span>
                <MoreHorizontal size={14} className="n-more" />
              </div>

              <div className="nurse-row">
                <div className="n-avatar amber-av">정</div>
                <div className="n-name-box">
                  <span className="n-name">정하윤 간호사</span>
                  <span className="n-badge-status active">재직</span>
                </div>
                <span className="n-pref-tag de-pref">D / E 가능</span>
                <MoreHorizontal size={14} className="n-more" />
              </div>

              <div className="nurse-row">
                <div className="n-avatar gray-av">이</div>
                <div className="n-name-box">
                  <span className="n-name">이연지 간호사</span>
                  <span className="n-badge-status leave">육아휴직</span>
                </div>
                <MoreHorizontal size={14} className="n-more" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: 하단 근무 태그 컴포넌트 & 상태 배지 레퍼런스 바
         ========================================================================= */}
      <div className="reference-bottom-bar">
        <div className="ref-group">
          <span className="ref-label">근무 태그 컴포넌트</span>
          <div className="ref-tags-row">
            <div className="ref-tag-box">
              <span className="r-capsule day">D</span>
              <div className="r-text">
                <strong>데이</strong>
                <span>08:00 - 18:00</span>
              </div>
            </div>
            <div className="ref-tag-box">
              <span className="r-capsule eve">E</span>
              <div className="r-text">
                <strong>이브닝</strong>
                <span>14:00 - 22:00</span>
              </div>
            </div>
            <div className="ref-tag-box">
              <span className="r-capsule night">N</span>
              <div className="r-text">
                <strong>나이트</strong>
                <span>18:00 - 08:00</span>
              </div>
            </div>
            <div className="ref-tag-box">
              <span className="r-capsule off">OFF</span>
              <div className="r-text">
                <strong>오프</strong>
              </div>
            </div>
            <div className="ref-tag-box">
              <span className="r-capsule leave">☂ 휴가</span>
            </div>
            <div className="ref-tag-box">
              <span className="r-capsule standby">🕒 대기</span>
            </div>
            <div className="ref-tag-box">
              <span className="r-capsule edu">📖 교육</span>
            </div>
            <div className="ref-tag-box">
              <span className="r-capsule meeting">👥 회의</span>
            </div>
          </div>
        </div>

        <div className="ref-group">
          <span className="ref-label">상태 배지</span>
          <div className="ref-badges-row">
            <span className="status-pill success">승인됨</span>
            <span className="status-pill warning">대기중</span>
            <span className="status-pill danger">반려됨</span>
            <span className="status-pill info">대체일 제안</span>
          </div>
        </div>
      </div>

      <style>{`
        .mothercare-dashboard {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding-bottom: var(--space-6);
        }

        /* Alert Banner */
        .mc-alert-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: var(--color-danger-bg);
          border: 1px solid var(--color-danger-border);
          color: var(--color-danger-text);
          padding: 8px 14px;
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          font-weight: 600;
        }
        .mc-alert-close {
          margin-left: auto;
          color: currentColor;
          display: flex;
          align-items: center;
        }

        /* Top Grid */
        .top-dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: var(--space-4);
          align-items: start;
        }

        /* Calendar Card */
        .calendar-card {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .calendar-toolbar {
          padding: var(--space-3) var(--space-4);
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--color-border);
        }
        .cal-title-group {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .cal-main-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--color-text-primary);
          margin: 0;
          letter-spacing: -0.02em;
        }
        .month-selector {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .current-month-text {
          font-size: 15px;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .month-nav-btns {
          display: flex;
          gap: 2px;
        }
        .nav-arrow {
          width: 24px;
          height: 24px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary);
        }
        .nav-arrow:hover {
          background-color: #F1F5F9;
        }
        .btn-today {
          padding: 2px 8px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-secondary);
          background-color: #FFFFFF;
        }
        .btn-today:hover {
          background-color: #F8FAFC;
        }

        .cal-view-tabs {
          display: flex;
          background-color: #F1F5F9;
          padding: 2px;
          border-radius: var(--radius-full);
        }
        .tab-btn {
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-secondary);
          transition: all 0.12s;
        }
        .tab-btn.active {
          background-color: var(--color-primary);
          color: #FFFFFF;
        }

        /* Calendar Grid */
        .calendar-grid-container {
          padding: var(--space-2) var(--space-3);
        }
        .cal-dow-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          padding-bottom: 6px;
        }
        .dow-item {
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          color: var(--color-text-secondary);
        }
        .dow-item.sun { color: #F43F5E; }
        .dow-item.sat { color: #F43F5E; }

        .cal-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          border-top: 1px solid var(--color-border);
          border-left: 1px solid var(--color-border);
        }
        .cal-day-cell {
          height: 68px;
          border-right: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
          padding: 4px 6px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          transition: background-color 0.1s;
        }
        .cal-day-cell:hover {
          background-color: #FFF8F8;
        }
        .cal-day-cell.prev-month {
          background-color: #FAFAFA;
          opacity: 0.35;
          cursor: default;
        }
        .cell-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .day-num {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .day-num.sun, .day-num.sat { color: #F43F5E; }
        .holiday-tag {
          font-size: 9px;
          color: #F43F5E;
          background-color: #FFF1F2;
          padding: 1px 3px;
          border-radius: 2px;
          font-weight: 700;
        }
        .cell-icon.heart {
          color: #F43F5E;
        }
        .cell-icon.plane {
          color: #38BDF8;
        }
        .cell-dot {
          width: 4px;
          height: 4px;
          background-color: #3B82F6;
          border-radius: var(--radius-full);
        }
        .shift-capsule-wrapper {
          display: flex;
          justify-content: center;
          width: 100%;
        }

        /* Summary Sidebar */
        .summary-sidebar-panel {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .sidebar-tabs {
          display: flex;
          border-bottom: 1px solid var(--color-border);
          padding: 0 var(--space-3);
        }
        .side-tab-btn {
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
          border-bottom: 2px solid transparent;
        }
        .side-tab-btn.active {
          color: var(--color-primary);
          border-bottom-color: var(--color-primary);
          font-weight: 700;
        }
        .sidebar-card-body {
          padding: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .widget-card {
          background-color: #FFFFFF;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-3);
        }
        .widget-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .w-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .w-sub {
          font-size: 11px;
          color: var(--color-text-muted);
        }

        /* 3-color Progress Bar */
        .shift-progress-bar {
          display: flex;
          height: 8px;
          border-radius: var(--radius-full);
          overflow: hidden;
          margin-bottom: 8px;
        }
        .p-segment.day { background-color: #F472B6; }
        .p-segment.night { background-color: #4ADE80; }
        .p-segment.off { background-color: #38BDF8; }

        .shift-legend-row {
          display: flex;
          justify-content: space-around;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
        }
        .legend-item .dot {
          width: 8px;
          height: 8px;
          border-radius: var(--radius-full);
        }
        .legend-item .dot.day { background-color: #F472B6; }
        .legend-item .dot.night { background-color: #4ADE80; }
        .legend-item .dot.off { background-color: #38BDF8; }
        .l-name { color: var(--color-text-secondary); font-weight: 600; }
        .l-count { font-size: 12px; font-weight: 800; }

        /* Score Widget (Donut Chart) */
        .score-content-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .donut-box {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-full);
          border: 3px solid #FDA4AF;
          border-top-color: #F43F5E;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .donut-circle {
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1;
        }
        .donut-score {
          font-size: 16px;
          font-weight: 800;
          color: var(--color-text-primary);
        }
        .donut-total {
          font-size: 9px;
          color: var(--color-text-muted);
        }
        .score-desc-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .compare-text {
          font-size: 12px;
          font-weight: 700;
        }
        .highlight-text {
          color: #F43F5E;
        }
        .compare-sub {
          font-size: 10px;
          color: var(--color-text-muted);
          margin-bottom: 4px;
        }
        .metric-mini-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px 8px;
          font-size: 10px;
        }
        .mini-row {
          display: flex;
          justify-content: space-between;
          color: var(--color-text-secondary);
        }
        .status-good {
          color: #16A34A;
        }

        /* Next Shift */
        .next-shift-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
        }
        .next-shift-left {
          display: flex;
          flex-direction: column;
        }
        .next-lbl {
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .next-date {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .next-shift-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .capsule-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: #DCFCE7;
          border: 1px solid #86EFAC;
          padding: 3px 8px;
          border-radius: var(--radius-full);
        }
        .mini-n-capsule {
          font-weight: 800;
          color: #15803D;
          font-size: 12px;
        }
        .shift-text-box {
          display: flex;
          flex-direction: column;
        }
        .shift-text-box .s-name {
          font-size: 11px;
          font-weight: 700;
          color: #15803D;
          line-height: 1;
        }
        .shift-text-box .s-time {
          font-size: 9px;
          color: #166534;
        }

        /* Notify Widget */
        .notify-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .notify-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 11px;
        }
        .notify-icon.heart {
          color: #F43F5E;
          font-weight: 700;
        }
        .notify-tag {
          font-size: 9px;
          padding: 1px 4px;
          border-radius: 2px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .notify-tag.scheduled { background-color: #EFF6FF; color: #1D4ED8; }
        .notify-tag.open { background-color: #F1F5F9; color: #475569; }
        .notify-text {
          display: flex;
          flex-direction: column;
        }
        .n-msg {
          color: var(--color-text-primary);
          line-height: 1.2;
        }
        .n-time {
          font-size: 9px;
          color: var(--color-text-muted);
        }

        /* =========================================================================
           BOTTOM MODULES GRID (4개 카드)
           ========================================================================= */
        .bottom-modules-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-4);
          align-items: stretch;
        }

        .module-card {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          padding: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-2-5);
        }
        .module-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .module-title {
          font-size: 13px;
          font-weight: 800;
          color: var(--color-text-primary);
        }
        .title-with-beta {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .beta-tag {
          font-size: 9px;
          font-weight: 700;
          color: #2563EB;
          background-color: #EFF6FF;
          padding: 1px 4px;
          border-radius: 2px;
        }

        /* 모듈 1: 근무 신청 */
        .req-type-pill-tabs {
          display: flex;
          gap: 4px;
          background-color: #F1F5F9;
          padding: 2px;
          border-radius: var(--radius-full);
        }
        .pill-tab {
          flex: 1;
          font-size: 10px;
          font-weight: 600;
          padding: 3px 0;
          border-radius: var(--radius-full);
          color: var(--color-text-secondary);
        }
        .pill-tab.active {
          background-color: #FFFFFF;
          color: var(--color-primary);
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .req-form-body {
          display: flex;
          gap: var(--space-2);
        }
        .mini-picker-col {
          width: 140px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .picker-lbl {
          font-size: 10px;
          font-weight: 700;
          color: var(--color-text-secondary);
        }
        .mini-cal-box {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          padding: 4px;
          background-color: #FAFAFA;
        }
        .mini-cal-header {
          text-align: center;
          font-size: 10px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: 2px;
        }
        .mini-cal-dows {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 9px;
          font-weight: 600;
          color: var(--color-text-muted);
          margin-bottom: 2px;
        }
        .mini-cal-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
        }
        .mini-day-btn {
          height: 18px;
          font-size: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-full);
          color: var(--color-text-primary);
        }
        .mini-day-btn.picked {
          background-color: var(--color-primary);
          color: #FFFFFF;
          font-weight: 700;
        }

        .req-input-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .field-group label {
          font-size: 10px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        .select-input, .text-input {
          height: 26px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          padding: 0 6px;
          font-size: 11px;
          background-color: #FAFAFA;
        }
        .btn-pink-submit {
          margin-top: auto;
          height: 28px;
          background-color: var(--color-primary);
          color: #FFFFFF;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 700;
        }

        /* 모듈 2: 자동 편성 결과 */
        .candidate-cards-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }
        .cand-card {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          cursor: pointer;
        }
        .cand-card.active {
          border-color: #FDA4AF;
          background-color: #FFF8F8;
        }
        .cand-top-info {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }
        .cand-type {
          font-size: 10px;
          font-weight: 700;
        }
        .cand-score {
          font-size: 14px;
          font-weight: 800;
          color: var(--color-primary);
        }
        .cand-bullets {
          list-style: none;
          font-size: 9px;
          color: var(--color-text-secondary);
          line-height: 1.3;
        }
        .btn-cand-apply {
          margin-top: auto;
          height: 22px;
          background-color: var(--color-primary);
          color: #FFFFFF;
          border-radius: var(--radius-xs);
          font-size: 10px;
          font-weight: 700;
        }
        .btn-cand-preview {
          margin-top: auto;
          height: 22px;
          background-color: #F1F5F9;
          color: var(--color-text-secondary);
          border-radius: var(--radius-xs);
          font-size: 10px;
          font-weight: 600;
        }

        .ai-explanation-box {
          background-color: #FAFAFA;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .ai-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .ai-bullets {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .ai-row {
          display: flex;
          align-items: flex-start;
          gap: 4px;
          font-size: 10px;
          color: var(--color-text-secondary);
          line-height: 1.3;
        }
        .check-green {
          color: #16A34A;
          flex-shrink: 0;
          margin-top: 1px;
        }

        /* 모듈 3: 오프 신청 충돌 */
        .conflict-inner {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .conflict-alert-notice {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          color: #B45309;
        }
        .warn-icon {
          color: #F59E0B;
        }
        .applicant-rank-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .rank-row {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: #FAFAFA;
          border: 1px solid var(--color-border);
          padding: 4px 6px;
          border-radius: var(--radius-xs);
          font-size: 11px;
        }
        .rank-num { font-weight: 700; color: var(--color-text-muted); width: 10px; }
        .rank-name { font-weight: 700; flex: 1; }
        .rank-score { color: var(--color-text-secondary); }
        .rank-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: var(--radius-full);
        }
        .rank-badge.approved { background-color: #DCFCE7; color: #15803D; }
        .rank-badge.alternative { background-color: #E0F2FE; color: #0369A1; }
        .rank-badge.rejected { background-color: #FEE2E2; color: #B91C1C; }

        .selection-reason-box {
          background-color: #FFFBEB;
          border: 1px solid #FDE68A;
          border-radius: var(--radius-xs);
          padding: 6px;
          font-size: 10px;
        }
        .reason-header {
          display: flex;
          align-items: center;
          gap: 3px;
          color: #B45309;
          margin-bottom: 2px;
        }
        .reason-list {
          list-style: none;
          color: #92400E;
          line-height: 1.3;
        }
        .btn-recommend-other {
          height: 24px;
          border: 1px solid var(--color-primary);
          color: var(--color-primary);
          border-radius: var(--radius-xs);
          font-size: 10px;
          font-weight: 700;
          background-color: #FFFFFF;
        }

        /* 모듈 4: 간호사 인력 관리 */
        .btn-add-nurse {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          background-color: var(--color-primary);
          color: #FFFFFF;
          padding: 2px 7px;
          border-radius: var(--radius-full);
          font-size: 10px;
          font-weight: 700;
        }
        .nurse-manager-inner {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .nurse-search-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: #FAFAFA;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          padding: 0 8px;
          height: 24px;
        }
        .s-icon { color: var(--color-text-muted); }
        .n-search-input { border: none; background: none; font-size: 10px; outline: none; width: 100%; }
        .nurse-filter-tabs {
          display: flex;
          gap: 3px;
        }
        .n-filter {
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 10px;
          font-weight: 600;
          background-color: #F1F5F9;
          color: var(--color-text-secondary);
        }
        .n-filter.active {
          background-color: var(--color-primary);
          color: #FFFFFF;
        }
        .nurse-list-stack {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 140px;
          overflow-y: auto;
        }
        .nurse-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 0;
          border-bottom: 1px solid var(--color-border);
          font-size: 11px;
        }
        .n-avatar {
          width: 20px;
          height: 20px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: #FFFFFF;
        }
        .green-av { background-color: #10B981; }
        .purple-av { background-color: #8B5CF6; }
        .rose-av { background-color: #F43F5E; }
        .blue-av { background-color: #3B82F6; }
        .amber-av { background-color: #F59E0B; }
        .gray-av { background-color: #94A3B8; }
        .n-name-box {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
        }
        .n-name { font-weight: 700; font-size: 11px; }
        .n-badge-status {
          font-size: 9px;
          padding: 1px 4px;
          border-radius: 2px;
          font-weight: 600;
        }
        .n-badge-status.active { background-color: #DCFCE7; color: #15803D; }
        .n-badge-status.leave { background-color: #EFF6FF; color: #1D4ED8; }
        .n-pref-tag {
          font-size: 9px;
          font-weight: 600;
          padding: 1px 4px;
          border-radius: 2px;
        }
        .d-pref { background-color: #FCE7F3; color: #BE185D; }
        .n-pref { background-color: #DCFCE7; color: #15803D; }
        .all-pref { background-color: #F3E8FF; color: #7E22CE; }
        .de-pref { background-color: #FEF3C7; color: #B45309; }
        .n-more { color: var(--color-text-muted); cursor: pointer; }

        /* =========================================================================
           BOTTOM COMPONENT REFERENCE BAR
           ========================================================================= */
        .reference-bottom-bar {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-4);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ref-group {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .ref-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-text-secondary);
        }
        .ref-tags-row {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .ref-tag-box {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .r-capsule {
          height: 22px;
          padding: 0 7px;
          border-radius: var(--radius-full);
          font-size: 10px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .r-capsule.day { background-color: #FCE7F3; color: #DB2777; border: 1px solid #FBCFE8; }
        .r-capsule.eve { background-color: #FFEDD5; color: #C2410C; border: 1px solid #FED7AA; }
        .r-capsule.night { background-color: #DCFCE7; color: #15803D; border: 1px solid #86EFAC; }
        .r-capsule.off { background-color: #E0F2FE; color: #0284C7; border: 1px solid #7DD3FC; }
        .r-capsule.leave { background-color: #F3E8FF; color: #7E22CE; }
        .r-capsule.standby { background-color: #EDE9FE; color: #6D28D9; }
        .r-capsule.edu { background-color: #EFF6FF; color: #1D4ED8; }
        .r-capsule.meeting { background-color: #F1F5F9; color: #475569; }

        .r-text {
          display: flex;
          flex-direction: column;
          line-height: 1;
        }
        .r-text strong { font-size: 10px; }
        .r-text span { font-size: 8px; color: var(--color-text-muted); }

        .ref-badges-row {
          display: flex;
          gap: 6px;
        }
      `}</style>
    </div>
  );
};
