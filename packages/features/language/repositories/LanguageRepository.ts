import type { PrismaClient } from "@ecom/prisma";

const languageSelect = {
  id: true,
  name: true,
  locale: true,
  code: true,
  flag: true,
  isDefault: true,
  isActive: true,
  isRtl: true,
  order: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class LanguageRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll() {
    return this.prisma.language.findMany({
      select: languageSelect,
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
  }

  async findActive() {
    return this.prisma.language.findMany({
      where: { isActive: true },
      select: languageSelect,
      orderBy: [{ isDefault: "desc" }, { order: "asc" }],
    });
  }

  async findById(id: number) {
    return this.prisma.language.findUnique({
      where: { id },
      select: languageSelect,
    });
  }

  async findByCode(code: string) {
    return this.prisma.language.findUnique({
      where: { code },
      select: languageSelect,
    });
  }

  async findByLocale(locale: string) {
    return this.prisma.language.findUnique({
      where: { locale },
      select: languageSelect,
    });
  }

  async findDefault() {
    return this.prisma.language.findFirst({
      where: { isDefault: true },
      select: languageSelect,
    });
  }

  async create(data: {
    name: string;
    locale: string;
    code: string;
    flag?: string;
    isDefault?: boolean;
    isActive?: boolean;
    isRtl?: boolean;
    order?: number;
  }) {
    return this.prisma.language.create({
      data,
      select: languageSelect,
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      locale?: string;
      code?: string;
      flag?: string;
      isDefault?: boolean;
      isActive?: boolean;
      isRtl?: boolean;
      order?: number;
    },
  ) {
    return this.prisma.language.update({
      where: { id },
      data,
      select: languageSelect,
    });
  }

  async delete(id: number) {
    return this.prisma.language.delete({
      where: { id },
      select: { id: true },
    });
  }

  async setDefault(id: number) {
    return this.prisma.$transaction([
      this.prisma.language.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.language.update({
        where: { id },
        data: { isDefault: true },
        select: languageSelect,
      }),
    ]);
  }

  async count() {
    return this.prisma.language.count();
  }
}
