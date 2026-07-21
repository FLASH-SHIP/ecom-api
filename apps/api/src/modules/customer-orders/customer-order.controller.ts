import { getOrderService } from "@ecom/features/di/containers/OrderService";
import { getRedisClient } from "@ecom/lib/redis";
import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { ApiAuthGuard } from "../auth/api-auth.guard";
import type { CreateBulkOrdersDto, CreateOrderDto } from "./dto/create-order.dto";

@ApiTags("Customer Orders")
@ApiBearerAuth()
@UseGuards(ApiAuthGuard)
@Controller("v2/customer/orders")
export class CustomerOrderController {
  @Post()
  @ApiOperation({ summary: "Create a single order with idempotency check" })
  async createOrder(
    @Req() req: Request,
    @Body() body: CreateOrderDto,
    @Headers("X-Idempotency-Key") idempotencyKey?: string,
  ) {
    const user = req.apiUser;
    if (user?.ownerType !== "Customer") {
      throw new ForbiddenException("Chỉ khách hàng mới có quyền tạo đơn qua API");
    }

    const customerId = user.id;

    if (idempotencyKey) {
      const redis = getRedisClient();
      const cacheKey = `idempotency:customer:${customerId}:${idempotencyKey}`;
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        // Log redis error but do not block order creation
        console.warn("Redis idempotency read failed:", err);
      }

      // Create the order
      const result = await getOrderService().createOrder({
        ...body,
        customerId,
      });

      // Cache the response for 24 hours (86400 seconds)
      try {
        const redis = getRedisClient();
        await redis.set(cacheKey, JSON.stringify(result), "EX", 86400);
      } catch (err) {
        console.warn("Redis idempotency write failed:", err);
      }

      return result;
    }

    // Default flow without idempotency key
    return getOrderService().createOrder({
      ...body,
      customerId,
    });
  }

  @Post("bulk")
  @ApiOperation({ summary: "Bulk create orders (up to 50 orders)" })
  async createOrdersBulk(@Req() req: Request, @Body() body: CreateBulkOrdersDto) {
    const user = req.apiUser;
    if (user?.ownerType !== "Customer") {
      throw new ForbiddenException("Chỉ khách hàng mới có quyền tạo đơn qua API");
    }

    const customerId = user.id;
    const results = [];
    const orderService = getOrderService();

    for (let i = 0; i < body.orders.length; i++) {
      const orderData = body.orders[i];
      if (!orderData) continue;
      try {
        const result = await orderService.createOrder({
          ...orderData,
          customerId,
        });
        results.push({
          index: i,
          success: true,
          orderId: result.id,
          orderCode: result.orderCode,
        });
      } catch (err) {
        results.push({
          index: i,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      data: results,
    };
  }
}
