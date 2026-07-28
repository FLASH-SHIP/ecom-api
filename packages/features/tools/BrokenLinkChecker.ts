import { createLogger } from "@flash-ship/ecom-lib/logger";

const log = createLogger("BrokenLinkChecker");

export interface LinkCheckResult {
  url: string;
  status: "ok" | "broken" | "timeout" | "error";
  statusCode?: number;
  responseTime: number;
  foundIn: { entityType: string; entityId: number; entityTitle: string }[];
}

interface IBrokenLinkCheckerDeps {
  findContentWithLinks: () => Promise<
    { id: number; title: string; content: string; type: string }[]
  >;
}

/**
 * Broken Link Checker — scans content for broken URLs.
 *
 * Extracts all href/src URLs from content HTML, deduplicates,
 * and checks each for accessibility.
 *
 * Designed to run as a scheduled task (e.g., weekly).
 */
export class BrokenLinkChecker {
  private deps: IBrokenLinkCheckerDeps;
  constructor(deps: IBrokenLinkCheckerDeps) {
    this.deps = deps;
  }

  /**
   * Extract all URLs from HTML content.
   */
  extractUrls(html: string): string[] {
    const urlRegex = /(?:href|src)\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
    const urls = new Set<string>();
    let match: RegExpExecArray | null;

    // biome-ignore lint/suspicious/noAssignInExpressions: standard regex iteration pattern
    while ((match = urlRegex.exec(html)) !== null) {
      if (match[1]) urls.add(match[1]);
    }

    return [...urls];
  }

  /**
   * Check if a URL is accessible.
   */
  async checkUrl(url: string, timeoutMs = 10_000): Promise<Omit<LinkCheckResult, "foundIn">> {
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "Ecom-CMS-LinkChecker/1.0" },
      });

      clearTimeout(timer);
      const responseTime = Date.now() - start;

      return {
        url,
        status: response.ok ? "ok" : "broken",
        statusCode: response.status,
        responseTime,
      };
    } catch (err) {
      const responseTime = Date.now() - start;

      if (err instanceof DOMException && err.name === "AbortError") {
        return { url, status: "timeout", responseTime };
      }

      return { url, status: "error", responseTime };
    }
  }

  /**
   * Scan all content and check links.
   */
  async scanAll(options?: { concurrency?: number }): Promise<LinkCheckResult[]> {
    const concurrency = options?.concurrency ?? 5;
    const contents = await this.deps.findContentWithLinks();

    // Map URL → where it was found
    const urlMap = new Map<
      string,
      { entityType: string; entityId: number; entityTitle: string }[]
    >();

    for (const content of contents) {
      const urls = this.extractUrls(content.content);
      for (const url of urls) {
        const existing = urlMap.get(url) ?? [];
        existing.push({
          entityType: content.type,
          entityId: content.id,
          entityTitle: content.title,
        });
        urlMap.set(url, existing);
      }
    }

    const uniqueUrls = [...urlMap.keys()];
    log.info(
      `Found ${uniqueUrls.length} unique URLs to check across ${contents.length} content items`,
    );

    // Check URLs with limited concurrency
    const results: LinkCheckResult[] = [];
    for (let i = 0; i < uniqueUrls.length; i += concurrency) {
      const batch = uniqueUrls.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (url) => {
          const check = await this.checkUrl(url);
          return {
            ...check,
            foundIn: urlMap.get(url) ?? [],
          };
        }),
      );
      results.push(...batchResults);
    }

    const broken = results.filter((r) => r.status !== "ok");
    log.info(`Link check complete: ${results.length} checked, ${broken.length} broken`);

    return results;
  }

  /**
   * Get only broken links from a scan.
   */
  async findBrokenLinks(options?: { concurrency?: number }): Promise<LinkCheckResult[]> {
    const all = await this.scanAll(options);
    return all.filter((r) => r.status !== "ok");
  }
}
