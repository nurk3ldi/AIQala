import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Monitor, MonitorX, Smartphone } from 'lucide-react';

import { AppShell } from './components/layout/AppShellBare';
import { LoadingState } from './components/ui/LoadingState';
import { useAuth } from './context/auth-context';
import { useTranslation } from './context/language-context';
import type { UserRole } from './types/api';

const MOBILE_LAYOUT_BREAKPOINT = 760;
const PHONE_DEVICE_BREAKPOINT = 900;

const BLOCKED_MOBILE_ROLES: UserRole[] = ['admin', 'organization'];

const detectDeviceState = () => {
  if (typeof window === 'undefined') {
    return {
      isPhoneDevice: false,
      isDesktopNarrow: false,
    };
  }

  const width = window.innerWidth;
  const userAgent = window.navigator.userAgent ?? '';
  const maxTouchPoints = window.navigator.maxTouchPoints ?? 0;
  const coarsePointer = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)').matches : false;
  const isMobileUserAgent = /Android|iPhone|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTabletUserAgent = /iPad|Tablet/i.test(userAgent);
  const isPhoneDevice = width <= PHONE_DEVICE_BREAKPOINT && !isTabletUserAgent && (isMobileUserAgent || (coarsePointer && maxTouchPoints > 0));
  const isDesktopNarrow = width <= MOBILE_LAYOUT_BREAKPOINT && !isPhoneDevice;

  return {
    isPhoneDevice,
    isDesktopNarrow,
  };
};

type AccessGuardVariant = 'phone' | 'desktop-narrow';

const accessGuardCopy = {
  kk: {
    phone: {
      code: 'DESKTOP',
      title: 'Бұл рөл телефоннан ашылмайды',
      description: 'Админ және ұйым кабинеттерін десктоп немесе ноутбук арқылы ашыңыз.',
      note: 'Сайтты компьютер арқылы қайта ашыңыз.',
    },
    desktopNarrow: {
      code: '404',
      title: 'Бұл режимде бет көрсетілмейді',
      description: 'Терезе mobile өлшеміне түсіп кеткен. Сайтты бастапқы desktop режимімен қараңыз.',
      note: 'Терезені кеңейтіп немесе масштабты қалыпқа келтіріңіз.',
    },
  },
  ru: {
    phone: {
      code: 'DESKTOP',
      title: 'Эта роль недоступна с телефона',
      description: 'Кабинеты администратора и организации открывайте с десктопа или ноутбука.',
      note: 'Откройте сайт с компьютера.',
    },
    desktopNarrow: {
      code: '404',
      title: 'Страница недоступна в этом режиме',
      description: 'Окно браузера слишком узкое и сайт перешел в mobile-режим. Вернитесь к обычному desktop виду.',
      note: 'Расширьте окно или верните стандартный масштаб.',
    },
  },
  en: {
    phone: {
      code: 'DESKTOP',
      title: 'This role is not available on phones',
      description: 'Administrator and organization workspaces should be opened from a desktop or laptop.',
      note: 'Open the site on a computer.',
    },
    desktopNarrow: {
      code: '404',
      title: 'This page is unavailable in this mode',
      description: 'The browser window is too narrow and the site has switched into mobile layout. Return to the default desktop view.',
      note: 'Widen the window or reset the zoom level.',
    },
  },
} as const;

const AccessGuardPage = ({ variant }: { variant: AccessGuardVariant }) => {
  const { language } = useTranslation();
  const copy = variant === 'phone' ? accessGuardCopy[language].phone : accessGuardCopy[language].desktopNarrow;
  const Icon = variant === 'phone' ? Smartphone : MonitorX;

  return (
    <main className="access-guard">
      <section className="access-guard__card" role="alert" aria-live="polite">
        <div className="access-guard__badge">
          <Icon size={22} />
          <span>{copy.code}</span>
        </div>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
        <div className="access-guard__hint">
          <Monitor size={16} />
          <span>{copy.note}</span>
        </div>
      </section>
    </main>
  );
};

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
const ChatPage = lazy(() => import('./pages/ChatPage').then((module) => ({ default: module.ChatPage })));
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
  const [deviceState, setDeviceState] = useState(detectDeviceState);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    const syncDeviceState = () => setDeviceState(detectDeviceState());

    syncDeviceState();
    window.addEventListener('resize', syncDeviceState);

    return () => {
      window.removeEventListener('resize', syncDeviceState);
    };
  }, []);

  if (BLOCKED_MOBILE_ROLES.includes(user.role) && deviceState.isPhoneDevice) {
    return <AccessGuardPage variant="phone" />;
  }

  if (BLOCKED_MOBILE_ROLES.includes(user.role) && deviceState.isDesktopNarrow) {
    return <AccessGuardPage variant="desktop-narrow" />;
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
            <Route
              path="/chat"
              element={
                <RoleBoundary allow={['organization', 'user']}>
                  <ChatPage />
                </RoleBoundary>
              }
            />
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
