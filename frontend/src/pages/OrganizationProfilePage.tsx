import { useEffect, useState } from 'react';

import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { useTranslation } from '../context/language-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { formatDateTime } from '../lib/format';
import type { Organization } from '../types/api';

export const OrganizationProfilePage = () => {
  const { t } = useTranslation();
  const { pushToast } = useToast();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const result = await api.organizations.me();

        if (active) {
          setOrganization(result);
        }
      } catch (error) {
        if (active) {
          pushToast({
            tone: 'error',
            title: t('organizationProfile.loadFailed'),
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
  }, [pushToast, t]);

  if (loading) {
    return <LoadingState label={t('organizationProfile.loading')} />;
  }

  if (!organization) {
    return null;
  }

  return (
    <div className="page">
      <section className="page-header glass-card">
        <div>
          <span className="eyebrow">{t('organizationProfile.eyebrow')}</span>
          <h1>{organization.name}</h1>
          <p>{organization.description ?? t('organizationProfile.descriptionFallback')}</p>
        </div>
        <div className="page-header__actions">
          <Badge tone={organization.isActive ? 'success' : 'danger'}>
            {organization.isActive ? t('common.active') : t('common.disabled')}
          </Badge>
        </div>
      </section>

      <section className="split-layout">
        <article className="panel glass-card">
          <div className="panel__header">
            <span className="section-title__eyebrow">{t('organizationProfile.coverageEyebrow')}</span>
            <h3>{t('organizationProfile.profileTitle')}</h3>
          </div>
          <div className="kv-grid">
            <div className="kv-item">
              <span>{t('common.city')}</span>
              <strong>{organization.city?.name ?? t('common.unknown')}</strong>
            </div>
            <div className="kv-item">
              <span>{t('common.district')}</span>
              <strong>{organization.district?.name ?? t('organizationProfile.allDistricts')}</strong>
            </div>
            <div className="kv-item">
              <span>{t('common.address')}</span>
              <strong>{organization.address}</strong>
            </div>
            <div className="kv-item">
              <span>{t('common.phone')}</span>
              <strong>{organization.phone ?? t('common.notSpecified')}</strong>
            </div>
            <div className="kv-item">
              <span>{t('common.createdAt')}</span>
              <strong>{formatDateTime(organization.createdAt)}</strong>
            </div>
            <div className="kv-item">
              <span>{t('organizations.accessEyebrow')}</span>
              <strong>{organization.accounts?.length ?? 0}</strong>
            </div>
          </div>

          <div className="panel">
            <div className="panel__header">
              <span className="section-title__eyebrow">{t('organizationProfile.categoriesEyebrow')}</span>
              <h3>{t('organizationProfile.categoriesTitle')}</h3>
            </div>
            <div className="pill-group">
              {(organization.categories ?? []).length ? (
                organization.categories!.map((category) => <Badge key={category.id}>{category.name}</Badge>)
              ) : (
                <span className="muted-text">{t('organizationProfile.noCategories')}</span>
              )}
            </div>
          </div>
        </article>

        <article className="panel glass-card">
          <div className="panel__header">
            <span className="section-title__eyebrow">{t('organizationProfile.accountsEyebrow')}</span>
            <h3>{t('organizationProfile.accountsTitle')}</h3>
          </div>
          {organization.accounts?.length ? (
            <div className="list">
              {organization.accounts.map((account) => (
                <article key={account.id} className="record-card">
                  <div className="record-card__header">
                    <div className="record-card__title">
                      <h4>{account.fullName}</h4>
                      <span className="muted-text">{account.email}</span>
                    </div>
                    <Badge tone={account.isActive ? 'success' : 'danger'}>
                      {account.isActive ? t('common.active') : t('common.disabled')}
                    </Badge>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title={t('organizationProfile.emptyTitle')} description={t('organizationProfile.emptyDescription')} />
          )}
        </article>
      </section>
    </div>
  );
};
