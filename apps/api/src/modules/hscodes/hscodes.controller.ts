import { Controller, Get, Post, Body, Query, NotFoundException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { HscodesService } from "./hscodes.service";

@ApiTags("HS Codes")
@Controller("hscodes")
export class HscodesController {
  constructor(private readonly hscodesService: HscodesService) {}

  @Get("tree")
  @ApiOperation({ summary: "Get HS Code catalog chapter tree" })
  async getTree() {
    return {
      data: await this.hscodesService.getTree()
    };
  }

  @Get("detail")
  @ApiOperation({ summary: "Get detailed information and legal notes for a Heading" })
  async getDetail(@Query("code") code: string) {
    if (!code) {
      throw new NotFoundException("Query parameter 'code' is required.");
    }
    return {
      data: await this.hscodesService.getDetail(code)
    };
  }

  @Get("search")
  @ApiOperation({ summary: "Search HS Code commodities by query text or code prefix" })
  async search(@Query("query") query: string) {
    return {
      data: await this.hscodesService.search(query || "")
    };
  }

  @Get("countries")
  @ApiOperation({ summary: "Get list of supported origin countries" })
  async getCountries() {
    return {
      data: await this.hscodesService.getCountries()
    };
  }

  @Get("transport-modes")
  @ApiOperation({ summary: "Get list of supported transport modes" })
  async getTransportModes() {
    return {
      data: await this.hscodesService.getTransportModes()
    };
  }

  @Post("calculate")
  @ApiOperation({ summary: "Calculate Landed Cost: Duties, HMF, MPF" })
  async calculate(
    @Body()
    body: {
      code: string;
      value: number;
      mode: string;
      country?: string;
      entryDate?: string;
      loadingDate?: string;
    }
  ) {
    if (body.code === undefined || body.value === undefined || !body.mode) {
      throw new NotFoundException("Required body parameters: 'code', 'value', 'mode'.");
    }
    return {
      success: true,
      data: await this.hscodesService.calculate(
        body.code,
        Number(body.value),
        body.mode,
        body.country,
        body.entryDate,
        body.loadingDate
      )
    };
  }
}
