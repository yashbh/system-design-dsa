/* Blueprint building blocks — Scaling, Storage, Performance. Each concept: name, icon, cat, one (one-liner), analogy, body, optional fig/sim, when, pitfalls, used (case ids). */
Object.assign(BP.CONCEPTS, {
  "caching": {
    name: "Caching (cache-aside)",
    icon: "⚡",
    cat: "Performance",
    one: "Keep hot data in memory so most reads never touch the database.",
    analogy: "Keeping your most-used spices on the counter instead of walking to the pantry every time.",
    body: "Cache-aside: read the cache; on a <b>miss</b>, read the DB and populate the cache. Choose an eviction policy (LRU is common) and a TTL. Traffic is usually skewed (a few items get most requests), so a small cache can absorb a large share of reads. Watch out for stale data and cache stampedes.",
    code: "v = cache.get(k)\nif (!v) { v = db.get(k); cache.set(k, v, ttl) }\nreturn v",
    used: ["bitly","instagram","ticketmaster","twitter"],
    fig: "cachepath",
    when: "Reads ≫ writes, the same data is requested repeatedly, or a result is expensive to compute.",
    pitfalls: "Stale data, cache stampedes when a hot key expires, and treating the cache as the source of truth."
  },

  "load-balancing": {
    name: "Load balancing",
    icon: "⚖️",
    cat: "Scaling",
    one: "Spread incoming requests across many identical servers.",
    analogy: "A host at a busy restaurant seating guests at whichever waiter has the fewest tables.",
    body: "Algorithms: round-robin, least-connections, consistent hashing (sticky by key). Health checks remove dead servers. Stateless app servers make this easy: any server can handle any request.",
    used: ["bitly","whatsapp","stripe"],
    fig: "lb",
    when: "As soon as you have more than one server, which is from day one if you want zero-downtime deploys.",
    pitfalls: "The LB itself must be redundant; sticky sessions undermine even load; shallow health checks miss broken dependencies."
  },

  "kv-store": {
    name: "Key-value / NoSQL stores",
    icon: "🗄️",
    cat: "Storage",
    one: "Databases optimized for \"give me the value for this key\" that scale horizontally.",
    analogy: "A coat check: hand over a ticket, get your coat. No searching, no joins.",
    body: "DynamoDB, Cassandra, ScyllaDB and Redis trade rich queries (joins, ad-hoc filters) for predictable low latency and easy partitioning. Design the data around access patterns first.",
    used: ["bitly","discord"]
  },

  "fanout": {
    name: "Fan-out on write vs read",
    icon: "📣",
    cat: "Scaling",
    one: "Precompute feeds when someone posts (push), or assemble them when someone reads (pull).",
    analogy: "Push = delivering a newspaper to every doorstep. Pull = everyone walks to the newsstand.",
    body: "<b>Push</b> makes reads one cheap lookup but a post by someone with millions of followers means millions of writes. <b>Pull</b> makes posting free but every feed open is expensive. Big systems go <b>hybrid</b>: push for normal users, pull for celebrities.",
    used: ["instagram","whatsapp","twitter"],
    sim: "fanout"
  },

  "hot-key": {
    name: "Hot keys & hot partitions",
    icon: "🔥",
    cat: "Scaling",
    one: "When one key (a celebrity, a viral channel, a popular event) gets far more traffic than the rest.",
    analogy: "One checkout lane with a celebrity signing autographs: every other lane is empty, but that one is jammed.",
    body: "Hashing spreads keys evenly, but it can't split <i>one</i> key. Fixes: cache it, replicate reads, split the key (key#1..key#N), coalesce duplicate requests, or treat it specially (pull instead of push).",
    used: ["instagram","discord","ticketmaster","twitter"]
  },

  "sharding": {
    name: "Sharding / partitioning",
    icon: "🧩",
    cat: "Storage",
    one: "Split data across many machines by a partition key.",
    analogy: "A library splitting books across buildings: A–F in one, G–M in the next.",
    body: "Choose the key from your access pattern so a request touches one shard: messages by (channel, time bucket), rides by city, events by event ID. Bad keys cause hot shards or cross-shard queries.",
    used: ["discord","uber","ticketmaster","youtube"],
    fig: "shardkey",
    when: "Data or write volume exceeds one machine (the notes' delicious disk filled in ~6 months).",
    pitfalls: "A bad key causes hot shards or fan-out queries; cross-shard JOINs and transactions get hard; resharding is painful."
  },

  "consistent-hashing": {
    name: "Consistent hashing",
    icon: "💍",
    cat: "Scaling",
    one: "Map keys and nodes onto a ring so adding or removing a node only moves ~1/N of keys.",
    analogy: "Seats around a round table: when a new guest sits down, only the neighbor on one side has to give up some space.",
    body: "With <code>hash(key) % N</code>, changing N moves almost every key, which is a cache and data disaster. On a ring, each key belongs to the next node clockwise. Virtual nodes (many points per server) even out the load.",
    used: ["discord","gdocs"],
    sim: "ring",
    when: "Distributing keys over a changing set of nodes: caches, sharded databases, app-server affinity.",
    pitfalls: "Without virtual nodes, load is lumpy and a failed node dumps everything onto one neighbour."
  },

  "request-coalescing": {
    name: "Request coalescing",
    icon: "🧲",
    cat: "Performance",
    one: "Merge identical concurrent requests into one backend query.",
    analogy: "When ten people ask a librarian for the same book at once, she fetches it once and reads it aloud.",
    body: "If 10,000 users open the same channel at the same moment, the first request queries the DB and the others wait on that in-flight result. Discord did this in a Rust data-services layer in front of its database.",
    used: ["discord"]
  },

  "waiting-room": {
    name: "Virtual waiting room / admission control",
    icon: "🚦",
    cat: "Scaling",
    one: "Let users in at the rate the system can handle; queue the rest fairly.",
    analogy: "A nightclub bouncer: the line outside can be huge, but the dance floor never gets dangerously crowded.",
    body: "Backpressure at the front door. Users get a queue position and are admitted in batches. Randomizing order among early arrivals removes the incentive to hammer refresh.",
    used: ["ticketmaster"],
    sim: "onsale"
  },

  "object-storage": {
    name: "Object storage",
    icon: "🪣",
    cat: "Storage",
    one: "Cheap, durable storage for big blobs (photos, videos), addressed by key.",
    analogy: "A self-storage warehouse: you get a unit number; you don't care which shelf it's on.",
    body: "S3-style stores hold media; databases hold small metadata pointing at the blob. Put a CDN in front for delivery.",
    used: ["instagram","netflix","youtube"],
    fig: "hdfs"
  },

  "vertical-horizontal": {
    used: [],
    name: "Vertical vs horizontal scaling",
    icon: "📈",
    cat: "Scaling",
    fig: "scaling",
    one: "Scale up (a bigger machine) or scale out (more machines behind a load balancer).",
    analogy: "Vertical: buying a bigger truck. Horizontal: hiring more trucks and a dispatcher.",
    body: "Vertical scaling needs no code changes but hits a hardware ceiling, gets super-linearly expensive, and remains a single point of failure with downtime on every restart. Horizontal scaling grows almost linearly and survives failures, but requires a load balancer, <b>stateless</b> app servers and a plan for partitioning data.",
    when: "Scale up first for simplicity, and scale out once you need availability or outgrow the biggest box.",
    pitfalls: "Horizontal scaling with stateful servers (sessions in memory) breaks round-robin routing."
  },

  "stateless": {
    used: [],
    name: "Stateless app servers",
    icon: "🧼",
    cat: "Scaling",
    fig: "scaling",
    one: "Servers keep no per-user data in memory, so any server can handle any request.",
    analogy: "Bank tellers who look up your account in the central system. Any free teller can serve you.",
    body: "Move sessions, carts and uploads out of server memory into a shared store (Redis, the DB, object storage). Separate code machines from data machines: deploys stop affecting data, and the two tiers scale independently. Servers become cattle, not pets, so autoscaling and rolling deploys become trivial.",
    when: "Always, for the web/app tier.",
    pitfalls: "Hidden state (local file uploads, in-memory caches you rely on for correctness) quietly breaks it."
  },

  "memory-hierarchy": {
    used: [],
    name: "Memory hierarchy & latency numbers",
    icon: "🧠",
    cat: "Performance",
    fig: "memory",
    one: "Each storage tier is ~10–1000× slower but bigger and cheaper than the one above it.",
    analogy: "Your desk (L1), your bookshelf (RAM), the library across town (disk), another country (a cross-continent network trip).",
    body: "Approximate costs: L1 ~1 ns, RAM ~100 ns, SSD random read ~100 µs, same-DC round trip ~0.5 ms, disk seek ~10 ms, California ↔ Netherlands ~150 ms. The notes' anchors: a local file read ~40 ms, a MySQL query ~50 ms, a big file from remote storage ~2 s. Every caching decision is about moving hot data up this ladder.",
    when: "Back-of-the-envelope estimates and justifying caches, CDNs and data locality."
  },

  "ttl": {
    used: [],
    name: "TTL (time to live)",
    icon: "⏳",
    cat: "Performance",
    fig: "cachepath",
    one: "Every cached entry expires after a fixed time and is refetched on the next request.",
    analogy: "A \"best before\" date: after it, you throw it out and buy fresh.",
    body: "TTL is the simplest invalidation strategy: entry X cached at T with TTL 60 s is served until T+60, then refetched. A low TTL means more misses; a high TTL means staler data. For exact invalidation, version your keys instead (e.g. <code>problem_200_t2_input.txt</code>).",
    when: "Data that can be a little stale: DNS, product listings, leaderboards, CDN content.",
    pitfalls: "Many keys expiring at once cause a stampede; add jitter to TTLs."
  },

  "write-policies": {
    used: [],
    name: "Write-through / write-back / write-around",
    icon: "✍️",
    cat: "Performance",
    fig: "writepolicy",
    one: "Three ways to keep a cache and its database in sync when data is written.",
    analogy: "Write-through: update the notebook and the ledger together. Write-back: jot it on a sticky note, copy it into the ledger tonight. Write-around: update the ledger and tear out the old notebook page.",
    body: "<b>Write-through</b>: cache and DB synchronously, so it's fresh and durable but writes are slower. <b>Write-back</b>: cache only and flush later, giving the fastest writes but possible data loss if the cache dies. <b>Write-around</b>: DB only and invalidate the cache, so the cache isn't filled with write-once data but the next read misses.",
    when: "Through for read-after-write consistency; back for analytics and counters; around for rarely re-read data.",
    pitfalls: "Write-back needs replication or a log if losing writes is unacceptable."
  },

  "eviction": {
    used: [],
    name: "Eviction policies (LRU, LFU, FIFO…)",
    icon: "🧹",
    cat: "Performance",
    fig: "eviction",
    one: "When the cache is full, decide which entry to throw away.",
    analogy: "Clearing out your fridge: toss what you haven't touched in longest (LRU) or what you rarely eat (LFU).",
    body: "FIFO evicts the oldest inserted, <b>LRU</b> the least recently used (hashmap + doubly linked list, O(1)), <b>LFU</b> the least frequently used, MRU the most recently used (good for sequential scans). Redis approximates LRU/LFU by sampling, and its default is <code>noeviction</code> (writes fail when full).",
    when: "Pick the policy that predicts your access pattern. allkeys-lru is a solid default.",
    pitfalls: "FIFO evicts hot keys; LFU can keep formerly-hot keys forever without decay."
  },

  "redis": {
    used: [],
    name: "Redis",
    icon: "🟥",
    cat: "Storage",
    fig: "leaderboard",
    one: "An in-memory key-value store with rich data types, used for caches, counters, leaderboards, locks and queues.",
    analogy: "A super-fast whiteboard everyone in the office can read and write.",
    body: "Commands run on a single thread, so each is atomic. Types include strings, hashes, lists, sets, sorted sets (great for leaderboards) and bitmaps. Optional persistence (AOF/RDB). <b>Redis Cluster</b> shards keys into 16,384 hash slots (CRC16(key) mod 16384) across masters with replicas, gossiping over a cluster bus port and redirecting clients with MOVED.",
    when: "Hot data, sessions, rate-limit counters, distributed locks with TTL, real-time rankings.",
    pitfalls: "RAM is expensive; the default noeviction plus no maxmemory can OOM the box."
  },

  "nosql-types": {
    used: [],
    name: "NoSQL families",
    icon: "🗃️",
    cat: "Storage",
    fig: "datamodels",
    one: "Key-value, document, wide-column and graph databases, each optimised for a different access pattern.",
    analogy: "Different containers: a coat-check (KV), folders of forms (documents), a ledger sorted by date per customer (wide-column), a corkboard with strings (graph).",
    body: "<b>KV</b> (Redis, DynamoDB): get/put by key. <b>Document</b> (MongoDB): flexible JSON, query any field. <b>Wide-column</b> (Cassandra, HBase): rows by partition key, columns sorted by clustering key, built for huge write rates and \"latest N\" reads. <b>Graph</b> (Neo4j): relationships first. Pick from the dominant query, not from hype.",
    when: "Schema varies wildly, data must shard horizontally, or access is simple key/range lookups."
  },

  "lsm": {
    used: [],
    name: "LSM tree",
    icon: "🌲",
    cat: "Storage",
    fig: "lsm",
    one: "A write-optimised storage engine: memtable in RAM + append-only log + immutable sorted files merged in the background.",
    analogy: "Scribble orders on a notepad, file them sorted every hour, and merge the binders on quiet nights.",
    body: "Writes append to a WAL and go into a sorted in-memory memtable. When it's full, it's flushed as an <b>SSTable</b> (sorted, immutable, split into 64 KB blocks with a sparse index). Reads check the memtable then SSTables newest-first, skipping tables via Bloom filters. <b>Compaction</b> merges SSTables, keeping the newest value and dropping tombstones. Used by Cassandra, HBase, RocksDB and ScyllaDB.",
    when: "Write-heavy workloads at scale.",
    pitfalls: "Reads may touch several files (read amplification); compaction consumes I/O."
  },

  "hdfs": {
    used: [],
    name: "Distributed file systems (HDFS / GFS)",
    icon: "🐘",
    cat: "Storage",
    fig: "hdfs",
    one: "Split huge files into large blocks, replicate each block on several machines and racks, and track them in a metadata server.",
    analogy: "A library that cuts a giant encyclopedia into volumes, shelves three copies of each in different buildings, and keeps one catalogue.",
    body: "Blocks are 128 MB (fewer metadata entries, sequential throughput). The NameNode holds the file → block → DataNode map in RAM; DataNodes store blocks and heartbeat. Replicas are rack-aware (1 local, 2 on another rack). A dead node triggers re-replication. File data never passes through the NameNode.",
    when: "Batch analytics, data lakes, very large files."
  }
});
