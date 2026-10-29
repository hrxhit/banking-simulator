/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian Bank Simulator - Atomic Ledger & Invariant Enforcement Engine
 *
 * Implements Algorithms 4.2 (Atomic Conditional Balance Update),
 * 4.3 (Idempotent Execution), and 4.4 (Transfer with Atomicity & Compensation)
 * with strict verification of Invariants I1, I2, I3, and I4.
 */

import { Account, Transaction, InvariantCheckResult, TransactionStatus } from '../types';
import { PendingQueueItem } from './storage';

export interface LedgerExecutionResult {
  success: boolean;
  transactionsCreated: Transaction[];
  updatedAccounts: Account[];
  error?: string;
}

/**
 * Generates an alphanumeric transaction reference e.g., TXN-000492
 */
let refCounter = Math.floor(Math.random() * 8000) + 1000;
export function generateReference(): string {
  refCounter++;
  return `TXN-${refCounter.toString().padStart(6, '0')}`;
}

/**
 * Algorithm 4.2: Atomic Conditional Balance Update
 * Deducts or adds funds. For debits (delta < 0), enforces balance >= -delta condition.
 * Time Complexity: O(1) in-memory / O(log N) in indexed DB
 * Space Complexity: O(1)
 */
export function applyBalance(
  account: Account,
  deltaPaise: number
): { updatedAccount: Account; balanceBefore: number; balanceAfter: number } {
  if (account.status !== 'ACTIVE') {
    throw new Error(`Account ${account.accountNumber} is not active (status: ${account.status}).`);
  }

  const balanceBefore = account.balance;

  // Invariant I1 check: for debits, ensure sufficient balance
  if (deltaPaise < 0 && balanceBefore < -deltaPaise) {
    throw new Error(
      `Insufficient balance: current balance is ${balanceBefore} paise, attempted debit of ${-deltaPaise} paise.`
    );
  }

  const balanceAfter = balanceBefore + deltaPaise;
  const updatedAccount: Account = {
    ...account,
    balance: balanceAfter,
  };

  return { updatedAccount, balanceBefore, balanceAfter };
}

/**
 * Checks idempotency key to prevent double application (Algorithm 4.3).
 * Time Complexity: O(n) scan in memory or O(log n) with index
 */
export function findIdempotentTransaction(
  transactions: Transaction[],
  accountId: string,
  key?: string
): Transaction | undefined {
  if (!key) return undefined;
  return transactions.find(
    (tx) =>
      tx.accountId === accountId &&
      tx.idempotencyKey === key &&
      tx.status === 'COMPLETED'
  );
}

/**
 * Executes a pending transaction queue item (FIFO processing).
 * Handles DEPOSIT, WITHDRAWAL, and TRANSFER atomically with compensation.
 */
