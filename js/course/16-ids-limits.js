/* Blueprint course — lesson: Popular questions: unique ID generators & rate limiters */
BP.LESSONS.push({
  id: "ids-limits",
  mod: "infra",
  icon: "🎫",
  minutes: 30,
  title: "Popular questions: unique ID generators & rate limiters",
  scaler: "HLD 16.1 · Unique ID Generator · HLD 16.2 · Rate Limiters",
  summary: "Generate sortable 64-bit IDs on a thousand machines without coordination, and compare five rate-limiting algorithms on the same traffic.",
  concepts: ["snowflake","id-generation","rate-limiting"],
  related: ["bitly","stripe"],
  sections: [
    { h: "Unique IDs: requirements", blocks: [
      ["p","<b>8-byte numeric</b> IDs that are <b>unique</b> across machines and <b>roughly time-ordered</b> (if t₁ &lt; t₂ then id₁ &lt; id₂), generated at high rates."],
      ["table",["Option","Problem"],[["DB auto-increment","Works on one machine; separate machines hand out the same numbers"],["UUID","Unique, but 128-bit, not numeric, not time-ordered (and random inserts fragment B-tree indexes)"],["Timestamp alone","Two machines in the same millisecond collide"],["Multi-master modulo (3n, 3n+1, 3n+2)","Unique but not time-ordered across machines"],["Ticket server (Flickr)","Simple, but a central dependency and extra hop (two servers: odd/even for HA)"],["Timestamp + machine id + sequence","✅ Twitter Snowflake"]]]
    ] },
    { h: "Twitter Snowflake", blocks: [
      ["fig","snowflake","Generate IDs and inspect the bit fields. Burst 5,000 in one millisecond to overflow the sequence."],
      ["math",[["Timestamp bits","2⁴¹ ms","≈ 69.7 years from a custom epoch"],["Machines","5 bits DC × 5 bits worker","1,024"],["IDs per ms per machine","2¹² sequence","4,096 (≈ 4M/s)"]],"Because time is in the high bits, IDs sort by creation time with no coordination."],
      ["warn","Watch for <b>clock skew</b>: if a machine's clock jumps backwards, it could reissue IDs. Snowflake refuses or waits. Machine ids must be unique, and are often assigned through ZooKeeper."],
      ["img","Snowflake macro photography 1.jpg","No two snowflakes are alike, which is the joke behind the name. Each ID is unique without the machines ever talking to each other."],
      ["chart",{"type":"donut","title":"A 64-bit Snowflake ID","data":[["Sign",1],["Timestamp (ms)",41],["Datacenter",5],["Machine",5],["Sequence",12]],"colors":["#8a887f","var(--c)","#1f8a8a","#c2456b","#b7791f"],"center":"64","centerSub":"bits"}]
    ] },
    { h: "Rate limiters", blocks: [
      ["p","A rate limiter caps how often a client (IP, user, API key) may call you, for example <b>5 requests per 60 s per IP</b>. The 6th gets <b>HTTP 429 Too Many Requests</b>. It protects against abuse and DDoS, enforces quotas, and shields downstream services. It usually sits in the API gateway."],
      ["fig","ratealgos","Same traffic, five algorithms. Hit “Boundary-burst attack” to break the fixed window."],
      ["table",["Algorithm","State per client","Pros","Cons"],[["Fixed window counter","1 counter","Cheapest","2× burst at window boundaries"],["Sliding window log","Every timestamp (deque)","Exact","Memory and eviction cost at ~10k req/window"],["Sliding window counter","2 counters","Near-exact, tiny","Approximation"],["Token bucket","tokens + last refill","Allows bursts up to capacity","Two parameters to tune"],["Leaky bucket","a queue","Smooth output rate","Bursts are queued or dropped"]]],
      ["p","<b>Sliding counter math</b> (from the notes): windows of 50 s; the previous window had 60 requests, and the current one has 40 so far at 40% elapsed. Estimate = 60 × (1 − 0.4) + 40 = <b>76</b>, compared against the limit."],
      ["extra","<b>Distributed limiting:</b> many gateway nodes share counters in Redis. A naive GET-then-SET races, so use atomic <code>INCR</code> + <code>EXPIRE</code> or a Lua script. Decide whether to <b>fail open</b> (allow traffic) or <b>fail closed</b> if Redis is down."],
      ["sim","stripe","Stripe-style token bucket, plus idempotent retries."],
      ["img","86 Street turnstiles vc.jpg","A turnstile is a physical rate limiter: it lets people through at a pace the platform can handle."],
      ["chart",{"type":"bar","title":"Memory per client (limit 100 per window)","data":[["Sliding window log",800],["Fixed window counter",8],["Sliding window counter",16],["Token bucket",16]],"fmt":"bytes","highlight":2}]
    ] },
    { h: "The window algorithms, worked with the notes' numbers", blocks: [
      ["steps",[["Sliding window log (a deque per IP)","Window 5 s. At t = 15 the deque is [10, 11, 12, 12, 13, 14, 15]. A request arrives at t = 16, so the cutoff is 16 − 5 + 1 = 12: pop everything below 12, leaving [12, 12, 13, 14, 15]. If the size is under the limit, push 16 and allow. Exact, but with ~10k requests per window the deque is big and evictions are slow."],["Fixed window counter","Limit 100 per 50 s, one counter per window. Flaw: 100 requests at 40–50 s plus 100 at 51–60 s gives <b>200 in about 20 s</b>, double the limit, because the counter resets at 50 s."],["Sliding window counter","Keep just (previous count, current count) per IP. Windows of 50 s: the previous one (51–100) had 60 requests, and the current one (101–150) has 40 so far at t = 120 (40% elapsed). Estimate = 60 × 0.6 + 40 = <b>76</b>, then compare with the limit. Near-exact with two integers."]]],
      ["code","map<string ip, deque<int>>      // sliding log\nmap<string ip, int>             // fixed window\nmap<string ip, pair<int,int>>   // sliding counter: (prev, curr)"]
    ] }
  ],
  quiz: [
    {"q":"Max Snowflake IDs per millisecond per machine?","o":["1,024","4,096","65,536","Unlimited"],"a":1,"why":"12 sequence bits = 4,096."},
    {"q":"Why isn't a plain timestamp enough as an ID?","o":["Too long","Two machines can generate the same timestamp","Not numeric","Too random"],"a":1,"why":"You need machine id + sequence to break ties."},
    {"q":"Which algorithm lets 2× the limit through at a window boundary?","o":["Token bucket","Fixed window counter","Sliding log","Leaky bucket"],"a":1,"why":"The counter resets at the boundary, so a burst on both sides gets through."},
    {"q":"Previous window 60, current 40, 40% elapsed. Sliding-counter estimate?","o":["100","76","64","40"],"a":1,"why":"60 × 0.6 + 40 = 76."}
  ],
  refs: [
    ["Twitter Snowflake (original repo)","https://github.com/twitter-archive/snowflake/tree/snowflake-2010"],
    ["Flickr: Ticket servers","https://code.flickr.net/2010/02/08/ticket-servers-distributed-unique-primary-keys-on-the-cheap/"],
    ["ByteByteGo: Design a rate limiter","https://bytebytego.com/courses/system-design-interview/design-a-rate-limiter"],
    ["Redis: rate limiting how-to","https://redis.io/learn/howtos/ratelimiting"],
    ["Stripe: Scaling your API with rate limiters","https://stripe.com/blog/rate-limiters"],
    ["Cloudflare: counting things at scale","https://blog.cloudflare.com/counting-things-a-lot-of-different-things/"]
  ]
});
