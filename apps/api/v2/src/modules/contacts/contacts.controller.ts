import { getContactService } from "@ecom/features/di/containers/ContactService";
import { Body, Controller, Get, NotFoundException, Param, Post, Query } from "@nestjs/common";
import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

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

@Controller("v2/contacts")
export class ContactsController {
  @Get()
  async listSubmissions(
    @Query("formSlug") formSlug?: string,
    @Query("status") status?: string,
    @Query("page") page = "1",
    @Query("perPage") perPage = "20",
  ) {
    const take = Math.min(Number(perPage), 50);

    return getContactService().listSubmissions({
      formSlug,
      status: status as "new" | "read" | "replied" | "archived" | undefined,
      page: Number(page),
      perPage: take,
    });
  }

  @Get(":id")
  async getSubmission(@Param("id") id: string) {
    try {
      return await getContactService().getSubmission(Number(id));
    } catch {
      throw new NotFoundException("Submission not found");
    }
  }

  @Post()
  async createSubmission(@Body() body: CreateSubmissionDto) {
    return getContactService().createSubmission({
      name: body.name,
      email: body.email,
      phone: body.phone,
      subject: body.subject,
      message: body.message,
      formSlug: body.formSlug ?? "default",
      metadata: body.metadata,
    });
  }
}
