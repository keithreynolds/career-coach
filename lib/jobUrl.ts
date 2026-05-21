/**
 * Job-posting URL fetch + extraction.
 *
 * Given a single job-posting URL, this module fetches the page server-side and
 * pulls out the job description text. It is intentionally **best-effort**:
 * company career pages (Greenhouse, Lever, Ashby, Workday) usually expose a
 * schema.org `JobPosting` JSON-LD block that extracts cleanly; sites like
 * LinkedIn and Indeed often return a login wall or a JS-rendered shell. When
 * extraction fails, callers get a clear `ok: false` message rather than a
 * silent failure.
 *
 * Security: all outbound fetching is guarded against SSRF. URLs are restricted
 * to http/https on standard ports, the hostname is resolved and checked against
 * private/reserved IP ranges, and every redirect hop is re-validated.
 *
 * Zero external dependencies — only Node built-ins (`fetch`, `dns`, `URL`,
 * `JSON`, `TextDecoder`) plus regex.
 */

import { resolve4 } from "dns/promises";

// --- Public result type -----------------------------------------------------

/**
 * Discriminated union returned by {@link fetchAndExtractJD}.
 * `message` on the failure branch is safe to show directly to the user.
 */
export type FetchJDResult =
  | { ok: true; text: string; source: "json-ld" | "html" }
  | { ok: false; message: string };

// --- Tunables ---------------------------------------------------------------

const FETCH_TIMEOUT_MS = 10_000; // per-hop request timeout
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB cap on the downloaded page
const MAX_REDIRECTS = 3; // redirect hops to follow (each re-validated)
const MIN_USABLE_TEXT = 300; // below this, treat extraction as failed
const MAX_EXTRACTED_CHARS = 18_000; // trim very long pages; the user can edit

// A realistic browser User-Agent. Many career pages serve a minimal shell or
// block obviously-automated clients; this is a best-effort fetch of a public
// posting the user explicitly asked us to load.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FALLBACK_MESSAGE =
  "We couldn't read a job description from that link. Open the posting, " +
  "copy the description text, and paste it here instead.";

// --- SSRF guard: IPv4 range checks ------------------------------------------

/** Parse a dotted-quad IPv4 string into a uint32, or null if malformed. */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    result = result * 256 + n;
  }
  return result >>> 0;
}

/** True if `ipInt` falls inside the CIDR block `base/prefix`. */
function inCidr(ipInt: number, base: string, prefix: number): boolean {
  const baseInt = ipv4ToInt(base);
  if (baseInt === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

// Reserved / private / non-routable IPv4 ranges. Any hit is rejected.
const RESERVED_RANGES: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local (incl. cloud metadata 169.254.169.254)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved (covers 255.255.255.255)
];

/**
 * True if `ip` is a private, loopback, link-local, or otherwise non-public
 * IPv4 address. Unparseable input fails closed (treated as reserved).
 */
export function isReservedIpv4(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  if (ipInt === null) return true; // fail closed
  return RESERVED_RANGES.some(([base, prefix]) => inCidr(ipInt, base, prefix));
}

// --- URL validation ---------------------------------------------------------

export type UrlValidation =
  | { ok: true; url: URL }
  | { ok: false; reason: string };

/**
 * Validate URL *syntax* only (no DNS). Allows http/https on standard ports,
 * rejects embedded credentials and non-web schemes.
 */
export function validateUrlSyntax(input: string): UrlValidation {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, reason: "That doesn't look like a valid web address." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http and https links are supported." };
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    return {
      ok: false,
      reason: "Only standard web ports (80 and 443) are supported.",
    };
  }
  // user:pass@host can be used to disguise the real hostname — reject it.
  if (url.username || url.password) {
    return {
      ok: false,
      reason: "Links with embedded credentials are not supported.",
    };
  }
  return { ok: true, url };
}

/**
 * Resolve a hostname and confirm it points only at public IPv4 addresses.
 * Literal IPv4 hosts are checked directly; `localhost` and IPv6 literals fail
 * closed. This is the network-level half of the SSRF guard.
 */
