import React, { useState } from 'react';
import { MOCK_SHIFT_TEMPLATES, MOCK_POLICY_V1 } from '../../data/mockData';
import type { ShiftTemplate, PolicyVersion } from '../../types';
import { ShiftCell } from '../../components/ui/ShiftCell';
import { 
  ShieldCheck, 
  Plus, 
  CheckCircle2, 
  FileText
} from 'lucide-react';

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
    <div className="policy-container">
      {/* 상단 정책 버전 정보 */}
      <div className="policy-version-bar">
        <div className="v-left">
          <FileText size={20} color="var(--color-brand-primary)" />
          <div>
            <div className="v-num">
              현재 적용 정책 버전: <strong>v{policyVersion.version}</strong>
              <span className="v-badge">{policyVersion.status}</span>
            </div>
            <span className="v-desc">
              발행일시: {policyVersion.publishedAt ? new Date(policyVersion.publishedAt).toLocaleString() : '미발행'}
              {' '}(과거 근무표는 발행 당시 버전의 템플릿과 규칙으로 영구 보존됩니다)
            </span>
          </div>
        </div>

        <div className="v-right">
          {newVersionDraft && (
            <button className="publish-v-btn" onClick={handlePublishVersion}>
              <CheckCircle2 size={16} />
              <span>새 정책 버전(v{policyVersion.version + 1}) 발행하기</span>
            </button>
          )}
        </div>
      </div>

      <div className="policy-grid">
        {/* 좌측: 유연한 교대 템플릿 관리 (하드코딩 배제) */}
        <div className="policy-card">
          <div className="card-head">
            <h3 className="card-title">교대 근무 템플릿 관리</h3>
            <button className="add-shift-btn" onClick={handleAddEveningShift}>
              <Plus size={14} />
              <span>3교대(이브닝) 추가 테스트</span>
            </button>
          </div>
          <p className="sub-txt">
            근무 시간, 휴게시간, 기본 부담 점수를 편집합니다. (코드 수준의 D/N 하드코딩 없음)
          </p>

          <div className="template-table-wrapper">
            <table className="template-table">
              <thead>
                <tr>
                  <th>미리보기</th>
                  <th>코드/명칭</th>
                  <th>시작~종료</th>
                  <th>휴게(분)</th>
                  <th>부담 점수</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((tmpl) => (
                  <tr key={tmpl.id}>
                    <td><ShiftCell template={tmpl} isCompact /></td>
                    <td><strong>{tmpl.code}</strong> ({tmpl.label})</td>
                    <td>
                      {tmpl.startsAtLocal} ~ {tmpl.endsAtLocal}
                      {tmpl.endDayOffset > 0 && <span className="next-tag">익일</span>}
                    </td>
                    <td>{tmpl.breakMinutes}분</td>
                    <td><strong>{tmpl.baseBurdenPoints}점</strong></td>
                    <td>
                      <span className="active-tag">{tmpl.isAssignable ? '사용중' : '비활성'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 우측: 필수 법정 제약 (Hard Floor 보호) */}
        <div className="policy-card">
          <div className="card-head">
            <h3 className="card-title">필수 제약 규칙 (Hard Constraints)</h3>
            <span className="lock-tag">
              <ShieldCheck size={14} /> 법적 하한선(Floor) 보호됨
            </span>
          </div>
          <p className="sub-txt">
            환자 안전 및 근로기준법/특례 규정에 따라 아래 항목은 시스템에서 임의로 완화할 수 없습니다.
          </p>

          <div className="rule-list">
            <div className="rule-item protected">
              <div className="r-head">
                <strong>H-REST: 근무 간 최소 휴식 시간 보장</strong>
                <span className="prot-pill">완화 불가 (Legal Floor)</span>
              </div>
              <div className="r-body">
                <span>기준값: <strong>660분 (11시간 연속 휴식)</strong></span>
                <span className="r-desc">근무 종료 후 다음 근무 시작까지 11시간 미만 배정은 하드 에러로 차단됩니다.</span>
              </div>
            </div>

            <div className="rule-item protected">
              <div className="r-head">
                <strong>H-WEEK: 주당 실근로시간 상한</strong>
                <span className="prot-pill">완화 불가 (Legal Floor)</span>
              </div>
              <div className="r-body">
                <span>기준값: <strong>3,120분 (주 52시간)</strong></span>
                <span className="r-desc">휴게시간을 제외한 실근로시간 기준 주 52시간 초과 배정을 엄격히 제한합니다.</span>
              </div>
            </div>

            <div className="rule-item">
              <div className="r-head">
                <strong>H-CONSEC: 최대 연속 근무일수</strong>
                <span className="conf-pill">병동 설정</span>
              </div>
              <div className="r-body">
                <span>기준값: <strong>5일</strong> (5일째 도달 시 +1.0점 가산 및 6일째 배정 금지)</span>
              </div>
            </div>

            <div className="rule-item">
              <div className="r-head">
                <strong>H-OFF-MIN: 월간 최소 보장 오프 일수</strong>
                <span className="conf-pill">병동 설정</span>
              </div>
              <div className="r-body">
                <span>기준값: <strong>8일</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .policy-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .policy-version-bar {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-4);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .v-left {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .v-num {
          font-size: var(--font-size-base);
        }
        .v-badge {
          margin-left: var(--space-2);
          font-size: 11px;
          font-weight: 700;
          color: var(--color-success);
          background-color: var(--color-success-bg);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
        }
        .v-desc {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
        }
        .publish-v-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background-color: var(--color-brand-primary);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-weight: 700;
          cursor: pointer;
        }
        .policy-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-4);
        }
        .policy-card {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .card-title {
          font-size: var(--font-size-sm);
          font-weight: 700;
        }
        .sub-txt {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
        }
        .add-shift-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background-color: var(--color-brand-light);
          color: var(--color-brand-primary);
          border: 1px solid #BAE6FD;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .template-table {
          width: 100%;
          border-collapse: collapse;
          font-size: var(--font-size-xs);
        }
        .template-table th, .template-table td {
          padding: 8px;
          border-bottom: 1px solid var(--color-border);
          text-align: left;
        }
        .next-tag {
          font-size: 10px;
          color: var(--color-warning);
          font-weight: 700;
          margin-left: 4px;
        }
        .active-tag {
          font-size: 10px;
          color: var(--color-success);
          background-color: var(--color-success-bg);
          padding: 2px 4px;
          border-radius: 2px;
        }
        .lock-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--color-danger);
          font-weight: 700;
        }
        .rule-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .rule-item {
          background-color: var(--color-bg-muted);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .rule-item.protected {
          border-left: 3px solid var(--color-danger);
        }
        .r-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: var(--font-size-xs);
        }
        .prot-pill {
          font-size: 10px;
          font-weight: 700;
          color: var(--color-danger);
          background-color: var(--color-danger-bg);
          padding: 1px 6px;
          border-radius: var(--radius-sm);
        }
        .conf-pill {
          font-size: 10px;
          color: var(--color-text-secondary);
        }
        .r-body {
          display: flex;
          flex-direction: column;
          font-size: 11px;
          gap: 2px;
        }
        .r-desc {
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
};
