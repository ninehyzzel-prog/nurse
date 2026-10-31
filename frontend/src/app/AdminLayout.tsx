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
      {/* Linear-Style Compact Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon-box">
            <Hospital size={16} strokeWidth={2.2} />
          </div>
          <div className="brand-text-box">
            <h1 className="brand-title">산부인과 병동</h1>
            <span className="brand-sub">근무 스케줄러 v1.0</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">편성 업무</div>
          <NavLink to="/admin/roster/2026-11" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <CalendarRange size={15} strokeWidth={1.9} />
            <span className="nav-text">전체 근무표</span>
          </NavLink>
          <NavLink to="/admin/requests/2026-11" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <GitPullRequestDraft size={15} strokeWidth={1.9} />
            <span className="nav-text">오프 충돌 해결</span>
            <span className="nav-counter">2</span>
          </NavLink>
          <NavLink to="/admin/auto-schedule/2026-11" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Wand2 size={15} strokeWidth={1.9} />
            <span className="nav-text">자동 편성 엔진</span>
          </NavLink>

          <div className="nav-section-label">설정 & 분석</div>
          <NavLink to="/admin/staff" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users size={15} strokeWidth={1.9} />
            <span className="nav-text">인력 관리</span>
          </NavLink>
          <NavLink to="/admin/policy" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Sliders size={15} strokeWidth={1.9} />
            <span className="nav-text">정책 & 점수 규칙</span>
          </NavLink>
          <NavLink to="/admin/fairness" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <BarChart3 size={15} strokeWidth={1.9} />
            <span className="nav-text">공정성 통계</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <Link to="/me/schedule" className="mobile-preview-link">
            <Smartphone size={14} />
            <span>간호사 모바일 뷰 체험</span>
          </Link>
        </div>
      </aside>

      {/* Main Workspace Body */}
      <div className="admin-body">
        <header className="admin-topbar">
          <div className="topbar-left">
            <div className="period-pill">
              <span className="period-dot" />
              <span className="period-label">2026년 11월 근무표</span>
              <span className="period-status">편성 및 검토</span>
            </div>
          </div>
          <div className="topbar-right">
            <div className="user-profile">
              <span className="user-role-badge">수간호사</span>
              <span className="user-name">박책임</span>
            </div>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>

      <style>{`
        .admin-shell {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background-color: var(--color-bg-app);
        }
        
        /* Sidebar Styling (Linear-inspired) */
        .admin-sidebar {
          width: 220px;
          min-width: 220px;
          background-color: var(--color-bg-surface);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          user-select: none;
        }
        .sidebar-brand {
          height: 48px;
          padding: 0 var(--space-3);
          display: flex;
          align-items: center;
          gap: var(--space-2);
          border-bottom: 1px solid var(--color-border);
        }
        .brand-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          background-color: #0F172A;
          color: #FFFFFF;
          border-radius: var(--radius-sm);
        }
        .brand-text-box {
          display: flex;
          flex-direction: column;
        }
        .brand-title {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-text-primary);
          line-height: 1.2;
          margin: 0;
        }
        .brand-sub {
          font-size: 10px;
          color: var(--color-text-muted);
          line-height: 1;
        }
        
        .sidebar-nav {
          padding: var(--space-2) var(--space-2);
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          overflow-y: auto;
        }
        .nav-section-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--color-text-subtle);
          padding: var(--space-3) var(--space-2) 4px;
          letter-spacing: -0.01em;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          height: 30px;
          padding: 0 var(--space-2);
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          font-weight: 500;
          transition: background-color 0.12s ease, color 0.12s ease;
        }
        .nav-item:hover {
          background-color: var(--color-bg-subtle);
          color: var(--color-text-primary);
        }
        .nav-item.active {
          background-color: var(--color-bg-subtle);
          color: var(--color-text-primary);
          font-weight: 600;
        }
        .nav-text {
          flex: 1;
        }
        .nav-counter {
          font-size: 10px;
          font-weight: 600;
          padding: 1px 5px;
          border-radius: var(--radius-full);
          background-color: #FEF3C7;
          color: #B45309;
          line-height: 1;
        }
        
        .sidebar-footer {
          padding: var(--space-2-5);
          border-top: 1px solid var(--color-border);
        }
        .mobile-preview-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 28px;
          background-color: var(--color-bg-subtle);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
          font-size: 11px;
          font-weight: 500;
          transition: background-color 0.12s, border-color 0.12s;
        }
        .mobile-preview-link:hover {
          background-color: var(--color-bg-muted);
          border-color: var(--color-border-strong);
          color: var(--color-text-primary);
        }

        /* Topbar Styling (Clean & Precise) */
        .admin-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }
        .admin-topbar {
          height: 48px;
          background-color: var(--color-bg-surface);
          border-bottom: 1px solid var(--color-border);
          padding: 0 var(--space-4);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .period-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 24px;
          padding: 0 8px;
          background-color: var(--color-bg-subtle);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-size: 12px;
        }
        .period-dot {
          width: 6px;
          height: 6px;
          border-radius: var(--radius-full);
          background-color: #10B981;
        }
        .period-label {
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .period-status {
          font-size: 11px;
          color: var(--color-text-muted);
          padding-left: 4px;
          border-left: 1px solid var(--color-border);
        }
        
        .user-profile {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }
        .user-role-badge {
          background-color: #F1F5F9;
          color: #475569;
          padding: 1px 5px;
          border-radius: var(--radius-xs);
          font-size: 11px;
          font-weight: 500;
        }
        .user-name {
          font-weight: 600;
          color: var(--color-text-primary);
        }
        
        .admin-content {
          flex: 1;
          padding: var(--space-4);
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
};
