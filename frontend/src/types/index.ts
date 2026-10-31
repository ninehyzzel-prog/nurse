// Core Domain Types conforming to DATA_MODEL.md & DOMAIN_RULES.md

export type Role = 'NURSE' | 'SCHEDULER' | 'ADMIN';

export type EmploymentType = 'FULL_TIME' | 'SHIFT' | 'NIGHT_ONLY' | 'PART_TIME';

export interface Staff {
  id: string;
  name: string;
  staffCode: string;
  role: Role;
  employmentType: EmploymentType;
  targetWorkMinutes: number; // e.g. 9600 (160h)
  canWorkNight: boolean;
  skillTags: string[]; // ['CHARGE_CAPABLE', 'DELIVERY_ROOM']
  activeStatus: 'ACTIVE' | 'ON_LEAVE' | 'RETIRED';
}

export interface ShiftTemplate {
  id: string;
  code: string; // 'DAY', 'NIGHT', 'EVENING', 'OFF', 'LEAVE'
  label: string; // '데이', '나이트', '오프' 등
  startsAtLocal: string; // '08:00'
  endsAtLocal: string; // '18:00'
  endDayOffset: number; // 0: same day, 1: next day
  breakMinutes: number;
  baseBurdenPoints: number; // 1.0, 2.0 etc.
  colorToken: string; // 'shift-day', 'shift-night'
  isAssignable: boolean;
}

export interface ShiftAssignment {
  id: string;
  scheduleVersionId: string;
  staffId: string;
  localStartDate: string; // 'YYYY-MM-DD'
  shiftTemplateId: string;
  startAtUtc: string;
  endAtUtc: string;
  isPinned: boolean;
  source: 'AUTO' | 'MANUAL' | 'PINNED';
  note?: string;
}

export type TimeOffType = 'PREFERENCE_OFF' | 'ANNUAL_LEAVE' | 'PROTECTED_LEAVE' | 'UNAVAILABLE';
export type RequestStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'NOT_GRANTED' | 'WITHDRAWN';

export interface TimeOffRequest {
  id: string;
  staffId: string;
  staffName: string;
  requestType: TimeOffType;
  status: RequestStatus;
  dates: string[]; // ['2026-11-14', '2026-11-15']
  isImportant: boolean; // Max 1 per month
  reasonNote?: string;
  submittedAt: string;
  priorityPoints?: number;
  priorityBreakdown?: {
    weekendDeficitPoints: number;
    ungrantedPoints: number;
    burdenExcessPoints: number;
    importancePoints: number;
  };
}

export interface CoverageRequirement {
  shiftTemplateId: string;
  minimumStaff: number;
  requiredSkill?: string;
}

export interface PolicyVersion {
  id: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  minRestMinutes: number; // 660 (11h)
  maxConsecutiveDays: number; // 5
  maxWeeklyMinutes: number; // 3120 (52h)
  minMonthlyOffDays: number; // 8
  isLegalFloorProtected: boolean;
  publishedAt?: string;
}

export interface CandidateMetrics {
  rank: number;
  fairnessScore: number; // 0-100
  totalObjective: number;
  grantedRequestsRate: number; // e.g. 0.91
  maxBurdenDeviation: number; // e.g. 0.08
  nightDeviationMinutes: number;
  weekendDeviationDays: number;
}
