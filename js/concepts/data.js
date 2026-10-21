/* Blueprint building blocks — Data. Each concept: name, icon, cat, one (one-liner), analogy, body, optional fig/sim, when, pitfalls, used (case ids). */
Object.assign(BP.CONCEPTS, {
  "base62": {
    name: "Base62 encoding",
    icon: "🔤",
    cat: "Data",
    one: "A way of writing a big number with 62 different symbols instead of 10, so it takes far fewer characters.",
    analogy: "Think of a car's odometer. With ten digits per wheel you need seven wheels to reach a million. Give each wheel 62 possible symbols instead, and the same seven wheels can count past 3.5 trillion.",
    body: "Say you're building a URL shortener. Every new link gets a number from a counter: 1, 2, 3, and eventually 125,000,000,000. Nobody wants <code>sho.rt/125000000000</code>. That's 12 characters, which defeats the whole point of a short link. You want something like <code>sho.rt/2CF9xPq</code>.<br><br>Base62 is how you get there. Normal decimal has 10 symbols (0 to 9). Base62 has 62: the digits 0 to 9, the lowercase letters a to z, and the uppercase letters A to Z. To convert, you keep dividing the number by 62 and turn each remainder into a symbol. Tiny example: 125 divided by 62 is 2, remainder 1. So 125 becomes the symbols for 2 and 1, which is “21”. Going backwards is just as easy, so the short code and the number are two spellings of the same value.<br><br>Why does this matter so much? Because each extra character multiplies your capacity by 62. Six characters give 62^6, about 56.8 billion codes. Seven give 62^7, about 3.52 trillion. That's enough to hand out a thousand new links a second for over a hundred years.<br><br>Why 62 and not 64? Base64 adds two more symbols, usually “+” and “/”, and those have special meanings inside URLs. Base62 sticks to letters and digits, so the code is safe to paste anywhere. A few variants drop look-alike characters such as 0, O, l and I (Base58, used by Bitcoin addresses) so humans can read codes aloud without mistakes.<br><br>Shorteners like Bitly and TinyURL use this style of short alphanumeric code, and YouTube's 11-character video IDs come from the same family of ideas.",
    code: "while (n > 0) { out = ALPHABET[n % 62] + out; n = Math.floor(n / 62); }",
    when: "You have a numeric ID that humans will see, type or share (short links, invite codes, public IDs) and you want it compact and URL-safe.",
    pitfalls: "Encoding a plain counter makes codes guessable: anyone can walk sho.rt/abc1, abc2, abc3 and scrape every link, so shuffle or mix the number first if that matters. Mixing up the alphabet order between services silently produces different codes for the same number. Case matters, so a code typed in all lowercase points somewhere else entirely.",
    used: ["bitly"],
    sim: "shortener"
  },

  "id-generation": {
    name: "Distributed ID generation",
    icon: "🎫",
    cat: "Data",
    one: "Ways to give every new record a unique ID when many machines are creating records at the same time.",
    analogy: "Picture a supermarket where every cashier had to phone the manager for the next receipt number. The queue would stretch out the door. Instead, each cashier gets a whole roll of pre-numbered tickets and only calls the manager when the roll runs out.",
    body: "On a single database, IDs are easy: the database keeps a counter and hands out 1, 2, 3. Now imagine you have 50 servers each creating, say, 10,000 records a second. If they all ask one counter for the next number, that counter becomes the slowest and most fragile part of your system. If it goes down, nobody can create anything.<br><br>There are three popular ways out. <b>Range allocation</b>: each server leases a block of numbers, like 1,000 to 1,999, from a coordinator. It hands them out locally and only asks again when the block runs dry, so the coordinator sees one request per thousand IDs. <b>Snowflake-style IDs</b>: each server builds the ID itself from the current time, its own machine number and a small counter. No coordination at all, and the IDs sort by time. <b>UUIDs</b>: 128 random bits. The chance of two machines picking the same one is so small you can ignore it, but they are long and, in the classic random version, don't sort.<br><br>How do you choose? Ask four questions. Do you need IDs to sort by creation time? How many bytes can you afford per ID, given it appears in every index? Can you tolerate a coordinator? And is it a problem if outsiders can guess the next ID?<br><br>Twitter built Snowflake for tweets, Discord uses Snowflake IDs for messages, and Flickr famously used a pair of database “ticket servers” that handed out ranges.",
    when: "Any system that creates records on more than one machine and needs IDs that never collide, especially when one central counter would be a bottleneck or a single point of failure.",
    pitfalls: "Random UUIDs as primary keys scatter inserts all over a B-tree index and slow writes; time-ordered variants (UUIDv7, Snowflake) avoid this. Range allocation leaves gaps when a server crashes with half a block unused, so never assume IDs are contiguous. Sequential IDs in public URLs leak how many users or orders you have.",
    used: ["bitly","discord"],
    fig: "snowflake"
  },

  "snowflake": {
    name: "Snowflake IDs",
    icon: "❄️",
    cat: "Data",
    one: "A 64-bit ID built from the current time, a machine number and a counter, so any machine can make unique IDs that also sort by time.",
    analogy: "Imagine receipt numbers printed as DATE-TILL-COUNT, like 20241021-07-0042. Two tills can never print the same number, and sorting the receipts by number also sorts them by when they were printed.",
    body: "Discord stores billions of messages, and the most common question it asks is “show me the 50 messages before this one”. If message IDs were random, answering that would need a separate timestamp index. If they came from one central counter, every message send in the world would queue up behind it. Snowflake IDs solve both problems at once.<br><br>The trick is to pack three things into one 64-bit number. The top ~41 bits are milliseconds since a chosen start date (the “epoch”), which lasts about 69 years. The next ~10 bits are a worker ID, so up to 1,024 machines can generate IDs side by side. The last ~12 bits are a sequence counter that resets every millisecond, allowing 4,096 IDs per machine per millisecond. That's about 4 million IDs a second from a single machine.<br><br>Walk through it: at millisecond 1,000, worker 5 creates its 3rd ID. The ID is (1000 shifted left by 22) OR (5 shifted left by 12) OR 3. Worker 6 at the same millisecond gets a different middle section, so no collision. One millisecond later, every ID is larger, so sorting by ID sorts by time.<br><br>Twitter popularised the layout in 2010 for tweet IDs. Discord, Instagram (with its own variant inside PostgreSQL) and many others use the same idea. Because the time is right there in the ID, “messages before ID X” becomes a cheap range scan on the primary key.",
    code: "id = (ms_since_epoch << 22) | (worker_id << 12) | sequence",
    used: ["discord","twitter"],
    fig: "snowflake",
    when: "You need unique, time-sortable 64-bit IDs generated on many machines without coordination, for things like messages, posts or events that are usually read newest-first.",
    pitfalls: "If a server's clock jumps backwards (say, after a time sync), it can reissue old IDs; generators must detect this and wait. Two machines accidentally configured with the same worker ID will collide, so assign worker IDs from a registry. The ID reveals the creation time, which you may not want to expose. JavaScript numbers lose precision above 2^53, so send these IDs to browsers as strings."
  },

  "transcoding": {
    name: "Transcoding pipelines",
    icon: "🎞️",
    cat: "Data",
    one: "Turning one uploaded video into many versions (different sizes, qualities and formats) so it plays well on every device and connection.",
    analogy: "It's like a publisher taking one manuscript and producing a hardback, a paperback, a large-print edition and an audiobook, with many translators each handling a different chapter at the same time.",
    body: "Someone uploads a 2-hour, 4K film to your video site. Viewers are on phones with patchy 4G, laptops on hotel Wi-Fi and big TVs on fibre. One file can't serve all of them: the 4K original is maybe 20 GB, far too heavy for a phone, and some older devices can't even decode its format. So you transcode it, which means decoding the video and re-encoding it at different settings.<br><br>A typical output is a “ladder” of versions: say 240p at 0.4 Mbps, 480p at 1 Mbps, 720p at 3 Mbps, 1080p at 6 Mbps and 4K at 15 Mbps, often in more than one codec (H.264 for compatibility, newer ones like VP9 or AV1 for smaller files). Encoding a 2-hour film once can take hours. Doing ten versions in a row would take a day.<br><br>So you parallelise. Split the source into chunks of a few seconds each, send each chunk to a different worker, encode them all at once, then stitch the results back together. A film that would take 10 hours on one machine finishes in minutes across hundreds. Each step (split, encode, check quality, package) becomes a task in a pipeline, so a failed chunk is simply retried.<br><br>Netflix popularised <b>per-title encoding</b>: a simple cartoon looks great at a lower bitrate than a grainy action movie, so each title gets its own custom ladder. YouTube transcodes every upload this way, which is why a fresh video sometimes shows only low resolutions for the first few minutes.",
    when: "Any product where users upload media that others watch or listen to on a mix of devices and network speeds: video platforms, course sites, podcasts, video calls with recording.",
    pitfalls: "Cutting chunks at arbitrary points instead of at keyframes causes glitches at the joins. Encoding every title with one fixed ladder wastes storage on simple content and looks blocky on complex content. Forgetting audio sync, subtitles and thumbnails means the “finished” video still isn't playable end to end.",
    used: ["netflix","youtube"]
  },

  "geo-index": {
    name: "Geospatial indexing",
    icon: "🗺️",
    cat: "Data",
    one: "Organising locations into map cells so “what's near me?” only checks a few cells instead of every point on Earth.",
    analogy: "Finding your friend in a 60,000-seat stadium is hopeless if you check seat by seat. If they text you “Section 112”, you walk to one section and look around. A geo index gives every point a section number.",
    body: "You open a ride app and it needs the five closest drivers. There are, say, 1 million drivers online worldwide. The naive approach computes the distance from you to all 1 million and sorts them, for every rider, every few seconds. That's billions of distance calculations a minute, and almost all of them are about drivers on other continents.<br><br>The fix is to divide the map into cells and label each point with its cell. Now the question becomes “which drivers are in my cell and the cells around it?”, which is a quick lookup that returns maybe 50 candidates. Only those 50 get a precise distance check.<br><br>There are three famous ways to draw the cells. <b>Geohash</b> turns a latitude and longitude into a short string like <code>tdr1y</code>; points that share a longer prefix are close together, so a database prefix search finds neighbours. <b>Quadtrees</b> split the map into four squares, then split any square that is too crowded into four more, so dense cities get tiny cells and empty deserts stay as one big cell. <b>H3</b>, open-sourced by Uber, covers the globe in hexagons at several zoom levels; hexagons are handy because all six neighbours are the same distance away.<br><br>One catch: a straight-line distance isn't how far a car must drive. A driver 300 metres away across a river might be 15 minutes off. So real dispatch systems use the geo index to shortlist candidates, then rank them by estimated road travel time. Redis, PostgreSQL (PostGIS), Elasticsearch and MongoDB all ship geospatial indexes.",
    when: "Any “near me” feature: ride hailing, food delivery, store locators, dating apps, or showing points on a map viewport.",
    pitfalls: "Searching only your own cell misses someone standing just across the border, so always include neighbouring cells. Geohash cells get stretched near the poles and break at the 180° meridian. Ranking by straight-line distance instead of real travel time sends the wrong driver.",
    used: ["uber"],
    sim: "geo"
  },

  "ttl-lock": {
    name: "Reservations with TTL (leases)",
    icon: "⏱️",
    cat: "Data",
    one: "Holding something (a seat, a driver, a hotel room) for one person for a limited time, and automatically releasing it if they don't finish.",
    analogy: "A fitting-room tag: the clothes are yours to try for 10 minutes. Walk out or wander off, and the assistant puts them back on the rack for the next shopper.",
    body: "Picture a big concert going on sale. You click seat A12, and now you're typing your card number. For those few minutes, nobody else should be able to buy A12. But what if you close the tab, or your phone dies? If the seat stays “yours” forever, the venue slowly fills with ghost reservations and real fans see a sold-out show with empty seats.<br><br>A reservation with a TTL (“time to live”, an expiry timer) handles both cases. When you pick a seat, the system makes one atomic change: set A12 to HELD by user 42, expiring in 5 minutes, but only if it is currently AVAILABLE. “Atomic” means the check and the change happen as one indivisible step, so two people clicking at the same instant can't both succeed. If you pay in time, HELD becomes SOLD. If the timer runs out, A12 becomes AVAILABLE again on its own.<br><br>In Redis this is one command: <code>SET seat:A12 user42 NX PX 300000</code>. NX means “only if it doesn't exist yet”, and PX 300000 means “delete it after 300,000 milliseconds”. In a SQL database you'd do a conditional update with an <code>expires_at</code> column and have readers treat expired holds as free.<br><br>The same pattern is called a <b>lease</b> in distributed systems: a lock that expires, so a crashed lock-holder can't block everyone forever. Ticketmaster-style checkouts, ride apps holding a driver for a rider, and hotel booking sites all use it.",
    code: "SET seat:A12 user42 NX PX 300000",
    when: "Any multi-step flow where a scarce item must be held while a person (or service) finishes: checkout, booking, matching a driver, or claiming a job from a queue.",
    pitfalls: "Checking availability and then writing the hold in two separate steps lets two buyers grab the same seat. A TTL that's too short kicks out people who are still typing their card details; too long and abandoned carts hide inventory during the rush. When the hold expires, the payment step must re-check it still owns the seat, or a late payment can sell a seat that was already given to someone else.",
    used: ["ticketmaster","uber"],
    sim: "onsale"
  },

  "optimistic-concurrency": {
    name: "Atomic writes & optimistic concurrency",
    icon: "🥊",
    cat: "Data",
    one: "Making sure that when two people try to change the same thing at the same instant, only one of them wins and the other is told cleanly.",
    analogy: "Two people reach for the last cookie at the same moment. The jar's lid only opens for one hand, and the other person gets a polite “sorry, just taken” instead of half a cookie.",
    body: "Here is a bug that has sold the same concert seat twice in real life. Your code reads seat A12, sees it's available, then writes “sold to Asha”. Meanwhile, a few milliseconds apart, another request reads A12, also sees it's available (Asha's write hasn't landed yet), and writes “sold to Ben”. Both get a confirmation email. This gap between the read and the write is called a <b>race condition</b>.<br><br>The fix is to make the check and the change a single step the database performs atomically. In SQL: <code>UPDATE seats SET status='HELD' WHERE id='A12' AND status='AVAILABLE'</code>. The database runs this one at a time per row. The first request changes 1 row and wins. The second finds the condition false, changes 0 rows, and your code tells Ben the seat just went.<br><br>For records that change in more complex ways, use <b>optimistic concurrency</b> with a version number. You read a document at version 7, edit it, and save with “only if the version is still 7, and set it to 8”. If someone else saved first, the version is now 8, your save fails, and you reload and retry. It's “optimistic” because you assume conflicts are rare and only check at the end. The <b>pessimistic</b> alternative is to lock the row before reading (<code>SELECT … FOR UPDATE</code>), which is safer under heavy contention but makes everyone else wait.<br><br>DynamoDB conditional writes, HTTP's ETag and If-Match headers, and Git refusing a push when the branch moved are all this same idea.",
    code: "UPDATE seats SET status='HELD', holder=$u\n WHERE id=$s AND status='AVAILABLE';  -- 0 rows → lost race",
    when: "Whenever two users or processes can update the same row: inventory, seat booking, account balances, editing a shared record.",
    pitfalls: "Reading in one query and writing in another, without a condition, reintroduces the race. Forgetting to check the “rows affected” count means the loser is never told. Under heavy contention on one hot row, optimistic retries can spin in a loop; switch to a queue or a lock there. Retrying without fresh data simply repeats the conflict.",
    used: ["ticketmaster","stripe"],
    sim: "onsale"
  },

  "geo-sharding": {
    name: "Dispatch & state machines",
    icon: "🔄",
    cat: "Data",
    one: "Describing each thing (a ride, a driver, an order) as a set of named states and the only moves allowed between them.",
    analogy: "A board-game piece that can only move to certain squares. You can't jump from START straight to FINISH, and the rules say exactly which square comes next.",
    body: "Think about a driver in a ride app. At any moment they are offline, waiting for a job, being offered a job, driving to pick someone up, or on a trip. If your code stores this as a handful of loose flags (<code>isOnline</code>, <code>hasRide</code>, <code>isOffered</code>), sooner or later a bug sets them into a combination that makes no sense, like a driver who is offline but on a trip. Or worse, two riders get offered the same driver at once.<br><br>A <b>state machine</b> fixes this by naming every allowed state and every allowed transition. A driver might go OFFLINE → AVAILABLE → OFFERED → EN_ROUTE → ON_TRIP → AVAILABLE. Anything not on the list, such as OFFLINE → ON_TRIP, is simply rejected.<br><br>Each transition is a conditional write: “move driver 17 from AVAILABLE to OFFERED, but only if they are still AVAILABLE”. If two dispatchers try at once, only one succeeds, so the driver gets one offer. Timeouts are transitions too. If the driver doesn't accept within, say, 15 seconds, OFFERED goes back to AVAILABLE and the dispatcher tries the next nearest driver.<br><br>Because every change is a named event, you also get a free history: “offered at 10:02:05, accepted at 10:02:11, picked up at 10:09:40”. That history is gold for support tickets and analytics. Uber's trips, food-delivery orders, payment flows at Stripe and workflow engines like AWS Step Functions are all built on explicit state machines.",
    when: "Anything with a lifecycle that many services touch at once: rides, orders, payments, support tickets, deployments.",
    pitfalls: "Letting any service set any state directly skips the rules and recreates the impossible combinations. Forgetting the timeout path leaves drivers or orders stuck in OFFERED or PENDING forever. Adding states without updating every consumer breaks screens and reports that assumed the old list.",
    used: ["uber"]
  },

  "cap": {
    used: [],
    name: "CAP theorem",
    icon: "🔺",
    cat: "Data",
    fig: "cap",
    one: "When the network between your database's machines breaks, each machine must choose between giving a possibly stale answer or refusing to answer.",
    analogy: "Rohit and Raj share the job of taking reminders for their team, each keeping a diary, and they sync by phone. When the phone line dies, Raj can refuse new reminders until it's back (consistent), or take them and risk contradicting Rohit (available).",
    body: "As soon as your data lives on more than one machine, those machines talk over a network, and networks fail. A cable gets cut, a switch reboots, a data centre loses its link to another. When some machines can't reach others, that's called a <b>partition</b>.<br><br>CAP names three properties. <b>C, consistency</b>: every read sees the most recent write, or gets an error. <b>A, availability</b>: every request to a working machine gets a real answer, not an error. <b>P, partition tolerance</b>: the system keeps running even when messages between machines are lost. The theorem, proved by Gilbert and Lynch in 2002 after Eric Brewer's conjecture, says that during a partition you can't have both C and A.<br><br>Why not? Say you have two replicas, one in Mumbai and one in Delhi, and the link between them goes down. A user in Delhi updates their balance from ₹1,000 to ₹500. A second later, someone asks Mumbai for that balance. Mumbai can either answer ₹1,000, which is available but wrong, or say “sorry, try later”, which is consistent but unavailable. There is no third option.<br><br>Since partitions will happen, “P” isn't really optional, and the real choice is <b>CP</b> (refuse rather than be wrong) or <b>AP</b> (answer, then reconcile later). A bank balance or a seat inventory should usually be CP. A like counter or a news feed is happily AP: nobody is harmed if a like shows up five seconds late. ZooKeeper and etcd lean CP; Cassandra and DynamoDB default towards AP.",
    when: "Use it to classify requirements early: money, inventory, locks and unique usernames lean C; feeds, likes, search results and recommendations lean A.",
    pitfalls: "Labelling a whole database “CP” or “AP” is crude, because most systems let you choose per operation or per configuration. CAP's C (latest value) is not ACID's C (rules like balance ≥ 0). CAP says nothing about the normal, healthy case; for that you need PACELC.",
  },

  "pacelc": {
    used: [],
    name: "PACELC",
    icon: "⏱️",
    cat: "Data",
    fig: "cap",
    one: "An extension of CAP: during a network split you trade availability against consistency, and the rest of the time you trade speed against consistency.",
    analogy: "Even on a calm day, a decision that needs every manager's signature is slower than one a single manager makes alone. Waiting for agreement always costs time, not just during emergencies.",
    body: "CAP only talks about the bad day when the network splits. But most of the time the network is fine, and you still face a trade-off every single request. PACELC, proposed by Daniel Abadi in 2010, spells it out: if there's a <b>P</b>artition, choose <b>A</b>vailability or <b>C</b>onsistency; <b>E</b>lse, choose <b>L</b>atency or <b>C</b>onsistency.<br><br>Why does the healthy case have a trade-off? Picture a write to a database with three replicas. Option one: the leader saves it, waits for the other two to confirm, then tells the user “done”. Every replica now agrees, so any read anywhere is fresh. But if one replica is in another region 80 ms away, every write takes at least 80 ms. Option two: the leader saves it, replies “done” in 2 ms, and sends the copy to the replicas in the background. Fast, but for a brief window, a read from a replica might return the old value.<br><br>The first option is called <b>synchronous replication</b>, the second <b>asynchronous replication</b>. Neither is wrong. It depends on whether a moment of staleness hurts anyone.<br><br>Systems get two-part labels. Cassandra and DynamoDB in their default settings are <b>PA/EL</b>: available during partitions, low-latency otherwise. Google Spanner and a synchronously replicated bank ledger are <b>PC/EC</b>: they pay latency to always be consistent. Many databases let you dial between the two per query, as Cassandra does with its consistency levels.",
    when: "Use it when choosing replication settings or a database: it forces you to state how much latency you'll pay for fresh reads on a normal day, not just during outages.",
    pitfalls: "Ignoring the “else” half and assuming consistency is free when the network is healthy. Picking synchronous cross-region replication for data that never needed it, and making every write slow. Assuming a database's default settings match your needs without checking."
  },

  "consistency-models": {
    used: [],
    name: "Strong vs eventual consistency",
    icon: "🔄",
    cat: "Data",
    fig: "replication",
    one: "Strong consistency means every read sees the latest write; eventual consistency means copies may disagree briefly but will catch up.",
    analogy: "Strong consistency is a live scoreboard in the stadium: everyone sees the same score at the same moment. Eventual consistency is newspapers in different towns: some print tonight, some tomorrow morning, but they all end up with the same result.",
    body: "You post a photo, then refresh your profile, and the photo isn't there. A second later it appears. You just saw <b>eventual consistency</b>: your write went to one copy of the data, your read came from another copy that hadn't caught up yet. Given a bit of time with no new writes, all copies converge to the same value.<br><br><b>Strong consistency</b> promises the opposite: once a write is confirmed, every later read, from anywhere, sees it. To deliver that, the system must coordinate before answering, for example by sending all reads to a single leader, or by requiring a majority of replicas to agree (a quorum). That coordination costs time and can fail during a network split.<br><br>There's a useful middle ground. <b>Read-your-writes</b>: you always see your own changes, even if others see them a bit later, which fixes the missing-photo problem. <b>Monotonic reads</b>: once you've seen a value, you never see an older one, so a comment can't appear and then vanish. <b>Causal consistency</b>: if a reply depends on a message, nobody sees the reply before the message.<br><br>How do eventually consistent systems catch up? Replicas gossip updates to each other, fix stale copies when a read notices a mismatch (read repair), and resolve conflicts with rules like “latest timestamp wins”. Amazon's original Dynamo shopping cart, Cassandra and DNS are classic eventual systems. Google Spanner and relational databases with a single primary give strong consistency.",
    when: "Choose strong for money, inventory, locks, usernames and chat message order. Eventual is fine for feeds, like counts, view counters and recommendations, ideally with read-your-writes for the user who made the change.",
    pitfalls: "Reading from a replica right after writing to the leader and showing the user stale data. Assuming “eventual” means “within a second”; under load or failures, lag can be minutes. Using “last write wins” with clocks on different machines can quietly drop a real update."
  },

  "acid": {
    used: [],
    name: "ACID transactions",
    icon: "🧪",
    cat: "Data",
    fig: "datamodels",
    one: "Four promises (Atomic, Consistent, Isolated, Durable) that let a group of database changes behave like one safe, all-or-nothing action.",
    analogy: "A bank transfer either happens completely or not at all. Nobody ever sees the money “in the air”, gone from one account but not yet in the other.",
    body: "You transfer ₹500 from savings to current. That's two changes: subtract 500 here, add 500 there. What if the server crashes between them? Without protection, ₹500 simply vanishes. A <b>transaction</b> groups both changes so the database treats them as one unit, and ACID describes what that unit guarantees.<br><br><b>Atomicity</b>: all changes commit or none do. Crash halfway, and the database rolls back the half-done part. <b>Consistency</b>: rules you've declared, such as “balance can't go below zero” or “every order needs a customer”, hold before and after. <b>Isolation</b>: transactions running at the same time don't see each other's half-finished work. <b>Durability</b>: once the database says “committed”, the data survives a crash or power cut, usually because it was written to a log on disk first.<br><br>Isolation is the one that bites in practice. Say your balance is ₹1,500 and two ₹1,000 withdrawals arrive at the same instant. Both read ₹1,500, both decide there's enough, both subtract. You end at −₹500. Proper isolation makes the second withdrawal wait for or see the first. Databases offer levels (read committed, repeatable read, serializable) that trade strictness for speed, and most default to a weaker one than you might assume.<br><br>PostgreSQL, MySQL's InnoDB, Oracle and SQL Server are ACID databases. Note that ACID's C (your data rules) is a different idea from CAP's C (seeing the latest value).",
    when: "Money, orders, bookings, and anything where one business action changes several rows that must stay in agreement.",
    pitfalls: "Stretching one ACID transaction across shards or services is slow and fragile; co-locate the data or use a saga. Assuming the default isolation level prevents every race, when it often allows anomalies like the double withdrawal. Holding a transaction open while calling a slow external API locks rows for everyone else."
  },

  "denormalization": {
    used: [],
    name: "Denormalization",
    icon: "📑",
    cat: "Data",
    fig: "shardkey",
    one: "Storing the same piece of data in more than one place on purpose, so common reads can grab everything from one spot without joins.",
    analogy: "When you send a letter, you keep a copy in your own file and the recipient keeps theirs. Neither of you has to visit the other's office to read it, but if the letter is corrected, both copies need fixing.",
    body: "In a classic, <b>normalised</b> database, every fact lives exactly once. A post row stores <code>author_id = 42</code>, and the author's name lives only in the users table. To show a feed, you <b>join</b> the two tables. On one machine, joins are cheap and this design keeps data tidy.<br><br>Now your app grows and you split data across 100 machines (sharding). Posts sit on one shard, users on another. Showing 50 posts with author names now means 50 lookups across the network. Your feed page goes from 20 ms to 400 ms.<br><br><b>Denormalisation</b> trades storage and write effort for fast reads. Copy the author's name and avatar into each post. Store each chat message in both the sender's and the receiver's inbox. Keep a precomputed <code>like_count</code> on the post instead of counting likes every time. Now the feed is one read from one shard.<br><br>The cost moves to writes. If a user renames themselves, every post that holds the old name must be updated, perhaps thousands of rows on dozens of shards. Usually that's done in the background, so for a while some posts show the old name. That's often fine, because a name change is rare and a feed read happens millions of times a day.<br><br>Cassandra and DynamoDB data modelling is built around this: you design one table per query and accept duplication. Many SQL systems do it too, through materialised views or summary columns.",
    when: "Reads vastly outnumber writes, the data is sharded or joins are too slow, and a short period of mismatched copies is acceptable.",
    pitfalls: "Every update must reach all copies; forget one place and data drifts permanently, so plan for repair or re-sync jobs. Duplicating fields that change often (like a live follower count) creates write storms. Denormalising before you have a real read-performance problem adds complexity for nothing."
  },

  "quorum": {
    used: [],
    name: "Quorums & tunable consistency",
    icon: "🗳️",
    cat: "Data",
    fig: "quorum",
    one: "Write to W copies and read from R copies; if R + W is more than the total N, every read is guaranteed to include at least one up-to-date copy.",
    analogy: "A panel of 5 judges, where every decision needs 3 signatures. If you later ask any 3 judges what was decided, at least one of them must have signed it, so you'll hear the truth.",
    body: "Say you keep every piece of data on N = 3 replicas so one machine can die without losing anything. Now: when you write, how many replicas must confirm before you say “done”? And when you read, how many do you ask? Those two numbers are W and R, and they're the dial between speed and freshness.<br><br>The rule is simple. If <b>R + W > N</b>, the replicas you read from and the replicas you wrote to must overlap by at least one. Try it with N = 3, W = 2, R = 2. Your write landed on replicas A and B. Your read asks any two, say B and C. B has the new value, so you get it (each copy carries a version or timestamp, so you can tell which is newest). That's strong, balanced and survives one failure for both reads and writes.<br><br>Other settings tilt the trade-off. W = 3, R = 1 makes reads fast but writes fail if any replica is down. W = 1, R = 1 is the fastest of all, but reads can be stale because 1 + 1 isn't more than 3. That's eventual consistency, and plenty of features are fine with it.<br><br>Cassandra lets you pick per query with levels like ONE, QUORUM and ALL. Amazon's 2007 Dynamo paper described shopping-cart settings that favoured availability and accepted occasional conflicting versions, which were merged later. Majority quorums also power leader election in ZooKeeper, etcd and Raft: since two majorities of the same group always overlap, two leaders can't both win, which prevents split brain.",
    when: "Dynamo-style stores like Cassandra and DynamoDB, when you want to choose consistency per request, and consensus systems that need a majority to agree.",
    pitfalls: "R + W > N alone isn't full strong consistency: concurrent writes, clock-based conflict resolution and “sloppy” quorums during failures can still return surprises. Setting W = N means one slow or dead replica blocks every write. Placing all N replicas in one data centre means one outage takes out the whole quorum."
  },

  "bloom-filter": {
    used: [],
    name: "Bloom filter",
    icon: "🌸",
    cat: "Data",
    fig: "bloom",
    one: "A tiny, memory-cheap structure that can tell you “this is definitely not in the set” or “this might be in the set”.",
    analogy: "A bouncer with a smudged, rough guest list. If your name clearly isn't there, you're definitely not getting in. If it looks like it might be, they go and check the proper list.",
    body: "Your database stores data in hundreds of files on disk. A request comes in for user “zara_99”, who doesn't exist. Without help, the database opens file after file looking for her, which might be dozens of slow disk reads to learn nothing. Wouldn't it be nice to have a cheap way to say “not here, don't bother”?<br><br>A Bloom filter, invented by Burton Bloom in 1970, is a row of bits, all starting at 0, plus a few hash functions (functions that turn a value into a pseudo-random number). To <b>add</b> “zara_99”, run it through, say, 3 hash functions, getting positions 4, 17 and 29, and set those bits to 1. To <b>check</b> a name, hash it the same way and look at those 3 bits. If any is 0, the name was never added, guaranteed. If all are 1, it was probably added, but those bits might have been set by other names, so it could be a false alarm.<br><br>So Bloom filters never give false negatives, only occasional false positives. The rate depends on size: about 10 bits per item with the right number of hashes gives roughly a 1% false-positive rate. That's 1.2 MB for a million items, instead of storing the items themselves.<br><br>Cassandra, RocksDB, HBase and other LSM-tree databases keep a Bloom filter per data file to skip files that can't contain a key. Chrome once used one to check URLs against a list of malicious sites before asking the server. Medium has written about using them to avoid recommending stories you've already read.",
    when: "You need a cheap “have I seen this?” check in front of an expensive lookup, and an occasional false “maybe” is acceptable because you'll double-check.",
    pitfalls: "You can't remove items from a standard Bloom filter, since clearing a bit may erase other items too; use a counting Bloom filter or rebuild it. Overfilling it past its planned size makes nearly every answer “maybe”. Never use the “maybe” as a final yes without checking the real data."
  },

  "trie": {
    used: [],
    name: "Trie (prefix tree)",
    icon: "🌿",
    cat: "Data",
    fig: "trie",
    one: "A tree where each step down adds one letter, so finding every word that starts with a prefix is very fast; ideal for autocomplete.",
    analogy: "The thumb-index tabs on a big paper dictionary. Open at M, then flip to MI, then MIC, and each letter narrows the pages you need to look at.",
    body: "You type “mic” into a search box and instantly see “microsoft”, “michael jackson” and “microwave”. The box has to answer within about 100 ms, on every keystroke, for millions of users. Scanning a list of a billion past searches for ones starting with “mic” would never be fast enough.<br><br>A <b>trie</b> stores words as paths. The root has a child for each first letter. Under “m” there's a child for each second letter, and so on. The word “mic” is just the path m → i → c, and every word below that node shares the prefix. Finding the node takes as many steps as the prefix has letters, three here, no matter how many words are stored.<br><br>For autocomplete you add one more trick: each node stores its own <b>top-k list</b>, say the 5 most popular completions under that prefix. Now a keystroke is “walk 3 steps, return the stored list”, with no searching below. The cost is on the write side. When “microwave” gets more popular, every ancestor node (m, mi, mic, …) might need its top-5 updated, so real systems batch these updates, rebuilding the lists from search logs every few minutes or hours rather than on every search.<br><br>At large scale, many teams flatten the trie into a simple key-value table: key = prefix, value = top-k list, stored in Redis or a similar store and sharded by prefix. Tries also show up in spell checkers, IP routing tables (longest-prefix match) and phone-number lookups.",
    when: "Prefix-based lookups: search-box autocomplete, spell check, contact search, and routing tables that match the longest prefix.",
    pitfalls: "A naive trie with one object per letter uses a lot of memory; compressed tries (radix trees) or a prefix → results table help. Updating top-k lists on every single search overwhelms the system; batch or sample those writes. No mainstream database stores tries natively, so you'll be building and loading them yourself."
  },

  "inverted-index": {
    used: ["twitter"],
    name: "Inverted index",
    icon: "🔎",
    cat: "Data",
    fig: "invindex",
    one: "A lookup table from every word to the list of documents that contain it, which is the core of every full-text search engine.",
    analogy: "The index at the back of a textbook. You don't reread the whole book to find “replication”; you look it up and see “pages 41, 87, 112”.",
    body: "Say you store 100 million tweets and someone searches “cricket final”. The obvious SQL, <code>WHERE text LIKE '%cricket%'</code>, has to read every single row because the database can't use a normal index for a word in the middle of text. That's a full scan of 100 million rows per search. Not great.<br><br>An inverted index flips the problem around. Instead of “document → its words”, you store “word → the documents containing it”. When a tweet arrives, you break its text into words (<b>tokenising</b>), lowercase them, drop very common words like “the” (<b>stop words</b>), and reduce words to a root form so “running” and “runs” both become “run” (<b>stemming</b>). Then you add the tweet's ID to each word's list, called a <b>posting list</b>.<br><br>Now the search is quick. Look up “cricket”: tweets 3, 8, 42, 97. Look up “final”: tweets 8, 15, 42. Intersect the two lists: 8 and 42. Rank them by how relevant and recent they are, and you're done, after reading two short lists instead of 100 million rows. Storing the word's position too lets you match exact phrases like “cricket final”.<br><br>Apache Lucene is the classic library for this, and Elasticsearch and OpenSearch are built on it. They split the index into shards by document and replicate each shard, so a search fans out to all shards in parallel and merges the results. Twitter built its own real-time version, Earlybird, so new tweets become searchable within seconds.",
    when: "Search boxes over text: products, posts, documents, job listings, and log search tools such as the ELK stack.",
    pitfalls: "Treating the search index as your source of truth; it's usually a copy built from the main database and can lag or be rebuilt. Using different text processing at index time and query time, so “Running” never matches “run”. Very common words create enormous posting lists that make queries slow if they aren't handled."
  },

  "quadtree": {
    used: [],
    name: "Quadtree",
    icon: "🔲",
    cat: "Data",
    fig: "quadtree",
    one: "A way of dividing a map into four squares, then splitting any square that's too crowded into four more, so busy areas get small cells and empty areas stay large.",
    analogy: "Zooming into a map app: you keep zooming where there's a lot going on (a city centre) and leave the empty ocean as one big tile.",
    body: "You're building “restaurants near me”. If you draw a fixed grid of equal squares over the world, a square in central Mumbai might hold 5,000 restaurants while a square over the Sahara holds none. Busy squares are slow to search and empty ones waste memory. A quadtree adapts the grid to the data.<br><br>Start with one square covering the whole map. Set a limit, say 100 places per square. When a square goes over the limit, split it into four equal quarters (north-west, north-east, south-west, south-east) and move its places into the right quarter. Keep splitting wherever it's still crowded. A dense city ends up many levels deep with tiny squares; a desert stays one big square near the top.<br><br>To find what's near you, walk down from the root, choosing the quarter that contains your location at each level. That takes roughly log N steps, a handful even for millions of places. Then read your square's places and, if you need more results, the neighbouring squares. Back-of-envelope numbers from typical design notes: 100 million places with an ID and coordinates come to only a few gigabytes, so the whole tree fits in a server's memory.<br><br>Moving objects, like cars, are trickier. You don't want to rewrite the tree every second for every driver, so you only move a car when it crosses into a new square. You also avoid splitting and merging a square back and forth when its count hovers near the limit, by using slightly different thresholds for each (called hysteresis). Quadtrees are also used in games for collision detection and in map tiling.",
    when: "Nearby search over points that are spread very unevenly, such as restaurants, cabs and shops, plus collision detection in games and map tile systems.",
    pitfalls: "Searching only the one square you're in misses things just across the border. Rebuilding the tree on every location update for moving objects burns CPU. Splitting and merging at exactly the same threshold makes busy cells flip-flop."
  },

  "chunking": {
    used: ["youtube"],
    name: "Chunking & segmentation",
    icon: "🧱",
    cat: "Data",
    sim: "abr",
    one: "Breaking big things, like files, videos and uploads, into small pieces that can be sent, stored, cached and retried one at a time.",
    analogy: "Moving house box by box instead of trying to lift the whole house onto a truck. If one box falls, you repack that box, not the entire home.",
    body: "You're uploading a 4 GB video over hotel Wi-Fi. At 95% the connection drops. If the upload is one big request, you start again from zero, and you might never finish. If the file was split into, say, 5 MB chunks, you've already sent 780 of them and you just resume with chunk 781.<br><br>That's the core idea: cut big data into independent pieces, each with its own number and often its own checksum (a short fingerprint to detect corruption). Then each piece can be handled separately. You can send several in parallel to use more bandwidth, retry just the one that failed, store different pieces on different machines, and fetch only the pieces you need.<br><br>Video streaming shows this beautifully. Formats like HLS and DASH cut a video into segments of a few seconds each, and each segment exists at several quality levels. Your player downloads segment by segment, and if your connection slows down, it simply asks for the next segment at a lower quality. Skipping to minute 42 just means requesting the segments for minute 42. And because every segment is a small, unchanging file, a CDN can cache it near you.<br><br>You'll find chunks everywhere: HDFS splits files into large blocks (128 MB by default), S3 multipart uploads, BitTorrent pieces, Dropbox syncing only the changed blocks of a file. The key design choice is chunk size. Too small and you drown in metadata and per-request overhead; too big and retries waste a lot of data and playback takes longer to start.",
    when: "Large files, uploads, downloads or video, especially over unreliable networks or when you want parallel transfer, resume after failure, seeking or CDN caching.",
    pitfalls: "Choosing a chunk size without thinking: tiny chunks flood the system with requests and metadata, huge ones make every retry expensive. Forgetting per-chunk checksums lets a corrupted piece slip into the reassembled file. Not cleaning up abandoned partial uploads leaves orphaned chunks costing storage forever."
  },

  "ot-crdt": {
    name: "Operational transformation & CRDTs",
    icon: "🧬",
    cat: "Data",
    sim: "docs",
    used: ["gdocs"],
    one: "Two techniques that let several people edit the same document at once and still all end up with exactly the same text.",
    analogy: "Two friends give directions to the same house: “it's the 3rd house on the left”. If a new house is built at the start of the street before the second set of directions is followed, those directions must be adjusted to “4th house” or the visitor ends up at the wrong door.",
    body: "Asha and Ben are both editing a document that says “CAT”. At the same moment, Asha inserts “S” at the start (position 0) to make “SCAT”, and Ben deletes the “T” at position 2 to make “CA”. Each change is sent to the other. Asha's screen applies Ben's “delete position 2”, but in her copy, “SCAT”, position 2 is now “A”. She ends up with “SCT”, while Ben ends up with “SCA”. The two copies have silently split. Collaborative editing is all about stopping this.<br><br><b>Operational transformation (OT)</b> fixes it by adjusting each incoming edit to account for the edits it didn't know about. Ben's delete was made before Asha's insert, and Asha inserted one character before position 2, so the delete shifts to position 3. Now both sides get “SCA”. Each edit is tagged with the document version it was based on, and a central server decides the official order. That's how Google Docs works, and its roots go back to research in 1989.<br><br><b>CRDTs</b> (conflict-free replicated data types) take a different route. Instead of using positions like “index 2”, every character gets a unique, permanent ID, with rules that say which ID comes first. “Delete character T#ben-7” means the same thing no matter what else happened. Edits can arrive in any order and every copy still converges, without needing a central server. Figma uses CRDT-inspired ideas, and libraries like Yjs and Automerge bring CRDTs to any app.",
    when: "Collaborative editors, shared whiteboards and design tools, multiplayer app state, and offline-first apps that sync later.",
    pitfalls: "The edge cases are subtle: overlapping deletes, two inserts at the same spot, undo. Test convergence with randomised fuzzing, not a few happy-path examples. Rich text with formatting multiplies the transformation rules. CRDTs can keep growing metadata for deleted characters, so plan for compaction."
  },

  "trending": {
    name: "Trending detection (sliding windows)",
    icon: "📈",
    cat: "Data",
    sim: "trends",
    used: ["twitter"],
    one: "Spotting what's suddenly popular right now by comparing how often something appears in the last few minutes with how often it usually appears.",
    analogy: "A smoke alarm doesn't go off because the kitchen always smells a bit of cooking. It reacts to a sudden change in the air compared with normal.",
    body: "If you just counted the most-used words on a social network, the top of the list would be “the”, “good morning” and “love”, every single day. That's popular, not trending. Trending means “much more than usual, right now”. A small football club's name jumping from 50 mentions an hour to 20,000 in ten minutes after a last-minute goal is a trend.<br><br>So you need two numbers per term. First, a recent count over a <b>sliding window</b>: for example, mentions in the last 5 minutes, updated as time moves forward and old minutes drop off. Second, a <b>baseline</b>: the term's normal rate, updated slowly, such as an average over the last few days. Then score = recent ÷ baseline. “Good morning”: 30,000 now ÷ 30,000 normal = 1, boring. The club: 20,000 ÷ 50 = 400, trending.<br><br>There are millions of distinct terms, and keeping exact counters for all of them in memory gets expensive. So systems often use a <b>count-min sketch</b>: a small table of counters indexed by several hash functions that gives a close upper estimate of any term's count using a fixed amount of memory. Combined with a heap of the current top candidates, you can track the leaders cheaply.<br><br>Real trends also need judgement. You merge variants (#WorldCup and “world cup”), require many different accounts rather than one spam bot posting 10,000 times, and often compute trends per country or city. Twitter's trends, Google Trends and fraud-spike alerts all rest on this “recent versus normal” idea.",
    when: "Trending topics, anomaly and spike detection, finding hot keys in a cache or database, and fraud alerts.",
    pitfalls: "Ranking by raw counts shows the always-popular words, not real trends. Letting a handful of bots or one account drive a term to the top. A baseline that adapts too quickly treats an ongoing spike as normal and hides it; too slowly and yesterday's event keeps trending."
  }
});
