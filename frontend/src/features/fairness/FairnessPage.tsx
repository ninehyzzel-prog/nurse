import React from 'react';
import { MOCK_STAFF } from '../../data/mockData';
import { Scale } from 'lucide-react';

export const FairnessPage: React.FC = () => {
  return (
    <div className="fairness-view">
      {/* Header Bar */}
      <div className="fairness-header">
        <div className="header-text-group">
          <div className="title-row">
            <Scale size={16} className="title-icon" />
            <h2 className="title">병동 공정성 통계 및 누적 편차 지표</h2>
          </div>
          <span className="desc">
            최근 3개월 확정 근무표 기반 실근로시간, 야간 분배, 주말 균등성 및 희망 오프 반영률을 다각도로 분석합니다.
          </span>
        </div>
        <div className="fairness-score-pill">
          <span className="score-lbl">종합 공정성 지수</span>
          <span className="score-val">92.5점</span>
          <span className="score-tag">우수</span>
        </div>
      </div>

      {/* Two Column Metric Grid */}
      <div className="metrics-grid">
        {/* Panel 1: Night Hours Distribution */}
        <div className="metric-panel">
          <div className="panel-head">
            <span className="panel-title">간호사별 야간(Night) 근로시간 분배 현황</span>
            <span className="panel-sub">평균 60시간 기준</span>
          </div>

          <div className="panel-body">
            <div className="bar-list">
              {MOCK_STAFF.map((s, idx) => {
                const nightHours = s.canWorkNight ? 64 - (idx * 2) : 0;
                const pct = (nightHours / 70) * 100;

                return (
                  <div key={s.id} className="bar-item">
                    <div className="bar-info">
                      <span className="s-name">{s.name}</span>
                      <span className="s-val font-mono">
                        {s.canWorkNight ? `${nightHours}시간` : '야간 면제'}
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: s.canWorkNight ? '#6D28D9' : '#CBD5E1',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel 2: Weekend Off & Grant Rate */}
        <div className="metric-panel">
          <div className="panel-head">
            <span className="panel-title">주말 완전 OFF (토·일 연속 휴식) 및 신청 수용률</span>
            <span className="panel-sub">월 2회 최소 보장 기준</span>
          </div>

          <div className="panel-body">
            <table className="fairness-table">
              <thead>
                <tr>
                  <th>성명</th>
                  <th>주말 완전 OFF</th>
                  <th>희망 반영률</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_STAFF.map((s, idx) => (
                  <tr key={s.id}>
                    <td className="font-semibold">{s.name}</td>
                    <td className="font-mono">월 2회 달성</td>
                    <td className="font-mono">{95 - (idx * 2)}%</td>
                    <td>
                      <span className="status-tag ok">정상 충족</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .fairness-view {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .fairness-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-3) var(--space-4);
        }
        .header-text-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .title-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .title-icon {
          color: var(--color-primary);
        }
        .title {
          font-size: var(--text-md);
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }
        .desc {
          font-size: var(--text-xs);
          color: var(--color-text-muted);
        }

        .fairness-score-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: #ECFDF5;
          border: 1px solid #A7F3D0;
          padding: 3px 10px;
          border-radius: var(--radius-sm);
        }
        .score-lbl {
          font-size: 11px;
          color: #047857;
        }
        .score-val {
          font-size: 14px;
          font-weight: 700;
          color: #065F46;
          font-feature-settings: "tnum";
        }
        .score-tag {
          font-size: 10px;
          font-weight: 600;
          background-color: #10B981;
          color: #FFFFFF;
          padding: 1px 4px;
          border-radius: 2px;
        }

        /* Metric Grid */
        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }
        .metric-panel {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        .panel-head {
          padding: 8px var(--space-3);
          background-color: var(--color-bg-subtle);
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .panel-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .panel-sub {
          font-size: 11px;
          color: var(--color-text-muted);
        }
        .panel-body {
          padding: var(--space-3);
        }

        /* Bar List */
        .bar-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2-5);
        }
        .bar-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .bar-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }
        .s-name {
          font-weight: 500;
          color: var(--color-text-primary);
        }
        .s-val {
          font-size: 11px;
          color: var(--color-text-secondary);
        }
        .bar-track {
          height: 6px;
          background-color: var(--color-bg-subtle);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.3s ease;
        }

        /* Table */
        .fairness-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .fairness-table th {
          background-color: #FAFAFA;
          padding: 6px 8px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-secondary);
          border-bottom: 1px solid var(--color-border);
        }
        .fairness-table td {
          padding: 7px 8px;
          border-bottom: 1px solid var(--color-border-subtle);
          color: var(--color-text-primary);
        }
        .font-semibold {
          font-weight: 600;
        }
        .font-mono {
          font-feature-settings: "tnum";
          font-size: 11px;
        }
        .status-tag.ok {
          font-size: 10px;
          font-weight: 600;
          color: #15803D;
          background-color: #DCFCE7;
          padding: 1px 5px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};
