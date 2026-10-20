/* Blueprint — HLD course, part 1: foundations, caching, databases.
 * Structure follows the Scaler HLD curriculum (2025 sheet). Explanations are written
 * fresh for this app from the lecture notes' topics, stories and numbers; anything
 * the notes don't cover is marked with an "extra" block.
 *
 * Block types: ["p",html] ["fig",name,caption] ["sim",name,caption] ["flow",diagram,caption]
 * ["analogy",html] ["tip",html] ["warn",html] ["extra",html] ["table",head,rows]
 * ["steps",[[title,body]...]] ["list",[...]] ["code",text] ["math",[[label,calc,result]...],note]
 */
window.BP = window.BP || {};
BP.MODULES = [
  { id: "found", name: "Foundations", icon: "🧱", desc: "From one laptop to a fleet of servers" },
  { id: "cache", name: "Caching", icon: "⚡", desc: "Make reads fast, keep them correct" },
  { id: "db", name: "Databases at scale", icon: "🗄️", desc: "Replication, sharding, consistency, internals" },
  { id: "cases", name: "Classic HLD case studies", icon: "🧪", desc: "Interview problems, end to end" },
  { id: "infra", name: "Infrastructure building blocks", icon: "🔧", desc: "Coordination, queues, IDs, limits" },
  { id: "micro", name: "Microservices", icon: "🧩", desc: "Splitting systems and keeping them consistent" }
];

BP.LESSONS = [];
const L = (o) => BP.LESSONS.push(o);

/* ───────────────────────── 1. System Design 101 ───────────────────────── */
L({
  id: "hld-101", mod: "found", icon: "💻", minutes: 25,
  title: "System Design 101: from one laptop to the internet",
  scaler: "HLD 1 · System Design and Computer Networks 101",
  summary: "Follow del.icio.us from a dorm-room laptop to a real web service, and meet DNS, scaling, load balancers and health checks along the way.",
  concepts: ["dns", "vertical-horizontal", "load-balancing", "health-checks"],
  related: ["bitly"],
  sections: [
    { h: "LLD vs HLD", blocks: [
      ["p", "<b>Low-level design</b> is about the inside of one component: classes, interfaces, design patterns. <b>High-level design</b> zooms out: which components should exist (servers, databases, caches, queues, CDNs), how they talk, and how the whole thing stays fast and reliable as it grows."],
      ["analogy", "LLD is designing the rooms inside a house. HLD is planning the city: roads, power, water, where the houses go."],
      ["p", "The course builds HLD the way real systems evolve: start with the simplest thing that works, find what breaks, add exactly one component to fix it, and repeat. Learn the <i>patterns</i>, because tools change but the reasoning lasts."]
    ]},
    { h: "The story: del.icio.us on a laptop", blocks: [
      ["p", "In 2003, bookmarks lived inside one browser on one computer. Switch machines and they were gone. Delicious put bookmarks on a server under your account. Functionally it's just two calls:"],
      ["code", "addBookmark(userId, siteUrl)\ngetAllBookmarks(userId)"],
      ["p", "Any developer can build that on a laptop with a local MySQL database. Then three real-world problems show up, one after another, and each one forces a new piece of architecture:"],
      ["steps", [["Nobody can reach my laptop", "People type a name, but the internet routes by IP address → <b>DNS</b>."], ["Every deploy takes the site down", "Restarting the only server means errors for everyone → <b>multiple servers + a load balancer</b>."], ["The disk fills up", "Data outgrows one machine → <b>sharding</b> (next lesson)."]]]
    ]},
    { h: "Problem 1: how does a name find a machine? (DNS)", blocks: [
      ["p", "You buy <code>del.icio.us</code> from a registrar (GoDaddy, Namecheap…). Many registrars sell names, so one authority, <b>ICANN</b>, keeps the master record of who owns what. You then add an <b>A record</b>: <i>name → IP address</i>."],
      ["p", "Should every browser ask ICANN directly? No: that would make one organization a <b>single point of failure</b> and a bottleneck for the entire internet. Instead the directory is <b>replicated</b> onto thousands of DNS servers worldwide, and browsers ask a nearby one. Answers are cached (in the browser, the OS, the resolver) for a <b>TTL</b>, so most lookups take about a millisecond."],
      ["fig", "dns", "Step through a full DNS resolution, then press “Visit again” to see why caching makes repeat lookups nearly free."],
      ["tip", "This is your first taste of a recurring trade-off. Replicated DNS is highly available, but a change takes up to the TTL (sometimes hours) to propagate. That's <b>eventual consistency</b>."],
      ["extra", "The real hierarchy has <b>recursive resolvers</b> (your ISP, 8.8.8.8, 1.1.1.1), <b>root servers</b>, <b>TLD servers</b> (.com, .io) and <b>authoritative servers</b> (your DNS provider), as shown in the figure. The notes keep this out of scope, but it's a common interview follow-up."]
    ]},
    { h: "Problem 2: one server isn't enough", blocks: [
      ["p", "With a single server, every deploy means restarting the app, and for that window users get <b>HTTP 502</b>. Growth makes it worse. The first instinct is <b>vertical scaling</b>: more CPU, RAM, disk. It works for a while, but there's a hardware ceiling, cost grows faster than capacity, and it's still one machine that can die. When a contest promises 10× traffic, vertical scaling is a dead end."],
      ["fig", "scaling", "Drag the traffic up in both modes. Then kill a server."],
      ["table", ["", "Vertical (scale up)", "Horizontal (scale out)"], [["Effort", "Easy: no code changes", "Needs a load balancer, stateless servers, data partitioning"], ["Ceiling", "Biggest machine money can buy", "Practically unlimited"], ["Cost curve", "Super-linear", "Roughly linear"], ["Failure", "Single point of failure", "Survives losing machines"], ["Deploys", "Downtime on restart", "Rolling deploys, zero downtime"]]]
    ]},
    { h: "The load balancer", blocks: [
      ["p", "With several machines, something must decide where each request goes and avoid machines that are dead or being deployed. Write that logic down and you have a load balancer:"],
      ["steps", [["For each host, one at a time", "Mark it inactive → deploy new code → restart → run sanity checks → mark it active."], ["Never route to an inactive host", "If a host stops responding, mark it inactive automatically."], ["Serve only from active hosts", "Users never notice the deploy. The notes call this a beautiful invisible dance."]]],
      ["flow", { nodes: [
        { id: "u", x: 90, y: 225, label: "Users", sub: "browsers & apps", kind: "client", icon: "👥", desc: "Every client talks to one public entry point." },
        { id: "dns", x: 270, y: 70, label: "DNS", sub: "name → LB IP", kind: "edge", icon: "📇", desc: "Resolves the domain to the load balancer, not to individual servers." },
        { id: "lb", x: 320, y: 225, label: "Load balancer", sub: "reverse proxy", kind: "edge", icon: "⚖️", desc: "Terminates TLS, health-checks hosts, routes each request." },
        { id: "a", x: 620, y: 90, label: "Server A", sub: "v1 → v2", kind: "service", icon: "🖥️", desc: "Taken out of rotation, upgraded, checked, put back." },
        { id: "b", x: 620, y: 225, label: "Server B", sub: "serving", kind: "service", icon: "🖥️", desc: "Keeps serving while A deploys." },
        { id: "c", x: 620, y: 360, label: "Server C", sub: "serving", kind: "service", icon: "🖥️", desc: "Keeps serving while A deploys." },
        { id: "db", x: 880, y: 225, label: "Database", sub: "shared", kind: "db", icon: "🗄️", desc: "Source of truth." }
      ], flows: [
        { name: "Normal request", steps: [["u", "dns", "Resolve del.icio.us → LB's IP"], ["u", "lb", "HTTPS request hits the single entry point"], ["lb", "b", "Round robin picks a healthy server"], ["b", "db", "Read the bookmarks"], ["b", "lb", "Response"], ["lb", "u", "Relayed back. The client never learns which server answered."]] },
        { name: "Rolling deploy", steps: [["lb", "a", "Detach A: stop sending it traffic"], ["a", "a", "Deploy v2, restart, sanity checks"], ["lb", "a", "Health check passes → re-attach A"], ["lb", "b", "Now detach B and repeat…"], ["lb", "c", "…then C. Zero downtime for users."]] }
      ]}, "A load balancer is the single entry point. Trace a normal request, then a rolling deploy."],
      ["list", ["<b>Deployments:</b> rolling deploys with no downtime.", "<b>Autoscaling:</b> all traffic passes through it, so it sees trends. Add hosts above an upper threshold, remove them below a lower one.", "<b>Availability:</b> health checks pull dead hosts out and add recovered ones back.", "<b>Security:</b> server IPs stay hidden, and a smart LB can drop malicious traffic.", "<b>Performance:</b> SSL/TLS termination and compression happen once, at the edge."]],
      ["p", "Technically a load balancer is a <b>reverse proxy</b>: it sits in front of servers and answers on their behalf. (A <i>forward</i> proxy sits in front of clients.) It's critical, so cloud providers scale and replicate the load balancer itself."]
    ]},
    { h: "Heartbeats and health checks", blocks: [
      ["p", "How does the LB know who's alive? There are two styles: servers send a <b>heartbeat</b> (\"I'm alive\"), or the LB sends a <b>health check</b> (\"are you alive?\"). The notes' example health check:"],
      ["table", ["Setting", "Example value", "Meaning"], [["Port / path / protocol", "8080 · / · HTTP", "What the LB pings"], ["Interval", "30 s", "How often"], ["Timeout", "5 s", "How long to wait for a reply"], ["Unhealthy threshold", "2", "Consecutive failures before marking DOWN"], ["Healthy threshold", "2", "Consecutive successes before re-adding"]]],
      ["p", "With these numbers, a dead host can still receive traffic for about 2 × 30 s + 5 s ≈ <b>65 s</b>. A shorter interval detects failures faster but adds load. A check on <code>/</code> can pass even when the database behind the app is broken, so good health endpoints check their dependencies."],
      ["fig", "lb", "Crash a server. Requests still go to it (and time out) until it fails 2 health checks in a row; revive it and it needs 2 passes to come back."]
    ]}
  ],
  quiz: [
    { q: "Why can't ICANN answer every DNS query directly?", o: ["It's too expensive", "It would be a single point of failure and a global bottleneck", "ICANN doesn't know IP addresses", "DNS must be encrypted"], a: 1, why: "Replicating the directory to many DNS servers spreads the load and survives failures. The price is propagation delay." },
    { q: "A contest will bring 10× traffic next week. Best move?", o: ["Buy the biggest single machine", "Add identical servers behind a load balancer", "Optimise code overnight and hope", "Turn off the database"], a: 1, why: "Horizontal scaling has no hard ceiling and survives failures. Vertical scaling hits a wall and stays a SPOF." },
    { q: "Interval 30 s, timeout 5 s, unhealthy threshold 2. Roughly how long until a dead host stops getting traffic?", o: ["5 s", "~35 s", "~65 s", "10 min"], a: 2, why: "Two failed checks 30 s apart plus the timeout ≈ 65 s. Tune these numbers to your tolerance." },
    { q: "Which record maps a domain to an IPv4 address?", o: ["MX", "A", "TXT", "NS"], a: 1, why: "An A record maps name → IPv4. AAAA is IPv6, CNAME is an alias to another name." }
  ],
  refs: [["AWS: What is DNS?", "https://aws.amazon.com/route53/what-is-dns/"], ["NGINX HTTP load balancing guide", "https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/"], ["AWS ALB health checks", "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html"], ["AWS: What is load balancing?", "https://aws.amazon.com/what-is/load-balancing/"]]
});

