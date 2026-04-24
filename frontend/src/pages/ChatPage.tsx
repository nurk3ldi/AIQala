import { FileText, Search, SendHorizontal } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { useAuth } from '../context/auth-context';
import { useTranslation } from '../context/language-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import {
  formatDateTime,
  formatStatusLabel,
  resolveFileUrl,
  statusTone,
} from '../lib/format';
import type { Comment, IssueRequest } from '../types/api';

const CHAT_COPY = {
  kk: {
    eyebrow: 'Өтініш чаты',
    title: 'Ұйыммен байланыс',
    description: 'Ұйым қосымша ақпарат сұраса, өтініш авторымен осы жерден сөйлесе алады.',
    dialogs: 'Диалогтар',
    search: 'Өтінішті іздеу',
    loadFailed: 'Чатты жүктеу мүмкін болмады',
    sendFailed: 'Хабар жіберілмеді',
    emptyTitle: 'Әзірге чат жоқ',
    emptyDescription: 'Ұйымға тағайындалған өтініштер осы жерде диалог ретінде шығады.',
    selectTitle: 'Диалог таңдаңыз',
    selectDescription: 'Сөйлесуді бастау үшін сол жақтан өтінішті таңдаңыз.',
    noMessages: 'Әзірге хабар жоқ. Қосымша ақпарат қажет болса, бірінші хабарды жазыңыз.',
    placeholder: 'Хабар жазыңыз...',
    send: 'Жіберу',
    openRequest: 'Толық ақпарат',
    requester: 'Өтініш авторы',
    organization: 'Ұйым',
    you: 'Сіз',
    unassigned: 'Ұйым әлі тағайындалмаған',
    waitingForOrganization: 'Чат ұйым тағайындалғаннан кейін ашылады.',
    requestInfo: 'Өтініш ақпараты',
    lastUpdated: 'Жаңартылған',
  },
  ru: {
    eyebrow: 'Чат заявки',
    title: 'Связь с организацией',
    description: 'Если организации нужна дополнительная информация, она может написать автору заявки здесь.',
    dialogs: 'Диалоги',
    search: 'Поиск заявки',
    loadFailed: 'Не удалось загрузить чат',
    sendFailed: 'Сообщение не отправлено',
    emptyTitle: 'Пока нет чатов',
    emptyDescription: 'Заявки, назначенные организации, появятся здесь как диалоги.',
    selectTitle: 'Выберите диалог',
    selectDescription: 'Чтобы начать общение, выберите заявку слева.',
    noMessages: 'Сообщений пока нет. Напишите первым, если нужна дополнительная информация.',
    placeholder: 'Напишите сообщение...',
    send: 'Отправить',
    openRequest: 'Подробная информация',
    requester: 'Автор заявки',
    organization: 'Организация',
    you: 'Вы',
    unassigned: 'Организация еще не назначена',
    waitingForOrganization: 'Чат откроется после назначения организации.',
    requestInfo: 'Информация заявки',
    lastUpdated: 'Обновлено',
  },
  en: {
    eyebrow: 'Request chat',
    title: 'Conversation with the organization',
    description: 'When the organization needs more information, it can message the request author here.',
    dialogs: 'Dialogs',
    search: 'Search request',
    loadFailed: 'Could not load chat',
    sendFailed: 'Message was not sent',
    emptyTitle: 'No chats yet',
    emptyDescription: 'Requests assigned to an organization will appear here as dialogs.',
    selectTitle: 'Choose a dialog',
    selectDescription: 'Select a request on the left to start the conversation.',
    noMessages: 'No messages yet. Send the first message if more information is needed.',
    placeholder: 'Write a message...',
    send: 'Send',
    openRequest: 'Full details',
    requester: 'Request author',
    organization: 'Organization',
    you: 'You',
    unassigned: 'Organization is not assigned yet',
    waitingForOrganization: 'Chat opens after an organization is assigned.',
    requestInfo: 'Request info',
    lastUpdated: 'Updated',
  },
} as const;

