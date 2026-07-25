import { getOrderService } from "@ecom/features/di/containers/OrderService";
import { getRedisClient } from "@ecom/lib/redis";
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { ApiAuthGuard } from "../auth/api-auth.guard";
import { executeBatchProcess } from "@ecom/lib";
import type { CancelOrderDto, GetCustomerOrdersDto } from "./dto/query-order.dto";
import { type CreateBulkOrdersDto, CreateOrderDto, type EstimateFreightDto, MAX_BULK_ORDER_LIMIT } from "./dto/create-order.dto";

import { mapToCustomerOrderDetailResponse, mapToEstimateFreightResponse } from "@ecom/features/order/mappers/CustomerOrderMapper";

@ApiTags("Customer Orders")
@ApiBearerAuth()
@UseGuards(ApiAuthGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } })
@Controller({
  path: "customer/orders",
  version: "1",
})
export class CustomerOrderController {
  private validateCustomer(req: Request): string {
    const user = req.apiUser;
    if (user?.ownerType !== "Customer") {
      throw new ForbiddenException("Chỉ khách hàng mới có quyền thực hiện thao tác này qua API");
    }
    return user.id;
  }

  @Post("estimate-freight")
  @ApiOperation({ summary: "Estimate shipping freight before creating an order" })
  async estimateFreight(@Req() req: Request, @Body() body: EstimateFreightDto) {
    const customerId = this.validateCustomer(req);
    const result = await getOrderService().calculateOrderFreight({
      customerId,
      shippingMethod: body.shippingMethod,
      country: body.receiverCountry,
      declaredWeight: body.declaredWeight,
      dimensionLength: body.dimensionLength,
      dimensionWidth: body.dimensionWidth,
      dimensionHeight: body.dimensionHeight,
      origin: body.shippingOrigin,
    });
    return mapToEstimateFreightResponse(result);
  }


  @Post()
  @ApiOperation({ summary: "Create a single order with idempotency check" })
  async createOrder(
    @Req() req: Request,
    @Body() body: CreateOrderDto,
    @Headers("X-Idempotency-Key") idempotencyKey?: string,
  ) {
    const customerId = this.validateCustomer(req);

    if (idempotencyKey) {
      const redis = getRedisClient();
      const cacheKey = `idempotency:customer:${customerId}:${idempotencyKey}`;
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.warn("Redis idempotency read failed:", err);
      }

      const result = await getOrderService().createOrder({
        ...body,
        customerId,
      });

      try {
        const redis = getRedisClient();
        await redis.set(cacheKey, JSON.stringify(result), "EX", 86400);
      } catch (err) {
        console.warn("Redis idempotency write failed:", err);
      }

      return result;
    }

    return getOrderService().createOrder({
      ...body,
      customerId,
    });
  }

  @Post("bulk")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Bulk create orders (up to 50 orders per request) with idempotency check" })
  async createOrdersBulk(
    @Req() req: Request,
    @Body() body: CreateBulkOrdersDto,
    @Headers("X-Idempotency-Key") idempotencyKey?: string,
  ) {
    const customerId = this.validateCustomer(req);

    if (idempotencyKey) {
      const redis = getRedisClient();
      const cacheKey = `idempotency:customer:bulk:${customerId}:${idempotencyKey}`;
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.warn("Redis bulk idempotency read failed:", err);
      }

      const orderService = getOrderService();
      const result = await executeBatchProcess(
        body.orders,
        CreateOrderDto,
        async (orderData) => {
          const order = await orderService.createOrder({
            ...orderData,
            customerId,
          });
          return mapToCustomerOrderDetailResponse(order);
        },
        { maxLimit: MAX_BULK_ORDER_LIMIT },
      );

      try {
        await redis.set(cacheKey, JSON.stringify(result), "EX", 86400);
      } catch (err) {
        console.warn("Redis bulk idempotency write failed:", err);
      }

      return result;
    }

    const orderService = getOrderService();
    return executeBatchProcess(
      body.orders,
      CreateOrderDto,
      async (orderData) => {
        const order = await orderService.createOrder({
          ...orderData,
          customerId,
        });
        return mapToCustomerOrderDetailResponse(order);
      },
      { maxLimit: MAX_BULK_ORDER_LIMIT },
    );
  }

  @Get()
  @ApiOperation({ summary: "List customer orders with pagination and filters" })
  async getOrders(@Req() req: Request, @Query() query: GetCustomerOrdersDto) {
    const customerId = this.validateCustomer(req);
    return getOrderService().getCustomerOrders({
      customerId,
      page: query.page,
      perPage: query.limit,
      status: query.status,
      orderCode: query.orderCode,
      sellerOrderId: query.sellerOrderId,
      fromDate: query.fromDate,
      toDate: query.toDate,
      search: query.search,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get order details by orderId, orderCode, or sellerOrderId" })
  @ApiParam({ name: "id", description: "Order ID, Ecom Order Code, or Seller Order ID" })
  async getOrderDetail(@Req() req: Request, @Param("id") id: string) {
    const customerId = this.validateCustomer(req);
    return getOrderService().getCustomerOrderDetail(customerId, id);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Cancel an order (only if DRAFT or PENDING_LABEL)" })
  @ApiParam({ name: "id", description: "Order ID, Ecom Order Code, or Seller Order ID" })
  async cancelOrder(@Req() req: Request, @Param("id") id: string, @Body() body: CancelOrderDto) {
    const customerId = this.validateCustomer(req);
    return getOrderService().cancelCustomerOrder(customerId, id, body.reason);
  }
}
