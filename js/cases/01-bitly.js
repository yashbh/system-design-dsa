/* Blueprint case study — Bitly: Design a URL Shortener. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "bitly",
  app: "Bitly",
  icon: "🔗",
  color: "#ff6a2b",
  color2: "#ffb347",
  title: "Design a URL Shortener",
  tagline: "Turn a 2,000-character link into 7 characters, then answer billions of clicks faster than you can blink.",
  level: "Beginner",
  minutes: 30,
  concepts: ["base62","id-generation","kv-store","caching","http-redirects","message-queue"],
  stats: [
    {v: 3.52,d: 2,suf: "T",label: "different 7-character Base62 codes",kind: "Math"},
    {v: 100,suf: ":1",label: "clicks for every link created (typical)",kind: "Assumption"},
    {v: 10,pre: "<",suf: " ms",label: "how fast a redirect should be",kind: "Design goal"}
  ],
  story: "You copy a link to share with a friend. It's a monster: a product page, then a question mark, then two hundred characters of <code>utm_source</code> and <code>ref</code> and <code>session</code> junk. It won't fit in a tweet, it breaks across lines in an email, and printed on a poster it looks like a ransom note.<br><br>So you paste it into a URL shortener. A second later you have <code>bit.ly/3xK9pQ2</code>. Seven characters. Someone in Tokyo taps it on their phone and lands on the page before they notice a redirect happened at all.<br><br>It feels like the simplest web app in the world. Store a pair of strings, look one up, send the browser somewhere else. You could build it in an afternoon. And you could, for a few thousand links.<br><br>Now picture 100 million new links a day and more than 100,000 clicks every second, from every country, on links printed on cereal boxes that have to keep working for ten years. Suddenly two classic questions show up. <b>How do you hand out short, unique names at huge scale without two servers ever picking the same one?</b> And <b>how do you answer reads so fast they feel free?</b><br><br>This case walks through the design one decision at a time, starting with the version a beginner would build and watching it break. (Like every case here, the architecture is a simplified teaching model built from public write-ups, not Bitly's actual internal code.)",
  requirements: {
    functional: ["Give back a short code for any long URL","Clicking the short link sends the browser to the long URL","Optional custom names (blu.pr/diwali-sale) and expiry dates","Click analytics: how many clicks, from which countries, from which sites","A dashboard where a user sees the links they created"],
    nonFunctional: ["Redirects in a few milliseconds, anywhere in the world","Almost never down: if the shortener dies, millions of links on posters and in emails die with it","Two links must never get the same code","Read-heavy: around 100 clicks for every link created","Links keep working for years, so data must be durable","Codes should be hard to guess, so nobody can scroll through everyone's links"]
  },
  estimate: [
    ["New links created per day","assumption","100 M"],
    ["Writes per second","100M ÷ 86,400 s","≈ 1,160 /s"],
    ["Clicks per second (100 reads per write)","1,160 × 100","≈ 116,000 /s"],
    ["Clicks per day","116,000 × 86,400","≈ 10 B"],
    ["Storage per year","100M × 365 × 500 B","≈ 18 TB"],
    ["Cache for the hot 20% of clicks","20% of 10B daily reads × 500 B","≈ 1 TB RAM"],
    ["Years until 7-character codes run out","3.5T ÷ (100M × 365)","≈ 96 years"]
  ],
  estimateNote: "What do these numbers tell us? Writes are easy: about 1,160 a second is nothing special, a single decent database can take that. Reads are the whole game. At roughly 116,000 clicks a second, a single database would melt, so most of the design is about answering clicks without touching the database at all.<br><br>Storage is big but boring. 18 TB a year is too much for one machine, but it's just simple rows, so we spread it over many machines and never think about it again. And the cache number is the nice surprise: because a small fraction of links gets most of the clicks, about 1 TB of RAM spread over a handful of cache servers can answer most redirects. That's a very affordable way to turn a hard problem into an easy one.",
  naive: {
    title: "\"Just MD5 the URL and keep the first 7 characters\"",
    desc: "Here's the version almost everyone thinks of first. Take the long URL, run it through a hash function like MD5 (a function that turns any text into a fixed-size jumble of characters), keep the first 7 characters as the code, and save the pair in a SQL table. When someone clicks, run <code>SELECT long_url FROM links WHERE code = ?</code> and redirect. It's short, it needs no coordination, and on a laptop it works perfectly. So what goes wrong?",
    breaks: ["<b>Collisions arrive early.</b> A truncated hash has a fixed number of possible values, and the birthday paradox says two items start sharing a value long before the space is full (the same reason 23 people in a room give a 50% chance of a shared birthday). So every insert needs “does this code already exist?”, and if it does, add a salt and try again. That's an extra database round trip on every single write.","<b>Every click is a database query.</b> 116,000 queries a second on one SQL server means latency climbs, then the connection pool runs dry, then the whole thing falls over. A link going viral on a Monday morning is enough to cause it.","<b>Same URL, same code.</b> Two different marketers shortening the same product page get the identical code, so you can't give them separate click stats, separate expiry dates, or let one delete the link without breaking it for the other.","<b>One box, one failure.</b> When that single database is down for a patch, every short link ever printed stops working at once."]
  },
  steps: [
    {
      t: "Give every link a unique number",
      c: "id-generation",
      b: "The collision problem goes away if, instead of hashing, we just count. Link one gets number 1, link two gets number 2, and so on. Counters never collide, because the same number is never handed out twice.<br><br>The obvious way to count is an auto-increment column in one database. But then every new link, from every server in every region, has to ask that one database for the next number. That database becomes a bottleneck, and if it goes down, nobody can create links.<br><br>The trick is to hand out numbers in bulk. Each app server <b>leases a block of IDs</b>, say 1,000 at a time, from a small coordinator (ZooKeeper, or a tiny database table). Server A gets 1 to 1,000, server B gets 1,001 to 2,000, and each one hands out its numbers from memory with no network calls at all. The coordinator is now touched once per 1,000 links instead of once per link.<br><br>What does it cost? If server A crashes after using 400 numbers, the other 600 are simply never used. That's fine: we have trillions to spare, and nobody needs links to be numbered without gaps.",
      a: "A deli counter where each server grabs a whole roll of numbered tickets instead of phoning the manager for every customer. If one cashier goes home mid-roll, a few numbers are skipped, and nobody minds."
    },
    {
      t: "Squeeze the number with Base62",
      c: "base62",
      b: "Now we have numbers, but numbers are long. The 3-trillionth link would be <code>3000000000000</code>, thirteen characters. We want something shorter.<br><br>The answer is to write the number in a bigger alphabet. Normal numbers use 10 digits (0 to 9). <b>Base62</b> uses 62 “digits”: <code>0-9</code>, <code>a-z</code> and <code>A-Z</code>, all of which are safe in a URL. Each extra character multiplies the possibilities by 62 instead of 10. So 7 characters give 62⁷ ≈ <b>3.5 trillion</b> codes, enough for 100 million links a day for about 96 years.<br><br>A tiny example: the number 125 in Base62 is <code>21</code>, because 2 × 62 + 1 = 125. Same value, fewer characters.<br><br>There's one catch. Counting means link 1,000,000 and link 1,000,001 get neighbouring codes like <code>4c92</code> and <code>4c93</code>. Anyone could guess them and browse other people's links. So many systems first <b>scramble</b> the number with a reversible shuffle (for example, multiply it by a large odd number and keep the remainder) before encoding. Every number still maps to exactly one code, but neighbours no longer look alike.",
      a: "It's like writing numbers with 62 different digits instead of 10. The value doesn't change, it just takes far fewer characters to write down."
    },
    {
      t: "Store the mapping in a key-value store",
      c: "kv-store",
      b: "What does the database actually need to do? Look at the access pattern. Given <code>3xK9pQ2</code>, return the long URL. That's it. No joins, no “find all links containing the word sale”, no reports. Just one key in, one value out.<br><br>That's exactly what a <b>key-value store</b> is built for: a giant, distributed dictionary. Systems like DynamoDB or Cassandra split the data into partitions by key (here, the short code) and spread those partitions across many machines. A lookup goes straight to the one machine that owns that code and comes back in a few milliseconds, whether you have a billion rows or a hundred billion. Need more room? Add machines.<br><br>Because our codes look random, they spread evenly across partitions, so no single machine gets all the traffic. Each row is also copied to three machines, so losing one doesn't lose any links.<br><br>The cost: you give up the fancy SQL features. That's a good trade here, because we never needed them.",
      a: "A coat check. You hand over a ticket and get your coat back. Nobody searches the racks, and adding another rack doesn't slow anyone down."
    },
    {
      t: "Put a cache in front of everything",
      c: "caching",
      b: "Even a fast key-value store would be working hard at 116,000 reads a second. But here's the gift: clicks are wildly uneven. A link a celebrity shares can get millions of clicks in an hour, while most links get a handful, ever. A small set of links gets most of the traffic.<br><br>So we keep the popular codes in RAM. A <b>cache</b> is a fast, small copy of data that's read often. We put a Redis or Memcached tier in front of the database and use the <b>cache-aside</b> pattern: check the cache first; on a miss, read the database and put the answer in the cache for next time.<br><br>When the cache is full, <b>LRU eviction</b> (least recently used) throws out the link nobody has clicked for the longest time. Popular links stay warm on their own. A cache hit takes well under a millisecond, and a modest cache can absorb the vast majority of clicks, so the database only sees the long tail.<br><br>Links almost never change after they're created, which makes them perfect cache material: there's barely any risk of serving stale data.",
      a: "Your favourite mug lives on the kitchen counter. The fancy ones you use twice a year stay in the cupboard. You don't open the cupboard every morning."
    },
    {
      t: "Choose the redirect type deliberately",
      c: "http-redirects",
      b: "When someone clicks a short link, our server doesn't send the page itself. It replies with an HTTP <b>redirect</b>: a status code plus a <code>Location</code> header that says “go here instead”. The browser follows it automatically. There are two flavours, and the choice matters more than it looks.<br><br><b>301 Moved Permanently</b> tells the browser “this will never change, remember it”. The browser caches the answer, so the next time the same person clicks, it goes straight to the long URL without asking us. Less traffic for us, but we never see that click.<br><br><b>302 Found</b> (a temporary redirect) says “go there for now”. The browser asks us every time. That costs us a request per click, but we can count it, change the destination, run an A/B test, or expire the link next month.<br><br>A product whose whole business is click analytics picks 302. The extra load is the price of knowing what's happening.",
      a: "A 301 is a forwarding order at the post office: set it once and your mail goes to the new house forever. A 302 is a sign on the old door that every visitor has to stop and read."
    },
    {
      t: "Record analytics off the critical path",
      c: "message-queue",
      b: "Every click should be counted: when, from which country, from which website, on which device. But counting must not slow down the redirect. A user waiting an extra 50 ms because we're updating a counter in a database is a bad deal.<br><br>So the redirect server does the smallest possible thing: it drops a tiny click event into a <b>message queue</b> like Kafka and immediately sends the redirect. A message queue is a durable buffer: producers add messages at the back, consumers read them from the front at their own pace.<br><br>Separate consumer programs read the clicks and roll them up into counts per link, per country, per hour, in an analytics store. If the analytics side falls behind during a traffic spike, the queue just grows for a while and catches up later. The person clicking never notices.<br><br>The cost: stats are a few seconds or minutes behind reality. For a click dashboard, nobody cares.",
      a: "A waiter clips your order to the kitchen rail and goes straight back to the guests. The kitchen works through the tickets at its own pace."
    },
    {
      t: "Split the fast lane from the slow lane",
      c: "caching",
      b: "Look at the two kinds of request side by side. Creating a link is rare (about 1,000 a second), needs a login, validates the URL, checks it against phishing lists and writes to the database. Following a link is constant (about 100,000 a second), anonymous, read-only and must be instant.<br><br>If both run on the same servers, a burst of heavy create requests (say, a marketing tool bulk-shortening a million links) can eat the CPU that redirects need. So we run them as <b>separate fleets</b>. The redirect service is tiny, rarely changes, and is copied to every region so clicks are served close to the user. The create service can be slower and more careful.<br><br>This costs a little more to operate, but it means the one thing that must never break, the redirect, is protected from everything else.",
      a: "A supermarket with an express lane. People buying one bottle of milk shouldn't wait behind someone doing a month's shopping."
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
      pro: "No collisions, no check-and-retry on writes, and the codes are as short as they can be",
      con: "You need a small service to hand out ID ranges, and plain counters give guessable codes unless you scramble them"
    },
    {
      choice: "302 vs. 301 redirect",
      pro: "Every click comes through you, so analytics are complete and you can change or expire a link later",
      con: "Every click costs you a request, including repeat clicks from the same person"
    },
    {
      choice: "NoSQL key-value store vs. SQL",
      pro: "Grows by adding machines, and lookups stay a few milliseconds at any size",
      con: "No joins or ad-hoc queries (fine here, because we only ever look up by code)"
    },
    {
      choice: "Big cache vs. small cache",
      pro: "A bigger cache absorbs more clicks, so the database can be smaller and calmer",
      con: "RAM is expensive, and past a point each extra gigabyte only catches a few rare links"
    },
    {
      choice: "Async analytics through a queue",
      pro: "Redirects never wait for counting, and traffic spikes are absorbed by the queue",
      con: "Stats lag reality by seconds or minutes, and you now run a queue and consumers"
    }
  ],
  takeaways: ["Start from the read/write ratio. Here it's 100:1, which tells you to spend your effort on reads.","Counting beats hashing when you need guaranteed-unique names, and Base62 keeps the count short.","Avoid coordination on the hot path: lease ID ranges, don't ask a global counter for every link.","Skewed traffic is a gift. A cache sized for the popular few can absorb most of the load.","The redirect status code is a product decision: 302 for control and analytics, 301 for less traffic.","Keep side effects like analytics off the critical path with a queue.","Protect the path that must never fail by giving it its own small, boring service."],
  quiz: [
    {
      q: "How many unique codes does a 7-character Base62 code give?",
      o: ["434 (62 × 7)","About 78 billion","About 3.5 trillion","Infinite"],
      a: 2,
      why: "Each position has 62 choices, so it's 62 multiplied by itself 7 times: 62⁷ = 3,521,614,606,208, about 3.5 trillion."
    },
    {
      q: "Why do app servers lease ID ranges instead of asking a central counter for every link?",
      o: ["Range IDs are more secure","It removes per-request coordination, so the counter isn't a bottleneck or single point of failure","Databases can't auto-increment","It makes codes shorter"],
      a: 1,
      why: "One round trip per 1,000 IDs instead of one per ID means the coordinator does a thousandth of the work, and even if it's down for a while, servers keep using the ranges they already hold."
    },
    {
      q: "Product wants per-click analytics. Which redirect?",
      o: ["301 Moved Permanently","302 Found (temporary)","404 Not Found","200 with JavaScript"],
      a: 1,
      why: "Browsers cache 301s and stop asking you, so repeat clicks are invisible. A 302 keeps every click flowing through your servers."
    },
    {
      q: "Where should click tracking happen?",
      o: ["Synchronously before redirecting","In the browser only","Publish an event to a queue and redirect immediately","In a nightly batch reading server logs only"],
      a: 2,
      why: "A fire-and-forget event keeps the redirect fast; consumers aggregate the clicks later at their own pace."
    },
    {
      q: "Why serve creates and redirects from separate fleets?",
      o: ["They use different languages","A spike in rare, heavy creates must never slow the constant, latency-critical redirects","Redirects need GPUs","It's required by Kafka"],
      a: 1,
      why: "Isolate the hot read path so nothing else can steal its CPU or break it with a deploy."
    },
    {
      q: "How do you stop two users claiming the same custom alias at the same moment?",
      o: ["Check, then insert","A conditional put-if-absent write","A cron job","A bigger cache"],
      a: 1,
      why: "“Check, then insert” has a gap where both users see the alias as free. An atomic put-if-absent write closes that gap; the loser gets “alias taken”."
    },
    {
      q: "Why does truncating an MD5 hash to 7 characters cause trouble even when only a small fraction of codes is used?",
      o: ["MD5 is too slow","The birthday paradox: collisions start long before the space is full","MD5 only produces numbers","Browsers reject hashed URLs"],
      a: 1,
      why: "With many items in a fixed space, the chance that some pair shares a value grows quickly, just like shared birthdays in a room of 23 people."
    },
    {
      q: "Your cache holds the 20% of links that get most clicks. What happens to the database when the cache restarts empty?",
      o: ["Nothing, the cache is optional","Every click becomes a database read until the cache warms up again","Links stop working permanently","Redirects become 301s"],
      a: 1,
      why: "A cold cache sends all traffic to the database. Size the database replicas for that moment and warm the cache with the hottest keys on restart."
    },
    {
      q: "Why are short links such good candidates for caching?",
      o: ["They are small and almost never change after creation","They are encrypted","They are stored in SQL","Browsers require it"],
      a: 0,
      why: "A row of about 500 bytes that is written once and read many times is the ideal cache entry: cheap to hold and almost never stale."
    }
  ],
  sources: ["Classic system-design interview problem (many public write-ups)","Base62 math: 62⁷ = 3.52 × 10¹²"],
  deep: [
    {
      h: "API design",
      blocks: [
        ["img","De Huurverhoging QR code, Utrecht (2023).jpg","Short links live on posters, packaging and QR codes. Every scan is a redirect that has to resolve in milliseconds, for years."],
        ["p","Before drawing boxes, it helps to write down what clients will actually call. An API is just the list of requests your system answers and what each one returns. For a shortener there are only three that matter."],
        ["code","POST /api/v1/links                     (auth: API key, rate-limited per key)\n{ \"long_url\": \"https://example.com/very/long?utm=…\", \"custom_alias\": \"diwali-sale\", \"expires_at\": \"2026-12-31\" }\n→ 201 { \"code\": \"diwali-sale\", \"short_url\": \"https://blu.pr/diwali-sale\" }\n\nGET /{code}\n→ 302 Found   Location: https://example.com/very/long?utm=…\n→ 404 Not Found (unknown)   |   410 Gone (expired)\n\nGET /api/v1/links/{code}/stats?from=2026-10-01&group=day\n→ 200 { \"clicks\": 18234, \"by_day\": [...], \"by_country\": {...} }"],
        ["p","Notice how different the first two are. <b>Create</b> is authenticated, validated and rare (about 1,000 a second). <b>Redirect</b> is anonymous, read-only and constant (about 100,000 a second). Serve them from separate fleets so a flood of creates can never slow down redirects."],
        ["p","The status codes are part of the design too. <code>404</code> means “never heard of this code”. <code>410 Gone</code> means “this existed but has expired”, which is more honest and lets search engines drop the link. Small details like this are cheap to get right on day one and painful to change once millions of links are out in the world."]
      ]
    },
    {
      h: "Data model",
      blocks: [
        ["p","We need surprisingly little. One big table answers redirects, and everything else exists to power the dashboard and the stats."],
        ["table",["Store","Key","Value / columns","Why"],[["Links (KV, sharded by code)","code","long_url, owner_id, created_at, expires_at","One lookup per redirect"],["Links by owner (index)","owner_id","list of codes","\"My links\" dashboard"],["Click events (log)","—","code, ts, country, referrer, device","Append-only; aggregated later"],["Click aggregates (OLAP)","(code, day)","count, by_country, by_referrer","Fast stats queries"]]],
        ["p","<b>Size check:</b> a row is about 500 bytes, and the long URL is most of it. 100 million links a day × 500 B ≈ 50 GB a day ≈ 18 TB a year. That's a sharded key-value store, not one database. Codes look random, so splitting the data by code spreads load evenly across machines."],
        ["tip","The “links by owner” index is a second copy of the same facts, organised for a different question (“what did I create?”). Keeping a copy per question is normal in NoSQL designs. It's called denormalisation, and it trades a bit of storage for fast reads."]
      ]
    },
    {
      h: "Generating codes: three approaches compared",
      blocks: [
        ["p","There are three common ways to produce the code, and interviewers love asking you to compare them. None is wrong. They just put the cost in different places."],
        ["table",["Approach","How","Pros","Cons"],[["Hash + truncate","MD5(url) → first 7 chars; on collision, add a salt and retry","No coordination","Collision checks on every write; the same URL always gives the same code"],["Counter + Base62","Unique integer → Base62","No collisions, short, fast","Needs ID coordination; sequential codes are guessable"],["Key generation service","Pre-generate random 7-char codes offline; app servers take batches","Random-looking, no collisions at write time","An extra service and a store of unused keys"]]],
        ["p","Here's the counter approach end to end, the one this design uses:"],
        ["steps",[["Lease a range","An app server atomically reserves the next 1,000 IDs: <code>UPDATE id_ranges SET next = next + 1000 WHERE name = 'links' RETURNING next</code> (or a ZooKeeper sequential node)."],["Hand out locally","It assigns IDs from memory with no network calls until the range runs out. A crash just wastes the rest of the range, which is harmless."],["Scramble (optional)","Pass the ID through a reversible permutation (e.g. multiply by a large odd number mod 62⁷) so consecutive links don't get consecutive codes."],["Encode","Base62 the result into 7 characters."]]],
        ["code","ALPHABET = \"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ\"\n\ndef base62(n):\n    out = \"\"\n    while n > 0:\n        n, r = divmod(n, 62)\n        out = ALPHABET[r] + out\n    return out or \"0\"\n\nbase62(125)        # → \"21\"   (2 × 62 + 1)\nbase62(3_500_000)  # → \"eGvC\"  (four characters for 3.5 million)"],
        ["extra","The “key generation service” idea is a close cousin: a background job fills a table with random unused codes, and app servers grab batches of them. It gives random-looking codes for free, at the price of one more service and a pool you must never run out of."]
      ]
    },
    {
      h: "Custom aliases, expiry and abuse",
      blocks: [
        ["p","Real users want more than random codes. They want names they can say out loud, links that stop working after a sale ends, and confidence that a short link isn't a trap. Each of these has a small but real design wrinkle."],
        ["list",["<b>Custom alias</b> (<code>blu.pr/diwali-sale</code>): a <i>conditional</i> insert, \"put if absent\", so two users can't claim the same alias. Reserve words like <code>api</code>, <code>login</code>, <code>admin</code>.","<b>Expiry:</b> check <code>expires_at</code> on every redirect and return <b>410 Gone</b>. A background job deletes expired rows in batches later, so reads never wait for cleanup.","<b>Abuse:</b> short links hide destinations, which attracts phishing. Scan new URLs against threat lists, rate-limit creation per account, and show an interstitial warning for flagged links."]],
        ["warn","Custom aliases share the same namespace as generated codes. If a user picks <code>3xK9pQ2</code> as an alias, your counter might generate it later. Either keep aliases in a format the generator can never produce (say, require a dash or a minimum length), or have the generator use put-if-absent too."]
      ]
    },
    {
      h: "Serving redirects in milliseconds",
      blocks: [
        ["p","The read path is everything here. A cache-aside Redis tier in front of the KV store absorbs most traffic, because popularity is extremely skewed. A link shared by a celebrity can get millions of clicks in minutes."],
        ["chart",{"type":"bar","title":"Redirect latency by path (inside one region, approx.)","data":[["Redis hit",1],["Redis miss → KV store",6],["Cross-region request (no local copy)",150]],"fmt":"ms","log":true,"highlight":0}],
        ["p","Look at that last bar. Going to another continent costs more than everything else combined, because light in fibre still takes time. That's why the link table, which is written once and then only read, is copied to every region. A click in Tokyo is answered from a server near Tokyo."],
        ["list",["<b>Viral link stampede:</b> when a hot key expires, thousands of requests miss at once. Coalesce them so one request refills the cache while the rest wait for it.","<b>Multi-region:</b> replicate the link table (it's write-once) to every region and serve redirects from the nearest one.","<b>301 vs 302:</b> 302 keeps analytics accurate. Some services use 301 for anonymous, analytics-free links to save traffic."]]
      ]
    },
    {
      h: "The analytics pipeline",
      blocks: [
        ["p","Analytics is where a shortener earns its money, and it's also the part most likely to slow everything down if you're careless. The rule is simple: the redirect does zero analytics work. It emits one small event and moves on."],
        ["flow",{"nodes":[{"id":"r","x":100,"y":225,"label":"Redirect servers","sub":"emit click event","kind":"service","icon":"↪️","desc":"Fire-and-forget: the redirect never waits."},{"id":"k","x":330,"y":225,"label":"Kafka","sub":"clicks topic","kind":"queue","icon":"📬","desc":"Buffers bursts; partitioned by code."},{"id":"s","x":560,"y":110,"label":"Stream processor","sub":"per-minute rollups","kind":"service","icon":"🧮","desc":"Counts by code × minute × country × referrer."},{"id":"o","x":800,"y":110,"label":"OLAP store","sub":"ClickHouse / Druid","kind":"db","icon":"📊","desc":"Answers dashboard queries in milliseconds."},{"id":"a","x":560,"y":350,"label":"Raw archive","sub":"object storage","kind":"db","icon":"🪣","desc":"Every raw event, for re-processing and audits."}],"flows":[{"name":"Click analytics","steps":[["r","k","{code, ts, ip→country, referrer, ua}"],["k","s","Consume in parallel by partition"],["s","o","Upsert per-minute aggregates"],["k","a","Also archive raw events"]]}]},"Clicks flow through a log into rollups, so the redirect path does zero analytics work."],
        ["p","Why roll up per minute instead of storing every click and counting on demand? Because a dashboard asking “clicks per day for the last 90 days” would otherwise scan millions of rows. Pre-counted buckets turn that into reading 90 small numbers. The raw archive is kept anyway, in cheap object storage, so you can recompute everything if a bug in the counting code is found later."]
      ]
    },
    {
      h: "What happens when you click: the whole journey",
      blocks: [
        ["p","Let's follow one click on <code>bit.ly/3xK9pQ2</code> from a phone in Mumbai, with every step in order."],
        ["steps",[["DNS","The phone asks DNS where the short domain lives and gets the address of a nearby load balancer (geo-aware DNS points it to the closest region)."],["Load balancer","The load balancer picks any healthy redirect server. Servers keep no per-user state, so any one will do."],["Cache lookup","The server asks Redis for <code>3xK9pQ2</code>. It's a popular link, so it's a hit in under a millisecond."],["Fire the event","The server drops a click event onto Kafka. It doesn't wait for anyone to read it."],["Redirect","The server replies <code>302 Found</code> with the long URL in the <code>Location</code> header. Total time on our side: a few milliseconds."],["Browser follows","The phone requests the long URL from the destination site. From here on, it's not our traffic."]]],
        ["p","If the code had been cold, step 3 would miss, the server would read the key-value store (about 5 ms), put the answer in the cache, and carry on. The user would wait a few milliseconds more, once."]
      ]
    },
    {
      h: "Failure modes",
      blocks: [
        ["p","A shortener is a dependency for millions of other people's links, so it pays to think through every box in the diagram and ask: what if this one dies?"],
        ["table",["Failure","Impact","Mitigation"],[["Redis down","Every redirect hits the KV store","KV replicas sized for a cache-less day; circuit breaker; warm the cache on restart"],["A KV shard down","Links on that shard fail","3× replication with automatic failover"],["ID range service down","New links can't get IDs","Servers keep using their leased ranges; lease larger ranges"],["Kafka down","Clicks not recorded","Buffer locally and replay; the redirect still succeeds"],["Bad deploy","Redirects break everywhere","Canary by region; the redirect service changes rarely and is kept tiny"]]],
        ["p","Notice the pattern. Each failure is contained to the part that broke. Kafka going down costs some analytics, not redirects. The ID service going down costs nothing for a while, because servers still hold their leased ranges. Designing so that failures stay small is most of what “highly available” means."]
      ]
    },
    {
      h: "Numbers that matter",
      blocks: [
        ["table",["Number","Value","Why it matters"],[["Read : write ratio","about 100 : 1","Tells you to optimise reads"],["Clicks per second","about 116,000","Too many for one database, fine for a cache tier"],["Row size","about 500 B","Makes 18 TB a year; small enough to cache the hot set"],["Codes in 7 Base62 characters","about 3.5 trillion","About 96 years at 100 million links a day"],["Cache hit latency","under 1 ms","The common case"],["Cross-region round trip","about 150 ms","Why the link table is copied to every region"]]],
        ["tip","If you remember one calculation, make it 100M ÷ 86,400 ≈ 1,160. Dividing a daily number by 86,400 (seconds in a day) to get a per-second rate is the most useful trick in back-of-the-envelope estimation."]
      ]
    },
    {
      h: "Interview corner",
      blocks: [
        ["p","This is often the very first system design question people get, so interviewers expect a clean, well-paced answer. Here's one way to use 45 minutes."],
        ["steps",[["Requirements (5 min)","Ask: custom aliases? expiry? analytics? how many links a day? Write down the 100:1 read/write ratio."],["Estimates (5 min)","1,160 writes/s, 116,000 reads/s, 18 TB a year, about 1 TB of hot cache. Say what each number implies."],["API and data model (5 min)","Three endpoints and one key-value table. Keep it small."],["Code generation (10 min)","Compare hash, counter and key-service. Pick counter + Base62 with leased ranges and explain why."],["Read path (10 min)","Cache-aside, LRU, 302 vs 301, multi-region copies, stampede protection."],["Analytics and failures (10 min)","Queue-based analytics, then walk the failure table."]]],
        ["p","Common follow-ups, with short answers:"],
        ["list",["How would you prevent someone from enumerating every link? → scrambled IDs or random keys, plus rate limits.","How do you delete a link that's cached in browsers via a 301? → you can't. Use 302 when control matters.","How would you support 10× growth? → more KV shards (consistent hashing), more cache nodes, and redirects served from every region.","What's the minimum code length for 10 years of 100M links/day? → 365B links needs 62⁷ ≈ 3.5T, so 7 chars.","Should the same long URL always get the same code? → usually no. Separate codes per user keep stats and expiry independent. You can offer deduplication per account if users want it."]]
      ]
    }
  ]
});
