import type { PrismaClient } from "../src/generated/prisma/client";
import type { Seeder } from "./seeder.interface";

// Generate slug matching Flexport URLs (e.g. "01-live-animals")
function slugify(chapterCode: string, name: string): string {
  const cleanName = name
    .toLowerCase()
    .replace(/\s*\d*see section.*$/i, "") // Remove US footnotes e.g. "1See section XI..."
    .replace(/\(tn\d+\)/gi, "") // Remove EU footnotes e.g. "(TN701)"
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

// Extract notes container outer HTML (filtering out chapter_header, chapter_header_desc, and number divs)
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

  let rawSection = html.substring(sectionStartIdx, sectionEndIdx + "</section>".length).trim();

  // Clean out chapter_header, chapter_header_desc, and number divs
  rawSection = rawSection
    .replace(/<div\s+class="chapter_header">[\s\S]*?<\/div>/gi, "")
    .replace(/<div\s+class="chapter_header_desc">[\s\S]*?<\/div>/gi, "")
    .replace(/<div\s+class="number">[\s\S]*?<\/div>/gi, "")
    .trim();

  return rawSection;
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

const FALLBACK_SLUGS: Record<string, string> = {
  "12": "12-oil-seeds-and-oleaginous-fruits-miscellaneous-grains-seeds-and-fruits-industrial-or-medicinal-plants-straw-and-fodder",
  "15": "15-animal-or-vegetable-fats-and-oils-and-their-cleavage-products-prepared-edible-fats-animal-or-vegetable-waxes",
  "16": "16-preparations-of-meat-of-fish-or-of-crustaceans-molluscs-or-other-aquatic-invertebrates",
  "19": "19-preparations-of-cereals-flour-starch-or-milk-bakers-wares",
  "23": "23-residues-and-waste-from-the-food-industries-prepared-animal-feed",
  "24": "24-tobacco-and-manufactured-tobacco-substitutes",
  "25": "25-salt-sulfur-earths-and-stone-plastering-materials-lime-and-cement",
  "28": "28-inorganic-chemicals-organic-or-inorgani-c-compounds-of-precious-metals-of-rareearth-metalsof-radioactive-elements-or-of-isotopes",
  "31": "31-fertilizers",
  "32": "32-tanning-or-dyeing-extracts-dyes-pigments-paints-varnishes-putty-and-mastics",
  "34": "34-soap-organic-surfaceactive-agents-washing-preparations-lubricating-preparations-artificial-waxes-prepared-waxes-polishing-or-scouring-preparations-can",
  "47": "47-pulp-of-wood-or-of-other-fibrous-cellulosic-material-waste-and-scrap-of-paper-or-paperboard",
  "53": "53-other-vegetable-textile-fibers-paper-yarn-and-woven-fabric-of-paper-yarn",
  "54": "54-manmade-filaments",
  "55": "55-manmade-staple-fibers",
  "66": "66-umbrellas-sun-umbrellas-walking-sticks-seatsticks-whips-ridingcrops-and-parts-thereof",
  "71": "71-natural-or-cultured-pearls-precious-or-semiprecious-stonesprecious-metals-metals-clad-with-precious-metal-and-articles-thereof-imitation-jewelry-coin",
  "76": "76-aluminum-and-articles-thereof",
  "77": "77-reserved-for-possible-future-use",
  "85": "85-electrical-machinery-and-equipment-and-parts-thereof-sound-recorders-and-reproducers-television-image-and-sound-recorders-and-reproducers-and-parts-an",
  "86": "86-railway-or-tramway-locomotives-rollingstock-and-parts-thereof-railway-or-tramway-track-fixtures-and-fittings-and-parts-thereof-mechanical-including-el",
  "94": "94-furniture-bedding-mattresses-mattress-supports-cushions-and-similar-stuffed-furnishings-lamps-and-lighting-fittings-not-elsewhere-specified-or-include",
  "98": "98-special-classification-provisions",
  "99": "99-temporary-legislation-temporary-modifications-proclaimed-pursuant-to-trade-agreements-legislation-additional-import-restrictions-proclaimed-pursuant-t",
};

async function processChapter(
  prisma: PrismaClient,
  ch: { chapter_code: string; article_description: string },
  index: number,
  total: number,
): Promise<boolean> {
  const chapterCode = ch.chapter_code;
  if (chapterCode.length !== 2) return false;

  const parts = ch.article_description.split(/[：:]+/);
  const rawName = parts[0];
  if (!rawName) return false;
  const chapterName = rawName.trim();

  const slug = FALLBACK_SLUGS[chapterCode] || slugify(chapterCode, chapterName);
  const url = `https://www.flexport.com/data/hs-code/${slug}`;

  console.log(`    [${index + 1}/${total}] Fetching chapter ${chapterCode}: ${url}`);

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
    const rawDesc = htmlDesc || chapterName;
    const finalDesc = (rawDesc || "").replace(/\s*\d*[/]*\s*See\s+.*$/i, "").trim();

    const safeId = 900000 + Number(chapterCode);

    // Upsert chapter-level metadata row
    const existing = await prisma.crawlHsCode.findFirst({
      where: { hsCode: chapterCode, portOfClearance: "US" },
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

    console.log(
      `    ✅ Chapter ${chapterCode} processed successfully (Notes Box length: ${notesBox?.length ?? 0}).`,
    );
    return true;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`    ❌ Chapter ${chapterCode} failed: ${errMsg}`);
    return false;
  }
}

export const FlexportHsCodeCrawlerSeeder: Seeder = {
  name: "FlexportHsCodeCrawler",

  async run(prisma: PrismaClient) {
    console.log("\n    🚀 Starting Flexport HTS Chapter Notes Seeder...");

    try {
      // Fetch all distinct 2-digit chapters from database
      const rawChapters = await prisma.$queryRaw<
        Array<{ chapter_code: string; article_description: string }>
      >`
        SELECT DISTINCT ON (hs_code)
          hs_code as chapter_code,
          article_description
        FROM crawl_hscode
        WHERE LENGTH(hs_code) = 2
          AND article_description IS NOT NULL
          AND article_description != ''
        ORDER BY hs_code;
      `;

      console.log(`    Found ${rawChapters.length} distinct chapters to crawl.`);

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < rawChapters.length; i++) {
        const ch = rawChapters[i];
        if (!ch?.article_description || !ch.chapter_code) continue;

        const ok = await processChapter(prisma, ch, i, rawChapters.length);
        if (ok) {
          successCount++;
        } else {
          failCount++;
        }

        // Small delay to be polite
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      console.log(`\n    🎉 Crawler finished! Success: ${successCount}, Failed: ${failCount}`);
    } catch (error) {
      console.error("    Fatal error running crawler seeder:", error);
    }
  },
};
