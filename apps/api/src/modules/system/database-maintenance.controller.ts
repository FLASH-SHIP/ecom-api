import { existsSync } from "node:fs";
import { join } from "node:path";
import type { AuthenticatedUser } from "@ecom/features/auth/services/ApiAuthService";
import { getAuditService } from "@ecom/features/di/containers/AuditService";
import { getApiAuthService, getAuthService } from "@ecom/features/di/containers/AuthService";
import { getDatabaseMaintenanceService } from "@ecom/features/di/containers/DatabaseMaintenanceService";
import { getSystemDiagnosticsService } from "@ecom/features/di/containers/SystemDiagnosticsService";
import { isDevDiagnosticsBypassEnabled } from "@flash-ship/ecom-lib";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { SetTimeout } from "../../common/decorators/timeout.decorator";
import { ApiAuthGuard } from "../auth/api-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import type { ExecuteDatabaseCommandDto } from "./dto/execute-db-command.dto";
import type { ExecuteLogCommandDto } from "./dto/execute-log-command.dto";
import type { ExecuteProcessActionDto } from "./dto/execute-process-action.dto";
import type { QueryRedisDto } from "./dto/query-redis.dto";

interface DiagnosticsAuthBody {
  sudoPassword?: string;
  maintenanceKey?: string;
  level?: string;
}