const getCommentTime = (comment: Comment) => new Date(comment.createdAt).getTime();

export const ChatPage = () => {
  const { user } = useAuth();
  const { language, t } = useTranslation();
  const { pushToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const copy = CHAT_COPY[language];
  const selectedRequestId = searchParams.get('request');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [requests, setRequests] = useState<IssueRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<IssueRequest | null>(null);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    const loadRequests = async () => {
      setRequestsLoading(true);

      try {
        const response =
          user.role === 'user'
            ? await api.requests.listMine({ page: 1, limit: 80 })
            : await api.requests.list({ page: 1, limit: 80 });

        if (!active) {
          return;
        }

        setRequests(response.items);
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
          setRequestsLoading(false);
        }
      }
    };

    void loadRequests();

    return () => {
      active = false;
    };
  }, [copy.loadFailed, pushToast, user]);

  useEffect(() => {
    if (requestsLoading) {
      return;
    }

    if (requests.length === 0) {
      if (selectedRequestId) {
        setSearchParams({}, { replace: true });
      }
      return;
    }

    if (selectedRequestId && requests.some((request) => request.id === selectedRequestId)) {
      return;
    }

    setSearchParams({ request: requests[0].id }, { replace: true });
  }, [requests, requestsLoading, selectedRequestId, setSearchParams]);

  useEffect(() => {
    if (!selectedRequestId || !user) {
      setActiveRequest(null);
      return;
    }

    let active = true;

    const loadThread = async () => {
      setThreadLoading(true);

      try {
        const detail =
          user.role === 'user' ? await api.requests.getMineById(selectedRequestId) : await api.requests.detail(selectedRequestId);

        if (active) {
          setActiveRequest(detail);
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
          setThreadLoading(false);
        }
      }
    };

    void loadThread();

    return () => {
      active = false;
    };
  }, [copy.loadFailed, pushToast, selectedRequestId, user]);

  const sortedComments = useMemo(
    () =>
      [...(activeRequest?.comments ?? [])]
        .filter((comment) => comment.source === 'chat')
        .sort((left, right) => getCommentTime(left) - getCommentTime(right)),
    [activeRequest?.comments],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [sortedComments.length, activeRequest?.id]);

  const filteredRequests = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    if (!normalized) {
      return requests;
    }

    return requests.filter((request) =>
      [request.title, request.description, request.category?.name, request.city?.name, request.organization?.name]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [requests, searchQuery]);

  const canSendMessage =
    Boolean(activeRequest) && (user?.role === 'organization' || Boolean(activeRequest?.organizationId));

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeRequest || !messageText.trim() || !canSendMessage) {
      return;
    }

    setSendBusy(true);

    try {
      await api.requests.addComment(activeRequest.id, messageText.trim());
      const detail =
        user?.role === 'user' ? await api.requests.getMineById(activeRequest.id) : await api.requests.detail(activeRequest.id);

      setActiveRequest(detail);
      setRequests((current) =>
        current.map((request) =>
          request.id === detail.id
            ? {
                ...request,
                updatedAt: detail.updatedAt,
              }
            : request,
        ),
      );
      setMessageText('');
    } catch (error) {
      pushToast({
        tone: 'error',
        title: copy.sendFailed,
        description: getErrorMessage(error),
      });
    } finally {
      setSendBusy(false);
    }
  };

  const getAuthorName = (comment: Comment) => {
    if (comment.authorUserId === user?.id || comment.authorOrganizationId === user?.organizationId) {
      return copy.you;
    }

    return (
      comment.authorOrganization?.name ??
      comment.authorUser?.fullName ??
      (comment.authorOrganizationId ? activeRequest?.organization?.name : null) ??
      (comment.authorUserId ? activeRequest?.requester?.fullName : null) ??
      t('common.unknown')
    );
  };

  const getAuthorAvatar = (comment: Comment) =>
    comment.authorUser?.avatarUrl ??
    comment.authorOrganization?.logoUrl ??
    (comment.authorUserId === user?.id ? user?.avatarUrl ?? null : null) ??
    null;

  const isOwnMessage = (comment: Comment) =>
    comment.authorUserId === user?.id || (Boolean(comment.authorOrganizationId) && comment.authorOrganizationId === user?.organizationId);

  if (requestsLoading) {
    return <LoadingState label={t('common.loading')} />;
  }

  return (
    <div className="page chat-page">
      <header className="chat-page__hero">
        <div className="chat-page__hero-copy">
          <strong>Чат</strong>
        </div>
      </header>

      {requests.length === 0 ? (
        <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
      ) : (
        <section className="chat-page__layout">
          <aside className="chat-page__sidebar">
            <div className="chat-page__sidebar-head">
              <strong>{copy.dialogs}</strong>
              <span>{requests.length}</span>
            </div>
            <label className="chat-page__search">
              <Search size={17} />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={copy.search} />
            </label>
            <div className="chat-page__request-list">
              {filteredRequests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  className={`chat-page__request ${request.id === selectedRequestId ? 'chat-page__request--active' : ''}`}
                  onClick={() => setSearchParams({ request: request.id })}
                >
                  <span className="chat-page__request-title">{request.title}</span>
                  <span className="chat-page__request-meta">
                    {request.organization?.name ?? copy.unassigned}
                  </span>
                  <span className="chat-page__request-footer">
                    <Badge tone={statusTone(request.status)}>{formatStatusLabel(request.status)}</Badge>
                    <small>{formatDateTime(request.updatedAt)}</small>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <article className="chat-page__thread">
            {threadLoading ? (
              <LoadingState label={t('common.loading')} />
            ) : activeRequest ? (
              <>
                <div className="chat-page__thread-head">
                  <div className="chat-page__request-preview">
                    <strong>{activeRequest.title}</strong>
                    <p>{activeRequest.description}</p>
                  </div>
                  <div className="chat-page__thread-actions">
                    <div className="chat-page__participants chat-page__participants--inline">
                      <div>
                        <strong>{activeRequest.organization?.name ?? copy.unassigned}</strong>
                      </div>
                    </div>
                    <Link to={`/requests/${activeRequest.id}`} className="chat-page__details-link">
                      <FileText size={14} />
                      {copy.openRequest}
                    </Link>
                  </div>
                </div>

                <div className="chat-page__messages">
                  {sortedComments.length > 0 ? (
                    sortedComments.map((comment) => {
                      const authorName = getAuthorName(comment);
                      const authorAvatar = getAuthorAvatar(comment);
                      const mine = isOwnMessage(comment);

                      return (
                        <article key={comment.id} className={`chat-page__message ${mine ? 'chat-page__message--mine' : ''}`}>
                          <span className="chat-page__avatar" aria-hidden="true">
                            {authorAvatar ? (
                              <img src={resolveFileUrl(authorAvatar)} alt={authorName} />
                            ) : (
                              authorName.trim().charAt(0).toUpperCase() || '?'
                            )}
                          </span>
                          <div className="chat-page__bubble">
                            <div className="chat-page__message-meta">
                              <strong>{authorName}</strong>
                              <span>{formatDateTime(comment.createdAt)}</span>
                            </div>
                            <p>{comment.text}</p>
                          </div>
                        </article>
                      );
                    })
                  ) : null}
                  <div ref={messagesEndRef} />
                </div>

                {!canSendMessage ? (
                  <p className="chat-page__locked">{copy.waitingForOrganization}</p>
                ) : (
                  <form className="chat-page__composer" onSubmit={submitMessage}>
                    <textarea
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      placeholder={copy.placeholder}
                      rows={2}
                    />
                    <Button type="submit" busy={sendBusy} disabled={!messageText.trim()} className="chat-page__send-button">
                      <SendHorizontal size={17} />
                      {copy.send}
                    </Button>
                  </form>
                )}
              </>
            ) : (
              <EmptyState title={copy.selectTitle} description={copy.selectDescription} />
            )}
          </article>
        </section>
      )}
    </div>
  );
};
