import { getContactService } from "@ecom/features/di/containers/ContactService";
import { Body, Controller, Get, Param, Post, Query, UseInterceptors } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Audit } from "../../common/decorators/audit.decorator";
import { AuditInterceptor } from "../../common/interceptors/audit.interceptor";
// biome-ignore lint/style/useImportType: NestJS requires runtime class reference for decorator metadata reflection
import { CreateSubmissionDto } from "./dto/create-submission.dto";
// biome-ignore lint/style/useImportType: NestJS requires runtime class reference for decorator metadata reflection
import { ListSubmissionsQueryDto } from "./dto/list-submissions-query.dto";

@ApiTags("Contacts")
@Controller("contacts")
export class ContactsController {
  @Get()
  @ApiOperation({ summary: "List contact form submissions" })
  async listSubmissions(@Query() query: ListSubmissionsQueryDto) {
    const result = await getContactService().listSubmissions({
      formSlug: query.formSlug,
      status: query.status,
      page: query.page,
      perPage: query.perPage,
    });

    return {
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        perPage: result.perPage,
        totalPages: Math.ceil(result.total / result.perPage),
      },
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a contact form submission by ID" })
  async getSubmission(@Param("id") id: string) {
    const submission = await getContactService().getSubmission(Number(id));
    return {
      data: submission,
    };
  }

  @Post()
  @ApiOperation({ summary: "Create a new contact form submission" })
  @UseInterceptors(AuditInterceptor)
  @Audit("CREATE_CONTACT_SUBMISSION", "ContactSubmission")
  async createSubmission(@Body() body: CreateSubmissionDto) {
    const submission = await getContactService().createSubmission({
      name: body.name,
      email: body.email,
      phone: body.phone,
      subject: body.subject,
      message: body.message,
      formSlug: body.formSlug ?? "default",
      metadata: body.metadata,
    });

    return {
      data: submission,
    };
  }
}
