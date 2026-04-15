import type { RequestPriority, RequestStatus, UserRole } from '../types/api';
import { getLocaleForLanguage, translate } from './i18n';

export const formatDateTime = (value?: string | null) => {
  if (!value) {
    return translate('common.notAvailable');
  }

  return new Intl.DateTimeFormat(getLocaleForLanguage(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

export const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat(getLocaleForLanguage(), {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

export const formatRoleLabel = (role: UserRole) => translate(`roles.${role}`);

export const formatStatusLabel = (status: RequestStatus) => translate(`requestStatus.${status}`);

export const statusTone = (status: RequestStatus): 'warning' | 'accent' | 'success' =>
  ({
    accepted: 'warning',
    in_progress: 'accent',
    resolved: 'success',
  } as const)[status];

export const formatPriorityLabel = (priority: RequestPriority) => translate(`requestPriority.${priority}`);

export const priorityTone = (priority: RequestPriority): 'success' | 'warning' | 'danger' =>
  ({
    low: 'success',
    medium: 'warning',
    high: 'danger',
  } as const)[priority];

export const percentage = (value: number) => `${Math.round(value * 100)}%`;

export const humanizeNotificationType = (value: string) => {
  const key = `notifications.${value}`;
  const translated = translate(key);
  return translated === key ? translate('notifications.fallbackType') : translated;
};

export const resolveFileUrl = (fileUrl: string) => {
  if (/^https?:\/\//.test(fileUrl)) {
    return fileUrl;
  }

  const baseUrl = (import.meta.env.VITE_UPLOADS_BASE_URL ?? '').trim().replace(/\/$/, '');

  if (!baseUrl) {
    return fileUrl;
  }

  return `${baseUrl}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
};
