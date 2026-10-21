/* Blueprint case study — Bitly: Design a URL Shortener. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "bitly",
  app: "Bitly",
  icon: "🔗",
  color: "#ff6a2b",
  color2: "#ffb347",
  title: "Design a URL Shortener",
  tagline: "Turn a 2,000-character link into 7 characters, then answer billions of clicks faster than a blink.",
  level: "Beginner",
  minutes: 27,
  concepts: ["base62","id-generation","kv-store","caching","http-redirects","message-queue"],
  stats: [
    {v: 3.52,d: 2,suf: "T",label: "unique 7-char Base62 codes",kind: "Math"},
    {v: 100,suf: ":1",label: "typical read : write ratio",kind: "Assumption"},
    {v: 10,pre: "<",suf: " ms",label: "redirect latency target",kind: "Design goal"}
  ],
  story: "You paste a monstrous link full of tracking parameters into a message. A second later it's <code>bit.ly/3xK9pQ2</code>. Someone in Tokyo clicks it and lands on the page before they notice a redirect happened.<br><br>Behind that tiny link are two classic system-design questions: <b>how do you hand out unique IDs at massive scale</b>, and <b>how do you answer reads so fast they feel free</b>?",
  requirements: {
    functional: ["Create a short code for any long URL","Redirect short → long when clicked","Optional custom aliases and expiry","Click analytics (counts, geography, referrer)"],
    nonFunctional: ["Redirects in milliseconds, worldwide","Extremely available: a dead shortener breaks links everywhere","Codes must never collide","Read-heavy: around 100 clicks for every link created"]
  },
  estimate: [
    ["New links / day","assumption","100 M"],
    ["Write QPS","100M ÷ 86,400 s","≈ 1,160 /s"],
    ["Read QPS (100:1)","1,160 × 100","≈ 116,000 /s"],
    ["Storage / year","100M × 365 × 500 B","≈ 18 TB"],
    ["Cache for hot links","20% of 10B daily reads × 500 B","≈ 1 TB RAM"]
  ],
  estimateNote: "Insight: writes are easy and reads are the whole game. With ~116k reads/sec, a single database would melt, so the design centers on caching.",
  naive: {
    title: "\"Just MD5 the URL and keep the first 7 characters\"",
    desc: "Hash the long URL, take a prefix, store it in a SQL table, and query that table on every click.",
    breaks: ["Collisions: by the birthday paradox, truncated hashes start colliding long before the space is full. Every insert needs a check-and-retry round trip.","Every click is a database query, and 116k QPS on one SQL box means latency spikes and then an outage.","The same URL from two users yields the same code, so you can't give them separate analytics or expiry."]
  },
  steps: [
    {
      t: "Give every link a unique number",
      c: "id-generation",
      b: "Use a counter instead of a hash, because counters never collide. A single auto-increment column would be a bottleneck and a single point of failure, so each app server <b>leases a block of IDs</b> (for example 1,000 at a time) from a coordinator such as ZooKeeper or a tiny DB table, then hands them out locally from memory.",
      a: "Each cashier gets a whole roll of numbered tickets instead of phoning the manager per customer. If a cashier quits mid-roll, a few numbers are skipped, and that's fine."
    },
    {
      t: "Squeeze the number with Base62",
      c: "base62",
      b: "Convert the ID to Base62 (<code>0-9 a-z A-Z</code>). 7 characters gives 62⁷ ≈ <b>3.5 trillion</b> codes, enough for 100M links/day for about 96 years. Sequential IDs are guessable (<code>abc1</code>, <code>abc2</code>…), so many systems scramble the ID with a reversible shuffle before encoding.",
      a: "It's like writing numbers with 62 digits instead of 10: same value, far fewer characters."
    },
    {
      t: "Store the mapping in a key-value store",
      c: "kv-store",
      b: "The access pattern is pure lookup, <code>code → long_url</code>, with no joins. A horizontally scalable KV store (DynamoDB, Cassandra) partitioned by code gives predictable single-digit-ms reads and grows by adding nodes.",
      a: "A coat check: hand over a ticket, get the coat. Nobody searches the racks."
    },
    {
      t: "Put a cache in front of everything",
      c: "caching",
      b: "Clicks are wildly skewed: a viral link might get millions of clicks while most get a handful. A Redis/Memcached layer with <b>LRU eviction</b> keeps hot codes in RAM. Cache-aside: check cache → on miss read DB → populate cache. A modest cache can absorb the vast majority of reads.",
      a: "Your favorite mug lives on the counter. The rest stay in the cupboard."
    },
    {
      t: "Choose the redirect type deliberately",
      c: "http-redirects",
      b: "<b>301 Permanent</b>: browsers cache it, so repeat clicks never reach you (less load, but blind analytics). <b>302 Temporary</b>: every click comes through you, so you can count it, A/B test it, or expire it. Analytics-driven products usually pick 302.",
      a: "A post-office forwarding order (301) vs. a sign on the door that everyone has to read (302)."
    },
    {
      t: "Record analytics off the critical path",
      c: "message-queue",
      b: "The redirect must not wait for analytics. The server fires a click event into Kafka and returns the redirect immediately. Consumers aggregate counts by link, country and hour into an analytics store.",
      a: "The waiter clips the order on the rail and goes back to the guests. The kitchen catches up."
    }
  ],
  diagram: {
    nodes: [
      {
        id: "u",
        x: 90,
        y: 220,
        label: "Browser",
        sub: "click / create",
        kind: "client",
        icon: "🧑‍💻",
        desc: "Users either create links (rare) or click them (constant)."
      },
      {
        id: "lb",
        x: 270,
        y: 220,
        label: "Load Balancer",
        sub: "L7, health checks",
        kind: "edge",
        icon: "⚖️",
        desc: "Spreads traffic over stateless app servers. Any server can handle any request."
      },
      {
        id: "app",
        x: 470,
        y: 220,
        label: "Shortener API",
        sub: "stateless ×N",
        kind: "service",
        icon: "⚙️",
        desc: "Allocates IDs from its leased range, encodes Base62, and performs redirects."
      },
      {
        id: "ids",
        x: 470,
        y: 70,
        label: "ID Range Service",
        sub: "leases 1,000 IDs",
        kind: "service",
        icon: "🎫",
        desc: "Hands out disjoint ID blocks. It's touched once per 1,000 links, so it's never a bottleneck."
      },
      {
        id: "cache",
        x: 700,
        y: 140,
        label: "Redis Cache",
        sub: "LRU, hot codes",
        kind: "cache",
        icon: "⚡",
        desc: "Serves most redirects from RAM in well under a millisecond."
      },
      {
        id: "db",
        x: 900,
        y: 220,
        label: "KV Store",
        sub: "code → url",
        kind: "db",
        icon: "🗄️",
        desc: "Durable source of truth, partitioned by short code and replicated 3×."
      },
      {
        id: "q",
        x: 700,
        y: 360,
        label: "Kafka",
        sub: "click events",
        kind: "queue",
        icon: "📬",
        desc: "Buffers click events so analytics never slows a redirect."
      },
      {
        id: "an",
        x: 900,
        y: 360,
        label: "Analytics",
        sub: "aggregations",
        kind: "external",
        icon: "📊",
        desc: "Consumers roll up clicks per link / hour / country."
      }
    ],
    flows: [
      {
        name: "Click a hot link",
        steps: [
          ["u","lb","GET /3xK9pQ2"],
          ["lb","app","Routed to any healthy server"],
          ["app","cache","Lookup 3xK9pQ2 → HIT (0.5 ms)"],
          ["app","q","Fire-and-forget click event"],
          ["app","u","302 → long URL. Done in a few ms"],
          ["q","an","Analytics updated asynchronously"]
        ]
      },
      {
        name: "Click a cold link",
        steps: [
          ["u","lb","GET /aZ01bc"],
          ["lb","app","Routed"],
          ["app","cache","Lookup → MISS"],
          ["app","db","Read from KV store (~5 ms)"],
          ["app","cache","Populate cache for next time"],
          ["app","u","302 redirect"]
        ]
      },
      {
        name: "Create a link",
        steps: [
          ["u","lb","POST /shorten {url}"],
          ["lb","app","Routed"],
          ["ids","app","(Once per 1,000) lease next ID block"],
          ["app","db","Write code → url"],
          ["app","u","201 { short: \"bit.ly/3xK9pQ2\" }"]
        ]
      }
    ]
  },
  lab: {
    sim: "shortener",
    title: "Shortener Lab",
    hint: "Shorten a URL to watch Base62 encoding step by step. Then send a burst of skewed traffic and see how cache size changes your database load."
  },
  tradeoffs: [
    {
      choice: "Counter + Base62 vs. hashing",
      pro: "No collisions, short codes, simple",
      con: "Needs ID coordination; sequential codes are guessable unless scrambled"
    },
    {choice: "302 vs. 301 redirect",pro: "Full analytics and control",con: "Every click costs you a request"},
    {
      choice: "NoSQL KV vs. SQL",
      pro: "Horizontal scale, predictable latency",
      con: "Fewer query features (fine: we only do lookups)"
    }
  ],
  takeaways: ["Start from the read/write ratio; it tells you where to spend complexity.","Avoid coordination on the hot path (ID ranges, not a global counter).","Keep side effects (analytics) off the critical path with a queue."],
  quiz: [
    {
      q: "How many unique codes does a 7-character Base62 code give?",
      o: ["434 (62 × 7)","About 78 billion","About 3.5 trillion","Infinite"],
      a: 2,
      why: "62⁷ = 3,521,614,606,208 ≈ 3.5 trillion."
    },
    {
      q: "Why do app servers lease ID ranges instead of asking a central counter for every link?",
      o: ["Range IDs are more secure","It removes per-request coordination, so the counter isn't a bottleneck or single point of failure","Databases can't auto-increment","It makes codes shorter"],
      a: 1,
      why: "One round trip per 1,000 IDs instead of per ID means the coordinator does 1/1000th of the work and outages barely matter."
    },
    {
      q: "Product wants per-click analytics. Which redirect?",
      o: ["301 Moved Permanently","302 Found (temporary)","404 Not Found","200 with JavaScript"],
      a: 1,
      why: "Browsers cache 301s and stop asking you. 302 keeps every click flowing through your servers."
    },
    {
      q: "Where should click tracking happen?",
      o: ["Synchronously before redirecting","In the browser only","Publish an event to a queue and redirect immediately","In a nightly batch reading server logs only"],
      a: 2,
      why: "Async events keep the redirect fast; consumers aggregate later."
    },
    {
      q: "Why serve creates and redirects from separate fleets?",
      o: ["They use different languages","A spike in rare, heavy creates must never slow the constant, latency-critical redirects","Redirects need GPUs","It's required by Kafka"],
      a: 1,
      why: "Isolate the hot read path."
    },
    {
      q: "How do you stop two users claiming the same custom alias at the same moment?",
      o: ["Check, then insert","A conditional put-if-absent write","A cron job","A bigger cache"],
      a: 1,
      why: "Atomic check-and-write; the loser gets \"alias taken\"."
    }
  ],
  sources: ["Classic system-design interview problem (many public write-ups)","Base62 math: 62⁷ = 3.52 × 10¹²"],
  deep: [
    {
      h: "API design",
      blocks: [
        ["img","De Huurverhoging QR code, Utrecht (2023).jpg","Short links live on posters, packaging and QR codes. Every scan is a redirect that has to resolve in milliseconds, for years."],
        ["code","POST /api/v1/links                     (auth: API key, rate-limited per key)\n{ \"long_url\": \"https://example.com/very/long?utm=…\", \"custom_alias\": \"diwali-sale\", \"expires_at\": \"2026-12-31\" }\n→ 201 { \"code\": \"diwali-sale\", \"short_url\": \"https://blu.pr/diwali-sale\" }\n\nGET /{code}\n→ 302 Found   Location: https://example.com/very/long?utm=…\n→ 404 Not Found (unknown)   |   410 Gone (expired)\n\nGET /api/v1/links/{code}/stats?from=2026-10-01&group=day\n→ 200 { \"clicks\": 18234, \"by_day\": [...], \"by_country\": {...} }"],
        ["p","Two very different paths: <b>create</b> is authenticated, validated and rare (~1k/s). <b>Redirect</b> is anonymous, read-only and constant (~100k/s). Serve them from separate fleets so a flood of creates can never slow down redirects."]
      ]
    },
    {
      h: "Data model",
      blocks: [
        ["table",["Store","Key","Value / columns","Why"],[["Links (KV, sharded by code)","code","long_url, owner_id, created_at, expires_at","One lookup per redirect"],["Links by owner (index)","owner_id","list of codes","\"My links\" dashboard"],["Click events (log)","—","code, ts, country, referrer, device","Append-only; aggregated later"],["Click aggregates (OLAP)","(code, day)","count, by_country, by_referrer","Fast stats queries"]]],
        ["p","<b>Size check:</b> a row is about 500 bytes (the URL dominates). 100M links/day × 500 B ≈ 50 GB/day ≈ 18 TB/year, which is a sharded KV store, not one database. Codes are random-looking strings, so hashing by code spreads load evenly."]
      ]
    },
    {
      h: "Generating codes: three approaches compared",
      blocks: [
        ["table",["Approach","How","Pros","Cons"],[["Hash + truncate","MD5(url) → first 7 chars; on collision, add a salt and retry","No coordination","Collision checks on every write; the same URL always gives the same code"],["Counter + Base62","Unique integer → Base62","No collisions, short, fast","Needs ID coordination; sequential codes are guessable"],["Key generation service","Pre-generate random 7-char codes offline; app servers take batches","Random-looking, no collisions at write time","An extra service and a store of unused keys"]]],
        ["steps",[["Lease a range","An app server atomically reserves the next 1,000 IDs: <code>UPDATE id_ranges SET next = next + 1000 WHERE name = 'links' RETURNING next</code> (or a ZooKeeper sequential node)."],["Hand out locally","It assigns IDs from memory with no network calls until the range runs out. A crash just wastes the rest of the range, which is harmless."],["Scramble (optional)","Pass the ID through a reversible permutation (e.g. multiply by a large odd number mod 62⁷) so consecutive links don't get consecutive codes."],["Encode","Base62 the result into 7 characters."]]]
      ]
    },
    {
      h: "Custom aliases, expiry and abuse",
      blocks: [
        ["list",["<b>Custom alias</b> (<code>blu.pr/diwali-sale</code>): a <i>conditional</i> insert, \"put if absent\", so two users can't claim the same alias. Reserve words like <code>api</code>, <code>login</code>, <code>admin</code>.","<b>Expiry:</b> check <code>expires_at</code> on every redirect and return <b>410 Gone</b>. A background job deletes expired rows in batches later, so reads never wait for cleanup.","<b>Abuse:</b> short links hide destinations, which attracts phishing. Scan new URLs against threat lists, rate-limit creation per account, and show an interstitial warning for flagged links."]]
      ]
    },
    {
      h: "Serving redirects in milliseconds",
      blocks: [
        ["p","The read path is everything here. A cache-aside Redis tier in front of the KV store absorbs most traffic, because popularity is extremely skewed. A link shared by a celebrity can get millions of clicks in minutes."],
        ["chart",{"type":"bar","title":"Redirect latency by path (inside one region, approx.)","data":[["Redis hit",1],["Redis miss → KV store",6],["Cross-region request (no local copy)",150]],"fmt":"ms","log":true,"highlight":0}],
        ["list",["<b>Viral link stampede:</b> when a hot key expires, thousands of requests miss at once. Coalesce them so one request refills the cache while the rest wait for it.","<b>Multi-region:</b> replicate the link table (it's write-once) to every region and serve redirects from the nearest one.","<b>301 vs 302:</b> 302 keeps analytics accurate. Some services use 301 for anonymous, analytics-free links to save traffic."]]
      ]
    },
    {
      h: "The analytics pipeline",
      blocks: [
        ["flow",{"nodes":[{"id":"r","x":100,"y":225,"label":"Redirect servers","sub":"emit click event","kind":"service","icon":"↪️","desc":"Fire-and-forget: the redirect never waits."},{"id":"k","x":330,"y":225,"label":"Kafka","sub":"clicks topic","kind":"queue","icon":"📬","desc":"Buffers bursts; partitioned by code."},{"id":"s","x":560,"y":110,"label":"Stream processor","sub":"per-minute rollups","kind":"service","icon":"🧮","desc":"Counts by code × minute × country × referrer."},{"id":"o","x":800,"y":110,"label":"OLAP store","sub":"ClickHouse / Druid","kind":"db","icon":"📊","desc":"Answers dashboard queries in milliseconds."},{"id":"a","x":560,"y":350,"label":"Raw archive","sub":"object storage","kind":"db","icon":"🪣","desc":"Every raw event, for re-processing and audits."}],"flows":[{"name":"Click analytics","steps":[["r","k","{code, ts, ip→country, referrer, ua}"],["k","s","Consume in parallel by partition"],["s","o","Upsert per-minute aggregates"],["k","a","Also archive raw events"]]}]},"Clicks flow through a log into rollups, so the redirect path does zero analytics work."]
      ]
    },
    {
      h: "Failure modes",
      blocks: [
        ["table",["Failure","Impact","Mitigation"],[["Redis down","Every redirect hits the KV store","KV replicas sized for a cache-less day; circuit breaker; warm the cache on restart"],["A KV shard down","Links on that shard fail","3× replication with automatic failover"],["ID range service down","New links can't get IDs","Servers keep using their leased ranges; lease larger ranges"],["Kafka down","Clicks not recorded","Buffer locally and replay; the redirect still succeeds"],["Bad deploy","Redirects break everywhere","Canary by region; the redirect service changes rarely and is kept tiny"]]]
      ]
    },
    {
      h: "Interview follow-ups",
      blocks: [
        ["list",["How would you prevent someone from enumerating every link? → scrambled IDs or random keys, plus rate limits.","How do you delete a link that's cached in browsers via a 301? → you can't. Use 302 when control matters.","How would you support 10× growth? → more KV shards (consistent hashing), more cache nodes, and redirects served from every region.","What's the minimum code length for 10 years of 100M links/day? → 365B links needs 62⁷ ≈ 3.5T, so 7 chars."]]
      ]
    }
  ]
});
