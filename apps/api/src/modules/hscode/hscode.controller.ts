import { getHsCodeService } from "@ecom/features/di/containers/HsCodeService";
import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
// biome-ignore lint/style/useImportType: NestJS requires runtime class reference for decorator metadata reflection
import { CalculateDto } from "./dto/calculate.dto";
// biome-ignore lint/style/useImportType: NestJS requires runtime class reference for decorator metadata reflection
import { ListRatesQueryDto } from "./dto/list-rates-query.dto";
// biome-ignore lint/style/useImportType: NestJS requires runtime class reference for decorator metadata reflection
import { SearchQueryDto } from "./dto/search-query.dto";

@ApiTags("HS Codes")
@Controller("hscodes")
export class HsCodeController {
  @Get("tree")
  @ApiOperation({ summary: "Get Chapter & Heading tree for sidebar" })
  async getTree() {
    const data = await getHsCodeService().getTree();
    return { data };
  }

  @Get("detail")
  @ApiOperation({ summary: "Get details, notes, and tariff rates list for a Heading" })
  async getDetail(@Query() query: ListRatesQueryDto) {
    const data = await getHsCodeService().getDetail(query.code);
    return { data };
  }

  @Get("search")
  @ApiOperation({ summary: "Search commodities by description or code" })
  async search(@Query() query: SearchQueryDto) {
    const data = await getHsCodeService().search(query.query);
    return { data };
  }

  @Get("heading-tree")
  @ApiOperation({
    summary: "Get detailed subheading and item hierarchy tree for a 4-digit Heading",
  })
  async getHeadingTree(@Query() query: ListRatesQueryDto) {
    const data = await getHsCodeService().getHeadingTree(query.code);
    return { data };
  }

  @Post("calculate")
  @ApiOperation({ summary: "Calculate import duties, HMF, MPF and landed cost" })
  async calculate(@Body() body: CalculateDto) {
    const data = await getHsCodeService().calculate(body);
    return { data };
  }

  @Get("countries")
  @ApiOperation({ summary: "Get all countries with short name and flag" })
  async getCountries(@Req() req: any) {
    const data = await getHsCodeService().getCountries();
    const protocol = req.protocol;
    const host = req.get("host");
    const baseUrl = `${protocol}://${host}`;

    const mapped = data.map((country) => ({
      ...country,
      flag: country.flag ? `${baseUrl}${country.flag}` : null,
    }));

    return { data: mapped };
  }

  @Get("transport-modes")
  @ApiOperation({ summary: "Get all modes of transport for calculate form" })
  async getTransportModes() {
    const data = await getHsCodeService().getTransportModes();
    return { data };
  }
}
