/* Blueprint building blocks — Data. Each concept: name, icon, cat, one (one-liner), analogy, body, optional fig/sim, when, pitfalls, used (case ids). */
Object.assign(BP.CONCEPTS, {
  "base62": {
    name: "Base62 encoding",
    icon: "🔤",
    cat: "Data",
    one: "Write a big number using 62 symbols (0-9, a-z, A-Z) so it gets short.",
    analogy: "Decimal uses 10 digits, so 1,000,000 needs 7 of them. With 62 \"digits\", 7 characters can count past 3.5 trillion.",
    body: "Repeatedly divide the number by 62 and map each remainder to a symbol. It's URL-safe (no +, /, =) and reversible. 62^6 ≈ 56.8 billion, 62^7 ≈ 3.52 trillion.",
    code: "while (n > 0) { out = ALPHABET[n % 62] + out; n = Math.floor(n / 62); }",
    used: ["bitly"],
    sim: "shortener"
  },

  "id-generation": {
    name: "Distributed ID generation",
    icon: "🎫",
    cat: "Data",
    one: "Create unique IDs on many machines without asking one central counter every time.",
    analogy: "Instead of every cashier phoning the manager for the next receipt number, each cashier is handed a whole roll of numbered tickets.",
    body: "Common options: <b>range allocation</b> (servers lease blocks like 1,000–1,999), <b>Snowflake IDs</b> (timestamp + machine + sequence), or <b>UUIDs</b> (random, 128-bit, not sortable). Trade-offs: sortability, size, coordination, and guessability.",
    used: ["bitly","discord"],
    fig: "snowflake"
  },

  "snowflake": {
    name: "Snowflake IDs",
    icon: "❄️",
    cat: "Data",
    one: "64-bit IDs made of timestamp + worker ID + sequence: unique, coordination-free and time-sortable.",
    analogy: "Like a receipt number formatted as DATE-REGISTER-COUNT: two registers never collide, and sorting by number sorts by time.",
    body: "Twitter popularized the layout: ~41 bits of milliseconds, ~10 bits of worker ID, ~12 bits of per-millisecond sequence. Because IDs sort by time, \"give me messages before ID X\" becomes a cheap range scan.",
    code: "id = (ms_since_epoch << 22) | (worker_id << 12) | sequence",
    used: ["discord","twitter"],
    fig: "snowflake",
    when: "You need unique, time-sortable 64-bit IDs generated on many machines without coordination."
  },

  "transcoding": {
    name: "Transcoding pipelines",
    icon: "🎞️",
    cat: "Data",
    one: "Convert one master file into many resolutions, bitrates and codecs, in parallel.",
    analogy: "Translating one book into dozens of languages and print sizes, chapter by chapter, by many translators at once.",
    body: "Split the source into chunks, encode them in parallel on many workers, then reassemble. Netflix popularized per-title encoding: a simple cartoon needs fewer bits than a grainy action film for the same visual quality.",
    used: ["netflix","youtube"]
  },

  "geo-index": {
    name: "Geospatial indexing",
    icon: "🗺️",
    cat: "Data",
    one: "Bucket the map into cells so \"who's near me?\" checks a few cells, not every point.",
    analogy: "Looking for a friend in a stadium by section number instead of scanning every seat.",
    body: "Geohash (strings where a shared prefix means nearby), quadtrees (split dense areas recursively), and Uber's H3 (hierarchical hexagons). Search your cell plus a ring of neighbors, then rank candidates by real road ETA.",
    used: ["uber"],
    sim: "geo"
  },

  "ttl-lock": {
    name: "Reservations with TTL (leases)",
    icon: "⏱️",
    cat: "Data",
    one: "Temporarily hold a resource for one user; auto-release it if they don't finish.",
    analogy: "A fitting-room tag: the clothes are yours for 10 minutes, then go back on the rack.",
    body: "Atomically set seat=HELD(user, expiresAt) only if it's AVAILABLE (compare-and-set, Redis SET NX PX, or a conditional DB write). Expiry prevents abandoned carts from locking inventory forever.",
    code: "SET seat:A12 user42 NX PX 300000",
    used: ["ticketmaster","uber"],
    sim: "onsale"
  },

  "optimistic-concurrency": {
    name: "Atomic writes & optimistic concurrency",
    icon: "🥊",
    cat: "Data",
    one: "Prevent two users from both \"winning\" the same item when they act at the same instant.",
    analogy: "Two people grabbing the last cookie: the jar's lid only opens for one hand at a time.",
    body: "Read-then-write in two steps has a race. Use a single atomic conditional write (UPDATE … WHERE status='available'; check rows affected), version numbers, or transactions. The loser gets a clean \"just taken\" error.",
    code: "UPDATE seats SET status='HELD', holder=$u\n WHERE id=$s AND status='AVAILABLE';  -- 0 rows → lost race",
    used: ["ticketmaster","stripe"],
    sim: "onsale"
  },

  "geo-sharding": {
    name: "Dispatch & state machines",
    icon: "🔄",
    cat: "Data",
    one: "Model each entity (ride, driver, order) as explicit states with allowed transitions.",
    analogy: "A board game piece that can only move to certain squares.",
    body: "Driver: OFFLINE → AVAILABLE → OFFERED → ON_TRIP. Transitions are atomic so a driver can't be offered to two riders at once. Timeouts move OFFERED back to AVAILABLE.",
    used: ["uber"]
  },

  "cap": {
    used: [],
    name: "CAP theorem",
    icon: "🔺",
    cat: "Data",
    fig: "cap",
    one: "During a network partition, a distributed system must choose consistency or availability.",
    analogy: "Rohit and Raj keep separate reminder diaries. When they stop talking, Raj either refuses new reminders (C) or takes them and risks contradicting Rohit (A).",
    body: "<b>C</b>: every read sees the latest write (or errors). <b>A</b>: every request gets a non-error answer. <b>P</b>: the system tolerates lost messages between nodes. Partitions are unavoidable once data lives on multiple machines, so the real choice is CP vs AP <i>during</i> a partition. CA only exists on a single node.",
    when: "Classifying requirements: bank balances and seat inventory → C; feeds, likes, search → A.",
    pitfalls: "Labelling whole databases CP/AP is crude; real systems choose per operation and per configuration."
  },

  "pacelc": {
    used: [],
    name: "PACELC",
    icon: "⏱️",
    cat: "Data",
    fig: "cap",
    one: "If Partition: Availability vs Consistency. Else: Latency vs Consistency.",
    analogy: "Even on a calm day, waiting for everyone to sign off on a decision is slower than deciding alone.",
    body: "CAP is silent about the normal case. PACELC adds that synchronous replication (wait for replicas) gives consistency at the cost of latency, while asynchronous replication is fast with a staleness window. Dynamo/Cassandra defaults lean PA/EL; a synchronously replicated ledger is PC/EC."
  },

  "consistency-models": {
    used: [],
    name: "Strong vs eventual consistency",
    icon: "🔄",
    cat: "Data",
    fig: "replication",
    one: "Strong: reads always see the latest write. Eventual: replicas converge if writes stop.",
    analogy: "Strong: a live scoreboard. Eventual: newspapers in different towns that all print the same result by tomorrow.",
    body: "Strong consistency needs synchronous coordination (quorums, single leader reads). Eventual consistency lets replicas lag and reconcile (gossip, read repair, timestamp merges). Middle grounds: read-your-writes, monotonic reads, causal consistency.",
    when: "Strong for money, inventory, locks, messages. Eventual for feeds, counters, recommendations."
  },

  "acid": {
    used: [],
    name: "ACID transactions",
    icon: "🧪",
    cat: "Data",
    fig: "datamodels",
    one: "Atomic, Consistent, Isolated, Durable: the guarantees that make a relational transaction safe.",
    analogy: "A bank transfer that either fully happens or never happened. No one ever sees the money in mid-air.",
    body: "<b>Atomicity</b>: all statements commit or none do. <b>Consistency</b>: invariants (balance ≥ 0) hold before and after. <b>Isolation</b>: concurrent transactions don't see each other's partial work, which prevents the ₹1,500 → −₹500 double-withdrawal race. <b>Durability</b>: committed data survives crashes. Note that ACID's C is not CAP's C.",
    when: "Money, orders, anything with invariants spanning multiple rows.",
    pitfalls: "Distributed ACID across shards/services is expensive; use sagas or co-locate data."
  },

  "denormalization": {
    used: [],
    name: "Denormalization",
    icon: "📑",
    cat: "Data",
    fig: "shardkey",
    one: "Duplicate data on purpose so each frequent read hits one place, with no joins.",
    analogy: "Keeping a copy of a letter in both the sender's and the receiver's file cabinets.",
    body: "After sharding, JOINs across machines are slow, so store what a query needs together: a message in both users' mailboxes, the author's name inside each post. Reads become one-shard lookups; writes multiply and copies can drift.",
    pitfalls: "Every update must touch all copies. Plan for repair jobs or accept eventual consistency."
  },

  "quorum": {
    used: [],
    name: "Quorums & tunable consistency",
    icon: "🗳️",
    cat: "Data",
    fig: "quorum",
    one: "Write to W replicas and read from R; if R + W > N, every read overlaps the latest write.",
    analogy: "If 3 of 5 judges must sign every decision and you always ask 3 judges, at least one of them was in the room.",
    body: "With N replicas, choose W and R per request. N=3, W=2, R=2 is balanced and strong. W=1, R=1 is fastest and eventual. Majority quorums also prevent split brain in ZooKeeper and Raft. When R + W ≤ N (like Dynamo's cart, 5/2/2), conflicting versions are merged.",
    when: "Dynamo-style stores (Cassandra, DynamoDB), consensus systems."
  },

  "bloom-filter": {
    used: [],
    name: "Bloom filter",
    icon: "🌸",
    cat: "Data",
    fig: "bloom",
    one: "A tiny bit array that answers \"definitely not present\" or \"maybe present\".",
    analogy: "A bouncer with a rough guest list: if you're not on it you're definitely out; if you might be, they check properly.",
    body: "Add sets k hashed bit positions; check looks at those k bits. Any 0 means absent (no false negatives); all 1s means maybe (false positives grow as it fills). ~10 bits per key gives ~1% false positives. LSM trees keep one per SSTable to skip disk reads for missing keys. Also used by CDNs, browsers and spell-checkers.",
    pitfalls: "You can't delete from a standard Bloom filter (use counting filters)."
  },

  "trie": {
    used: [],
    name: "Trie (prefix tree)",
    icon: "🌿",
    cat: "Data",
    fig: "trie",
    one: "A tree where each edge is a character; perfect for prefix lookups like autocomplete.",
    analogy: "A dictionary's thumb-index tabs: M → MI → MIC narrows the search with every letter.",
    body: "Walking a prefix is O(length). For typeahead, store the top-k completions at every node so a keystroke returns instantly, and update ancestors when a term's frequency changes (buffer or sample those writes). At scale, a prefix → top-k hashmap in a KV store is often more practical.",
    pitfalls: "Memory-hungry; no off-the-shelf database stores tries."
  },

  "inverted-index": {
    used: ["twitter"],
    name: "Inverted index",
    icon: "🔎",
    cat: "Data",
    fig: "invindex",
    one: "Map every word to the documents (and positions) containing it: the heart of full-text search.",
    analogy: "The index at the back of a textbook: \"replication … pages 41, 87, 112\".",
    body: "Lucene tokenizes, removes stop words, stems (running → run) and records term → [(doc, position)]. Queries look up and intersect posting lists instead of scanning every row like <code>LIKE '%x%'</code>. Elasticsearch shards the index by document id and replicates it.",
    when: "Search boxes, log analytics (ELK), resume and product search."
  },

  "quadtree": {
    used: [],
    name: "Quadtree",
    icon: "🔲",
    cat: "Data",
    fig: "quadtree",
    one: "Recursively split 2-D space into four quadrants wherever there are too many points.",
    analogy: "Zooming into a map: you only zoom in where there's lots to see.",
    body: "Each cell holds at most ~100 points; overflow splits it into 4. Dense areas get deep, tiny cells. Finding your cell is O(log N); nearest-neighbour search checks your cell and neighbours. 100M places fit in ~4 GB of RAM. For moving objects, update only on cell crossings and use split/merge hysteresis.",
    when: "Nearby search (restaurants, cabs), collision detection, map tiling."
  },

  "chunking": {
    used: ["youtube"],
    name: "Chunking & segmentation",
    icon: "🧱",
    cat: "Data",
    sim: "abr",
    one: "Break big things (files, videos, uploads) into pieces that can be moved, cached and retried independently.",
    analogy: "Moving house box by box instead of trying to lift the whole house.",
    body: "HDFS blocks, S3 multipart uploads, torrent pieces, HLS/DASH video segments. Chunks parallelize transfers, enable resume-on-failure and seeking, and let a CDN cache each piece. The trade-off is chunk size: too small means metadata overhead, too big means latency and wasted transfer."
  },

  "ot-crdt": {
    name: "Operational transformation & CRDTs",
    icon: "🧬",
    cat: "Data",
    sim: "docs",
    used: ["gdocs"],
    one: "Merge concurrent edits so every copy of a shared document converges to the same result.",
    analogy: "Two people giving directions to the same house: if a new house is built on the street first, the second set of directions has to be adjusted.",
    body: "Clients send small operations (insert, delete) tagged with the revision they were made against. <b>OT</b> rewrites an op against the concurrent ops it didn't know about: shift positions, shrink overlapping deletes, break ties consistently. <b>CRDTs</b> give each element a unique ordered id so operations commute and need no central order.",
    when: "Collaborative editors, shared whiteboards, multiplayer state, offline-first apps.",
    pitfalls: "Subtle edge cases (overlaps, ties). Fuzz-test convergence; rich text multiplies the rules."
  },

  "trending": {
    name: "Trending detection (sliding windows)",
    icon: "📈",
    cat: "Data",
    sim: "trends",
    used: ["twitter"],
    one: "Find what's unusually popular right now by comparing a recent rate with a baseline.",
    analogy: "A smoke alarm reacts to a sudden change in the air, not to the fact that the kitchen always smells of cooking.",
    body: "Count each term in sliding windows (e.g. the last 5 minutes) and keep a slowly updated baseline of its normal rate. Score = recent ÷ baseline. Approximate structures such as the <b>count-min sketch</b> keep memory small for millions of terms, and spam filters stop manipulation.",
    when: "Trends, anomaly detection, hot-key detection, fraud spikes."
  }
});
