import { Bell, Languages, MapPin, Moon, Sun, UserRound } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useTranslation } from '../../context/language-context';
import { useTheme } from '../../context/theme-context';
import { useToast } from '../../context/toast-context';
import { api } from '../../lib/api-client';
import { getErrorMessage } from '../../lib/errors';
import { LANGUAGE_OPTIONS } from '../../lib/i18n';
import { resolveFileUrl } from '../../lib/format';
import type { AuthUser, City, UserRole } from '../../types/api';

interface AppShellProps {
  user: AuthUser;
  onLogout: () => void;
}

interface NavigationItem {
  to: string;
  label: string;
  roles: UserRole[];
}

export interface AppShellOutletContext {
  cities: City[];
  selectedCity: City | null;
  selectedCityId: string | null;
}

const navigation: NavigationItem[] = [
  { to: '/', label: 'layout.nav.home', roles: ['admin', 'organization', 'user'] },
  { to: '/requests', label: 'layout.nav.requests', roles: ['admin', 'organization', 'user'] },
  { to: '/requests/new', label: 'layout.nav.create', roles: ['user'] },
  { to: '/organization', label: 'layout.nav.workspace', roles: ['organization'] },
  { to: '/organizations', label: 'layout.nav.organizations', roles: ['admin'] },
  { to: '/catalog', label: 'layout.nav.catalog', roles: ['admin'] },
  { to: '/analytics', label: 'layout.nav.analytics', roles: ['admin'] },
];

export const AppShell = ({ user, onLogout: _onLogout }: AppShellProps) => {
  const location = useLocation();
  const { language, setLanguage, t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { pushToast } = useToast();
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);
  const cityMenuRef = useRef<HTMLDivElement | null>(null);

  const availableNavigation = useMemo(
    () => navigation.filter((item) => item.roles.includes(user.role)),
    [user.role],
  );

  const selectedCity = cities.find((city) => city.id === selectedCityId) ?? null;
  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('');

  useEffect(() => {
    let active = true;

    const loadCities = async () => {
      try {
        const items = await api.locations.cities.list();

        if (active) {
          setCities(items);
        }
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

      if (languageMenuRef.current && target && !languageMenuRef.current.contains(target)) {
        setIsLanguageMenuOpen(false);
      }

      if (cityMenuRef.current && target && !cityMenuRef.current.contains(target)) {
        setIsCityMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    setIsLanguageMenuOpen(false);
    setIsCityMenuOpen(false);
  }, [location.pathname]);

  const isNavItemActive = (path: string) => {
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

  return (
    <div className="shell">
      <header className="app-header">
        <div className="app-header__left">
          <NavLink to="/" className="app-header__brand">
            AIQALA
          </NavLink>

          <nav className="app-header__nav" aria-label="Main navigation">
            {availableNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={() => `app-header__link ${isNavItemActive(item.to) ? 'app-header__link--active' : ''}`}
              >
                {item.label.includes('.') ? t(item.label) : item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="app-header__right">
          <div className="app-header__menu-wrap" ref={languageMenuRef}>
            <button
              type="button"
              className={`app-header__icon-button ${isLanguageMenuOpen ? 'app-header__icon-button--active' : ''}`}
              aria-label={t('layout.changeLanguage')}
              title={LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ?? t('layout.changeLanguage')}
              onClick={() => setIsLanguageMenuOpen((current) => !current)}
            >
              <Languages size={18} />
            </button>

            {isLanguageMenuOpen ? (
              <div className="app-header__menu">
                {LANGUAGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`app-header__menu-item ${language === option.value ? 'app-header__menu-item--active' : ''}`}
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

          <div className="app-header__menu-wrap" ref={cityMenuRef}>
            <button
              type="button"
              className={`app-header__icon-button ${isCityMenuOpen ? 'app-header__icon-button--active' : ''}`}
              aria-label={t('layout.selectCity')}
              title={selectedCity?.name ?? t('common.allCities')}
              onClick={() => setIsCityMenuOpen((current) => !current)}
            >
              <MapPin size={18} />
            </button>

            {isCityMenuOpen ? (
              <div className="app-header__menu app-header__menu--right">
                <button
                  type="button"
                  className={`app-header__menu-item ${selectedCityId === null ? 'app-header__menu-item--active' : ''}`}
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
                    className={`app-header__menu-item ${selectedCityId === city.id ? 'app-header__menu-item--active' : ''}`}
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

          <button
            type="button"
            className="app-header__icon-button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('layout.switchToLight') : t('layout.switchToDark')}
            title={theme === 'dark' ? t('layout.switchToLight') : t('layout.switchToDark')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <NavLink
            to="/notifications"
            className={() => `app-header__icon-button ${isNavItemActive('/notifications') ? 'app-header__icon-button--active' : ''}`}
            aria-label={t('layout.notifications')}
            title={t('layout.notifications')}
          >
            <Bell size={18} />
          </NavLink>

          <NavLink
            to="/profile"
            className={() => `app-header__profile ${isNavItemActive('/profile') ? 'app-header__profile--active' : ''}`}
            aria-label={t('layout.nav.profile')}
            title={t('layout.nav.profile')}
          >
            {user.avatarUrl ? (
              <img src={resolveFileUrl(user.avatarUrl)} alt={user.fullName} className="app-header__avatar-image" />
            ) : (
              <span className="app-header__avatar-fallback">
                {initials || <UserRound size={18} />}
              </span>
            )}
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
  );
};
