import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { 
  CalendarRange, 
  GitPullRequestDraft, 
  Wand2, 
  Users, 
  Sliders, 
  BarChart3, 
  Smartphone,
  Hospital
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <Hospital className="brand-icon" size={24} />
          <div>
            <h2 className="brand-title">산부인과 병동</h2>
            <span className="brand-sub">근무표 관리 콘솔</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-label">편성 업무</div>
          <NavLink to="/admin/roster/2026-11" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <CalendarRange size={18} />
            <span>전체 근무표</span>
          </NavLink>
          <NavLink to="/admin/requests/2026-11" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <GitPullRequestDraft size={18} />
            <span>오프 충돌 해결</span>
            <span className="badge-count">2</span>
          </NavLink>
          <NavLink to="/admin/auto-schedule/2026-11" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <Wand2 size={18} />
            <span>자동 편성 엔진</span>
          </NavLink>

          <div className="nav-group-label">설정 및 분석</div>
          <NavLink to="/admin/staff" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <Users size={18} />
            <span>인력 관리</span>
          </NavLink>
          <NavLink to="/admin/policy" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <Sliders size={18} />
            <span>근무 정책 & 점수</span>
          </NavLink>
          <NavLink to="/admin/fairness" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <BarChart3 size={18} />
            <span>공정성 통계</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <Link to="/me/schedule" className="switch-mobile-link">
            <Smartphone size={16} />
            <span>간호사 모바일 뷰 체험</span>
          </Link>
        </div>
      </aside>

      <div className="admin-body">
        <header className="admin-topbar">
          <div className="period-indicator">
            <span className="status-dot published" />
            <span className="period-text">2026년 11월 근무표 (편성 중)</span>
          </div>
          <div className="topbar-user">
            <span className="user-role">수간호사 (작성자)</span>
            <span className="user-name">박수간호사</span>
          </div>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>

      <style>{`
        .admin-shell {
          display: flex;
          min-height: 100vh;
          background-color: var(--color-bg-app);
        }
        .admin-sidebar {
          width: 240px;
          background-color: var(--color-bg-surface);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }
        .sidebar-brand {
          padding: var(--space-5) var(--space-4);
          display: flex;
          align-items: center;
          gap: var(--space-3);
          border-bottom: 1px solid var(--color-border);
        }
        .brand-icon {
          color: var(--color-brand-primary);
        }
        .brand-title {
          font-size: var(--font-size-base);
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .brand-sub {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
        }
        .sidebar-nav {
          padding: var(--space-4) var(--space-2);
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }
        .nav-group-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--color-text-muted);
          padding: var(--space-3) var(--space-3) var(--space-1);
        }
        .side-link {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: 10px var(--space-3);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
          font-weight: 500;
          transition: background-color 0.15s, color 0.15s;
        }
        .side-link:hover {
          background-color: var(--color-bg-muted);
          color: var(--color-text-primary);
        }
        .side-link.active {
          background-color: var(--color-brand-light);
          color: var(--color-brand-primary);
          font-weight: 700;
        }
        .badge-count {
          margin-left: auto;
          background-color: var(--color-warning);
          color: white;
          font-size: 11px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: var(--radius-full);
        }
        .sidebar-footer {
          padding: var(--space-4);
          border-top: 1px solid var(--color-border);
        }
        .switch-mobile-link {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          background-color: var(--color-bg-muted);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-size: var(--font-size-xs);
          font-weight: 600;
        }
        .switch-mobile-link:hover {
          background-color: var(--color-border);
        }
        .admin-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0; /* Important for horizontal scrolling table */
        }
        .admin-topbar {
          height: 60px;
          background-color: var(--color-bg-surface);
          border-bottom: 1px solid var(--color-border);
          padding: 0 var(--space-6);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .period-indicator {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--font-size-sm);
          font-weight: 600;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: var(--radius-full);
        }
        .status-dot.published {
          background-color: var(--color-success);
        }
        .topbar-user {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--font-size-sm);
        }
        .user-role {
          color: var(--color-text-secondary);
        }
        .user-name {
          font-weight: 700;
        }
        .admin-main {
          flex: 1;
          padding: var(--space-6);
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
};
