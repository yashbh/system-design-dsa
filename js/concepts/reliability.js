/* Blueprint building blocks — Reliability, Security. Each concept: name, icon, cat, one (one-liner), analogy, body, optional fig/sim, when, pitfalls, used (case ids). */
Object.assign(BP.CONCEPTS, {
  "message-queue": {
    name: "Message queues & logs",
    icon: "📬",
    cat: "Reliability",
    one: "Decouple producers from consumers so slow work happens in the background.",
    analogy: "A restaurant ticket rail: the waiter clips the order and goes back to guests; cooks pick tickets at their own pace.",
    body: "Kafka, SQS and RabbitMQ buffer work, smooth spikes and allow retries. The user-facing path stays fast (\"enqueue and return\") while analytics, fan-out or emails run asynchronously.",
    used: ["bitly","instagram","whatsapp","youtube"],
    fig: "kafka",
    when: "Work that doesn't need to finish before you respond: notifications, emails, analytics, fan-out.",
    pitfalls: "At-least-once delivery means consumers must be idempotent; watch consumer lag and poison messages."
  },

  "store-forward": {
    name: "Store-and-forward",
    icon: "📦",
    cat: "Reliability",
    one: "If the recipient is offline, persist the message and deliver it when they reconnect.",
    analogy: "The post office holds your mail while you're on vacation.",
    body: "Each user has a durable inbox queue on the server. On reconnect, the device drains it and acknowledges, then the server deletes the delivered messages.",
    used: ["whatsapp"],
    sim: "chat"
  },

  "acks": {
    name: "Acknowledgements & delivery guarantees",
    icon: "✅",
    cat: "Reliability",
    one: "At-least-once delivery + retries + dedupe ≈ exactly-once from the user's point of view.",
    analogy: "Registered mail: the sender keeps resending until a signed receipt comes back.",
    body: "Networks drop packets, so senders retry until they get an ACK. Retries cause duplicates, so every message carries a unique ID and receivers ignore IDs they've seen.",
    used: ["whatsapp","stripe"],
    sim: "chat"
  },

  "idempotency": {
    name: "Idempotency keys",
    icon: "🔁",
    cat: "Reliability",
    one: "Doing the same request twice has the same effect as doing it once.",
    analogy: "An elevator button: pressing it five times still calls one elevator.",
    body: "The client attaches a unique key to a mutating request. The server stores the key and result. A retry with the same key returns the saved result instead of charging again. This is essential when a timeout leaves you unsure whether a request succeeded.",
    code: "POST /v1/charges\nIdempotency-Key: 7f3c-…-a91e",
    used: ["stripe","ticketmaster","whatsapp","gdocs"],
    sim: "stripe",
    when: "Any mutating API that clients may retry: payments, orders, message sends.",
    pitfalls: "Keys must be generated per logical operation (not per retry) and stored atomically with the result."
  },

  "e2ee": {
    name: "End-to-end encryption",
    icon: "🔐",
    cat: "Security",
    one: "Only the sender and recipient devices hold the keys; servers relay ciphertext.",
    analogy: "Sending a locked box through the mail: the courier carries it but can't open it.",
    body: "WhatsApp uses the Signal Protocol. The server still routes messages and stores undelivered ones, but it can't read content. This shapes the design: no server-side search of message text, and multi-device sync is harder.",
    used: ["whatsapp"]
  },

  "chaos": {
    name: "Chaos engineering & circuit breakers",
    icon: "🐒",
    cat: "Reliability",
    one: "Break things on purpose so you learn to survive failure; fail fast when a dependency is sick.",
    analogy: "Fire drills (chaos) and a fuse box (circuit breaker): practice the emergency, and cut the circuit before the house burns.",
    body: "Netflix's Chaos Monkey randomly terminates production instances. A circuit breaker stops calling a failing service after N errors and returns a fallback (for example a generic row instead of personalized picks), then probes for recovery.",
    used: ["netflix"]
  },

  "replication": {
    name: "Replication & quorums",
    icon: "🪞",
    cat: "Reliability",
    one: "Store each piece of data on several machines; read/write a majority to stay consistent.",
    analogy: "Keeping three copies of your passport in three different safes.",
    body: "With replication factor 3 and quorum (2 of 3) reads and writes, any single node can die without losing data or availability. Tunable: favor consistency (quorum) or latency (ONE).",
    used: ["discord","stripe"],
    fig: "replication",
    when: "You need read scaling, high availability, or protection against losing a machine.",
    pitfalls: "Replication lag (stale reads), data loss on async failover, and write bottlenecks on a single master."
  },

  "rate-limiting": {
    name: "Rate limiting (token bucket)",
    icon: "🪣",
    cat: "Reliability",
    one: "Allow bursts up to a limit, then a steady refill rate; reject the excess with HTTP 429.",
    analogy: "An arcade token cup: you can spend a handful at once, but the attendant only refills one token per second.",
    body: "Token bucket: capacity C, refill R/sec. Each request takes a token. Allows short bursts while bounding average rate. Often implemented in Redis with atomic scripts, per user / API key / IP.",
    used: ["stripe","ticketmaster"],
    fig: "ratealgos",
    when: "Public APIs, login endpoints, expensive operations, multi-tenant fairness.",
    pitfalls: "Fixed windows allow 2× bursts at boundaries; distributed counters need atomic ops; decide fail-open vs fail-closed."
  },

  "backoff": {
    name: "Retries with exponential backoff + jitter",
    icon: "⏳",
    cat: "Reliability",
    one: "Wait longer after each failure, with randomness, so retries don't stampede.",
    analogy: "If a crowded door is stuck, everyone pushing again at the same second keeps it stuck. Staggered pushes get through.",
    body: "Delay = base × 2^attempt, randomized (\"full jitter\": random between 0 and that). Without jitter, thousands of clients retry in synchronized waves and re-crash the recovering service.",
    used: ["stripe","whatsapp"]
  },

  "health-checks": {
    used: [],
    name: "Health checks & heartbeats",
    icon: "💓",
    cat: "Reliability",
    fig: "lb",
    one: "Continuously verify servers are alive so traffic only goes to healthy ones.",
    analogy: "A lifeguard counting swimmers every 30 seconds and blowing the whistle when one stops waving.",
    body: "<b>Health check</b>: the LB pings each host (port, path, protocol) every interval; after N consecutive failures (unhealthy threshold) it stops routing there, and after M successes it adds the host back. <b>Heartbeat</b>: the server pushes \"I'm alive\" instead. The notes' example (30 s interval, 5 s timeout, thresholds of 2) means up to ~65 s of traffic can reach a dead host.",
    when: "Behind every load balancer, in orchestrators, ZooKeeper sessions, HDFS DataNodes.",
    pitfalls: "Checking only \"/\" can report healthy while the database is down; checks that are too aggressive cause flapping."
  },

  "orchestrator": {
    used: [],
    name: "Orchestrator (cluster manager)",
    icon: "🎛️",
    cat: "Reliability",
    one: "The control-plane brain that adds shards, replaces dead machines and keeps the replication level.",
    analogy: "A football manager substituting injured players and bringing new signings into the squad.",
    body: "It watches heartbeats, keeps X standby machines for instant replacement, uses spares as extra replicas, and creates new shards in two phases (staging copy, then go-live and catch-up) so downtime shrinks from minutes to seconds. Examples: the HDFS NameNode, the HBase HMaster, the Kubernetes control plane.",
    pitfalls: "Never add capacity reactively at peak; the migration itself adds load."
  },

  "wal": {
    used: ["gdocs"],
    name: "Write-ahead log (WAL)",
    icon: "📜",
    cat: "Reliability",
    fig: "lsm",
    one: "Append every change to a durable log before applying it, so a crash can be replayed.",
    analogy: "A ship's logbook: if the captain forgets, the log tells you exactly what happened.",
    body: "Appends are sequential and fast. After a crash, replay the log from the last checkpoint to rebuild in-memory state (an LSM memtable, DB pages). MySQL's binlog and Kafka's partitions are the same idea used for replication and streaming."
  },

  "zookeeper": {
    used: [],
    name: "ZooKeeper & leader election",
    icon: "🐒",
    cat: "Reliability",
    fig: "zookeeper",
    one: "A small, strongly consistent coordination store: who's the master, config, locks, membership.",
    analogy: "A town hall notice board that only one candidate can pin the \"mayor\" notice on, and that removes it if the mayor stops showing up.",
    body: "Data lives in znodes. <b>Ephemeral</b> znodes vanish when their creator's session stops heartbeating, which makes election easy: everyone races to create <code>/cluster/master</code> and one wins. <b>Watches</b> notify clients of changes, so they cache instead of polling. Writes go through a leader and need a majority of the ensemble, which prevents split brain.",
    when: "Leader election, service discovery, distributed locks, configuration (Kafka, HBase, HDFS HA)."
  },

  "kafka": {
    used: [],
    name: "Kafka: topics, partitions, consumer groups",
    icon: "🪵",
    cat: "Reliability",
    fig: "kafka",
    one: "A distributed, replicated commit log for high-throughput event streams.",
    analogy: "A conveyor belt split into lanes: same-key items always ride the same lane in order, and each team of workers splits the lanes between them.",
    body: "Topics are split into <b>partitions</b> spread across brokers; <code>hash(key) % partitions</code> preserves per-key order. A <b>consumer group</b> assigns each partition to one member (more members than partitions means idle ones). Consumers track <b>offsets</b> and commit after processing. Data is kept for a retention period (or compacted per key), so many groups can read and even replay it.",
    when: "Event-driven architectures, analytics pipelines, choreography sagas, CQRS relays.",
    pitfalls: "Changing the partition count reshuffles keys; hot keys overload one partition."
  },

  "observability": {
    used: [],
    name: "Observability: logs, metrics, traces",
    icon: "🔭",
    cat: "Reliability",
    one: "Detect problems fast, find where they happened, and confirm the fix.",
    analogy: "A smoke alarm (metrics), CCTV footage (logs) and a delivery-tracking timeline (traces).",
    body: "<b>Metrics</b> (time-series: rate, errors, p95 latency) drive alerts. <b>Logs</b>, centralised and tagged with a trace id, explain what happened. <b>Traces</b> (spans per hop) show where time went. Propagate one trace id through every service and queue: the hop where the logs stop is the culprit."
  },

  "circuit-breaker": {
    used: [],
    name: "Circuit breaker",
    icon: "🔌",
    cat: "Reliability",
    fig: "breaker",
    one: "Stop calling a failing dependency for a while, fail fast with a fallback, then probe for recovery.",
    analogy: "The fuse box in your house: it trips to protect everything else, and you test it before switching back on.",
    body: "<b>Closed</b>: calls flow while failures (timeouts, 5xx, but not \"user not found\") are counted. Above a threshold → <b>Open</b>: short-circuit to a fallback so threads stay free. After T seconds → <b>Half-open</b>: a few trial calls decide between Closed and Open. It prevents cascading failures and gives the sick service room to recover.",
    when: "Every synchronous call to another service or third party."
  }
});
