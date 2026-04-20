import {
  CircleAlert,
  CircleCheckBig,
  Clock3,
  Eye,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { InputField, SelectField, TextareaField } from '../components/ui/Fields';
import { PaginationControls } from '../components/ui/PaginationControls';
import { useAuth } from '../context/auth-context';
import { useTranslation } from '../context/language-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import {
  formatCompactNumber,
  formatDateTime,
  formatPriorityLabel,
  formatStatusLabel,
  priorityTone,
  statusTone,
} from '../lib/format';
import type { Language } from '../lib/i18n';
import type { Category, City, District, IssueRequest, Organization, PaginatedResult, RequestStatus, UserRole } from '../types/api';

type RequestFilterState = {
  page: number;
  limit: number;
  status: RequestStatus | '';
  categoryId: string;
  cityId: string;
  districtId: string;
  organizationId: string;
};

type RequestEditDraft = {
  title: string;
  description: string;
  categoryId: string;
  cityId: string;
  districtId: string;
  latitude: string;
  longitude: string;
  priority: IssueRequest['priority'];
};

type ActiveFilterField = 'status' | 'categoryId' | 'cityId' | 'districtId' | 'organizationId';

const createDefaultFilters = (limit = 10): RequestFilterState => ({
  page: 1,
  limit,
  status: '',
  categoryId: '',
  cityId: '',
  districtId: '',
  organizationId: '',
});

const REQUESTS_UI: Record<
  Language,
  {
    subtitle: Record<UserRole, string>;
    resultCount: string;
    visibleCount: string;
    assignedCount: string;
    urgentCount: string;
    filterTitle: string;
    filterAction: string;
    searchPlaceholder: string;
    applyFilters: string;
    clearAll: string;
    distributionTitle: string;
    categoryTitle: string;
    noData: string;
    activeFiltersTitle: string;
    aiLabel: string;
    statsAll: string;
    cancelAction: string;
  }
> = {
  kk: {
    subtitle: {
      user: 'Өтінімдеріңізді бір экраннан шолып, керегін бірден ашуға болады.',
      organization: 'Қарауыңыздағы өтінімдерді күйі мен басымдығына қарай ықшам бақылауға болады.',
      admin: 'Қалалық өтінім ағынын визуалды жұмыс кеңістігінде фильтрлеп көресіз.',
    },
    resultCount: 'Нәтиже',
    visibleCount: 'Экранда',
    assignedCount: 'Тағайындалған',
    urgentCount: 'Шұғыл',
    filterTitle: 'Өтінім сүзгілері',
    filterAction: 'Сүзгі',
    searchPlaceholder: 'Өтінімді іздеу',
    applyFilters: 'Қолдану',
    clearAll: 'Тазалау',
    distributionTitle: 'Статус көрінісі',
    categoryTitle: 'Санаттар көрінісі',
    noData: 'Дерек жоқ',
    activeFiltersTitle: 'Белсенді сүзгілер',
    aiLabel: 'AI',
    statsAll: 'Барлығы',
    cancelAction: 'Бас тарту',
  },
  ru: {
    subtitle: {
      user: 'Просматривайте свои заявки в одном рабочем экране и быстро открывайте нужную карточку.',
      organization: 'Компактно контролируйте назначенные заявки по статусу и приоритету.',
      admin: 'Фильтруйте поток городских заявок в визуальном рабочем пространстве.',
    },
    resultCount: 'Результат',
    visibleCount: 'На экране',
    assignedCount: 'Назначено',
    urgentCount: 'Срочные',
    filterTitle: 'Фильтры заявок',
    filterAction: 'Фильтр',
    searchPlaceholder: 'Поиск заявки',
    applyFilters: 'Применить',
    clearAll: 'Сбросить',
    distributionTitle: 'Срез по статусам',
    categoryTitle: 'Срез по категориям',
    noData: 'Нет данных',
    activeFiltersTitle: 'Активные фильтры',
    aiLabel: 'AI',
    statsAll: 'Все',
    cancelAction: 'Отмена',
  },
  en: {
    subtitle: {
      user: 'Review your requests in one workspace and open the right card instantly.',
      organization: 'Monitor assigned requests in a compact visual flow by status and priority.',
      admin: 'Filter the city-wide request stream in a more visual operator workspace.',
    },
    resultCount: 'Matched',
    visibleCount: 'Visible',
    assignedCount: 'Assigned',
    urgentCount: 'Urgent',
    filterTitle: 'Request filters',
    filterAction: 'Filter',
    searchPlaceholder: 'Search requests',
    applyFilters: 'Apply',
    clearAll: 'Clear',
    distributionTitle: 'Status distribution',
    categoryTitle: 'Category split',
    noData: 'No data',
    activeFiltersTitle: 'Active filters',
    aiLabel: 'AI',
    statsAll: 'All',
    cancelAction: 'Cancel',
  },
};