async function authenticateDownloadRequest(req: Request, queryToken: string): Promise<AuthenticatedUser> {
  if (process.env.NODE_ENV === "production" && !isDevDiagnosticsBypassEnabled()) {
    throw new ForbiddenException(
      "Download endpoint is strictly disabled on production environments.",
    );
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : queryToken;
  if (!token) {
    throw new UnauthorizedException("Missing access token");
  }

  let apiUser: AuthenticatedUser;
  try {
    apiUser = await getApiAuthService().authenticateBearer(token, req.ip);
  } catch {
    throw new UnauthorizedException("Authentication failed");
  }

  if (!isDevDiagnosticsBypassEnabled()) {
    const authService = getAuthService();
    const userWithPerms = await authService.getUserWithPermissions(apiUser.id);
    if (!userWithPerms.permissions.includes(Permissions.SYSTEM_MANAGE)) {
      throw new ForbiddenException("Insufficient permissions");
    }
  }

  return apiUser;
}

@ApiTags("System")
@Controller("system")
export class DatabaseMaintenanceController {
  @Post("database/execute")
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.SYSTEM_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Execute database maintenance command" })
  @SetTimeout(300000) // 5 minutes timeout limit
  async executeCommand(
    @Body() body: ExecuteDatabaseCommandDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    // Log action to AuditLog
    const auditService = getAuditService();
    await auditService.logAction({
      userId: user.id,
      action: "execute-database-command",
      module: "SYSTEM_DIAGNOSTICS",
      metadata: { action: body.action, seedOnly: body.seedOnly },
    });

    // Set headers for Chunked Transfer
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const service = getDatabaseMaintenanceService();
    try {
      await service.executeCommand({
        action: body.action,
        maintenanceKey: body.maintenanceKey,
        sudoPassword: body.sudoPassword,
        seedOnly: body.seedOnly,
        seedCategory: body.seedCategory,
        userId: user.id,
        username: user.email,
        writeStream: res,
      });
      res.end();
    } catch (error: unknown) {
      const errObj = error as Record<string, unknown>;
      const message = (errObj?.message as string) || String(error);
      const status = (errObj?.statusCode as number) || 500;

      if (res.headersSent) {
        res.write(`\n❌ Execution failed: [${status}] ${message}\n`);
        res.end();
      } else {
        res.status(status).json({
          statusCode: status,
          message,
          error: (errObj?.name as string) || "Error",
        });
      }
    }
  }

  @Post("logs/execute")
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.SYSTEM_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Execute log viewing/streaming command" })
  @SetTimeout(300000) // 5 minutes timeout limit
  async executeLogCommand(
    @Body() body: ExecuteLogCommandDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    // Log action to AuditLog
    const auditService = getAuditService();
    await auditService.logAction({
      userId: user.id,
      action: "execute-log-command",
      module: "SYSTEM_DIAGNOSTICS",
      metadata: {
        action: body.action,
        filename: body.filename,
        lines: body.lines,
        level: body.level,
        search: body.search,
      },
    });

    const service = getSystemDiagnosticsService();

    if (body.action === "list") {
      try {
        const logFiles = await service.listLogFiles();
        return res.status(200).json(logFiles);
      } catch (error: unknown) {
        const errObj = error as Record<string, unknown>;
        const message = (errObj?.message as string) || String(error);
        const status = (errObj?.statusCode as number) || 500;
        return res.status(status).json({
          statusCode: status,
          message,
          error: (errObj?.name as string) || "Error",
        });
      }
    }

    // Set headers for Chunked Transfer
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    try {
      await service.executeLogCommand({
        action: body.action,
        filename: body.filename,
        lines: body.lines,
        level: body.level,
        search: body.search,
        sudoPassword: body.sudoPassword,
        userId: user.id,
        username: user.email,
        writeStream: res,
        maintenanceKey: body.maintenanceKey,
      });
      res.end();
    } catch (error: unknown) {
      const errObj = error as Record<string, unknown>;
      const message = (errObj?.message as string) || String(error);
      const status = (errObj?.statusCode as number) || 500;

      if (res.headersSent) {
        res.write(`\n❌ Execution failed: [${status}] ${message}\n`);
        res.end();
      } else {
        res.status(status).json({
          statusCode: status,
          message,
          error: (errObj?.name as string) || "Error",
        });
      }
    }
  }

  @Get("logs/download/:filename")
  @ApiOperation({ summary: "Download gzipped log file securely" })
  async downloadLogFile(
    @Param("filename") filename: string,
    @Query("token") queryToken: string,
    @Query("sudoPassword") sudoPassword: string,
    @Query("maintenanceKey") maintenanceKey: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const apiUser = await authenticateDownloadRequest(req, queryToken);

    // Verify sudo password and maintenance key via service
    const service = getSystemDiagnosticsService();
    await service.getProcessStatus({
      sudoPassword,
      userId: apiUser.id,
      maintenanceKey,
    });

    // Locate log file and stream zip
    if (!/^app-\d{4}-\d{2}-\d{2}\.log(?:\.gz)?$/.test(filename)) {
      throw new BadRequestException("Invalid log filename");
    }

    const monorepoRoot = process.cwd();
    const logsDir = process.env.LOGS_PATH || join(monorepoRoot, "logs");
    const filePath = join(logsDir, filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException(`Log file '${filename}' not found on server`);
    }

    // Log the download action to AuditLog
    const auditService = getAuditService();
    await auditService.logAction({
      userId: apiUser.id,
      action: "download-log-file",
      module: "SYSTEM_DIAGNOSTICS",
      metadata: { filename },
    });

    const isCompressed = filename.endsWith(".gz");
    res.setHeader("Content-Type", "application/gzip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}${isCompressed ? "" : ".gz"}"`,
    );

    const { createReadStream } = require("node:fs");
    const { pipeline } = require("node:stream/promises");

    const readStream = createReadStream(filePath);

    try {
      if (isCompressed) {
        await pipeline(readStream, res);
      } else {
        const { createGzip } = require("node:zlib");
        const gzip = createGzip();
        await pipeline(readStream, gzip, res);
      }
    } catch (err: unknown) {
      if (!res.headersSent) {
        const message = err instanceof Error ? err.message : String(err);
        res.status(500).end(`Failed to stream log file: ${message}`);
      }
    }
  }

  @Post("process/status")
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.SYSTEM_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get server process and resource status" })
  async getProcessStatus(@Body() body: DiagnosticsAuthBody, @CurrentUser() user: AuthenticatedUser) {
    // Log action to AuditLog
    const auditService = getAuditService();
    await auditService.logAction({
      userId: user.id,
      action: "get-process-status",
      module: "SYSTEM_DIAGNOSTICS",
    });

    const service = getSystemDiagnosticsService();
    return service.getProcessStatus({
      sudoPassword: body.sudoPassword,
      userId: user.id,
      maintenanceKey: body.maintenanceKey,
    });
  }

  @Post("process/action")
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.SYSTEM_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Execute actions on PM2 processes (restart/stop/reload)" })
  async executeProcessAction(
    @Body() body: ExecuteProcessActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Log action to AuditLog
    const auditService = getAuditService();
    await auditService.logAction({
      userId: user.id,
      action: `process-${body.action}`,
      module: "SYSTEM_DIAGNOSTICS",
      metadata: { action: body.action, target: body.target },
    });

    const service = getSystemDiagnosticsService();
    return service.executeProcessAction({
      action: body.action,
      target: body.target,
      sudoPassword: body.sudoPassword,
      userId: user.id,
      maintenanceKey: body.maintenanceKey,
    });
  }

  @Post("network/ping")
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.SYSTEM_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Test connectivity to whitelisted services" })
  async pingServices(@Body() body: DiagnosticsAuthBody, @CurrentUser() user: AuthenticatedUser) {
    // Log action to AuditLog
    const auditService = getAuditService();
    await auditService.logAction({
      userId: user.id,
      action: "ping-external-services",
      module: "SYSTEM_DIAGNOSTICS",
    });

    const service = getSystemDiagnosticsService();
    return service.pingExternalServices({
      sudoPassword: body.sudoPassword,
      userId: user.id,
      maintenanceKey: body.maintenanceKey,
    });
  }

  @Post("redis/query")
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.SYSTEM_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Query or manage Redis cache keys" })
  async queryRedis(@Body() body: QueryRedisDto, @CurrentUser() user: AuthenticatedUser) {
    // Log action to AuditLog
    const auditService = getAuditService();
    await auditService.logAction({
      userId: user.id,
      action: `redis-${body.action}`,
      module: "SYSTEM_DIAGNOSTICS",
      metadata: { action: body.action, pattern: body.pattern, key: body.key },
    });

    const service = getSystemDiagnosticsService();
    return service.queryRedis({
      action: body.action,
      pattern: body.pattern,
      key: body.key,
      sudoPassword: body.sudoPassword,
      userId: user.id,
      maintenanceKey: body.maintenanceKey,
    });
  }

  @Get("logger/level")
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.SYSTEM_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current runtime logger level" })
  async getLogLevel() {
    const service = getSystemDiagnosticsService();
    return service.getLogLevel();
  }

  @Post("logger/level")
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.SYSTEM_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update runtime logger level dynamically" })
  async updateLogLevel(@Body() body: DiagnosticsAuthBody, @CurrentUser() user: AuthenticatedUser) {
    const auditService = getAuditService();
    await auditService.logAction({
      userId: user.id,
      action: "update-log-level",
      module: "SYSTEM_DIAGNOSTICS",
      metadata: { level: body.level },
    });

    const service = getSystemDiagnosticsService();
    return service.updateLogLevel({
      level: body.level || "info",
      sudoPassword: body.sudoPassword,
      userId: user.id,
      maintenanceKey: body.maintenanceKey,
    });
  }

  @Post("database/stats")
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.SYSTEM_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get database sizing and table statistics" })
  async getDatabaseStats(@Body() body: DiagnosticsAuthBody, @CurrentUser() user: AuthenticatedUser) {
    const auditService = getAuditService();
    await auditService.logAction({
      userId: user.id,
      action: "get-database-stats",
      module: "SYSTEM_DIAGNOSTICS",
    });

    const service = getSystemDiagnosticsService();
    return service.getDatabaseStats({
      sudoPassword: body.sudoPassword,
      userId: user.id,
      maintenanceKey: body.maintenanceKey,
    });
  }

  @Post("redis/stats")
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.SYSTEM_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get Redis memory profiling and key namespaces stats" })
  async getRedisStats(@Body() body: DiagnosticsAuthBody, @CurrentUser() user: AuthenticatedUser) {
    const auditService = getAuditService();
    await auditService.logAction({
      userId: user.id,
      action: "get-redis-stats",
      module: "SYSTEM_DIAGNOSTICS",
    });

    const service = getSystemDiagnosticsService();
    return service.getRedisStats({
      sudoPassword: body.sudoPassword,
      userId: user.id,
      maintenanceKey: body.maintenanceKey,
    });
  }
}
