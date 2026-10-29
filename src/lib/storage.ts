/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian Bank Simulator - Local Storage Persistence & Comprehensive Seed Data
 */

import { Account, Transaction } from '../types';

export interface StorageState {
  accounts: Account[];
  transactions: Transaction[];
  pendingQueue: PendingQueueItem[];
  currentUserEmail: string;
}

export interface PendingQueueItem {
  id: string;
  reference: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  senderAccountId: string;
  senderAccountNumber: string;
  senderHolder: string;
  recipientAccountNumber?: string;
  recipientHolder?: string;
  amount: number; // paise
  description: string;
  idempotencyKey: string;
  queuedAt: string;
}

const STORAGE_KEY = 'meridian_bank_simulator_state_v1';

/**
 * Las Vegas Randomized Account Number Generator (Algorithm 4.5 from the report)
 * Generates a 12-digit number starting with "40" and guarantees uniqueness.
 * Time Complexity: Expected O(log N)
 */
export function generateUniqueAccountNumber(existingAccounts: Account[]): string {
  const existingSet = new Set(existingAccounts.map((a) => a.accountNumber));
  let attempts = 0;
  while (attempts < 1000) {
    attempts++;
    let digits = '40';
    for (let i = 0; i < 10; i++) {
      digits += Math.floor(Math.random() * 10).toString();
    }
    if (!existingSet.has(digits)) {
      return digits;
    }
  }
  // Fallback fallback if 1000 collisions happen
  return '40' + Date.now().toString().slice(-10);
}

/**
 * Creates the initial seed dataset: 6 accounts and ~40 realistic transactions spread over 6 months.
 */
