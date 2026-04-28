import { env } from '../config/env';

type RequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | null | undefined>;
  token?: string;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
  message?: string;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { query, token, headers, ...requestOptions } = options;
  const url = new URL(`${env.apiUrl}${path}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  let response: Response;

  const isFormData = requestOptions.body instanceof FormData;

  try {
    response = await fetch(url.toString(), {
      ...requestOptions,
      headers: {
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new Error(`Сервер недоступен: ${env.apiUrl}`);
  }

  const payload = (await response.json()) as ApiErrorPayload;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? payload.message ?? 'API request failed');
  }

  return payload as T;
}
