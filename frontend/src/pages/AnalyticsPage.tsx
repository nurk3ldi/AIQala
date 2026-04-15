import { Activity, Building2, CircleGauge, Clock3, MapPinned } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
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
import { getLocaleForLanguage, type Language } from '../lib/i18n';
import type { AnalyticsOverview, RequestPriority, RequestStatus } from '../types/api';

type AnalyticsCopy = {
  loading: string;
  loadFailed: string;
  live: string;
  overview: string;
  title: string;
  description: string;
  trendTitle: string;
  trendDescription: string;
  last12Days: string;
  totalRequests: string;
  resolvedRate: string;
  averageResolution: string;
  activeOrganizations: string;
  categoryTitle: string;
  categoryDescription: string;
  statusTitle: string;
  statusDescription: string;
  assignmentTitle: string;
  priorityTitle: string;
  coverageTitle: string;
  coverageDescription: string;
  platformScope: string;
  topCities: string;
  topOrganizations: string;
  recentTitle: string;
  recentDescription: string;
  emptyCategories: string;
  emptyRecentTitle: string;
  emptyRecentDescription: string;
  comments: string;
  media: string;
  categories: string;
  cities: string;
  districts: string;
  organizations: string;
  assigned: string;
  unassigned: string;
  noOrganization: string;
  requestLabel: string;
  headers: {
    request: string;
    location: string;
    status: string;
    priority: string;
    organization: string;
    created: string;
  };
};