export function processPendingQueueItem(
  item: PendingQueueItem,
  currentAccounts: Account[],
  currentTransactions: Transaction[]
): LedgerExecutionResult {
  const accountsMap = new Map<string, Account>(currentAccounts.map((a) => [a.id, a]));
  const sender = accountsMap.get(item.senderAccountId);

  if (!sender) {
    return {
      success: false,
      transactionsCreated: [],
      updatedAccounts: [],
      error: `Sender account ID ${item.senderAccountId} not found.`,
    };
  }

  // Idempotency fast path (Algorithm 4.3)
  if (item.idempotencyKey) {
    const prior = findIdempotentTransaction(currentTransactions, sender.id, item.idempotencyKey);
    if (prior) {
      return {
        success: true,
        transactionsCreated: [prior],
        updatedAccounts: [sender],
      };
    }
  }

  const nowIso = new Date().toISOString();

  // 1. Process DEPOSIT
  if (item.type === 'DEPOSIT') {
    try {
      const { updatedAccount, balanceBefore, balanceAfter } = applyBalance(sender, item.amount);
      const tx: Transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        reference: item.reference || generateReference(),
        accountId: sender.id,
        type: 'DEPOSIT',
        amount: item.amount,
        balanceBefore,
        balanceAfter,
        description: item.description || 'Cash / Electronic Deposit',
        status: 'COMPLETED',
        idempotencyKey: item.idempotencyKey,
        createdAt: nowIso,
      };

      return {
        success: true,
        transactionsCreated: [tx],
        updatedAccounts: [updatedAccount],
      };
    } catch (err: any) {
      return {
        success: false,
        transactionsCreated: [],
        updatedAccounts: [],
        error: err.message || 'Deposit failed.',
      };
    }
  }

  // 2. Process WITHDRAWAL
  if (item.type === 'WITHDRAWAL') {
    try {
      const { updatedAccount, balanceBefore, balanceAfter } = applyBalance(sender, -item.amount);
      const tx: Transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        reference: item.reference || generateReference(),
        accountId: sender.id,
        type: 'WITHDRAWAL',
        amount: item.amount,
        balanceBefore,
        balanceAfter,
        description: item.description || 'Cash / Merchant Withdrawal',
        status: 'COMPLETED',
        idempotencyKey: item.idempotencyKey,
        createdAt: nowIso,
      };

      return {
        success: true,
        transactionsCreated: [tx],
        updatedAccounts: [updatedAccount],
      };
    } catch (err: any) {
      return {
        success: false,
        transactionsCreated: [],
        updatedAccounts: [],
        error: err.message || 'Withdrawal rejected (insufficient funds).',
      };
    }
  }

  // 3. Process TRANSFER (Algorithm 4.4: Atomicity & Compensation)
  if (item.type === 'TRANSFER') {
    if (!item.recipientAccountNumber) {
      return {
        success: false,
        transactionsCreated: [],
        updatedAccounts: [],
        error: 'Recipient account number is required for transfer.',
      };
    }

    const recipient = currentAccounts.find(
      (a) => a.accountNumber === item.recipientAccountNumber
    );

    if (!recipient) {
      return {
        success: false,
        transactionsCreated: [],
        updatedAccounts: [],
        error: `Recipient account ${item.recipientAccountNumber} does not exist.`,
      };
    }

    if (sender.id === recipient.id) {
      return {
        success: false,
        transactionsCreated: [],
        updatedAccounts: [],
        error: 'Cannot transfer funds to yourself.',
      };
    }

    let debitedSender: Account | null = null;
    let creditedRecipient: Account | null = null;

    try {
      // Step A: Debit sender atomically
      const senderResult = applyBalance(sender, -item.amount);
      debitedSender = senderResult.updatedAccount;

      // Step B: Credit recipient atomically
      const recipientResult = applyBalance(recipient, item.amount);
      creditedRecipient = recipientResult.updatedAccount;

      // Step C: Insert both double-entry ledger records sharing a transferGroupId
      const transferGroupId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const sentRef = item.reference || generateReference();
      const rcvRef = generateReference();

      const txSent: Transaction = {
        id: `tx_${Date.now()}_s_${Math.random().toString(36).substring(2, 6)}`,
        reference: sentRef,
        accountId: sender.id,
        type: 'TRANSFER_SENT',
        amount: item.amount,
        balanceBefore: senderResult.balanceBefore,
        balanceAfter: senderResult.balanceAfter,
        relatedAccountNumber: recipient.accountNumber,
        counterpartyName: recipient.holder,
        transferGroupId,
        idempotencyKey: item.idempotencyKey,
        description: item.description || `Transfer to ${recipient.holder}`,
        status: 'COMPLETED',
        createdAt: nowIso,
      };

      const txReceived: Transaction = {
        id: `tx_${Date.now()}_r_${Math.random().toString(36).substring(2, 6)}`,
        reference: rcvRef,
        accountId: recipient.id,
        type: 'TRANSFER_RECEIVED',
        amount: item.amount,
        balanceBefore: recipientResult.balanceBefore,
        balanceAfter: recipientResult.balanceAfter,
        relatedAccountNumber: sender.accountNumber,
        counterpartyName: sender.holder,
        transferGroupId,
        idempotencyKey: item.idempotencyKey ? `${item.idempotencyKey}_recv` : undefined,
        description: item.description || `Transfer from ${sender.holder}`,
        status: 'COMPLETED',
        createdAt: nowIso,
      };

      return {
        success: true,
        transactionsCreated: [txSent, txReceived],
        updatedAccounts: [debitedSender, creditedRecipient],
      };
    } catch (err: any) {
      // Compensation step: rollback debited sender if credit failed
      if (debitedSender && !creditedRecipient) {
        console.warn('Compensating sender debit due to downstream failure in transfer');
        // debitedSender rolled back to original sender
      }
      return {
        success: false,
        transactionsCreated: [],
        updatedAccounts: [],
        error: err.message || 'Transfer failed.',
      };
    }
  }

  return {
    success: false,
    transactionsCreated: [],
    updatedAccounts: [],
    error: 'Unrecognized transaction type.',
  };
}

