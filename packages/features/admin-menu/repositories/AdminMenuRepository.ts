import type { PrismaClient } from "@prisma/client";

const menuItemSelect = {
  id: true,
  key: true,
  name: true,
  description: true,
  icon: true,
  route: true,
  permissions: true,
  childrenDisplay: true,
  section: true,
  priority: true,
  isActive: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
} as const;

const translationSelect = {
  id: true,
  langCode: true,
  name: true,
  description: true,
  section: true,
} as const;

export class AdminMenuRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll() {
    return this.prisma.adminMenuItem.findMany({
      where: { parentId: null },
      orderBy: { priority: "asc" },
      select: {
        ...menuItemSelect,
        translations: { select: translationSelect },
        children: {
          orderBy: { priority: "asc" },
          select: {
            ...menuItemSelect,
            translations: { select: translationSelect },
            children: {
              orderBy: { priority: "asc" },
              select: {
                ...menuItemSelect,
                translations: { select: translationSelect },
              },
            },
          },
        },
      },
    });
  }

  async findAllFlat() {
    return this.prisma.adminMenuItem.findMany({
      orderBy: [{ priority: "asc" }, { id: "asc" }],
      select: {
        ...menuItemSelect,
        translations: { select: translationSelect },
      },
    });
  }

  async findById(id: number) {
    return this.prisma.adminMenuItem.findUnique({
      where: { id },
      select: {
        ...menuItemSelect,
        translations: { select: translationSelect },
        children: {
          orderBy: { priority: "asc" },
          select: {
            ...menuItemSelect,
            translations: { select: translationSelect },
          },
        },
      },
    });
  }

  async findByKey(key: string) {
    return this.prisma.adminMenuItem.findUnique({
      where: { key },
      select: { id: true, key: true },
    });
  }

  async create(data: {
    key: string;
    name: string;
    description?: string;
    icon?: string;
    route?: string;
    permissions?: string[];
    childrenDisplay?: string;
    section?: string;
    priority?: number;
    isActive?: boolean;
    parentId?: number;
  }) {
    return this.prisma.adminMenuItem.create({
      data: {
        ...data,
        permissions: data.permissions ?? undefined,
      },
      select: {
        ...menuItemSelect,
        translations: { select: translationSelect },
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      description?: string;
      icon?: string;
      route?: string;
      permissions?: string[];
      childrenDisplay?: string;
      section?: string;
      priority?: number;
      isActive?: boolean;
      parentId?: number | null;
    },
  ) {
    return this.prisma.adminMenuItem.update({
      where: { id },
      data: {
        ...data,
        permissions: data.permissions ?? undefined,
      },
      select: {
        ...menuItemSelect,
        translations: { select: translationSelect },
      },
    });
  }

  async delete(id: number) {
    return this.prisma.adminMenuItem.delete({ where: { id } });
  }

  async upsertTranslation(
    menuItemId: number,
    langCode: string,
    data: {
      name: string;
      description?: string;
      section?: string;
    },
  ) {
    return this.prisma.adminMenuItemTranslation.upsert({
      where: { menuItemId_langCode: { menuItemId, langCode } },
      create: { menuItemId, langCode, ...data },
      update: data,
      select: translationSelect,
    });
  }

  async reorder(items: Array<{ id: number; priority: number; parentId?: number | null }>) {
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.adminMenuItem.update({
          where: { id: item.id },
          data: {
            priority: item.priority,
            ...(item.parentId !== undefined ? { parentId: item.parentId } : {}),
          },
        }),
      ),
    );
  }
}
