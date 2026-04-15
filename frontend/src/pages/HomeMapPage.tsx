import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { useAuth } from '../context/auth-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { formatDateTime } from '../lib/format';
import type { AppShellOutletContext } from '../components/layout/AppShellBare';
import type { IssueRequest, PaginatedResult, RequestStatus, UserRole } from '../types/api';

const DEFAULT_CENTER: [number, number] = [48.0196, 66.9237];
const DEFAULT_ZOOM = 5;
const PAGE_LIMIT = 100;
const MAX_MAP_PAGES = 10;

type MapIssue = IssueRequest & {
  lat: number;
  lng: number;
};

const statusMeta: Record<RequestStatus, { label: string; legend: string; pinClassName: string }> = {
  accepted: {
    label: 'Жаңа мәселе',
    legend: 'Жаңа мәселелер',
    pinClassName: 'accepted',
  },
  in_progress: {
    label: 'Өңдеуде',
    legend: 'Өңдеуде',
    pinClassName: 'in-progress',
  },
  resolved: {
    label: 'Шешілген',
    legend: 'Шешілген',
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

export const HomeMapPage = () => {
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

  const counts = issues.reduce<Record<RequestStatus, number>>(
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

  return (
    <div className="page">
      <section className="dashboard-map glass-card">
        <div className="dashboard-map__header">
          <div className="dashboard-map__legend">
            {(['accepted', 'in_progress', 'resolved'] as RequestStatus[]).map((status) => (
              <div key={status} className="dashboard-map__legend-item">
                <span className={`dashboard-map__legend-dot dashboard-map__legend-dot--${statusMeta[status].pinClassName}`} />
                <span>{statusMeta[status].legend}</span>
                <strong>{counts[status]}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-map__viewport">
          <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom className="dashboard-map__leaflet">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapViewportSync issues={issues} selectedCity={selectedCity} />

            {issues.map((issue) => (
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
      </section>
    </div>
  );
};