export function createSeedData(): StorageState {
  const now = new Date('2026-10-29T09:30:00.000Z');

  // Helper for generating dates offset by days
  const dateOffset = (daysAgo: number, hoursOffset: number = 0): string => {
    const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 + hoursOffset * 60 * 60 * 1000);
    return d.toISOString();
  };

  const accounts: Account[] = [
    {
      id: 'acc_aman_01',
      holder: 'Aman Gupta',
      email: 'aman@banksimulator.demo',
      accountNumber: '401123456789',
      balance: 4850000, // Rs. 48,500.00
      status: 'ACTIVE',
      createdAt: dateOffset(180),
    },
    {
      id: 'acc_bhavna_02',
      holder: 'Bhavna Sharma',
      email: 'bhavna@banksimulator.demo',
      accountNumber: '402987654321',
      balance: 3125000, // Rs. 31,250.00
      status: 'ACTIVE',
      createdAt: dateOffset(175),
    },
    {
      id: 'acc_chetan_03',
      holder: 'Chetan Patel',
      email: 'chetan@banksimulator.demo',
      accountNumber: '403456789012',
      balance: 1980000, // Rs. 19,800.00
      status: 'ACTIVE',
      createdAt: dateOffset(160),
    },
    {
      id: 'acc_divya_04',
      holder: 'Divya Reddy',
      email: 'divya@banksimulator.demo',
      accountNumber: '404112233445',
      balance: 5400000, // Rs. 54,000.00
      status: 'ACTIVE',
      createdAt: dateOffset(150),
    },
    {
      id: 'acc_eshan_05',
      holder: 'Eshan Sen',
      email: 'eshan@banksimulator.demo',
      accountNumber: '405998877665',
      balance: 2750000, // Rs. 27,500.00
      status: 'ACTIVE',
      createdAt: dateOffset(140),
    },
    {
      id: 'acc_farah_06',
      holder: 'Farah Khan',
      email: 'farah@banksimulator.demo',
      accountNumber: '406334455667',
      balance: 3900000, // Rs. 39,000.00
      status: 'ACTIVE',
      createdAt: dateOffset(130),
    },
  ];

  // We build realistic transaction histories preserving exact ledger agreements:
  // Each account starts with welcome credit of Rs. 10,000 (1,000,000 paise).
  const transactions: Transaction[] = [];
  let refCount = 1000;
  const nextRef = () => `TXN-${(++refCount).toString().padStart(6, '0')}`;

  // Running balances tracked during seed construction
  const balances: Record<string, number> = {
    acc_aman_01: 0,
    acc_bhavna_02: 0,
    acc_chetan_03: 0,
    acc_divya_04: 0,
    acc_eshan_05: 0,
    acc_farah_06: 0,
  };

  // 1. Initial Rs. 10,000 Welcome Credits for all 6 accounts
  accounts.forEach((acc, idx) => {
    const before = 0;
    const amount = 1000000; // Rs. 10,000
    const after = amount;
    balances[acc.id] = after;

    transactions.push({
      id: `seed_tx_${acc.id}_welcome`,
      reference: nextRef(),
      accountId: acc.id,
      type: 'DEPOSIT',
      amount,
      balanceBefore: before,
      balanceAfter: after,
      description: 'Account Opening Welcome Demonstration Credit',
      status: 'COMPLETED',
      idempotencyKey: `seed_welcome_${acc.id}`,
      createdAt: dateOffset(180 - idx * 5, 1),
    });
  });

  // Helper to add deposit
  const recordDeposit = (accId: string, amount: number, desc: string, daysAgo: number) => {
    const before = balances[accId];
    const after = before + amount;
    balances[accId] = after;
    transactions.push({
      id: `seed_tx_${nextRef()}`,
      reference: nextRef(),
      accountId: accId,
      type: 'DEPOSIT',
      amount,
      balanceBefore: before,
      balanceAfter: after,
      description: desc,
      status: 'COMPLETED',
      createdAt: dateOffset(daysAgo, 2),
    });
  };

  // Helper to add withdrawal
  const recordWithdrawal = (accId: string, amount: number, desc: string, daysAgo: number) => {
    const before = balances[accId];
    const after = before - amount;
    balances[accId] = after;
    transactions.push({
      id: `seed_tx_${nextRef()}`,
      reference: nextRef(),
      accountId: accId,
      type: 'WITHDRAWAL',
      amount,
      balanceBefore: before,
      balanceAfter: after,
      description: desc,
      status: 'COMPLETED',
      createdAt: dateOffset(daysAgo, 4),
    });
  };

  // Helper to add transfer pair
  const recordTransfer = (
    fromAcc: Account,
    toAcc: Account,
    amount: number,
    desc: string,
    daysAgo: number
  ) => {
    const fromBefore = balances[fromAcc.id];
    const fromAfter = fromBefore - amount;
    balances[fromAcc.id] = fromAfter;

    const toBefore = balances[toAcc.id];
    const toAfter = toBefore + amount;
    balances[toAcc.id] = toAfter;

    const groupId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const idempotency = `idemp_transfer_${groupId}`;

    transactions.push({
      id: `seed_tx_${nextRef()}`,
      reference: nextRef(),
      accountId: fromAcc.id,
      type: 'TRANSFER_SENT',
      amount,
      balanceBefore: fromBefore,
      balanceAfter: fromAfter,
      relatedAccountNumber: toAcc.accountNumber,
      counterpartyName: toAcc.holder,
      transferGroupId: groupId,
      idempotencyKey: idempotency,
      description: desc,
      status: 'COMPLETED',
      createdAt: dateOffset(daysAgo, 5),
    });

    transactions.push({
      id: `seed_tx_${nextRef()}`,
      reference: nextRef(),
      accountId: toAcc.id,
      type: 'TRANSFER_RECEIVED',
      amount,
      balanceBefore: toBefore,
      balanceAfter: toAfter,
      relatedAccountNumber: fromAcc.accountNumber,
      counterpartyName: fromAcc.holder,
      transferGroupId: groupId,
      idempotencyKey: `${idempotency}_rcv`,
      description: desc,
      status: 'COMPLETED',
      createdAt: dateOffset(daysAgo, 5),
    });
  };

  // Chronological realistic banking activity
  // Month 5 ago (~150 days)
  recordDeposit('acc_aman_01', 2500000, 'Consulting retainer fee deposit', 145);
  recordDeposit('acc_bhavna_02', 1500000, 'Direct client payment', 142);
  recordWithdrawal('acc_aman_01', 400000, 'ATM cash withdrawal - GK2 Branch', 140);
  recordTransfer(accounts[0], accounts[1], 500000, 'Cloud infrastructure share', 135);

  // Month 4 ago (~120 days)
  recordDeposit('acc_divya_04', 3000000, 'Project milestone 1 payout', 122);
  recordDeposit('acc_eshan_05', 1200000, 'Freelance UI design retainer', 118);
  recordTransfer(accounts[1], accounts[2], 350000, 'Office supplies reimbursement', 115);
  recordWithdrawal('acc_bhavna_02', 250000, 'Utility payment - Power bill', 110);
  recordDeposit('acc_farah_06', 2000000, 'Quarterly dividends', 105);

  // Month 3 ago (~90 days)
  recordDeposit('acc_aman_01', 3500000, 'Software licensing royalties', 92);
  recordTransfer(accounts[0], accounts[3], 1200000, 'Q2 contractor invoice', 88);
  recordWithdrawal('acc_aman_01', 500000, 'Equipment purchase - Monitor', 84);
  recordTransfer(accounts[3], accounts[4], 800000, 'Design assets licensing', 80);
  recordDeposit('acc_chetan_03', 1500000, 'Fixed deposit interest credit', 75);

  // Month 2 ago (~60 days)
  recordDeposit('acc_bhavna_02', 1800000, 'Retainer fee - Brand consultancy', 62);
  recordTransfer(accounts[4], accounts[0], 450000, 'Backend API consulting', 58);
  recordWithdrawal('acc_divya_04', 600000, 'Workstation upgrade hardware', 54);
  recordTransfer(accounts[0], accounts[5], 600000, 'Videography and media sprint', 48);
  recordDeposit('acc_farah_06', 1500000, 'Studio shoot advance', 45);

  // Month 1 ago (~30 days)
  recordDeposit('acc_aman_01', 2000000, 'Performance bonus credit', 32);
  recordWithdrawal('acc_eshan_05', 300000, 'Software annual subscription', 28);
  recordTransfer(accounts[5], accounts[1], 400000, 'Design audit consultancy', 24);
  recordWithdrawal('acc_aman_01', 700000, 'Travel & conference allowance', 20);
  recordDeposit('acc_divya_04', 2200000, 'Retainer payment - Enterprise SLA', 18);

  // Recent 10 days
  recordTransfer(accounts[2], accounts[0], 250000, 'Hosting server co-location', 12);
  recordDeposit('acc_aman_01', 1500000, 'Client advisory retainer', 8);
  recordWithdrawal('acc_aman_01', 600000, 'Mobile banking vendor checkout', 5);
  recordTransfer(accounts[1], accounts[0], 800000, 'Q3 shared studio space rent', 3);
  recordDeposit('acc_chetan_03', 500000, 'Consulting workshop honorarium', 2);

  // Ensure accounts balance property matches the exact ledger sum
  accounts.forEach((acc) => {
    acc.balance = balances[acc.id];
  });

  // Sort transactions chronologically (newest first for standard view)
  transactions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Seed 3 realistic pending transactions in the processing queue
  const pendingQueue: PendingQueueItem[] = [
    {
      id: 'q_pending_1',
      reference: 'Q-00101',
      type: 'DEPOSIT',
      senderAccountId: accounts[0].id,
      senderAccountNumber: accounts[0].accountNumber,
      senderHolder: accounts[0].holder,
      amount: 150000, // Rs. 1,500.00
      description: 'Pending NEFT demonstration settlement',
      idempotencyKey: 'idemp_q_001',
      queuedAt: dateOffset(0, -2),
    },
    {
      id: 'q_pending_2',
      reference: 'Q-00102',
      type: 'TRANSFER',
      senderAccountId: accounts[0].id,
      senderAccountNumber: accounts[0].accountNumber,
      senderHolder: accounts[0].holder,
      recipientAccountNumber: accounts[1].accountNumber,
      recipientHolder: accounts[1].holder,
      amount: 250000, // Rs. 2,500.00
      description: 'Demonstration shared infrastructure fund',
      idempotencyKey: 'idemp_q_002',
      queuedAt: dateOffset(0, -1),
    },
    {
      id: 'q_pending_3',
      reference: 'Q-00103',
      type: 'WITHDRAWAL',
      senderAccountId: accounts[0].id,
      senderAccountNumber: accounts[0].accountNumber,
      senderHolder: accounts[0].holder,
      amount: 50000, // Rs. 500.00
      description: 'Scheduled debit for simulation testing',
      idempotencyKey: 'idemp_q_003',
      queuedAt: dateOffset(0, 0),
    },
  ];

  return {
    accounts,
    transactions,
    pendingQueue,
    currentUserEmail: 'aman@banksimulator.demo',
  };
}

/**
 * Loads the application state from localStorage with safe fallback to seed data.
 */
export function loadState(): StorageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createSeedData();
      saveState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.accounts) || !Array.isArray(parsed.transactions)) {
      throw new Error('Corrupted storage schema');
    }
    return parsed as StorageState;
  } catch (err) {
    console.warn('Failed to load state from localStorage, falling back to seed:', err);
    const initial = createSeedData();
    saveState(initial);
    return initial;
  }
}

/**
 * Persists the application state to localStorage.
 */
export function saveState(state: StorageState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('LocalStorage write failed:', err);
    return false;
  }
}

/**
 * Resets all demo data to the initial state.
 */
export function resetDemoData(): StorageState {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear storage:', err);
  }
  const fresh = createSeedData();
  saveState(fresh);
  return fresh;
}
