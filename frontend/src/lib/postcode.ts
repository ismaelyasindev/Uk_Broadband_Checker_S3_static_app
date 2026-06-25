/**
 * UK postcode helpers: normalisation and structural validation.
 *
 * The normalisation rule is shared by both the postcodes.io lookup and the
 * demo-mode JSON key match: strip ALL whitespace and convert to UPPERCASE.
 */

/** Strip all whitespace and upper-case. e.g. "sw1a 1aa" -> "SW1A1AA". */
export function normalizePostcode(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

/**
 * Format a normalised postcode into the conventional "outward inward" form by
 * inserting a single space before the final three characters.
 * e.g. "SW1A1AA" -> "SW1A 1AA".
 */
export function formatPostcode(input: string): string {
  const n = normalizePostcode(input);
  if (n.length < 5) return n;
  return `${n.slice(0, n.length - 3)} ${n.slice(n.length - 3)}`;
}

/**
 * Structural (offline) validation of a UK postcode. This is a fast pre-check;
 * authoritative validation is delegated to postcodes.io before any backend call.
 */
const UK_POSTCODE_RE =
  /^(GIR ?0AA|[A-Z]{1,2}[0-9][0-9A-Z]? ?[0-9][A-Z]{2})$/i;

export function isStructurallyValidPostcode(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  return UK_POSTCODE_RE.test(trimmed);
}
