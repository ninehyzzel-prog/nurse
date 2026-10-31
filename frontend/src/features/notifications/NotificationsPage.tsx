import React from 'react';
import { CheckCircle2, Calendar } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
        알림 센터
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'flex-start',
        }}>
          <Calendar size={20} color="var(--color-brand-primary)" />
          <div>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>2026년 11월 근무표 초안 공지</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              11월 정기 근무표 초안이 등록되었습니다. 자신의 일정을 검토하시기 바랍니다.
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>방금 전</div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'flex-start',
        }}>
          <CheckCircle2 size={20} color="var(--color-success)" />
          <div>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>11월 5일 연차 승인 안내</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              신청하신 법정 연차 휴가가 정상 승인되어 근무표에 반영되었습니다.
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>어제</div>
          </div>
        </div>
      </div>
    </div>
  );
};
