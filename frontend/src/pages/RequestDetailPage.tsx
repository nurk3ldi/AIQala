import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { InputField, SelectField, TextareaField } from '../components/ui/Fields';
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
import type { DraftCommentResult, IssueRequest, Organization } from '../types/api';

export const RequestDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<IssueRequest | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [draft, setDraft] = useState<DraftCommentResult | null>(null);
  const [assignBusy, setAssignBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [assignForm, setAssignForm] = useState({
    organizationId: '',
    priority: '',
  });
  const [statusValue, setStatusValue] = useState<'accepted' | 'in_progress' | 'resolved'>('accepted');
  const [commentText, setCommentText] = useState('');
  const [draftForm, setDraftForm] = useState<{
    objective: 'acknowledge' | 'status_update' | 'request_more_info' | 'resolution';
    tone: 'formal' | 'empathetic' | 'concise';
    includeNextSteps: boolean;
    extraInstructions: string;
  }>({
    objective: 'status_update',
    tone: 'formal',
    includeNextSteps: true,
    extraInstructions: '',
  });
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

  const generateDraft = async () => {
    if (!id) {
      return;
    }

    try {
      const result = await api.ai.draftComment(id, draftForm);
      setDraft(result);
      setCommentText(result.commentText);

      if (result.suggestedStatus) {
        setStatusValue(result.suggestedStatus);
      }
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('requestDetail.draftFailed'),
        description: getErrorMessage(error),
      });
    }
  };

  const addComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) {
      return;
    }

    setCommentBusy(true);

    try {
      await api.requests.addComment(id, commentText);
      setCommentText('');
      setDraft(null);
      await refreshRequest();
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
  const requestPhotos = imageMedia.filter((item) => !item.uploadedByOrganizationId);
  const organizationPhotos = imageMedia.filter((item) => Boolean(item.uploadedByOrganizationId));
  const hasSidePanel = user?.role === 'admin' || user?.role === 'organization';
  const mainInfoTitle = '\u0411\u0430\u0441\u0442\u044b \u0430\u049b\u043f\u0430\u0440\u0430\u0442';
  const photosTitle = '\u04e8\u0442\u0456\u043d\u0456\u0448 \u0444\u043e\u0442\u043e\u043b\u0430\u0440\u044b';
  const commentsTitle = '\u041f\u0456\u043a\u0456\u0440\u043b\u0435\u0440';
  const requestPhotosLabel = '\u04e8\u0442\u0456\u043d\u0456\u0448\u043a\u0435 \u0442\u0456\u0440\u043a\u0435\u043b\u0433\u0435\u043d \u0444\u043e\u0442\u043e';
  const organizationPhotosLabel = '\u04b0\u0439\u044b\u043c \u0436\u04af\u043a\u0442\u0435\u0433\u0435\u043d \u0444\u043e\u0442\u043e';
  const requestPhotosEmpty = '\u0424\u043e\u0442\u043e \u04d9\u043b\u0456 \u0442\u0456\u0440\u043a\u0435\u043b\u043c\u0435\u0433\u0435\u043d.';
  const organizationPhotosEmpty = '\u04b0\u0439\u044b\u043c \u0444\u043e\u0442\u043e \u0436\u04af\u043a\u0442\u0435\u043c\u0435\u0433\u0435\u043d.';
  const organizationPhotoAlt = '\u04b0\u0439\u044b\u043c \u0444\u043e\u0442\u043e\u0441\u044b';

  return (
    <div className="page request-detail-minimal">
      <section className="page-header glass-card">
        <div>
          <h1>{request.title}</h1>
          <p>{request.description}</p>
        </div>
        <div className="page-header__actions">
          <Badge tone={statusTone(request.status)}>{formatStatusLabel(request.status)}</Badge>
          <Badge tone={priorityTone(request.priority)}>{formatPriorityLabel(request.priority)}</Badge>
        </div>
      </section>

      <section className={`split-layout request-detail-minimal__layout ${hasSidePanel ? '' : 'request-detail-minimal__layout--full'}`.trim()}>
        <div className="page">
          <article className="panel glass-card">
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
                <span>{t('common.coordinates')}</span>
                <strong>
                  {request.latitude}, {request.longitude}
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

          <article className="panel glass-card">
            <div className="panel__header">
              <span className="section-title__eyebrow">Фотолар</span>
              <h3>{photosTitle}</h3>
            </div>
            <div className="request-detail-media-split">
              <section className="request-detail-media-group">
                <h4>{requestPhotosLabel}</h4>
                {requestPhotos.length ? (
                  <div className="request-detail-media-grid">
                    {requestPhotos.map((item) => (
                      <article key={item.id} className="request-detail-media-item">
                        <img src={resolveFileUrl(item.fileUrl)} alt={request.title} />
                        <div className="request-detail-media-meta">{formatDateTime(item.createdAt)}</div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="request-detail-media-empty">{requestPhotosEmpty}</p>
                )}
              </section>

              <section className="request-detail-media-group">
                <h4>{organizationPhotosLabel}</h4>
                {organizationPhotos.length ? (
                  <div className="request-detail-media-grid">
                    {organizationPhotos.map((item) => (
                      <article key={item.id} className="request-detail-media-item">
                        <img src={resolveFileUrl(item.fileUrl)} alt={request.organization?.name ?? organizationPhotoAlt} />
                        <div className="request-detail-media-meta">{formatDateTime(item.createdAt)}</div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="request-detail-media-empty">{organizationPhotosEmpty}</p>
                )}
              </section>
            </div>
          </article>

          <article className="panel glass-card">
            <div className="panel__header">
              <span className="section-title__eyebrow">{t('requestDetail.discussionEyebrow')}</span>
              <h3>{commentsTitle}</h3>
            </div>
            {request.comments?.length ? (
              <div className="comment-thread">
                {request.comments.map((comment) => (
                  <article key={comment.id} className="comment-card">
                    <div className="comment-card__meta">
                      <strong>{comment.authorOrganization?.name ?? comment.authorUser?.fullName ?? t('requestDetail.authorFallback')}</strong>
                      <span>{formatDateTime(comment.createdAt)}</span>
                    </div>
                    <p className="muted-text">{comment.text}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="request-detail-comments-empty">{t('requestDetail.commentsEmptyDescription')}</p>
            )}
          </article>
        </div>

        {hasSidePanel ? <div className="page">
          {user?.role === 'admin' ? (
            <article className="panel glass-card">
              <div className="panel__header">
                <span className="section-title__eyebrow">{t('requestDetail.adminEyebrow')}</span>
                <h3>{t('requestDetail.adminTitle')}</h3>
              </div>
              <form className="page" onSubmit={assignRequest}>
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
                  <span className="section-title__eyebrow">{t('requestDetail.draftEyebrow')}</span>
                  <h3>{t('requestDetail.draftTitle')}</h3>
                </div>
                <div className="page">
                  <div className="grid-2">
                    <SelectField
                      label={t('requestDetail.objective')}
                      value={draftForm.objective}
                      onChange={(event) =>
                        setDraftForm((current) => ({
                          ...current,
                          objective: event.target.value as 'acknowledge' | 'status_update' | 'request_more_info' | 'resolution',
                        }))
                      }
                    >
                      <option value="acknowledge">{t('requestDetail.objectiveOptions.acknowledge')}</option>
                      <option value="status_update">{t('requestDetail.objectiveOptions.status_update')}</option>
                      <option value="request_more_info">{t('requestDetail.objectiveOptions.request_more_info')}</option>
                      <option value="resolution">{t('requestDetail.objectiveOptions.resolution')}</option>
                    </SelectField>
                    <SelectField
                      label={t('requestDetail.tone')}
                      value={draftForm.tone}
                      onChange={(event) =>
                        setDraftForm((current) => ({
                          ...current,
                          tone: event.target.value as 'formal' | 'empathetic' | 'concise',
                        }))
                      }
                    >
                      <option value="formal">{t('requestDetail.toneOptions.formal')}</option>
                      <option value="empathetic">{t('requestDetail.toneOptions.empathetic')}</option>
                      <option value="concise">{t('requestDetail.toneOptions.concise')}</option>
                    </SelectField>
                  </div>
                  <TextareaField
                    label={t('requestDetail.extraInstructions')}
                    value={draftForm.extraInstructions}
                    onChange={(event) => setDraftForm((current) => ({ ...current, extraInstructions: event.target.value }))}
                  />
                  <label className="field">
                    <span className="field__label">{t('requestDetail.includeNextSteps')}</span>
                    <input
                      type="checkbox"
                      checked={draftForm.includeNextSteps}
                      onChange={(event) => setDraftForm((current) => ({ ...current, includeNextSteps: event.target.checked }))}
                    />
                  </label>
                  <Button variant="secondary" onClick={generateDraft}>
                    {t('requestDetail.generateDraft')}
                  </Button>
                  {draft ? (
                    <div className="record-card">
                      <p className="muted-text">{draft.internalSummary}</p>
                      {draft.suggestedStatus ? <Badge tone="accent">{t('requestDetail.suggestedStatus', { status: formatStatusLabel(draft.suggestedStatus as 'accepted' | 'in_progress' | 'resolved') })}</Badge> : null}
                    </div>
                  ) : null}
                </div>
              </article>

              <article className="panel glass-card">
                <div className="panel__header">
                  <span className="section-title__eyebrow">{t('requestDetail.publicCommentEyebrow')}</span>
                  <h3>{t('requestDetail.publicCommentTitle')}</h3>
                </div>
                <form className="page" onSubmit={addComment}>
                  <TextareaField
                    label={t('requestDetail.comment')}
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    required
                    minLength={1}
                  />
                  <Button type="submit" busy={commentBusy}>
                    {t('requestDetail.publishComment')}
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
        </div> : null}
      </section>
    </div>
  );
};
