/* Blueprint — course content.
 * Architectures are simplified, educational models built from public engineering
 * blogs and talks. They are not internal documentation of any company.
 * "Reported" stats come from public statements; "Estimate" rows are assumptions
 * chosen to teach back-of-the-envelope math.
 */
window.BP = window.BP || {};

BP.CONCEPTS = {
  "base62": {
    name: "Base62 encoding", icon: "🔤", cat: "Data",
    one: "Write a big number using 62 symbols (0-9, a-z, A-Z) so it gets short.",
    analogy: "Decimal uses 10 digits, so 1,000,000 needs 7 of them. With 62 \"digits\", 7 characters can count past 3.5 trillion.",
    body: "Repeatedly divide the number by 62 and map each remainder to a symbol. It's URL-safe (no +, /, =) and reversible. 62^6 ≈ 56.8 billion, 62^7 ≈ 3.52 trillion.",
    code: "while (n > 0) { out = ALPHABET[n % 62] + out; n = Math.floor(n / 62); }",
    used: ["bitly"]
  },
  "id-generation": {
    name: "Distributed ID generation", icon: "🎫", cat: "Data",
    one: "Create unique IDs on many machines without asking one central counter every time.",
    analogy: "Instead of every cashier phoning the manager for the next receipt number, each cashier is handed a whole roll of numbered tickets.",
    body: "Common options: <b>range allocation</b> (servers lease blocks like 1,000–1,999), <b>Snowflake IDs</b> (timestamp + machine + sequence), or <b>UUIDs</b> (random, 128-bit, not sortable). Trade-offs: sortability, size, coordination, and guessability.",
    used: ["bitly", "discord"]
  },
  "snowflake": {
    name: "Snowflake IDs", icon: "❄️", cat: "Data",
    one: "64-bit IDs made of timestamp + worker ID + sequence: unique, coordination-free and time-sortable.",
    analogy: "Like a receipt number formatted as DATE-REGISTER-COUNT: two registers never collide, and sorting by number sorts by time.",
    body: "Twitter popularized the layout: ~41 bits of milliseconds, ~10 bits of worker ID, ~12 bits of per-millisecond sequence. Because IDs sort by time, \"give me messages before ID X\" becomes a cheap range scan.",
    code: "id = (ms_since_epoch << 22) | (worker_id << 12) | sequence",
    used: ["discord"]
  },
  "caching": {
    name: "Caching (cache-aside)", icon: "⚡", cat: "Performance",
    one: "Keep hot data in memory so most reads never touch the database.",
    analogy: "Keeping your most-used spices on the counter instead of walking to the pantry every time.",
    body: "Cache-aside: read the cache; on a <b>miss</b>, read the DB and populate the cache. Choose an eviction policy (LRU is common) and a TTL. Traffic is usually skewed (a few items get most requests), so a small cache can absorb a large share of reads. Watch out for stale data and cache stampedes.",
    code: "v = cache.get(k)\nif (!v) { v = db.get(k); cache.set(k, v, ttl) }\nreturn v",
    used: ["bitly", "instagram", "ticketmaster"]
  },
  "cdn": {
    name: "CDN & edge caching", icon: "🌍", cat: "Networking",
    one: "Serve static and heavy content from servers physically close to users.",
    analogy: "Instead of shipping every book from one central warehouse, put copies in neighborhood libraries.",
    body: "A CDN caches content at points of presence around the world. It cuts latency (shorter distance), offloads your origin, and absorbs traffic spikes. Netflix goes further and places its own appliances <i>inside</i> ISPs.",
    used: ["netflix", "instagram", "ticketmaster"]
  },
  "load-balancing": {
    name: "Load balancing", icon: "⚖️", cat: "Scaling",
    one: "Spread incoming requests across many identical servers.",
    analogy: "A host at a busy restaurant seating guests at whichever waiter has the fewest tables.",
    body: "Algorithms: round-robin, least-connections, consistent hashing (sticky by key). Health checks remove dead servers. Stateless app servers make this easy: any server can handle any request.",
    used: ["bitly", "whatsapp", "stripe"]
  },
  "kv-store": {
    name: "Key-value / NoSQL stores", icon: "🗄️", cat: "Storage",
    one: "Databases optimized for \"give me the value for this key\" that scale horizontally.",
    analogy: "A coat check: hand over a ticket, get your coat. No searching, no joins.",
    body: "DynamoDB, Cassandra, ScyllaDB and Redis trade rich queries (joins, ad-hoc filters) for predictable low latency and easy partitioning. Design the data around access patterns first.",
    used: ["bitly", "discord"]
  },
  "message-queue": {
    name: "Message queues & logs", icon: "📬", cat: "Reliability",
    one: "Decouple producers from consumers so slow work happens in the background.",
    analogy: "A restaurant ticket rail: the waiter clips the order and goes back to guests; cooks pick tickets at their own pace.",
    body: "Kafka, SQS and RabbitMQ buffer work, smooth spikes and allow retries. The user-facing path stays fast (\"enqueue and return\") while analytics, fan-out or emails run asynchronously.",
    used: ["bitly", "instagram", "whatsapp"]
  },
  "fanout": {
    name: "Fan-out on write vs read", icon: "📣", cat: "Scaling",
    one: "Precompute feeds when someone posts (push), or assemble them when someone reads (pull).",
    analogy: "Push = delivering a newspaper to every doorstep. Pull = everyone walks to the newsstand.",
    body: "<b>Push</b> makes reads one cheap lookup but a post by someone with millions of followers means millions of writes. <b>Pull</b> makes posting free but every feed open is expensive. Big systems go <b>hybrid</b>: push for normal users, pull for celebrities.",
    used: ["instagram", "whatsapp"]
  },
  "hot-key": {
    name: "Hot keys & hot partitions", icon: "🔥", cat: "Scaling",
    one: "When one key (a celebrity, a viral channel, a popular event) gets far more traffic than the rest.",
    analogy: "One checkout lane with a celebrity signing autographs: every other lane is empty, but that one is jammed.",
    body: "Hashing spreads keys evenly, but it can't split <i>one</i> key. Fixes: cache it, replicate reads, split the key (key#1..key#N), coalesce duplicate requests, or treat it specially (pull instead of push).",
    used: ["instagram", "discord", "ticketmaster"]
  },
  "websockets": {
    name: "Persistent connections (WebSockets)", icon: "🔌", cat: "Networking",
    one: "Keep one connection open so the server can push data instantly.",
    analogy: "Staying on a phone call instead of mailing a letter every few seconds asking \"anything new?\"",
    body: "Polling wastes requests and battery and adds delay. WebSockets (or raw long-lived TCP like WhatsApp's protocol) let the server push in milliseconds. Cost: servers hold millions of open connections, so you need a registry of who is connected where.",
    used: ["whatsapp"]
  },
  "store-forward": {
    name: "Store-and-forward", icon: "📦", cat: "Reliability",
    one: "If the recipient is offline, persist the message and deliver it when they reconnect.",
    analogy: "The post office holds your mail while you're on vacation.",
    body: "Each user has a durable inbox queue on the server. On reconnect, the device drains it and acknowledges, then the server deletes the delivered messages.",
    used: ["whatsapp"]
  },
  "acks": {
    name: "Acknowledgements & delivery guarantees", icon: "✅", cat: "Reliability",
    one: "At-least-once delivery + retries + dedupe ≈ exactly-once from the user's point of view.",
    analogy: "Registered mail: the sender keeps resending until a signed receipt comes back.",
    body: "Networks drop packets, so senders retry until they get an ACK. Retries cause duplicates, so every message carries a unique ID and receivers ignore IDs they've seen.",
    used: ["whatsapp", "stripe"]
  },
  "idempotency": {
    name: "Idempotency keys", icon: "🔁", cat: "Reliability",
    one: "Doing the same request twice has the same effect as doing it once.",
    analogy: "An elevator button: pressing it five times still calls one elevator.",
    body: "The client attaches a unique key to a mutating request. The server stores the key and result. A retry with the same key returns the saved result instead of charging again. This is essential when a timeout leaves you unsure whether a request succeeded.",
    code: "POST /v1/charges\nIdempotency-Key: 7f3c-…-a91e",
    used: ["stripe", "ticketmaster", "whatsapp"]
  },
  "e2ee": {
    name: "End-to-end encryption", icon: "🔐", cat: "Security",
    one: "Only the sender and recipient devices hold the keys; servers relay ciphertext.",
    analogy: "Sending a locked box through the mail: the courier carries it but can't open it.",
    body: "WhatsApp uses the Signal Protocol. The server still routes messages and stores undelivered ones, but it can't read content. This shapes the design: no server-side search of message text, and multi-device sync is harder.",
    used: ["whatsapp"]
  },
  "abr": {
    name: "Adaptive bitrate streaming", icon: "📶", cat: "Networking",
    one: "Video is cut into short segments in many qualities; the player picks each segment's quality live.",
    analogy: "A driver shifting gears: high gear on the open highway, low gear on a steep hill, so the car never stalls.",
    body: "HLS/DASH split video into segments a few seconds long. The player measures throughput and buffer level and requests the highest quality it can sustain. Stalls hurt viewers more than blurry frames, so players are conservative.",
    used: ["netflix"]
  },
  "transcoding": {
    name: "Transcoding pipelines", icon: "🎞️", cat: "Data",
    one: "Convert one master file into many resolutions, bitrates and codecs, in parallel.",
    analogy: "Translating one book into dozens of languages and print sizes, chapter by chapter, by many translators at once.",
    body: "Split the source into chunks, encode them in parallel on many workers, then reassemble. Netflix popularized per-title encoding: a simple cartoon needs fewer bits than a grainy action film for the same visual quality.",
    used: ["netflix"]
  },
  "chaos": {
    name: "Chaos engineering & circuit breakers", icon: "🐒", cat: "Reliability",
    one: "Break things on purpose so you learn to survive failure; fail fast when a dependency is sick.",
    analogy: "Fire drills (chaos) and a fuse box (circuit breaker): practice the emergency, and cut the circuit before the house burns.",
    body: "Netflix's Chaos Monkey randomly terminates production instances. A circuit breaker stops calling a failing service after N errors and returns a fallback (for example a generic row instead of personalized picks), then probes for recovery.",
    used: ["netflix"]
  },
  "geo-index": {
    name: "Geospatial indexing", icon: "🗺️", cat: "Data",
    one: "Bucket the map into cells so \"who's near me?\" checks a few cells, not every point.",
    analogy: "Looking for a friend in a stadium by section number instead of scanning every seat.",
    body: "Geohash (strings where a shared prefix means nearby), quadtrees (split dense areas recursively), and Uber's H3 (hierarchical hexagons). Search your cell plus a ring of neighbors, then rank candidates by real road ETA.",
    used: ["uber"]
  },
  "sharding": {
    name: "Sharding / partitioning", icon: "🧩", cat: "Storage",
    one: "Split data across many machines by a partition key.",
    analogy: "A library splitting books across buildings: A–F in one, G–M in the next.",
    body: "Choose the key from your access pattern so a request touches one shard: messages by (channel, time bucket), rides by city, events by event ID. Bad keys cause hot shards or cross-shard queries.",
    used: ["discord", "uber", "ticketmaster"]
  },
  "consistent-hashing": {
    name: "Consistent hashing", icon: "💍", cat: "Scaling",
    one: "Map keys and nodes onto a ring so adding or removing a node only moves ~1/N of keys.",
    analogy: "Seats around a round table: when a new guest sits down, only the neighbor on one side has to give up some space.",
    body: "With <code>hash(key) % N</code>, changing N moves almost every key, which is a cache and data disaster. On a ring, each key belongs to the next node clockwise. Virtual nodes (many points per server) even out the load.",
    used: ["discord"]
  },
  "replication": {
    name: "Replication & quorums", icon: "🪞", cat: "Reliability",
    one: "Store each piece of data on several machines; read/write a majority to stay consistent.",
    analogy: "Keeping three copies of your passport in three different safes.",
    body: "With replication factor 3 and quorum (2 of 3) reads and writes, any single node can die without losing data or availability. Tunable: favor consistency (quorum) or latency (ONE).",
    used: ["discord", "stripe"]
  },
  "request-coalescing": {
    name: "Request coalescing", icon: "🧲", cat: "Performance",
    one: "Merge identical concurrent requests into one backend query.",
    analogy: "When ten people ask a librarian for the same book at once, she fetches it once and reads it aloud.",
    body: "If 10,000 users open the same channel at the same moment, the first request queries the DB and the others wait on that in-flight result. Discord did this in a Rust data-services layer in front of its database.",
    used: ["discord"]
  },
  "rate-limiting": {
    name: "Rate limiting (token bucket)", icon: "🪣", cat: "Reliability",
    one: "Allow bursts up to a limit, then a steady refill rate; reject the excess with HTTP 429.",
    analogy: "An arcade token cup: you can spend a handful at once, but the attendant only refills one token per second.",
    body: "Token bucket: capacity C, refill R/sec. Each request takes a token. Allows short bursts while bounding average rate. Often implemented in Redis with atomic scripts, per user / API key / IP.",
    used: ["stripe", "ticketmaster"]
  },
  "backoff": {
    name: "Retries with exponential backoff + jitter", icon: "⏳", cat: "Reliability",
    one: "Wait longer after each failure, with randomness, so retries don't stampede.",
    analogy: "If a crowded door is stuck, everyone pushing again at the same second keeps it stuck. Staggered pushes get through.",
    body: "Delay = base × 2^attempt, randomized (\"full jitter\": random between 0 and that). Without jitter, thousands of clients retry in synchronized waves and re-crash the recovering service.",
    used: ["stripe", "whatsapp"]
  },
  "waiting-room": {
    name: "Virtual waiting room / admission control", icon: "🚦", cat: "Scaling",
    one: "Let users in at the rate the system can handle; queue the rest fairly.",
    analogy: "A nightclub bouncer: the line outside can be huge, but the dance floor never gets dangerously crowded.",
    body: "Backpressure at the front door. Users get a queue position and are admitted in batches. Randomizing order among early arrivals removes the incentive to hammer refresh.",
    used: ["ticketmaster"]
  },
  "ttl-lock": {
    name: "Reservations with TTL (leases)", icon: "⏱️", cat: "Data",
    one: "Temporarily hold a resource for one user; auto-release it if they don't finish.",
    analogy: "A fitting-room tag: the clothes are yours for 10 minutes, then go back on the rack.",
    body: "Atomically set seat=HELD(user, expiresAt) only if it's AVAILABLE (compare-and-set, Redis SET NX PX, or a conditional DB write). Expiry prevents abandoned carts from locking inventory forever.",
    code: "SET seat:A12 user42 NX PX 300000",
    used: ["ticketmaster", "uber"]
  },
  "optimistic-concurrency": {
    name: "Atomic writes & optimistic concurrency", icon: "🥊", cat: "Data",
    one: "Prevent two users from both \"winning\" the same item when they act at the same instant.",
    analogy: "Two people grabbing the last cookie: the jar's lid only opens for one hand at a time.",
    body: "Read-then-write in two steps has a race. Use a single atomic conditional write (UPDATE … WHERE status='available'; check rows affected), version numbers, or transactions. The loser gets a clean \"just taken\" error.",
    code: "UPDATE seats SET status='HELD', holder=$u\n WHERE id=$s AND status='AVAILABLE';  -- 0 rows → lost race",
    used: ["ticketmaster", "stripe"]
  },
  "http-redirects": {
    name: "HTTP redirects (301 vs 302)", icon: "↪️", cat: "Networking",
    one: "301 is permanent (browsers cache it); 302 is temporary (every click hits you again).",
    analogy: "A forwarding address with the post office (301) vs. a note on the door each visitor must read (302).",
    body: "301 reduces your load but you lose per-click analytics and can't change the target easily. 302/307 keeps you in the loop for analytics, A/B tests and expiry.",
    used: ["bitly"]
  },
  "object-storage": {
    name: "Object storage", icon: "🪣", cat: "Storage",
    one: "Cheap, durable storage for big blobs (photos, videos), addressed by key.",
    analogy: "A self-storage warehouse: you get a unit number; you don't care which shelf it's on.",
    body: "S3-style stores hold media; databases hold small metadata pointing at the blob. Put a CDN in front for delivery.",
    used: ["instagram", "netflix"]
  },
  "geo-sharding": {
    name: "Dispatch & state machines", icon: "🔄", cat: "Data",
    one: "Model each entity (ride, driver, order) as explicit states with allowed transitions.",
    analogy: "A board game piece that can only move to certain squares.",
    body: "Driver: OFFLINE → AVAILABLE → OFFERED → ON_TRIP. Transitions are atomic so a driver can't be offered to two riders at once. Timeouts move OFFERED back to AVAILABLE.",
    used: ["uber"]
  }
};

