/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian - Luxury Neo-Fintech Footer
 */

import React from 'react';
import { useBank } from '../../context/BankContext';
import { Terminal, RotateCcw, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onToggleDevPanel: () => void;
  isDevPanelOpen: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onToggleDevPanel, isDevPanelOpen }) => {
  const { resetAllDemoData, devLogs } = useBank();

  const handleReset = () => {
    if (
      window.confirm(
        'Reset all demo data? This restores the original seed accounts and ledger transactions.'
      )
    ) {
      resetAllDemoData();
    }
  };

  return (
    <footer className="px-3 sm:px-6 pb-6 pt-2">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500 font-medium">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-white/60 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Simulated Banking Sandbox · Invariant Checked O(N)</span>
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/80 hover:bg-white text-neutral-700 transition-colors border border-white/60 shadow-xs"
            title="Reset demo data to the initial seed state"
          >
            <RotateCcw className="w-3 h-3 text-neutral-500" />
            Reset demo data
          </button>

          <button
            onClick={onToggleDevPanel}
            className={`inline-flex items-center gap-1.5 pl-4 pr-2 py-2 rounded-full transition-colors border border-white/60 shadow-xs ${
              isDevPanelOpen
                ? 'bg-[#141517] text-white'
                : 'bg-white/80 hover:bg-white text-neutral-700'
            }`}
            title="Toggle developer telemetry panel"
          >
            <Terminal className="w-3 h-3" />
            Dev telemetry
            <span
              className={`min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center tabular-nums ${
                isDevPanelOpen ? 'bg-[#fec94a] text-[#141517]' : 'bg-[#f4efe9] text-neutral-700'
              }`}
            >
              {devLogs.length}
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
};
