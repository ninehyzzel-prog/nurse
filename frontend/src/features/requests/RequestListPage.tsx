import React from 'react';
import { Link } from 'react-router-dom';
import { MOCK_REQUESTS } from '../../data/mockData';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Plus, Star, ChevronRight } from 'lucide-react';

export const RequestListPage: React.FC = () => {
  return (
    <div className="mobile-request-list-view">
      {/* 1. 상단 탭 및 액션 */}
      <div className="req-nav-header">
        <div className="type-toggle-pill">
          <Link to="/me/requests/new" className="tab-pill link">
            <span>새 신청 작성</span>
          </Link>
          <button className="tab-pill active">
            <span>신청 내역</span>
            <span className="count-badge font-mono">{MOCK_REQUESTS.length}</span>
          </button>
        </div>

        <div className="list-meta-bar">
          <span className="meta-text">신청 내역 총 <strong>{MOCK_REQUESTS.length}건</strong></span>
          <Link to="/me/requests/new" className="btn-add-fast">
            <Plus size={12} /> 추가 신청
          </Link>
        </div>
      </div>

      {/* 2. 신청 내역 리스트 (Linear 플랫 행 스타일) */}
      <div className="requests-container">
        {MOCK_REQUESTS.map((req) => {
          const typeName = req.requestType === 'PREFERENCE_OFF'
            ? '일반 희망 OFF'
            : req.requestType === 'ANNUAL_LEAVE'
            ? '법정 연차 휴가'
            : '모성/법정보호 휴가';

          return (
            <div key={req.id} className="req-row-card">
              <div className="row-top">
                <div className="type-group">
                  <span className="type-text">{typeName}</span>
                  {req.isImportant && (
                    <span className="star-tag font-mono">
                      <Star size={10} fill="#EAB308" color="#EAB308" /> 중요 +10
                    </span>
                  )}
                </div>
                <StatusBadge status={req.status} />
              </div>

              <div className="date-highlight-row">
                <span className="date-label">희망 일자</span>
                <span className="date-values font-mono">{req.dates.join(', ')}</span>
              </div>

              {req.reasonNote && (
                <div className="reason-bubble">
                  "{req.reasonNote}"
                </div>
              )}

              {/* 공정성 경합 점수 */}
              {req.priorityBreakdown && (
                <div className="score-detail-strip">
                  <div className="sd-header">
                    <span>공정성 경합 점수</span>
                    <strong className="font-mono">{req.priorityPoints}점</strong>
                  </div>
                  <div className="sd-calc font-mono">
                    주말결손({req.priorityBreakdown.weekendDeficitPoints}) + 
                    미반영({req.priorityBreakdown.ungrantedPoints}) + 
                    부담초과({req.priorityBreakdown.burdenExcessPoints})
                    {req.priorityBreakdown.importancePoints > 0 && ` + 중요(+${req.priorityBreakdown.importancePoints})`}
                  </div>
                </div>
              )}

              <div className="row-bottom">
                <span className="submit-time font-mono">
                  접수: {new Date(req.submittedAt).toLocaleDateString()}
                </span>
                <span className="action-link">상세 조회 <ChevronRight size={12} /></span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .mobile-request-list-view {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px 16px;
          background-color: #FAFAFA;
          min-height: 100%;
        }

        .req-nav-header {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .type-toggle-pill {
          display: flex;
          background-color: #F1F5F9;
          padding: 3px;
          border-radius: 8px;
          gap: 2px;
        }
        .tab-pill {
          flex: 1;
          border: none;
          background: none;
          padding: 7px 0;
          font-size: 12px;
          font-weight: 500;
          color: #64748B;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-decoration: none;
          cursor: pointer;
        }
        .tab-pill.active {
          background-color: #FFFFFF;
          color: #0F172A;
          font-weight: 700;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        .count-badge {
          font-size: 12px;
          background-color: #0F172A;
          color: #FFFFFF;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .list-meta-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          color: #64748B;
        }
        .btn-add-fast {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #0F172A;
          background-color: #FFFFFF;
          border: 1px solid #CBD5E1;
          padding: 4px 9px;
          border-radius: 6px;
          text-decoration: none;
        }
        .btn-add-fast:hover {
          background-color: #F8FAFC;
        }

        /* 리스트 카드 */
        .requests-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .req-row-card {
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: border-color 0.12s;
        }
        .req-row-card:hover {
          border-color: #CBD5E1;
        }
        .row-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .type-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .type-text {
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
        }
        .star-tag {
          font-size: 12px;
          font-weight: 600;
          color: #854D0E;
          background-color: #FEF9C3;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }

        .date-highlight-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          background-color: #F8FAFC;
          padding: 6px 10px;
          border-radius: 6px;
        }
        .date-label {
          font-size: 12px;
          color: #64748B;
        }
        .date-values {
          font-size: 12px;
          font-weight: 700;
          color: #0F172A;
        }

        .reason-bubble {
          font-size: 12px;
          color: #475569;
          font-style: italic;
          padding-left: 2px;
        }

        .score-detail-strip {
          border-top: 1px solid #F1F5F9;
          padding-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .sd-header {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #475569;
        }
        .sd-calc {
          font-size: 12px;
          color: #64748B;
        }

        .row-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid #F8FAFC;
          padding-top: 6px;
        }
        .submit-time {
          font-size: 12px;
          color: #94A3B8;
        }
        .action-link {
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
