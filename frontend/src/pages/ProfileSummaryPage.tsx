import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ImageUp, PencilLine, Trash2, X } from 'lucide-react';

import type { AppShellOutletContext } from '../components/layout/AppShellBare';
import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/Fields';
import { useAuth } from '../context/auth-context';
import { useTranslation } from '../context/language-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { formatRoleLabel, resolveFileUrl } from '../lib/format';

export const ProfileSummaryPage = () => {
  const { user, setUser } = useAuth();
  const { t } = useTranslation();
  const { pushToast } = useToast();
  const { selectedCity } = useOutletContext<AppShellOutletContext>();
  const [isEditing, setIsEditing] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm({
      fullName: user.fullName,
      email: user.email,
      currentPassword: '',
      newPassword: '',
    });
  }, [user?.email, user?.fullName]);

  useEffect(() => {
    if (!isEditing && !isAvatarModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsEditing(false);
        setIsAvatarModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAvatarModalOpen, isEditing]);

  if (!user) {
    return null;
  }

  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('');

  const uploadAvatarFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setAvatarBusy(true);

    try {
      const updated = await api.users.uploadAvatar(file);
      setUser(updated);
      setIsAvatarModalOpen(false);

      pushToast({
        tone: 'success',
        title: t('profile.avatarUpdatedTitle'),
        description: t('profile.avatarUpdatedDescription'),
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('profile.avatarUpdateFailed'),
        description: getErrorMessage(error),
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    await uploadAvatarFile(file);
  };

  const deleteAvatar = async () => {
    setAvatarBusy(true);

    try {
      const updated = await api.users.deleteAvatar();
      setUser(updated);
      setIsAvatarModalOpen(false);

      pushToast({
        tone: 'success',
        title: t('profile.avatarDeletedTitle'),
        description: t('profile.avatarDeletedDescription'),
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('profile.avatarDeleteFailed'),
        description: getErrorMessage(error),
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    try {
      const updated = await api.users.updateMe({
        fullName: form.fullName,
        email: form.email,
        currentPassword: form.currentPassword || undefined,
        newPassword: form.newPassword || undefined,
      });

      setUser(updated);
      setForm({
        fullName: updated.fullName,
        email: updated.email,
        currentPassword: '',
        newPassword: '',
      });
      setIsEditing(false);

      pushToast({
        tone: 'success',
        title: t('profile.updateSuccessTitle'),
        description: t('profile.updateSuccessDescription'),
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('profile.updateFailed'),
        description: getErrorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <section className="profile-hero glass-card">
        <div className="profile-hero__avatar-wrap">
          <div className="profile-hero__avatar">
            {user.avatarUrl ? <img src={resolveFileUrl(user.avatarUrl)} alt={user.fullName} /> : initials || 'U'}
          </div>
          <input
            ref={avatarInputRef}
            className="profile-hero__file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={uploadAvatar}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="profile-hero__upload-button"
            onClick={() => setIsAvatarModalOpen(true)}
            disabled={avatarBusy}
          >
            <ImageUp size={15} strokeWidth={1.9} />
            <span>{t('profile.changePhoto')}</span>
          </Button>
        </div>
        <div className="profile-hero__body">
          <h1 className="profile-hero__name">{user.fullName}</h1>
          <div className="profile-hero__meta">
            <span className="profile-hero__pill">{formatRoleLabel(user.role)}</span>
            <span className="profile-hero__pill">{selectedCity?.name ?? t('profile.selectedCityFallback')}</span>
          </div>
        </div>
      </section>

      <section className="profile-sheet glass-card">
        <div className="profile-sheet__header">
          <h2>{t('profile.accountTitle')}</h2>
          <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
            <PencilLine size={15} strokeWidth={1.9} />
            <span>{t('common.edit')}</span>
          </Button>
        </div>

        <div className="profile-sheet__grid">
          <div className="profile-sheet__item">
            <span>{t('common.email')}</span>
            <strong>{user.email}</strong>
          </div>
          <div className="profile-sheet__item">
            <span>{t('common.role')}</span>
            <strong>{formatRoleLabel(user.role)}</strong>
          </div>
          <div className="profile-sheet__item">
            <span>{t('common.selectedCity')}</span>
            <strong>{selectedCity?.name ?? t('profile.selectedCityFallback')}</strong>
          </div>
          <div className="profile-sheet__item">
            <span>{t('common.status')}</span>
            <strong>{user.isActive === false ? t('profile.inactiveState') : t('profile.activeState')}</strong>
          </div>
          <div className="profile-sheet__item">
            <span>{t('common.accountId')}</span>
            <strong>{user.id}</strong>
          </div>
          <div className="profile-sheet__item">
            <span>{t('common.organizationId')}</span>
            <strong>{user.organizationId ?? t('common.no')}</strong>
          </div>
        </div>

      </section>

      {isAvatarModalOpen ? (
        <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-avatar-modal-title">
          <button
            type="button"
            className="profile-modal__backdrop"
            aria-label={t('profile.closeModal')}
            onClick={() => setIsAvatarModalOpen(false)}
          />
          <section className="profile-modal__card profile-avatar-modal glass-card">
            <div className="profile-modal__header">
              <h3 id="profile-avatar-modal-title">{t('profile.avatarModalTitle')}</h3>
              <button type="button" className="profile-modal__close" onClick={() => setIsAvatarModalOpen(false)} aria-label={t('common.close')}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="profile-avatar-modal__body">
              <div className="profile-avatar-modal__preview">
                {user.avatarUrl ? <img src={resolveFileUrl(user.avatarUrl)} alt={user.fullName} /> : initials || 'U'}
              </div>
              <div className="profile-avatar-modal__actions">
                <Button
                  type="button"
                  variant="secondary"
                  className="profile-avatar-modal__button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarBusy}
                >
                  <ImageUp size={16} strokeWidth={1.9} />
                  <span>{avatarBusy ? t('profile.uploading') : t('profile.changeAnotherPhoto')}</span>
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="profile-avatar-modal__button"
                  onClick={deleteAvatar}
                  disabled={avatarBusy || !user.avatarUrl}
                >
                  <Trash2 size={16} strokeWidth={1.9} />
                  <span>{t('profile.deletePhoto')}</span>
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {isEditing ? (
        <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
          <button type="button" className="profile-modal__backdrop" aria-label={t('profile.closeModal')} onClick={() => setIsEditing(false)} />
          <section className="profile-modal__card glass-card">
            <div className="profile-modal__header">
              <h3 id="profile-modal-title">{t('profile.accountTitle')}</h3>
              <button type="button" className="profile-modal__close" onClick={() => setIsEditing(false)} aria-label={t('common.close')}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <form className="profile-modal__form" onSubmit={submit}>
              <InputField
                label={t('profile.accountName')}
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                required
                minLength={2}
              />
              <InputField
                label={t('common.email')}
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
              <InputField
                label={t('common.currentPassword')}
                type="password"
                value={form.currentPassword}
                onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
              />
              <InputField
                label={t('common.newPassword')}
                type="password"
                value={form.newPassword}
                onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
                minLength={8}
              />
              <div className="profile-modal__actions">
                <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                  {t('common.close')}
                </Button>
                <Button type="submit" busy={busy}>
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
};
