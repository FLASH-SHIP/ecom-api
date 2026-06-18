import type { PrismaClient } from "../src/generated/prisma/client";
import type { Seeder } from "./seeder.interface";

export const LanguagesSeeder: Seeder = {
  name: "Languages & Categories",

  async run(prisma: PrismaClient) {
    // Languages — upsert, update:{} so production config is preserved
    const languages = [
      {
        name: "Tiếng Việt",
        locale: "vi",
        code: "vi",
        flag: "vn",
        isDefault: true,
        isActive: true,
        order: 0,
      },
      {
        name: "English",
        locale: "en",
        code: "en_US",
        flag: "us",
        isDefault: false,
        isActive: true,
        order: 1,
      },
    ];

    for (const lang of languages) {
      await prisma.language.upsert({
        where: { locale: lang.locale },
        update: {},
        create: lang,
      });
    }

    // Categories
    const categories = [
      { slug: "technology", name: "Technology", order: 0 },
      { slug: "news", name: "News", order: 1 },
    ];

    for (const cat of categories) {
      await prisma.category.upsert({
        where: { slug: cat.slug },
        update: {},
        create: cat,
      });
    }

    console.log(`    → ${languages.length} languages, ${categories.length} categories`);
  },
};
