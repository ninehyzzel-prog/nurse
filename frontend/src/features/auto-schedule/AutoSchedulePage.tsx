import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_CANDIDATES } from '../../data/mockData';
import { 
  Wand2, 
  AlertTriangle, 
  ShieldCheck,
  Layers
} from 'lucide-react';

export const AutoSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [isSolving, setIsSolving] = useState(false);
  const [solverResult, setSolverResult] = useState<'IDLE' | 'FEASIBLE' | 'INFEASIBLE'>('FEASIBLE');
  const [selectedRank, setSelectedRank] = useState(1);
  const [applied, setApplied] = useState(false);

  const [coveragePreset, setCoveragePreset] = useState<'NORMAL' | 'OVERLOAD'>('NORMAL');

  const handleRunOptimization = () => {
    setIsSolving(true);
    setTimeout(() => {
      setIsSolving(false);
      if (coveragePreset === 'OVERLOAD') {
        setSolverResult('INFEASIBLE');
      } else {
        setSolverResult('FEASIBLE');
      }
    }, 800);
  };

  const handleApplyToGrid = () => {
    setApplied(true);
    setTimeout(() => {
      navigate('/admin/roster/2026-11');
    }, 800);
  };

  return (
    <div className="auto-view">
      {/* Solver Control Header */}
      <div className="solver-header-bar">
        <div className="header-info">
          <div className="badge-row">
            <span className="tech-badge">OR-Tools CP-SAT</span>
            <span className="policy-badge">정책 v1 스냅샷</span>
          </div>
          <h2 className="header-title">월간 자동 근무표 편성 오케스트레이터</h2>
          <p className="header-desc">
            법적 필수 최저기준(최소 11시간 휴식 보장, 5연속 근무 상한)을 엄격히 충족하는 최적 스케줄 후보안을 탐색합니다.
          </p>
        </div>

        <div className="header-actions">
          <div className="scenario-select-box">
            <label className="scenario-label">시나리오:</label>
            <select
              value={coveragePreset}
              onChange={(e) => setCoveragePreset(e.target.value as any)}
              className="scenario-select"
            >
              <option value="NORMAL">정상 (D 1 / N 1 커버리지)</option>
              <option value="OVERLOAD">인원 부족 (D 2 / N 2 과다요구)</option>
            </select>
          </div>

          <button
            className="btn-run-solver"
            onClick={handleRunOptimization}
            disabled={isSolving}
          >
            <Wand2 size={14} />
            <span>{isSolving ? '수리 솔버 최적화 연산 중...' : '자동 편성 실행'}</span>
          </button>
        </div>
      </div>

      {/* Pre-Solve Feasibility Diagnosis Strip */}
      <div className="diagnosis-strip">
        <div className="strip-title">
          <ShieldCheck size={14} className="strip-icon" />
          <span>사전 인력 실현가능성 진단</span>
        </div>
        <div className="strip-metrics">
          <div className="metric-item">
            <span className="lbl">등록 인력</span>
            <span className="val">6명</span>
          </div>
          <div className="metric-item">
            <span className="lbl">요구 총 인시</span>
            <span className="val">{coveragePreset === 'NORMAL' ? '720인시 (주 28h/인)' : '1440인시 (주 56h/인)'}</span>
          </div>
          <div className="metric-item">
            <span className="lbl">11시간 휴식 기준</span>
            <span className="val status-ok">100% 필수 보장</span>
          </div>
          <div className="metric-item">
            <span className="lbl">야간 가능 인원</span>
            <span className="val">5명 (1명 면제)</span>
          </div>
        </div>
      </div>

      {/* Solver Results Section */}
      {solverResult === 'INFEASIBLE' ? (
        <div className="infeasible-panel">
          <div className="infeasible-head">
            <AlertTriangle size={16} className="danger-icon" />
            <span className="infeasible-title">수학적 최적해 도출 불가 (INFEASIBLE)</span>
          </div>
          <p className="infeasible-desc">
            현재 인력 규모(6명) 및 법적 제약(11시간 최소 휴식) 조건하에서 요구된 커버리지(D 2인, N 2인)를 만족하는 해가 수학적으로 존재하지 않습니다.
          </p>
          <div className="infeasible-actions">
            <span className="guide-title">완화 가능한 대안 권고:</span>
            <ul className="guide-list">
              <li>1. 커버리지 요구치를 D 1명 / N 1명으로 조정하십시오.</li>
              <li>2. 단시간 간호사의 근로시간 일시 연장 또는 파견 인력을 추가 등록하십시오.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="candidates-section">
          <div className="section-title-bar">
            <div className="title-left">
              <Layers size={14} />
              <span className="title-text">도출된 솔버 후보안 비교 (채택 후 근무표 매트릭스에 적용)</span>
            </div>
            <span className="title-sub">결정론적 가중치 기반 파레토 최적해</span>
          </div>

          <div className="candidates-grid">
            {MOCK_CANDIDATES.map((cand) => {
              const isSelected = selectedRank === cand.rank;
              const name = `후보 ${cand.rank}안`;
              const desc = cand.rank === 1
                ? '공정성 가중치 균형안: 직원별 야간 시간 및 주말 배분 편차를 최소화한 최적해'
                : '희망 오프 최대 반영안: 간호사 희망 휴일 및 연차 요청을 우선적으로 수용한 해';

              return (
                <div
                  key={cand.rank}
                  className={`candidate-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedRank(cand.rank)}
                >
                  <div className="card-top">
                    <div className="candidate-identity">
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => setSelectedRank(cand.rank)}
                        className="radio-input"
                      />
                      <span className="cand-name">{name}</span>
                    </div>
                    <span className={`cand-badge ${cand.rank === 1 ? 'balance' : 'pref'}`}>
                      {cand.rank === 1 ? '공정성 최적안' : '선호도 최적안'}
                    </span>
                  </div>

                  <p className="cand-desc">{desc}</p>

                  <div className="cand-metrics-table">
                    <div className="cand-metric-row">
                      <span className="c-lbl">공정성 지수</span>
                      <span className="c-val font-mono">{cand.fairnessScore}점</span>
                    </div>
                    <div className="cand-metric-row">
                      <span className="c-lbl">희망 오프 충족률</span>
                      <span className="c-val font-mono">{Math.round(cand.grantedRequestsRate * 100)}%</span>
                    </div>
                    <div className="cand-metric-row">
                      <span className="c-lbl">야간 편차</span>
                      <span className="c-val font-mono">{Math.round(cand.nightDeviationMinutes / 60)}시간</span>
                    </div>
                    <div className="cand-metric-row">
                      <span className="c-lbl">하드 제약 위반</span>
                      <span className="c-val status-ok">0건 (100% 충족)</span>
                    </div>
                  </div>

                  <div className="card-footer">
                    <button
                      className={`btn-apply ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRank(cand.rank);
                        handleApplyToGrid();
                      }}
                    >
                      {applied && isSelected ? '근무표 반영 완료...' : `${name} 채택 및 전체 근무표 반영`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .auto-view {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        /* Solver Header Bar */
        .solver-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-3) var(--space-4);
        }
        .badge-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;
        }
        .tech-badge {
          font-size: 12px;
          font-weight: 600;
          color: #2563EB;
          background-color: #EFF6FF;
          border: 1px solid #BFDBFE;
          padding: 2px 6px;
          border-radius: var(--radius-xs);
        }
        .policy-badge {
          font-size: 12px;
          color: var(--color-text-muted);
        }
        .header-title {
          font-size: var(--text-md);
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }
        .header-desc {
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          margin: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .scenario-select-box {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .scenario-label {
          font-size: 12px;
          color: var(--color-text-secondary);
        }
        .scenario-select {
          height: 30px;
          padding: 0 8px;
          background-color: var(--color-bg-subtle);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: 12px;
          color: var(--color-text-primary);
        }
        .btn-run-solver {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 30px;
          padding: 0 var(--space-3);
          background-color: var(--color-primary);
          color: var(--color-primary-text);
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 600;
          transition: background-color 0.12s;
        }
        .btn-run-solver:hover:not(:disabled) {
          background-color: var(--color-primary-hover);
        }
        .btn-run-solver:disabled {
          opacity: 0.6;
        }

        /* Diagnosis Strip */
        .diagnosis-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--color-bg-subtle);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: 8px var(--space-4);
        }
        .strip-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        .strip-icon {
          color: #2563EB;
        }
        .strip-metrics {
          display: flex;
          align-items: center;
          gap: var(--space-5);
        }
        .metric-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }
        .metric-item .lbl {
          color: var(--color-text-muted);
        }
        .metric-item .val {
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .metric-item .val.status-ok {
          color: #15803D;
        }

        /* Infeasible Panel */
        .infeasible-panel {
          background-color: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: var(--radius-sm);
          padding: var(--space-4);
        }
        .infeasible-head {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }
        .danger-icon {
          color: #DC2626;
        }
        .infeasible-title {
          font-size: 13px;
          font-weight: 700;
          color: #991B1B;
        }
        .infeasible-desc {
          font-size: 12px;
          color: #B91C1C;
          margin-bottom: var(--space-3);
          line-height: 1.4;
        }
        .infeasible-actions {
          background-color: rgba(255, 255, 255, 0.6);
          border: 1px solid #FCA5A5;
          border-radius: var(--radius-xs);
          padding: var(--space-2-5);
          font-size: 12px;
        }
        .guide-title {
          font-weight: 600;
          color: #991B1B;
        }
        .guide-list {
          list-style: none;
          margin-top: 4px;
          color: #7F1D1D;
        }

        /* Candidates Grid */
        .candidates-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .section-title-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 2px;
        }
        .title-left {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .title-sub {
          font-size: 12px;
          color: var(--color-text-muted);
        }

        .candidates-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }
        .candidate-card {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          cursor: pointer;
          transition: border-color 0.12s, box-shadow 0.12s;
        }
        .candidate-card:hover {
          border-color: var(--color-border-strong);
        }
        .candidate-card.is-selected {
          border-color: #2563EB;
          box-shadow: inset 0 0 0 1px #2563EB;
        }

        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .candidate-identity {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .radio-input {
          cursor: pointer;
        }
        .cand-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .cand-badge {
          font-size: 12px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: var(--radius-xs);
        }
        .cand-badge.balance {
          background-color: #EFF6FF;
          border: 1px solid #BFDBFE;
          color: #1D4ED8;
        }
        .cand-badge.pref {
          background-color: #ECFDF5;
          border: 1px solid #A7F3D0;
          color: #047857;
        }
        .cand-desc {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.4;
        }

        .cand-metrics-table {
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-xs);
          background-color: var(--color-bg-subtle);
          padding: var(--space-2);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .cand-metric-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }
        .c-lbl {
          color: var(--color-text-muted);
        }
        .c-val {
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .c-val.status-ok {
          color: #15803D;
        }

        .card-footer {
          margin-top: auto;
          padding-top: var(--space-2);
        }
        .btn-apply {
          width: 100%;
          height: 32px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 600;
          transition: background-color 0.12s;
        }
        .btn-apply.btn-primary {
          background-color: var(--color-primary);
          color: var(--color-primary-text);
        }
        .btn-apply.btn-primary:hover {
          background-color: var(--color-primary-hover);
        }
        .btn-apply.btn-secondary {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
        }
        .btn-apply.btn-secondary:hover {
          background-color: var(--color-bg-subtle);
          color: var(--color-text-primary);
        }
      `}</style>
    </div>
  );
};