/* ───────────────────────── 2. Load balancing & consistent hashing ───────────────────────── */
L({
  id: "lb-ch", mod: "found", icon: "💍", minutes: 30,
  title: "Load balancing, sharding & consistent hashing",
  scaler: "HLD 2 · Load Balancing and Consistent Hashing",
  summary: "Routing algorithms, stateless servers, why data must be split, and the elegant ring that makes adding machines cheap.",
  concepts: ["load-balancing", "stateless", "sharding", "consistent-hashing"],
  related: ["discord"],
  sections: [
    { h: "Routing algorithms", blocks: [
      ["p", "Once you have a fleet, the LB needs a rule for choosing a server:"],
      ["table", ["Algorithm", "How it picks", "Good for", "Weakness"], [["Round robin", "1, 2, 3, 1, 2, 3…", "Identical servers, similar requests", "Ignores load and request cost"], ["Weighted round robin", "Bigger machines get more turns", "Mixed hardware", "Static weights"], ["Least connections", "Fewest in-flight requests", "Slow or uneven requests", "Needs live connection counts"], ["IP hash", "hash(client IP) % N", "Sticky sessions, local caches", "Changing N remaps almost everyone"]]],
      ["fig", "lb", "Switch algorithms. With IP hash, crash a server and watch how many clients get remapped once it leaves rotation."]
    ]},
    { h: "Stateless app servers", blocks: [
      ["p", "If a server keeps your session (login, cart) in its own memory, the next request landing on a different server finds nothing, and you look logged out. Two fixes: <b>sticky sessions</b> (IP hash or a cookie) or, better, make servers <b>stateless</b> and keep session data in a shared store such as Redis or the database."],
      ["p", "The notes push one step further. Running code and database on the same machine couples them: deploying code makes data unavailable, and both fight for CPU and RAM. Put them on separate tiers. The identical code-only machines (<b>app servers</b>) hold no data, so you can add or remove them freely. The only cost is one network hop to the data tier."],
      ["analogy", "Stateless servers are like bank tellers who look up your account on the central system. Any teller can serve you. A stateful server is a teller who keeps your file in their own drawer."]
    ]},
    { h: "Problem 3: the disk fills up", blocks: [
      ["math", [["New bookmarks / day", "given", "1 million"], ["Size per bookmark", "given", "~200 bytes"], ["Growth / day", "1M × 200 B", "200 MB"], ["Best disk in 2004", "given", "40 GB"], ["Time until full", "40 GB ÷ 200 MB/day", "≈ 200 days (~6 months)"]], "One machine can't hold the data for long. It has to be split across machines: that's <b>sharding</b>."],
      ["p", "<b>Step 1: choose the sharding key</b>, the field that decides which data stays together on one machine. Shard by <code>site_url</code> and one user's bookmarks scatter everywhere, so <code>getAllBookmarks(user)</code> must ask every shard. Shard by <code>user_id</code> and both API calls touch exactly one shard. Rule: <b>pick the key that keeps your most frequent queries on a single shard.</b>"],
      ["p", "<b>Step 2: map key → shard</b>, with four constraints: (1) the lookup must be extremely cheap, (2) load must be roughly even, (3) adding a shard must be easy, (4) removing a shard must be easy."]
    ]},
    { h: "Two mappings that fail", blocks: [
      ["p", "<b>Modulo</b> (<code>userId % N</code>) is cheap and even. But when N changes from 4 to 5, a key stays put only if <code>id % 4 == id % 5</code>, which is true for only about 1 in 5 keys. About <b>80% of all data moves</b>, causing massive downtime."],
      ["p", "<b>Ranges</b> (users 1–1M on shard A, the next million on B…) are skewed. Early users are usually the most active, their shards only keep growing, and a new shard only takes <i>new</i> users. It doesn't relieve the hot ones."]
    ]},
    { h: "Consistent hashing", blocks: [
      ["steps", [["Make a ring", "Picture integers from 0 to 10¹⁸ arranged in a circle."], ["Place machines", "Hash each machine id with H₁ and mark that point on the ring."], ["Place keys", "Hash each user id with H onto the same ring."], ["Walk clockwise", "A user belongs to the first machine clockwise from its hash (wrapping around)."], ["Look up in O(log N)", "Keep node positions in a sorted array and binary-search for the first value greater than hash(user)."]]],
      ["p", "Adding a machine only takes over the keys between it and its counter-clockwise neighbour. Everyone else stays put. That's ~1/N of the data instead of ~80%."],
      ["sim", "ring", "Add and remove nodes and compare ring vs hash % N. Then turn on virtual nodes."],
      ["warn", "<b>Cascading failure.</b> With one point per machine, if Node 2 dies all its keys fall to the next node clockwise, doubling its load. If that node falls over too, the next one triples… and dominoes fall."],
      ["p", "<b>Fix: virtual nodes.</b> Hash each machine with several functions so it appears at many points on the ring. When it dies, its many small arcs go to <i>different</i> successors and the load spreads evenly. It also smooths load in normal operation. Dynamo, Cassandra and Discord all use this idea."],
      ["extra", "Redis Cluster takes a related approach: a fixed set of <b>16,384 hash slots</b> (<code>CRC16(key) mod 16384</code>) with an explicit slot → node map. Moving whole slots gives controlled, incremental rebalancing."]
    ]}
  ],
  quiz: [
    { q: "Why not shard delicious by site_url?", o: ["URLs are too long", "getAllBookmarks(user) would have to query every shard", "URLs aren't unique", "It's slower to hash"], a: 1, why: "user_id keeps each user's data together, so both APIs hit one shard." },
    { q: "Going from 4 to 5 shards with userId % N, roughly what fraction of keys move?", o: ["~20%", "~50%", "~80%", "0%"], a: 2, why: "A key stays only when id%4 == id%5, about 1 in 5. So ~80% move." },
    { q: "What do virtual nodes fix?", o: ["Hash collisions", "Load dumping onto one neighbour when a node dies (and uneven arcs)", "DNS caching", "Slow binary search"], a: 1, why: "Many points per machine spread a failed node's keys over many survivors." },
    { q: "How fast is finding a key's node on the ring?", o: ["O(1)", "O(log N) with binary search over sorted node positions", "O(N)", "O(N²)"], a: 1, why: "Sorted array of node hashes, then binary-search the first one greater than hash(key)." }
  ],
  refs: [["ByteByteGo: Consistent hashing guide", "https://bytebytego.com/guides/consistent-hashing/"], ["ByteByteGo video: Consistent Hashing", "https://www.youtube.com/watch?v=UF9Iqmg94tk"], ["Wikipedia: Consistent hashing", "https://en.wikipedia.org/wiki/Consistent_hashing"], ["Amazon's Dynamo (Werner Vogels)", "https://www.allthingsdistributed.com/2007/10/amazons_dynamo.html"]]
});

