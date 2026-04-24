import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize2, MessageCircle, Pencil, Trash2, X } from 'lucide-react';
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { InputField, SelectField } from '../components/ui/Fields';
import { LoadingState } from '../components/ui/LoadingState';
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
  resolveFileUrl,
  statusTone,
} from '../lib/format';
import type { Comment, IssueRequest, Organization } from '../types/api';

const REQUEST_DETAIL_FALLBACK_CENTER: [number, number] = [51.1694, 71.4491];
const REQUEST_DETAIL_PHOTO_LIMIT = 3;

const parseCoordinate = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const RequestDetailMapSizer = () => {
  const map = useMap();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => cancelAnimationFrame(frame);
  }, [map]);

  return null;
};

export const RequestDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<IssueRequest | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [assignBusy, setAssignBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [commentActionBusyId, setCommentActionBusyId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [assignForm, setAssignForm] = useState({
    organizationId: '',
    priority: '',
  });
  const [statusValue, setStatusValue] = useState<'accepted' | 'in_progress' | 'resolved'>('accepted');
  const [requestPhotoIndex, setRequestPhotoIndex] = useState(0);
  const [organizationPhotoIndex, setOrganizationPhotoIndex] = useState(0);
  const [photoViewer, setPhotoViewer] = useState<{ src: string; alt: string } | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!id || !user) {
        return;
      }

      setLoading(true);

      try {
        const detail = user.role === 'user' ? await api.requests.getMineById(id) : await api.requests.detail(id);

        if (!active) {
          return;
        }

        setRequest(detail);
        setAssignForm({
          organizationId: detail.organizationId ?? '',
          priority: detail.priority,
        });
        setStatusValue(detail.status);
      } catch (error) {
        if (active) {
          pushToast({
            tone: 'error',
            title: t('requestDetail.loadFailed'),
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
  }, [id, pushToast, t, user]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      return;
    }

    void api.organizations
      .list({ page: 1, limit: 100, isActive: true })
      .then((response) => setOrganizations(response.items))
      .catch(() => undefined);
  }, [user?.role]);

  const refreshRequest = async () => {
    if (!id || !user) {
      return;
    }

    const detail = user.role === 'user' ? await api.requests.getMineById(id) : await api.requests.detail(id);
    setRequest(detail);
    setAssignForm({
      organizationId: detail.organizationId ?? '',
      priority: detail.priority,
    });
    setStatusValue(detail.status);
  };

  const assignRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) {
      return;
    }

    setAssignBusy(true);

    try {
      await api.requests.assign(id, {
        organizationId: assignForm.organizationId,
        priority: assignForm.priority as 'low' | 'medium' | 'high',
      });
      await refreshRequest();
      pushToast({
        tone: 'success',
        title: t('requestDetail.assignSuccessTitle'),
        description: t('requestDetail.assignSuccessDescription'),
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('requestDetail.assignFailed'),
        description: getErrorMessage(error),
      });
    } finally {
      setAssignBusy(false);
    }
  };

  const updateStatus = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) {
      return;
    }

    setStatusBusy(true);

    try {
      await api.requests.updateStatus(id, statusValue);
      await refreshRequest();
      pushToast({
        tone: 'success',
        title: t('requestDetail.statusSuccessTitle'),
        description: t('requestDetail.statusSuccessDescription'),
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('requestDetail.statusFailed'),
        description: getErrorMessage(error),
      });
    } finally {
      setStatusBusy(false);
    }
  };

  const uploadMedia = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !mediaFile) {
      return;
    }

    setMediaBusy(true);

    try {
      await api.requests.addMedia(id, mediaFile);
      setMediaFile(null);
      await refreshRequest();
      pushToast({
        tone: 'success',
        title: t('requestDetail.mediaSuccessTitle'),
        description: t('requestDetail.mediaSuccessDescription'),
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('requestDetail.mediaFailed'),
        description: getErrorMessage(error),
      });
    } finally {
      setMediaBusy(false);
    }
  };

  const canManageComment = (comment: Comment) => {
    if (!user) {
      return false;
    }

    if (user.role === 'user') {
      return comment.authorUserId === user.id;
    }

    if (user.role === 'organization') {
      return Boolean(comment.authorOrganizationId) && comment.authorOrganizationId === user.organizationId;
    }

    return false;
  };

  const startCommentEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  };

  const cancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const saveCommentEdit = async (commentId: string) => {
    if (!id) {
      return;
    }

    const nextText = editingCommentText.trim();
    if (!nextText) {
      return;
    }

    setCommentActionBusyId(commentId);

    try {
      await api.requests.updateComment(id, commentId, nextText);
      await refreshRequest();
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
    if (!id) {
      return;
    }

    setCommentActionBusyId(commentId);

    try {
      await api.requests.removeComment(id, commentId);
      await refreshRequest();

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

  const deleteRequest = async () => {
    if (!id || !window.confirm(t('requestDetail.deleteConfirm'))) {
      return;
    }

    try {
      await api.requests.remove(id);
      pushToast({
        tone: 'success',
        title: t('requestDetail.deleteSuccessTitle'),
      });
      navigate('/requests');
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('requestDetail.deleteFailed'),
        description: getErrorMessage(error),
      });
    }
  };

  if (loading) {
    return <LoadingState label={t('requestDetail.loading')} />;
  }

  if (!request) {
    return null;
  }

  const imageMedia = (request.media ?? []).filter((item) => item.type === 'image');
  const requestPhotos = imageMedia
    .filter((item) => !item.uploadedByOrganizationId)
    .slice(0, REQUEST_DETAIL_PHOTO_LIMIT);
  const organizationPhotos = imageMedia
    .filter((item) => Boolean(item.uploadedByOrganizationId))
    .slice(0, REQUEST_DETAIL_PHOTO_LIMIT);
  const requestPhotoCurrentIndex = requestPhotos.length ? requestPhotoIndex % requestPhotos.length : 0;
  const organizationPhotoCurrentIndex = organizationPhotos.length ? organizationPhotoIndex % organizationPhotos.length : 0;
  const requestPhoto = requestPhotos.length ? requestPhotos[requestPhotoCurrentIndex] : null;
  const organizationPhoto = organizationPhotos.length ? organizationPhotos[organizationPhotoCurrentIndex] : null;
  const mapLatitude = parseCoordinate(request.latitude) ?? parseCoordinate(request.city?.latitude) ?? REQUEST_DETAIL_FALLBACK_CENTER[0];
  const mapLongitude = parseCoordinate(request.longitude) ?? parseCoordinate(request.city?.longitude) ?? REQUEST_DETAIL_FALLBACK_CENTER[1];
  const mapCenter: [number, number] = [mapLatitude, mapLongitude];
  const mapZoom = request.latitude && request.longitude ? 15 : 12;
  const hasSidePanel = user?.role === 'admin' || user?.role === 'organization';
  const mainInfoTitle = t('requestDetail.mainInfoTitle');
  const commentsTitle = t('requestDetail.discussionTitle');
  const requestPhotosLabel = t('requestDetail.mediaTitle');
  const organizationPhotosLabel = `${t('common.organization')} ${t('requestDetail.mediaTitle')}`;
  const requestPhotosEmpty = t('requestDetail.mediaEmptyDescription');
  const organizationPhotosEmpty = t('requestDetail.mediaEmptyDescription');
  const organizationPhotoAlt = t('requestDetail.mediaTitle');
  const backToRequestsText = t('common.back');
  const requestPhotoAlt = t('requestDetail.mediaTitle');
  const canUseDiscussionComposer = user?.role === 'user' || user?.role === 'organization';
  const mainInfoPanel = (
    <article className="panel glass-card request-detail-minimal__main-info-panel">
      <div className="panel__header">
        <h3>{mainInfoTitle}</h3>
      </div>
      <div className="kv-grid">
        <div className="kv-item">
          <span>{t('common.category')}</span>
          <strong>{request.category?.name ?? t('common.unknown')}</strong>
        </div>
        <div className="kv-item">
          <span>{t('common.city')}</span>
          <strong>
            {request.city?.name ?? t('common.unknown')}
            {request.district?.name ? ` / ${request.district.name}` : ''}
          </strong>
        </div>
        <div className="kv-item">
          <span>{t('common.requester')}</span>
          <strong>{request.requester?.fullName ?? t('requestDetail.requesterFallback')}</strong>
        </div>
        <div className="kv-item">
          <span>{t('common.organization')}</span>
          <strong>{request.organization?.name ?? t('requestDetail.unassigned')}</strong>
        </div>
        <div className="kv-item">
          <span>{t('common.createdAt')}</span>
          <strong>{formatDateTime(request.createdAt)}</strong>
        </div>
      </div>
    </article>
  );

  return (
    <div className="page request-detail-minimal">
      <section className="page-header glass-card">
        <div>
          <h1>{request.title}</h1>
          <p>{request.description}</p>
          <div className="request-detail-minimal__status-row request-detail-minimal__status-row--under-title">
            <Badge tone={statusTone(request.status)}>{formatStatusLabel(request.status)}</Badge>
            <Badge tone={priorityTone(request.priority)}>{formatPriorityLabel(request.priority)}</Badge>
          </div>
        </div>
        <div className="page-header__actions">
          {canUseDiscussionComposer ? (
            <Button
              type="button"
              variant="secondary"
              className="request-detail-minimal__back-button"
              onClick={() => navigate(`/chat?request=${request.id}`)}
            >
              <MessageCircle size={15} />
              Чат
            </Button>
          ) : null}
          <Button type="button" variant="secondary" className="request-detail-minimal__back-button" onClick={() => navigate('/requests')}>
            <ArrowLeft size={15} />
            {backToRequestsText}
          </Button>
        </div>
      </section>

      {user?.role === 'admin' ? mainInfoPanel : null}

      <section
        className={`split-layout request-detail-minimal__layout ${hasSidePanel ? '' : 'request-detail-minimal__layout--full'} ${user?.role === 'admin' ? 'request-detail-minimal__layout--admin' : ''}`.trim()}
      >
        <div className="page request-detail-minimal__main">
          {user?.role === 'admin' ? null : mainInfoPanel}

          <article className="panel glass-card">
            <div className="panel__header">
              <span className="section-title__eyebrow">{t('requestDetail.mediaEyebrow')}</span>
            </div>
            <div className="request-detail-media-split">
              <div className="request-detail-media-column">
                <section className="request-detail-media-group">
                  <h4>{requestPhotosLabel}</h4>
                  {requestPhoto ? (
                    <article className="request-detail-media-viewer">
                      <div className="request-detail-media-image-wrap">
                        <img src={resolveFileUrl(requestPhoto.fileUrl)} alt={request.title || requestPhotoAlt} />
                        <button
                          type="button"
                          className="request-detail-media-expand"
                          onClick={() => setPhotoViewer({ src: resolveFileUrl(requestPhoto.fileUrl), alt: request.title || requestPhotoAlt })}
                          aria-label={t('common.preview')}
                        >
                          <Maximize2 size={15} />
                        </button>
                      </div>
                      <div className="request-detail-media-toolbar">
                        <button
                          type="button"
                          className="request-detail-media-nav"
                          onClick={() =>
                            setRequestPhotoIndex((current) => (current - 1 + requestPhotos.length) % requestPhotos.length)
                          }
                          disabled={requestPhotos.length < 2}
                          aria-label={t('pagination.previous')}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <div className="request-detail-media-meta">
                          {formatDateTime(requestPhoto.createdAt)} · {requestPhotoCurrentIndex + 1}/{requestPhotos.length}
                        </div>
                        <button
                          type="button"
                          className="request-detail-media-nav"
                          onClick={() => setRequestPhotoIndex((current) => (current + 1) % requestPhotos.length)}
                          disabled={requestPhotos.length < 2}
                          aria-label={t('pagination.next')}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </article>
                  ) : (
                    <p className="request-detail-media-empty">{requestPhotosEmpty}</p>
                  )}
                </section>

                <section className="request-detail-media-group">
                  <h4>{organizationPhotosLabel}</h4>
                  {organizationPhoto ? (
                    <article className="request-detail-media-viewer">
                      <div className="request-detail-media-image-wrap">
                        <img src={resolveFileUrl(organizationPhoto.fileUrl)} alt={request.organization?.name ?? organizationPhotoAlt} />
                        <button
                          type="button"
                          className="request-detail-media-expand"
                          onClick={() =>
                            setPhotoViewer({
                              src: resolveFileUrl(organizationPhoto.fileUrl),
                              alt: request.organization?.name ?? organizationPhotoAlt,
                            })
                          }
                          aria-label={t('common.preview')}
                        >
                          <Maximize2 size={15} />
                        </button>
                      </div>
                      <div className="request-detail-media-toolbar">
                        <button
                          type="button"
                          className="request-detail-media-nav"
                          onClick={() =>
                            setOrganizationPhotoIndex(
                              (current) => (current - 1 + organizationPhotos.length) % organizationPhotos.length,
                            )
                          }
                          disabled={organizationPhotos.length < 2}
                          aria-label={t('pagination.previous')}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <div className="request-detail-media-meta">
                          {formatDateTime(organizationPhoto.createdAt)} · {organizationPhotoCurrentIndex + 1}/{organizationPhotos.length}
                        </div>
                        <button
                          type="button"
                          className="request-detail-media-nav"
                          onClick={() =>
                            setOrganizationPhotoIndex((current) => (current + 1) % organizationPhotos.length)
                          }
                          disabled={organizationPhotos.length < 2}
                          aria-label={t('pagination.next')}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </article>
                  ) : (
                    <p className="request-detail-media-empty">{organizationPhotosEmpty}</p>
                  )}
                </section>
              </div>

              <section className="request-detail-map-panel">
                <h4>{t('common.location')}</h4>
                <div className="request-detail-map-frame">
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    className="request-detail-map-leaflet"
                    dragging={false}
                    scrollWheelZoom={false}
                    doubleClickZoom={false}
                    touchZoom={false}
                    boxZoom={false}
                    keyboard={false}
                    zoomControl={false}
                    attributionControl={false}
                  >
                    <RequestDetailMapSizer />
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <CircleMarker
                      center={mapCenter}
                      radius={8}
                      pathOptions={{
                        color: '#0b0f18',
                        weight: 3,
                        fillColor: '#ef4444',
                        fillOpacity: 0.95,
                      }}
                    />
                  </MapContainer>
                </div>
              </section>
            </div>
          </article>

          {user?.role !== 'admin' ? (
            <article className="panel glass-card">
              <div className="panel__header">
                <span className="section-title__eyebrow">{t('requestDetail.discussionEyebrow')}</span>
                <h3>{commentsTitle}</h3>
              </div>
              <div className="request-detail-discussion">
                <div className="request-detail-discussion__list">
                  {request.comments?.length ? (
                    request.comments.map((comment) => {
                      const authorName =
                        comment.authorOrganization?.name ??
                        comment.authorUser?.fullName ??
                        (comment.authorUserId === user?.id ? user?.fullName : null) ??
                        t('requestDetail.authorFallback');
                      const authorAvatar =
                        comment.authorUser?.avatarUrl ??
                        (comment.authorUserId === user?.id ? user?.avatarUrl ?? null : null) ??
                        comment.authorOrganization?.logoUrl ??
                        null;
                      const authorInitial = authorName.trim().charAt(0).toUpperCase() || '?';
                      const isOwnComment = canManageComment(comment);
                      const isEditing = editingCommentId === comment.id;
                      const isActionBusy = commentActionBusyId === comment.id;

                      return (
                        <article key={comment.id} className="request-detail-comment-item">
                          <span className="request-detail-comment-avatar" aria-hidden="true">
                            {authorAvatar ? (
                              <img src={resolveFileUrl(authorAvatar)} alt={authorName} className="request-detail-comment-avatar-image" />
                            ) : (
                              authorInitial
                            )}
                          </span>
                          <div className="request-detail-comment-body">
                            <div className="request-detail-comment-meta">
                              <strong>{authorName}</strong>
                              <div className="request-detail-comment-meta-right">
                                <span>{formatDateTime(comment.createdAt)}</span>
                                {isOwnComment && !isEditing ? (
                                  <div className="request-detail-comment-meta-actions">
                                    <button
                                      type="button"
                                      className="request-detail-comment-action request-detail-comment-action--icon request-detail-comment-action--compact"
                                      onClick={() => startCommentEdit(comment)}
                                      disabled={isActionBusy}
                                      aria-label={t('common.edit')}
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      className="request-detail-comment-delete request-detail-comment-action--icon request-detail-comment-action--compact"
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
                              <div className="request-detail-comment-editor">
                                <textarea
                                  className="request-detail-comment-input request-detail-comment-input--inline"
                                  value={editingCommentText}
                                  onChange={(event) => setEditingCommentText(event.target.value)}
                                  rows={2}
                                />
                                <div className="request-detail-comment-actions">
                                  <button
                                    type="button"
                                    className="request-detail-comment-action"
                                    onClick={cancelCommentEdit}
                                    disabled={isActionBusy}
                                  >
                                    {t('common.close')}
                                  </button>
                                  <button
                                    type="button"
                                    className="request-detail-comment-submit"
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
                    })
                  ) : (
                    <p className="request-detail-comments-empty">{t('requestDetail.commentsEmptyDescription')}</p>
                  )}
                </div>
              </div>
            </article>
          ) : null}
        </div>

        {hasSidePanel ? (
          <div className={`page request-detail-minimal__side ${user?.role === 'admin' ? 'request-detail-minimal__side--admin' : ''}`.trim()}>
          {user?.role === 'admin' ? (
            <>
              <h4 className="request-detail-minimal__assign-title">{t('requestDetail.adminTitle')}</h4>
              <article className="panel glass-card request-detail-minimal__assign-panel">
                <form className="page request-detail-minimal__assign-form" onSubmit={assignRequest}>
                  <SelectField
                    label={t('common.organization')}
                    value={assignForm.organizationId}
                    onChange={(event) => setAssignForm((current) => ({ ...current, organizationId: event.target.value }))}
                    required
                  >
                    <option value="">{t('requestDetail.chooseOrganization')}</option>
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label={t('common.priority')}
                    value={assignForm.priority}
                    onChange={(event) => setAssignForm((current) => ({ ...current, priority: event.target.value }))}
                  >
                    <option value="low">{t('requestPriority.low')}</option>
                    <option value="medium">{t('requestPriority.medium')}</option>
                    <option value="high">{t('requestPriority.high')}</option>
                  </SelectField>
                  <Button type="submit" busy={assignBusy}>
                    {t('requestDetail.saveAssignment')}
                  </Button>
                  <Button type="button" variant="danger" onClick={deleteRequest}>
                    {t('requestDetail.deleteRequest')}
                  </Button>
                </form>
              </article>
            </>
          ) : null}

          {user?.role === 'organization' ? (
            <>
              <article className="panel glass-card">
                <div className="panel__header">
                  <span className="section-title__eyebrow">{t('requestDetail.statusEyebrow')}</span>
                  <h3>{t('requestDetail.statusTitle')}</h3>
                </div>
                <form className="page" onSubmit={updateStatus}>
                  <SelectField label={t('common.status')} value={statusValue} onChange={(event) => setStatusValue(event.target.value as typeof statusValue)}>
                    <option value="accepted">{t('requestStatus.accepted')}</option>
                    <option value="in_progress">{t('requestStatus.in_progress')}</option>
                    <option value="resolved">{t('requestStatus.resolved')}</option>
                  </SelectField>
                  <Button type="submit" busy={statusBusy}>
                    {t('requestDetail.updateStatus')}
                  </Button>
                </form>
              </article>

              <article className="panel glass-card">
                <div className="panel__header">
                  <span className="section-title__eyebrow">{t('requestDetail.uploadEyebrow')}</span>
                  <h3>{t('requestDetail.uploadTitle')}</h3>
                </div>
                <form className="page" onSubmit={uploadMedia}>
                  <InputField
                    label={t('common.file')}
                    type="file"
                    accept="image/*,video/*"
                    onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)}
                    required
                  />
                  <Button type="submit" busy={mediaBusy}>
                    {t('requestDetail.uploadMedia')}
                  </Button>
                </form>
              </article>
            </>
          ) : null}
          </div>
        ) : null}
      </section>

      {photoViewer ? (
        <div className="request-detail-photo-modal-shell" role="dialog" aria-modal="true" onClick={() => setPhotoViewer(null)}>
          <div className="request-detail-photo-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="request-detail-photo-modal__close" onClick={() => setPhotoViewer(null)} aria-label={t('common.close')}>
              <X size={16} />
            </button>
            <img src={photoViewer.src} alt={photoViewer.alt} />
          </div>
        </div>
      ) : null}
    </div>
  );
};
