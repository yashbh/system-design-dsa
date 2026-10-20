/* Blueprint — adds a hero illustration to every lesson and animated charts inside lessons.
 * Scene format: nodes [[part, x, y, label]], links [[from, to]] (see scenes.js). Canvas is 520 × 320.
 * Charts are inserted at the end of the named section (matched by heading prefix).
 */
(function () {
  const S = (nodes, links) => ({ nodes, links });
  BP.LESSON_SCENES = {
    "hld-101": S([["laptop", 70, 230, "your laptop"], ["globe", 200, 80, "DNS"], ["lb", 260, 220, "load balancer"], ["server", 410, 95, "web 1"], ["server", 430, 245, "web 2"]], [[0, 1], [0, 2], [2, 3], [2, 4]]),
    "lb-ch": S([["phone", 60, 165, "users"], ["lb", 185, 165, "LB"], ["server", 330, 60, ""], ["server", 395, 165, ""], ["server", 330, 270, ""], ["db", 475, 165, "shard"]], [[0, 1], [1, 2], [1, 3], [1, 4], [3, 5]]),
    "caching": S([["laptop", 65, 225, "browser"], ["globe", 175, 85, "CDN"], ["gear", 290, 225, "app"], ["cache", 390, 95, "Redis"], ["db", 465, 235, "DB"]], [[0, 1], [0, 2], [2, 3], [2, 4], [3, 4]]),
    "cache-scaler": S([["user", 60, 170, "coder"], ["server", 190, 85, "judge"], ["server", 190, 255, "judge"], ["file", 340, 80, "test files"], ["cache", 340, 240, "ranklist"], ["chart", 465, 160, "leaderboard"]], [[0, 1], [0, 2], [1, 3], [2, 4], [4, 5]]),
    "fb-feed": S([["phone", 60, 170, "you"], ["gear", 180, 170, "feed"], ["db", 320, 70, "user shard"], ["db", 320, 270, "user shard"], ["cache", 450, 170, "recent posts"]], [[0, 1], [1, 2], [1, 3], [1, 4]]),
    "cap": S([["user", 60, 85, "Rohit"], ["user", 60, 255, "Raj"], ["db", 230, 85, "node 1"], ["db", 230, 255, "node 2"], ["lock", 410, 170, "C or A?"]], [[0, 2], [1, 3], [2, 3], [2, 4], [3, 4]]),
    "sql-nosql": S([["gear", 75, 170, "app"], ["db", 225, 70, "SQL"], ["db", 225, 270, "NoSQL"], ["file", 375, 70, "documents"], ["hex", 375, 270, "shard"], ["hex", 470, 170, "shard"]], [[0, 1], [0, 2], [2, 3], [2, 4], [2, 5]]),
    "shard-ops": S([["gear", 70, 170, "orchestrator"], ["db", 215, 70, "S1"], ["db", 215, 270, "S2"], ["db", 345, 170, "S3"], ["db", 470, 75, "new S4"], ["server", 470, 265, "spare"]], [[0, 1], [0, 2], [0, 3], [3, 4], [0, 5]]),
    "lsm": S([["file", 70, 170, "WAL"], ["cache", 190, 170, "memtable"], ["file", 320, 65, "SSTable"], ["file", 320, 170, "SSTable"], ["file", 320, 275, "SSTable"], ["db", 460, 170, "compacted"]], [[0, 1], [1, 2], [1, 3], [1, 4], [2, 5], [3, 5], [4, 5]]),
    "typeahead": S([["laptop", 70, 200, "“mic…”"], ["gear", 205, 105, "suggest"], ["hex", 335, 60, "mic"], ["hex", 335, 185, "mich"], ["cache", 460, 115, "top 5"], ["chart", 460, 260, "trends"]], [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4], [1, 5]]),
    "messaging": S([["phone", 60, 170, "Alice"], ["server", 200, 80, "chat server"], ["queue", 265, 245, "inbox"], ["server", 355, 80, "chat server"], ["phone", 470, 170, "Bob"]], [[0, 1], [1, 3], [3, 4], [1, 2], [2, 4]]),
    "search": S([["file", 60, 80, "posts"], ["file", 60, 260, "resumes"], ["gear", 200, 170, "Lucene"], ["hex", 340, 80, "shard 0"], ["hex", 340, 260, "shard 1"], ["laptop", 465, 170, "search"]], [[0, 2], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5]]),
    "storage-geo": S([["file", 60, 170, "50 TB file"], ["gear", 190, 70, "NameNode"], ["db", 315, 95, "rack 1"], ["db", 315, 255, "rack 2"], ["pin", 450, 90, "cafe"], ["pin", 465, 235, "cab"]], [[0, 1], [0, 2], [0, 3], [2, 3], [1, 4], [1, 5]]),
    "video": S([["video", 70, 170, "live feed"], ["gear", 200, 75, "transcode"], ["globe", 330, 170, "CDN"], ["phone", 460, 70, "phone"], ["laptop", 460, 260, "TV / laptop"]], [[0, 1], [1, 2], [2, 3], [2, 4]]),
    "kafka-zk": S([["gear", 60, 90, "producer"], ["gear", 60, 250, "producer"], ["queue", 235, 185, "topic"], ["server", 395, 85, "consumer"], ["server", 410, 260, "consumer"], ["cloud", 235, 55, "ZooKeeper"]], [[0, 2], [1, 2], [2, 3], [2, 4], [5, 2]]),
    "ids-limits": S([["server", 70, 85, "worker"], ["server", 70, 255, "worker"], ["gear", 220, 170, "Snowflake"], ["lock", 370, 80, "limiter"], ["chart", 370, 255, "429s"], ["phone", 480, 170, "client"]], [[0, 2], [1, 2], [5, 3], [3, 4]]),
    "microservices": S([["phone", 55, 170, "client"], ["lb", 165, 170, "gateway"], ["hex", 295, 65, "users"], ["hex", 345, 170, "cart"], ["hex", 295, 275, "orders"], ["hex", 460, 105, "pay"], ["hex", 460, 240, "search"]], [[0, 1], [1, 2], [1, 3], [1, 4], [3, 5], [3, 6]]),
    "ms-patterns": S([["gear", 80, 170, "orchestrator"], ["hex", 215, 65, "order"], ["hex", 320, 170, "payment"], ["hex", 215, 275, "inventory"], ["queue", 460, 85, "events"], ["lock", 460, 255, "breaker"]], [[0, 1], [0, 2], [0, 3], [2, 4], [2, 5]])
  };

  // ── Charts ──
  const H = (n) => { let s = 0; for (let i = 1; i <= n; i++) s += 1 / i; return s; };
  const HN = H(10000);
  const zipfSizes = [10, 50, 100, 500, 1000, 2000, 5000];
  const N = [2, 3, 4, 5, 6, 8, 10, 12, 16];
  const bits = [2, 4, 6, 8, 10, 12, 14, 16];
  const CH = {
    "hld-101": {
      "Problem 2": { type: "line", title: "What extra capacity costs", sub: "illustrative: big machines get pricier per core", x: { label: "capacity needed (× today)", values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => v + "×") }, y: { label: "monthly cost (× today)" }, unit: "×", series: [{ name: "Vertical", values: [1, 3, 5.8, 9.2, 13.1, 17.6, 22.5, 27.9, 33.6, 39.8] }, { name: "Horizontal", values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }], band: [6, 9, "no bigger machine exists"], note: "Vertical scaling also stops altogether once you hit the biggest machine available." },
      "Heartbeats": { type: "bar", title: "Worst-case time a dead server still gets traffic", sub: "unhealthy threshold 2, timeout 5 s", data: [["check every 10 s", 25], ["check every 30 s", 65], ["check every 60 s", 125]], unit: "s", highlight: 1, note: "≈ threshold × interval + timeout. Faster checks find failures sooner but add load." }
    },
    "lb-ch": {
      "Consistent hashing": { type: "line", title: "Share of keys that move when you add one server", x: { label: "servers before the change", values: N }, y: { label: "keys moved" }, fmt: "pct", series: [{ name: "hash % N", values: N.map((n) => (n / (n + 1)) * 100) }, { name: "Hash ring", values: N.map((n) => (1 / (n + 1)) * 100) }], note: "With modulo, almost everything moves (a cache wipe or a huge migration). With a ring, only about 1/(N+1)." }
    },
    "caching": {
      "Why caching works": { type: "bar", title: "How long one fetch takes", data: [["L1 cache", 1], ["RAM", 100], ["SSD read", 100000], ["Same-datacenter round trip", 500000], ["Disk seek (HDD)", 10000000], ["California ↔ Netherlands", 150000000]], fmt: "ns", log: true, highlight: 1 },
      "Eviction": { type: "line", title: "Hit ratio vs cache size", sub: "10,000 keys with Zipf-shaped popularity", x: { label: "cache size (share of all keys)", values: zipfSizes.map((k) => (k / 100).toString() + "%") }, y: { label: "hit ratio", max: 100 }, fmt: "pct", series: [{ name: "Hit ratio", values: zipfSizes.map((k) => (H(k) / HN) * 100) }], note: "Caching just 1% of the keys serves about half of all requests, and 10% serves about three quarters. That's why small caches work." }
    },
    "cache-scaler": {
      "The versioned-filename trick": { type: "bar", title: "Time per submission", data: [["Cache hit: 50 ms DB + 40 ms local disk", 90], ["Cache miss: 50 ms DB + 2 s from S3", 2050]], fmt: "ms", highlight: 0, note: "A hit is about 23× faster. Misses only happen once per server per file version." },
      "Problem: the contest ranklist": { type: "bar", title: "Ranklist recomputations per minute", sub: "5,000 ranklist views/min, 20 app servers", data: [["No cache", 5000], ["Local cache on each server", 20], ["One global cache (Redis)", 1]], log: true, highlight: 2 }
    },
    "fb-feed": {
      "Do the math": { type: "bar", title: "Feed writes per day", sub: "20M posts/day, ~1,000 friends each", data: [["Precomputed feeds (push to every friend)", 20e9], ["Shared recent-posts store", 20e6]], log: true, highlight: 1, note: "1,000× fewer writes, at the cost of a two-step read." }
    },
    "cap": {
      "Master-slave": { type: "bar", title: "Write latency by replication mode", sub: "example: replicas take 2–20 ms to confirm", data: [["Async: ack from master only", 2], ["Semi-sync: master + 1 replica", 6], ["Sync: master + all 3 replicas", 22]], fmt: "ms", note: "The slowest replica sets the speed of synchronous writes. That's PACELC's latency/consistency trade." }
    },
    "sql-nosql": {
      "Choosing a sharding key": { type: "bar", title: "Shards touched by getAllBookmarks(user), 16 shards", data: [["Shard by user_id", 1], ["Shard by site_url", 16]], highlight: 0, note: "One key choice turns a single lookup into a 16-way fan-out." }
    },
    "shard-ops": {
      "Multi-master": { type: "bar", title: "Dead replicas a write can survive (N = 5)", data: [["W = 1 (fast, weak)", 4], ["W = 3 (majority)", 2], ["W = 5 (all)", 0]], highlight: 1, note: "Pair W = 3 with R = 3 and every read overlaps the latest write (3 + 3 > 5)." }
    },
    "lsm": {
      "Play with an LSM tree": { type: "bar", title: "Spinning-disk write throughput (approx.)", data: [["Sequential appends", 150], ["Random 4 KB writes (~120 IOPS)", 0.5]], unit: "MB/s", log: true, highlight: 0, note: "Turning random writes into sequential ones is the whole trick of an LSM tree." },
      "Bloom filters": { type: "line", title: "Bloom filter false positives vs memory", x: { label: "bits per key", values: bits }, y: { label: "false-positive rate", log: true }, fmt: "pct", series: [{ name: "false positives", values: bits.map((b) => Math.pow(0.6185, b) * 100) }], note: "With the best number of hash functions, about 10 bits per key gives roughly 1% false positives." }
    },
    "typeahead": {
      "Taming the writes": { type: "bar", title: "Main-store writes per day", sub: "Google scale; the last bar is an estimate", data: [["Every search", 10e9], ["1% sampling", 100e6], ["Sampling + threshold buffer", 5e6]], log: true, highlight: 2 },
      "Recency": { type: "line", title: "How much a search still counts after d days", x: { label: "days ago", values: [0, 1, 2, 3, 4, 5, 6, 7] }, y: { label: "weight", max: 100 }, fmt: "pct", series: [{ name: "TDF = 2", values: [0, 1, 2, 3, 4, 5, 6, 7].map((d) => 100 / Math.pow(2, d)) }, { name: "TDF = 1.25", values: [0, 1, 2, 3, 4, 5, 6, 7].map((d) => 100 / Math.pow(1.25, d)) }] }
    },
    "messaging": {
      "Sharding key": { type: "line", title: "Database writes per message", x: { label: "people in the conversation", values: [2, 5, 10, 50, 100, 500, 1000] }, y: { label: "writes", log: true }, series: [{ name: "userId", values: [2, 5, 10, 50, 100, 500, 1000] }, { name: "conversationId", values: [1, 1, 1, 1, 1, 1, 1] }], note: "Group chat is what pushes Slack-like apps to shard by conversation." }
    },
    "search": {
      "The inverted index": { type: "bar", title: "Work to answer one search over 1B posts (approx.)", data: [["SQL LIKE '%job post%' (scan every row)", 1e9], ["Inverted index (read 2 posting lists)", 2e6]], log: true, unit: "rows", highlight: 1 }
    },
    "storage-geo": {
      "Storing very large files": { type: "bar", title: "NameNode entries for one 50 TB file", data: [["1 MB blocks", 5e7], ["64 MB blocks", 781250], ["128 MB blocks", 390625]], log: true, highlight: 2 },
      "The quadtree": { type: "donut", title: "RAM for a quadtree of 100M places", data: [["Tree nodes", 0.52], ["Coordinates", 3.2]], center: "≈ 4 GB", centerSub: "fits on one box", fmt: "num", unit: "GB" }
    },
    "video": {
      "Q3": { type: "line", title: "Live delay vs segment length", sub: "players buffer about 3 segments", x: { label: "segment length", values: ["2 s", "6 s", "10 s", "15 s", "30 s", "60 s"] }, y: { label: "delay behind live" }, unit: "s", series: [{ name: "delay", values: [6, 18, 30, 45, 90, 180] }, { name: "requests per viewer / min", values: [30, 10, 6, 4, 2, 1] }], note: "Short segments mean low delay but many more requests and much more metadata." }
    },
    "kafka-zk": {
      "Kafka, from first principles": { type: "line", title: "Consumer-group throughput, 6 partitions", x: { label: "consumers in the group", values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }, y: { label: "messages / s" }, series: [{ name: "throughput", values: [1, 2, 3, 4, 5, 6, 6, 6, 6, 6].map((v) => v * 1000) }], band: [5, 9, "extra consumers sit idle"] },
      "ZooKeeper's own reliability": { type: "bar", title: "ZooKeeper nodes that can fail", data: [["3 nodes", 1], ["4 nodes", 1], ["5 nodes", 2], ["7 nodes", 3]], highlight: 2, note: "An even fourth node adds cost but no fault tolerance." }
    },
    "ids-limits": {
      "Twitter Snowflake": { type: "donut", title: "A 64-bit Snowflake ID", data: [["Sign", 1], ["Timestamp (ms)", 41], ["Datacenter", 5], ["Machine", 5], ["Sequence", 12]], colors: ["#8a887f", "var(--c)", "#1f8a8a", "#c2456b", "#b7791f"], center: "64", centerSub: "bits" },
      "Rate limiters": { type: "bar", title: "Memory per client (limit 100 per window)", data: [["Sliding window log", 800], ["Fixed window counter", 8], ["Sliding window counter", 16], ["Token bucket", 16]], fmt: "bytes", highlight: 2 }
    },
    "microservices": {
      "The price of microservices": { type: "line", title: "Minimum machines before any traffic", x: { label: "number of services", values: [1, 5, 10, 20, 40] }, y: { label: "machines" }, series: [{ name: "Microservices", values: [2, 10, 20, 40, 80] }, { name: "Monolith", values: [2, 2, 2, 2, 2] }], note: "Each service needs at least one app server and one database." }
    },
    "ms-patterns": {
      "Circuit breaker": { type: "line", title: "Caller threads stuck waiting (pool of 50)", sub: "20 req/s, 2 s timeout", x: { label: "dependency failure rate", values: ["0%", "20%", "40%", "60%", "80%", "100%"] }, y: { label: "busy threads", max: 50 }, series: [{ name: "No breaker", values: [0, 8, 16, 24, 32, 40] }, { name: "With breaker", values: [0, 8, 16, 1, 1, 1] }], note: "Without a breaker the caller's threads fill up, and that's how a cascading failure starts." }
    }
  };
  BP.LESSONS.forEach((l) => {
    const map = CH[l.id] || {};
    Object.entries(map).forEach(([prefix, spec]) => {
      const sec = l.sections.find((s) => s.h.startsWith(prefix)) || l.sections[l.sections.length - 1];
      sec.blocks.push(["chart", spec]);
    });
  });
})();
