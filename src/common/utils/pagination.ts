export interface PaginationQuery {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function parsePagination(
  pageRaw: string | undefined,
  limitRaw: string | undefined,
): PaginationQuery {
  const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
  let limit = Number.parseInt(limitRaw ?? "20", 10);
  if (Number.isNaN(limit) || limit < 1) {
    limit = 20;
  }
  limit = Math.min(limit, 100);
  return { page, limit };
}

export function paginate<T>(
  data: T[],
  total: number,
  { page, limit }: PaginationQuery,
): PaginatedResult<T> {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
