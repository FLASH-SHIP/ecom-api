import { BadRequestException } from "@nestjs/common";
import type { ValidationError } from "class-validator";

/**
 * Custom validation exception that preserves class-validator ValidationError objects
 * to be processed by the exception filter.
 */
export class I18nValidationException extends BadRequestException {
  constructor(public readonly validationErrors: ValidationError[]) {
    super("Validation failed");
  }
}
