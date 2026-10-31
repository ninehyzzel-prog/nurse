import React, { useState } from 'react';
import { MOCK_STAFF } from '../../data/mockData';
import type { Staff } from '../../types';
import { 
  UserPlus, 
  Upload, 
  X,
  Users
} from 'lucide-react';

export const StaffAdminPage: React.FC = () => {
  const [staffList, setStaffList] = useState<Staff[]>(MOCK_STAFF);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // 마법사 입력 상태
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<'FULL_TIME' | 'SHIFT' | 'PART_TIME'>('FULL_TIME');
  const [canNight, setCanNight] = useState(true);
  const [skills, setSkills] = useState<string[]>([]);

  const toggleSkill = (tag: string) => {
    if (skills.includes(tag)) setSkills(skills.filter((s) => s !== tag));
    else setSkills([...skills, tag]);
  };

  const handleAddStaff = () => {
    if (!newName) return;
    const newStaff: Staff = {
      id: `staff-${staffList.length + 1}`,
      name: newName,
      staffCode: newCode || `RN-00${staffList.length + 1}`,
      role: 'NURSE',
      employmentType: newType,
      targetWorkMinutes: newType === 'PART_TIME' ? 4800 : 9600,
      canWorkNight: canNight,
      skillTags: skills,
      activeStatus: 'ACTIVE',
    };
    setStaffList([...staffList, newStaff]);
    setShowWizard(false);
    setWizardStep(1);
    setNewName('');
    setNewCode('');
  };

  return (
    <div className="staff-view">
      {/* Page Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">병동 인력 및 자격 관리</h2>
          <span className="view-desc">
            간호사별 고용 형태, 목표 근로시간, 야간 가능 여부 및 필수 역량 태그를 관리합니다.
          </span>
        </div>

        <div className="header-actions">
          <button className="btn-secondary" title="CSV 일괄 등록">
            <Upload size={13} />
            <span>CSV 일괄 등록</span>
          </button>
          <button className="btn-primary" onClick={() => setShowWizard(true)}>
            <UserPlus size={13} />
            <span>신규 간호사 등록</span>
          </button>
        </div>
      </div>

      {/* Staff Table Panel */}
      <div className="table-panel">
        <div className="panel-toolbar">
          <div className="toolbar-info">
            <Users size={14} />
            <span className="info-title">등록 간호사 목록 (총 {staffList.length}명)</span>
          </div>
          <span className="info-desc">산부인과 병동 정규/교대/단시간 배정 대상</span>
        </div>

        <div className="table-scroll">
          <table className="staff-table">
            <thead>
              <tr>
                <th>사번</th>
                <th>성명</th>
                <th>직무</th>
                <th>고용 형태</th>
                <th>목표 근로시간</th>
                <th>야간 근무</th>
                <th>보유 역량 태그</th>
                <th>재직 상태</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono text-muted">{s.staffCode}</td>
                  <td className="font-semibold">{s.name}</td>
                  <td>{s.skillTags.includes('CHARGE_CAPABLE') ? '책임간호사' : '일반간호사'}</td>
                  <td>
                    <span className="type-badge">
                      {s.employmentType === 'FULL_TIME' && '상근정규'}
                      {s.employmentType === 'SHIFT' && '교대정규'}
                      {s.employmentType === 'PART_TIME' && '단시간 (시간제)'}
                    </span>
                  </td>
                  <td className="font-mono">
                    {Math.round(s.targetWorkMinutes / 60)}시간 / 월
                  </td>
                  <td>
                    {s.canWorkNight ? (
                      <span className="night-badge ok">야간 가능</span>
                    ) : (
                      <span className="night-badge exempt">야간 면제 (임산부/단시간)</span>
                    )}
                  </td>
                  <td>
                    <div className="tag-list">
                      {s.skillTags.map((tag) => (
                        <span key={tag} className={`skill-pill ${tag.toLowerCase()}`}>
                          {tag === 'CHARGE_CAPABLE' && '책임간호'}
                          {tag === 'DELIVERY_ROOM' && '분만실숙련'}
                          {tag === 'NEW_GRAD' && '신규(수련)'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className="active-dot">● 재직중</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4-Step Registration Modal */}
      {showWizard && (
        <div className="modal-overlay" onClick={() => setShowWizard(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">신규 간호사 등록 마법사</span>
              <button className="modal-close" onClick={() => setShowWizard(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Stepper Strip */}
            <div className="stepper-strip">
              <div className={`step-node ${wizardStep >= 1 ? 'active' : ''}`}>1. 기본정보</div>
              <div className="step-arrow">→</div>
              <div className={`step-node ${wizardStep >= 2 ? 'active' : ''}`}>2. 고용형태</div>
              <div className="step-arrow">→</div>
              <div className={`step-node ${wizardStep >= 3 ? 'active' : ''}`}>3. 야간가능여부</div>
              <div className="step-arrow">→</div>
              <div className={`step-node ${wizardStep >= 4 ? 'active' : ''}`}>4. 역량태그</div>
            </div>

            {/* Step Body */}
            <div className="modal-body">
              {wizardStep === 1 && (
                <div className="step-content">
                  <div className="form-group">
                    <label>간호사 성명 *</label>
                    <input
                      type="text"
                      placeholder="예: 최간호사"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>원내 사번</label>
                    <input
                      type="text"
                      placeholder="예: RN-007"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="step-content">
                  <label className="form-label">고용 형태 및 목표 근로시간</label>
                  <div className="option-grid">
                    <label className={`option-card ${newType === 'FULL_TIME' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="empType"
                        checked={newType === 'FULL_TIME'}
                        onChange={() => setNewType('FULL_TIME')}
                      />
                      <div>
                        <strong>전일제 정규직</strong>
                        <p>월 160시간 기준</p>
                      </div>
                    </label>
                    <label className={`option-card ${newType === 'SHIFT' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="empType"
                        checked={newType === 'SHIFT'}
                        onChange={() => setNewType('SHIFT')}
                      />
                      <div>
                        <strong>교대제 정규직</strong>
                        <p>월 160시간 (D/N 교대)</p>
                      </div>
                    </label>
                    <label className={`option-card ${newType === 'PART_TIME' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="empType"
                        checked={newType === 'PART_TIME'}
                        onChange={() => setNewType('PART_TIME')}
                      />
                      <div>
                        <strong>단시간 근로 (시간제)</strong>
                        <p>월 80시간 (주 20시간 상한)</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="step-content">
                  <label className="form-label">야간(Night) 근무 배정 가능 여부</label>
                  <p className="form-hint">
                    임산부, 수유부, 육아기 단시간 근로자 및 의학적 면제자는 legal_floor 원칙에 의해 야간 근무가 법적으로 차단됩니다.
                  </p>
                  <div className="toggle-box">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={canNight}
                        onChange={(e) => setCanNight(e.target.checked)}
                      />
                      <span>야간 근무(NIGHT) 배정 가능</span>
                    </label>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="step-content">
                  <label className="form-label">보유 필수 역량 태그 선택</label>
                  <div className="skill-grid">
                    <label className={`skill-select-card ${skills.includes('CHARGE_CAPABLE') ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={skills.includes('CHARGE_CAPABLE')}
                        onChange={() => toggleSkill('CHARGE_CAPABLE')}
                      />
                      <span>책임간호 (Charge Capable)</span>
                    </label>
                    <label className={`skill-select-card ${skills.includes('DELIVERY_ROOM') ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={skills.includes('DELIVERY_ROOM')}
                        onChange={() => toggleSkill('DELIVERY_ROOM')}
                      />
                      <span>분만실 분만대응 (Delivery Room)</span>
                    </label>
                    <label className={`skill-select-card ${skills.includes('NEW_GRAD') ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={skills.includes('NEW_GRAD')}
                        onChange={() => toggleSkill('NEW_GRAD')}
                      />
                      <span>신규/수련 (단독 Night 배정 지양)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="modal-foot">
              {wizardStep > 1 && (
                <button className="btn-secondary" onClick={() => setWizardStep(wizardStep - 1)}>
                  이전
                </button>
              )}
              {wizardStep < 4 ? (
                <button className="btn-primary ml-auto" onClick={() => setWizardStep(wizardStep + 1)}>
                  다음 단계
                </button>
              ) : (
                <button className="btn-primary ml-auto" onClick={handleAddStaff}>
                  간호사 등록 완료
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .staff-view {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .view-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .view-title {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }
        .view-desc {
          font-size: var(--text-xs);
          color: var(--color-text-muted);
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 28px;
          padding: 0 10px;
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 500;
          color: var(--color-text-secondary);
        }
        .btn-secondary:hover {
          background-color: var(--color-bg-subtle);
          color: var(--color-text-primary);
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 28px;
          padding: 0 10px;
          background-color: var(--color-primary);
          color: var(--color-primary-text);
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 600;
        }
        .btn-primary:hover {
          background-color: var(--color-primary-hover);
        }

        /* Table Panel */
        .table-panel {
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
        .toolbar-info {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .info-desc {
          font-size: 12px;
          color: var(--color-text-muted);
        }

        .table-scroll {
          overflow-x: auto;
        }
        .staff-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .staff-table th {
          background-color: #FAFAFA;
          padding: 7px 12px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
          color: var(--color-text-secondary);
          border-bottom: 1px solid var(--color-border);
        }
        .staff-table td {
          padding: 8px 12px;
          border-bottom: 1px solid var(--color-border-subtle);
          color: var(--color-text-primary);
        }
        .staff-table tr:hover td {
          background-color: #FAFAFA;
        }

        .font-mono {
          font-feature-settings: "tnum";
          font-size: 12px;
        }
        .font-semibold {
          font-weight: 600;
        }
        .text-muted {
          color: var(--color-text-muted);
        }
        .type-badge {
          font-size: 12px;
          color: var(--color-text-secondary);
        }
        .night-badge {
          font-size: 12px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 3px;
        }
        .night-badge.ok {
          background-color: #ECFDF5;
          color: #047857;
        }
        .night-badge.exempt {
          background-color: #FEF2F2;
          color: #B91C1C;
        }

        .tag-list {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .skill-pill {
          font-size: 12px;
          padding: 1px 5px;
          border-radius: 3px;
          font-weight: 600;
        }
        .skill-pill.charge_capable { background-color: #EEF2FF; color: #4338CA; }
        .skill-pill.delivery_room { background-color: #ECFDF5; color: #047857; }
        .skill-pill.new_grad { background-color: #FEF3C7; color: #B45309; }
        .active-dot {
          font-size: 12px;
          color: #15803D;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(15, 23, 42, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(2px);
        }
        .modal-card {
          width: 100%;
          max-width: 460px;
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-md);
          overflow: hidden;
        }
        .modal-head {
          height: 40px;
          padding: 0 var(--space-4);
          background-color: var(--color-bg-subtle);
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .modal-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .modal-close {
          color: var(--color-text-muted);
        }

        .stepper-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px var(--space-4);
          background-color: #FAFAFA;
          border-bottom: 1px solid var(--color-border-subtle);
          font-size: 12px;
        }
        .step-node {
          color: var(--color-text-muted);
        }
        .step-node.active {
          color: var(--color-primary);
          font-weight: 600;
        }
        .step-arrow {
          color: var(--color-text-subtle);
        }

        .modal-body {
          padding: var(--space-4);
        }
        .step-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-group label, .form-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        .form-hint {
          font-size: 12px;
          color: var(--color-text-muted);
          line-height: 1.4;
          margin: 0;
        }
        .form-input {
          height: 32px;
          padding: 0 var(--space-2-5);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: 12px;
        }
        .form-input:focus {
          border-color: #2563EB;
          outline: none;
        }

        .option-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .option-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
        }
        .option-card.selected {
          border-color: #2563EB;
          background-color: #EFF6FF;
        }
        .option-card strong {
          display: block;
          font-size: 12px;
        }
        .option-card p {
          font-size: 12px;
          color: var(--color-text-muted);
          margin: 0;
        }

        .toggle-box {
          padding: 10px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .skill-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .skill-select-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: 12px;
          cursor: pointer;
        }
        .skill-select-card.checked {
          border-color: #2563EB;
          background-color: #EFF6FF;
        }

        .modal-foot {
          padding: var(--space-3) var(--space-4);
          background-color: var(--color-bg-subtle);
          border-top: 1px solid var(--color-border);
          display: flex;
          align-items: center;
        }
        .ml-auto {
          margin-left: auto;
        }
      `}</style>
    </div>
  );
};
