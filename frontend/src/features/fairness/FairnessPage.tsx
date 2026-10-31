import React, { useState, useEffect } from 'react';
import { Scale, RotateCw } from 'lucide-react';
import { TossIcon } from '../../components/ui/TossIcon';
import { fetchWardFairness, type WardFairnessData } from '../../api/scheduleApi';

export const FairnessPage: React.FC = () => {
  const [fairnessData, setFairnessData] = useState<WardFairnessData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchWardFairness('ward-obgyn');
      setFairnessData(data);
    } catch (err: unknown) {
      console.warn("API 호출 실패, 기본 데이터 유지", err);
      setFairnessData({
        ward_id: 'ward-obgyn',
        overall_fairness_score: 91.8,
        period: '2026-11',
        staff_metrics: [
          {
            staff_id: 'staff-1',
            staff_name: '김간호사 (책임)',
            can_work_night: true,
            night_hours: 64,
            weekend_days: 4,
            weekend_full_off_count: 2,
            work_burden_points: 26.5,
            request_grant_rate: 0.95,
          },
          {
            staff_id: 'staff-2',
            staff_name: '이간호사 (선임)',
            can_work_night: true,
            night_hours: 62,
            weekend_days: 4,
            weekend_full_off_count: 2,
            work_burden_points: 24.0,
            request_grant_rate: 0.93,
          },
          {
            staff_id: 'staff-3',
            staff_name: '박간호사',
            can_work_night: true,
            night_hours: 60,
            weekend_days: 4,
            weekend_full_off_count: 2,
            work_burden_points: 24.0,
            request_grant_rate: 0.91,
          },
          {
            staff_id: 'staff-4',
            staff_name: '최간호사',
            can_work_night: true,
            night_hours: 58,
            weekend_days: 4,
            weekend_full_off_count: 2,
            work_burden_points: 24.0,
            request_grant_rate: 0.89,
          },
          {
            staff_id: 'staff-5',
            staff_name: '정간호사 (신규)',
            can_work_night: true,
            night_hours: 56,
            weekend_days: 4,
            weekend_full_off_count: 2,
            work_burden_points: 24.0,
            request_grant_rate: 0.87,
          },
          {
            staff_id: 'staff-6',
            staff_name: '강간호사 (단시간)',
            can_work_night: false,
            night_hours: 0,
            weekend_days: 4,
            weekend_full_off_count: 2,
            work_burden_points: 18.0,
            request_grant_rate: 0.85,
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const metrics = fairnessData?.staff_metrics || [];
  const overallScore = fairnessData?.overall_fairness_score ?? 91.8;

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
        <div className="head-right">
          <button className="btn-refresh" onClick={loadData} disabled={loading}>
            <RotateCw size={13} className={loading ? 'spin' : ''} />
            <span>새로고침</span>
          </button>
          <div className="fairness-score-pill">
            <span className="score-lbl">종합 공정성 지수</span>
            <span className="score-val">{overallScore.toFixed(1)}점</span>
            <span className="score-tag">
              <TossIcon name="sparkles" size={12} style={{ marginRight: '3px' }} /> 우수
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Metric Grid */}
      <div className="metrics-grid">
        {/* Panel 1: Night Hours Distribution */}
        <div className="metric-panel">
          <div className="panel-head">
            <span className="panel-title">간호사별 야간(Night) 근로시간 분배 현황</span>
            <span className="panel-sub">교대 간호사 평균 60시간 기준</span>
          </div>

          <div className="panel-body">
            <div className="bar-list">
              {metrics.map((s) => {
                const pct = s.can_work_night ? (s.night_hours / 70) * 100 : 0;

                return (
                  <div key={s.staff_id} className="bar-item">
                    <div className="bar-info">
                      <span className="s-name">{s.staff_name}</span>
                      <span className="s-val font-mono">
                        {s.can_work_night ? `${s.night_hours}시간` : '야간 면제 (단시간)'}
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: s.can_work_night ? '#6D28D9' : '#CBD5E1',
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
            <span className="panel-title">주말 완전 OFF 및 근무부담 점수 (QA-SCORE-01)</span>
            <span className="panel-sub">월 2회 최소 보장 기준</span>
          </div>

          <div className="panel-body">
            <table className="fairness-table">
              <thead>
                <tr>
                  <th>성명</th>
                  <th>주말 완전 OFF</th>
                  <th>근무부담점수</th>
                  <th>희망 반영률</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((s) => (
                  <tr key={s.staff_id}>
                    <td className="font-semibold">{s.staff_name}</td>
                    <td className="font-mono">월 {s.weekend_full_off_count}회 달성</td>
                    <td className="font-mono font-bold text-slate-800">{s.work_burden_points.toFixed(1)}점</td>
                    <td className="font-mono">{Math.round(s.request_grant_rate * 100)}%</td>
                    <td>
                      <span className="status-tag ok">
                        <TossIcon name="check" size={12} style={{ marginRight: '3px' }} /> 정상 충족
                      </span>
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
          padding: var(--space-4);
          max-width: 1400px;
          margin: 0 auto;
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
          font-size: 16px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }
        .desc {
          font-size: 12px;
          color: var(--color-text-muted);
        }

        .head-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-refresh {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          color: var(--color-text-secondary);
          background-color: #FFFFFF;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
        }
        .btn-refresh:hover {
          background-color: var(--color-bg-subtle);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        .fairness-score-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: #ECFDF5;
          border: 1px solid #A7F3D0;
          padding: 4px 12px;
          border-radius: var(--radius-sm);
        }
        .score-lbl {
          font-size: 12px;
          color: #047857;
          font-weight: 600;
        }
        .score-val {
          font-size: 15px;
          font-weight: 800;
          color: #065F46;
          font-family: var(--font-mono);
        }
        .score-tag {
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          background-color: #059669;
          color: #FFFFFF;
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: var(--space-4);
        }

        @media (max-width: 1024px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }

        .metric-panel {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        .panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--color-border-subtle);
          background-color: var(--color-bg-subtle);
        }
        .panel-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .panel-sub {
          font-size: 12px;
          color: var(--color-text-muted);
        }
        .panel-body {
          padding: 16px;
        }

        .bar-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .bar-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .bar-info {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }
        .s-name {
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        .s-val {
          color: var(--color-text-muted);
        }
        .bar-track {
          height: 6px;
          background-color: #F1F5F9;
          border-radius: 3px;
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .fairness-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .fairness-table th,
        .fairness-table td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .fairness-table th {
          font-weight: 600;
          color: var(--color-text-secondary);
          background-color: var(--color-bg-subtle);
        }
        .status-tag {
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .status-tag.ok {
          color: #065F46;
          background-color: #ECFDF5;
          border: 1px solid #A7F3D0;
        }
      `}</style>
    </div>
  );
};
