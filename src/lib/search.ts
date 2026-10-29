/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian Bank Simulator - Search Lab Engine & Benchmarks
 *
 * Implements side-by-side execution of:
 * 1. Linear Search O(n)
 * 2. Binary Search O(log n)
 * 3. Hash Table Lookup O(1)
 *
 * Plus synthetic account generation (1,000 to 500,000) and Queue vs Array.shift() benchmark.
 */

import { Account, SearchAlgorithmResult, BenchmarkPoint, QueueBenchmarkPoint } from '../types';
import {
  linearSearchWithMetrics,
  binarySearchWithMetrics,
  CustomQueue,
} from './structures';

/**
 * Executes Linear Search, Binary Search, and Hash Lookup simultaneously on an account set
 * and captures accurate step counts and microsecond durations.
 */
export function executeSideBySideSearch(
  query: string,
  accounts: Account[],
  sortedByNumber: Account[],
  sortedByName: Account[],
  hashByNumber: Map<string, Account>,
  hashByName: Map<string, Account>
): SearchAlgorithmResult[] {
  const qClean = query.trim();
  const isNumberQuery = /^\d+$/.test(qClean);
  const qLower = qClean.toLowerCase();

  // 1. Linear Search O(n)
  const linearOutcome = linearSearchWithMetrics(accounts, (acc) => {
    if (isNumberQuery) {
      return acc.accountNumber === qClean || acc.accountNumber.endsWith(qClean);
    }
    return acc.holder.toLowerCase().includes(qLower);
  });

  // 2. Binary Search O(log n)
  // If numeric query, binary search on sortedByNumber; if name, binary search on sortedByName
  let binaryOutcome;
  if (isNumberQuery) {
    binaryOutcome = binarySearchWithMetrics(
      sortedByNumber,
      qClean,
      (acc) => acc.accountNumber,
      (a, b) => a.localeCompare(b)
    );
  } else {
    binaryOutcome = binarySearchWithMetrics(
      sortedByName,
      qLower,
      (acc) => acc.holder.toLowerCase(),
      (a, b) => a.localeCompare(b)
    );
  }

  // 3. Hash Table Lookup O(1) expected
  const t0 = performance.now();
  let hashResult: Account | null = null;
  if (isNumberQuery) {
    hashResult = hashByNumber.get(qClean) || null;
  } else {
    hashResult = hashByName.get(qLower) || null;
  }
  const t1 = performance.now();
  const hashTimeMs = Math.max(0.0001, t1 - t0);

  return [
    {
      algorithmName: 'Linear Search',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
      found: !!linearOutcome.item,
      account: linearOutcome.item,
      steps: linearOutcome.steps,
      timeMs: Number(linearOutcome.timeMs.toFixed(4)),
    },
    {
      algorithmName: 'Binary Search (Sorted List)',
      timeComplexity: 'O(log n)',
      spaceComplexity: 'O(1)',
      found: !!binaryOutcome.item,
      account: binaryOutcome.item,
      steps: binaryOutcome.steps,
      timeMs: Number(binaryOutcome.timeMs.toFixed(4)),
    },
    {
      algorithmName: 'Hash Table Direct Index',
      timeComplexity: 'O(1) expected',
      spaceComplexity: 'O(n)',
      found: !!hashResult,
      account: hashResult,
      steps: 1, // Single bucket hash calculation & probe
      timeMs: Number(hashTimeMs.toFixed(4)),
    },
  ];
}

/**
 * Fast in-memory synthetic account generator for high-n benchmarking.
 * Generates N synthetic accounts without UI freezing.
 */
export function generateSyntheticDataset(count: number): {
  accounts: Account[];
  sortedByNumber: Account[];
  sortedByName: Account[];
  hashByNumber: Map<string, Account>;
  hashByName: Map<string, Account>;
} {
  const FIRST_NAMES = ['Aarav', 'Ananya', 'Rohan', 'Priya', 'Kabir', 'Aditi', 'Vikram', 'Meera', 'Dev', 'Neha', 'Arjun', 'Sanya', 'Rahul', 'Tanvi', 'Karan'];
  const LAST_NAMES = ['Sharma', 'Verma', 'Gupta', 'Patel', 'Reddy', 'Singh', 'Chopra', 'Malhotra', 'Sen', 'Mehta', 'Nair', 'Iyer', 'Bose', 'Das', 'Joshi'];

  const accounts: Account[] = new Array(count);
  const hashByNumber = new Map<string, Account>();
  const hashByName = new Map<string, Account>();

  for (let i = 0; i < count; i++) {
    // Generate unique 12-digit number starting with 40
    // E.g. "40" + 10 digits padded from index + salt
    const numPart = (1000000000 + i).toString();
    const accNum = `40${numPart}`;

    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const holder = `${fn} ${ln} #${i + 1}`;

    const acc: Account = {
      id: `syn_${i}`,
      holder,
      email: `user${i + 1}@banksimulator.demo`,
      accountNumber: accNum,
      balance: ((i * 37) % 500000) + 100000,
      status: 'ACTIVE',
      createdAt: '2026-05-01T00:00:00.000Z',
    };

    accounts[i] = acc;
    hashByNumber.set(accNum, acc);
    hashByName.set(holder.toLowerCase(), acc);
  }

  // Pre-sort for binary search
  const sortedByNumber = [...accounts].sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
  const sortedByName = [...accounts].sort((a, b) => a.holder.toLowerCase().localeCompare(b.holder.toLowerCase()));

  return {
    accounts,
    sortedByNumber,
    sortedByName,
    hashByNumber,
    hashByName,
  };
}

