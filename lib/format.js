// Pure formatting helpers shared across the storefront.
// No imports, no side effects — safe for both server and client components.

const ZERO_DECIMAL_CURRENCIES = new Set([
  'JPY',
  'XOF',
  'XAF',
  'UGX',
  'RWF',
  'KRW',
  'VND',
  'CLP',
  'BIF',
  'DJF',
  'GNF',
  'KMF',
  'MGA',
  'PYG',
  'VUV',
  'XPF',
]);

/**
 * Returns true when the currency has no minor units (amounts are not divided by 100).
 * @param {string} currency
 */
export function isZeroDecimalCurrency(currency = 'USD') {
  return ZERO_DECIMAL_CURRENCIES.has(String(currency || 'USD').toUpperCase());
}

/**
 * Convert a minor-unit integer amount into its major-unit numeric value.
 * @param {number} amountInMinorUnits
 * @param {string} currency
 * @returns {number}
 */
export function toMajorUnits(amountInMinorUnits, currency = 'USD') {
  const amount = Number(amountInMinorUnits);
  if (!Number.isFinite(amount)) return 0;
  return isZeroDecimalCurrency(currency) ? amount : amount / 100;
}

/**
 * Format a price given in the smallest unit of the currency (e.g. 1500 -> $15.00).
 * @param {number} amountInMinorUnits
 * @param {string} currency
 * @returns {string}
 */
export function formatPrice(amountInMinorUnits, currency = 'USD') {
  const code = String(currency || 'USD').toUpperCase();
  const value = toMajorUnits(amountInMinorUnits, code);

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
    }).format(value);
  } catch (err) {
    // Unknown currency code or an environment without full ICU data.
    const fixed = isZeroDecimalCurrency(code)
      ? String(Math.round(value))
      : value.toFixed(2);
    return `${code} ${fixed}`;
  }
}

/**
 * Format an ISO date/timestamp into a readable medium date.
 * Returns an empty string for missing/invalid input.
 * @param {string|number|Date} iso
 * @param {object} [options]
 * @returns {string}
 */
export function formatDate(iso, options) {
  if (iso === null || iso === undefined || iso === '') return '';

  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const opts = options || { year: 'numeric', month: 'short', day: 'numeric' };

  try {
    return new Intl.DateTimeFormat(undefined, opts).format(date);
  } catch (err) {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Format an ISO date/timestamp including the time of day.
 * @param {string|number|Date} iso
 * @returns {string}
 */
export function formatDateTime(iso) {
  return formatDate(iso, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Turn a billing interval into readable copy: ('month', 1) -> 'per month'.
 * @param {string} interval
 * @param {number} intervalCount
 * @returns {string}
 */
export function formatInterval(interval, intervalCount = 1) {
  const unit = String(interval || '').toLowerCase();
  if (!unit) return '';

  const count = Number.isFinite(Number(intervalCount)) ? Number(intervalCount) : 1;
  const safeCount = count > 0 ? Math.round(count) : 1;

  if (safeCount === 1) return `per ${unit}`;
  return `every ${safeCount} ${pluralize(safeCount, unit)}`;
}

/**
 * Naive English pluralisation used for short UI strings.
 * @param {number} n
 * @param {string} word
 * @param {string} [plural]
 * @returns {string}
 */
export function pluralize(n, word, plural) {
  const count = Number(n);
  if (count === 1 || count === -1) return word;
  if (plural) return plural;
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

/**
 * Convenience: "3 items" / "1 item".
 * @param {number} n
 * @param {string} word
 * @returns {string}
 */
export function countLabel(n, word) {
  const count = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `${count} ${pluralize(count, word)}`;
}

/**
 * Title-case a slug-ish token, e.g. 'outerwear' -> 'Outerwear'.
 * @param {string} value
 * @returns {string}
 */
export function titleCase(value) {
  if (!value) return '';
  return String(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export default {
  formatPrice,
  formatDate,
  formatDateTime,
  formatInterval,
  pluralize,
  countLabel,
  titleCase,
  toMajorUnits,
  isZeroDecimalCurrency,
};