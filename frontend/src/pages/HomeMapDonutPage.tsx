import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheckBig,
  Clock3,
  FolderOpen,
  Info,
  Images,
  MapPinned,
  MessageCircle,
  Pencil,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
};
type DetailTab = 'details' | 'photos' | 'comments';

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
    try {
      return await fetchAllPages((query) => api.requests.list({ ...query, ...baseQuery }));
    } catch {
      return fetchAllPages((query) => api.requests.listMine({ ...query, ...baseQuery }));
    }
  }

  return fetchAllPages((query) => api.requests.list({ ...query, ...baseQuery }));
};

const loadIssueDetailForRole = async (role: UserRole, id: string) => {
  if (role === 'user') {
    try {
      return await api.requests.detail(id);
    } catch {
      return api.requests.getMineById(id);
    }
  }

  return api.requests.detail(id);
};

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
  const [activeIssueTab, setActiveIssueTab] = useState<DetailTab>('photos');
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [commentActionBusyId, setCommentActionBusyId] = useState<string | null>(null);
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

  const visibleIssues = useMemo(() => issues, [issues]);

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
    setActiveIssueTab('photos');
    setActiveMediaIndex(0);
  }, [selectedCityId]);

  useEffect(() => {
    const mediaCount = activeIssue?.media?.length ?? 0;

    if (mediaCount === 0) {
      setActiveMediaIndex(0);
      return;
    }

    setActiveMediaIndex((current) => (current >= mediaCount ? mediaCount - 1 : current));
  }, [activeIssue?.id, activeIssue?.media?.length]);

  useEffect(() => {
    setCommentText('');
    setEditingCommentId(null);
    setEditingCommentText('');
    setCommentActionBusyId(null);
  }, [activeIssue?.id]);

  const activeIssueMeta = activeIssue
    ? [
        {
          key: 'category',
          icon: FolderOpen,
          label: t('common.category'),
          value: activeIssue.category?.name ?? t('common.unknown'),
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
  const activeIssueMedia = activeIssue?.media ?? [];
  const currentMedia = activeIssueMedia[activeMediaIndex] ?? null;

  const showPreviousMedia = () => {
    if (activeIssueMedia.length <= 1) {
      return;
    }

    setActiveMediaIndex((current) => (current - 1 + activeIssueMedia.length) % activeIssueMedia.length);
  };

  const showNextMedia = () => {
    if (activeIssueMedia.length <= 1) {
      return;
    }

    setActiveMediaIndex((current) => (current + 1) % activeIssueMedia.length);
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !activeIssue || commentBusy) {
      return;
    }

    if (user.role !== 'organization' && user.role !== 'user') {
      return;
    }

    const nextText = commentText.trim();
    if (!nextText) {
      return;
    }

    setCommentBusy(true);

    try {
      const comment = await api.requests.addComment(activeIssue.id, nextText);
      const nextComment = {
        ...comment,
        authorUser: comment.authorUser ?? user,
        authorOrganization:
          comment.authorOrganization ??
          (user.role === 'organization' && activeIssue.organization ? activeIssue.organization : null),
      };

      setActiveIssue((current) =>
        current?.id === activeIssue.id
          ? {
              ...current,
              comments: [...(current.comments ?? []), nextComment],
            }
          : current,
      );
      setCommentText('');
      pushToast({
        tone: 'success',
        title: t('requestDetail.commentSuccessTitle'),
        description: t('requestDetail.commentSuccessDescription'),
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('requestDetail.commentFailed'),
        description: getErrorMessage(error),
      });
    } finally {
      setCommentBusy(false);
    }
  };

  const canManageComment = (authorUserId: string | null, authorOrganizationId: string | null) => {
    if (!user) {
      return false;
    }

    if (user.role === 'user') {
      return authorUserId === user.id;
    }

    if (user.role === 'organization') {
      return Boolean(authorOrganizationId) && authorOrganizationId === user.organizationId;
    }

    return false;
  };

  const startCommentEdit = (commentId: string, text: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(text);
  };

  const cancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const saveCommentEdit = async (commentId: string) => {
    if (!activeIssue || !user) {
      return;
    }

    const nextText = editingCommentText.trim();

    if (!nextText) {
      return;
    }

    setCommentActionBusyId(commentId);

    try {
      const updated = await api.requests.updateComment(activeIssue.id, commentId, nextText);

      setActiveIssue((current) =>
        current?.id === activeIssue.id
          ? {
              ...current,
              comments: (current.comments ?? []).map((comment) =>
                comment.id === commentId
                  ? {
                      ...comment,
                      ...updated,
                      authorUser: comment.authorUser,
                      authorOrganization: comment.authorOrganization,
                    }
                  : comment,
              ),
            }
          : current,
      );

      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('requestDetail.commentFailed'),
        description: getErrorMessage(error),
      });
    } finally {
      setCommentActionBusyId(null);
    }
  };

  const deleteOwnComment = async (commentId: string) => {
    if (!activeIssue || !user) {
      return;
    }

    setCommentActionBusyId(commentId);

    try {
      await api.requests.removeComment(activeIssue.id, commentId);
      setActiveIssue((current) =>
        current?.id === activeIssue.id
          ? {
              ...current,
              comments: (current.comments ?? []).filter((comment) => comment.id !== commentId),
            }
          : current,
      );

      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditingCommentText('');
      }
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('requestDetail.commentFailed'),
        description: getErrorMessage(error),
      });
    } finally {
      setCommentActionBusyId(null);
    }
  };

  const handleIssueOpen = async (issue: MapIssue) => {
    setActiveIssue(issue);
    setActiveIssueTab('photos');
    setActiveMediaIndex(0);

    if (!user) {
      return;
    }

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
                  className="home-minimal__detail"
                  aria-label={activeIssue.title}
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
                      <h3>{activeIssue.title || t('common.unknown')}</h3>
                    </div>

                    <div className="home-minimal__detail-actions">
                      <button
                        type="button"
                        className={`home-minimal__detail-tab ${activeIssueTab === 'photos' ? 'home-minimal__detail-tab--active' : ''}`}
                        aria-label={t('requestDetail.mediaTitle')}
                        title={t('requestDetail.mediaTitle')}
                        aria-pressed={activeIssueTab === 'photos'}
                        onClick={() => setActiveIssueTab('photos')}
                      >
                        <Images size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`home-minimal__detail-tab ${activeIssueTab === 'details' ? 'home-minimal__detail-tab--active' : ''}`}
                        aria-label={t('common.details')}
                        title={t('common.details')}
                        aria-pressed={activeIssueTab === 'details'}
                        onClick={() => setActiveIssueTab('details')}
                      >
                        <Info size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`home-minimal__detail-tab ${activeIssueTab === 'comments' ? 'home-minimal__detail-tab--active' : ''}`}
                        aria-label={t('requestDetail.discussionTitle')}
                        title={t('requestDetail.discussionTitle')}
                        aria-pressed={activeIssueTab === 'comments'}
                        onClick={() => setActiveIssueTab('comments')}
                      >
                        <MessageCircle size={16} aria-hidden="true" />
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

                  <div className={`home-minimal__detail-body ${activeIssueTab === 'comments' ? 'home-minimal__detail-body--comments' : ''}`}>
                    {activeIssueTab === 'photos' ? (
                      activeIssueMedia.length && currentMedia ? (
                        <div className="home-minimal__detail-media">
                          <div className="home-minimal__detail-media-head">
                            <span>{`${activeMediaIndex + 1} / ${activeIssueMedia.length}`}</span>
                          </div>
                          <article className="home-minimal__detail-media-item">
                            {currentMedia.type === 'image' ? (
                              <img src={resolveFileUrl(currentMedia.fileUrl)} alt={activeIssue.title || t('requestDetail.mediaTitle')} />
                            ) : (
                              <video controls src={resolveFileUrl(currentMedia.fileUrl)} />
                            )}
                          </article>
                          {activeIssueMedia.length > 1 ? (
                            <div className="home-minimal__detail-media-nav">
                              <button type="button" onClick={showPreviousMedia} aria-label={t('pagination.previous')} title={t('pagination.previous')}>
                                <ChevronLeft size={16} aria-hidden="true" />
                              </button>
                              <span>{formatDateTime(currentMedia.createdAt)}</span>
                              <button type="button" onClick={showNextMedia} aria-label={t('pagination.next')} title={t('pagination.next')}>
                                <ChevronRight size={16} aria-hidden="true" />
                              </button>
                            </div>
                          ) : (
                            <p className="home-minimal__detail-media-caption">{formatDateTime(currentMedia.createdAt)}</p>
                          )}
                        </div>
                      ) : (
                        <p className="home-minimal__detail-empty">{t('requestDetail.mediaEmptyDescription')}</p>
                      )
                    ) : null}

                    {activeIssueTab === 'details' ? (
                      <div className="home-minimal__detail-meta">
                        <p className="home-minimal__detail-description">
                          {activeIssue.description || t('common.notSpecified')}
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

                    {activeIssueTab === 'comments' ? (
                      <div className="home-minimal__detail-comments-wrap">
                        {activeIssue.comments?.length ? (
                          <div className="home-minimal__detail-comments">
                            {activeIssue.comments.map((comment) => {
                              const authorName = comment.authorOrganization?.name ?? comment.authorUser?.fullName ?? t('common.unknown');
                              const authorInitial = authorName.trim().charAt(0).toUpperCase() || '?';
                              const authorAvatar = comment.authorUser?.avatarUrl ?? comment.authorOrganization?.logoUrl ?? null;
                              const isOwnComment = canManageComment(comment.authorUserId, comment.authorOrganizationId);
                              const isEditing = editingCommentId === comment.id;
                              const isActionBusy = commentActionBusyId === comment.id;

                              return (
                                <article key={comment.id} className="home-minimal__detail-comment">
                                  <span className="home-minimal__comment-avatar home-minimal__comment-avatar--item" aria-hidden="true">
                                    {authorAvatar ? (
                                      <img src={resolveFileUrl(authorAvatar)} alt={authorName} className="home-minimal__comment-avatar-image" />
                                    ) : (
                                      authorInitial
                                    )}
                                  </span>
                                  <div className="home-minimal__detail-comment-body">
                                    <div className="home-minimal__detail-comment-meta">
                                      <strong>{authorName}</strong>
                                      <div className="home-minimal__detail-comment-meta-right">
                                        <span>{formatDateTime(comment.createdAt)}</span>
                                        {isOwnComment && !isEditing ? (
                                          <div className="home-minimal__detail-comment-meta-actions">
                                            <button
                                              type="button"
                                              className="home-minimal__detail-comment-icon"
                                              onClick={() => startCommentEdit(comment.id, comment.text)}
                                              disabled={isActionBusy}
                                              aria-label={t('common.edit')}
                                            >
                                              <Pencil size={12} />
                                            </button>
                                            <button
                                              type="button"
                                              className="home-minimal__detail-comment-icon home-minimal__detail-comment-icon--danger"
                                              onClick={() => void deleteOwnComment(comment.id)}
                                              disabled={isActionBusy}
                                              aria-label={t('common.delete')}
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                    {isEditing ? (
                                      <div className="home-minimal__detail-comment-editor">
                                        <textarea
                                          className="home-minimal__comment-input home-minimal__comment-input--inline"
                                          value={editingCommentText}
                                          onChange={(event) => setEditingCommentText(event.target.value)}
                                          rows={2}
                                        />
                                        <div className="home-minimal__detail-comment-actions">
                                          <button
                                            type="button"
                                            className="home-minimal__comment-cancel"
                                            onClick={cancelCommentEdit}
                                            disabled={isActionBusy}
                                          >
                                            {t('common.close')}
                                          </button>
                                          <button
                                            type="button"
                                            className="home-minimal__comment-submit"
                                            onClick={() => void saveCommentEdit(comment.id)}
                                            disabled={isActionBusy || !editingCommentText.trim()}
                                          >
                                            {t('common.save')}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <p>{comment.text}</p>
                                      </>
                                    )}
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        ) : null}

                        {user.role === 'organization' || user.role === 'user' ? (
                          <form className="home-minimal__comment-form" onSubmit={submitComment}>
                            <span className="home-minimal__comment-avatar" aria-hidden="true">
                              {user.avatarUrl ? (
                                <img src={resolveFileUrl(user.avatarUrl)} alt={user.fullName} className="home-minimal__comment-avatar-image" />
                              ) : (
                                (user.fullName?.trim().charAt(0) || 'U').toUpperCase()
                              )}
                            </span>
                            <div className="home-minimal__comment-editor">
                              <textarea
                                className="home-minimal__comment-input"
                                value={commentText}
                                onChange={(event) => setCommentText(event.target.value)}
                                placeholder={t('requestDetail.comment')}
                                rows={2}
                              />
                              <div className="home-minimal__comment-actions">
                                <button
                                  type="button"
                                  className="home-minimal__comment-cancel"
                                  onClick={() => setCommentText('')}
                                  disabled={commentBusy || !commentText.trim()}
                                >
                                  {t('common.close')}
                                </button>
                                <button
                                  type="submit"
                                  className="home-minimal__comment-submit"
                                  disabled={commentBusy || !commentText.trim()}
                                >
                                  {t('requestDetail.publishComment')}
                                </button>
                              </div>
                            </div>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
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
