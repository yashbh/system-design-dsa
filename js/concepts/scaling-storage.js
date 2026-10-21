/* Blueprint building blocks — Scaling, Storage, Performance. Each concept: name, icon, cat, one (one-liner), analogy, body, optional fig/sim, when, pitfalls, used (case ids). */
Object.assign(BP.CONCEPTS, {
  "caching": {
    name: "Caching (cache-aside)",
    icon: "⚡",
    cat: "Performance",
    one: "Keep a copy of popular data in fast memory so most requests never have to ask the slow database.",
    analogy: "You keep salt, pepper and chilli on the kitchen counter instead of walking to the pantry every time you cook. The pantry still has everything; the counter just has what you reach for most.",
    body: "Picture a product page that needs a database query taking 50 ms. That is fine for one visitor. Now 5,000 people a second open the same page during a sale, and the database is answering the exact same question 5,000 times a second. It gets tired, queries slow to 2 seconds, and the whole site feels broken. A <b>cache</b> is a small, fast store (usually in RAM, like Redis or Memcached) that remembers answers so you don't have to recompute them.<br><br>The most common pattern is <b>cache-aside</b>, also called lazy loading. Your app asks the cache first. If the answer is there (a <b>hit</b>), you return it in about a millisecond. If not (a <b>miss</b>), you query the database, store the result in the cache with an expiry time, and return it. The next 4,999 visitors get the cached copy. Say 95% of reads hit the cache: the database now sees 250 queries a second instead of 5,000.<br><br>Why does a small cache help so much? Traffic is lopsided. A few items (today's top deal, a viral post) get most of the requests, so caching the top 1% of items can absorb most of the load. When the cache fills up, an <b>eviction policy</b> such as LRU throws out what nobody has touched lately, and a <b>TTL</b> (time to live) makes entries expire so they don't go stale forever.<br><br>Other flavours exist: <b>read-through</b> (the cache itself fetches from the database on a miss) and the write policies (write-through, write-back, write-around) that decide what happens on updates. Almost every big site leans on caching: Facebook famously runs huge Memcached fleets, and Twitter caches timelines in Redis.",
    code: "v = cache.get(k)\nif (!v) { v = db.get(k); cache.set(k, v, ttl) }\nreturn v",
    used: ["bitly","instagram","ticketmaster","twitter"],
    fig: "cachepath",
    when: "Use it when reads far outnumber writes, the same data gets asked for again and again, or an answer is expensive to compute. If every request is unique, a cache just adds a hop.",
    pitfalls: "Stale data: users see an old price because nobody invalidated the cached copy after an update. Cache stampede: a hot key expires and thousands of requests hit the database at the same instant; add request coalescing or jittered TTLs. Treating the cache as the source of truth: caches lose data on restart, so the real copy must live in the database. Caching per-user data under a shared key, which leaks one user's data to another."
  },

  "load-balancing": {
    name: "Load balancing",
    icon: "⚖️",
    cat: "Scaling",
    one: "A load balancer sits in front of many identical servers and hands each incoming request to one of them, so no single server drowns.",
    analogy: "The host at a busy restaurant. Guests don't pick a waiter; the host looks at who has the fewest tables and seats you there. If a waiter goes home sick, the host simply stops sending people their way.",
    body: "One server can handle, say, 2,000 requests a second. Your app now gets 10,000. You buy five servers, but users only know one address. Who decides which server gets which request? That's the <b>load balancer</b> (LB): a traffic cop with one public address that forwards each request to a healthy server behind it.<br><br>It works in a loop. A request arrives, the LB picks a server using an algorithm, forwards the request, and passes the response back. <b>Round-robin</b> goes 1, 2, 3, 4, 5, 1, 2… and is great when requests cost about the same. <b>Least-connections</b> picks the server with the fewest open requests, which helps when some requests are slow. <b>Hashing</b> (often consistent hashing) sends the same key, like a user ID, to the same server every time, useful when servers keep a local cache. Meanwhile the LB runs <b>health checks</b>, pinging each server every few seconds; if server 3 stops answering, it gets pulled out of rotation within seconds and users never notice.<br><br>There are two main layers. A <b>Layer 4</b> LB looks only at IP addresses and ports and shuffles raw connections, so it is extremely fast. A <b>Layer 7</b> LB reads the actual HTTP request and can route by path or header (/api to one pool, /images to another). Real examples: AWS Elastic Load Balancing, NGINX, HAProxy, Envoy, and Google's Maglev.<br><br>Load balancing works best when your app servers are <b>stateless</b>, meaning they don't keep any user's data in memory between requests. Then any server can serve any request, and adding capacity is as simple as adding a box.",
    used: ["bitly","whatsapp","stripe"],
    fig: "lb",
    when: "As soon as you have more than one server, which is from day one if you want to deploy without downtime: drain one server, update it, put it back, repeat.",
    pitfalls: "A single load balancer is itself a single point of failure; run at least two with a floating IP or use a managed LB. Sticky sessions (pinning a user to one server) make load uneven and break when that server dies. Shallow health checks that only test “is the process alive?” keep sending traffic to a server whose database connection is broken. Forgetting connection draining, so deploys cut off in-flight requests."
  },

  "kv-store": {
    name: "Key-value / NoSQL stores",
    icon: "🗄️",
    cat: "Storage",
    one: "A database that does one thing really well: you give it a key, it gives you back the value, fast, even across hundreds of machines.",
    analogy: "A coat check. You hand over ticket #482 and get your coat back in seconds. Nobody searches the room or asks you to describe the coat; the ticket is all that matters.",
    body: "A classic SQL database is like a Swiss Army knife. It can join tables, filter on any column and run fancy reports. That flexibility has a price: it's hard to spread one SQL database across many machines, because a join might need rows that live on different servers. When you have billions of records and simple questions like “give me the user with ID 42” or “give me the long URL for code abc123”, you don't need the knife. You need a coat check.<br><br>A <b>key-value store</b> keeps data as pairs: a unique key and a value (a string, a JSON blob, a list). The store hashes the key to decide which machine owns it. So <code>get(\"abc123\")</code> goes straight to one node, which looks it up in memory or a small on-disk index and answers in a millisecond or two. Want ten times the capacity? Add machines and let the store move some keys over. That's called horizontal scaling, and these databases are built for it.<br><br>The trade-off is that you lose ad-hoc queries. “Find every URL created last Tuesday” has no fast path unless you planned for it. So you design backwards: list the questions your app will ask, then choose keys that answer each one in a single lookup. Some stores add a little structure, such as DynamoDB's sort keys or Cassandra's clustering columns, so you can ask for a range like “the latest 50 messages in this channel”.<br><br>Well-known examples: Amazon DynamoDB (which grew out of Amazon's Dynamo paper), Apache Cassandra, ScyllaDB and Redis. Discord stores trillions of messages in ScyllaDB after moving off Cassandra.",
    used: ["bitly","discord"],
    when: "Huge data, very high request rates, and access that is mostly “look up by ID” or “range within one key”. Sessions, carts, short URLs, chat messages and user profiles fit well.",
    pitfalls: "Modelling tables the SQL way and then discovering you need queries the keys can't answer. Choosing a key that concentrates traffic, like a date, so one partition does all the work. Expecting multi-key transactions and joins that the store doesn't provide or makes expensive."
  },

  "fanout": {
    name: "Fan-out on write vs read",
    icon: "📣",
    cat: "Scaling",
    one: "When someone posts, you either copy the post into every follower's feed right away (push), or wait and build each feed when it's opened (pull).",
    analogy: "Push is a paperboy who drops a newspaper at every doorstep each morning. Pull is everyone walking to the newsstand when they feel like reading. One costs effort up front, the other costs effort every time someone wants the news.",
    body: "Your home feed on Twitter or Instagram is a merge of recent posts from everyone you follow. Say you follow 300 accounts. Building that feed from scratch every time you open the app means fetching from 300 sources, sorting and trimming to the top 50. Multiply by millions of people opening the app at lunch and the database is in trouble. This step of spreading one post out to many places is called <b>fan-out</b>, and the big question is <i>when</i> you do it.<br><br><b>Fan-out on write (push):</b> when Priya posts, look up her 200 followers and append the post ID to each of their precomputed feed lists, often stored in Redis. Reading a feed is now one cheap lookup. The cost lands on writes: 200 writes for Priya is nothing, but a celebrity with 50 million followers turns one post into 50 million writes, which can take minutes to finish.<br><br><b>Fan-out on read (pull):</b> store each post once. When you open the app, the server gathers recent posts from everyone you follow and merges them. Posting is instant and cheap, but every feed open is heavier, and popular readers pay that cost over and over.<br><br>Big systems go <b>hybrid</b>. Normal users get push, so feeds are ready to read. Accounts with huge follower counts are skipped during fan-out; their recent posts are pulled in and merged at read time. Twitter has described exactly this mix for its home timeline. Instagram and Facebook use similar ideas, with ranking added on top.",
    used: ["instagram","whatsapp","twitter"],
    sim: "fanout",
    when: "Any “many followers see one person's post” system: social feeds, notifications, group chats. Pick push when reads dominate and follower counts are modest; add pull for the heavy hitters.",
    pitfalls: "Pure push lets one celebrity post flood your queues for minutes. Pure pull makes every feed open slow under load. Pushing to inactive users who haven't opened the app in a year wastes storage; many systems only precompute feeds for active users."
  },

  "hot-key": {
    name: "Hot keys & hot partitions",
    icon: "🔥",
    cat: "Scaling",
    one: "A hot key is one piece of data (a celebrity, a viral post, a big concert) that gets so much traffic that the single machine holding it melts while the rest sit idle.",
    analogy: "A supermarket with ten checkout lanes, but a celebrity is signing autographs at lane 4. Nine cashiers are bored, and lane 4 has a line out the door. Adding more lanes doesn't help anyone in that line.",
    body: "Sharding spreads data across machines by hashing keys, and on average it works beautifully: a million keys land evenly on ten servers. But averages hide spikes. Hashing can spread <i>different</i> keys apart; it can never split <i>one</i> key. If Taylor Swift tickets go on sale and every request hits the key <code>event:eras-tour</code>, they all land on the one shard that owns it. That shard is called a <b>hot partition</b>.<br><br>Some numbers to feel it: say each shard handles 10,000 requests a second and you have 20 shards, so 200,000 total. A single viral key pulling 80,000 requests a second overloads its shard eight times over, while the cluster as a whole is only 40% busy. Adding shards does nothing, because that key still lives in one place.<br><br>The fixes all boil down to “stop sending everything to one place”. <b>Cache it</b> in front of the database, maybe even inside each app server. <b>Replicate reads</b> so several copies can answer. <b>Split the key</b>: write to <code>likes:post42#1</code> through <code>#10</code> and add them up on read, so writes spread over ten shards. <b>Coalesce</b> identical requests so 1,000 concurrent reads become one. Or <b>treat it specially</b>, like pulling celebrity posts instead of pushing them.<br><br>Real cases are everywhere: Discord's busiest channels, a tweet going viral, Ticketmaster's biggest on-sales. Amazon DynamoDB added “adaptive capacity” to shift throughput toward hot partitions automatically.",
    used: ["instagram","discord","ticketmaster","twitter"],
    when: "Think about it whenever popularity is wildly uneven, which in consumer apps is almost always: celebrities, trending items, flash sales and big live events.",
    pitfalls: "Testing with evenly random keys, so the problem only appears on launch day. Splitting a key for writes but forgetting reads now have to merge N pieces. Choosing a time-based partition key like today's date, which makes the current partition permanently hot."
  },

  "sharding": {
    name: "Sharding / partitioning",
    icon: "🧩",
    cat: "Storage",
    one: "When your data is too big or too busy for one database, cut it into pieces (shards) and put each piece on its own machine.",
    analogy: "A library that's run out of shelf space opens a second and third building: authors A–F in one, G–M in the next, N–Z in the last. A sign at the entrance tells you which building to walk to.",
    body: "Every database eventually hits a wall. Maybe the disk fills up (the delicious bookmarking site ran out of disk in about six months), or one machine simply can't take more writes per second. You could buy a bigger box, but that only goes so far. <b>Sharding</b> splits the data horizontally: each shard holds a subset of the rows, and together they hold everything.<br><br>The key decision is the <b>partition key</b>, the field that decides where a row lives. Say you store rides and choose <code>city</code> as the key. Every ride in Mumbai goes to shard 3, so the question “show active rides in Mumbai” touches one machine. Discord partitions messages by (channel, time bucket) so reading a channel's recent history hits one partition. The rule: pick the key from your most common query, so most requests touch exactly one shard.<br><br>There are a few ways to map keys to shards. <b>Range</b> sharding (A–F, G–M) keeps neighbours together, which is good for range scans, but hot spots appear if everyone's name starts with S. <b>Hash</b> sharding runs the key through a hash function, which spreads load evenly but makes range scans hard. <b>Directory</b> sharding keeps a lookup table of key to shard, which is flexible but the table must be highly available. Consistent hashing is a hash variant that keeps reshuffling small when you add machines.<br><br>The cost is real. Queries that don't include the partition key must ask every shard (scatter-gather). Joins and transactions across shards become hard. And moving data when you add shards (resharding) is one of the scariest operations in production. Instagram, YouTube (through Vitess) and Uber all shard heavily.",
    used: ["discord","uber","ticketmaster","youtube"],
    fig: "shardkey",
    when: "When data size or write volume outgrows one machine and read replicas or caching aren't enough. Not before: one well-tuned database goes a long way.",
    pitfalls: "A bad key creates hot shards (all of today's writes in one place) or forces every query to fan out to all shards. Cross-shard joins and transactions get slow and complicated, so design to avoid them. Starting with too few shards and having to reshard live; many teams pre-split into many logical shards mapped onto fewer machines."
  },

  "consistent-hashing": {
    name: "Consistent hashing",
    icon: "💍",
    cat: "Scaling",
    one: "A way to assign keys to servers so that adding or removing a server only moves a small slice of the keys instead of nearly all of them.",
    analogy: "Guests seated around a big round table, each sitting in front of the plates to their right. When a new guest pulls up a chair, they only take a few plates from the person next to them. Nobody else at the table has to move.",
    body: "The obvious way to spread keys over N cache servers is <code>server = hash(key) % N</code>. With 4 servers, key 10 goes to server 2. It works until you add a fifth server: now 10 % 5 = 0, and almost every key maps somewhere new. In fact going from 4 to 5 moves about 80% of keys. For a cache, that means a sudden flood of misses that can knock over the database behind it.<br><br>Consistent hashing fixes this with a ring. Imagine the hash outputs (say 0 to 2<sup>32</sup>) bent into a circle. Each server is hashed onto a point on the ring. Each key is hashed onto the ring too, then walks clockwise until it hits a server: that server owns it. Add a new server and it lands at one spot, taking over only the keys between it and its counter-clockwise neighbour. With N servers, roughly 1/N of keys move. Going from 4 to 5 servers moves about 20% instead of 80%.<br><br>One wrinkle: with just a few points, the gaps between servers are uneven, so one server might own 40% of the ring. The fix is <b>virtual nodes</b>: each physical server gets, say, 100 to 200 points scattered around the ring. Load evens out, and when a server dies its keys spread across many neighbours instead of dumping onto one.<br><br>This idea powers Amazon's Dynamo and Cassandra, many Memcached client libraries, and load balancers that need stickiness, like Discord routing a guild to the same process. A cousin, <b>rendezvous hashing</b>, gets the same effect by scoring every server per key and picking the highest.",
    used: ["discord","gdocs"],
    sim: "ring",
    when: "Whenever keys are spread across a set of nodes that changes over time: cache clusters, sharded databases, and routing a user or document to the same server.",
    pitfalls: "Skipping virtual nodes, which leaves load lumpy and makes a failed node dump all its keys onto one neighbour. Using a poor hash function that clusters points. Forgetting that the moved 1/N of keys still need warming or data copying; it's smaller, not free."
  },

  "request-coalescing": {
    name: "Request coalescing",
    icon: "🧲",
    cat: "Performance",
    one: "When many identical requests arrive at the same moment, send just one to the database and share its answer with everyone who asked.",
    analogy: "Ten people ask a librarian for the same book at the same moment. She doesn't make ten trips to the stacks. She fetches it once and reads the page aloud to all ten.",
    body: "Imagine a huge Discord server where someone posts an announcement and pings everyone. Within one second, 10,000 people open the channel. Each client asks for the latest messages, and every one of those requests is identical. Without help, the database receives 10,000 copies of the same query at once, which is exactly the kind of spike that causes slowdowns. A normal cache doesn't fully save you either: if the entry just expired, all 10,000 miss together. That's called a <b>thundering herd</b> or cache stampede.<br><br><b>Request coalescing</b> (sometimes called single-flight) fixes this in a small layer in front of the database. When a request comes in, the layer checks: is an identical query already in flight? If not, it sends the query and records a placeholder. If yes, the new request simply waits on that same placeholder. When the database answers, every waiter gets the result. So 10,000 requests become 1 database query plus 9,999 short waits.<br><br>In code this is often a map from query key to an in-progress future or promise. Go has a well-known <code>singleflight</code> package for exactly this. CDNs do a version called collapsed forwarding: if many users miss on the same video segment, the edge fetches it from the origin once.<br><br>Discord has written publicly about building data services in Rust that sit between its API and its database. One of their key jobs is coalescing: if several users ask for the same messages at once, only one query goes to the database. Combined with routing all requests for one channel to the same instance, it smoothed out their hottest channels.",
    used: ["discord"],
    when: "When the same data is requested in bursts by many users at once: hot channels, viral posts, popular product pages, and cache refills after an expiry.",
    pitfalls: "Coalescing only within one server, while requests for the same key are spread across 50 servers; route by key so they meet in one place. Letting one slow or failed query make every waiter fail too, so add timeouts. Coalescing requests that only look identical but depend on per-user permissions."
  },

  "waiting-room": {
    name: "Virtual waiting room / admission control",
    icon: "🚦",
    cat: "Scaling",
    one: "When far more people show up than your system can serve, let them in at a safe, steady rate and keep everyone else in a fair queue.",
    analogy: "A nightclub bouncer. The line outside can stretch around the block, but he only lets people in as others leave, so the dance floor is busy but never dangerous.",
    body: "A big concert goes on sale at 10:00. Your checkout system can safely process maybe 2,000 purchases a minute. At 10:00:00, 2 million fans hit the button. If you let them all through, databases lock up, payments time out and everyone gets an error, including the people who would have succeeded. Too much demand can turn a working system into one that serves nobody.<br><br>A <b>virtual waiting room</b> is admission control at the front door. Instead of passing every request to the backend, the edge (often a CDN or a thin, cheap queue service) gives each visitor a token with a queue position and shows a friendly “you're number 48,213” page. A controller watches backend health and lets people through at the rate it can handle, say 2,000 a minute, by marking their tokens as admitted. Admitted users get the real site; everyone else keeps waiting, with no load on the expensive parts.<br><br>Fairness is a design choice. Pure first-come-first-served rewards bots and people hammering refresh. A common trick is to put everyone who arrived before the sale opened into the queue in <b>random order</b>, then serve later arrivals first-come-first-served. Now there's no benefit to opening 30 tabs at 9:59:59.<br><br>Ticketmaster's Smart Queue works along these lines, and services like Queue-it and Cloudflare Waiting Room sell this as a product. The general idea is called <b>backpressure</b>: when downstream is full, push back at the edge instead of letting work pile up inside.",
    used: ["ticketmaster"],
    sim: "onsale",
    when: "Predictable, extreme spikes far above normal capacity: ticket on-sales, limited sneaker drops, exam result days, government sign-up deadlines.",
    pitfalls: "Hosting the waiting room on the same servers it's meant to protect, so it falls over too. Letting admitted tokens be shared or reused, which lets bots skip the line. Admitting at a fixed rate instead of watching real backend health. Hiding the user's position, which makes people refresh and add even more load."
  },

  "object-storage": {
    name: "Object storage",
    icon: "🪣",
    cat: "Storage",
    one: "A cheap, nearly unbreakable place to keep big files like photos and videos, where each file is fetched by a name instead of a folder path on one disk.",
    analogy: "A self-storage warehouse. You get unit number B-1042 and a key. You never care which aisle or floor it's on; you just ask for B-1042 and it's brought to you.",
    body: "Say users upload 100 million photos at about 2 MB each. That's 200 TB. Stuffing those into a database is a bad idea: databases are tuned for small rows and fast queries, and huge blobs make backups slow and memory precious. Storing them on your app servers' local disks is worse: when a server dies, the photos die with it, and other servers can't see them.<br><br><b>Object storage</b> (Amazon S3, Google Cloud Storage, Azure Blob) solves this. You <code>PUT</code> a file under a key like <code>photos/user42/beach.jpg</code> and later <code>GET</code> it back by the same key. There are no real folders and no editing a file in place; you write whole objects. Behind the scenes the provider splits and copies each object across many disks and data centres. S3 is designed for 99.999999999% (eleven nines) durability, meaning losing a file is astronomically unlikely.<br><br>The usual pattern splits the work. The object store holds the heavy bytes. Your database holds a small metadata row: owner, caption, upload time and the object key. Users often upload straight to the store using a short-lived <b>pre-signed URL</b>, so the bytes never touch your app servers. For downloads, you put a <b>CDN</b> in front so popular images are served from a nearby edge instead of the bucket.<br><br>Storage classes let you trade speed for price: hot tiers for recent uploads, cheaper infrequent-access tiers, and archive tiers like S3 Glacier for old backups. Netflix keeps its master video files in S3, and countless apps store user media this way.",
    used: ["instagram","netflix","youtube"],
    fig: "hdfs",
    when: "Any large, write-once, read-many file: images, video, audio, backups, logs, ML datasets and static website assets.",
    pitfalls: "Storing blobs inside the database and watching it bloat. Serving files straight from the bucket to the whole world instead of through a CDN, which is slower and costs more in transfer fees. Leaving buckets publicly readable by accident, a classic cause of data leaks. Treating it like a file system with frequent small edits or renames."
  },

  "vertical-horizontal": {
    used: [],
    name: "Vertical vs horizontal scaling",
    icon: "📈",
    cat: "Scaling",
    fig: "scaling",
    one: "To handle more traffic you can either buy a bigger machine (scale up) or add more machines and share the work (scale out).",
    analogy: "Your delivery business is growing. Vertical: trade your van for a giant truck. Horizontal: buy ten vans and hire a dispatcher to decide who drives where.",
    body: "Your app runs on one server with 4 CPU cores and 16 GB of RAM. Traffic doubles, then doubles again, and response times climb. You have two ways out.<br><br><b>Vertical scaling</b> (scaling up) means moving to a beefier machine: 64 cores, 512 GB of RAM, faster disks. The beauty is that you change zero lines of code. But there's a ceiling, since even the largest cloud machines have limits, and cost grows faster than power: a machine twice as strong often costs more than twice as much. Worse, it's still one machine. If it crashes or you need to restart it for an upgrade, your whole site is down.<br><br><b>Horizontal scaling</b> (scaling out) means running many ordinary machines side by side, with a <b>load balancer</b> handing out requests. Need more capacity? Add servers. Ten servers handle roughly ten times the load, and if one dies the other nine keep going. The catch is that your app has to be ready for it. Servers must be <b>stateless</b> (no user sessions stuck in one machine's memory), and eventually the database itself needs to be split up through replication or sharding.<br><br>In practice, nearly everyone does both, in that order. Scale up while it's cheap and easy, because a single good database server handles a surprising amount. Scale out once you need high availability or you've outgrown the biggest box. Stack Overflow famously ran on a small number of powerful servers for years, while Google, Netflix and Amazon run on huge fleets of commodity machines.",
    when: "Scale up first for simplicity, especially for databases. Scale out once you need to survive machine failures, deploy without downtime, or outgrow the largest machine you can buy.",
    pitfalls: "Scaling out stateful servers that keep sessions in memory, so users get logged out whenever round-robin sends them to a different box. Assuming the database will scale out as easily as the app tier; it usually won't. Scaling up forever and discovering the ceiling during your biggest traffic day."
  },

  "stateless": {
    used: [],
    name: "Stateless app servers",
    icon: "🧼",
    cat: "Scaling",
    fig: "scaling",
    one: "App servers that don't remember anything about a user between requests, so any server can handle any request and you can add or remove servers freely.",
    analogy: "Bank tellers who look up your account on the central system. You don't need “your” teller; any free window can help, and if one teller goes on break, nothing about your account is lost.",
    body: "Imagine your shopping site stores each user's cart in the memory of whichever server they first hit. Alice adds shoes on server 2. Her next click goes to server 5, which has never heard of her cart: empty. Or server 2 restarts for a deploy, and every cart on it vanishes. That memory is <b>state</b>, and keeping it on app servers is what makes scaling painful.<br><br>A <b>stateless</b> server keeps nothing user-specific between requests. Everything needed either comes in with the request (a session token or a signed cookie) or is fetched from a shared store. Carts and sessions go to Redis or the database. Uploaded files go to object storage, not the local disk. Now the flow is simple: request arrives at any server, the server reads what it needs from shared storage, does the work, writes any changes back and forgets.<br><br>The payoff is big. A load balancer can use plain round-robin. Autoscaling can add 20 servers at 6 p.m. and remove them at midnight. Deploys roll through servers one at a time without logging anyone out. A crashed server is a non-event. People describe this as treating servers like <b>cattle, not pets</b>: no single one is special.<br><br>This is also why architects separate code machines from data machines. The app tier becomes a pool of identical, disposable workers, while the data tier (databases, caches, storage) is managed carefully and scaled on its own schedule. The Twelve-Factor App guidelines, popular for cloud apps, recommend exactly this.",
    when: "Always, for the web and API tier. Keep state in purpose-built stores so the servers that run your code stay identical and disposable.",
    pitfalls: "Hidden state: saving uploads to local disk, or relying on an in-memory cache for correctness rather than just speed. Sticky sessions used as a band-aid, which hides the problem until a server dies. Moving sessions into a single Redis node with no replica, which just relocates the single point of failure."
  },

  "memory-hierarchy": {
    used: [],
    name: "Memory hierarchy & latency numbers",
    icon: "🧠",
    cat: "Performance",
    fig: "memory",
    one: "Every place a computer can keep data is a trade-off: the faster it is, the smaller and pricier it is, and each step down is roughly 10 to 1,000 times slower.",
    analogy: "The paper in your hand (CPU cache), the bookshelf in your room (RAM), the library across town (disk) and a library in another country you have to fly to (a cross-continent network trip).",
    body: "Why do engineers obsess over caches? Because of how wildly different storage speeds are. A computer has a ladder of places to keep data. At the top is CPU cache: tiny, a few megabytes, but blazing fast. Then RAM, then SSD, then spinning disk, then other machines over the network. Each rung is bigger and cheaper per gigabyte, and much slower.<br><br>Some rough numbers worth memorising: reading CPU L1 cache takes about 1 nanosecond. RAM takes about 100 ns. A random read from an SSD is about 100 microseconds (100,000 ns). A round trip inside one data centre is about 0.5 milliseconds. A spinning-disk seek is about 10 ms. A packet from California to the Netherlands and back takes about 150 ms. The course notes add practical anchors: reading a local file around 40 ms, a typical MySQL query around 50 ms, and pulling a big file from remote storage around 2 seconds.<br><br>To feel the gaps, scale them to human time. If an L1 read took 1 second, a RAM read would take about 2 minutes, an SSD read over a day, and a cross-continent trip nearly 5 years.<br><br>That's the whole case for caching, CDNs and data locality. Every one of those ideas is about moving hot data up the ladder or physically closer to the user. Jeff Dean's “Latency numbers every programmer should know” list made these figures famous, and they're the backbone of back-of-the-envelope estimates in system design interviews.",
    when: "Back-of-the-envelope estimates, deciding whether something needs a cache, choosing between memory and disk storage, and explaining why a CDN or a nearby region matters.",
    pitfalls: "Treating a network call like a function call and making 200 of them in a loop for one page. Memorising exact figures instead of orders of magnitude; hardware changes, ratios mostly don't. Forgetting that the network often dominates, so a faster database won't save a page that makes ten cross-region calls."
  },

  "ttl": {
    used: [],
    name: "TTL (time to live)",
    icon: "⏳",
    cat: "Performance",
    fig: "cachepath",
    one: "A timer stuck on every cached item: when it runs out, the item is thrown away and fetched fresh the next time someone asks.",
    analogy: "The “best before” date on milk. Until that date you use it without thinking. After it, you toss it and buy a new carton, even if it might have been fine.",
    body: "Caching creates a nagging question: how do you know when the cached copy is out of date? The perfect answer is to update or delete the cache every time the data changes, but tracking every change across a big system is hard. <b>TTL</b>, short for time to live, is the simple answer: don't track changes, just let every entry expire after a set time.<br><br>Here's how it works. At 10:00:00 you cache a product page with a TTL of 60 seconds. Every request until 10:01:00 gets the cached copy. At 10:01:00 the entry expires. The next request misses, fetches fresh data from the database, and caches it again for another 60 seconds. If the price changed at 10:00:20, some users saw the old price for up to 40 seconds. That's the deal you make.<br><br>Choosing the number is a balancing act. A <b>short TTL</b> (5 seconds) keeps data fresh but causes more misses and more database load. A <b>long TTL</b> (1 day) is gentle on the database but can show stale data for hours. Match it to how much staleness the data can tolerate: a stock price wants seconds, a country list can live for days.<br><br>TTLs show up everywhere. Every DNS record has one, which is why changing a domain's IP can take a while to spread. CDNs use HTTP headers like <code>Cache-Control: max-age=3600</code>. Redis lets you set one per key with <code>EXPIRE</code>. When you need exact freshness instead, <b>version your keys</b> (for example <code>problem_200_t2_input.txt</code>): a new version gets a new key, so stale copies are simply never requested again.",
    when: "Data that can be a little out of date without harm: DNS records, product listings, leaderboards, profile pictures and CDN content.",
    pitfalls: "Setting the same TTL on thousands of keys cached at the same moment, so they all expire together and stampede the database; add random jitter. Using a long TTL on data that must be correct, like account balances. Forgetting that browsers and CDNs also cache, so lowering a TTL doesn't instantly flush copies already out there."
  },

  "write-policies": {
    used: [],
    name: "Write-through / write-back / write-around",
    icon: "✍️",
    cat: "Performance",
    fig: "writepolicy",
    one: "Three strategies for what happens to the cache when you change data: update both at once, update the cache now and the database later, or skip the cache entirely.",
    analogy: "Write-through: you update your notebook and the official ledger at the same moment. Write-back: you jot it on a sticky note and copy it into the ledger tonight. Write-around: you update the ledger and tear the old page out of the notebook.",
    body: "Reading from a cache is easy to reason about. Writing is where it gets interesting. When a user updates their profile, you have two copies to think about, the cache and the database, and they must not drift apart in ways that hurt you. There are three classic strategies.<br><br><b>Write-through:</b> every write goes to the cache and the database together, and you only say “done” when both succeed. The cache is always fresh and the data is safe on disk. The cost is slower writes, since you wait for the database every time (say, 10 ms instead of 1 ms), and you may fill the cache with data nobody reads.<br><br><b>Write-back</b> (also called write-behind): write only to the cache, reply immediately, and flush to the database later, maybe every second in batches. Writes are blazing fast, and 1,000 updates to a like counter can collapse into one database write. The danger: if the cache node crashes before flushing, those writes are gone. CPUs use write-back for their own caches, and it's great for counters and analytics where losing a little is acceptable.<br><br><b>Write-around:</b> write straight to the database and delete (invalidate) the cache entry. The cache only fills when someone actually reads the data. This avoids polluting the cache with write-once data like logs, but the first read after a write is always a miss.<br><br>Most web apps use a fourth, practical mix: cache-aside reads plus “update the database, then delete the cache key”. Facebook's Memcached paper describes this delete-on-write approach.",
    when: "Write-through when users must see their own update immediately. Write-back for high-volume counters and analytics. Write-around for data that's written often but rarely re-read.",
    pitfalls: "Using write-back for data you can't lose without replication or a log behind the cache. Updating the cache before the database, so a failed database write leaves the cache lying. Race conditions where an old read refills the cache right after an invalidation; short TTLs or versioned values limit the damage."
  },

  "eviction": {
    used: [],
    name: "Eviction policies (LRU, LFU, FIFO…)",
    icon: "🧹",
    cat: "Performance",
    fig: "eviction",
    one: "Caches have limited space, so when they're full they need a rule for which item to throw out to make room.",
    analogy: "Clearing out a packed fridge. You might toss whatever's been sitting untouched the longest (LRU) or whatever you hardly ever eat (LFU). Tossing the oldest-bought item (FIFO) might mean binning the butter you use every day.",
    body: "Memory is fast but limited. Your cache might hold 10 GB while your database holds 2 TB, so only a sliver fits. When a new item arrives and the cache is full, something has to go. The <b>eviction policy</b> decides what, and a good one keeps your hit rate high by guessing which items you'll need again.<br><br>The common rules: <b>FIFO</b> (first in, first out) evicts the oldest inserted item, regardless of use. It's simple but it can throw out a hot key just because it's been around a while. <b>LRU</b> (least recently used) evicts whatever hasn't been touched for the longest time, betting that recent use predicts future use. It's the popular default, and it can be built in O(1) time with a hash map plus a doubly linked list: every access moves an item to the front, and you evict from the back. <b>LFU</b> (least frequently used) evicts the item with the fewest hits, which protects steady favourites. <b>MRU</b> (most recently used) sounds odd but suits repeated sequential scans, where the item you just read is the one you won't need soon.<br><br>A tiny example: a cache of size 3 holds A, B, C. You read A, then insert D. LRU evicts B (least recently touched). FIFO evicts A (inserted first), even though you just used it.<br><br>Real systems approximate. Redis doesn't keep a perfect LRU list. It samples a handful of keys and evicts the best candidate among them, which is cheap and close enough. Its policies include <code>allkeys-lru</code> and <code>allkeys-lfu</code>, and the default is <code>noeviction</code>, which means writes start failing when memory is full.",
    when: "Pick the policy that best predicts your access pattern. allkeys-lru is a solid default for a general cache; LFU helps when a stable set of items stays popular for a long time.",
    pitfalls: "Using FIFO and evicting your hottest keys. Plain LFU without decay, so items that were popular last month never leave. Leaving Redis on noeviction with no maxmemory set and having writes fail or the box run out of memory. A single big scan flushing the whole LRU cache of useful items."
  },

  "redis": {
    used: [],
    name: "Redis",
    icon: "🟥",
    cat: "Storage",
    fig: "leaderboard",
    one: "A super-fast database that keeps everything in memory and offers handy data structures, so it's the go-to tool for caches, counters, leaderboards, locks and queues.",
    analogy: "A giant whiteboard in the middle of the office that everyone can read and write instantly. It's not the filing cabinet where official records live, but it's where the live scores, the to-do list and the “who's in the meeting room” sign go.",
    body: "Redis started as a cache, but it's much more than “a big hash map in RAM”. Because data lives in memory, most operations finish in well under a millisecond, and a single Redis instance can handle on the order of 100,000 or more simple operations a second.<br><br>Two things make it special. First, <b>data types</b>. Besides plain strings, you get hashes (like a mini row: <code>user:42 → {name, city}</code>), lists (queues), sets (unique members), sorted sets (members ranked by a score) and bitmaps. Sorted sets make a game leaderboard almost trivial: <code>ZINCRBY scores 50 alice</code> adds 50 points to Alice, and <code>ZREVRANGE scores 0 9</code> returns the top 10, already sorted. Second, commands run one at a time on a <b>single thread</b>, so each command is atomic. Two users hitting <code>INCR page_views</code> at the same instant can't clobber each other.<br><br>Those traits make Redis the Swiss Army knife of system design: caching database results, storing sessions, rate-limit counters (<code>INCR</code> plus <code>EXPIRE</code>), simple distributed locks (<code>SET key value NX PX 30000</code>, “set only if absent, expire in 30 s”), pub/sub messaging and lightweight queues. It can also persist to disk through snapshots (RDB) or an append-only log of commands (AOF).<br><br>To grow beyond one machine, <b>Redis Cluster</b> splits keys into 16,384 hash slots, picked by <code>CRC16(key) mod 16384</code>, and spreads the slots over several primary nodes, each with replicas. Nodes gossip over a cluster bus, and if a client asks the wrong node, it gets a <code>MOVED</code> reply pointing to the right one. Twitter, GitHub and Stack Overflow have all used Redis heavily.",
    when: "Hot data that needs sub-millisecond access: caches, sessions, rate-limit counters, distributed locks with expiry, real-time rankings and short-lived queues.",
    pitfalls: "Forgetting that RAM is expensive and finite; storing 2 TB of cold data in Redis gets costly fast. Leaving the default noeviction with no maxmemory, so the box runs out of memory. Running slow commands like KEYS * on a big dataset, which blocks the single thread for everyone. Treating it as the only copy of important data without understanding its persistence settings."
  },

  "nosql-types": {
    used: [],
    name: "NoSQL families",
    icon: "🗃️",
    cat: "Storage",
    fig: "datamodels",
    one: "“NoSQL” is a family of databases (key-value, document, wide-column and graph), each shaped around a different kind of question.",
    analogy: "Different storage containers for different stuff: a coat check for quick swaps (key-value), a filing cabinet of forms (documents), a ledger with one sorted page per customer (wide-column) and a corkboard with pins and string (graph).",
    body: "Relational databases store data in tables with fixed columns and let you join them any way you like. They're wonderful, and they're still the right default. But some workloads don't fit: data whose shape changes all the time, write rates in the millions per second, or questions that are all about connections between things. NoSQL databases give up some of SQL's flexibility to be great at one specific shape of work.<br><br><b>Key-value</b> stores (Redis, DynamoDB) are the simplest: put and get by a key. Lightning fast and easy to spread across machines, but you can only look things up by key. <b>Document</b> stores (MongoDB, Couchbase) keep JSON-like documents. A product with 3 attributes and another with 30 can live side by side, and you can still query and index any field.<br><br><b>Wide-column</b> stores (Cassandra, HBase, ScyllaDB) organise rows by a <i>partition key</i> and keep the columns within a partition sorted by a <i>clustering key</i>. Think “all messages for channel 123, sorted by time”. They're built for massive write rates and queries like “give me the latest 50”, which is why Discord and Netflix use them. <b>Graph</b> databases (Neo4j) treat relationships as first-class data, so “friends of friends who like jazz” is a quick walk across links instead of five painful joins.<br><br>The golden rule: choose from your dominant query, not from hype. Write down the five questions your app asks most often, then pick the model that answers them in one cheap step. Many companies use several: Postgres for orders, Redis for sessions and Cassandra for event history.",
    when: "When the data's shape varies a lot, the dataset must spread across many machines, or access is mostly simple key or range lookups. For general business data with lots of relationships, start with SQL.",
    pitfalls: "Picking a NoSQL database because it's trendy, then rebuilding joins by hand in application code. Assuming “schemaless” means no schema; the schema just moves into your code and gets messy. Ignoring each store's consistency defaults, like eventually consistent reads, and getting surprised by stale data."
  },

  "lsm": {
    used: [],
    name: "LSM tree",
    icon: "🌲",
    cat: "Storage",
    fig: "lsm",
    one: "A storage engine design that makes writes very fast by collecting them in memory, dumping them to disk as sorted files and tidying those files up later.",
    analogy: "A busy restaurant scribbles orders on a notepad as they come in, files them into a sorted binder every hour, and on quiet nights merges the old binders into one neat volume, throwing away cancelled orders.",
    body: "Traditional databases use B-trees, which update data in place on disk. Each write might mean jumping to a random spot on the disk and rewriting a page. At a few thousand writes a second that's fine; at a few hundred thousand, those random disk writes become the bottleneck. The <b>log-structured merge tree</b> (LSM tree) avoids that by never updating in place. It only appends and sorts.<br><br>Follow a single write. First it's appended to a <b>write-ahead log</b> (WAL) on disk, a plain append-only file kept so nothing is lost if the machine crashes. Then it goes into the <b>memtable</b>, a sorted structure in RAM. Both steps are fast. When the memtable fills up (say 64 MB), it's written to disk in one go as an <b>SSTable</b> (sorted string table): an immutable, sorted file split into small blocks (often 64 KB) with a sparse index saying where each block starts.<br><br>Reads work backwards. Check the memtable first, then SSTables from newest to oldest, because the newest value wins. Checking every file would be slow, so each SSTable has a <b>Bloom filter</b>, a tiny structure that can say “this key is definitely not in this file” and skip it. Deletes don't erase anything; they write a marker called a <b>tombstone</b>.<br><br>Over time SSTables pile up, so a background process called <b>compaction</b> merges them, keeping only the newest value for each key and dropping tombstones. This design, popularised by Google's Bigtable paper, powers Cassandra, HBase, RocksDB, LevelDB and ScyllaDB.",
    when: "Write-heavy workloads at scale: event logs, time series, messaging, metrics, and any system that ingests far more than it updates in place.",
    pitfalls: "Read amplification: a single read may check several files, which hurts if Bloom filters are missing or badly sized. Compaction eats disk I/O and CPU, and if it falls behind, reads get slower and disk usage grows. Heavy deletes leave many tombstones, which can make range scans crawl until they're compacted away."
  },

  "hdfs": {
    used: [],
    name: "Distributed file systems (HDFS / GFS)",
    icon: "🐘",
    cat: "Storage",
    fig: "hdfs",
    one: "A file system spread over hundreds of machines: big files are chopped into large blocks, each block is copied to several machines, and one master keeps the map of where everything is.",
    analogy: "A library that cuts a giant encyclopedia into volumes, shelves three copies of each volume in different buildings, and keeps one master catalogue at the front desk that tells you which building has which volume.",
    body: "Suppose you have a 10 TB log file you want to analyse. No single disk holds it comfortably, and reading it from one machine would take hours. In the early 2000s Google faced this at massive scale and built the Google File System (GFS). Hadoop's HDFS is the open-source system modelled on it.<br><br>The trick is to split files into <b>big blocks</b>, 128 MB by default in HDFS. Why so big? Fewer blocks means less bookkeeping, and large sequential reads are what disks do best. That 10 TB file becomes about 80,000 blocks spread across the cluster. Each block is stored on several <b>DataNodes</b> (usually 3 copies), and placement is <b>rack-aware</b>: one copy on a local rack, two on a different rack, so even a whole rack losing power doesn't lose data.<br><br>A single <b>NameNode</b> (GFS called it the master) keeps the metadata in RAM: which files exist, which blocks make up each file and which DataNodes hold each block. DataNodes send it heartbeats every few seconds. If one goes quiet, the NameNode notices that some blocks now have only two copies and tells other nodes to make new ones. To read a file, a client asks the NameNode for block locations, then streams data <b>directly from the DataNodes</b>. The file contents never pass through the NameNode, so it doesn't become a bandwidth bottleneck.<br><br>This design made big-data processing possible: MapReduce and Spark jobs run code on the machines that already hold the blocks, so data doesn't travel far. Today many teams use object storage like S3 for data lakes instead, but the ideas are the same.",
    when: "Batch analytics, data lakes and very large files that are written once and read in big sequential chunks.",
    pitfalls: "Storing millions of tiny files: each one costs NameNode memory, so the metadata server fills up long before the disks do. Running a single NameNode without a standby, which makes it a single point of failure. Expecting low-latency random reads or in-place edits; it's built for streaming throughput, not quick lookups."
  }
});
