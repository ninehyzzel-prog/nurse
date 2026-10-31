import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MobileLayout } from './app/MobileLayout';
import { AdminLayout } from './app/AdminLayout';

// Features
import { MySchedulePage } from './features/my-schedule/MySchedulePage';
import { NewRequestPage } from './features/requests/NewRequestPage';
import { RequestListPage } from './features/requests/RequestListPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';

import { RosterEditorPage } from './features/roster-editor/RosterEditorPage';
import { ConflictResolverPage } from './features/conflicts/ConflictResolverPage';
import { AutoSchedulePage } from './features/auto-schedule/AutoSchedulePage';
import { PolicyAdminPage } from './features/policy-admin/PolicyAdminPage';
import { StaffAdminPage } from './features/staff-admin/StaffAdminPage';
import { FairnessPage } from './features/fairness/FairnessPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* 루트 접속 시 간호사 모바일 내 근무표로 리다이렉트 */}
        <Route path="/" element={<Navigate to="/me/schedule" replace />} />

        {/* 간호사 모바일 전용 라우트 */}
        <Route path="/me" element={<MobileLayout />}>
          <Route index element={<Navigate to="/me/schedule" replace />} />
          <Route path="schedule" element={<MySchedulePage />} />
          <Route path="requests" element={<RequestListPage />} />
          <Route path="requests/new" element={<NewRequestPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        {/* 작성자/수간호사 PC 전용 라우트 */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/roster/2026-11" replace />} />
          <Route path="roster" element={<Navigate to="/admin/roster/2026-11" replace />} />
          <Route path="roster/:periodId" element={<RosterEditorPage />} />
          <Route path="requests/:periodId" element={<ConflictResolverPage />} />
          <Route path="auto-schedule/:periodId" element={<AutoSchedulePage />} />
          <Route path="policy" element={<PolicyAdminPage />} />
          <Route path="staff" element={<StaffAdminPage />} />
          <Route path="fairness" element={<FairnessPage />} />
        </Route>

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/me/schedule" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
