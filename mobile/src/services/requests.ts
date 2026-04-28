import { apiRequest } from './api';

export type RequestStatus = 'accepted' | 'in_progress' | 'resolved';
export type RequestPriority = 'low' | 'medium' | 'high';

export type IssueRequest = {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  priority?: RequestPriority;
  categoryId?: string;
  cityId?: string;
  districtId?: string | null;
  organizationId?: string | null;
  latitude: string | null;
  longitude: string | null;
  createdAt?: string;
  updatedAt?: string;
  category?: {
    name: string;
  } | null;
  city?: {
    name: string;
    latitude?: string | null;
    longitude?: string | null;
  } | null;
  district?: {
    name: string;
  } | null;
  organization?: {
    name: string;
  } | null;
  requester?: {
    fullName: string;
  } | null;
  media?: RequestMedia[];
  comments?: RequestComment[];
};

export type RequestMedia = {
  id: string;
  type: 'image' | 'video';
  fileUrl: string;
  createdAt?: string;
  uploadedByOrganizationId?: string | null;
};

export type Category = {
  id: string;
  name: string;
};

export type City = {
  id: string;
  name: string;
  latitude?: string | null;
  longitude?: string | null;
};

export type District = {
  id: string;
  name: string;
  cityId?: string;
};

export type RequestFilters = {
  page?: number;
  limit?: number;
  status?: RequestStatus | '';
  categoryId?: string;
  cityId?: string;
  districtId?: string;
};

export type RequestComment = {
  id: string;
  text: string;
  createdAt?: string;
  source?: 'chat' | 'map';
  authorUserId?: string | null;
  authorOrganizationId?: string | null;
  authorUser?: {
    fullName: string;
    avatarUrl?: string | null;
  } | null;
  authorOrganization?: {
    name: string;
    logoUrl?: string | null;
  } | null;
};

type PaginatedResult<T> = {
  items: T[];
  meta: {
    page?: number;
    totalPages: number;
    totalItems?: number;
  };
};

type RequestsResponse = {
  success: boolean;
  data: PaginatedResult<IssueRequest>;
};

type RequestResponse = {
  success: boolean;
  data: IssueRequest;
};

type MediaResponse = {
  success: boolean;
  data: RequestMedia;
};

type CommentResponse = {
  success: boolean;
  data: RequestComment;
};

type ListResponse<T> = {
  success: boolean;
  data: T[];
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

export async function listRequests(token: string, filters: RequestFilters): Promise<PaginatedResult<IssueRequest>> {
  const query = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 10,
    status: filters.status ?? '',
    categoryId: filters.categoryId ?? '',
    cityId: filters.cityId ?? '',
    districtId: filters.districtId ?? '',
  };

  try {
    const response = await apiRequest<RequestsResponse>('/requests', {
      token,
      query,
    });

    return response.data;
  } catch {
    const response = await apiRequest<RequestsResponse>('/requests/my', {
      token,
      query,
    });

    return response.data;
  }
}

export async function getRequestDetail(token: string, id: string): Promise<IssueRequest> {
  try {
    const response = await apiRequest<RequestResponse>(`/requests/${id}`, {
      token,
    });

    return response.data;
  } catch (error) {
    const response = await apiRequest<RequestResponse>(`/requests/my/${id}`, {
      token,
    });

    return response.data;
  }
}

export async function addRequestComment(token: string, id: string, text: string): Promise<RequestComment> {
  const response = await apiRequest<CommentResponse>(`/requests/${id}/comment`, {
    method: 'POST',
    body: JSON.stringify({ text, source: 'map' }),
    token,
  });

  return response.data;
}

export async function addChatMessage(token: string, id: string, text: string): Promise<RequestComment> {
  const response = await apiRequest<CommentResponse>(`/requests/${id}/comment`, {
    method: 'POST',
    body: JSON.stringify({ text, source: 'chat' }),
    token,
  });

  return response.data;
}

export async function updateRequest(
  token: string,
  id: string,
  payload: {
    title?: string;
    description?: string;
    categoryId?: string;
    cityId?: string;
    districtId?: string | null;
    latitude?: string;
    longitude?: string;
    priority?: RequestPriority;
  },
): Promise<IssueRequest> {
  const response = await apiRequest<RequestResponse>(`/requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });

  return response.data;
}

export async function deleteRequest(token: string, id: string): Promise<void> {
  await apiRequest<{ success: boolean; data?: unknown }>(`/requests/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function listCategories(token: string): Promise<Category[]> {
  const response = await apiRequest<ListResponse<Category>>('/categories', {
    token,
  });

  return response.data;
}

export async function listCities(token: string): Promise<City[]> {
  const response = await apiRequest<ListResponse<City>>('/cities', {
    token,
  });

  return response.data;
}

export async function listDistricts(token: string, cityId: string): Promise<District[]> {
  const response = await apiRequest<ListResponse<District>>('/districts', {
    token,
    query: {
      cityId,
    },
  });

  return response.data;
}

export async function createRequest(
  token: string,
  payload: {
    title: string;
    description: string;
    categoryId: string;
    cityId: string;
    districtId?: string;
    latitude: string;
    longitude: string;
  },
): Promise<IssueRequest> {
  const response = await apiRequest<RequestResponse>('/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });

  return response.data;
}

export async function addRequestMedia(
  token: string,
  id: string,
  file: {
    uri: string;
    name: string;
    type: string;
  },
): Promise<RequestMedia> {
  const formData = new FormData();
  formData.append('file', file as unknown as Blob);

  const response = await apiRequest<MediaResponse>(`/requests/${id}/media`, {
    method: 'POST',
    body: formData,
    token,
  });

  return response.data;
}
