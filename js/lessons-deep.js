/* Blueprint — deeper lesson content, matched against the Scaler HLD notes.
 * Rebuilds the caching lesson section by section and inserts the detail the notes cover
 * (worked examples, commands, step-by-step mechanisms, the notes' own questions) into the rest.
 */
(function () {
  const lesson = (id) => BP.LESSONS.find((l) => l.id === id);
  const idx = (l, prefix) => { const i = l.sections.findIndex((s) => s.h.startsWith(prefix)); if (i < 0) throw new Error(`${l.id}: no section "${prefix}"`); return i; };
  const after = (id, prefix, ...secs) => { const l = lesson(id); l.sections.splice(idx(l, prefix) + 1, 0, ...secs); };
  const before = (id, prefix, ...secs) => { const l = lesson(id); l.sections.splice(idx(l, prefix), 0, ...secs); };
  const extend = (id, prefix, ...blocks) => { const l = lesson(id); l.sections[idx(l, prefix)].blocks.push(...blocks); };
  const quiz = (id, ...qs) => lesson(id).quiz.push(...qs);
  const policyFlow = (name, steps) => ({ nodes: [
    { id: "u", x: 100, y: 225, label: "Client", sub: "write x = 5", kind: "client", icon: "🧑‍💻", desc: "Sends a write and waits for “success”." },
    { id: "app", x: 340, y: 225, label: "App server", sub: "applies the policy", kind: "service", icon: "⚙️", desc: "Decides where the write goes first." },
    { id: "c", x: 640, y: 90, label: "Cache", sub: "RAM, fast", kind: "cache", icon: "⚡", desc: "Holds a copy of hot data." },
    { id: "db", x: 640, y: 360, label: "Database", sub: "disk, source of truth", kind: "db", icon: "🗄️", desc: "The real copy." },
    { id: "q", x: 900, y: 225, label: "Flush job", sub: "async, batched", kind: "queue", icon: "⏳", desc: "Copies dirty entries from the cache to the DB later, in batches." }
  ].filter((n) => n.id !== "q" || steps.some((st) => st.includes("q"))), flows: [{ name, steps }] });

  /* ═════════════ CACHING: rebuilt in full ═════════════ */
  const C = lesson("caching");
  C.minutes = 50;
  C.summary = "Every place data can be cached (browser, CDN, local, global, distributed), how TTL keeps it fresh, the three write policies (write-through, write-back, write-around) in detail, eviction algorithms, and how they combine into cache consistency.";
  C.sections = [
    { h: "Why caching works: the memory hierarchy", blocks: [
      ["p", "<b>Caching</b> means keeping a copy of data somewhere <b>faster or closer</b> than where it really lives, so the next read is quicker. It works because every storage level trades size and cost for speed, often by 100× per step, and because real traffic is skewed: a small set of hot items gets most of the requests."],
      ["fig", "memory", "Click tiers to fetch from them. Toggle humanize: if an L1 hit took 1 second, a disk seek would take months."],
      ["p", "The notes anchor the idea with three numbers that come back in the next lesson:"],
      ["table", ["Read", "Time", "Relative"], [["A file on the app server's own disk", "~40 ms", "1×"], ["A table or column from the MySQL machine", "~50 ms", "≈1.25×"], ["A large test file from remote file storage (S3)", "~2 s", "50×"]]],
      ["analogy", "Your desk drawer (cache) versus the office storeroom (database) versus the warehouse across town (remote storage). You keep what you use daily in the drawer."]
    ]},
    { h: "The two problems every cache has", blocks: [
      ["p", "Before choosing a cache, recognise its two built-in limitations, because every technique in this lesson exists to manage one of them:"],
      ["steps", [["It is limited in size", "RAM is expensive, so the cache can't hold everything. When it's full, something must go. That's <b>eviction</b>."], ["It is not the source of truth", "It holds a <i>copy</i>. When the database changes, the copy can be wrong. That's <b>staleness</b>, managed by <b>invalidation</b> (TTL) and <b>write policies</b>."]]],
      ["p", "The notes pose them as two questions: <i>What do you have that doesn't become inconsistent?</i> and <i>How do you add entries when the cache is full?</i> Keep both in mind for the rest of the lesson."]
    ]},
    { h: "Where can we cache? The journey of a request", blocks: [
      ["p", "A request passes through several layers, and each can answer it from a cache. It stops at the first layer that has the data; layers below never see it."],
      ["fig", "cachepath", "Pick a scenario and send a request. Click a layer to toggle whether it holds the data."],
      ["table", ["Layer", "Lives where", "Typical contents", "Who shares it"], [["Browser cache", "On the user's device", "DNS answers, JS, CSS, images", "One user"], ["CDN", "Edge servers in every region", "Images, video, static files", "Everyone in that region"], ["Local cache", "In the app server's RAM or disk", "Hot rows, large files", "One server"], ["Global cache", "A separate Redis/Memcached tier", "Hot or derived data", "All app servers"], ["Distributed cache", "A cluster of cache servers", "Same as global, at scale", "All app servers"]]]
    ]},
    { h: "Browser caching", blocks: [
      ["p", "The browser keeps two kinds of things: <b>DNS results</b> (so it doesn't resolve <code>del.icio.us</code> again on every request) and <b>static assets</b> (images, videos, JavaScript, CSS). These entries are small and rarely change, which is why the <b>first visit</b> to a site is slow and <b>later visits</b> are fast."],
      ["extra", "The server controls browser caching with HTTP headers. <code>Cache-Control: max-age=31536000, immutable</code> says \"keep this for a year\". For HTML that changes, <code>no-cache</code> plus an <code>ETag</code> lets the browser ask \"has it changed?\" and get a tiny <code>304 Not Modified</code>. To ship a new version of a long-cached file, change its name: <code>app.3f9a1c.js</code>. That's the same versioning trick as the code-judge case study."],
      ["code", "HTTP/1.1 200 OK\nContent-Type: text/javascript\nCache-Control: public, max-age=31536000, immutable\nETag: \"3f9a1c\""]
    ]},
    { h: "CDN: bringing files closer to users", blocks: [
      ["p", "<b>The problem.</b> Delicious's servers and file storage are in the US, and a user is in India. The path is browser → LB → app server → file storage, and transfers inside a region are fast while transfers across continents are slow. Multimedia is large, so this hurts most for images and video."],
      ["img", "Submarine cables.png", "A map of undersea cable routes around Europe. Traffic between continents travels thousands of kilometres through cables like these: a California ↔ Netherlands round trip costs about 150 ms, and that's exactly what a CDN avoids."],
      ["steps", [["Copy files to every region", "A CDN provider (Akamai, Cloudflare, Amazon CloudFront, Fastly) runs servers in many regions and copies your files to them."], ["Return region-specific links", "Your HTML (small) can still come from the origin, even in the US. Images and videos are referenced by <b>CDN links</b> that resolve to the nearest region."], ["Download from the nearest edge", "The heavy bytes travel a short distance instead of across an ocean."], ["Pay per use", "You pay for the bandwidth and requests you use, without building data centres everywhere."]]],
      ["p", "<b>How does the browser reach the nearest edge?</b> Two ways from the notes: (1) <b>ISP integration</b>: many ISPs host CDN nodes inside their own network (Netflix's Open Connect is the famous example); (2) <b>Anycast</b>: the same IP address is announced from many locations, and internet routing naturally delivers you to the closest one."],
      ["tip", "A CDN <i>is</i> a cache: it has limited space and a TTL, and it can go stale. Put content there that is identical for many users and changes rarely. Personalised or private responses don't belong on shared edges."]
    ]},
    { h: "Local cache (on the app server)", blocks: [
      ["p", "A local cache lives inside each app server, in memory or on its own disk, so repeated reads don't hit the database. The notes tell it through <b>Nile.com</b>: during a New Year sale, the database was overloaded by the <i>same</i> queries over and over, and response times went above 200 ms. Adding local caches brought latency back under the threshold, but three problems remained:"],
      ["table", ["Problem", "Why it happens"], [["Cache misses", "The load balancer spreads users across servers, so each server's cache only ever sees part of the traffic and holds part of the data."], ["Stale data", "An update reaches the database and maybe one server's cache, but not the copies on every other server."], ["Memory and coupling", "The cache eats app-server RAM, and the app tier and cache tier can't scale independently."]]],
      ["tip", "Local caches shine when the data is <b>large and cheap to validate</b>, like the code judge's test files in the next lesson, where a tiny DB lookup proves the local copy is current."]
    ]},
    { h: "Global cache (Redis, Memcached)", blocks: [
      ["p", "A <b>global cache</b> is a separate cache tier that every app server talks to. All servers see the same cached data (a single source of truth <i>for cached data</i>; the database remains the real source of truth), and the cache scales separately from the app. The cost is one network hop (~0.5–1 ms), which is still far cheaper than a database query."],
      ["p", "<b>When to use a global cache (from the notes):</b>"],
      ["list", ["<b>Data queried very often</b>, such as a popular product, a session, or a feature flag.", "<b>Derived information</b> that is expensive to compute in the database, such as a contest ranklist, a counter, or an aggregated dashboard."]]
    ]},
    { h: "Distributed cache", blocks: [
      ["p", "One global cache machine is itself a <b>single point of failure</b> and a <b>capacity ceiling</b>. Scaling it vertically gets expensive fast (RAM is costly), and swapping it for a cluster later means \"massive changes\". So at scale, the global cache becomes a <b>cluster</b>: keys are spread across nodes (consistent hashing, or Redis Cluster's 16,384 hash slots) and each node has replicas."],
      ["tip", "You almost never build this yourself. Use Redis Cluster or a managed service (ElastiCache, Memorystore). The next lesson walks through Redis Cluster hands-on."]
    ]},
    { h: "Invalidation with TTL", blocks: [
      ["p", "<b>TTL (time to live)</b> is the simplest way to stop serving stale data: every entry expires after a fixed time and is refetched on the next request. It's a periodic refresh, and it suits data that may be slightly stale for a short window."],
      ["steps", [["T", "X is fetched from the database and cached with TTL = 60 s."], ["T + 1 … T + 60", "Every request for X is a cache hit."], ["T + 61", "X has expired. The next request misses, reads X from the database, and caches it again for another 60 s."]]],
      ["table", ["TTL", "What happens", "Problem"], [["Too low (1 min)", "Entries expire constantly", "High miss rate: lots of slow trips to the source"], ["Too high (60 min)", "Entries live a long time", "Stale data: an edited file isn't seen for up to an hour"]]],
      ["tip", "TTL is a guess about how stale is acceptable. Choose it by balancing <b>miss rate</b> against the <b>staleness window</b>. When a change must show up <i>immediately</i>, TTL isn't enough: combine it with a write policy, or use versioned keys."],
      ["extra", "Thousands of hot keys expiring at the same second all miss together and stampede the database. Add random jitter to TTLs (60 s ± 10%) so expiries spread out."]
    ]},
    { h: "Write policies: keeping the cache and the database in sync", blocks: [
      ["p", "Reads are only half the story. When data is <b>written</b>, the cache and the database must stay in agreement somehow. There are three classic policies, and they differ in one question: <b>where does the write go first, and when do we tell the client “success”?</b>"],
      ["table", ["Policy", "Write goes to", "Client hears success after", "In one line"], [["Write-through", "Cache, then DB (synchronously)", "Both are updated", "Always consistent, slower writes"], ["Write-back", "Cache only; DB later", "The cache is updated", "Fastest writes, can lose data"], ["Write-around", "DB only; cache skipped", "The DB is updated", "Cache isn't polluted, next read misses"]]],
      ["p", "The next three sections take them one at a time."]
    ]},
    { h: "Write-through cache", blocks: [
      ["p", "Every write goes <b>through the cache first</b> (there may be several cache machines), then to the database, and only when both are updated does the client get \"success\". If the database write fails, the cache change is <b>reverted</b>, so the two never disagree."],
      ["flow", policyFlow("Write-through", [["u", "app", "PUT x = 5"], ["app", "c", "1) Update the cache: x = 5"], ["app", "db", "2) Write the database: x = 5 (synchronous)"], ["db", "app", "DB confirms. (If it failed, revert the cache entry.)"], ["app", "u", "3) Success, only after both are updated"]]), "Write-through: the client waits for both the cache and the database."],
      ["table", ["Pros", "Cons"], [["Cache and DB are always consistent", "Every write pays the database's latency"], ["Reads right after a write are fresh hits", "Data that's written but never read still fills the cache"], ["No data loss if the cache dies", ""]]],
      ["p", "<b>Use it for read-heavy data that must be fresh:</b> product catalogues, user profiles, settings, and anything read immediately after it's written. The messenger case study uses write-through so a chat's cached history never disagrees with the database."]
    ]},
    { h: "Write-back (write-behind) cache", blocks: [
      ["p", "The write goes <b>only to the cache</b>, and the client gets \"success\" right away. The cache marks the entry <i>dirty</i> and copies it to the database <b>asynchronously</b> later, often in batches."],
      ["flow", policyFlow("Write-back", [["u", "app", "PUT x = 5"], ["app", "c", "1) Update the cache, mark x dirty"], ["app", "u", "2) Success immediately (sub-millisecond)"], ["c", "q", "3) Later: the flush job collects dirty entries"], ["q", "db", "4) Batched write to the database"]]), "Write-back: the client never waits for the database."],
      ["table", ["Pros", "Cons"], [["Lowest write latency, highest throughput", "If the cache dies before flushing, acknowledged writes are lost"], ["Batches many writes into one DB write", "The database is temporarily behind the cache"], ["Shields the DB from write spikes", "More moving parts (flush job, dirty tracking)"]]],
      ["p", "<b>Use it where losing an occasional write doesn't matter:</b> the notes' example is <b>analytics</b>. Losing one data point among millions doesn't change a trend. Also: view counters, likes, game scores updated many times a second."],
      ["extra", "To make write-back safer, replicate the cache, or turn on Redis persistence (AOF), so dirty entries survive a crash."]
    ]},
    { h: "Write-around cache", blocks: [
      ["p", "The write goes <b>straight to the database</b> and skips the cache. Any cached copy is now out of date, so it is deleted (invalidated) or left to expire through <b>TTL</b>. The next read misses and loads fresh data."],
      ["flow", policyFlow("Write-around", [["u", "app", "PUT x = 5"], ["app", "db", "1) Write the database only"], ["app", "c", "2) Invalidate x (or let its TTL expire)"], ["app", "u", "3) Success after the DB write"], ["u", "app", "Later: GET x"], ["app", "c", "Miss"], ["app", "db", "Read x = 5 and populate the cache"]]), "Write-around: writes skip the cache; the first read after a write is a miss."],
      ["table", ["Pros", "Cons"], [["The cache isn't filled with data nobody reads", "The first read after every write is a miss"], ["Writes are as fast as the DB", "Without invalidation, reads can be stale until TTL expires"]]],
      ["p", "<b>Use it for data that's written often but read rarely, or read much later:</b> logs, audit trails, bulk imports, chat history older than a few days."]
    ]},
    { h: "Write policies side by side", blocks: [
      ["fig", "writepolicy", "Write, read, and crash the cache under each policy. Watch latency, consistency and what's at risk."],
      ["table", ["", "Write-through", "Write-back", "Write-around"], [["Write latency", "High (cache + DB)", "Lowest (cache only)", "DB speed"], ["Read right after write", "Hit, fresh", "Hit, fresh", "Miss (then fresh)"], ["Cache vs DB", "Always in sync", "DB lags behind", "Cache may be stale until invalidated or TTL"], ["Data loss if the cache crashes", "None", "Unflushed writes lost", "None"], ["Best for", "Read-heavy, must be fresh", "Write-heavy, loss-tolerant", "Write-heavy, rarely re-read"]]],
      ["p", "<b>Which would you pick?</b>"],
      ["list", ["A click counter at 500k events/s for an analytics dashboard → <b>write-back</b>.", "A product catalogue read 1,000× per update, with prices that must be right → <b>write-through</b>.", "Nightly import of a million audit-log rows → <b>write-around</b>.", "A chat app's recent message history → <b>write-through</b> (the messaging lesson)."]]
    ]},
    { h: "Reading patterns: cache-aside and read-through", blocks: [
      ["extra", "The notes focus on write policies. On the read side, two names come up in interviews: <b>cache-aside</b> (lazy loading), where the application checks the cache and on a miss reads the DB and fills the cache itself; and <b>read-through</b>, where the cache library does that on the application's behalf. Cache-aside plus write-around (invalidate on write) is the most common combination in practice."],
      ["code", "// cache-aside read\nfunction getUser(id) {\n  let u = cache.get(`user:${id}`);\n  if (!u) {                       // miss\n    u = db.query(\"SELECT * FROM users WHERE id = ?\", id);\n    cache.set(`user:${id}`, u, { ttl: 300 });\n  }\n  return u;\n}\n\n// write-around + invalidate\nfunction updateUser(id, fields) {\n  db.update(\"users\", id, fields);\n  cache.del(`user:${id}`);        // next read repopulates\n}"]
    ]},
    { h: "Eviction: what to throw out when full", blocks: [
      ["p", "When the cache is full and a new entry arrives, something must leave. The goal is to evict the entry <b>least likely to be needed next</b>, so hits stay high. The notes cover four policies:"],
      ["table", ["Policy", "Evicts", "Good when", "Example (cache of 3, then access D)"], [["FIFO", "The oldest <i>inserted</i> entry", "Access is uniform", "A, B, C inserted in order → evict A"], ["LRU", "The least <i>recently used</i> entry", "Recent items are likely to be reused (most apps)", "A, B, C, then A read again → evict B"], ["LIFO", "The newest inserted entry", "Old entries are the valuable ones", "A, B, C → evict C"], ["MRU", "The most recently used entry", "Sequential scans: what you just read won't be read again", "Reading a big file once → evict the block just read"]]],
      ["fig", "eviction", "The same accesses through three policies side by side. Play the sample sequence and compare hits."],
      ["extra", "<b>LFU</b> (least frequently used) isn't in the notes, but Redis offers it. It keeps entries with high access counts, with counts that decay so formerly hot keys can age out."],
      ["p", "<b>Implementing LRU in O(1).</b> Combine a hashmap (key → node) with a doubly linked list ordered by recency. A read moves the node to the head, and eviction removes the tail:"],
      ["code", "class LRU {\n  constructor(cap) { this.cap = cap; this.map = new Map(); }   // Map keeps insertion order\n  get(k) {\n    if (!this.map.has(k)) return undefined;                   // miss\n    const v = this.map.get(k); this.map.delete(k); this.map.set(k, v);  // move to newest\n    return v;\n  }\n  set(k, v) {\n    this.map.delete(k); this.map.set(k, v);\n    if (this.map.size > this.cap) this.map.delete(this.map.keys().next().value); // evict oldest\n  }\n}"],
      ["tip", "Redis doesn't do exact LRU. It samples a few keys (<code>maxmemory-samples</code>, default 5) and evicts the oldest among them. That's nearly as good and costs no extra memory per key."]
    ]},
    { h: "Cache consistency: putting it together", blocks: [
      ["p", "\"Cache consistency\" means: how long, and how often, can a read from the cache disagree with the database? Each tool from this lesson answers it differently:"],
      ["table", ["Technique", "Staleness", "Cost"], [["TTL only", "Up to the TTL", "Simple; more misses as TTL drops"], ["Write-through", "None for writes that go through the cache", "Slower writes"], ["Write-around + invalidate", "Tiny window between the DB write and the delete", "First read after each write misses"], ["Write-back", "The DB lags (the cache is fresh)", "Risk of losing unflushed writes"], ["Versioned keys", "None: stale versions are never read", "Needs a cheap source for the current version"]]],
      ["warn", "A classic race: request A reads the old value from the DB (cache miss) and, before it writes the cache, request B updates the DB and deletes the cache key. A then writes the <i>old</i> value into the cache. Short TTLs bound the damage. Delete-then-delete-again (delayed double delete) or versioned keys avoid it."]
    ]}
  ];
  quiz("caching",
    { q: "Write-through: the database write fails after the cache was updated. What should happen?", o: ["Return success anyway", "Revert the cache entry and return an error", "Retry forever", "Switch to write-back"], a: 1, why: "Write-through's promise is that the cache and DB agree. A failed DB write means rolling back the cache change." },
    { q: "Why do local caches on many app servers miss so often?", o: ["RAM is slow", "The load balancer spreads users, so each server's cache sees only part of the traffic", "They use FIFO", "They have no TTL"], a: 1, why: "Each copy is partial, which is one reason a shared global cache can win." },
    { q: "How does a browser reach the nearest CDN edge?", o: ["It pings every edge", "ISP-hosted CDN nodes or Anycast routing", "DNS always returns the US origin", "The user picks a region"], a: 1, why: "Anycast announces one IP from many places; ISP integration puts nodes inside your ISP." }
  );

  /* ═════════════ LESSON 1: System Design 101 ═════════════ */
  after("hld-101", "Problem 1", { h: "DNS in more detail: names, records and propagation", blocks: [
    ["p", "Owning a name and pointing it at a machine are two separate steps. You buy <code>del.icio.us</code> from a registrar, which reports the ownership to <b>ICANN</b>, the non-profit that keeps the master directory of registered domains, their owners and expiry dates. Then you publish records that say where the name points:"],
    ["table", ["Record", "Maps", "Example"], [["A", "name → IPv4 address", "del.icio.us → 54.23.11.8"], ["AAAA", "name → IPv6 address", "del.icio.us → 2600:1f18::8"], ["CNAME", "name → another name (an alias)", "www.del.icio.us → del.icio.us"], ["ALIAS / ANAME", "Like CNAME but allowed at the root domain", "del.icio.us → my-lb.aws.com"], ["NS", "Which servers are authoritative for the domain", "ns1.dnsprovider.com"], ["MX", "Where email goes", "mail.del.icio.us"]]],
    ["p", "Thousands of DNS servers hold copies of this information and <b>re-sync every few hours</b>. That's why a change can take hours to be seen everywhere, and why each record carries a <b>TTL</b>: lower it a day before a migration so the switch propagates quickly."],
    ["tip", "The browser and the OS cache DNS answers too, so DNS is your first cache, long before you add Redis."]
  ]});
  extend("hld-101", "Problem 2", ["img", "Racks Amravati Data Center.jpg", "Horizontal scaling in real life: rows of identical servers in a data centre. Each one is replaceable; none is special."]);
  after("hld-101", "The load balancer",
    { h: "Why use a load balancer: the five benefits in depth", blocks: [
      ["steps", [["Deployments (scalability)", "Rolling deploys: detach a host, deploy, restart, sanity-check, re-attach, then the next host. Users never see downtime."], ["Load balancing and autoscaling (resilience)", "All traffic passes through the LB, so it sees trends with low latency. Set an <b>upper threshold</b> (say 70% CPU) to add hosts and a <b>lower bound</b> to remove them gradually. React <i>before</i> traffic overwhelms you, not after."], ["Higher availability", "Health checks remove dead hosts and add recovered ones automatically."], ["Security", "Server IPs stay hidden behind one entry point, making direct attacks harder. A smart LB can spot and drop malicious traffic (DDoS mitigation)."], ["Performance", "<b>SSL/TLS termination</b>: encrypted from the user to the LB, plain from the LB to the servers, so servers skip the crypto work. The LB can also compress responses."]]]
    ]},
    { h: "Reverse proxy, forward proxy and types of load balancer", blocks: [
      ["table", ["", "Forward proxy", "Reverse proxy (a load balancer)"], [["Sits in front of", "Clients", "Servers"], ["Protects", "The clients' identity (e.g. a corporate proxy, a VPN)", "The servers: clients never learn which backend answered"], ["Example", "Squid, a school web filter", "NGINX, HAProxy, AWS ALB"]]],
      ["p", "Response headers reveal the proxy rather than the app server's software, which leaks less information. The load balancer is critical, so providers scale it themselves (AWS LBs scale automatically, up to about 100 nodes per the notes)."],
      ["table", ["Type", "Works at", "Routes by", "Example"], [["Application LB (L7)", "HTTP", "Path, host, headers, cookies", "/admin/* → admin fleet"], ["Network LB (L4)", "TCP/UDP", "IP and port only, very fast", "Game servers, databases"], ["DNS / global LB", "DNS", "User's location, region health", "India users → Mumbai region"]]]
    ]},
    { h: "Setting one up on AWS: listeners, rules, target groups", blocks: [
      ["p", "The reading walks through the AWS concepts you'll configure:"],
      ["list", ["<b>Listeners:</b> the protocol + port combinations the LB accepts, e.g. HTTPS:443 and HTTP:80. Everything else is dropped. Each forwards to a destination such as HTTP:8080 on the hosts.", "<b>Routing rules:</b> conditional forwarding. For example, requests whose path starts with <code>/admin</code> go to an internal admin fleet.", "<b>Target groups:</b> named sets of registered servers. A rule pairs a condition with a target group: one for general traffic, one per microservice."]],
      ["code", "Listener HTTPS:443  (TLS certificate for del.icio.us)\n  rule: path /admin/*  → target group \"admin\"  (2 hosts, port 8080)\n  default              → target group \"web\"    (10 hosts, port 8080)\nHealth check: HTTP GET / on 8080, every 30 s, timeout 5 s, unhealthy after 2"]
    ]}
  );
  after("hld-101", "Heartbeats", { h: "Questions the notes leave you with", blocks: [
    ["p", "The reading ends with three open questions. Here's how to answer them:"],
    ["steps", [["How do you run in several regions?", "A <b>global server load balancer</b> (usually DNS-based) sends each user to the nearest healthy region, and each region has its own LB. Deploy region by region so one bad release doesn't take down everything."], ["A user logs in on host A and the next request goes to host B. What breaks?", "If the session lives in A's memory, B doesn't know the user and they look logged out. Fix it with <b>sticky sessions</b> (IP hash or a cookie), or better, <b>stateless servers</b> with sessions in Redis or the DB."], ["Static vs dynamic content?", "Serve static files (images, JS, CSS) from a CDN or object storage, and send only dynamic requests to the app servers. The LB fleet can then be much smaller."]]]
  ]});
  quiz("hld-101", { q: "What does SSL termination at the load balancer buy you?", o: ["Stronger encryption", "App servers skip the TLS crypto work; traffic is encrypted user → LB", "Faster DNS", "Sticky sessions"], a: 1, why: "Decrypt once at the edge, and keep servers simple." });

  /* ═════════════ LESSON 2: LB & consistent hashing ═════════════ */
  extend("lb-ch", "Routing algorithms", ["img", "19-inch rackmount Ethernet switches and patch panels.jpg", "Switches and patch panels in a rack. Every request crosses hardware like this on its way from the load balancer to a server."]);
  after("lb-ch", "Consistent hashing",
    { h: "Implementing the ring", blocks: [
      ["p", "The \"circle\" is just a <b>sorted array of node positions</b>. To place a key, hash it and binary-search for the first node position greater than the hash, wrapping to the start if there is none. With 4 hash functions per machine (as in the notes), each machine contributes 4 points."],
      ["code", "const RING_MAX = 1e18;\nconst points = [];                       // [{pos, node}] sorted by pos\nfunction addNode(node) {\n  for (const h of [h1, h2, h3, h4]) points.push({ pos: h(node) % RING_MAX, node });\n  points.sort((a, b) => a.pos - b.pos);\n}\nfunction nodeFor(userId) {\n  const x = H(userId) % RING_MAX;\n  let lo = 0, hi = points.length;       // first pos > x\n  while (lo < hi) { const m = (lo + hi) >> 1; points[m].pos > x ? (hi = m) : (lo = m + 1); }\n  return points[lo % points.length].node;  // wrap around\n}"],
      ["p", "Lookup is <b>O(log P)</b> for P points, which meets the \"extremely lightweight\" constraint, since a router or client can do it on every request."]
    ]},
    { h: "Worked example: what happens when nodes come and go", blocks: [
      ["steps", [["Start", "Three shards S1, S2, S3, each hashed by 4 functions into [0, 10¹⁸]: 12 points on the ring. Users fall to the next point clockwise."], ["Add S4", "S4's 4 points land in 4 different places. Each takes over a small arc from whichever shard was next. S1, S2 and S3 each lose a few users, so load evens out, and nobody else moves."], ["Remove S2 (one point per node)", "All of S2's users fall to its single successor, say S3, whose load doubles. If S3 then fails, S1 triples. That's the cascade."], ["Remove S2 (many points per node)", "S2's users are spread across all of its small arcs, so they fall to <i>different</i> successors: some to S1, some to S3, some to S4. Everyone's load rises a little, and nobody falls over."]]]
    ]}
  );
  quiz("lb-ch", { q: "Why is range sharding (users 1–1M on shard A…) a poor choice for delicious?", o: ["Ranges can't be hashed", "Early users are the most active, their shards keep growing, and new shards only take new users", "It needs a load balancer", "Ranges overflow"], a: 1, why: "Skewed, ever-growing hot shards that a new shard can't relieve." });

  /* ═════════════ LESSON 4: Scaler code judge + Redis ═════════════ */
  extend("cache-scaler", "Problem: test files", ["img", "Keyboard Closeup 01 (203533167).jpeg", "During a contest, thousands of submissions arrive within minutes, and each needs its test files."]);
  after("cache-scaler", "The versioned-filename trick", { h: "The update flow, step by step", blocks: [
    ["p", "When an admin edits the input file for problem 200:"],
    ["steps", [["Upload the new file to S3", "S3 returns <code>new_path</code>."], ["Update the metadata in MySQL", "Set the new path and bump the timestamp (the notes' pseudo-SQL, written properly):"], ["The next submission sees the new version", "Any server: the lookup returns a new <code>updated_at</code>, so the local file <code>200_&lt;old&gt;_input.txt</code> doesn't match. Miss → fetch from <code>new_path</code> → save as <code>200_&lt;new&gt;_input.txt</code>."], ["Old versions fade away", "Nothing reads the old filename again, and normal disk eviction deletes it eventually."]]],
    ["code", "UPDATE problems_test_data\n   SET input_filepath   = :new_path,\n       input_updated_at = NOW()\n WHERE problem_id = 200;\n\n-- every submission (same round trip it already makes):\nSELECT input_filepath, input_updated_at, output_filepath, output_updated_at, solved, score\n  FROM problems_test_data JOIN user_problem USING (problem_id)\n WHERE problem_id = 200 AND user_id = :uid;"],
    ["tip", "<b>CPU-bound vs I/O-bound.</b> Running the code is CPU-bound, while fetching a 2 s test file is I/O-bound: the server sits idle waiting. Caching removes the I/O wait so the CPU spends its time judging. Whenever a task spends most of its time waiting on the network or disk, look for a cache."]
  ]});
  after("cache-scaler", "Redis eviction", { h: "Hands-on: watch LRU eviction happen", blocks: [
    ["p", "The notes' experiment, which you can run in a few minutes with a local Redis and Python:"],
    ["code", "import redis\nr = redis.Redis()\nr.config_set(\"maxmemory-policy\", \"allkeys-lru\")\nr.config_set(\"maxmemory\", \"1mb\")\nr.flushall()\n\nfor i in range(5000):  r.set(f\"key-{i}\", \"x\" * 100)   # fill\nfor i in range(1000):  r.get(f\"key-{i}\")              # touch 0–999 (recently used)\nfor i in range(5000, 10000): r.set(f\"key-{i}\", \"x\" * 100)  # flood past 1 MB\n\nprint(r.get(\"key-1\"), r.get(\"key-1000\"))   # key-1 survives, key-1000 likely evicted\nprint(r.info(\"stats\")[\"evicted_keys\"])"],
    ["p", "Result: keys 0–999 (read just before the flood) mostly survive, keys 1,000–4,999 (written but never read) are evicted heavily, and the second batch is evicted in creation order. That's LRU behaviour, approximated by sampling."]
  ]});
  after("cache-scaler", "Redis Cluster", { h: "Hands-on: a 3-master Redis Cluster in Docker", blocks: [
    ["code", "# redis.conf on every node\nport 6379\ncluster-enabled yes\ncluster-config-file nodes.conf\ncluster-node-timeout 5000\nappendonly yes\n\n# 6 containers on one network\ndocker network create redis-cluster\nfor i in 1 2 3 4 5 6; do docker run -d --name redis-$i --net redis-cluster \\\n  -v $PWD/redis.conf:/usr/local/etc/redis/redis.conf redis redis-server /usr/local/etc/redis/redis.conf; done\n\n# 3 masters + 3 replicas (pass all 6 IPs)\ndocker exec -it redis-1 redis-cli --cluster create <ip1>:6379 ... <ip6>:6379 --cluster-replicas 1\n\ndocker exec -it redis-1 redis-cli -c\n> set foo bar      -> Redirected to slot [12182] located at 172.19.0.2:6379\n> set hello world  -> Redirected to slot [866] located at 172.19.0.4:6379"],
    ["p", "<code>foo</code> and <code>hello</code> hash to different slots owned by different masters, and the <code>-c</code> client follows the redirects automatically. Kill a master and its replica takes over within <code>cluster-node-timeout</code>."]
  ]});

  /* ═════════════ LESSON 5: Facebook feed ═════════════ */
  extend("fb-feed", "Setup", ["img", "Outside Facebook Data Center.jpg", "Facebook's data centre in Prineville, Oregon: the kind of building that serves a billion news feeds."]);
  extend("fb-feed", "Setup",
    ["table", ["Table", "Columns", "Sharded by"], [["Users", "user_id, name, photo_url, …", "user_id"], ["User_friends", "user_id, friend_id", "user_id"], ["Posts", "post_id, user_id, text, media_path, location_id, created_at", "user_id"]]],
    ["code", "-- profile page: one shard, cheap\nSELECT * FROM Posts WHERE user_id = :uid ORDER BY created_at DESC LIMIT 20 OFFSET :page;"]
  );
  after("fb-feed", "Do the math", { h: "Why the 80-20-1 rule matters", blocks: [
    ["p", "On social platforms, roughly <b>1%</b> of daily users create content, <b>20%</b> interact (like, comment) and <b>80%</b> only read. That makes the system overwhelmingly <b>read-heavy</b>, and it's why only ~5M of 500M daily users post. Design for reads first."],
    ["p", "The 300-byte post estimate leaves out photos and videos on purpose: those live in object storage behind a CDN, and the post row only stores a ~24-byte path. Text is assumed slightly longer than Twitter's old 140-character limit."]
  ]});
  extend("fb-feed", "The design", ["code", "-- 1) friends, from X's own shard\nSELECT friend_id FROM User_friends WHERE user_id = :x;\n\n-- 2) feed, from ANY replica of the recent-posts store\nSELECT * FROM recent_posts WHERE user_id IN (:friend_ids)\n ORDER BY created_at DESC LIMIT 20 OFFSET :page;\n\n-- nightly cron job keeps the store bounded to 30 days\nDELETE FROM recent_posts WHERE created_at < NOW() - INTERVAL 30 DAY;"],
    ["tip", "Two lessons from this case study: a <b>cache doesn't have to be RAM</b>, since a replicated 180 GB disk store is a cache of derived data; and <b>read replicas</b> are the tool for scaling a read-heavy derived dataset."]);

  /* ═════════════ LESSON 6: CAP & replication ═════════════ */
  extend("cap", "CAP, told as a story", ["img", "Optical fiber cable-06ASD.jpg", "A fibre-optic cable. A network partition is often literally a cut, unplugged or overloaded link like this between two machines or data centres."]);
  after("cap", "Master-slave", { h: "When the master dies", blocks: [
    ["steps", [["Detect", "Replicas (or an orchestrator, or ZooKeeper) notice the master's heartbeats have stopped."], ["Elect", "The most up-to-date replica is promoted. With async replication it may be missing the last few acknowledged writes, which is the data-loss window."], ["Redirect", "Clients and the other replicas learn the new master's address (DNS change, a virtual IP, or a ZooKeeper watch)."], ["Rejoin", "If the old master comes back, it must rejoin as a slave and discard any writes the new master never saw."]]],
    ["warn", "<b>Split brain:</b> if the old master was only partitioned, not dead, two masters may accept writes at once. Coordination systems that use majority quorums (next lessons) exist to prevent this."]
  ]});
  after("cap", "How MySQL replicates", { h: "Hands-on: MySQL replication in Docker", blocks: [
    ["p", "The reading's lab, condensed. Two <code>mysql:8</code> containers, <code>masternode</code> and <code>slavenode</code>, with database <code>scalerdb</code>:"],
    ["code", "# master.conf                      # slave.conf\n[mysqld]                           [mysqld]\nserver-id = 1                      server-id = 2\nlog_bin = 1                        log_bin = 1\nbinlog_format = ROW                binlog_do_db = scalerdb\nbinlog_do_db = scalerdb\n\n-- on the master\nCREATE USER 'replication_user'@'%' IDENTIFIED WITH mysql_native_password BY '…';\nGRANT REPLICATION SLAVE ON *.* TO 'replication_user'@'%';\nFLUSH PRIVILEGES;\nSHOW MASTER STATUS;          -- File: 1.000003   Position: 851\n\n-- on the slave\nCHANGE MASTER TO MASTER_HOST='172.17.0.2', MASTER_USER='replication_user',\n  MASTER_PASSWORD='…', MASTER_LOG_FILE='1.000003', MASTER_LOG_POS=851;\nSTART SLAVE;\nSHOW SLAVE STATUS\\G\n\n-- on the master\nCREATE TABLE customers (id INT AUTO_INCREMENT PRIMARY KEY, firstname TEXT, lastname TEXT,\n  address TEXT, city TEXT, unique_id VARCHAR(36));\nINSERT INTO customers (firstname, lastname, address, city, unique_id)\n  VALUES ('Joydeep','Mukherjee','Sakti Statesman, Bellandur','Bangalore', UUID());"],
    ["p", "Run <code>SELECT * FROM customers</code> on the slave right away and you may get an empty set. A moment later the row appears. That's <b>replication lag</b>, and eventual consistency you can see. On AWS the same setup is a few clicks: an <b>RDS read replica</b> (async) or <b>Multi-AZ</b> (a synchronous standby with automatic failover)."],
    ["extra", "<b>Read-your-writes:</b> after a user updates their profile, a read from a lagging replica may show the old version. Common fixes are to read from the master for a few seconds after a write, or to route that user's reads to the master."]
  ]});

  /* ═════════════ LESSON 7: SQL vs NoSQL ═════════════ */
  extend("sql-nosql", "Where SQL struggles", ["img", "Datacenter Server Racks (22370909788).jpg", "Once one table spans many machines like these, JOINs and transactions across them become slow and fragile."]);
  after("sql-nosql", "What SQL gives you", { h: "ACID, one letter at a time", blocks: [
    ["table", ["Letter", "Guarantee", "Example"], [["Atomicity", "All statements of a transaction commit, or none do", "Debit A and credit B: never just one of them"], ["Consistency", "Rules hold before and after (may be broken mid-transaction)", "Balance never ends below 0; foreign keys stay valid"], ["Isolation", "Concurrent transactions don't see each other's half-done work", "Two ATMs don't both see ₹1,500 and both withdraw ₹1,000"], ["Durability", "Committed data survives crashes and reboots", "After \"success\", a power cut doesn't undo the transfer"]]],
    ["p", "<b>Normalization, with an example.</b> If a student's score is stored in both <code>students</code> and <code>leaderboard</code>, an update that touches only one leaves two different scores, and you don't know which to trust. Normalize: store the score once and reference it."],
    ["code", "-- ❌ duplicated fact\nstudents(id, name, score)        leaderboard(student_id, name, score)\n\n-- ✅ normalized\nstudents(id, name)               scores(student_id → students.id, score)"],
    ["p", "<b>Bank transfers across systems (from the Q&A).</b> Sending ₹1,000 from A to B: A's side moves to <code>send_initiated</code> and is debited. When B's bank confirms, it moves to <code>send_completed</code>. If B's credit fails permanently, A's debit is rolled back and the ₹1,000 returns. Money \"coming back after 1–2 days\" is the bank retrying and then giving up."]
  ]});
  after("sql-nosql", "Choosing a sharding key", { h: "The five sharding-key quizzes, worked", blocks: [
    ["steps", [["Banking: UserID ✓", "Users hold accounts in several cities. Balance, history and \"my accounts\" are all per user, so UserID keeps each on one shard. CityID fails: users move, cities differ hugely in size, and multi-city users fan out."], ["Uber: CityID ✓", "\"Find nearby drivers\" only needs your city. DriverID scatters nearby drivers across all shards. PIN code makes cabs migrate between shards constantly."], ["Slack: GroupID ✓", "A channel can have 100,000 members. UserID means one write per member per message, while GroupID means one write. Unread counts and the channel list load lazily from a small per-user index."], ["IRCTC: TrainID ✓", "No double-booking: all berths of a train sit on one shard, so allocation is local and atomic. Date of journey melts one shard at every tatkal opening. UserID can't prevent two users getting the same berth without checking every shard."], ["First letter of username ✗", "Far more names start with 'a' than 'x', there's a hard cap of 26 shards, letter frequencies are hard to predict, and a hot letter can't be split."]]],
    ["tip", "Composite keys can also work, for example (city, driver) or (channel, time bucket) as Discord does. Avoid <b>hierarchical</b> sharding schemes where one parent machine failing makes everything under it unreachable."]
  ]});
  after("sql-nosql", "NoSQL families", { h: "ACID on top of NoSQL, and two open problems", blocks: [
    ["p", "NoSQL stores rarely give multi-key ACID transactions. The notes' way to build them: route all writes for a dataset through a <b>central shard</b> that hands out <b>write locks</b>. Acquire the lock, write, release. That gives atomicity and isolation at the cost of a bottleneck."],
    ["p", "The lecture ends with two homework problems that lead into the next two lessons:"],
    ["list", ["<b>Variable-size values:</b> SQL is easy to store because the maximum record size is known. NoSQL values can grow without limit. How do you lay them out on disk so reads are fast and updates are cheap? → <a href=\"#/lesson/lsm\">NoSQL internals</a>.", "<b>Manual sharding:</b> design the black box that adds shards and restores the replication level when machines die. → <a href=\"#/lesson/shard-ops\">Orchestration & shard creation</a>."]]
  ]});

  /* ═════════════ LESSON 8: shard ops ═════════════ */
  after("shard-ops", "Creating a shard", { h: "Rules of thumb from the discussion", blocks: [
    ["list", ["<b>One machine belongs to exactly one shard.</b> Sharing machines across shards breaks consistent hashing and doesn't scale.", "<b>Heartbeats are nearly free:</b> a few bytes per second, one of 65,536 sockets. Skipping them saves under 0.1% and costs you failure detection.", "<b>Rack-aware placement:</b> a shard's replicas go on different racks, so a rack's power or switch failure can't take out every copy.", "<b>Data-centre-aware placement:</b> for disaster recovery, keep at least one replica in another data centre.", "<b>How many spares?</b> Reserved = X × number of shards, where X comes from how many machines tend to fail at the same time, which depends on hardware quality and age. Estimate the probability of k simultaneous failures and size X for it."]],
    ["tip", "A reboot doesn't lose acknowledged data: the node replays its write-ahead log (next lesson) to rebuild its in-memory state before rejoining."]
  ]});

  /* ═════════════ LESSON 9: LSM ═════════════ */
  extend("lsm", "Derive it", ["img", "Hard disk head on platter.jpg", "A disk head has to physically move for every random read or write (~10 ms). Appending to the end of a log avoids that seek."]);
  after("lsm", "Play with an LSM tree", { h: "Reads, recovery and wide rows in detail", blocks: [
    ["code", "get(key):\n  if key in memtable:            return memtable[key]          // tombstone → \"not found\"\n  for sst in sstables (newest → oldest):\n    if not sst.bloom.mightContain(key): continue               // skip: no disk read\n    block = sst.sparseIndex.floor(key)                        // last block whose first key ≤ key\n    if key in read64KB(sst, block): return value             // tombstone → \"not found\"\n  return \"not found\""],
    ["steps", [["Crash recovery", "RAM (the memtable) is lost on a crash. Before serving again, replay WAL entries written since the last flush. It's fast because it's in-memory work; reading the WAL from disk is the slow part."], ["Wide rows (column families)", "Writes append (row key, column family) entries to the memtable. Compaction <b>merges</b> the entries rather than keeping only the latest, and a \"last N entries\" read collects from the memtable, then from successive SSTables, until it has N."], ["Deletes are tombstones", "SSTables are immutable, so a delete writes a marker. The newest version found is the tombstone, so the key reads as gone. Compaction physically drops it later."], ["Why deleting is cheaper than writing", "An aside from the notes: deleting a file just drops a reference (which is why deleted files can be recovered), while writing must change every bit."]]],
    ["extra", "<b>Compaction strategies.</b> <i>Size-tiered</i> merges SSTables of similar size: cheap writes, more files to check on reads. <i>Leveled</i> keeps each level's SSTables non-overlapping: more rewriting, faster reads. Cassandra lets you choose per table: read-heavy → leveled, write-heavy → size-tiered."]
  ]});

  /* ═════════════ Case studies ═════════════ */
  extend("typeahead", "1 · Requirements", ["img", "Keyboard Closeup 02 (203533165).jpeg", "Suggestions have to arrive before the next keystroke, roughly within 100 ms of each key press."]);
  extend("typeahead", "5a · Trie", ["code", "class TrieNode {\n  children: Map<char, TrieNode>   // up to 26 (or 36 with digits)\n  frequency: number               // > 0 only if a full term ends here\n  top5: [term, frequency][]       // cached answer for this prefix\n}\n\ngetSuggestions(prefix):  walk prefix → return node.top5          // O(len(prefix))\nupdateFrequency(term):   walk term → frequency++ →\n                         for each ancestor: re-rank its top5 if term qualifies"]);
  extend("messaging", "Requirements", ["img", "Cell Tower in Stykkishólmur.jpg", "Messages travel over mobile networks like this one: connections drop, packets get lost, and clients retry, which is why sends must be idempotent."]);
  extend("messaging", "Sharding key", ["code", "-- conversationId sharding needs a secondary index for the inbox list\nconversations_by_user(user_id, last_message_at DESC, conversation_id, snippet)\n\n-- sendMessage then costs 3 writes:\n1) messages(conversation_id, message_id, sender, text, ts)      -- conversation shard\n2) upsert conversations_by_user(sender, ...)                     -- sender's list\n3) upsert conversations_by_user(recipient, ...)                  -- recipient's list"]);
  extend("search", "The inverted index", ["img", "Card catalog at the Indiana State Library - cabinet exterior.jpg", "A library card catalogue is an inverted index on paper: look up a subject and get the list of books (documents) about it."]);
  extend("search", "Elasticsearch", ["p", "<b>A concrete layout (from the notes):</b> 3 nodes, an index with 2 primary shards (0 and 1) and replicas. With few nodes, several shard copies share a node, and adding nodes spreads them out automatically. Some search APIs return <b>partial results</b> when a shard is unavailable, choosing speed and availability over completeness."]);
  extend("storage-geo", "Storing very large files", ["img", "Seagate ST33232A hard disk inner view.jpg", "HDFS runs on many cheap commodity disks like this, so it assumes disks will fail and replicates every block three times."]);
  extend("storage-geo", "The quadtree", ["code", "findGrid(x, y, node):\n  if node.isLeaf: return node.gridId\n  xMid = (node.x1 + node.x2) / 2;  yMid = (node.y1 + node.y2) / 2\n  if x <  xMid and y >= yMid: return findGrid(x, y, node.NW)\n  if x >= xMid and y >= yMid: return findGrid(x, y, node.NE)\n  if x <  xMid and y <  yMid: return findGrid(x, y, node.SW)\n  return findGrid(x, y, node.SE)                       // O(log N)"]);
  extend("video", "Q1", ["img", "TVB Pay Vision satellite dish (Hong Kong).jpg", "Traditional broadcast sends one signal to everyone. Internet streaming has to adapt to each viewer's own connection."]);
  extend("video", "Q3", ["img", "A flood light at the D Y Patil Stadium (5739171528).jpg", "Floodlights at the DY Patil Stadium in Navi Mumbai. During a big match, millions of people are watching the same ball at the same moment."]);

  /* ═════════════ Kafka & ZooKeeper ═════════════ */
  after("kafka-zk", "Kafka, from first principles", { h: "From the Kafka reading: topics, offsets and the Scaler use case", blocks: [
    ["p", "<b>The motivating story.</b> Thousands of Scaler learners are active at once: asking questions in live classes, reacting, solving problems, checking the leaderboard, ordering swag. Every action should be recorded for ML, search and reports, along with device and location. That must not slow the app, and it must still work at 10× today's load. So the app publishes events to Kafka and moves on, and consumers process them at their own pace."],
    ["table", ["Topic type", "Retention", "Use"], [["Regular", "Deleted after a time or size limit", "Event streams: clicks, orders, logs"], ["Compacted", "Keeps the <b>latest message per key</b> indefinitely", "Current state: a user's latest profile, config"]]],
    ["steps", [["Consumers track an offset per partition", "\"I've processed up to message 1,204 in partition 2.\""], ["Process first, then acknowledge", "The offset advances only when you commit it. If the consumer crashes before committing, the message is delivered again."], ["So consumers must be idempotent", "At-least-once delivery means duplicates are possible. Dedupe by message id, as in the messaging lesson."]]],
    ["p", "Kafka is fast (latency as low as ~2 ms per the reading) because brokers append to disk sequentially and serve reads straight from the OS page cache. It's fault tolerant because every partition is replicated to several brokers <i>within</i> the cluster. (The reading mislabels this \"intra-cluster replication\" as copying to another cluster; cross-cluster copying is a separate tool, MirrorMaker.)"]
  ]});

  /* ═════════════ IDs & rate limiters ═════════════ */
  extend("ids-limits", "Twitter Snowflake", ["img", "Snowflake macro photography 1.jpg", "No two snowflakes are alike, which is the joke behind the name. Each ID is unique without the machines ever talking to each other."]);
  extend("ids-limits", "Rate limiters", ["img", "86 Street turnstiles vc.jpg", "A turnstile is a physical rate limiter: it lets people through at a pace the platform can handle."]);
  after("ids-limits", "Rate limiters", { h: "The window algorithms, worked with the notes' numbers", blocks: [
    ["steps", [["Sliding window log (a deque per IP)", "Window 5 s. At t = 15 the deque is [10, 11, 12, 12, 13, 14, 15]. A request arrives at t = 16, so the cutoff is 16 − 5 + 1 = 12: pop everything below 12, leaving [12, 12, 13, 14, 15]. If the size is under the limit, push 16 and allow. Exact, but with ~10k requests per window the deque is big and evictions are slow."], ["Fixed window counter", "Limit 100 per 50 s, one counter per window. Flaw: 100 requests at 40–50 s plus 100 at 51–60 s gives <b>200 in about 20 s</b>, double the limit, because the counter resets at 50 s."], ["Sliding window counter", "Keep just (previous count, current count) per IP. Windows of 50 s: the previous one (51–100) had 60 requests, and the current one (101–150) has 40 so far at t = 120 (40% elapsed). Estimate = 60 × 0.6 + 40 = <b>76</b>, then compare with the limit. Near-exact with two integers."]]],
    ["code", "map<string ip, deque<int>>      // sliding log\nmap<string ip, int>             // fixed window\nmap<string ip, pair<int,int>>   // sliding counter: (prev, curr)"]
  ]});

  /* ═════════════ Microservices ═════════════ */
  extend("microservices", "What is a service", ["img", "Shipping container stacks - Port of Rotterdam - 2017 - 5.jpg", "Shipping containers standardise how goods move, whatever is inside. Service APIs do the same for how teams' code talks to each other."]);
  after("microservices", "SOA vs microservices", { h: "Pick the right tool per service", blocks: [
    ["p", "Each service picks its own stack and scales on its own, and that's the main payoff (from the notes):"],
    ["table", ["Service", "Needs", "Possible stack", "Scale"], [["ProductService", "Full-text search, speed, flexible schema for many categories", "Java Spring Boot + MongoDB + Elasticsearch", "Many app servers, sharded Mongo, big ES cluster"], ["UserService", "Simple, relational, low traffic", "Python + MySQL (unsharded)", "A few app servers, one DB"]]],
    ["p", "Rarely changing services deploy rarely, while busy ones deploy many times a day. Each has a clear API contract, so internal changes don't break others as long as the API behaves the same."]
  ]});
  extend("microservices", "Observability", ["code", "// application code publishes one number; an agent aggregates per minute\nods.publish(\"messagestore.latency\", 50);\nods.publish(\"notification.errors\", 1);\n\n// alert rule in the time-series DB\nIF p95(messagestore.latency, 5m) > 300 ms  OR  sum(notification.errors, 1m) > 100\nTHEN page on-call (PagerDuty / IVRS)"]);

  /* ═════════════ Microservice patterns ═════════════ */
  extend("ms-patterns", "The Saga pattern", ["p", "<b>Choreography at Flipkart (from the notes):</b> OrderService stores the order and publishes <code>new_order_created</code> (user, payment details, items, prices). InvoiceService, ProductService (to reduce inventory) and NotificationService all subscribe and run in parallel, each publishing its own event: <code>new_invoice_created</code>, <code>inventory_updated</code>, <code>user_notified</code>. On a permanent failure a service publishes e.g. <code>invoice_generation_failed</code>, and the services it affects subscribe to that event and roll back."]);
  extend("ms-patterns", "Circuit breaker",
    ["img", "Coloured Circuit Breaker Panel (1245142933).jpg", "Circuit breakers in an aircraft panel: each circuit trips on its own, so one faulty system can't take the others down with it. Software circuit breakers do the same for services."],
    ["code", "// the notes' pseudocode, cleaned up: failures are counted, and half-open is explicit\nfunction callNotifications(req) {\n  const b = redis.hgetall(\"breaker:notif\");            // { state, openedAt }\n  if (b.state === \"open\") {\n    if (Date.now() - b.openedAt < 30_000) return fallback(req);   // still cooling off: fail fast\n    redis.hset(\"breaker:notif\", { state: \"half-open\" });          // time to probe\n    b.state = \"half-open\";\n  }\n  if (b.state === \"half-open\" && Math.random() > 0.01) return fallback(req); // let ~1% through\n  try {\n    const res = notifications.send(req, { timeout: 2000 });\n    if (b.state === \"half-open\") redis.hset(\"breaker:notif\", { state: \"closed\" });\n    return res;\n  } catch (e) {\n    if (!isInfraError(e)) throw e;                     // \"user not found\" doesn't count\n    const fails = redis.incr(\"breaker:notif:fails\"); redis.expire(\"breaker:notif:fails\", 60);\n    if (b.state === \"half-open\" || fails > 100)        // >100 failures in a minute → open\n      redis.hset(\"breaker:notif\", { state: \"open\", openedAt: Date.now() });\n    return fallback(req);\n  }\n}"]
  );
})();
