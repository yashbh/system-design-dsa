/* Blueprint — HLD course, part 2: case studies, infrastructure, microservices. */
(function () {
const L = (o) => BP.LESSONS.push(o);

/* ───────────────────────── 10. Typeahead ───────────────────────── */
L({
  id: "typeahead", mod: "cases", icon: "🔎", minutes: 35,
  title: "Case study: search typeahead (Google, Amazon)",
  scaler: "HLD 9 · Case Study: Typeahead",
  summary: "The 5-step interview process applied end to end: requirements, scale math, tries vs hashmaps, taming writes with buffering and sampling, sharding by prefix, and time decay.",
  concepts: ["trie", "sharding", "consistent-hashing", "caching"],
  related: [],
  sections: [
    { h: "The 5-step process for any HLD problem", blocks: [
      ["steps", [["1 · MVP / functional requirements", "What must it do? Ask clarifying questions and agree on scope."], ["2 · Estimate scale", "Is sharding needed (total storage)? Read-heavy, write-heavy or both? QPS → number of machines."], ["3 · Design goals", "Consistency vs availability, latency target, tolerance for data loss."], ["4 · APIs", "How the world calls you. The parameters often hint at the sharding key."], ["5 · Design", "Data structures, sharding, read and write paths, caching, optimizations."]]],
      ["tip", "Every case study in this module follows the same five steps. Practise saying them out loud; interviewers love a structured approach."]
    ]},
    { h: "1 · Requirements", blocks: [
      ["list", ["Show <b>5</b> suggestions.", "Rank by <b>popularity</b> (search frequency for the MVP; recency later).", "<b>Prefix</b> match only, no spell-correct, no personalization (confirm with the interviewer).", "Start suggesting after <b>3 characters</b>."]],
      ["p", "Recency teaser: \"Roger Binny\" has 1M searches over 5 years (~1,000/day). \"Roger Federer\" won Wimbledon yesterday: 10,000 searches since. Federer should rank first, so raw counts aren't enough."]
    ]},
    { h: "2 · Scale estimation", blocks: [
      ["math", [["Searches / day", "Google scale", "10 B"], ["Typeahead calls per search", "~6 keystroke batches", "60 B reads/day ≈ 700k/s"], ["New terms / day", "10% of searches", "1 B → 365 B/year"], ["Terms over 10 years", "365 B × 10", "3.65 T"], ["Bytes per term", "32 chars + 8 B count", "40 B"], ["Total storage", "3.65 T × 40 B", "≈ 146 TB → must shard"]], "1 write (frequency++) per 6 reads: that's <b>both read- and write-heavy</b>. Reads only dominate when they outnumber writes by an order of magnitude or more."],
      ["p", "<b>3 · Goals:</b> availability over consistency (a slightly stale suggestion is fine) and <b>very low latency</b>, because suggestions race the user's fingers. <b>4 · APIs:</b> <code>getSuggestions(prefix, limit=5)</code> and <code>updateFrequency(term)</code>, called asynchronously by the search service."]
    ]},
    { h: "5a · Trie with top-5 at every node", blocks: [
      ["p", "In a trie each node is a character, and the path from the root spells a prefix. The naive read walks to the prefix node and then scans the whole subtree for the top 5, which is huge for \"mic\". The trick is to <b>store the top-5 list at every node</b>. A read is then O(prefix length)."],
      ["fig", "trie", "Type a prefix, then press Search to bump a term. Turn on buffering, then let a day pass to see time decay."],
      ["p", "<b>Write:</b> increment the terminal node's count, then walk back up its ancestors and fix any top-5 list that changed. Only ancestors can be affected."],
      ["warn", "Practical problem: no off-the-shelf database stores tries, so you'd build and operate a custom store."]
    ]},
    { h: "5b · The hashmap approach (more practical)", blocks: [
      ["p", "Two key-value tables: <code>frequency: term → count</code> and <code>top5: prefix → [terms]</code>, with one entry per prefix. Reading \"mich\" is <b>one lookup</b> in a KV store, which shards by key with consistent hashing. \"mic\" and \"mich\" may live on different shards, and that's fine. Updates to the prefix entries can be applied <b>asynchronously</b>."]
    ]},
    { h: "Taming the writes", blocks: [
      ["p", "Insight: <b>only relative popularity matters</b>, not exact counts. So we can drop most writes:"],
      ["table", ["Technique", "How", "Effect"], [["Threshold buffer", "Count searches in a separate buffer map; flush <code>+50</code> to the main store when a term reaches 50", "Long-tail terms (typos, one-offs) never touch the main store; trending terms still flow quickly. Worst case ~400 GB/day, fits one machine, flush daily."], ["Sampling", "Record only every 100th occurrence (1% sample)", "100× fewer writes, same trend, like an exit poll."]]]
    ]},
    { h: "Sharding the trie", blocks: [
      ["p", "Suggestions start at 3 characters, so shard by the <b>first 3 characters</b>: 36³ ≈ 46,656 ≈ 50k groups. Some prefixes (\"the\", \"mic\") are scorching and others (\"qzx\") are idle. Use consistent hashing and <b>co-locate hot prefixes with cold ones</b> so shards are balanced."]
    ]},
    { h: "Recency with time decay", blocks: [
      ["p", "Subtracting a fixed amount daily is unfair: a term with count 2 vanishes while one with 1,000 barely notices. Instead decay by a <b>percentage</b>: every day <code>freq = freq / TDF</code>, and every search <code>freq += 1</code>. With TDF = 2, today's searches weigh 1, yesterday's ½, the day before ¼… Old fads fade and trends rise. Try the 🌙 button in the trie figure."]
    ]}
  ],
  quiz: [
    { q: "Why store the top-5 list at every trie node?", o: ["To save memory", "So reads are O(prefix length) instead of scanning a huge subtree", "To support spell-check", "For sharding"], a: 1, why: "Precompute the answer per prefix and pay on writes, which are fewer and async." },
    { q: "Total storage for 10 years of terms?", o: ["~146 GB", "~146 TB", "~146 PB", "~1.46 TB"], a: 1, why: "365B new terms/year × 10 × 40 bytes ≈ 146 TB." },
    { q: "1% sampling of searches reduces main-store writes by…", o: ["1%", "10×", "100×", "Nothing"], a: 2, why: "One write per 100 searches, and the ranking trend is unchanged." },
    { q: "Why decay by percentage, not a fixed amount?", o: ["It's faster", "Fixed subtraction kills small terms but barely affects big ones", "Percentages are smaller", "SQL needs it"], a: 1, why: "Exponential decay treats all terms proportionally." }
  ],
  refs: [["Design autocomplete / typeahead (video walkthrough)", "https://www.youtube.com/watch?v=us0qySiUsGU"], ["ByteByteGo: Design a search autocomplete system", "https://bytebytego.com/courses/system-design-interview/design-a-search-autocomplete-system"]]
});

/* ───────────────────────── 11. Messaging ───────────────────────── */
L({
  id: "messaging", mod: "cases", icon: "💬", minutes: 30,
  title: "Case study: messaging apps (Messenger, WhatsApp, Slack)",
  scaler: "HLD 11 · Case Study: Messaging Apps",
  summary: "Idempotent sends, the userId vs conversationId sharding decision, which shard to write first, and why the app servers themselves become the cache.",
  concepts: ["idempotency", "sharding", "write-policies", "websockets"],
  related: ["whatsapp"],
  sections: [
    { h: "Requirements & scale", blocks: [
      ["list", ["Send a message to a recipient, in real time.", "Message history (paginated).", "A list of most-recent conversations."]],
      ["math", [["Messages / day", "given", "20 B"], ["Size", "≤ 200 bytes", "4 TB / day"], ["Per year", "4 TB × 365", "≈ 1.5 PB"]], "Sharding is mandatory, and the system is both read- and write-heavy. Goals: <b>high consistency</b> (a message the sender thinks was sent must arrive) and low latency."]
    ]},
    { h: "Idempotent writes", blocks: [
      ["p", "Phones live on flaky networks. The client sends \"Hello\", the server stores it, the ACK is lost, and the client retries. A naive server now shows two \"Hello\"s. Fix: the <b>client generates a <code>messageId</code></b> when the message is composed (timestamp + senderId + deviceId + recipientId) and reuses it on every retry. The server dedupes on that id. Typing \"Hello\" twice on purpose creates two ids, so both go through."],
      ["code", "sendMessage(sender, recipient, text, messageId)\ngetMessages(userId, conversationId, offset, limit)\ngetConversations(userId, offset, limit)"],
      ["sim", "chat", "The same idea in WhatsApp: lose an ACK and watch the duplicate get ignored."]
    ]},
    { h: "Sharding key: userId or conversationId?", blocks: [
      ["fig", "msgshard", "Compare write counts as the conversation grows. Then try both write orders with a failing second write."],
      ["table", ["", "Shard by userId (mailboxes)", "Shard by conversationId"], [["getConversations", "1 shard", "Needs a secondary index (userId → conversations by last message)"], ["getMessages", "1 shard", "1 shard"], ["sendMessage (1:1)", "2 writes (sender + recipient mailbox)", "3 writes (conversation + both users' lists)"], ["sendMessage (1,000-member group)", "1,000 writes 😱", "1 write + best-effort list updates"], ["Used by", "1:1-centric messengers", "Slack, Teams, Discord, Telegram groups"]]]
    ]},
    { h: "Consistency across two shards: write the recipient first", blocks: [
      ["p", "With userId sharding a send is two writes on two machines. If one fails, which outcome do you prefer?"],
      ["table", ["Order", "If the 2nd write fails", "Verdict"], [["Sender first", "Alice sees \"Hi\" in her chat; Bob never got it", "❌ The worst failure: silent non-delivery"], ["Recipient first", "Bob has it; Alice briefly doesn't see her own message. Retry the sender write from a queue until it succeeds", "✅ Self-healing and acceptable"]]]
    ]},
    { h: "Caching: the app servers are the cache", blocks: [
      ["p", "Writes can't be sampled or batched here, because every message must persist. So absorb the <b>reads</b> with a cache that is (1) consistent (write-through), (2) huge (so sharded), and (3) race-free under concurrent writes for the same user."],
      ["p", "Solution: assign users to app servers by <b>consistent hashing</b>. Each server caches its users' recent data in RAM, takes a <b>per-user lock</b> so writes are serialized, writes through to the DB, and evicts cold users with LRU."],
      ["table", ["Pros", "Cons"], [["Scales horizontally (more servers = more cache)", "A dead server's users are unavailable for a few seconds"], ["Consistency and races handled in one place", "A restarted server has a cold cache"]]],
      ["p", "With reads absorbed, the database is write-heavy and must be consistent: the notes pick <b>HBase</b> (wide-column, write-optimized). Facebook Messages famously chose HBase for this."],
      ["extra", "The notes don't design real-time delivery. In practice clients keep a <b>WebSocket</b> / long-lived connection to a gateway, a session registry maps user → gateway, and offline users get a durable inbox plus push notifications. See the <a href=\"#/case/whatsapp\">WhatsApp case study</a>."]
    ]}
  ],
  quiz: [
    { q: "How do you make sendMessage idempotent without merging two genuine \"Hello\"s?", o: ["Dedupe by message text", "A client-generated messageId reused only on retries", "Server timestamps", "Locks"], a: 1, why: "Retries share an id; new messages get new ids." },
    { q: "Which shard do you write first with userId sharding?", o: ["Sender's", "Recipient's", "Either", "Both in parallel without checking"], a: 1, why: "The failure mode becomes \"sender briefly doesn't see it\" (and retry), not \"recipient never got it\"." },
    { q: "Why do Slack-like apps shard by conversationId?", o: ["It's alphabetical", "One message to a huge group would otherwise mean one write per member", "To support emojis", "It's required by HBase"], a: 1, why: "Group fan-out under userId sharding is prohibitively expensive." }
  ],
  refs: [["ByteByteGo: Design a chat system", "https://bytebytego.com/courses/system-design-interview/design-a-chat-system"], ["Meta: The underlying technology of Messages (HBase)", "https://engineering.fb.com/2010/11/15/core-infra/the-underlying-technology-of-messages/"], ["Discord: How Discord stores trillions of messages", "https://discord.com/blog/how-discord-stores-trillions-of-messages"]]
});

/* ───────────────────────── 12. Elasticsearch ───────────────────────── */
L({
  id: "search", mod: "cases", icon: "🔍", minutes: 25,
  title: "Case study: full-text search with Elasticsearch",
  scaler: "HLD 13 · Case Study: ElasticSearch",
  summary: "Why LIKE '%job post%' can't search LinkedIn, how Lucene builds an inverted index, and how Elasticsearch shards, replicates and fans out queries.",
  concepts: ["inverted-index", "sharding", "replication"],
  related: [],
  sections: [
    { h: "Why databases can't do this", blocks: [
      ["p", "Goal: find LinkedIn posts matching \"job posting\", including \"job post\" and \"jobs posted\". In SQL, <code>WHERE content LIKE '%job post%'</code> has a leading wildcard, so no index helps: it's a <b>full table scan</b> doing a substring search in every row (roughly O(N × M²)). NoSQL stores have the same problem: you'd still read every value."]
    ]},
    { h: "The inverted index", blocks: [
      ["p", "Flip the relationship: instead of document → words, store <b>word → list of (document, position)</b>. Apache Lucene builds it with a text-analysis pipeline:"],
      ["steps", [["Tokenize", "Split text into words."], ["Remove stop words", "Drop \"a\", \"the\", \"is\"… (the notes call this character elimination)."], ["Stem", "Reduce to roots: ran / running → run, crashed / crashes → crash."], ["Index", "For each term, append (docId, position). Positions enable phrase queries and highlighting."]]],
      ["fig", "invindex", "Click a document to see the pipeline. Search for \"running app\" and notice it matches \"ran the app\"."],
      ["p", "Uses go well beyond posts: log analysis (the \"E\" in ELK), resume search, product search, site search."]
    ]},
    { h: "Elasticsearch: Lucene, distributed", blocks: [
      ["p", "A single Lucene instance is a SPOF, runs out of disk and can't take high traffic. Elasticsearch distributes it, favouring <b>availability over consistency</b> (search results a second stale are fine)."],
      ["list", ["<b>Document</b> = one post · <b>Index</b> = a collection (posts, resumes) · <b>Node</b> = a machine.", "<b>Sharding:</b> by document id: <code>shard = hash(id) % number_of_primary_shards</code>. Plain modulo works because the shard count is <b>fixed at index creation</b>.", "<b>Replication:</b> each shard has a primary and replicas, for durability <i>and</i> read throughput."]],
      ["flow", { nodes: [
        { id: "c", x: 90, y: 225, label: "Client", sub: "index / search", kind: "client", icon: "🧑‍💻", desc: "Can send requests to any node." },
        { id: "co", x: 320, y: 225, label: "Coordinating node", sub: "routes & merges", kind: "edge", icon: "🧭", desc: "Whichever node receives the request." },
        { id: "p0", x: 600, y: 80, label: "Shard 0 primary", sub: "node A", kind: "db", icon: "🗂️", desc: "Writes for docs hashing to shard 0 go here first." },
        { id: "r0", x: 860, y: 80, label: "Shard 0 replica", sub: "node B", kind: "db", icon: "🗂️", desc: "Async copy; can serve reads." },
        { id: "p1", x: 600, y: 370, label: "Shard 1 primary", sub: "node B", kind: "db", icon: "🗂️", desc: "Owns the other half of the documents." },
        { id: "r1", x: 860, y: 370, label: "Shard 1 replica", sub: "node C", kind: "db", icon: "🗂️", desc: "Async copy." }
      ], flows: [
        { name: "Index a post", steps: [["c", "co", "PUT /posts/_doc/42"], ["co", "p0", "hash(42) % 2 = 0 → shard 0's primary runs the Lucene pipeline"], ["p0", "r0", "Replicate to the shard's replicas"], ["co", "c", "Acknowledged"]] },
        { name: "Search", steps: [["c", "co", "GET /posts/_search?q=job posting"], ["co", "r0", "Fan out: one copy of shard 0 (a replica is fine)"], ["co", "p1", "…and one copy of shard 1, in parallel"], ["r0", "co", "Top hits from shard 0"], ["p1", "co", "Top hits from shard 1"], ["co", "c", "Merge, rank, return. If a copy fails, retry another copy of that shard."]] }
      ]}, "Writes go to one shard's primary; searches fan out to every shard and are merged."],
      ["tip", "Writes know their document id, so they hit one shard. Searches don't know which documents match, so they must ask <b>every</b> shard. That asymmetry is why ES clusters add replicas to scale reads."]
    ]}
  ],
  quiz: [
    { q: "Why is SQL LIKE '%term%' bad for full-text search?", o: ["It's case-sensitive", "A leading wildcard forces a full scan of every row", "It can't use JOINs", "It's not ACID"], a: 1, why: "No B-tree can help with substring matches in long text." },
    { q: "What does stemming buy you?", o: ["Smaller documents", "\"ran\", \"running\" and \"runs\" all match \"run\"", "Encryption", "Faster writes"], a: 1, why: "Normalizing to roots improves recall." },
    { q: "Why can ES use hash(id) % N instead of consistent hashing?", o: ["It's faster", "The number of primary shards is fixed at index creation", "ES doesn't replicate", "IDs are sorted"], a: 1, why: "N never changes, so modulo never reshuffles." }
  ],
  refs: [["Elastic: Elasticsearch from the bottom up", "https://www.elastic.co/blog/found-elasticsearch-from-the-bottom-up"], ["Elastic: Text analysis", "https://www.elastic.co/docs/manage-data/data-store/text-analysis"], ["Elastic: Reading and writing documents", "https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-replication.html"]]
});

/* ───────────────────────── 13. S3 / HDFS + quadtrees ───────────────────────── */
L({
  id: "storage-geo", mod: "cases", icon: "🗺️", minutes: 35,
  title: "Case study: large-file storage (S3/HDFS) & nearest neighbours (quadtrees, Uber)",
  scaler: "HLD 14 · Case Study: S3, HDFS + Quad Trees · HLD 15 · Design Uber",
  summary: "Store a 50 TB file reliably with chunks and replicas, then find the 10 nearest restaurants or cabs with a quadtree that adapts to density.",
  concepts: ["hdfs", "object-storage", "quadtree", "geo-index"],
  related: ["uber"],
  sections: [
    { h: "Storing very large files", blocks: [
      ["p", "Posts store only metadata in the DB, while the media goes to a blob store that returns a URL. But how do you store a 50 TB video, or a log file that never stops growing? <b>Split it into chunks spread across machines.</b>"],
      ["p", "Chunk size matters. 50 TB in 1 MB chunks = <b>5 × 10⁷ chunks</b>, each needing a metadata entry and collation on read. HDFS benchmarked common workloads and settled on <b>128 MB</b> blocks (64 MB in HDFS 1)."],
      ["fig", "hdfs", "Upload a file, see how it's split and where replicas land. Kill a DataNode and watch re-replication."],
      ["list", ["<b>NameNode:</b> metadata only: file → blocks → DataNodes (kept in RAM, itself replicated).", "<b>DataNodes:</b> store the blocks, heartbeat to the NameNode.", "<b>Rack-aware replication:</b> never put all copies on one rack, so a rack power failure can't lose data.", "<b>Upload:</b> buffer 128 MB → ask the NameNode where → write to a DataNode, which pipelines to the replicas → repeat. A 200 MB file = 128 MB + 72 MB.", "<b>Download:</b> get the block list, fetch blocks in order (or in parallel), stream to the client."]],
      ["analogy", "Like a torrent: a 1,000 MB movie split into 100 parts can be fetched from 100 peers at once, and a slow peer's part is simply re-requested elsewhere."],
      ["extra", "<b>S3</b> exposes the same idea as a flat bucket/key namespace with multipart upload (up to 10,000 parts), strong read-after-write consistency, and erasure coding internally. <b>Erasure coding</b> (e.g. RS(6,3)) survives 3 losses with 50% overhead, vs 200% for 3× replication."]
    ]},
    { h: "Nearest neighbours: why normal indexes fail", blocks: [
      ["list", ["<b>Brute force:</b> distance to every place on Earth. Hopeless.", "<b>Bounding square</b> <code>lat BETWEEN x±k AND lng BETWEEN y±k</code>: picking k is hard, and a B-tree can use only one of the two ranges.", "<b>Fixed grid</b> (1 km² cells): oceans need huge cells and cities tiny ones. A cell should hold a <i>count</i> of points (~100), not cover a fixed area."]]
    ]},
    { h: "The quadtree", blocks: [
      ["p", "Start with the whole world as one node. If a node holds more than <b>100</b> points, split it into <b>4</b> equal quadrants and recurse. Dense areas get deep, tiny cells and empty areas stay as big cells. Height ≈ log N."],
      ["fig", "quadtree", "Drop points (try the dense city), then switch to “Find 5 nearest” and click the map."],
      ["list", ["<b>Find my cell:</b> at each node compare x with x_mid and y with y_mid → O(log N).", "<b>Neighbours:</b> follow sibling pointers, or probe just outside the cell boundary in 8 directions.", "<b>Insert:</b> find the leaf; if it would exceed the limit, split it (and update ~100 places' grid ids).", "<b>Delete:</b> merge four children back when together they drop below the limit."]],
      ["math", [["Places", "given", "100 M"], ["Nodes if ~20 places per leaf", "(10⁸ × 4/3) ÷ 20", "≈ 6.5 M"], ["Bytes per node", "4 coords + 4 child pointers", "≈ 80 B"], ["Tree size", "6.5 M × 80 B", "≈ 520 MB"], ["Points (lat, lng)", "10⁸ × 32 B", "3.2 GB"], ["Total", "", "≈ 4 GB: fits in one machine's RAM"]], "Small enough to hold in memory and replicate for availability."]
    ]},
    { h: "Design Uber: when the points move", blocks: [
      ["list", ["<b>Shard by city.</b> 10M cabs worldwide, but a rider in Mumbai only needs Mumbai's (the busiest Indian cities have ~50k).", "<b>Density changes with place and time</b>, so build a quadtree per city from current cab positions.", "Cabs ping every ~60 s; keep <code>cab → last location</code> in Redis.", "<b>Don't update the tree on every ping.</b> The driver app knows its cell's bounding box and only reports when it <i>crosses</i> into a new cell.", "<b>Hysteresis:</b> split above ~75 and merge below ~50, so cells don't flap as cabs move in and out. Or rebalance every few hours.", "Offer the ride to nearby drivers round-robin until one accepts."]],
      ["tip", "Uber's production system uses <b>H3</b> hexagons instead of quadtrees. Explore it in the <a href=\"#/case/uber\">Uber case study</a>."]
    ]}
  ],
  quiz: [
    { q: "How does HDFS chunk a 200 MB file?", o: ["2 × 100 MB", "128 MB + 72 MB", "200 × 1 MB", "One 200 MB block"], a: 1, why: "128 MB blocks; the last block holds the remainder." },
    { q: "Why rack-aware replication?", o: ["Faster writes", "A rack-level failure (power, switch) would otherwise lose every copy", "Cheaper disks", "It's required by S3"], a: 1, why: "Spread replicas across failure domains." },
    { q: "Why do quadtrees beat fixed grids?", o: ["They're simpler", "Cells adapt to density: tiny in cities, huge over oceans", "They use less CPU", "They're SQL-native"], a: 1, why: "Split when a cell holds too many points." },
    { q: "How do you avoid hammering Uber's quadtree with location pings?", o: ["Ignore pings", "Update only when a cab crosses into a new cell (client-side check)", "Use a bigger server", "Ping every second"], a: 1, why: "Most pings stay within the same cell, so they need no tree update." }
  ],
  refs: [["Apache HDFS architecture", "https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html"], ["HDFS erasure coding", "https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/HDFSErasureCoding.html"], ["S3 multipart upload", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html"], ["Interactive quadtree visualization", "https://jimkang.com/quadtreevis/"], ["Uber: H3 hexagonal spatial index", "https://www.uber.com/blog/h3/"], ["The Google File System paper", "https://research.google/pubs/the-google-file-system/"]]
});

/* ───────────────────────── 14. Video streaming ───────────────────────── */
L({
  id: "video", mod: "cases", icon: "🎥", minutes: 30,
  title: "Case study: video streaming (Hotstar, Google Meet)",
  scaler: "HLD 17 · Case Study: Video Streaming",
  summary: "Adaptive bitrate, chunking and pre-loading for recorded video; segmentation pipelines for live cricket at 50M viewers; and why video calls need a different architecture.",
  concepts: ["abr", "cdn", "transcoding", "chunking"],
  related: ["netflix"],
  sections: [
    { h: "Q1 · Different bandwidths: adaptive bitrate", blocks: [
      ["p", "If everyone downloads the same heavy stream, slow connections buffer forever. Encode each video at several resolutions/bitrates and let the player pick the <b>best quality the connection can sustain right now</b>, re-measuring continuously. That's <b>adaptive bitrate streaming (ABR)</b>."],
      ["sim", "abr", "You are the network: drag bandwidth and watch the player change quality to protect its buffer."],
      ["p", "Device matters too: 1080p on a phone wastes data. Hotstar detects the device via the <b>user-agent</b> string and <b>fingerprinting</b> (screen size, time zone…)."]
    ]},
    { h: "Q2 · Recorded content: chunking & pre-loading", blocks: [
      ["list", ["<b>Chunking:</b> never download the whole movie. Split it into short chunks and request only what's being watched (seek to 10:00 → fetch that chunk).", "<b>Chunk metadata first:</b> fetch timestamps, chunk ids and low-res thumbnails up front, so scrubbing shows previews instantly.", "<b>Pre-load</b> the next chunk around 30–40 s into a 60 s chunk; evict watched chunks with LRU to bound memory.", "Each chunk is fetched at the current ABR quality, so quality can change chunk by chunk.", "Serve chunks from a <b>CDN</b>, not straight from S3/HDFS. Cache popular titles' metadata server-side (a few titles get most views)."]],
      ["tip", "Homework from the notes: split chunks by <b>scene/shot</b> instead of fixed time. Most people skip the cast intro, so align a chunk boundary there."]
    ]},
    { h: "Q3 · Live: segments, not files", blocks: [
      ["p", "Live content can't be transcoded in advance, and viewers accept about a minute of lag at most. Large chunks mean large lag, so use short <b>15–30 s segments</b> (modern low-latency HLS goes to a few seconds)."],
      ["flow", { nodes: [
        { id: "cam", x: 90, y: 225, label: "Stadium feed", sub: "RTMP ingest", kind: "client", icon: "🎥", desc: "The broadcaster pushes a continuous stream." },
        { id: "seg", x: 300, y: 225, label: "Segmenter", sub: "15–30 s pieces", kind: "service", icon: "✂️", desc: "Cuts the live stream into segments." },
        { id: "enc", x: 520, y: 80, label: "Transcoders", sub: "240p → 1080p", kind: "service", icon: "🎞️", desc: "Each segment is encoded at several bitrates in parallel." },
        { id: "meta", x: 520, y: 370, label: "Metadata DB", sub: "cache + MySQL", kind: "db", icon: "🗂️", desc: "Which segments exist, at which qualities." },
        { id: "cdn", x: 760, y: 80, label: "CDN (Akamai)", sub: "edges in India", kind: "edge", icon: "🌍", desc: "Delivers segments: by far the heaviest workload." },
        { id: "v", x: 900, y: 225, label: "50M viewers", sub: "polling players", kind: "client", icon: "📱", desc: "Each player polls for new segments and downloads them from the nearest edge." }
      ], flows: [
        { name: "One live segment", steps: [["cam", "seg", "Continuous RTMP stream"], ["seg", "enc", "Segment #1,204 (15 s) → transcode to 4 qualities"], ["enc", "meta", "Record the segment's metadata"], ["enc", "cdn", "Push the renditions to CDN edges"], ["v", "meta", "Player polls: \"anything after #1,203?\""], ["v", "cdn", "Download #1,204 at the right quality from the nearest edge"]] }
      ]}, "Live pipeline: segment → transcode → metadata + CDN → polling players."],
      ["list", ["Lagging viewers are fine: not everyone needs to be at the same timestamp, and replays come for free.", "Trade-off: tiny segments mean lots of metadata and requests; big segments mean more delay.", "<b>Predictive scaling:</b> autoscaling reacts too slowly, so Hotstar pre-scales using viewing patterns (traffic spikes when Dhoni walks out to bat)."]]
    ]},
    { h: "Q4 · From 100 to 50 million viewers", blocks: [
      ["table", ["Workload", "Scales with viewers?", "How to scale"], [["Ingest + transcode", "No", "Fixed per stream"], ["Metadata polling", "Yes", "More app servers + metadata cache"], ["Video delivery", "Yes, and dominant", "CDN edges near users, reached via Anycast"]]]
    ]},
    { h: "Google Meet is a different problem", blocks: [
      ["extra", "Video calls need &lt;300 ms delay, not 30 s, so HTTP segments are out. Meet uses <b>WebRTC</b> over UDP: signaling to exchange session info, STUN/TURN for NAT traversal, and an <b>SFU</b> (selective forwarding unit) that receives each participant's stream once (often several resolutions via simulcast) and forwards the right layer to each viewer. Mesh (peer-to-peer) only works for 2–4 people."]
    ]}
  ],
  quiz: [
    { q: "Why short segments for live streaming?", o: ["Better compression", "Large chunks mean large lag; segments keep delay to seconds", "CDNs require it", "To save storage"], a: 1, why: "A player can't play a chunk until it has been produced." },
    { q: "Which live workload dominates at 50M viewers?", o: ["Transcoding", "Video delivery via the CDN", "Metadata DB", "Ingest"], a: 1, why: "Transcoding is per stream; delivery is per viewer." },
    { q: "Why not use HLS for a video call?", o: ["No audio support", "Seconds of latency; calls need real-time WebRTC", "Too expensive", "No encryption"], a: 1, why: "Interactive media needs sub-second delay." }
  ],
  refs: [["Scaling Hotstar for 25M concurrent viewers (talk)", "https://www.youtube.com/watch?v=QjvyiyH4rr0"], ["Apple HLS developer hub", "https://developer.apple.com/streaming/"], ["ByteByteGo: How YouTube handles massive uploads", "https://bytebytego.com/guides/how-does-youtube-handle-massive-video-content-upload/"], ["WebRTC getting started", "https://webrtc.org/getting-started/overview"], ["Wikipedia: Adaptive bitrate streaming", "https://en.wikipedia.org/wiki/Adaptive_bitrate_streaming"]]
});

/* ───────────────────────── 15. Kafka & ZooKeeper ───────────────────────── */
L({
  id: "kafka-zk", mod: "infra", icon: "📬", minutes: 35,
  title: "Coordination & messaging: ZooKeeper and Kafka",
  scaler: "HLD 12 · Messaging Queues: Apache Kafka & Zookeeper",
  summary: "How a cluster agrees on who the master is (ephemeral znodes, watches, quorums), and how persistent queues with topics, partitions and consumer groups decouple a system.",
  concepts: ["zookeeper", "message-queue", "kafka", "quorum"],
  related: ["whatsapp", "bitly"],
  sections: [
    { h: "Problem 1: everyone must know who the master is", blocks: [
      ["p", "With master-slave replication, every write must go to the master, so every app server needs its address, and when it dies, everyone must quickly agree on a new one. A single \"who's the master?\" machine is itself a <b>single point of failure</b> and adds a <b>network hop</b> to every request. Enter <b>ZooKeeper</b>: a small, strongly consistent, file-system-like store for coordination data."]
    ]},
    { h: "Znodes, election and watches", blocks: [
      ["list", ["Data lives at paths like <code>/clusterx/master_ip</code>. Each entry is a <b>znode</b> (a file, not a machine).", "<b>Persistent znode:</b> stays until deleted, for config.", "<b>Ephemeral znode:</b> lives only while its creator's session heartbeats. If the owner dies, it's deleted automatically. Only the owner can modify it."]],
      ["steps", [["Election", "Every storage machine races to create the same ephemeral znode with its own IP. ZooKeeper serializes the writes, so exactly one wins."], ["Watches", "App servers read the znode once, cache the master's IP, and set a <b>watch</b>. There's no extra hop per request."], ["Master dies", "Its heartbeats stop → session expires → znode deleted → every watcher notified."], ["Re-election", "Slaves race again. App servers clear their cache; a write arriving in this gap fails."], ["Old master returns", "It reads the znode, sees a new master, and rejoins as a slave."]]],
      ["fig", "zookeeper", "Start an election, then kill the master and watch failover."]
    ]},
    { h: "ZooKeeper's own reliability: majority quorum", blocks: [
      ["p", "ZooKeeper runs as an odd-sized ensemble with an elected leader. Every write goes to the leader, which broadcasts it; it commits only if a <b>majority</b> acknowledge (3 of 5, 4 of 7), counted against the <i>total</i> cluster size."],
      ["warn", "<b>Why a majority?</b> Partition 5 nodes into {z1,z2} and {z3,z4,z5}. If half were enough, one write could land on z1–z2 and a conflicting one on z4–z5, giving <b>split brain</b>. Any two majorities must overlap in at least one node, so only one side can win."],
      ["tip", "Odd sizes are cheaper: 4 nodes need 3 acks and tolerate only 1 failure, the same as 3 nodes."]
    ]},
    { h: "Problem 2: don't make users wait for side effects", blocks: [
      ["p", "Abhi messages Raj. We should also notify Raj, email him if he's been away for 24 h, and update analytics. Abhi shouldn't wait for any of that, and an email failure doesn't mean the message failed. Publish a \"message sent\" event to a <b>persistent queue</b> (durable on disk) and let each consumer process it at its own pace. That's <b>pub-sub</b>."],
      ["p", "Different events interest different consumers (Flipkart's invoice service doesn't care about vendor chat messages), so events go into named <b>topics</b>."]
    ]},
    { h: "Kafka, from first principles", blocks: [
      ["table", ["Question", "Kafka's answer"], [["A topic is too big for one machine", "Split it into <b>partitions</b> spread across brokers"], ["Is it still ordered?", "Only <b>within a partition</b>. Messages with the same <b>key</b> go to the same partition: <code>hash(key) % partitions</code>"], ["One consumer is too slow", "A <b>consumer group</b>: each partition is assigned to exactly one consumer in the group"], ["A broker dies", "Each partition is <b>replicated</b> (leader + followers) on different brokers"], ["Which broker do I talk to?", "Any. It knows where each partition's leader lives"], ["How do I get only new events?", "Each group tracks an <b>offset</b> per partition and commits it after processing"], ["Kept forever?", "No: until the <b>retention period</b> ends (or compacted per key)"]]],
      ["fig", "kafka", "Produce with keys, change the number of consumers, then add a second consumer group."],
      ["warn", "More consumers than partitions? The extras sit <b>idle</b>. Changing the partition count changes <code>hash % N</code>, which breaks per-key ordering for in-flight keys."],
      ["extra", "<b>Kafka vs RabbitMQ.</b> RabbitMQ is a broker with exchanges routing into queues: messages are pushed to consumers and deleted on ack, with rich routing, priorities and dead-letter queues, which suits task queues. Kafka is a replicated append-only <b>log</b>: consumers pull and track their own offsets, many groups can re-read the same data, and you can replay. That suits event streaming and analytics."]
    ]}
  ],
  quiz: [
    { q: "How many acks does a 5-node ZooKeeper write need (one node is down)?", o: ["2", "3", "4", "5"], a: 1, why: "Majority of the total size (5) = 3, regardless of how many are alive." },
    { q: "Topic with 6 partitions, consumer group of 10. What happens?", o: ["Messages are duplicated", "4 consumers sit idle", "Kafka adds partitions", "Error"], a: 1, why: "Each partition is consumed by exactly one member of a group." },
    { q: "How do you keep each user's messages in order?", o: ["One partition for everything", "Use userId as the message key", "Sort on the consumer", "Use RabbitMQ"], a: 1, why: "Same key → same partition → ordered." },
    { q: "Why do app servers set a watch instead of asking ZooKeeper on every request?", o: ["Watches are cheaper to store", "To avoid an extra hop per request and get notified only when the master changes", "ZooKeeper forbids reads", "For encryption"], a: 1, why: "Cache + notify beats polling." }
  ],
  refs: [["ZooKeeper overview", "https://zookeeper.apache.org/doc/current/zookeeperOver.html"], ["ZooKeeper recipes (leader election, locks)", "https://zookeeper.apache.org/doc/current/recipes.html"], ["Apache Kafka introduction", "https://kafka.apache.org/intro"], ["ByteByteGo: Why is Kafka fast?", "https://bytebytego.com/guides/why-is-kafka-fast/"], ["Confluent: choosing partition counts", "https://www.confluent.io/blog/how-choose-number-topics-partitions-kafka-cluster/"], ["RabbitMQ: AMQP concepts", "https://www.rabbitmq.com/tutorials/amqp-concepts"]]
});

/* ───────────────────────── 16. Unique IDs & rate limiters ───────────────────────── */
L({
  id: "ids-limits", mod: "infra", icon: "🎫", minutes: 30,
  title: "Popular questions: unique ID generators & rate limiters",
  scaler: "HLD 16.1 · Unique ID Generator · HLD 16.2 · Rate Limiters",
  summary: "Generate sortable 64-bit IDs on a thousand machines without coordination, and compare five rate-limiting algorithms on the same traffic.",
  concepts: ["snowflake", "id-generation", "rate-limiting"],
  related: ["bitly", "stripe"],
  sections: [
    { h: "Unique IDs: requirements", blocks: [
      ["p", "<b>8-byte numeric</b> IDs that are <b>unique</b> across machines and <b>roughly time-ordered</b> (if t₁ &lt; t₂ then id₁ &lt; id₂), generated at high rates."],
      ["table", ["Option", "Problem"], [["DB auto-increment", "Works on one machine; separate machines hand out the same numbers"], ["UUID", "Unique, but 128-bit, not numeric, not time-ordered (and random inserts fragment B-tree indexes)"], ["Timestamp alone", "Two machines in the same millisecond collide"], ["Multi-master modulo (3n, 3n+1, 3n+2)", "Unique but not time-ordered across machines"], ["Ticket server (Flickr)", "Simple, but a central dependency and extra hop (two servers: odd/even for HA)"], ["Timestamp + machine id + sequence", "✅ Twitter Snowflake"]]]
    ]},
    { h: "Twitter Snowflake", blocks: [
      ["fig", "snowflake", "Generate IDs and inspect the bit fields. Burst 5,000 in one millisecond to overflow the sequence."],
      ["math", [["Timestamp bits", "2⁴¹ ms", "≈ 69.7 years from a custom epoch"], ["Machines", "5 bits DC × 5 bits worker", "1,024"], ["IDs per ms per machine", "2¹² sequence", "4,096 (≈ 4M/s)"]], "Because time is in the high bits, IDs sort by creation time with no coordination."],
      ["warn", "Watch for <b>clock skew</b>: if a machine's clock jumps backwards, it could reissue IDs. Snowflake refuses or waits. Machine ids must be unique, and are often assigned through ZooKeeper."]
    ]},
    { h: "Rate limiters", blocks: [
      ["p", "A rate limiter caps how often a client (IP, user, API key) may call you, for example <b>5 requests per 60 s per IP</b>. The 6th gets <b>HTTP 429 Too Many Requests</b>. It protects against abuse and DDoS, enforces quotas, and shields downstream services. It usually sits in the API gateway."],
      ["fig", "ratealgos", "Same traffic, five algorithms. Hit “Boundary-burst attack” to break the fixed window."],
      ["table", ["Algorithm", "State per client", "Pros", "Cons"], [["Fixed window counter", "1 counter", "Cheapest", "2× burst at window boundaries"], ["Sliding window log", "Every timestamp (deque)", "Exact", "Memory and eviction cost at ~10k req/window"], ["Sliding window counter", "2 counters", "Near-exact, tiny", "Approximation"], ["Token bucket", "tokens + last refill", "Allows bursts up to capacity", "Two parameters to tune"], ["Leaky bucket", "a queue", "Smooth output rate", "Bursts are queued or dropped"]]],
      ["p", "<b>Sliding counter math</b> (from the notes): windows of 50 s; the previous window had 60 requests, and the current one has 40 so far at 40% elapsed. Estimate = 60 × (1 − 0.4) + 40 = <b>76</b>, compared against the limit."],
      ["extra", "<b>Distributed limiting:</b> many gateway nodes share counters in Redis. A naive GET-then-SET races, so use atomic <code>INCR</code> + <code>EXPIRE</code> or a Lua script. Decide whether to <b>fail open</b> (allow traffic) or <b>fail closed</b> if Redis is down."],
      ["sim", "stripe", "Stripe-style token bucket, plus idempotent retries."]
    ]}
  ],
  quiz: [
    { q: "Max Snowflake IDs per millisecond per machine?", o: ["1,024", "4,096", "65,536", "Unlimited"], a: 1, why: "12 sequence bits = 4,096." },
    { q: "Why isn't a plain timestamp enough as an ID?", o: ["Too long", "Two machines can generate the same timestamp", "Not numeric", "Too random"], a: 1, why: "You need machine id + sequence to break ties." },
    { q: "Which algorithm lets 2× the limit through at a window boundary?", o: ["Token bucket", "Fixed window counter", "Sliding log", "Leaky bucket"], a: 1, why: "The counter resets at the boundary, so a burst on both sides gets through." },
    { q: "Previous window 60, current 40, 40% elapsed. Sliding-counter estimate?", o: ["100", "76", "64", "40"], a: 1, why: "60 × 0.6 + 40 = 76." }
  ],
  refs: [["Twitter Snowflake (original repo)", "https://github.com/twitter-archive/snowflake/tree/snowflake-2010"], ["Flickr: Ticket servers", "https://code.flickr.net/2010/02/08/ticket-servers-distributed-unique-primary-keys-on-the-cheap/"], ["ByteByteGo: Design a rate limiter", "https://bytebytego.com/courses/system-design-interview/design-a-rate-limiter"], ["Redis: rate limiting how-to", "https://redis.io/learn/howtos/ratelimiting"], ["Stripe: Scaling your API with rate limiters", "https://stripe.com/blog/rate-limiters"], ["Cloudflare: counting things at scale", "https://blog.cloudflare.com/counting-things-a-lot-of-different-things/"]]
});

/* ───────────────────────── 17. Monolith vs microservices ───────────────────────── */
L({
  id: "microservices", mod: "micro", icon: "🧩", minutes: 30,
  title: "Monolith vs SOA vs microservices, API gateways & observability",
  scaler: "HLD 18 · Monolith vs Microservices vs SOA · HLD 19 · Communication, Observability",
  summary: "When to split a system and when not to, how to decompose Flipkart, what an API gateway does, and how to find the hop that dropped a request.",
  concepts: ["microservices", "api-gateway", "observability"],
  related: ["netflix"],
  sections: [
    { h: "What is a service?", blocks: [
      ["p", "A service is an application layer plus its storage (and caches) exposing APIs for one job. Google search uses two: <b>typeahead</b> (<code>getTopSuggestions</code>, <code>updateFrequency</code>) and <b>search results</b>, which calls typeahead in the background."],
      ["analogy", "A restaurant: kitchen, cooks and ingredients are hidden. Customers only talk to waiters (the API). The whole restaurant is the service."]
    ]},
    { h: "Monolith first", blocks: [
      ["p", "A <b>monolith</b> is one codebase compiled into one deployable. Every app server can handle every request. Modular code inside is fine; it's still a monolith. It works great while the product and team are small."],
      ["list", ["A huge codebase is slow to learn, and changes have hidden dependencies.", "Any small change means rebuilding and redeploying everything; build times grow.", "One slow or crashing component affects every request on that server."]],
      ["tip", "The notes' advice: <b>stay monolithic until you actually feel these pains.</b> Microservices are expensive and slow to build. Don't migrate for fashion."],
      ["fig", "monolith", "Try each event in both modes: scale Cart, leak memory in Recs, ship a Payments fix."]
    ]},
    { h: "SOA vs microservices", blocks: [
      ["table", ["", "SOA", "Microservices"], [["Database", "Services may share DBs", "Each service owns its DB (duplicated data is OK)"], ["Calls", "Mostly synchronous", "Sync + async, event-driven"], ["Consistency", "Easier via a shared DB", "Eventual, across services"], ["Independence", "Partial", "Own stack, own deploys, own scaling"]]]
    ]},
    { h: "Decomposing Flipkart", blocks: [
      ["p", "Look for independent flows: <b>User</b>, <b>Product</b> (pages, search, inventory), <b>Cart</b>, <b>Payment</b>, <b>Order</b>, <b>Invoice</b>, <b>Review</b>. Rule: <b>don't split things that constantly need each other's data</b>. Product search and product details share data, so they stay together. Over-splitting creates chatty services that are slower than the monolith."],
      ["p", "A Facebook page loads a skeleton, then fires <b>parallel</b> requests to <code>/newsfeed</code>, <code>/ads</code>, <code>/events</code>, <code>/pymk</code>, <code>/user</code>. Talking to many services doesn't have to be slow if the calls are concurrent."]
    ]},
    { h: "The API gateway", blocks: [
      ["p", "A load balancer works at the network level and doesn't know that <code>/ads/…</code> belongs to the Ads service. An <b>API gateway</b> sits behind it at the application layer and routes by path. Gateways are replicated, and each holds the full routing table. They also centralize <b>authentication</b>, <b>rate limiting</b> and <b>TLS/encryption</b>."],
      ["flow", { nodes: [
        { id: "c", x: 80, y: 225, label: "Client", sub: "web / app", kind: "client", icon: "📱", desc: "Calls one domain." },
        { id: "lb", x: 250, y: 225, label: "Load balancer", sub: "L4/L7", kind: "edge", icon: "⚖️", desc: "Spreads traffic over gateway instances." },
        { id: "gw", x: 440, y: 225, label: "API gateway", sub: "auth · limits · routing", kind: "edge", icon: "🚪", desc: "Validates the token, applies rate limits, routes by path." },
        { id: "ads", x: 700, y: 80, label: "Ads service", sub: "own LB + DB", kind: "service", icon: "📣", desc: "Owns ad data." },
        { id: "feed", x: 700, y: 225, label: "Feed service", sub: "own LB + DB", kind: "service", icon: "📰", desc: "Owns the feed." },
        { id: "user", x: 700, y: 370, label: "User service", sub: "own LB + DB", kind: "service", icon: "👤", desc: "Owns profiles." },
        { id: "db", x: 910, y: 225, label: "Feed DB", sub: "private", kind: "db", icon: "🗄️", desc: "No other service queries it directly." }
      ], flows: [
        { name: "GET /ads/42", steps: [["c", "lb", "GET /ads/42 with a session token"], ["lb", "gw", "Any gateway instance"], ["gw", "gw", "Auth ✓ · rate limit ✓"], ["gw", "ads", "Route by prefix /ads → Ads service"], ["ads", "c", "Response"]] },
        { name: "GET /newsfeed/42", steps: [["c", "lb", "GET /newsfeed/42"], ["lb", "gw", "Gateway"], ["gw", "feed", "Route /newsfeed → Feed service"], ["feed", "db", "Query its own DB"], ["feed", "c", "Feed JSON"]] }
      ]}, "Client → DNS → LB → API gateway → service's LB → app → DB."]
    ]},
    { h: "The price of microservices", blocks: [
      ["list", ["<b>Latency:</b> more hops (gateway, service LBs, inter-service calls).", "<b>Cost:</b> every service needs at least an app server and a DB: 20 services means 40+ machines before any traffic.", "<b>Debugging:</b> one request spans many services and logs.", "<b>Consistency:</b> Order and Payment both track <code>payment_status</code>, and nothing forces them to agree (see the next lesson)."]]
    ]},
    { h: "Observability: detect → diagnose → verify", blocks: [
      ["p", "Failures will happen. What matters is <b>knowing</b> quickly, finding the cause, and confirming the fix. In a messenger, a message goes Gateway → MessageService → Kafka → NotificationService. If Bob never gets a notification, which hop failed?"],
      ["flow", { nodes: [
        { id: "gw", x: 100, y: 120, label: "Gateway", sub: "trace=msg-123", kind: "edge", icon: "🚪", desc: "Generates a trace id and passes it along." },
        { id: "ms", x: 330, y: 120, label: "MessageService", sub: "logs msg-123", kind: "service", icon: "💬", desc: "Stores the message, publishes an event with the same id." },
        { id: "k", x: 560, y: 120, label: "Kafka", sub: "message_sent", kind: "queue", icon: "📬", desc: "The event carries the trace id." },
        { id: "ns", x: 790, y: 120, label: "NotificationService", sub: "❌ no log", kind: "service", icon: "🔔", desc: "If its logs never mention msg-123, this is where it broke." },
        { id: "elk", x: 450, y: 340, label: "ELK / Splunk", sub: "search: msg-123", kind: "db", icon: "🔎", desc: "Centralized, full-text-searchable logs (Elasticsearch + Logstash + Kibana)." },
        { id: "ts", x: 790, y: 340, label: "Metrics TSDB", sub: "p95, error rate", kind: "cache", icon: "📈", desc: "Per-minute aggregates → alarms (CloudWatch, Prometheus, PagerDuty)." }
      ], flows: [
        { name: "Trace a lost notification", steps: [["gw", "ms", "Request with trace id msg-123"], ["ms", "elk", "log: stored msg-123"], ["ms", "k", "Publish message_sent {msg-123}"], ["k", "elk", "log: msg-123 enqueued"], ["k", "ns", "Consumer should pick it up…"], ["elk", "ns", "Search msg-123: the logs stop at Kafka → NotificationService is the culprit"]] },
        { name: "Alarm fires", steps: [["ns", "ts", "ods.publish(\"notification.errors\", 1) every minute"], ["ts", "ts", "Error rate crosses the threshold → page the on-call"]] }
      ]}, "A trace id propagated through every hop. The hop where the logs stop is where it failed."],
      ["list", ["<b>Logs</b> (with a trace id, centralized) explain <i>what</i> happened.", "<b>Metrics</b> (time-series: rate, errors, p90/p95 latency, CPU) tell you <i>that</i> something is wrong. Logs are too heavy and best-effort for this; an agent aggregates numbers every minute.", "<b>Traces</b> (spans per hop) show <i>where</i> time went. OpenTelemetry, Jaeger and Zipkin are common tools."]]
    ]}
  ],
  quiz: [
    { q: "Key structural difference between SOA and microservices?", o: ["Language", "Database per service + async/event-driven communication", "Cloud vs on-prem", "REST vs SOAP only"], a: 1, why: "Microservices own their data and often communicate through events." },
    { q: "Why not let one service query another's database for a report?", o: ["It's slower", "It breaks ownership and separation of concerns (an anti-pattern)", "Databases forbid it", "It's fine"], a: 1, why: "Use the owner's API or a CQRS read model instead." },
    { q: "Why use metrics rather than logs for alerting?", o: ["Logs are encrypted", "Logs are heavy and best-effort; you only need per-minute aggregates", "Metrics are free", "Logs can't be searched"], a: 1, why: "A time-series DB with aggregation is the right tool for detection." }
  ],
  refs: [["microservices.io: Microservice architecture", "https://microservices.io/patterns/microservices.html"], ["Database per service", "https://microservices.io/patterns/data/database-per-service.html"], ["API gateway / BFF pattern", "https://microservices.io/patterns/apigateway.html"], ["Distributed tracing pattern", "https://microservices.io/patterns/observability/distributed-tracing.html"], ["OpenTelemetry observability primer", "https://opentelemetry.io/docs/concepts/observability-primer/"], ["gRPC introduction", "https://grpc.io/docs/what-is-grpc/introduction/"]]
});

/* ───────────────────────── 18. Microservice data patterns ───────────────────────── */
L({
  id: "ms-patterns", mod: "micro", icon: "🎻", minutes: 35,
  title: "Microservices: distributed transactions, Saga, CQRS & circuit breakers",
  scaler: "HLD 20 · Microservices: Data Management, Consistency & Fault Tolerance",
  summary: "Keep data consistent across services without global locks, answer cross-service queries without breaking ownership, and stop one sick service from taking down everyone.",
  concepts: ["saga", "two-phase-commit", "cqrs", "circuit-breaker"],
  related: ["stripe", "ticketmaster"],
  sections: [
    { h: "The consistency problem", blocks: [
      ["p", "In a monolith, moving ₹10 from A to B is one ACID transaction. Across systems it isn't: A banks with Axis, B with SBI, and two independent databases must change together. Inside one company it's the same: placing a Flipkart order touches <b>Orders</b>, <b>Inventory</b>, <b>Payments</b> and <b>Shipping</b>, each with its own database."]
    ]},
    { h: "Two-phase commit, and why it's an anti-pattern here", blocks: [
      ["flow", { nodes: [
        { id: "co", x: 200, y: 225, label: "Coordinator", sub: "order flow", kind: "edge", icon: "🎯", desc: "Asks everyone to prepare, then commit." },
        { id: "o", x: 620, y: 100, label: "Order service", sub: "create order", kind: "service", icon: "📝", desc: "Locks rows while prepared." },
        { id: "i", x: 620, y: 350, label: "Inventory", sub: "iPhone 15: 100 → 99", kind: "db", icon: "📦", desc: "The iPhone 15 row is locked: every other read/write on it queues." },
        { id: "q", x: 900, y: 350, label: "Other shoppers", sub: "blocked", kind: "client", icon: "⏳", desc: "Waiting on the lock." }
      ], flows: [
        { name: "2PC", steps: [["co", "o", "Phase 1: PREPARE (lock)"], ["co", "i", "PREPARE: lock the iPhone 15 row"], ["q", "i", "Other buyers' reads/writes queue behind the lock…"], ["o", "co", "READY"], ["i", "co", "READY"], ["co", "o", "Phase 2: COMMIT, release locks"], ["co", "i", "COMMIT, release locks"]] }
      ]}, "Locks are held across network round trips. If the coordinator dies after PREPARE, participants stay stuck."],
      ["p", "Locks held across slow services make every other request on those rows wait, and a crashed coordinator can leave locks held. Many systems (Kafka, NoSQL, third-party APIs) don't support it at all. Microservices avoid 2PC."]
    ]},
    { h: "The Saga pattern", blocks: [
      ["p", "Split the transaction into <b>local steps</b>, each fully atomic inside one service. Run them in order. If a step fails permanently, run <b>compensating actions</b> for the steps already done (refund, restock, cancel). Example: Axis debits A ₹1,000; SBI credits B; if the credit fails, Axis credits A back."],
      ["fig", "saga", "Run the order saga in both modes, failing at different steps."],
      ["table", ["", "Orchestration", "Choreography"], [["Control", "A central orchestrator calls each step", "Services react to each other's events on Kafka"], ["Speed", "Faster (direct calls)", "Slower (a queue hop per step)"], ["Reliability", "The orchestrator can die mid-saga (persist its state)", "No single point whose failure causes inconsistency"], ["Observability", "Easy: read the orchestrator's log", "Needs distributed tracing"], ["Retry", "Orchestrator retries", "Kafka offsets only advance after the event is processed"]]],
      ["warn", "Sagas aren't isolated: other requests can see intermediate states. Compensations must be <b>idempotent</b> (they may be retried), and \"write to the DB, then publish the event\" needs the <b>transactional outbox</b> pattern so a crash in between doesn't lose the event."]
    ]},
    { h: "CQRS: queries that span services", blocks: [
      ["p", "Analysts want \"Pages with many messages but few notifications\", which needs a join across the Messages and Notifications services. Letting one query the other's DB is an anti-pattern. <b>Command Query Responsibility Segregation</b>: writes (commands) go to their owners as usual, and the relevant changes are relayed (e.g. via Kafka) into a separate <b>read model</b> built for that query."],
      ["flow", { nodes: [
        { id: "m", x: 150, y: 90, label: "Messages svc", sub: "addMessage", kind: "service", icon: "💬", desc: "Owns message data." },
        { id: "n", x: 150, y: 360, label: "Notifications svc", sub: "addNotification", kind: "service", icon: "🔔", desc: "Owns notification data." },
        { id: "k", x: 450, y: 225, label: "Kafka", sub: "change events", kind: "queue", icon: "📬", desc: "Both services publish what they write." },
        { id: "r", x: 730, y: 225, label: "Page-insights read DB", sub: "pre-joined", kind: "cache", icon: "📊", desc: "Only Page-related data, already combined." },
        { id: "a", x: 910, y: 90, label: "Analyst", sub: "queries", kind: "client", icon: "🧑‍💼", desc: "Reads only the read model." }
      ], flows: [
        { name: "CQRS", steps: [["m", "k", "MessageAdded {page 7}"], ["n", "k", "NotificationAdded {page 7}"], ["k", "r", "Consumer updates the joined view for page 7"], ["a", "r", "SELECT pages WHERE msgs high AND notifs low: easy, local"]] }
      ]}, "Writes stay with their owners; a purpose-built read model answers the cross-service query."],
      ["p", "Trade-offs: the read model is <b>eventually consistent</b> (it lags slightly), and it's more infrastructure to run and rebuild."]
    ]},
    { h: "Circuit breaker", blocks: [
      ["p", "User → Message → Notification, and Notification is degraded after a bad deploy. Calls to it hang until timeout, Message's threads pile up waiting, Message slows down, then User… a <b>cascading failure</b>. Even after the fix, the backlog hammers Notification so it recovers slowly (a <b>thundering herd</b>)."],
      ["steps", [["Classify errors", "\"User not found\" is a normal answer. Timeouts, connection resets and 5xx mean the service is sick, and only these count."], ["Track failures", "e.g. more than 100 failures in the last minute, counted in the caller's Redis."], ["Closed → Open", "Stop calling. Fail fast or return a fallback so threads stay free."], ["Open → Half-open", "After T seconds, let a small sample through."], ["Half-open → Closed / Open", "Probes succeed → resume. They fail → open again."]]],
      ["fig", "breaker", "Raise the failure rate and watch the breaker trip. Then disable it to see the cascade."]
    ]}
  ],
  quiz: [
    { q: "Why is 2PC an anti-pattern in microservices?", o: ["It's not ACID", "Locks held across services block other requests, and a coordinator crash can leave them stuck", "It needs Kafka", "It's too new"], a: 1, why: "Long-held distributed locks kill latency and availability." },
    { q: "Saga step 3 fails permanently. What happens?", o: ["Everything is rolled back by the database", "Compensating actions undo steps 2 and 1", "Nothing", "Retry forever"], a: 1, why: "Each service undoes its own completed local transaction." },
    { q: "Which saga style is faster? Which is more resilient to a single crash?", o: ["Choreography / orchestration", "Orchestration / choreography", "Both the same", "Neither"], a: 1, why: "Direct calls are faster; event-driven has no central owner to die mid-flight." },
    { q: "Which errors should trip a circuit breaker?", o: ["User not found", "Timeouts, connection resets, 5xx", "Validation errors", "All errors"], a: 1, why: "Only service-health errors indicate the dependency is sick." }
  ],
  refs: [["microservices.io: Saga", "https://microservices.io/patterns/data/saga.html"], ["microservices.io: CQRS", "https://microservices.io/patterns/data/cqrs.html"], ["Martin Fowler: Circuit breaker", "https://martinfowler.com/bliki/CircuitBreaker.html"], ["microservices.io: Circuit breaker", "https://microservices.io/patterns/reliability/circuit-breaker.html"]]
});
})();
