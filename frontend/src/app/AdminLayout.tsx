import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { TossIcon } from '../components/ui/TossIcon';

export const AdminLayout: React.FC = () => {
  return (
    <div className="mothercare-shell">
      {/* Sidebar */}
      <aside className="mc-sidebar">
        <div className="sidebar-brand">
          <div className="tulip-logo">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#E11D48" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3c-2.5 2.5-4 6-4 9.5 0 4.1 3.4 7.5 7.5 7.5s7.5-3.4 7.5-7.5c0-3.5-1.5-7-4-9.5l-3.5 4.5L12 3z" fill="#FFE4E6" />
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
            <TossIcon name="chart" size={16} />
            <span>대시보드</span>
          </NavLink>
          <NavLink to="/admin/roster/2026-11" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <TossIcon name="calendar" size={16} />
            <span>근무표</span>
          </NavLink>
          <NavLink to="/admin/requests/2026-11" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <TossIcon name="memo" size={16} />
            <span>근무 신청</span>
          </NavLink>
          <NavLink to="/admin/auto-schedule/2026-11" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <TossIcon name="robot" size={16} />
            <span>AI 편성</span>
          </NavLink>
          <NavLink to="/admin/staff" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <TossIcon name="people" size={16} />
            <span>인력 관리</span>
          </NavLink>
          <NavLink to="/admin/fairness" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <TossIcon name="scale" size={16} />
            <span>통계 및 분석</span>
          </NavLink>
          <NavLink to="/admin/policy" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <TossIcon name="settings" size={16} />
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
            <span className="nurse-sub">산부인과 병동</span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="mc-body">
        {/* Top Header */}
        <header className="mc-topbar">
          <div className="topbar-left">
            <span className="topbar-breadcrumb">병원 관리</span>
            <span className="breadcrumb-sep">/</span>
            <span className="topbar-current">간호사 근무표 관리</span>
          </div>

          <div className="topbar-right">
            <button className="icon-btn" aria-label="검색" title="빠른 검색 (Ctrl+K)">
              <TossIcon name="search" size={16} />
            </button>

            <button className="icon-btn" aria-label="알림" title="알림">
              <TossIcon name="bell" size={16} />
              <span className="bell-dot" />
            </button>

            <div className="user-dropdown">
              <div className="user-mini-avatar">
                <div className="avatar-profile-pill mini">이</div>
              </div>
              <span className="user-label">이은솔</span>
              <ChevronDown size={13} className="chevron" />
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
          background-color: #FFFFFF;
          color: #0F172A;
          font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* Sidebar - Linear/Vercel Minimal Style */
        .mc-sidebar {
          width: 200px;
          min-width: 200px;
          background-color: #FAFAFA;
          border-right: 1px solid #EFEFEF;
          display: flex;
          flex-direction: column;
          user-select: none;
          padding: 12px 8px;
        }

        .sidebar-brand {
          height: 44px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 8px;
          margin-bottom: 12px;
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
          font-size: 14px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }
        .brand-ward {
          font-size: 12px;
          color: #64748B;
          font-weight: 500;
          line-height: 1.2;
        }

        .mc-nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }
        .nav-btn {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 7px 10px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #475569;
          text-decoration: none;
          transition: background-color 0.12s, color 0.12s;
        }
        .nav-btn:hover {
          background-color: #F1F5F9;
          color: #0F172A;
        }
        .nav-btn.active {
          background-color: #FFFFFF;
          color: #0F172A;
          font-weight: 600;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          border: 1px solid #E2E8F0;
        }

        .sidebar-profile {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px;
          margin-top: auto;
          border-top: 1px solid #EFEFEF;
          border-radius: 6px;
        }
        .avatar-img-box {
          width: 28px;
          height: 28px;
          border-radius: 6px;
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
          font-size: 12px;
          font-weight: 700;
          color: #E11D48;
          background: #FFE4E6;
        }
        .avatar-profile-pill.mini {
          font-size: 12px;
        }
        .profile-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .nurse-name {
          font-size: 12px;
          font-weight: 600;
          color: #0F172A;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .nurse-sub {
          font-size: 12px;
          color: #64748B;
          line-height: 1.2;
        }

        /* Body & Topbar */
        .mc-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
          background-color: #FFFFFF;
        }
        .mc-topbar {
          height: 44px;
          min-height: 44px;
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #FFFFFF;
          border-bottom: 1px solid #EFEFEF;
        }
        .topbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
        }
        .topbar-breadcrumb {
          color: #64748B;
        }
        .breadcrumb-sep {
          color: #CBD5E1;
        }
        .topbar-current {
          color: #0F172A;
          font-weight: 600;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .icon-btn {
          background: none;
          border: none;
          color: #64748B;
          cursor: pointer;
          padding: 5px;
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: background-color 0.12s, color 0.12s;
        }
        .icon-btn:hover {
          background-color: #F1F5F9;
          color: #0F172A;
        }
        .bell-dot {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: #E11D48;
        }
        .user-dropdown {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          padding: 3px 6px;
          border-radius: 6px;
          transition: background-color 0.12s;
        }
        .user-dropdown:hover {
          background-color: #F1F5F9;
        }
        .user-mini-avatar {
          width: 22px;
          height: 22px;
          border-radius: 5px;
          overflow: hidden;
          background-color: #FFE4E6;
        }
        .user-label {
          font-size: 12px;
          font-weight: 600;
          color: #1E293B;
        }
        .chevron {
          color: #94A3B8;
        }

        .mc-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background-color: #FFFFFF;
        }
      `}</style>
    </div>
  );
};
