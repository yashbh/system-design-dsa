/* Blueprint case study — Discord: Store Trillions of Messages. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "discord",
  app: "Discord",
  icon: "🎮",
  color: "#5865f2",
  color2: "#8b93ff",
  title: "Store Trillions of Messages",
  tagline: "Scroll back years in any channel instantly, even when a million people pile into the same one at once.",
  level: "Advanced",
  minutes: 34,
  concepts: ["sharding","consistent-hashing","snowflake","hot-key","request-coalescing","replication","kv-store"],
  stats: [
    {v: 177,suf: " → 72",label: "database nodes before and after the Cassandra → ScyllaDB move (2023 blog)",kind: "Reported"},
    {v: 15,pre: "p99 ",suf: " ms",label: "message read latency after the migration",kind: "Reported"},
    {v: 1,suf: "T+",label: "messages stored (Discord says \"trillions\")",kind: "Reported"}
  ],
  story: "It's 6 pm on a Friday. A game studio with a 500,000-member Discord server posts in #announcements: <b>@everyone the update is live</b>. Phones buzz across the planet. Within about ten seconds, a huge crowd taps the notification, and every one of those apps asks Discord the exact same question: <i>give me the last 50 messages in #announcements</i>.<br><br>At the same moment, somewhere far quieter, a student opens a study-group server she hasn't touched in three years and scrolls all the way back to a message from 2021. Nobody has read that channel in months. It still has to load in a blink.<br><br>Those two people want opposite things from the same database. One wants the newest messages in a channel that suddenly has the attention of a small country. The other wants ancient messages in a channel nobody cares about. And the database underneath has to hold <b>trillions</b> of messages, growing every second, forever, because Discord doesn't delete your old chats.<br><br>This case is the story of how Discord's message store grew up: from one MongoDB replica set, to Cassandra, to 177 Cassandra nodes that kept paging engineers at night, to 72 ScyllaDB nodes with a clever Rust layer in front. Along the way you'll meet three ideas you'll use in almost every large system: <b>picking a partition key from your main query</b>, <b>spreading data with consistent hashing</b>, and <b>defusing the one key everybody wants at once</b>.<br><br>As always, this is a simplified teaching model built from Discord's public engineering posts, not their actual source code.",
  requirements: {
    functional: ["Send a message to a channel and read it back","Open a channel and see the latest ~50 messages straight away","Scroll back through history, page by page, all the way to the first message","Edit and delete your own messages","Jump to a specific old message (from a link, a reply or a search result)","Search messages (handled by a separate search system)"],
    nonFunctional: ["Loading recent messages is fast at p99, not just on average","Storage grows forever, so the system must scale by adding machines","A dead server must not lose a single message","One viral channel must not slow down everyone else","Old, cold history is as available as new, hot history","Operating it shouldn't need humans restarting nodes at 3 am"]
  },
  estimate: [
    ["Messages per day","assumption (illustrative)","1 B"],
    ["Average write rate","1B ÷ 86,400 s","≈ 11,600 /s"],
    ["Peak write rate","assume ~3× average at peak","≈ 35,000 /s"],
    ["Storage per year","1B × 365 × ~1 KB","≈ 365 TB (before replication)"],
    ["With replication factor 3","365 TB × 3","≈ 1.1 PB / year"],
    ["One viral channel, first 10 s","assumption: 100k readers","≈ 10,000 reads /s on ONE partition"]
  ],
  estimateNote: "These are made-up round numbers to get a feel for scale, not Discord's real figures. Here's what they tell you. A petabyte a year cannot live on one machine, so <b>sharding is not optional</b>; the only real question is how you split the data. Eleven thousand writes a second is a lot for one database but easy when spread over dozens of nodes. The scary row is the last one. Ten thousand reads a second is nothing for the cluster as a whole, but if all of them land on <b>the same partition</b>, they land on the same three machines, and those three machines don't care how big the rest of the cluster is. So the design has two jobs: choose keys so every common query hits one partition, and survive the day everyone wants the same partition.",
  naive: {
    title: "\"One big Postgres messages table\"",
    desc: "The first design almost everyone draws: a single relational table, <code>messages(id, channel_id, author_id, content, created_at)</code>, with an index on <code>(channel_id, created_at)</code> so you can fetch the newest messages per channel. It works beautifully for your first million messages. Discord itself started on a single MongoDB replica set in 2015, which is the same idea in a different database, and by late 2015 they had about 100 million messages and the data and indexes no longer fit in memory. Here's what goes wrong as you keep growing.",
    breaks: ["Size: at ~1 PB a year (with copies) the table outgrows any disk you can buy within months. You can buy a bigger machine once or twice, but you can't buy one big enough for \"forever\".","Write rate: tens of thousands of inserts a second, each also updating the index, all funnel through one primary. When it's busy, every user's \"send\" button feels slow at once.","Memory: the index on a growing table eventually stops fitting in RAM. Then every lookup becomes a disk seek, and latency jumps from about 1 ms to 10 ms or more for everyone, not just the busy channels.","Maintenance: vacuuming, index rebuilds and backups on a multi-terabyte table take hours, and they get longer every month.","Noisy neighbours: one viral channel's 10,000 reads a second compete for the same CPU and disk as every quiet channel. One server's announcement slows the whole product."]
  },
  steps: [
    {
      t: "Shard across many nodes",
      c: "sharding",
      b: "The first move is admitting that no single machine will ever be enough. <b>Sharding</b> means splitting your data into pieces (called partitions or shards) and putting different pieces on different machines. Each machine stores only a slice and handles only the traffic for that slice. Need more room? Add machines.<br><br>Discord moved to <b>Cassandra</b> in 2015–2016, and later to <b>ScyllaDB</b>. Both are distributed <b>wide-column stores</b>: think of a giant sorted dictionary where each key (the partition key) points to a bundle of rows kept sorted on disk. The database itself decides which machines own which keys, copies each key to several machines, and lets you grow the cluster without downtime.<br><br>The cost is that you give up things a single Postgres box gives you for free: joins across shards, global secondary indexes and multi-row transactions. You get one fast question: \"give me rows for this key, in this sorted order\". So everything depends on choosing that key well.",
      a: "A library that opens a new branch whenever the shelves fill up. Each branch holds only some of the books, so you must know which branch to visit before you set off."
    },
    {
      t: "Pick the partition key from the query",
      c: "sharding",
      b: "Start from what users actually do. By far the most common request is \"show me the latest messages in channel X\", followed by \"show me the messages just before this one\". So all of a channel's recent messages should live <b>together, in one partition, already sorted</b>. That points to <code>channel_id</code> as the partition key.<br><br>There's a catch. A channel lives forever, and a busy one gets millions of messages. If a channel were one partition, that partition would grow without limit, and huge partitions are slow to read, repair and compact. So Discord added a <b>bucket</b>: a fixed time window (their 2017 post describes roughly 10 days) computed from the message's timestamp. The partition key becomes <code>(channel_id, bucket)</code>. Each channel's history is chopped into a neat row of 10-day boxes, and no box ever grows past what a busy channel can write in 10 days.<br><br>Tiny example: channel 42 got messages in March and April. Its March 1–10 messages live in partition (42, bucket 1832), March 11–20 in (42, bucket 1833), and so on. \"Latest 50 messages\" reads only the newest bucket. Scrolling back reads the previous bucket. The cost: a quiet channel might have to peek into several empty buckets to fill one page.",
      a: "Filing letters by recipient and then by month. \"This month's letters to Sam\" is one drawer, and Sam's drawer from 2019 never gets in the way."
    },
    {
      t: "Use time-sortable Snowflake IDs",
      c: "snowflake",
      b: "Every message needs a unique ID. An auto-increment counter would need one central machine handing out numbers, which is exactly the bottleneck you just escaped. Random UUIDs avoid that, but they don't sort by time, so \"the 50 messages before this one\" becomes a hard question.<br><br>Discord uses <b>Snowflake IDs</b>, an idea popularised by Twitter. A Snowflake is a 64-bit number made of three parts: a millisecond timestamp in the high bits, then a worker ID, then a small per-worker sequence counter. Any server can generate IDs on its own with no coordination, and because the timestamp comes first, <b>sorting by ID is the same as sorting by time</b>.<br><br>That one property pays off everywhere. The bucket for a message can be computed from its ID alone. \"Messages before ID X\" is a simple range scan inside a partition that's already sorted by ID. And a link to an old message carries its own timestamp, so the server knows exactly which bucket to open. The cost is that IDs depend on reasonably accurate clocks: if a server's clock jumps backwards, it must wait or it could issue IDs out of order.",
      a: "Receipt numbers that start with the date and time. Sorting the pile by number also sorts it by when you bought things, and you can tell which month's box to look in just by reading the number."
    },
    {
      t: "Place partitions with consistent hashing",
      c: "consistent-hashing",
      b: "You have millions of partitions and dozens of nodes. Which node holds partition (42, 1832)? The obvious answer is <code>hash(key) % N</code>, where N is the number of nodes. It spreads keys evenly, until you add a node. Go from 4 to 5 nodes and roughly 80% of all keys suddenly map to a different node. That's petabytes of data shuffling across the network just because you added one machine.<br><br><b>Consistent hashing</b> fixes this. Imagine the space of hash values bent into a <b>ring</b>. Each node takes several positions on the ring (called <b>virtual nodes</b>, or vnodes), and each key belongs to the first node clockwise from its hash. Add a node and it takes over only the small arcs next to its positions, roughly 1/N of the data. Virtual nodes also smooth out the load, so no node is stuck with one giant unlucky arc.<br><br>For safety each partition is <b>replicated</b> to 3 nodes (the owner plus the next two on the ring). Reads and writes use a <b>quorum</b>: wait for 2 of the 3 replicas to agree. Lose any one node and every partition still has two live copies and keeps working.",
      a: "Guests seated around a round table. When a newcomer pulls up a chair, only the two neighbours shuffle over a little; nobody on the far side of the table has to move."
    },
    {
      t: "Defuse hot partitions with coalescing",
      c: "request-coalescing",
      b: "Here's the uncomfortable truth about step 2. One channel's recent messages live in one partition, and one partition lives on three nodes. When that @everyone ping goes out, 100,000 people hit the same three machines. Consistent hashing can spread many different keys, but it <b>cannot split a single hot key</b>. This is the <b>hot partition</b> problem, and in Discord's Cassandra days it was a real source of pain: a busy channel would slow the nodes holding it, and every other query on those nodes slowed down too.<br><br>Discord's fix was a new layer of <b>data services</b>, written in Rust, sitting between the API and the database. Requests are routed to a data-service instance chosen by consistent hashing on <code>channel_id</code>, so <b>all requests for one channel arrive at the same instance</b>. That instance does <b>request coalescing</b>: if a query for (channel, bucket) is already in flight, new requests don't start another one. They wait for the same answer.<br><br>Example: 100,000 requests for #announcements arrive within a few hundred milliseconds. The first starts one database query. The other 99,999 subscribe to it. Fifteen milliseconds later the 50 messages come back and are handed to everyone. The database saw one read instead of 100,000. The cost is an extra network hop and another service to run and monitor.",
      a: "Ten people walk up to a librarian and ask for the same book. She doesn't make ten trips to the stacks. She fetches it once and reads the page aloud to all of them."
    },
    {
      t: "Measure, then migrate",
      c: "replication",
      b: "By 2022 Discord was running <b>177 Cassandra nodes</b> storing trillions of messages, and it was getting harder to love. Java garbage-collection pauses caused latency spikes, compaction fell behind, and on-call engineers were restarting nodes by hand. Discord chose <b>ScyllaDB</b>: it speaks the same protocol and data model as Cassandra, but it's written in C++ (so no garbage collector) and uses a <b>shard-per-core</b> design where each CPU core owns its own slice of data and doesn't fight other cores for locks.<br><br>The hard part was moving trillions of messages without taking Discord offline. New writes went to both clusters. A purpose-built migrator, written in Rust, copied the history in token ranges with checkpoints so it could resume after a crash. Then reads switched over and the old cluster was retired.<br><br>The results in Discord's 2023 write-up: <b>72 ScyllaDB nodes instead of 177</b>, p99 read latency down from 40–125 ms to about <b>15 ms</b>, and much steadier insert latency. Note the order of operations: they measured the pain, fixed the hot-partition problem with a new layer, and swapped the database underneath, rather than hoping a new database alone would solve everything.",
      a: "Renovating a busy train station one platform at a time. Trains keep running the whole time; passengers just notice one day that everything is cleaner and the trains are on time."
    },
    {
      t: "Keep the read path cheap for cold history",
      c: "kv-store",
      b: "Remember the student scrolling back to 2021? Her request is the opposite of the hot channel: nobody else wants that data, so no cache will have it. That's fine, because the partition key makes it a cheap, direct lookup. Her app sends \"messages before ID X\". The server reads the timestamp out of the Snowflake, computes the bucket, goes straight to (channel, bucket) on the right three nodes, and reads one sorted slice.<br><br>No index scan over the whole table, no searching. Whether a message is from yesterday or from six years ago, finding it costs about the same: hash the key, find the owner, read one partition. That's what a good partition key buys you. Cold data is just as easy to reach as hot data; it simply isn't in memory, so it costs a disk read or two.<br><br>The cost shows up for very quiet channels: if a channel had one message in 2021 and nothing since, walking back bucket by bucket means checking many empty buckets. Real systems cap how many empty buckets they'll walk per request, or keep a small per-channel note of which buckets actually contain data.",
      a: "A well-run archive: even a dusty box from twenty years ago can be found in minutes, because every box is labelled by owner and date and shelved in a predictable spot."
    }
  ],
  diagram: {
    nodes: [
      {
        id: "c",
        x: 80,
        y: 230,
        label: "Clients",
        sub: "100k open #launch",
        kind: "client",
        icon: "👥",
        desc: "Lots of users asking for the same channel at once."
      },
      {
        id: "api",
        x: 260,
        y: 230,
        label: "API",
        sub: "stateless",
        kind: "service",
        icon: "⚙️",
        desc: "Validates and forwards message reads/writes."
      },
      {
        id: "ds",
        x: 460,
        y: 230,
        label: "Data Services",
        sub: "Rust, coalescing",
        kind: "service",
        icon: "🧲",
        desc: "Routes by channel (consistent hash); collapses duplicate in-flight queries into one."
      },
      {
        id: "n1",
        x: 700,
        y: 80,
        label: "Node A",
        sub: "replica 1",
        kind: "db",
        icon: "🗄️",
        desc: "Owns some ring arcs; holds replicas of partitions."
      },
      {
        id: "n2",
        x: 760,
        y: 230,
        label: "Node B",
        sub: "replica 2",
        kind: "db",
        icon: "🗄️",
        desc: "Second replica of (channel, bucket)."
      },
      {
        id: "n3",
        x: 700,
        y: 380,
        label: "Node C",
        sub: "replica 3",
        kind: "db",
        icon: "🗄️",
        desc: "Third replica; quorum = 2 of 3."
      },
      {
        id: "sf",
        x: 260,
        y: 70,
        label: "Snowflake IDs",
        sub: "time-sortable",
        kind: "cache",
        icon: "❄️",
        desc: "IDs generated locally per worker; sort by time."
      },
      {
        id: "ring",
        x: 930,
        y: 230,
        label: "Hash Ring",
        sub: "vnodes",
        kind: "external",
        icon: "💍",
        desc: "Partition key → token → owning nodes."
      }
    ],
    flows: [
      {
        name: "Hot channel read",
        steps: [
          ["c","api","100,000× GET /channels/launch/messages"],
          ["api","ds","All route to the same data-service instance"],
          ["ds","n2","ONE query: (launch, bucket 2025-W12) LIMIT 50"],
          ["n2","ds","50 messages"],
          ["ds","c","Fan the single result out to all 100k waiters"]
        ]
      },
      {
        name: "Send a message",
        steps: [
          ["c","api","POST message"],
          ["sf","api","Assign Snowflake ID (no coordination)"],
          ["api","ds","Write"],
          ["ds","ring","Hash (channel, bucket) → token"],
          ["ds","n1","Write replica 1"],
          ["ds","n2","Write replica 2 → quorum reached ✓"],
          ["ds","n3","Replica 3 catches up"]
        ]
      }
    ]
  },
  lab: {
    sim: "ring",
    title: "Consistent Hashing Lab",
    hint: "Add and remove database nodes. Compare how many keys move on a hash ring vs. with hash % N, and turn on virtual nodes to balance the load."
  },
  tradeoffs: [
    {
      choice: "(channel, bucket) as the partition key",
      pro: "Opening a channel or scrolling back is one fast read of one sorted partition",
      con: "A viral channel becomes a hot partition on just three machines; very quiet channels may walk several empty buckets"
    },
    {
      choice: "Consistent hashing with virtual nodes",
      pro: "Adding a node moves only ~1/N of the data, and load stays even",
      con: "More metadata to track, and replica placement (racks, zones) needs care"
    },
    {
      choice: "A coalescing data-service layer",
      pro: "Thousands of identical hot reads collapse into one database query",
      con: "An extra network hop and a new service to deploy, scale and debug"
    },
    {
      choice: "Quorum reads and writes (2 of 3)",
      pro: "Survives one node down per partition with no data loss",
      con: "Each request waits for the second-fastest replica, so a slow node raises tail latency"
    },
    {
      choice: "Migrating to ScyllaDB",
      pro: "No GC pauses, fewer nodes (72 vs 177), steadier latency",
      con: "A long, careful migration of trillions of rows and a new system for the team to learn"
    }
  ],
  takeaways: ["Choose the partition key from your most common query, so that query touches one partition.","Put a bound on partition growth: time buckets stop any key from growing forever.","Snowflake IDs give you uniqueness without coordination and time order for free.","Consistent hashing spreads many keys; it cannot split one hot key. Coalesce or cache that key instead.","Coalescing only works if identical requests meet in one place, so route by the same key.","Measure the pain before migrating, and migrate with dual writes, checkpoints and verification."],
  quiz: [
    {
      q: "With hash(key) % N, what happens when N goes from 4 to 5?",
      o: ["About 20% of keys move","Most keys (about 80%) move","No keys move","Only new keys are affected"],
      a: 1,
      why: "A key stays put only if hash % 4 equals hash % 5, which happens for about 1 key in 5. The other 80% move."
    },
    {
      q: "Why add a time bucket to the partition key?",
      o: ["To encrypt data","To stop one channel's partition from growing forever","For SEO","Snowflakes require it"],
      a: 1,
      why: "Bounded partitions keep reads, compaction and repairs efficient, no matter how old or busy a channel gets."
    },
    {
      q: "100k users request the same channel at once. What helps most?",
      o: ["Request coalescing so one DB query serves all","More indexes","Smaller messages","Polling"],
      a: 0,
      why: "Identical in-flight requests share one backend result, so 100k readers cost about one database query."
    },
    {
      q: "What makes Snowflake IDs useful for pagination?",
      o: ["They're random","They sort by creation time","They're short strings","They're encrypted"],
      a: 1,
      why: "The timestamp sits in the high bits, so ID order is time order and \"before ID X\" is a range scan."
    },
    {
      q: "Why does request coalescing need consistent-hash routing?",
      o: ["It doesn't","Identical requests must land on the same instance to share one in-flight query","To encrypt data","To sort messages"],
      a: 1,
      why: "If duplicates were spread randomly across instances, each instance would query the database separately."
    },
    {
      q: "Each partition has 3 replicas and uses quorum (2 of 3). One replica's node crashes. What happens?",
      o: ["Reads and writes for that partition fail","They keep working, because 2 replicas can still form a quorum","All data on that node is lost","The whole cluster stops"],
      a: 1,
      why: "Quorum needs a majority. With one of three down, the other two still agree, and the dead replica catches up later through repair."
    },
    {
      q: "A user deletes 2 million messages from one channel. Why might that channel get slower to read for a while?",
      o: ["Deletes free up space, so it gets faster","Each delete leaves a tombstone that reads must skip until compaction removes it","The channel is moved to a new node","Snowflake IDs are reset"],
      a: 1,
      why: "In LSM stores, a delete is a marker (tombstone). Until compaction cleans them up, reads wade through all those markers."
    },
    {
      q: "Discord's migration kept writing new messages to both the old and new clusters. Why?",
      o: ["To double the storage","So the new cluster stayed current while history was copied, making the switch-over safe","Because ScyllaDB requires it","To make reads faster"],
      a: 1,
      why: "Dual writes mean nothing new is missed while the backfill runs. Once the copy is verified, reads can switch with no gap."
    }
  ],
  sources: ["Discord Engineering: How Discord Stores Billions of Messages (2017)","Discord Engineering: How Discord Stores Trillions of Messages (2023)"],
  deep: [
    {
      h: "The message table",
      blocks: [
        ["img","Gaming PC setup with RGB lighting and plant.jpg","Discord started with gamers like this, and grew into millions of communities, each with years of searchable chat history."],
        ["p","Here's a simplified version of the table, written in CQL (Cassandra's SQL-like language). Read the <code>PRIMARY KEY</code> line slowly, because the whole design lives in it. The part in the inner brackets, <code>(channel_id, bucket)</code>, is the <b>partition key</b>: it decides which machines store the row. The part after it, <code>message_id</code>, is the <b>clustering key</b>: it decides the sort order of rows inside a partition."],
        ["code","CREATE TABLE messages (\n  channel_id bigint,\n  bucket     int,          -- fixed time window derived from the Snowflake timestamp (Discord used ~10 days)\n  message_id bigint,       -- Snowflake: sorts by time\n  author_id  bigint,\n  content    text,\n  PRIMARY KEY ((channel_id, bucket), message_id)\n) WITH CLUSTERING ORDER BY (message_id DESC);\n\n-- latest 50 messages in a channel: one partition, already sorted\nSELECT * FROM messages WHERE channel_id = ? AND bucket = ? LIMIT 50;"],
        ["p","Because rows are stored newest first (<code>DESC</code>), \"latest 50\" is literally \"read the first 50 rows of this partition\". There is no sorting at query time and no index to consult."],
        ["p","<b>Scrolling back</b> walks to older buckets: current bucket, then bucket − 1, and so on, until it has 50 messages. Quiet channels may skip several empty buckets; busy ones fill a page from one."],
        ["p","Notice what the table <i>can't</i> do. There's no way to ask \"all messages by author 7 across every channel\" without scanning everything. That's deliberate. If you need that question answered, you build a second table (or a search index) keyed the other way, and write to both. In wide-column stores you design one table per query, not one table per noun."]
      ]
    },
    {
      h: "What happens when you hit send",
      blocks: [
        ["p","Let's follow one message, \"gg everyone\", from your keyboard to disk. The numbers are illustrative."],
        ["steps",[["Get an ID","The API server generates a Snowflake locally, say 1,180,000,000,000,000,000. No network call, no central counter. The timestamp inside it says 6:00:01.237 pm."],["Find the partition","The bucket is computed from that timestamp. Now the key is (channel 42, bucket 1897)."],["Find the owners","The key is hashed to a token on the ring. The three nodes clockwise from that token are the replicas, say nodes A, B and C."],["Write to all three, wait for two","The write goes to A, B and C in parallel. Each appends it to a commit log on disk and to an in-memory table. As soon as two reply \"done\", the write counts as successful."],["Tell everyone","Discord's real-time gateway pushes the new message to people who have the channel open. That's a separate system from storage, so your friends see it even before the third replica has finished."],["Catch up later","If C was slow or briefly down, it catches up afterwards (through hinted handoff or a repair job). The data was already safe on two disks."]]],
        ["tip","Why write to three and wait for two? It's the sweet spot. One copy can be lost. Waiting for all three would mean the slowest machine sets your latency. Waiting for two means any single slow or dead node is simply ignored."]
      ]
    },
    {
      h: "Why they left Cassandra",
      blocks: [
        ["p","Cassandra served Discord well for years: their 2017 post describes a cluster of about a dozen nodes holding billions of messages. By the 2023 post it was 177 nodes and trillions of messages, and the operational pain had grown with it. Three problems kept coming back:"],
        ["list",["<b>Garbage-collection pauses</b> on the JVM caused latency spikes, and operators had to restart nodes by hand.","<b>Hot partitions:</b> one huge server's announcement channel overloaded the nodes holding it, slowing every query on those nodes.","<b>Compaction backlogs</b> grew, making reads touch more SSTables and get slower."]],
        ["p","A quick word on that last one. Cassandra and ScyllaDB are built on an <b>LSM tree</b>: writes go into memory and are flushed to disk as immutable sorted files called SSTables. Over time a partition's rows are spread across many SSTables, and a background job called <b>compaction</b> merges them. If compaction falls behind, a single read may have to open ten files instead of one, and latency climbs."],
        ["p","ScyllaDB is Cassandra-compatible but written in C++ (no GC pauses) with a shard-per-core design. Combined with a new data-services layer, Discord reported running on <b>72 nodes instead of 177</b>."],
        ["chart",{"type":"bar","title":"p99 message-read latency (Discord, 2023)","data":[["Cassandra (worst of reported range)",125],["Cassandra (best of reported range)",40],["ScyllaDB + data services",15]],"fmt":"ms","highlight":2}],
        ["p","\"p99\" means the 99th percentile: 99 out of 100 requests are at least this fast. It's the number that matters for a chat app, because if you open 100 channels a day, the slowest one is the one you remember."]
      ]
    },
    {
      h: "Data services: routing and coalescing",
      blocks: [
        ["p","The data services are a thin layer, but they're the part of the design that fixed the hot-partition pain. They don't store anything permanently. Their job is to sit in front of the database and stop it from doing the same work twice."],
        ["steps",[["Route by channel","API servers send each message query to a data-service instance chosen by consistent hashing on channel_id, so all requests for one channel meet in one place."],["Coalesce","If a query for (channel, bucket) is already in flight, new requests subscribe to its result instead of issuing another database query."],["Answer everyone","One database read is fanned out to every waiting request, so 100,000 readers cost about one query."]]],
        ["tip","Coalescing only works because routing puts identical requests on the same instance. Consistent hashing is what makes them meet."],
        ["code","// sketch of the core idea (pseudocode)\ninFlight = map<(channel, bucket, before), Future<Messages>>\n\nget(channel, bucket, before):\n  key = (channel, bucket, before)\n  if key in inFlight:\n     return await inFlight[key]        // join the query already running\n  f = db.query(channel, bucket, before, limit 50)\n  inFlight[key] = f\n  result = await f\n  remove inFlight[key]                  // next request after this starts a fresh query\n  return result"],
        ["p","Notice this is not a cache. Nothing is kept after the query returns, so there's no stale data to invalidate. It only merges requests that arrive <i>while</i> a query is running. For a hot channel that window is enough: if 100,000 requests arrive over two seconds and each query takes 15 ms, you'd run roughly 130 queries instead of 100,000."]
      ]
    },
    {
      h: "What happens when a node dies",
      blocks: [
        ["p","Say node B's disk controller fails at 3 am. Here's how the design absorbs it, step by step."],
        ["list",["<b>Reads and writes keep working.</b> Every partition B held also lives on two other nodes, so quorum (2 of 3) can still be reached.","<b>Writes meant for B are remembered.</b> Another node keeps a \"hint\" (a note of writes B missed) for a while and replays them when B returns.","<b>If B is gone for good</b>, a replacement node joins the ring at B's positions and streams the data from the surviving replicas.","<b>Repair keeps replicas honest.</b> A background repair process compares replicas and fixes any differences, so even missed hints are eventually corrected."]],
        ["warn","Replicas only protect you if they're on different hardware. Put all three copies in the same rack and one power failure takes them together. Real deployments spread replicas across racks or availability zones."]
      ]
    },
    {
      h: "The migration",
      blocks: [
        ["p","Moving trillions of rows from one database to another while millions of people chat is like changing the engine of a plane in flight. Discord's approach, simplified:"],
        ["list",["New writes went to <b>both</b> clusters, so the new one stayed current.","Historical data was copied by a purpose-built migrator (written in Rust) at millions of messages per second, checkpointed so it could resume.","Reads switched over once the copy was verified, and the old cluster was retired."]],
        ["p","Each piece answers a specific fear. Dual writes answer \"what about messages sent during the copy?\" Checkpoints answer \"what if the migrator crashes on day four?\" Verification answers \"how do we know the copy is right?\", by comparing samples of data read from both clusters before trusting the new one."],
        ["extra","Discord's post says the team first planned a slower migration, then decided to write a faster migrator in Rust using the same data-service libraries, which turned a months-long job into days. Good tooling choices can change the shape of a project, not just its speed."]
      ]
    },
    {
      h: "Pitfalls: deletes and tombstones",
      blocks: [
        ["p","In an LSM-based store, a delete is a <b>tombstone</b>. A channel where thousands of messages were deleted makes every read scan past all those tombstones until compaction removes them. Keep partitions bounded (time buckets), and watch the tombstone counts on hot partitions."],
        ["p","Why not just erase the row? Because the row exists in several immutable files on three different machines. If node C was offline when you deleted, and the delete simply erased the data on A and B, C would come back with the old message and repair would happily copy it back everywhere. The \"deleted\" message would rise from the dead. The tombstone is a note that says \"this was deleted, and that wins over older copies\". Tombstones are kept for a grace period long enough for every replica to hear about them, then compaction throws them away."],
        ["p","Discord's 2017 post describes exactly this kind of surprise: a public server where a large number of messages had been deleted became slow to load, because reads had to step over all those tombstones. Their fix included tuning how long tombstones are kept, alongside running repairs regularly."]
      ]
    },
    {
      h: "Numbers that matter",
      blocks: [
        ["table",["Number","Value","Why it matters"],[["Snowflake ID size","64 bits","Fits in one integer column; timestamp in the high bits makes it sortable"],["Bucket width","~10 days (2017 post)","Bounds partition size, even for the busiest channels"],["Replication factor","3","Survive one node failure with quorum still possible"],["Quorum","2 of 3","Ignores one slow or dead replica per request"],["Nodes before / after","177 → 72","Fewer, more efficient nodes after the ScyllaDB move"],["p99 read latency","40–125 ms → ~15 ms","What users feel when opening a channel"],["Keys moved adding 1 node (hash % N, 4→5)","≈ 80%","Why plain modulo hashing is a bad idea for databases"],["Keys moved adding 1 node (ring)","≈ 1/N","Why consistent hashing is used instead"]]]
      ]
    },
    {
      h: "Interview corner",
      blocks: [
        ["p","\"Design the message storage for a chat app like Discord\" is a common interview question. Here's one way to use 45 minutes."],
        ["steps",[["Minutes 0–5: requirements","Send, read latest, scroll back, edit, delete. Clarify that history is kept forever and that big public channels exist."],["Minutes 5–10: estimates","Messages per day, bytes per message, storage per year with replication. Conclude: must shard."],["Minutes 10–20: data model","Start from the query. Propose (channel_id, bucket) with Snowflake message IDs as the clustering key. Show the CQL."],["Minutes 20–30: distribution","Consistent hashing, vnodes, replication factor 3, quorum. Explain what happens when a node dies."],["Minutes 30–40: the hot channel","Name the hot-partition problem yourself before the interviewer does. Offer request coalescing with consistent-hash routing, plus a short-lived cache for the very top channels."],["Minutes 40–45: extras","Deletes and tombstones, search, and how you'd migrate if you outgrew the database."]]],
        ["list",["Search? → a separate inverted-index cluster (Elasticsearch-style), fed by message events.","Unread counts and mentions? → per-user read-state store updated on view, separate from messages.","Voice channels? → real-time UDP media servers, a different architecture entirely.","Edits? → overwrite the row by message_id (same partition), and emit an event for search and caches.","Why not shard by user? → \"latest messages in channel X\" would then touch every member's shard. Shard by what you read together.","Why not one partition per channel? → busy channels would grow huge partitions forever; buckets keep them bounded."]]
      ]
    }
  ]
});
