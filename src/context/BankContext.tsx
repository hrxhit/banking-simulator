/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian Bank Simulator - Central Banking State & DAA Context
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Account, Transaction, DevLogEntry, InvariantCheckResult } from '../types';
import {
  StorageState,
  PendingQueueItem,
  loadState,
  saveState,
  resetDemoData,
  generateUniqueAccountNumber,
} from '../lib/storage';
import { CustomQueue, CustomStack } from '../lib/structures';
import {
  processPendingQueueItem,
  undoTransaction,
  verifyInvariants,
  generateReference,
} from '../lib/ledger';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  timestamp: number;
}

interface BankContextType {
  // Authentication & Account State
  accounts: Account[];
  currentAccount: Account | null;
  currentUserEmail: string;
  login: (email: string) => boolean;
  logout: () => void;
  register: (holder: string, email: string) => Account;
  switchAccount: (accountId: string) => void;

  // Ledger & Transactions
  transactions: Transaction[];
  currentAccountTransactions: Transaction[];
  invariants: InvariantCheckResult[];

  // Queue (FIFO) Feature
  queueItems: PendingQueueItem[];
  enqueueTransaction: (
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER',
    amountPaise: number,
    description: string,
    recipientAccountNumber?: string,
    idempotencyKey?: string
  ) => PendingQueueItem;
  processNextQueueItem: () => Promise<{ success: boolean; message: string; tx?: Transaction }>;
  processAllQueueItems: () => Promise<{ totalProcessed: number; succeeded: number; failed: number }>;
  add10RandomQueueTransactions: () => void;
  clearQueue: () => void;

  // Stack (LIFO) Feature
  recentStackItems: Transaction[];
  peekRecentTransaction: () => Transaction | null;
  undoLastTransaction: () => Promise<{ success: boolean; message: string }>;

  // Dev Logging & Telemetry
  devLogs: DevLogEntry[];
  clearDevLogs: () => void;

  // Notifications & Theme (Light mode only)
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  theme: 'light';

  // Reset
  resetAllDemoData: () => void;
}

const BankContext = createContext<BankContextType | null>(null);

