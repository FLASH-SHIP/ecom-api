import {
  getDeviceTokenService,
  getNotificationService,
  getNotificationSettingService,
} from "@ecom/features/di/containers/NotificationService";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { ApiAuthGuard } from "../auth/api-auth.guard";
// biome-ignore lint/style/useImportType: NestJS requires runtime class reference for decorator metadata reflection
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";
// biome-ignore lint/style/useImportType: NestJS requires runtime class reference for decorator metadata reflection
import { RegisterTokenDto } from "./dto/register-token.dto";
// biome-ignore lint/style/useImportType: NestJS requires runtime class reference for decorator metadata reflection
import { TrackNotificationDto } from "./dto/track-notification.dto";
// biome-ignore lint/style/useImportType: NestJS requires runtime class reference for decorator metadata reflection
import { UpdatePreferenceDto } from "./dto/update-preference.dto";

@ApiTags("Notifications & Devices")
@ApiBearerAuth()
@UseGuards(ApiAuthGuard)
@Controller("v2/notifications")
export class NotificationController {
  private getOwnerContext(req: Request) {
    const user = req.apiUser;
    if (!user) {
      throw new UnauthorizedException("Unauthorized access to notifications");
    }
    const isCustomer = user.ownerType === "Customer";
    return {
      isCustomer,
      userId: !isCustomer ? user.id : undefined,
      customerId: isCustomer ? user.id : undefined,
      ownerId: user.id,
    };
  }

  @Post("tokens")
  @ApiOperation({ summary: "Register or update FCM device token" })
  async registerToken(@Req() req: Request, @Body() body: RegisterTokenDto) {
    const { userId, customerId } = this.getOwnerContext(req);
    const token = await getDeviceTokenService().registerToken({
      userId,
      customerId,
      token: body.token,
      platform: body.platform,
      deviceInfo: body.deviceInfo,
    });
    return { data: token };
  }

  @Delete("tokens/:token")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Unregister FCM device token" })
  async unregisterToken(@Req() _req: Request, @Param("token") token: string) {
    // Perform unregistration
    await getDeviceTokenService().unregisterToken(token);
  }

  @Get("preferences")
  @ApiOperation({ summary: "Get notification preferences with schema defaults" })
  async getPreferences(@Req() req: Request) {
    const { userId, customerId } = this.getOwnerContext(req);
    const preferences = await getNotificationSettingService().getPreferences({
      userId,
      customerId,
    });
    return { data: preferences };
  }

  @Put("preferences")
  @ApiOperation({ summary: "Update custom preference overrides" })
  async updatePreference(@Req() req: Request, @Body() body: UpdatePreferenceDto) {
    const { userId, customerId } = this.getOwnerContext(req);

    const settings = await getNotificationSettingService().updatePreference(
      { userId, customerId },
      body.eventType,
      {
        inApp: body.channels?.inApp,
        push: body.channels?.push,
        email: body.channels?.email,
        webhook: body.channels?.webhook,
        dndConfig: body.dndConfig,
      },
    );
    return { data: settings };
  }

  @Get()
  @ApiOperation({ summary: "List notification history (Cursor-based)" })
  async listNotifications(@Req() req: Request, @Query() query: ListNotificationsQueryDto) {
    const { ownerId, isCustomer } = this.getOwnerContext(req);
    const result = await getNotificationService().listNotifications(ownerId, {
      cursor: query.cursor,
      perPage: query.perPage,
      unreadOnly: query.unreadOnly,
      isCustomer,
    });

    return {
      data: result.items,
      meta: {
        nextCursor: "nextCursor" in result ? result.nextCursor : undefined,
      },
    };
  }

  @Put("read-all")
  @ApiOperation({ summary: "Mark all notifications as read" })
  async markAllRead(@Req() req: Request) {
    const { ownerId, isCustomer } = this.getOwnerContext(req);
    await getNotificationService().markAllRead(ownerId, isCustomer);
    return { success: true };
  }

  @Put(":id/read")
  @ApiOperation({ summary: "Mark a single notification as read" })
  async markRead(@Req() req: Request, @Param("id") id: string) {
    const { ownerId, isCustomer } = this.getOwnerContext(req);
    await getNotificationService().markRead(Number(id), ownerId, isCustomer);
    return { success: true };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a single notification" })
  async deleteNotification(@Req() req: Request, @Param("id") id: string) {
    const { ownerId, isCustomer } = this.getOwnerContext(req);
    await getNotificationService().deleteNotification(Number(id), ownerId, isCustomer);
  }

  @Post(":id/track")
  @ApiOperation({ summary: "Track notification delivery metrics" })
  async trackNotification(
    @Req() _req: Request,
    @Param("id") id: string,
    @Body() body: TrackNotificationDto,
  ) {
    // Allow tracking
    if (body.action === "delivered") {
      await getNotificationService().recordDelivered(Number(id));
    } else if (body.action === "clicked") {
      await getNotificationService().recordClicked(Number(id));
    }
    return { success: true };
  }
}
