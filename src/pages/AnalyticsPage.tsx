/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian Bank Simulator - Analytics Dashboard & Single-Pass Hash Aggregator (Algorithm 4.7)
 */

import React, { useState, useMemo } from 'react';
import { useBank } from '../context/BankContext';
import { computeAnalytics } from '../lib/analytics';
import { formatINR } from '../lib/money';
import { ComplexityBadge } from '../components/common/StatusBadge';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Percent,
  Wallet,
  Activity,
  Calendar,
  X,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { currentAccount, accounts, transactions } = useBank();

  // Filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [comparisonMode, setComparisonMode] = useState<'BY_MONTH' | 'BY_ACCOUNT'>('BY_ACCOUNT');
  const [showComplexityPopover, setShowComplexityPopover] = useState<boolean>(false);

  const analytics = useMemo(() => {
    if (!currentAccount) return null;
    const filterRange = {
      from: fromDate ? new Date(fromDate) : undefined,
      to: toDate ? new Date(toDate) : undefined,
    };
    return computeAnalytics(currentAccount.id, accounts, transactions, filterRange);
  }, [currentAccount, accounts, transactions, fromDate, toDate]);

  if (!analytics || !currentAccount) return null;

  // Monthly flow data for Recharts (in Rupees)
  const monthlyFlowData = analytics.monthlySeries.map((m) => ({
    name: m.label,
    Deposits: m.deposits / 100,
    Withdrawals: m.withdrawals / 100,
    Inflow: m.income / 100,
    Outflow: m.expense / 100,
    NetCashFlow: m.netCashFlow / 100,
  }));

  // Account comparison data (matching Figure 5.5 in report!)
  const accountBarData = analytics.accountComparison.map((a) => ({
    name: a.accountName,
    Deposits: a.deposits / 100,
    Withdrawals: a.withdrawals / 100,
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Complexity Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-4xl font-light tracking-[-0.04em] text-ink">
              Financial Analytics & Metrics
            </h1>
            <ComplexityBadge complexity="O(m + g log g)" variant="teal" />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time financial metrics, cash flow trends, and counterparty transaction volumes.
          </p>
        </div>

        {/* Complexity Popover Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowComplexityPopover(!showComplexityPopover)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-xl bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How this is computed</span>
          </button>

          {showComplexityPopover && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-xl p-4 text-sm z-30 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="font-bold text-slate-900">
                  Algorithm 4.7 Formulation
                </span>
                <button
                  onClick={() => setShowComplexityPopover(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-slate-600 leading-relaxed">
                Evaluated in a single linear pass $O(m)$ over the $m$ matching completed records of this account, populating a hash map bucketed by period string (<code>%Y-%m</code>).
              </p>

              <div className="p-2 rounded-xl bg-slate-50 font-mono text-sm space-y-1">
                <div>Time: <span className="text-teal-700">O(m + g log g)</span></div>
                <div>Space: <span className="text-teal-700">O(g) buckets</span></div>
                <div className="text-sm text-slate-500">Transfers counted once: Sent as expense, Received as income.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="porcelain-card p-5">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">
            <span>Available Balance</span>
            <Wallet className="w-4 h-4 text-neutral-900" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-neutral-900 tabular-nums mt-1">
            {formatINR(analytics.currentBalance)}
          </div>
          <span className="text-xs text-emerald-800 font-medium mt-1 inline-block">
            Savings Account Active
          </span>
        </div>

        <div className="porcelain-card p-5">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">
            <span>Total Money In</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 tabular-nums mt-1">
            {formatINR(analytics.totalMoneyIn)}
          </div>
          <span className="text-xs text-neutral-500 mt-1 inline-block">
            Deposits + Received transfers
          </span>
        </div>

        <div className="porcelain-card p-5">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">
            <span>Total Money Out</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-neutral-900 tabular-nums mt-1">
            {formatINR(analytics.totalMoneyOut)}
          </div>
          <span className="text-xs text-neutral-500 mt-1 inline-block">
            Withdrawals + Sent transfers
          </span>
        </div>

        <div className="porcelain-card p-5">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">
            <span>Net Cash Flow</span>
            <Activity className="w-4 h-4 text-neutral-900" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold font-mono tabular-nums mt-1 ${
              analytics.netCashFlow >= 0
                ? 'text-emerald-700'
                : 'text-rose-700'
            }`}
          >
            {formatINR(analytics.netCashFlow, { showSign: true })}
          </div>
          <span className="text-xs text-neutral-500 mt-1 inline-block">
            Inflow minus Outflow
          </span>
        </div>
      </div>

      {/* Secondary Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-sm">
          <div className="text-slate-500">Transaction Volume</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {analytics.transactionCount} records
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-sm">
          <div className="text-slate-500">Reversal / Undo Rate</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {analytics.reversalRatePercent}%
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-sm">
          <div className="text-slate-500">Avg. Deposit Ticket</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {formatINR(analytics.avgDepositPaise)}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-sm">
          <div className="text-slate-500">Avg. Withdrawal Ticket</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {formatINR(analytics.avgWithdrawalPaise)}
          </div>
        </div>
      </div>

      {/* Primary Chart: DEPOSITS vs WITHDRAWALS Grouped Bar Chart */}
      <div className="porcelain-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Deposits vs Withdrawals Comparison
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {comparisonMode === 'BY_ACCOUNT'
                ? 'Total deposits vs withdrawals per customer account (Figure 5.5 in DAA Report)'
                : 'Monthly deposit vs withdrawal volume series'}
            </p>
          </div>

          {/* Toggle between By Account and By Month */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-sm">
            <button
              onClick={() => setComparisonMode('BY_ACCOUNT')}
              className={`px-3 py-1 font-medium rounded-xl transition-colors ${
                comparisonMode === 'BY_ACCOUNT'
                  ? 'bg-white  text-teal-800  shadow-xs font-semibold'
                  : 'text-slate-600  hover:text-slate-900'
              }`}
            >
              By Account (Figure 5.5)
            </button>
            <button
              onClick={() => setComparisonMode('BY_MONTH')}
              className={`px-3 py-1 font-medium rounded-xl transition-colors ${
                comparisonMode === 'BY_MONTH'
                  ? 'bg-white  text-teal-800  shadow-xs font-semibold'
                  : 'text-slate-600  hover:text-slate-900'
              }`}
            >
              By Month
            </button>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={comparisonMode === 'BY_ACCOUNT' ? accountBarData : monthlyFlowData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1e4dd" opacity={0.5} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                stroke="#9ea499"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#9ea499"
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: 'transparent',
                  borderRadius: '16px',
                  color: '#0f172a',
                  fontSize: '12px',
                  boxShadow: '0 20px 40px -16px rgba(23,24,26,.35)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="Deposits" fill="#17181a" radius={[4, 4, 0, 0]} name="Deposits (INR)" />
              <Bar dataKey="Withdrawals" fill="#8f74f7" radius={[4, 4, 0, 0]} name="Withdrawals (INR)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Charts: Transaction-Type Distribution Donut & Top Counterparties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Type Distribution Donut */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            Transaction Type Breakdown
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            Categorized volume distribution across {analytics.transactionCount} records
          </p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.typeDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {analytics.typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val} txs (${formatINR(item.payload.amountPaise)})`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: 'transparent',
                    borderRadius: '16px',
                    color: '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 20px 40px -16px rgba(23,24,26,.35)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Counterparties Table */}
        <div className="porcelain-card p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            Top Transfer Counterparties
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            Accounts with highest bilateral transfer volumes
          </p>

          {analytics.topCounterparties.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No transfers recorded yet with counterparties.
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.topCounterparties.map((cp, idx) => (
                <div
                  key={cp.accountNumber}
                  className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-none"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {cp.name}
                      </div>
                      <div className="text-sm font-mono text-slate-500">
                        {cp.accountNumber}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900 tabular-nums">
                      {formatINR(cp.totalVolumePaise)}
                    </div>
                    <div className="text-sm text-slate-500">
                      {cp.transfersCount} transfer{cp.transfersCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
