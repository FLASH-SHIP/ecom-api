import * as dotenv from "dotenv";

dotenv.config({
  path: "/Users/hy/SourceCode/flashship/ecom/.env",
});

// Generate slug matching Flexport URLs (e.g. "01-live-animals")
function slugify(chapterCode: string, name: string): string {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .trim();
  return `${chapterCode}-${cleanName}`;
}

function findNotesHeaderIdx(html: string): number {
  const headers = [
    '<div class="note_header">Note</div>',
    '<div class="note_header">Notes</div>',
    '<div class="note_header">Note:</div>',
    '<div class="note_header">Notes:</div>',
    '<div class="paragraph">Note</div>',
    '<div class="paragraph">Notes</div>',
    '<div class="paragraph">Note:</div>',
    '<div class="paragraph">Notes:</div>',
  ];

  for (const h of headers) {
    const idx = html.indexOf(h);
    if (idx !== -1) {
      return idx;
    }
  }
  return -1;
}

// Extract notes container outer HTML
function extractNotesBox(html: string): string | null {
  const headerIdx = findNotesHeaderIdx(html);
  if (headerIdx === -1) {
    return null;
  }

  const sectionStartIdx = html.lastIndexOf("<section", headerIdx);
  if (sectionStartIdx === -1) {
    return null;
  }

  const sectionEndIdx = html.indexOf("</section>", headerIdx);
  if (sectionEndIdx === -1) {
    return null;
  }

  return html.substring(sectionStartIdx, sectionEndIdx + "</section>".length).trim();
}

// Extract chapter name description from HTML
function extractChapterDesc(html: string): string | null {
  const descHeader = '<div class="chapter_header_desc">';
  const idx = html.indexOf(descHeader);
  if (idx !== -1) {
    const start = idx + descHeader.length;
    const end = html.indexOf("</div>", start);
    if (end !== -1) {
      return html.substring(start, end).trim();
    }
  }
  return null;
}

async function run() {
  console.log("🚀 Starting Flexport HTS Chapter Notes Crawler...");

  // Dynamically import prisma to ensure process.env.DATABASE_URL is set first
  const { prisma } = await import("@ecom/prisma");

  try {
    // 1. Fetch all distinct 2-digit chapters from database
    const rawChapters = await prisma.$queryRaw<
      Array<{ chapter_code: string; article_description: string }>
    >`
      SELECT DISTINCT ON (SUBSTRING(hs_code, 1, 2))
        SUBSTRING(hs_code, 1, 2) as chapter_code,
        article_description
      FROM crawl_hscode
      WHERE hs_code IS NOT NULL AND LENGTH(hs_code) > 2
      ORDER BY SUBSTRING(hs_code, 1, 2), hs_code;
    `;

    console.log(`Found ${rawChapters.length} distinct chapters to crawl.`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < rawChapters.length; i++) {
      const ch = rawChapters[i];
      if (!ch || !ch.article_description || !ch.chapter_code) continue;
      const chapterCode = ch.chapter_code;
      if (chapterCode.length !== 2) continue;

      const parts = ch.article_description.split(/[：:]+/);
      const rawName = parts[0];
      if (!rawName) continue;
      const chapterName = rawName.trim();

      const FALLBACK_SLUGS: Record<string, string> = {
        "28": "28-inorganic-chemicals-organic-or-inorgani-c-compounds-of-precious-metals-of-rareearth-metalsof-radioactive-elements-or-of-isotopes",
        "34": "34-soap-organic-surfaceactive-agents-washing-preparations-lubricating-preparations-artificial-waxes-prepared-waxes-polishing-or-scouring-preparations-can",
        "54": "54-manmade-filaments",
        "55": "55-manmade-staple-fibers",
        "66": "66-umbrellas-sun-umbrellas-walking-sticks-seatsticks-whips-ridingcrops-and-parts-thereof",
        "71": "71-natural-or-cultured-pearls-precious-or-semiprecious-stonesprecious-metals-metals-clad-with-precious-metal-and-articles-thereof-imitation-jewelry-coin",
        "85": "85-electrical-machinery-and-equipment-and-parts-thereof-sound-recorders-and-reproducers-television-image-and-sound-recorders-and-reproducers-and-parts-an",
        "86": "86-railway-or-tramway-locomotives-rollingstock-and-parts-thereof-railway-or-tramway-track-fixtures-and-fittings-and-parts-thereof-mechanical-including-el",
        "94": "94-furniture-bedding-mattresses-mattress-supports-cushions-and-similar-stuffed-furnishings-lamps-and-lighting-fittings-not-elsewhere-specified-or-include",
      };

      const slug = FALLBACK_SLUGS[chapterCode] || slugify(chapterCode, chapterName);
      const url = `https://www.flexport.com/data/hs-code/${slug}`;

      console.log(`[${i + 1}/${rawChapters.length}] Fetching chapter ${chapterCode}: ${url}`);

      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const html = await res.text();
        const notesBox = extractNotesBox(html);
        const htmlDesc = extractChapterDesc(html);
        const finalDesc = htmlDesc || chapterName;

        const safeId = 900000 + Number(chapterCode);

        // 2. Upsert chapter-level metadata row
        const existing = await prisma.crawlHsCode.findFirst({
          where: { hsCode: chapterCode },
          select: { id: true },
        });

        if (existing) {
          await prisma.crawlHsCode.update({
            where: { id: existing.id },
            data: {
              articleDescription: finalDesc,
              notes: notesBox,
            },
          });
        } else {
          await prisma.crawlHsCode.create({
            data: {
              no: safeId,
              hsCode: chapterCode,
              articleDescription: finalDesc,
              notes: notesBox,
              portOfClearance: "US",
            },
          });
        }

        successCount++;
        console.log(
          `✅ Chapter ${chapterCode} processed successfully (Notes Box length: ${notesBox?.length ?? 0}).`,
        );
      } catch (err) {
        failCount++;
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`❌ Chapter ${chapterCode} failed: ${errMsg}`);
      }

      // Small delay to be polite
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log(`\n🎉 Crawler finished! Success: ${successCount}, Failed: ${failCount}`);
  } catch (error) {
    console.error("Fatal error running crawler:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