export async function assertHostIsPublic(
  hostname: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const host = hostname.toLowerCase().trim();

  if (!host) {
    return { ok: false, reason: "The link is missing a hostname." };
  }
  // IPv6 literals contain colons — fail closed (no IPv6 range checking here).
  if (host.includes(":")) {
    return { ok: false, reason: "IPv6 addresses are not supported." };
  }
  if (host === "localhost" || host.endsWith(".localhost")) {
    return { ok: false, reason: "Local addresses are not allowed." };
  }

  // Literal IPv4 host — check without a DNS lookup.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    if (isReservedIpv4(host)) {
      return {
        ok: false,
        reason: "That address points to a private or reserved network.",
      };
    }
    return { ok: true };
  }

  // Hostname — resolve to IPv4 and screen every answer.
  let addresses: string[];
  try {
    addresses = await resolve4(host);
  } catch {
    return { ok: false, reason: "We couldn't resolve that web address." };
  }
  if (addresses.length === 0) {
    return { ok: false, reason: "We couldn't resolve that web address." };
  }
  for (const addr of addresses) {
    if (isReservedIpv4(addr)) {
      return {
        ok: false,
        reason: "That address points to a private or reserved network.",
      };
    }
  }
  return { ok: true };
}

// --- Safe fetch -------------------------------------------------------------

/** Read a response body into a string, aborting if it exceeds `maxBytes`. */
async function readBodyCapped(
  response: Response,
  maxBytes: number
): Promise<string | null> {
  const reader = response.body?.getReader();
  if (!reader) {
    // No stream available — read fully, then enforce the cap.
    const text = await response.text();
    return Buffer.byteLength(text, "utf8") > maxBytes ? null : text;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  }
  const buf = Buffer.concat(chunks);
  return new TextDecoder("utf-8").decode(buf);
}

/**
 * Fetch `startUrl`, following up to {@link MAX_REDIRECTS} redirects manually so
 * each hop can be re-screened against the SSRF rules. Returns the page HTML on
 * success, or a user-facing reason on failure.
 */
async function safeFetch(
  startUrl: URL
): Promise<{ ok: true; html: string } | { ok: false; reason: string }> {
  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    // Re-screen the host on every hop (defends redirect-to-internal).
    const hostCheck = await assertHostIsPublic(currentUrl.hostname);
    if (!hostCheck.ok) {
      return { ok: false, reason: hostCheck.reason };
    }

    let response: Response;
    try {
      response = await fetch(currentUrl.toString(), {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      // AbortSignal timeout or a network-level error.
      return {
        ok: false,
        reason: "The link took too long to load or could not be reached.",
      };
    }

    // Manual redirect handling.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        return {
          ok: false,
          reason: "The link returned an incomplete redirect.",
        };
      }
      let nextUrl: URL;
      try {
        nextUrl = new URL(location, currentUrl);
      } catch {
        return {
          ok: false,
          reason: "The link redirected to an invalid address.",
        };
      }
      const syntax = validateUrlSyntax(nextUrl.toString());
      if (!syntax.ok) {
        return { ok: false, reason: syntax.reason };
      }
      currentUrl = syntax.url;
      continue;
    }

    if (response.status !== 200) {
      return {
        ok: false,
        reason: `The link returned an error (HTTP ${response.status}).`,
      };
    }

    const contentType = (
      response.headers.get("content-type") ?? ""
    ).toLowerCase();
    if (!contentType.includes("text/html")) {
      return { ok: false, reason: "That link isn't a readable web page." };
    }

    const html = await readBodyCapped(response, MAX_BODY_BYTES);
    if (html === null) {
      return { ok: false, reason: "That page is too large to read." };
    }
    return { ok: true, html };
  }

  return { ok: false, reason: "The link redirected too many times." };
}

// --- HTML → text ------------------------------------------------------------

// A small set of common named entities. Numeric entities are handled
// separately in decodeEntities().
const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
  "&mdash;": "\u2014",
  "&ndash;": "\u2013",
  "&hellip;": "\u2026",
  "&rsquo;": "\u2019",
  "&lsquo;": "\u2018",
  "&rdquo;": "\u201d",
  "&ldquo;": "\u201c",
  "&bull;": "\u2022",
  "&middot;": "\u00b7",
  "&copy;": "\u00a9",
  "&reg;": "\u00ae",
  "&trade;": "\u2122",
};

/** Decode numeric and common named HTML entities. */
export function decodeEntities(text: string): string {
  let out = text.replace(/&#(\d+);/g, (whole, dec: string) => {
    const code = Number(dec);
    return Number.isFinite(code) && code > 0
      ? safeFromCodePoint(code, whole)
      : whole;
  });
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (whole, hex: string) => {
    const code = parseInt(hex, 16);
    return Number.isFinite(code) && code > 0
      ? safeFromCodePoint(code, whole)
      : whole;
  });
  for (const [entity, char] of Object.entries(NAMED_ENTITIES)) {
    if (out.includes(entity)) out = out.split(entity).join(char);
  }
  return out;
}

function safeFromCodePoint(code: number, fallback: string): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return fallback;
  }
}

/**
 * Convert an HTML fragment to readable plain text: drop script/style, turn
 * block-level tags into line breaks, strip remaining tags, decode entities,
 * and collapse whitespace.
 */
