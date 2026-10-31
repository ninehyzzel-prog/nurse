import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Calendar, FilePlus2, ListChecks, Bell, Shield } from 'lucide-react';

export const MobileLayout: React.FC = () => {
  return (
    <div className="mobile-shell">
      <header className="mobile-header">
        <div className="brand">
          <span className="ward-badge">산부인과 병동</span>
          <h1 className="app-title">근무 스케줄</h1>
        </div>
        <Link to="/admin/roster/2026-11" className="switch-mode-btn" title="관리자 모드로 전환">
          <Shield size={16} />
          <span>관리자(PC)</span>
        </Link>
      </header>

      <main className="mobile-main">
        <Outlet />
      </main>

      <nav className="mobile-bottom-nav">
        <NavLink to="/me/schedule" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Calendar size={20} />
          <span>내 근무</span>
        </NavLink>
        <NavLink to="/me/requests/new" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <FilePlus2 size={20} />
          <span>오프 신청</span>
        </NavLink>
        <NavLink to="/me/requests" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ListChecks size={20} />
          <span>신청 내역</span>
        </NavLink>
        <NavLink to="/me/notifications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Bell size={20} />
          <span>알림</span>
        </NavLink>
      </nav>

      <style>{`
        .mobile-shell {
          max-width: 480px;
          margin: 0 auto;
          min-height: 100vh;
          background-color: var(--color-bg-surface);
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-md);
          position: relative;
        }
        .mobile-header {
          padding: var(--space-3) var(--space-4);
          background-color: var(--color-bg-surface);
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .ward-badge {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-brand-primary);
          background-color: var(--color-brand-light);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
        }
        .app-title {
          font-size: var(--font-size-base);
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .switch-mode-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: var(--font-size-xs);
          padding: 6px 10px;
          background-color: var(--color-bg-muted);
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
          font-weight: 600;
        }
        .switch-mode-btn:hover {
          background-color: var(--color-border);
        }
        .mobile-main {
          flex: 1;
          padding-bottom: 72px; /* Bottom nav height */
        }
        .mobile-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 480px;
          height: 64px;
          background-color: var(--color-bg-surface);
          border-top: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-around;
          z-index: 200;
        }
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-width: 44px;
          min-height: 44px;
          justify-content: center;
          color: var(--color-text-secondary);
          font-size: var(--font-size-xs);
          font-weight: 500;
        }
        .nav-item.active {
          color: var(--color-brand-primary);
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};
