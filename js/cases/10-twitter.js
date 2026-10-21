/* Blueprint case study — Twitter / X: Design the Home Timeline, Search & Trends. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "twitter",
  app: "Twitter / X",
  icon: "🐦",
  color: "#1d9bf0",
  color2: "#7cc7ff",
  title: "Design the Home Timeline, Search & Trends",
  tagline: "Hundreds of millions of tweets a day, read far more than written, with traffic that spikes 25× when the world watches the same moment.",
  level: "Advanced",
  minutes: 18,
  concepts: ["fanout","hot-key","snowflake","caching","inverted-index","trending","message-queue"],
  stats: [
    {v: 500,suf: "M",label: "tweets per day (Twitter, reported)",kind: "Reported"},
    {
      v: 143,
      suf: "k/s",
      label: "record tweets per second (2013 broadcast of a film in Japan)",
      kind: "Reported"
    },
    {v: 300,suf: "k/s",label: "timeline reads per second (Twitter talk, 2013)",kind: "Reported"}
  ],
  story: "A last-minute goal in a World Cup final. Within seconds, millions of people post the same thing, and millions more refresh their home timeline expecting to see it. Search for the player's name has to find tweets from <i>seconds</i> ago, and his name has to appear in Trends before the replay finishes.<br><br>Twitter's design is a story about <b>read-heavy fan-out</b>, a <b>celebrity exception</b>, <b>real-time search</b>, and <b>detecting what's surging</b> rather than what's merely big.",
  requirements: {
    functional: ["Post a tweet (280 characters, media)","Follow accounts","Home timeline of followed accounts","Real-time search","Trending topics","Likes, retweets, replies"],
    nonFunctional: ["Timeline loads in a couple of hundred milliseconds","A tweet reaches followers' timelines within seconds","Survive 25× spikes during global events","Availability over strict consistency"]
  },
  estimate: [
    ["Tweets per second (average)","500M ÷ 86,400","≈ 5,800 /s"],
    ["Peak","reported record","≈ 143,000 /s (25×)"],
    ["Timeline writes (fan-out)","5,800 × ~200 followers","≈ 1.2M /s"],
    ["Timeline reads","reported","≈ 300,000 /s"],
    ["Timeline cache RAM","300M users × 800 ids × 8 B","≈ 1.9 TB (×3 replicas)"]
  ],
  estimateNote: "Insight: reads dwarf writes, so precompute timelines (fan-out on write) and keep them in RAM. Then handle the accounts with tens of millions of followers as a special case.",
  naive: {
    title: "\"SELECT tweets FROM people I follow ORDER BY time\"",
    desc: "Build the home timeline on every request with a query over the tweets of everyone the reader follows.",
    breaks: ["300k timeline requests per second, each a multi-shard scatter-gather, would overwhelm the database.","During a spike, reads and writes peak at the same moment, which is the worst case for a single database.","Search by LIKE over tweet text, and trends by GROUP BY over everything, can't work in real time."]
  },
  steps: [
    {
      t: "Store tweets with time-sortable IDs",
      c: "snowflake",
      b: "Every tweet gets a <b>Snowflake ID</b> (Twitter invented it): unique without coordination and sorted by time, so \"newest first\" is just \"highest ID first\". Tweets live in a sharded key-value store keyed by ID.",
      a: "Ticket numbers that also tell you when the ticket was printed."
    },
    {
      t: "Fan out to in-memory timelines",
      c: "fanout",
      b: "When you tweet, a fan-out service looks up your followers and inserts the tweet ID into each follower's <b>timeline list in Redis</b>, capped at roughly the latest 800 entries. Reading a timeline is then one cached list lookup.",
      a: "Slipping a copy of today's newsletter into every subscriber's mailbox."
    },
    {
      t: "The celebrity exception",
      c: "hot-key",
      b: "An account with 100M followers would mean 100M inserts per tweet. Accounts above a threshold <b>aren't fanned out</b>. At read time, their recent tweets are fetched (and cached) and merged into your timeline. Same hybrid as Instagram.",
      a: "The newspaper is delivered; the celebrity's column you read at the newsstand."
    },
    {
      t: "Hydrate and rank on read",
      c: "caching",
      b: "The timeline list holds only IDs. The read path multi-gets tweet bodies and user objects from caches in one round trip, merges the celebrity tweets, optionally ranks them, and returns a page with a cursor.",
      a: "Your mailbox holds slips with order numbers; you fetch the parcels when you open it."
    },
    {
      t: "Real-time search",
      c: "inverted-index",
      b: "Every new tweet is tokenised and added to an <b>in-memory inverted index</b> within seconds. Twitter built a Lucene-based system called Earlybird for this. Recent tweets live on fast in-memory indexes; older ones sit on larger archive indexes, and queries hit both and merge the results.",
      a: "A library that catalogues new books the moment they arrive at the door."
    },
    {
      t: "Trends: what's surging, not what's big",
      c: "trending",
      b: "A stream processor counts hashtags and phrases in sliding windows and compares each one's recent rate with its <b>usual</b> rate. A tag at 50× its baseline beats one that's always huge. Approximate counters (count-min sketch) keep memory small, and spam filters keep it clean.",
      a: "A traffic report flags a sudden jam, not the motorway that's always busy."
    }
  ],
  diagram: {
    nodes: [
      {
        id: "u",
        x: 90,
        y: 110,
        label: "Author",
        sub: "posts a tweet",
        kind: "client",
        icon: "✍️",
        desc: "Sends a tweet."
      },
      {
        id: "w",
        x: 290,
        y: 110,
        label: "Write API",
        sub: "validate & store",
        kind: "service",
        icon: "⚙️",
        desc: "Assigns a Snowflake ID and stores the tweet."
      },
      {
        id: "ts",
        x: 500,
        y: 50,
        label: "Tweet store",
        sub: "sharded KV",
        kind: "db",
        icon: "🗄️",
        desc: "Tweets by ID."
      },
      {
        id: "fo",
        x: 500,
        y: 190,
        label: "Fan-out service",
        sub: "queue-driven",
        kind: "queue",
        icon: "📣",
        desc: "Inserts the ID into followers' timelines (skipping celebrities)."
      },
      {
        id: "g",
        x: 720,
        y: 60,
        label: "Social graph",
        sub: "followers",
        kind: "db",
        icon: "🕸️",
        desc: "Who follows whom."
      },
      {
        id: "tl",
        x: 720,
        y: 220,
        label: "Timeline cache",
        sub: "Redis lists (~800 ids)",
        kind: "cache",
        icon: "⚡",
        desc: "Precomputed home timelines."
      },
      {
        id: "r",
        x: 90,
        y: 360,
        label: "Reader",
        sub: "opens home",
        kind: "client",
        icon: "📱",
        desc: "Reads the home timeline."
      },
      {
        id: "ra",
        x: 300,
        y: 360,
        label: "Timeline API",
        sub: "merge & hydrate",
        kind: "service",
        icon: "🧩",
        desc: "Merges celebrity tweets, hydrates bodies, ranks."
      },
      {
        id: "se",
        x: 520,
        y: 370,
        label: "Search index",
        sub: "real-time, in memory",
        kind: "db",
        icon: "🔎",
        desc: "New tweets searchable within seconds."
      },
      {
        id: "tr",
        x: 900,
        y: 370,
        label: "Trends",
        sub: "stream counts",
        kind: "service",
        icon: "📈",
        desc: "Sliding-window counts vs baseline."
      }
    ],
    flows: [
      {
        name: "Post a tweet",
        steps: [
          ["u","w","POST tweet"],
          ["w","ts","Store under its Snowflake ID"],
          ["w","fo","Enqueue fan-out"],
          ["fo","g","Fetch followers (author isn't a celebrity)"],
          ["fo","tl","LPUSH id into each follower's timeline"],
          ["w","se","Index for search"],
          ["w","tr","Count hashtags"]
        ]
      },
      {
        name: "Read home timeline",
        steps: [
          ["r","ra","GET /home"],
          ["ra","tl","Read my cached id list"],
          ["ra","ts","Multi-get tweet bodies (+ celebrity tweets)"],
          ["ra","r","Merged, ranked page"]
        ]
      }
    ]
  },
  lab: {
    sim: "trends",
    title: "Trending Topics Lab",
    hint: "Watch the two rankings. Trigger a breaking event and see it top Trends while it's still small by raw volume."
  },
  tradeoffs: [
    {
      choice: "Fan-out on write",
      pro: "Reads are one cache lookup",
      con: "Write amplification; celebrity tweets are slow"
    },
    {
      choice: "Timelines capped at ~800 ids",
      pro: "Bounded RAM",
      con: "Scrolling far back falls back to slower paths"
    },
    {
      choice: "Approximate trend counting",
      pro: "Tiny memory, real time",
      con: "Small counting errors; needs spam filtering"
    }
  ],
  takeaways: ["Precompute for read-heavy paths, and special-case the hot keys.","Time-sortable IDs make \"newest first\" free.","Trending = rate of change against a baseline."],
  quiz: [
    {
      q: "Why are timeline entries just tweet IDs, not full tweets?",
      o: ["IDs are prettier","Small lists fit in RAM; bodies are hydrated from caches and edits stay in one place","Redis can't store text","For search"],
      a: 1,
      why: "Denormalize the ids, not the content."
    },
    {
      q: "Which ranks higher in Trends?",
      o: ["A tag that is always tweeted a lot","A tag tweeted at 40× its usual rate","The longest hashtag","Whatever is newest"],
      a: 1,
      why: "Trends measure acceleration against a baseline."
    },
    {
      q: "An account has 100M followers. Its tweets reach followers by…",
      o: ["100M inserts per tweet","Being merged into timelines at read time","Email","Not at all"],
      a: 1,
      why: "The celebrity exception: pull instead of push."
    },
    {
      q: "Why can search show tweets from seconds ago?",
      o: ["It scans the database","New tweets go into an in-memory inverted index right away","It uses the CDN","Search is delayed a day"],
      a: 1,
      why: "A real-time index of recent tweets."
    }
  ],
  sources: ["Twitter Engineering: Timelines at Scale (2013 talk)","Twitter Engineering: Announcing Snowflake (2010)","Twitter Engineering: Earlybird real-time search","Twitter: 143,199 tweets per second record (2013)"],
  deep: [
    {
      h: "API design",
      blocks: [
        ["img","Crowd of people with phones.jpg","During a big moment, a crowd like this posts and refreshes at the same time, so writes and reads peak together."],
        ["code","POST /2/tweets              { text, reply_to?, media_ids? }    → 201 { id: \"1839…\" }   (Snowflake)\nGET  /2/timeline/home?cursor=<max_id>&count=20                → { tweets, next_cursor }\nGET  /2/search/recent?q=messi&since_id=…                      → { tweets }\nGET  /2/trends/place?id=<woeid>                               → [{ name, tweet_volume }]"],
        ["p","Pagination uses <b>max_id cursors</b>: \"give me 20 tweets older than id X\". Snowflake IDs sort by time, so this is stable even while new tweets pour in at the top."]
      ]
    },
    {
      h: "Timeline cache in numbers",
      blocks: [
        ["math",[["Active users with cached timelines","assumption","300 M"],["Entries per timeline","capped","~800"],["Bytes per entry","tweet id (+ a few flags)","~8 B"],["Total","300M × 800 × 8 B","≈ 1.9 TB"],["With 3 replicas","× 3","≈ 5.8 TB of RAM"]],"That's large but very achievable as a Redis cluster, and it's why inactive users' timelines aren't kept warm: rebuild them on their next visit."],
        ["code","on tweet(t):\n  if followers(t.author) > CELEBRITY_THRESHOLD: return    # merged at read time\n  for f in followers(t.author):                        # in batches, via a queue\n    redis.lpush(\"tl:\" + f, t.id); redis.ltrim(\"tl:\" + f, 0, 799)\n\nhome(user, max_id):\n  ids  = redis.lrange(\"tl:\" + user, 0, 799) filtered by < max_id\n  ids += recent_ids_of(celebrities_followed_by(user))  # cached per celebrity\n  return hydrate(sort_desc(ids)[:20])                  # multi-get bodies + users"]
      ]
    },
    {
      h: "Surviving spikes",
      blocks: [
        ["chart",{"type":"line","title":"Tweets per second around a big moment (illustrative)","x":{"label":"seconds from the goal","values":[-30,-15,0,5,10,20,40,60,90,120]},"y":{"label":"tweets / s"},"series":[{"name":"Tweets","values":[6000,6200,9000,90000,140000,110000,60000,30000,15000,9000]}],"note":"Peaks arrive within seconds and fade within minutes, so capacity must be pre-provisioned. Autoscaling is too slow."}],
        ["list",["<b>Queue the fan-out:</b> the write returns once the tweet is stored; fan-out catches up seconds later.","<b>Shed non-critical work:</b> delay analytics and recommendations, keep posting and timelines.","<b>Cache hot objects aggressively:</b> the goal-scorer's profile and the official account's tweets are read millions of times."]]
      ]
    },
    {
      h: "Search and trends in detail",
      blocks: [
        ["table",["Component","How it works"],[["Ingestion","Tweets are tokenised and appended to an in-memory index segment; searchable within seconds"],["Recent vs archive","Recent tweets on small in-memory indexes; older ones on bigger on-disk indexes; queries fan out to both and merge"],["Ranking","Recency, engagement and author signals"],["Trend counting","Sliding windows (e.g. 5 min) per term, compared with a slowly updated baseline; count-min sketches bound memory"],["Trend quality","Spam and bot filtering, per-location trends, and de-duplication of near-identical terms"]]]
      ]
    },
    {
      h: "Failure modes",
      blocks: [
        ["table",["Failure","Mitigation"],[["Fan-out backlog during a spike","Tweets are already stored; timelines catch up; readers merge recent tweets on read"],["Timeline cache node lost","Replicas take over; missing timelines are rebuilt from the graph and the tweet store"],["Search index lag","Results are briefly incomplete; the index catches up"],["Hot celebrity tweet","Replicated caches and request coalescing"]]]
      ]
    },
    {
      h: "Interview follow-ups",
      blocks: [
        ["list",["Deleting a tweet? → tombstone it in the tweet store; hydration drops it from every timeline automatically.","Replies and threads? → a conversation id on each tweet; threads are queries by conversation id.","Notifications (likes, mentions)? → separate consumers of the same tweet and engagement events.","\"For you\" ranking? → candidate generation from many sources, plus an ML ranker on top of the same hydrated tweets."]]
      ]
    }
  ]
});
