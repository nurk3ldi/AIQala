import {
  Building2,
  CalendarDays,
  CircleAlert,
  CircleCheckBig,
  Clock3,
  FolderOpen,
  Info,
  MapPinned,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import type { AppShellOutletContext } from '../components/layout/AppShellBare';
import { LoadingState } from '../components/ui/LoadingState';
import { useAuth } from '../context/auth-context';
import { useTranslation } from '../context/language-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { formatDateTime, formatPriorityLabel, resolveFileUrl } from '../lib/format';
import type { Language } from '../lib/i18n';
import type { IssueRequest, PaginatedResult, RequestStatus, UserRole } from '../types/api';

const DEFAULT_CENTER: [number, number] = [48.0196, 66.9237];
const DEFAULT_ZOOM = 5;
const PAGE_LIMIT = 100;
const MAX_MAP_PAGES = 10;
type MapIssue = IssueRequest & {
  lat: number;
  lng: number;
  isMock?: boolean;
};

const HOME_UI: Record<
  Language,
  {
    totalLabel: string;
    cityFallback: string;
  }
> = {
  kk: {
    totalLabel: 'Өтінім',
    cityFallback: 'Барлық қалалар',
  },
  ru: {
    totalLabel: 'Заявки',
    cityFallback: 'Все города',
  },
  en: {
    totalLabel: 'Requests',
    cityFallback: 'All cities',
  },
};

const statusMeta: Record<RequestStatus, { labelKey: string; pinClassName: string }> = {
  accepted: { labelKey: 'requestStatusShort.accepted', pinClassName: 'accepted' },
  in_progress: { labelKey: 'requestStatusShort.in_progress', pinClassName: 'in-progress' },
  resolved: { labelKey: 'requestStatusShort.resolved', pinClassName: 'resolved' },
};

const statusSummaryMeta: Record<
  RequestStatus,
  {
    icon: typeof CircleAlert;
    toneClassName: string;
  }
> = {
  accepted: {
    icon: CircleAlert,
    toneClassName: 'accepted',
  },
  in_progress: {
    icon: Clock3,
    toneClassName: 'in-progress',
  },
  resolved: {
    icon: CircleCheckBig,
    toneClassName: 'resolved',
  },
};

const statusIcons: Record<RequestStatus, L.DivIcon> = {
  accepted: L.divIcon({
    className: 'map-pin-wrapper',
    html: '<span class="map-pin map-pin--accepted"></span>',
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -28],
  }),
  in_progress: L.divIcon({
    className: 'map-pin-wrapper',
    html: '<span class="map-pin map-pin--in-progress"></span>',
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -28],
  }),
  resolved: L.divIcon({
    className: 'map-pin-wrapper',
    html: '<span class="map-pin map-pin--resolved"></span>',
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -28],
  }),
};

const parseCoordinate = (value?: string | null) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeIssues = (issues: IssueRequest[]) =>
  issues.reduce<MapIssue[]>((accumulator, issue) => {
    const lat = parseCoordinate(issue.latitude);
    const lng = parseCoordinate(issue.longitude);

    if (lat === null || lng === null) {
      return accumulator;
    }

    accumulator.push({
      ...issue,
      lat,
      lng,
    });

    return accumulator;
  }, []);

