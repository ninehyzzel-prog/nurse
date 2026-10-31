import React, { useState } from 'react';
import { MOCK_SHIFT_TEMPLATES, MOCK_POLICY_V1 } from '../../data/mockData';
import type { ShiftTemplate, PolicyVersion } from '../../types';
import { ShiftCell } from '../../components/ui/ShiftCell';
import { 
  Plus, 
  CheckCircle2, 
  Clock,
  SlidersHorizontal
} from 'lucide-react';

const DOMAIN_RULES_LIST = [
  { id: 'rule-rest', ruleType: 'H-REST', hardSoft: 'HARD', parameter: '660분 (11시간)', justification: '근무 종료 후 다음 근무 시작 전 최소 11시간 휴식 보장', legalFloor: true },
  { id: 'rule-week', ruleType: 'H-WEEK', hardSoft: 'HARD', parameter: '3120분 (52시간)', justification: '7일 rolling 실근로시간 상한 (법정 주 52시간)', legalFloor: true },
  { id: 'rule-consec', ruleType: 'H-CONSEC', hardSoft: 'HARD', parameter: '5일', justification: '최대 연속 근무일 5일 초과 배정 금지', legalFloor: false },
  { id: 'rule-night-cap', ruleType: 'H-NIGHT-CAP', hardSoft: 'HARD', parameter: '3회', justification: '최대 연속 나이트 근무 3회 초과 금지', legalFloor: false },
  { id: 'rule-elig', ruleType: 'H-ELIG', hardSoft: 'HARD', parameter: '야간불가자 면제', justification: '임산부 및 단시간 근로자 야간 배정 차단', legalFloor: true },
  { id: 'rule-single-off', ruleType: 'S-SINGLE-OFF', hardSoft: 'SOFT', parameter: '1일 단독 오프 지양', justification: '피로도 경감을 위해 2일 이상 연속 오프 권고', legalFloor: false },
];

