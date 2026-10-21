/* Blueprint course — lesson: Caching: CDNs, local & global caches, invalidation, eviction */
BP.LESSONS.push({
  id: "caching",
  mod: "cache",
  icon: "⚡",
  minutes: 50,
  title: "Caching: CDNs, local & global caches, invalidation, eviction",
  scaler: "HLD 3 · Caching: CDN + Backend Caches, Cache Invalidation",
  summary: "Every place data can be cached (browser, CDN, local, global, distributed), how TTL keeps it fresh, the three write policies (write-through, write-back, write-around) in detail, eviction algorithms, and how they combine into cache consistency.",
  concepts: ["memory-hierarchy","caching","cdn","ttl","write-policies","eviction"],
  related: ["bitly","netflix"],
  sections: [
    { h: "Why caching works: the memory hierarchy", blocks: [
      ["p","<b>Caching</b> means keeping a copy of data somewhere <b>faster or closer</b> than where it really lives, so the next read is quicker. It works because every storage level trades size and cost for speed, often by 100× per step, and because real traffic is skewed: a small set of hot items gets most of the requests."],
      ["fig","memory","Click tiers to fetch from them. Toggle humanize: if an L1 hit took 1 second, a disk seek would take months."],
      ["p","The notes anchor the idea with three numbers that come back in the next lesson:"],
      ["table",["Read","Time","Relative"],[["A file on the app server's own disk","~40 ms","1×"],["A table or column from the MySQL machine","~50 ms","≈1.25×"],["A large test file from remote file storage (S3)","~2 s","50×"]]],
      ["analogy","Your desk drawer (cache) versus the office storeroom (database) versus the warehouse across town (remote storage). You keep what you use daily in the drawer."],
      ["chart",{"type":"bar","title":"How long one fetch takes","data":[["L1 cache",1],["RAM",100],["SSD read",100000],["Same-datacenter round trip",500000],["Disk seek (HDD)",10000000],["California ↔ Netherlands",150000000]],"fmt":"ns","log":true,"highlight":1}]
    ] },
    { h: "The two problems every cache has", blocks: [
      ["p","Before choosing a cache, recognise its two built-in limitations, because every technique in this lesson exists to manage one of them:"],
      ["steps",[["It is limited in size","RAM is expensive, so the cache can't hold everything. When it's full, something must go. That's <b>eviction</b>."],["It is not the source of truth","It holds a <i>copy</i>. When the database changes, the copy can be wrong. That's <b>staleness</b>, managed by <b>invalidation</b> (TTL) and <b>write policies</b>."]]],
      ["p","The notes pose them as two questions: <i>What do you have that doesn't become inconsistent?</i> and <i>How do you add entries when the cache is full?</i> Keep both in mind for the rest of the lesson."]
    ] },
    { h: "Where can we cache? The journey of a request", blocks: [
      ["p","A request passes through several layers, and each can answer it from a cache. It stops at the first layer that has the data; layers below never see it."],
      ["fig","cachepath","Pick a scenario and send a request. Click a layer to toggle whether it holds the data."],
      ["table",["Layer","Lives where","Typical contents","Who shares it"],[["Browser cache","On the user's device","DNS answers, JS, CSS, images","One user"],["CDN","Edge servers in every region","Images, video, static files","Everyone in that region"],["Local cache","In the app server's RAM or disk","Hot rows, large files","One server"],["Global cache","A separate Redis/Memcached tier","Hot or derived data","All app servers"],["Distributed cache","A cluster of cache servers","Same as global, at scale","All app servers"]]]
    ] },
    { h: "Browser caching", blocks: [
      ["p","The browser keeps two kinds of things: <b>DNS results</b> (so it doesn't resolve <code>del.icio.us</code> again on every request) and <b>static assets</b> (images, videos, JavaScript, CSS). These entries are small and rarely change, which is why the <b>first visit</b> to a site is slow and <b>later visits</b> are fast."],
      ["extra","The server controls browser caching with HTTP headers. <code>Cache-Control: max-age=31536000, immutable</code> says \"keep this for a year\". For HTML that changes, <code>no-cache</code> plus an <code>ETag</code> lets the browser ask \"has it changed?\" and get a tiny <code>304 Not Modified</code>. To ship a new version of a long-cached file, change its name: <code>app.3f9a1c.js</code>. That's the same versioning trick as the code-judge case study."],
      ["code","HTTP/1.1 200 OK\nContent-Type: text/javascript\nCache-Control: public, max-age=31536000, immutable\nETag: \"3f9a1c\""]
    ] },
    { h: "CDN: bringing files closer to users", blocks: [
      ["p","<b>The problem.</b> Delicious's servers and file storage are in the US, and a user is in India. The path is browser → LB → app server → file storage, and transfers inside a region are fast while transfers across continents are slow. Multimedia is large, so this hurts most for images and video."],
      ["img","Submarine cables.png","A map of undersea cable routes around Europe. Traffic between continents travels thousands of kilometres through cables like these: a California ↔ Netherlands round trip costs about 150 ms, and that's exactly what a CDN avoids."],
      ["steps",[["Copy files to every region","A CDN provider (Akamai, Cloudflare, Amazon CloudFront, Fastly) runs servers in many regions and copies your files to them."],["Return region-specific links","Your HTML (small) can still come from the origin, even in the US. Images and videos are referenced by <b>CDN links</b> that resolve to the nearest region."],["Download from the nearest edge","The heavy bytes travel a short distance instead of across an ocean."],["Pay per use","You pay for the bandwidth and requests you use, without building data centres everywhere."]]],
      ["p","<b>How does the browser reach the nearest edge?</b> Two ways from the notes: (1) <b>ISP integration</b>: many ISPs host CDN nodes inside their own network (Netflix's Open Connect is the famous example); (2) <b>Anycast</b>: the same IP address is announced from many locations, and internet routing naturally delivers you to the closest one."],
      ["tip","A CDN <i>is</i> a cache: it has limited space and a TTL, and it can go stale. Put content there that is identical for many users and changes rarely. Personalised or private responses don't belong on shared edges."]
    ] },
    { h: "Local cache (on the app server)", blocks: [
      ["p","A local cache lives inside each app server, in memory or on its own disk, so repeated reads don't hit the database. The notes tell it through <b>Nile.com</b>: during a New Year sale, the database was overloaded by the <i>same</i> queries over and over, and response times went above 200 ms. Adding local caches brought latency back under the threshold, but three problems remained:"],
      ["table",["Problem","Why it happens"],[["Cache misses","The load balancer spreads users across servers, so each server's cache only ever sees part of the traffic and holds part of the data."],["Stale data","An update reaches the database and maybe one server's cache, but not the copies on every other server."],["Memory and coupling","The cache eats app-server RAM, and the app tier and cache tier can't scale independently."]]],
      ["tip","Local caches shine when the data is <b>large and cheap to validate</b>, like the code judge's test files in the next lesson, where a tiny DB lookup proves the local copy is current."]
    ] },
    { h: "Global cache (Redis, Memcached)", blocks: [
      ["p","A <b>global cache</b> is a separate cache tier that every app server talks to. All servers see the same cached data (a single source of truth <i>for cached data</i>; the database remains the real source of truth), and the cache scales separately from the app. The cost is one network hop (~0.5–1 ms), which is still far cheaper than a database query."],
      ["p","<b>When to use a global cache (from the notes):</b>"],
      ["list",["<b>Data queried very often</b>, such as a popular product, a session, or a feature flag.","<b>Derived information</b> that is expensive to compute in the database, such as a contest ranklist, a counter, or an aggregated dashboard."]]
    ] },
    { h: "Distributed cache", blocks: [
      ["p","One global cache machine is itself a <b>single point of failure</b> and a <b>capacity ceiling</b>. Scaling it vertically gets expensive fast (RAM is costly), and swapping it for a cluster later means \"massive changes\". So at scale, the global cache becomes a <b>cluster</b>: keys are spread across nodes (consistent hashing, or Redis Cluster's 16,384 hash slots) and each node has replicas."],
      ["tip","You almost never build this yourself. Use Redis Cluster or a managed service (ElastiCache, Memorystore). The next lesson walks through Redis Cluster hands-on."]
    ] },
    { h: "Invalidation with TTL", blocks: [
      ["p","<b>TTL (time to live)</b> is the simplest way to stop serving stale data: every entry expires after a fixed time and is refetched on the next request. It's a periodic refresh, and it suits data that may be slightly stale for a short window."],
      ["steps",[["T","X is fetched from the database and cached with TTL = 60 s."],["T + 1 … T + 60","Every request for X is a cache hit."],["T + 61","X has expired. The next request misses, reads X from the database, and caches it again for another 60 s."]]],
      ["table",["TTL","What happens","Problem"],[["Too low (1 min)","Entries expire constantly","High miss rate: lots of slow trips to the source"],["Too high (60 min)","Entries live a long time","Stale data: an edited file isn't seen for up to an hour"]]],
      ["tip","TTL is a guess about how stale is acceptable. Choose it by balancing <b>miss rate</b> against the <b>staleness window</b>. When a change must show up <i>immediately</i>, TTL isn't enough: combine it with a write policy, or use versioned keys."],
      ["extra","Thousands of hot keys expiring at the same second all miss together and stampede the database. Add random jitter to TTLs (60 s ± 10%) so expiries spread out."]
    ] },
    { h: "Write policies: keeping the cache and the database in sync", blocks: [
      ["p","Reads are only half the story. When data is <b>written</b>, the cache and the database must stay in agreement somehow. There are three classic policies, and they differ in one question: <b>where does the write go first, and when do we tell the client “success”?</b>"],
      ["table",["Policy","Write goes to","Client hears success after","In one line"],[["Write-through","Cache, then DB (synchronously)","Both are updated","Always consistent, slower writes"],["Write-back","Cache only; DB later","The cache is updated","Fastest writes, can lose data"],["Write-around","DB only; cache skipped","The DB is updated","Cache isn't polluted, next read misses"]]],
      ["p","The next three sections take them one at a time."]
    ] },
    { h: "Write-through cache", blocks: [
      ["p","Every write goes <b>through the cache first</b> (there may be several cache machines), then to the database, and only when both are updated does the client get \"success\". If the database write fails, the cache change is <b>reverted</b>, so the two never disagree."],
      ["flow",{"nodes":[{"id":"u","x":100,"y":225,"label":"Client","sub":"write x = 5","kind":"client","icon":"🧑‍💻","desc":"Sends a write and waits for “success”."},{"id":"app","x":340,"y":225,"label":"App server","sub":"applies the policy","kind":"service","icon":"⚙️","desc":"Decides where the write goes first."},{"id":"c","x":640,"y":90,"label":"Cache","sub":"RAM, fast","kind":"cache","icon":"⚡","desc":"Holds a copy of hot data."},{"id":"db","x":640,"y":360,"label":"Database","sub":"disk, source of truth","kind":"db","icon":"🗄️","desc":"The real copy."}],"flows":[{"name":"Write-through","steps":[["u","app","PUT x = 5"],["app","c","1) Update the cache: x = 5"],["app","db","2) Write the database: x = 5 (synchronous)"],["db","app","DB confirms. (If it failed, revert the cache entry.)"],["app","u","3) Success, only after both are updated"]]}]},"Write-through: the client waits for both the cache and the database."],
      ["table",["Pros","Cons"],[["Cache and DB are always consistent","Every write pays the database's latency"],["Reads right after a write are fresh hits","Data that's written but never read still fills the cache"],["No data loss if the cache dies",""]]],
      ["p","<b>Use it for read-heavy data that must be fresh:</b> product catalogues, user profiles, settings, and anything read immediately after it's written. The messenger case study uses write-through so a chat's cached history never disagrees with the database."]
    ] },
    { h: "Write-back (write-behind) cache", blocks: [
      ["p","The write goes <b>only to the cache</b>, and the client gets \"success\" right away. The cache marks the entry <i>dirty</i> and copies it to the database <b>asynchronously</b> later, often in batches."],
      ["flow",{"nodes":[{"id":"u","x":100,"y":225,"label":"Client","sub":"write x = 5","kind":"client","icon":"🧑‍💻","desc":"Sends a write and waits for “success”."},{"id":"app","x":340,"y":225,"label":"App server","sub":"applies the policy","kind":"service","icon":"⚙️","desc":"Decides where the write goes first."},{"id":"c","x":640,"y":90,"label":"Cache","sub":"RAM, fast","kind":"cache","icon":"⚡","desc":"Holds a copy of hot data."},{"id":"db","x":640,"y":360,"label":"Database","sub":"disk, source of truth","kind":"db","icon":"🗄️","desc":"The real copy."},{"id":"q","x":900,"y":225,"label":"Flush job","sub":"async, batched","kind":"queue","icon":"⏳","desc":"Copies dirty entries from the cache to the DB later, in batches."}],"flows":[{"name":"Write-back","steps":[["u","app","PUT x = 5"],["app","c","1) Update the cache, mark x dirty"],["app","u","2) Success immediately (sub-millisecond)"],["c","q","3) Later: the flush job collects dirty entries"],["q","db","4) Batched write to the database"]]}]},"Write-back: the client never waits for the database."],
      ["table",["Pros","Cons"],[["Lowest write latency, highest throughput","If the cache dies before flushing, acknowledged writes are lost"],["Batches many writes into one DB write","The database is temporarily behind the cache"],["Shields the DB from write spikes","More moving parts (flush job, dirty tracking)"]]],
      ["p","<b>Use it where losing an occasional write doesn't matter:</b> the notes' example is <b>analytics</b>. Losing one data point among millions doesn't change a trend. Also: view counters, likes, game scores updated many times a second."],
      ["extra","To make write-back safer, replicate the cache, or turn on Redis persistence (AOF), so dirty entries survive a crash."]
    ] },
    { h: "Write-around cache", blocks: [
      ["p","The write goes <b>straight to the database</b> and skips the cache. Any cached copy is now out of date, so it is deleted (invalidated) or left to expire through <b>TTL</b>. The next read misses and loads fresh data."],
      ["flow",{"nodes":[{"id":"u","x":100,"y":225,"label":"Client","sub":"write x = 5","kind":"client","icon":"🧑‍💻","desc":"Sends a write and waits for “success”."},{"id":"app","x":340,"y":225,"label":"App server","sub":"applies the policy","kind":"service","icon":"⚙️","desc":"Decides where the write goes first."},{"id":"c","x":640,"y":90,"label":"Cache","sub":"RAM, fast","kind":"cache","icon":"⚡","desc":"Holds a copy of hot data."},{"id":"db","x":640,"y":360,"label":"Database","sub":"disk, source of truth","kind":"db","icon":"🗄️","desc":"The real copy."}],"flows":[{"name":"Write-around","steps":[["u","app","PUT x = 5"],["app","db","1) Write the database only"],["app","c","2) Invalidate x (or let its TTL expire)"],["app","u","3) Success after the DB write"],["u","app","Later: GET x"],["app","c","Miss"],["app","db","Read x = 5 and populate the cache"]]}]},"Write-around: writes skip the cache; the first read after a write is a miss."],
      ["table",["Pros","Cons"],[["The cache isn't filled with data nobody reads","The first read after every write is a miss"],["Writes are as fast as the DB","Without invalidation, reads can be stale until TTL expires"]]],
      ["p","<b>Use it for data that's written often but read rarely, or read much later:</b> logs, audit trails, bulk imports, chat history older than a few days."]
    ] },
    { h: "Write policies side by side", blocks: [
      ["fig","writepolicy","Write, read, and crash the cache under each policy. Watch latency, consistency and what's at risk."],
      ["table",["","Write-through","Write-back","Write-around"],[["Write latency","High (cache + DB)","Lowest (cache only)","DB speed"],["Read right after write","Hit, fresh","Hit, fresh","Miss (then fresh)"],["Cache vs DB","Always in sync","DB lags behind","Cache may be stale until invalidated or TTL"],["Data loss if the cache crashes","None","Unflushed writes lost","None"],["Best for","Read-heavy, must be fresh","Write-heavy, loss-tolerant","Write-heavy, rarely re-read"]]],
      ["p","<b>Which would you pick?</b>"],
      ["list",["A click counter at 500k events/s for an analytics dashboard → <b>write-back</b>.","A product catalogue read 1,000× per update, with prices that must be right → <b>write-through</b>.","Nightly import of a million audit-log rows → <b>write-around</b>.","A chat app's recent message history → <b>write-through</b> (the messaging lesson)."]]
    ] },
    { h: "Reading patterns: cache-aside and read-through", blocks: [
      ["extra","The notes focus on write policies. On the read side, two names come up in interviews: <b>cache-aside</b> (lazy loading), where the application checks the cache and on a miss reads the DB and fills the cache itself; and <b>read-through</b>, where the cache library does that on the application's behalf. Cache-aside plus write-around (invalidate on write) is the most common combination in practice."],
      ["code","// cache-aside read\nfunction getUser(id) {\n  let u = cache.get(`user:${id}`);\n  if (!u) {                       // miss\n    u = db.query(\"SELECT * FROM users WHERE id = ?\", id);\n    cache.set(`user:${id}`, u, { ttl: 300 });\n  }\n  return u;\n}\n\n// write-around + invalidate\nfunction updateUser(id, fields) {\n  db.update(\"users\", id, fields);\n  cache.del(`user:${id}`);        // next read repopulates\n}"]
    ] },
    { h: "Eviction: what to throw out when full", blocks: [
      ["p","When the cache is full and a new entry arrives, something must leave. The goal is to evict the entry <b>least likely to be needed next</b>, so hits stay high. The notes cover four policies:"],
      ["table",["Policy","Evicts","Good when","Example (cache of 3, then access D)"],[["FIFO","The oldest <i>inserted</i> entry","Access is uniform","A, B, C inserted in order → evict A"],["LRU","The least <i>recently used</i> entry","Recent items are likely to be reused (most apps)","A, B, C, then A read again → evict B"],["LIFO","The newest inserted entry","Old entries are the valuable ones","A, B, C → evict C"],["MRU","The most recently used entry","Sequential scans: what you just read won't be read again","Reading a big file once → evict the block just read"]]],
      ["fig","eviction","The same accesses through three policies side by side. Play the sample sequence and compare hits."],
      ["extra","<b>LFU</b> (least frequently used) isn't in the notes, but Redis offers it. It keeps entries with high access counts, with counts that decay so formerly hot keys can age out."],
      ["p","<b>Implementing LRU in O(1).</b> Combine a hashmap (key → node) with a doubly linked list ordered by recency. A read moves the node to the head, and eviction removes the tail:"],
      ["code","class LRU {\n  constructor(cap) { this.cap = cap; this.map = new Map(); }   // Map keeps insertion order\n  get(k) {\n    if (!this.map.has(k)) return undefined;                   // miss\n    const v = this.map.get(k); this.map.delete(k); this.map.set(k, v);  // move to newest\n    return v;\n  }\n  set(k, v) {\n    this.map.delete(k); this.map.set(k, v);\n    if (this.map.size > this.cap) this.map.delete(this.map.keys().next().value); // evict oldest\n  }\n}"],
      ["tip","Redis doesn't do exact LRU. It samples a few keys (<code>maxmemory-samples</code>, default 5) and evicts the oldest among them. That's nearly as good and costs no extra memory per key."],
      ["chart",{"type":"line","title":"Hit ratio vs cache size","sub":"10,000 keys with Zipf-shaped popularity","x":{"label":"cache size (share of all keys)","values":["0.1%","0.5%","1%","5%","10%","20%","50%"]},"y":{"label":"hit ratio","max":100},"fmt":"pct","series":[{"name":"Hit ratio","values":[29.92527736794761,45.968394332183124,52.999451536323726,69.40229720091833,76.47907806039555,83.55841125492995,92.91862401789051]}],"note":"Caching just 1% of the keys serves about half of all requests, and 10% serves about three quarters. That's why small caches work."}]
    ] },
    { h: "Cache consistency: putting it together", blocks: [
      ["p","\"Cache consistency\" means: how long, and how often, can a read from the cache disagree with the database? Each tool from this lesson answers it differently:"],
      ["table",["Technique","Staleness","Cost"],[["TTL only","Up to the TTL","Simple; more misses as TTL drops"],["Write-through","None for writes that go through the cache","Slower writes"],["Write-around + invalidate","Tiny window between the DB write and the delete","First read after each write misses"],["Write-back","The DB lags (the cache is fresh)","Risk of losing unflushed writes"],["Versioned keys","None: stale versions are never read","Needs a cheap source for the current version"]]],
      ["warn","A classic race: request A reads the old value from the DB (cache miss) and, before it writes the cache, request B updates the DB and deletes the cache key. A then writes the <i>old</i> value into the cache. Short TTLs bound the damage. Delete-then-delete-again (delayed double delete) or versioned keys avoid it."]
    ] }
  ],
  quiz: [
    {"q":"An analytics click counter at huge QPS, where losing a few events is fine. Which write policy?","o":["Write-through","Write-back","Write-around","No cache"],"a":1,"why":"Write-back gives the lowest latency and highest throughput, and losing a few data points doesn't change trends."},
    {"q":"Why does write-around rely on TTL (or invalidation)?","o":["It's faster","Writes skip the cache, so something must eventually remove the stale copy","Redis requires it","To save memory"],"a":1,"why":"The cache isn't updated on writes. Expiry or explicit invalidation brings in fresh data."},
    {"q":"Profile pictures for users worldwide. Where's the best cache?","o":["App server memory","A CDN","The database buffer pool","The browser only"],"a":1,"why":"Static media served from edges near users, and the origin barely sees the traffic."},
    {"q":"Sequence A B C D A B E A B C D E with capacity 4: which policy keeps the hot key A best?","o":["FIFO","LRU or LFU","Random","None"],"a":1,"why":"FIFO evicts by insertion age even if A was just used. LRU and LFU account for usage."},
    {"q":"Write-through: the database write fails after the cache was updated. What should happen?","o":["Return success anyway","Revert the cache entry and return an error","Retry forever","Switch to write-back"],"a":1,"why":"Write-through's promise is that the cache and DB agree. A failed DB write means rolling back the cache change."},
    {"q":"Why do local caches on many app servers miss so often?","o":["RAM is slow","The load balancer spreads users, so each server's cache sees only part of the traffic","They use FIFO","They have no TTL"],"a":1,"why":"Each copy is partial, which is one reason a shared global cache can win."},
    {"q":"How does a browser reach the nearest CDN edge?","o":["It pings every edge","ISP-hosted CDN nodes or Anycast routing","DNS always returns the US origin","The user picks a region"],"a":1,"why":"Anycast announces one IP from many places; ISP integration puts nodes inside your ISP."}
  ],
  refs: [
    ["ByteByteGo: A guide to top caching strategies","https://blog.bytebytego.com/p/a-guide-to-top-caching-strategies"],
    ["AWS caching best practices","https://aws.amazon.com/caching/best-practices/"],
    ["MDN: HTTP caching","https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching"],
    ["AWS: What is a CDN?","https://aws.amazon.com/what-is/cdn/"],
    ["Latency numbers every programmer should know","https://gist.github.com/jboner/2841832"]
  ]
});