BP.CASES = [
/* ───────────────────────────── 1. BITLY ───────────────────────────── */
{
  id: "bitly", app: "Bitly", icon: "🔗", color: "#ff6a2b", color2: "#ffb347",
  title: "Design a URL Shortener",
  tagline: "Turn a 2,000-character link into 7 characters, then answer billions of clicks faster than a blink.",
  level: "Beginner", minutes: 12,
  concepts: ["base62", "id-generation", "kv-store", "caching", "http-redirects", "message-queue"],
  stats: [
    { v: 3.52, d: 2, suf: "T", label: "unique 7-char Base62 codes", kind: "Math" },
    { v: 100, suf: ":1", label: "typical read : write ratio", kind: "Assumption" },
    { v: 10, pre: "<", suf: " ms", label: "redirect latency target", kind: "Design goal" }
  ],
  story: "You paste a monstrous link full of tracking parameters into a message. A second later it's <code>bit.ly/3xK9pQ2</code>. Someone in Tokyo clicks it and lands on the page before they notice a redirect happened.<br><br>Behind that tiny link are two classic system-design questions: <b>how do you hand out unique IDs at massive scale</b>, and <b>how do you answer reads so fast they feel free</b>?",
  requirements: {
    functional: ["Create a short code for any long URL", "Redirect short → long when clicked", "Optional custom aliases and expiry", "Click analytics (counts, geography, referrer)"],
    nonFunctional: ["Redirects in milliseconds, worldwide", "Extremely available: a dead shortener breaks links everywhere", "Codes must never collide", "Read-heavy: around 100 clicks for every link created"]
  },
  estimate: [
    ["New links / day", "assumption", "100 M"],
    ["Write QPS", "100M ÷ 86,400 s", "≈ 1,160 /s"],
    ["Read QPS (100:1)", "1,160 × 100", "≈ 116,000 /s"],
    ["Storage / year", "100M × 365 × 500 B", "≈ 18 TB"],
    ["Cache for hot links", "20% of 10B daily reads × 500 B", "≈ 1 TB RAM"]
  ],
  estimateNote: "Insight: writes are easy and reads are the whole game. With ~116k reads/sec, a single database would melt, so the design centers on caching.",
  naive: {
    title: "\"Just MD5 the URL and keep the first 7 characters\"",
    desc: "Hash the long URL, take a prefix, store it in a SQL table, and query that table on every click.",
    breaks: [
      "Collisions: by the birthday paradox, truncated hashes start colliding long before the space is full. Every insert needs a check-and-retry round trip.",
      "Every click is a database query, and 116k QPS on one SQL box means latency spikes and then an outage.",
      "The same URL from two users yields the same code, so you can't give them separate analytics or expiry."
    ]
  },
  steps: [
    { t: "Give every link a unique number", c: "id-generation",
      b: "Use a counter instead of a hash, because counters never collide. A single auto-increment column would be a bottleneck and a single point of failure, so each app server <b>leases a block of IDs</b> (for example 1,000 at a time) from a coordinator such as ZooKeeper or a tiny DB table, then hands them out locally from memory.",
      a: "Each cashier gets a whole roll of numbered tickets instead of phoning the manager per customer. If a cashier quits mid-roll, a few numbers are skipped, and that's fine." },
    { t: "Squeeze the number with Base62", c: "base62",
      b: "Convert the ID to Base62 (<code>0-9 a-z A-Z</code>). 7 characters gives 62⁷ ≈ <b>3.5 trillion</b> codes, enough for 100M links/day for about 96 years. Sequential IDs are guessable (<code>abc1</code>, <code>abc2</code>…), so many systems scramble the ID with a reversible shuffle before encoding.",
      a: "It's like writing numbers with 62 digits instead of 10: same value, far fewer characters." },
    { t: "Store the mapping in a key-value store", c: "kv-store",
      b: "The access pattern is pure lookup, <code>code → long_url</code>, with no joins. A horizontally scalable KV store (DynamoDB, Cassandra) partitioned by code gives predictable single-digit-ms reads and grows by adding nodes.",
      a: "A coat check: hand over a ticket, get the coat. Nobody searches the racks." },
    { t: "Put a cache in front of everything", c: "caching",
      b: "Clicks are wildly skewed: a viral link might get millions of clicks while most get a handful. A Redis/Memcached layer with <b>LRU eviction</b> keeps hot codes in RAM. Cache-aside: check cache → on miss read DB → populate cache. A modest cache can absorb the vast majority of reads.",
      a: "Your favorite mug lives on the counter. The rest stay in the cupboard." },
    { t: "Choose the redirect type deliberately", c: "http-redirects",
      b: "<b>301 Permanent</b>: browsers cache it, so repeat clicks never reach you (less load, but blind analytics). <b>302 Temporary</b>: every click comes through you, so you can count it, A/B test it, or expire it. Analytics-driven products usually pick 302.",
      a: "A post-office forwarding order (301) vs. a sign on the door that everyone has to read (302)." },
    { t: "Record analytics off the critical path", c: "message-queue",
      b: "The redirect must not wait for analytics. The server fires a click event into Kafka and returns the redirect immediately. Consumers aggregate counts by link, country and hour into an analytics store.",
      a: "The waiter clips the order on the rail and goes back to the guests. The kitchen catches up." }
  ],
  diagram: {
    nodes: [
      { id: "u", x: 90, y: 220, label: "Browser", sub: "click / create", kind: "client", icon: "🧑‍💻", desc: "Users either create links (rare) or click them (constant)." },
      { id: "lb", x: 270, y: 220, label: "Load Balancer", sub: "L7, health checks", kind: "edge", icon: "⚖️", desc: "Spreads traffic over stateless app servers. Any server can handle any request." },
      { id: "app", x: 470, y: 220, label: "Shortener API", sub: "stateless ×N", kind: "service", icon: "⚙️", desc: "Allocates IDs from its leased range, encodes Base62, and performs redirects." },
      { id: "ids", x: 470, y: 70, label: "ID Range Service", sub: "leases 1,000 IDs", kind: "service", icon: "🎫", desc: "Hands out disjoint ID blocks. It's touched once per 1,000 links, so it's never a bottleneck." },
      { id: "cache", x: 700, y: 140, label: "Redis Cache", sub: "LRU, hot codes", kind: "cache", icon: "⚡", desc: "Serves most redirects from RAM in well under a millisecond." },
      { id: "db", x: 900, y: 220, label: "KV Store", sub: "code → url", kind: "db", icon: "🗄️", desc: "Durable source of truth, partitioned by short code and replicated 3×." },
      { id: "q", x: 700, y: 360, label: "Kafka", sub: "click events", kind: "queue", icon: "📬", desc: "Buffers click events so analytics never slows a redirect." },
      { id: "an", x: 900, y: 360, label: "Analytics", sub: "aggregations", kind: "external", icon: "📊", desc: "Consumers roll up clicks per link / hour / country." }
    ],
    flows: [
      { name: "Click a hot link", steps: [["u", "lb", "GET /3xK9pQ2"], ["lb", "app", "Routed to any healthy server"], ["app", "cache", "Lookup 3xK9pQ2 → HIT (0.5 ms)"], ["app", "q", "Fire-and-forget click event"], ["app", "u", "302 → long URL. Done in a few ms"], ["q", "an", "Analytics updated asynchronously"]] },
      { name: "Click a cold link", steps: [["u", "lb", "GET /aZ01bc"], ["lb", "app", "Routed"], ["app", "cache", "Lookup → MISS"], ["app", "db", "Read from KV store (~5 ms)"], ["app", "cache", "Populate cache for next time"], ["app", "u", "302 redirect"]] },
      { name: "Create a link", steps: [["u", "lb", "POST /shorten {url}"], ["lb", "app", "Routed"], ["ids", "app", "(Once per 1,000) lease next ID block"], ["app", "db", "Write code → url"], ["app", "u", "201 { short: \"bit.ly/3xK9pQ2\" }"]] }
    ]
  },
  lab: { sim: "shortener", title: "Shortener Lab", hint: "Shorten a URL to watch Base62 encoding step by step. Then send a burst of skewed traffic and see how cache size changes your database load." },
  tradeoffs: [
    { choice: "Counter + Base62 vs. hashing", pro: "No collisions, short codes, simple", con: "Needs ID coordination; sequential codes are guessable unless scrambled" },
    { choice: "302 vs. 301 redirect", pro: "Full analytics and control", con: "Every click costs you a request" },
    { choice: "NoSQL KV vs. SQL", pro: "Horizontal scale, predictable latency", con: "Fewer query features (fine: we only do lookups)" }
  ],
  takeaways: ["Start from the read/write ratio; it tells you where to spend complexity.", "Avoid coordination on the hot path (ID ranges, not a global counter).", "Keep side effects (analytics) off the critical path with a queue."],
  quiz: [
    { q: "How many unique codes does a 7-character Base62 code give?", o: ["434 (62 × 7)", "About 78 billion", "About 3.5 trillion", "Infinite"], a: 2, why: "62⁷ = 3,521,614,606,208 ≈ 3.5 trillion." },
    { q: "Why do app servers lease ID ranges instead of asking a central counter for every link?", o: ["Range IDs are more secure", "It removes per-request coordination, so the counter isn't a bottleneck or single point of failure", "Databases can't auto-increment", "It makes codes shorter"], a: 1, why: "One round trip per 1,000 IDs instead of per ID means the coordinator does 1/1000th of the work and outages barely matter." },
    { q: "Product wants per-click analytics. Which redirect?", o: ["301 Moved Permanently", "302 Found (temporary)", "404 Not Found", "200 with JavaScript"], a: 1, why: "Browsers cache 301s and stop asking you. 302 keeps every click flowing through your servers." },
    { q: "Where should click tracking happen?", o: ["Synchronously before redirecting", "In the browser only", "Publish an event to a queue and redirect immediately", "In a nightly batch reading server logs only"], a: 2, why: "Async events keep the redirect fast; consumers aggregate later." }
  ],
  sources: ["Classic system-design interview problem (many public write-ups)", "Base62 math: 62⁷ = 3.52 × 10¹²"]
},

/* ─────────────────────────── 2. INSTAGRAM ─────────────────────────── */
{
  id: "instagram", app: "Instagram", icon: "📸", color: "#e1306c", color2: "#f77737",
  title: "Design the News Feed",
  tagline: "Merge posts from hundreds of accounts, rank them, and show them in under a second, for over a billion people.",
  level: "Intermediate", minutes: 15,
  concepts: ["fanout", "hot-key", "caching", "object-storage", "cdn", "message-queue"],
  stats: [
    { v: 2, suf: "B+", label: "monthly active users (Meta, 2022)", kind: "Reported" },
    { v: 600, suf: "M+", label: "followers on the largest accounts", kind: "Reported" },
    { v: 1, pre: "<", suf: " s", label: "feed load target", kind: "Design goal" }
  ],
  story: "You open Instagram and your feed is just <i>there</i>: friends' photos, a creator you love, a celebrity's latest post, already ranked.<br><br>That feed is a merge of posts from every account you follow. Doing that merge from scratch for over a billion people, many times a day, would bury any database. The trick is deciding <b>when</b> to do the work: at post time or at read time.",
  requirements: {
    functional: ["Post photos/videos with captions", "Follow other accounts", "See a ranked feed of followed accounts' posts", "Infinite scroll (pagination)"],
    nonFunctional: ["Feed loads fast (<1 s), even on mobile", "Reads vastly outnumber posts", "Eventual consistency is fine: a post can appear a few seconds late", "Media must be durable and globally fast"]
  },
  estimate: [
    ["Daily active users", "assumption", "500 M"],
    ["Feed opens / sec", "500M × 10 ÷ 86,400", "≈ 58,000 /s"],
    ["New posts / sec", "100M ÷ 86,400", "≈ 1,160 /s"],
    ["Fan-out writes / sec", "1,160 × 200 avg followers", "≈ 230,000 /s"],
    ["New media / day", "100M × 2 MB", "≈ 200 TB"]
  ],
  estimateNote: "Insight: push-based fan-out turns ~1k posts/s into ~230k feed writes/s. That's a lot of work, but it's cheap, parallel writes, and it turns 58k expensive merges per second into 58k single lookups.",
  naive: {
    title: "\"Query it live on every open\"",
    desc: "SELECT * FROM posts WHERE author_id IN (…the 300 people I follow…) ORDER BY created_at DESC LIMIT 20",
    breaks: [
      "Posts are sharded by author, so one feed open fans out to hundreds of shards and waits for the slowest one.",
      "58,000 of those scatter-gather queries per second is a self-inflicted DDoS on the database.",
      "Ranking needs many more candidates than 20, which multiplies the cost again."
    ]
  },
  steps: [
    { t: "Separate the bytes from the metadata", c: "object-storage",
      b: "Photos and videos go to <b>object storage</b> and are delivered through a <b>CDN</b>. The database stores only a small post record: id, author, caption, media URL, timestamp. Now the hard problem is purely about tiny records.",
      a: "A library catalog card points to a book in the warehouse; you don't photocopy the book onto the card." },
    { t: "Fan-out on write: precompute every feed", c: "fanout",
      b: "When you post, a background worker (fed by a queue) inserts your post ID at the top of each follower's <b>precomputed feed list</b> in an in-memory store like Redis. Opening the app becomes one read: \"give me my list\".",
      a: "Delivering the newspaper to every doorstep at dawn, so everyone's breakfast reading is instant." },
    { t: "Meet the celebrity problem", c: "hot-key",
      b: "An account with 600M followers posts. Push means 600M writes for one post: it could take many minutes to deliver and wastes work on followers who won't open the app today. One hot key breaks the push model.",
      a: "Printing and hand-delivering 600 million copies before anyone can read the headline." },
    { t: "Fan-out on read for the famous few", c: "fanout",
      b: "For accounts above a follower threshold, <b>don't push</b>. At read time, merge your precomputed list with the recent posts of the handful of celebrities you follow. Those celebrity posts are themselves hot and cached, so this merge is cheap.",
      a: "Most news is delivered to the door, but for the one famous paper, you stop at the newsstand." },
    { t: "Go hybrid, and skip the inactive", c: "caching",
      b: "Push for normal accounts, pull for celebrities. A further saving: <b>only push to active users</b>. A follower who hasn't opened the app in a month gets their feed built on demand when they return.",
      a: "Don't deliver papers to houses that have been empty all summer." },
    { t: "Rank, don't just sort", c: "message-queue",
      b: "Instagram moved from a chronological feed to a ranked feed in 2016. Candidate posts (from the steps above) are scored by ML models predicting how likely you are to engage, then the top results are returned. Feature data and signals flow in asynchronously through event pipelines.",
      a: "A friend who reads every newspaper and hands you the five articles you'll actually care about." }
  ],
  diagram: {
    nodes: [
      { id: "u", x: 90, y: 110, label: "Poster", sub: "uploads photo", kind: "client", icon: "🤳", desc: "Creates a post: media upload + metadata." },
      { id: "r", x: 90, y: 340, label: "Reader", sub: "opens feed", kind: "client", icon: "📱", desc: "Opens the app many times per day." },
      { id: "api", x: 290, y: 220, label: "Post / Feed API", sub: "stateless", kind: "service", icon: "⚙️", desc: "Handles uploads and feed requests." },
      { id: "s3", x: 290, y: 60, label: "Object Store + CDN", sub: "media bytes", kind: "edge", icon: "🪣", desc: "Durable media storage. The CDN serves the images to everyone." },
      { id: "pdb", x: 520, y: 60, label: "Posts DB", sub: "sharded by author", kind: "db", icon: "🗄️", desc: "Source of truth for post metadata." },
      { id: "q", x: 520, y: 220, label: "Fan-out Queue", sub: "Kafka", kind: "queue", icon: "📬", desc: "Decouples posting from feed delivery." },
      { id: "fw", x: 730, y: 220, label: "Fan-out Workers", sub: "push to followers", kind: "service", icon: "📣", desc: "Look up followers (skipping celebrities' and inactive users) and append post IDs to feeds." },
      { id: "feed", x: 730, y: 380, label: "Feed Cache", sub: "Redis lists", kind: "cache", icon: "⚡", desc: "user_id → [post ids…] precomputed timelines." },
      { id: "rank", x: 520, y: 380, label: "Ranking", sub: "ML scoring", kind: "service", icon: "🧠", desc: "Scores candidates; merges in celebrity posts pulled at read time." },
      { id: "g", x: 920, y: 220, label: "Social Graph", sub: "who follows whom", kind: "db", icon: "🕸️", desc: "Follower lists, with counts that decide push vs. pull." }
    ],
    flows: [
      { name: "Normal user posts", steps: [["u", "s3", "Upload photo bytes"], ["u", "api", "POST /posts {caption, media_url}"], ["api", "pdb", "Persist post metadata"], ["api", "q", "Enqueue \"post created\""], ["q", "fw", "Worker picks it up"], ["fw", "g", "Fetch 200 followers (active only)"], ["fw", "feed", "Prepend post id to 200 feed lists"]] },
      { name: "Reader opens feed", steps: [["r", "api", "GET /feed"], ["api", "feed", "Read my precomputed list (1 lookup)"], ["api", "rank", "Merge celebrity posts and score candidates"], ["rank", "pdb", "Fetch hot celebrity posts (cached)"], ["api", "r", "Ranked page of posts; images load from CDN"]] }
    ]
  },
  lab: { sim: "fanout", title: "Fan-out Lab", hint: "Drag the follower count from 10 to 1 billion, switch strategies, and hit Post. Watch where the work lands and when push stops working." },
  tradeoffs: [
    { choice: "Push (fan-out on write)", pro: "Feed reads are a single lookup", con: "Huge write amplification; slow for celebrities" },
    { choice: "Pull (fan-out on read)", pro: "Posting is free; always fresh", con: "Every feed open is an expensive scatter-gather" },
    { choice: "Hybrid", pro: "Best of both for real-world skew", con: "Two code paths and a threshold to tune" }
  ],
  takeaways: ["The core question in feed design: pay at write time or at read time?", "Real traffic is skewed. Design for the hot keys explicitly.", "Precomputation is a cache. Skip it for users who won't read it."],
  quiz: [
    { q: "Why does fan-out on write make feed reads cheap?", o: ["It compresses images", "The feed is precomputed, so reading is a single lookup", "It uses SQL joins", "Readers download every post"], a: 1, why: "The expensive merge happened at post time; reading is just fetching a ready list." },
    { q: "An account with 50M followers posts. Best strategy?", o: ["Push to all 50M feeds immediately", "Pull: merge their posts at read time", "Email everyone", "Delay the post a day"], a: 1, why: "Pushing would mean 50M writes per post. Pulling is cheap because that post is hot and cached." },
    { q: "Where should photo bytes live?", o: ["In the posts table as BLOBs", "In Redis", "Object storage, served via a CDN", "On the app servers' disks"], a: 2, why: "Object storage is cheap and durable; CDNs make delivery fast worldwide." },
    { q: "A cheap optimization for push fan-out?", o: ["Skip followers who haven't been active recently", "Push twice for safety", "Use a bigger font", "Only push to celebrities"], a: 0, why: "Inactive users get their feed built on demand if they return, which saves a huge number of writes." }
  ],
  sources: ["Instagram/Meta engineering talks on feed ranking", "Meta: Instagram reached 2B monthly users (2022)"]
},

/* ─────────────────────────── 3. WHATSAPP ─────────────────────────── */
{
  id: "whatsapp", app: "WhatsApp", icon: "💬", color: "#25d366", color2: "#128c7e",
  title: "Design Real-time Messaging",
  tagline: "Deliver 100 billion messages a day instantly, in order, exactly once (as far as you can tell), and unreadable by the server.",
  level: "Intermediate", minutes: 14,
  concepts: ["websockets", "store-forward", "acks", "idempotency", "e2ee", "backoff"],
  stats: [
    { v: 2, suf: "B+", label: "users (WhatsApp, 2020)", kind: "Reported" },
    { v: 100, suf: "B", label: "messages per day (Meta, 2020)", kind: "Reported" },
    { v: 2, suf: "M", label: "connections on one server (WhatsApp blog, 2012)", kind: "Reported" }
  ],
  story: "You type \"on my way 🚗\" and hit send. One grey tick. Two grey ticks. Two blue ticks. Your friend is on another continent and was offline five minutes ago.<br><br>Those three ticks are a <b>delivery protocol</b> you can see. Each one is an acknowledgement travelling back across the world, and together they explain how chat apps stay instant, reliable and private.",
  requirements: {
    functional: ["1:1 and group messaging", "Sent / delivered / read receipts", "Offline delivery on reconnect", "Online / last-seen presence"],
    nonFunctional: ["Sub-second delivery when both users are online", "Never lose a message; never show duplicates", "End-to-end encrypted", "Battery- and data-friendly on cheap phones"]
  },
  estimate: [
    ["Messages / sec", "100B ÷ 86,400", "≈ 1.16 M /s"],
    ["Concurrent connections", "assumption: 500M online at peak", "500 M"],
    ["Chat servers needed", "500M ÷ ~1–2M per server", "≈ 250–500"],
    ["Transient storage / day", "100B × ~100 B", "≈ 10 TB"]
  ],
  estimateNote: "Insight: the bottleneck isn't storage, because delivered messages are deleted from servers. It's holding hundreds of millions of open connections and routing between them.",
  naive: {
    title: "\"Phones poll the server every 2 seconds\"",
    desc: "Each app sends GET /messages?since=… on a timer.",
    breaks: [
      "2B users ÷ 2 s ≈ 1 billion requests per second, and almost all return \"nothing new\".",
      "Constant radio wake-ups drain batteries and mobile data.",
      "Messages arrive up to 2 seconds late, and shrinking the interval makes the cost worse."
    ]
  },
  steps: [
    { t: "Keep a connection open", c: "websockets",
      b: "Each phone holds <b>one long-lived connection</b> to a chat server (WhatsApp uses a compact protocol over TCP; web apps use WebSockets). The server <b>pushes</b> messages the instant they arrive. Erlang, which WhatsApp is built on, is designed for millions of lightweight concurrent processes, one per connection.",
      a: "Staying on a phone call instead of mailing \"anything new?\" letters every two seconds." },
    { t: "Know where everyone is connected", c: "load-balancing",
      b: "Alice is connected to server 17, Bob to server 342. A <b>session registry</b> (user → server) lets server 17 forward Alice's message to server 342, which pushes it down Bob's connection. Entries are refreshed by heartbeats and removed when connections drop.",
      a: "A hotel front desk that knows which room every guest is in, so it can deliver a package." },
    { t: "Store and forward when offline", c: "store-forward",
      b: "If Bob is offline, the message is written to Bob's <b>durable inbox queue</b>. When Bob reconnects, his phone drains the inbox and acknowledges each message, and the server deletes them. The server is a relay, not an archive.",
      a: "The post office holds your mail while you're away and hands it over when you're back." },
    { t: "Ticks are acknowledgements", c: "acks",
      b: "✓ = the <b>server</b> received and durably stored it. ✓✓ = Bob's <b>device</b> received it and sent a delivery ACK. <span style=\"color:#53bdeb\">✓✓</span> = Bob <b>opened</b> the chat and his app sent a read receipt. Each tick is a tiny message flowing back to Alice.",
      a: "Registered mail with three signatures: the depot, the doorstep, and \"I opened it\"." },
    { t: "Exactly-once from at-least-once", c: "idempotency",
      b: "Networks drop packets, so Alice's phone <b>retries until it gets the server's ACK</b>, with backoff. Retries can create duplicates, so every message carries a <b>unique client-generated ID</b> and the server and recipient ignore IDs they've already seen. The user sees exactly one copy.",
      a: "Pressing an elevator button five times still calls one elevator." },
    { t: "Encrypt end to end", c: "e2ee",
      b: "With the <b>Signal Protocol</b> (rolled out across WhatsApp in 2016), only the devices hold keys. The server routes and queues ciphertext it can't read. Groups (now up to 1,024 members) use sender keys so a message is encrypted efficiently for many recipients, and the server fans it out.",
      a: "A courier carrying a locked box: they know the address, not the contents." }
  ],
  diagram: {
    nodes: [
      { id: "a", x: 90, y: 220, label: "Alice's phone", sub: "sender", kind: "client", icon: "📱", desc: "Encrypts the message, assigns a unique ID, and retries until the server ACKs." },
      { id: "s1", x: 300, y: 220, label: "Chat Server 17", sub: "Alice's connection", kind: "service", icon: "🔌", desc: "Holds Alice's persistent connection. Stores, ACKs, and routes." },
      { id: "reg", x: 500, y: 70, label: "Session Registry", sub: "user → server", kind: "cache", icon: "📇", desc: "Knows that Bob is currently on server 342 (or offline)." },
      { id: "inbox", x: 500, y: 370, label: "Offline Inbox", sub: "durable queue", kind: "queue", icon: "📦", desc: "Holds undelivered ciphertext until the recipient reconnects. Deleted after ACK." },
      { id: "s2", x: 700, y: 220, label: "Chat Server 342", sub: "Bob's connection", kind: "service", icon: "🔌", desc: "Pushes the message down Bob's open connection." },
      { id: "b", x: 910, y: 220, label: "Bob's phone", sub: "recipient", kind: "client", icon: "📱", desc: "Decrypts, sends a delivery ACK, and later a read receipt." }
    ],
    flows: [
      { name: "Both online", steps: [["a", "s1", "MSG id=m42 (ciphertext)"], ["s1", "a", "ACK → ✓ (stored)"], ["s1", "reg", "Where is Bob? → server 342"], ["s1", "s2", "Forward m42"], ["s2", "b", "Push over Bob's open connection"], ["b", "s2", "DELIVERED m42"], ["s1", "a", "→ ✓✓ delivered"]] },
      { name: "Bob offline", steps: [["a", "s1", "MSG id=m43"], ["s1", "a", "ACK → ✓"], ["s1", "reg", "Where is Bob? → offline"], ["s1", "inbox", "Persist m43 in Bob's inbox"], ["b", "s2", "…later: Bob reconnects"], ["inbox", "s2", "Drain inbox"], ["s2", "b", "Deliver m43; Bob ACKs and the copy is deleted"]] }
    ]
  },
  lab: { sim: "chat", title: "Delivery Protocol Lab", hint: "Send messages between Alice and Bob. Take Bob offline, make the network flaky, and watch store-and-forward, retries, and dedupe produce the ticks." },
  tradeoffs: [
    { choice: "Persistent connections", pro: "Instant push, low overhead per message", con: "Stateful servers; reconnect storms after outages" },
    { choice: "Delete after delivery", pro: "Small storage, better privacy", con: "History sync between devices is harder" },
    { choice: "E2E encryption", pro: "Server breaches don't reveal content", con: "No server-side search, spam scanning, or easy backups" }
  ],
  takeaways: ["Push beats poll when updates are frequent and latency matters.", "Reliability = retries + unique IDs + acknowledgements.", "Stateful connection servers need a registry to route between them."],
  quiz: [
    { q: "What does the second grey tick (✓✓) mean?", o: ["The server stored the message", "The recipient's device received it", "The recipient read it", "The message was encrypted"], a: 1, why: "One tick = server ACK. Two = device delivery ACK. Blue = read receipt." },
    { q: "A phone retries a send after a timeout, but the first attempt actually succeeded. What prevents a duplicate?", o: ["Encryption", "A unique message ID that the server deduplicates", "Bigger servers", "Polling"], a: 1, why: "At-least-once delivery + idempotent processing by ID = exactly-once effect." },
    { q: "Why not have phones poll every 2 seconds?", o: ["Polling is illegal", "Billions of mostly-empty requests, battery drain, and added delay", "HTTP can't carry text", "It's too fast"], a: 1, why: "A persistent connection lets the server push only when there's something to send." },
    { q: "How does server 17 find which server holds Bob's connection?", o: ["Broadcasts to all servers", "Looks him up in a session registry", "Asks Bob by SMS", "DNS"], a: 1, why: "A user → server map, kept fresh by heartbeats, gives direct routing." }
  ],
  sources: ["WhatsApp blog: \"1 million is so 2011\" (2012)", "WhatsApp: 2B users (Feb 2020); 100B messages/day (2020)", "WhatsApp Encryption Overview (Signal Protocol)"]
},

/* ─────────────────────────── 4. NETFLIX ─────────────────────────── */
{
  id: "netflix", app: "Netflix", icon: "🎬", color: "#e50914", color2: "#ff5f6d",
  title: "Design Video Streaming",
  tagline: "Press play and get HD in about a second, on a train, in a stadium, or on a slow hotel Wi-Fi.",
  level: "Advanced", minutes: 16,
  concepts: ["cdn", "abr", "transcoding", "chaos", "object-storage"],
  stats: [
    { v: 300, suf: "M+", label: "paid memberships (Netflix, 2025)", kind: "Reported" },
    { v: 250, suf: " Tbps", label: "50M streams × 5 Mbps", kind: "Estimate" },
    { v: 2, pre: "~", suf: " s", label: "per-segment buffer decisions", kind: "Design" }
  ],
  story: "It's Friday night. Tens of millions of people press play within the same hour. A single HD stream is millions of bits per second, and together that's hundreds of terabits per second.<br><br>No data center on Earth can push that across the internet backbone. Netflix's answer is to <b>move the movie close to you before you ask for it</b>, then <b>let your player adapt the quality every few seconds</b>.",
  requirements: {
    functional: ["Browse, search and get recommendations", "Play video on thousands of device types", "Resume across devices", "Multiple audio and subtitle tracks"],
    nonFunctional: ["Start playback in about a second", "Rebuffering is the #1 sin: avoid stalls", "Survive failures of entire services or regions", "Keep bandwidth costs sane"]
  },
  estimate: [
    ["Peak concurrent streams", "assumption", "50 M"],
    ["Average bitrate", "assumption (mix of SD/HD/4K)", "5 Mbps"],
    ["Peak egress", "50M × 5 Mbps", "≈ 250 Tbps"],
    ["Files per title", "resolutions × codecs × audio × subs", "hundreds+"]
  ],
  estimateNote: "Insight: 250 Tbps can't come from one place. The video must be served from thousands of edge servers, ideally inside your ISP's own network.",
  naive: {
    title: "\"Stream the MP4 from our data center\"",
    desc: "One high-quality file per title, served over HTTP from a central origin.",
    breaks: [
      "Distance adds latency, and long-haul links congest at peak, so playback stalls.",
      "One fixed bitrate is too much for weak connections (buffering) and too little for fiber (blurry).",
      "Egress of hundreds of Tbps from one origin is physically and financially impossible."
    ]
  },
  steps: [
    { t: "Split the control plane from the data plane", c: "chaos",
      b: "Everything <i>before</i> you press play (sign-in, browsing, recommendations, choosing what to stream) runs as microservices in the cloud (AWS). The <b>video bytes</b> come from Netflix's own CDN, <b>Open Connect</b>. Each plane scales independently.",
      a: "The ticket office and the cinema screens are different buildings." },
    { t: "Transcode once, into many shapes", c: "transcoding",
      b: "A studio master is chopped into chunks and encoded <b>in parallel</b> into a ladder of resolutions and bitrates, for multiple codecs and devices. <b>Per-title encoding</b> tunes the ladder to the content: an animated show looks great at bitrates that would make a grainy action film look blocky.",
      a: "One manuscript printed as a paperback, a hardcover and large print, by many printers at once." },
    { t: "Pre-position content at the edge", c: "cdn",
      b: "Open Connect Appliances sit <b>inside ISPs</b> and at internet exchanges. During off-peak hours they're <b>proactively filled</b> with the titles predicted to be popular in that region tomorrow. At peak, most traffic never crosses the backbone.",
      a: "Stocking the corner store overnight with what the neighborhood will want for breakfast." },
    { t: "Steer each viewer to the best server", c: "load-balancing",
      b: "When you press play, the control plane checks which nearby appliances are healthy, close, and actually <b>have your file</b>, and returns a ranked list of URLs. If one fails mid-stream, the player switches to the next.",
      a: "A GPS that routes you to the nearest open store that has your item in stock." },
    { t: "Adapt the bitrate every segment", c: "abr",
      b: "Video is served as short segments. The player continuously estimates throughput and watches its <b>buffer</b>. Healthy buffer and fast network: step up. Buffer draining: step down before it hits zero. A brief blurry patch is far better than a spinner.",
      a: "Shifting gears on a bike: easier gear on the hill, harder gear on the flat, and you never stop pedaling." },
    { t: "Design for failure, and practice it", c: "chaos",
      b: "Netflix built <b>Chaos Monkey</b> to randomly kill production instances, forcing every service to tolerate loss. <b>Circuit breakers</b> (popularized by its Hystrix library) stop calling a sick dependency and serve a fallback: if personalized rows fail, show popular titles instead of an error.",
      a: "Fire drills on a random Tuesday, plus fuses that trip before the whole house goes dark." }
  ],
  diagram: {
    nodes: [
      { id: "tv", x: 90, y: 240, label: "Your TV / phone", sub: "player", kind: "client", icon: "📺", desc: "Runs the ABR algorithm: picks quality per segment from throughput + buffer." },
      { id: "ctl", x: 320, y: 80, label: "Control Plane", sub: "AWS microservices", kind: "service", icon: "☁️", desc: "Auth, catalog, recommendations, playback licensing and steering." },
      { id: "steer", x: 560, y: 80, label: "Steering", sub: "picks best OCAs", kind: "service", icon: "🧭", desc: "Chooses healthy, nearby appliances that hold the requested files." },
      { id: "oca", x: 320, y: 360, label: "Open Connect (in ISP)", sub: "edge appliance", kind: "edge", icon: "📡", desc: "Serves the video segments from inside your ISP's network." },
      { id: "ix", x: 560, y: 360, label: "IXP Appliance", sub: "fallback edge", kind: "edge", icon: "🛰️", desc: "Larger cache at an internet exchange; fills ISP caches and serves misses." },
      { id: "enc", x: 800, y: 80, label: "Encoding Pipeline", sub: "parallel chunks", kind: "queue", icon: "🎞️", desc: "Turns studio masters into many renditions using per-title encoding." },
      { id: "s3", x: 800, y: 360, label: "Origin Storage", sub: "all renditions", kind: "db", icon: "🗄️", desc: "Master copies of every encoded file. Edge caches fill from here off-peak." }
    ],
    flows: [
      { name: "Press play", steps: [["tv", "ctl", "Play \"Stranger Things S1E1\""], ["ctl", "steer", "Which edges are best for this viewer?"], ["steer", "tv", "Ranked URLs: ISP appliance #1, IXP #2"], ["tv", "oca", "GET segment 1 @ 720p (fast start)"], ["oca", "tv", "Segment bytes from inside the ISP"], ["tv", "oca", "Throughput looks great: next segments @ 1080p"]] },
      { name: "Nightly fill", steps: [["enc", "s3", "New episode encoded into dozens of renditions"], ["s3", "ix", "Off-peak: fill the IXP caches"], ["ix", "oca", "Pre-position tomorrow's predicted hits"]] }
    ]
  },
  lab: { sim: "abr", title: "Adaptive Bitrate Lab", hint: "You are the network. Drag bandwidth up and down (or turn on the storm) and watch the player shift quality to protect its buffer. Compare edge vs. origin startup time." },
  tradeoffs: [
    { choice: "Own CDN inside ISPs", pro: "Lower latency and cost at massive scale; ISPs save transit", con: "Huge hardware and partnership investment" },
    { choice: "Conservative ABR", pro: "Fewer stalls", con: "Sometimes lower quality than the network could carry" },
    { choice: "Microservices + chaos", pro: "Teams move fast; failures are contained", con: "Operational complexity; needs strong observability" }
  ],
  takeaways: ["Move bytes close to users before they ask (predictive caching).", "Let the client adapt: it sees the network best.", "Separate control plane and data plane; scale each on its own terms."],
  quiz: [
    { q: "Your buffer is dropping fast. What should the ABR player do?", o: ["Switch to a higher bitrate", "Switch to a lower bitrate for upcoming segments", "Pause and restart", "Re-download the whole video"], a: 1, why: "Lowering quality refills the buffer and avoids a stall, which viewers hate most." },
    { q: "Why place servers inside ISPs?", o: ["Legal requirement", "Bytes travel a short distance and skip congested long-haul links", "ISPs can't route traffic", "To store user passwords"], a: 1, why: "Shorter paths mean lower latency, fewer bottlenecks, and lower transit costs for everyone." },
    { q: "What is per-title encoding?", o: ["Encrypting each title separately", "Tuning the bitrate ladder to each title's visual complexity", "Charging per title", "Titles in many languages"], a: 1, why: "Simple content reaches the same quality with far fewer bits." },
    { q: "Personalized recommendations are down. Best behavior?", o: ["Show an error page", "A circuit breaker serves a fallback such as popular titles", "Retry forever", "Log the user out"], a: 1, why: "Graceful degradation keeps people watching while the dependency recovers." }
  ],
  sources: ["Netflix Open Connect overview (openconnect.netflix.com)", "Netflix Tech Blog: Per-Title Encode Optimization; Chaos Monkey; Hystrix", "Netflix Q4 2024 letter: 300M+ paid memberships"]
},

/* ─────────────────────────── 5. UBER ─────────────────────────── */
{
  id: "uber", app: "Uber", icon: "🚗", color: "#06c1a0", color2: "#2dd4bf",
  title: "Design Ride Matching",
  tagline: "Millions of moving dots, updated every few seconds: find the best driver near you in milliseconds.",
  level: "Advanced", minutes: 15,
  concepts: ["geo-index", "sharding", "ttl-lock", "geo-sharding", "caching"],
  stats: [
    { v: 30, suf: "M+", label: "trips per day (2024 annual report ÷ 365)", kind: "Reported" },
    { v: 4, pre: "~", suf: " s", label: "between driver location updates", kind: "Typical" },
    { v: 250, suf: "k/s", label: "location writes for 1M online drivers", kind: "Estimate" }
  ],
  story: "You're outside a stadium after a concert. You tap <i>Request</i>. Within seconds a car three blocks away is assigned to you, and the price is 1.8× because 20,000 other people just did the same thing.<br><br>The core problem is <b>\"who is near me?\"</b> over a firehose of constantly moving points, plus making sure <b>one driver isn't promised to two riders</b>.",
  requirements: {
    functional: ["Drivers stream their location", "Riders see nearby cars and request a ride", "Match rider to a good driver who can accept or decline", "Dynamic (surge) pricing by area"],
    nonFunctional: ["Matching in seconds; nearby search in milliseconds", "Handle huge write rate from location pings", "A driver is never double-assigned", "Graceful under local hotspots (concerts, airports)"]
  },
  estimate: [
    ["Online drivers at peak", "assumption", "1 M"],
    ["Location writes / sec", "1M ÷ 4 s", "≈ 250,000 /s"],
    ["Ingest bandwidth", "250k × ~100 B", "≈ 25 MB/s"],
    ["Ride requests / sec (avg)", "30M ÷ 86,400", "≈ 350 /s (peaks ≫)"]
  ],
  estimateNote: "Insight: location writes outnumber ride requests by about 1000×. Only the latest position matters for matching, so it belongs in memory, not in a disk index that gets rewritten 250k times a second.",
  naive: {
    title: "\"SELECT drivers WHERE distance(me, driver) < 2 km\"",
    desc: "Store driver lat/lng in a relational table and compute distance for every row.",
    breaks: [
      "Each request scans every driver in the table, which is O(N) per search.",
      "250k updates/s constantly rewrite the very rows (and indexes) you're scanning.",
      "Straight-line distance ignores rivers, highways and one-way streets."
    ]
  },
  steps: [
    { t: "Treat location as an ephemeral firehose", c: "caching",
      b: "Driver apps send a location ping every few seconds. Matching only needs the <b>latest</b> position, so keep it in an <b>in-memory store</b>, keyed by driver and indexed by cell. The full history streams to a log (for ETAs, fraud, analytics) asynchronously.",
      a: "A whiteboard you keep wiping and rewriting, not a ledger where you append every line forever." },
    { t: "Cut the map into cells", c: "geo-index",
      b: "Index points by <b>cell</b> so a search touches a few buckets. Options: <b>geohash</b> (a string where a shared prefix means nearby), <b>quadtrees</b> (split dense areas finer), or <b>H3</b>, the hierarchical <b>hexagon</b> grid Uber open-sourced in 2018.",
      a: "Finding a friend in a stadium by section number instead of checking every seat." },
    { t: "Why hexagons?", c: "geo-index",
      b: "Every neighbor of a hexagon is the <b>same distance</b> from its center. Squares have edge neighbors and farther diagonal neighbors. That makes \"expand the search ring by one\" and surge heatmaps smooth and fair in every direction.",
      a: "A honeycomb: bees found the shape that tiles a plane with equal neighbors long before engineers did." },
    { t: "Search rings, then rank by real ETA", c: "geo-index",
      b: "Look in the rider's cell, then ring 1, then ring 2… until enough candidate drivers are found. Then rank those few candidates by <b>road-network ETA</b>, not straight-line distance. The index makes the search cheap; routing makes it right.",
      a: "Ripples spreading from a stone dropped in a pond." },
    { t: "Lock the driver while offering", c: "ttl-lock",
      b: "Model the driver as a state machine: <code>AVAILABLE → OFFERED → ON_TRIP</code>. Moving to OFFERED is an <b>atomic conditional write with a timeout</b>. If the driver doesn't accept in ~15 s, they go back to AVAILABLE and the next candidate is offered. No driver is offered to two riders at once.",
      a: "Putting a \"reserved\" card on a restaurant table that expires if the guest doesn't show." },
    { t: "Shard by geography, and handle hotspots", c: "sharding",
      b: "Cities and regions map to different server groups (Uber built <b>Ringpop</b>, consistent-hashing-based, for this kind of sharding). Supply/demand per cell drives <b>surge pricing</b>, which also pulls drivers toward the hotspot. Very dense areas use finer cells.",
      a: "Each city has its own dispatch office, and the busiest neighborhoods get extra dispatchers." }
  ],
  diagram: {
    nodes: [
      { id: "d", x: 90, y: 100, label: "Driver app", sub: "ping every ~4 s", kind: "client", icon: "🚕", desc: "Streams GPS updates; accepts or declines offers." },
      { id: "r", x: 90, y: 360, label: "Rider app", sub: "request ride", kind: "client", icon: "🙋", desc: "Requests a ride and sees nearby cars." },
      { id: "gw", x: 290, y: 230, label: "Gateway", sub: "geo-sharded", kind: "edge", icon: "⚖️", desc: "Routes each request to the shard that owns that city/region." },
      { id: "loc", x: 510, y: 100, label: "Location Service", sub: "in-memory", kind: "service", icon: "📍", desc: "Updates the driver's latest position and moves them between cells." },
      { id: "idx", x: 740, y: 100, label: "Cell Index", sub: "H3 cell → drivers", kind: "cache", icon: "⬡", desc: "For each hexagon, the set of available drivers inside it." },
      { id: "match", x: 510, y: 360, label: "Matching / Dispatch", sub: "state machine", kind: "service", icon: "🤝", desc: "Ring search → ETA ranking → atomic offer with timeout." },
      { id: "eta", x: 740, y: 360, label: "Routing / ETA", sub: "road graph", kind: "service", icon: "🛣️", desc: "Computes real driving time for the candidates." },
      { id: "log", x: 920, y: 230, label: "Trip & Location Log", sub: "Kafka → storage", kind: "queue", icon: "📬", desc: "History for billing, safety, analytics and ML." }
    ],
    flows: [
      { name: "Driver pings", steps: [["d", "gw", "PING lat,lng (every ~4 s)"], ["gw", "loc", "Routed to the city shard"], ["loc", "idx", "Move driver from cell A to cell B"], ["loc", "log", "Append to history asynchronously"]] },
      { name: "Rider requests", steps: [["r", "gw", "REQUEST ride @ lat,lng"], ["gw", "match", "City shard's dispatcher"], ["match", "idx", "Cell + ring 1 + ring 2 → 12 candidates"], ["match", "eta", "Rank candidates by road ETA"], ["match", "d", "Atomic OFFER to best driver (15 s TTL)"], ["d", "match", "ACCEPT"], ["match", "r", "Driver is 3 min away"]] }
    ]
  },
  lab: { sim: "geo", title: "Geo-Index Lab", hint: "Click anywhere on the map to request a ride. Watch the hexagon rings expand, see how few drivers are checked compared with a full scan, and switch on the surge heatmap." },
  tradeoffs: [
    { choice: "In-memory latest location", pro: "Handles 100k+ writes/s with low latency", con: "Must rebuild from pings after a crash (fine: they arrive every few seconds)" },
    { choice: "Hexagons (H3) vs. geohash squares", pro: "Uniform neighbors and smooth rings", con: "Hexagons don't subdivide perfectly into children" },
    { choice: "Offer to one driver at a time", pro: "No double-assignments; fair", con: "Declines add seconds of latency" }
  ],
  takeaways: ["Index space so search cost depends on locality, not total size.", "Keep high-churn ephemeral state in memory.", "Use state machines with atomic, expiring transitions for scarce resources."],
  quiz: [
    { q: "Why are hexagons nice for geo-indexing?", o: ["They're smaller", "All neighbors are the same distance from the center", "GPS outputs hexagons", "They compress better"], a: 1, why: "Uniform adjacency makes ring searches and heatmaps consistent in all directions." },
    { q: "Where should a driver's latest location live?", o: ["An append-only SQL table scanned on every search", "An in-memory, cell-indexed store", "A CDN", "A nightly batch file"], a: 1, why: "It changes every few seconds and only the latest value matters for matching." },
    { q: "How do you prevent one driver being offered to two riders?", o: ["Hope", "Atomic state transition AVAILABLE→OFFERED with a timeout", "Send both riders and let them race", "Bigger servers"], a: 1, why: "A conditional, expiring write gives one offer at a time and auto-recovers if ignored." },
    { q: "After finding nearby candidates by cell, you rank them by…", o: ["Driver name", "Straight-line distance only", "Road-network ETA", "Random"], a: 2, why: "A driver across a river may be close in a straight line and far by road." }
  ],
  sources: ["Uber Engineering: H3 hexagonal hierarchical spatial index (2018)", "Uber Engineering: Ringpop", "Uber 2024 annual report: ~11B trips"]
},

/* ─────────────────────────── 6. TICKETMASTER ─────────────────────────── */
{
  id: "ticketmaster", app: "Ticketmaster", icon: "🎟️", color: "#026cdf", color2: "#4f9dff",
  title: "Design a Flash-Sale Onsale",
  tagline: "Millions of fans, tens of thousands of seats, one moment: keep it fair, keep it up, and never sell a seat twice.",
  level: "Advanced", minutes: 16,
  concepts: ["waiting-room", "ttl-lock", "optimistic-concurrency", "idempotency", "rate-limiting", "hot-key", "cdn"],
  stats: [
    { v: 3.5, d: 1, suf: "B", label: "system requests in one 2022 presale day (Ticketmaster statement)", kind: "Reported" },
    { v: 4, suf: "×", label: "the platform's previous peak (same statement)", kind: "Reported" },
    { v: 40, suf: ":1", label: "fans per seat in our example", kind: "Estimate" }
  ],
  story: "At 10:00:00 the tickets for the biggest tour of the year go on sale. A stadium holds about 50,000 people, and two million fans are staring at the same button.<br><br>This is the hardest kind of traffic: a <b>synchronized spike</b> aimed at a <b>tiny, contested inventory</b>. Every design choice here balances survival, fairness and correctness.<br><br><span class=\"muted small\">This lesson is a generic, educational design based on public information about ticketing systems, not a description of Ticketmaster's internal architecture.</span>",
  requirements: {
    functional: ["Browse event and seat map", "Pick seats and hold them while paying", "Checkout and payment", "Fair access when demand ≫ supply"],
    nonFunctional: ["Survive 10–100× normal traffic at a known instant", "Never sell the same seat twice", "Fairness: arriving early beats refreshing fast; bots don't win", "One hot event must not take down every other event"]
  },
  estimate: [
    ["Fans at T0", "assumption", "2 M"],
    ["Requests / sec if everyone refreshes every 5 s", "2M ÷ 5", "≈ 400,000 /s"],
    ["Seats available", "one stadium show", "≈ 50,000"],
    ["Demand : supply", "2M ÷ 50k", "40 : 1"],
    ["Checkout capacity (example)", "assumption", "≈ 2,000 shoppers/s"]
  ],
  estimateNote: "Insight: most of these fans can't get a ticket no matter what. The goal is to tell them gracefully and fairly, and protect the inventory path for the ones who can.",
  naive: {
    title: "\"Open the doors and let everyone click Buy\"",
    desc: "At 10:00, every fan hits the inventory API directly; the app reads seat status then writes SOLD.",
    breaks: [
      "Synchronized retries (a thundering herd) push the backend past capacity. Errors trigger more retries, a retry storm.",
      "Read-then-write race: two fans both read \"available\" and both write \"sold\", so the seat is double-booked.",
      "Fastest-refresh wins, which rewards bots and scripts over real fans."
    ]
  },
  steps: [
    { t: "Absorb everything static at the edge", c: "cdn",
      b: "Event pages, images, JavaScript and even pre-rendered seat-map layouts are served from the <b>CDN</b>. Only the calls that truly need live inventory reach your origin, so the spike shrinks before it arrives.",
      a: "Hand out printed programs at the gate so nobody needs to ask the box office what's playing." },
    { t: "Put a virtual waiting room in front", c: "waiting-room",
      b: "Fans who arrive before the onsale get a <b>randomized queue position</b>, which removes the refresh race. Users are then <b>admitted at the rate the inventory system can handle</b>, while the rest see their position and an estimated wait. This is backpressure applied at the front door.",
      a: "A nightclub bouncer: the line can stretch around the block, but the dance floor never gets dangerously packed." },
    { t: "Hold seats with a timer", c: "ttl-lock",
      b: "Choosing a seat creates a <b>temporary hold</b> (for example a few minutes) instead of selling it. If you pay in time, the hold becomes SOLD; if you leave, the hold <b>expires</b> and the seat goes back into inventory for the next fan.",
      a: "A fitting-room tag: the clothes are yours for ten minutes, then they go back on the rack." },
    { t: "Make the hold atomic", c: "optimistic-concurrency",
      b: "The hold is a single <b>conditional write</b>: <code>set HELD by me IF status = AVAILABLE</code> (a DB conditional update, or Redis <code>SET NX PX</code>). Two fans can click the same seat in the same millisecond, but exactly one wins and the other instantly gets \"just taken, pick another\".",
      a: "Two hands reach for the last cookie, and the jar lid only opens for one." },
    { t: "Checkout safely with idempotency", c: "idempotency",
      b: "Payment calls carry an <b>idempotency key</b> (one per order attempt). If the network hiccups and the browser retries, the fan is charged once. Only after payment succeeds does the seat flip HELD → SOLD.",
      a: "Pressing the elevator button five times still calls one elevator." },
    { t: "Fight bots and isolate hot events", c: "rate-limiting",
      b: "Pre-registration (Ticketmaster's <b>Verified Fan</b> is a public example), <b>rate limits</b> per account, device and IP, and behavioral bot detection keep scripts out of line. Inventory is <b>partitioned by event</b> (bulkheads) so one mega-onsale can't starve every other show.",
      a: "Wristbands checked at the door, and the stadium's rush doesn't close the theatre next door." }
  ],
  diagram: {
    nodes: [
      { id: "f", x: 80, y: 230, label: "2M fans", sub: "browsers & apps", kind: "client", icon: "🧑‍🤝‍🧑", desc: "All arrive at once. Some are bots." },
      { id: "cdn", x: 250, y: 90, label: "CDN", sub: "pages, maps, JS", kind: "edge", icon: "🌍", desc: "Serves everything static so the origin only sees inventory calls." },
      { id: "wr", x: 250, y: 360, label: "Waiting Room", sub: "randomize & meter", kind: "edge", icon: "🚦", desc: "Assigns queue positions, admits at a controlled rate, issues signed admission tokens." },
      { id: "bot", x: 440, y: 360, label: "Bot / Rate Limiter", sub: "per account/IP", kind: "service", icon: "🛡️", desc: "Token buckets and risk scoring drop abusive traffic." },
      { id: "inv", x: 640, y: 230, label: "Inventory Service", sub: "partitioned by event", kind: "service", icon: "🎟️", desc: "Atomic seat holds with TTL; release on expiry." },
      { id: "lock", x: 860, y: 110, label: "Seat Holds", sub: "SET NX + TTL", kind: "cache", icon: "⏱️", desc: "seat → holder with expiry. Atomic compare-and-set." },
      { id: "db", x: 860, y: 350, label: "Orders DB", sub: "source of truth", kind: "db", icon: "🗄️", desc: "Durable orders; SOLD written transactionally after payment." },
      { id: "pay", x: 640, y: 400, label: "Payments", sub: "idempotent", kind: "external", icon: "💳", desc: "Charged with an idempotency key; retries are safe." }
    ],
    flows: [
      { name: "Fan buys a seat", steps: [["f", "cdn", "Load event page (cached)"], ["f", "wr", "Join queue → position #18,204"], ["wr", "bot", "Admitted: signed token, risk check passes"], ["bot", "inv", "Hold seat 114-F-12"], ["inv", "lock", "SET NX seat 114-F-12 (5 min TTL) → OK"], ["inv", "pay", "Charge with Idempotency-Key"], ["inv", "db", "Order SOLD (transaction)"]] },
      { name: "Two fans, one seat", steps: [["bot", "inv", "Fan A: hold 114-F-12"], ["inv", "lock", "SET NX → OK (A wins)"], ["bot", "inv", "Fan B: hold 114-F-12 (same ms)"], ["inv", "lock", "SET NX → FAIL (already held)"], ["inv", "bot", "B: \"Just taken, here are nearby seats\""]] }
    ]
  },
  lab: { sim: "onsale", title: "Onsale Simulator", hint: "Run the same onsale twice: once as a free-for-all, once with a waiting room and atomic holds. Watch server load, errors, double-bookings and released holds." },
  tradeoffs: [
    { choice: "Waiting room", pro: "Protects backend; fair; predictable", con: "Users wait; must communicate clearly" },
    { choice: "Short hold TTL", pro: "Abandoned seats recycle quickly", con: "Slow payers lose seats; tune carefully" },
    { choice: "Strong consistency on inventory", pro: "Never oversell", con: "Contention on hot rows; needs partitioning" }
  ],
  takeaways: ["When demand ≫ supply, controlling admission matters more than raw capacity.", "Scarce resources need atomic, expiring reservations.", "Fairness is a system property: design it in (randomize, verify, rate-limit)."],
  quiz: [
    { q: "Two fans click the same seat in the same millisecond. What guarantees only one gets it?", o: ["A faster database", "An atomic conditional write (e.g. SET NX / UPDATE … WHERE status='AVAILABLE')", "Reading the seat twice", "A CDN"], a: 1, why: "The check and the write happen as one operation, so exactly one succeeds." },
    { q: "Why randomize queue positions for fans who arrive before the onsale?", o: ["To confuse bots", "It removes the incentive to hammer refresh at 9:59:59", "Databases prefer random", "To sell more tickets"], a: 1, why: "If everyone who's early is treated equally, mashing refresh doesn't help." },
    { q: "Why do seat holds have a TTL?", o: ["To annoy users", "So abandoned holds return seats to inventory automatically", "Because Redis requires it", "To speed up payment"], a: 1, why: "Without expiry, every abandoned cart would lock seats forever." },
    { q: "What does the waiting room primarily provide?", o: ["Caching", "Backpressure: admission at a rate the system can sustain", "Encryption", "Analytics"], a: 1, why: "It converts an uncontrolled spike into a steady, survivable flow." }
  ],
  sources: ["Ticketmaster statement on the Nov 2022 presale (3.5B system requests, 4× prior peak)", "Public descriptions of Verified Fan and virtual queues", "Generic reservation / lease patterns"]
},

/* ─────────────────────────── 7. DISCORD ─────────────────────────── */
{
  id: "discord", app: "Discord", icon: "🎮", color: "#5865f2", color2: "#8b93ff",
  title: "Store Trillions of Messages",
  tagline: "Scroll back years in any channel instantly, even when a million people pile into the same one at once.",
  level: "Advanced", minutes: 15,
  concepts: ["sharding", "consistent-hashing", "snowflake", "hot-key", "request-coalescing", "replication", "kv-store"],
  stats: [
    { v: 177, suf: " → 72", label: "DB nodes: Cassandra → ScyllaDB (2023 blog)", kind: "Reported" },
    { v: 15, pre: "p99 ", suf: " ms", label: "message read latency after migration", kind: "Reported" },
    { v: 1, suf: "T+", label: "messages stored (\"trillions\")", kind: "Reported" }
  ],
  story: "A huge gaming server pings @everyone about a launch. Within seconds, hundreds of thousands of people open the same channel and ask for the same last 50 messages.<br><br>Meanwhile, quiet channels everywhere are reading years-old history. Discord's messaging store is a masterclass in <b>picking a partition key</b>, <b>spreading data with consistent hashing</b>, and <b>defusing hot partitions</b>.",
  requirements: {
    functional: ["Send and read messages per channel", "Scroll back through history (pagination by time)", "Edit and delete messages", "Search (separate system)"],
    nonFunctional: ["Reads of recent messages are fast at p99", "Storage grows forever, so scale horizontally", "Survive node failures with no data loss", "Hot channels must not degrade everyone else"]
  },
  estimate: [
    ["Messages / day", "assumption", "1 B"],
    ["Write QPS", "1B ÷ 86,400", "≈ 11,600 /s"],
    ["Storage / year", "1B × 365 × ~1 KB", "≈ 365 TB (before replication)"],
    ["With replication factor 3", "365 TB × 3", "≈ 1.1 PB / year"]
  ],
  estimateNote: "Insight: at petabyte scale the question isn't whether to shard. It's how to choose keys so that every common query hits one partition, and how to survive the one partition everyone wants.",
  naive: {
    title: "\"One big Postgres messages table\"",
    desc: "messages(id, channel_id, author_id, content, created_at) with an index on (channel_id, created_at).",
    breaks: [
      "One machine can't hold petabytes or absorb the write rate.",
      "Index maintenance and vacuuming get slower as the table grows forever.",
      "One viral channel saturates the whole database for everyone."
    ]
  },
  steps: [
    { t: "Shard across many nodes", c: "sharding",
      b: "Use a distributed wide-column store (Discord used Cassandra, then migrated to <b>ScyllaDB</b>) that spreads rows across many nodes and adds capacity by adding machines.",
      a: "A library that opens a new building whenever the shelves fill up." },
    { t: "Pick the partition key from the query", c: "sharding",
      b: "The dominant query is \"latest messages in channel X\". Partition by <code>(channel_id, bucket)</code>, where <b>bucket</b> is a fixed time window. A channel's recent messages sit together on one partition, and buckets stop any single partition from growing forever.",
      a: "Filing letters by recipient and then by month, so \"this month's letters to Sam\" is one drawer." },
    { t: "Use time-sortable Snowflake IDs", c: "snowflake",
      b: "Message IDs are <b>Snowflakes</b>: 64 bits of timestamp + worker + sequence. They're generated without coordination and <b>sort by time</b>, so \"50 messages before ID X\" is a fast range scan within a partition.",
      a: "Receipt numbers that start with the date, so sorting by number also sorts by time." },
    { t: "Place partitions with consistent hashing", c: "consistent-hashing",
      b: "Partition keys are hashed onto a <b>ring</b>, and each node owns arcs of it (via many virtual nodes). Adding a node takes over only ~1/N of the data instead of reshuffling everything as <code>hash % N</code> would. Each partition is <b>replicated to 3 nodes</b> with quorum reads and writes.",
      a: "Seats around a round table: when a newcomer sits, only one neighbor slides over." },
    { t: "Defuse hot partitions with coalescing", c: "request-coalescing",
      b: "One channel = one partition, so a viral channel is a hot partition. Discord built <b>data services in Rust</b> in front of the DB. Requests for the same channel are routed (by consistent hashing) to the same instance, which <b>coalesces</b> identical concurrent queries: one DB read answers thousands of waiting users.",
      a: "Ten people ask a librarian for the same book; she fetches it once and reads it aloud." },
    { t: "Measure, then migrate", c: "replication",
      b: "Per Discord's 2023 write-up, moving from 177 Cassandra nodes to 72 ScyllaDB nodes cut p99 read latency from 40–125 ms to about 15 ms, and avoided GC pauses. They migrated trillions of messages with a custom Rust migrator while keeping the service online.",
      a: "Renovating a busy train station one platform at a time, without stopping the trains." }
  ],
  diagram: {
    nodes: [
      { id: "c", x: 80, y: 230, label: "Clients", sub: "100k open #launch", kind: "client", icon: "👥", desc: "Lots of users asking for the same channel at once." },
      { id: "api", x: 260, y: 230, label: "API", sub: "stateless", kind: "service", icon: "⚙️", desc: "Validates and forwards message reads/writes." },
      { id: "ds", x: 460, y: 230, label: "Data Services", sub: "Rust, coalescing", kind: "service", icon: "🧲", desc: "Routes by channel (consistent hash); collapses duplicate in-flight queries into one." },
      { id: "n1", x: 700, y: 80, label: "Node A", sub: "replica 1", kind: "db", icon: "🗄️", desc: "Owns some ring arcs; holds replicas of partitions." },
      { id: "n2", x: 760, y: 230, label: "Node B", sub: "replica 2", kind: "db", icon: "🗄️", desc: "Second replica of (channel, bucket)." },
      { id: "n3", x: 700, y: 380, label: "Node C", sub: "replica 3", kind: "db", icon: "🗄️", desc: "Third replica; quorum = 2 of 3." },
      { id: "sf", x: 260, y: 70, label: "Snowflake IDs", sub: "time-sortable", kind: "cache", icon: "❄️", desc: "IDs generated locally per worker; sort by time." },
      { id: "ring", x: 930, y: 230, label: "Hash Ring", sub: "vnodes", kind: "external", icon: "💍", desc: "Partition key → token → owning nodes." }
    ],
    flows: [
      { name: "Hot channel read", steps: [["c", "api", "100,000× GET /channels/launch/messages"], ["api", "ds", "All route to the same data-service instance"], ["ds", "n2", "ONE query: (launch, bucket 2025-W12) LIMIT 50"], ["n2", "ds", "50 messages"], ["ds", "c", "Fan the single result out to all 100k waiters"]] },
      { name: "Send a message", steps: [["c", "api", "POST message"], ["sf", "api", "Assign Snowflake ID (no coordination)"], ["api", "ds", "Write"], ["ds", "ring", "Hash (channel, bucket) → token"], ["ds", "n1", "Write replica 1"], ["ds", "n2", "Write replica 2 → quorum reached ✓"], ["ds", "n3", "Replica 3 catches up"]] }
    ]
  },
  lab: { sim: "ring", title: "Consistent Hashing Lab", hint: "Add and remove database nodes. Compare how many keys move on a hash ring vs. with hash % N, and turn on virtual nodes to balance the load." },
  tradeoffs: [
    { choice: "(channel, bucket) partition key", pro: "Recent history is one partition read", con: "Viral channels become hot partitions" },
    { choice: "Consistent hashing + vnodes", pro: "Minimal data movement on resize; even load", con: "More metadata; replica placement is subtler" },
    { choice: "Coalescing layer", pro: "Hot reads collapse to one DB query", con: "Extra hop and service to operate" }
  ],
  takeaways: ["Choose partition keys from your dominant query.", "Bound partition growth (time buckets).", "Hashing distributes keys; it can't split one hot key, so coalesce or cache it."],
  quiz: [
    { q: "With hash(key) % N, what happens when N goes from 4 to 5?", o: ["About 20% of keys move", "Most keys (about 80%) move", "No keys move", "Only new keys are affected"], a: 1, why: "A key stays only if hash%4 == hash%5, which holds for about 1 in 5 keys." },
    { q: "Why add a time bucket to the partition key?", o: ["To encrypt data", "To stop one channel's partition from growing forever", "For SEO", "Snowflakes require it"], a: 1, why: "Bounded partitions keep reads, compaction and repairs efficient." },
    { q: "100k users request the same channel at once. What helps most?", o: ["Request coalescing so one DB query serves all", "More indexes", "Smaller messages", "Polling"], a: 0, why: "Identical in-flight requests share one backend result." },
    { q: "What makes Snowflake IDs useful for pagination?", o: ["They're random", "They sort by creation time", "They're short strings", "They're encrypted"], a: 1, why: "The timestamp is the high bits, so ID order is time order." }
  ],
  sources: ["Discord Engineering: How Discord Stores Billions of Messages (2017)", "Discord Engineering: How Discord Stores Trillions of Messages (2023)"]
},

/* ─────────────────────────── 8. STRIPE ─────────────────────────── */
{
  id: "stripe", app: "Stripe", icon: "💳", color: "#635bff", color2: "#00d4ff",
  title: "Design a Reliable Payments API",
  tagline: "Networks fail mid-request. Make sure a customer is charged exactly once, every time.",
  level: "Intermediate", minutes: 13,
  concepts: ["idempotency", "rate-limiting", "backoff", "acks", "optimistic-concurrency", "replication"],
  stats: [
    { v: 1.4, d: 1, pre: "$", suf: "T", label: "total payment volume in 2024 (Stripe annual letter)", kind: "Reported" },
    { v: 99.999, d: 3, suf: "%", label: "API uptime target", kind: "Reported" },
    { v: 1, suf: "×", label: "times a customer should be charged", kind: "Requirement" }
  ],
  story: "A customer taps <b>Pay $49.99</b>. Your server calls the payments API… and the connection times out. Did the charge go through? If you retry, you might charge them twice. If you don't, you might lose the sale.<br><br>This is one of the most common real-world distributed-systems bugs. Stripe's API is a well-known example of the fix: <b>idempotency keys</b>, <b>retries with backoff and jitter</b>, and <b>rate limiting</b> to keep everyone safe.",
  requirements: {
    functional: ["Create charges / payment intents", "Refunds", "Webhooks to notify merchants of events", "Per-account limits and API keys"],
    nonFunctional: ["Correctness above all: no double charges, no lost money", "Very high availability", "Safe for clients to retry anything", "Protect the platform from runaway clients"]
  },
  estimate: [
    ["API requests / sec", "assumption", "10,000"],
    ["Timeout / ambiguous rate", "assumption", "0.1%"],
    ["Ambiguous payments / sec", "10,000 × 0.001", "≈ 10 /s"],
    ["Per day", "10 × 86,400", "≈ 864,000 maybes"]
  ],
  estimateNote: "Insight: even a tiny failure rate at scale creates nearly a million \"did it charge?\" moments a day. Retries must be safe by design, not by luck.",
  naive: {
    title: "\"Just retry on timeout\"",
    desc: "If POST /charge times out, call it again.",
    breaks: [
      "The first request may have succeeded and only the response was lost, so the retry charges a second time.",
      "Thousands of clients retrying in sync after an outage hammer the recovering service (a thundering herd).",
      "One buggy client in a tight retry loop can degrade the API for everyone."
    ]
  },
  steps: [
    { t: "Attach an idempotency key", c: "idempotency",
      b: "The client generates a unique key per logical operation (for example per checkout attempt) and sends it with the request: <code>Idempotency-Key: 7f3c…</code>. The same key on a retry means \"this is the same request\".",
      a: "Writing a check number on every check: the bank won't cash #1042 twice." },
    { t: "Server: store key → result atomically", c: "optimistic-concurrency",
      b: "On first sight of a key, the server records it (in the same transaction as the charge, or with a lock) and stores the final response. A retry with the same key <b>returns the stored response</b> instead of executing again. A concurrent duplicate waits or gets a conflict error.",
      a: "A coat check: the second time you hand over ticket #42 you get the same coat, not a new one." },
    { t: "Retry with exponential backoff + jitter", c: "backoff",
      b: "Retry only on safe signals (timeouts, 5xx, 429), waiting <code>base × 2^attempt</code> with <b>randomness</b>. Jitter spreads retries out so a recovering service isn't hit by synchronized waves.",
      a: "After a crowded door jams, people trying again at random moments get through faster than everyone pushing on \"3, 2, 1\"." },
    { t: "Rate limit with token buckets", c: "rate-limiting",
      b: "Stripe has written publicly about using <b>token bucket</b> rate limiters (backed by Redis) per user, plus <b>load shedders</b> that drop low-priority traffic when the system is stressed, so critical requests like charges survive.",
      a: "A cup of arcade tokens: spend a handful in a burst, but refills come one per second." },
    { t: "Keep a ledger, and reconcile", c: "replication",
      b: "Money movement is recorded in an append-only, <b>double-entry ledger</b> in strongly consistent, replicated storage. Background jobs reconcile with banks and card networks so any mismatch is detected and fixed.",
      a: "Accountants never erase lines; they add correcting entries and balance the books every night." },
    { t: "Deliver webhooks at least once", c: "acks",
      b: "Merchants learn about events (payment succeeded, refund issued) via <b>webhooks</b>, retried with backoff until acknowledged. Each event has a unique ID, so merchants must handle them idempotently too. Idempotency is needed in both directions.",
      a: "A courier who keeps coming back until someone signs for the parcel." }
  ],
  diagram: {
    nodes: [
      { id: "m", x: 90, y: 230, label: "Merchant server", sub: "Stripe client lib", kind: "client", icon: "🏪", desc: "Generates idempotency keys and retries with backoff." },
      { id: "edge", x: 290, y: 230, label: "API Edge", sub: "auth + rate limit", kind: "edge", icon: "🪣", desc: "Token buckets per key/account; load shedding by priority." },
      { id: "idem", x: 500, y: 90, label: "Idempotency Store", sub: "key → response", kind: "cache", icon: "🔁", desc: "Remembers each key and its final response for a retention window." },
      { id: "pay", x: 500, y: 300, label: "Payments Service", sub: "charge logic", kind: "service", icon: "⚙️", desc: "Executes the charge exactly once per key." },
      { id: "net", x: 730, y: 300, label: "Card Networks", sub: "banks", kind: "external", icon: "🏦", desc: "External, slow, sometimes flaky." },
      { id: "ledger", x: 730, y: 90, label: "Ledger", sub: "double-entry, replicated", kind: "db", icon: "📒", desc: "Append-only record of all money movement." },
      { id: "wh", x: 920, y: 200, label: "Webhooks", sub: "at-least-once", kind: "queue", icon: "📮", desc: "Delivers events to merchants with retries until acknowledged." }
    ],
    flows: [
      { name: "Retry after timeout", steps: [["m", "edge", "POST /charges  Idempotency-Key: K1"], ["edge", "pay", "Token available → allowed"], ["pay", "idem", "K1 unseen → reserve it"], ["pay", "net", "Authorize $49.99"], ["pay", "ledger", "Record charge ch_1"], ["pay", "m", "200 OK… response lost in transit ✗"], ["m", "edge", "Retry after 0.8 s (backoff + jitter), same K1"], ["edge", "idem", "K1 seen → stored response"], ["idem", "m", "200 OK ch_1 (no second charge)"]] },
      { name: "Webhook delivery", steps: [["ledger", "wh", "Event: charge.succeeded evt_9"], ["wh", "m", "POST /webhook (attempt 1) → 500"], ["wh", "m", "Retry with backoff → 200 ✓"]] }
    ]
  },
  lab: { sim: "stripe", title: "Reliability Lab", hint: "Part 1: spam the API and watch the token bucket allow bursts, then return 429s. Part 2: make the network drop responses and compare retries with and without an idempotency key." },
  tradeoffs: [
    { choice: "Idempotency keys", pro: "Retries become safe by construction", con: "Server must store keys/results; clients must generate keys correctly" },
    { choice: "Token bucket", pro: "Allows bursts, bounds average rate", con: "Needs shared, fast state (e.g. Redis) across edge servers" },
    { choice: "Strong consistency for money", pro: "Correct balances", con: "Higher latency than eventual consistency" }
  ],
  takeaways: ["A timeout means \"unknown\", not \"failed\".", "Make mutating APIs idempotent so clients can retry freely.", "Add jitter to every retry policy."],
  quiz: [
    { q: "A charge request times out. What do you know?", o: ["It failed", "It succeeded", "Nothing: it may or may not have executed", "The card is invalid"], a: 2, why: "The request or just the response could have been lost. That's exactly why idempotency keys exist." },
    { q: "Same idempotency key, second request. The server should…", o: ["Charge again", "Return the stored result of the first request", "Return 404", "Delete the key"], a: 1, why: "Same key means same logical operation, so replay the original outcome." },
    { q: "Why add jitter to backoff?", o: ["To look random", "To prevent synchronized retry waves from many clients", "To make retries faster", "Required by HTTP"], a: 1, why: "Without jitter, clients that failed together retry together." },
    { q: "Token bucket capacity 10, refill 1/s. A client sends 15 requests instantly. Roughly what happens?", o: ["All 15 succeed", "10 succeed, 5 get 429", "All fail", "5 succeed"], a: 1, why: "The bucket allows a burst up to capacity; the rest must wait for refills." }
  ],
  sources: ["Stripe Engineering: Designing robust and predictable APIs with idempotency (2017)", "Stripe Engineering: Scaling your API with rate limiters (2017)", "Stripe 2024 annual letter ($1.4T TPV)"]
}
];

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
