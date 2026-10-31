import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard,
  CalendarDays, 
  ClipboardList,
  Wand2, 
  Users, 
  BarChart3, 
  Settings,
  Search,
  Bell,
  ChevronDown,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  return (
    <div className="mothercare-shell">
      {/* Sidebar */}
      <aside className="mc-sidebar">
        <div className="sidebar-brand">
          <div className="tulip-logo">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#F43F5E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3c-2.5 2.5-4 6-4 9.5 0 4.1 3.4 7.5 7.5 7.5s7.5-3.4 7.5-7.5c0-3.5-1.5-7-4-9.5l-3.5 4.5L12 3z" fill="#FDA4AF" fillOpacity="0.5" />
              <path d="M12 20v2" />
              <path d="M9 22h6" />
            </svg>
          </div>
          <div className="brand-text">
            <h1 className="brand-name">마더케어</h1>
            <span className="brand-ward">산부인과 병동</span>
          </div>
        </div>

        <nav className="mc-nav">
          <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} strokeWidth={1.9} />
            <span>대시보드</span>
          </NavLink>
          <NavLink to="/admin/roster/2026-11" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <CalendarDays size={18} strokeWidth={1.9} />
            <span>근무표</span>
          </NavLink>
          <NavLink to="/admin/requests/2026-11" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <ClipboardList size={18} strokeWidth={1.9} />
            <span>근무 신청</span>
          </NavLink>
          <NavLink to="/admin/auto-schedule/2026-11" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <Wand2 size={18} strokeWidth={1.9} />
            <span>근무 편성</span>
          </NavLink>
          <NavLink to="/admin/staff" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <Users size={18} strokeWidth={1.9} />
            <span>인력 관리</span>
          </NavLink>
          <NavLink to="/admin/fairness" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <BarChart3 size={18} strokeWidth={1.9} />
            <span>통계 및 분석</span>
          </NavLink>
          <NavLink to="/admin/policy" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <Settings size={18} strokeWidth={1.9} />
            <span>설정</span>
          </NavLink>
        </nav>

        {/* Sidebar Footer Profile */}
        <div className="sidebar-profile">
          <div className="avatar-img-box">
            <div className="avatar-profile-pill">이</div>
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
          <div className="topbar-left" />

          <div className="topbar-right">
            <button className="icon-btn" aria-label="검색">
              <Search size={18} strokeWidth={2} />
            </button>

            <button className="icon-btn" aria-label="알림">
              <Bell size={18} strokeWidth={2} />
              <span className="bell-dot" />
            </button>

            <div className="user-dropdown">
              <div className="user-mini-avatar">
                <div className="avatar-profile-pill mini">이</div>
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
          background-color: #F8F9FA;
          font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        /* Sidebar */
        .mc-sidebar {
          width: 190px;
          min-width: 190px;
          background-color: #FFFFFF;
          border-right: 1px solid #F1F3F5;
          display: flex;
          flex-direction: column;
          user-select: none;
          padding: 8px 12px;
        }

        .sidebar-brand {
          height: 56px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 8px;
          margin-bottom: 8px;
        }
        .tulip-logo {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brand-text {
          display: flex;
          flex-direction: column;
        }
        .brand-name {
          font-size: 16px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
          line-height: 1.2;
        }
        .brand-ward {
          font-size: 10px;
          color: #64748B;
          font-weight: 500;
          line-height: 1.2;
        }

        .mc-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .nav-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          height: 38px;
          padding: 0 12px;
          border-radius: 10px;
          color: #64748B;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.15s;
        }
        .nav-btn:hover {
          background-color: #F8FAFC;
          color: #0F172A;
        }
        .nav-btn.active {
          background-color: #FFF1F2;
          color: #F43F5E;
          font-weight: 700;
        }

        .sidebar-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 8px;
          margin-top: auto;
          border-top: 1px solid #F1F5F9;
        }
        .avatar-img-box {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          overflow: hidden;
          background-color: #FFE4E6;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .avatar-profile-pill {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: #E11D48;
          background: linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%);
          user-select: none;
        }
        .avatar-profile-pill.mini {
          font-size: 11px;
        }
        .profile-info {
          display: flex;
          flex-direction: column;
        }
        .nurse-name {
          font-size: 12px;
          font-weight: 700;
          color: #0F172A;
        }
        .nurse-sub {
          font-size: 10px;
          color: #94A3B8;
        }

        /* Body & Topbar */
        .mc-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
          background-color: #F8F9FA;
        }
        .mc-topbar {
          height: 42px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #F8F9FA;
        }
        .topbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .icon-btn {
          background: none;
          border: none;
          color: #64748B;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: color 0.15s;
        }
        .icon-btn:hover {
          color: #0F172A;
        }
        .bell-dot {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #F43F5E;
        }
        .user-dropdown {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 8px;
        }
        .user-mini-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          overflow: hidden;
          background-color: #FFE4E6;
        }
        .mini-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .user-label {
          font-size: 13px;
          font-weight: 600;
          color: #1E293B;
        }
        .chevron {
          color: #94A3B8;
        }

        .mc-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 0 16px 10px 16px;
        }
      `}</style>
    </div>
  );
};
