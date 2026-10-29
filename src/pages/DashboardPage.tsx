/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian - Luxury Neo-Fintech Dashboard
 * Inspired by Lisso with high-density professional banking typography
 */

import React, { useMemo, useState } from 'react';
import { useBank } from '../context/BankContext';
import { formatINR, maskAccountNumber } from '../lib/money';
import { StatusBadge } from '../components/common/StatusBadge';
import { computeAnalytics } from '../lib/analytics';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Copy,
  Check,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Play,
  Mic,
  Send,
  Building2,
  FileText,
  CreditCard,
  Plus,
  Flame,
  CheckCircle2,
  Bot,
  X,
  RefreshCw,
  Wallet,
  Clock,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    currentAccount,
    accounts,
    switchAccount,
    transactions,
    currentAccountTransactions,
    queueItems,
    processNextQueueItem,
    add10RandomQueueTransactions,
    enqueueTransaction,
  } = useBank();

  const [copied, setCopied] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [metricView, setMetricView] = useState<'BALANCE' | 'SCORE'>('BALANCE');
  const [cardFrozen, setCardFrozen] = useState(false);

  const handleCopyAcc = () => {
    if (!currentAccount) return;
    navigator.clipboard.writeText(currentAccount.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const analytics = useMemo(() => {
    if (!currentAccount) return null;
    return computeAnalytics(currentAccount.id, accounts, transactions);
  }, [currentAccount, accounts, transactions]);

  const totalIn = analytics?.totalMoneyIn || 0;
  const totalOut = analytics?.totalMoneyOut || 0;

  if (!currentAccount) return null;

  const firstName = currentAccount.holder.split(' ')[0];

  const handleExecuteScheduledBatch = async () => {
    setIsProcessingBatch(true);
    try {
      enqueueTransaction('TRANSFER', 1850000, 'Batch Vendor Settlement: Cloud Infra', '409823415678');
      await processNextQueueItem();
      setBatchSuccess(true);
      setTimeout(() => setBatchSuccess(false), 3000);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const handleVoiceQuery = (query: string) => {
    setAiQuery(query);
    setAiModalOpen(true);
    if (query.toLowerCase().includes('balance')) {
      setAiResponse(
        `Available balance for ${currentAccount.holder} is ${formatINR(
          currentAccount.balance
        )}. You have ${queueItems.length} transactions in queue.`
      );
    } else if (query.toLowerCase().includes('verify') || query.toLowerCase().includes('risk')) {
      setAiResponse(
        `Security Audit Complete: Ledger invariant checks verified (Conservation of Mass O(N), Non-negative balance check, and Single Source of Truth). Zero ledger drift detected.`
      );
    } else if (query.toLowerCase().includes('batch') || query.toLowerCase().includes('stress')) {
      add10RandomQueueTransactions();
      setAiResponse(`Enqueued 10 real-time transactions into the FIFO Queue Engine. Ready for sequential settlement.`);
    } else {
      setAiResponse(
        `Banking Simulator AI Portfolio Analysis: Monthly inflow is ${formatINR(
          totalIn
        )}. Current liquidity ratio is optimal for overnight vault auto-sweeps.`
      );
    }
  };

  return (
    <div className="space-y-5 rise-in max-w-7xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. Hero Header & Greeting Row (Crisp & Properly Spaced)
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        {/* User Greeting */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#fec94a] via-amber-300 to-amber-100 p-0.5 shadow-xs">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-extrabold text-sm text-neutral-900">
                {firstName[0]}
              </div>
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 leading-none">
              Hi, {firstName}!
            </h1>
            <p className="text-[11px] font-semibold text-neutral-500 mt-1">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}{' '}
              · Digital Banking Hub
            </p>
          </div>
        </div>

        {/* Center Section Title */}
        <div className="hidden lg:block text-center">
          <span className="text-sm font-bold text-neutral-800 uppercase tracking-wider">
            Today's Treasury & Tasks
          </span>
        </div>

        {/* Beneficiaries Avatar Pile */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Team:</span>
          <div className="flex items-center -space-x-1.5">
            {accounts.slice(0, 3).map((acc, i) => {
              const bgColors = ['bg-rose-100 text-rose-800', 'bg-indigo-100 text-indigo-800', 'bg-emerald-100 text-emerald-800'];
              return (
                <div
                  key={acc.id}
                  title={acc.holder}
                  className={`w-6 h-6 rounded-full ${bgColors[i % bgColors.length]} ring-2 ring-white flex items-center justify-center text-[9px] font-extrabold shadow-xs`}
                >
                  {acc.holder[0]}
                </div>
              );
            })}
            <div className="w-6 h-6 rounded-full bg-neutral-900 text-white ring-2 ring-white flex items-center justify-center text-[9px] font-extrabold shadow-xs">
              +{Math.max(accounts.length - 3, 4)}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. Exactly 12-Column Grid: Col 1 (3 cols) | Col 2 (5 cols) | Col 3 (4 cols)
          3 + 5 + 4 = 12. NO WRAPPING! NO WASTED SPACE!
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* ── COLUMN 1: Account, Balance & Marigold Activity (Span 3) ── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Account Selector Card */}
          <div className="relative">
            <button
              onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              className="w-full porcelain-card p-3.5 flex items-center justify-between text-left group hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#fec94a]/30 border border-[#fec94a]/70 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-neutral-900" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-neutral-950 truncate">
                    {currentAccount.holder}
                  </div>
                  <div className="text-[11px] text-neutral-500 font-semibold truncate flex items-center gap-1">
                    <span>Checking</span>
                    <span>•</span>
                    <span className="tabular-nums font-mono">{maskAccountNumber(currentAccount.accountNumber)}</span>
                  </div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900 transition-colors shrink-0 ml-1" />
            </button>

            {accountDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setAccountDropdownOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl p-2.5 z-40 shadow-xl border border-neutral-100 rise-in">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 py-1">
                    Select Account
                  </div>
                  <div className="space-y-1 mt-1 max-h-52 overflow-y-auto">
                    {accounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          switchAccount(acc.id);
                          setAccountDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-colors ${
                          acc.id === currentAccount.id
                            ? 'bg-[#fec94a]/30 font-bold'
                            : 'hover:bg-[#f4efe9]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-neutral-900 truncate">{acc.holder}</div>
                          <div className="text-[10px] text-neutral-500 font-mono tabular-nums">{acc.accountNumber}</div>
                        </div>
                        <div className="text-xs font-extrabold text-neutral-900 tabular-nums">
                          {formatINR(acc.balance)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Hero Big Stat Block */}
          <div className="px-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                {metricView === 'BALANCE' ? "Today's Available Liquidity" : "Capital Efficiency"}
              </span>
              <button
                onClick={() => setMetricView(metricView === 'BALANCE' ? 'SCORE' : 'BALANCE')}
                className="text-[10px] font-bold text-neutral-700 hover:text-neutral-950 bg-[#f4efe9] px-2 py-0.5 rounded-full"
              >
                Toggle {metricView === 'BALANCE' ? 'Health %' : 'Balance'}
              </button>
            </div>

            {metricView === 'BALANCE' ? (
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-950 tabular-nums leading-tight">
                  {formatINR(currentAccount.balance)}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> 100% Reserve Backed
                  </span>
                  <button
                    onClick={handleCopyAcc}
                    className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-neutral-500 hover:text-neutral-900 bg-[#f4efe9] px-2 py-0.5 rounded-full transition-colors"
                    title="Copy full 12-digit account number"
                  >
                    <span>{maskAccountNumber(currentAccount.accountNumber)}</span>
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-5xl font-extrabold tracking-tight text-neutral-950 leading-none">
                  92%
                </div>
                <p className="text-[11px] font-semibold text-neutral-500 mt-1.5">
                  Capital Liquidity & Safety Score · Tier-1 Capital Standard
                </p>
              </div>
            )}
          </div>

          {/* Signature Marigold Yellow Card */}
          <div className="marigold-card p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-900/70">
                  Treasury Dynamics
                </span>
                <h3 className="text-base font-extrabold text-neutral-950 mt-0.5">Project Activity</h3>
              </div>
              <span className="bg-[#141517] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                Statistic
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-neutral-900/15 text-neutral-950">
              <div>
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums">
                  ₹{(totalIn / 100000).toFixed(1)}L
                </div>
                <div className="text-[10px] font-bold text-neutral-800 mt-0.5">Inflow (30d)</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums">
                  ₹{(totalOut / 100000).toFixed(1)}L
                </div>
                <div className="text-[10px] font-bold text-neutral-800 mt-0.5">Outflow (30d)</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums">
                  4.8%
                </div>
                <div className="text-[10px] font-bold text-neutral-800 mt-0.5">Vault Yield</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between pt-1">
              <span className="text-[10px] font-semibold text-neutral-900/80">
                Auto-reconciled with RBI clearing
              </span>
              <a
                href="#/transfer-pay"
                className="w-7 h-7 rounded-full bg-white text-neutral-950 flex items-center justify-center hover:bg-neutral-900 hover:text-white transition-colors shadow-xs"
                title="Quick transfer"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* ── COLUMN 2: Priority Tasks & Live Settlements (Span 5) ── */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500">
              Pending Settlements & Approvals
            </span>
            <span className="text-[10px] font-bold text-neutral-600 bg-[#f4efe9] px-2.5 py-0.5 rounded-full">
              Live Feed
            </span>
          </div>

          {/* Task Card 1: Weekly Vendor & Payroll Batch */}
          <div className="porcelain-card p-4 space-y-3 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900">
                  <Send className="w-3 h-3" />
                </span>
                <span className="text-sm font-bold text-neutral-950">
                  Weekly Vendor & Payroll Batch
                </span>
              </div>
              <span className="bg-[#10b981] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                {batchSuccess ? 'Processed' : 'Scheduled'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs py-1 border-y border-neutral-100">
              <div>
                <span className="block text-neutral-400 font-bold text-[9px] uppercase tracking-wider">When:</span>
                <span className="font-bold text-neutral-800 text-[11px]">Today, 10:00 AM</span>
              </div>
              <div>
                <span className="block text-neutral-400 font-bold text-[9px] uppercase tracking-wider">Method:</span>
                <span className="font-bold text-neutral-800 text-[11px]">Direct IMPS</span>
              </div>
              <div>
                <span className="block text-neutral-400 font-bold text-[9px] uppercase tracking-wider">Batch Value:</span>
                <span className="font-extrabold text-neutral-950 tabular-nums text-[11px]">₹18,500.00</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center -space-x-1">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[8px] font-bold flex items-center justify-center ring-1 ring-white">
                    P
                  </span>
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-bold flex items-center justify-center ring-1 ring-white">
                    V
                  </span>
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[8px] font-bold flex items-center justify-center ring-1 ring-white">
                    A
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500 font-semibold">Ready to execute?</span>
              </div>

              <button
                onClick={handleExecuteScheduledBatch}
                disabled={isProcessingBatch || batchSuccess}
                className="bg-[#f4efe9] hover:bg-[#141517] hover:text-white text-neutral-950 text-[11px] font-bold px-3.5 py-1.5 rounded-full transition-all duration-150 flex items-center gap-1"
              >
                {isProcessingBatch ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" /> Processing...
                  </>
                ) : batchSuccess ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Settled
                  </>
                ) : (
                  'Approve & Execute'
                )}
              </button>
            </div>
          </div>

          {/* Task Card 2: High Priority Capital Wire */}
          <div className="porcelain-card p-4 space-y-3 hover:shadow-md transition-all border-l-4 border-l-rose-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Flame className="w-3 h-3" />
                </span>
                <span className="text-sm font-bold text-neutral-950">
                  Capital Wire: Cloud Cluster Q4
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="bg-rose-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-xs">
                  <Flame className="w-2.5 h-2.5" /> High Priority
                </span>
                <span className="bg-[#fec94a] text-neutral-950 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Transfer
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs py-1 border-y border-neutral-100">
              <div>
                <span className="block text-neutral-400 font-bold text-[9px] uppercase tracking-wider">Beneficiary:</span>
                <span className="font-bold text-neutral-800 text-[11px] truncate block">Zurich Infra Ltd</span>
              </div>
              <div>
                <span className="block text-neutral-400 font-bold text-[9px] uppercase tracking-wider">Description:</span>
                <span className="font-bold text-neutral-800 text-[11px] truncate block">Invoice #88921</span>
              </div>
              <div>
                <span className="block text-neutral-400 font-bold text-[9px] uppercase tracking-wider">Deadline:</span>
                <span className="font-extrabold text-rose-600 text-[11px]">Today, 5:00 PM</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <div className="text-xs">
                <span className="text-neutral-400 font-bold text-[10px]">AMOUNT: </span>
                <span className="font-extrabold text-neutral-950 text-xs tabular-nums font-mono">₹42,500.00</span>
              </div>

              <button
                onClick={() => handleVoiceQuery('Verify capital wire to Zurich Infra')}
                className="bg-[#141517] hover:bg-neutral-800 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full transition-all duration-150 flex items-center gap-1 shadow-xs"
              >
                <Sparkles className="w-3 h-3 text-[#fec94a]" />
                Ask AI to verify & sign
              </button>
            </div>
          </div>

          {/* Task Card 3: Live Queue Engine / Automated Treasury */}
          <div className="porcelain-card p-4 space-y-3 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900">
                  <Building2 className="w-3 h-3" />
                </span>
                <span className="text-sm font-bold text-neutral-950">
                  {queueItems.length > 0
                    ? `Live Queue Engine: ${queueItems[0].type}`
                    : 'Overnight Treasury Auto-Sweep'}
                </span>
              </div>
              <span className="bg-[#10b981] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                {queueItems.length > 0 ? `${queueItems.length} in FIFO` : 'Automated'}
              </span>
            </div>

            {queueItems.length > 0 ? (
              <div className="p-2.5 bg-[#fcfbf9] rounded-xl border border-neutral-100 text-xs">
                <div className="flex items-center justify-between font-bold text-neutral-950">
                  <span>{queueItems[0].description}</span>
                  <span className="text-emerald-700 font-extrabold font-mono">{formatINR(queueItems[0].amount)}</span>
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                  Idempotency: {queueItems[0].idempotencyKey.slice(0, 18)}...
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-xs py-1 border-y border-neutral-100">
                <div>
                  <span className="block text-neutral-400 font-bold text-[9px] uppercase tracking-wider">Schedule:</span>
                  <span className="font-bold text-neutral-800 text-[11px]">Daily, 11:59 PM</span>
                </div>
                <div>
                  <span className="block text-neutral-400 font-bold text-[9px] uppercase tracking-wider">Target Vault:</span>
                  <span className="font-bold text-neutral-800 text-[11px]">Liquid Vault 6.2%</span>
                </div>
                <div>
                  <span className="block text-neutral-400 font-bold text-[9px] uppercase tracking-wider">Threshold:</span>
                  <span className="font-bold text-neutral-800 text-[11px]">&gt; ₹50,000</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[10px] text-neutral-500 font-semibold">
                {queueItems.length > 0 ? 'FIFO Sequential Pipeline' : 'Yield optimizer active'}
              </span>
              <a
                href="#/processing"
                className="bg-[#f4efe9] hover:bg-neutral-200 text-neutral-950 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
              >
                {queueItems.length > 0 ? 'Process Next Item →' : 'Configure Rules'}
              </a>
            </div>
          </div>
        </div>

        {/* ── COLUMN 3: Quick Requests & Voice AI Assistant (Span 4) ── */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Requests Card */}
          <div className="porcelain-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#fec94a] flex items-center justify-center text-[10px] font-extrabold text-neutral-950">
                  ✦
                </span>
                <h3 className="text-sm font-extrabold text-neutral-950">Quick requests</h3>
              </div>
              <a
                href="#/transfer-pay"
                className="text-[10px] font-bold text-neutral-800 hover:text-neutral-950 flex items-center gap-1 bg-[#f4efe9] px-2.5 py-1 rounded-full transition-colors"
              >
                <Plus className="w-2.5 h-2.5" /> Set Transfer
              </a>
            </div>

            <div className="space-y-1.5 pt-0.5">
              {/* Row 1 */}
              <a
                href="#/transfer-pay"
                className="w-full text-left p-2.5 rounded-xl bg-[#fcfbf9] hover:bg-[#f4efe9] border border-neutral-100 flex items-center justify-between group transition-all"
              >
                <span className="text-xs font-semibold text-neutral-800 pr-2">
                  Instant ACH / IMPS wire transfer to contact
                </span>
                <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-neutral-700 group-hover:bg-[#141517] group-hover:text-white transition-colors shrink-0 shadow-2xs">
                  <Play className="w-2 h-2 fill-current ml-0.5" />
                </span>
              </a>

              {/* Row 2 */}
              <button
                onClick={() => handleVoiceQuery('Generate PDF proof of funds statement')}
                className="w-full text-left p-2.5 rounded-xl bg-[#fcfbf9] hover:bg-[#f4efe9] border border-neutral-100 flex items-center justify-between group transition-all"
              >
                <span className="text-xs font-semibold text-neutral-800 pr-2">
                  Export certified statement with digital signature
                </span>
                <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-neutral-700 group-hover:bg-[#141517] group-hover:text-white transition-colors shrink-0 shadow-2xs">
                  <Play className="w-2 h-2 fill-current ml-0.5" />
                </span>
              </button>

              {/* Row 3 */}
              <button
                onClick={() => setCardFrozen(!cardFrozen)}
                className="w-full text-left p-2.5 rounded-xl bg-[#fcfbf9] hover:bg-[#f4efe9] border border-neutral-100 flex items-center justify-between group transition-all"
              >
                <span className="text-xs font-semibold text-neutral-800 pr-2">
                  Debit card controls: {cardFrozen ? 'Unfreeze card' : 'Temporarily freeze card'}
                </span>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    cardFrozen ? 'bg-rose-500 text-white' : 'bg-white text-neutral-700'
                  }`}
                >
                  {cardFrozen ? '🔒' : '💳'}
                </span>
              </button>

              {/* Row 4: Stress test enqueue */}
              <button
                onClick={() => {
                  add10RandomQueueTransactions();
                  handleVoiceQuery('Enqueued 10 transactions for batch processing');
                }}
                className="w-full text-left p-2.5 rounded-xl bg-[#fcfbf9] hover:bg-[#f4efe9] border border-neutral-100 flex items-center justify-between group transition-all"
              >
                <span className="text-xs font-semibold text-neutral-800 pr-2">
                  Simulate high-throughput stress test: 10 txns
                </span>
                <span className="w-5 h-5 rounded-full bg-[#fec94a] flex items-center justify-center text-neutral-900 font-extrabold text-[10px] shrink-0 shadow-2xs">
                  +10
                </span>
              </button>
            </div>
          </div>

          {/* Voice Tasks / AI Assistant Card */}
          <div className="porcelain-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="bg-[#e0e7ff] text-[#4338ca] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                Voice Tasks
              </span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">AI Copilot</span>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <div>
                <h4 className="text-base font-extrabold text-neutral-950 leading-snug">
                  Say something<br />to Banking Simulator!
                </h4>
              </div>

              {/* Animated Soundwave Equalizer */}
              <div className="flex items-center gap-0.5 h-8 px-1" aria-hidden="true">
                {[12, 22, 16, 28, 20, 26, 14, 24, 18, 10].map((h, i) => (
                  <span
                    key={i}
                    className="w-0.5 bg-[#6366f1] soundwave-bar"
                    style={{
                      height: `${h}px`,
                      animationDelay: `${(i * 0.11).toFixed(2)}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Quick prompt chips */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {[
                "What's my balance?",
                'Audit ledger integrity',
                'Verify pending wire',
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleVoiceQuery(chip)}
                  className="text-[10px] font-bold bg-[#f4efe9] hover:bg-neutral-900 hover:text-white text-neutral-700 px-2.5 py-1 rounded-full transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Center Microphone Button */}
            <div className="flex justify-center pt-1">
              <button
                onClick={() => handleVoiceQuery("What's my balance?")}
                className="w-10 h-10 rounded-full bg-[#141517] hover:bg-neutral-800 text-white flex items-center justify-center transition-transform hover:scale-105 shadow-md active:scale-95"
                aria-label="Activate voice prompt"
                title="Speak to Banking Simulator AI"
              >
                <Mic className="w-4 h-4 text-[#fec94a]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. Recent Transaction Ledger Timeline (Clean Porcelain Table)
          ───────────────────────────────────────────────────────────── */}
      <div className="porcelain-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-neutral-950">Recent Ledger Activity</h2>
            <p className="text-[11px] font-semibold text-neutral-400 mt-0.5">
              Live double-entry audit records for account {currentAccount.accountNumber}
            </p>
          </div>
          <a
            href="#/transactions"
            className="text-[11px] font-bold text-neutral-900 hover:text-neutral-950 bg-[#f4efe9] hover:bg-neutral-200 px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1"
          >
            <span>View All Records</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>

        {currentAccountTransactions.length === 0 ? (
          <div className="py-10 text-center text-neutral-400 text-xs">
            No transactions in this account yet.{' '}
            <a href="#/transfer-pay" className="text-neutral-900 font-bold underline underline-offset-4">
              Make a deposit
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5 pl-2">Reference</th>
                  <th className="pb-2.5">Description</th>
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right pr-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {currentAccountTransactions.slice(0, 5).map((tx) => {
                  const isCredit = tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_RECEIVED';
                  const dateStr = new Date(tx.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <tr key={tx.id} className="hover:bg-[#fcfbf9] transition-colors">
                      <td className="py-2.5 pl-2 font-mono text-[11px] text-neutral-500 font-semibold">{tx.reference}</td>
                      <td className="py-2.5 font-bold text-neutral-950 max-w-xs truncate">{tx.description}</td>
                      <td className="py-2.5 text-neutral-500 font-medium tabular-nums">{dateStr}</td>
                      <td className="py-2.5">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td
                        className={`py-2.5 pr-2 text-right font-extrabold text-xs font-mono tabular-nums ${
                          isCredit ? 'text-emerald-700' : 'text-neutral-950'
                        }`}
                      >
                        {isCredit ? '+' : '−'}
                        {formatINR(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. Interactive AI Banking Assistant Dialog
          ───────────────────────────────────────────────────────────── */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs rise-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-neutral-100 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#fec94a] flex items-center justify-center font-bold text-neutral-900">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-950">Banking Simulator AI Copilot</h4>
                  <p className="text-[10px] text-neutral-400 font-semibold">Real-time banking intelligence</p>
                </div>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="w-6 h-6 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-[#f4efe9] p-2.5 rounded-xl text-xs font-semibold text-neutral-800">
              <span className="text-[9px] text-neutral-400 block uppercase font-extrabold">Query:</span>
              "{aiQuery}"
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-950 leading-relaxed font-semibold">
              <span className="text-[9px] text-emerald-700 block uppercase font-extrabold mb-0.5">
                Response:
              </span>
              {aiResponse}
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setAiModalOpen(false)}
                className="bg-[#141517] hover:bg-neutral-800 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
