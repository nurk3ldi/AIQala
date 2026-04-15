import type {
  AnalyticsOverview,
  ApiEnvelope,
  AuthSession,
  AuthUser,
  Category,
  City,
  Comment,
  District,
  DraftCommentResult,
  IssueRequest,
  Media,
  ModerationResult,
  Notification,
  Organization,
  OrganizationAccount,
  PaginatedResult,
  RequestAnalysisResult,
  RequestFilters,
  RequestPriority,
  RequestStatus,
} from '../types/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type UnauthorizedHandler = () => void;

let getAccessToken: () => string | null = () => null;
let handleUnauthorized: UnauthorizedHandler = () => undefined;

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? '/api' : '')).replace(/\/$/, '');
const requestTimeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000);

const buildUrl = (path: string, query?: object) => {
  const searchParams = new URLSearchParams();

  Object.entries((query ?? {}) as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const search = searchParams.toString();
  return `${baseUrl}${path}${search ? `?${search}` : ''}`;
};

async function request<T>(path: string, init?: RequestInit & { query?: object; skipAuthHandler?: boolean }) {
  const headers = new Headers(init?.headers);
  const token = getAccessToken();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMs);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, init?.query), {
      ...init,
      headers,
      signal: init?.signal ?? controller.signal,
    });
  } catch (error) {
    window.clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Сервер тым ұзақ жауап берді', 408, 'REQUEST_TIMEOUT', null);
    }

    throw new ApiError('Серверге қосылу мүмкін болмады', 0, 'NETWORK_ERROR', null);
  }

  window.clearTimeout(timeoutId);

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? ((await response.json()) as ApiEnvelope<T> & { error?: any }) : null;

  if (!response.ok) {
    if (response.status === 401 && !init?.skipAuthHandler) {
      handleUnauthorized();
    }

    throw new ApiError(
      payload?.error?.message ?? 'Сұрауды орындау мүмкін болмады',
      response.status,
      payload?.error?.code ?? 'REQUEST_FAILED',
      payload?.error?.details ?? null,
    );
  }

  return payload!.data;
}

export const configureApiClient = (config: {
  getToken?: () => string | null;
  onUnauthorized?: UnauthorizedHandler;
}) => {
  if (config.getToken) {
    getAccessToken = config.getToken;
  }

  if (config.onUnauthorized) {
    handleUnauthorized = config.onUnauthorized;
  }
};

