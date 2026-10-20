/* Blueprint — DSA section: topic order and pattern map. Topic content lives in dsa-*.js files
 * which each add entries to BP.DSA.topics. Block types are the lesson blocks plus
 * ["viz", algoName, caption] and ["probs", [problem, ...]].
 */
window.BP = window.BP || {};
BP.DSA = {
  phases: [
    ["Foundations", ["complexity", "arrays", "windows", "matrix", "math", "bits"]],
    ["Searching, sorting and lookup", ["sorting", "binary-search", "hashing", "strings"]],
    ["Recursion", ["recursion"]],
    ["Linear data structures", ["linked-list", "stacks-queues", "heaps", "tries"]],
    ["Trees and graphs", ["trees", "graphs"]],
    ["Optimisation", ["dp", "greedy"]]
  ],
  patterns: [
    ["Prefix sum", "many range-sum queries; “sum of subarray l..r”; equilibrium / special index", "O(N) build, O(1) query", "arrays"],
    ["Carry forward", "count pairs (i < j) with a condition; “closest X to the left”", "O(N)", "arrays"],
    ["Kadane", "maximum subarray sum; contiguous; can be negative", "O(N)", "arrays"],
    ["Sliding window", "subarray / substring of size k, or longest/shortest satisfying a constraint", "O(N)", "windows"],
    ["Two pointers", "sorted array, pair/triplet with a target, partition in place, container area", "O(N)", "windows"],
    ["Binary search on the answer", "minimise the maximum / maximise the minimum; answer is monotonic (painters, cows)", "O(N log range)", "binary-search"],
    ["Hash map counting", "frequency, first unique, pair sum on unsorted data, subarray sum = k with negatives", "O(N) expected", "hashing"],
    ["Bit tricks", "every element twice except one; subsets as masks; powers of two", "O(N) or O(N·32)", "bits"],
    ["Monotonic stack", "next/previous greater or smaller; histogram area; sum of subarray min/max", "O(N)", "stacks-queues"],
    ["Monotonic deque", "max/min of every window of size k", "O(N)", "stacks-queues"],
    ["Slow & fast pointers", "middle of a list, cycle detection, start of the loop", "O(N), O(1) space", "linked-list"],
    ["Heap / top-k", "k-th largest, merge k sorted, median of a stream, schedule by earliest deadline", "O(N log k)", "heaps"],
    ["Trie", "prefix search, autocomplete, shortest unique prefix, maximum XOR pair", "O(length)", "tries"],
    ["Backtracking", "“all” permutations / subsets / placements; constraints to prune", "exponential, pruned", "recursion"],
    ["Tree DFS", "height, diameter, path sums, LCA, validate BST: answer from children", "O(N)", "trees"],
    ["BFS", "shortest path with unit weights, level by level, multi-source spread (rotting oranges)", "O(V + E)", "graphs"],
    ["Topological sort", "prerequisites, build order, detect a cycle in a directed graph", "O(V + E)", "graphs"],
    ["Union-Find", "connectivity queries, cycle in an undirected graph, Kruskal's MST", "≈ O(1) per op", "graphs"],
    ["Dijkstra", "shortest path, non-negative weights", "O((V + E) log V)", "graphs"],
    ["1-D / 2-D DP", "count ways, min/max cost, overlapping subproblems; “can you reach”", "states × transitions", "dp"],
    ["Greedy", "a locally best choice is provably safe: earliest end, exchange argument", "usually O(N log N)", "greedy"]
  ],
  topics: {}
};
