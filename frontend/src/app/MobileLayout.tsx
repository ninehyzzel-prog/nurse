import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Calendar, FilePlus2, ListChecks, Bell, Shield } from 'lucide-react';

export const MobileLayout: React.FC = () => {
  return (
    <div className="mobile-shell">
      <header className="mobile-header">
        <div className="header-left">
          <span className="ward-pill">산부인과</span>
          <h1 className="header-title">근무 스케줄</h1>
        </div>
        <Link to="/admin/roster/2026-11" className="switch-desktop-btn" title="관리자 콘솔로 전환">
          <Shield size={13} strokeWidth={2.2} />
          <span>관리자</span>
        </Link>
      </header>

      <main className="mobile-main">
        <Outlet />
      </main>

      <nav className="mobile-bottom-nav">
        <NavLink to="/me/schedule" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
          <Calendar size={18} strokeWidth={2} />
          <span>내 근무</span>
        </NavLink>
        <NavLink to="/me/requests/new" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
          <FilePlus2 size={18} strokeWidth={2} />
          <span>오프 신청</span>
        </NavLink>
        <NavLink to="/me/requests" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
          <ListChecks size={18} strokeWidth={2} />
          <span>신청 내역</span>
        </NavLink>
        <NavLink to="/me/notifications" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
          <Bell size={18} strokeWidth={2} />
          <span>알림</span>
        </NavLink>
      </nav>

      <style>{`
        .mobile-shell {
          max-width: 440px;
          margin: 0 auto;
          min-height: 100vh;
          background-color: var(--color-bg-surface);
          border-left: 1px solid var(--color-border);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .mobile-header {
          height: 48px;
          padding: 0 var(--space-4);
          background-color: var(--color-bg-surface);
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ward-pill {
          font-size: 10px;
          font-weight: 600;
          color: #2563EB;
          background-color: #EFF6FF;
          border: 1px solid #BFDBFE;
          padding: 1px 5px;
          border-radius: var(--radius-xs);
          line-height: 1.2;
        }
        .header-title {
          font-size: var(--text-sm);
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }
        .switch-desktop-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 26px;
          padding: 0 8px;
          background-color: var(--color-bg-subtle);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
          font-size: 11px;
          font-weight: 600;
          transition: background-color 0.12s;
        }
        .switch-desktop-btn:hover {
          background-color: var(--color-bg-muted);
          color: var(--color-text-primary);
        }
        .mobile-main {
          flex: 1;
          padding-bottom: 64px; /* Bottom nav height */
        }
        .mobile-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 440px;
          height: 56px;
          background-color: var(--color-bg-surface);
          border-top: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-around;
          z-index: 200;
        }
        .m-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          min-width: 56px;
          height: 44px;
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 500;
          transition: color 0.12s;
        }
        .m-nav-item:hover {
          color: var(--color-text-primary);
        }
        .m-nav-item.active {
          color: var(--color-primary);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};