export const api = {
  auth: {
    register: (payload: { fullName: string; email: string; password: string }) =>
      request<AuthSession>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuthHandler: true,
      }),
    login: (payload: { email: string; password: string }) =>
      request<AuthSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuthHandler: true,
      }),
  },
  users: {
    me: () => request<AuthUser>('/users/me'),
    updateMe: (payload: { fullName?: string; email?: string; currentPassword?: string; newPassword?: string }) =>
      request<AuthUser>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    uploadAvatar: (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);

      return request<AuthUser>('/users/me/avatar', {
        method: 'POST',
        body: formData,
      });
    },
    deleteAvatar: () =>
      request<AuthUser>('/users/me/avatar', {
        method: 'DELETE',
      }),
  },
  categories: {
    list: () => request<Category[]>('/categories'),
    create: (payload: { name: string; description?: string }) =>
      request<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: { name?: string; description?: string }) =>
      request<Category>(`/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    remove: (id: string) =>
      request<void>(`/categories/${id}`, {
        method: 'DELETE',
      }),
    bindOrganization: (id: string, organizationId: string) =>
      request<Category>(`/categories/${id}/organizations/${organizationId}`, {
        method: 'POST',
      }),
  },
  locations: {
    cities: {
      list: () => request<City[]>('/cities'),
      create: (payload: { name: string; region?: string; latitude?: string; longitude?: string }) =>
        request<City>('/cities', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      update: (id: string, payload: { name?: string; region?: string; latitude?: string; longitude?: string }) =>
        request<City>(`/cities/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }),
      remove: (id: string) =>
        request<void>(`/cities/${id}`, {
          method: 'DELETE',
        }),
    },
    districts: {
      list: (query?: { cityId?: string }) =>
        request<District[]>('/districts', {
          query,
        }),
      create: (payload: { name: string; cityId: string; latitude?: string; longitude?: string }) =>
        request<District>('/districts', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      update: (id: string, payload: { name?: string; cityId?: string; latitude?: string; longitude?: string }) =>
        request<District>(`/districts/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }),
      remove: (id: string) =>
        request<void>(`/districts/${id}`, {
          method: 'DELETE',
        }),
    },
  },
  organizations: {
    list: (query?: { page?: number; limit?: number; cityId?: string; categoryId?: string; isActive?: boolean | '' }) =>
      request<PaginatedResult<Organization>>('/organizations', {
        query,
      }),
    create: (payload: {
      name: string;
      description?: string;
      cityId: string;
      districtId?: string;
      address: string;
      phone?: string;
      categoryIds?: string[];
      account: { fullName: string; email: string; password: string };
    }) =>
      request<Organization>('/organizations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    detail: (id: string) => request<Organization>(`/organizations/${id}`),
    update: (
      id: string,
      payload: {
        name?: string;
        description?: string;
        cityId?: string;
        districtId?: string;
        address?: string;
        phone?: string;
        categoryIds?: string[];
      },
    ) =>
      request<Organization>(`/organizations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    toggleActive: (id: string, isActive?: boolean) =>
      request<Organization>(`/organizations/${id}/toggle-active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    me: () => request<Organization>('/organizations/me'),
    listAccounts: (organizationId: string) => request<OrganizationAccount[]>(`/organizations/${organizationId}/accounts`),
    createAccount: (organizationId: string, payload: { fullName: string; email: string; password: string }) =>
      request<OrganizationAccount>(`/organizations/${organizationId}/accounts`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    toggleAccount: (organizationId: string, accountId: string, isActive?: boolean) =>
      request<OrganizationAccount>(`/organizations/${organizationId}/accounts/${accountId}/toggle-active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
  },
  requests: {
    create: (payload: {
      title: string;
      description: string;
      categoryId: string;
      cityId: string;
      districtId?: string;
      organizationId?: string;
      latitude: string;
      longitude: string;
      priority?: RequestPriority;
    }) =>
      request<IssueRequest>('/requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    listMine: (query?: RequestFilters) =>
      request<PaginatedResult<IssueRequest>>('/requests/my', {
        query,
      }),
    getMineById: (id: string) => request<IssueRequest>(`/requests/my/${id}`),
    list: (query?: RequestFilters) =>
      request<PaginatedResult<IssueRequest>>('/requests', {
        query,
      }),
    detail: (id: string) => request<IssueRequest>(`/requests/${id}`),
    assign: (id: string, payload: { organizationId: string; priority?: RequestPriority }) =>
      request<IssueRequest>(`/requests/${id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    updateStatus: (id: string, status: RequestStatus) =>
      request<IssueRequest>(`/requests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    addComment: (id: string, text: string) =>
      request<Comment>(`/requests/${id}/comment`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
    addMedia: (id: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      return request<Media>(`/requests/${id}/media`, {
        method: 'POST',
        body: formData,
      });
    },
    remove: (id: string) =>
      request<void>(`/requests/${id}`, {
        method: 'DELETE',
      }),
  },
  notifications: {
    list: (query?: { page?: number; limit?: number }) =>
      request<PaginatedResult<Notification>>('/notifications', {
        query,
      }),
    markRead: (id: string) =>
      request<Notification>(`/notifications/${id}/read`, {
        method: 'PATCH',
      }),
  },
  analytics: {
    overview: () => request<AnalyticsOverview>('/analytics/overview'),
  },
  ai: {
    moderate: (payload: { text: string; context?: 'request' | 'comment' | 'profile' | 'general' }) =>
      request<ModerationResult>('/ai/moderate', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    analyzeRequest: (payload: { title: string; description: string; cityId?: string; districtId?: string }) =>
      request<RequestAnalysisResult>('/ai/requests/analyze', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    analyzeExistingRequest: (requestId: string) =>
      request<RequestAnalysisResult>(`/ai/requests/${requestId}/analyze`, {
        method: 'POST',
      }),
    draftComment: (
      requestId: string,
      payload: {
        objective?: 'acknowledge' | 'status_update' | 'request_more_info' | 'resolution';
        tone?: 'formal' | 'empathetic' | 'concise';
        includeNextSteps?: boolean;
        extraInstructions?: string;
      },
    ) =>
      request<DraftCommentResult>(`/ai/requests/${requestId}/draft-comment`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
};
