import { BellRing, MessageSquareMore, Workflow } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { PaginationControls } from '../components/ui/PaginationControls';
import { useTranslation } from '../context/language-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { formatCompactNumber, formatDateTime, humanizeNotificationType } from '../lib/format';
import type { Notification, PaginatedResult } from '../types/api';

type NotificationViewItem = Notification & {
  isMock?: boolean;
  icon?: 'assigned' | 'comment' | 'status';
};

const MOCK_NOTIFICATIONS = {
  kk: [
    {
      id: 'mock-assigned',
      userId: 'mock',
      type: 'request_assigned',
      title: 'Өтінім ұйымға бағытталды',
      message: 'Жол жөндеу мәселесі тиісті ұйымға жіберілді.',
      isRead: false,
      createdAt: new Date('2026-04-08T09:15:00.000Z').toISOString(),
      isMock: true,
      icon: 'assigned' as const,
    },
    {
      id: 'mock-comment',
      userId: 'mock',
      type: 'request_comment_added',
      title: 'Жаңа пікір қосылды',
      message: 'Ұйым өтінім бойынша қосымша түсініктеме қалдырды.',
      isRead: true,
      createdAt: new Date('2026-04-08T07:30:00.000Z').toISOString(),
      isMock: true,
      icon: 'comment' as const,
    },
    {
      id: 'mock-status',
      userId: 'mock',
      type: 'request_status_changed',
      title: 'Мәртебе жаңартылды',
      message: 'Өтінім өңдеуде мәртебесіне ауыстырылды.',
      isRead: true,
      createdAt: new Date('2026-04-07T16:20:00.000Z').toISOString(),
      isMock: true,
      icon: 'status' as const,
    },
  ],
  ru: [
    {
      id: 'mock-assigned',
      userId: 'mock',
      type: 'request_assigned',
      title: 'Заявка направлена в организацию',
      message: 'Проблема по ремонту дороги отправлена в ответственную организацию.',
      isRead: false,
      createdAt: new Date('2026-04-08T09:15:00.000Z').toISOString(),
      isMock: true,
      icon: 'assigned' as const,
    },
    {
      id: 'mock-comment',
      userId: 'mock',
      type: 'request_comment_added',
      title: 'Добавлен новый комментарий',
      message: 'Организация оставила дополнительное пояснение по заявке.',
      isRead: true,
      createdAt: new Date('2026-04-08T07:30:00.000Z').toISOString(),
      isMock: true,
      icon: 'comment' as const,
    },
    {
      id: 'mock-status',
      userId: 'mock',
      type: 'request_status_changed',
      title: 'Статус обновлен',
      message: 'Заявка переведена в статус "в обработке".',
      isRead: true,
      createdAt: new Date('2026-04-07T16:20:00.000Z').toISOString(),
      isMock: true,
      icon: 'status' as const,
    },
  ],
  en: [
    {
      id: 'mock-assigned',
      userId: 'mock',
      type: 'request_assigned',
      title: 'Request assigned to organization',
      message: 'The road repair issue was routed to the responsible organization.',
      isRead: false,
      createdAt: new Date('2026-04-08T09:15:00.000Z').toISOString(),
      isMock: true,
      icon: 'assigned' as const,
    },
    {
      id: 'mock-comment',
      userId: 'mock',
      type: 'request_comment_added',
      title: 'New comment added',
      message: 'The organization left an additional note on the request.',
      isRead: true,
      createdAt: new Date('2026-04-08T07:30:00.000Z').toISOString(),
      isMock: true,
      icon: 'comment' as const,
    },
    {
      id: 'mock-status',
      userId: 'mock',
      type: 'request_status_changed',
      title: 'Status updated',
      message: 'The request moved to the in-progress state.',
      isRead: true,
      createdAt: new Date('2026-04-07T16:20:00.000Z').toISOString(),
      isMock: true,
      icon: 'status' as const,
    },
  ],
};