const createMockIssues = (selectedCity: AppShellOutletContext['selectedCity']): MapIssue[] => {
  const now = new Date().toISOString();
  const baseLat = parseCoordinate(selectedCity?.latitude ?? null) ?? DEFAULT_CENTER[0];
  const baseLng = parseCoordinate(selectedCity?.longitude ?? null) ?? DEFAULT_CENTER[1];
  const cityId = selectedCity?.id ?? 'mock-city';
  const cityName = selectedCity?.name ?? 'home.mock.city';
  const districtName = selectedCity?.region ?? 'home.mock.district';
  const districtId = selectedCity?.id ? `${selectedCity.id}-demo-district` : 'mock-district';

  const drafts: Array<{
    id: string;
    title: string;
    description: string;
    status: RequestStatus;
    priority: IssueRequest['priority'];
    latitude: number;
    longitude: number;
    categoryName: string;
  }> = [
    {
      id: 'mock-request-accepted',
      title: 'home.mock.roadTitle',
      description: 'home.mock.roadDescription',
      status: 'accepted',
      priority: 'high',
      latitude: baseLat + 0.018,
      longitude: baseLng - 0.022,
      categoryName: 'home.mock.roadCategory',
    },
    {
      id: 'mock-request-in-progress',
      title: 'home.mock.lightTitle',
      description: 'home.mock.lightDescription',
      status: 'in_progress',
      priority: 'medium',
      latitude: baseLat - 0.012,
      longitude: baseLng + 0.028,
      categoryName: 'home.mock.lightCategory',
    },
    {
      id: 'mock-request-resolved',
      title: 'home.mock.cleaningTitle',
      description: 'home.mock.cleaningDescription',
      status: 'resolved',
      priority: 'low',
      latitude: baseLat + 0.008,
      longitude: baseLng + 0.014,
      categoryName: 'home.mock.cleaningCategory',
    },
  ];

  return drafts.map((draft) => ({
    id: draft.id,
    title: draft.title,
    description: draft.description,
    categoryId: `mock-category-${draft.status}`,
    cityId,
    districtId,
    latitude: String(draft.latitude),
    longitude: String(draft.longitude),
    status: draft.status,
    priority: draft.priority,
    userId: 'mock-user',
    organizationId: draft.status === 'accepted' ? null : 'mock-organization',
    createdAt: now,
    updatedAt: now,
    lat: draft.latitude,
    lng: draft.longitude,
    isMock: true,
    category: {
      id: `mock-category-${draft.status}`,
      name: draft.categoryName,
      description: 'home.mock.categoryDescription',
      createdAt: now,
      updatedAt: now,
    },
    city: {
      id: cityId,
      name: cityName,
      region: selectedCity?.region ?? 'home.mock.region',
      latitude: String(baseLat),
      longitude: String(baseLng),
      createdAt: now,
      updatedAt: now,
    },
    district: {
      id: districtId,
      name: districtName,
      cityId,
      latitude: String(baseLat),
      longitude: String(baseLng),
      createdAt: now,
      updatedAt: now,
    },
  }));
};

const fetchAllPages = async (
  fetchPage: (query: { page: number; limit: number }) => Promise<PaginatedResult<IssueRequest>>,
) => {
  const items: IssueRequest[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await fetchPage({ page, limit: PAGE_LIMIT });
    items.push(...response.items);
    totalPages = response.meta.totalPages;
    page += 1;
  } while (page <= totalPages && page <= MAX_MAP_PAGES);

  return items;
};

const loadIssuesForRole = async (role: UserRole, selectedCityId: string | null) => {
  const baseQuery = selectedCityId ? { cityId: selectedCityId } : {};

  if (role === 'user') {
    return fetchAllPages((query) => api.requests.listMine({ ...query, ...baseQuery }));
  }

  return fetchAllPages((query) => api.requests.list({ ...query, ...baseQuery }));
};

const loadIssueDetailForRole = (role: UserRole, id: string) =>
  role === 'user' ? api.requests.getMineById(id) : api.requests.detail(id);

const MapViewportSync = ({ issues, activeIssue }: { issues: MapIssue[]; activeIssue: MapIssue | null }) => {
  const map = useMap();

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      map.invalidateSize();
      const paddingTopLeft = L.point(activeIssue ? 430 : 56, 88);
      const paddingBottomRight = L.point(180, 72);

      if (issues.length === 0) {
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
        return;
      }

      if (issues.length === 1) {
        const target = L.latLng(issues[0].lat, issues[0].lng);
        map.setView(target, 14, { animate: false });
        map.panInside(target, {
          paddingTopLeft,
          paddingBottomRight,
          animate: false,
        });
        return;
      }

      const bounds = L.latLngBounds(issues.map((issue) => [issue.lat, issue.lng] as [number, number]));
      map.fitBounds(bounds, {
        paddingTopLeft,
        paddingBottomRight,
        maxZoom: 14,
        animate: false,
      });
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [activeIssue, issues, map]);

  return null;
};

