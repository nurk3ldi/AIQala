export interface PaginationMeta {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const buildPagination = (page?: number, limit?: number): PaginationMeta => {
  const safePage = page && page > 0 ? page : 1;
  const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 10;

  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
};

export const buildPaginatedResponse = <T>(items: T[], total: number, page: number, limit: number): PaginatedResult<T> => ({
  items,
  meta: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  },
});
