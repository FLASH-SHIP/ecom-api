import type { PrismaClient } from "@ecom/prisma";

export class SettingRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByKey(key: string) {
    return this.prisma.setting.findUnique({ where: { key } });
  }

  async findByKeys(keys: string[]) {
    return this.prisma.setting.findMany({
      where: { key: { in: keys } },
    });
  }

  async findAll() {
    return this.prisma.setting.findMany({
      orderBy: { key: "asc" },
    });
  }

  async set(key: string, value: string | null) {
    return this.prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  async bulkSet(items: Array<{ key: string; value: string | null }>) {
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.setting.upsert({
          where: { key: item.key },
          create: { key: item.key, value: item.value },
          update: { value: item.value },
        }),
      ),
    );
  }

  async delete(key: string) {
    return this.prisma.setting.delete({ where: { key } });
  }
}
