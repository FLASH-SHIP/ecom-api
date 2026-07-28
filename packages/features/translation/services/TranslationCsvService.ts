import { prisma } from "@ecom/prisma";
import { createLogger } from "@flash-ship/ecom-lib/logger";

const log = createLogger("TranslationCsvService");

type EntityType = "post" | "category" | "page" | "tag";

interface CsvRow {
  id: number;
  original: string;
  translated: string;
  field: string;
}

/**
 * Service for exporting/importing translations as CSV.
 * Enables translators to work offline with spreadsheet tools.
 *
 * CSV format:
 *   id,field,original,translated
 *   1,title,"Hello World","Xin chào thế giới"
 *   1,excerpt,"A summary","Tóm tắt"
 */
export class TranslationCsvService {
  /**
   * Export all translations for a given entity type and language to CSV.
   * Each translatable field becomes a separate row.
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: switch over 4 entity types, each with field mapping — cannot be simplified without losing clarity
  async exportCsv(entityType: EntityType, langCode: string): Promise<string> {
    const rows: CsvRow[] = [];

    switch (entityType) {
      case "post": {
        const posts = await prisma.post.findMany({
          where: { deletedAt: null },
          select: { id: true, title: true, excerpt: true },
          orderBy: { id: "asc" },
        });
        const translations = await prisma.postTranslation.findMany({
          where: { langCode },
          select: { postId: true, title: true, excerpt: true },
        });
        const tMap = new Map(translations.map((t) => [t.postId, t]));

        for (const post of posts) {
          const t = tMap.get(post.id);
          rows.push({
            id: post.id,
            field: "title",
            original: post.title,
            translated: t?.title ?? "",
          });
          rows.push({
            id: post.id,
            field: "excerpt",
            original: post.excerpt ?? "",
            translated: t?.excerpt ?? "",
          });
        }
        break;
      }
      case "category": {
        const categories = await prisma.category.findMany({
          select: { id: true, name: true, description: true },
          orderBy: { id: "asc" },
        });
        const translations = await prisma.categoryTranslation.findMany({
          where: { langCode },
          select: { categoryId: true, name: true, description: true },
        });
        const tMap = new Map(translations.map((t) => [t.categoryId, t]));

        for (const cat of categories) {
          const t = tMap.get(cat.id);
          rows.push({ id: cat.id, field: "name", original: cat.name, translated: t?.name ?? "" });
          rows.push({
            id: cat.id,
            field: "description",
            original: cat.description ?? "",
            translated: t?.description ?? "",
          });
        }
        break;
      }
      case "page": {
        const pages = await prisma.page.findMany({
          where: { deletedAt: null },
          select: { id: true, title: true, excerpt: true },
          orderBy: { id: "asc" },
        });
        const translations = await prisma.pageTranslation.findMany({
          where: { langCode },
          select: { pageId: true, title: true, excerpt: true },
        });
        const tMap = new Map(translations.map((t) => [t.pageId, t]));

        for (const page of pages) {
          const t = tMap.get(page.id);
          rows.push({
            id: page.id,
            field: "title",
            original: page.title,
            translated: t?.title ?? "",
          });
          rows.push({
            id: page.id,
            field: "excerpt",
            original: page.excerpt ?? "",
            translated: t?.excerpt ?? "",
          });
        }
        break;
      }
      case "tag": {
        const tags = await prisma.tag.findMany({
          select: { id: true, name: true },
          orderBy: { id: "asc" },
        });
        const translations = await prisma.tagTranslation.findMany({
          where: { langCode },
          select: { tagId: true, name: true },
        });
        const tMap = new Map(translations.map((t) => [t.tagId, t]));

        for (const tag of tags) {
          const t = tMap.get(tag.id);
          rows.push({ id: tag.id, field: "name", original: tag.name, translated: t?.name ?? "" });
        }
        break;
      }
    }

    return toCsv(rows);
  }

  /**
   * Import translations from a CSV string.
   * Only rows with a non-empty `translated` value are upserted.
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: switch over 4 entity types with per-field upsert logic
  async importCsv(
    entityType: EntityType,
    langCode: string,
    csvContent: string,
  ): Promise<{ updated: number; skipped: number; errors: string[] }> {
    const rows = parseCsv(csvContent);
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      if (!row.translated.trim()) {
        skipped++;
        continue;
      }

      try {
        switch (entityType) {
          case "post": {
            const data: Record<string, string> = {};
            if (row.field === "title") data.title = row.translated;
            else if (row.field === "excerpt") data.excerpt = row.translated;
            else {
              skipped++;
              continue;
            }
            await prisma.postTranslation.upsert({
              where: { postId_langCode: { postId: row.id, langCode } },
              create: { postId: row.id, langCode, title: data.title ?? "", ...data },
              update: data,
            });
            break;
          }
          case "category": {
            const data: Record<string, string> = {};
            if (row.field === "name") data.name = row.translated;
            else if (row.field === "description") data.description = row.translated;
            else {
              skipped++;
              continue;
            }
            await prisma.categoryTranslation.upsert({
              where: { categoryId_langCode: { categoryId: row.id, langCode } },
              create: { categoryId: row.id, langCode, name: data.name ?? "", ...data },
              update: data,
            });
            break;
          }
          case "page": {
            const data: Record<string, string> = {};
            if (row.field === "title") data.title = row.translated;
            else if (row.field === "excerpt") data.excerpt = row.translated;
            else {
              skipped++;
              continue;
            }
            await prisma.pageTranslation.upsert({
              where: { pageId_langCode: { pageId: row.id, langCode } },
              create: { pageId: row.id, langCode, title: data.title ?? "", ...data },
              update: data,
            });
            break;
          }
          case "tag": {
            if (row.field !== "name") {
              skipped++;
              continue;
            }
            await prisma.tagTranslation.upsert({
              where: { tagId_langCode: { tagId: row.id, langCode } },
              create: { tagId: row.id, langCode, name: row.translated },
              update: { name: row.translated },
            });
            break;
          }
        }
        updated++;
      } catch (err) {
        errors.push(
          `Row id=${row.id} field=${row.field}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    log.info("CSV import completed", {
      entityType,
      langCode,
      updated,
      skipped,
      errorCount: errors.length,
    });
    return { updated, skipped, errors };
  }
}

// ─── CSV Helpers ─────────────────────────────────

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(rows: CsvRow[]): string {
  const header = "id,field,original,translated";
  const lines = rows.map(
    (r) =>
      `${r.id},${escapeCsvField(r.field)},${escapeCsvField(r.original)},${escapeCsvField(r.translated)}`,
  );
  return [header, ...lines].join("\n");
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length <= 1) return [];

  const result: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i] ?? "");
    if (fields.length < 4) continue;

    const id = Number.parseInt(fields[0] ?? "", 10);
    if (Number.isNaN(id)) continue;

    result.push({
      id,
      field: fields[1] ?? "",
      original: fields[2] ?? "",
      translated: fields[3] ?? "",
    });
  }

  return result;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: RFC 4180 CSV state machine — char-by-char parsing with quote/escape tracking cannot be split further without losing clarity
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);

  return fields;
}
