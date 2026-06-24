import { overlayPostTranslations } from "@ecom/features/translation/services/TranslationOverlay";
import { env } from "@web/env";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../../lib/i18n";

const BASE_URL = env.NEXT_PUBLIC_APP_URL;
const API_URL = env.NEXT_PUBLIC_API_URL;
const SITE_NAME = "Ecom";

/**
 * Locale-aware RSS 2.0 feed for blog posts.
 *
 * Routes:
 *   /feed.xml          → default locale feed (vi)
 *   /feed.xml?lang=en  → English translated feed
 *   /feed.xml?lang=vi  → Vietnamese feed
 *
 * Adds <atom:link> alternates pointing to feeds in other languages.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const langParam = url.searchParams.get("lang");
  const locale =
    langParam && SUPPORTED_LOCALES.includes(langParam as (typeof SUPPORTED_LOCALES)[number])
      ? langParam
      : DEFAULT_LOCALE;

  let items = "";

  try {
    const res = await fetch(
      `${API_URL}/api/trpc/public.blog.list?input=${encodeURIComponent(JSON.stringify({ json: { perPage: 50 } }))}`,
      { next: { revalidate: 1800 } },
    );

    if (res.ok) {
      const data = await res.json();
      const posts: {
        id: number;
        title: string;
        slug: string;
        excerpt?: string;
        createdAt: string;
      }[] = data?.result?.data?.json?.items ?? [];

      // Overlay translations when requesting non-default locale
      const overlaid =
        locale !== DEFAULT_LOCALE ? await overlayPostTranslations(posts, locale) : posts;

      items = overlaid
        .map(
          (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${BASE_URL}/${locale}/blog/${post.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/${locale}/blog/${post.slug}</guid>
      <description><![CDATA[${post.excerpt ?? ""}]]></description>
      <pubDate>${new Date(post.createdAt).toUTCString()}</pubDate>
    </item>`,
        )
        .join("\n");
    }
  } catch {
    // RSS feed should not fail the request
  }

  // Build <atom:link> alternates for other languages
  const selfLink = `${BASE_URL}/feed.xml${locale !== DEFAULT_LOCALE ? `?lang=${locale}` : ""}`;
  const alternateLinks = SUPPORTED_LOCALES.filter((l) => l !== locale)
    .map(
      (l) =>
        `    <atom:link href="${BASE_URL}/feed.xml?lang=${l}" rel="alternate" type="application/rss+xml" hreflang="${l}"/>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${BASE_URL}/${locale}</link>
    <description>Latest articles from ${SITE_NAME}</description>
    <language>${locale}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${selfLink}" rel="self" type="application/rss+xml"/>
${alternateLinks}
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=3600",
    },
  });
}
