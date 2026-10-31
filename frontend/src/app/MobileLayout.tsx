import React from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { Home, Calendar, ClipboardList, Bell, MoreHorizontal, ChevronLeft, Wifi, Battery, CalendarDays } from 'lucide-react';

export const MobileLayout: React.FC = () => {
  const location = useLocation();

  // 라우트별 동적 타이틀
  const getHeaderTitle = () => {
    if (location.pathname.includes('/me/schedule')) return '내 근무표';
    if (location.pathname.includes('/me/requests/new')) return '오프 / 휴가 신청';
    if (location.pathname.includes('/me/requests')) return '신청 내역';
    if (location.pathname.includes('/me/notifications')) return '알림 센터';
    return '마더케어 병동';
  };

  const isSchedulePage = location.pathname.includes('/me/schedule');

  return (
    <div className="mobile-app-wrapper">
      <div className="mobile-shell">
        {/* iOS Style Status Bar */}
        <div className="mobile-status-bar">
          <span className="status-time">9:41</span>
          <div className="status-dynamic-island" />
          <div className="status-icons">
            <Wifi size={13} strokeWidth={2.4} />
            <Battery size={15} strokeWidth={2.4} />
          </div>
        </div>

        {/* Navigation Header */}
        <header className="mobile-header">
          <div className="header-left">
            <Link to="/admin/roster/2026-11" className="btn-back" title="PC 관리자 콘솔로 전환">
              <ChevronLeft size={20} strokeWidth={2.4} />
            </Link>
            <h1 className="header-title">{getHeaderTitle()}</h1>
          </div>
          <div className="header-right">
            {isSchedulePage ? (
              <button className="header-action-btn" title="캘린더 변경">
                <CalendarDays size={18} strokeWidth={2} />
              </button>
            ) : (
              <span className="ward-pill">3병동</span>
            )}
          </div>
        </header>

        {/* 메인 콘텐츠 영역 */}
        <main className="mobile-main">
          <Outlet />
        </main>

        {/* Bottom Tab Bar (iOS Native Style) */}
        <nav className="mobile-bottom-nav">
          <NavLink to="/admin/roster/2026-11" className="m-nav-item">
            <Home size={19} strokeWidth={1.9} />
            <span>PC 콘솔</span>
          </NavLink>
          <NavLink to="/me/schedule" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
            <Calendar size={19} strokeWidth={1.9} />
            <span>근무표</span>
          </NavLink>
          <NavLink to="/me/requests/new" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
            <ClipboardList size={19} strokeWidth={1.9} />
            <span>신청</span>
          </NavLink>
          <NavLink to="/me/notifications" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
            <div className="bell-wrap">
              <Bell size={19} strokeWidth={1.9} />
              <span className="badge-dot" />
            </div>
            <span>알림</span>
          </NavLink>
          <NavLink to="/me/requests" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
            <MoreHorizontal size={19} strokeWidth={1.9} />
            <span>내역</span>
          </NavLink>
        </nav>
      </div>

      <style>{`
        .mobile-app-wrapper {
          min-height: 100vh;
          background-color: #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 0;
          font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .mobile-shell {
          width: 390px;
          min-height: 844px;
          max-height: 880px;
          background-color: #FFFFFF;
          border-radius: 44px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 0 10px #0F172A;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* Status Bar */
        .mobile-status-bar {
          height: 44px;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #FFFFFF;
          font-size: 13px;
          font-weight: 600;
          color: #0F172A;
          user-select: none;
          z-index: 10;
        }
        .status-dynamic-island {
          width: 90px;
          height: 22px;
          background-color: #0F172A;
          border-radius: 20px;
        }
        .status-icons {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Header */
        .mobile-header {
          height: 46px;
          padding: 0 16px;
          background-color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #F1F5F9;
          position: sticky;
          top: 0;
          z-index: 50;
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
          padding: 4px;
          border-radius: 6px;
        }
        .btn-back:hover {
          background-color: #F8FAFC;
        }
        .header-title {
          font-size: 16px;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .header-action-btn {
          background: none;
          border: none;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 6px;
        }
        .header-action-btn:hover {
          background-color: #F8FAFC;
          color: #0F172A;
        }
        .ward-pill {
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
          background-color: #F1F5F9;
          padding: 2px 7px;
          border-radius: 4px;
        }

        /* Main Content */
        .mobile-main {
          flex: 1;
          overflow-y: auto;
          background-color: #FFFFFF;
          padding-bottom: 74px;
        }

        /* Bottom Tab Bar */
        .mobile-bottom-nav {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 68px;
          padding-bottom: 14px;
          background-color: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(12px);
          border-top: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: space-around;
          z-index: 100;
        }
        .m-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          min-width: 50px;
          height: 48px;
          color: #94A3B8;
          font-size: 12px;
          font-weight: 500;
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          transition: color 0.12s;
        }
        .m-nav-item.active {
          color: #0F172A;
          font-weight: 700;
        }
        .bell-wrap {
          position: relative;
          display: flex;
        }
        .badge-dot {
          position: absolute;
          top: 0;
          right: -1px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #E11D48;
        }
      `}</style>
    </div>
  );
};
