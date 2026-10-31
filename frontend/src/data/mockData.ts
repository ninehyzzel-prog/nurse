import type { Staff, ShiftTemplate, ShiftAssignment, TimeOffRequest, PolicyVersion, CandidateMetrics } from '../types';

export const MOCK_STAFF: Staff[] = [
  {
    id: 'staff-1',
    name: '김간호사 (책임)',
    staffCode: 'RN-001',
    role: 'NURSE',
    employmentType: 'FULL_TIME',
    targetWorkMinutes: 9600,
    canWorkNight: true,
    skillTags: ['CHARGE_CAPABLE', 'DELIVERY_ROOM'],
    activeStatus: 'ACTIVE',
  },
  {
    id: 'staff-2',
    name: '이간호사 (선임)',
    staffCode: 'RN-002',
    role: 'NURSE',
    employmentType: 'FULL_TIME',
    targetWorkMinutes: 9600,
    canWorkNight: true,
    skillTags: ['CHARGE_CAPABLE'],
    activeStatus: 'ACTIVE',
  },
  {
    id: 'staff-3',
    name: '박간호사',
    staffCode: 'RN-003',
    role: 'NURSE',
    employmentType: 'SHIFT',
    targetWorkMinutes: 9600,
    canWorkNight: true,
    skillTags: ['DELIVERY_ROOM'],
    activeStatus: 'ACTIVE',
  },
  {
    id: 'staff-4',
    name: '최간호사',
    staffCode: 'RN-004',
    role: 'NURSE',
    employmentType: 'SHIFT',
    targetWorkMinutes: 9600,
    canWorkNight: true,
    skillTags: [],
    activeStatus: 'ACTIVE',
  },
  {
    id: 'staff-5',
    name: '정간호사 (신규)',
    staffCode: 'RN-005',
    role: 'NURSE',
    employmentType: 'SHIFT',
    targetWorkMinutes: 9600,
    canWorkNight: true,
    skillTags: ['NEW_GRAD'],
    activeStatus: 'ACTIVE',
  },
  {
    id: 'staff-6',
    name: '강간호사 (단시간)',
    staffCode: 'RN-006',
    role: 'NURSE',
    employmentType: 'PART_TIME',
    targetWorkMinutes: 4800, // 주 20시간
    canWorkNight: false, // 야간 제외
    skillTags: [],
    activeStatus: 'ACTIVE',
  },
];

export const MOCK_SHIFT_TEMPLATES: ShiftTemplate[] = [
  {
    id: 'shift-day',
    code: 'DAY',
    label: '데이 (D)',
    startsAtLocal: '08:00',
    endsAtLocal: '18:00',
    endDayOffset: 0,
    breakMinutes: 60,
    baseBurdenPoints: 1.0,
    colorToken: 'shift-day',
    isAssignable: true,
  },
  {
    id: 'shift-night',
    code: 'NIGHT',
    label: '나이트 (N)',
    startsAtLocal: '18:00',
    endsAtLocal: '08:00',
    endDayOffset: 1, // 익일 종료
    breakMinutes: 60,
    baseBurdenPoints: 2.0,
    colorToken: 'shift-night',
    isAssignable: true,
  },
  {
    id: 'shift-off',
    code: 'OFF',
    label: '오프 (OFF)',
    startsAtLocal: '00:00',
    endsAtLocal: '00:00',
    endDayOffset: 0,
    breakMinutes: 0,
    baseBurdenPoints: 0.0,
    colorToken: 'shift-off',
    isAssignable: true,
  },
  {
    id: 'shift-leave',
    code: 'LEAVE',
    label: '연차/휴가',
    startsAtLocal: '00:00',
    endsAtLocal: '00:00',
    endDayOffset: 0,
    breakMinutes: 0,
    baseBurdenPoints: 0.0,
    colorToken: 'shift-leave',
    isAssignable: true,
  },
];

export const MOCK_POLICY_V1: PolicyVersion = {
  id: 'policy-v1',
  version: 1,
  status: 'PUBLISHED',
  minRestMinutes: 660, // 11시간 휴식
  maxConsecutiveDays: 5,
  maxWeeklyMinutes: 3120, // 52시간
  minMonthlyOffDays: 8,
  isLegalFloorProtected: true,
  publishedAt: '2026-10-15T09:00:00Z',
};

