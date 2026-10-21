/* Blueprint course — lesson: SQL vs NoSQL, ACID, and choosing a sharding key */
BP.LESSONS.push({
  id: "sql-nosql",
  mod: "db",
  icon: "🧮",
  minutes: 35,
  title: "SQL vs NoSQL, ACID, and choosing a sharding key",
  scaler: "HLD 7 · SQL vs NoSQL + Sharding",
  summary: "What relational databases give you, why sharding takes much of it away, how to pick a sharding key (five worked quizzes), and which NoSQL family fits which job.",
  concepts: ["acid","sharding","nosql-types","denormalization"],
  related: ["uber","ticketmaster","discord"],
  sections: [
    { h: "What SQL gives you", blocks: [
      ["p","<b>Normalization:</b> store each fact once. If a score lives in two tables and one update misses a table, you no longer know which to trust."],
      ["p","<b>ACID transactions:</b> <b>A</b>tomicity (all or nothing), <b>C</b>onsistency (rules like \"balance ≥ 0\" hold before and after), <b>I</b>solation (concurrent transactions don't see each other's half-done work), <b>D</b>urability (committed data survives crashes)."],
      ["steps",[["The withdrawal race","Balance = ₹1,500. Two ₹1,000 withdrawals arrive at once."],["Request A checks","1500 ≥ 1000 ✓"],["Request B runs fully","check ✓, balance → ₹500, cash dispensed"],["Request A continues","balance = 500 − 1000 = <b>−₹500</b> 💸"],["With a transaction","Check and subtract happen atomically and in isolation. B waits or sees the new balance and is rejected."]]],
      ["p","<b>Defined schema:</b> fixed columns and types, which is great for integrity."],
      ["warn","<b>ACID consistency ≠ CAP consistency.</b> ACID's C means \"invariants hold\". CAP's C means \"replicas agree on the latest value\". A NoSQL store can give one without the other."]
    ] },
    { h: "ACID, one letter at a time", blocks: [
      ["table",["Letter","Guarantee","Example"],[["Atomicity","All statements of a transaction commit, or none do","Debit A and credit B: never just one of them"],["Consistency","Rules hold before and after (may be broken mid-transaction)","Balance never ends below 0; foreign keys stay valid"],["Isolation","Concurrent transactions don't see each other's half-done work","Two ATMs don't both see ₹1,500 and both withdraw ₹1,000"],["Durability","Committed data survives crashes and reboots","After \"success\", a power cut doesn't undo the transfer"]]],
      ["p","<b>Normalization, with an example.</b> If a student's score is stored in both <code>students</code> and <code>leaderboard</code>, an update that touches only one leaves two different scores, and you don't know which to trust. Normalize: store the score once and reference it."],
      ["code","-- ❌ duplicated fact\nstudents(id, name, score)        leaderboard(student_id, name, score)\n\n-- ✅ normalized\nstudents(id, name)               scores(student_id → students.id, score)"],
      ["p","<b>Bank transfers across systems (from the Q&A).</b> Sending ₹1,000 from A to B: A's side moves to <code>send_initiated</code> and is debited. When B's bank confirms, it moves to <code>send_completed</code>. If B's credit fails permanently, A's debit is rolled back and the ₹1,000 returns. Money \"coming back after 1–2 days\" is the bank retrying and then giving up."]
    ] },
    { h: "Where SQL struggles", blocks: [
      ["list",["<b>Rigid schema:</b> a t-shirt has collar and size, a laptop has RAM and screen size. With ~100,000 product types, a table per type is impossible and one string column can't be filtered.","<b>Sharding removes SQL's superpowers:</b> JOINs and transactions across machines are slow and hard. Once data is split, you want each query's data on one machine anyway."]],
      ["tip","The notes' advice: <b>start with SQL</b>. It's enough for most companies (Scaler runs on MySQL). Reach for NoSQL when scale forces you to. Facebook famously runs heavily, manually sharded MySQL."],
      ["img","Datacenter Server Racks (22370909788).jpg","Once one table spans many machines like these, JOINs and transactions across them become slow and fragile."]
    ] },
    { h: "Choosing a sharding key", blocks: [
      ["list",["<b>Spread load evenly</b> (no hot shard).","<b>Keep the most frequent operations on one shard</b> (avoid fan-out).","<b>Touch the minimum number of shards on writes</b> (helps consistency).","<b>Minimize redundancy.</b>"]],
      ["fig","shardkey","Five scenarios from the notes. Pick a candidate key and see the distribution and fan-out."],
      ["p","When the key doesn't co-locate what a query needs, the query must ask every shard and merge results, a <b>fan-out</b>. It's slow, costly, and multiplies failure points."],
      ["chart",{"type":"bar","title":"Shards touched by getAllBookmarks(user), 16 shards","data":[["Shard by user_id",1],["Shard by site_url",16]],"highlight":0,"note":"One key choice turns a single lookup into a 16-way fan-out."}]
    ] },
    { h: "The five sharding-key quizzes, worked", blocks: [
      ["steps",[["Banking: UserID ✓","Users hold accounts in several cities. Balance, history and \"my accounts\" are all per user, so UserID keeps each on one shard. CityID fails: users move, cities differ hugely in size, and multi-city users fan out."],["Uber: CityID ✓","\"Find nearby drivers\" only needs your city. DriverID scatters nearby drivers across all shards. PIN code makes cabs migrate between shards constantly."],["Slack: GroupID ✓","A channel can have 100,000 members. UserID means one write per member per message, while GroupID means one write. Unread counts and the channel list load lazily from a small per-user index."],["IRCTC: TrainID ✓","No double-booking: all berths of a train sit on one shard, so allocation is local and atomic. Date of journey melts one shard at every tatkal opening. UserID can't prevent two users getting the same berth without checking every shard."],["First letter of username ✗","Far more names start with 'a' than 'x', there's a hard cap of 26 shards, letter frequencies are hard to predict, and a hot letter can't be split."]]],
      ["tip","Composite keys can also work, for example (city, driver) or (channel, time bucket) as Discord does. Avoid <b>hierarchical</b> sharding schemes where one parent machine failing makes everything under it unreachable."]
    ] },
    { h: "Denormalization", blocks: [
      ["p","Step 2 of sharding: deliberately <b>duplicate</b> data so each frequent read hits one shard. In a messenger sharded by user, a message from U1 to U2 is stored in U1's mailbox (sent) <i>and</i> U2's mailbox (received). Reads are fast, but every logical change now means multiple writes that must stay in sync."]
    ] },
    { h: "NoSQL families", blocks: [
      ["fig","datamodels","The same user-and-orders data in five different models."],
      ["table",["Need","Pick","Why"],[["Live cricket score per match","Key-value","Just read and overwrite one value"],["Cab's current location only","Key-value","Overwrite cab → (lat, lng)"],["Cab location <i>history</i>","Wide-column","Row = cab, append timestamped entries, read the latest N"],["Latest tweets per hashtag, paged","Wide-column","KV would fetch all 10,000 tweets to show 10. Wide-column reads the first X, then offsets."],["Products with wildly different attributes","Document","Flexible JSON per product, queryable by any field"],["Friends-of-friends, recommendations","Graph","Traversals instead of JOIN chains"]]],
      ["extra","<b>ACID vs BASE.</b> NoSQL stores often favour <b>B</b>asically <b>A</b>vailable, <b>S</b>oft state, <b>E</b>ventually consistent behaviour. You can still build ACID-like guarantees on NoSQL, for example routing writes through a lock-holding coordinator, at a cost."]
    ] },
    { h: "ACID on top of NoSQL, and two open problems", blocks: [
      ["p","NoSQL stores rarely give multi-key ACID transactions. The notes' way to build them: route all writes for a dataset through a <b>central shard</b> that hands out <b>write locks</b>. Acquire the lock, write, release. That gives atomicity and isolation at the cost of a bottleneck."],
      ["p","The lecture ends with two homework problems that lead into the next two lessons:"],
      ["list",["<b>Variable-size values:</b> SQL is easy to store because the maximum record size is known. NoSQL values can grow without limit. How do you lay them out on disk so reads are fast and updates are cheap? → <a href=\"#/lesson/lsm\">NoSQL internals</a>.","<b>Manual sharding:</b> design the black box that adds shards and restores the replication level when machines die. → <a href=\"#/lesson/shard-ops\">Orchestration & shard creation</a>."]]
    ] }
  ],
  quiz: [
    {"q":"IRCTC train booking: which sharding key prevents double-booking and spreads tatkal load?","o":["Date of booking","UserID","TrainID","Station name"],"a":2,"why":"All berths for a train are on one shard, so allocation is local and atomic. Many trains run each day, so load spreads."},
    {"q":"Slack (groups up to 100,000 users): shard messages by…","o":["UserID","GroupID (channel)","Message length","Timestamp"],"a":1,"why":"One write per message. UserID would mean a write per member."},
    {"q":"Why is \"first letter of username\" a bad key?","o":["Letters aren't unique","Uneven load ('a' ≫ 'x'), a hard cap of 26 shards, can't split further","It's too slow","It needs a JOIN"],"a":1,"why":"Skewed, capped and inflexible."},
    {"q":"Latest tweets per hashtag, paginated 10 at a time. Best NoSQL type?","o":["Key-value","Wide-column","Graph","Blob storage"],"a":1,"why":"Sorted, appendable rows let you read the first X and offset. KV would return the whole list."}
  ],
  refs: [
    ["ByteByteGo: A guide to database sharding keys","https://blog.bytebytego.com/p/a-guide-to-database-sharding-key"],
    ["MongoDB: choosing a shard key","https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/"],
    ["Slack: scaling datastores with Vitess","https://slack.engineering/scaling-datastores-at-slack-with-vitess/"],
    ["AWS: ACID vs BASE","https://aws.amazon.com/compare/the-difference-between-acid-and-base-database/"],
    ["MongoDB: NoSQL explained","https://www.mongodb.com/resources/basics/databases/nosql-explained"]
  ]
});
