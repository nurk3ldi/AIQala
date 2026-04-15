import { useEffect, useState } from 'react';

import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/Fields';
import { LoadingState } from '../components/ui/LoadingState';
import { useAuth } from '../context/auth-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { formatDateTime, formatRoleLabel } from '../lib/format';
import type { AuthUser } from '../types/api';

export const ProfilePage = () => {
  const { setUser } = useAuth();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const nextProfile = await api.users.me();

        if (!active) {
          return;
        }

        setProfile(nextProfile);
        setForm((current) => ({
          ...current,
          fullName: nextProfile.fullName,
          email: nextProfile.email,
        }));
      } catch (error) {
        if (active) {
          pushToast({
            tone: 'error',
            title: 'Профиль жүктелмеді',
            description: getErrorMessage(error),
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [pushToast]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    try {
      const updated = await api.users.updateMe({
        fullName: form.fullName,
        email: form.email,
        currentPassword: form.currentPassword || undefined,
        newPassword: form.newPassword || undefined,
      });

      setProfile(updated);
      setUser(updated);
      setForm((current) => ({
        ...current,
        currentPassword: '',
        newPassword: '',
      }));
      pushToast({
        tone: 'success',
        title: 'Профиль жаңартылды',
        description: 'Аккаунттағы өзгерістер сақталды.',
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'Жаңарту сәтсіз аяқталды',
        description: getErrorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <LoadingState label="Профиль жүктеліп жатыр..." />;
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="page">
      <section className="page-header glass-card">
        <div>
          <span className="eyebrow">Жеке дерек</span>
          <h1>Профиль және қолжетімділік баптауы</h1>
          <p>Аты-жөніңізді, email адресіңізді және құпиясөзіңізді жаңарта аласыз. Құпиясөз ауысса, токен нұсқасы автоматты түрде жаңарады.</p>
        </div>
      </section>

      <section className="split-layout">
        <article className="panel glass-card">
          <div className="panel__header">
            <span className="section-title__eyebrow">Аккаунт ақпараты</span>
            <h3>{profile.fullName}</h3>
          </div>
          <div className="kv-grid">
            <div className="kv-item">
              <span>Email</span>
              <strong>{profile.email}</strong>
            </div>
            <div className="kv-item">
              <span>Рөл</span>
              <strong>{formatRoleLabel(profile.role)}</strong>
            </div>
            <div className="kv-item">
              <span>Құрылған уақыты</span>
              <strong>{formatDateTime(profile.createdAt)}</strong>
            </div>
            <div className="kv-item">
              <span>Соңғы жаңарту</span>
              <strong>{formatDateTime(profile.updatedAt)}</strong>
            </div>
          </div>
        </article>

        <article className="panel glass-card">
          <div className="panel__header">
            <span className="section-title__eyebrow">Профильді жаңарту</span>
            <h3>Жеке мәліметтер</h3>
          </div>
          <form className="page" onSubmit={submit}>
            <InputField
              label="Толық аты-жөні"
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              required
              minLength={2}
            />
            <InputField
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
            <InputField
              label="Ағымдағы құпиясөз"
              type="password"
              hint="Тек құпиясөзді өзгерткіңіз келсе ғана қажет."
              value={form.currentPassword}
              onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
            />
            <InputField
              label="Жаңа құпиясөз"
              type="password"
              hint="Қазіргі құпиясөзді сақтағыңыз келсе, бос қалдырыңыз."
              value={form.newPassword}
              onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
              minLength={8}
            />
            <Button type="submit" busy={busy}>
              Өзгерістерді сақтау
            </Button>
          </form>
        </article>
      </section>
    </div>
  );
};