export const BankProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial State Loading
  const [state, setState] = useState<StorageState>(() => loadState());
  const [devLogs, setDevLogs] = useState<DevLogEntry[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  // Light mode only: ensure dark class is removed and localStorage is clean
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    try {
      localStorage.removeItem('meridian_theme');
    } catch {
      // ignore
    }
  }, []);

  // 2. Data Structure Instances: CustomQueue and CustomStack
  // Maintained in sync with state
  const transactionQueue = useMemo(() => {
    return new CustomQueue<PendingQueueItem>(state.pendingQueue);
  }, [state.pendingQueue]);

  // Push notifications helper
  const addToast = useCallback(
    (type: ToastMessage['type'], title: string, message?: string) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      setToasts((prev) => [...prev, { id, type, title, message, timestamp: Date.now() }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Developer Logger
  const logDev = useCallback(
    (
      structure: DevLogEntry['structure'],
      operation: string,
      complexity: string,
      details: string,
      durationMs?: number
    ) => {
      const entry: DevLogEntry = {
        id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        structure,
        operation,
        complexity,
        details,
        durationMs,
      };
      setDevLogs((prev) => [entry, ...prev.slice(0, 49)]); // Keep last 50 logs
    },
    []
  );

  // Sync state changes with localStorage
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Current Account resolution
  const currentAccount = useMemo(() => {
    return state.accounts.find((a) => a.email === state.currentUserEmail) || state.accounts[0] || null;
  }, [state.accounts, state.currentUserEmail]);

  // Current Account Transactions
  const currentAccountTransactions = useMemo(() => {
    if (!currentAccount) return [];
    return state.transactions.filter((tx) => tx.accountId === currentAccount.id);
  }, [state.transactions, currentAccount]);

  // CustomStack for current account's completed transactions (LIFO)
  // Oldest first pushed, so top is newest completed transaction
  const currentAccountStack = useMemo(() => {
    const stack = new CustomStack<Transaction>();
    if (!currentAccount) return stack;
    // Filter completed transactions, sort oldest to newest, then push
    const completed = state.transactions
      .filter((t) => t.accountId === currentAccount.id && t.status === 'COMPLETED')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    completed.forEach((tx) => stack.push(tx));
    return stack;
  }, [state.transactions, currentAccount]);

  // Invariants check
  const invariants = useMemo(() => {
    return verifyInvariants(state.accounts, state.transactions);
  }, [state.accounts, state.transactions]);

  // 3. User Authentication
  const login = useCallback(
    (credential: string) => {
      const q = credential.trim().toLowerCase();
      const acc = state.accounts.find(
        (a) =>
          a.email.toLowerCase() === q ||
          a.accountNumber === q ||
          a.holder.toLowerCase() === q ||
          a.holder.toLowerCase().split(' ')[0] === q ||
          a.email.toLowerCase().startsWith(q)
      );
      if (acc) {
        setState((prev) => ({ ...prev, currentUserEmail: acc.email }));
        addToast('success', 'Sign In Successful', `Welcome back, ${acc.holder}`);
        logDev('HASH_TABLE', 'User Login Lookup', 'O(1) expected', `Resolved customer ${acc.holder} (${acc.accountNumber})`);
        return true;
      }
      addToast('error', 'Sign In Failed', 'No customer profile found with those credentials.');
      return false;
    },
    [state.accounts, addToast, logDev]
  );

  const logout = useCallback(() => {
    // Keep first account or dummy empty
    setState((prev) => ({ ...prev, currentUserEmail: '' }));
    addToast('info', 'Logged Out', 'Your session has been securely closed.');
  }, [addToast]);

  const switchAccount = useCallback(
    (accountId: string) => {
      const acc = state.accounts.find((a) => a.id === accountId);
      if (acc) {
        setState((prev) => ({ ...prev, currentUserEmail: acc.email }));
        addToast('info', 'Active Account Switched', `Viewing ${acc.holder} (${acc.accountNumber})`);
      }
    },
    [state.accounts, addToast]
  );

  // Register New Customer with welcome Rs. 10,000 credit (Algorithm 4.8 / UC-01)
  const register = useCallback(
    (holder: string, email: string): Account => {
      const t0 = performance.now();
      const existing = state.accounts.find(
        (a) => a.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (existing) {
        throw new Error('An account with this email address already exists.');
      }

      // Generate 12-digit account number starting with "40" using Las Vegas algorithm (Algorithm 4.5)
      const accountNumber = generateUniqueAccountNumber(state.accounts);
      const accId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const welcomePaise = 1000000; // Rs. 10,000 welcome credit

      const newAccount: Account = {
        id: accId,
        holder: holder.trim(),
        email: email.trim().toLowerCase(),
        accountNumber,
        balance: welcomePaise,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };

      // Create welcome deposit transaction
      const welcomeTx: Transaction = {
        id: `tx_${Date.now()}_welcome`,
        reference: generateReference(),
        accountId: accId,
        type: 'DEPOSIT',
        amount: welcomePaise,
        balanceBefore: 0,
        balanceAfter: welcomePaise,
        description: 'Account Opening Welcome Demonstration Credit',
        status: 'COMPLETED',
        idempotencyKey: `idemp_welcome_${accId}`,
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        accounts: [...prev.accounts, newAccount],
        transactions: [welcomeTx, ...prev.transactions],
        currentUserEmail: newAccount.email,
      }));

      const t1 = performance.now();
      logDev(
        'LEDGER_ATOMIC',
        'Customer Registration & Welcome Credit',
        'O(log N)',
        `Created account ${accountNumber} with Rs. 10,000 credit for ${holder}`,
        t1 - t0
      );

      addToast('success', 'Account Registered!', `Assigned A/C: ${accountNumber} with ₹10,000 welcome credit.`);
      return newAccount;
    },
    [state.accounts, addToast, logDev]
  );

  // 4. Queue Operations (FIFO)
  const enqueueTransaction = useCallback(
    (
      type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER',
      amountPaise: number,
      description: string,
      recipientAccountNumber?: string,
      idempotencyKey?: string
    ): PendingQueueItem => {
      if (!currentAccount) {
        throw new Error('No active customer account selected.');
      }

      const t0 = performance.now();
      let recipientHolder: string | undefined;
      if (recipientAccountNumber) {
        const rec = state.accounts.find((a) => a.accountNumber === recipientAccountNumber);
        recipientHolder = rec ? rec.holder : 'Unknown';
      }

      const queueItem: PendingQueueItem = {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        reference: generateReference(),
        type,
        senderAccountId: currentAccount.id,
        senderAccountNumber: currentAccount.accountNumber,
        senderHolder: currentAccount.holder,
        recipientAccountNumber,
        recipientHolder,
        amount: amountPaise,
        description,
        idempotencyKey: idempotencyKey || `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        queuedAt: new Date().toISOString(),
      };

      // Enqueue to linked list queue
      transactionQueue.enqueue(queueItem);

      setState((prev) => ({
        ...prev,
        pendingQueue: [...prev.pendingQueue, queueItem],
      }));

      const t1 = performance.now();
      logDev(
        'QUEUE',
        'Enqueue Transaction',
        'O(1)',
        `Added ${type} for ₹${(amountPaise / 100).toFixed(2)} to FIFO queue rear. Queue size: ${transactionQueue.size()}`,
        t1 - t0
      );

      addToast('info', 'Enqueued to Processing Queue', `Transaction ${queueItem.reference} waiting for execution.`);
      return queueItem;
    },
    [currentAccount, state.accounts, transactionQueue, logDev, addToast]
  );

  // Dequeue and process next item (FIFO)
  const processNextQueueItem = useCallback(async (): Promise<{
    success: boolean;
    message: string;
    tx?: Transaction;
  }> => {
    if (state.pendingQueue.length === 0) {
      addToast('warning', 'Queue Empty', 'There are no pending transactions in the queue.');
      return { success: false, message: 'Queue is currently empty.' };
    }

    const t0 = performance.now();
    // O(1) dequeue from custom queue instance
    const item = transactionQueue.dequeue();
    const remainingQueue = state.pendingQueue.slice(1);

    if (!item) {
      return { success: false, message: 'No item to dequeue.' };
    }

    // Execute through atomic ledger engine
    const result = processPendingQueueItem(item, state.accounts, state.transactions);

    if (result.success) {
      // Update accounts in state
      const updatedAccountsMap = new Map(result.updatedAccounts.map((a) => [a.id, a]));
      const newAccounts = state.accounts.map((a) => updatedAccountsMap.get(a.id) || a);

      // Prepend new transactions
      const newTransactions = [...result.transactionsCreated, ...state.transactions];

      setState((prev) => ({
        ...prev,
        accounts: newAccounts,
        transactions: newTransactions,
        pendingQueue: remainingQueue,
      }));

      const primaryTx = result.transactionsCreated[0];
      const t1 = performance.now();
      logDev(
        'QUEUE',
        'Dequeue & Atomic Settle',
        'O(1) + O(log N)',
        `Dequeued front item ${item.reference} (${item.type} ₹${(item.amount / 100).toFixed(2)}) -> COMPLETED`,
        t1 - t0
      );

      addToast('success', 'Transaction Settled', `Successfully processed ${item.reference} (${item.type}).`);
      return { success: true, message: `Settled ${item.reference}`, tx: primaryTx };
    } else {
      // Record failed transaction for auditability
      const failedTx: Transaction = {
        id: `tx_failed_${Date.now()}`,
        reference: item.reference,
        accountId: item.senderAccountId,
        type: item.type === 'TRANSFER' ? 'TRANSFER_SENT' : item.type,
        amount: item.amount,
        balanceBefore: state.accounts.find((a) => a.id === item.senderAccountId)?.balance || 0,
        balanceAfter: state.accounts.find((a) => a.id === item.senderAccountId)?.balance || 0,
        description: item.description,
        status: 'FAILED',
        failureReason: result.error,
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        transactions: [failedTx, ...prev.transactions],
        pendingQueue: remainingQueue,
      }));

      const t1 = performance.now();
      logDev(
        'QUEUE',
        'Dequeue & Reject',
        'O(1)',
        `Rejected ${item.reference}: ${result.error}`,
        t1 - t0
      );

      addToast('error', 'Transaction Rejected', result.error || 'Execution failed.');
      return { success: false, message: result.error || 'Failed' };
    }
  }, [state.pendingQueue, state.accounts, state.transactions, transactionQueue, logDev, addToast]);

  // Process all queued items sequentially
  const processAllQueueItems = useCallback(async () => {
    let succeeded = 0;
    let failed = 0;
    const initialCount = state.pendingQueue.length;

    let currentAccs = [...state.accounts];
    let currentTxs = [...state.transactions];
    const newPendingQueue = [...state.pendingQueue];

    const t0 = performance.now();

    while (newPendingQueue.length > 0) {
      const item = newPendingQueue.shift()!;
      transactionQueue.dequeue();

      const result = processPendingQueueItem(item, currentAccs, currentTxs);
      if (result.success) {
        succeeded++;
        const map = new Map(result.updatedAccounts.map((a) => [a.id, a]));
        currentAccs = currentAccs.map((a) => map.get(a.id) || a);
        currentTxs = [...result.transactionsCreated, ...currentTxs];
      } else {
        failed++;
        const failedTx: Transaction = {
          id: `tx_failed_${Date.now()}_${Math.random()}`,
          reference: item.reference,
          accountId: item.senderAccountId,
          type: item.type === 'TRANSFER' ? 'TRANSFER_SENT' : item.type,
          amount: item.amount,
          balanceBefore: currentAccs.find((a) => a.id === item.senderAccountId)?.balance || 0,
          balanceAfter: currentAccs.find((a) => a.id === item.senderAccountId)?.balance || 0,
          description: item.description,
          status: 'FAILED',
          failureReason: result.error,
          createdAt: new Date().toISOString(),
        };
        currentTxs = [failedTx, ...currentTxs];
      }
    }

    setState((prev) => ({
      ...prev,
      accounts: currentAccs,
      transactions: currentTxs,
      pendingQueue: [],
    }));

    const t1 = performance.now();
    logDev(
      'QUEUE',
      'Batch Dequeue & Process All',
      'O(k)',
      `Processed all ${initialCount} queued transactions (${succeeded} succeeded, ${failed} failed)`,
      t1 - t0
    );

    addToast('info', 'Batch Processing Complete', `Executed ${initialCount} items: ${succeeded} settled, ${failed} failed.`);
    return { totalProcessed: initialCount, succeeded, failed };
  }, [state.pendingQueue, state.accounts, state.transactions, transactionQueue, logDev, addToast]);

  // Add 10 random transactions to queue
  const add10RandomQueueTransactions = useCallback(() => {
    const types: ('DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER')[] = ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'];
    const descriptions = [
      'Utility auto-bill settlement',
      'Merchant point-of-sale transfer',
      'Dividend payout deposit',
      'Cloud computing server cost',
      'Demonstration payroll credit',
      'Consulting fee installment',
      'Equipment maintenance debit',
      'Quarterly interest deposit',
    ];

    const newItems: PendingQueueItem[] = [];
    const t0 = performance.now();

    for (let i = 0; i < 10; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const randomSender = state.accounts[Math.floor(Math.random() * state.accounts.length)];
      // Random amount between Rs. 100 (10,000 paise) and Rs. 5,000 (500,000 paise)
      const amount = Math.floor(Math.random() * 4900 + 100) * 100;
      const desc = descriptions[Math.floor(Math.random() * descriptions.length)];

      let recipientNumber: string | undefined;
      let recipientHolder: string | undefined;

      if (type === 'TRANSFER') {
        const potentialRecipients = state.accounts.filter((a) => a.id !== randomSender.id);
        const randomRecipient = potentialRecipients[Math.floor(Math.random() * potentialRecipients.length)];
        recipientNumber = randomRecipient.accountNumber;
        recipientHolder = randomRecipient.holder;
      }

      const qItem: PendingQueueItem = {
        id: `q_rnd_${Date.now()}_${i}`,
        reference: generateReference(),
        type,
        senderAccountId: randomSender.id,
        senderAccountNumber: randomSender.accountNumber,
        senderHolder: randomSender.holder,
        recipientAccountNumber: recipientNumber,
        recipientHolder,
        amount,
        description: desc,
        idempotencyKey: `idemp_rnd_${Date.now()}_${i}`,
        queuedAt: new Date().toISOString(),
      };

      transactionQueue.enqueue(qItem);
      newItems.push(qItem);
    }

    setState((prev) => ({
      ...prev,
      pendingQueue: [...prev.pendingQueue, ...newItems],
    }));

    const t1 = performance.now();
    logDev(
      'QUEUE',
      'Add 10 Random Transactions',
      '10 x O(1)',
      `Enqueued 10 randomized synthetic transactions into FIFO queue.`,
      t1 - t0
    );

    addToast('success', '10 Transactions Enqueued', 'Random batch added to the processing queue.');
  }, [state.accounts, transactionQueue, logDev, addToast]);

  const clearQueue = useCallback(() => {
    transactionQueue.clear();
    setState((prev) => ({ ...prev, pendingQueue: [] }));
    addToast('info', 'Queue Cleared', 'All pending transactions removed.');
  }, [transactionQueue, addToast]);

  // 5. Stack Operations (LIFO)
  const peekRecentTransaction = useCallback((): Transaction | null => {
    const t0 = performance.now();
    const top = currentAccountStack.peek();
    const t1 = performance.now();

    logDev(
      'STACK',
      'Peek Top of Stack',
      'O(1)',
      top ? `Inspected top transaction ${top.reference} (${top.type})` : 'Stack is currently empty',
      t1 - t0
    );

    return top;
  }, [currentAccountStack, logDev]);

  const undoLastTransaction = useCallback(async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    if (!currentAccount) {
      return { success: false, message: 'No active account selected.' };
    }

    const t0 = performance.now();
    // Peek top item
    const topTx = currentAccountStack.peek();
    if (!topTx) {
      addToast('warning', 'Stack Empty', 'No recent transactions to undo for this account.');
      return { success: false, message: 'Stack is empty.' };
    }

    const undoResult = undoTransaction(topTx, state.accounts, state.transactions);

    if (undoResult.success) {
      // Pop item from stack
      currentAccountStack.pop();

      setState((prev) => ({
        ...prev,
        accounts: undoResult.updatedAccounts,
        transactions: undoResult.updatedTransactions,
      }));

      const t1 = performance.now();
      logDev(
        'STACK',
        'Pop & Reverse Transaction',
        'O(1) + Atomic Compensation',
        `Popped and reversed ${topTx.reference} (Amount: ₹${(topTx.amount / 100).toFixed(2)}). New balance: ₹${(undoResult.updatedAccounts.find((a) => a.id === currentAccount.id)?.balance || 0) / 100}`,
        t1 - t0
      );

      addToast('success', 'Transaction Reverted', `Undone ${topTx.reference}. Compensating audit entry recorded.`);
      return { success: true, message: `Successfully reverted ${topTx.reference}` };
    } else {
      const t1 = performance.now();
      logDev(
        'STACK',
        'Pop & Undo Failed',
        'O(1)',
        `Could not undo ${topTx.reference}: ${undoResult.error}`,
        t1 - t0
      );

      addToast('error', 'Reversal Blocked', undoResult.error || 'Failed to undo transaction.');
      return { success: false, message: undoResult.error || 'Reversal failed.' };
    }
  }, [currentAccount, currentAccountStack, state.accounts, state.transactions, logDev, addToast]);

  // Reset all data
  const resetAllDemoData = useCallback(() => {
    const fresh = resetDemoData();
    transactionQueue.clear();
    fresh.pendingQueue.forEach((q) => transactionQueue.enqueue(q));
    setState(fresh);
    setDevLogs([]);
    addToast('info', 'Demo Data Reset', 'All accounts, ledgers, and queues reset to initial seed state.');
  }, [transactionQueue, addToast]);

  const clearDevLogs = useCallback(() => {
    setDevLogs([]);
  }, []);

  const value = useMemo(
    () => ({
      accounts: state.accounts,
      currentAccount,
      currentUserEmail: state.currentUserEmail,
      login,
      logout,
      register,
      switchAccount,
      transactions: state.transactions,
      currentAccountTransactions,
      invariants,
      queueItems: state.pendingQueue,
      enqueueTransaction,
      processNextQueueItem,
      processAllQueueItems,
      add10RandomQueueTransactions,
      clearQueue,
      recentStackItems: currentAccountStack.toArray(),
      peekRecentTransaction,
      undoLastTransaction,
      devLogs,
      clearDevLogs,
      toasts,
      dismissToast,
      theme: 'light' as const,
      resetAllDemoData,
    }),
    [
      state.accounts,
      currentAccount,
      state.currentUserEmail,
      login,
      logout,
      register,
      switchAccount,
      state.transactions,
      currentAccountTransactions,
      invariants,
      state.pendingQueue,
      enqueueTransaction,
      processNextQueueItem,
      processAllQueueItems,
      add10RandomQueueTransactions,
      clearQueue,
      currentAccountStack,
      peekRecentTransaction,
      undoLastTransaction,
      devLogs,
      clearDevLogs,
      toasts,
      dismissToast,
      resetAllDemoData,
    ]
  );

  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
};

export const useBank = () => {
  const context = useContext(BankContext);
  if (!context) {
    throw new Error('useBank must be used within a BankProvider');
  }
  return context;
};