/**
 * Reverses (undos) the top transaction popped from the account's recent stack.
 * Atomically compensates balances and marks transaction(s) as REVERSED.
 */
export function undoTransaction(
  targetTx: Transaction,
  currentAccounts: Account[],
  currentTransactions: Transaction[]
): {
  success: boolean;
  updatedAccounts: Account[];
  updatedTransactions: Transaction[];
  auditTransaction?: Transaction;
  error?: string;
} {
  if (targetTx.status !== 'COMPLETED') {
    return {
      success: false,
      updatedAccounts: currentAccounts,
      updatedTransactions: currentTransactions,
      error: `Cannot undo a transaction with status ${targetTx.status}.`,
    };
  }

  const nowIso = new Date().toISOString();
  const accountsMap = new Map<string, Account>(currentAccounts.map((a) => [a.id, { ...a }]));
  const txList = [...currentTransactions];

  // Case 1: DEPOSIT reversal (reversing a deposit requires debiting the account)
  if (targetTx.type === 'DEPOSIT') {
    const acc = accountsMap.get(targetTx.accountId);
    if (!acc) return { success: false, updatedAccounts: currentAccounts, updatedTransactions: currentTransactions, error: 'Account not found.' };

    if (acc.balance < targetTx.amount) {
      return {
        success: false,
        updatedAccounts: currentAccounts,
        updatedTransactions: currentTransactions,
        error: `Cannot undo deposit: current balance (₹${acc.balance / 100}) is lower than deposit amount (₹${targetTx.amount / 100}).`,
      };
    }

    const { updatedAccount, balanceBefore, balanceAfter } = applyBalance(acc, -targetTx.amount);
    accountsMap.set(acc.id, updatedAccount);

    // Mark original tx as REVERSED
    const txIndex = txList.findIndex((t) => t.id === targetTx.id);
    const reversalRef = generateReference();
    if (txIndex !== -1) {
      txList[txIndex] = {
        ...txList[txIndex],
        status: 'REVERSED',
        reversedBy: reversalRef,
      };
    }

    const auditTx: Transaction = {
      id: `tx_${Date.now()}_rev`,
      reference: reversalRef,
      accountId: acc.id,
      type: 'WITHDRAWAL',
      amount: targetTx.amount,
      balanceBefore,
      balanceAfter,
      description: `Reversal of Deposit ${targetTx.reference}`,
      status: 'COMPLETED',
      createdAt: nowIso,
    };
    txList.unshift(auditTx);

    return {
      success: true,
      updatedAccounts: Array.from(accountsMap.values()),
      updatedTransactions: txList,
      auditTransaction: auditTx,
    };
  }

  // Case 2: WITHDRAWAL reversal (reversing a withdrawal requires crediting the account back)
  if (targetTx.type === 'WITHDRAWAL') {
    const acc = accountsMap.get(targetTx.accountId);
    if (!acc) return { success: false, updatedAccounts: currentAccounts, updatedTransactions: currentTransactions, error: 'Account not found.' };

    const { updatedAccount, balanceBefore, balanceAfter } = applyBalance(acc, targetTx.amount);
    accountsMap.set(acc.id, updatedAccount);

    const txIndex = txList.findIndex((t) => t.id === targetTx.id);
    const reversalRef = generateReference();
    if (txIndex !== -1) {
      txList[txIndex] = {
        ...txList[txIndex],
        status: 'REVERSED',
        reversedBy: reversalRef,
      };
    }

    const auditTx: Transaction = {
      id: `tx_${Date.now()}_rev`,
      reference: reversalRef,
      accountId: acc.id,
      type: 'DEPOSIT',
      amount: targetTx.amount,
      balanceBefore,
      balanceAfter,
      description: `Reversal of Withdrawal ${targetTx.reference}`,
      status: 'COMPLETED',
      createdAt: nowIso,
    };
    txList.unshift(auditTx);

    return {
      success: true,
      updatedAccounts: Array.from(accountsMap.values()),
      updatedTransactions: txList,
      auditTransaction: auditTx,
    };
  }

  // Case 3: TRANSFER reversal (reverses both sides atomically using transferGroupId)
  if (targetTx.type === 'TRANSFER_SENT' || targetTx.type === 'TRANSFER_RECEIVED') {
    const groupId = targetTx.transferGroupId;
    if (!groupId) {
      return {
        success: false,
        updatedAccounts: currentAccounts,
        updatedTransactions: currentTransactions,
        error: 'Missing transfer group identifier for atomic undo.',
      };
    }

    const linkedTxs = txList.filter((t) => t.transferGroupId === groupId && t.status === 'COMPLETED');
    const sentTx = linkedTxs.find((t) => t.type === 'TRANSFER_SENT');
    const rcvTx = linkedTxs.find((t) => t.type === 'TRANSFER_RECEIVED');

    if (!sentTx || !rcvTx) {
      return {
        success: false,
        updatedAccounts: currentAccounts,
        updatedTransactions: currentTransactions,
        error: 'Cannot find linked transfer counterpart for atomic reversal.',
      };
    }

    const senderAcc = accountsMap.get(sentTx.accountId);
    const recipientAcc = accountsMap.get(rcvTx.accountId);

    if (!senderAcc || !recipientAcc) {
      return {
        success: false,
        updatedAccounts: currentAccounts,
        updatedTransactions: currentTransactions,
        error: 'One or both accounts in transfer no longer exist.',
      };
    }

    // Check if recipient has enough balance to refund
    if (recipientAcc.balance < sentTx.amount) {
      return {
        success: false,
        updatedAccounts: currentAccounts,
        updatedTransactions: currentTransactions,
        error: `Cannot undo transfer: recipient ${recipientAcc.holder} has insufficient balance (₹${recipientAcc.balance / 100}) to refund ₹${sentTx.amount / 100}.`,
      };
    }

    // Atomically reverse both
    const recipientDebit = applyBalance(recipientAcc, -sentTx.amount);
    const senderCredit = applyBalance(senderAcc, sentTx.amount);

    accountsMap.set(recipientAcc.id, recipientDebit.updatedAccount);
    accountsMap.set(senderAcc.id, senderCredit.updatedAccount);

    const reversalRef = generateReference();

    // Mark both original transactions as REVERSED
    txList.forEach((t, i) => {
      if (t.transferGroupId === groupId) {
        txList[i] = {
          ...t,
          status: 'REVERSED',
          reversedBy: reversalRef,
        };
      }
    });

    const auditTx: Transaction = {
      id: `tx_${Date.now()}_rev_tf`,
      reference: reversalRef,
      accountId: targetTx.accountId,
      type: targetTx.type === 'TRANSFER_SENT' ? 'DEPOSIT' : 'WITHDRAWAL',
      amount: targetTx.amount,
      balanceBefore: targetTx.type === 'TRANSFER_SENT' ? senderCredit.balanceBefore : recipientDebit.balanceBefore,
      balanceAfter: targetTx.type === 'TRANSFER_SENT' ? senderCredit.balanceAfter : recipientDebit.balanceAfter,
      description: `Atomic Reversal of Transfer ${sentTx.reference}`,
      status: 'COMPLETED',
      createdAt: nowIso,
    };
    txList.unshift(auditTx);

    return {
      success: true,
      updatedAccounts: Array.from(accountsMap.values()),
      updatedTransactions: txList,
      auditTransaction: auditTx,
    };
  }

  return {
    success: false,
    updatedAccounts: currentAccounts,
    updatedTransactions: currentTransactions,
    error: 'Unrecognized transaction type for undo.',
  };
}

