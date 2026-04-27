import { apiRequest } from './api';

export type RequestStatus = 'accepted' | 'in_progress' | 'resolved';

export type IssueRequest = {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  latitude: string | null;
  longitude: string | null;
  category?: {
    name: string;
  } | null;
  city?: {
    name: string;
  } | null;
};

type PaginatedResult<T> = {
  items: T[];
  meta: {
    totalPages: number;
  };
};

type RequestsResponse = {
  success: boolean;
  data: PaginatedResult<IssueRequest>;
};

const PAGE_LIMIT = 100;
const MAX_MAP_PAGES = 10;

const fetchPage = (token: string, path: '/requests' | '/requests/my', page: number) =>
  apiRequest<RequestsResponse>(path, {
    token,
    query: {
      page,
      limit: PAGE_LIMIT,
    },
  });

export async function listMapRequests(token: string): Promise<IssueRequest[]> {
  const items: IssueRequest[] = [];
  let page = 1;
  let totalPages = 1;
  let path: '/requests' | '/requests/my' = '/requests';

  do {
    let response: RequestsResponse;

    try {
      response = await fetchPage(token, path, page);
    } catch (error) {
      if (path === '/requests' && page === 1) {
        path = '/requests/my';
        response = await fetchPage(token, path, page);
      } else {
        throw error;
      }
    }

    items.push(...response.data.items);
    totalPages = response.data.meta.totalPages;
    page += 1;
  } while (page <= totalPages && page <= MAX_MAP_PAGES);

  return items;
}
