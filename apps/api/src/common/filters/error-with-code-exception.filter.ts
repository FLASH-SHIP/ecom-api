import { translate } from "@flash-ship/ecom-i18n";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
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

    // Resolve message: prioritize specific exception.message unless exception.message is an i18n key or empty
    let displayMessage = exception.message;

    if (displayMessage) {
      const directKey = displayMessage.startsWith("errors.") ? displayMessage : `errors.${displayMessage}`;
      const translatedDirect = translate(directKey, locale, exception.meta);
      if (translatedDirect !== directKey) {
        displayMessage = translatedDirect;
      }
    }

    if (!displayMessage || displayMessage === exception.code) {
      const codeKey = `errors.${exception.code}`;
      const translatedCode = translate(codeKey, locale, exception.meta);
      if (translatedCode !== codeKey) {
        displayMessage = translatedCode;
      }
    }

    response.status(status).json({
      statusCode: status,
      error: exception.code || "INTERNAL_SERVER_ERROR",
      message: displayMessage || "An error occurred",
    });
  }
}
