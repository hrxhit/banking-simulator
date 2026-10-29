/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian Bank Simulator - Core Data Structures & Search Algorithms (DAA Mini Project)
 *
 * All algorithms are implemented from scratch with explicit Big-O time and space complexity annotations.
 * Queue avoids Array.shift() by employing a Doubly-Linked List to guarantee true O(1) enqueue and dequeue.
 */

// ---------------------------------------------------------------------------
// 1. O(1) DOUBLY-LINKED LIST QUEUE (FIFO)
// ---------------------------------------------------------------------------

class QueueNode<T> {
  value: T;
  next: QueueNode<T> | null = null;
  prev: QueueNode<T> | null = null;

  constructor(value: T) {
    this.value = value;
  }
}

/**
 * CustomQueue<T>
 * First-In First-Out (FIFO) queue backed by a Doubly-Linked List.
 * Provides guaranteed O(1) enqueue and O(1) dequeue without array reallocation or element shifting.
 */
export class CustomQueue<T> {
  private head: QueueNode<T> | null = null; // Front of the queue
  private tail: QueueNode<T> | null = null; // Rear of the queue
  private _length: number = 0;

  constructor(initialItems?: T[]) {
    if (initialItems && initialItems.length > 0) {
      for (let i = 0; i < initialItems.length; i++) {
        this.enqueue(initialItems[i]);
      }
    }
  }

  /**
   * Appends an element to the rear of the queue.
   * Time Complexity: O(1)
   * Space Complexity: O(1) auxiliary
   */
  enqueue(item: T): void {
    const node = new QueueNode(item);
    if (!this.tail) {
      this.head = node;
      this.tail = node;
    } else {
      this.tail.next = node;
      node.prev = this.tail;
      this.tail = node;
    }
    this._length++;
  }

  /**
   * Removes and returns the element at the front of the queue.
   * Time Complexity: O(1)
   * Space Complexity: O(1)
   */
  dequeue(): T | null {
    if (!this.head) {
      return null;
    }
    const node = this.head;
    this.head = node.next;
    if (this.head) {
      this.head.prev = null;
    } else {
      this.tail = null;
    }
    node.next = null;
    node.prev = null;
    this._length--;
    return node.value;
  }

  /**
   * Returns the element at the front without removing it.
   * Time Complexity: O(1)
   * Space Complexity: O(1)
   */
  peek(): T | null {
    return this.head ? this.head.value : null;
  }

  /**
   * Returns the element at the rear of the queue.
   * Time Complexity: O(1)
   * Space Complexity: O(1)
   */
  peekRear(): T | null {
    return this.tail ? this.tail.value : null;
  }

  /**
   * Returns whether the queue has no elements.
   * Time Complexity: O(1)
   * Space Complexity: O(1)
   */
  isEmpty(): boolean {
    return this._length === 0;
  }

  /**
   * Returns the total count of elements in the queue.
   * Time Complexity: O(1)
   * Space Complexity: O(1)
   */
  size(): number {
    return this._length;
  }

  /**
   * Resets the queue to an empty state.
   * Time Complexity: O(1)
   * Space Complexity: O(1)
   */
  clear(): void {
    this.head = null;
    this.tail = null;
    this._length = 0;
  }

