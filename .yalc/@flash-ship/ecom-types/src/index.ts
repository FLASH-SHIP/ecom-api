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

export interface BaseAuthUser {
  id: string;
  email: string;
  name: string | null;
  displayName?: string | null;
  tokenVersion?: number;
}

/**
 * Response shape for Admin login REST endpoint (/api/v1/auth/login)
 */
export interface AdminAuthResponse {
  success: boolean;
  data: {
    user: BaseAuthUser;
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
  };
}

/**
 * Response shape for Customer login REST endpoint (/api/v1/customer/auth/login)
 */
export interface CustomerAuthResponse {
  success: boolean;
  data: {
    user: BaseAuthUser;
    customer?: BaseAuthUser & Record<string, unknown>;
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
  };
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

export enum ShippingOrigin {
  HAN = "HAN",
  SGN = "SGN",
}

export const SHIPPING_ORIGIN_LABELS: Record<ShippingOrigin, string> = {
  [ShippingOrigin.HAN]: "HAN (Hà Nội)",
  [ShippingOrigin.SGN]: "SGN (TP. HCM)",
};

export function getShippingOriginLabel(origin?: ShippingOrigin | string | null): string {
  if (!origin) return "";
  return SHIPPING_ORIGIN_LABELS[origin as ShippingOrigin] ?? origin;
}

export const SHIPPING_ORIGIN_OPTIONS = Object.values(ShippingOrigin).map((value) => ({
  value,
  label: getShippingOriginLabel(value),
}));

export enum ShippingMethod {
  EXPRESS = "EXPRESS",
  EPACKET = "EPACKET",
}

export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  [ShippingMethod.EPACKET]: "ePacket",
  [ShippingMethod.EXPRESS]: "Express",
};

export function getShippingMethodLabel(method?: ShippingMethod | string | null): string {
  if (!method) return "";
  return SHIPPING_METHOD_LABELS[method as ShippingMethod] ?? method;
}

export const SHIPPING_METHOD_OPTIONS = Object.values(ShippingMethod).map((value) => ({
  value,
  label: getShippingMethodLabel(value),
}));
