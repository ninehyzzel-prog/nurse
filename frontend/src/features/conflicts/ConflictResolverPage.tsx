import React, { useState } from 'react';
import { MOCK_REQUESTS } from '../../data/mockData';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { TimeOffRequest } from '../../types';
import { CheckCircle2 } from 'lucide-react';

export const ConflictResolverPage: React.FC = () => {
  const [requests, setRequests] = useState<TimeOffRequest[]>(MOCK_REQUESTS);
  const selectedDate = '2026-11-14'; // 경합 일자

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
    <div className="conflict-view">
      {/* Page Header */}
      <div className="view-header">
        <div>
          <div className="header-meta-row">
            <h2 className="view-title">오프 · 휴가 신청 충돌 해결 콘솔</h2>
            <span className="conflict-badge">경합 1건 감지</span>
          </div>
          <p className="view-desc">
            동일 일자에 필수 근무 정원을 초과하여 오프가 경합된 경우, 도메인 가중 점수에 기반해 투명하게 조율합니다.
          </p>
        </div>
      </div>

      <div className="conflict-layout">
        {/* Left: Summary Column */}
        <div className="summary-col">
          <div className="section-panel">
            <div className="panel-head">
              <span className="head-title">경합 상세 현황</span>
              <span className="date-tag">2026-11-14 (토)</span>
            </div>

            <div className="metric-list">
              <div className="metric-row">
                <span className="metric-lbl">병동 총 인력</span>
                <span className="metric-val">6명</span>
              </div>
              <div className="metric-row">
                <span className="metric-lbl">필수 최소 커버리지</span>
                <span className="metric-val">Day 1 · Night 1 (2명)</span>
              </div>
              <div className="metric-row highlight">
                <span className="metric-lbl">동시 오프 신청자</span>
                <span className="metric-val danger">2명 (수용 가능: 1명)</span>
              </div>
            </div>

            <div className="rec-box">
              <div className="rec-head">
                <CheckCircle2 size={14} className="rec-icon" />
                <span className="rec-head-text">시스템 최적 권고안</span>
              </div>
              <p className="rec-body">
                <strong>김간호사 (A)</strong>의 오프를 우선 승인하는 것을 권장합니다.
                동일 경력군 대비 최근 3개월 주말 OFF 2회 부족 및 업무부담 누적 점수가 상대적으로 높습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Transparent Applicant Scoring Panel */}
        <div className="scoring-col">
          <div className="section-panel">
            <div className="panel-head">
              <span className="head-title">신청자 공정성 점수 비교 분석 (QA-SCORE-02)</span>
              <span className="rule-ref">산식: 기본가중치 + 결손 + 누적부담</span>
            </div>

            <div className="applicant-grid">
              {conflictRequests.map((req) => {
                const isRecommended = req.staffId === 'staff-1';
                const breakdown = req.priorityBreakdown;

                return (
                  <div key={req.id} className={`applicant-card ${isRecommended ? 'is-recommended' : ''}`}>
                    <div className="card-topbar">
                      <div className="applicant-meta">
                        <span className="app-name">{req.staffName}</span>
                        <span className="app-role">{req.staffId === 'staff-1' ? '간호사 A (책임)' : '간호사 B (선임)'}</span>
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="score-badge">
                        <span className="score-num">{req.priorityPoints}</span>
                        <span className="score-unit">점</span>
                      </div>
                    </div>

                    {isRecommended && (
                      <div className="recommended-ribbon">
                        <span>★ 우선 승인 추천 대상</span>
                      </div>
                    )}

                    {/* Breakdown Table */}
                    <div className="score-table-wrapper">
                      <table className="score-table">
                        <thead>
                          <tr>
                            <th>평가 지표</th>
                            <th>도메인 기준치</th>
                            <th className="align-right">산출 점수</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>주말 OFF 결손 가산점</td>
                            <td className="muted-text">최근 3개월 결손 {isRecommended ? '2회' : '1회'}</td>
                            <td className="align-right font-mono">+{breakdown?.weekendDeficitPoints}점</td>
                          </tr>
                          <tr>
                            <td>이전 미반영 신청 보상</td>
                            <td className="muted-text">직전월 탈락 누적</td>
                            <td className="align-right font-mono">+{breakdown?.ungrantedPoints}점</td>
                          </tr>
                          <tr>
                            <td>최근 근무부담 초과율</td>
                            <td className="muted-text">병동 평균 대비 초과</td>
                            <td className="align-right font-mono">+{breakdown?.burdenExcessPoints}점</td>
                          </tr>
                          <tr>
                            <td>신청 중요도 보너스</td>
                            <td className="muted-text">{req.isImportant ? '중요 표시(연 3회 제한)' : '일반 희망'}</td>
                            <td className="align-right font-mono">+{breakdown?.importancePoints}점</td>
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={2} className="total-label">총 경합 우선순위 합계</td>
                            <td className="align-right total-val font-mono">{req.priorityPoints}점</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="card-actions">
                      <button
                        className={`action-btn ${isRecommended ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleApprove(req.id)}
                        disabled={req.status === 'APPROVED'}
                      >
                        {req.status === 'APPROVED' ? '승인 반영 완료됨' : `${req.staffName} 오프 승인`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .conflict-view {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .header-meta-row {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: 2px;
        }
        .view-title {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }
        .conflict-badge {
          display: inline-flex;
          align-items: center;
          padding: 1px 7px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 600;
          background-color: #FEF3C7;
          border: 1px solid #FDE68A;
          color: #B45309;
        }
        .view-desc {
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          margin: 0;
        }

        /* Two-Column Layout */
        .conflict-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: var(--space-4);
          align-items: start;
        }

        .section-panel {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        .panel-head {
          padding: 10px var(--space-3);
          border-bottom: 1px solid var(--color-border);
          background-color: var(--color-bg-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .head-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .date-tag, .rule-ref {
          font-size: 11px;
          color: var(--color-text-muted);
        }

        /* Summary Column */
        .metric-list {
          padding: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .metric-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }
        .metric-lbl {
          color: var(--color-text-secondary);
        }
        .metric-val {
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .metric-val.danger {
          color: var(--color-danger);
        }
        .metric-row.highlight {
          padding-top: 6px;
          border-top: 1px solid var(--color-border-subtle);
        }

        .rec-box {
          margin: 0 var(--space-3) var(--space-3);
          padding: var(--space-2-5);
          background-color: #F0FDF4;
          border: 1px solid #BBF7D0;
          border-radius: var(--radius-xs);
        }
        .rec-head {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 4px;
        }
        .rec-icon {
          color: #16A34A;
        }
        .rec-head-text {
          font-size: 12px;
          font-weight: 600;
          color: #15803D;
        }
        .rec-body {
          font-size: 11px;
          line-height: 1.4;
          color: #166534;
          margin: 0;
        }

        /* Scoring Column */
        .applicant-grid {
          padding: var(--space-3);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3);
        }
        .applicant-card {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-2-5);
          position: relative;
        }
        .applicant-card.is-recommended {
          border-color: #86EFAC;
          background-color: #FAFCFA;
        }
        .card-topbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .applicant-meta {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .app-name {
          font-weight: 700;
          font-size: 14px;
          color: var(--color-text-primary);
        }
        .app-role {
          font-size: 11px;
          color: var(--color-text-muted);
        }
        .score-badge {
          display: flex;
          align-items: baseline;
          gap: 2px;
          padding: 2px 8px;
          background-color: var(--color-bg-subtle);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
        }
        .score-num {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-text-primary);
          font-feature-settings: "tnum";
        }
        .score-unit {
          font-size: 11px;
          color: var(--color-text-muted);
        }

        .recommended-ribbon {
          font-size: 11px;
          font-weight: 600;
          color: #15803D;
          background-color: #DCFCE7;
          border: 1px solid #BBF7D0;
          padding: 2px 6px;
          border-radius: var(--radius-xs);
          display: inline-block;
          align-self: flex-start;
        }

        /* Score Table */
        .score-table-wrapper {
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-xs);
          overflow: hidden;
        }
        .score-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .score-table th {
          background-color: var(--color-bg-subtle);
          padding: 5px 8px;
          text-align: left;
          font-weight: 600;
          color: var(--color-text-secondary);
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .score-table td {
          padding: 5px 8px;
          border-bottom: 1px solid var(--color-border-subtle);
          color: var(--color-text-primary);
        }
        .muted-text {
          color: var(--color-text-muted);
        }
        .align-right {
          text-align: right;
        }
        .font-mono {
          font-feature-settings: "tnum";
          font-weight: 600;
        }
        .total-label {
          font-weight: 600;
          background-color: var(--color-bg-subtle);
        }
        .total-val {
          font-weight: 700;
          font-size: 12px;
          background-color: var(--color-bg-subtle);
          color: var(--color-primary);
        }

        .card-actions {
          margin-top: auto;
          padding-top: var(--space-2);
        }
        .action-btn {
          width: 100%;
          height: 30px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 600;
          transition: background-color 0.12s;
        }
        .action-btn.btn-primary {
          background-color: var(--color-primary);
          color: var(--color-primary-text);
        }
        .action-btn.btn-primary:hover:not(:disabled) {
          background-color: var(--color-primary-hover);
        }
        .action-btn.btn-secondary {
          background-color: var(--color-bg-subtle);
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
        }
        .action-btn.btn-secondary:hover:not(:disabled) {
          background-color: var(--color-bg-muted);
          color: var(--color-text-primary);
        }
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
