/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bank Simulator - Transaction Processing (FIFO Queue Engine)
 */

import React, { useState } from 'react';
import { useBank } from '../context/BankContext';
import { formatINR, maskAccountNumber } from '../lib/money';
import { ComplexityBadge } from '../components/common/StatusBadge';
import {
  Layers,
  Play,
  FastForward,
  PlusCircle,
  Trash2,
  ArrowRight,
  Clock,
  Key,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const QueuePage: React.FC = () => {
  const {
    queueItems,
    processNextQueueItem,
    processAllQueueItems,
    add10RandomQueueTransactions,
    clearQueue,
  } = useBank();

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedResult, setLastProcessedResult] = useState<{
    success: boolean;
    message: string;
    ref?: string;
  } | null>(null);

  const handleProcessNext = async () => {
    setIsProcessing(true);
    try {
      const res = await processNextQueueItem();
      setLastProcessedResult({
        success: res.success,
        message: res.message,
        ref: res.tx?.reference,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessAll = async () => {
    setIsProcessing(true);
    try {
      const res = await processAllQueueItems();
      setLastProcessedResult({
        success: true,
        message: `Processed ${res.totalProcessed} transactions (${res.succeeded} succeeded, ${res.failed} failed)`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-4xl font-light tracking-[-0.04em] text-ink">
              Transaction Processing
            </h1>
            <ComplexityBadge complexity="FIFO Queue: O(1)" variant="teal" />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time transaction queue pipeline. Transactions are batched and settled sequentially.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleProcessNext}
            disabled={isProcessing || queueItems.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[#141517] hover:bg-neutral-800 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Process Next</span>
          </button>

          <button
            onClick={handleProcessAll}
            disabled={isProcessing || queueItems.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full bg-[#fec94a] hover:bg-amber-400 text-neutral-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Process All ({queueItems.length})</span>
          </button>

          <button
            onClick={add10RandomQueueTransactions}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-white hover:bg-[#f4efe9] text-neutral-800 border border-neutral-200/60 transition-colors shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5 text-neutral-900" />
            <span>+10 Random Batch</span>
          </button>

          <button
            onClick={clearQueue}
            disabled={queueItems.length === 0}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-full text-neutral-600 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Clear all pending transactions"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Execution Feedback Result Alert */}
      {lastProcessedResult && (
        <div
          className={`p-3.5 rounded-lg border text-sm flex items-center justify-between gap-3 ${
            lastProcessedResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {lastProcessedResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <div>
              <span className="font-semibold">
                {lastProcessedResult.success ? 'Settlement Succeeded: ' : 'Settlement Rejected: '}
              </span>
              <span>{lastProcessedResult.message}</span>
              {lastProcessedResult.ref && (
                <span className="font-mono ml-1.5 font-bold">[{lastProcessedResult.ref}]</span>
              )}
            </div>
          </div>

          <button
            onClick={() => setLastProcessedResult(null)}
            className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Queue Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="porcelain-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Pipeline Size</div>
            <div className="text-2xl font-bold font-mono text-neutral-900 mt-1">
              {queueItems.length}
            </div>
          </div>
          <div className="text-right text-xs font-medium text-neutral-500 font-mono">
            {queueItems.length > 0 ? 'Active Queue' : 'Queue Idle'}
          </div>
        </div>

        <div className="porcelain-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Pending Volume</div>
            <div className="text-xl font-bold font-mono text-emerald-800 mt-1">
              {formatINR(queueItems.reduce((acc, q) => acc + q.amount, 0))}
            </div>
          </div>
          <div className="text-right text-xs font-medium text-neutral-500">
            {queueItems.filter((q) => q.type === 'TRANSFER').length} Transfers
          </div>
        </div>

        <div className="porcelain-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Processing Architecture</div>
            <div className="text-sm font-bold text-neutral-800 mt-1">
              O(1) Doubly-Linked List
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shadow-xs">
            Zero Array Copy
          </span>
        </div>
      </div>

      {/* Visual Queue Pipeline (Horizontal Front to Rear) */}
      <div className="porcelain-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 ">
              Live Processing Queue
            </h2>
            <span className="text-sm font-mono px-2 py-0.5 rounded-xl bg-slate-100 text-slate-700">
              Front → Next to execute
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm font-mono font-medium text-slate-500">
            <span className="text-teal-700 font-bold">FRONT (Left)</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="text-slate-700">REAR (Right)</span>
          </div>
        </div>

        {queueItems.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Clock className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-700">
              The processing queue is empty.
            </div>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Submit a deposit, withdrawal, or transfer to enqueue a pending transaction, or generate a batch below.
            </p>
            <div className="pt-2">
              <button
                onClick={add10RandomQueueTransactions}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-teal-800 hover:bg-teal-700 text-white transition-colors shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add 10 Random Transactions</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4 pt-1">
            <div className="flex items-stretch gap-3 min-w-max">
              {queueItems.map((item, index) => {
                const isFront = index === 0;
                const isRear = index === queueItems.length - 1;

                return (
                  <div
                    key={item.id}
                    className={`w-64 p-3.5 rounded-lg border transition-all relative flex flex-col justify-between ${
                      isFront
                        ? 'bg-teal-50/50 border-teal-500 shadow-sm ring-1 ring-teal-500/30'
                        : isRear
                        ? 'bg-lilac/20 border-transparent'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {/* Index Badge and Front / Rear Indicators */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/70 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-700">
                          #{index + 1}
                        </span>
                        {isFront && (
                          <span className="px-1.5 py-0.2 rounded-xl font-bold bg-teal-700 text-white">
                            FRONT
                          </span>
                        )}
                        {isRear && queueItems.length > 1 && (
                          <span className="px-1.5 py-0.2 rounded-xl font-bold bg-ink text-white">
                            REAR
                          </span>
                        )}
                      </div>

                      <span className="font-mono text-slate-500 font-medium">
                        {item.reference}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 font-semibold text-slate-800">
                          {item.type === 'DEPOSIT' && (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          {item.type === 'WITHDRAWAL' && (
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          {item.type === 'TRANSFER' && (
                            <ArrowLeftRight className="w-3.5 h-3.5 text-teal-600" />
                          )}
                          {item.type}
                        </span>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {formatINR(item.amount)}
                        </span>
                      </div>

                      <div className="text-sm text-slate-600 line-clamp-2">
                        {item.description}
                      </div>

                      <div className="pt-2 border-t border-slate-200/50 text-sm space-y-1">
                        <div className="flex items-center justify-between text-slate-500">
                          <span>From:</span>
                          <span className="font-medium text-slate-700 truncate max-w-[120px]">
                            {item.senderHolder}
                          </span>
                        </div>
                        {item.recipientHolder && (
                          <div className="flex items-center justify-between text-slate-500">
                            <span>To:</span>
                            <span className="font-medium text-slate-700 truncate max-w-[120px]">
                              {item.recipientHolder}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action button if front */}
                    {isFront && (
                      <div className="mt-3 pt-2 border-t border-teal-200">
                        <button
                          onClick={handleProcessNext}
                          disabled={isProcessing}
                          className="w-full py-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-semibold text-sm flex items-center justify-center gap-1 transition-colors"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Execute Front Item</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
