import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import type { AppShellOutletContext } from '../components/layout/AppShellBare';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { useAuth } from '../context/auth-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { formatDateTime } from '../lib/format';
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

const statusMeta: Record<RequestStatus, { label: string; summary: string; pinClassName: string }> = {
  accepted: {
    label: 'Жаңа мәселе',
    summary: 'Жаңа мәселелер',
    pinClassName: 'accepted',
  },
  in_progress: {
    label: 'Өңдеуде',
    summary: 'Өңдеуде',
    pinClassName: 'in-progress',
  },
  resolved: {
    label: 'Шешілген',
    summary: 'Шешілген',
    pinClassName: 'resolved',
  },
};

const statusIcons: Record<RequestStatus, L.DivIcon> = {
  accepted: L.divIcon({
    className: 'map-pin-wrapper',
    html: '<span class="map-pin map-pin--accepted"></span>',
    iconSize: [22, 30],
    iconAnchor: [11, 30],
    popupAnchor: [0, -24],
  }),
  in_progress: L.divIcon({
    className: 'map-pin-wrapper',
    html: '<span class="map-pin map-pin--in-progress"></span>',
    iconSize: [22, 30],
    iconAnchor: [11, 30],
    popupAnchor: [0, -24],
  }),
  resolved: L.divIcon({
    className: 'map-pin-wrapper',
    html: '<span class="map-pin map-pin--resolved"></span>',
    iconSize: [22, 30],
    iconAnchor: [11, 30],
    popupAnchor: [0, -24],
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
  const cityName = selectedCity?.name ?? 'Таңдалмаған қала';
  const districtName = selectedCity?.region ?? 'Орталық аймақ';
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
      title: 'Жол жабыны бүлінген',
      description: 'Шұңқыр ұлғайып, көлік қозғалысына кедергі келтіріп тұр.',
      status: 'accepted',
      priority: 'high',
      latitude: baseLat + 0.018,
      longitude: baseLng - 0.022,
      categoryName: 'Жол инфрақұрылымы',
    },
    {
      id: 'mock-request-in-progress',
      title: 'Көше жарығы істемейді',
      description: 'Аула ішіндегі баған шамы жөндеуді күтіп тұр.',
      status: 'in_progress',
      priority: 'medium',
      latitude: baseLat - 0.012,
      longitude: baseLng + 0.028,
      categoryName: 'Жарықтандыру',
    },
    {
      id: 'mock-request-resolved',
      title: 'Аялдама аумағы тазартылған',
      description: 'Тазалау жұмыстары аяқталды, аумақ қайта қалыпқа келтірілді.',
      status: 'resolved',
      priority: 'low',
      latitude: baseLat + 0.008,
      longitude: baseLng + 0.014,
      categoryName: 'Тазалық',
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
      description: 'Demo карта дерегі',
      createdAt: now,
      updatedAt: now,
    },
    city: {
      id: cityId,
      name: cityName,
      region: selectedCity?.region ?? 'Demo аймақ',
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

const MapViewportSync = ({
  issues,
  selectedCity,
}: {
  issues: MapIssue[];
  selectedCity: AppShellOutletContext['selectedCity'];
}) => {
  const map = useMap();

  useEffect(() => {
    const selectedCityLat = parseCoordinate(selectedCity?.latitude ?? null);
    const selectedCityLng = parseCoordinate(selectedCity?.longitude ?? null);

    if (selectedCity && selectedCityLat !== null && selectedCityLng !== null && issues.length === 0) {
      map.setView([selectedCityLat, selectedCityLng], 12, { animate: false });
      return;
    }

    if (issues.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
      return;
    }

    if (issues.length === 1) {
      map.setView([issues[0].lat, issues[0].lng], 14, { animate: false });
      return;
    }

    const bounds = L.latLngBounds(issues.map((issue) => [issue.lat, issue.lng] as [number, number]));
    map.fitBounds(bounds, {
      padding: [36, 36],
      maxZoom: 14,
      animate: false,
    });
  }, [issues, map, selectedCity]);

  return null;
};

export const HomeMapCompactPage = () => {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const { selectedCity, selectedCityId } = useOutletContext<AppShellOutletContext>();
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<MapIssue[]>([]);

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
          title: 'Карта жүктелмеді',
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
  }, [pushToast, selectedCityId, user]);

  if (!user) {
    return null;
  }

  if (loading) {
    return <LoadingState label="Қала картасы жүктеліп жатыр..." />;
  }

  const usingMockIssues = issues.length === 0;
  const visibleIssues = usingMockIssues ? createMockIssues(selectedCity) : issues;

  const counts = visibleIssues.reduce<Record<RequestStatus, number>>(
    (accumulator, issue) => {
      accumulator[issue.status] += 1;
      return accumulator;
    },
    {
      accepted: 0,
      in_progress: 0,
      resolved: 0,
    },
  );

  const statusCards = (['accepted', 'in_progress', 'resolved'] as RequestStatus[]).map((status) => ({
    status,
    label: statusMeta[status].summary,
    count: counts[status],
  }));

  return (
    <div className="page">
      <section className="dashboard-map dashboard-map--compact glass-card">
        <div className="dashboard-map__layout">
          <div className="dashboard-map__viewport dashboard-map__viewport--compact">
            <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom className="dashboard-map__leaflet">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapViewportSync issues={visibleIssues} selectedCity={selectedCity} />

              {visibleIssues.map((issue) => (
                <Marker key={issue.id} position={[issue.lat, issue.lng]} icon={statusIcons[issue.status]}>
                  <Popup>
                    <div className="map-popup">
                      <span className={`map-popup__status map-popup__status--${statusMeta[issue.status].pinClassName}`}>
                        {statusMeta[issue.status].label}
                      </span>
                      <h3>{issue.title}</h3>
                      <p>{issue.description}</p>
                      <dl className="map-popup__meta">
                        <div>
                          <dt>Санат</dt>
                          <dd>{issue.category?.name ?? 'Көрсетілмеген'}</dd>
                        </div>
                        <div>
                          <dt>Қала</dt>
                          <dd>{issue.city?.name ?? 'Белгісіз'}</dd>
                        </div>
                        <div>
                          <dt>Аудан</dt>
                          <dd>{issue.district?.name ?? 'Көрсетілмеген'}</dd>
                        </div>
                        <div>
                          <dt>Уақыты</dt>
                          <dd>{formatDateTime(issue.createdAt)}</dd>
                        </div>
                      </dl>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {issues.length === 0 ? (
              <div className="dashboard-map__empty">
                <EmptyState
                  title="Картада көрсетілетін нүкте әзірге жоқ"
                  description="Координатасы бар өтінімдер пайда болған кезде олар осы картада автоматты түрде көрінеді."
                />
              </div>
            ) : null}
          </div>

          <aside className="dashboard-map__sidebar">
            {statusCards.map((item) => (
              <div key={item.status} className="dashboard-map__stat">
                <div className="dashboard-map__stat-head">
                  <span
                    className={`dashboard-map__legend-dot dashboard-map__legend-dot--${statusMeta[item.status].pinClassName}`}
                  />
                  <span className="dashboard-map__stat-label">{item.label}</span>
                </div>
                <strong className="dashboard-map__stat-value">{item.count}</strong>
              </div>
            ))}
          </aside>
        </div>
      </section>
    </div>
  );
};