/* ───────────────────────── 3. Caching ───────────────────────── */
L({
  id: "caching", mod: "cache", icon: "⚡", minutes: 35,
  title: "Caching: CDNs, local & global caches, invalidation, eviction",
  scaler: "HLD 3 · Caching: CDN + Backend Caches, Cache Invalidation",
  summary: "Where data can be cached, how to keep it fresh, what to throw away when it's full, and how write strategies change consistency and durability.",
  concepts: ["memory-hierarchy", "caching", "cdn", "ttl", "write-policies", "eviction"],
  related: ["bitly", "netflix"],
  sections: [
    { h: "Why caching works: the memory hierarchy", blocks: [
      ["p", "Caching means keeping a copy of data somewhere faster or closer than where it really lives. Every storage level trades size and cost for speed, often by 100× per step."],
      ["fig", "memory", "Click tiers to “fetch” from them. Toggle humanize: if an L1 hit took 1 second, a disk seek would take months."],
      ["p", "The notes' real-world anchors: reading a file from the app server's own disk takes <b>~40 ms</b>, a query to the MySQL machine <b>~50 ms</b>, and fetching a big file from remote file storage <b>~2 s</b>. Those three numbers drive the code-judge case study in the next lesson."]
    ]},
    { h: "Where can we cache?", blocks: [
      ["fig", "cachepath", "Pick a scenario and send a request. It stops at the first layer that has the data."],
      ["table", ["Layer", "What lives there", "Example"], [["Browser", "DNS results, static assets (JS, CSS, images)", "Why a site's second visit is faster"], ["CDN", "Static & media files, copied to every region", "Akamai, Cloudflare, CloudFront, Fastly"], ["Local (app server)", "In-memory or local-disk copies on that server", "Code-judge test files"], ["Global (shared)", "Hot or derived data shared by all app servers", "Redis, Memcached"], ["Distributed", "A cluster of global caches with no SPOF", "Redis Cluster"]]],
      ["p", "<b>CDN:</b> delicious's servers are in the US and you're in India. The small HTML can come from the origin, but images and video come back as <b>links to the nearest CDN region</b>. Your request reaches the nearest edge through ISP integration or <b>Anycast</b> (one IP announced from many places; routing picks the closest)."],
      ["p", "<b>Local vs global:</b> local caches are the fastest (no network), but each server only holds part of the data, updates don't propagate between them, and they eat app-server memory. A global cache is shared and scales separately, at the cost of one network hop. Use a global cache for data that is <b>queried very often</b> or <b>expensive to derive</b>."]
    ]},
    { h: "The two problems every cache has", blocks: [
      ["p", "A cache is (1) <b>limited in size</b> and (2) <b>not the source of truth</b>. Those two facts create the two problems you'll keep solving: <b>staleness</b> (the DB changed, the cache didn't) and <b>fullness</b> (what do we drop to make room?)."]
    ]},
    { h: "Invalidation with TTL", blocks: [
      ["p", "Give each entry a <b>time to live</b>. Cache X at time T with TTL 60 s: requests until T+60 are hits, and at T+61 the entry is gone and the next request refetches."],
      ["table", ["TTL", "What happens", "Problem"], [["Too low (1 min)", "Entries expire constantly", "High miss rate: many slow trips to the source"], ["Too high (60 min)", "Entries live a long time", "Stale data: an edited file isn't seen for up to an hour"]]],
      ["tip", "TTL is simple and often good enough, but it's a guess. When changes must show up <i>immediately</i>, look for exact invalidation instead (versioned keys, next lesson)."]
    ]},
    { h: "Keeping cache and DB in sync: write policies", blocks: [
      ["fig", "writepolicy", "Write, read, and crash the cache under each policy. Watch latency and what's at risk."],
      ["table", ["Policy", "Write path", "Write latency", "Risk", "Fits"], [["Write-through", "cache → DB, ack after both", "Higher", "Slower writes", "Read-heavy data that must be fresh"], ["Write-back", "cache now, DB later (async)", "Lowest", "Data loss if the cache dies before flushing", "Analytics, counters: losing a few events is OK"], ["Write-around", "DB only; cache invalidated / TTL", "DB speed", "Next read misses or is stale", "Data written often but rarely read"]]]
    ]},
    { h: "Eviction: what to throw out when full", blocks: [
      ["p", "Choose the victim that is <b>least likely to be needed next</b>. The notes cover FIFO, LRU, LIFO and MRU (MRU is surprisingly good for sequential scans, where the item you just read won't be read again)."],
      ["fig", "eviction", "Same accesses, three policies side by side. Play the sample sequence and compare hit counts."],
      ["extra", "Exact LRU is a <b>hashmap + doubly linked list</b>, O(1) per operation: move to the head on access, evict from the tail. Redis approximates LRU and LFU by sampling a few keys (<code>maxmemory-samples</code>) to save memory."]
    ]}
  ],
  quiz: [
    { q: "An analytics click counter at huge QPS, where losing a few events is fine. Which write policy?", o: ["Write-through", "Write-back", "Write-around", "No cache"], a: 1, why: "Write-back gives the lowest latency and highest throughput, and losing a few data points doesn't change trends." },
    { q: "Why does write-around rely on TTL (or invalidation)?", o: ["It's faster", "Writes skip the cache, so something must eventually remove the stale copy", "Redis requires it", "To save memory"], a: 1, why: "The cache isn't updated on writes. Expiry or explicit invalidation brings in fresh data." },
    { q: "Profile pictures for users worldwide. Where's the best cache?", o: ["App server memory", "A CDN", "The database buffer pool", "The browser only"], a: 1, why: "Static media served from edges near users, and the origin barely sees the traffic." },
    { q: "Sequence A B C D A B E A B C D E with capacity 4: which policy keeps the hot key A best?", o: ["FIFO", "LRU or LFU", "Random", "None"], a: 1, why: "FIFO evicts by insertion age even if A was just used. LRU and LFU account for usage." }
  ],
  refs: [["ByteByteGo: A guide to top caching strategies", "https://blog.bytebytego.com/p/a-guide-to-top-caching-strategies"], ["AWS caching best practices", "https://aws.amazon.com/caching/best-practices/"], ["MDN: HTTP caching", "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching"], ["AWS: What is a CDN?", "https://aws.amazon.com/what-is/cdn/"], ["Latency numbers every programmer should know", "https://gist.github.com/jboner/2841832"]]
});

