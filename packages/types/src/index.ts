/**
 * Pagination input for list queries.
 */
export interface PaginationInput {
  page?: number;
  perPage?: number;
}

/**
 * Paginated response wrapper.
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

/**
 * Sort direction for list queries.
 */
export type SortDirection = "asc" | "desc";

/**
 * Base sort input.
 */
export interface SortInput {
  field: string;
  direction: SortDirection;
}

/**
 * Authenticated user context passed through tRPC and NestJS.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  locale: string | null;
  permissions: string[];
}

export type PartnerStatus = "ACTIVE" | "INACTIVE";
export const PartnerStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type ServiceType = "PICKUP" | "EXPORT" | "IMPORT" | "LASTMILE";
export const ServiceType = {
  PICKUP: "PICKUP",
  EXPORT: "EXPORT",
  IMPORT: "IMPORT",
  LASTMILE: "LASTMILE",
} as const;
