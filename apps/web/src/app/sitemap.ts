import { env } from "@web/env";
import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../lib/i18n";

const BASE_URL = env.NEXT_PUBLIC_APP_URL;
const API_URL = env.NEXT_PUBLIC_API_URL;

/**
 * Builds hreflang alternates for a given pathname.
 * Generates entries for each supported locale + x-default.
 */
function buildAlternates(pathname: string): Record<string, string> {
  const alternates: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    alternates[locale] = `${BASE_URL}/${locale}${pathname}`;
  }
  alternates["x-default"] = `${BASE_URL}/${DEFAULT_LOCALE}${pathname}`;
  return alternates;
}

/**
 * Generates locale-prefixed sitemap entries for a list of paths.
 */
function buildLocaleEntries(
  items: {
    path: string;
    lastModified: Date;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }[],
): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const item of items) {
    for (const locale of SUPPORTED_LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}${item.path}`,
        lastModified: item.lastModified,
        changeFrequency: item.changeFrequency,
        priority: item.priority,
        alternates: { languages: buildAlternates(item.path) },
      });
    }
  }
  return entries;
}

/**
 * Fetches a tRPC endpoint and extracts the data array.
 */
async function fetchTrpcList(
  procedure: string,
  input: unknown,
): Promise<{ slug: string; updatedAt?: string; createdAt: string }[]> {
  const res = await fetch(
    `${API_URL}/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json?.result?.data?.json?.items ?? json?.result?.data?.json?.data ?? [];
}

/**
 * Dynamic sitemap generation with multi-language support.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticEntries = buildLocaleEntries([
    { path: "", lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { path: "/blog", lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { path: "/pages", lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { path: "/contact", lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ]);

  // Dynamic content
  let postEntries: MetadataRoute.Sitemap = [];
  let pageEntries: MetadataRoute.Sitemap = [];

  try {
    const posts = await fetchTrpcList("public.blog.list", { perPage: 1000 });
    postEntries = buildLocaleEntries(
      posts.map((p) => ({
        path: `/blog/${p.slug}`,
        lastModified: new Date(p.updatedAt ?? p.createdAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    );
  } catch {
    // Sitemap generation should not fail the build
  }

  try {
    const pages = await fetchTrpcList("public.pages.list", {});
    pageEntries = buildLocaleEntries(
      pages.map((p) => ({
        path: `/pages/${p.slug}`,
        lastModified: new Date(p.updatedAt ?? p.createdAt),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    );
  } catch {
    // Sitemap generation should not fail the build
  }

  return [...staticEntries, ...postEntries, ...pageEntries];
}
