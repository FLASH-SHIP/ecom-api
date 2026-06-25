import { SetMetadata } from "@nestjs/common";

export const TIMEOUT_KEY = "request_timeout";

/**
 * Decorator to configure a custom timeout (in milliseconds) for a route or controller class.
 *
 * @example
 * \@Get('heavy-export')
 * \@SetTimeout(30000) // 30 seconds
 * async exportData() { ... }
 */
export const SetTimeout = (ms: number) => SetMetadata(TIMEOUT_KEY, ms);
