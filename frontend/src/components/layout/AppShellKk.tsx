import { NavLink, Outlet } from 'react-router-dom';

import { useLocation } from 'react-router-dom';

import {
  Bell,
  Building,
  ChartColumn,
  CirclePlus,
  Home,
  LayoutGrid,
  Languages,
  LogOut,
  MapPin,
  MapPinned,
  Moon,
  Sun,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../context/language-context';
import { useTheme } from '../../context/theme-context';
import { useToast } from '../../context/toast-context';
import { api } from '../../lib/api-client';
import { getErrorMessage } from '../../lib/errors';
import { LANGUAGE_OPTIONS } from '../../lib/i18n';
import { formatRoleLabel, resolveFileUrl } from '../../lib/format';
import type { AuthUser, City, UserRole } from '../../types/api';

interface AppShellProps {
  user: AuthUser;
  onLogout: () => void;
}

interface NavigationItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export interface AppShellOutletContext {
  cities: City[];
  selectedCity: City | null;
  selectedCityId: string | null;
}

const MANAGEMENT_LABELS: Record<'kk' | 'ru' | 'en', string> = {
  kk: 'Басқару',
  ru: 'Управление',
  en: 'Management',
};

const navigation: NavigationItem[] = [
  { to: '/', labelKey: 'layout.nav.home', icon: Home, roles: ['admin', 'organization', 'user'] },
  { to: '/requests', labelKey: 'layout.nav.requests', icon: LayoutGrid, roles: ['admin', 'organization', 'user'] },
  { to: '/requests/new', labelKey: 'layout.nav.create', icon: CirclePlus, roles: ['user'] },
  { to: '/organizations', labelKey: 'layout.nav.organizations', icon: Building, roles: ['admin'] },
  { to: '/catalog', labelKey: 'layout.nav.catalog', icon: MapPinned, roles: ['admin'] },
  { to: '/analytics', labelKey: 'layout.nav.analytics', icon: ChartColumn, roles: ['admin'] },
  { to: '/profile', labelKey: 'layout.nav.profile', icon: UserRound, roles: ['admin', 'organization', 'user'] },
];

const BrandLogo = () => (
  <span className="brand-block__mark" aria-hidden="true">
    <svg viewBox="0 0 48 48" className="brand-block__logo" role="presentation">
      <defs>
        <linearGradient id="aiqala-logo-fill" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop style={{ stopColor: 'var(--accent)' }} />
          <stop offset="0.55" style={{ stopColor: 'color-mix(in srgb, var(--accent) 72%, white 28%)' }} />
          <stop offset="1" style={{ stopColor: 'var(--accent-alt)' }} />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="36" height="36" rx="13" fill="url(#aiqala-logo-fill)" />
      <path
        d="M24 11.5c-5.73 0-10.38 4.57-10.38 10.21 0 7.86 8.53 14.9 9.2 15.43.7.57 1.66.57 2.36 0 .67-.53 9.2-7.57 9.2-15.43 0-5.64-4.65-10.21-10.38-10.21Z"
        fill="rgba(8, 16, 31, 0.16)"
      />
      <path
        d="M24 14.6c4.04 0 7.31 3.17 7.31 7.08 0 4.43-4.44 8.56-7.31 10.8-2.87-2.24-7.31-6.37-7.31-10.8 0-3.91 3.27-7.08 7.31-7.08Z"
        fill="rgba(255, 255, 255, 0.18)"
      />
      <rect x="19" y="18.2" width="2.6" height="6.8" rx="0.8" fill="#F7FDFF" />
      <rect x="22.7" y="16.2" width="2.6" height="8.8" rx="0.8" fill="#F7FDFF" />
      <rect x="26.4" y="19.6" width="2.6" height="5.4" rx="0.8" fill="#F7FDFF" />
      <circle cx="24" cy="35.2" r="1.8" fill="#F7FDFF" />
    </svg>
  </span>
);

export const AppShell = ({ user, onLogout }: AppShellProps) => {
  const location = useLocation();
  const { language, setLanguage, t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { pushToast } = useToast();
  const availableNavigation = navigation.filter((item) => item.roles.includes(user.role));
  const appName = import.meta.env.VITE_APP_NAME ?? 'AIQala';
  const roleLabel = formatRoleLabel(user.role);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const cityPickerRef = useRef<HTMLDivElement | null>(null);
  const languagePickerRef = useRef<HTMLDivElement | null>(null);
  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('');
  const selectedCity = cities.find((city) => city.id === selectedCityId) ?? null;
  const managementLabel = MANAGEMENT_LABELS[language];
  const currentPageTitle = (() => {
    if (location.pathname === '/') {
      return t('layout.nav.home');
    }

    if (location.pathname === '/requests/new') {
      return t('layout.nav.create');
    }

    if (location.pathname === '/requests' || /^\/requests\/[^/]+$/.test(location.pathname)) {
      return t('layout.nav.requests');
    }

    if (location.pathname === '/notifications') {
      return t('layout.notifications');
    }

    if (location.pathname === '/catalog' || location.pathname.startsWith('/catalog/')) {
      return managementLabel;
    }

    const matchedNavigation = availableNavigation.find(
      (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
    );

    return matchedNavigation ? t(matchedNavigation.labelKey) : appName;
  })();

  const isNavigationItemActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }

    if (path === '/requests') {
      return (
        location.pathname === '/requests' ||
        (/^\/requests\/[^/]+$/.test(location.pathname) && location.pathname !== '/requests/new')
      );
    }

    if (path === '/requests/new') {
      return location.pathname === '/requests/new';
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  useEffect(() => {
    let active = true;

    const loadCities = async () => {
      try {
        const items = await api.locations.cities.list();

        if (!active) {
          return;
        }

        setCities(items);
      } catch (error) {
        if (!active) {
          return;
        }

        pushToast({
          tone: 'error',
          title: t('layout.citiesLoadFailed'),
          description: getErrorMessage(error),
        });
      }
    };

    void loadCities();

    return () => {
      active = false;
    };
  }, [pushToast, t]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;

      if (cityPickerRef.current && target && !cityPickerRef.current.contains(target)) {
        setIsCityMenuOpen(false);
      }

      if (languagePickerRef.current && target && !languagePickerRef.current.contains(target)) {
        setIsLanguageMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    setIsCityMenuOpen(false);
    setIsLanguageMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="shell">
      <aside className="shell__sidebar glass-card">
        <div className="shell__sidebar-inner">
          <div className="brand-block brand-block--sidebar">
            <div className="brand-block__header">
              <BrandLogo />
              <div className="brand-block__copy">
                <span className="brand-block__eyebrow">{t('layout.platform')}</span>
                <h1 className="brand-block__title">
                  {appName}
                  <span className="brand-block__dot">.</span>
                </h1>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {availableNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={() => `sidebar-link ${isNavigationItemActive(item.to) ? 'sidebar-link--active' : ''}`}
              >
                <span className="sidebar-link__icon" aria-hidden="true">
                  <item.icon size={18} strokeWidth={1.8} />
                </span>
                <span className="sidebar-link__body">
                  <strong>{item.to === '/catalog' ? managementLabel : t(item.labelKey)}</strong>
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="profile-chip">
              <div className="profile-chip__avatar">
                {user.avatarUrl ? <img src={resolveFileUrl(user.avatarUrl)} alt={user.fullName} /> : initials || 'U'}
              </div>
              <div className="profile-chip__body">
                <div className="profile-chip__identity">
                  <strong>{user.fullName}</strong>
                  <span>{roleLabel}</span>
                </div>
                <button
                  type="button"
                  className="profile-chip__logout"
                  onClick={onLogout}
                  aria-label={t('layout.logout')}
                  title={t('layout.logout')}
                >
                  <LogOut size={15} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="shell__content">
        <header className="topbar topbar--minimal glass-card">
          <div className="topbar__title-wrap">
            <h2 className="topbar__title">{currentPageTitle}</h2>
          </div>
          <div className="topbar-actions">
            <div className="city-picker" ref={cityPickerRef}>
              <button
                type="button"
                className={`topbar-icon-button ${isCityMenuOpen ? 'topbar-icon-button--active' : ''}`}
                onClick={() => setIsCityMenuOpen((current) => !current)}
                aria-label={t('layout.selectCity')}
                title={selectedCity ? t('layout.citySelected', { city: selectedCity.name }) : t('layout.selectCity')}
              >
                <MapPin size={18} strokeWidth={1.9} />
              </button>

              {isCityMenuOpen ? (
                <div className="city-picker__menu glass-card">
                  <button
                    type="button"
                    className={`city-picker__option ${selectedCityId === null ? 'city-picker__option--active' : ''}`}
                    onClick={() => {
                      setSelectedCityId(null);
                      setIsCityMenuOpen(false);
                    }}
                  >
                    {t('common.allCities')}
                  </button>
                  {cities.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      className={`city-picker__option ${selectedCityId === city.id ? 'city-picker__option--active' : ''}`}
                      onClick={() => {
                        setSelectedCityId(city.id);
                        setIsCityMenuOpen(false);
                      }}
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="city-picker" ref={languagePickerRef}>
              <button
                type="button"
                className={`topbar-icon-button ${isLanguageMenuOpen ? 'topbar-icon-button--active' : ''}`}
                onClick={() => setIsLanguageMenuOpen((current) => !current)}
                aria-label={t('layout.changeLanguage')}
                title={t('layout.changeLanguage')}
              >
                <Languages size={18} strokeWidth={1.9} />
              </button>

              {isLanguageMenuOpen ? (
                <div className="city-picker__menu glass-card">
                  {LANGUAGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`city-picker__option ${language === option.value ? 'city-picker__option--active' : ''}`}
                      onClick={() => {
                        setLanguage(option.value);
                        setIsLanguageMenuOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="topbar-icon-button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('layout.switchToLight') : t('layout.switchToDark')}
              title={theme === 'dark' ? t('layout.lightMode') : t('layout.darkMode')}
            >
              {theme === 'dark' ? <Sun size={18} strokeWidth={1.9} /> : <Moon size={18} strokeWidth={1.9} />}
            </button>
            <NavLink to="/notifications" title={t('layout.notifications')} aria-label={t('layout.notifications')} className="topbar-icon-button">
              <Bell size={18} strokeWidth={1.9} />
            </NavLink>
          </div>
        </header>

        <main className="shell__main">
          <Outlet
            context={{
              cities,
              selectedCity,
              selectedCityId,
            } satisfies AppShellOutletContext}
          />
        </main>
      </div>
    </div>
  );
};
