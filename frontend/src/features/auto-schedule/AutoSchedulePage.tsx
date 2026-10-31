import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_CANDIDATES } from '../../data/mockData';
import { 
  Wand2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

export const AutoSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [isSolving, setIsSolving] = useState(false);
  const [solverResult, setSolverResult] = useState<'IDLE' | 'FEASIBLE' | 'INFEASIBLE'>('FEASIBLE');
  const [selectedCandidate, setSelectedCandidate] = useState(1);
  const [applied, setApplied] = useState(false);

  // 시나리오 테스트용 커버리지 요구치 (D 1 / N 1 vs D 2 / N 2)
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
    }, 1000);
  };

  const handleApplyToGrid = () => {
    setApplied(true);
    setTimeout(() => {
      navigate('/admin/roster/2026-11');
    }, 1000);
  };

  return (
    <div className="auto-schedule-container">
      {/* 헤더 & 실행 제어 카드 */}
      <div className="solver-control-card">
        <div className="control-left">
          <div className="badge-row">
            <span className="algo-badge">Google OR-Tools CP-SAT</span>
            <span className="ver-badge">정책 v1 기준 (불변 스냅샷)</span>
          </div>
          <h2 className="title">월간 자동 근무표 편성 오케스트레이터</h2>
          <p className="desc">
            법적 필수 제약(최소 11시간 휴식, 연속근무 5일)을 100% 만족하는 최적 후보안을 도출합니다.
          </p>
        </div>

        <div className="control-right">
          <div className="preset-selector">
            <label>시나리오 테스트:</label>
            <select
              value={coveragePreset}
              onChange={(e) => setCoveragePreset(e.target.value as any)}
              className="preset-select"
            >
              <option value="NORMAL">정상 시나리오 (D 1인 / N 1인 커버리지)</option>
              <option value="OVERLOAD">인원 부족 시나리오 (D 2인 / N 2인 과다요구)</option>
            </select>
          </div>

          <button
            className="run-solver-btn"
            onClick={handleRunOptimization}
            disabled={isSolving}
          >
            <Wand2 size={18} />
            <span>{isSolving ? '최적화 솔버 연산 중...' : '자동 편성 최적화 실행'}</span>
          </button>
        </div>
      </div>

      {/* 실현가능성 사전 검사 (부록 A 요건) */}
      <div className="precheck-card">
        <div className="precheck-title">
          <ShieldCheck size={18} color="var(--color-brand-primary)" />
          <strong>사전 인력 실현가능성 진단</strong>
        </div>
        <div className="precheck-grid">
          <div className="p-stat">
            <span className="lbl">등록 간호사:</span>
            <strong>6명</strong>
          </div>
          <div className="p-stat">
            <span className="lbl">월간 총 체류 요구 인시:</span>
            <strong>{coveragePreset === 'NORMAL' ? '720인시 (주 28h/인)' : '1440인시 (주 56h/인)'}</strong>
          </div>
          <div className="p-stat">
            <span className="lbl">최소 11시간 휴식 준수율:</span>
            <strong className="text-success">100% 필수 조건</strong>
          </div>
          <div className="p-stat">
            <span className="lbl">사전 진단 판정:</span>
            <strong>
              {coveragePreset === 'NORMAL' ? (
                <span className="text-success">✓ 편성 실행 가능</span>
              ) : (
                <span className="text-danger">⚠️ 물리적 인력 부족 (불가 예상)</span>
              )}
            </strong>
          </div>
        </div>
      </div>

      {/* 편성 불가 (INFEASIBLE) 진단 리포트 */}
      {solverResult === 'INFEASIBLE' && (
        <div className="infeasible-card">
          <div className="inf-head">
            <AlertTriangle size={24} color="var(--color-danger)" />
            <div>
              <h3 className="inf-title">편성 불가 (INFEASIBLE) — 솔버 진단 보고서</h3>
              <p className="inf-desc">
                필수 제약 조건을 충족하는 근무표를 생성할 수 없습니다. 시스템은 가짜 인력을 만들거나 제약을 임의 완화하지 않습니다.
              </p>
            </div>
          </div>

          <div className="cause-list">
            <div className="cause-item">
              <strong>원인 1: 주당 근로시간 상한 (H-WEEK 52시간) 및 월 최소 OFF 8일 위반</strong>
              <span>
                Day 2인 + Night 2인 커버리지를 6명이 충족하려면 1인당 월평균 240시간(주 56시간)이 필요하여 법정 근로시간 한도를 초과합니다.
              </span>
            </div>
            <div className="cause-item">
              <strong>원인 2: 연속 나이트 및 최소 휴식 충돌 (H-REST 11시간)</strong>
              <span>
                14시간 나이트 근무 후 11시간 휴식을 보장하면 나이트 다음 날 배정이 불가능하여 가용 인력 풀이 고갈됩니다.
              </span>
            </div>
          </div>

          <div className="inf-actions">
            <strong>권장 해결 대안:</strong>
            <ul>
              <li>1) 일자별 필요 커버리지 요구치를 '최소 1인'으로 하향 조정합니다.</li>
              <li>2) 병동에 임시 지원 간호사(풀 인력)를 추가 등록합니다.</li>
            </ul>
          </div>
        </div>
      )}

      {/* 정상 편성 (FEASIBLE) 후보안 2~3개 비교 화면 */}
      {solverResult === 'FEASIBLE' && (
        <div className="candidates-container">
          <div className="candidates-header">
            <h3>편성 후보안 다차원 비교 (Rank 1 ~ 2)</h3>
            <span className="help-txt">품질 점수와 세부 지표를 비교하여 최종 채택할 안을 선택하세요.</span>
          </div>

          <div className="candidate-cards">
            {MOCK_CANDIDATES.map((cand) => (
              <div
                key={cand.rank}
                className={`candidate-card ${selectedCandidate === cand.rank ? 'selected' : ''}`}
                onClick={() => setSelectedCandidate(cand.rank)}
              >
                <div className="cand-top">
                  <div className="rank-badge">
                    <span>후보 {cand.rank}안</span>
                    {cand.rank === 1 && <span className="best-tag">★ 최적 권고</span>}
                  </div>
                  <div className="score-box">
                    <span className="lbl">공정성 품질 지수</span>
                    <span className="score">{cand.fairnessScore} / 100</span>
                  </div>
                </div>

                <div className="metrics-list">
                  <div className="metric-row">
                    <span>적격 희망 OFF 반영률:</span>
                    <strong>{Math.round(cand.grantedRequestsRate * 100)}% ({cand.grantedRequestsRate === 0.94 ? '17/18건' : '15/18건'})</strong>
                  </div>
                  <div className="metric-row">
                    <span>근무부담 정규화 편차:</span>
                    <strong>최대 {(cand.maxBurdenDeviation * 100).toFixed(1)}% 이내 (균등)</strong>
                  </div>
                  <div className="metric-row">
                    <span>야간 근로시간 격차:</span>
                    <strong>간호사 간 최대 {cand.nightDeviationMinutes / 60}시간</strong>
                  </div>
                  <div className="metric-row">
                    <span>주말 완전 오프 격차:</span>
                    <strong>간호사 간 최대 {cand.weekendDeviationDays}일</strong>
                  </div>
                </div>

                <div className="card-select-footer">
                  <input
                    type="radio"
                    name="candidate"
                    checked={selectedCandidate === cand.rank}
                    onChange={() => setSelectedCandidate(cand.rank)}
                  />
                  <span>이 후보안 선택하기</span>
                </div>
              </div>
            ))}
          </div>

          {/* '왜 이렇게 편성됐나요?' 설명 패널 */}
          <div className="explanation-panel">
            <div className="exp-head">
              <HelpCircle size={18} color="var(--color-brand-primary)" />
              <h4>'왜 이렇게 편성됐나요?' 결정론적 근거 설명 (후보 1안 기준)</h4>
            </div>

            <div className="exp-facts">
              <div className="fact-box">
                <span className="fact-tag">필수 제약 충족</span>
                <p>
                  11월 전 기간 동안 모든 교대(Day 1인, Night 1인)의 최소 인원을 100% 충족했습니다. 나이트 종료 후 최소 11시간 휴식 규칙을 위반한 배정은 0건입니다.
                </p>
              </div>
              <div className="fact-box">
                <span className="fact-tag">오프 경합 조율 근거</span>
                <p>
                  11월 14일 토요일 오프 경합에서는 최근 3개월 주말 오프 부족(2회) 및 근무부담 초과 누적이 큰 김간호사(35점)의 희망을 우선 반영했습니다.
                </p>
              </div>
              <div className="fact-box">
                <span className="fact-tag">공정성 기여</span>
                <p>
                  전체 6인 간호사의 월간 야간 근로시간 격차를 2시간 이내로 최소화하여 야간 편중을 방지했습니다.
                </p>
              </div>
            </div>

            <div className="apply-area">
              <button className="apply-btn" onClick={handleApplyToGrid}>
                <CheckCircle2 size={18} />
                <span>
                  {applied
                    ? '그리드 편집기로 반영 중...'
                    : `후보 ${selectedCandidate}안을 전체 근무표 편집기에 최종 적용하기`}
                </span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .auto-schedule-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .solver-control-card {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .control-left {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .badge-row {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: 2px;
        }
        .algo-badge {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-brand-primary);
          background-color: var(--color-brand-light);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }
        .ver-badge {
          font-size: 11px;
          color: var(--color-text-secondary);
        }
        .title {
          font-size: var(--font-size-base);
          font-weight: 700;
        }
        .desc {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
        }
        .control-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: var(--space-2);
        }
        .preset-selector {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--font-size-xs);
        }
        .preset-select {
          padding: 4px 8px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
        }
        .run-solver-btn {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 10px 18px;
          background-color: var(--color-brand-primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 700;
          font-size: var(--font-size-sm);
          cursor: pointer;
        }
        .run-solver-btn:disabled {
          background-color: var(--color-text-muted);
          cursor: not-allowed;
        }
        .precheck-card {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-4);
        }
        .precheck-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--font-size-xs);
          margin-bottom: var(--space-2);
        }
        .precheck-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-3);
          font-size: var(--font-size-xs);
        }
        .p-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .p-stat .lbl { color: var(--color-text-secondary); }
        .text-success { color: var(--color-success); }
        .text-danger { color: var(--color-danger); }

        /* INFEASIBLE */
        .infeasible-card {
          background-color: var(--color-danger-bg);
          border: 1px solid #FCA5A5;
          border-radius: var(--radius-md);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .inf-head {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
        }
        .inf-title {
          font-size: var(--font-size-base);
          font-weight: 700;
          color: var(--color-danger);
        }
        .inf-desc {
          font-size: var(--font-size-xs);
          color: #7F1D1D;
        }
        .cause-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          background-color: white;
          padding: var(--space-3);
          border-radius: var(--radius-sm);
        }
        .cause-item {
          display: flex;
          flex-direction: column;
          font-size: var(--font-size-xs);
        }
        .cause-item strong { color: var(--color-danger); }
        .cause-item span { color: var(--color-text-secondary); margin-top: 2px; }
        .inf-actions {
          font-size: var(--font-size-xs);
          color: #7F1D1D;
        }
        .inf-actions ul {
          margin-left: var(--space-4);
          margin-top: 4px;
        }

        /* Candidates */
        .candidates-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .candidates-header {
          display: flex;
          align-items: baseline;
          gap: var(--space-3);
        }
        .candidates-header h3 {
          font-size: var(--font-size-base);
          font-weight: 700;
        }
        .help-txt {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
        }
        .candidate-cards {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-4);
        }
        .candidate-card {
          background-color: var(--color-bg-surface);
          border: 2px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          transition: border-color 0.15s;
        }
        .candidate-card:hover {
          border-color: var(--color-brand-primary);
        }
        .candidate-card.selected {
          border-color: var(--color-brand-primary);
          background-color: #F8FAFC;
        }
        .cand-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }
        .rank-badge {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--font-size-base);
          font-weight: 800;
        }
        .best-tag {
          font-size: 11px;
          color: var(--color-brand-primary);
          background-color: var(--color-brand-light);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
        }
        .score-box {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .score-box .lbl { font-size: 10px; color: var(--color-text-muted); }
        .score-box .score {
          font-size: var(--font-size-xl);
          font-weight: 800;
          color: var(--color-brand-primary);
        }
        .metrics-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background-color: var(--color-bg-muted);
          padding: var(--space-3);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
        }
        .metric-row {
          display: flex;
          justify-content: space-between;
        }
        .card-select-footer {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--font-size-xs);
          font-weight: 700;
          padding-top: var(--space-2);
          border-top: 1px solid var(--color-border);
        }
        .explanation-panel {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .exp-head {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .exp-head h4 {
          font-size: var(--font-size-sm);
          font-weight: 700;
        }
        .exp-facts {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-3);
        }
        .fact-box {
          background-color: var(--color-bg-muted);
          border-radius: var(--radius-sm);
          padding: var(--space-3);
          font-size: 11px;
          line-height: 1.4;
        }
        .fact-tag {
          font-weight: 700;
          color: var(--color-brand-primary);
          display: block;
          margin-bottom: 4px;
        }
        .apply-area {
          display: flex;
          justify-content: flex-end;
          margin-top: var(--space-2);
        }
        .apply-btn {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 12px 24px;
          background-color: var(--color-brand-primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: var(--font-size-sm);
          font-weight: 700;
          cursor: pointer;
        }
        .apply-btn:hover {
          background-color: var(--color-brand-hover);
        }
      `}</style>
    </div>
  );
};
