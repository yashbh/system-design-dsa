/* Blueprint — three more case studies: YouTube, Twitter, Google Docs.
 * Same shape as content.js cases, plus `deep` sections (rendered like lessons).
 * Simplified teaching models from public talks and engineering blogs.
 */
(function () {
  const flow = (nodes, name, steps) => ({ nodes, flows: [{ name, steps }] });

  /* ═════════════════════ YOUTUBE ═════════════════════ */
  BP.CASES.push({
    id: "youtube", app: "YouTube", icon: "▶️", color: "#ff0033", color2: "#ff7a7a",
    title: "Design Video Upload & Streaming",
    tagline: "Take 500 hours of new video every minute, make each one playable on any phone within minutes, and count billions of views.",
    level: "Advanced", minutes: 18,
    concepts: ["chunking", "transcoding", "object-storage", "cdn", "abr", "message-queue", "sharding"],
    stats: [
      { v: 500, suf: " h", label: "of video uploaded every minute (YouTube, reported)", kind: "Reported" },
      { v: 1, suf: "B h", label: "watched per day (YouTube, 2017)", kind: "Reported" },
      { v: 2.1, d: 1, suf: "B", label: "views that overflowed a 32-bit counter (Gangnam Style, 2014)", kind: "Reported" }
    ],
    story: "At 10 pm a creator in Pune uploads a 20-minute 4K vlog from a café's patchy Wi-Fi. The upload stalls twice and resumes. By 10:06 a fan on a train in Delhi is watching it in 360p, and by 10:15 it's available in 4K. By morning it has a million views, and the counter got every one of them roughly right.<br><br>Unlike Netflix, YouTube doesn't choose its catalogue: <b>anyone can upload anything, any time</b>. The hard problems are an <b>ingest and processing pipeline that never loses an upload</b> and publishes fast, <b>cost-efficient storage</b> for a huge long tail of rarely watched videos, and <b>counting views at enormous scale</b>.",
    requirements: {
      functional: ["Upload videos (resumable, from flaky networks)", "Transcode into many resolutions and codecs", "Watch with adaptive streaming on any device", "View counts, likes and comments", "Search and recommendations"],
      nonFunctional: ["Never lose an upload", "Publish within minutes, low resolutions first", "Playback starts fast worldwide", "View counts eventually accurate and fraud-resistant", "Storage cost under control for a huge long tail"]
    },
    estimate: [
      ["Uploads per day", "500 h/min × 60 × 24", "720,000 hours"],
      ["Raw storage per day", "720k h × ~2 GB/h (assumption)", "≈ 1.4 PB"],
      ["Encoded copies", "~7 resolutions × 2–3 codecs", "≈ 15–20 renditions per video"],
      ["Average egress", "1B h/day × 3 Mbps ÷ 86,400 s", "≈ 125 Tbps"],
      ["View events", "billions/day ÷ 86,400", "≈ 100k+ per second"]
    ],
    estimateNote: "Insight: two pipelines with very different shapes. Ingest is moderate in volume but CPU-heavy (transcoding). Playback is gigantic in bandwidth and must be served from edge caches near viewers.",
    naive: {
      title: "\"Save the uploaded file and stream it as-is\"",
      desc: "One HTTP upload, stored on a server; viewers download the original file; a SQL row per video with UPDATE views = views + 1 on every view.",
      breaks: [
        "A dropped connection at 95% means starting a 4 GB upload again.",
        "The original 4K HEVC file won't play on many phones, and on a slow network it stalls constantly.",
        "Every view updating one counter row creates a hot row with massive lock contention on popular videos."
      ]
    },
    steps: [
      { t: "Resumable, chunked uploads", c: "chunking",
        b: "The client asks for an upload session, then sends the file in chunks (say 8 MB), each acknowledged. After a drop it asks \"how much did you get?\" and resumes from there. Chunks go straight to <b>object storage</b>; the API only tracks the session.",
        a: "Moving house box by box: if the van breaks down, you don't unpack and start over." },
      { t: "A transcoding DAG, in parallel", c: "transcoding",
        b: "Once the raw file lands, a workflow splits it into segments of a few seconds or minutes, encodes every segment into every resolution and codec on <b>thousands of workers in parallel</b>, then stitches and packages them. A 20-minute video becomes hundreds of small jobs instead of one long one.",
        a: "A kitchen where twenty cooks each make one dish at once, instead of one chef cooking the whole banquet." },
      { t: "Publish the low resolutions first", c: "transcoding",
        b: "Schedule 360p (and audio) ahead of 1080p and 4K, and mark the video watchable as soon as one complete rung exists. Higher resolutions appear minutes later. Viewers wait minutes, not hours.",
        a: "A restaurant that serves bread while the main course is still cooking." },
      { t: "Hot and cold storage", c: "object-storage",
        b: "A few videos get most views, while most videos are rarely watched. Keep popular renditions on fast storage and edge caches, and move the long tail to cheaper, colder storage. You can even skip rarely requested renditions until someone asks for them.",
        a: "A bookshop keeps bestsellers on the front table and the rest in the back room." },
      { t: "Edge caches inside ISPs", c: "cdn",
        b: "Like Netflix's Open Connect, Google places caching servers inside ISPs (Google Global Cache). Popular segments are served from a few network hops away, and only misses travel back to Google's data centres. Players then use <b>adaptive bitrate</b> (DASH) to switch quality per segment.",
        a: "Corner shops stocked with what the neighbourhood buys most." },
      { t: "Count views asynchronously", c: "message-queue",
        b: "A view is an <b>event</b>, not a database update. Players send view pings into a log (Kafka-style). Stream processors filter bots and duplicates, then add counts in batches to <b>sharded counters</b>. The number shown is eventually consistent, and that's fine.",
        a: "A cricket scorer tallies runs on paper and updates the big board every over, not after every ball." }
    ],
    diagram: {
      nodes: [
        { id: "cr", x: 90, y: 110, label: "Creator", sub: "uploads", kind: "client", icon: "🎥", desc: "Uploads a file in resumable chunks." },
        { id: "up", x: 290, y: 110, label: "Upload service", sub: "resumable sessions", kind: "service", icon: "⬆️", desc: "Issues sessions, tracks received bytes, triggers processing." },
        { id: "raw", x: 500, y: 60, label: "Raw storage", sub: "object store", kind: "db", icon: "🪣", desc: "Durable home of the original file." },
        { id: "tq", x: 500, y: 200, label: "Transcode queue", sub: "job DAG", kind: "queue", icon: "📬", desc: "One job per segment × rendition." },
        { id: "wk", x: 720, y: 130, label: "Encoder fleet", sub: "thousands of workers", kind: "service", icon: "🎞️", desc: "Encodes segments in parallel; low rungs first." },
        { id: "meta", x: 720, y: 290, label: "Video metadata", sub: "sharded MySQL (Vitess)", kind: "db", icon: "🗄️", desc: "Title, owner, status, available renditions." },
        { id: "edge", x: 910, y: 210, label: "Edge caches", sub: "inside ISPs", kind: "edge", icon: "🌍", desc: "Serve popular segments near viewers." },
        { id: "v", x: 910, y: 380, label: "Viewer", sub: "DASH player", kind: "client", icon: "📱", desc: "Adapts quality per segment; sends view pings." },
        { id: "vc", x: 500, y: 380, label: "View pipeline", sub: "log → counters", kind: "queue", icon: "🔢", desc: "Dedupes, filters bots, batches increments." }
      ],
      flows: [
        { name: "Upload & publish", steps: [["cr", "up", "Start a resumable session"], ["up", "raw", "Chunks land in object storage"], ["up", "tq", "File complete → create the transcode DAG"], ["tq", "wk", "Segments × renditions fan out"], ["wk", "meta", "360p ready → status = watchable"], ["wk", "edge", "Renditions available to the edge"]] },
        { name: "Watch & count", steps: [["v", "meta", "Get the manifest (renditions, segment URLs)"], ["v", "edge", "Fetch segments, adapting quality"], ["v", "vc", "View ping {video, user, watch time}"], ["vc", "meta", "Batched, deduplicated count update"]] }
      ]
    },
    lab: { sim: "transcode", title: "Transcoding Pipeline Lab", hint: "Upload a video with one encoder, then split it into chunks and add workers. Watch when it becomes watchable (360p) versus fully processed." },
    tradeoffs: [
      { choice: "Publish low resolutions first", pro: "Watchable within minutes", con: "Early viewers see lower quality for a while" },
      { choice: "Approximate, batched view counts", pro: "No hot-row contention; bots filtered", con: "The count lags reality" },
      { choice: "Lazily create rare renditions", pro: "Saves storage on the long tail", con: "The first request for that rendition is slow" }
    ],
    takeaways: ["Make big uploads resumable and processing parallel.", "Separate the CPU-heavy ingest path from the bandwidth-heavy playback path.", "Counters at scale are event streams aggregated in batches, not row updates."],
    quiz: [
      { q: "Why split a video into segments before transcoding?", o: ["To compress it", "So thousands of workers can encode pieces in parallel", "CDNs require it", "To remove ads"], a: 1, why: "Parallel jobs turn hours into minutes." },
      { q: "A popular video gets 50k views per second. How do you count them?", o: ["UPDATE views = views + 1 for each", "Stream view events, dedupe, and add batched increments to sharded counters", "Count once a month", "Store every view in the video row"], a: 1, why: "Avoid a single hot row; aggregate events." },
      { q: "Why can a viewer watch before the 4K version exists?", o: ["They can't", "The pipeline encodes and publishes low resolutions first", "4K is streamed raw", "The CDN upscales it"], a: 1, why: "Prioritising the lower rungs makes the video watchable sooner." },
      { q: "What did Gangnam Style famously break in 2014?", o: ["The CDN", "A 32-bit signed view counter (max ≈ 2.1B)", "The upload limit", "Search"], a: 1, why: "2,147,483,647 is the largest 32-bit signed integer. YouTube moved to 64-bit." }
    ],
    sources: ["YouTube official blog and press statistics (500 h/min, 1B hours/day)", "Vitess: MySQL sharding, built at YouTube", "Google: Argos video transcoding chips (2021)"],
    deep: [
      { h: "The resumable upload protocol", blocks: [
        ["img", "An elderly man uses his smartphone to video record the large crowd gathered on Jinan Road (濟南路).jpg", "On YouTube anyone with a phone is a broadcaster, so uploads arrive from every kind of network, including terrible ones."],
        ["code", "POST /upload/videos?uploadType=resumable   { title, size: 3.8 GB }\n→ 200  Location: /upload/session/abc123\n\nPUT /upload/session/abc123   Content-Range: bytes 0-8388607/3800000000\n→ 308 Resume Incomplete      Range: bytes=0-8388607\n…connection drops…\nPUT /upload/session/abc123   Content-Range: bytes */3800000000     (\"how much do you have?\")\n→ 308   Range: bytes=0-1166016511                                   (resume from here)\n…\n→ 201 Created { video_id: \"dQw4w9WgXcQ\", status: \"processing\" }"],
        ["p", "Each chunk is stored as it arrives. The session remembers the offset, so a phone that loses signal resumes instead of restarting, which matters when uploads are gigabytes over mobile data."]
      ]},
      { h: "The transcoding pipeline in detail", blocks: [
        ["steps", [["Validate and probe", "Check that the file is a real video; read its duration, codec, frame rate and resolution."], ["Split", "Cut at keyframes into independent segments."], ["Fan out", "Create one job per segment × rendition, scheduling 360p and audio first."], ["Encode", "Workers pull jobs from the queue. A failed job is simply retried, because segments are independent."], ["Assemble and package", "Stitch segments per rendition, write DASH/HLS manifests, generate thumbnails and storyboards."], ["Publish", "Update the metadata status as rungs become ready, and notify subscribers."]]],
        ["chart", { type: "line", title: "Time until a 20-minute video is fully processed", x: { label: "encoding workers", values: [1, 2, 4, 8, 16, 32, 64] }, y: { label: "minutes", log: true }, series: [{ name: "Chunked (1-min segments)", values: [70, 35, 18, 9, 5, 3, 2] }, { name: "One encoder per video", values: [70, 70, 70, 70, 70, 70, 70] }], note: "Illustrative: 140 segment-jobs at 30 s each, plus about a minute to split and assemble. Without chunking, extra workers can't help a single video." }],
        ["extra", "At YouTube's scale even CPUs get expensive: Google has described custom video-transcoding chips (\"Argos\") that encode many times more efficiently than general-purpose servers."]
      ]},
      { h: "Data model", blocks: [
        ["table", ["Store", "Contents", "Notes"], [["videos (sharded MySQL via Vitess)", "video_id, channel_id, title, status, duration, created_at", "Vitess, which shards MySQL, was born at YouTube"], ["renditions", "video_id, resolution, codec, segment manifest URL", "Added as each rung finishes"], ["Object storage", "Raw upload + encoded segments", "Hot vs cold tiers"], ["view_counts (sharded counters)", "video_id → N partial counters", "Sum the shards to display"], ["Comments / likes", "Separate services and stores", "Scale independently"]]],
        ["tip", "<b>Sharded counters:</b> instead of one row per video, keep N counter rows (video_id, shard) and increment a random shard. Reading the total sums N rows, which can be cached. That spreads the write contention N ways."]
      ]},
      { h: "Counting views", blocks: [
        ["chart", { type: "bar", title: "Writes to the counter store per second for one viral video", data: [["UPDATE per view (50k views/s)", 50000], ["Batched every 10 s across 100 aggregators", 10]], log: true, highlight: 1 }],
        ["list", ["Players send pings at watch milestones (e.g. after ~30 s), not on page load.", "Stream processors drop duplicates (same user and video within a window) and suspected bots.", "Aggregators add counts locally and flush every few seconds as one increment per video.", "Displayed counts come from a cache refreshed periodically. Exactness is traded for scale on purpose."]]
      ]},
      { h: "Failure modes", blocks: [
        ["table", ["Failure", "Mitigation"], [["Upload connection drops", "Resumable sessions continue from the last stored byte"], ["Encoder job crashes", "Idempotent segment jobs are retried on another worker"], ["Transcode backlog after a spike", "Prioritise low rungs and popular channels; autoscale workers"], ["Edge cache miss storm (a new viral video)", "Request coalescing at the edge; pre-warm caches for big creators"], ["Bot view inflation", "Filter in the stream pipeline before counting"]]]
      ]},
      { h: "Interview follow-ups", blocks: [
        ["list", ["Live streaming? → real-time segmenting, a constantly updating manifest, low-latency players (see the video-streaming lesson).", "Copyright matching? → fingerprint every upload's audio and video and compare against a reference index.", "Recommendations? → offline models on watch history plus online candidate ranking, served separately from playback.", "Deleting a video? → mark it removed in metadata immediately; purge storage and caches asynchronously."]]
      ]}
    ]
  });

  /* ═════════════════════ TWITTER ═════════════════════ */
  BP.CASES.push({
    id: "twitter", app: "Twitter / X", icon: "🐦", color: "#1d9bf0", color2: "#7cc7ff",
    title: "Design the Home Timeline, Search & Trends",
    tagline: "Hundreds of millions of tweets a day, read far more than written, with traffic that spikes 25× when the world watches the same moment.",
    level: "Advanced", minutes: 18,
    concepts: ["fanout", "hot-key", "snowflake", "caching", "inverted-index", "trending", "message-queue"],
    stats: [
      { v: 500, suf: "M", label: "tweets per day (Twitter, reported)", kind: "Reported" },
      { v: 143, suf: "k/s", label: "record tweets per second (2013 broadcast of a film in Japan)", kind: "Reported" },
      { v: 300, suf: "k/s", label: "timeline reads per second (Twitter talk, 2013)", kind: "Reported" }
    ],
    story: "A last-minute goal in a World Cup final. Within seconds, millions of people post the same thing, and millions more refresh their home timeline expecting to see it. Search for the player's name has to find tweets from <i>seconds</i> ago, and his name has to appear in Trends before the replay finishes.<br><br>Twitter's design is a story about <b>read-heavy fan-out</b>, a <b>celebrity exception</b>, <b>real-time search</b>, and <b>detecting what's surging</b> rather than what's merely big.",
    requirements: {
      functional: ["Post a tweet (280 characters, media)", "Follow accounts", "Home timeline of followed accounts", "Real-time search", "Trending topics", "Likes, retweets, replies"],
      nonFunctional: ["Timeline loads in a couple of hundred milliseconds", "A tweet reaches followers' timelines within seconds", "Survive 25× spikes during global events", "Availability over strict consistency"]
    },
    estimate: [
      ["Tweets per second (average)", "500M ÷ 86,400", "≈ 5,800 /s"],
      ["Peak", "reported record", "≈ 143,000 /s (25×)"],
      ["Timeline writes (fan-out)", "5,800 × ~200 followers", "≈ 1.2M /s"],
      ["Timeline reads", "reported", "≈ 300,000 /s"],
      ["Timeline cache RAM", "300M users × 800 ids × 8 B", "≈ 1.9 TB (×3 replicas)"]
    ],
    estimateNote: "Insight: reads dwarf writes, so precompute timelines (fan-out on write) and keep them in RAM. Then handle the accounts with tens of millions of followers as a special case.",
    naive: {
      title: "\"SELECT tweets FROM people I follow ORDER BY time\"",
      desc: "Build the home timeline on every request with a query over the tweets of everyone the reader follows.",
      breaks: [
        "300k timeline requests per second, each a multi-shard scatter-gather, would overwhelm the database.",
        "During a spike, reads and writes peak at the same moment, which is the worst case for a single database.",
        "Search by LIKE over tweet text, and trends by GROUP BY over everything, can't work in real time."
      ]
    },
    steps: [
      { t: "Store tweets with time-sortable IDs", c: "snowflake",
        b: "Every tweet gets a <b>Snowflake ID</b> (Twitter invented it): unique without coordination and sorted by time, so \"newest first\" is just \"highest ID first\". Tweets live in a sharded key-value store keyed by ID.",
        a: "Ticket numbers that also tell you when the ticket was printed." },
      { t: "Fan out to in-memory timelines", c: "fanout",
        b: "When you tweet, a fan-out service looks up your followers and inserts the tweet ID into each follower's <b>timeline list in Redis</b>, capped at roughly the latest 800 entries. Reading a timeline is then one cached list lookup.",
        a: "Slipping a copy of today's newsletter into every subscriber's mailbox." },
      { t: "The celebrity exception", c: "hot-key",
        b: "An account with 100M followers would mean 100M inserts per tweet. Accounts above a threshold <b>aren't fanned out</b>. At read time, their recent tweets are fetched (and cached) and merged into your timeline. Same hybrid as Instagram.",
        a: "The newspaper is delivered; the celebrity's column you read at the newsstand." },
      { t: "Hydrate and rank on read", c: "caching",
        b: "The timeline list holds only IDs. The read path multi-gets tweet bodies and user objects from caches in one round trip, merges the celebrity tweets, optionally ranks them, and returns a page with a cursor.",
        a: "Your mailbox holds slips with order numbers; you fetch the parcels when you open it." },
      { t: "Real-time search", c: "inverted-index",
        b: "Every new tweet is tokenised and added to an <b>in-memory inverted index</b> within seconds. Twitter built a Lucene-based system called Earlybird for this. Recent tweets live on fast in-memory indexes; older ones sit on larger archive indexes, and queries hit both and merge the results.",
        a: "A library that catalogues new books the moment they arrive at the door." },
      { t: "Trends: what's surging, not what's big", c: "trending",
        b: "A stream processor counts hashtags and phrases in sliding windows and compares each one's recent rate with its <b>usual</b> rate. A tag at 50× its baseline beats one that's always huge. Approximate counters (count-min sketch) keep memory small, and spam filters keep it clean.",
        a: "A traffic report flags a sudden jam, not the motorway that's always busy." }
    ],
    diagram: {
      nodes: [
        { id: "u", x: 90, y: 110, label: "Author", sub: "posts a tweet", kind: "client", icon: "✍️", desc: "Sends a tweet." },
        { id: "w", x: 290, y: 110, label: "Write API", sub: "validate & store", kind: "service", icon: "⚙️", desc: "Assigns a Snowflake ID and stores the tweet." },
        { id: "ts", x: 500, y: 50, label: "Tweet store", sub: "sharded KV", kind: "db", icon: "🗄️", desc: "Tweets by ID." },
        { id: "fo", x: 500, y: 190, label: "Fan-out service", sub: "queue-driven", kind: "queue", icon: "📣", desc: "Inserts the ID into followers' timelines (skipping celebrities)." },
        { id: "g", x: 720, y: 60, label: "Social graph", sub: "followers", kind: "db", icon: "🕸️", desc: "Who follows whom." },
        { id: "tl", x: 720, y: 220, label: "Timeline cache", sub: "Redis lists (~800 ids)", kind: "cache", icon: "⚡", desc: "Precomputed home timelines." },
        { id: "r", x: 90, y: 360, label: "Reader", sub: "opens home", kind: "client", icon: "📱", desc: "Reads the home timeline." },
        { id: "ra", x: 300, y: 360, label: "Timeline API", sub: "merge & hydrate", kind: "service", icon: "🧩", desc: "Merges celebrity tweets, hydrates bodies, ranks." },
        { id: "se", x: 520, y: 370, label: "Search index", sub: "real-time, in memory", kind: "db", icon: "🔎", desc: "New tweets searchable within seconds." },
        { id: "tr", x: 900, y: 370, label: "Trends", sub: "stream counts", kind: "service", icon: "📈", desc: "Sliding-window counts vs baseline." }
      ],
      flows: [
        { name: "Post a tweet", steps: [["u", "w", "POST tweet"], ["w", "ts", "Store under its Snowflake ID"], ["w", "fo", "Enqueue fan-out"], ["fo", "g", "Fetch followers (author isn't a celebrity)"], ["fo", "tl", "LPUSH id into each follower's timeline"], ["w", "se", "Index for search"], ["w", "tr", "Count hashtags"]] },
        { name: "Read home timeline", steps: [["r", "ra", "GET /home"], ["ra", "tl", "Read my cached id list"], ["ra", "ts", "Multi-get tweet bodies (+ celebrity tweets)"], ["ra", "r", "Merged, ranked page"]] }
      ]
    },
    lab: { sim: "trends", title: "Trending Topics Lab", hint: "Watch the two rankings. Trigger a breaking event and see it top Trends while it's still small by raw volume." },
    tradeoffs: [
      { choice: "Fan-out on write", pro: "Reads are one cache lookup", con: "Write amplification; celebrity tweets are slow" },
      { choice: "Timelines capped at ~800 ids", pro: "Bounded RAM", con: "Scrolling far back falls back to slower paths" },
      { choice: "Approximate trend counting", pro: "Tiny memory, real time", con: "Small counting errors; needs spam filtering" }
    ],
    takeaways: ["Precompute for read-heavy paths, and special-case the hot keys.", "Time-sortable IDs make \"newest first\" free.", "Trending = rate of change against a baseline."],
    quiz: [
      { q: "Why are timeline entries just tweet IDs, not full tweets?", o: ["IDs are prettier", "Small lists fit in RAM; bodies are hydrated from caches and edits stay in one place", "Redis can't store text", "For search"], a: 1, why: "Denormalize the ids, not the content." },
      { q: "Which ranks higher in Trends?", o: ["A tag that is always tweeted a lot", "A tag tweeted at 40× its usual rate", "The longest hashtag", "Whatever is newest"], a: 1, why: "Trends measure acceleration against a baseline." },
      { q: "An account has 100M followers. Its tweets reach followers by…", o: ["100M inserts per tweet", "Being merged into timelines at read time", "Email", "Not at all"], a: 1, why: "The celebrity exception: pull instead of push." },
      { q: "Why can search show tweets from seconds ago?", o: ["It scans the database", "New tweets go into an in-memory inverted index right away", "It uses the CDN", "Search is delayed a day"], a: 1, why: "A real-time index of recent tweets." }
    ],
    sources: ["Twitter Engineering: Timelines at Scale (2013 talk)", "Twitter Engineering: Announcing Snowflake (2010)", "Twitter Engineering: Earlybird real-time search", "Twitter: 143,199 tweets per second record (2013)"],
    deep: [
      { h: "API design", blocks: [
        ["img", "Crowd of people with phones.jpg", "During a big moment, a crowd like this posts and refreshes at the same time, so writes and reads peak together."],
        ["code", "POST /2/tweets              { text, reply_to?, media_ids? }    → 201 { id: \"1839…\" }   (Snowflake)\nGET  /2/timeline/home?cursor=<max_id>&count=20                → { tweets, next_cursor }\nGET  /2/search/recent?q=messi&since_id=…                      → { tweets }\nGET  /2/trends/place?id=<woeid>                               → [{ name, tweet_volume }]"],
        ["p", "Pagination uses <b>max_id cursors</b>: \"give me 20 tweets older than id X\". Snowflake IDs sort by time, so this is stable even while new tweets pour in at the top."]
      ]},
      { h: "Timeline cache in numbers", blocks: [
        ["math", [["Active users with cached timelines", "assumption", "300 M"], ["Entries per timeline", "capped", "~800"], ["Bytes per entry", "tweet id (+ a few flags)", "~8 B"], ["Total", "300M × 800 × 8 B", "≈ 1.9 TB"], ["With 3 replicas", "× 3", "≈ 5.8 TB of RAM"]], "That's large but very achievable as a Redis cluster, and it's why inactive users' timelines aren't kept warm: rebuild them on their next visit."],
        ["code", "on tweet(t):\n  if followers(t.author) > CELEBRITY_THRESHOLD: return    # merged at read time\n  for f in followers(t.author):                        # in batches, via a queue\n    redis.lpush(\"tl:\" + f, t.id); redis.ltrim(\"tl:\" + f, 0, 799)\n\nhome(user, max_id):\n  ids  = redis.lrange(\"tl:\" + user, 0, 799) filtered by < max_id\n  ids += recent_ids_of(celebrities_followed_by(user))  # cached per celebrity\n  return hydrate(sort_desc(ids)[:20])                  # multi-get bodies + users"]
      ]},
      { h: "Surviving spikes", blocks: [
        ["chart", { type: "line", title: "Tweets per second around a big moment (illustrative)", x: { label: "seconds from the goal", values: [-30, -15, 0, 5, 10, 20, 40, 60, 90, 120] }, y: { label: "tweets / s" }, series: [{ name: "Tweets", values: [6000, 6200, 9000, 90000, 140000, 110000, 60000, 30000, 15000, 9000] }], note: "Peaks arrive within seconds and fade within minutes, so capacity must be pre-provisioned. Autoscaling is too slow." }],
        ["list", ["<b>Queue the fan-out:</b> the write returns once the tweet is stored; fan-out catches up seconds later.", "<b>Shed non-critical work:</b> delay analytics and recommendations, keep posting and timelines.", "<b>Cache hot objects aggressively:</b> the goal-scorer's profile and the official account's tweets are read millions of times."]]
      ]},
      { h: "Search and trends in detail", blocks: [
        ["table", ["Component", "How it works"], [["Ingestion", "Tweets are tokenised and appended to an in-memory index segment; searchable within seconds"], ["Recent vs archive", "Recent tweets on small in-memory indexes; older ones on bigger on-disk indexes; queries fan out to both and merge"], ["Ranking", "Recency, engagement and author signals"], ["Trend counting", "Sliding windows (e.g. 5 min) per term, compared with a slowly updated baseline; count-min sketches bound memory"], ["Trend quality", "Spam and bot filtering, per-location trends, and de-duplication of near-identical terms"]]]
      ]},
      { h: "Failure modes", blocks: [
        ["table", ["Failure", "Mitigation"], [["Fan-out backlog during a spike", "Tweets are already stored; timelines catch up; readers merge recent tweets on read"], ["Timeline cache node lost", "Replicas take over; missing timelines are rebuilt from the graph and the tweet store"], ["Search index lag", "Results are briefly incomplete; the index catches up"], ["Hot celebrity tweet", "Replicated caches and request coalescing"]]]
      ]},
      { h: "Interview follow-ups", blocks: [
        ["list", ["Deleting a tweet? → tombstone it in the tweet store; hydration drops it from every timeline automatically.", "Replies and threads? → a conversation id on each tweet; threads are queries by conversation id.", "Notifications (likes, mentions)? → separate consumers of the same tweet and engagement events.", "\"For you\" ranking? → candidate generation from many sources, plus an ML ranker on top of the same hydrated tweets."]]
      ]}
    ]
  });

  /* ═════════════════════ GOOGLE DOCS ═════════════════════ */
  BP.CASES.push({
    id: "gdocs", app: "Google Docs", icon: "📝", color: "#1a73e8", color2: "#34a853",
    title: "Design Real-time Collaborative Editing",
    tagline: "Several people typing in the same paragraph at the same instant, and everyone ends up with exactly the same document.",
    level: "Advanced", minutes: 18,
    concepts: ["ot-crdt", "websockets", "event-sourcing", "consistent-hashing", "wal", "idempotency"],
    stats: [
      { v: 3, suf: "B+", label: "Google Workspace users (Google, 2021)", kind: "Reported" },
      { v: 100, label: "people who can view or edit one doc at the same time (Docs help)", kind: "Reported" },
      { v: 0, pre: "", suf: " lost", label: "keystrokes allowed", kind: "Requirement" }
    ],
    story: "11:58 pm, two minutes before a deadline. Three teammates are fixing the same paragraph: one rewrites the opening, one deletes a sentence, one adds a citation, all at the same moment. Each sees the others' coloured cursors move, and nobody's work vanishes.<br><br>The obvious design, \"save the whole document when someone types\", loses work the moment two people type at once. Google Docs sends <b>operations</b> instead of documents, gives each document a <b>single place that orders them</b>, and uses <b>operational transformation</b> so concurrent edits land in the right place for everyone.",
    requirements: {
      functional: ["Several people edit the same document in real time", "See each other's cursors and selections", "Comments and suggestions", "Full revision history", "Offline editing that syncs later", "Sharing permissions"],
      nonFunctional: ["Your own typing appears instantly (no network wait)", "Others' edits appear within a fraction of a second", "Everyone converges to the same document", "No edit is ever lost", "Documents load fast even after years of history"]
    },
    estimate: [
      ["Documents open at once", "assumption", "10 M"],
      ["People actively typing", "assumption", "2 M"],
      ["Operations per second", "2M × ~3 ops/s", "≈ 6 M ops/s"],
      ["Bandwidth", "6M × ~100 B", "≈ 600 MB/s"],
      ["Editors per document", "Docs limit", "≤ 100 at once"]
    ],
    estimateNote: "Insight: total volume is large, but each document is small and has few editors. The scale problem shards naturally by document: one session server per open document.",
    naive: {
      title: "\"Send the whole document on every change; last write wins\"",
      desc: "Each client uploads its full copy when it changes; the server keeps whichever arrived last.",
      breaks: [
        "Two people typing at once: whoever saves second silently overwrites the other's work.",
        "Locking paragraphs prevents conflicts but makes co-editing miserable.",
        "Uploading the full document on every keystroke wastes bandwidth and adds latency."
      ]
    },
    steps: [
      { t: "Send operations, not documents", c: "ot-crdt",
        b: "Every change is a tiny <b>operation</b>: insert \"very \" at position 4, delete 6 characters at 10. Each carries the <b>revision number</b> it was made against. Ops are a few bytes, not the whole document.",
        a: "Sending \"change line 3 to …\" instead of re-mailing the whole book." },
      { t: "Apply locally first", c: "ot-crdt",
        b: "Your own keystroke is applied to your screen <b>immediately</b>, then sent to the server. You never wait for the network to see your own typing. The client keeps a queue of sent-but-unacknowledged ops.",
        a: "Writing on your own notepad while a courier carries a copy to the office." },
      { t: "One server orders each document", c: "consistent-hashing",
        b: "All editors of a document connect (over WebSockets) to the <b>same session server</b>, chosen by consistent hashing on the document id. That server assigns every op a global sequence number, so there's one agreed order per document.",
        a: "One referee per match keeps the official scorebook." },
      { t: "Transform concurrent ops", c: "ot-crdt",
        b: "If Alice inserts at position 0 while Bob deletes at position 10, Bob's op arrives \"late\": the text shifted under it. <b>Operational transformation</b> rewrites the incoming op against the ops it didn't know about (shift its position, shrink its range) so it means the same thing in the new text. Every client and the server do this, and all copies converge.",
        a: "\"Meet at the third house on the left\" becomes \"the fourth house\" if someone built a new house before it." },
      { t: "Store an op log plus snapshots", c: "event-sourcing",
        b: "The document <i>is</i> its history: an append-only log of ops (event sourcing). Revision history comes for free. To load quickly, periodically save a <b>snapshot</b> and replay only the ops after it.",
        a: "A bank statement: the balance (snapshot) plus the transactions since." },
      { t: "Presence and cursors", c: "websockets",
        b: "Cursor positions and selections are <b>ephemeral</b> events broadcast over the same connections. They aren't stored, and they're transformed like ops so a cursor stays on the right word as text shifts around it.",
        a: "Seeing where everyone is standing in a shared room." }
    ],
    diagram: {
      nodes: [
        { id: "a", x: 90, y: 110, label: "Alice's browser", sub: "local copy + pending ops", kind: "client", icon: "👩‍💻", desc: "Applies her edits instantly; transforms incoming ops." },
        { id: "b", x: 90, y: 340, label: "Bob's browser", sub: "local copy + pending ops", kind: "client", icon: "👨‍💻", desc: "Same: optimistic local edits." },
        { id: "gw", x: 300, y: 225, label: "WebSocket gateway", sub: "routes by doc id", kind: "edge", icon: "🔌", desc: "Keeps live connections; consistent hashing on doc id picks the session server." },
        { id: "ss", x: 530, y: 225, label: "Doc session server", sub: "orders & transforms", kind: "service", icon: "🧮", desc: "The single authority for this document's op order while it's open." },
        { id: "log", x: 780, y: 110, label: "Op log", sub: "append-only", kind: "queue", icon: "📜", desc: "Every op, durably. Revision history." },
        { id: "snap", x: 780, y: 340, label: "Snapshots", sub: "every N ops", kind: "db", icon: "🗄️", desc: "Fast loading: snapshot + replay recent ops." },
        { id: "acl", x: 530, y: 60, label: "Permissions", sub: "who can edit", kind: "db", icon: "🔐", desc: "Checked when a session opens." }
      ],
      flows: [
        { name: "Two people type at once", steps: [["a", "gw", "op: insert \"Wow! \" @0 (rev 41)"], ["b", "gw", "op: delete 6 @10 (rev 41)"], ["gw", "ss", "Both reach the doc's session server"], ["ss", "log", "Alice's op becomes rev 42"], ["ss", "log", "Bob's op transformed (@10 → @15) becomes rev 43"], ["ss", "a", "Send Bob's transformed op to Alice"], ["ss", "b", "Ack Bob; send Alice's op (rev 42) for him to transform"]] },
        { name: "Open a document", steps: [["a", "gw", "Open doc 7f3…"], ["gw", "ss", "Route to (or start) its session server"], ["ss", "acl", "Check edit permission"], ["ss", "snap", "Load the latest snapshot"], ["ss", "log", "Replay ops after the snapshot"], ["ss", "a", "Document + current revision"]] }
      ]
    },
    lab: { sim: "docs", title: "Collaborative Editing Lab", hint: "Alice and Bob edit offline at the same time. Sync with naive replay and watch the copies diverge, then switch to operational transformation." },
    tradeoffs: [
      { choice: "Central server orders ops (OT)", pro: "Simpler, compact ops, one source of truth", con: "Needs a live server per document" },
      { choice: "CRDTs instead", pro: "Peer-to-peer and offline-first, no central order needed", con: "Larger metadata per character; harder rich-text semantics" },
      { choice: "Op log + snapshots", pro: "Full history; fast loads", con: "Storage grows; needs compaction policies" }
    ],
    takeaways: ["Send intent (operations), not state.", "Give each shared object one place that orders its changes.", "Concurrent edits are a transformation problem, not a locking problem."],
    quiz: [
      { q: "Why doesn't \"last write wins\" work for co-editing?", o: ["It's too slow", "Whoever saves second silently erases the other person's changes", "Browsers forbid it", "It needs SQL"], a: 1, why: "Concurrent work must be merged, not overwritten." },
      { q: "Alice inserts 5 characters at the start while Bob deletes at position 10. What must happen to Bob's op on Alice's side?", o: ["Nothing", "Shift it to position 15", "Drop it", "Lock the paragraph"], a: 1, why: "The text before position 10 grew by 5, so the same characters are now at 15." },
      { q: "Why route every editor of one doc to the same server?", o: ["Cheaper", "So one place assigns a single agreed order to the doc's ops", "For backups", "It's required by WebSockets"], a: 1, why: "A single sequence per document makes transformation and convergence manageable." },
      { q: "How does a years-old document still open fast?", o: ["It replays every op since creation", "Load the latest snapshot and replay only the recent ops", "It's cached forever", "It doesn't"], a: 1, why: "Snapshots bound the replay work." }
    ],
    sources: ["Google Drive blog: What's different about the new Google Docs (operational transformation, 2010)", "Google Docs help: sharing and the 100 simultaneous editors limit", "Ellis & Gibbs (1989) / Jupiter (1995): foundations of operational transformation"],
    deep: [
      { h: "The editing protocol", blocks: [
        ["img", "Part of the HGN team during Tbilisi workshop 1.jpg", "A team working side by side on laptops: in a shared document, every one of these keyboards is sending operations at once."],
        ["code", "client → server   { doc: \"7f3\", rev: 41, ops: [{ insert: \"Wow! \", at: 0 }] }\nserver → client   { ack: true, rev: 42 }                                   // your op is now revision 42\nserver → others   { rev: 42, ops: [{ insert: \"Wow! \", at: 0 }], author: \"alice\" }\n\nclient rules:\n  • at most one batch of ops in flight; buffer the rest\n  • when a remote op arrives, transform it against your in-flight + buffered ops,\n    and transform those against it, then apply it locally"],
        ["p", "Keeping <b>one batch in flight</b> per client (the approach from the Jupiter system that Docs-style OT builds on) means the server only ever transforms against a short, known history. Each op carries a client-generated id, so a retried send after a network blip is recognised and not applied twice."]
      ]},
      { h: "Transformation rules", blocks: [
        ["table", ["Concurrent pair", "Rule (for the op applied second)"], [["insert vs insert at the same spot", "Tie-break by server order or user id, so both sides put them in the same order"], ["insert before a delete", "Shift the delete right by the inserted length"], ["delete before an insert", "Shift the insert left by the deleted length"], ["insert inside a deleted range", "Keep the inserted text; split the delete around it"], ["overlapping deletes", "Delete only the part not already deleted"]]],
        ["p", "The lab further down this page implements exactly these rules, fuzz-tested against 300,000 random pairs of concurrent edits with zero divergence. Real editors extend them to rich text (formatting ranges, tables, images)."]
      ]},
      { h: "OT or CRDT?", blocks: [
        ["table", ["", "Operational transformation", "CRDTs (e.g. Yjs, Automerge)"], [["Ordering", "A server orders ops per document", "No central order; every replica merges independently"], ["Offline / peer-to-peer", "Possible, but heavier to reconcile", "Designed for it"], ["Metadata", "Small: positions only", "Larger: a unique id per character or chunk"], ["Used by", "Google Docs (OT, per Google's 2010 description)", "Many local-first apps and editors"]]],
        ["extra", "A <b>CRDT</b> gives every character a unique, ordered identifier, so inserts and deletes commute: apply them in any order and every replica gets the same text. That avoids a central server but costs memory per character."]
      ]},
      { h: "Storage and history", blocks: [
        ["chart", { type: "line", title: "Ops to replay when opening a document", x: { label: "document age (edits made)", values: ["1k", "10k", "100k", "1M"] }, y: { label: "ops replayed", log: true }, series: [{ name: "Replay full log", values: [1e3, 1e4, 1e5, 1e6] }, { name: "Snapshot every 1,000 ops", values: [500, 500, 500, 500] }], note: "With periodic snapshots the load cost stays flat however old the document gets (about 500 ops on average)." }],
        ["list", ["<b>Revision history</b> groups the op log into human-sized versions (by time and author).", "<b>Comments</b> are anchored to text ranges and transformed with the text so they stay attached.", "<b>Permissions</b> are checked when the session opens and re-checked on change; a revoked editor's connection is closed."]]
      ]},
      { h: "Offline editing", blocks: [
        ["steps", [["Go offline", "The client keeps editing its local copy and queues ops, all made against the last revision it knew."], ["Reconnect", "It sends the queue. The server transforms it against everything that happened meanwhile and returns the missed ops."], ["Converge", "The client transforms the missed ops against its queue and applies them. Long offline sessions mean bigger transforms, but the same rules."]]]
      ]},
      { h: "Failure modes", blocks: [
        ["table", ["Failure", "Mitigation"], [["Session server crashes", "Clients reconnect; a new server loads snapshot + op log and continues from the last durable revision"], ["Op sent but no ack", "Client resends with the same op id; the server dedupes"], ["Two servers think they own a doc", "Ownership lease in a coordination service (e.g. a lock with a TTL); ops with a stale lease are rejected"], ["Huge paste or many editors", "Batch ops; the 100-editor cap bounds the transformation work"]]]
      ]}
    ]
  });

  /* New concepts used by these cases */
  const C = BP.CONCEPTS;
  C["ot-crdt"] = { name: "Operational transformation & CRDTs", icon: "🧬", cat: "Data", sim: "docs", used: ["gdocs"],
    one: "Merge concurrent edits so every copy of a shared document converges to the same result.",
    analogy: "Two people giving directions to the same house: if a new house is built on the street first, the second set of directions has to be adjusted.",
    body: "Clients send small operations (insert, delete) tagged with the revision they were made against. <b>OT</b> rewrites an op against the concurrent ops it didn't know about: shift positions, shrink overlapping deletes, break ties consistently. <b>CRDTs</b> give each element a unique ordered id so operations commute and need no central order.",
    when: "Collaborative editors, shared whiteboards, multiplayer state, offline-first apps.", pitfalls: "Subtle edge cases (overlaps, ties). Fuzz-test convergence; rich text multiplies the rules." };
  C["trending"] = { name: "Trending detection (sliding windows)", icon: "📈", cat: "Data", sim: "trends", used: ["twitter"],
    one: "Find what's unusually popular right now by comparing a recent rate with a baseline.",
    analogy: "A smoke alarm reacts to a sudden change in the air, not to the fact that the kitchen always smells of cooking.",
    body: "Count each term in sliding windows (e.g. the last 5 minutes) and keep a slowly updated baseline of its normal rate. Score = recent ÷ baseline. Approximate structures such as the <b>count-min sketch</b> keep memory small for millions of terms, and spam filters stop manipulation.",
    when: "Trends, anomaly detection, hot-key detection, fraud spikes." };
  C["event-sourcing"] = { name: "Event sourcing", icon: "📜", cat: "Architecture", used: ["gdocs"],
    one: "Store every change as an immutable event; the current state is a replay (or a snapshot plus recent events).",
    analogy: "A chess game recorded move by move: you can replay it to any point, and the board is just the result.",
    body: "The event log is the source of truth. You get full history and audit for free, and can rebuild read models later. Periodic snapshots keep replay fast. Kafka-style logs and WALs are the same idea at different layers.",
    pitfalls: "Event schemas must evolve carefully; replays of long histories need snapshots." };
  [["fanout", "twitter"], ["hot-key", "twitter"], ["snowflake", "twitter"], ["inverted-index", "twitter"], ["caching", "twitter"], ["message-queue", "youtube"], ["chunking", "youtube"], ["transcoding", "youtube"], ["cdn", "youtube"], ["abr", "youtube"], ["object-storage", "youtube"], ["sharding", "youtube"], ["websockets", "gdocs"], ["consistent-hashing", "gdocs"], ["wal", "gdocs"], ["idempotency", "gdocs"]]
    .forEach(([k, cid]) => { if (C[k]) { C[k].used = C[k].used || []; if (!C[k].used.includes(cid)) C[k].used.push(cid); } });
})();
