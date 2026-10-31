import React, { useState } from 'react';
import { MOCK_REQUESTS } from '../../data/mockData';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { TimeOffRequest } from '../../types';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert
} from 'lucide-react';

export const ConflictResolverPage: React.FC = () => {
  const [requests, setRequests] = useState<TimeOffRequest[]>(MOCK_REQUESTS);
  const selectedDate = '2026-11-14'; // 경합 일자

  // 11월 14일 신청자 목록 (김간호사 A, 이간호사 B)
  const conflictRequests = requests.filter((r) => r.dates.includes(selectedDate));

  const handleApprove = (reqId: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === reqId) return { ...r, status: 'APPROVED' as const };
        if (r.dates.includes(selectedDate)) return { ...r, status: 'NOT_GRANTED' as const };
        return r;
      })
    );
  };

  return (
    <div className="conflict-container">
      <div className="conflict-header">
        <div>
          <h2 className="title">오프 · 휴가 신청 충돌 해결 콘솔</h2>
          <span className="desc">
            동일 일자에 필요 최소 인원을 초과하여 오프가 신청된 경우, 객관적 공정성 점수에 기반하여 조율합니다.
          </span>
        </div>
        <div className="conflict-pill">
          <AlertTriangle size={16} />
          <span>경합 발생 1건</span>
        </div>
      </div>

      <div className="conflict-body">
        {/* 좌측: 경합 날짜 카드 */}
        <div className="conflict-date-card">
          <div className="card-top">
            <span className="date-badge">2026년 11월 14일 (토)</span>
            <span className="badge-danger">정원 초과 경합</span>
          </div>

          <div className="stats-box">
            <div className="stat-line">
              <span>병동 가용 인력:</span>
              <strong>6명</strong>
            </div>
            <div className="stat-line">
              <span>필수 커버리지 (주말):</span>
              <strong>Day 1명 / Night 1명 (최소 2명)</strong>
            </div>
            <div className="stat-line">
              <span>신청 건수:</span>
              <strong className="text-danger">2명 동시 신청 (1명만 수용 가능)</strong>
            </div>
          </div>

          <div className="recommendation-banner">
            <div className="rec-title">
              <CheckCircle2 size={16} color="var(--color-success)" />
              <strong>시스템 최적화 추천 권고</strong>
            </div>
            <p className="rec-text">
              <strong>김간호사 (A)</strong>의 신청을 우선 승인하는 것을 권장합니다.
              <br />
              (이유: 동종 비교그룹 대비 최근 3개월 주말 OFF 2회 부족 및 근무부담 7% 초과 누적)
            </p>
          </div>
        </div>

        {/* 우측: 경합자 투명 점수 비교 패널 */}
        <div className="applicants-panel">
          <h3 className="panel-title">신청자 공정성 점수 비교 (QA-SCORE-02 명세)</h3>

          <div className="applicant-cards">
            {conflictRequests.map((req) => {
              const isRecommended = req.staffId === 'staff-1'; // 김간호사 (35점)

              return (
                <div key={req.id} className={`app-card ${isRecommended ? 'recommended' : ''}`}>
                  <div className="app-card-head">
                    <div className="staff-meta">
                      <span className="name">{req.staffName}</span>
                      <span className="role-tag">
                        {req.staffId === 'staff-1' ? '간호사 A (책임)' : '간호사 B (선임)'}
                      </span>
                    </div>
                    <div className="score-total">
                      <span className="lbl">경합 우선순위 점수</span>
                      <span className="val">{req.priorityPoints}점</span>
                    </div>
                  </div>

                  {/* 세부 점수 Breakdown */}
                  {req.priorityBreakdown && (
                    <div className="breakdown-grid">
                      <div className="b-item">
                        <span className="k">주말 OFF 부족 가산:</span>
                        <strong className="v">+{req.priorityBreakdown.weekendDeficitPoints}점</strong>
                        <span className="sub">(부족 {req.priorityBreakdown.weekendDeficitPoints / 10}회 x 10)</span>
                      </div>
                      <div className="b-item">
                        <span className="k">희망 미반영 누적:</span>
                        <strong className="v">+{req.priorityBreakdown.ungrantedPoints}점</strong>
                        <span className="sub">(미반영 {req.priorityBreakdown.ungrantedPoints / 8}회 x 8)</span>
                      </div>
                      <div className="b-item">
                        <span className="k">근무 부담 초과 가산:</span>
                        <strong className="v">+{req.priorityBreakdown.burdenExcessPoints}점</strong>
                        <span className="sub">({req.priorityBreakdown.burdenExcessPoints}% 초과)</span>
                      </div>
                      <div className="b-item">
                        <span className="k">중요 요청 가산:</span>
                        <strong className="v">+{req.priorityBreakdown.importancePoints}점</strong>
                        <span className="sub">{req.isImportant ? '지정됨 (+10)' : '일반'}</span>
                      </div>
                    </div>
                  )}

                  <div className="app-card-foot">
                    <div className="status-area">
                      <StatusBadge status={req.status} />
                    </div>
                    <div className="actions">
                      <button
                        className="btn-approve"
                        onClick={() => handleApprove(req.id)}
                        disabled={req.status === 'APPROVED'}
                      >
                        {req.status === 'APPROVED' ? '승인 완료됨' : '이 신청 승인하기'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="privacy-guidance">
            <ShieldAlert size={16} />
            <span>
              <strong>개인정보 보호 원칙:</strong> 위 점수 및 이력 세부 근거는 작성자(수간호사) 화면에만 노출되며, 간호사 개인에게는 동료의 구체적 점수나 사유가 공개되지 않습니다.
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .conflict-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .conflict-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--color-bg-surface);
          padding: var(--space-4);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        .title {
          font-size: var(--font-size-base);
          font-weight: 700;
        }
        .desc {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
        }
        .conflict-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--color-warning-bg);
          color: var(--color-warning);
          font-weight: 700;
          font-size: var(--font-size-xs);
          padding: 6px 12px;
          border-radius: var(--radius-full);
          border: 1px solid #FDE68A;
        }
        .conflict-body {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: var(--space-4);
        }
        .conflict-date-card {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .date-badge {
          font-size: var(--font-size-sm);
          font-weight: 700;
        }
        .badge-danger {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-danger);
          background-color: var(--color-danger-bg);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
        }
        .stats-box {
          background-color: var(--color-bg-muted);
          border-radius: var(--radius-sm);
          padding: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          font-size: var(--font-size-xs);
        }
        .stat-line {
          display: flex;
          justify-content: space-between;
        }
        .text-danger {
          color: var(--color-danger);
        }
        .recommendation-banner {
          background-color: var(--color-success-bg);
          border: 1px solid #BBF7D0;
          border-radius: var(--radius-sm);
          padding: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .rec-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: var(--font-size-xs);
          color: var(--color-success);
        }
        .rec-text {
          font-size: var(--font-size-xs);
          color: #14532D;
          line-height: 1.4;
        }
        .applicants-panel {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .panel-title {
          font-size: var(--font-size-sm);
          font-weight: 700;
        }
        .applicant-cards {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .app-card {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .app-card.recommended {
          border-color: var(--color-brand-primary);
          background-color: #F0F9FF;
        }
        .app-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .staff-meta {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .staff-meta .name {
          font-size: var(--font-size-base);
          font-weight: 700;
        }
        .staff-meta .role-tag {
          font-size: 11px;
          color: var(--color-text-secondary);
        }
        .score-total {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .score-total .lbl {
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .score-total .val {
          font-size: var(--font-size-lg);
          font-weight: 800;
          color: var(--color-brand-primary);
        }
        .breakdown-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-2);
          background-color: var(--color-bg-surface);
          padding: var(--space-3);
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
        }
        .b-item {
          display: flex;
          flex-direction: column;
          font-size: 11px;
        }
        .b-item .k { color: var(--color-text-secondary); margin-bottom: 2px; }
        .b-item .v { font-size: var(--font-size-sm); color: var(--color-text-primary); }
        .b-item .sub { font-size: 10px; color: var(--color-text-muted); }
        .app-card-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: var(--space-2);
          border-top: 1px solid var(--color-border);
        }
        .btn-approve {
          padding: 8px 16px;
          background-color: var(--color-brand-primary);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-weight: 700;
          cursor: pointer;
        }
        .btn-approve:disabled {
          background-color: var(--color-success);
          cursor: default;
        }
        .privacy-guidance {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3);
          background-color: var(--color-bg-muted);
          border-radius: var(--radius-sm);
          font-size: 11px;
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
};
