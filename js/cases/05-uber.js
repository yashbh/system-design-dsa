/* Blueprint case study — Uber: Design Ride Matching. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "uber",
  app: "Uber",
  icon: "🚗",
  color: "#06c1a0",
  color2: "#2dd4bf",
  title: "Design Ride Matching",
  tagline: "A million moving dots that change every few seconds, and you need the right one near you in milliseconds.",
  level: "Advanced",
  minutes: 31,
  concepts: ["geo-index","sharding","ttl-lock","dispatch-state-machine","caching"],
  stats: [
    {v: 30,suf: "M+",label: "trips per day (2024 annual report ÷ 365)",kind: "Reported"},
    {v: 4,pre: "~",suf: " s",label: "between a driver's location updates",kind: "Typical"},
    {v: 250,suf: "k/s",label: "location writes if 1M drivers are online",kind: "Estimate"}
  ],
  story: "The concert just ended. Fifty thousand people pour out of the stadium at once, and you're one of them, standing on the pavement with your phone. You tap <i>Request</i>. A few seconds later the app says a car three blocks away is coming for you, and the price is 1.8× normal because about 20,000 other people tapped the same button in the same five minutes.<br><br>That moment looks simple. Under the hood it's one of the most interesting problems in system design. Think about what the app knows: a huge number of drivers, every one of them <b>moving</b>, each sending a fresh GPS position every few seconds. Somewhere in that blur is the best driver for you, and the app has to find them almost instantly.<br><br>Then there's a second, sneakier problem. Two riders standing ten metres apart request at the same moment. The same driver is closest to both of them. If the system offers that one driver to both riders, someone gets a car that never comes. A driver must <b>never be promised to two riders at once</b>.<br><br>So the design questions are: How do you answer \"who is near me?\" when the answer changes every few seconds? Where do you keep a million positions that are rewritten hundreds of thousands of times a second? How do you make sure one driver gets exactly one offer? And what happens when a whole stadium requests rides in the same city block?<br><br><span class=\"muted small\">The architecture here is a simplified teaching model built from Uber's public engineering posts and common interview patterns, not a full description of Uber's production systems.</span>",
  requirements: {
    functional: ["Drivers stream their location while online","Riders see nearby cars on a map and request a ride","Match a rider to a good driver, who can accept or decline","Show the rider an ETA and track the car on the way","Dynamic (surge) pricing by area when demand outruns supply"],
    nonFunctional: ["Find nearby drivers in milliseconds; complete a match in a few seconds","Handle a huge, nonstop write rate from location pings","A driver is never assigned to two riders at once","Stay calm under local hotspots: concerts, airports, rain at rush hour","One city's trouble must not slow every other city"]
  },
  estimate: [
    ["Online drivers at peak","assumption","1 M"],
    ["Location writes / sec","1M ÷ 4 s","≈ 250,000 /s"],
    ["Ingest bandwidth","250k × ~100 B per ping","≈ 25 MB/s"],
    ["Ride requests / sec (average)","30M ÷ 86,400","≈ 350 /s (peaks ≫)"],
    ["Drivers in one big city","from the Scaler notes (busiest Indian cities)","≈ 50,000"]
  ],
  estimateNote: "Here's the surprise hiding in this table: location writes outnumber ride requests by about <b>1,000 to 1</b>. Most of the work in a ride app isn't matching, it's simply keeping track of where everyone is. That shapes everything that follows.<br><br>Second, a ping is tiny (about 100 bytes) and short-lived. The moment a new ping arrives, the old one is useless for matching. Data like that belongs in <b>memory</b>, not in a disk-based database index that would be rewritten 250,000 times a second.<br><br>Third, look at the last row. Worldwide there may be a million drivers, but a rider in Mumbai only cares about Mumbai, and even a huge city has tens of thousands of drivers, not millions. That hint, \"the problem is local\", is the key to splitting the work across machines.",
  naive: {
    title: "\"SELECT drivers WHERE distance(me, driver) < 2 km\"",
    desc: "The first idea is to store every driver's latitude and longitude in a normal database table. When a rider requests, run a query that computes the distance from the rider to every driver and returns the ones within 2 km. It's correct, it's easy to write, and on a laptop with 500 test drivers it returns in a blink. Then you put real traffic on it.",
    breaks: ["<b>Every search reads every driver.</b> With 1 million drivers in the table, each request computes 1 million distances, which is O(N) per search. At a few hundred requests a second that's hundreds of millions of distance calculations every second, mostly for drivers on other continents.","<b>The rows never sit still.</b> 250,000 updates a second keep rewriting the very rows (and indexes) the searches are trying to read. Databases slow down badly when heavy writes and heavy reads fight over the same data.","<b>Straight-line distance lies.</b> A driver 400 m away across a river with no bridge nearby might be a 15-minute drive. \"Closest as the crow flies\" isn't \"fastest to pick you up\".","<b>Nothing stops a double booking.</b> Two requests can both read \"driver 42 is free\", both pick driver 42, and both send an offer. The query has no idea the other request exists."]
  },
  steps: [
    {
      t: "Treat location as an ephemeral firehose",
      c: "caching",
      b: "Start with the biggest stream of data: driver pings. Every few seconds each driver's app sends a small message: where I am, which way I'm heading, how fast, and whether I'm free. That's the 250,000 writes a second from our estimate.<br><br>The key observation is that matching only needs each driver's <b>latest</b> position. A ping from ten seconds ago is already stale. So keep a simple map in <b>memory</b>, something like <code>driver_id → {lat, lng, cell, status}</code>, and overwrite it on every ping. An in-memory key-value store such as Redis, or a purpose-built service, handles that kind of write rate comfortably.<br><br>What about the history? It's still valuable: for computing ETAs, rebuilding a trip for a dispute, catching GPS fraud, training models. So every ping is also appended to a <b>log</b> (a message stream like Kafka) <i>asynchronously</i>, off the matching path. The history gets stored later, in bulk, where it can't slow anyone down.<br><br>What does this cost? If an in-memory server crashes, its data is gone. But here that's almost fine: every driver will send a fresh ping within a few seconds, so the map rebuilds itself. Data that refreshes itself constantly doesn't need expensive durable storage on the hot path.",
      a: "A whiteboard you keep wiping and rewriting, not a ledger where you append every line forever. Someone else photographs the whiteboard now and then for the archive."
    },
    {
      t: "Cut the map into cells",
      c: "geo-index",
      b: "Now, \"who is near me?\" without checking everyone. The trick is the same one a library uses: put things on shelves by topic so you only search one shelf. Here, the shelves are <b>cells</b>: divide the map into small areas and keep, for each cell, the set of available drivers inside it. A search then only touches the rider's cell and a few around it. This is a <b>geospatial index</b>.<br><br>There are three popular ways to draw the cells. A <b>geohash</b> turns a location into a short string, where places that share a longer prefix are close together (so <code>tdr1y</code> and <code>tdr1v</code> share <code>tdr1</code> and sit in the same small area). A <b>quadtree</b> splits the world into four squares, and keeps splitting any square that has too many points, so dense downtowns get tiny cells and empty countryside gets huge ones. And <b>H3</b> is a grid of <b>hexagons</b>, nested at many sizes, that Uber built and open-sourced in 2018.<br><br>Tiny example (numbers made up): a city with 50,000 drivers split into 5,000 cells averages 10 drivers per cell. A search that looks at 7 cells checks about 70 drivers instead of 50,000. That's a 700× saving, and it gets better as the city grows.<br><br>The cost: you now maintain the index. Every time a driver moves into a new cell, you remove them from the old cell's set and add them to the new one.",
      a: "Finding a friend in a stadium by their section number instead of walking past every one of 50,000 seats."
    },
    {
      t: "Only update the index when a driver changes cell",
      c: "geo-index",
      b: "Here's a cheap but powerful optimisation, straight from the Scaler notes. A driver in slow traffic sends ping after ping from inside the same cell. Their exact coordinates change, but their <b>cell</b> doesn't. So the cell index only needs touching when a driver actually <b>crosses a boundary</b>.<br><br>The location map (driver → latest position) still updates on every ping, because that's a cheap overwrite of one key. But the expensive part, removing the driver from one cell's set and adding them to another, happens far less often. If, say, only 1 ping in 10 is a cell crossing, index writes drop by about 10×.<br><br>You can push this further onto the phone. The driver app can know the boundaries of its current cell and do a quick \"am I still inside this box?\" check before reporting a change. The notes' simple version also has the app skip pings entirely when the car hasn't moved, which helps a lot with parked drivers.<br><br>The cost is a little more logic in the app, and a cell map that's slightly behind for a driver right on the edge. That's harmless: the matching step re-checks real positions anyway.",
      a: "A hotel front desk doesn't log every time you walk around your room. It only updates the register when you change rooms."
    },
    {
      t: "Why hexagons?",
      c: "geo-index",
      b: "Why did Uber bother inventing a hexagon grid when squares are so much simpler? Look at a square on graph paper. It has 4 neighbours sharing an edge and 4 more touching only at the corners, and those corner neighbours are about 1.4 times farther away. So \"the cells next to me\" means different distances in different directions.<br><br>A hexagon has <b>6 neighbours, and all of them are the same distance from its centre</b>. That makes \"widen the search by one ring\" mean the same thing in every direction, and it makes heatmaps (like surge pricing maps) look smooth instead of blocky.<br><br>H3 is also <b>hierarchical</b>: there are many resolutions, from cells the size of a country down to cells smaller than a car park. Each cell has about 7 children at the next level. So you can count supply and demand at a coarse level for pricing, and search at a fine level for pickups.<br><br>The cost: hexagons don't nest perfectly. Seven small hexagons don't exactly fill one big one, so the edges of a parent and its children differ slightly. For ride matching, that small fuzziness is fine.",
      a: "A honeycomb. Bees found the shape that tiles a flat surface with equal neighbours long before engineers did."
    },
    {
      t: "Search rings, then rank by real ETA",
      c: "geo-index",
      b: "A request comes in. The matcher starts with the rider's own cell. Not enough available drivers there? Add <b>ring 1</b>, the 6 cells touching it. Still not enough? Add <b>ring 2</b>, and so on, until it has a handful of candidates, say 10 to 20. In a dense downtown you might stop at ring 1; on a quiet suburban street you might need ring 4.<br><br>Now the matcher has a short list. This is where it can afford the expensive question: how long would each of these drivers <b>actually take</b> to reach the rider, driving on real roads, with real traffic, respecting one-way streets and U-turn rules? That's an <b>ETA</b> (estimated time of arrival) from the routing service. Rank the candidates by ETA and pick the best one.<br><br>This two-stage pattern shows up everywhere in system design: a <b>cheap, rough filter</b> over everything, followed by an <b>expensive, precise ranking</b> over the few survivors. The index makes the search cheap; routing makes it right.<br><br>The cost is one extra service call per match, and ETAs that depend on good traffic data. A bad ETA means a sensible-looking match that's really 12 minutes away.",
      a: "Ripples spreading out from a stone dropped in a pond, and then actually asking each person the ripple reached how quickly they can get to you."
    },
    {
      t: "Lock the driver while offering",
      c: "ttl-lock",
      b: "Back to the double-booking danger. The fix is to treat each driver as a <b>state machine</b>: a driver is always in exactly one state, and only certain moves are allowed. The important ones are <code>AVAILABLE → OFFERED → ON_TRIP</code>.<br><br>Moving a driver from AVAILABLE to OFFERED is an <b>atomic conditional write</b>: \"set driver 42 to OFFERED for rider A, but <i>only if</i> it is currently AVAILABLE\". Atomic means the check and the change happen as one indivisible step, so no other request can sneak in between. If two matchers try at the same instant, exactly one succeeds; the other sees the write fail and moves on to its next candidate.<br><br>The OFFERED state also has a <b>timeout</b>, roughly 15 seconds. If the driver doesn't tap accept, maybe they're driving or their phone lost signal, the state automatically falls back to AVAILABLE and the rider's request goes to the next candidate. A lock that expires on its own like this is a <b>lease</b>, or TTL lock (TTL means time to live).<br><br>The cost: offering to one driver at a time is fair and safe, but every decline or timeout adds seconds to the rider's wait. The notes describe the same idea as offering the ride to nearby drivers one after another, round-robin, until someone accepts.",
      a: "Putting a \"reserved\" card on a restaurant table that's automatically removed if the guest hasn't shown up in fifteen minutes."
    },
    {
      t: "Shard by geography, and handle hotspots",
      c: "sharding",
      b: "One machine can't hold the whole world's drivers and requests, so you split the work. The natural split is by <b>geography</b>: each city or region is a <b>shard</b>, handled by its own group of servers. That works beautifully because cities are independent. A rider in Mumbai never needs a driver in São Paulo. The Scaler notes make exactly this point: shard by city, and each problem shrinks to tens of thousands of drivers.<br><br>Uber publicly described a library called <b>Ringpop</b> for spreading this kind of work across servers. It uses <b>consistent hashing</b>, a way of assigning keys to servers so that adding or removing a server only moves a small slice of keys, plus a gossip protocol so the servers agree on who owns what.<br><br>Shards aren't equal, though. A stadium emptying out creates a sudden <b>hotspot</b>: thousands of requests in a handful of cells. Two things help. The index uses <b>finer cells</b> where it's dense, so each cell stays small. And <b>surge pricing</b> compares demand and supply per cell; a higher price both reduces demand a little and pulls nearby drivers toward the hotspot.<br><br>The cost: cities are not all the same size, so some shards are much busier than others and need more servers. And trips that cross a shard boundary (an airport just outside town, say) need a rule for which shard owns them.",
      a: "Each city has its own dispatch office, and on concert nights the busiest neighbourhood gets a few extra dispatchers and a sign saying fares are higher right now."
    }
  ],
  diagram: {
    nodes: [
      {
        id: "d",
        x: 90,
        y: 100,
        label: "Driver app",
        sub: "ping every ~4 s",
        kind: "client",
        icon: "🚕",
        desc: "Streams GPS updates; accepts or declines offers."
      },
      {
        id: "r",
        x: 90,
        y: 360,
        label: "Rider app",
        sub: "request ride",
        kind: "client",
        icon: "🙋",
        desc: "Requests a ride and sees nearby cars."
      },
      {
        id: "gw",
        x: 290,
        y: 230,
        label: "Gateway",
        sub: "geo-sharded",
        kind: "edge",
        icon: "⚖️",
        desc: "Routes each request to the shard that owns that city/region."
      },
      {
        id: "loc",
        x: 510,
        y: 100,
        label: "Location Service",
        sub: "in-memory",
        kind: "service",
        icon: "📍",
        desc: "Updates the driver's latest position and moves them between cells."
      },
      {
        id: "idx",
        x: 740,
        y: 100,
        label: "Cell Index",
        sub: "H3 cell → drivers",
        kind: "cache",
        icon: "⬡",
        desc: "For each hexagon, the set of available drivers inside it."
      },
      {
        id: "match",
        x: 510,
        y: 360,
        label: "Matching / Dispatch",
        sub: "state machine",
        kind: "service",
        icon: "🤝",
        desc: "Ring search → ETA ranking → atomic offer with timeout."
      },
      {
        id: "eta",
        x: 740,
        y: 360,
        label: "Routing / ETA",
        sub: "road graph",
        kind: "service",
        icon: "🛣️",
        desc: "Computes real driving time for the candidates."
      },
      {
        id: "log",
        x: 920,
        y: 230,
        label: "Trip & Location Log",
        sub: "Kafka → storage",
        kind: "queue",
        icon: "📬",
        desc: "History for billing, safety, analytics and ML."
      }
    ],
    flows: [
      {
        name: "Driver pings",
        steps: [
          ["d","gw","PING lat,lng (every ~4 s)"],
          ["gw","loc","Routed to the city shard"],
          ["loc","idx","Move driver from cell A to cell B"],
          ["loc","log","Append to history asynchronously"]
        ]
      },
      {
        name: "Rider requests",
        steps: [
          ["r","gw","REQUEST ride @ lat,lng"],
          ["gw","match","City shard's dispatcher"],
          ["match","idx","Cell + ring 1 + ring 2 → 12 candidates"],
          ["match","eta","Rank candidates by road ETA"],
          ["match","d","Atomic OFFER to best driver (15 s TTL)"],
          ["d","match","ACCEPT"],
          ["match","r","Driver is 3 min away"]
        ]
      }
    ]
  },
  lab: {
    sim: "geo",
    title: "Geo-Index Lab",
    hint: "Click anywhere on the map to request a ride. Watch the hexagon rings expand, see how few drivers are checked compared with a full scan, and switch on the surge heatmap."
  },
  tradeoffs: [
    {
      choice: "Keep the latest location in memory",
      pro: "Handles 100k+ writes a second with very low latency",
      con: "A crash loses it, and it must rebuild from new pings (fine here, because they arrive every few seconds)"
    },
    {
      choice: "Hexagons (H3) vs. geohash squares",
      pro: "Every neighbour is the same distance away, so rings and heatmaps are smooth",
      con: "Hexagons don't subdivide perfectly into children, and they're harder to reason about than squares"
    },
    {
      choice: "Offer to one driver at a time",
      pro: "No double assignments, and drivers aren't spammed with offers they'll lose",
      con: "Every decline or timeout adds seconds to the rider's wait"
    },
    {
      choice: "Shard by city",
      pro: "Cities are independent, so each shard is small and one city's trouble stays local",
      con: "Shards are very uneven in size, and trips near borders need a clear ownership rule"
    },
    {
      choice: "Update the index only on cell changes",
      pro: "Cuts index writes by roughly an order of magnitude",
      con: "The index can be a few seconds behind for drivers right on a cell edge"
    }
  ],
  takeaways: ["Index space so search cost depends on what's nearby, not on the total number of drivers.","Keep fast-changing, short-lived state in memory, and send the history to a log off the hot path.","Filter cheaply first (cells), then rank precisely (road ETAs) on the few survivors.","Scarce resources, like a driver, need atomic state changes that expire on their own.","Shard along the natural boundary of the problem: rides are local, so split by city."],
  quiz: [
    {
      q: "Why are hexagons nice for geo-indexing?",
      o: ["They're smaller","All neighbours are the same distance from the centre","GPS outputs hexagons","They compress better"],
      a: 1,
      why: "Uniform neighbours make ring searches and heatmaps consistent in every direction."
    },
    {
      q: "Where should a driver's latest location live?",
      o: ["An append-only SQL table scanned on every search","An in-memory, cell-indexed store","A CDN","A nightly batch file"],
      a: 1,
      why: "It changes every few seconds and only the latest value matters for matching."
    },
    {
      q: "How do you prevent one driver being offered to two riders?",
      o: ["Hope","Atomic state transition AVAILABLE→OFFERED with a timeout","Send both riders and let them race","Bigger servers"],
      a: 1,
      why: "A conditional, expiring write allows one offer at a time and recovers on its own if ignored."
    },
    {
      q: "After finding nearby candidates by cell, you rank them by…",
      o: ["Driver name","Straight-line distance only","Road-network ETA","Random"],
      a: 2,
      why: "A driver across a river may be close in a straight line and far by road."
    },
    {
      q: "Why can a city shard's location index be rebuilt quickly after a crash?",
      o: ["It's backed up hourly","Every driver pings every few seconds, so the state refills itself","It's stored in SQL","It can't"],
      a: 1,
      why: "Short-lived, constantly refreshed state doesn't need durable storage on the hot path."
    },
    {
      q: "What is the most natural sharding key for ride matching?",
      o: ["Rider ID","Driver ID","City or region","Time of day"],
      a: 2,
      why: "Riders only need drivers in their own area, so a city shard holds everything one match needs."
    },
    {
      q: "A driver's pings all land inside the same cell. What should the cell index do?",
      o: ["Remove and re-add the driver every time","Nothing; only the latest-position map needs updating","Delete the driver","Split the cell"],
      a: 1,
      why: "Index writes are only needed on cell crossings, which cuts that write load roughly 10× in our example."
    },
    {
      q: "Why not use the same fixed cell size everywhere?",
      o: ["It's illegal","Driver density varies a lot by place and time, so fixed cells are too crowded downtown and too empty in suburbs","Hexagons can't be resized","GPS is less accurate in cities"],
      a: 1,
      why: "Dense areas need finer cells (or a quadtree that splits there) so each cell stays small."
    }
  ],
  sources: ["Uber Engineering: H3 hexagonal hierarchical spatial index (2018)","Uber Engineering: Ringpop","Uber 2024 annual report: ~11B trips"],
  deep: [
    {
      h: "Location ingestion",
      blocks: [
        ["img","A busy city street at night with cars and a parked taxi illuminated by neon signs and streetlights.jpg","Every car on a street like this is a moving point that has to be indexed every few seconds."],
        ["p","Follow one ping on its journey. It leaves the driver's phone, hits a gateway that looks at the location and decides which city shard owns it, and lands at that shard's location service. Two things happen there: a fast overwrite in memory, and a hand-off to the log for the history. Only one of those two is on the critical path."],
        ["flow",{"nodes":[{"id":"d","x":90,"y":225,"label":"Driver app","sub":"GPS every ~4 s","kind":"client","icon":"🚕","desc":"Sends position, heading, speed and status."},{"id":"g","x":300,"y":225,"label":"Gateway","sub":"routes by city","kind":"edge","icon":"⚖️","desc":"Sends each ping to the shard that owns that city."},{"id":"l","x":530,"y":100,"label":"Location service","sub":"in-memory, per city","kind":"service","icon":"📍","desc":"Keeps only the latest position and the driver's H3 cell."},{"id":"i","x":770,"y":100,"label":"Cell index","sub":"cell → drivers","kind":"cache","icon":"⬡","desc":"Updated only when a driver crosses into a new cell."},{"id":"k","x":530,"y":350,"label":"Kafka","sub":"location history","kind":"queue","icon":"📬","desc":"Every ping, for ETA models, trip replay, safety and fraud."},{"id":"h","x":770,"y":350,"label":"History store","sub":"time-series","kind":"db","icon":"🗄️","desc":"Queried later, never on the matching path."}],"flows":[{"name":"A driver ping","steps":[["d","g","PING {lat, lng, heading, status}"],["g","l","City shard"],["l","i","Same cell as before? Nothing to do. New cell? Move the driver"],["l","k","Append to history asynchronously"],["k","h","Persist"]]}]},"Hot path in memory; history goes through a log."],
        ["chart",{"type":"line","title":"Location writes per second","x":{"label":"drivers online","values":["100k","250k","500k","1M","2M"]},"y":{"label":"writes / s"},"series":[{"name":"Ping every 4 s","values":[25000,62500,125000,250000,500000]},{"name":"Cell-change updates only (~1 in 10)","values":[2500,6250,12500,25000,50000]}],"note":"Updating the index only on cell crossings cuts index writes about 10× (the ratio is illustrative)."}],
        ["p","How often should drivers ping? It's a trade-off. Every 4 seconds gives the rider a smooth car moving on the map and fresh data for matching, at the price of more battery, more mobile data and more server writes. The simpler design in the Scaler notes uses about one ping a minute, which is plenty for a first version but would make the car on the map jump around. Real apps also ping faster during an active trip than while a driver is waiting."]
      ]
    },
    {
      h: "Choosing the cell size",
      blocks: [
        ["p","Cell size is a Goldilocks problem. Cells too big, and each holds hundreds of drivers, so a search scans a lot of them. Cells too small, and drivers cross boundaries constantly (more index writes) and a search needs many rings to find anyone."],
        ["table",["H3 resolution","Average hexagon edge (approx.)","Good for"],[["7","~1.2 km","City-level supply/demand, surge zones"],["8","~0.46 km","Neighbourhood matching"],["9","~0.17 km","Pickup points in dense downtowns"]]],
        ["p","H3 is hierarchical: each cell has about 7 children at the next resolution. Search a coarse cell first and drill down where it's dense. That's the same idea as the quadtree in the S3/HDFS lesson, with hexagons."],
        ["extra","<b>The quadtree version from the Scaler notes.</b> Build a quadtree over each city's current cab positions: any square holding too many cabs splits into four. But if the rule is \"split above 50\", a square hovering around 50 cabs would split and merge again and again as cabs drive in and out. The fix is a <b>range</b>, for example split above 75 and merge below 50, so small wobbles don't reshape the tree. Another option is to rebuild the tree on a schedule, every few hours, since city traffic patterns change slowly."]
      ]
    },
    {
      h: "Matching: trips and drivers as state machines",
      blocks: [
        ["p","Two things in this system have a life story: drivers and trips. Writing those stories down as state machines makes the rules explicit, and makes bugs like double booking structurally impossible instead of \"unlikely\"."],
        ["table",["Entity","States","Key rule"],[["Driver","OFFLINE → AVAILABLE → OFFERED → EN_ROUTE → ON_TRIP → AVAILABLE","AVAILABLE → OFFERED is an atomic conditional write with a ~15 s timeout"],["Trip","REQUESTED → MATCHING → ACCEPTED → ARRIVED → IN_PROGRESS → COMPLETED / CANCELLED","Every transition is recorded (for billing and disputes)"]]],
        ["steps",[["Find candidates","The rider's cell plus 1–2 rings of neighbours gives ~10–20 available drivers."],["Rank by ETA","Driving time on the road graph with live traffic, not straight-line distance."],["Offer to the best","Atomically mark the driver OFFERED, then push the offer to the driver's app."],["Accept or time out","Accept → EN_ROUTE. Decline or timeout → back to AVAILABLE, offer to the next candidate."]]],
        ["code","-- the offer step, as one atomic conditional update (illustrative)\nUPDATE drivers\n   SET state = 'OFFERED', offered_trip = :trip, offer_expires_at = NOW() + INTERVAL 15 SECOND\n WHERE driver_id = :d AND state = 'AVAILABLE';\n-- 1 row changed → the offer is yours.  0 rows → someone else got there first: try the next candidate"],
        ["p","In an in-memory store the same idea is a compare-and-set, for example Redis <code>SET driver:42:offer trip_9 NX PX 15000</code>: set the key only if it doesn't exist, and let it expire after 15,000 ms."]
      ]
    },
    {
      h: "What happens when the stadium empties",
      blocks: [
        ["p","Let's run our opening scene through the design, with made-up numbers. It's 11:02 p.m. In ten minutes, 20,000 ride requests arrive from about a dozen hexagons around the stadium. There are only 1,500 available drivers within a few kilometres."],
        ["steps",[["Requests flood one shard","All of them route to the same city shard. The cells around the stadium are suddenly the busiest cells in the city."],["Ring search runs dry","The first requests find drivers in ring 1. Later requests find ring 1 empty and widen to ring 3 or 4, so ETAs climb from 3 minutes to 12."],["Surge kicks in","Per-cell demand (open requests) is now more than ten times supply (available drivers). The multiplier rises, smoothed so it doesn't flicker, and capped."],["Supply moves","Drivers across town see the surge on their heatmap and drive toward the stadium. Some riders decide to walk a few blocks or wait twenty minutes."],["Things settle","Within about half an hour, requests drop and drivers arrive. Surge falls back toward 1×."]]],
        ["p","Notice what <b>didn't</b> happen: no driver got two riders, because the atomic offer prevents it, and the rest of the city kept working normally, because the hotspot was contained in one shard's busy cells. The system bent; it didn't break."]
      ]
    },
    {
      h: "ETAs and surge pricing",
      blocks: [
        ["list",["<b>ETA:</b> the road network is a graph with edge weights = current travel time per segment, learned from recent GPS traces. Routing uses precomputed shortcuts (contraction hierarchies) so a route is computed in milliseconds.","<b>Surge:</b> for each cell, compare open requests (demand) with available drivers (supply) over the last few minutes. The multiplier rises with the ratio, is smoothed so prices don't flicker, and is capped. Higher prices also pull nearby drivers toward the hotspot."]],
        ["p","A <b>graph</b> here is just intersections (nodes) connected by road segments (edges), each with a travel time. Finding the fastest route is a shortest-path problem. Plain shortest-path search over a whole city is too slow to run thousands of times a second, so routing engines precompute shortcuts: \"from this motorway junction to that one takes 6 minutes\". Then a query only explores a tiny part of the graph."],
        ["analogy","Surge pricing is like a market stall that raises the price of umbrellas when it starts to rain. Some people decide they can stay dry under an awning, and nearby stalls with umbrellas walk over to sell them."]
      ]
    },
    {
      h: "Failure modes",
      blocks: [
        ["table",["Failure","Mitigation"],[["A city shard dies","A standby takes over; the index rebuilds from the next ~4 s of pings (state is ephemeral)"],["Driver loses signal mid-offer","The offer times out and goes to the next driver"],["Double assignment race","The conditional write on driver state means only one offer can win"],["Payment service slow","Trips complete; charges retry asynchronously with idempotency keys"]]],
        ["p","An <b>idempotency key</b> is a unique ID attached to an operation, like a charge for a specific trip, so that if the request is retried the server recognises it and doesn't charge twice. It's what lets the system retry payments freely."],
        ["warn","GPS lies sometimes. Tall buildings bounce signals, and a car can appear to teleport across a river for one ping. Real systems smooth positions against the road map (\"map matching\") before trusting them for ETAs or billing."]
      ]
    },
    {
      h: "Interview follow-ups",
      blocks: [
        ["list",["Pooled rides? → match several riders whose routes overlap, which is a harder optimisation.","Airports with driver queues? → a FIFO queue per airport zone instead of pure nearest-driver.","Privacy? → coarsen locations shown to riders; restrict history access.","How do you test matching changes? → replay real ping logs (from Kafka) through the new algorithm offline."]],
        ["p","A good bonus point: matching doesn't have to be greedy. Instead of giving each rider the single nearest driver the instant they request, the matcher can wait a second or two, collect several requests in an area, and assign drivers to minimise total waiting time across everyone. Slightly slower per rider, better for the whole crowd."]
      ]
    },
    {
      h: "Interview corner: presenting this in 45 minutes",
      blocks: [
        ["steps",[["Minutes 0–5: scope","Clarify: within a city only? Riders and drivers, no food delivery? Agree the core is nearby search plus safe matching."],["Minutes 5–10: estimate","Do 1M drivers ÷ 4 s = 250k writes a second. Point out writes outnumber requests about 1,000×, so location tracking drives the design."],["Minutes 10–20: location store and geo-index","In-memory latest position, history to a log, cells (geohash, quadtree or H3), and writes only on cell change."],["Minutes 20–30: matching","Ring search, ETA ranking, the driver state machine, and the atomic offer with a 15 s timeout."],["Minutes 30–40: scale and hotspots","Shard by city, finer cells in dense areas, surge pricing, and what happens when a shard dies."],["Minutes 40–45: follow-ups","Pooled rides, airport queues, privacy, testing by replaying logs."]]],
        ["tip","If the interviewer asks \"geohash, quadtree or hexagons?\", any can work. Say what each costs: geohash is simplest, quadtrees adapt to density, hexagons give equal neighbours. Then pick one and move on."]
      ]
    }
  ]
});
