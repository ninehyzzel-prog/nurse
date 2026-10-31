/**
 * 백엔드 스케줄러 API 클라이언트
 */

const API_BASE_URL = "http://127.0.0.1:8000/api";

export interface ApiShiftAssignment {
  id: string;
  schedule_version_id: string;
  staff_id: string;
  shift_template_id: string;
  shift_template_code: string;
  local_start_date: string;
  start_at_utc: string;
  end_at_utc: string;
  is_pinned: boolean;
  source: string;
  note?: string;
}

export interface ApiScheduleVersion {
  id: string;
  schedule_period_id: string;
  version_number: number;
  status: string;
  published_at?: string;
  created_at: string;
  assignments: ApiShiftAssignment[];
}

export interface ApiSchedulePeriod {
  id: string;
  ward_id: string;
  start_date: string;
  end_date: string;
  status: string;
  current_version?: ApiScheduleVersion;
}

export interface ValidationIssue {
  rule_code: string;
  severity: "ERROR" | "WARNING";
  message: string;
  staff_id?: string;
  staff_name?: string;
  date?: string;
  shift_code?: string;
  is_legal_floor: boolean;
  details?: Record<string, unknown>;
}

export interface ValidationReport {
  version_id: string;
  is_feasible: boolean;
  error_count: number;
  warning_count: number;
  issues: ValidationIssue[];
}

export async function fetchSchedulePeriod(
  wardId: string = "ward-obgyn",
  periodId: string = "period-2026-11"
): Promise<ApiSchedulePeriod> {
  const res = await fetch(`${API_BASE_URL}/wards/${wardId}/schedule-periods/${periodId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch schedule period: ${res.statusText}`);
  }
  return res.json();
}

