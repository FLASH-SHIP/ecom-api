import { randomUUID } from "node:crypto";
import { getWebhookService } from "@ecom/features/di/containers/WebhookService";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { ApiAuthGuard } from "../auth/api-auth.guard";
import { CreateCustomerWebhookDto } from "./dto/create-webhook.dto";

@ApiTags("Customer Webhooks")
@ApiBearerAuth()
@UseGuards(ApiAuthGuard)
@Controller({
  path: "customer/webhooks",
  version: "1",
})
export class CustomerWebhookController {
  @Post()
  @ApiOperation({ summary: "Register a new webhook subscription" })
  @ApiBody({ type: CreateCustomerWebhookDto })
  @ApiResponse({ status: 201, description: "Webhook subscription registered successfully" })
  async createWebhook(@Req() req: Request, @Body() body: CreateCustomerWebhookDto) {
    const user = req.apiUser;
    if (user?.ownerType !== "Customer") {
      throw new ForbiddenException("Chỉ khách hàng mới có quyền quản trị webhook");
    }

    const customerId = user.id;

    // Validate events are subset of available events
    const service = getWebhookService();
    const allowed = service.getAvailableEvents() as readonly string[];
    for (const ev of body.events) {
      if (!allowed.includes(ev)) {
        throw new BadRequestException(
          `Event "${ev}" không hợp lệ. Danh sách hợp lệ: ${allowed.join(", ")}`,
        );
      }
    }

    // Generate random whsec_ secret
    const secret = `whsec_${randomUUID().replace(/-/g, "")}`;

    const webhook = await service.createWebhook({
      name: body.name,
      url: body.url,
      events: body.events,
      secret,
      ownerId: customerId,
      ownerType: "Customer",
      apiVersion: body.apiVersion || "2026-07-16",
    });

    return {
      id: webhook.id,
      name: webhook.name,
      secret: webhook.secret,
      url: body.url,
      events: body.events,
    };
  }

  @Get()
  @ApiOperation({ summary: "List all webhook subscriptions" })
  @ApiResponse({ status: 200, description: "List of active customer webhook subscriptions" })
  async listWebhooks(@Req() req: Request) {
    const user = req.apiUser;
    if (user?.ownerType !== "Customer") {
      throw new ForbiddenException("Chỉ khách hàng mới có quyền quản trị webhook");
    }

    const list = await getWebhookService().listWebhooks({
      ownerId: user.id,
      ownerType: "Customer",
    });

    return {
      data: list,
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a webhook subscription" })
  @ApiParam({ name: "id", description: "Webhook Subscription Numeric ID" })
  @ApiResponse({ status: 204, description: "Webhook subscription deleted successfully" })
  async deleteWebhook(@Req() req: Request, @Param("id") id: string) {
    const user = req.apiUser;
    if (user?.ownerType !== "Customer") {
      throw new ForbiddenException("Chỉ khách hàng mới có quyền quản trị webhook");
    }

    const webhookId = parseInt(id, 10);
    if (Number.isNaN(webhookId)) {
      throw new BadRequestException("ID webhook không hợp lệ");
    }

    const service = getWebhookService();
    const webhook = await service.getWebhook(webhookId).catch(() => null);

    if (!webhook || webhook.ownerId !== user.id || webhook.ownerType !== "Customer") {
      throw new NotFoundException("Không tìm thấy webhook");
    }

    await service.deleteWebhook(webhookId);
  }
}
