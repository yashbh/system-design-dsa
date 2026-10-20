/* Blueprint — expanded concept library. Adds course concepts and attaches an
 * interactive figure (`fig` = BP.FIGS name, `sim` = BP.SIMS name) to each, plus
 * `when` (when to reach for it) and `pitfalls`. Lesson links are derived from BP.LESSONS. */
(function () {
  const C = BP.CONCEPTS;
  const add = (id, o) => (C[id] = Object.assign({ used: [] }, C[id] || {}, o));

  // Attach figures and depth to existing concepts.
  Object.assign(C["caching"], { fig: "cachepath", when: "Reads ≫ writes, the same data is requested repeatedly, or a result is expensive to compute.", pitfalls: "Stale data, cache stampedes when a hot key expires, and treating the cache as the source of truth." });
  Object.assign(C["cdn"], { fig: "cachepath", when: "Static assets, images, video segments, and anything identical for many users far from your servers.", pitfalls: "Invalidation delays; personalised or private content shouldn't be cached at shared edges." });
  Object.assign(C["load-balancing"], { fig: "lb", when: "As soon as you have more than one server, which is from day one if you want zero-downtime deploys.", pitfalls: "The LB itself must be redundant; sticky sessions undermine even load; shallow health checks miss broken dependencies." });
  Object.assign(C["consistent-hashing"], { sim: "ring", when: "Distributing keys over a changing set of nodes: caches, sharded databases, app-server affinity.", pitfalls: "Without virtual nodes, load is lumpy and a failed node dumps everything onto one neighbour." });
  Object.assign(C["sharding"], { fig: "shardkey", when: "Data or write volume exceeds one machine (the notes' delicious disk filled in ~6 months).", pitfalls: "A bad key causes hot shards or fan-out queries; cross-shard JOINs and transactions get hard; resharding is painful." });
  Object.assign(C["replication"], { fig: "replication", when: "You need read scaling, high availability, or protection against losing a machine.", pitfalls: "Replication lag (stale reads), data loss on async failover, and write bottlenecks on a single master." });
  Object.assign(C["rate-limiting"], { fig: "ratealgos", when: "Public APIs, login endpoints, expensive operations, multi-tenant fairness.", pitfalls: "Fixed windows allow 2× bursts at boundaries; distributed counters need atomic ops; decide fail-open vs fail-closed." });
  Object.assign(C["snowflake"], { fig: "snowflake", when: "You need unique, time-sortable 64-bit IDs generated on many machines without coordination." });
  Object.assign(C["id-generation"], { fig: "snowflake" });
  Object.assign(C["message-queue"], { fig: "kafka", when: "Work that doesn't need to finish before you respond: notifications, emails, analytics, fan-out.", pitfalls: "At-least-once delivery means consumers must be idempotent; watch consumer lag and poison messages." });
  Object.assign(C["fanout"], { sim: "fanout" });
  Object.assign(C["idempotency"], { sim: "stripe", when: "Any mutating API that clients may retry: payments, orders, message sends.", pitfalls: "Keys must be generated per logical operation (not per retry) and stored atomically with the result." });
  Object.assign(C["geo-index"], { sim: "geo" });
  Object.assign(C["abr"], { sim: "abr" });
  Object.assign(C["object-storage"], { fig: "hdfs" });
  Object.assign(C["websockets"], { sim: "chat" });
  Object.assign(C["acks"], { sim: "chat" });
  Object.assign(C["store-forward"], { sim: "chat" });
  Object.assign(C["waiting-room"], { sim: "onsale" });
  Object.assign(C["ttl-lock"], { sim: "onsale" });
  Object.assign(C["optimistic-concurrency"], { sim: "onsale" });
  Object.assign(C["base62"], { sim: "shortener" });

  add("dns", { name: "DNS (Domain Name System)", icon: "📇", cat: "Networking", fig: "dns",
    one: "The internet's phone book: turns names like del.icio.us into IP addresses.",
    analogy: "Saving \"Mom\" in your contacts instead of memorising her number. The phone looks up the number for you.",
    body: "Registrars sell names, and ICANN keeps the authoritative ownership records. You publish an <b>A record</b> (name → IPv4) with your DNS provider. Lookups go browser cache → OS → <b>recursive resolver</b> → root → TLD → <b>authoritative</b> server, and every answer is cached for its <b>TTL</b>. Replicating the directory worldwide avoids a single point of failure; the price is that changes take up to the TTL to propagate.",
    when: "Every public service. Also used for coarse load balancing and geo-routing (GSLB).", pitfalls: "Long TTLs slow down failover; short TTLs increase lookup load." });
  add("vertical-horizontal", { name: "Vertical vs horizontal scaling", icon: "📈", cat: "Scaling", fig: "scaling",
    one: "Scale up (a bigger machine) or scale out (more machines behind a load balancer).",
    analogy: "Vertical: buying a bigger truck. Horizontal: hiring more trucks and a dispatcher.",
    body: "Vertical scaling needs no code changes but hits a hardware ceiling, gets super-linearly expensive, and remains a single point of failure with downtime on every restart. Horizontal scaling grows almost linearly and survives failures, but requires a load balancer, <b>stateless</b> app servers and a plan for partitioning data.",
    when: "Scale up first for simplicity, and scale out once you need availability or outgrow the biggest box.", pitfalls: "Horizontal scaling with stateful servers (sessions in memory) breaks round-robin routing." });
  add("health-checks", { name: "Health checks & heartbeats", icon: "💓", cat: "Reliability", fig: "lb",
    one: "Continuously verify servers are alive so traffic only goes to healthy ones.",
    analogy: "A lifeguard counting swimmers every 30 seconds and blowing the whistle when one stops waving.",
    body: "<b>Health check</b>: the LB pings each host (port, path, protocol) every interval; after N consecutive failures (unhealthy threshold) it stops routing there, and after M successes it adds the host back. <b>Heartbeat</b>: the server pushes \"I'm alive\" instead. The notes' example (30 s interval, 5 s timeout, thresholds of 2) means up to ~65 s of traffic can reach a dead host.",
    when: "Behind every load balancer, in orchestrators, ZooKeeper sessions, HDFS DataNodes.", pitfalls: "Checking only \"/\" can report healthy while the database is down; checks that are too aggressive cause flapping." });
  add("stateless", { name: "Stateless app servers", icon: "🧼", cat: "Scaling", fig: "scaling",
    one: "Servers keep no per-user data in memory, so any server can handle any request.",
    analogy: "Bank tellers who look up your account in the central system. Any free teller can serve you.",
    body: "Move sessions, carts and uploads out of server memory into a shared store (Redis, the DB, object storage). Separate code machines from data machines: deploys stop affecting data, and the two tiers scale independently. Servers become cattle, not pets, so autoscaling and rolling deploys become trivial.",
    when: "Always, for the web/app tier.", pitfalls: "Hidden state (local file uploads, in-memory caches you rely on for correctness) quietly breaks it." });
  add("memory-hierarchy", { name: "Memory hierarchy & latency numbers", icon: "🧠", cat: "Performance", fig: "memory",
    one: "Each storage tier is ~10–1000× slower but bigger and cheaper than the one above it.",
    analogy: "Your desk (L1), your bookshelf (RAM), the library across town (disk), another country (a cross-continent network trip).",
    body: "Approximate costs: L1 ~1 ns, RAM ~100 ns, SSD random read ~100 µs, same-DC round trip ~0.5 ms, disk seek ~10 ms, California ↔ Netherlands ~150 ms. The notes' anchors: a local file read ~40 ms, a MySQL query ~50 ms, a big file from remote storage ~2 s. Every caching decision is about moving hot data up this ladder.",
    when: "Back-of-the-envelope estimates and justifying caches, CDNs and data locality." });
  add("ttl", { name: "TTL (time to live)", icon: "⏳", cat: "Performance", fig: "cachepath",
    one: "Every cached entry expires after a fixed time and is refetched on the next request.",
    analogy: "A \"best before\" date: after it, you throw it out and buy fresh.",
    body: "TTL is the simplest invalidation strategy: entry X cached at T with TTL 60 s is served until T+60, then refetched. A low TTL means more misses; a high TTL means staler data. For exact invalidation, version your keys instead (e.g. <code>problem_200_t2_input.txt</code>).",
    when: "Data that can be a little stale: DNS, product listings, leaderboards, CDN content.", pitfalls: "Many keys expiring at once cause a stampede; add jitter to TTLs." });
  add("write-policies", { name: "Write-through / write-back / write-around", icon: "✍️", cat: "Performance", fig: "writepolicy",
    one: "Three ways to keep a cache and its database in sync when data is written.",
    analogy: "Write-through: update the notebook and the ledger together. Write-back: jot it on a sticky note, copy it into the ledger tonight. Write-around: update the ledger and tear out the old notebook page.",
    body: "<b>Write-through</b>: cache and DB synchronously, so it's fresh and durable but writes are slower. <b>Write-back</b>: cache only and flush later, giving the fastest writes but possible data loss if the cache dies. <b>Write-around</b>: DB only and invalidate the cache, so the cache isn't filled with write-once data but the next read misses.",
    when: "Through for read-after-write consistency; back for analytics and counters; around for rarely re-read data.", pitfalls: "Write-back needs replication or a log if losing writes is unacceptable." });
  add("eviction", { name: "Eviction policies (LRU, LFU, FIFO…)", icon: "🧹", cat: "Performance", fig: "eviction",
    one: "When the cache is full, decide which entry to throw away.",
    analogy: "Clearing out your fridge: toss what you haven't touched in longest (LRU) or what you rarely eat (LFU).",
    body: "FIFO evicts the oldest inserted, <b>LRU</b> the least recently used (hashmap + doubly linked list, O(1)), <b>LFU</b> the least frequently used, MRU the most recently used (good for sequential scans). Redis approximates LRU/LFU by sampling, and its default is <code>noeviction</code> (writes fail when full).",
    when: "Pick the policy that predicts your access pattern. allkeys-lru is a solid default.", pitfalls: "FIFO evicts hot keys; LFU can keep formerly-hot keys forever without decay." });
  add("redis", { name: "Redis", icon: "🟥", cat: "Storage", fig: "leaderboard",
    one: "An in-memory key-value store with rich data types, used for caches, counters, leaderboards, locks and queues.",
    analogy: "A super-fast whiteboard everyone in the office can read and write.",
    body: "Commands run on a single thread, so each is atomic. Types include strings, hashes, lists, sets, sorted sets (great for leaderboards) and bitmaps. Optional persistence (AOF/RDB). <b>Redis Cluster</b> shards keys into 16,384 hash slots (CRC16(key) mod 16384) across masters with replicas, gossiping over a cluster bus port and redirecting clients with MOVED.",
    when: "Hot data, sessions, rate-limit counters, distributed locks with TTL, real-time rankings.", pitfalls: "RAM is expensive; the default noeviction plus no maxmemory can OOM the box." });
  add("cap", { name: "CAP theorem", icon: "🔺", cat: "Data", fig: "cap",
    one: "During a network partition, a distributed system must choose consistency or availability.",
    analogy: "Rohit and Raj keep separate reminder diaries. When they stop talking, Raj either refuses new reminders (C) or takes them and risks contradicting Rohit (A).",
    body: "<b>C</b>: every read sees the latest write (or errors). <b>A</b>: every request gets a non-error answer. <b>P</b>: the system tolerates lost messages between nodes. Partitions are unavoidable once data lives on multiple machines, so the real choice is CP vs AP <i>during</i> a partition. CA only exists on a single node.",
    when: "Classifying requirements: bank balances and seat inventory → C; feeds, likes, search → A.", pitfalls: "Labelling whole databases CP/AP is crude; real systems choose per operation and per configuration." });
  add("pacelc", { name: "PACELC", icon: "⏱️", cat: "Data", fig: "cap",
    one: "If Partition: Availability vs Consistency. Else: Latency vs Consistency.",
    analogy: "Even on a calm day, waiting for everyone to sign off on a decision is slower than deciding alone.",
    body: "CAP is silent about the normal case. PACELC adds that synchronous replication (wait for replicas) gives consistency at the cost of latency, while asynchronous replication is fast with a staleness window. Dynamo/Cassandra defaults lean PA/EL; a synchronously replicated ledger is PC/EC." });
  add("consistency-models", { name: "Strong vs eventual consistency", icon: "🔄", cat: "Data", fig: "replication",
    one: "Strong: reads always see the latest write. Eventual: replicas converge if writes stop.",
    analogy: "Strong: a live scoreboard. Eventual: newspapers in different towns that all print the same result by tomorrow.",
    body: "Strong consistency needs synchronous coordination (quorums, single leader reads). Eventual consistency lets replicas lag and reconcile (gossip, read repair, timestamp merges). Middle grounds: read-your-writes, monotonic reads, causal consistency.",
    when: "Strong for money, inventory, locks, messages. Eventual for feeds, counters, recommendations." });
  add("acid", { name: "ACID transactions", icon: "🧪", cat: "Data", fig: "datamodels",
    one: "Atomic, Consistent, Isolated, Durable: the guarantees that make a relational transaction safe.",
    analogy: "A bank transfer that either fully happens or never happened. No one ever sees the money in mid-air.",
    body: "<b>Atomicity</b>: all statements commit or none do. <b>Consistency</b>: invariants (balance ≥ 0) hold before and after. <b>Isolation</b>: concurrent transactions don't see each other's partial work, which prevents the ₹1,500 → −₹500 double-withdrawal race. <b>Durability</b>: committed data survives crashes. Note that ACID's C is not CAP's C.",
    when: "Money, orders, anything with invariants spanning multiple rows.", pitfalls: "Distributed ACID across shards/services is expensive; use sagas or co-locate data." });
  add("nosql-types", { name: "NoSQL families", icon: "🗃️", cat: "Storage", fig: "datamodels",
    one: "Key-value, document, wide-column and graph databases, each optimised for a different access pattern.",
    analogy: "Different containers: a coat-check (KV), folders of forms (documents), a ledger sorted by date per customer (wide-column), a corkboard with strings (graph).",
    body: "<b>KV</b> (Redis, DynamoDB): get/put by key. <b>Document</b> (MongoDB): flexible JSON, query any field. <b>Wide-column</b> (Cassandra, HBase): rows by partition key, columns sorted by clustering key, built for huge write rates and \"latest N\" reads. <b>Graph</b> (Neo4j): relationships first. Pick from the dominant query, not from hype.",
    when: "Schema varies wildly, data must shard horizontally, or access is simple key/range lookups." });
  add("denormalization", { name: "Denormalization", icon: "📑", cat: "Data", fig: "shardkey",
    one: "Duplicate data on purpose so each frequent read hits one place, with no joins.",
    analogy: "Keeping a copy of a letter in both the sender's and the receiver's file cabinets.",
    body: "After sharding, JOINs across machines are slow, so store what a query needs together: a message in both users' mailboxes, the author's name inside each post. Reads become one-shard lookups; writes multiply and copies can drift.",
    pitfalls: "Every update must touch all copies. Plan for repair jobs or accept eventual consistency." });
  add("orchestrator", { name: "Orchestrator (cluster manager)", icon: "🎛️", cat: "Reliability",
    one: "The control-plane brain that adds shards, replaces dead machines and keeps the replication level.",
    analogy: "A football manager substituting injured players and bringing new signings into the squad.",
    body: "It watches heartbeats, keeps X standby machines for instant replacement, uses spares as extra replicas, and creates new shards in two phases (staging copy, then go-live and catch-up) so downtime shrinks from minutes to seconds. Examples: the HDFS NameNode, the HBase HMaster, the Kubernetes control plane.",
    pitfalls: "Never add capacity reactively at peak; the migration itself adds load." });
  add("quorum", { name: "Quorums & tunable consistency", icon: "🗳️", cat: "Data", fig: "quorum",
    one: "Write to W replicas and read from R; if R + W > N, every read overlaps the latest write.",
    analogy: "If 3 of 5 judges must sign every decision and you always ask 3 judges, at least one of them was in the room.",
    body: "With N replicas, choose W and R per request. N=3, W=2, R=2 is balanced and strong. W=1, R=1 is fastest and eventual. Majority quorums also prevent split brain in ZooKeeper and Raft. When R + W ≤ N (like Dynamo's cart, 5/2/2), conflicting versions are merged.",
    when: "Dynamo-style stores (Cassandra, DynamoDB), consensus systems." });
  add("lsm", { name: "LSM tree", icon: "🌲", cat: "Storage", fig: "lsm",
    one: "A write-optimised storage engine: memtable in RAM + append-only log + immutable sorted files merged in the background.",
    analogy: "Scribble orders on a notepad, file them sorted every hour, and merge the binders on quiet nights.",
    body: "Writes append to a WAL and go into a sorted in-memory memtable. When it's full, it's flushed as an <b>SSTable</b> (sorted, immutable, split into 64 KB blocks with a sparse index). Reads check the memtable then SSTables newest-first, skipping tables via Bloom filters. <b>Compaction</b> merges SSTables, keeping the newest value and dropping tombstones. Used by Cassandra, HBase, RocksDB and ScyllaDB.",
    when: "Write-heavy workloads at scale.", pitfalls: "Reads may touch several files (read amplification); compaction consumes I/O." });
  add("bloom-filter", { name: "Bloom filter", icon: "🌸", cat: "Data", fig: "bloom",
    one: "A tiny bit array that answers \"definitely not present\" or \"maybe present\".",
    analogy: "A bouncer with a rough guest list: if you're not on it you're definitely out; if you might be, they check properly.",
    body: "Add sets k hashed bit positions; check looks at those k bits. Any 0 means absent (no false negatives); all 1s means maybe (false positives grow as it fills). ~10 bits per key gives ~1% false positives. LSM trees keep one per SSTable to skip disk reads for missing keys. Also used by CDNs, browsers and spell-checkers.",
    pitfalls: "You can't delete from a standard Bloom filter (use counting filters)." });
  add("wal", { name: "Write-ahead log (WAL)", icon: "📜", cat: "Reliability", fig: "lsm",
    one: "Append every change to a durable log before applying it, so a crash can be replayed.",
    analogy: "A ship's logbook: if the captain forgets, the log tells you exactly what happened.",
    body: "Appends are sequential and fast. After a crash, replay the log from the last checkpoint to rebuild in-memory state (an LSM memtable, DB pages). MySQL's binlog and Kafka's partitions are the same idea used for replication and streaming." });
  add("trie", { name: "Trie (prefix tree)", icon: "🌿", cat: "Data", fig: "trie",
    one: "A tree where each edge is a character; perfect for prefix lookups like autocomplete.",
    analogy: "A dictionary's thumb-index tabs: M → MI → MIC narrows the search with every letter.",
    body: "Walking a prefix is O(length). For typeahead, store the top-k completions at every node so a keystroke returns instantly, and update ancestors when a term's frequency changes (buffer or sample those writes). At scale, a prefix → top-k hashmap in a KV store is often more practical.",
    pitfalls: "Memory-hungry; no off-the-shelf database stores tries." });
  add("inverted-index", { name: "Inverted index", icon: "🔎", cat: "Data", fig: "invindex",
    one: "Map every word to the documents (and positions) containing it: the heart of full-text search.",
    analogy: "The index at the back of a textbook: \"replication … pages 41, 87, 112\".",
    body: "Lucene tokenizes, removes stop words, stems (running → run) and records term → [(doc, position)]. Queries look up and intersect posting lists instead of scanning every row like <code>LIKE '%x%'</code>. Elasticsearch shards the index by document id and replicates it.",
    when: "Search boxes, log analytics (ELK), resume and product search." });
  add("hdfs", { name: "Distributed file systems (HDFS / GFS)", icon: "🐘", cat: "Storage", fig: "hdfs",
    one: "Split huge files into large blocks, replicate each block on several machines and racks, and track them in a metadata server.",
    analogy: "A library that cuts a giant encyclopedia into volumes, shelves three copies of each in different buildings, and keeps one catalogue.",
    body: "Blocks are 128 MB (fewer metadata entries, sequential throughput). The NameNode holds the file → block → DataNode map in RAM; DataNodes store blocks and heartbeat. Replicas are rack-aware (1 local, 2 on another rack). A dead node triggers re-replication. File data never passes through the NameNode.",
    when: "Batch analytics, data lakes, very large files." });
  add("quadtree", { name: "Quadtree", icon: "🔲", cat: "Data", fig: "quadtree",
    one: "Recursively split 2-D space into four quadrants wherever there are too many points.",
    analogy: "Zooming into a map: you only zoom in where there's lots to see.",
    body: "Each cell holds at most ~100 points; overflow splits it into 4. Dense areas get deep, tiny cells. Finding your cell is O(log N); nearest-neighbour search checks your cell and neighbours. 100M places fit in ~4 GB of RAM. For moving objects, update only on cell crossings and use split/merge hysteresis.",
    when: "Nearby search (restaurants, cabs), collision detection, map tiling." });
  add("chunking", { name: "Chunking & segmentation", icon: "🧱", cat: "Data", sim: "abr",
    one: "Break big things (files, videos, uploads) into pieces that can be moved, cached and retried independently.",
    analogy: "Moving house box by box instead of trying to lift the whole house.",
    body: "HDFS blocks, S3 multipart uploads, torrent pieces, HLS/DASH video segments. Chunks parallelize transfers, enable resume-on-failure and seeking, and let a CDN cache each piece. The trade-off is chunk size: too small means metadata overhead, too big means latency and wasted transfer." });
  add("zookeeper", { name: "ZooKeeper & leader election", icon: "🐒", cat: "Reliability", fig: "zookeeper",
    one: "A small, strongly consistent coordination store: who's the master, config, locks, membership.",
    analogy: "A town hall notice board that only one candidate can pin the \"mayor\" notice on, and that removes it if the mayor stops showing up.",
    body: "Data lives in znodes. <b>Ephemeral</b> znodes vanish when their creator's session stops heartbeating, which makes election easy: everyone races to create <code>/cluster/master</code> and one wins. <b>Watches</b> notify clients of changes, so they cache instead of polling. Writes go through a leader and need a majority of the ensemble, which prevents split brain.",
    when: "Leader election, service discovery, distributed locks, configuration (Kafka, HBase, HDFS HA)." });
  add("kafka", { name: "Kafka: topics, partitions, consumer groups", icon: "🪵", cat: "Reliability", fig: "kafka",
    one: "A distributed, replicated commit log for high-throughput event streams.",
    analogy: "A conveyor belt split into lanes: same-key items always ride the same lane in order, and each team of workers splits the lanes between them.",
    body: "Topics are split into <b>partitions</b> spread across brokers; <code>hash(key) % partitions</code> preserves per-key order. A <b>consumer group</b> assigns each partition to one member (more members than partitions means idle ones). Consumers track <b>offsets</b> and commit after processing. Data is kept for a retention period (or compacted per key), so many groups can read and even replay it.",
    when: "Event-driven architectures, analytics pipelines, choreography sagas, CQRS relays.", pitfalls: "Changing the partition count reshuffles keys; hot keys overload one partition." });
  add("microservices", { name: "Microservices (vs monolith & SOA)", icon: "🧩", cat: "Architecture", fig: "monolith",
    one: "Split a system into independently deployable services, each owning its own data.",
    analogy: "A food court of independent stalls instead of one giant restaurant kitchen.",
    body: "Pros: independent deploys, scaling and tech stacks, fault isolation, clear API contracts. Cons: more hops and latency, more machines, harder tracing, and cross-service consistency (sagas, CQRS). SOA services may share databases; microservices don't. Start monolithic and split only along real seams.",
    pitfalls: "Over-splitting tightly coupled features creates chatty, fragile systems." });
  add("api-gateway", { name: "API gateway", icon: "🚪", cat: "Architecture",
    one: "An application-layer front door that authenticates, rate-limits and routes requests to the right service.",
    analogy: "A hotel reception: checks your ID, then directs you to the right floor.",
    body: "It sits behind the load balancer and routes by path (/ads → Ads service). It also handles auth, rate limiting, TLS, request aggregation and protocol translation (REST → gRPC). It's replicated for availability. A <b>BFF</b> (backend-for-frontend) is one gateway per client type.",
    pitfalls: "Don't let it become a god-service full of business logic." });
  add("observability", { name: "Observability: logs, metrics, traces", icon: "🔭", cat: "Reliability",
    one: "Detect problems fast, find where they happened, and confirm the fix.",
    analogy: "A smoke alarm (metrics), CCTV footage (logs) and a delivery-tracking timeline (traces).",
    body: "<b>Metrics</b> (time-series: rate, errors, p95 latency) drive alerts. <b>Logs</b>, centralised and tagged with a trace id, explain what happened. <b>Traces</b> (spans per hop) show where time went. Propagate one trace id through every service and queue: the hop where the logs stop is the culprit." });
  add("saga", { name: "Saga pattern", icon: "🎻", cat: "Architecture", fig: "saga",
    one: "A distributed transaction as a sequence of local transactions with compensating undo steps.",
    analogy: "Planning a trip: book the flight, then the hotel, then the car. If the car fails, cancel the hotel and the flight.",
    body: "Each step commits locally in its own service. On a permanent failure, completed steps run compensations (refund, restock). <b>Orchestration</b>: a central coordinator calls each step (faster, easier to observe). <b>Choreography</b>: services react to each other's events on Kafka (no central point of failure). Compensations must be idempotent; use a transactional outbox to publish events reliably.",
    pitfalls: "No isolation: other requests can see intermediate states." });
  add("two-phase-commit", { name: "Two-phase commit (2PC)", icon: "🔒", cat: "Architecture",
    one: "A coordinator asks all participants to prepare (lock), then commit together.",
    analogy: "A wedding officiant: \"Do you? Do you?\" Only after both say yes is it final, and everyone waits in place meanwhile.",
    body: "It gives atomicity across databases, but locks are held across network round trips, every participant must be up, and a coordinator crash after prepare leaves locks stuck. That's why microservices treat it as an anti-pattern and prefer sagas." });
  add("cqrs", { name: "CQRS", icon: "🪞", cat: "Architecture",
    one: "Command Query Responsibility Segregation: separate the write model from purpose-built read models.",
    analogy: "The kitchen records orders; a separate display board shows the summary diners actually want to see.",
    body: "Writes go to the owning services; their change events are relayed (e.g. via Kafka) into a read store designed for a specific query, often joining data from several services. It avoids querying another service's database directly. The read model is eventually consistent." });
  add("circuit-breaker", { name: "Circuit breaker", icon: "🔌", cat: "Reliability", fig: "breaker",
    one: "Stop calling a failing dependency for a while, fail fast with a fallback, then probe for recovery.",
    analogy: "The fuse box in your house: it trips to protect everything else, and you test it before switching back on.",
    body: "<b>Closed</b>: calls flow while failures (timeouts, 5xx, but not \"user not found\") are counted. Above a threshold → <b>Open</b>: short-circuit to a fallback so threads stay free. After T seconds → <b>Half-open</b>: a few trial calls decide between Closed and Open. It prevents cascading failures and gives the sick service room to recover.",
    when: "Every synchronous call to another service or third party." });
})();
