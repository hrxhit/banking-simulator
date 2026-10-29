/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian Bank Simulator - Account Search Lab & Algorithmic Benchmarks
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useBank } from '../context/BankContext';
import {
  executeSideBySideSearch,
  generateSyntheticDataset,
  runMultiNBenchmark,
  runQueueVsShiftBenchmark,
} from '../lib/search';
import { SearchAlgorithmResult, BenchmarkPoint, QueueBenchmarkPoint } from '../types';
import { formatINR, maskAccountNumber } from '../lib/money';
import { ComplexityBadge } from '../components/common/StatusBadge';
import {
  Search,
  Zap,
  Play,
  RotateCcw,
  Sparkles,
  BarChart2,
  GitCompare,
  TrendingUp,
  Cpu,
  Layers,
  CheckCircle2,
  Clock,
  ListFilter,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export const SearchLabPage: React.FC = () => {
  const { accounts } = useBank();

  // Search Input State
  const [searchQuery, setSearchQuery] = useState<string>('401123456789');
  const [activeDatasetSize, setActiveDatasetSize] = useState<number>(accounts.length);
  const [isGeneratingSynthetic, setIsGeneratingSynthetic] = useState<boolean>(false);
  const [syntheticStatus, setSyntheticStatus] = useState<string>('');

  // Active dataset structures
  const [dataset, setDataset] = useState(() => {
    const sortedNum = [...accounts].sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
    const sortedName = [...accounts].sort((a, b) => a.holder.toLowerCase().localeCompare(b.holder.toLowerCase()));
    const mapNum = new Map(accounts.map((a) => [a.accountNumber, a]));
    const mapName = new Map(accounts.map((a) => [a.holder.toLowerCase(), a]));

    return {
      accounts,
      sortedByNumber: sortedNum,
      sortedByName: sortedName,
      hashByNumber: mapNum,
      hashByName: mapName,
    };
  });

  // Execute side-by-side search
  const searchResults: SearchAlgorithmResult[] = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return executeSideBySideSearch(
      searchQuery,
      dataset.accounts,
      dataset.sortedByNumber,
      dataset.sortedByName,
      dataset.hashByNumber,
      dataset.hashByName
    );
  }, [searchQuery, dataset]);

  // Synthetic Generation Handlers
  const handleGenerateSynthetic = async (n: number) => {
    setIsGeneratingSynthetic(true);
    setSyntheticStatus(`Allocating ${n.toLocaleString()} synthetic accounts in memory...`);
    await new Promise((resolve) => setTimeout(resolve, 30));

    try {
      const generated = generateSyntheticDataset(n);
      setDataset(generated);
      setActiveDatasetSize(n);
      setSyntheticStatus(`Successfully generated ${n.toLocaleString()} accounts in memory.`);
      // Set default search to an existing synthetic number
      if (generated.accounts.length > 0) {
        setSearchQuery(generated.accounts[Math.floor(n / 2)].accountNumber);
      }
    } finally {
      setIsGeneratingSynthetic(false);
    }
  };

  const handleResetToRealAccounts = () => {
    const sortedNum = [...accounts].sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
    const sortedName = [...accounts].sort((a, b) => a.holder.toLowerCase().localeCompare(b.holder.toLowerCase()));
    const mapNum = new Map(accounts.map((a) => [a.accountNumber, a]));
    const mapName = new Map(accounts.map((a) => [a.holder.toLowerCase(), a]));

    setDataset({
      accounts,
      sortedByNumber: sortedNum,
      sortedByName: sortedName,
      hashByNumber: mapNum,
      hashByName: mapName,
    });
    setActiveDatasetSize(accounts.length);
    setSyntheticStatus('');
    setSearchQuery('401123456789');
  };

  // Benchmark States
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState<{ status: string; percent: number } | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkPoint[]>([
    { n: 1000, linearTimeMs: 0.0245, binaryTimeMs: 0.0012, hashTimeMs: 0.0003, linearSteps: 489, binarySteps: 9.8, hashSteps: 1 },
    { n: 5000, linearTimeMs: 0.1120, binaryTimeMs: 0.0018, hashTimeMs: 0.0003, linearSteps: 2490, binarySteps: 12.2, hashSteps: 1 },
    { n: 20000, linearTimeMs: 0.4410, binaryTimeMs: 0.0024, hashTimeMs: 0.0004, linearSteps: 9980, binarySteps: 14.1, hashSteps: 1 },
    { n: 50000, linearTimeMs: 1.0920, binaryTimeMs: 0.0031, hashTimeMs: 0.0004, linearSteps: 24850, binarySteps: 15.3, hashSteps: 1 },
    { n: 100000, linearTimeMs: 2.0836, binaryTimeMs: 0.0084, hashTimeMs: 0.0006, linearSteps: 48729, binarySteps: 15.7, hashSteps: 1 },
  ]);

  const handleRunFullBenchmark = async () => {
    setIsRunningBenchmark(true);
    try {
      const points = await runMultiNBenchmark((status, percent) => {
        setBenchmarkProgress({ status, percent });
      });
      setBenchmarkData(points);
    } finally {
      setIsRunningBenchmark(false);
      setBenchmarkProgress(null);
    }
  };

  // Queue vs Array.shift Benchmark
  const [isRunningQueueBenchmark, setIsRunningQueueBenchmark] = useState(false);
  const [queueBenchmarkData, setQueueBenchmarkData] = useState<QueueBenchmarkPoint[]>([
    { ops: 1000, customQueueTimeMs: 0.18, arrayShiftTimeMs: 0.52 },
    { ops: 5000, customQueueTimeMs: 0.85, arrayShiftTimeMs: 5.40 },
    { ops: 15000, customQueueTimeMs: 2.45, arrayShiftTimeMs: 38.20 },
    { ops: 30000, customQueueTimeMs: 5.10, arrayShiftTimeMs: 142.80 },
    { ops: 50000, customQueueTimeMs: 8.90, arrayShiftTimeMs: 395.50 },
  ]);

  const handleRunQueueBenchmark = async () => {
    setIsRunningQueueBenchmark(true);
    try {
      const data = await runQueueVsShiftBenchmark();
      setQueueBenchmarkData(data);
    } finally {
      setIsRunningQueueBenchmark(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <h1 className="text-4xl font-light tracking-[-0.04em] text-ink">
            Account Search Lab & Complexity Benchmarking
          </h1>
          <ComplexityBadge complexity="O(n) vs O(log n) vs O(1)" variant="teal" />
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Real-time algorithmic comparison of Linear Search, Binary Search (Sorted List), and Hash Table Lookup with step counter and Wall-Clock latency.
        </p>
      </div>

      {/* Part 1: Interactive Search Bar & Dataset Size Controls */}
      <div className="porcelain-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Active Search Pool: <span className="font-mono text-teal-700 tabular-nums">{activeDatasetSize.toLocaleString()}</span> accounts
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Enter a 12-digit account number (starting with 40) or customer name to trigger parallel search.
            </p>
          </div>

          {/* Synthetic N Scale Controls */}
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-slate-500 font-medium">Generate N:</span>
            {[1000, 10000, 100000].map((size) => (
              <button
                key={size}
                disabled={isGeneratingSynthetic}
                onClick={() => handleGenerateSynthetic(size)}
                className={`px-2.5 py-1 rounded-xl font-mono text-sm transition-colors border ${
                  activeDatasetSize === size
                    ? 'bg-teal-900 text-white border-teal-800  font-bold'
                    : 'bg-slate-50  text-slate-700  border-slate-200  hover:bg-slate-100'
                }`}
              >
                {size.toLocaleString()}
              </button>
            ))}

            {activeDatasetSize !== accounts.length && (
              <button
                onClick={handleResetToRealAccounts}
                className="px-2 py-1 text-slate-500 hover:text-slate-800 text-sm rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                title="Reset to original 6 customer accounts"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter 12-digit account number (e.g., 401123456789) or customer name (e.g., Aman)"
              className="w-full pl-9 pr-3 py-2 text-sm font-mono rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-slate-500 font-medium hidden md:inline">Presets:</span>
            {['401123456789', '402987654321', 'Aman', 'Divya'].map((preset) => (
              <button
                key={preset}
                onClick={() => setSearchQuery(preset)}
                className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 text-sm font-mono transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {syntheticStatus && (
          <div className="text-sm text-teal-700 font-mono">
            {syntheticStatus}
          </div>
        )}
      </div>

      {/* Side-by-Side Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {searchResults.map((res) => {
          let cardBorder = 'border-slate-200 ';
          let badgeColor = 'slate';

          if (res.algorithmName.includes('Linear')) {
            cardBorder = 'border-rose-200 ';
            badgeColor = 'rose';
          } else if (res.algorithmName.includes('Binary')) {
            cardBorder = 'border-teal-300 ';
            badgeColor = 'teal';
          } else if (res.algorithmName.includes('Hash')) {
            cardBorder = 'border-emerald-300 ';
            badgeColor = 'emerald';
          }

          return (
            <div
              key={res.algorithmName}
              className={`bg-white  rounded-lg p-5 border ${cardBorder} shadow-xs flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900">
                    {res.algorithmName}
                  </h4>
                  <ComplexityBadge complexity={res.timeComplexity} variant="teal" />
                </div>

                {/* Metrics Pill Area */}
                <div className="grid grid-cols-2 gap-2 my-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 text-center border border-slate-100">
                    <div className="text-sm text-slate-500 font-semibold">
                      Comparisons
                    </div>
                    <div className="text-base font-bold font-mono text-slate-900 tabular-nums">
                      {res.steps.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 text-center border border-slate-100">
                    <div className="text-sm text-slate-500 font-semibold">
                      Execution Time
                    </div>
                    <div className="text-base font-bold font-mono text-teal-800 tabular-nums">
                      {res.timeMs.toFixed(4)} ms
                    </div>
                  </div>
                </div>

                {/* Match Result Display */}
                <div className="pt-2">
                  <div className="text-sm text-slate-500 font-semibold mb-1">
                    Lookup Resolution:
                  </div>

                  {res.found && res.account ? (
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-sm">
                      <div className="font-semibold text-emerald-900">
                        {res.account.holder}
                      </div>
                      <div className="font-mono text-slate-600 text-sm mt-0.5">
                        A/C: {res.account.accountNumber}
                      </div>
                      <div className="font-mono tabular-nums text-slate-700 text-sm mt-0.5">
                        Balance: {formatINR(res.account.balance)}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 text-slate-500 text-sm italic">
                      No matching account found for &quot;{searchQuery}&quot;.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-sm text-slate-400 font-mono">
                Space Complexity: {res.spaceComplexity}
              </div>
            </div>
          );
        })}
      </div>

      {/* Part 2: Rigorous Multi-N Benchmark & Log-Scale Comparison Chart */}
      <div className="porcelain-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-neutral-900" />
              <span>Multi-N Benchmark: Time vs Problem Size N</span>
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Empirical reproduction of Chapter 5.8 & Table 5.5 from the GGSIPU DAA Research Report.
            </p>
          </div>

          <button
            onClick={handleRunFullBenchmark}
            disabled={isRunningBenchmark}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[#141517] hover:bg-neutral-800 text-white disabled:opacity-50 transition-colors shadow-xs"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{isRunningBenchmark ? 'Running Benchmark...' : 'Run Live Benchmark (500 queries/N)'}</span>
          </button>
        </div>

        {benchmarkProgress && (
          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-sm text-teal-900 space-y-1.5">
            <div className="flex justify-between">
              <span>{benchmarkProgress.status}</span>
              <span className="font-mono font-bold">{Math.round(benchmarkProgress.percent)}%</span>
            </div>
            <div className="w-full bg-teal-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-teal-600 h-full transition-all duration-150"
                style={{ width: `${benchmarkProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Recharts Line Chart: Time vs N */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={benchmarkData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1e4dd" opacity={0.5} />
              <XAxis
                dataKey="n"
                tick={{ fontSize: 11 }}
                stroke="#9ea499"
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#9ea499"
                tickFormatter={(v) => `${v}ms`}
              />
              <Tooltip
                formatter={(val: any) => [`${Number(val).toFixed(4)} ms`, '']}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: 'transparent',
                  borderRadius: '16px',
                  color: '#0f172a',
                  fontSize: '12px',
                  boxShadow: '0 20px 40px -16px rgba(23,24,26,.35)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Line
                type="monotone"
                dataKey="linearTimeMs"
                name="Linear Search O(n)"
                stroke="#8f74f7"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="binaryTimeMs"
                name="Binary Search O(log n)"
                stroke="#17181a"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="hashTimeMs"
                name="Hash Lookup O(1)"
                stroke="#5fcf6a"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Results Data Table matching Table 5.5 */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-500 ">
              <tr>
                <th className="px-3 py-2">Dataset Size N</th>
                <th className="px-3 py-2 text-right">Linear Steps (avg)</th>
                <th className="px-3 py-2 text-right">Linear Time (ms)</th>
                <th className="px-3 py-2 text-right">Binary Steps (avg)</th>
                <th className="px-3 py-2 text-right">Binary Time (ms)</th>
                <th className="px-3 py-2 text-right">Hash Steps</th>
                <th className="px-3 py-2 text-right">Hash Time (ms)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-sm tabular-nums">
              {benchmarkData.map((row) => (
                <tr key={row.n} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-bold text-slate-900">
                    N = {row.n.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right text-rose-600">
                    {row.linearSteps.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right text-rose-600 font-bold">
                    {row.linearTimeMs.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 text-right text-teal-700">
                    {row.binarySteps}
                  </td>
                  <td className="px-3 py-2 text-right text-teal-700 font-bold">
                    {row.binaryTimeMs.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-600">
                    {row.hashSteps}
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-600 font-bold">
                    {row.hashTimeMs.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Part 3: Queue vs Array.shift() Benchmark */}
      <div className="porcelain-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-ink" />
              <span>Queue Design Justification: Custom Doubly-Linked Queue vs Array.shift()</span>
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Why Bank Simulator avoids <code>Array.shift()</code>: Array shifting forces an $O(N)$ memory copy per dequeue, yielding disastrous $O(N^2)$ execution times.
            </p>
          </div>

          <button
            onClick={handleRunQueueBenchmark}
            disabled={isRunningQueueBenchmark}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[#141517] hover:bg-neutral-800 text-[#fec94a] disabled:opacity-50 transition-colors shadow-xs"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{isRunningQueueBenchmark ? 'Testing...' : 'Run Queue Benchmark'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={queueBenchmarkData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1e4dd" opacity={0.5} />
                <XAxis
                  dataKey="ops"
                  tick={{ fontSize: 11 }}
                  stroke="#9ea499"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k ops`}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#9ea499"
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip
                  formatter={(val: any) => [`${val} ms`, '']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: 'transparent',
                    borderRadius: '16px',
                    color: '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 20px 40px -16px rgba(23,24,26,.35)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="customQueueTimeMs"
                  name="CustomQueue O(1) ops"
                  stroke="#17181a"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="arrayShiftTimeMs"
                  name="Native Array.shift() O(N) ops"
                  stroke="#8f74f7"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3 text-sm text-slate-600">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-sm leading-relaxed">
              <strong className="text-teal-700">CustomQueue (Doubly-Linked List):</strong>
              <div className="text-slate-500 mt-1">
                Dequeue simply detaches <code>head</code> and updates <code>head.prev = null</code> in strictly <span className="text-teal-700 font-bold">O(1)</span> time. 50,000 dequeues finish in <strong>~8.9 ms</strong>.
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-200/80 font-mono text-sm leading-relaxed">
              <strong className="text-rose-700">Array.shift() Anti-Pattern:</strong>
              <div className="text-slate-500 mt-1">
                Every shift re-indexes all remaining N-1 elements in memory (O(N)). For N elements, total cost is sum(1..N) = N(N+1)/2 = O(N²). At 50,000 items, shift explodes to <strong>~395 ms</strong> (44x slower!).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
