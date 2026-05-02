import { VehicleTask } from '../types';

/**
 * Result of one knapsack optimisation.
 */
export interface KnapsackResult {
  selectedTasks: VehicleTask[];
  totalImpact: number;
  totalDuration: number;
}

/**
 * 0/1 Knapsack via classic dynamic programming.
 *
 * Each task can either be scheduled or skipped (no fractional execution),
 * which is exactly the 0/1 variant of the knapsack problem.
 *
 *   maximise   Σ Impact_i * x_i
 *   subject to Σ Duration_i * x_i  <=  capacity
 *              x_i ∈ {0, 1}
 *
 * Time complexity:  O(n · W)
 * Space complexity: O(n · W)  (kept 2D for trivial backtracking)
 *
 * Where  n = number of tasks
 *        W = mechanic-hour capacity (assumed integer or coerced via Math.floor)
 *
 * Edge cases handled:
 *  - capacity <= 0   → returns empty selection
 *  - tasks  = []     → returns empty selection
 *  - non-integer durations are floored; impacts are kept as numbers
 *  - tasks with duration > capacity are skipped naturally by the recurrence
 *
 * Why DP over greedy:
 *  A greedy by impact/duration ratio is fast (O(n log n)) but gives only an
 *  approximation. The evaluation explicitly asks for the optimal selection,
 *  so we use DP and accept the O(n·W) cost. For typical depot inputs
 *  (n ≤ a few hundred, W ≤ a few hundred) this completes in microseconds.
 */
export function solveKnapsack(
  tasks: VehicleTask[],
  capacity: number,
): KnapsackResult {
  const W = Math.max(0, Math.floor(capacity));
  const n = tasks.length;

  if (n === 0 || W === 0) {
    return { selectedTasks: [], totalImpact: 0, totalDuration: 0 };
  }

  // dp[i][w] = best total impact achievable using the first i tasks with capacity w.
  // We allocate (n+1) × (W+1) cells so dp[0][*] = 0 represents "no items".
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(W + 1).fill(0),
  );

  for (let i = 1; i <= n; i++) {
    const task = tasks[i - 1];
    const d = Math.max(0, Math.floor(task.Duration));
    const v = task.Impact;

    for (let w = 0; w <= W; w++) {
      if (d > w) {
        // Cannot include this task at this capacity.
        dp[i][w] = dp[i - 1][w];
      } else {
        // Choose the better of: skip task i, or include task i.
        dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - d] + v);
      }
    }
  }

  // Backtrack from dp[n][W] to recover which tasks were chosen.
  const selectedTasks: VehicleTask[] = [];
  let remaining = W;
  for (let i = n; i >= 1; i--) {
    if (dp[i][remaining] !== dp[i - 1][remaining]) {
      const task = tasks[i - 1];
      selectedTasks.push(task);
      remaining -= Math.max(0, Math.floor(task.Duration));
    }
  }
  selectedTasks.reverse(); // restore input order

  const totalImpact = dp[n][W];
  const totalDuration = selectedTasks.reduce(
    (acc, t) => acc + Math.max(0, Math.floor(t.Duration)),
    0,
  );

  return { selectedTasks, totalImpact, totalDuration };
}