export const HomeMapDonutPage = () => {
  const { user } = useAuth();
  const { language, t } = useTranslation();
  const { pushToast } = useToast();
  const { selectedCity, selectedCityId } = useOutletContext<AppShellOutletContext>();
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<MapIssue[]>([]);
  const [activeIssue, setActiveIssue] = useState<MapIssue | null>(null);
  const [activeIssueBusyId, setActiveIssueBusyId] = useState<string | null>(null);
  const [isActiveIssueExpanded, setIsActiveIssueExpanded] = useState(false);
  const copy = HOME_UI[language];

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user) {
        return;
      }

      setLoading(true);

      try {
        const items = await loadIssuesForRole(user.role, selectedCityId);

        if (!active) {
          return;
        }

        setIssues(normalizeIssues(items));
      } catch (error) {
        if (!active) {
          return;
        }

        pushToast({
          tone: 'error',
          title: t('home.mapLoadFailed'),
          description: getErrorMessage(error),
        });
        setIssues([]);
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
  }, [pushToast, selectedCityId, t, user]);

  const visibleIssues = useMemo(() => {
    if (issues.length > 0) {
      return issues;
    }

    return createMockIssues(selectedCity);
  }, [issues, selectedCity]);

  const statusSummary = useMemo(() => {
    const counts: Record<RequestStatus, number> = {
      accepted: 0,
      in_progress: 0,
      resolved: 0,
    };

    visibleIssues.forEach((issue) => {
      counts[issue.status] += 1;
    });

    return (Object.keys(statusSummaryMeta) as RequestStatus[]).map((status) => ({
      status,
      value: counts[status],
      label: t(statusMeta[status].labelKey),
      ...statusSummaryMeta[status],
    }));
  }, [t, visibleIssues]);

  useEffect(() => {
    setActiveIssue(null);
    setActiveIssueBusyId(null);
    setIsActiveIssueExpanded(false);
  }, [selectedCityId]);

  const describeIssueText = (value?: string | null, isMock?: boolean, fallback = t('common.notSpecified')) => {
    if (!value) {
      return fallback;
    }

    return isMock ? t(value) : value;
  };

  const activeIssueMeta = activeIssue
    ? [
        {
          key: 'category',
          icon: FolderOpen,
          label: t('common.category'),
          value: describeIssueText(activeIssue.category?.name, activeIssue.isMock, t('common.unknown')),
        },
        {
          key: 'organization',
          icon: Building2,
          label: t('common.organization'),
          value: activeIssue.organization?.name ?? t('requestDetail.unassigned'),
        },
        {
          key: 'requester',
          icon: UserRound,
          label: t('common.requester'),
          value: activeIssue.requester?.fullName ?? t('requestDetail.requesterFallback'),
        },
        {
          key: 'createdAt',
          icon: CalendarDays,
          label: t('common.createdAt'),
          value: formatDateTime(activeIssue.createdAt),
        },
      ]
    : [];

  const activeIssuePriorityClassName =
    activeIssue?.priority === 'high' ? 'high' : activeIssue?.priority === 'medium' ? 'medium' : 'low';

  const handleIssueOpen = async (issue: MapIssue) => {
    setActiveIssue(issue);
    setIsActiveIssueExpanded(false);

    if (!user || issue.isMock) {
      return;
    }

    setActiveIssueBusyId(issue.id);

    try {
      const detail = await loadIssueDetailForRole(user.role, issue.id);
      const detailLat = parseCoordinate(detail.latitude);
      const detailLng = parseCoordinate(detail.longitude);

      setActiveIssue((current) =>
        current?.id === issue.id
          ? {
              ...issue,
              ...detail,
              lat: detailLat ?? issue.lat,
              lng: detailLng ?? issue.lng,
            }
          : current,
      );
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('requestDetail.loadFailed'),
        description: getErrorMessage(error),
      });
    } finally {
      setActiveIssueBusyId((current) => (current === issue.id ? null : current));
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return <LoadingState label={t('home.mapLoading')} />;
  }

  return (
    <div className="page">
      <section className="home-minimal">
        <div className="home-minimal__map-shell">
          <span className="sr-only">
            {`${selectedCity?.name ?? copy.cityFallback} - ${visibleIssues.length} ${copy.totalLabel}`}
          </span>
          <div className="dashboard-map__viewport home-minimal__viewport">
            <div className="home-minimal__viewport-glow" aria-hidden="true" />
            <div className="home-minimal__viewport-frame">
              <div className="home-minimal__map-overlay">
                <div className="home-minimal__map-city">
                  <span className="home-minimal__map-city-icon">
                    <MapPinned size={14} aria-hidden="true" />
                  </span>
                  <strong>{selectedCity?.name ?? copy.cityFallback}</strong>
                </div>

                <div className="home-minimal__map-stats">
                  {statusSummary.map((item) => {
                    const Icon = item.icon;

                    return (
                      <article key={item.status} className={`home-minimal__map-stat home-minimal__map-stat--${item.toneClassName}`}>
                        <span className="home-minimal__map-stat-icon">
                          <Icon size={14} aria-hidden="true" />
                        </span>
                        <div className="home-minimal__map-stat-copy">
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              {activeIssue ? (
                <aside
                  className={`home-minimal__detail ${isActiveIssueExpanded ? 'home-minimal__detail--expanded' : 'home-minimal__detail--compact'}`}
                  aria-label={activeIssue.isMock ? describeIssueText(activeIssue.title, true) : activeIssue.title}
                >
                  <div className="home-minimal__detail-header">
                    <div className="home-minimal__detail-copy">
                      <div className="home-minimal__detail-badges">
                        <span className={`home-minimal__detail-badge home-minimal__detail-badge--${statusMeta[activeIssue.status].pinClassName}`}>
                          {t(statusMeta[activeIssue.status].labelKey)}
                        </span>
                        <span className={`home-minimal__detail-badge home-minimal__detail-badge--priority-${activeIssuePriorityClassName}`}>
                          {formatPriorityLabel(activeIssue.priority)}
                        </span>
                      </div>
                      <h3>{describeIssueText(activeIssue.title, activeIssue.isMock, t('common.unknown'))}</h3>
                    </div>

                    <div className="home-minimal__detail-actions">
                      <button
                        type="button"
                        className="home-minimal__detail-toggle"
                        aria-label={t('common.details')}
                        title={t('common.details')}
                        onClick={() => setIsActiveIssueExpanded((current) => !current)}
                      >
                        <Info size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="home-minimal__detail-close"
                        aria-label={t('common.close')}
                        onClick={() => setActiveIssue(null)}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {!isActiveIssueExpanded ? (
                    <div className="home-minimal__detail-media">
                      <div className="home-minimal__detail-section-head">
                        <span>{t('requestDetail.mediaTitle')}</span>
                        {activeIssueBusyId === activeIssue.id ? <small>{t('requestDetail.loading')}</small> : null}
                      </div>

                      {activeIssue.media?.length ? (
                        <div className="home-minimal__detail-media-track">
                          {activeIssue.media.map((item) => (
                            <article key={item.id} className="home-minimal__detail-media-item">
                              {item.type === 'image' ? (
                                <img src={resolveFileUrl(item.fileUrl)} alt={describeIssueText(activeIssue.title, activeIssue.isMock, t('requestDetail.mediaTitle'))} />
                              ) : (
                                <video controls src={resolveFileUrl(item.fileUrl)} />
                              )}
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="home-minimal__detail-empty">{t('requestDetail.mediaEmptyDescription')}</p>
                      )}
                    </div>
                  ) : null}

                  {isActiveIssueExpanded ? (
                    <div className="home-minimal__detail-meta">
                      <p className="home-minimal__detail-description">
                        {describeIssueText(activeIssue.description, activeIssue.isMock, t('common.notSpecified'))}
                      </p>

                      <div className="home-minimal__detail-meta-list">
                        {activeIssueMeta.map((item) => {
                          const Icon = item.icon;

                          return (
                            <div key={item.key} className="home-minimal__detail-meta-row">
                              <span className="home-minimal__detail-meta-icon">
                                <Icon size={15} aria-hidden="true" />
                              </span>
                              <div className="home-minimal__detail-meta-copy">
                                <span>{item.label}</span>
                                <strong>{item.value}</strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </aside>
              ) : null}

              <div className="home-minimal__map-scrim" aria-hidden="true" />

              <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                scrollWheelZoom
                attributionControl={false}
                zoomControl={false}
                className="dashboard-map__leaflet home-minimal__leaflet"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapViewportSync issues={visibleIssues} activeIssue={activeIssue} />

                {visibleIssues.map((issue) => (
                  <Marker
                    key={issue.id}
                    position={[issue.lat, issue.lng]}
                    icon={statusIcons[issue.status]}
                    eventHandlers={{
                      click: () => {
                        void handleIssueOpen(issue);
                      },
                    }}
                  />
                ))}
              </MapContainer>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
