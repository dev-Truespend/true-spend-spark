/**
 * fetch-page-content
 *
 * Fetches an issuer page over HTTPS and reduces it to text content small enough
 * to send to Claude. Strips nav/footer/script/style/ad blocks so the extractor
 * doesn't waste tokens on chrome.
 *
 * Deno runtime: uses npm:cheerio for jQuery-like HTML traversal.
 *
 * @requires npm:cheerio@1.0.0-rc.12
 */

import * as cheerio from "npm:cheerio@1.0.0-rc.12";

export interface FetchPageResult {
  url: string;
  status: number;
  fetched_at: string;
  content_chars: number;
  content: string;
  title: string | null;
  error?: string;
}

const STRIP_SELECTORS = [
  "script", "style", "noscript", "iframe", "svg", "nav", "footer", "header",
  "aside", "form", "[role=navigation]", "[role=banner]", "[role=contentinfo]",
  "[aria-hidden=true]", "[hidden]",
  // common ad / chat widgets
  "[id*=advert i]", "[class*=advert i]", "[id*=banner i]", "[class*=banner i]",
  "[id*=cookie i]", "[class*=cookie i]", "[id*=consent i]", "[class*=consent i]",
  "[class*=chatbot i]", "[id*=chatbot i]", "[class*=intercom i]",
  // newsletter / signup widgets
  "[class*=newsletter i]", "[class*=subscribe i]",
];

const KEEP_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "li", "td", "th", "dt", "dd",
  "caption", "summary", "blockquote", "strong", "em",
]);

const MAX_CHARS = 32_000; // ≈ 8000 tokens at 4 chars/token average

/** Approximate token count to keep us inside the model context budget. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Fetches and cleans a page. Throws on network failure; returns a result
 * object with status + content on every other outcome.
 */
export async function fetchPageContent(
  url: string,
  opts: { timeoutMs?: number; userAgent?: string } = {},
): Promise<FetchPageResult> {
  const fetched_at = new Date().toISOString();
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const userAgent =
    opts.userAgent ??
    "TrueSpend-CardCatalog/1.0 (+https://truespend.app) bot";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : "fetch failed";
    return {
      url,
      status: 0,
      fetched_at,
      content_chars: 0,
      content: "",
      title: null,
      error: message,
    };
  }
  clearTimeout(timer);

  if (!response.ok) {
    return {
      url,
      status: response.status,
      fetched_at,
      content_chars: 0,
      content: "",
      title: null,
      error: `HTTP ${response.status}`,
    };
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  $(STRIP_SELECTORS.join(", ")).remove();

  const title = ($("title").first().text() || $("h1").first().text() || "").trim() || null;

  // Walk the body collecting only content-bearing tags. Tables are inlined as
  // simple pipe-separated rows so cell relationships survive.
  const parts: string[] = [];
  const seen = new Set<string>();

  $("table").each((_, table) => {
    const $table = $(table);
    const caption = $table.find("caption").first().text().trim();
    if (caption) parts.push(`TABLE: ${caption}`);
    $table.find("tr").each((_, row) => {
      const cells = $(row)
        .find("th, td")
        .map((_, cell) => $(cell).text().trim().replace(/\s+/g, " "))
        .get()
        .filter(Boolean);
      if (cells.length) parts.push(cells.join(" | "));
    });
    $table.remove(); // don't re-walk these as plain elements
  });

  $("body *").each((_, el) => {
    const tag = (el as cheerio.Element).tagName?.toLowerCase();
    if (!tag || !KEEP_TAGS.has(tag)) return;
    const text = $(el).text().trim().replace(/\s+/g, " ");
    if (!text || text.length < 2) return;
    if (seen.has(text)) return;
    seen.add(text);
    const prefix =
      tag.startsWith("h") ? `\n## ${text}` :
      tag === "li" ? `- ${text}` :
      text;
    parts.push(prefix);
  });

  let content = parts.join("\n").trim();
  if (content.length > MAX_CHARS) {
    content = content.slice(0, MAX_CHARS) + "\n…[truncated]";
  }

  return {
    url,
    status: response.status,
    fetched_at,
    content_chars: content.length,
    content,
    title,
  };
}