/**
 * Runs a rigorous benchmark across multiple N sizes (1,000, 10,000, 100,000)
 * performing 1,000 lookups per size and averaging step counts and elapsed times.
 */
export async function runMultiNBenchmark(
  progressCallback?: (status: string, percent: number) => void
): Promise<BenchmarkPoint[]> {
  const sizes = [1000, 5000, 20000, 50000, 100000];
  const results: BenchmarkPoint[] = [];

  for (let sIdx = 0; sIdx < sizes.length; sIdx++) {
    const n = sizes[sIdx];
    if (progressCallback) {
      progressCallback(`Generating synthetic dataset of N = ${n.toLocaleString()} accounts...`, (sIdx / sizes.length) * 100);
    }
    // Yield to browser thread
    await new Promise((resolve) => setTimeout(resolve, 20));

    const dataset = generateSyntheticDataset(n);

    // Pick 500 target keys distributed evenly across dataset
    const lookupsCount = 500;
    const targetNumbers: string[] = [];
    for (let k = 0; k < lookupsCount; k++) {
      const idx = Math.floor((k / lookupsCount) * n);
      targetNumbers.push(dataset.accounts[idx].accountNumber);
    }

    if (progressCallback) {
      progressCallback(`Benchmarking N = ${n.toLocaleString()} across ${lookupsCount} queries...`, ((sIdx + 0.5) / sizes.length) * 100);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Measure Linear Search
    let linearTotalTime = 0;
    let linearTotalSteps = 0;
    for (let i = 0; i < lookupsCount; i++) {
      const target = targetNumbers[i];
      const outcome = linearSearchWithMetrics(dataset.accounts, (a) => a.accountNumber === target);
      linearTotalTime += outcome.timeMs;
      linearTotalSteps += outcome.steps;
    }

    // Measure Binary Search
    let binaryTotalTime = 0;
    let binaryTotalSteps = 0;
    for (let i = 0; i < lookupsCount; i++) {
      const target = targetNumbers[i];
      const outcome = binarySearchWithMetrics(
        dataset.sortedByNumber,
        target,
        (a) => a.accountNumber,
        (a, b) => a.localeCompare(b)
      );
      binaryTotalTime += outcome.timeMs;
      binaryTotalSteps += outcome.steps;
    }

    // Measure Hash Table Lookup
    const hashT0 = performance.now();
    for (let i = 0; i < lookupsCount; i++) {
      const target = targetNumbers[i];
      dataset.hashByNumber.get(target);
    }
    const hashT1 = performance.now();
    const hashTotalTime = Math.max(0.001, hashT1 - hashT0);

    results.push({
      n,
      linearTimeMs: Number((linearTotalTime / lookupsCount).toFixed(4)),
      binaryTimeMs: Number((binaryTotalTime / lookupsCount).toFixed(5)),
      hashTimeMs: Number((hashTotalTime / lookupsCount).toFixed(5)),
      linearSteps: Math.round(linearTotalSteps / lookupsCount),
      binarySteps: Number((binaryTotalSteps / lookupsCount).toFixed(1)),
      hashSteps: 1,
    });
  }

  if (progressCallback) {
    progressCallback('Benchmark completed.', 100);
  }

  return results;
}

/**
 * Benchmark comparing CustomQueue O(1) vs Array.shift() O(N).
 * Shows why Array.shift() leads to quadratic degradation O(N^2).
 */
export async function runQueueVsShiftBenchmark(): Promise<QueueBenchmarkPoint[]> {
  const operationsCounts = [1000, 5000, 15000, 30000, 50000];
  const points: QueueBenchmarkPoint[] = [];

  for (const ops of operationsCounts) {
    // 1. Custom Linked-List Queue test: ops enqueues + ops dequeues
    const customQueue = new CustomQueue<number>();
    const qT0 = performance.now();
    for (let i = 0; i < ops; i++) {
      customQueue.enqueue(i);
    }
    for (let i = 0; i < ops; i++) {
      customQueue.dequeue();
    }
    const qT1 = performance.now();
    const customQueueTimeMs = Number((qT1 - qT0).toFixed(2));

    // 2. Standard Array push + shift test: ops pushes + ops shifts
    const nativeArray: number[] = [];
    const arrT0 = performance.now();
    for (let i = 0; i < ops; i++) {
      nativeArray.push(i);
    }
    for (let i = 0; i < ops; i++) {
      nativeArray.shift(); // O(N) memory shift for each element
    }
    const arrT1 = performance.now();
    const arrayShiftTimeMs = Number((arrT1 - arrT0).toFixed(2));

    points.push({
      ops,
      customQueueTimeMs,
      arrayShiftTimeMs,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  return points;
}