const ANALYTICS_COPY: Record<Language, AnalyticsCopy> = {
  kk: {
    loading: 'Аналитика жүктеліп жатыр...',
    loadFailed: 'Аналитика жүктелмеді',
    live: 'Тікелей дерек',
    overview: 'Операциялық аналитика',
    title: 'Қала өтінімдерінің толық көрінісі',
    description: 'Backend-тегі өтінімдер, санаттар, аймақтар және ұйымдар бойынша нақты уақытқа жақын жиынтық көрсеткіштер.',
    trendTitle: 'Өтінімдер ағыны',
    trendDescription: 'Соңғы 12 күндегі жаңа өтінімдер мен шешілген өтінімдердің қарқыны.',
    last12Days: 'Соңғы 12 күн',
    totalRequests: 'Жалпы өтінімдер',
    resolvedRate: 'Шешілу үлесі',
    averageResolution: 'Орташа шешілу уақыты',
    activeOrganizations: 'Белсенді ұйымдар',
    categoryTitle: 'Санаттар бойынша жүктеме',
    categoryDescription: 'Қай бағытқа сұраныс көбірек түсіп жатқанын көрсетеді.',
    statusTitle: 'Статус құрылымы',
    statusDescription: 'Жаңа, өңдеудегі және шешілген өтінімдердің үлесі.',
    assignmentTitle: 'Тағайындау тәртібі',
    priorityTitle: 'Маңыздылық деңгейі',
    coverageTitle: 'География және орындаушылар',
    coverageDescription: 'Қалалар, ұйымдар және анықтамалық қамту көлемі.',
    platformScope: 'Платформа ауқымы',
    topCities: 'Жетекші қалалар',
    topOrganizations: 'Жетекші ұйымдар',
    recentTitle: 'Соңғы өтінімдер',
    recentDescription: 'Жүйеге ең соңғы түскен өтінімдердің қысқаша тізімі.',
    emptyCategories: 'Санаттық дерек әлі жиналмаған.',
    emptyRecentTitle: 'Өтінімдер әлі жоқ',
    emptyRecentDescription: 'Жаңа өтінімдер түскен кезде олар осы кестеде көрінеді.',
    comments: 'Пікірлер',
    media: 'Медиа',
    categories: 'Санаттар',
    cities: 'Қалалар',
    districts: 'Аудандар',
    organizations: 'Ұйымдар',
    assigned: 'Тағайындалған',
    unassigned: 'Тағайындалмаған',
    noOrganization: 'Тағайындалмаған',
    requestLabel: 'өтінім',
    headers: {
      request: 'Өтінім',
      location: 'Орналасуы',
      status: 'Статус',
      priority: 'Маңыздылық',
      organization: 'Ұйым',
      created: 'Уақыты',
    },
  },
  ru: {
    loading: 'Загрузка аналитики...',
    loadFailed: 'Не удалось загрузить аналитику',
    live: 'Живые данные',
    overview: 'Операционная аналитика',
    title: 'Полная картина городских обращений',
    description: 'Сводные показатели по обращениям, категориям, территориям и организациям на основе backend-данных.',
    trendTitle: 'Поток обращений',
    trendDescription: 'Динамика новых и завершенных обращений за последние 12 дней.',
    last12Days: 'Последние 12 дней',
    totalRequests: 'Всего обращений',
    resolvedRate: 'Доля решенных',
    averageResolution: 'Среднее время решения',
    activeOrganizations: 'Активные организации',
    categoryTitle: 'Нагрузка по категориям',
    categoryDescription: 'Показывает, в какие направления поступает больше всего обращений.',
    statusTitle: 'Структура статусов',
    statusDescription: 'Распределение новых, обрабатываемых и решенных обращений.',
    assignmentTitle: 'Назначение',
    priorityTitle: 'Уровень приоритета',
    coverageTitle: 'География и исполнители',
    coverageDescription: 'Города, организации и охват справочников платформы.',
    platformScope: 'Охват платформы',
    topCities: 'Лидирующие города',
    topOrganizations: 'Лидирующие организации',
    recentTitle: 'Последние обращения',
    recentDescription: 'Краткий список последних обращений, поступивших в систему.',
    emptyCategories: 'Данные по категориям пока не накоплены.',
    emptyRecentTitle: 'Обращений пока нет',
    emptyRecentDescription: 'Когда появятся новые обращения, они отобразятся в этой таблице.',
    comments: 'Комментарии',
    media: 'Медиа',
    categories: 'Категории',
    cities: 'Города',
    districts: 'Районы',
    organizations: 'Организации',
    assigned: 'Назначено',
    unassigned: 'Не назначено',
    noOrganization: 'Не назначено',
    requestLabel: 'обращ.',
    headers: {
      request: 'Обращение',
      location: 'Локация',
      status: 'Статус',
      priority: 'Приоритет',
      organization: 'Организация',
      created: 'Время',
    },
  },
  en: {
    loading: 'Loading analytics...',
    loadFailed: 'Failed to load analytics',
    live: 'Live data',
    overview: 'Operational analytics',
    title: 'Full view of city issue flow',
    description: 'A compact control surface built from backend aggregates across requests, categories, locations, and organizations.',
    trendTitle: 'Request flow',
    trendDescription: 'Incoming and resolved requests over the last 12 days.',
    last12Days: 'Last 12 days',
    totalRequests: 'Total requests',
    resolvedRate: 'Resolution rate',
    averageResolution: 'Average resolution time',
    activeOrganizations: 'Active organizations',
    categoryTitle: 'Category workload',
    categoryDescription: 'Shows which service areas currently absorb the most demand.',
    statusTitle: 'Status structure',
    statusDescription: 'Distribution of new, in-progress, and resolved requests.',
    assignmentTitle: 'Assignment mix',
    priorityTitle: 'Priority spread',
    coverageTitle: 'Geography and executors',
    coverageDescription: 'Cities, organizations, and directory coverage across the platform.',
    platformScope: 'Platform scope',
    topCities: 'Leading cities',
    topOrganizations: 'Leading organizations',
    recentTitle: 'Recent requests',
    recentDescription: 'Latest requests entering the system.',
    emptyCategories: 'No category activity yet.',
    emptyRecentTitle: 'No requests yet',
    emptyRecentDescription: 'Recent requests will appear here once activity begins.',
    comments: 'Comments',
    media: 'Media',
    categories: 'Categories',
    cities: 'Cities',
    districts: 'Districts',
    organizations: 'Organizations',
    assigned: 'Assigned',
    unassigned: 'Unassigned',
    noOrganization: 'Unassigned',
    requestLabel: 'requests',
    headers: {
      request: 'Request',
      location: 'Location',
      status: 'Status',
      priority: 'Priority',
      organization: 'Organization',
      created: 'Created',
    },
  },
};