/* ───────────────────────── 4. Caching case studies: Scaler + Redis ───────────────────────── */
L({
  id: "cache-scaler", mod: "cache", icon: "🏁", minutes: 30,
  title: "Case study: caching Scaler's code judge & contest leaderboard (Redis)",
  scaler: "HLD 4 · Caching Case Studies: Scaler Code Judge & Leaderboard",
  summary: "Two real caching decisions with opposite answers (local vs global), plus a practical tour of Redis: commands, eviction policies and cluster mode.",
  concepts: ["caching", "ttl", "redis", "eviction"],
  related: [],
  sections: [
    { h: "Problem: test files are big and can change", blocks: [
      ["p", "A submission travels browser → LB → one of many app servers with <code>user_id, problem_id, code, language</code>. To judge it, the server needs that problem's input and expected-output files. They're large: <b>~2 s</b> to fetch from file storage (S3). And when an admin edits a test file, the change must take effect <b>immediately</b>."],
      ["table", ["Option", "Verdict", "Why"], [["TTL on a local cache", "❌", "Low TTL means constant 2 s misses. High TTL means submissions judged against old tests."], ["One global cache machine", "❌", "In RAM: huge files cause constant eviction. On disk: every submission still drags a big file across the network."], ["Local disk cache + versioned filenames", "✅", "Exact invalidation for the price of one tiny DB read we already make."]]]
    ]},
    { h: "The versioned-filename trick", blocks: [
      ["steps", [["Store metadata in MySQL", "<code>problems_test_data</code> has file paths plus <code>input_file_updated_at</code> (and the same for output). Editing a file bumps that timestamp."], ["Cache with the version in the name", "Each judge server saves files locally as <code>&lt;problem_id&gt;_&lt;updated_at&gt;_input.txt</code>."], ["On each submission", "Read path + updated_at from MySQL (~50 ms). If that exact filename exists locally, it is <b>guaranteed current</b>: read it from disk (~40 ms). Otherwise fetch from S3 (~2 s) and save it under the versioned name."], ["Piggyback the lookup", "The submission already queries MySQL (solved before? scores?). Fetch the file metadata in the same round trip, so validating the cache costs ~nothing."]]],
      ["fig", "codejudge", "Submit a few solutions, then edit the test file and submit again."],
      ["tip", "Putting the version in the key makes stale reads <b>impossible</b>: no push to N servers, no TTL guessing. Old files are never read again and fall out through normal disk eviction. The same pattern appears as cache-busting asset URLs like <code>app.3f9a1c.js</code>."]
    ]},
    { h: "Problem: the contest ranklist", blocks: [
      ["p", "During a contest, thousands of users refresh the ranklist while scores change constantly. Sorting everyone on every request hammers the database. Solution: <b>recompute the ranklist periodically</b> (say once a minute), store the snapshot in a cache, and serve every view from it, trading up to a minute of staleness for a huge drop in DB load."],
      ["p", "<b>Local or global?</b> With local caches, every app server misses once a minute and recomputes, so DB load grows with the fleet. With <b>one global cache (Redis)</b> there's one miss per minute in total. Here global wins, the opposite of the test-file case."],
      ["table", ["", "Test files", "Ranklist"], [["Size", "Large", "Small"], ["Cost to validate", "Cheap (timestamp)", "-"], ["Cost to compute", "Cheap (copy)", "Expensive (sort everyone)"], ["Shared?", "Read independently per server", "Same result for everyone"], ["Winner", "Local disk cache", "Global cache"]]],
      ["fig", "leaderboard", "A Redis sorted set keeps the leaderboard ordered on every update, an even better fit."]
    ]},
    { h: "Redis in practice", blocks: [
      ["p", "Redis is an <b>in-memory key-value store</b> used as a cache, database or message broker. Commands execute on a single thread, which keeps it simple and atomic. Values can be strings, lists, sets, sorted sets, hashes and bitmaps, and it can persist to disk (AOF/RDB) if you need it to survive restarts."],
      ["code", "SET user:1 \"Tantia Tope\"     → OK\nGET user:1                    → \"Tantia Tope\"\nEXISTS user:1                 → 1\nINCR counter                  → 1     (atomic)\nDEL user:1                    → 1\nCONFIG SET maxmemory 1mb      → OK"],
      ["tip", "Key naming: use <code>object-type:id[:field]</code>, like <code>user:1000:followers</code>. Not cryptic (<code>u1000flw</code>), not huge (hash a 1 KB value with SHA-1 if it must be a key). The maximum key size is 512 MB, but never get close."]
    ]},
    { h: "Redis eviction policies", blocks: [
      ["p", "The default is <code>noeviction</code>: when memory is full, writes return errors. With no <code>maxmemory</code> set, Redis can grow until the OS kills it, and then apps see <i>connection refused</i>. For a cache, set a limit and an eviction policy."],
      ["table", ["Policy", "Evicts", "Use when"], [["noeviction", "nothing (writes error)", "Redis used as a primary store"], ["allkeys-lru", "least recently used, any key", "Good default: a few keys are hot"], ["allkeys-lfu", "least frequently used", "Stable popularity"], ["allkeys-random", "random key", "Uniform access"], ["volatile-lru / -lfu / -random", "same, but only keys with a TTL", "Mixing cache keys and persistent keys"], ["volatile-ttl", "the key closest to expiry", "You mark disposable keys with short TTLs"]]],
      ["p", "The notes' demo: set <code>allkeys-lru</code> and <code>maxmemory 1mb</code>, write keys 0–4,999, <b>read</b> keys 0–999, then flood keys 5,000–9,999. Keys 0–999 survive (recently used), keys 1,000–4,999 are evicted heavily, and newer keys survive in creation order."]
    ]},
    { h: "Redis Cluster", blocks: [
      ["p", "A single Redis is a SPOF and limited to one machine's RAM. <b>Redis Cluster</b> shards keys across masters, each with replicas:"],
      ["list", ["<b>16,384 hash slots.</b> <code>slot = CRC16(key) mod 16384</code>. Each master owns a range, roughly 0–5460 / 5461–10922 / 10923–16383 with 3 masters.", "<b>Resharding moves whole slots</b>, so only those keys migrate.", "<b>Hash tags</b> like <code>{user42}:cart</code> force related keys into one slot, so multi-key commands work.", "<b>Two ports per node:</b> client (6379) and cluster bus (16379) for gossip and failure detection.", "<b>Failover:</b> when a master dies, its replica is promoted. The minimum is 3 masters (typically 3 masters + 3 replicas).", "<b>Redirects:</b> ask the wrong node and it replies <code>MOVED 12182 172.19.0.2:6379</code>. Smart clients cache the slot map."]]
    ]}
  ],
  quiz: [
    { q: "Why not a short TTL for test-case files?", o: ["Redis doesn't support TTL", "Too many ~2 s misses (and a long TTL serves stale tests)", "Files are too small", "TTL needs a CDN"], a: 1, why: "TTL forces a trade-off between misses and staleness. Versioned filenames avoid both." },
    { q: "For the contest ranklist, why is a global cache better than local caches?", o: ["It's cheaper RAM", "One recompute per minute total, instead of one per app server", "Local caches can't store lists", "Global caches never go stale"], a: 1, why: "Shared derived data that's expensive to compute should be computed once and shared." },
    { q: "Redis's default eviction policy?", o: ["allkeys-lru", "volatile-ttl", "noeviction", "allkeys-random"], a: 2, why: "noeviction returns errors on writes when memory is full. Set a policy for cache use." },
    { q: "How many hash slots does Redis Cluster use?", o: ["1,024", "16,384", "65,536", "Unlimited"], a: 1, why: "CRC16(key) mod 16384, with slots assigned to masters." }
  ],
  refs: [["Redis: key eviction", "https://redis.io/docs/latest/develop/reference/eviction/"], ["Redis: scale with Redis Cluster", "https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/"], ["Redis Cluster specification", "https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/"], ["MDN: cache busting with versioned URLs", "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching"]]
});

