/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian Bank Simulator - Live Developer Console & Big-O Telemetry (Light Themed)
 */

import React, { useState } from 'react';
import { useBank } from '../../context/BankContext';
import { ComplexityBadge } from './StatusBadge';
import { Terminal, Trash2, X, ChevronUp, ChevronDown } from 'lucide-react';

interface DevPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevPanel: React.FC<DevPanelProps> = ({ isOpen, onClose }) => {
  const { devLogs, clearDevLogs } = useBank();
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  const filteredLogs = devLogs.filter((log) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'QUEUE') return log.structure === 'QUEUE';
    if (selectedFilter === 'STACK') return log.structure === 'STACK';
    if (selectedFilter === 'SEARCH')
      return (
        log.structure === 'LINEAR_SEARCH' ||
        log.structure === 'BINARY_SEARCH' ||
        log.structure === 'HASH_TABLE'
      );
    if (selectedFilter === 'LEDGER') return log.structure === 'LEDGER_ATOMIC';
    return true;
  });

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-6 sm:right-6 z-40 bg-white rounded-lg overflow-hidden text-slate-800 shadow-[0_30px_80px_-20px_rgba(23,24,26,.45)] rise-in">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-mono font-semibold text-teal-800">
              DAA Algorithmic Operation Stream
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            ({devLogs.length} events logged)
          </span>

          {/* Filter Pills */}
          <div className="hidden sm:flex items-center gap-1 ml-4 bg-white p-0.5 rounded-xl border border-slate-200 text-xs font-mono">
            {['ALL', 'QUEUE', 'STACK', 'SEARCH', 'LEDGER'].map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFilter(f)}
                className={`px-2 py-0.5 rounded-xl transition-colors ${
                  selectedFilter === f
                    ? 'bg-teal-800 text-white font-medium'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearDevLogs}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-rose-700 px-2 py-1 rounded-xl hover:bg-slate-200 transition-colors"
            title="Clear all event logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Clear</span>
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200 transition-colors"
            title={isMinimized ? 'Expand Console' : 'Minimize Console'}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-600 hover:text-rose-600 rounded-xl hover:bg-slate-200 transition-colors"
            title="Close Console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body Table */}
      {!isMinimized && (
        <div className="h-56 overflow-y-auto p-2 font-mono text-xs divide-y divide-slate-200 bg-slate-50/70">
          {filteredLogs.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              No operations captured yet. Perform transactions, process queues, pop history, or search accounts.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const dateStr = new Date(log.timestamp).toLocaleTimeString();
              let structureColor = 'text-ink bg-mint/50 border-transparent';
              if (log.structure === 'QUEUE') structureColor = 'text-teal-800 bg-teal-100 border-teal-300';
              if (log.structure === 'STACK') structureColor = 'text-ink bg-lilac/50 border-transparent';
              if (log.structure === 'LEDGER_ATOMIC') structureColor = 'text-emerald-800 bg-emerald-100 border-emerald-300';

              return (
                <div key={log.id} className="py-1.5 px-2 flex items-start gap-3 hover:bg-white transition-colors">
                  <span className="text-slate-500 tabular-nums shrink-0">{dateStr}</span>

                  <span className={`px-1.5 py-0.5 rounded-xl text-xs font-bold border shrink-0 ${structureColor}`}>
                    {log.structure.replace('_', ' ')}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 font-semibold">{log.operation}</span>
                      <ComplexityBadge complexity={log.complexity} variant="teal" />
                      {log.durationMs !== undefined && (
                        <span className="text-slate-500 text-xs tabular-nums">
                          {log.durationMs.toFixed(3)} ms
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-xs truncate mt-0.5">{log.details}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
