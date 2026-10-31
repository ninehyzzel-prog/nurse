import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { 
  CalendarRange, 
  FileEdit,
  Wand2, 
  Users, 
  BarChart3, 
  Settings,
  Search,
  Bell,
  ChevronDown,
  Smartphone
} from 'lucide-react';

export const AdminLayout: React.FC = () => {

  return (
    <div className="mothercare-shell">
      {/* Sidebar */}
      <aside className="mc-sidebar">
        <div className="sidebar-brand">
          <div className="tulip-logo">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#F43F5E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4c-2 2-3 5-3 8 0 3.3 2.7 6 6 6s6-2.7 6-6c0-3-1-6-3-8l-3 4-3-4z" fill="#FDA4AF" fillOpacity="0.4" />
              <path d="M12 18v4" />
              <path d="M9 22h6" />
            </svg>
          </div>
          <div className="brand-text">
            <h1 className="brand-name">마더케어</h1>
            <span className="brand-ward">산부인과 병동</span>
          </div>
        </div>

        <nav className="mc-nav">
          <NavLink to="/admin/roster/2026-11" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <CalendarRange size={17} />
            <span>근무표</span>
          </NavLink>
          <NavLink to="/admin/requests/2026-11" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <FileEdit size={17} />
            <span>근무 신청</span>
            <span className="nav-badge">1</span>
          </NavLink>
          <NavLink to="/admin/auto-schedule/2026-11" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <Wand2 size={17} />
            <span>근무 편성</span>
          </NavLink>
          <NavLink to="/admin/staff" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <Users size={17} />
            <span>인력 관리</span>
          </NavLink>
          <NavLink to="/admin/fairness" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <BarChart3 size={17} />
            <span>통계 및 분석</span>
          </NavLink>
          <NavLink to="/admin/policy" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <Settings size={17} />
            <span>설정</span>
          </NavLink>
        </nav>

        {/* Sidebar Footer Profile */}
        <div className="sidebar-profile">
          <div className="avatar-img-box">
            <img
              src="https://images.unsplash.com/photo-1594824813583-0974e64f899e?w=120&auto=format&fit=crop&q=80"
              alt="이은솔 간호사"
              className="avatar-img"
              onError={(e) => {
                // 대체 아바타
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="avatar-fallback">이</div>
          </div>
          <div className="profile-info">
            <span className="nurse-name">이은솔 간호사</span>
            <span className="nurse-sub">병동 간호사</span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="mc-body">
        {/* Top Header */}
        <header className="mc-topbar">
          <div className="topbar-search">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="간호사 검색, 근무 일정 검색..."
              className="search-input"
            />
          </div>

          <div className="topbar-right">
            <Link to="/me/schedule" className="mobile-toggle-btn" title="간호사 모바일 화면 보기">
              <Smartphone size={15} />
              <span>모바일 앱 뷰</span>
            </Link>

            <button className="icon-btn" aria-label="알림">
              <Bell size={18} />
              <span className="bell-dot" />
            </button>

            <div className="user-dropdown">
              <div className="user-mini-avatar">
                <img
                  src="https://images.unsplash.com/photo-1594824813583-0974e64f899e?w=80&auto=format&fit=crop&q=80"
                  alt="이은솔"
                  className="mini-img"
                />
              </div>
              <span className="user-label">이은솔</span>
              <ChevronDown size={14} className="chevron" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="mc-content">
          <Outlet />
        </main>
      </div>

      <style>{`
        .mothercare-shell {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background-color: var(--color-bg-app);
          font-family: var(--font-family-sans);
        }

        /* Sidebar */
        .mc-sidebar {
          width: 210px;
          min-width: 210px;
          background-color: var(--color-bg-surface);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          user-select: none;
        }

        .sidebar-brand {
          height: 60px;
          padding: 0 var(--space-4);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .tulip-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background-color: #FFF1F2;
          border-radius: var(--radius-md);
        }
        .brand-text {
          display: flex;
          flex-direction: column;
        }
        .brand-name {
          font-size: 15px;
          font-weight: 800;
          color: var(--color-text-primary);
          line-height: 1.2;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .brand-ward {
          font-size: 11px;
          color: var(--color-text-muted);
          line-height: 1;
        }

        /* Navigation */
        .mc-nav {
          padding: var(--space-2) var(--space-3);
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .nav-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          height: 38px;
          padding: 0 12px;
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
          font-size: 13px;
          font-weight: 600;
          transition: background-color 0.12s, color 0.12s;
        }
        .nav-btn:hover {
          background-color: #FFF5F7;
          color: var(--color-primary);
        }
        .nav-btn.active {
          background-color: #FFF1F2;
          color: var(--color-primary);
          font-weight: 700;
        }
        .nav-badge {
          margin-left: auto;
          background-color: var(--color-primary);
          color: #FFFFFF;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: var(--radius-full);
        }

        /* Profile at bottom of sidebar */
        .sidebar-profile {
          padding: var(--space-3) var(--space-4);
          border-top: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .avatar-img-box {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          overflow: hidden;
          background-color: #FECDD3;
          flex-shrink: 0;
          position: relative;
        }
        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .avatar-fallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: #BE123C;
        }
        .profile-info {
          display: flex;
          flex-direction: column;
        }
        .nurse-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text-primary);
          line-height: 1.2;
        }
        .nurse-sub {
          font-size: 11px;
          color: var(--color-text-muted);
        }

        /* Body & Topbar */
        .mc-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }
        .mc-topbar {
          height: 54px;
          background-color: var(--color-bg-surface);
          border-bottom: 1px solid var(--color-border);
          padding: 0 var(--space-5);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .topbar-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          padding: 0 12px;
          border-radius: var(--radius-full);
          height: 32px;
          width: 260px;
        }
        .search-icon {
          color: var(--color-text-muted);
        }
        .search-input {
          border: none;
          background: none;
          font-size: 12px;
          outline: none;
          width: 100%;
          color: var(--color-text-primary);
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .mobile-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 28px;
          padding: 0 10px;
          background-color: #FFF1F2;
          border: 1px solid #FECDD3;
          border-radius: var(--radius-full);
          color: var(--color-primary);
          font-size: 11px;
          font-weight: 700;
          transition: background-color 0.12s;
        }
        .mobile-toggle-btn:hover {
          background-color: #FFE4E6;
        }
        .icon-btn {
          position: relative;
          color: var(--color-text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
        }
        .icon-btn:hover {
          background-color: #F1F5F9;
        }
        .bell-dot {
          position: absolute;
          top: 5px;
          right: 6px;
          width: 6px;
          height: 6px;
          background-color: var(--color-primary);
          border-radius: var(--radius-full);
        }

        .user-dropdown {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 3px 6px;
          border-radius: var(--radius-full);
        }
        .user-dropdown:hover {
          background-color: #F8FAFC;
        }
        .user-mini-avatar {
          width: 26px;
          height: 26px;
          border-radius: var(--radius-full);
          overflow: hidden;
          background-color: #FECDD3;
        }
        .mini-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .user-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .chevron {
          color: var(--color-text-muted);
        }

        .mc-content {
          flex: 1;
          padding: var(--space-4);
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
};
