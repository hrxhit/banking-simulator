/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian Bank Simulator - CSV Export with OWASP Formula Injection Protection
 */

import { Transaction } from '../types';
import { formatINR } from './money';

/**
 * Sanitizes spreadsheet cell strings against formula injection (OWASP guideline).
 * If a cell begins with '=', '+', '-', '@', '\t', or '\r', prefixes with an apostrophe.
 */
export function sanitizeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  let str = String(value);

  // OWASP CSV Injection sanitization
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousPrefixes.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`;
  }

  // Escape double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Converts transaction records to CSV string and triggers browser download.
 * Columns: reference, date, type, amount (INR), balance after, counterparty, description, status.
 */
export function exportTransactionsToCsv(
  transactions: Transaction[],
  accountNumber?: string
): { success: boolean; filename: string; rowCount: number } {
  const headers = [
    'Reference',
    'Date (ISO)',
    'Type',
    'Amount (INR)',
    'Balance After (INR)',
    'Counterparty',
    'Description',
    'Status',
  ];

  const rows = transactions.map((tx) => [
    sanitizeCsvCell(tx.reference),
    sanitizeCsvCell(tx.createdAt),
    sanitizeCsvCell(tx.type),
    sanitizeCsvCell(formatINR(tx.amount, { showSymbol: false })),
    sanitizeCsvCell(formatINR(tx.balanceAfter, { showSymbol: false })),
    sanitizeCsvCell(tx.counterpartyName ? `${tx.counterpartyName} (${tx.relatedAccountNumber || ''})` : 'N/A'),
    sanitizeCsvCell(tx.description),
    sanitizeCsvCell(tx.status),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `bank-simulator-statement-${accountNumber || 'account'}-${dateStr}.csv`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, filename, rowCount: transactions.length };
}
