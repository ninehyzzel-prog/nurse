import React from 'react';
import { MOCK_REQUESTS } from '../../data/mockData';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Clock, HelpCircle } from 'lucide-react';

export const RequestListPage: React.FC = () => {
  return (
    <div className="req-list-container">
      <div className="page-header">
        <h2 className="title">내 오프 / 휴가 신청 내역</h2>
        <span className="count-tag">총 {MOCK_REQUESTS.length}건</span>
      </div>

      <div className="req-cards">
        {MOCK_REQUESTS.map((req) => (
          <div key={req.id} className="req-card">
            <div className="card-top">
              <span className="type-badge">
                {req.requestType === 'PREFERENCE_OFF'
                  ? '일반 희망 OFF'
                  : req.requestType === 'ANNUAL_LEAVE'
                  ? '법정 연차 휴가'
                  : '보호 휴가'}
              </span>
              <StatusBadge status={req.status} />
            </div>

            <div className="date-row">
              <Clock size={16} className="clock-icon" />
              <strong>{req.dates.join(', ')}</strong>
              {req.isImportant && <span className="important-pill">★ 중요</span>}
            </div>

            {req.reasonNote && (
              <div className="reason-text">사유: {req.reasonNote}</div>
            )}

            {/* 투명한 결과 설명 (점수 및 사유) */}
            {req.priorityBreakdown && (
              <div className="priority-box">
                <div className="p-header">
                  <HelpCircle size={14} />
                  <span>경합 점수 세부 내역: <strong>{req.priorityPoints}점</strong></span>
                </div>
                <div className="p-details">
                  <span>주말 부족({req.priorityBreakdown.weekendDeficitPoints}점)</span> +{' '}
                  <span>미반영({req.priorityBreakdown.ungrantedPoints}점)</span> +{' '}
                  <span>부담 초과({req.priorityBreakdown.burdenExcessPoints}점)</span>
                  {req.priorityBreakdown.importancePoints > 0 && ` + 중요(${req.priorityBreakdown.importancePoints}점)`}
                </div>
              </div>
            )}

            <div className="card-footer">
              <span className="time-str">접수일시: {new Date(req.submittedAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .req-list-container {
          padding: var(--space-4);
        }
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-4);
        }
        .title {
          font-size: var(--font-size-lg);
          font-weight: 700;
        }
        .count-tag {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
        }
        .req-cards {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .req-card {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .type-badge {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-text-secondary);
        }
        .date-row {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--font-size-base);
        }
        .clock-icon {
          color: var(--color-brand-primary);
        }
        .important-pill {
          font-size: 10px;
          font-weight: 700;
          background-color: var(--color-warning-bg);
          color: var(--color-warning);
          padding: 1px 6px;
          border-radius: var(--radius-sm);
        }
        .reason-text {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
        }
        .priority-box {
          background-color: var(--color-bg-muted);
          border-radius: var(--radius-sm);
          padding: var(--space-2) var(--space-3);
          font-size: 11px;
        }
        .p-header {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          margin-bottom: 2px;
        }
        .p-details {
          color: var(--color-text-secondary);
        }
        .card-footer {
          margin-top: 4px;
          padding-top: var(--space-2);
          border-top: 1px solid var(--color-border);
          font-size: 11px;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
};
