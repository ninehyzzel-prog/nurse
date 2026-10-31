import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  CheckCircle2, 
  ArrowLeftRight, 
  ChevronRight, 
  Clock, 
  CheckCheck,
  Megaphone
} from 'lucide-react';

interface NotificationItem {
  id: string;
  type: 'SCHEDULE_CONFIRMED' | 'LEAVE_APPROVED' | 'REQUEST_OPEN' | 'SHIFT_CHANGE';
  title: string;
  description: string;
  timeAgo: string;
  isRead: boolean;
  linkTo: string;
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      type: 'LEAVE_APPROVED',
      title: '10월 12일 OFF 신청 승인 완료',
      description: '신청하신 희망 OFF가 수간호사 검토 및 공정성 조율을 거쳐 최종 승인되었습니다.',
      timeAgo: '10분 전',
      isRead: false,
      linkTo: '/me/schedule',
    },
    {
      id: 'notif-2',
      type: 'SCHEDULE_CONFIRMED',
      title: '2026년 10월 정기 근무표 확정 공지',
      description: '산부인과 3병동 10월 간호사 근무표가 최종 확정되었습니다. 일정을 확인하세요.',
      timeAgo: '어제 14:30',
      isRead: false,
      linkTo: '/me/schedule',
    },
    {
      id: 'notif-3',
      type: 'REQUEST_OPEN',
      title: '2026년 11월 휴가/오프 신청 접수 오픈',
      description: '11월 근무표 신청이 열렸습니다. 10월 20일 24:00까지 희망일을 제출해 주세요.',
      timeAgo: '10월 18일',
      isRead: true,
      linkTo: '/me/requests/new',
    },
    {
      id: 'notif-4',
      type: 'SHIFT_CHANGE',
      title: '10월 27일 나이트 숙련 인력 배치 안내',
      description: '병동 최소 숙련도 규정에 따라 해당 일자의 당직 조율이 완료되었습니다.',
      timeAgo: '10월 15일',
      isRead: true,
      linkTo: '/me/schedule',
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  const handleClickItem = (item: NotificationItem) => {
    setNotifications(
      notifications.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
    navigate(item.linkTo);
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'LEAVE_APPROVED':
        return <CheckCircle2 size={16} className="notif-icon green" strokeWidth={2.2} />;
      case 'SCHEDULE_CONFIRMED':
        return <Calendar size={16} className="notif-icon blue" strokeWidth={2.2} />;
      case 'REQUEST_OPEN':
        return <Megaphone size={16} className="notif-icon purple" strokeWidth={2.2} />;
      case 'SHIFT_CHANGE':
        return <ArrowLeftRight size={16} className="notif-icon pink" strokeWidth={2.2} />;
    }
  };

  const getTypeTag = (type: NotificationItem['type']) => {
    switch (type) {
      case 'LEAVE_APPROVED':
        return <span className="type-badge green">승인</span>;
      case 'SCHEDULE_CONFIRMED':
        return <span className="type-badge blue">확정</span>;
      case 'REQUEST_OPEN':
        return <span className="type-badge purple">안내</span>;
      case 'SHIFT_CHANGE':
        return <span className="type-badge pink">조율</span>;
    }
  };

  return (
    <div className="mobile-notifications-view">
      {/* 1. 상단 툴바 */}
      <div className="notif-top-bar">
        <div className="nt-left">
          <span className="nt-title">알림 목록</span>
          {unreadCount > 0 && (
            <span className="unread-badge font-mono">새 알림 {unreadCount}건</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="btn-read-all" onClick={markAllAsRead}>
            <CheckCheck size={14} /> 모두 읽음
          </button>
        )}
      </div>

      {/* 2. 알림 피드 리스트 (Linear 플랫 스타일 & 12px 최소 폰트) */}
      <div className="notifications-feed">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={`notif-card ${!item.isRead ? 'unread' : ''}`}
            onClick={() => handleClickItem(item)}
          >
            <div className="notif-icon-col">
              <div className="icon-circle">
                {getIcon(item.type)}
              </div>
            </div>

            <div className="notif-content-col">
              <div className="nc-top-row">
                <div className="tag-title-wrap">
                  {getTypeTag(item.type)}
                  <h4 className="item-title">{item.title}</h4>
                </div>
                {!item.isRead && <span className="unread-dot" />}
              </div>

              <p className="item-desc">{item.description}</p>

              <div className="nc-bottom-row">
                <span className="time-text font-mono">
                  <Clock size={12} /> {item.timeAgo}
                </span>
                <span className="go-link">
                  바로가기 <ChevronRight size={13} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .mobile-notifications-view {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px 16px;
          background-color: #FAFAFA;
          min-height: 100%;
        }

        .notif-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 2px;
        }
        .nt-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nt-title {
          font-size: 14px;
          font-weight: 700;
          color: #0F172A;
        }
        .unread-badge {
          font-size: 12px;
          font-weight: 700;
          color: #E11D48;
          background-color: #FFE4E6;
          padding: 2px 7px;
          border-radius: 4px;
        }
        .btn-read-all {
          background: none;
          border: none;
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px;
        }
        .btn-read-all:hover {
          color: #0F172A;
        }

        /* 피드 리스트 */
        .notifications-feed {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .notif-card {
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          gap: 12px;
          cursor: pointer;
          transition: all 0.12s;
        }
        .notif-card:hover {
          border-color: #CBD5E1;
        }
        .notif-card.unread {
          border-left: 3px solid #0F172A;
          background-color: #FFFFFF;
        }

        .notif-icon-col {
          flex-shrink: 0;
          margin-top: 1px;
        }
        .icon-circle {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background-color: #F8FAFC;
          border: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .notif-icon.green { color: #166534; }
        .notif-icon.blue { color: #1D4ED8; }
        .notif-icon.purple { color: #7E22CE; }
        .notif-icon.pink { color: #E11D48; }

        .notif-content-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }
        .nc-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .tag-title-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .type-badge {
          font-size: 12px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .type-badge.green { background-color: #DCFCE7; color: #166534; }
        .type-badge.blue { background-color: #EFF6FF; color: #1D4ED8; }
        .type-badge.purple { background-color: #F3E8FF; color: #7E22CE; }
        .type-badge.pink { background-color: #FFE4E6; color: #E11D48; }

        .item-title {
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .unread-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #E11D48;
          flex-shrink: 0;
        }

        .item-desc {
          font-size: 12px;
          color: #475569;
          margin: 0;
          line-height: 1.4;
        }

        .nc-bottom-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
        }
        .time-text {
          font-size: 12px;
          color: #94A3B8;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .go-link {
          font-size: 12px;
          font-weight: 600;
          color: #0F172A;
          display: flex;
          align-items: center;
          gap: 2px;
        }
      `}</style>
    </div>
  );
};
