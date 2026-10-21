/* Blueprint course — lesson: Load balancing, sharding & consistent hashing */
BP.LESSONS.push({
  id: "lb-ch",
  mod: "found",
  icon: "💍",
  minutes: 30,
  title: "Load balancing, sharding & consistent hashing",
  scaler: "HLD 2 · Load Balancing and Consistent Hashing",
  summary: "Routing algorithms, stateless servers, why data must be split, and the elegant ring that makes adding machines cheap.",
  concepts: ["load-balancing","stateless","sharding","consistent-hashing"],
  related: ["discord"],
  sections: [
    { h: "Routing algorithms", blocks: [
      ["p","Once you have a fleet, the LB needs a rule for choosing a server:"],
      ["table",["Algorithm","How it picks","Good for","Weakness"],[["Round robin","1, 2, 3, 1, 2, 3…","Identical servers, similar requests","Ignores load and request cost"],["Weighted round robin","Bigger machines get more turns","Mixed hardware","Static weights"],["Least connections","Fewest in-flight requests","Slow or uneven requests","Needs live connection counts"],["IP hash","hash(client IP) % N","Sticky sessions, local caches","Changing N remaps almost everyone"]]],
      ["fig","lb","Switch algorithms. With IP hash, crash a server and watch how many clients get remapped once it leaves rotation."],
      ["img","19-inch rackmount Ethernet switches and patch panels.jpg","Switches and patch panels in a rack. Every request crosses hardware like this on its way from the load balancer to a server."]
    ] },
    { h: "Stateless app servers", blocks: [
      ["p","If a server keeps your session (login, cart) in its own memory, the next request landing on a different server finds nothing, and you look logged out. Two fixes: <b>sticky sessions</b> (IP hash or a cookie) or, better, make servers <b>stateless</b> and keep session data in a shared store such as Redis or the database."],
      ["p","The notes push one step further. Running code and database on the same machine couples them: deploying code makes data unavailable, and both fight for CPU and RAM. Put them on separate tiers. The identical code-only machines (<b>app servers</b>) hold no data, so you can add or remove them freely. The only cost is one network hop to the data tier."],
      ["analogy","Stateless servers are like bank tellers who look up your account on the central system. Any teller can serve you. A stateful server is a teller who keeps your file in their own drawer."]
    ] },
    { h: "Problem 3: the disk fills up", blocks: [
      ["math",[["New bookmarks / day","given","1 million"],["Size per bookmark","given","~200 bytes"],["Growth / day","1M × 200 B","200 MB"],["Best disk in 2004","given","40 GB"],["Time until full","40 GB ÷ 200 MB/day","≈ 200 days (~6 months)"]],"One machine can't hold the data for long. It has to be split across machines: that's <b>sharding</b>."],
      ["p","<b>Step 1: choose the sharding key</b>, the field that decides which data stays together on one machine. Shard by <code>site_url</code> and one user's bookmarks scatter everywhere, so <code>getAllBookmarks(user)</code> must ask every shard. Shard by <code>user_id</code> and both API calls touch exactly one shard. Rule: <b>pick the key that keeps your most frequent queries on a single shard.</b>"],
      ["p","<b>Step 2: map key → shard</b>, with four constraints: (1) the lookup must be extremely cheap, (2) load must be roughly even, (3) adding a shard must be easy, (4) removing a shard must be easy."]
    ] },
    { h: "Two mappings that fail", blocks: [
      ["p","<b>Modulo</b> (<code>userId % N</code>) is cheap and even. But when N changes from 4 to 5, a key stays put only if <code>id % 4 == id % 5</code>, which is true for only about 1 in 5 keys. About <b>80% of all data moves</b>, causing massive downtime."],
      ["p","<b>Ranges</b> (users 1–1M on shard A, the next million on B…) are skewed. Early users are usually the most active, their shards only keep growing, and a new shard only takes <i>new</i> users. It doesn't relieve the hot ones."]
    ] },
    { h: "Consistent hashing", blocks: [
      ["steps",[["Make a ring","Picture integers from 0 to 10¹⁸ arranged in a circle."],["Place machines","Hash each machine id with H₁ and mark that point on the ring."],["Place keys","Hash each user id with H onto the same ring."],["Walk clockwise","A user belongs to the first machine clockwise from its hash (wrapping around)."],["Look up in O(log N)","Keep node positions in a sorted array and binary-search for the first value greater than hash(user)."]]],
      ["p","Adding a machine only takes over the keys between it and its counter-clockwise neighbour. Everyone else stays put. That's ~1/N of the data instead of ~80%."],
      ["sim","ring","Add and remove nodes and compare ring vs hash % N. Then turn on virtual nodes."],
      ["warn","<b>Cascading failure.</b> With one point per machine, if Node 2 dies all its keys fall to the next node clockwise, doubling its load. If that node falls over too, the next one triples… and dominoes fall."],
      ["p","<b>Fix: virtual nodes.</b> Hash each machine with several functions so it appears at many points on the ring. When it dies, its many small arcs go to <i>different</i> successors and the load spreads evenly. It also smooths load in normal operation. Dynamo, Cassandra and Discord all use this idea."],
      ["extra","Redis Cluster takes a related approach: a fixed set of <b>16,384 hash slots</b> (<code>CRC16(key) mod 16384</code>) with an explicit slot → node map. Moving whole slots gives controlled, incremental rebalancing."],
      ["chart",{"type":"line","title":"Share of keys that move when you add one server","x":{"label":"servers before the change","values":[2,3,4,5,6,8,10,12,16]},"y":{"label":"keys moved"},"fmt":"pct","series":[{"name":"hash % N","values":[66.66666666666666,75,80,83.33333333333334,85.71428571428571,88.88888888888889,90.9090909090909,92.3076923076923,94.11764705882352]},{"name":"Hash ring","values":[33.33333333333333,25,20,16.666666666666664,14.285714285714285,11.11111111111111,9.090909090909092,7.6923076923076925,5.88235294117647]}],"note":"With modulo, almost everything moves (a cache wipe or a huge migration). With a ring, only about 1/(N+1)."}]
    ] },
    { h: "Implementing the ring", blocks: [
      ["p","The \"circle\" is just a <b>sorted array of node positions</b>. To place a key, hash it and binary-search for the first node position greater than the hash, wrapping to the start if there is none. With 4 hash functions per machine (as in the notes), each machine contributes 4 points."],
      ["code","const RING_MAX = 1e18;\nconst points = [];                       // [{pos, node}] sorted by pos\nfunction addNode(node) {\n  for (const h of [h1, h2, h3, h4]) points.push({ pos: h(node) % RING_MAX, node });\n  points.sort((a, b) => a.pos - b.pos);\n}\nfunction nodeFor(userId) {\n  const x = H(userId) % RING_MAX;\n  let lo = 0, hi = points.length;       // first pos > x\n  while (lo < hi) { const m = (lo + hi) >> 1; points[m].pos > x ? (hi = m) : (lo = m + 1); }\n  return points[lo % points.length].node;  // wrap around\n}"],
      ["p","Lookup is <b>O(log P)</b> for P points, which meets the \"extremely lightweight\" constraint, since a router or client can do it on every request."]
    ] },
    { h: "Worked example: what happens when nodes come and go", blocks: [
      ["steps",[["Start","Three shards S1, S2, S3, each hashed by 4 functions into [0, 10¹⁸]: 12 points on the ring. Users fall to the next point clockwise."],["Add S4","S4's 4 points land in 4 different places. Each takes over a small arc from whichever shard was next. S1, S2 and S3 each lose a few users, so load evens out, and nobody else moves."],["Remove S2 (one point per node)","All of S2's users fall to its single successor, say S3, whose load doubles. If S3 then fails, S1 triples. That's the cascade."],["Remove S2 (many points per node)","S2's users are spread across all of its small arcs, so they fall to <i>different</i> successors: some to S1, some to S3, some to S4. Everyone's load rises a little, and nobody falls over."]]]
    ] }
  ],
  quiz: [
    {"q":"Why not shard delicious by site_url?","o":["URLs are too long","getAllBookmarks(user) would have to query every shard","URLs aren't unique","It's slower to hash"],"a":1,"why":"user_id keeps each user's data together, so both APIs hit one shard."},
    {"q":"Going from 4 to 5 shards with userId % N, roughly what fraction of keys move?","o":["~20%","~50%","~80%","0%"],"a":2,"why":"A key stays only when id%4 == id%5, about 1 in 5. So ~80% move."},
    {"q":"What do virtual nodes fix?","o":["Hash collisions","Load dumping onto one neighbour when a node dies (and uneven arcs)","DNS caching","Slow binary search"],"a":1,"why":"Many points per machine spread a failed node's keys over many survivors."},
    {"q":"How fast is finding a key's node on the ring?","o":["O(1)","O(log N) with binary search over sorted node positions","O(N)","O(N²)"],"a":1,"why":"Sorted array of node hashes, then binary-search the first one greater than hash(key)."},
    {"q":"Why is range sharding (users 1–1M on shard A…) a poor choice for delicious?","o":["Ranges can't be hashed","Early users are the most active, their shards keep growing, and new shards only take new users","It needs a load balancer","Ranges overflow"],"a":1,"why":"Skewed, ever-growing hot shards that a new shard can't relieve."}
  ],
  refs: [
    ["ByteByteGo: Consistent hashing guide","https://bytebytego.com/guides/consistent-hashing/"],
    ["ByteByteGo video: Consistent Hashing","https://www.youtube.com/watch?v=UF9Iqmg94tk"],
    ["Wikipedia: Consistent hashing","https://en.wikipedia.org/wiki/Consistent_hashing"],
    ["Amazon's Dynamo (Werner Vogels)","https://www.allthingsdistributed.com/2007/10/amazons_dynamo.html"]
  ]
});
