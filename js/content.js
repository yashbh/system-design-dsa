/* Blueprint — shared toolkit data (latency numbers, interview framework, building-block cheat sheet, calculator presets).
 * Case studies live in js/cases/, one file per case; building blocks live in js/concepts/.
 * Architectures are simplified, educational models built from public engineering blogs and talks,
 * not internal documentation of any company.
 */
window.BP = window.BP || {};
BP.CONCEPTS = {};
BP.CASES = [];

BP.LATENCY = [
  ["L1 cache reference", 1, "ns"],
  ["Main memory (RAM) reference", 100, "ns"],
  ["SSD random read", 100000, "ns"],
  ["Round trip within a data center", 500000, "ns"],
  ["Redis GET (same DC, incl. network)", 700000, "ns"],
  ["HDD disk seek", 10000000, "ns"],
  ["Round trip US East ↔ US West", 70000000, "ns"],
  ["Round trip California ↔ Netherlands", 150000000, "ns"],
  ["A human blink", 300000000, "ns"]
];

BP.FRAMEWORK = [
  { n: 1, t: "Clarify requirements", m: "~5 min", b: "Functional (what it does) and non-functional (scale, latency, availability, consistency). Ask: who are the users? Read-heavy or write-heavy? What can be eventually consistent?", ex: "\"Do short links expire? Do we need analytics? How many links per day?\"" },
  { n: 2, t: "Estimate the scale", m: "~5 min", b: "QPS (average and peak), storage growth, bandwidth, memory for caches. These numbers decide your architecture: 100 QPS and 100k QPS are different problems.", ex: "100M/day ÷ 86,400 ≈ 1,160/s. Peak ≈ 2–3× average." },
  { n: 3, t: "High-level design", m: "~10–15 min", b: "Draw clients, load balancer, services, data stores, caches, queues. Walk one request end to end. Define the core APIs and data model.", ex: "POST /shorten → ID → Base62 → KV write. GET /:code → cache → KV → 302." },
  { n: 4, t: "Deep dive", m: "~15 min", b: "Pick the hardest 1–2 parts: hot keys, consistency, the partition key, fan-out, failure modes. Discuss alternatives and trade-offs explicitly.", ex: "Celebrity problem → hybrid fan-out. Double-booking → atomic conditional writes." },
  { n: 5, t: "Wrap up", m: "~5 min", b: "Bottlenecks, single points of failure, monitoring and alerts, what you'd do with more time. Show that you know what you didn't cover.", ex: "\"Next I'd add multi-region replication and a chaos-testing plan.\"" }
];

BP.BLOCKS = [
  ["Relational DB (Postgres, MySQL)", "Transactions, joins, strong consistency, moderate scale", "Orders, payments, users"],
  ["Key-value / wide-column (DynamoDB, Cassandra)", "Massive scale, simple access patterns, predictable latency", "Short links, messages, sessions"],
  ["In-memory cache (Redis, Memcached)", "Sub-ms reads of hot data; counters; locks with TTL", "Feeds, seat holds, rate limits"],
  ["Message queue / log (Kafka, SQS)", "Async work, smoothing spikes, fan-out, event streams", "Analytics, notifications, fan-out"],
  ["Object storage (S3)", "Large blobs, cheap and durable", "Photos, videos, backups"],
  ["CDN", "Global low-latency delivery of static or heavy content", "Images, video segments, JS bundles"],
  ["Search index (Elasticsearch)", "Full-text and faceted search", "Product search, logs"],
  ["Load balancer", "Spread traffic, health checks, TLS termination", "In front of every stateless tier"]
];

BP.PRESETS = {
  bitly: { dau: 100e6, writes: 1, ratio: 100, size: 500, years: 5, peak: 3 },
  instagram: { dau: 500e6, writes: 0.2, ratio: 50, size: 2e6, years: 5, peak: 3 },
  whatsapp: { dau: 2e9, writes: 50, ratio: 1, size: 100, years: 0.01, peak: 2 },
  discord: { dau: 150e6, writes: 7, ratio: 20, size: 1000, years: 5, peak: 3 }
};
