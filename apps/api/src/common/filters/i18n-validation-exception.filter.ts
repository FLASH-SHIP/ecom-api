import { translate } from "@ecom/i18n";
import { type ArgumentsHost, Catch, type ExceptionFilter } from "@nestjs/common";
import type { ValidationError } from "class-validator";
import type { Request, Response } from "express";
import { I18nValidationException } from "../exceptions/i18n-validation.exception";

import { getLocale } from "../utils/locale";

interface TranslatedErrorDetail {
  field: string;
  message: string;
  constraint: string;
}

/**
 * Intercepts validation errors from class-validator and localizes them
 * based on the client's locale headers.
 */
@Catch(I18nValidationException)
export class I18nValidationExceptionFilter implements ExceptionFilter<I18nValidationException> {
  catch(exception: I18nValidationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const locale = getLocale(request);

    const errors = exception.validationErrors;
    const details = this.formatErrors(errors, locale);
    const messages = details.map((d) => d.message);

    response.status(400).json({
      statusCode: 400,
      error: "Bad Request",
      message: messages,
      details,
    });
  }

  private formatErrors(
    errors: ValidationError[],
    locale: string,
    parentPath = "",
  ): TranslatedErrorDetail[] {
    const result: TranslatedErrorDetail[] = [];

    for (const error of errors) {
      const currentPath = parentPath ? `${parentPath}.${error.property}` : error.property;

      if (error.constraints) {
        result.push(...this.processConstraints(error.constraints, currentPath, locale));
      }

      if (error.children && error.children.length > 0) {
        result.push(...this.formatErrors(error.children, locale, currentPath));
      }
    }

    return result;
  }

  private processConstraints(
    constraints: Record<string, string>,
    currentPath: string,
    locale: string,
  ): TranslatedErrorDetail[] {
    const result: TranslatedErrorDetail[] = [];

    for (const [constraintKey, constraintMessage] of Object.entries(constraints)) {
      const isKey = constraintMessage.includes(".") && !constraintMessage.includes(" ");

      let translatedMessage: string;
      if (isKey) {
        translatedMessage = translate(constraintMessage, locale);
      } else {
        translatedMessage = this.translateConstraint(constraintKey, constraintMessage, locale);
      }

      result.push({
        field: currentPath,
        message: translatedMessage,
        constraint: constraintKey,
      });
    }

    return result;
  }

  private translateConstraint(constraint: string, defaultMessage: string, locale: string): string {
    const translationKey = `validation.${constraint}`;
    const translated = translate(translationKey, locale);

    if (translated === translationKey) {
      return defaultMessage;
    }

    if (constraint === "minLength" || constraint === "maxLength") {
      const match = defaultMessage.match(/\d+/);
      const defaultLimit = constraint === "minLength" ? "8" : "100";
      const limit = match ? match[0] : defaultLimit;
      return translated.replace("{limit}", limit);
    }

    return translated;
  }
}
