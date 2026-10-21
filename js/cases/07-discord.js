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
  minutes: 30,
  concepts: ["sharding","consistent-hashing","snowflake","hot-key","request-coalescing","replication","kv-store"],
  stats: [
    {v: 177,suf: " → 72",label: "DB nodes: Cassandra → ScyllaDB (2023 blog)",kind: "Reported"},
    {v: 15,pre: "p99 ",suf: " ms",label: "message read latency after migration",kind: "Reported"},
    {v: 1,suf: "T+",label: "messages stored (\"trillions\")",kind: "Reported"}
  ],
  story: "A huge gaming server pings @everyone about a launch. Within seconds, hundreds of thousands of people open the same channel and ask for the same last 50 messages.<br><br>Meanwhile, quiet channels everywhere are reading years-old history. Discord's messaging store is a masterclass in <b>picking a partition key</b>, <b>spreading data with consistent hashing</b>, and <b>defusing hot partitions</b>.",
  requirements: {
    functional: ["Send and read messages per channel","Scroll back through history (pagination by time)","Edit and delete messages","Search (separate system)"],
    nonFunctional: ["Reads of recent messages are fast at p99","Storage grows forever, so scale horizontally","Survive node failures with no data loss","Hot channels must not degrade everyone else"]
  },
  estimate: [
    ["Messages / day","assumption","1 B"],
    ["Write QPS","1B ÷ 86,400","≈ 11,600 /s"],
    ["Storage / year","1B × 365 × ~1 KB","≈ 365 TB (before replication)"],
    ["With replication factor 3","365 TB × 3","≈ 1.1 PB / year"]
  ],
  estimateNote: "Insight: at petabyte scale the question isn't whether to shard. It's how to choose keys so that every common query hits one partition, and how to survive the one partition everyone wants.",
  naive: {
    title: "\"One big Postgres messages table\"",
    desc: "messages(id, channel_id, author_id, content, created_at) with an index on (channel_id, created_at).",
    breaks: ["One machine can't hold petabytes or absorb the write rate.","Index maintenance and vacuuming get slower as the table grows forever.","One viral channel saturates the whole database for everyone."]
  },
  steps: [
    {
      t: "Shard across many nodes",
      c: "sharding",
      b: "Use a distributed wide-column store (Discord used Cassandra, then migrated to <b>ScyllaDB</b>) that spreads rows across many nodes and adds capacity by adding machines.",
      a: "A library that opens a new building whenever the shelves fill up."
    },
    {
      t: "Pick the partition key from the query",
      c: "sharding",
      b: "The dominant query is \"latest messages in channel X\". Partition by <code>(channel_id, bucket)</code>, where <b>bucket</b> is a fixed time window. A channel's recent messages sit together on one partition, and buckets stop any single partition from growing forever.",
      a: "Filing letters by recipient and then by month, so \"this month's letters to Sam\" is one drawer."
    },
    {
      t: "Use time-sortable Snowflake IDs",
      c: "snowflake",
      b: "Message IDs are <b>Snowflakes</b>: 64 bits of timestamp + worker + sequence. They're generated without coordination and <b>sort by time</b>, so \"50 messages before ID X\" is a fast range scan within a partition.",
      a: "Receipt numbers that start with the date, so sorting by number also sorts by time."
    },
    {
      t: "Place partitions with consistent hashing",
      c: "consistent-hashing",
      b: "Partition keys are hashed onto a <b>ring</b>, and each node owns arcs of it (via many virtual nodes). Adding a node takes over only ~1/N of the data instead of reshuffling everything as <code>hash % N</code> would. Each partition is <b>replicated to 3 nodes</b> with quorum reads and writes.",
      a: "Seats around a round table: when a newcomer sits, only one neighbor slides over."
    },
    {
      t: "Defuse hot partitions with coalescing",
      c: "request-coalescing",
      b: "One channel = one partition, so a viral channel is a hot partition. Discord built <b>data services in Rust</b> in front of the DB. Requests for the same channel are routed (by consistent hashing) to the same instance, which <b>coalesces</b> identical concurrent queries: one DB read answers thousands of waiting users.",
      a: "Ten people ask a librarian for the same book; she fetches it once and reads it aloud."
    },
    {
      t: "Measure, then migrate",
      c: "replication",
      b: "Per Discord's 2023 write-up, moving from 177 Cassandra nodes to 72 ScyllaDB nodes cut p99 read latency from 40–125 ms to about 15 ms, and avoided GC pauses. They migrated trillions of messages with a custom Rust migrator while keeping the service online.",
      a: "Renovating a busy train station one platform at a time, without stopping the trains."
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
      choice: "(channel, bucket) partition key",
      pro: "Recent history is one partition read",
      con: "Viral channels become hot partitions"
    },
    {
      choice: "Consistent hashing + vnodes",
      pro: "Minimal data movement on resize; even load",
      con: "More metadata; replica placement is subtler"
    },
    {
      choice: "Coalescing layer",
      pro: "Hot reads collapse to one DB query",
      con: "Extra hop and service to operate"
    }
  ],
  takeaways: ["Choose partition keys from your dominant query.","Bound partition growth (time buckets).","Hashing distributes keys; it can't split one hot key, so coalesce or cache it."],
  quiz: [
    {
      q: "With hash(key) % N, what happens when N goes from 4 to 5?",
      o: ["About 20% of keys move","Most keys (about 80%) move","No keys move","Only new keys are affected"],
      a: 1,
      why: "A key stays only if hash%4 == hash%5, which holds for about 1 in 5 keys."
    },
    {
      q: "Why add a time bucket to the partition key?",
      o: ["To encrypt data","To stop one channel's partition from growing forever","For SEO","Snowflakes require it"],
      a: 1,
      why: "Bounded partitions keep reads, compaction and repairs efficient."
    },
    {
      q: "100k users request the same channel at once. What helps most?",
      o: ["Request coalescing so one DB query serves all","More indexes","Smaller messages","Polling"],
      a: 0,
      why: "Identical in-flight requests share one backend result."
    },
    {
      q: "What makes Snowflake IDs useful for pagination?",
      o: ["They're random","They sort by creation time","They're short strings","They're encrypted"],
      a: 1,
      why: "The timestamp is the high bits, so ID order is time order."
    },
    {
      q: "Why does request coalescing need consistent-hash routing?",
      o: ["It doesn't","Identical requests must land on the same instance to share one in-flight query","To encrypt data","To sort messages"],
      a: 1,
      why: "If duplicates were spread randomly, each instance would query the DB separately."
    }
  ],
  sources: ["Discord Engineering: How Discord Stores Billions of Messages (2017)","Discord Engineering: How Discord Stores Trillions of Messages (2023)"],
  deep: [
    {
      h: "The message table",
      blocks: [
        ["img","Gaming PC setup with RGB lighting and plant.jpg","Discord started with gamers like this, and grew into millions of communities, each with years of searchable chat history."],
        ["code","CREATE TABLE messages (\n  channel_id bigint,\n  bucket     int,          -- fixed time window derived from the Snowflake timestamp (Discord used ~10 days)\n  message_id bigint,       -- Snowflake: sorts by time\n  author_id  bigint,\n  content    text,\n  PRIMARY KEY ((channel_id, bucket), message_id)\n) WITH CLUSTERING ORDER BY (message_id DESC);\n\n-- latest 50 messages in a channel: one partition, already sorted\nSELECT * FROM messages WHERE channel_id = ? AND bucket = ? LIMIT 50;"],
        ["p","<b>Scrolling back</b> walks to older buckets: current bucket, then bucket − 1, and so on, until it has 50 messages. Quiet channels may skip several empty buckets; busy ones fill a page from one."]
      ]
    },
    {
      h: "Why they left Cassandra",
      blocks: [
        ["list",["<b>Garbage-collection pauses</b> on the JVM caused latency spikes, and operators had to restart nodes by hand.","<b>Hot partitions:</b> one huge server's announcement channel overloaded the nodes holding it, slowing every query on those nodes.","<b>Compaction backlogs</b> grew, making reads touch more SSTables and get slower."]],
        ["p","ScyllaDB is Cassandra-compatible but written in C++ (no GC pauses) with a shard-per-core design. Combined with a new data-services layer, Discord reported running on <b>72 nodes instead of 177</b>."],
        ["chart",{"type":"bar","title":"p99 message-read latency (Discord, 2023)","data":[["Cassandra (worst of reported range)",125],["Cassandra (best of reported range)",40],["ScyllaDB + data services",15]],"fmt":"ms","highlight":2}]
      ]
    },
    {
      h: "Data services: routing and coalescing",
      blocks: [
        ["steps",[["Route by channel","API servers send each message query to a data-service instance chosen by consistent hashing on channel_id, so all requests for one channel meet in one place."],["Coalesce","If a query for (channel, bucket) is already in flight, new requests subscribe to its result instead of issuing another database query."],["Answer everyone","One database read is fanned out to every waiting request, so 100,000 readers cost about one query."]]],
        ["tip","Coalescing only works because routing puts identical requests on the same instance. Consistent hashing is what makes them meet."]
      ]
    },
    {
      h: "The migration",
      blocks: [
        ["list",["New writes went to <b>both</b> clusters, so the new one stayed current.","Historical data was copied by a purpose-built migrator (written in Rust) at millions of messages per second, checkpointed so it could resume.","Reads switched over once the copy was verified, and the old cluster was retired."]]
      ]
    },
    {
      h: "Pitfalls: deletes and tombstones",
      blocks: [
        ["p","In an LSM-based store, a delete is a <b>tombstone</b>. A channel where thousands of messages were deleted makes every read scan past all those tombstones until compaction removes them. Keep partitions bounded (time buckets), and watch the tombstone counts on hot partitions."]
      ]
    },
    {
      h: "Interview follow-ups",
      blocks: [
        ["list",["Search? → a separate inverted-index cluster (Elasticsearch-style), fed by message events.","Unread counts and mentions? → per-user read-state store updated on view, separate from messages.","Voice channels? → real-time UDP media servers, a different architecture entirely.","Edits? → overwrite the row by message_id (same partition), and emit an event for search and caches."]]
      ]
    }
  ]
});
