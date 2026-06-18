import type { PrismaClient } from "@prisma/client";
import type { Seeder } from "./seeder.interface";

/**
 * System settings seeder.
 *
 * Only creates settings that don't exist yet — never overwrites.
 * This is intentional: production settings (site name, timezone, etc.)
 * are managed through the CMS UI and must not be reset by a re-seed.
 */
export const SettingsSeeder: Seeder = {
  name: "Default Settings",

  async run(prisma: PrismaClient) {
    const defaults = [
      { key: "site.name", value: "Ecom" },
      { key: "site.description", value: "Content Management System" },
      { key: "site.locale", value: "vi" },
      { key: "site.timezone", value: "Asia/Ho_Chi_Minh" },
      { key: "blog.postsPerPage", value: "20" },
      { key: "blog.excerptLength", value: "200" },
      { key: "media.maxUploadSize", value: "10485760" },
      { key: "media.allowedTypes", value: "image/*,application/pdf,video/*" },
    ];

    // Batch: fetch all existing keys in 1 query instead of N findUnique calls
    const existingKeys = await prisma.setting.findMany({
      where: { key: { in: defaults.map((s) => s.key) } },
      select: { key: true },
    });
    const existingSet = new Set(existingKeys.map((s) => s.key));

    const toCreate = defaults.filter((s) => !existingSet.has(s.key));
    const skipped = defaults.length - toCreate.length;

    if (toCreate.length > 0) {
      await prisma.setting.createMany({ data: toCreate });
    }

    console.log(`    → ${toCreate.length} created, ${skipped} already existed (preserved)`);
  },
};