export async function validateScheduleVersion(versionId: string): Promise<ValidationReport> {
  const res = await fetch(`${API_BASE_URL}/schedule-versions/${versionId}/validate`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Failed to validate schedule: ${res.statusText}`);
  }
  return res.json();
}

export async function updateAssignment(
  versionId: string,
  assignmentId: string,
  payload: {
    shift_template_id: string;
    is_pinned?: boolean;
    note?: string;
  }
): Promise<{
  assignment: ApiShiftAssignment;
  validation_summary: {
    is_feasible: boolean;
    error_count: number;
    warning_count: number;
    warnings: Array<{ rule_code: string; message: string; date?: string; staff_name?: string }>;
  };
}> {
  const res = await fetch(`${API_BASE_URL}/schedule-versions/${versionId}/assignments/${assignmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(errorData.detail?.message || "배정 수정 실패");
    (err as unknown as { status: number; detail: unknown }).status = res.status;
    (err as unknown as { detail: unknown }).detail = errorData.detail;
    throw err;
  }

  return res.json();
}

export interface ApiCandidate {
  id: string;
  rank: number;
  name: string;
  total_score: number;
  fairness_score: number;
  description: string;
  explanation_points: string[];
  fairness_metrics: Record<string, unknown>;
  assignment_count: number;
}

export interface ApiScheduleRun {
  id: string;
  schedule_period_id: string;
  solver_version: string;
  status: string;
  created_at: string;
  candidates: ApiCandidate[];
  diagnostics?: Record<string, unknown>;
}

export async function generateScheduleCandidates(
  periodId: string = "period-2026-11",
  timeLimitSeconds: number = 5.0,
  dayCoverage: number = 2,
  nightCoverage: number = 1
): Promise<ApiScheduleRun> {
  const res = await fetch(
    `${API_BASE_URL}/schedule-periods/${periodId}/generate?time_limit_seconds=${timeLimitSeconds}&day_coverage=${dayCoverage}&night_coverage=${nightCoverage}`,
    {
      method: "POST",
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail?.message || "스케줄 자동 생성 실패");
  }
  return res.json();
}

export async function applyScheduleCandidate(
  periodId: string = "period-2026-11",
  candidateId: string
): Promise<{
  message: string;
  version_id: string;
  applied_count: number;
  validation_report: ValidationReport;
}> {
  const res = await fetch(`${API_BASE_URL}/schedule-periods/${periodId}/apply-candidate/${candidateId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail?.message || "후보안 적용 실패");
  }
  return res.json();
}

export async function fetchLatestScheduleRun(
  periodId: string = "period-2026-11"
): Promise<ApiScheduleRun | null> {
  const res = await fetch(`${API_BASE_URL}/schedule-periods/${periodId}/runs/latest`);
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export async function publishSchedule(
  versionId: string,
  force: boolean = false,
  overrideReason?: string
): Promise<{ message: string; status: string }> {
  const params = new URLSearchParams();
  if (force) params.append("force", "true");
  if (overrideReason) params.append("override_reason", overrideReason);

  const res = await fetch(`${API_BASE_URL}/schedule-versions/${versionId}/publish?${params.toString()}`, {
    method: "POST",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(errorData.detail?.message || "근무표 발행 실패");
    (err as unknown as { status: number; detail: unknown }).status = res.status;
    (err as unknown as { detail: unknown }).detail = errorData.detail;
    throw err;
  }

  return res.json();
}




export interface ConflictRequestItem {
  request_id: string;
  staff_id: string;
  staff_name: string;
  staff_role: string;
  status: string;
  is_important: boolean;
  reason_note: string;
  submitted_at: string;
  priority_points: number;
  priority_breakdown: {
    weekend_deficit_points: number;
    ungranted_points: number;
    burden_excess_points: number;
    importance_points: number;
    total_priority_points: number;
  };
}

export interface ConflictReport {
  ward_id: string;
  conflict_date: string;
  is_conflict: boolean;
  total_ward_staff: number;
  required_coverage: string;
  capacity: number;
  applicant_count: number;
  recommended_winner_id: string;
  recommendation_summary: string;
  requests: ConflictRequestItem[];
}

export async function fetchRequestsConflict(
  wardId: string = "ward-obgyn",
  dateStr: string = "2026-11-14"
): Promise<ConflictReport> {
  const res = await fetch(`${API_BASE_URL}/wards/${wardId}/requests-conflict/${dateStr}`);
  if (!res.ok) {
    throw new Error("경합 정보 조회 실패");
  }
  return res.json();
}

export async function decideTimeOffRequest(
  requestId: string,
  decision: "APPROVED" | "NOT_GRANTED",
  reviewerId: string = "user-headnurse",
  reasonNote?: string
): Promise<{ message: string; request_id: string; status: string }> {
  const res = await fetch(`${API_BASE_URL}/time-off-requests/${requestId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision,
      reviewer_id: reviewerId,
      reason_note: reasonNote,
    }),
  });
  if (!res.ok) {
    throw new Error("신청 결정 저장 실패");
  }
  return res.json();
}

export interface WardFairnessData {
  ward_id: string;
  overall_fairness_score: number;
  period: string;
  staff_metrics: Array<{
    staff_id: string;
    staff_name: string;
    can_work_night: boolean;
    night_hours: number;
    weekend_days: number;
    weekend_full_off_count: number;
    work_burden_points: number;
    request_grant_rate: number;
  }>;
}

export async function fetchWardFairness(wardId: string = "ward-obgyn"): Promise<WardFairnessData> {
  const res = await fetch(`${API_BASE_URL}/wards/${wardId}/fairness`);
  if (!res.ok) {
    throw new Error("공정성 지표 조회 실패");
  }
  return res.json();
}

export function getExcelExportUrl(versionId: string): string {
  return `${API_BASE_URL}/schedule-versions/${versionId}/export/excel`;
}

export function getCsvExportUrl(versionId: string): string {
  return `${API_BASE_URL}/schedule-versions/${versionId}/export/csv`;
}
