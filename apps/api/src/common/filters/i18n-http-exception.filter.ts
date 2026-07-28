import { translate } from "@flash-ship/ecom-i18n";
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { I18nValidationException } from "../exceptions/i18n-validation.exception";
import { getLocale } from "../utils/locale";

/**
 * Global NestJS Http Exception Filter to localize standard HTTP exceptions
 * (e.g. 401 Unauthorized, 403 Forbidden, 404 Not Found) dynamically.
 */
@Catch(HttpException)
export class I18nHttpExceptionFilter implements ExceptionFilter<HttpException> {
  private readonly logger = new Logger(I18nHttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof I18nValidationException) {
      throw exception;
    }

    const locale = getLocale(request);
    const status = exception.getStatus();
    const { rawMessage, rawError } = this.extractErrorAndMessage(exception);

    // Log the HTTP exception via unified Logger
    if (status >= 500) {
      this.logger.error(`${exception.message} (${rawError || status})`, exception.stack);
    } else {
      this.logger.warn(`${exception.message} (${rawError || status})`);
    }

    const isKey = rawMessage.includes(".") && !rawMessage.includes(" ");
    let translatedMessage = isKey ? translate(rawMessage, locale) : rawMessage;
    let translatedError = rawError;

    const isDefault = !isKey && this.isDefaultMessage(rawMessage, exception);

    if (isDefault) {
      const { title, subtitle } = this.getDefaultTranslations(status, locale);
      if (title) {
        translatedError = title;
      }
      if (subtitle) {
        translatedMessage = subtitle;
      }
    }

    response.status(status).json({
      statusCode: status,
      error: translatedError || rawError || exception.name,
      message: translatedMessage,
    });
  }

  private extractErrorAndMessage(exception: HttpException): {
    rawMessage: string;
    rawError: string;
  } {
    let rawMessage = "";
    let rawError = "";
    const responseObj = exception.getResponse();

    if (typeof responseObj === "string") {
      rawMessage = responseObj;
    } else if (typeof responseObj === "object" && responseObj !== null) {
      const resMessage = (responseObj as Record<string, unknown>).message;
      const resError = (responseObj as Record<string, unknown>).error;

      if (typeof resMessage === "string") {
        rawMessage = resMessage;
      } else if (Array.isArray(resMessage)) {
        rawMessage = resMessage.join(", ");
      }

      if (typeof resError === "string") {
        rawError = resError;
      }
    }

    return { rawMessage, rawError };
  }

  private isDefaultMessage(message: string, exception: HttpException): boolean {
    const name = exception.name;
    const excMessage = exception.message;
    return (
      message === name ||
      message.toLowerCase() === excMessage.toLowerCase() ||
      message === "Forbidden" ||
      message === "Unauthorized" ||
      message === "Not Found" ||
      message === "Internal Server Error"
    );
  }

  private getDefaultTranslations(
    status: number,
    locale: string,
  ): { title: string | null; subtitle: string | null } {
    const titleKey = `errors.${status}.title`;
    const subtitleKey = `errors.${status}.subtitle`;

    const title = translate(titleKey, locale);
    const subtitle = translate(subtitleKey, locale);

    return {
      title: title !== titleKey ? title : null,
      subtitle: subtitle !== subtitleKey ? subtitle : null,
    };
  }
}
