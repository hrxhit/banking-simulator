/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian Bank Simulator - Analytics Aggregation Engine (Algorithm 4.7)
 *
 * Evaluates single-pass hash-table aggregation O(m) over m user transactions,
 * followed by O(g log g) sort of g time buckets.
 */

import { Transaction, Account } from '../types';

export interface MonthlyAggregate {
  period: string; // e.g., "2026-05"
  label: string; // e.g., "May 2026"
  deposits: number; // in paise
  withdrawals: number; // in paise
  income: number; // in paise (DEPOSIT + TRANSFER_RECEIVED)
  expense: number; // in paise (WITHDRAWAL + TRANSFER_SENT)
  netCashFlow: number; // income - expense
  count: number;
}

export interface AccountVolumeAggregate {
  accountName: string;
  accountNumber: string;
  deposits: number;
  withdrawals: number;
}

export interface TypeDistributionItem {
  name: string;
  value: number; // count
  amountPaise: number;
  color: string;
}

export interface TopCounterparty {
  name: string;
  accountNumber: string;
  transfersCount: number;
  totalVolumePaise: number;
}

export interface AnalyticsSummary {
  currentBalance: number;
  totalMoneyIn: number;
  totalMoneyOut: number;
  netCashFlow: number;
  transactionCount: number;
  reversalRatePercent: number;
  avgDepositPaise: number;
  avgWithdrawalPaise: number;
  monthlySeries: MonthlyAggregate[];
  accountComparison: AccountVolumeAggregate[];
  typeDistribution: TypeDistributionItem[];
  topCounterparties: TopCounterparty[];
  complexityNote: {
    time: string;
    space: string;
    technique: string;
  };
}

/**
 * Computes complete analytics summary in a single pass O(m) with O(g log g) sorting.
 * Follows Algorithm 4.7 from the DAA Research Report.
 */