export const NotificationsPage = () => {
  const { t, language } = useTranslation();
  const { pushToast } = useToast();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PaginatedResult<Notification> | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      try {
        const nextResult = await api.notifications.list({ page, limit: 10 });

        if (active) {
          setResult(nextResult);
        }
      } catch (error) {
        if (active) {
          pushToast({
            tone: 'error',
            title: t('notifications.loadFailed'),
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
  }, [page, pushToast, t]);

  const markRead = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setResult((current) =>
        current
          ? {
              ...current,
              items: current.items.map((notification) =>
                notification.id === id ? { ...notification, isRead: true } : notification,
              ),
            }
          : current,
      );
    } catch (error) {
      pushToast({
        tone: 'error',
        title: t('notifications.updateFailed'),
        description: getErrorMessage(error),
      });
    }
  };

  const items = result?.items.length ? result.items : MOCK_NOTIFICATIONS[language];
  const visibleItems = items as NotificationViewItem[];

  const getIcon = (item: NotificationViewItem) => {
    if (item.icon === 'assigned' || item.type === 'request_assigned') {
      return <BellRing size={18} />;
    }

    if (item.icon === 'comment' || item.type === 'request_comment_added') {
      return <MessageSquareMore size={18} />;
    }

    return <Workflow size={18} />;
  };

  const getToneClassName = (item: NotificationViewItem) => {
    if (item.icon === 'assigned' || item.type === 'request_assigned') {
      return 'assigned';
    }

    if (item.icon === 'comment' || item.type === 'request_comment_added') {
      return 'comment';
    }

    return 'status';
  };

  if (loading && !result) {
    return (
      <div className="page">
        <section className="notifications-minimal">
          <div className="notifications-minimal__hero">
            <div className="notifications-minimal__hero-copy">
              <strong>{t('layout.notifications')}</strong>
            </div>
          </div>

          <section className="panel glass-card notifications-minimal__panel">
            <LoadingState label={t('notifications.loading')} />
          </section>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="notifications-minimal">
        <div className="notifications-minimal__hero">
          <div className="notifications-minimal__hero-copy">
            <strong>{t('layout.notifications')}</strong>
          </div>
          <span className="notifications-minimal__hero-count">{formatCompactNumber(visibleItems.length)}</span>
        </div>

        <section className="panel glass-card notifications-minimal__panel">
        <div className="notification-list">
          {visibleItems.map((notification) => (
            <article
              key={notification.id}
              className={`notification-item notification-item--${getToneClassName(notification)} ${notification.isMock ? 'notification-item--mock' : ''} ${!notification.isRead ? 'notification-item--unread' : 'notification-item--read'}`.trim()}
            >
              <div className={`notification-item__icon notification-item__icon--${getToneClassName(notification)}`.trim()}>{getIcon(notification)}</div>
              <div className="notification-item__body">
                <div className="notification-item__head">
                  <strong className="eyebrow">{humanizeNotificationType(notification.type)}</strong>
                  <div className="notification-item__head-meta">
                    {notification.isMock ? <Badge tone="accent">Demo</Badge> : null}
                    <span className="muted-text">{formatDateTime(notification.createdAt)}</span>
                  </div>
                </div>
                <h4>{notification.title}</h4>
                <p>{notification.message}</p>
              </div>
              <div className="notification-item__actions">
                {notification.isMock ? (
                  <span className="muted-text">Demo</span>
                ) : !notification.isRead ? (
                  <Button variant="secondary" size="sm" onClick={() => markRead(notification.id)}>
                    {t('notifications.markRead')}
                  </Button>
                ) : (
                  <span className="muted-text">{t('notifications.read')}</span>
                )}
              </div>
            </article>
          ))}
        </div>

        <PaginationControls
          page={result?.meta.page ?? page}
          totalPages={result?.meta.totalPages ?? 1}
          onChange={setPage}
        />
        </section>
      </section>
    </div>
  );
};
