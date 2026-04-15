import { NavLink, Outlet } from 'react-router-dom';

import { useTheme } from '../../context/theme-context';
import { formatRoleLabel } from '../../lib/format';
import type { AuthUser, UserRole } from '../../types/api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface AppShellProps {
  user: AuthUser;
  onLogout: () => void;
}

interface NavigationItem {
  to: string;
  label: string;
  caption: string;
  icon: string;
  roles: UserRole[];
}

const navigation: NavigationItem[] = [
  { to: '/', label: 'Dashboard', caption: 'Realtime platform snapshot', icon: '◫', roles: ['admin', 'organization', 'user'] },
  { to: '/requests', label: 'Requests', caption: 'Operational issue stream', icon: '◎', roles: ['admin', 'organization', 'user'] },
  { to: '/requests/new', label: 'Create', caption: 'Create a fresh civic report', icon: '＋', roles: ['user'] },
  { to: '/organization', label: 'Workspace', caption: 'Organization profile and scope', icon: '◧', roles: ['organization'] },
  { to: '/organizations', label: 'Operators', caption: 'Partners and operator accounts', icon: '◇', roles: ['admin'] },
  { to: '/catalog', label: 'Catalog', caption: 'Cities, districts, categories', icon: '▦', roles: ['admin'] },
  { to: '/analytics', label: 'Analytics', caption: 'Performance and throughput', icon: '◌', roles: ['admin'] },
  { to: '/ai', label: 'AI Studio', caption: 'Moderation and triage tools', icon: '✦', roles: ['admin', 'organization', 'user'] },
  { to: '/notifications', label: 'Updates', caption: 'Citizen-facing updates', icon: '◍', roles: ['admin', 'organization', 'user'] },
  { to: '/profile', label: 'Profile', caption: 'Identity and access settings', icon: '◉', roles: ['admin', 'organization', 'user'] },
];

export const AppShell = ({ user, onLogout }: AppShellProps) => {
  const { theme, toggleTheme } = useTheme();
  const availableNavigation = navigation.filter((item) => item.roles.includes(user.role));
  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="shell">
      <aside className="shell__sidebar glass-card">
        <div className="brand-block">
          <div className="brand-block__badge">Control Surface</div>
          <h1>{import.meta.env.VITE_APP_NAME ?? 'AIQala'}.</h1>
          <p>Issue tracking workspace for citizens, operators, and city administrators.</p>
        </div>

        <nav className="sidebar-nav">
          {availableNavigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
            >
              <span className="sidebar-link__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="sidebar-link__body">
                <strong>{item.label}</strong>
                <span>{item.caption}</span>
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-chip">
            <div className="profile-chip__avatar">{initials || 'U'}</div>
            <div className="profile-chip__body">
              <strong>{user.fullName}</strong>
              <span>{formatRoleLabel(user.role)}</span>
            </div>
          </div>
          <div className="sidebar-footer__actions">
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
            <Button variant="secondary" size="sm" onClick={onLogout}>
              Log out
            </Button>
          </div>
        </div>
      </aside>

      <div className="shell__content">
        <header className="topbar glass-card">
          <div>
            <span className="eyebrow">Live workspace</span>
            <h2>{user.fullName}</h2>
          </div>
          <div className="topbar__meta topbar__meta--compact">
            <span className="topbar-chip">{user.email}</span>
            <span className="topbar-chip">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
            <Badge tone="neutral">{formatRoleLabel(user.role)}</Badge>
          </div>
        </header>

        <main className="shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