// 2026년 11월 30일치 초기 배정 픽스처
export const generateMockAssignments = (): ShiftAssignment[] => {
  const assignments: ShiftAssignment[] = [];
  const daysInMonth = 30; // 2026-11
  
  MOCK_STAFF.forEach((staff) => {
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
      let templateId = 'shift-off';
      
      // 결정론적이고 현실적인 교대 패턴 시뮬레이션
      if (staff.canWorkNight) {
        const cycle = (day + parseInt(staff.id.split('-')[1])) % 6;
        if (cycle === 0 || cycle === 1) templateId = 'shift-day';
        else if (cycle === 2) templateId = 'shift-night';
        else templateId = 'shift-off'; // 나이트 후 11시간 휴식으로 2일 오프
      } else {
        // 단시간(강간호사): 평일 주간 위주
        const dayOfWeek = (day + 6) % 7; // 2026-11-01 is Sunday (0)
        if (dayOfWeek >= 1 && dayOfWeek <= 3) templateId = 'shift-day';
        else templateId = 'shift-off';
      }

      assignments.push({
        id: `assign-${staff.id}-${day}`,
        scheduleVersionId: 'version-draft-1',
        staffId: staff.id,
        localStartDate: dateStr,
        shiftTemplateId: templateId,
        startAtUtc: `${dateStr}T00:00:00Z`,
        endAtUtc: `${dateStr}T00:00:00Z`,
        isPinned: day === 15 && staff.id === 'staff-1', // 11월 15일 김간호사 고정
        source: day === 15 && staff.id === 'staff-1' ? 'PINNED' : 'AUTO',
      });
    }
  });

  return assignments;
};

// QA-SCORE-02 시나리오에 부합하는 오프 신청 데이터
export const MOCK_REQUESTS: TimeOffRequest[] = [
  {
    id: 'req-1',
    staffId: 'staff-1',
    staffName: '김간호사',
    requestType: 'PREFERENCE_OFF',
    status: 'UNDER_REVIEW',
    dates: ['2026-11-14'], // 토요일 경합
    isImportant: false,
    reasonNote: '개인 사정',
    submittedAt: '2026-10-20T10:00:00Z',
    priorityPoints: 35.0,
    priorityBreakdown: {
      weekendDeficitPoints: 20.0, // 주말 부족 2회 (20점)
      ungrantedPoints: 8.0,       // 미반영 1회 (8점)
      burdenExcessPoints: 7.0,    // 부담 초과 7% (7점)
      importancePoints: 0.0,
    },
  },
  {
    id: 'req-2',
    staffId: 'staff-2',
    staffName: '이간호사',
    requestType: 'PREFERENCE_OFF',
    status: 'UNDER_REVIEW',
    dates: ['2026-11-14'], // 토요일 경합
    isImportant: true, // 중요 신청 (+10점)
    reasonNote: '가족 행사',
    submittedAt: '2026-10-21T09:30:00Z',
    priorityPoints: 26.0,
    priorityBreakdown: {
      weekendDeficitPoints: 0.0,  // 주말 부족 0회 (0점)
      ungrantedPoints: 16.0,      // 미반영 2회 (16점)
      burdenExcessPoints: 0.0,    // 부담 초과 0% (0점)
      importancePoints: 10.0,     // 중요 (+10점)
    },
  },
  {
    id: 'req-3',
    staffId: 'staff-3',
    staffName: '박간호사',
    requestType: 'ANNUAL_LEAVE',
    status: 'APPROVED',
    dates: ['2026-11-05'],
    isImportant: false,
    reasonNote: '법정 연차 휴가',
    submittedAt: '2026-10-18T14:20:00Z',
  },
];

export const MOCK_CANDIDATES: CandidateMetrics[] = [
  {
    rank: 1,
    fairnessScore: 92.5,
    totalObjective: 412.0,
    grantedRequestsRate: 0.94, // 94% 반영
    maxBurdenDeviation: 0.06,  // 최대 편차 6%
    nightDeviationMinutes: 120,
    weekendDeviationDays: 0,
  },
  {
    rank: 2,
    fairnessScore: 88.0,
    totalObjective: 385.0,
    grantedRequestsRate: 0.88,
    maxBurdenDeviation: 0.12,
    nightDeviationMinutes: 240,
    weekendDeviationDays: 1,
  },
];