/**
 * Validates the Four Core Ledger Invariants:
 * I1: Non-negativity (for every account, balance >= 0 at every instant)
 * I2: Conservation of money (transfers conserve total money, total = deposits - withdrawals)
 * I3: Exactly-once idempotency (no duplicate non-reversed records for any key)
 * I4: Ledger agreement (for every account, balance equals signed sum of completed ledger records)
 */
export function verifyInvariants(
  accounts: Account[],
  transactions: Transaction[]
): InvariantCheckResult[] {
  // 1. Invariant I1: Non-negativity
  const negativeAccounts = accounts.filter((a) => a.balance < 0);
  const i1Passed = negativeAccounts.length === 0;
  const i1Metric = i1Passed
    ? `All ${accounts.length} accounts have balance ≥ ₹0.00`
    : `${negativeAccounts.length} accounts violated non-negativity constraint!`;

  // 2. Invariant I2: Conservation of Money
  // Total balance should equal sum of all active deposits minus sum of all active withdrawals
  // Note: Transfers net to 0 across the entire system.
  let totalBalances = 0;
  accounts.forEach((a) => {
    totalBalances += a.balance;
  });

  let totalDeposited = 0;
  let totalWithdrawn = 0;

  transactions.forEach((tx) => {
    if (tx.status === 'COMPLETED') {
      if (tx.type === 'DEPOSIT') {
        totalDeposited += tx.amount;
      } else if (tx.type === 'WITHDRAWAL') {
        totalWithdrawn += tx.amount;
      }
      // Note: TRANSFER_SENT and TRANSFER_RECEIVED have equal amounts that cancel out
    }
  });

  const expectedTotal = totalDeposited - totalWithdrawn;
  const i2Passed = totalBalances === expectedTotal;
  const i2Metric = `Total balances (₹${(totalBalances / 100).toLocaleString('en-IN')}) = Net external inflows (₹${(expectedTotal / 100).toLocaleString('en-IN')})`;

  // 3. Invariant I3: Exactly-Once Idempotency
  const keyMap = new Map<string, number>();
  let duplicateCount = 0;
  transactions.forEach((tx) => {
    if (tx.idempotencyKey && tx.status === 'COMPLETED') {
      const compositeKey = `${tx.accountId}:${tx.idempotencyKey}`;
      const count = (keyMap.get(compositeKey) || 0) + 1;
      keyMap.set(compositeKey, count);
      if (count > 1) {
        duplicateCount++;
      }
    }
  });

  const i3Passed = duplicateCount === 0;
  const i3Metric = i3Passed
    ? `0 duplicate idempotency executions detected across ${keyMap.size} keyed transactions`
    : `${duplicateCount} duplicate executions detected!`;

  // 4. Invariant I4: Ledger Agreement
  // For each account, balance == signed sum of its completed ledger records
  let agreementViolations = 0;
  const accountSumMap = new Map<string, number>();

  transactions.forEach((tx) => {
    if (tx.status === 'COMPLETED') {
      const currentSum = accountSumMap.get(tx.accountId) || 0;
      let delta = 0;
      if (tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_RECEIVED') {
        delta = tx.amount;
      } else if (tx.type === 'WITHDRAWAL' || tx.type === 'TRANSFER_SENT') {
        delta = -tx.amount;
      }
      accountSumMap.set(tx.accountId, currentSum + delta);
    }
  });

  accounts.forEach((acc) => {
    const computed = accountSumMap.get(acc.id) || 0;
    if (acc.balance !== computed) {
      agreementViolations++;
    }
  });

  const i4Passed = agreementViolations === 0;
  const i4Metric = i4Passed
    ? `100% agreement across all ${accounts.length} account ledgers`
    : `${agreementViolations} account balances mismatch their transaction ledger sum!`;

  return [
    {
      id: 'I1',
      name: 'I1: Non-Negativity (No Overdraft)',
      passed: i1Passed,
      details: 'For every active account, balance >= 0 at every instant via atomic condition.',
      metric: i1Metric,
    },
    {
      id: 'I2',
      name: 'I2: Money Conservation',
      passed: i2Passed,
      details: 'Transfers change total money by exactly zero; total system balance equals net inflows.',
      metric: i2Metric,
    },
    {
      id: 'I3',
      name: 'I3: Exactly-Once Idempotency',
      passed: i3Passed,
      details: 'Retried requests with identical idempotency key execute once and return prior record.',
      metric: i3Metric,
    },
    {
      id: 'I4',
      name: 'I4: Ledger Agreement',
      passed: i4Passed,
      details: 'Current balance strictly equals signed sum of credits minus debits from ledger records.',
      metric: i4Metric,
    },
  ];
}
