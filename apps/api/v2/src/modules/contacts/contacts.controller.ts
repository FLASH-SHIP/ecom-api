import { prisma } from "@ecom/prisma";
import { Body, Controller, Get, NotFoundException, Param, Post, Query } from "@nestjs/common";

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
    const skip = (Number(page) - 1) * take;

    const where: Record<string, unknown> = {};
    if (formSlug) where.formSlug = formSlug;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          subject: true,
          status: true,
          formSlug: true,
          createdAt: true,
        },
      }),
      prisma.contactSubmission.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        perPage: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  @Get(":id")
  async getSubmission(@Param("id") id: string) {
    const submission = await prisma.contactSubmission.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        message: true,
        status: true,
        formSlug: true,
        metadata: true,
        createdAt: true,
      },
    });

    if (!submission) throw new NotFoundException("Submission not found");

    // Auto-mark as read
    if (submission.status === "new") {
      await prisma.contactSubmission.update({
        where: { id: Number(id) },
        data: { status: "read" },
      });
    }

    return submission;
  }

  @Post()
  async createSubmission(
    @Body()
    body: {
      name: string;
      email: string;
      phone?: string;
      subject?: string;
      message: string;
      formSlug?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return prisma.contactSubmission.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        subject: body.subject,
        message: body.message,
        formSlug: body.formSlug ?? "default",
        metadata: (body.metadata as never) ?? undefined,
        status: "new",
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });
  }
}
