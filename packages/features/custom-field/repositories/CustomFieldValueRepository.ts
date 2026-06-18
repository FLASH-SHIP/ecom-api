import type { PrismaClient } from "@prisma/client";

export class CustomFieldValueRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByReference(useFor: string, useForId: number) {
    return this.prisma.customFieldValue.findMany({
      where: { useFor, useForId },
      select: {
        id: true,
        fieldItemId: true,
        value: true,
        fieldItem: {
          select: { slug: true, title: true, type: true, groupId: true },
        },
      },
    });
  }

  async upsert(data: {
    fieldItemId: number;
    useFor: string;
    useForId: number;
    value: string | null;
  }) {
    return this.prisma.customFieldValue.upsert({
      where: {
        fieldItemId_useFor_useForId: {
          fieldItemId: data.fieldItemId,
          useFor: data.useFor,
          useForId: data.useForId,
        },
      },
      create: data,
      update: { value: data.value },
      select: { id: true, fieldItemId: true, value: true },
    });
  }

  async removeByReference(useFor: string, useForId: number) {
    return this.prisma.customFieldValue.deleteMany({
      where: { useFor, useForId },
    });
  }
}
