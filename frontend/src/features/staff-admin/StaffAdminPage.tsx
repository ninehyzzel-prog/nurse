import React, { useState } from 'react';
import { MOCK_STAFF } from '../../data/mockData';
import type { Staff } from '../../types';
import { 
  UserPlus, 
  Upload, 
  ShieldAlert, 
  Check, 
  X
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
    <div className="staff-container">
      <div className="staff-header">
        <div>
          <h2 className="title">병동 인력 및 자격 관리</h2>
          <span className="desc">
            간호사별 고용 형태, 목표 근로시간, 야간 가능 여부 및 필수 역량 태그를 관리합니다.
          </span>
        </div>

        <div className="btn-group">
          <button className="btn-csv" title="CSV 일괄 등록">
            <Upload size={16} />
            <span>CSV 일괄 가져오기</span>
          </button>
          <button className="btn-add" onClick={() => setShowWizard(true)}>
            <UserPlus size={16} />
            <span>신규 직원 등록 마법사</span>
          </button>
        </div>
      </div>

      {/* 개인정보 보호 안내 */}
      <div className="privacy-alert">
        <ShieldAlert size={18} color="var(--color-brand-primary)" />
        <span>
          <strong>개인정보 최소 수집 원칙 준수:</strong> 본 시스템은 주민등록번호, 민감한 개인 건강정보, 환자 정보를 일체 수집·저장하지 않습니다. 사번 대체 식별자를 사용합니다.
        </span>
      </div>

      {/* 직원 테이블 */}
      <div className="table-card">
        <table className="staff-table">
          <thead>
            <tr>
              <th>식별코드</th>
              <th>성명</th>
              <th>고용 형태</th>
              <th>월 목표 근로시간</th>
              <th>야간 근무</th>
              <th>보유 역량 태그</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((s) => (
              <tr key={s.id}>
                <td><code>{s.staffCode}</code></td>
                <td><strong>{s.name}</strong></td>
                <td>
                  <span className="type-pill">
                    {s.employmentType === 'FULL_TIME'
                      ? '정규 상근'
                      : s.employmentType === 'SHIFT'
                      ? '교대 근무'
                      : '단시간 근무'}
                  </span>
                </td>
                <td>{s.targetWorkMinutes / 60}시간 ({s.targetWorkMinutes}분)</td>
                <td>
                  {s.canWorkNight ? (
                    <span className="night-yes">✓ 야간 가능</span>
                  ) : (
                    <span className="night-no">✕ 야간 제외</span>
                  )}
                </td>
                <td>
                  <div className="tag-list">
                    {s.skillTags.length === 0 && <span className="no-tag">-</span>}
                    {s.skillTags.map((tag) => (
                      <span key={tag} className="tag-chip">
                        {tag === 'CHARGE_CAPABLE' ? '책임간호사' : tag === 'DELIVERY_ROOM' ? '분만실대응' : '신규간호사'}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className="status-active">재직 중</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4단계 등록 마법사 모달 */}
      {showWizard && (
        <div className="modal-overlay" onClick={() => setShowWizard(false)}>
          <div className="wizard-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>간호사 등록 마법사 (단계 {wizardStep} / 4)</h3>
              <button className="close-btn" onClick={() => setShowWizard(false)}><X size={20} /></button>
            </div>

            <div className="wizard-body">
              {wizardStep === 1 && (
                <div className="wizard-step">
                  <h4>1단계: 기본 정보 입력</h4>
                  <div className="field">
                    <label>표시 이름 (가명/직급 권장):</label>
                    <input
                      type="text"
                      placeholder="예: 최간호사"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>사번 대체 식별자:</label>
                    <input
                      type="text"
                      placeholder="예: RN-007"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="wizard-step">
                  <h4>2단계: 근무 형태 및 근로시간</h4>
                  <div className="field">
                    <label>고용 형태:</label>
                    <select value={newType} onChange={(e) => setNewType(e.target.value as any)}>
                      <option value="FULL_TIME">정규 교대근무 (월 160시간)</option>
                      <option value="PART_TIME">단시간 근무 (월 80시간)</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="chk-label">
                      <input
                        type="checkbox"
                        checked={canNight}
                        onChange={(e) => setCanNight(e.target.checked)}
                      />
                      <span>야간(Night) 근무 배정 가능 여부</span>
                    </label>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="wizard-step">
                  <h4>3단계: 자격 및 필수 역량 태그</h4>
                  <div className="skill-selector">
                    {['CHARGE_CAPABLE', 'DELIVERY_ROOM', 'NEW_GRAD'].map((t) => (
                      <label key={t} className="skill-chk">
                        <input
                          type="checkbox"
                          checked={skills.includes(t)}
                          onChange={() => toggleSkill(t)}
                        />
                        <span>{t === 'CHARGE_CAPABLE' ? '책임간호사 가능' : t === 'DELIVERY_ROOM' ? '분만실 대응' : '신규 교육 대상'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="wizard-step">
                  <h4>4단계: 입력 내용 최종 확인</h4>
                  <div className="confirm-box">
                    <div>성명: <strong>{newName}</strong> ({newCode})</div>
                    <div>형태: <strong>{newType}</strong>, 야간 가능: <strong>{canNight ? '예' : '아니오'}</strong></div>
                    <div>보유 역량: <strong>{skills.join(', ') || '없음'}</strong></div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {wizardStep > 1 && (
                <button className="btn-prev" onClick={() => setWizardStep(wizardStep - 1)}>
                  이전
                </button>
              )}
              {wizardStep < 4 ? (
                <button
                  className="btn-next"
                  onClick={() => setWizardStep(wizardStep + 1)}
                  disabled={wizardStep === 1 && !newName}
                >
                  다음 단계
                </button>
              ) : (
                <button className="btn-complete" onClick={handleAddStaff}>
                  <Check size={16} /> 등록 완료
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .staff-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .staff-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--color-bg-surface);
          padding: var(--space-4);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        .title {
          font-size: var(--font-size-base);
          font-weight: 700;
        }
        .desc {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
        }
        .btn-group {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .btn-csv {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background-color: var(--color-bg-muted);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-weight: 600;
          cursor: pointer;
        }
        .btn-add {
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
        .privacy-alert {
          background-color: var(--color-brand-light);
          border: 1px solid #BAE6FD;
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-4);
          display: flex;
          align-items: center;
          gap: var(--space-3);
          font-size: var(--font-size-xs);
          color: #0369A1;
        }
        .table-card {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .staff-table {
          width: 100%;
          border-collapse: collapse;
          font-size: var(--font-size-xs);
        }
        .staff-table th, .staff-table td {
          padding: 10px 14px;
          border-bottom: 1px solid var(--color-border);
          text-align: left;
        }
        .staff-table th {
          background-color: var(--color-bg-muted);
          font-weight: 700;
          color: var(--color-text-secondary);
        }
        .type-pill {
          background-color: var(--color-bg-muted);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          font-size: 11px;
        }
        .night-yes { color: var(--color-success); font-weight: 600; }
        .night-no { color: var(--color-text-muted); }
        .tag-list { display: flex; gap: 4px; }
        .tag-chip {
          background-color: #FEF3C7;
          color: #B45309;
          padding: 2px 6px;
          border-radius: 2px;
          font-size: 10px;
          font-weight: 700;
        }
        .no-tag { color: var(--color-text-muted); }
        .status-active {
          color: var(--color-success);
          font-weight: 600;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(2px);
        }
        .wizard-modal {
          background: white;
          width: 480px;
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          box-shadow: var(--shadow-lg);
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: var(--space-2);
          margin-bottom: var(--space-3);
        }
        .close-btn { background: none; border: none; cursor: pointer; }
        .wizard-step {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .field input, .field select {
          padding: 8px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
        }
        .skill-selector {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .skill-chk {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--font-size-sm);
        }
        .confirm-box {
          background-color: var(--color-bg-muted);
          padding: var(--space-3);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-2);
          margin-top: var(--space-4);
          padding-top: var(--space-3);
          border-top: 1px solid var(--color-border);
        }
        .btn-prev {
          padding: 6px 12px;
          background: var(--color-bg-muted);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
        }
        .btn-next, .btn-complete {
          padding: 6px 16px;
          background: var(--color-brand-primary);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          font-weight: 700;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};