export const PolicyAdminPage: React.FC = () => {
  const [templates, setTemplates] = useState<ShiftTemplate[]>(MOCK_SHIFT_TEMPLATES);
  const [policyVersion, setPolicyVersion] = useState<PolicyVersion>(MOCK_POLICY_V1);
  const [newVersionDraft, setNewVersionDraft] = useState(false);

  // 3교대 이브닝(EVENING) 추가 시뮬레이션
  const handleAddEveningShift = () => {
    const evening: ShiftTemplate = {
      id: 'shift-evening',
      code: 'EVENING',
      label: '이브닝 (E)',
      startsAtLocal: '14:00',
      endsAtLocal: '23:00',
      endDayOffset: 0,
      breakMinutes: 60,
      baseBurdenPoints: 1.3,
      colorToken: 'shift-evening',
      isAssignable: true,
    };
    setTemplates([...templates, evening]);
    setNewVersionDraft(true);
  };

  const handlePublishVersion = () => {
    setPolicyVersion({
      ...policyVersion,
      version: policyVersion.version + 1,
      publishedAt: new Date().toISOString(),
    });
    setNewVersionDraft(false);
  };

  return (
    <div className="policy-view">
      {/* Policy Version Header Bar */}
      <div className="policy-banner">
        <div className="banner-left">
          <div className="version-pill">
            <span className="v-num">정책 스냅샷 v{policyVersion.version}</span>
            <span className="v-status">{policyVersion.status}</span>
          </div>
          <span className="v-desc">
            과거 확정 근무표는 생성 당시의 정책 버전 스냅샷을 영구 보존하며, 새 규칙 변경 시 버전이 증가합니다.
          </span>
        </div>

        <div className="banner-right">
          {newVersionDraft && (
            <button className="btn-publish-ver" onClick={handlePublishVersion}>
              <CheckCircle2 size={13} />
              <span>새 정책 버전(v{policyVersion.version + 1}) 발행</span>
            </button>
          )}
        </div>
      </div>

      {/* Shift Templates Management Panel */}
      <div className="section-panel">
        <div className="panel-toolbar">
          <div className="toolbar-title">
            <Clock size={14} />
            <span className="title-text">병동 근무 템플릿 목록 (Shift Templates)</span>
          </div>
          <button
            className="btn-add-shift"
            onClick={handleAddEveningShift}
            disabled={templates.some((t) => t.code === 'EVENING')}
          >
            <Plus size={13} />
            <span>3교대 이브닝(E) 템플릿 추가</span>
          </button>
        </div>

        <div className="table-wrapper">
          <table className="policy-table">
            <thead>
              <tr>
                <th>코드</th>
                <th>근무 명칭</th>
                <th>시작 시각</th>
                <th>종료 시각</th>
                <th>익일 종료</th>
                <th>기본 휴게</th>
                <th>부담 점수</th>
                <th>배정 가능</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tmpl) => (
                <tr key={tmpl.id}>
                  <td>
                    <ShiftCell template={tmpl} isCompact />
                  </td>
                  <td className="font-semibold">{tmpl.label}</td>
                  <td className="font-mono">{tmpl.startsAtLocal}</td>
                  <td className="font-mono">{tmpl.endsAtLocal}</td>
                  <td>
                    {tmpl.endDayOffset > 0 ? (
                      <span className="badge-offset">익일 (+{tmpl.endDayOffset}일)</span>
                    ) : (
                      <span className="text-muted">당일</span>
                    )}
                  </td>
                  <td className="font-mono">{tmpl.breakMinutes}분</td>
                  <td className="font-mono">{tmpl.baseBurdenPoints.toFixed(2)}점</td>
                  <td>
                    {tmpl.isAssignable ? (
                      <span className="badge-ok">할당 가능</span>
                    ) : (
                      <span className="text-muted">비할당</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Domain Rules & Hard Constraints Panel */}
      <div className="section-panel">
        <div className="panel-toolbar">
          <div className="toolbar-title">
            <SlidersHorizontal size={14} />
            <span className="title-text">도메인 제약 및 규칙 설정 (Domain Rules)</span>
          </div>
          <span className="toolbar-sub">H-REST, H-ELIG 등 법적 기준(legal_floor)은 임의 완화 불가</span>
        </div>

        <div className="table-wrapper">
          <table className="policy-table">
            <thead>
              <tr>
                <th>규칙 ID</th>
                <th>분류</th>
                <th>규칙 내용</th>
                <th>기본 기준 파라미터</th>
                <th>법적 최저기준</th>
              </tr>
            </thead>
            <tbody>
              {DOMAIN_RULES_LIST.map((rule) => (
                <tr key={rule.id}>
                  <td className="font-mono font-semibold">{rule.ruleType}</td>
                  <td>
                    <span className={`tag-strength ${rule.hardSoft.toLowerCase()}`}>
                      {rule.hardSoft}
                    </span>
                  </td>
                  <td>{rule.justification}</td>
                  <td className="font-mono">{rule.parameter}</td>
                  <td>
                    {rule.legalFloor ? (
                      <span className="badge-legal">법적 보호 (legal_floor)</span>
                    ) : (
                      <span className="text-muted">내부 병동 규칙</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .policy-view {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        /* Banner */
        .policy-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: 8px var(--space-4);
        }
        .banner-left {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .version-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: var(--color-bg-subtle);
          border: 1px solid var(--color-border);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: 12px;
        }
        .v-num {
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .v-status {
          font-size: 10px;
          font-weight: 600;
          color: #047857;
          background-color: #ECFDF5;
          padding: 1px 4px;
          border-radius: 2px;
        }
        .v-desc {
          font-size: 12px;
          color: var(--color-text-muted);
        }

        .btn-publish-ver {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 28px;
          padding: 0 10px;
          background-color: var(--color-primary);
          color: #fff;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 600;
        }

        /* Section Panels */
        .section-panel {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        .panel-toolbar {
          padding: 8px var(--space-3);
          background-color: var(--color-bg-subtle);
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .toolbar-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .toolbar-sub {
          font-size: 11px;
          color: var(--color-text-muted);
        }
        .btn-add-shift {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 26px;
          padding: 0 8px;
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 500;
          color: var(--color-text-secondary);
        }
        .btn-add-shift:hover:not(:disabled) {
          background-color: var(--color-bg-muted);
          color: var(--color-text-primary);
        }
        .btn-add-shift:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Table */
        .table-wrapper {
          overflow-x: auto;
        }
        .policy-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .policy-table th {
          background-color: #FAFAFA;
          padding: 6px 12px;
          text-align: left;
          font-weight: 600;
          font-size: 11px;
          color: var(--color-text-secondary);
          border-bottom: 1px solid var(--color-border);
        }
        .policy-table td {
          padding: 8px 12px;
          border-bottom: 1px solid var(--color-border-subtle);
          color: var(--color-text-primary);
        }
        .policy-table tr:hover td {
          background-color: #FAFAFA;
        }
        .font-semibold {
          font-weight: 600;
        }
        .font-mono {
          font-feature-settings: "tnum";
          font-size: 11px;
        }
        .text-muted {
          color: var(--color-text-muted);
          font-size: 11px;
        }
        .badge-offset {
          font-size: 10px;
          font-weight: 600;
          color: #6D28D9;
          background-color: #F5F3FF;
          padding: 1px 5px;
          border-radius: 2px;
        }
        .badge-ok {
          font-size: 10px;
          color: #15803D;
          font-weight: 600;
        }
        .tag-strength {
          font-size: 10px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 2px;
        }
        .tag-strength.hard {
          background-color: #FEF2F2;
          color: #B91C1C;
        }
        .tag-strength.soft {
          background-color: #FFFBEB;
          color: #B45309;
        }
        .badge-legal {
          font-size: 10px;
          font-weight: 600;
          color: #B91C1C;
          background-color: #FEE2E2;
          padding: 1px 5px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};
