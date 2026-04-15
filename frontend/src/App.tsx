import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from './components/layout/AppShellBare';
import { LoadingState } from './components/ui/LoadingState';
import { useAuth } from './context/auth-context';
import { useTranslation } from './context/language-context';
import type { UserRole } from './types/api';

const DashboardPage = lazy(() =>
  import('./pages/HomeMapDonutPage').then((module) => ({ default: module.HomeMapDonutPage })),
);
const RequestsPage = lazy(() =>
  import('./pages/RequestsWorkspacePage').then((module) => ({ default: module.RequestsWorkspacePage })),
);
const RequestFormPage = lazy(() => import('./pages/RequestFormPage').then((module) => ({ default: module.RequestFormPage })));
const RequestDetailPage = lazy(() =>
  import('./pages/RequestDetailPage').then((module) => ({ default: module.RequestDetailPage })),
);
const NotificationsPage = lazy(() =>
  import('./pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })),
);
const ProfilePage = lazy(() =>
  import('./pages/ProfileSummaryPage').then((module) => ({ default: module.ProfileSummaryPage })),
);
const AiStudioPage = lazy(() => import('./pages/AiStudioPage').then((module) => ({ default: module.AiStudioPage })));
const OrganizationProfilePage = lazy(() =>
  import('./pages/OrganizationProfilePage').then((module) => ({ default: module.OrganizationProfilePage })),
);
const OrganizationsPage = lazy(() =>
  import('./pages/OrganizationsPage').then((module) => ({ default: module.OrganizationsPage })),
);
const CatalogPage = lazy(() => import('./pages/ManagementPage').then((module) => ({ default: module.ManagementPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })));

const RoleBoundary = ({ allow, children }: { allow: UserRole[]; children: JSX.Element }) => {
  const { user } = useAuth();

  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const ProtectedApp = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <AppShell user={user} onLogout={logout} />;
};

const RouteFallback = () => {
  const { t } = useTranslation();
  return <LoadingState label={t('app.routeLoading')} />;
};

const App = () => {
  const { isHydrated, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  if (!isHydrated) {
    return <LoadingState label={t('app.bootLoading')} />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/auth" element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />} />
          <Route element={<ProtectedApp />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route
              path="/requests/new"
              element={
                <RoleBoundary allow={['user']}>
                  <RequestFormPage />
                </RoleBoundary>
              }
            />
            <Route path="/requests/:id" element={<RequestDetailPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/ai" element={<AiStudioPage />} />
            <Route
              path="/organization"
              element={
                <RoleBoundary allow={['organization']}>
                  <OrganizationProfilePage />
                </RoleBoundary>
              }
            />
            <Route
              path="/organizations"
              element={
                <RoleBoundary allow={['admin']}>
                  <OrganizationsPage />
                </RoleBoundary>
              }
            />
            <Route
              path="/catalog"
              element={
                <RoleBoundary allow={['admin']}>
                  <CatalogPage />
                </RoleBoundary>
              }
            />
            <Route
              path="/analytics"
              element={
                <RoleBoundary allow={['admin']}>
                  <AnalyticsPage />
                </RoleBoundary>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/auth'} replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
