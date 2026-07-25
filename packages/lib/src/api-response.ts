export interface ApiErrorDetail {
  code: string;
  field?: string;
  message: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
  timestamp: string;
}

export interface ApiBulkItemSuccess<T = unknown> {
  index: number;
  success: true;
  orderId?: string;
  orderCode?: string;
  data?: T;
}

export interface ApiBulkItemError {
  index: number;
  success: false;
  errors: ApiErrorDetail[];
}

export type ApiBulkItemResult<T = unknown> = ApiBulkItemSuccess<T> | ApiBulkItemError;

export interface ApiBulkSummary {
  total: number;
  succeeded: number;
  failed: number;
}

export interface ApiBulkResponse<T = unknown> {
  summary: ApiBulkSummary;
  data: ApiBulkItemResult<T>[];
}
