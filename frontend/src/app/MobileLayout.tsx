import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Home, Calendar, ClipboardList, Bell, MoreHorizontal, ChevronLeft, Wifi, Battery, CalendarDays } from 'lucide-react';

export const MobileLayout: React.FC = () => {
  return (
    <div className="mobile-shell">
      {/* iOS Style Status Bar */}
      <div className="mobile-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons">
          <Wifi size={13} strokeWidth={2.2} />
          <Battery size={15} strokeWidth={2.2} />
        </div>
      </div>

      {/* Navigation Header */}
      <header className="mobile-header">
        <div className="header-left">
          <Link to="/admin/roster/2026-11" className="btn-back" title="관리자 콘솔로 돌아가기">
            <ChevronLeft size={20} strokeWidth={2.2} />
          </Link>
          <h1 className="header-title">내 근무표</h1>
        </div>
        <div className="header-right">
          <button className="header-action-btn" title="캘린더 변경">
            <CalendarDays size={18} strokeWidth={2} />
          </button>
        </div>
      </header>

      <main className="mobile-main">
        <Outlet />
      </main>

      {/* Bottom Tab Bar matching reference */}
      <nav className="mobile-bottom-nav">
        <NavLink to="/admin/roster/2026-11" className="m-nav-item">
          <Home size={18} strokeWidth={2} />
          <span>홈</span>
        </NavLink>
        <NavLink to="/me/schedule" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
          <Calendar size={18} strokeWidth={2} />
          <span>근무표</span>
        </NavLink>
        <NavLink to="/me/requests/new" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
          <ClipboardList size={18} strokeWidth={2} />
          <span>신청</span>
        </NavLink>
        <NavLink to="/me/notifications" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
          <Bell size={18} strokeWidth={2} />
          <span>알림</span>
        </NavLink>
        <button className="m-nav-item btn-ghost-tab" onClick={() => alert('마더케어 산부인과 병동 포털 v1.0')}>
          <MoreHorizontal size={18} strokeWidth={2} />
          <span>더보기</span>
        </button>
      </nav>

      <style>{`
        .mobile-shell {
          max-width: 390px;
          margin: 20px auto;
          min-height: 844px;
          background-color: #FFFFFF;
          border-radius: 40px;
          border: 8px solid #1E293B;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        .mobile-status-bar {
          height: 38px;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #FFFFFF;
          font-size: 13px;
          font-weight: 600;
          color: #0F172A;
          user-select: none;
        }
        .status-icons {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .mobile-header {
          height: 44px;
          padding: 0 16px;
          background-color: #FFFFFF;
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
        .btn-back {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0F172A;
          text-decoration: none;
        }
        .header-title {
          font-size: 17px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
        }
        .header-action-btn {
          background: none;
          border: none;
          color: #334155;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }
        .mobile-main {
          flex: 1;
          padding-bottom: 70px;
          background-color: #FAFAFB;
        }
        .mobile-bottom-nav {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          padding-bottom: 12px;
          background-color: #FFFFFF;
          border-top: 1px solid #F1F5F9;
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
          min-width: 52px;
          height: 48px;
          color: #94A3B8;
          font-size: 10px;
          font-weight: 600;
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          transition: color 0.15s;
        }
        .m-nav-item:hover {
          color: #F43F5E;
        }
        .m-nav-item.active {
          color: #F43F5E;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};
