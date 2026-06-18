/**
 * Standardized pagination result DTO.
 * Inspired by Laravel's LengthAwarePaginator.
 *
 * Provides consistent pagination metadata across all list endpoints.
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Creates a standardized paginated result from raw data.
 */
export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  perPage: number,
): PaginatedResult<T> {
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  return {
    data,
    meta: {
      total,
      page,
      perPage,
      lastPage,
      hasNextPage: page < lastPage,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Default pagination options.
 */
export interface PaginationInput {
  page?: number;
  perPage?: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PER_PAGE = 20;
export const MAX_PER_PAGE = 100;

/**
 * Normalizes pagination input with sensible defaults.
 */
export function normalizePagination(input?: PaginationInput): {
  page: number;
  perPage: number;
  skip: number;
} {
  const page = Math.max(1, input?.page ?? DEFAULT_PAGE);
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, input?.perPage ?? DEFAULT_PER_PAGE));
  return {
    page,
    perPage,
    skip: (page - 1) * perPage,
  };
}