/* ───────────────────────── 5. Facebook news feed ───────────────────────── */
L({
  id: "fb-feed", mod: "cache", icon: "📰", minutes: 25,
  title: "Case study: caching the Facebook news feed",
  scaler: "HLD 5 · Caching Case Studies: Facebook News Feed",
  summary: "After sharding by user, the feed becomes a scatter-gather nightmare. Back-of-the-envelope math reveals a surprisingly small derived store that fixes it.",
  concepts: ["sharding", "fanout", "caching", "replication"],
  related: ["instagram"],
  sections: [
    { h: "Setup", blocks: [
      ["p", "Version-0 Facebook has <code>Users</code>, <code>User_friends</code> and <code>Posts</code>: no likes, pages or groups. There are two views: the <b>profile page</b> (my info and my posts) and the <b>news feed</b> (my friends' recent posts)."],
      ["code", "-- feed, if everything fit on one machine\nSELECT p.* FROM User_friends f JOIN Posts p\n  ON f.user_id = :me AND p.user_id = f.friend_id\n WHERE p.created_at > NOW() - INTERVAL 30 DAY\n ORDER BY p.created_at DESC LIMIT 20 OFFSET :page"]
    ]},
    { h: "Sharding breaks the feed", blocks: [
      ["p", "Data is sharded by <code>user_id</code>: my attributes, friend list and posts live on my shard. The profile page is easy (one shard). But the feed needs <i>my friends'</i> posts, which live on <i>their</i> shards. Building one feed is a fan-out read across hundreds of shards, and you wait for the slowest one."],
      ["p", "<b>Idea: precompute each user's feed and cache it.</b> The notes reject this for v0: (1) storage blows up, since every post is copied into every friend's feed; (2) <b>fan-out on write</b>: a post by someone with 1,000+ friends triggers 1,000+ writes; (3) the ranking algorithm is baked into stored feeds and hard to change."],
      ["tip", "Instagram-scale systems do use precomputed feeds (a hybrid push/pull design). Compare in the <a href=\"#/case/instagram\">Instagram case study</a>. Both are valid: it depends on the numbers."]
    ]},
    { h: "Do the math", blocks: [
      ["math", [["Monthly / daily active users", "assumption", "1 B / 500 M"], ["Who posts (80-20-1 rule: ~1% post)", "1% × 500M", "5 M people"], ["Posts per day", "5M × ~4 (overestimate)", "20 M"], ["Size of a post (no media)", "ids 8+8+8 B, media path ~24 B, text ~250 B", "≈ 300 bytes"], ["New post data / day", "20M × 300 B", "6 GB"], ["Feed only needs the last 30 days", "6 GB × 30", "180 GB"]], "180 GB holds <b>every recent post by everyone</b>. That's small enough to keep in one separate store and replicate many times."]
    ]},
    { h: "The design: a replicated “recent posts” store", blocks: [
      ["flow", { nodes: [
        { id: "u", x: 90, y: 225, label: "User X", sub: "opens feed", kind: "client", icon: "📱", desc: "Wants friends' posts from the last 30 days." },
        { id: "api", x: 300, y: 225, label: "Feed service", sub: "app servers", kind: "service", icon: "⚙️", desc: "Two-step query." },
        { id: "shard", x: 560, y: 80, label: "X's user shard", sub: "friend list", kind: "db", icon: "🗄️", desc: "Sharded by user_id. Holds X's friend list." },
        { id: "r1", x: 560, y: 225, label: "Recent posts #1", sub: "180 GB replica", kind: "cache", icon: "⚡", desc: "All posts from the last 30 days, from everyone. Derived data." },
        { id: "r2", x: 820, y: 225, label: "Recent posts #2", sub: "replica", kind: "cache", icon: "⚡", desc: "More replicas = more read capacity." },
        { id: "w", x: 560, y: 370, label: "Post writes", sub: "user shards", kind: "db", icon: "✍️", desc: "New posts are written to the author's shard and appended to the recent-posts store." },
        { id: "cron", x: 820, y: 370, label: "Daily cleanup job", sub: "delete > 30 days", kind: "queue", icon: "🧹", desc: "Keeps the derived store bounded." }
      ], flows: [
        { name: "Read the feed", steps: [["u", "api", "GET /feed"], ["api", "shard", "1) SELECT friend_ids for X (one shard)"], ["api", "r1", "2) SELECT * FROM recent_posts WHERE user_id IN (friends) … LIMIT 20"], ["api", "u", "Ranked page of posts, with no cross-shard fan-out"]] },
        { name: "Write a post", steps: [["u", "api", "POST /posts"], ["api", "w", "Persist on the author's shard"], ["api", "r1", "Append to the recent-posts store"], ["r1", "r2", "Replicate"], ["cron", "r1", "Nightly: delete posts older than 30 days"]] }
      ]}, "Two cheap queries instead of a fan-out across hundreds of shards."],
      ["p", "This \"cache\" lives on <b>disk</b>, not RAM, and it's still far faster than gathering from many shards. It also needs far less storage than per-user feeds, and the ranking can change freely because it runs at read time."],
      ["analogy", "Instead of visiting every friend's house to read their diary, you read one community notice board that holds just this month's posts, and there are copies of that board on every street."],
      ["sim", "fanout", "For contrast: the push / pull / hybrid fan-out trade-off at Instagram scale."]
    ]}
  ],
  quiz: [
    { q: "After sharding by user_id, why is the profile cheap but the feed expensive?", o: ["Profiles are cached", "The profile lives on one shard; the feed needs posts from many friends' shards", "Feeds use SQL joins", "Profiles are smaller"], a: 1, why: "Co-located data is cheap. Scatter-gather across shards is slow and fragile." },
    { q: "Roughly how big is 30 days of all posts (no media)?", o: ["~180 MB", "~180 GB", "~180 TB", "~18 PB"], a: 1, why: "20M posts/day × 300 B = 6 GB/day, × 30 = 180 GB." },
    { q: "Why did the notes reject precomputing every user's feed?", o: ["It's illegal", "Storage blow-up, 1000+ writes per post, algorithm lock-in", "Feeds can't be cached", "Redis is too slow"], a: 1, why: "Push fan-out has real costs. At other scales the trade-off can flip (see Instagram)." }
  ],
  refs: [["Meta: Scaling Memcache at Facebook", "https://engineering.fb.com/2013/03/04/core-infra/scaling-memcache-at-facebook/"], ["ByteByteGo: Design a news feed system", "https://bytebytego.com/courses/system-design-interview/design-a-news-feed-system"]]
});

/* ───────────────────────── 6. CAP / PACELC / master-slave ───────────────────────── */
L({
  id: "cap", mod: "db", icon: "⚖️", minutes: 35,
  title: "CAP, PACELC & master-slave replication",
  scaler: "HLD 6 · CAP / PACELC theorem + Master Slave Replication",
  summary: "Why a distributed system must choose between consistency and availability during a partition, the latency trade-off the rest of the time, and how leader-follower replication actually works.",
  concepts: ["cap", "pacelc", "replication", "consistency-models"],
  related: ["whatsapp", "ticketmaster"],
  sections: [
    { h: "CAP, told as a story", blocks: [
      ["p", "<b>Rohit</b> starts a reminder service. Call <b>123456</b>, tell him a reminder, call back later to hear it. He writes everything in a diary. Business booms, so he hires <b>Raj</b>, who keeps his own diary."],
      ["steps", [["Problem 1: inconsistency", "X asks Raj to note his flight. Later X's call lands with Rohit: \"you have no flight.\" X misses the plane. Two copies of the data disagree."], ["Fix 1", "On every write, <i>both</i> Rohit and Raj write it down before saying \"done\"."], ["Problem 2: availability", "Raj is absent one day. Under fix 1, no write can ever succeed."], ["Fix 2", "Accept writes anyway. When Raj returns, he catches up on everything he missed <i>before</i> taking calls."], ["Problem 3: partition", "Rohit and Raj have a fight and stop talking. X calls Raj with a new reminder. Raj can either write it (and risk Rohit giving X a wrong answer) or refuse (and be unavailable)."]]],
      ["p", "That's the <b>CAP theorem</b>. With data on more than one machine, when the network between them breaks (<b>P</b>artition), you must choose <b>C</b>onsistency (every read sees the latest write, or you return an error) or <b>A</b>vailability (every request gets an answer, possibly stale). Partitions are a fact of life in distributed systems, so \"CA\" only exists on a single machine."],
      ["fig", "cap", "Cut the network, then write and read in CP mode and AP mode. Heal the partition to watch reconciliation."]
    ]},
    { h: "Choosing C or A", blocks: [
      ["table", ["System", "Priority", "Why"], [["Banking balance", "Consistency", "Wrong balances are unacceptable (though ATM networks really use eventual consistency with reconciliation)"], ["Facebook news feed", "Availability", "A slightly stale feed is fine; an error page isn't"], ["Quora", "Availability", "Same: show something"], ["Messenger", "Consistency", "A message the sender thinks was delivered but wasn't hurts relationships"], ["Ticket / seat booking", "Consistency", "Never sell a seat twice"]]],
      ["extra", "Martin Kleppmann argues that labelling whole databases \"CP\" or \"AP\" is too crude: real systems choose per operation and per configuration. Google Spanner is technically CP, but its private network makes partitions so rare that it feels CA in practice."]
    ]},
    { h: "PACELC: the trade-off even when nothing is broken", blocks: [
      ["p", "CAP only describes partitions. <b>PACELC</b> adds the normal case: <b>if P</b>artition → choose <b>A</b> or <b>C</b>; <b>E</b>lse → choose <b>L</b>atency or <b>C</b>onsistency. Keeping replicas perfectly in sync means waiting for them to acknowledge every write, which is slower. Replying before they confirm is faster, but leaves a window of staleness."],
      ["p", "In the CAP figure above, switch the PACELC toggle between <i>sync</i> and <i>async</i> replication and compare write latency."]
    ]},
    { h: "Master-slave (leader-follower) replication", blocks: [
      ["p", "One machine is the <b>master</b>: all writes go there. The others are <b>slaves</b> (replicas): they apply the master's changes <i>in the same order</i> and serve reads. If the master dies, a slave is elected as the new master."],
      ["table", ["Variant (from the notes)", "When the client hears “success”", "Example"], [["Highly available, not eventually consistent", "Master wrote it; slaves synced best-effort", "Splunk-style logs: losing a few lines is OK"], ["Highly available + eventually consistent", "Master + at least one slave wrote it", "Posts for a news feed: may be delayed, must not be lost"], ["Highly consistent", "Master + all slaves wrote it", "Banking"]]],
      ["fig", "replication", "Write under async, semi-sync and sync replication. Read from a lagging slave. Then kill the master."],
      ["warn", "<b>Drawbacks.</b> A single master is a write bottleneck. In fully synchronous mode every extra slave adds latency and another thing that can block writes. With 1,000 slaves the scheme collapses: shard instead."],
      ["tip", "A common middle ground is to make <b>one</b> slave synchronous and the rest async (MySQL calls this semi-synchronous). That guarantees two up-to-date copies without letting any slow replica stall every write."]
    ]},
    { h: "How MySQL replicates (the TunTun Ladoo story)", blocks: [
      ["p", "<b>TunTun Ladoo</b>, an online sweet shop, went down for ~1 hour during last year's Diwali sale. The postmortem found expensive <i>read-only</i> joins (stock, pricing, live analytics) overloading the single MySQL box. The plan: replicate to read replicas, keep a standby for failover, and stream changes to an analytics warehouse."],
      ["flow", { nodes: [
        { id: "app", x: 90, y: 225, label: "App", sub: "writes", kind: "client", icon: "⚙️", desc: "All writes go to the master." },
        { id: "m", x: 320, y: 225, label: "Master", sub: "commits txn", kind: "service", icon: "👑", desc: "Before committing, writes every change to its binary log, in order." },
        { id: "bin", x: 320, y: 70, label: "Binlog", sub: "1.000003 @ pos 851", kind: "queue", icon: "📜", desc: "Ordered stream of changes. Replicas track a file + position (or a GTID)." },
        { id: "io", x: 580, y: 70, label: "Replica IO thread", sub: "TCP to master", kind: "service", icon: "🧵", desc: "Pulls binlog events and writes them to the local relay log." },
        { id: "relay", x: 820, y: 70, label: "Relay log", sub: "on replica", kind: "queue", icon: "📼", desc: "Local copy of events waiting to be applied." },
        { id: "sql", x: 820, y: 225, label: "Replica SQL thread", sub: "replays in order", kind: "service", icon: "⚙️", desc: "Applies events one by one. Parallel master transactions become a single line here, a source of lag." },
        { id: "r", x: 580, y: 360, label: "Read replica", sub: "serves reads", kind: "db", icon: "📖", desc: "Serves the expensive read-only queries." }
      ], flows: [
        { name: "Replicate one write", steps: [["app", "m", "INSERT customer 'Joydeep'"], ["m", "bin", "Append the change to the binlog, then commit"], ["bin", "io", "Binlog dump streams the event"], ["io", "relay", "Write it to the relay log"], ["relay", "sql", "SQL thread picks it up"], ["sql", "r", "Row appears on the replica, a moment later (async lag)"]] }
      ]}, "MySQL's asynchronous replication pipeline."],
      ["table", ["Format", "Logs", "Good", "Bad"], [["Statement-based", "the SQL text", "Tiny binlog for big UPDATEs", "NOW(), RAND(), UUID() give different results on replicas"], ["Row-based", "actual row changes", "Always correct; tiny for INSERT … SELECT SUM()", "Huge for UPDATE big_table SET x=0"], ["MIXED", "switches automatically", "Best of both", "More complex to reason about"]]],
      ["p", "Adding a new replica later: take a consistent snapshot tied to an exact binlog position, restore it on the new machine, then ask the master for everything after that position. The replica catches up."]
    ]}
  ],
  quiz: [
    { q: "Rohit and Raj aren't talking. X calls Raj with a reminder. Which response makes the system AP?", o: ["Raj refuses", "Raj writes it and says success", "Raj hangs up", "Raj waits for Rohit"], a: 1, why: "Available: always answer. The diaries diverge and reconcile later." },
    { q: "There's no partition. Is there still a trade-off?", o: ["No", "Yes: latency vs consistency (PACELC)", "Yes: cost vs security", "Only for SQL"], a: 1, why: "Waiting for replicas costs latency. Not waiting costs consistency." },
    { q: "Async replication: a write is acknowledged and the master dies 5 ms later. Is the write safe?", o: ["Yes, always", "No, it may exist only on the dead master", "Only on SSDs", "Only with row-based logs"], a: 1, why: "Async acks before replicas have the data. Failover can lose recent writes." },
    { q: "Why make just one slave synchronous?", o: ["MySQL limit", "Guarantees two up-to-date copies without letting every slow replica block writes", "It's faster than async", "To save disk"], a: 1, why: "Semi-sync balances durability and availability." }
  ],
  refs: [["Kleppmann: Please stop calling databases CP or AP", "https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html"], ["ByteByteGo: CAP, PACELC, ACID, BASE", "https://blog.bytebytego.com/p/cap-pacelc-acid-base-essential-concepts"], ["ByteByteGo video: CAP theorem simplified", "https://www.youtube.com/watch?v=BHqjEjzAicA"], ["MySQL: replication implementation", "https://dev.mysql.com/doc/refman/8.0/en/replication-implementation.html"], ["MySQL: replication formats", "https://dev.mysql.com/doc/refman/8.0/en/replication-formats.html"], ["AWS RDS Multi-AZ", "https://aws.amazon.com/rds/features/multi-az/"]]
});

