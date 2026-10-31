import React from 'react';
import { MOCK_REQUESTS } from '../../data/mockData';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Clock, HelpCircle } from 'lucide-react';

export const RequestListPage: React.FC = () => {
  return (
    <div className="req-list-view">
      <div className="view-head">
        <h2 className="view-title">내 오프 / 휴가 신청 내역</h2>
        <span className="count-pill">총 {MOCK_REQUESTS.length}건</span>
      </div>

      <div className="req-stack">
        {MOCK_REQUESTS.map((req) => (
          <div key={req.id} className="req-card">
            <div className="card-top">
              <span className="type-label">
                {req.requestType === 'PREFERENCE_OFF'
                  ? '일반 희망 OFF'
                  : req.requestType === 'ANNUAL_LEAVE'
                  ? '법정 연차 휴가'
                  : '모성/법정보호 휴가'}
              </span>
              <StatusBadge status={req.status} />
            </div>

            <div className="date-row">
              <Clock size={14} className="clock-icon" />
              <span className="date-text font-mono">{req.dates.join(', ')}</span>
              {req.isImportant && <span className="important-tag">★ 중요 (+10점)</span>}
            </div>

            {req.reasonNote && (
              <div className="reason-note">사유: {req.reasonNote}</div>
            )}

            {/* Score Breakdown Well */}
            {req.priorityBreakdown && (
              <div className="priority-well">
                <div className="p-header">
                  <HelpCircle size={12} />
                  <span>경합 점수 세부 내역: <strong className="font-mono">{req.priorityPoints}점</strong></span>
                </div>
                <div className="p-calc font-mono">
                  <span>결손(+{req.priorityBreakdown.weekendDeficitPoints})</span> +{' '}
                  <span>미반영(+{req.priorityBreakdown.ungrantedPoints})</span> +{' '}
                  <span>부담초과(+{req.priorityBreakdown.burdenExcessPoints})</span>
                  {req.priorityBreakdown.importancePoints > 0 && ` + 중요(+${req.priorityBreakdown.importancePoints})`}
                </div>
              </div>
            )}

            <div className="card-bottom">
              <span className="time-text font-mono">
                접수일시: {new Date(req.submittedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .req-list-view {
          padding: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .view-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .view-title {
          font-size: var(--text-md);
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }
        .count-pill {
          font-size: 11px;
          color: var(--color-text-muted);
          background-color: var(--color-bg-subtle);
          padding: 1px 6px;
          border-radius: var(--radius-xs);
        }

        .req-stack {
          display: flex;
          flex-direction: column;
          gap: var(--space-2-5);
        }
        .req-card {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .type-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .date-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .clock-icon {
          color: var(--color-text-muted);
        }
        .important-tag {
          font-size: 10px;
          font-weight: 600;
          color: #B45309;
          background-color: #FFFBEB;
          border: 1px solid #FDE68A;
          padding: 1px 4px;
          border-radius: 2px;
        }

        .reason-note {
          font-size: 11px;
          color: var(--color-text-secondary);
          background-color: var(--color-bg-subtle);
          padding: 4px 6px;
          border-radius: var(--radius-xs);
        }

        .priority-well {
          background-color: #F8FAFC;
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-xs);
          padding: 6px 8px;
          font-size: 11px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .p-header {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--color-text-secondary);
        }
        .p-calc {
          font-size: 10px;
          color: var(--color-text-muted);
        }

        .card-bottom {
          padding-top: 2px;
        }
        .time-text {
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .font-mono {
          font-feature-settings: "tnum";
        }
      `}</style>
    </div>
  );
};