export function htmlToText(html: string): string {
  let text = html;
  // Remove script/style/noscript content entirely.
  text = text.replace(
    /<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi,
    " "
  );
  // List items become bulleted lines.
  text = text.replace(/<li[^>]*>/gi, "\n\u2022 ");
  // Line breaks.
  text = text.replace(/<br\s*\/?>/gi, "\n");
  // Closing block tags become line breaks so content doesn't run together.
  text = text.replace(
    /<\/(p|div|li|ul|ol|h[1-6]|tr|section|article|table|blockquote)>/gi,
    "\n"
  );
  // Strip every remaining tag.
  text = text.replace(/<[^>]+>/g, " ");
  // Decode entities after tag removal.
  text = decodeEntities(text);
  // Normalize whitespace.
  text = text.replace(/\r/g, "");
  text = text.replace(/[ \t\f\v]+/g, " ");
  text = text.replace(/ *\n */g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

// --- JSON-LD JobPosting extraction ------------------------------------------

const LD_JSON_RE =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * Walk a parsed JSON-LD value looking for a schema.org `JobPosting` and return
 * its `description`. Handles single objects, arrays, and `@graph` wrappers, and
 * a `description` that is either a string or a `{ value }` object.
 */
function findJobPostingDescription(node: unknown): string | null {
  if (node === null || node === undefined) return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPostingDescription(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object") return null;

  const obj = node as Record<string, unknown>;

  // Recurse into an @graph wrapper first.
  if (Array.isArray(obj["@graph"])) {
    const found = findJobPostingDescription(obj["@graph"]);
    if (found) return found;
  }

  const type = obj["@type"];
  const isJobPosting =
    type === "JobPosting" ||
    (Array.isArray(type) && type.includes("JobPosting"));

  if (isJobPosting) {
    const desc = obj["description"];
    if (typeof desc === "string" && desc.trim()) return desc;
    if (desc && typeof desc === "object") {
      const value = (desc as Record<string, unknown>)["value"];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return null;
}

/**
 * Scan an HTML document for `<script type="application/ld+json">` blocks and
 * return the first JobPosting description found, or null.
 */
export function extractJsonLdJobDescription(html: string): string | null {
  const matches = html.matchAll(LD_JSON_RE);
  for (const match of matches) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue; // skip malformed blocks
    }
    const description = findJobPostingDescription(parsed);
    if (description) return description;
  }
  return null;
}

/** Strip an entire page down to readable text (the no-JSON-LD fallback). */
export function extractFullPageText(html: string): string {
  const stripped = html.replace(
    /<(script|style|noscript|nav|header|footer|svg|form)[^>]*>[\s\S]*?<\/\1>/gi,
    " "
  );
  return htmlToText(stripped);
}

/**
 * Pure extraction: given page HTML, return the job description text.
 * Tries JSON-LD first, then the full-page strip. Applies the usable-length
 * threshold and trims very long results.
 */
export function extractJobDescription(
  html: string
): { ok: true; text: string; source: "json-ld" | "html" } | { ok: false } {
  const jsonLd = extractJsonLdJobDescription(html);
  if (jsonLd) {
    const text = clamp(htmlToText(jsonLd));
    if (text.length >= MIN_USABLE_TEXT) {
      return { ok: true, text, source: "json-ld" };
    }
  }
  const pageText = clamp(extractFullPageText(html));
  if (pageText.length >= MIN_USABLE_TEXT) {
    return { ok: true, text: pageText, source: "html" };
  }
  return { ok: false };
}

/** Trim extracted text to a sane maximum so the prompt doesn't balloon. */
function clamp(text: string): string {
  return text.length > MAX_EXTRACTED_CHARS
    ? text.slice(0, MAX_EXTRACTED_CHARS).trimEnd()
    : text;
}

// --- Orchestrator -----------------------------------------------------------

/**
 * Fetch a job-posting URL and extract its description.
 *
 * Best-effort: returns `{ ok: false, message }` with a user-facing message for
 * any failure (bad URL, blocked address, network error, unreadable page).
 */
export async function fetchAndExtractJD(url: string): Promise<FetchJDResult> {
  const syntax = validateUrlSyntax(url);
  if (!syntax.ok) {
    return { ok: false, message: syntax.reason };
  }

  const fetched = await safeFetch(syntax.url);
  if (!fetched.ok) {
    return {
      ok: false,
      message: `${fetched.reason} You can paste the job description text instead.`,
    };
  }

  const extracted = extractJobDescription(fetched.html);
  if (!extracted.ok) {
    return { ok: false, message: FALLBACK_MESSAGE };
  }
  return { ok: true, text: extracted.text, source: extracted.source };
}
