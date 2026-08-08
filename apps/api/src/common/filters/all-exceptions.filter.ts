import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof Error ? exception.message : "Internal server error";

    // Log the unhandled exception using the unified logger
    this.logger.error(
      `Unhandled Exception: ${message} (Path: ${request.method} ${request.originalUrl})`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      error: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  }
}
