import { getOrderLabelService } from "@ecom/features/di/containers/OrderLabelService";
import {
  EpicHubAuthService,
  EpicHubCarrierService,
  EpicHubHttpClient,
  PartnerProviderRegistry,
} from "@ecom/features/integrations/index";
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ApiAuthGuard } from "../auth/api-auth.guard";
import {
  AdminPriceInquiryDto,
  AdminPrintLabelDto,
  AdminVoidLabelDto,
} from "./dto/admin-carrier.dto";

@ApiTags("Admin Carriers & EpicHub")
@ApiBearerAuth()
@UseGuards(ApiAuthGuard)
@Controller({
  path: "admin",
  version: "1",
})
export class AdminCarrierController {
  private getEpicHubCarrier(): EpicHubCarrierService {
    const registry = PartnerProviderRegistry.getInstance();
    if (!registry.hasProvider("carrier", "EPICHUB")) {
      const baseUrl = process.env.EPICHUB_BASE_URL || "https://clutchshipper.com/api";
      const authService = new EpicHubAuthService();
      const httpClient = new EpicHubHttpClient(baseUrl, authService);
      const epicHubService = new EpicHubCarrierService(httpClient);
      registry.registerCarrier(epicHubService);
    }
    return registry.getCarrier("EPICHUB") as EpicHubCarrierService;
  }

  @Get("carriers/epichub/balance")
  @ApiOperation({ summary: "Tra cứu số dư tài khoản EpicHub" })
  @ApiResponse({ status: 200, description: "Thông tin số dư tài khoản EpicHub" })
  async getBalance() {
    const carrier = this.getEpicHubCarrier();
    return carrier.getBalance();
  }

  @Post("carriers/epichub/inquire-price")
  @ApiOperation({ summary: "Tính cước phí dự kiến phía EpicHub (Price Inquiry)" })
  @ApiResponse({ status: 200, description: "Bảng giá cước phí trả về từ EpicHub" })
  async inquirePrice(@Body() dto: AdminPriceInquiryDto) {
    try {
      const carrier = this.getEpicHubCarrier();
      return await carrier.inquirePrice(dto);
    } catch (err: any) {
      console.error("[AdminCarrierController.inquirePrice ERROR]", err);
      throw err;
    }
  }

  @Get("carriers/epichub/track/:trackingNumber")
  @ApiOperation({ summary: "Tra cứu lịch sử hành trình kiện hàng (Package Tracking)" })
  @ApiParam({ name: "trackingNumber", description: "Mã vận đơn tracking number" })
  @ApiResponse({ status: 200, description: "Chi tiết hành trình kiện hàng từ EpicHub" })
  async trackPackage(@Param("trackingNumber") trackingNumber: string) {
    const carrier = this.getEpicHubCarrier();
    return carrier.trackPackage(trackingNumber);
  }

  @Post("carriers/epichub/print-label")
  @ApiOperation({ summary: "Tải/In lại file nhãn PDF (Print Label)" })
  @ApiResponse({ status: 200, description: "File nhãn PDF mã hóa Base64 hoặc thông tin URL nhãn" })
  async printLabel(@Body() body: AdminPrintLabelDto) {
    const carrier = this.getEpicHubCarrier();
    return carrier.printLabel({
      trackingNumber: body.trackingNumber,
      requestId: body.requestId,
      encoded: true,
    });
  }

  @Post("carriers/epichub/void-label")
  @ApiOperation({ summary: "Hủy nhãn vận đơn trên hệ thống EpicHub (Void Label)" })
  @ApiResponse({ status: 200, description: "Kết quả hủy nhãn vận đơn" })
  async voidLabel(@Body() body: AdminVoidLabelDto) {
    const carrier = this.getEpicHubCarrier();
    return carrier.voidLabel(body.trackingNumber);
  }

  @Post("orders/:id/purchase-label")
  @ApiOperation({ summary: "Admin mua nhãn thủ công cho một đơn hàng bất kỳ" })
  @ApiParam({ name: "id", description: "ID đơn hàng hoặc mã orderCode" })
  @ApiResponse({ status: 200, description: "Đơn hàng đã được mua nhãn thành công" })
  async adminPurchaseOrderLabel(@Param("id") id: string) {
    return getOrderLabelService().purchaseLabel({
      orderId: id,
      operatorId: "admin",
    });
  }
}
