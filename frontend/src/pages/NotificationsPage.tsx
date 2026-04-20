import { BellRing, MessageSquareMore, Workflow } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { PaginationControls } from '../components/ui/PaginationControls';
import { useTranslation } from '../context/language-context';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { formatCompactNumber, formatDateTime, humanizeNotificationType } from '../lib/format';
import type { Notification, PaginatedResult } from '../types/api';

export const NotificationsPage = () => {
  const { t } = useTranslation();
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

  const visibleItems = result?.items ?? [];

  const getIcon = (item: Notification) => {
    if (item.type === 'request_assigned') {
      return <BellRing size={18} />;
    }

    if (item.type === 'request_comment_added') {
      return <MessageSquareMore size={18} />;
    }

    return <Workflow size={18} />;
  };

  const getToneClassName = (item: Notification) => {
    if (item.type === 'request_assigned') {
      return 'assigned';
    }

    if (item.type === 'request_comment_added') {
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
            {!visibleItems.length ? (
              <EmptyState title={t('notifications.emptyTitle')} description={t('notifications.emptyDescription')} />
            ) : (
              visibleItems.map((notification) => (
                <article
                  key={notification.id}
                  className={`notification-item notification-item--${getToneClassName(notification)} ${!notification.isRead ? 'notification-item--unread' : 'notification-item--read'}`.trim()}
                >
                  <div className={`notification-item__icon notification-item__icon--${getToneClassName(notification)}`.trim()}>
                    {getIcon(notification)}
                  </div>

                  <div className="notification-item__body">
                    <div className="notification-item__head">
                      <strong className="eyebrow">{humanizeNotificationType(notification.type)}</strong>
                      <div className="notification-item__head-meta">
                        <span className="muted-text">{formatDateTime(notification.createdAt)}</span>
                      </div>
                    </div>
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                  </div>

                  <div className="notification-item__actions">
                    {!notification.isRead ? (
                      <Button variant="secondary" size="sm" onClick={() => markRead(notification.id)}>
                        {t('notifications.markRead')}
                      </Button>
                    ) : (
                      <span className="muted-text">{t('notifications.read')}</span>
                    )}
                  </div>
                </article>
              ))
            )}
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
