import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

export class FieldItemRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByGroupId(groupId: number) {
    return this.prisma.fieldItem.findMany({
      where: { groupId },
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        placeholder: true,
        instructions: true,
        options: true,
        defaultValue: true,
        order: true,
        parentId: true,
      },
      orderBy: { order: "asc" },
    });
  }

  async create(data: {
    groupId: number;
    slug: string;
    title: string;
    type: string;
    placeholder?: string;
    instructions?: string;
    options?: unknown;
    defaultValue?: string;
    order?: number;
    parentId?: number;
  }) {
    return this.prisma.fieldItem.create({
      data: {
        groupId: data.groupId,
        slug: data.slug,
        title: data.title,
        type: data.type,
        placeholder: data.placeholder,
        instructions: data.instructions,
        // Prisma Json fields require InputJsonValue — options is always a plain JSON array
        options: (data.options ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        defaultValue: data.defaultValue,
        order: data.order ?? 0,
        parentId: data.parentId,
      },
      select: { id: true, slug: true, title: true, type: true },
    });
  }

  async update(
    id: number,
    data: {
      slug?: string;
      title?: string;
      type?: string;
      placeholder?: string;
      instructions?: string;
      options?: unknown;
      defaultValue?: string;
      order?: number;
      parentId?: number | null;
    },
  ) {
    const { options, parentId, ...rest } = data;
    const updateData: Record<string, unknown> = { ...rest };
    if (options !== undefined) {
      updateData.options = options as Prisma.InputJsonValue;
    }
    if (parentId !== undefined) {
      updateData.parentId = parentId;
    }
    return this.prisma.fieldItem.update({
      where: { id },
      data: updateData,
      select: { id: true, slug: true, title: true, type: true },
    });
  }

  async remove(id: number) {
    return this.prisma.fieldItem.delete({ where: { id } });
  }
}