export function computeAnalytics(
  accountId: string,
  allAccounts: Account[],
  allTransactions: Transaction[],
  filterRange?: { from?: Date; to?: Date }
): AnalyticsSummary {
  // 1. Filter user's transactions
  const userTxs = allTransactions.filter((tx) => {
    if (tx.accountId !== accountId) return false;
    if (filterRange?.from && new Date(tx.createdAt) < filterRange.from) return false;
    if (filterRange?.to && new Date(tx.createdAt) > filterRange.to) return false;
    return true;
  });

  const currentAcc = allAccounts.find((a) => a.id === accountId);
  const currentBalance = currentAcc ? currentAcc.balance : 0;

  let totalMoneyIn = 0;
  let totalMoneyOut = 0;
  let depositCount = 0;
  let depositSum = 0;
  let withdrawalCount = 0;
  let withdrawalSum = 0;
  let reversedCount = 0;

  // Hash table for O(m) monthly aggregation (Algorithm 4.7)
  const monthlyHash = new Map<string, MonthlyAggregate>();
  // Hash map for counterparties
  const counterpartyMap = new Map<string, { name: string; number: string; count: number; volume: number }>();
  // Distribution counts
  const typeCounts = {
    DEPOSIT: { count: 0, amount: 0 },
    WITHDRAWAL: { count: 0, amount: 0 },
    TRANSFER_SENT: { count: 0, amount: 0 },
    TRANSFER_RECEIVED: { count: 0, amount: 0 },
  };

  for (let i = 0; i < userTxs.length; i++) {
    const tx = userTxs[i];

    if (tx.status === 'REVERSED') {
      reversedCount++;
    }

    if (tx.status !== 'COMPLETED') {
      continue;
    }

    // Type distribution
    if (typeCounts[tx.type]) {
      typeCounts[tx.type].count++;
      typeCounts[tx.type].amount += tx.amount;
    }

    // Money In vs Money Out
    if (tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_RECEIVED') {
      totalMoneyIn += tx.amount;
    }
    if (tx.type === 'WITHDRAWAL' || tx.type === 'TRANSFER_SENT') {
      totalMoneyOut += tx.amount;
    }

    // Averages
    if (tx.type === 'DEPOSIT') {
      depositCount++;
      depositSum += tx.amount;
    } else if (tx.type === 'WITHDRAWAL') {
      withdrawalCount++;
      withdrawalSum += tx.amount;
    }

    // Counterparty tracking
    if (tx.relatedAccountNumber) {
      const cKey = tx.relatedAccountNumber;
      const existing = counterpartyMap.get(cKey) || {
        name: tx.counterpartyName || 'Unknown Contact',
        number: tx.relatedAccountNumber,
        count: 0,
        volume: 0,
      };
      existing.count++;
      existing.volume += tx.amount;
      counterpartyMap.set(cKey, existing);
    }

    // Monthly bucket key (e.g., "2026-05")
    const d = new Date(tx.createdAt);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

    let entry = monthlyHash.get(yearMonth);
    if (!entry) {
      entry = {
        period: yearMonth,
        label,
        deposits: 0,
        withdrawals: 0,
        income: 0,
        expense: 0,
        netCashFlow: 0,
        count: 0,
      };
      monthlyHash.set(yearMonth, entry);
    }

    entry.count++;
    if (tx.type === 'DEPOSIT') {
      entry.deposits += tx.amount;
      entry.income += tx.amount;
    } else if (tx.type === 'WITHDRAWAL') {
      entry.withdrawals += tx.amount;
      entry.expense += tx.amount;
    } else if (tx.type === 'TRANSFER_RECEIVED') {
      entry.income += tx.amount;
    } else if (tx.type === 'TRANSFER_SENT') {
      entry.expense += tx.amount;
    }
    entry.netCashFlow = entry.income - entry.expense;
  }

  // Sort monthly buckets chronologically: O(g log g) where g <= 12
  const monthlySeries = Array.from(monthlyHash.values()).sort((a, b) =>
    a.period.localeCompare(b.period)
  );

  // Grouped deposits vs withdrawals per account across all users (matching Figure 5.5 in report!)
  const accountComparison: AccountVolumeAggregate[] = allAccounts.map((acc) => {
    let dep = 0;
    let wth = 0;
    allTransactions.forEach((tx) => {
      if (tx.accountId === acc.id && tx.status === 'COMPLETED') {
        if (tx.type === 'DEPOSIT') dep += tx.amount;
        if (tx.type === 'WITHDRAWAL') wth += tx.amount;
      }
    });
    return {
      accountName: acc.holder.split(' ')[0], // First name e.g. Aman, Bhavna
      accountNumber: acc.accountNumber,
      deposits: dep,
      withdrawals: wth,
    };
  });

  // Type distribution array
  const typeDistribution: TypeDistributionItem[] = [
    { name: 'Deposits', value: typeCounts.DEPOSIT.count, amountPaise: typeCounts.DEPOSIT.amount, color: '#5fcf6a' }, // mint
    { name: 'Withdrawals', value: typeCounts.WITHDRAWAL.count, amountPaise: typeCounts.WITHDRAWAL.amount, color: '#17181a' }, // ink
    { name: 'Transfers Sent', value: typeCounts.TRANSFER_SENT.count, amountPaise: typeCounts.TRANSFER_SENT.amount, color: '#8f74f7' }, // lilac
    { name: 'Transfers Received', value: typeCounts.TRANSFER_RECEIVED.count, amountPaise: typeCounts.TRANSFER_RECEIVED.amount, color: '#9ea499' }, // sage grey
  ].filter((item) => item.value > 0);

  // Top counterparties
  const topCounterparties: TopCounterparty[] = Array.from(counterpartyMap.values())
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      accountNumber: c.number,
      transfersCount: c.count,
      totalVolumePaise: c.volume,
    }));

  const reversalRate = userTxs.length > 0 ? (reversedCount / userTxs.length) * 100 : 0;

  return {
    currentBalance,
    totalMoneyIn,
    totalMoneyOut,
    netCashFlow: totalMoneyIn - totalMoneyOut,
    transactionCount: userTxs.length,
    reversalRatePercent: Number(reversalRate.toFixed(1)),
    avgDepositPaise: depositCount > 0 ? Math.round(depositSum / depositCount) : 0,
    avgWithdrawalPaise: withdrawalCount > 0 ? Math.round(withdrawalSum / withdrawalCount) : 0,
    monthlySeries,
    accountComparison,
    typeDistribution,
    topCounterparties,
    complexityNote: {
      time: 'O(m + g log g) where m is matching records and g is month buckets',
      space: 'O(g) for the monthly group-by hash table',
      technique: 'Single-pass linear scan with hash map accumulation (Algorithm 4.7)',
    },
  };
}