  /**
   * Returns an array representation of elements from front to rear.
   * Time Complexity: O(n)
   * Space Complexity: O(n)
   */
  toArray(): T[] {
    const result: T[] = [];
    let curr = this.head;
    while (curr) {
      result.push(curr.value);
      curr = curr.next;
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// 2. O(1) LINKED STACK (LIFO)
// ---------------------------------------------------------------------------

class StackNode<T> {
  value: T;
  next: StackNode<T> | null = null;

  constructor(value: T) {
    this.value = value;
  }
}

/**
 * CustomStack<T>
 * Last-In First-Out (LIFO) stack backed by a singly linked chain from top to bottom.
 * Guarantees O(1) push, O(1) pop, and O(1) peek without memory reallocation pauses.
 */
export class CustomStack<T> {
  private topNode: StackNode<T> | null = null;
  private _length: number = 0;

  constructor(initialItems?: T[]) {
    // If provided as array [oldest ... newest], push them sequentially
    if (initialItems && initialItems.length > 0) {
      for (let i = 0; i < initialItems.length; i++) {
        this.push(initialItems[i]);
      }
    }
  }

  /**
   * Pushes a new item onto the top of the stack.
   * Time Complexity: O(1)
   * Space Complexity: O(1) auxiliary
   */
  push(item: T): void {
    const node = new StackNode(item);
    node.next = this.topNode;
    this.topNode = node;
    this._length++;
  }

  /**
   * Removes and returns the top item from the stack.
   * Time Complexity: O(1)
   * Space Complexity: O(1)
   */
  pop(): T | null {
    if (!this.topNode) {
      return null;
    }
    const node = this.topNode;
    this.topNode = node.next;
    node.next = null;
    this._length--;
    return node.value;
  }

  /**
   * Inspects the item at the top of the stack without removing it.
   * Time Complexity: O(1)
   * Space Complexity: O(1)
   */
  peek(): T | null {
    return this.topNode ? this.topNode.value : null;
  }

  /**
   * Returns the count of items in the stack.
   * Time Complexity: O(1)
   * Space Complexity: O(1)
   */
  size(): number {
    return this._length;
  }

  /**
   * Checks whether the stack contains any items.
   * Time Complexity: O(1)
   * Space Complexity: O(1)
   */
  isEmpty(): boolean {
    return this._length === 0;
  }

  /**
   * Returns up to k most recent items (from top downwards).
   * Time Complexity: O(min(k, n))
   * Space Complexity: O(k)
   */
  recent(k: number = 5): T[] {
    const result: T[] = [];
    let curr = this.topNode;
    let count = 0;
    while (curr && count < k) {
      result.push(curr.value);
      curr = curr.next;
      count++;
    }
    return result;
  }

  /**
   * Returns all items in the stack as an array from top (most recent) to bottom.
   * Time Complexity: O(n)
   * Space Complexity: O(n)
   */
  toArray(): T[] {
    const result: T[] = [];
    let curr = this.topNode;
    while (curr) {
      result.push(curr.value);
      curr = curr.next;
    }
    return result;
  }

  /**
   * Clears all items from the stack.
   * Time Complexity: O(1)
   * Space Complexity: O(1)
   */
  clear(): void {
    this.topNode = null;
    this._length = 0;
  }
}

// ---------------------------------------------------------------------------
// 3. SEARCHING ALGORITHMS WITH STEP METRICS
// ---------------------------------------------------------------------------

export interface SearchOutcome<T> {
  item: T | null;
  steps: number; // Comparisons performed
  timeMs: number; // Wall-clock execution time
}

/**
 * Linear Search: Scans every element sequentially until target matches or end is reached.
 * Time Complexity: O(n) worst/average, O(1) best
 * Space Complexity: O(1) auxiliary
 *
 * @param items Array of elements to scan
 * @param predicate Evaluates whether element matches target
 */
export function linearSearchWithMetrics<T>(
  items: T[],
  predicate: (item: T) => boolean
): SearchOutcome<T> {
  const t0 = performance.now();
  let steps = 0;
  let match: T | null = null;

  for (let i = 0; i < items.length; i++) {
    steps++;
    if (predicate(items[i])) {
      match = items[i];
      break;
    }
  }

  const t1 = performance.now();
  return {
    item: match,
    steps,
    timeMs: Math.max(0.0001, t1 - t0),
  };
}

/**
 * Binary Search: Divides a sorted range in half at each comparison.
 * Time Complexity: O(log n) worst/average, O(1) best
 * Space Complexity: O(1) auxiliary
 *
 * Note: Requires `sortedItems` to be pre-sorted according to the comparator.
 *
 * @param sortedItems Pre-sorted array of elements
 * @param target The search target key
 * @param keySelector Extract sortable key from element
 * @param comparator Returns negative if a < b, 0 if equal, positive if a > b
 */
export function binarySearchWithMetrics<T, K>(
  sortedItems: T[],
  target: K,
  keySelector: (item: T) => K,
  comparator: (a: K, b: K) => number
): SearchOutcome<T> {
  const t0 = performance.now();
  let steps = 0;
  let low = 0;
  let high = sortedItems.length - 1;
  let match: T | null = null;

  while (low <= high) {
    steps++;
    const mid = (low + high) >>> 1;
    const midKey = keySelector(sortedItems[mid]);
    const cmp = comparator(midKey, target);

    if (cmp === 0) {
      match = sortedItems[mid];
      break;
    } else if (cmp < 0) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const t1 = performance.now();
  return {
    item: match,
    steps,
    timeMs: Math.max(0.0001, t1 - t0),
  };
}

// ---------------------------------------------------------------------------
// 4. O(1) HASH TABLE LOOKUP
// ---------------------------------------------------------------------------

/**
 * CustomHashTable<K, V>
 * Implements direct hash table indexing using bucketed collisions or fast JS Map.
 * Provides O(1) expected time lookup, insertion, and deletion.
 *
 * Time Complexity: O(1) average / expected, O(n) worst-case under extreme collisions
 * Space Complexity: O(n)
 */
export class CustomHashTable<K extends string, V> {
  private store: Map<K, V>;

  constructor(initialEntries?: [K, V][]) {
    this.store = new Map(initialEntries);
  }

  /**
   * Inserts or updates an entry.
   * Time Complexity: O(1) expected
   * Space Complexity: O(1)
   */
  set(key: K, value: V): void {
    this.store.set(key, value);
  }

  /**
   * Retrieves an item and tracks lookup metrics.
   * Time Complexity: O(1) expected
   * Space Complexity: O(1)
   */
  getWithMetrics(key: K): SearchOutcome<V> {
    const t0 = performance.now();
    // In a hash table, finding the slot and verifying the key requires 1 bucket resolution step
    const item = this.store.get(key) ?? null;
    const t1 = performance.now();

    return {
      item,
      steps: 1, // Direct O(1) bucket resolution
      timeMs: Math.max(0.0001, t1 - t0),
    };
  }

  /**
   * Checks existence of key.
   * Time Complexity: O(1) expected
   */
  has(key: K): boolean {
    return this.store.has(key);
  }

  /**
   * Total key-value pairs stored.
   * Time Complexity: O(1)
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Clears table.
   * Time Complexity: O(1)
   */
  clear(): void {
    this.store.clear();
  }
}
