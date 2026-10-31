import React from 'react';
import { CheckCircle2, Calendar } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  return (
    <div className="notifications-view">
      <div className="view-head">
        <h2 className="view-title">알림 센터</h2>
        <span className="count-tag">새 알림 2건</span>
      </div>

      <div className="notify-stack">
        <div className="notify-card">
          <div className="icon-wrapper calendar">
            <Calendar size={14} />
          </div>
          <div className="notify-content">
            <div className="notify-title">2026년 11월 근무표 초안 공지</div>
            <div className="notify-desc">
              11월 정기 근무표 초안이 등록되었습니다. 자신의 일정을 검토하시기 바랍니다.
            </div>
            <div className="notify-time font-mono">방금 전</div>
          </div>
        </div>

        <div className="notify-card">
          <div className="icon-wrapper check">
            <CheckCircle2 size={14} />
          </div>
          <div className="notify-content">
            <div className="notify-title">11월 5일 연차 승인 안내</div>
            <div className="notify-desc">
              신청하신 법정 연차 휴가가 정상 승인되어 근무표에 반영되었습니다.
            </div>
            <div className="notify-time font-mono">어제</div>
          </div>
        </div>
      </div>

      <style>{`
        .notifications-view {
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
        .count-tag {
          font-size: 11px;
          color: #2563EB;
          background-color: #EFF6FF;
          padding: 1px 6px;
          border-radius: var(--radius-xs);
          font-weight: 600;
        }

        .notify-stack {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .notify-card {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-2-5) var(--space-3);
          display: flex;
          gap: var(--space-3);
          align-items: flex-start;
          transition: background-color 0.1s;
        }
        .notify-card:hover {
          background-color: #FAFAFA;
        }
        .icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: var(--radius-xs);
          flex-shrink: 0;
        }
        .icon-wrapper.calendar {
          background-color: #EFF6FF;
          color: #2563EB;
        }
        .icon-wrapper.check {
          background-color: #ECFDF5;
          color: #10B981;
        }

        .notify-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .notify-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .notify-desc {
          font-size: 12px;
          color: var(--color-text-secondary);
          line-height: 1.4;
        }
        .notify-time {
          font-size: 10px;
          color: var(--color-text-muted);
          margin-top: 2px;
        }
        .font-mono {
          font-feature-settings: "tnum";
        }
      `}</style>
    </div>
  );
};
