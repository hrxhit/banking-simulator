/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian Bank Simulator - Exact Monetary Arithmetic & Formatting (Algorithm 4.1)
 *
 * All currency values are strictly stored as integer paise (1 Rupee = 100 paise).
 * Avoids IEEE-754 floating point inaccuracies (e.g., 0.1 + 0.2 !== 0.3).
 */

const AMOUNT_REGEX = /^[0-9]{1,9}(\.[0-9]{1,2})?$/;
export const MAX_PAISE = 100_000_000; // Rs. 10,00,000 (Ten Lakh Rupees)

/**
 * Parses user string input into exact integer paise using Algorithm 4.1 from the DAA report.
 * Time Complexity: O(L) where L <= 12, effectively O(1)
 * Space Complexity: O(1)
 *
 * @param value User-entered numeric string (e.g., "1500", "250.75")
 * @returns Positive integer representing amount in paise
 * @throws Error if malformed, negative, zero, or exceeds maximum limit
 */
export function toPaise(value: string | number): number {
  const s = String(value).trim();

  if (!AMOUNT_REGEX.test(s)) {
    throw new Error('Enter a valid amount (at most 9 whole digits and 2 decimal places).');
  }

  const parts = s.split('.');
  const rupeesStr = parts[0];
  let fractionStr = parts[1] || '';

  // Right-pad fraction to exactly two digits (e.g., "5" -> "50")
  fractionStr = fractionStr.padEnd(2, '0');

  const rupees = parseInt(rupeesStr, 10);
  const paiseFraction = parseInt(fractionStr, 10);
  const paise = rupees * 100 + paiseFraction;

  if (paise <= 0) {
    throw new Error('Amount must be strictly greater than zero.');
  }

  if (paise > MAX_PAISE) {
    throw new Error('Maximum transaction limit is Rs. 10,00,000 (10 Lakhs).');
  }

  return paise;
}

/**
 * Converts integer paise to decimal string in rupees.
 * @param paise Integer paise
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Formats integer paise into standard Indian Rupee notation with Indian digit grouping (en-IN).
 * Examples:
 *   10000000 paise -> ₹1,00,000.00
 *   540 paise -> ₹5.40
 *
 * @param paise Amount in integer paise
 * @param showSign If true, includes explicit + for positive values
 * @param showSymbol If true, prefixes '₹' symbol
 */
export function formatINR(
  paise: number,
  options?: { showSign?: boolean; showSymbol?: boolean }
): string {
  const { showSign = false, showSymbol = true } = options || {};
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);

  const rupees = Math.floor(absPaise / 100);
  const fraction = absPaise % 100;

  // Format rupees part using Indian numbering system
  const formattedRupees = new Intl.NumberFormat('en-IN').format(rupees);
  const formattedFraction = fraction.toString().padStart(2, '0');

  const symbol = showSymbol ? '₹' : '';
  const sign = isNegative ? '-' : showSign && paise > 0 ? '+' : '';

  return `${sign}${symbol}${formattedRupees}.${formattedFraction}`;
}

/**
 * Masks a 12-digit account number for privacy.
 * Example: "408291048291" -> "•••• •••• 8291"
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return accountNumber;
  const last4 = accountNumber.slice(-4);
  return `•••• •••• ${last4}`;
}