/* ───────────────────────── 7. SQL vs NoSQL + sharding keys ───────────────────────── */
L({
  id: "sql-nosql", mod: "db", icon: "🧮", minutes: 35,
  title: "SQL vs NoSQL, ACID, and choosing a sharding key",
  scaler: "HLD 7 · SQL vs NoSQL + Sharding",
  summary: "What relational databases give you, why sharding takes much of it away, how to pick a sharding key (five worked quizzes), and which NoSQL family fits which job.",
  concepts: ["acid", "sharding", "nosql-types", "denormalization"],
  related: ["uber", "ticketmaster", "discord"],
  sections: [
    { h: "What SQL gives you", blocks: [
      ["p", "<b>Normalization:</b> store each fact once. If a score lives in two tables and one update misses a table, you no longer know which to trust."],
      ["p", "<b>ACID transactions:</b> <b>A</b>tomicity (all or nothing), <b>C</b>onsistency (rules like \"balance ≥ 0\" hold before and after), <b>I</b>solation (concurrent transactions don't see each other's half-done work), <b>D</b>urability (committed data survives crashes)."],
      ["steps", [["The withdrawal race", "Balance = ₹1,500. Two ₹1,000 withdrawals arrive at once."], ["Request A checks", "1500 ≥ 1000 ✓"], ["Request B runs fully", "check ✓, balance → ₹500, cash dispensed"], ["Request A continues", "balance = 500 − 1000 = <b>−₹500</b> 💸"], ["With a transaction", "Check and subtract happen atomically and in isolation. B waits or sees the new balance and is rejected."]]],
      ["p", "<b>Defined schema:</b> fixed columns and types, which is great for integrity."],
      ["warn", "<b>ACID consistency ≠ CAP consistency.</b> ACID's C means \"invariants hold\". CAP's C means \"replicas agree on the latest value\". A NoSQL store can give one without the other."]
    ]},
    { h: "Where SQL struggles", blocks: [
      ["list", ["<b>Rigid schema:</b> a t-shirt has collar and size, a laptop has RAM and screen size. With ~100,000 product types, a table per type is impossible and one string column can't be filtered.", "<b>Sharding removes SQL's superpowers:</b> JOINs and transactions across machines are slow and hard. Once data is split, you want each query's data on one machine anyway."]],
      ["tip", "The notes' advice: <b>start with SQL</b>. It's enough for most companies (Scaler runs on MySQL). Reach for NoSQL when scale forces you to. Facebook famously runs heavily, manually sharded MySQL."]
    ]},
    { h: "Choosing a sharding key", blocks: [
      ["list", ["<b>Spread load evenly</b> (no hot shard).", "<b>Keep the most frequent operations on one shard</b> (avoid fan-out).", "<b>Touch the minimum number of shards on writes</b> (helps consistency).", "<b>Minimize redundancy.</b>"]],
      ["fig", "shardkey", "Five scenarios from the notes. Pick a candidate key and see the distribution and fan-out."],
      ["p", "When the key doesn't co-locate what a query needs, the query must ask every shard and merge results, a <b>fan-out</b>. It's slow, costly, and multiplies failure points."]
    ]},
    { h: "Denormalization", blocks: [
      ["p", "Step 2 of sharding: deliberately <b>duplicate</b> data so each frequent read hits one shard. In a messenger sharded by user, a message from U1 to U2 is stored in U1's mailbox (sent) <i>and</i> U2's mailbox (received). Reads are fast, but every logical change now means multiple writes that must stay in sync."]
    ]},
    { h: "NoSQL families", blocks: [
      ["fig", "datamodels", "The same user-and-orders data in five different models."],
      ["table", ["Need", "Pick", "Why"], [["Live cricket score per match", "Key-value", "Just read and overwrite one value"], ["Cab's current location only", "Key-value", "Overwrite cab → (lat, lng)"], ["Cab location <i>history</i>", "Wide-column", "Row = cab, append timestamped entries, read the latest N"], ["Latest tweets per hashtag, paged", "Wide-column", "KV would fetch all 10,000 tweets to show 10. Wide-column reads the first X, then offsets."], ["Products with wildly different attributes", "Document", "Flexible JSON per product, queryable by any field"], ["Friends-of-friends, recommendations", "Graph", "Traversals instead of JOIN chains"]]],
      ["extra", "<b>ACID vs BASE.</b> NoSQL stores often favour <b>B</b>asically <b>A</b>vailable, <b>S</b>oft state, <b>E</b>ventually consistent behaviour. You can still build ACID-like guarantees on NoSQL, for example routing writes through a lock-holding coordinator, at a cost."]
    ]}
  ],
  quiz: [
    { q: "IRCTC train booking: which sharding key prevents double-booking and spreads tatkal load?", o: ["Date of booking", "UserID", "TrainID", "Station name"], a: 2, why: "All berths for a train are on one shard, so allocation is local and atomic. Many trains run each day, so load spreads." },
    { q: "Slack (groups up to 100,000 users): shard messages by…", o: ["UserID", "GroupID (channel)", "Message length", "Timestamp"], a: 1, why: "One write per message. UserID would mean a write per member." },
    { q: "Why is \"first letter of username\" a bad key?", o: ["Letters aren't unique", "Uneven load ('a' ≫ 'x'), a hard cap of 26 shards, can't split further", "It's too slow", "It needs a JOIN"], a: 1, why: "Skewed, capped and inflexible." },
    { q: "Latest tweets per hashtag, paginated 10 at a time. Best NoSQL type?", o: ["Key-value", "Wide-column", "Graph", "Blob storage"], a: 1, why: "Sorted, appendable rows let you read the first X and offset. KV would return the whole list." }
  ],
  refs: [["ByteByteGo: A guide to database sharding keys", "https://blog.bytebytego.com/p/a-guide-to-database-sharding-key"], ["MongoDB: choosing a shard key", "https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/"], ["Slack: scaling datastores with Vitess", "https://slack.engineering/scaling-datastores-at-slack-with-vitess/"], ["AWS: ACID vs BASE", "https://aws.amazon.com/compare/the-difference-between-acid-and-base-database/"], ["MongoDB: NoSQL explained", "https://www.mongodb.com/resources/basics/databases/nosql-explained"]]
});

