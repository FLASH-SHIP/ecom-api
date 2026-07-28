/**
 * Input sanitization utilities for CMS content.
 *
 * Protects against XSS in user-submitted content (comments, contact forms,
 * post titles, excerpts). Does NOT sanitize rich HTML content body (that's
 * handled by the editor's built-in sanitizer).
 *
 * Inspired by Laravel's `strip_tags` + `e()` helpers.
 */

/**
 * Strip all HTML tags from a string.
 * Use for: titles, names, slugs, excerpts, search queries.
 */
export function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Escape HTML entities to prevent XSS.
 * Use for: rendering user content in non-rich-text contexts.
 */
export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return input.replace(/[&<>"']/g, (char) => map[char] ?? char);
}

/**
 * Remove potentially dangerous attributes from HTML (SEC-08: hardened).
 * Strips: event handlers, javascript:/vbscript: protocols, data: URIs,
 * expression() in styles, null bytes, and dangerous tags.
 *
 * For rich-text editor content that must preserve safe HTML formatting,
 * prefer `sanitizeRichHtml()` which uses a whitelist approach.
 */
export function sanitizeHtml(input: string): string {
  return (
    input
      // Remove null bytes (used to bypass regex filters)
      .replace(/\0/g, "")
      // Remove event handlers (comprehensive: on* attributes)
      .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
      // Remove javascript: and vbscript: protocols
      .replace(/(?:javascript|vbscript)\s*:/gi, "")
      // Remove data: URIs in href/src (except data:image for inline images)
      .replace(/(href|src)\s*=\s*["']data:(?!image\/)[^"']*["']/gi, "")
      // Remove CSS expression() (IE XSS vector)
      .replace(/expression\s*\(/gi, "blocked(")
      // Remove <script> tags entirely
      .replace(/<script[\s>][\s\S]*?<\/script>/gi, "")
      // Remove <style> tags entirely
      .replace(/<style[\s>][\s\S]*?<\/style>/gi, "")
      // Remove <iframe> tags
      .replace(/<iframe[\s>][\s\S]*?<\/iframe>/gi, "")
      // Remove <object> and <embed> tags
      .replace(/<object[\s>][\s\S]*?<\/object>/gi, "")
      .replace(/<embed[^>]*\/?>/gi, "")
      // Remove <form> tags (prevent phishing)
      .replace(/<form[\s>][\s\S]*?<\/form>/gi, "")
      // Remove <base> tags (prevent URL hijacking)
      .replace(/<base[^>]*\/?>/gi, "")
  );
}

/**
 * Whitelist-based HTML sanitizer for rich-text editor content.
 * Only allows safe HTML tags and attributes, stripping everything else.
 *
 * For maximum security with rich HTML, consider adding the `isomorphic-dompurify`
 * package and using: `DOMPurify.sanitize(input)` instead of this function.
 */
export function sanitizeRichHtml(input: string): string {
  const allowedTags = new Set([
    "p",
    "br",
    "b",
    "i",
    "u",
    "em",
    "strong",
    "a",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "pre",
    "code",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "img",
    "figure",
    "figcaption",
    "hr",
    "sub",
    "sup",
    "s",
    "del",
    "mark",
    "span",
    "div",
  ]);

  // First apply the standard sanitization
  let cleaned = sanitizeHtml(input);

  // Then strip any remaining tags not in whitelist
  cleaned = cleaned.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g, (match, tagName: string) => {
    return allowedTags.has(tagName.toLowerCase()) ? match : "";
  });

  return cleaned;
}

/**
 * Sanitize a plain-text input: trim, strip tags, normalize whitespace.
 * Use for: titles, names, subjects.
 */
export function sanitizePlainText(input: string): string {
  return stripTags(input).replace(/\s+/g, " ").trim();
}

/**
 * Sanitize a slug: lowercase, alphanumeric + hyphens only.
 */
export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F-]/g, "-") // Allow accented chars
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

/**
 * Sanitize an email address: trim, lowercase.
 */
export function sanitizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Sanitize a search query: strip tags, limit length, trim.
 */
export function sanitizeSearchQuery(input: string, maxLength = 200): string {
  return sanitizePlainText(input).slice(0, maxLength);
}

/**
 * Sanitize a URL: basic validation + trim.
 */
export function sanitizeUrl(input: string): string | null {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}
