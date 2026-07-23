import { Prisma, prisma } from "@ecom/prisma";

export interface CreateTemplateInput {
  type: string;
  titleTemplate: Record<string, string>;
  messageTemplate: Record<string, string>;
  emailSubjectTemplate?: Record<string, string> | null;
  emailBodyTemplate?: Record<string, string> | null;
  variables?: Record<string, string>;
  channelInApp?: boolean;
  channelPush?: boolean;
  channelEmail?: boolean;
  layoutType?: string | null;
}

export interface UpdateTemplateInput {
  titleTemplate?: Record<string, string>;
  messageTemplate?: Record<string, string>;
  emailSubjectTemplate?: Record<string, string> | null;
  emailBodyTemplate?: Record<string, string> | null;
  variables?: Record<string, string>;
  channelInApp?: boolean;
  channelPush?: boolean;
  channelEmail?: boolean;
  layoutType?: string | null;
}

export class NotificationTemplateRepository {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: database create operations
  async create(data: CreateTemplateInput) {
    return prisma.notificationTemplate.create({
      data: {
        type: data.type,
        titleTemplate: data.titleTemplate,
        messageTemplate: data.messageTemplate,
        emailSubjectTemplate:
          data.emailSubjectTemplate === null ? Prisma.DbNull : data.emailSubjectTemplate,
        emailBodyTemplate: data.emailBodyTemplate === null ? Prisma.DbNull : data.emailBodyTemplate,
        variables: data.variables,
        channelInApp: data.channelInApp ?? true,
        channelPush: data.channelPush ?? true,
        channelEmail: data.channelEmail ?? true,
        layoutType: data.layoutType,
      },
    });
  }

  async update(id: number, data: UpdateTemplateInput) {
    return prisma.notificationTemplate.update({
      where: { id },
      data: {
        titleTemplate: data.titleTemplate,
        messageTemplate: data.messageTemplate,
        emailSubjectTemplate:
          data.emailSubjectTemplate === null ? Prisma.DbNull : data.emailSubjectTemplate,
        emailBodyTemplate: data.emailBodyTemplate === null ? Prisma.DbNull : data.emailBodyTemplate,
        variables: data.variables,
        channelInApp: data.channelInApp,
        channelPush: data.channelPush,
        channelEmail: data.channelEmail,
        layoutType: data.layoutType === null ? null : data.layoutType,
      },
    });
  }

  async delete(id: number) {
    return prisma.notificationTemplate.delete({
      where: { id },
    });
  }

  async findById(id: number) {
    return prisma.notificationTemplate.findUnique({
      where: { id },
    });
  }

  async findByType(type: string) {
    return prisma.notificationTemplate.findUnique({
      where: { type },
    });
  }

  async list() {
    return prisma.notificationTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
  }
}
