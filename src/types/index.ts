/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian Bank Simulator - Data Types & DAA Invariants
 */

export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER_SENT'
  | 'TRANSFER_RECEIVED';

export type TransactionStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED';

export interface Account {
  id: string;
  holder: string;
  email: string;
  accountNumber: string; // 12-digit, prefix "40"
  balance: number; // Integer paise (1 INR = 100 paise)
  status: 'ACTIVE' | 'FROZEN';
  createdAt: string;
}

export interface Transaction {
  id: string;
  reference: string; // e.g. TXN-000123
  accountId: string;
  type: TransactionType;
  amount: number; // Integer paise
  balanceBefore: number; // Integer paise
  balanceAfter: number; // Integer paise
  relatedAccountNumber?: string;
  counterpartyName?: string;
  transferGroupId?: string; // shared across pair of transfer records
  idempotencyKey?: string;
  description: string;
  status: TransactionStatus;
  failureReason?: string;
  createdAt: string;
  reversedBy?: string; // Reference to reversal record
}

export interface InvariantCheckResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
  metric: string;
}

export interface DevLogEntry {
  id: string;
  timestamp: number;
  structure: 'QUEUE' | 'STACK' | 'LINEAR_SEARCH' | 'BINARY_SEARCH' | 'HASH_TABLE' | 'LEDGER_ATOMIC';
  operation: string;
  complexity: string;
  details: string;
  durationMs?: number;
}

export interface SearchAlgorithmResult {
  algorithmName: string;
  timeComplexity: string;
  spaceComplexity: string;
  found: boolean;
  account?: Account | null;
  steps: number; // Number of comparisons/steps
  timeMs: number; // Time taken in milliseconds
}

export interface BenchmarkPoint {
  n: number;
  linearTimeMs: number;
  binaryTimeMs: number;
  hashTimeMs: number;
  linearSteps: number;
  binarySteps: number;
  hashSteps: number;
}

export interface QueueBenchmarkPoint {
  ops: number;
  customQueueTimeMs: number;
  arrayShiftTimeMs: number;
}
