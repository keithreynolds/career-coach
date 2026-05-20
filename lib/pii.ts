/**
 * PII Scrubber
 * Removes personally identifiable information from resume text before sending to AI.
 * Replaces emails, phone numbers, addresses, URLs, LinkedIn profiles, and likely names.
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Matches common US phone formats:
//  (123) 456-7890, 123-456-7890, 123.456.7890, 1234567890, +1 123-456-7890
const PHONE_RE =
  /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/g;

// Matches physical street addresses like "123 Main St" or "456 Oak Avenue, Suite 200"
const ADDRESS_RE =
  /\b\d{1,6}\s+(?:[NSEW]\.?\s+)?[A-Za-z0-9'.\-]+(?:\s+[A-Za-z0-9'.\-]+){0,4}\s+(?:Street|St\.?|Avenue|Ave\.?|Boulevard|Blvd\.?|Road|Rd\.?|Drive|Dr\.?|Lane|Ln\.?|Court|Ct\.?|Plaza|Plz\.?|Place|Pl\.?|Square|Sq\.?|Terrace|Ter\.?|Way|Parkway|Pkwy\.?|Circle|Cir\.?|Highway|Hwy\.?)\b(?:[,\s]+(?:Apt|Apartment|Suite|Ste|Unit|#)\.?\s*[A-Za-z0-9\-]+)?/gi;

// Matches URLs (http/https/www) and bare domain LinkedIn profiles
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const LINKEDIN_RE = /\b(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)[A-Za-z0-9\-_/]+/gi;

// Matches "City, ST" or "City, ST 12345"
const CITY_STATE_ZIP_RE =
  /\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*,\s+[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?\b/g;

// Heuristic for likely-name lines: 1-4 capitalized words on a line, no digits, < 60 chars
const NAME_LINE_RE = /^(?:[A-Z][a-zA-Z'.\-]+)(?:\s+[A-Z][a-zA-Z'.\-]+){0,3}$/;

/**
 * Remove PII from resume text.
 */
export function scrubPII(text: string): string {
  if (!text) return "";

  // 1) Redact names on the first 3 non-empty lines
  const lines = text.split(/\r?\n/);
  let nonEmptySeen = 0;
  for (let i = 0; i < lines.length && nonEmptySeen < 3; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    nonEmptySeen++;
    // Replace if it looks like a name (no digits, no @, short, capitalized words)
    if (
      trimmed.length < 60 &&
      !/[@\d]/.test(trimmed) &&
      NAME_LINE_RE.test(trimmed)
    ) {
      lines[i] = lines[i].replace(trimmed, "[NAME REDACTED]");
    }
  }
  let scrubbed = lines.join("\n");

  // 2) Emails
  scrubbed = scrubbed.replace(EMAIL_RE, "[EMAIL REDACTED]");

  // 3) LinkedIn (handle before generic URL pattern)
  scrubbed = scrubbed.replace(LINKEDIN_RE, "[LINKEDIN REDACTED]");

  // 4) URLs
  scrubbed = scrubbed.replace(URL_RE, "[URL REDACTED]");

  // 5) Phone numbers
  scrubbed = scrubbed.replace(PHONE_RE, "[PHONE REDACTED]");

  // 6) Street addresses
  scrubbed = scrubbed.replace(ADDRESS_RE, "[ADDRESS REDACTED]");

  // 7) City, State [Zip]
  scrubbed = scrubbed.replace(CITY_STATE_ZIP_RE, "[LOCATION REDACTED]");

  return scrubbed;
}