/* ───────────────────────── 8. Orchestration, shard creation, quorum ───────────────────────── */
L({
  id: "shard-ops", mod: "db", icon: "🎛️", minutes: 30,
  title: "Database orchestration, shard creation & tunable consistency",
  scaler: "HLD 8 · Database Orchestration & Shard Creation",
  summary: "Design the black box that adds shards, replaces dead machines and keeps replication levels, then see how multi-master stores like Cassandra make consistency a dial with R + W > N.",
  concepts: ["orchestrator", "quorum", "consistent-hashing", "replication"],
  related: ["discord"],
  sections: [
    { h: "The manual-sharding black box", blocks: [
      ["p", "Inputs: a sharding key and a replication level (say 3). Jobs: add shards and migrate data, keep load even, and when a machine dies, restore the replication level."],
      ["warn", "Tempting idea: \"when a shard's load crosses a threshold, add a machine and move data to it.\" But traffic peaks daily, so the threshold trips <b>at peak</b>, and you'd start a heavy migration exactly when the system is most stressed."]
    ]},
    { h: "“SulochanaDB”: shards of master + slaves", blocks: [
      ["p", "Three shards, each with 1 master + 2 slaves. Clients run the consistent-hashing code (4 hash functions per shard on a ring of [0, 10¹⁸]) to find a user's shard. New machines arrive. Where should they go: replace dead machines, form a new shard, or wait on standby?"],
      ["steps", [["Priority 1: restore replication", "A shard below its replication level is one failure away from data loss or downtime."], ["Priority 2: create new shards", "Add capacity."], ["Priority 3: standby", "Spare machines ready for the next failure."], ["A naive formula fails", "\"Use N % M machines to replace dead ones, the rest form shards\". With N = 3 new, M = 3 per shard and one dead machine, N % M = 0, so nothing replaces it!"], ["Fix", "Always keep <b>X machines in standby</b> (X can grow with the number of shards). Use the rest for new shards."]]],
      ["p", "The component running this logic is the <b>orchestrator</b> (HDFS calls its version the NameNode, HBase the HMaster). It watches heartbeats, which are almost free: a few bytes per second per machine."],
      ["tip", "Don't let spares sit idle: attach them to shards as <b>extra replicas</b>. When a slave dies, a warm copy already exists. When creating a shard, promote warmed spares and let fresh machines refill the spare pool."]
    ]},
    { h: "Creating a shard without downtime", blocks: [
      ["flow", { nodes: [
        { id: "orc", x: 120, y: 225, label: "Orchestrator", sub: "runs the plan", kind: "service", icon: "🎛️", desc: "Decides ranges and phases." },
        { id: "s1", x: 420, y: 80, label: "Shard S1", sub: "live", kind: "db", icon: "🗄️", desc: "Currently owns the range the new shard will take over." },
        { id: "s2", x: 420, y: 225, label: "Shard S2", sub: "live", kind: "db", icon: "🗄️", desc: "Also gives up some ranges." },
        { id: "s4", x: 760, y: 225, label: "New shard S4", sub: "staging → live", kind: "cache", icon: "🆕", desc: "Not on the ring until the real phase." },
        { id: "c", x: 420, y: 370, label: "Clients", sub: "consistent hashing", kind: "client", icon: "👥", desc: "Don't know about S4 until it's added to the ring." }
      ], flows: [
        { name: "Seamless shard creation", steps: [["orc", "s4", "10:00:00 · STAGING: simulate the ring with S4 to learn which hash ranges it will own"], ["s1", "s4", "Copy those ranges from S1…"], ["s2", "s4", "…and from S2, while S1 and S2 keep serving (Manmeet adds bookmarks at 10:01 that land on S1)"], ["orc", "c", "10:15:00 · REAL PHASE: S4 goes live on the ring"], ["s1", "s4", "Catch up the 10:00–10:15 delta (a few seconds)"], ["orc", "s1", "10:15:15 · Done: S1 and S2 delete the ranges S4 now owns"]] }
      ]}, "Staging → real phase → cleanup. Downtime shrinks from 15 minutes to ~15 seconds (or zero, if you accept stale reads)."],
      ["p", "Between 10:15:00 and 10:15:15, a read for Manmeet's new bookmark is either <b>stale</b> (highly-available mode returns what S4 has) or <b>briefly unavailable</b> (highly-consistent mode waits). That's CAP again, in miniature."]
    ]},
    { h: "Multi-master: every node is a master", blocks: [
      ["p", "Dynamo-style stores (Cassandra, DynamoDB) skip master/slave and reserves entirely. Machines join the ring, and with replication level 3 a key's copies live on the <b>next 3 distinct machines clockwise</b>. If M1 dies, requests naturally flow to M2, which already has a replica."],
      ["p", "Consistency becomes a dial. For each request choose <b>W</b> (replicas that must ack a write) and <b>R</b> (replicas that must answer a read)."],
      ["fig", "quorum", "Move N, W and R. When R + W > N, every read overlaps the latest write."],
      ["p", "<b>Shopping cart (Dynamo):</b> N = 5, R = 2, W = 2. Since 4 ≤ 5, a read can return two different versions: {Lux soap 10:00, Oil 10:15} and {Lux soap 10:00, Mask 10:20}. Dynamo merges them using timestamps → {Lux soap, Oil, Mask}. It's always available, and occasionally a deleted item reappears, which Amazon accepted for carts."]
    ]}
  ],
  quiz: [
    { q: "N = 3, R = 2, W = 2. Strongly consistent?", o: ["Yes, R + W = 4 > 3", "No", "Only for writes", "Only with a master"], a: 0, why: "Read and write sets must overlap in at least one up-to-date replica." },
    { q: "N = 5, R = 2, W = 2 (Dynamo cart)?", o: ["Strong", "Not strong: needs conflict resolution (merge)", "Unavailable", "Invalid configuration"], a: 1, why: "4 ≤ 5, so reads may miss the latest write, and versions get merged." },
    { q: "Why not add a shard when load crosses a threshold?", o: ["Thresholds are hard to compute", "It triggers at peak traffic, adding migration load when you can least afford it", "Shards can't be added online", "It breaks consistent hashing"], a: 1, why: "Plan capacity ahead and migrate off-peak." },
    { q: "With RF 3 on a ring, where do key U1's replicas live?", o: ["Random machines", "The next 3 distinct machines clockwise", "All machines", "The orchestrator"], a: 1, why: "When M1 fails, traffic flows to M2, which already holds a copy." }
  ],
  refs: [["Cassandra: Dynamo architecture & tunable consistency", "https://cassandra.apache.org/doc/stable/cassandra/architecture/dynamo.html"], ["DynamoDB read consistency", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html"], ["Amazon's Dynamo paper", "https://www.allthingsdistributed.com/2007/10/amazons_dynamo.html"], ["Designing Data-Intensive Applications", "https://dataintensive.net/"]]
});

/* ───────────────────────── 9. NoSQL internals ───────────────────────── */
L({
  id: "lsm", mod: "db", icon: "🌲", minutes: 30,
  title: "NoSQL internals: LSM trees, SSTables & Bloom filters",
  scaler: "HLD 10 · NoSQL Internals: LSM Tree + Bloom Filter + Sparse Index",
  summary: "Derive, step by step, how Cassandra-style databases make writes blazing fast: append-only logs, memtables, sorted SSTables, sparse indexes, compaction, tombstones and Bloom filters.",
  concepts: ["lsm", "bloom-filter", "wal"],
  related: ["discord"],
  sections: [
    { h: "The problem", blocks: [
      ["p", "NoSQL values have no fixed size (a document can grow, a wide row keeps getting columns). In-place updates of variable-size records are painful, and SQL's B-trees give O(log N) reads <i>and</i> writes. Can we make writes much faster, and keep reads acceptable?"]
    ]},
    { h: "Derive it in five steps", blocks: [
      ["steps", [["1 · One file, update in place", "To update key 002, scan to find it and overwrite. Reads scan too. Both are slow, variable sizes make overwriting messy, and writers need locks."], ["2 · Append every write", "Never overwrite, just append. Writes become sequential and very fast, with no locks. Read by scanning from the end (the first match is the latest). But reads are O(N), and old versions waste space."], ["3 · In-memory hashmap: key → byte offset", "Reads jump straight to the latest entry. But billions of keys won't fit in RAM, and duplicates still waste disk."], ["4 · Chunks + memtable + compaction", "Split into ~100 MB chunks. The newest chunk lives in RAM as a <b>memtable</b> (updated in place) and is flushed when full. Background <b>compaction</b> merges old chunks and drops duplicates, best run off-peak."], ["5 · Sort it", "Make the memtable a balanced tree (TreeMap). Flushes are written <b>sorted</b> as an <b>SSTable</b>. Split each SSTable into 64 KB blocks and keep one index entry per block, a <b>sparse index</b>. A 1 GB file ≈ 16k blocks, so the index fits easily in RAM."]]],
      ["p", "That's a <b>Log-Structured Merge (LSM) tree</b>, the storage engine behind Cassandra, HBase, RocksDB, LevelDB and ScyllaDB."],
      ["analogy", "A busy restaurant: orders are scribbled on a notepad (WAL) and pinned on the rail (memtable). At the end of each hour, they're sorted and filed into a binder (SSTable). On quiet nights, the binders get merged and cleaned up (compaction)."]
    ]},
    { h: "Play with an LSM tree", blocks: [
      ["fig", "lsm", "PUT keys until the memtable flushes. GET a key and watch Bloom filters skip tables. DELETE (tombstone), then compact."],
      ["table", ["Operation", "What happens"], [["Write", "Append to the WAL (durability) + insert into the memtable (RAM) → ack. No random disk I/O."], ["Flush", "Memtable full → written sequentially as a new immutable, sorted SSTable."], ["Read", "Memtable → newest SSTable → older ones. Per table: Bloom filter → sparse index → scan one 64 KB block."], ["Delete", "Write a <b>tombstone</b>. If the newest version found is a tombstone, the key is gone. Compaction removes it physically later."], ["Crash", "RAM is lost; on restart, replay the WAL since the last flush to rebuild the memtable."], ["Compaction", "Merge-sort SSTables, keep the newest version per key, drop overwritten values and tombstones."]]],
      ["extra", "Why are appends so fast? Sequential I/O is dramatically faster than random I/O, especially on spinning disks where every random write means a physical seek (~10 ms). LSM trees turn random writes into RAM updates plus sequential flushes."]
    ]},
    { h: "Bloom filters: making “not found” cheap", blocks: [
      ["p", "The worst read is for a key that doesn't exist: you'd check the memtable and <i>every</i> SSTable before giving up. A <b>Bloom filter</b> per SSTable answers instantly: <b>“definitely not here”</b> (skip the disk) or <b>“maybe here”</b> (go look)."],
      ["fig", "bloom", "Add some words, then check words you did and didn't add. Look for a false positive."],
      ["list", ["Bit array of m bits + k hash functions.", "<b>Add:</b> set the k bits for the key.", "<b>Check:</b> any of the k bits is 0 → definitely absent. All 1 → probably present.", "<b>No false negatives</b>, only occasional false positives. ~10 bits per key gives about 1% false positives."]]
    ]}
  ],
  quiz: [
    { q: "Why are LSM writes fast?", o: ["They skip durability", "Writes go to RAM plus a sequential append; no random disk seeks", "They use B-trees", "They're compressed"], a: 1, why: "WAL append + memtable insert; sorted data is flushed later in one sequential write." },
    { q: "A Bloom filter says “maybe”. What do you know?", o: ["The key definitely exists", "The key might exist; you must check", "The key definitely doesn't exist", "The filter is broken"], a: 1, why: "All k bits being set could be other keys' doing: a false positive." },
    { q: "How is a delete represented before compaction?", o: ["The row is erased immediately", "A tombstone entry that shadows older values", "The SSTable is rewritten", "It isn't supported"], a: 1, why: "SSTables are immutable. Tombstones mark deletion until compaction cleans up." },
    { q: "Why a sparse index (one entry per 64 KB block)?", o: ["Faster writes", "It fits in RAM, and you only scan one small block", "It's required by SQL", "It avoids compaction"], a: 1, why: "1 GB ≈ 16k blocks, so the index is tiny compared with one entry per key." }
  ],
  refs: [["ByteByteGo: The secret sauce behind NoSQL, LSM tree", "https://www.youtube.com/watch?v=I6jB0nM9SKU"], ["Cassandra storage engine", "https://cassandra.apache.org/doc/stable/cassandra/architecture/storage-engine.html"], ["Cassandra compaction", "https://cassandra.apache.org/doc/stable/cassandra/managing/operating/compaction/index.html"], ["Bloom filters by example (interactive)", "https://llimllib.github.io/bloomfilter-tutorial/"], ["Bloom filter calculator", "https://hur.st/bloomfilter/"]]
});

/* Scenarios for the sharding-key figure (from the lecture's quiz examples). */
BP.SHARD_SCENARIOS = [
  { name: "🏦 Banking", desc: "Users can hold accounts in several cities. Frequent ops: balance, transaction history, list a user's accounts, create transactions.",
    queries: ["Get my balance", "Show my transaction history", "List my accounts"],
    keys: [
      { key: "UserID", dist: [26, 24, 25, 25], q: [1, 1, 1], good: true, why: "All of a user's accounts and transactions sit together, so every frequent operation touches one shard. Spread active and inactive users evenly." },
      { key: "CityID", dist: [58, 22, 12, 8], q: [1, 4, 4], good: false, why: "Big cities make hot shards, users with accounts in several cities fan out, and moving cities means migrating data." },
      { key: "TransactionID", dist: [25, 25, 25, 25], q: [4, 4, 4], good: false, why: "Perfectly even, but every user-centric query must ask every shard." }
    ] },
  { name: "🚕 Uber", desc: "The dominant operation is \"find drivers near me\". Drivers move constantly.",
    queries: ["Find nearby drivers", "Update a driver's location", "Show a driver's trips"],
    keys: [
      { key: "CityID", dist: [34, 28, 22, 16], q: [1, 1, 1], good: true, why: "A rider only needs drivers in their own city, so nearby search stays on one shard. City sizes differ, but cities are independent and big ones can be split further." },
      { key: "DriverID", dist: [25, 25, 25, 25], q: [4, 1, 1], good: false, why: "Nearby drivers are scattered across all shards, so every search fans out." },
      { key: "PIN code", dist: [30, 27, 23, 20], q: [4, 4, 1], good: false, why: "Cabs cross PIN codes constantly, which means endless reshuffling, and searches near a boundary span shards." }
    ] },
  { name: "💬 Slack", desc: "Channels can have 100,000 members. Sending to a channel is the hot path.",
    queries: ["Send a message to a channel", "Load a channel's messages", "List my channels"],
    keys: [
      { key: "GroupID (channel)", dist: [27, 25, 24, 24], q: [1, 1, 4], good: true, why: "One write per message, and one shard to load a channel. The \"my channels\" list lives in a small per-user index, and unread counts load lazily." },
      { key: "UserID", dist: [25, 25, 25, 25], q: [4, 1, 1], good: false, why: "One message to a 100k-member channel means writing to 100k mailboxes on every shard." }
    ] },
  { name: "🚆 IRCTC", desc: "Never double-book a berth. Tatkal opens at a fixed time and everyone books tomorrow's trains at once.",
    queries: ["Book a berth on train T", "Check berth availability", "My bookings"],
    keys: [
      { key: "TrainID", dist: [26, 25, 25, 24], q: [1, 1, 4], good: true, why: "All berths of a train live on one shard, so allocation is local and atomic (no double-booking). Thousands of trains run tomorrow, so tatkal load spreads." },
      { key: "Date of journey", dist: [85, 5, 5, 5], q: [1, 1, 4], good: false, why: "Every tatkal opening hammers the single shard holding tomorrow." },
      { key: "UserID", dist: [25, 25, 25, 25], q: [4, 4, 1], good: false, why: "Two users on different shards could get the same berth unless every booking checks every shard, which is impossible at tatkal scale." }
    ] },
  { name: "🔤 Username", desc: "A tempting but naive idea: shard users by the first letter of their username.",
    queries: ["Login", "Load profile", "Add a 27th shard"],
    keys: [
      { key: "First letter", dist: [46, 30, 18, 6], q: [1, 1, 26], good: false, why: "Far more names start with 'a' or 's' than 'x', there are only 26 possible shards, and a hot letter can't be split." },
      { key: "hash(UserID)", dist: [25, 25, 25, 24], q: [1, 1, 1], good: true, why: "Even distribution, one shard per lookup, and consistent hashing makes adding shards cheap." }
    ] }
];
