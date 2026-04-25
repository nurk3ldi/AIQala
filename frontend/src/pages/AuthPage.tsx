import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CSSProperties } from 'react';

import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/Fields';
import { useAuth } from '../context/auth-context';
import { useTranslation } from '../context/language-context';
import { useToast } from '../context/toast-context';
import { getErrorMessage } from '../lib/errors';

type AuthMode = 'login' | 'register';

const logoGradientStyle = (offset?: string): CSSProperties => ({
  stopColor: offset ? `color-mix(in srgb, var(--accent) ${offset}, white 28%)` : 'var(--accent)',
});

export const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register } = useAuth();
  const { t } = useTranslation();
  const { pushToast } = useToast();
  const [mode, setMode] = useState<AuthMode>(searchParams.get('mode') === 'register' ? 'register' : 'login');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const confirmPasswordError =
    mode === 'register' && form.confirmPassword && form.password !== form.confirmPassword
      ? t('auth.passwordMismatch')
      : undefined;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === 'register' && form.password !== form.confirmPassword) {
      pushToast({
        tone: 'error',
        title: t('auth.registerFailed'),
        description: t('auth.registerFailedDescription'),
      });
      return;
    }

    setBusy(true);

    try {
      if (mode === 'login') {
        await login({
          email: form.email,
          password: form.password,
        });

        pushToast({
          tone: 'success',
          title: t('auth.loginSuccessTitle'),
          description: t('auth.loginSuccessDescription'),
        });
      } else {
        await register({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
        });
        pushToast({
          tone: 'success',
          title: t('auth.registerSuccessTitle'),
          description: t('auth.registerSuccessDescription'),
        });
      }

      navigate('/');
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('auth.submitFailedTitle'),
        description: getErrorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-shell">
        <section className="auth-panel glass-card">
          <div className="auth-brand">
            <span className="auth-brand__mark" aria-hidden="true">
              <svg viewBox="0 0 48 48" className="auth-brand__logo" role="presentation">
                <defs>
                  <linearGradient id="auth-logo-fill" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop style={logoGradientStyle()} />
                    <stop offset="0.55" style={logoGradientStyle('72%')} />
                    <stop offset="1" style={{ stopColor: 'var(--accent-alt)' }} />
                  </linearGradient>
                </defs>
                <rect x="6" y="6" width="36" height="36" rx="13" fill="url(#auth-logo-fill)" />
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
            <h1 className="auth-brand__title">AIQala</h1>
          </div>

          <div className="segmented">
            <button
              type="button"
              className={`button button--ghost button--sm ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
            >
              {t('auth.login')}
            </button>
            <button
              type="button"
              className={`button button--ghost button--sm ${mode === 'register' ? 'active' : ''}`}
              onClick={() => setMode('register')}
            >
              {t('auth.register')}
            </button>
          </div>

          <form className="page auth-form" onSubmit={submit}>
            {mode === 'register' ? (
              <InputField
                label=""
                placeholder={t('auth.fullNamePlaceholder')}
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                required
                minLength={2}
              />
            ) : null}
            <InputField
              label=""
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
            <InputField
              label=""
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
              minLength={8}
            />
            {mode === 'register' ? (
              <InputField
                label=""
                type="password"
                placeholder={t('auth.confirmPasswordPlaceholder')}
                value={form.confirmPassword}
                onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                error={confirmPasswordError}
                required
                minLength={8}
              />
            ) : null}
            <Button type="submit" size="lg" block busy={busy}>
              {mode === 'login' ? t('auth.loginSubmit') : t('auth.registerSubmit')}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
};
