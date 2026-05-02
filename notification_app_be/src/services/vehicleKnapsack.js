/**
 * 0/1 knapsack: maximise total Impact within MechanicHours (capacity).
 * Same DP as vehicle_scheduling/solution.py — no external solver libs.
 *
 * @param {number} capacity
 * @param {Array<{ TaskID: string, Duration: number, Impact: number }>} vehicles
 * @returns {{ maxImpact: number, selectedTaskIds: string[] }}
 */
function knapsackDp(capacity, vehicles) {
    const n = vehicles.length;
    const dp = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0));

    for (let i = 1; i <= n; i++) {
        const duration = vehicles[i - 1].Duration;
        const impact = vehicles[i - 1].Impact;
        for (let w = 0; w <= capacity; w++) {
            dp[i][w] = dp[i - 1][w];
            if (duration <= w) {
                dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - duration] + impact);
            }
        }
    }

    const selectedTaskIds = [];
    let w = capacity;
    for (let i = n; i > 0; i--) {
        if (dp[i][w] !== dp[i - 1][w]) {
            selectedTaskIds.push(vehicles[i - 1].TaskID);
            w -= vehicles[i - 1].Duration;
        }
    }

    return { maxImpact: dp[n][capacity], selectedTaskIds };
}

module.exports = { knapsackDp };
