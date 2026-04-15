import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { PaginationControls } from '../components/ui/PaginationControls';
import { SelectField } from '../components/ui/Fields';
import { useAuth } from '../context/auth-context';
import { useTranslation } from '../context/language-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import {
  formatDateTime,
  formatPriorityLabel,
  formatStatusLabel,
  priorityTone,
  statusTone,
} from '../lib/format';
import type { Category, City, District, IssueRequest, Organization, PaginatedResult, RequestFilters } from '../types/api';

export const RequestsPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PaginatedResult<IssueRequest> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filters, setFilters] = useState<RequestFilters>({
    page: 1,
    limit: 10,
    status: '',
    categoryId: '',
    cityId: '',
    districtId: '',
    organizationId: '',
  });

  useEffect(() => {
    void Promise.all([
      api.categories.list().then(setCategories),
      api.locations.cities.list().then(setCities),
      user?.role === 'admin' ? api.organizations.list({ page: 1, limit: 100 }).then((response) => setOrganizations(response.items)) : Promise.resolve(),
    ]).catch(() => undefined);
  }, [user?.role]);

  useEffect(() => {
    if (!filters.cityId) {
      setDistricts([]);
      setFilters((current) => (current.districtId ? { ...current, districtId: '' } : current));
      return;
    }

    let active = true;

    void api.locations.districts
      .list({ cityId: filters.cityId })
      .then((items) => {
        if (active) {
          setDistricts(items);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [filters.cityId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user) {
        return;
      }

      setLoading(true);

      try {
        const query = {
          ...filters,
          page: filters.page ?? 1,
          limit: filters.limit ?? 10,
        };
        const nextResult = user.role === 'user' ? await api.requests.listMine(query) : await api.requests.list(query);

        if (active) {
          setResult(nextResult);
        }
      } catch (error) {
        if (active) {
          pushToast({
            tone: 'error',
            title: t('requestsPage.loadFailed'),
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
  }, [filters, pushToast, t, user]);

  if (!user) {
    return null;
  }

  if (loading && !result) {
    return <LoadingState label={t('requestsPage.loading')} />;
  }

  return (
    <div className="page">
      <section className="page-header glass-card">
        <div>
          <span className="eyebrow">{t('requestsPage.eyebrow')}</span>
          <h1>{user.role === 'user' ? t('requestsPage.myTitle') : t('requestsPage.listTitle')}</h1>
          <p>{t('requestsPage.description')}</p>
        </div>
        <div className="page-header__actions">
          {user.role === 'user' ? (
            <Link className="button button--primary button--md" to="/requests/new">
              {t('requestsPage.newRequest')}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="panel glass-card">
        <div className="grid-3">
          <SelectField
            label={t('common.status')}
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as RequestFilters['status'], page: 1 }))}
          >
            <option value="">{t('requestFilters.allStatuses')}</option>
            <option value="accepted">{t('requestStatus.accepted')}</option>
            <option value="in_progress">{t('requestStatus.in_progress')}</option>
            <option value="resolved">{t('requestStatus.resolved')}</option>
          </SelectField>
          <SelectField
            label={t('common.category')}
            value={filters.categoryId}
            onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value, page: 1 }))}
          >
            <option value="">{t('requestFilters.allCategories')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label={t('common.city')}
            value={filters.cityId}
            onChange={(event) => setFilters((current) => ({ ...current, cityId: event.target.value, page: 1 }))}
          >
            <option value="">{t('requestFilters.allCities')}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="grid-3">
          <SelectField
            label={t('common.district')}
            value={filters.districtId}
            disabled={!filters.cityId}
            onChange={(event) => setFilters((current) => ({ ...current, districtId: event.target.value, page: 1 }))}
          >
            <option value="">{t('requestFilters.allDistricts')}</option>
            {districts.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </SelectField>
          {user.role === 'admin' ? (
            <SelectField
              label={t('common.organization')}
              value={filters.organizationId}
              onChange={(event) => setFilters((current) => ({ ...current, organizationId: event.target.value, page: 1 }))}
            >
              <option value="">{t('requestFilters.allOrganizations')}</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </SelectField>
          ) : (
            <div />
          )}
          <div className="toolbar">
            <button
              type="button"
              className="button button--ghost button--md"
              onClick={() =>
                setFilters({
                  page: 1,
                  limit: 10,
                  status: '',
                  categoryId: '',
                  cityId: '',
                  districtId: '',
                  organizationId: '',
                })
              }
            >
              {t('requestsPage.clearFilters')}
            </button>
          </div>
        </div>
      </section>

      <section className="panel glass-card">
        {!result?.items.length ? (
          <EmptyState title={t('requestsPage.emptyTitle')} description={t('requestsPage.emptyDescription')} />
        ) : (
          <div className="list">
            {result.items.map((request) => (
              <article key={request.id} className="record-card">
                <div className="record-card__header">
                  <div className="record-card__title">
                    <h4>{request.title}</h4>
                    <span className="muted-text">
                      {request.category?.name ?? t('requestsPage.noCategory')} • {request.city?.name ?? t('requestsPage.unknownCity')}
                      {request.district?.name ? ` / ${request.district.name}` : ''}
                    </span>
                  </div>
                  <div className="record-card__meta">
                    <Badge tone={statusTone(request.status)}>{formatStatusLabel(request.status)}</Badge>
                    <Badge tone={priorityTone(request.priority)}>{formatPriorityLabel(request.priority)}</Badge>
                  </div>
                </div>
                <p className="muted-text">{request.description}</p>
                <div className="record-card__footer">
                  <span className="muted-text">
                    {request.organization?.name
                      ? t('requestsPage.assignedToOrganization', { name: request.organization.name })
                      : t('requestsPage.notAssigned')}{' '}
                    • {formatDateTime(request.createdAt)}
                  </span>
                  <Link className="button button--secondary button--sm" to={`/requests/${request.id}`}>
                    {t('common.details')}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        <PaginationControls
          page={result?.meta.page ?? (filters.page ?? 1)}
          totalPages={result?.meta.totalPages ?? 1}
          onChange={(page) => setFilters((current) => ({ ...current, page }))}
        />
      </section>
    </div>
  );
};
