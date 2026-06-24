import { translate } from "@ecom/i18n";
import { ErrorWithCode } from "@ecom/lib/errors";
import { type ArgumentsHost, Catch, type ExceptionFilter, Logger } from "@nestjs/common";
import type { Request, Response } from "express";
import { getLocale } from "../utils/locale";

/**
 * Global NestJS Exception Filter to catch generic application-level ErrorWithCode,
 * automatically translate the error code, and return the correct HTTP status code.
 */
@Catch(ErrorWithCode)
export class ErrorWithCodeExceptionFilter implements ExceptionFilter<ErrorWithCode> {
  private readonly logger = new Logger(ErrorWithCodeExceptionFilter.name);

  catch(exception: ErrorWithCode, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const locale = getLocale(request);
    const status = exception.statusCode || 500;

    // Log the error to the console via unified Logger
    if (status >= 500) {
      this.logger.error(`${exception.message} (${exception.code})`, exception.stack);
    } else {
      this.logger.warn(`${exception.message} (${exception.code})`);
    }

    // Check if translation exists for the specific error code
    const messageKey = `errors.${exception.code}`;
    const translatedMessage = translate(messageKey, locale);
    const displayMessage = translatedMessage !== messageKey ? translatedMessage : exception.message;

    response.status(status).json({
      statusCode: status,
      error: exception.code || "INTERNAL_SERVER_ERROR",
      message: displayMessage,
    });
  }
}
