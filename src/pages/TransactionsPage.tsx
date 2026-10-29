/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bank Simulator - Combined Transactions, LIFO Recent Activity Stack & Ledger Statement
 */

import React, { useState, useMemo } from 'react';
import { useBank } from '../context/BankContext';
import { formatINR, maskAccountNumber } from '../lib/money';
import { StatusBadge, ComplexityBadge } from '../components/common/StatusBadge';
import { exportTransactionsToCsv } from '../lib/csv';
import { Transaction } from '../types';
import {
  Search,
  Download,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Layers,
  Eye,
  Undo2,
  Clock,
  Shield,
  Key,
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';

/**
 * Escapes regular expression special metacharacters safely
 */
function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export const TransactionsPage: React.FC = () => {
  const {
    currentAccount,
    currentAccountTransactions,
    recentStackItems,
    peekRecentTransaction,
    undoLastTransaction,
  } = useBank();

  // Stack state
  const [peekedTx, setPeekedTx] = useState<Transaction | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [showStackDrawer, setShowStackDrawer] = useState(false);

  // Search & Filter State
  const [searchText, setSearchText] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // LIFO Stack Actions
  const handlePeek = () => {
    const top = peekRecentTransaction();
    if (top) {
      setPeekedTx(top);
    }
  };

  const handleUndo = async () => {
    if (
      !window.confirm(
        'Confirm rollback? This will atomically reverse the last completed transaction, restore account balance(s), and mark the original entry as REVERSED.'
      )
    ) {
      return;
    }

    setIsUndoing(true);
    try {
      await undoLastTransaction();
      setPeekedTx(null);
    } finally {
      setIsUndoing(false);
    }
  };

  // Filter evaluation
  const filteredTransactions = useMemo(() => {
    let result = [...currentAccountTransactions];

    // 1. Text Search
    if (searchText.trim()) {
      const cleanPattern = escapeRegex(searchText.trim().toLowerCase());
      const regex = new RegExp(cleanPattern, 'i');
      result = result.filter(
        (tx) => regex.test(tx.description) || regex.test(tx.reference)
      );
    }

    // 2. Type filter
    if (selectedType !== 'ALL') {
      result = result.filter((tx) => tx.type === selectedType);
    }

    // 3. Status filter
    if (selectedStatus !== 'ALL') {
      result = result.filter((tx) => tx.status === selectedStatus);
    }

    // 4. Date range filter
    if (fromDate) {
      const f = new Date(fromDate);
      f.setHours(0, 0, 0, 0);
      result = result.filter((tx) => new Date(tx.createdAt) >= f);
    }
    if (toDate) {
      const t = new Date(toDate);
      t.setHours(23, 59, 59, 999);
      result = result.filter((tx) => new Date(tx.createdAt) <= t);
    }

    // 5. Sort
    result.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [
    currentAccountTransactions,
    searchText,
    selectedType,
    selectedStatus,
    fromDate,
    toDate,
    sortOrder,
  ]);

  // Pagination calculation
  const totalItems = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + pageSize);

  // CSV Export Action
  const handleExportCsv = () => {
    exportTransactionsToCsv(filteredTransactions, currentAccount?.accountNumber);
  };

  const hasActiveFilters =
    searchText.trim() !== '' ||
    selectedType !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    fromDate !== '' ||
    toDate !== '' ||
    sortOrder !== 'NEWEST';

  const resetFilters = () => {
    setSearchText('');
    setSelectedType('ALL');
    setSelectedStatus('ALL');
    setFromDate('');
    setToDate('');
    setSortOrder('NEWEST');
    setPage(1);
  };

  // Top of stack item
  const topStackItem = recentStackItems.length > 0 ? recentStackItems[0] : null;

  if (!currentAccount) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-4xl font-light tracking-[-0.04em] text-ink">
              Transactions & History
            </h1>
            <span className="text-sm px-2 py-0.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 font-mono font-medium">
              {currentAccountTransactions.length} Total Records
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Audited account ledger statement and real-time recent activity stack.
          </p>
        </div>

        {/* Global Page Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePeek}
            disabled={recentStackItems.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full bg-white hover:bg-[#f4efe9] text-neutral-800 border border-neutral-200/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
            title="Inspect latest completed transaction at top of stack"
          >
            <Eye className="w-3.5 h-3.5 text-neutral-900" />
            <span>Inspect Latest</span>
          </button>

          <button
            onClick={handleUndo}
            disabled={isUndoing || recentStackItems.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Undo and reverse the last completed transaction"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>{isUndoing ? 'Reversing...' : 'Undo Last Transaction'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={filteredTransactions.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[#141517] hover:bg-neutral-800 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
            title="Export filtered records as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Recent Activity Stack Card (LIFO Highlight) */}
      <div className="porcelain-card overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-lilac/50 text-ink flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Recent Activity (LIFO Stack)</span>
                <span className="text-sm font-mono px-1.5 py-0.2 rounded-xl bg-lilac/50 text-ink font-bold">
                  Depth: {recentStackItems.length}
                </span>
              </div>
              <p className="text-sm text-slate-500">
                Most recent completed transactions for {currentAccount.holder}. Supports single-step atomic reversal.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowStackDrawer(!showStackDrawer)}
            className="text-sm text-ink hover:text-ink font-medium flex items-center gap-1 self-start sm:self-auto"
          >
            <span>{showStackDrawer ? 'Collapse Stack' : 'View Full Stack Timeline'}</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showStackDrawer ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Top Node Preview */}
        {topStackItem ? (
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
            <div className="flex items-start sm:items-center gap-3">
              <span className="px-2 py-0.5 rounded-xl text-sm font-mono font-bold bg-ink text-white shrink-0">
                TOP OF STACK
              </span>
              <div>
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>{topStackItem.description}</span>
                  <span className="text-sm font-mono text-slate-400">· {topStackItem.reference}</span>
                </div>
                <div className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>{new Date(topStackItem.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  {topStackItem.counterpartyName && (
                    <span>· Counterparty: {topStackItem.counterpartyName}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end sm:self-auto">
              <div className="text-right">
                <div
                  className={`font-mono font-bold tabular-nums text-sm ${
                    topStackItem.type === 'DEPOSIT' || topStackItem.type === 'TRANSFER_RECEIVED'
                      ? 'text-emerald-700'
                      : 'text-slate-900'
                  }`}
                >
                  {topStackItem.type === 'DEPOSIT' || topStackItem.type === 'TRANSFER_RECEIVED' ? '+' : '-'}
                  {formatINR(topStackItem.amount)}
                </div>
                <div className="text-sm font-mono text-slate-500">
                  Post balance: {formatINR(topStackItem.balanceAfter)}
                </div>
              </div>

              <button
                onClick={handleUndo}
                disabled={isUndoing}
                className="px-2.5 py-1.5 text-sm font-medium rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                title="Reverse this specific transaction"
              >
                Rollback
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-slate-500">
            No completed transactions currently in the activity stack.
          </div>
        )}

        {/* Collapsible Stack Items Timeline */}
        {showStackDrawer && recentStackItems.length > 1 && (
          <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/40">
            <div className="text-sm font-semibold text-slate-500 py-2">
              LIFO Order (Top to Bottom):
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {recentStackItems.slice(1, 15).map((item, index) => {
                const isCredit = item.type === 'DEPOSIT' || item.type === 'TRANSFER_RECEIVED';
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-slate-400 w-5">
                        #{index + 2}
                      </span>
                      <div>
                        <div className="font-medium text-slate-800">{item.description}</div>
                        <div className="text-sm text-slate-400 font-mono">
                          {item.reference} · {new Date(item.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`font-mono font-semibold tabular-nums text-sm ${
                          isCredit ? 'text-emerald-700' : 'text-slate-800'
                        }`}
                      >
                        {isCredit ? '+' : '-'}
                        {formatINR(item.amount)}
                      </div>
                      <span className="text-sm text-slate-400 font-mono">
                        {formatINR(item.balanceAfter)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="porcelain-card p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              placeholder="Search reference or description..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Transaction Types</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="WITHDRAWAL">Withdrawals</option>
              <option value="TRANSFER_SENT">Transfers Sent</option>
              <option value="TRANSFER_RECEIVED">Transfers Received</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="REVERSED">Reversed</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
              className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span className="font-medium">
                {sortOrder === 'NEWEST' ? 'Sort: Newest First' : 'Sort: Oldest First'}
              </span>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5" /> Date Range:
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 text-sm rounded-xl border border-slate-300 bg-white text-slate-900"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 text-sm rounded-xl border border-slate-300 bg-white text-slate-900"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-sm text-rose-600 hover:text-rose-800 font-medium"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="porcelain-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-fog font-medium text-slate-600 text-sm">
              <tr>
                <th className="px-4 py-3">Reference / Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description & Counterparty</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
                <th className="px-4 py-3 text-right">Balance After (₹)</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No transactions found matching your active filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  const isCredit = tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_RECEIVED';
                  const dateStr = new Date(tx.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });
                  const timeStr = new Date(tx.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono font-semibold text-slate-900">{tx.reference}</div>
                        <div className="text-sm text-slate-500 mt-0.5">
                          {dateStr} <span className="text-slate-400">· {timeStr}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          {tx.type === 'DEPOSIT' && (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                          {tx.type === 'WITHDRAWAL' && (
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          )}
                          {(tx.type === 'TRANSFER_SENT' || tx.type === 'TRANSFER_RECEIVED') && (
                            <ArrowLeftRight className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          )}
                          <span className="capitalize">{tx.type.toLowerCase().replace('_', ' ')}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{tx.description}</div>
                        {tx.counterpartyName && (
                          <div className="text-sm text-slate-500 mt-0.5">
                            Counterparty:{' '}
                            <span className="font-medium text-slate-700">
                              {tx.counterpartyName}
                            </span>{' '}
                            {tx.relatedAccountNumber && (
                              <span className="font-mono text-slate-400">
                                ({maskAccountNumber(tx.relatedAccountNumber)})
                              </span>
                            )}
                          </div>
                        )}
                        {tx.failureReason && (
                          <div className="text-sm text-rose-600 mt-0.5">
                            Reason: {tx.failureReason}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span
                          className={`font-mono font-semibold tabular-nums ${
                            isCredit ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                          {formatINR(tx.amount)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-slate-700 tabular-nums">
                        {formatINR(tx.balanceAfter)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={tx.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="text-slate-500">
              Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(startIndex + pageSize, totalItems)}
              </span>{' '}
              of <span className="font-semibold text-slate-800">{totalItems}</span> transactions
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="px-2 font-mono text-slate-700 font-medium">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Peek Details Modal */}
      {peekedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-md w-full border border-slate-200 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-ink" />
                <h3 className="text-sm font-bold text-slate-900">
                  Transaction Audit Inspector
                </h3>
              </div>
              <button
                onClick={() => setPeekedTx(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Reference:</span>
                <span className="font-mono font-bold text-slate-900">{peekedTx.reference}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Operation Type:</span>
                <span className="font-semibold text-slate-800">{peekedTx.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Gross Amount:</span>
                <span className="font-mono font-bold text-slate-900">{formatINR(peekedTx.amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Balance Transition:</span>
                <span className="font-mono text-slate-700">
                  {formatINR(peekedTx.balanceBefore)} → {formatINR(peekedTx.balanceAfter)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Timestamp:</span>
                <span className="text-slate-700">{new Date(peekedTx.createdAt).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Idempotency Key:</span>
                <span className="font-mono text-sm text-slate-600">{peekedTx.idempotencyKey || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Execution Status:</span>
                <StatusBadge status={peekedTx.status} />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setPeekedTx(null)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