const STATUS_ICONS = {
  accepted: CircleAlert,
  in_progress: Clock3,
  resolved: CircleCheckBig,
} satisfies Record<RequestStatus, typeof CircleAlert>;

export const RequestsWorkspacePage = () => {
  const { user } = useAuth();
  const { language, t } = useTranslation();
  const { pushToast } = useToast();
  const copy = REQUESTS_UI[language];

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PaginatedResult<IssueRequest> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filters, setFilters] = useState<RequestFilterState>(() => createDefaultFilters());
  const [filterDraft, setFilterDraft] = useState<RequestFilterState>(() => createDefaultFilters());
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editTarget, setEditTarget] = useState<IssueRequest | null>(null);
  const [editDraft, setEditDraft] = useState<RequestEditDraft | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editDistricts, setEditDistricts] = useState<District[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<IssueRequest | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    void Promise.all([
      api.categories.list().then(setCategories),
      api.locations.cities.list().then(setCities),
      user?.role === 'admin'
        ? api.organizations.list({ page: 1, limit: 100 }).then((response) => setOrganizations(response.items))
        : Promise.resolve(),
    ]).catch(() => undefined);
  }, [user?.role]);

  useEffect(() => {
    const currentCityId = filterModalOpen ? filterDraft.cityId : filters.cityId;

    if (!currentCityId) {
      setDistricts([]);
      return;
    }

    let active = true;

    void api.locations.districts
      .list({ cityId: currentCityId })
      .then((items) => {
        if (active) {
          setDistricts(items);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [filterDraft.cityId, filterModalOpen, filters.cityId]);

  useEffect(() => {
    const cityId = editDraft?.cityId;

    if (!cityId) {
      setEditDistricts([]);
      return;
    }

    let active = true;

    void api.locations.districts
      .list({ cityId })
      .then((items) => {
        if (active) {
          setEditDistricts(items);
        }
      })
      .catch(() => {
        if (active) {
          setEditDistricts([]);
        }
      });

    return () => {
      active = false;
    };
  }, [editDraft?.cityId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user) {
        return;
      }

      setLoading(true);

      try {
        const nextResult = user.role === 'user' ? await api.requests.listMine(filters) : await api.requests.list(filters);

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
  }, [filters, pushToast, reloadKey, t, user]);

  if (!user) {
    return null;
  }

  if (loading && !result) {
    return (
      <div className="page">
        <section className="requests-minimal" aria-label="Requests workspace" />
      </div>
    );
  }

  const requests = result?.items ?? [];
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleRequests = normalizedSearch
    ? requests.filter((request) =>
        [
          request.title,
          request.description,
          request.category?.name,
          request.city?.name,
          request.district?.name,
          request.organization?.name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
      )
    : requests;
  const visibleTotal = visibleRequests.length;

  const statusCounts: Record<RequestStatus, number> = {
    accepted: 0,
    in_progress: 0,
    resolved: 0,
  };

  for (const request of visibleRequests) {
    statusCounts[request.status] += 1;
  }

  const activeFilterCount = [filters.status, filters.categoryId, filters.cityId, filters.districtId, filters.organizationId].filter(Boolean).length;
  const title = user.role === 'user' ? t('requestsPage.myTitle') : t('requestsPage.listTitle');

  const statusTabs = [
    {
      key: 'all' as const,
      label: copy.statsAll,
      value: visibleTotal,
      icon: LayoutGrid,
      active: !filters.status,
      toneClassName: 'all',
    },
    {
      key: 'accepted' as const,
      label: formatStatusLabel('accepted'),
      value: statusCounts.accepted,
      icon: STATUS_ICONS.accepted,
      active: filters.status === 'accepted',
      toneClassName: 'accepted',
    },
    {
      key: 'in_progress' as const,
      label: formatStatusLabel('in_progress'),
      value: statusCounts.in_progress,
      icon: STATUS_ICONS.in_progress,
      active: filters.status === 'in_progress',
      toneClassName: 'in-progress',
    },
    {
      key: 'resolved' as const,
      label: formatStatusLabel('resolved'),
      value: statusCounts.resolved,
      icon: STATUS_ICONS.resolved,
      active: filters.status === 'resolved',
      toneClassName: 'resolved',
    },
  ];

  const activeFilters = [
    filters.status
      ? {
          key: 'status' as const,
          value: formatStatusLabel(filters.status),
        }
      : null,
    filters.categoryId
      ? {
          key: 'categoryId' as const,
          value: categories.find((category) => category.id === filters.categoryId)?.name ?? t('requestFilters.allCategories'),
        }
      : null,
    filters.cityId
      ? {
          key: 'cityId' as const,
          value: cities.find((city) => city.id === filters.cityId)?.name ?? t('requestFilters.allCities'),
        }
      : null,
    filters.districtId
      ? {
          key: 'districtId' as const,
          value: districts.find((district) => district.id === filters.districtId)?.name ?? t('requestFilters.allDistricts'),
        }
      : null,
    filters.organizationId
      ? {
          key: 'organizationId' as const,
          value: organizations.find((organization) => organization.id === filters.organizationId)?.name ?? t('requestFilters.allOrganizations'),
        }
      : null,
  ].filter(Boolean) as Array<{ key: ActiveFilterField; value: string }>;

  const organizationOptions = organizations.filter((organization) => !filterDraft.cityId || organization.cityId === filterDraft.cityId);

  const openFilterModal = () => {
    setFilterDraft({ ...filters });
    setFilterModalOpen(true);
  };

  const closeFilterModal = () => {
    setFilterDraft({ ...filters });
    setFilterModalOpen(false);
  };

  const applyDraftFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({
      ...filterDraft,
      page: 1,
      districtId: filterDraft.cityId ? filterDraft.districtId : '',
    });
    setFilterModalOpen(false);
  };

  const clearSingleFilter = (field: ActiveFilterField) => {
    setFilters((current) => {
      if (field === 'cityId') {
        return {
          ...current,
          cityId: '',
          districtId: '',
          page: 1,
        };
      }

      return {
        ...current,
        [field]: '',
        page: 1,
      };
    });
  };

  const openEditModal = (request: IssueRequest) => {
    setEditTarget(request);
    setEditDraft({
      title: request.title,
      description: request.description,
      categoryId: request.categoryId,
      cityId: request.cityId,
      districtId: request.districtId ?? '',
      latitude: request.latitude,
      longitude: request.longitude,
      priority: request.priority,
    });
  };

  const closeEditModal = () => {
    if (editBusy) {
      return;
    }

    setEditTarget(null);
    setEditDraft(null);
  };

  const submitEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editTarget || !editDraft) {
      return;
    }

    setEditBusy(true);

    try {
      await api.requests.update(editTarget.id, {
        title: editDraft.title,
        description: editDraft.description,
        categoryId: editDraft.categoryId,
        cityId: editDraft.cityId,
        districtId: editDraft.districtId || undefined,
        latitude: editDraft.latitude,
        longitude: editDraft.longitude,
        priority: editDraft.priority,
      });

      pushToast({
        tone: 'success',
        title: t('common.save'),
      });
      closeEditModal();
      setReloadKey((current) => current + 1);
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('common.edit'),
        description: getErrorMessage(error),
      });
    } finally {
      setEditBusy(false);
    }
  };

  const closeDeleteModal = () => {
    if (deleteBusy) {
      return;
    }

    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteBusy(true);

    try {
      await api.requests.remove(deleteTarget.id);
      pushToast({
        tone: 'success',
        title: t('requestDetail.deleteSuccessTitle'),
      });
      setDeleteTarget(null);
      setReloadKey((current) => current + 1);
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('requestDetail.deleteFailed'),
        description: getErrorMessage(error),
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="page">
      <section className="requests-minimal">
        <header className="requests-minimal__hero">
          <div className="requests-minimal__hero-copy">
            <strong>{title}</strong>
          </div>

          <div className="requests-minimal__hero-actions">
            <span className="requests-minimal__hero-count">{formatCompactNumber(visibleTotal)}</span>
            {user.role === 'user' ? (
              <Link className="button button--primary button--md requests-minimal__new-button" to="/requests/new">
                <Plus size={17} />
                <span>{t('requestsPage.newRequest')}</span>
              </Link>
            ) : null}
          </div>
        </header>

        <div className="requests-minimal__status-strip">
          {statusTabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                className={`requests-minimal__status-tab requests-minimal__status-tab--tone-${tab.toneClassName} ${tab.active ? 'requests-minimal__status-tab--active' : ''}`.trim()}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    page: 1,
                    status: tab.key === 'all' ? '' : current.status === tab.key ? '' : tab.key,
                  }))
                }
              >
                <span className="requests-minimal__status-tab-icon">
                  <Icon size={18} />
                </span>
                <span className="requests-minimal__status-tab-copy">
                  <strong>{tab.label}</strong>
                  <span>{formatCompactNumber(tab.value)}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="requests-minimal__toolbar">
          <label className="requests-minimal__search" aria-label={copy.searchPlaceholder}>
            <Search size={17} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
            />
          </label>

          <Button type="button" variant="secondary" className="requests-minimal__filter-button" onClick={openFilterModal}>
            <SlidersHorizontal size={17} />
            <span>{copy.filterAction}</span>
            {activeFilterCount ? <span className="requests-minimal__toolbar-count">{activeFilterCount}</span> : null}
          </Button>
        </div>

        {activeFilters.length ? (
          <div className="requests-minimal__active-filters">
            <span className="requests-minimal__active-filters-label">{copy.activeFiltersTitle}</span>
            {activeFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className="requests-minimal__filter-chip"
                onClick={() => clearSingleFilter(filter.key)}
              >
                <span>{filter.value}</span>
                <X size={13} />
              </button>
            ))}
          </div>
        ) : null}
        <section className="requests-minimal__list" aria-busy={loading}>
          {!visibleRequests.length ? (
            <EmptyState title={t('requestsPage.emptyTitle')} description={t('requestsPage.emptyDescription')} />
          ) : (
            <div className="requests-minimal__rows">
              {visibleRequests.map((request) => {
                const StatusIcon = STATUS_ICONS[request.status];

                return (
                  <article key={request.id} className={`requests-minimal__row requests-minimal__row--${request.status}`.trim()}>
                    <div className="requests-minimal__row-head">
                      <div className="requests-minimal__row-title-wrap">
                        <span className={`requests-minimal__row-status requests-minimal__row-status--${request.status}`.trim()}>
                          <StatusIcon size={18} />
                        </span>

                        <div className="requests-minimal__row-copy">
                          <div className="requests-minimal__row-title-line">
                            <h3>{request.title}</h3>
                            <div className="requests-minimal__row-badges">
                              <Badge tone={statusTone(request.status)}>{formatStatusLabel(request.status)}</Badge>
                              <Badge tone={priorityTone(request.priority)}>{formatPriorityLabel(request.priority)}</Badge>
                              {request.aiInsight ? <Badge tone="accent">{copy.aiLabel}</Badge> : null}
                              <span className="requests-minimal__row-date">
                                <Clock3 size={14} />
                                {formatDateTime(request.createdAt)}
                              </span>
                            </div>
                          </div>
                          <p>{request.description}</p>
                        </div>
                      </div>

                      <div className="requests-minimal__row-actions">
                        <Link
                          className="button button--secondary button--sm requests-minimal__icon-action"
                          to={`/requests/${request.id}`}
                          aria-label={t('common.details')}
                          title={t('common.details')}
                        >
                          <Eye size={15} />
                        </Link>

                        {(user.role === 'admin' || user.role === 'user') ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="requests-minimal__icon-action"
                            onClick={() => openEditModal(request)}
                            aria-label={t('common.edit')}
                            title={t('common.edit')}
                          >
                            <Pencil size={15} />
                          </Button>
                        ) : null}

                        {(user.role === 'admin' || user.role === 'user') ? (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            className="requests-minimal__icon-action"
                            onClick={() => setDeleteTarget(request)}
                            aria-label={t('common.delete')}
                            title={t('common.delete')}
                          >
                            <Trash2 size={15} />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <PaginationControls
            page={result?.meta.page ?? filters.page}
            totalPages={result?.meta.totalPages ?? 1}
            onChange={(page) => setFilters((current) => ({ ...current, page }))}
          />
        </section>

      </section>

      {filterModalOpen ? (
        <div className="profile-modal requests-filter-modal-shell" role="dialog" aria-modal="true" aria-label={copy.filterTitle}>
          <button
            type="button"
            className="profile-modal__backdrop"
            aria-label={copy.filterAction}
            onClick={closeFilterModal}
          />
          <article className="profile-modal__card glass-card requests-filter-modal">
            <div className="profile-modal__header">
              <h3>{copy.filterTitle}</h3>
              <button type="button" className="profile-modal__close" onClick={closeFilterModal} aria-label={copy.filterAction}>
                <X size={18} />
              </button>
            </div>

            <form className="profile-modal__form requests-filter-modal__form" onSubmit={applyDraftFilters}>
              <SelectField
                label={t('common.status')}
                value={filterDraft.status}
                onChange={(event) =>
                  setFilterDraft((current) => ({
                    ...current,
                    status: event.target.value as RequestStatus | '',
                  }))
                }
              >
                <option value="">{t('requestFilters.allStatuses')}</option>
                <option value="accepted">{t('requestStatus.accepted')}</option>
                <option value="in_progress">{t('requestStatus.in_progress')}</option>
                <option value="resolved">{t('requestStatus.resolved')}</option>
              </SelectField>

              <SelectField
                label={t('common.category')}
                value={filterDraft.categoryId}
                onChange={(event) =>
                  setFilterDraft((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
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
                value={filterDraft.cityId}
                onChange={(event) =>
                  setFilterDraft((current) => ({
                    ...current,
                    cityId: event.target.value,
                    districtId: '',
                    organizationId: '',
                  }))
                }
              >
                <option value="">{t('requestFilters.allCities')}</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label={t('common.district')}
                value={filterDraft.districtId}
                disabled={!filterDraft.cityId}
                onChange={(event) =>
                  setFilterDraft((current) => ({
                    ...current,
                    districtId: event.target.value,
                  }))
                }
              >
                <option value="">{t('requestFilters.allDistricts')}</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </SelectField>

              {user.role === 'admin' ? (
                <div className="requests-filter-modal__organization">
                  <SelectField
                    label={t('common.organization')}
                    value={filterDraft.organizationId}
                    onChange={(event) =>
                      setFilterDraft((current) => ({
                        ...current,
                        organizationId: event.target.value,
                      }))
                    }
                  >
                    <option value="">{t('requestFilters.allOrganizations')}</option>
                    {organizationOptions.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </SelectField>
                </div>
              ) : null}

              <div className="profile-modal__actions">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const nextFilters = createDefaultFilters(filters.limit);
                    setFilterDraft(nextFilters);
                    setFilters(nextFilters);
                    setFilterModalOpen(false);
                  }}
                >
                  {copy.clearAll}
                </Button>
                <Button type="submit">{copy.applyFilters}</Button>
              </div>
            </form>
          </article>
        </div>
      ) : null}

      {editTarget && editDraft ? (
        <div className="profile-modal requests-edit-modal-shell" role="dialog" aria-modal="true" aria-label={t('common.edit')}>
          <button
            type="button"
            className="profile-modal__backdrop"
            aria-label={t('common.close')}
            onClick={closeEditModal}
          />
          <article className="profile-modal__card glass-card requests-edit-modal">
            <div className="profile-modal__header">
              <h3>{t('common.edit')}</h3>
              <button type="button" className="profile-modal__close" onClick={closeEditModal} aria-label={t('common.close')}>
                <X size={18} />
              </button>
            </div>

            <form className="profile-modal__form requests-edit-modal__form" onSubmit={submitEdit}>
              <InputField
                label={t('common.title')}
                value={editDraft.title}
                minLength={4}
                maxLength={200}
                onChange={(event) => setEditDraft((current) => (current ? { ...current, title: event.target.value } : current))}
                required
              />

              <SelectField
                label={t('common.priority')}
                value={editDraft.priority}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current ? { ...current, priority: event.target.value as IssueRequest['priority'] } : current,
                  )
                }
              >
                <option value="low">{t('requestPriority.low')}</option>
                <option value="medium">{t('requestPriority.medium')}</option>
                <option value="high">{t('requestPriority.high')}</option>
              </SelectField>

              <TextareaField
                label={t('common.description')}
                value={editDraft.description}
                minLength={10}
                maxLength={4000}
                className="requests-edit-modal__textarea"
                onChange={(event) =>
                  setEditDraft((current) => (current ? { ...current, description: event.target.value } : current))
                }
                required
              />

              <SelectField
                label={t('common.category')}
                value={editDraft.categoryId}
                onChange={(event) =>
                  setEditDraft((current) => (current ? { ...current, categoryId: event.target.value } : current))
                }
                required
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
                value={editDraft.cityId}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current ? { ...current, cityId: event.target.value, districtId: '' } : current,
                  )
                }
                required
              >
                <option value="">{t('requestFilters.allCities')}</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label={t('common.district')}
                value={editDraft.districtId}
                onChange={(event) =>
                  setEditDraft((current) => (current ? { ...current, districtId: event.target.value } : current))
                }
                disabled={!editDraft.cityId}
              >
                <option value="">{t('requestFilters.allDistricts')}</option>
                {editDistricts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </SelectField>

              <InputField
                label={t('common.latitude')}
                value={editDraft.latitude}
                onChange={(event) =>
                  setEditDraft((current) => (current ? { ...current, latitude: event.target.value } : current))
                }
                required
              />

              <InputField
                label={t('common.longitude')}
                value={editDraft.longitude}
                onChange={(event) =>
                  setEditDraft((current) => (current ? { ...current, longitude: event.target.value } : current))
                }
                required
              />

              <div className="profile-modal__actions">
                <Button type="button" variant="ghost" onClick={closeEditModal} disabled={editBusy}>
                  {copy.cancelAction}
                </Button>
                <Button type="submit" busy={editBusy}>
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </article>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="profile-modal requests-delete-modal-shell" role="dialog" aria-modal="true" aria-label={t('common.delete')}>
          <button
            type="button"
            className="profile-modal__backdrop"
            aria-label={t('common.close')}
            onClick={closeDeleteModal}
          />
          <article className="profile-modal__card glass-card requests-delete-modal">
            <div className="profile-modal__form requests-delete-modal__content">
              <button
                type="button"
                className="profile-modal__close requests-delete-modal__close"
                onClick={closeDeleteModal}
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>

              <div className="requests-delete-modal__icon-wrap" aria-hidden="true">
                <Trash2 size={24} />
              </div>

              <h3 className="requests-delete-modal__heading">{t('common.delete')}</h3>
              <p className="requests-delete-modal__text">{t('requestDetail.deleteConfirm')}</p>

              <div className="requests-delete-modal__actions">
                <Button type="button" variant="ghost" onClick={closeDeleteModal} disabled={deleteBusy}>
                  {copy.cancelAction}
                </Button>
                <Button type="button" variant="danger" onClick={confirmDelete} busy={deleteBusy}>
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
};
