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
  timeLimitSeconds: number = 5.0
): Promise<ApiScheduleRun> {
  const res = await fetch(`${API_BASE_URL}/schedule-periods/${periodId}/generate?time_limit_seconds=${timeLimitSeconds}`, {
    method: "POST",
  });
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


