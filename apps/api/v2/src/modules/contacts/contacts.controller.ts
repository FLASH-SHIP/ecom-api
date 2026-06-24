import { getContactService } from "@ecom/features/di/containers/ContactService";
import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";
import type { ListSubmissionsQueryDto } from "./dto/list-submissions-query.dto";

class CreateSubmissionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  formSlug?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

@Controller("contacts")
export class ContactsController {
  @Get()
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
  async getSubmission(@Param("id") id: string) {
    const submission = await getContactService().getSubmission(Number(id));
    return {
      data: submission,
    };
  }

  @Post()
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