const ANALYTICS_SUBTITLES: Record<Language, string> = {
  kk: 'Өтінімдер, мәртебелер және ұйым жүктемесі осы жерде көрінеді.',
  ru: 'Здесь отображаются обращения, статусы и нагрузка на организации.',
  en: 'Requests, statuses, and organization workload are shown here.',
};

const STATUS_ORDER: RequestStatus[] = ['accepted', 'in_progress', 'resolved'];
const PRIORITY_ORDER: RequestPriority[] = ['high', 'medium', 'low'];

const buildLinePath = (values: number[], width: number, height: number) => {
  if (!values.length) {
    return '';
  }

  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? width / (values.length - 1) : width;

  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - (value / max) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const formatShortDate = (value: string, language: Language) =>
  new Intl.DateTimeFormat(getLocaleForLanguage(language), {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));

const Sparkline = ({ values }: { values: number[] }) => {
  const path = buildLinePath(values.length ? values : [0, 0], 120, 36);

  return (
    <svg viewBox="0 0 120 36" className="analytics-sparkline" preserveAspectRatio="none" aria-hidden="true">
      <path d={path} />
    </svg>
  );
};

export const AnalyticsPage = () => {
  const { language, t } = useTranslation();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);

  const copy = ANALYTICS_COPY[language];
  const pageSubtitle = ANALYTICS_SUBTITLES[language];

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const result = await api.analytics.overview();

        if (active) {
          setOverview(result);
        }
      } catch (error) {
        if (active) {
          pushToast({
            tone: 'error',
            title: copy.loadFailed,
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
  }, [copy.loadFailed, pushToast]);

  const normalizedOverview = useMemo(() => {
    if (!overview) {
      return null;
    }

    const statusMap = new Map(overview.requestsByStatus.map((item) => [item.status, item.totalRequests]));
    const priorityMap = new Map(overview.requestsByPriority.map((item) => [item.priority, item.totalRequests]));

    const statusItems = STATUS_ORDER.map((status) => ({
      status,
      totalRequests: statusMap.get(status) ?? 0,
    }));

    const priorityItems = PRIORITY_ORDER.map((priority) => ({
      priority,
      totalRequests: priorityMap.get(priority) ?? 0,
    }));

    return {
      ...overview,
      statusItems,
      priorityItems,
      topCategories: overview.requestsByCategory.slice(0, 6),
      topCities: overview.requestsByCity.slice(0, 5),
      topOrganizations: overview.topOrganizations.slice(0, 5),
    };
  }, [overview]);

  if (loading) {
    return <LoadingState label={copy.loading} />;
  }

  if (!normalizedOverview) {
    return <div className="page" />;
  }

  const {
    totalRequests,
    resolvedRequestsCount,
    acceptedRequestsCount,
    inProgressRequestsCount,
    averageResolutionTimeHours,
    assignedRequestsCount,
    unassignedRequestsCount,
    totalComments,
    totalMedia,
    totalCategories,
    totalCities,
    totalDistricts,
    totalOrganizations,
    activeOrganizationsCount,
    requestsTrend,
    recentRequests,
    topCategories,
    topCities,
    topOrganizations,
    statusItems,
    priorityItems,
  } = normalizedOverview;

  const resolvedRate = totalRequests ? resolvedRequestsCount / totalRequests : 0;
  const assignmentRate = totalRequests ? assignedRequestsCount / totalRequests : 0;
  const trendValues = requestsTrend.map((item) => item.totalRequests);
  const resolvedTrendValues = requestsTrend.map((item) => item.resolvedRequests);
  const organizationsTrendValues = topOrganizations.map((item) => item.totalRequests);
  const citiesTrendValues = topCities.map((item) => item.totalRequests);
  const maxTrendValue = Math.max(...trendValues, 1);
  const maxCategoryValue = Math.max(...topCategories.map((item) => item.totalRequests), 1);
  const maxCityValue = Math.max(...topCities.map((item) => item.totalRequests), 1);
  const maxOrganizationValue = Math.max(...topOrganizations.map((item) => item.totalRequests), 1);
  const donutTotal = Math.max(
    statusItems.reduce((sum, item) => sum + item.totalRequests, 0),
    1,
  );
  const donutRadius = 58;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutColors: Record<RequestStatus, string> = {
    accepted: '#ff5c74',
    in_progress: '#f6c445',
    resolved: '#39cf88',
  };

  let donutOffset = 0;
  const donutSegments = statusItems.map((item) => {
    const ratio = item.totalRequests / donutTotal;
    const segmentLength = ratio * donutCircumference;
    const segment = {
      status: item.status,
      color: donutColors[item.status],
      totalRequests: item.totalRequests,
      dasharray: `${Math.max(segmentLength - 4, 0)} ${donutCircumference}`,
      dashoffset: -donutOffset,
    };

    donutOffset += segmentLength;

    return segment;
  });

  const metricCards = [
    {
      label: copy.totalRequests,
      value: formatCompactNumber(totalRequests),
      icon: Activity,
      series: trendValues,
    },
    {
      label: copy.resolvedRate,
      value: formatPercent(resolvedRate),
      icon: CircleGauge,
      series: resolvedTrendValues,
    },
    {
      label: copy.averageResolution,
      value: `${averageResolutionTimeHours.toFixed(1)}h`,
      icon: Clock3,
      series: resolvedTrendValues,
    },
    {
      label: copy.activeOrganizations,
      value: `${activeOrganizationsCount}/${totalOrganizations}`,
      icon: Building2,
      series: organizationsTrendValues.length ? organizationsTrendValues : citiesTrendValues,
    },
  ];

  return (
    <div className="page analytics-dashboard">
      <section className="analytics-hero glass-card">
        <div className="analytics-hero__copy">
          <p className="analytics-page__subtitle" aria-label={copy.title} title={copy.title}>
            {pageSubtitle}
          </p>
        </div>
      </section>

      <section className="analytics-top-grid">
        <article className="analytics-card analytics-card--trend glass-card">
          <div className="analytics-card__head">
            <div>
              <h3>{copy.trendTitle}</h3>
            </div>
          </div>

          <div className="analytics-bar-chart" role="img" aria-label={copy.trendTitle}>
            {requestsTrend.map((entry, index) => {
              const active = index === requestsTrend.length - 1;
              const totalHeight = Math.max((entry.totalRequests / maxTrendValue) * 100, entry.totalRequests ? 10 : 4);
              const resolvedHeight = entry.totalRequests
                ? Math.max((entry.resolvedRequests / Math.max(entry.totalRequests, 1)) * totalHeight, entry.resolvedRequests ? 8 : 0)
                : 0;

              return (
                <div key={entry.date} className={`analytics-bar ${active ? 'analytics-bar--active' : ''}`}>
                  <div className="analytics-bar__stack">
                    <div className="analytics-bar__track">
                      <div className="analytics-bar__fill" style={{ height: `${totalHeight}%` }}>
                        {resolvedHeight ? <div className="analytics-bar__resolved" style={{ height: `${resolvedHeight}%` }} /> : null}
                      </div>
                    </div>
                    <span className="analytics-bar__value">{entry.totalRequests}</span>
                  </div>
                  <span className="analytics-bar__label">{formatShortDate(entry.date, language)}</span>
                </div>
              );
            })}
          </div>
        </article>

        <div className="analytics-kpi-grid">
          {metricCards.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.label} className="analytics-kpi-card glass-card">
                <div className="analytics-kpi-card__head">
                  <span>{item.label}</span>
                  <div className="analytics-kpi-card__icon">
                    <Icon size={17} />
                  </div>
                </div>
                <strong className="analytics-kpi-card__value">{item.value}</strong>
                <div className="analytics-kpi-card__footer">
                  <Sparkline values={item.series} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="analytics-middle-grid">
        <article className="analytics-card glass-card">
          <div className="analytics-card__head">
            <div>
              <h3>{copy.categoryTitle}</h3>
            </div>
          </div>

          {topCategories.length ? (
            <div className="analytics-category-list">
              {topCategories.map((item) => {
                const ratio = item.totalRequests / maxCategoryValue;

                return (
                  <div key={item.categoryId} className="analytics-category-row">
                    <div className="analytics-category-row__meta">
                      <div>
                        <strong>{item.categoryName}</strong>
                        <span>{formatPercent(item.totalRequests / Math.max(totalRequests, 1))}</span>
                      </div>
                      <strong>{formatCompactNumber(item.totalRequests)}</strong>
                    </div>
                    <div className="analytics-progress">
                      <div className="analytics-progress__fill" style={{ width: `${Math.max(ratio * 100, item.totalRequests ? 6 : 0)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title={copy.categoryTitle} description={copy.emptyCategories} />
          )}

          <div className="analytics-inline-stats">
            <div className="analytics-inline-stat">
              <span>{copy.comments}</span>
              <strong>{formatCompactNumber(totalComments)}</strong>
            </div>
            <div className="analytics-inline-stat">
              <span>{copy.media}</span>
              <strong>{formatCompactNumber(totalMedia)}</strong>
            </div>
            <div className="analytics-inline-stat">
              <span>{copy.categories}</span>
              <strong>{formatCompactNumber(totalCategories)}</strong>
            </div>
          </div>
        </article>

        <article className="analytics-card glass-card">
          <div className="analytics-card__head">
            <div>
              <h3>{copy.statusTitle}</h3>
            </div>
          </div>

          <div className="analytics-donut-layout">
            <div className="analytics-donut">
              <svg viewBox="0 0 160 160" className="analytics-donut__svg" aria-hidden="true">
                <circle className="analytics-donut__track" cx="80" cy="80" r={donutRadius} />
                {donutSegments.map((segment) => (
                  <circle
                    key={segment.status}
                    className="analytics-donut__segment"
                    cx="80"
                    cy="80"
                    r={donutRadius}
                    stroke={segment.color}
                    strokeDasharray={segment.dasharray}
                    strokeDashoffset={segment.dashoffset}
                  />
                ))}
              </svg>
              <div className="analytics-donut__center">
                <strong>{formatCompactNumber(totalRequests)}</strong>
                <span>{copy.requestLabel}</span>
              </div>
            </div>

            <div className="analytics-status-list">
              {statusItems.map((item) => (
                <div key={item.status} className="analytics-status-item">
                  <div className="analytics-status-item__head">
                    <span className={`analytics-status-dot analytics-status-dot--${item.status}`} />
                    <strong>{t(`requestStatusShort.${item.status}`)}</strong>
                  </div>
                  <span>{formatCompactNumber(item.totalRequests)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-split-panels">
            <div className="analytics-subpanel">
              <div className="analytics-subpanel__head">
                <span>{copy.assignmentTitle}</span>
                <strong>{formatPercent(assignmentRate)}</strong>
              </div>
              <div className="analytics-progress analytics-progress--dual">
                <div className="analytics-progress__fill analytics-progress__fill--accent" style={{ width: `${assignmentRate * 100}%` }} />
              </div>
              <div className="analytics-subpanel__legend">
                <span>{copy.assigned}: {formatCompactNumber(assignedRequestsCount)}</span>
                <span>{copy.unassigned}: {formatCompactNumber(unassignedRequestsCount)}</span>
              </div>
            </div>

            <div className="analytics-subpanel">
              <div className="analytics-subpanel__head">
                <span>{copy.priorityTitle}</span>
                <strong>{formatCompactNumber(acceptedRequestsCount + inProgressRequestsCount + resolvedRequestsCount)}</strong>
              </div>
              <div className="analytics-priority-list">
                {priorityItems.map((item) => (
                  <div key={item.priority} className="analytics-priority-item">
                    <div className="analytics-priority-item__meta">
                      <span>{formatPriorityLabel(item.priority)}</span>
                      <strong>{item.totalRequests}</strong>
                    </div>
                    <div className="analytics-progress">
                      <div
                        className={`analytics-progress__fill analytics-progress__fill--priority-${item.priority}`}
                        style={{
                          width: `${Math.max((item.totalRequests / Math.max(totalRequests, 1)) * 100, item.totalRequests ? 6 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="analytics-bottom-grid">
        <article className="analytics-card glass-card">
          <div className="analytics-card__head">
            <div>
              <h3>{copy.coverageTitle}</h3>
            </div>
          </div>

          <div className="analytics-scope-grid">
            <div className="analytics-scope-card">
              <div className="analytics-scope-card__head">
                <MapPinned size={16} />
                <strong>{copy.platformScope}</strong>
              </div>
              <div className="analytics-inline-stats analytics-inline-stats--compact">
                <div className="analytics-inline-stat">
                  <span>{copy.cities}</span>
                  <strong>{totalCities}</strong>
                </div>
                <div className="analytics-inline-stat">
                  <span>{copy.districts}</span>
                  <strong>{totalDistricts}</strong>
                </div>
                <div className="analytics-inline-stat">
                  <span>{copy.categories}</span>
                  <strong>{totalCategories}</strong>
                </div>
                <div className="analytics-inline-stat">
                  <span>{copy.organizations}</span>
                  <strong>{totalOrganizations}</strong>
                </div>
              </div>
            </div>

            <div className="analytics-ranking-grid">
              <div className="analytics-ranking">
                <div className="analytics-ranking__head">
                  <strong>{copy.topCities}</strong>
                </div>
                <div className="analytics-ranking__list">
                  {topCities.map((item) => (
                    <div key={item.cityId} className="analytics-ranking__row">
                      <div>
                        <strong>{item.cityName}</strong>
                        <div className="analytics-progress">
                          <div
                            className="analytics-progress__fill analytics-progress__fill--city"
                            style={{ width: `${Math.max((item.totalRequests / maxCityValue) * 100, item.totalRequests ? 6 : 0)}%` }}
                          />
                        </div>
                      </div>
                      <span>{item.totalRequests}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analytics-ranking">
                <div className="analytics-ranking__head">
                  <strong>{copy.topOrganizations}</strong>
                </div>
                <div className="analytics-ranking__list">
                  {topOrganizations.map((item) => (
                    <div key={item.organizationId} className="analytics-ranking__row">
                      <div>
                        <strong>{item.organizationName}</strong>
                        <div className="analytics-progress">
                          <div
                            className="analytics-progress__fill analytics-progress__fill--organization"
                            style={{ width: `${Math.max((item.totalRequests / maxOrganizationValue) * 100, item.totalRequests ? 6 : 0)}%` }}
                          />
                        </div>
                      </div>
                      <span>{item.totalRequests}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="analytics-card glass-card">
          <div className="analytics-card__head">
            <div>
              <h3>{copy.recentTitle}</h3>
            </div>
          </div>

          {recentRequests.length ? (
            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>{copy.headers.request}</th>
                    <th>{copy.headers.location}</th>
                    <th>{copy.headers.status}</th>
                    <th>{copy.headers.priority}</th>
                    <th>{copy.headers.organization}</th>
                    <th>{copy.headers.created}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <div className="analytics-table__title">
                          <strong>{request.title}</strong>
                          <span>{request.categoryName ?? t('common.notSpecified')}</span>
                        </div>
                      </td>
                      <td>{request.cityName ?? t('common.notSpecified')}</td>
                      <td>
                        <Badge tone={statusTone(request.status)}>{formatStatusLabel(request.status)}</Badge>
                      </td>
                      <td>
                        <Badge tone={priorityTone(request.priority)}>{formatPriorityLabel(request.priority)}</Badge>
                      </td>
                      <td>{request.organizationName ?? copy.noOrganization}</td>
                      <td>{formatDateTime(request.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title={copy.emptyRecentTitle} description={copy.emptyRecentDescription} />
          )}
        </article>
      </section>
    </div>
  );
};
