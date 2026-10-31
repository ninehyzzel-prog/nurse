import React from 'react';
import { MOCK_STAFF } from '../../data/mockData';

export const FairnessPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{
        backgroundColor: 'var(--color-bg-surface)',
        padding: 'var(--space-4)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>병동 공정성 통계 및 누적 지표</h2>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            최근 3개월 확정 근무표 기반 직원별 실근로, 야간 시간, 주말 분배 및 희망 반영률을 분석합니다.
          </span>
        </div>
        <div style={{
          backgroundColor: 'var(--color-brand-light)',
          color: 'var(--color-brand-primary)',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 700,
          padding: '6px 12px',
          borderRadius: 'var(--radius-full)',
        }}>
          공정성 지수: 92.5점 (우수)
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 'var(--space-4)',
      }}>
        {/* 야간 근로시간 균등 분배 막대 차트 목업 */}
        <div style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
        }}>
          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
            간호사별 야간(Night) 근로시간 분배 현황
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {MOCK_STAFF.map((s, idx) => {
              const nightHours = s.canWorkNight ? 65 - (idx * 2) : 0;
              const pct = (nightHours / 70) * 100;
              return (
                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{s.name}</span>
                    <strong>{s.canWorkNight ? `${nightHours}시간` : '야간 제외'}</strong>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'var(--color-bg-muted)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: '#7C3AED' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 주말 완전 OFF 분배 현황 */}
        <div style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
        }}>
          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
            주말 완전 OFF (토·일 연속 휴식) 분배
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {MOCK_STAFF.map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: '12px' }}>
                <span>{s.name}</span>
                <span style={{ fontWeight: 700, color: 'var(--color-brand-primary)' }}>
                  월 2회 보장 (정상)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
