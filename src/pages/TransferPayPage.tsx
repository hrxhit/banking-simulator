/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian Bank Simulator - Transfer & Pay Page
 */

import React, { useState, useId } from 'react';
import { useBank } from '../context/BankContext';
import { toPaise, formatINR, maskAccountNumber } from '../lib/money';
import { CustomHashTable } from '../lib/structures';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Search,
  Sparkles,
} from 'lucide-react';

export const TransferPayPage: React.FC = () => {
  const {
    currentAccount,
    accounts,
    enqueueTransaction,
    processNextQueueItem,
  } = useBank();

  const [activeTab, setActiveTab] = useState<'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER'>('TRANSFER');
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [recipientNumber, setRecipientNumber] = useState<string>('');
  const [verifiedRecipient, setVerifiedRecipient] = useState<{
    holder: string;
    number: string;
    id: string;
  } | null>(null);
  const [verifyError, setVerifyError] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  // Confirmation Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [modalIdempotencyKey, setModalIdempotencyKey] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Amount helper
  const handleQuickAmount = (rupees: number) => {
    setAmountStr(rupees.toString());
    setValidationError('');
  };

  // Recipient Verification via O(1) Hash Table
  const handleVerifyRecipient = () => {
    setVerifyError('');
    setVerifiedRecipient(null);

    const cleanNum = recipientNumber.trim();
    if (!cleanNum || cleanNum.length !== 12 || !cleanNum.startsWith('40')) {
      setVerifyError('Recipient account number must be 12 digits starting with "40".');
      return;
    }

    if (currentAccount && cleanNum === currentAccount.accountNumber) {
      setVerifyError('Cannot transfer funds to yourself (self-transfer is blocked).');
      return;
    }

    // Build hash table for O(1) verification lookup
    const table = new CustomHashTable<string, (typeof accounts)[0]>(
      accounts.map((a) => [a.accountNumber, a])
    );
    const lookup = table.getWithMetrics(cleanNum);

    if (lookup.item) {
      setVerifiedRecipient({
        holder: lookup.item.holder,
        number: lookup.item.accountNumber,
        id: lookup.item.id,
      });
    } else {
      setVerifyError('No account found with this 12-digit number in the bank directory.');
    }
  };

  // Initiate Confirmation Dialog
  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    try {
      const paise = toPaise(amountStr);

      if (activeTab === 'WITHDRAWAL' || activeTab === 'TRANSFER') {
        if (currentAccount && currentAccount.balance < paise) {
          setValidationError(
            `Insufficient funds. Current balance is ${formatINR(currentAccount.balance)}, attempted debit of ${formatINR(paise)}.`
          );
          return;
        }
      }

      if (activeTab === 'TRANSFER' && !verifiedRecipient) {
        setValidationError('Please verify a valid recipient account number before transferring.');
        return;
      }

      // Generate a fresh idempotency key when modal opens (Stripe / RFC pattern)
      const freshKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      setModalIdempotencyKey(freshKey);
      setIsConfirmOpen(true);
    } catch (err: any) {
      setValidationError(err.message || 'Invalid amount entered.');
    }
  };

  // Submit and Enqueue
  const handleConfirmSubmit = async () => {
    if (isSubmitting) return; // double-click protection (reuses modalIdempotencyKey)
    setIsSubmitting(true);

    try {
      const paise = toPaise(amountStr);
      const desc =
        description.trim() ||
        (activeTab === 'DEPOSIT'
          ? 'Counter cash deposit'
          : activeTab === 'WITHDRAWAL'
          ? 'ATM / Cash withdrawal'
          : `Fund transfer to ${verifiedRecipient?.holder}`);

      // Enqueue as PENDING in the FIFO queue (Core DAA requirement!)
      enqueueTransaction(
        activeTab,
        paise,
        desc,
        activeTab === 'TRANSFER' ? verifiedRecipient?.number : undefined,
        modalIdempotencyKey
      );

      setIsConfirmOpen(false);
      setAmountStr('');
      setDescription('');
      setRecipientNumber('');
      setVerifiedRecipient(null);
    } catch (err: any) {
      setValidationError(err.message || 'Transaction submission failed.');
      setIsConfirmOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentAccount) return null;

  // Calculate projected balance
  let parsedPaise = 0;
  try {
    if (amountStr) parsedPaise = toPaise(amountStr);
  } catch {
    parsedPaise = 0;
  }

  const projectedBalance =
    activeTab === 'DEPOSIT'
      ? currentAccount.balance + parsedPaise
      : currentAccount.balance - parsedPaise;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
      {/* Title */}
      <div className="lg:col-span-12 px-1 mb-2">
        <h1 className="text-4xl font-light tracking-[-0.04em] text-ink">
          Transfer & Pay
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Execute deposits, withdrawals, and instant inter-account transfers.
        </p>
      </div>

      {/* Main Tabbed Card */}
      <div className="lg:col-span-7 porcelain-card overflow-hidden rise-in">
        {/* Segmented Tab Headers */}
        <div className="grid grid-cols-3 bg-[#f4efe9] p-1.5 gap-1.5 m-4 sm:m-5 mb-0 rounded-full">
          <button
            type="button"
            onClick={() => {
              setActiveTab('TRANSFER');
              setValidationError('');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-full transition-colors ${
              activeTab === 'TRANSFER'
                ? 'bg-ink text-white'
                : 'text-slate-600 hover:text-ink'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transfer Funds</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('DEPOSIT');
              setValidationError('');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-full transition-colors ${
              activeTab === 'DEPOSIT'
                ? 'bg-ink text-white'
                : 'text-slate-600 hover:text-ink'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span>Deposit</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('WITHDRAWAL');
              setValidationError('');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-full transition-colors ${
              activeTab === 'WITHDRAWAL'
                ? 'bg-ink text-white'
                : 'text-slate-600 hover:text-ink'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
            <span>Withdraw</span>
          </button>
        </div>

        {/* Tab Form Content */}
        <form onSubmit={handleOpenConfirm} className="p-6 sm:p-8 space-y-6">
          {/* Active Balance Banner */}
          <div className="flex items-center justify-between px-4 py-3 rounded-full bg-fog text-sm lg:hidden">
            <span className="text-slate-600">Current Available Balance:</span>
            <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
              {formatINR(currentAccount.balance)}
            </span>
          </div>

          {/* Transfer Specific: Recipient Input & Verify */}
          {activeTab === 'TRANSFER' && (
            <div className="space-y-2">
              <label className="block text-sm text-slate-600 pl-1">
                Recipient Account Number (12 digits)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={12}
                  value={recipientNumber}
                  onChange={(e) => {
                    setRecipientNumber(e.target.value.replace(/\D/g, ''));
                    setVerifiedRecipient(null);
                    setVerifyError('');
                  }}
                  placeholder="e.g. 402987654321"
                  className="flex-1 px-3 py-2 text-sm font-mono rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={handleVerifyRecipient}
                  className="px-3.5 py-2 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors"
                >
                  Verify Recipient
                </button>
              </div>

              {/* Quick Contacts Picker */}
              <div className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500 pt-1">
                <span className="font-medium">Quick Demo Contacts:</span>
                {accounts
                  .filter((a) => a.id !== currentAccount.id)
                  .slice(0, 4)
                  .map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setRecipientNumber(acc.accountNumber);
                        setVerifiedRecipient({
                          holder: acc.holder,
                          number: acc.accountNumber,
                          id: acc.id,
                        });
                        setVerifyError('');
                      }}
                      className="px-1.5 py-0.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 transition-colors border border-slate-200"
                    >
                      {acc.holder.split(' ')[0]}
                    </button>
                  ))}
              </div>

              {/* Verified Result Banner */}
              {verifiedRecipient && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-semibold">{verifiedRecipient.holder}</span> ·{' '}
                    <span className="font-mono">{maskAccountNumber(verifiedRecipient.number)}</span>
                  </div>
                </div>
              )}

              {verifyError && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="block text-sm text-slate-600 pl-1">
              Amount (INR)
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg text-slate-500">
                ₹
              </span>
              <input
                type="text"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  setValidationError('');
                }}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-3.5 text-xl font-light rounded-full border border-slate-300 bg-white text-slate-900 tabular-nums focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[500, 1000, 2500, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAmount(amt)}
                  className="px-2.5 py-1 text-sm rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono tabular-nums transition-colors"
                >
                  +₹{amt.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block text-sm text-slate-600 pl-1">
              Description / Memo (Optional)
            </label>
            <input
              type="text"
              maxLength={80}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Invoice payment, monthly rent, dinner split"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Projected balance */}
          {parsedPaise > 0 && (
            <div className={`px-5 py-3.5 rounded-full flex items-center justify-between text-sm ${projectedBalance < 0 ? 'bg-rose-100' : 'bg-emerald-50 border border-emerald-100'}`}>
              <span className="font-semibold text-neutral-800">Balance after this</span>
              <span className={`text-base font-bold tabular-nums ${projectedBalance < 0 ? 'text-rose-700' : 'text-neutral-900'}`}>
                {formatINR(projectedBalance)}
              </span>
            </div>
          )}

          {validationError && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Enqueue CTA Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-full bg-ink hover:bg-slate-800 text-white font-medium text-base transition-colors"
          >
            Continue to Confirmation
          </button>
        </form>
      </div>


      {/* Live balance preview */}
      <aside className="lg:col-span-5 lg:sticky lg:top-28 self-start space-y-4 rise-in" style={{ animationDelay: '80ms' }}>
        <div className="marigold-card p-6 sm:p-8 text-neutral-950">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-900/70">Available balance</div>
          <div className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-4 break-words">
            {formatINR(currentAccount.balance).split('.')[0]}
            <span className="text-[0.5em] text-neutral-900/60 font-semibold">.{formatINR(currentAccount.balance).split('.')[1]}</span>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>{parsedPaise > 0 ? (activeTab === 'DEPOSIT' ? 'Adding' : 'Leaving') : 'Preview'}</span>
              <span className="tabular-nums">{parsedPaise > 0 ? formatINR(parsedPaise) : 'Enter an amount'}</span>
            </div>
            <div className="h-9 rounded-full hatch-ink overflow-hidden flex">
              <div
                className="h-full rounded-full bg-ink transition-[width] duration-500"
                style={{
                  width: `${
                    parsedPaise > 0
                      ? Math.max(
                          4,
                          Math.min(
                            100,
                            (Math.max(projectedBalance, 0) /
                              Math.max(currentAccount.balance, projectedBalance, 1)) *
                              100
                          )
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="text-sm text-ink/60 mt-3">
              {parsedPaise > 0
                ? `You will have ${formatINR(projectedBalance)} afterwards.`
                : 'The bar shows what stays in your account.'}
            </p>
          </div>
        </div>

        <div className="porcelain-card px-6 py-5 text-xs text-neutral-600 font-medium">
          Everything you send goes through the processing queue first, so you can review it before it settles.
        </div>
      </aside>

      {/* Confirmation Modal (Light Themed) */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] max-w-md w-full shadow-[0_40px_90px_-20px_rgba(23,24,26,.5)] p-7 space-y-4 rise-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Confirm Transaction Details
              </h3>
              <span className="text-sm font-mono px-2 py-0.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 font-medium">
                Idempotency Protected
              </span>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Operation Type:</span>
                <span className="font-semibold text-slate-900">{activeTab}</span>
              </div>

              {activeTab === 'TRANSFER' && verifiedRecipient && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Recipient:</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {verifiedRecipient.holder} ({maskAccountNumber(verifiedRecipient.number)})
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Amount:</span>
                <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                  {formatINR(parsedPaise)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Resulting Balance:</span>
                <span className="font-mono font-bold text-teal-800 tabular-nums">
                  {formatINR(projectedBalance)}
                </span>
              </div>

              <div className="pt-2 text-sm text-slate-500 font-mono">
                Key: <span className="text-slate-700">{modalIdempotencyKey}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
              Transactions are enqueued into the <strong>FIFO Processing Queue</strong>. You can process them sequentially or batch process all items from the Queue page.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="flex-1 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmit}
                className="flex-1 py-2 text-sm font-semibold text-white bg-teal-800 hover:bg-teal-700 rounded-xl transition-colors shadow-xs"
              >
                {isSubmitting ? 'Enqueuing...' : 'Enqueue to FIFO Queue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
