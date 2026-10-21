/* Blueprint case study — Uber: Design Ride Matching. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "uber",
  app: "Uber",
  icon: "🚗",
  color: "#06c1a0",
  color2: "#2dd4bf",
  title: "Design Ride Matching",
  tagline: "Millions of moving dots, updated every few seconds: find the best driver near you in milliseconds.",
  level: "Advanced",
  minutes: 30,
  concepts: ["geo-index","sharding","ttl-lock","geo-sharding","caching"],
  stats: [
    {v: 30,suf: "M+",label: "trips per day (2024 annual report ÷ 365)",kind: "Reported"},
    {v: 4,pre: "~",suf: " s",label: "between driver location updates",kind: "Typical"},
    {v: 250,suf: "k/s",label: "location writes for 1M online drivers",kind: "Estimate"}
  ],
  story: "You're outside a stadium after a concert. You tap <i>Request</i>. Within seconds a car three blocks away is assigned to you, and the price is 1.8× because 20,000 other people just did the same thing.<br><br>The core problem is <b>\"who is near me?\"</b> over a firehose of constantly moving points, plus making sure <b>one driver isn't promised to two riders</b>.",
  requirements: {
    functional: ["Drivers stream their location","Riders see nearby cars and request a ride","Match rider to a good driver who can accept or decline","Dynamic (surge) pricing by area"],
    nonFunctional: ["Matching in seconds; nearby search in milliseconds","Handle huge write rate from location pings","A driver is never double-assigned","Graceful under local hotspots (concerts, airports)"]
  },
  estimate: [
    ["Online drivers at peak","assumption","1 M"],
    ["Location writes / sec","1M ÷ 4 s","≈ 250,000 /s"],
    ["Ingest bandwidth","250k × ~100 B","≈ 25 MB/s"],
    ["Ride requests / sec (avg)","30M ÷ 86,400","≈ 350 /s (peaks ≫)"]
  ],
  estimateNote: "Insight: location writes outnumber ride requests by about 1000×. Only the latest position matters for matching, so it belongs in memory, not in a disk index that gets rewritten 250k times a second.",
  naive: {
    title: "\"SELECT drivers WHERE distance(me, driver) < 2 km\"",
    desc: "Store driver lat/lng in a relational table and compute distance for every row.",
    breaks: ["Each request scans every driver in the table, which is O(N) per search.","250k updates/s constantly rewrite the very rows (and indexes) you're scanning.","Straight-line distance ignores rivers, highways and one-way streets."]
  },
  steps: [
    {
      t: "Treat location as an ephemeral firehose",
      c: "caching",
      b: "Driver apps send a location ping every few seconds. Matching only needs the <b>latest</b> position, so keep it in an <b>in-memory store</b>, keyed by driver and indexed by cell. The full history streams to a log (for ETAs, fraud, analytics) asynchronously.",
      a: "A whiteboard you keep wiping and rewriting, not a ledger where you append every line forever."
    },
    {
      t: "Cut the map into cells",
      c: "geo-index",
      b: "Index points by <b>cell</b> so a search touches a few buckets. Options: <b>geohash</b> (a string where a shared prefix means nearby), <b>quadtrees</b> (split dense areas finer), or <b>H3</b>, the hierarchical <b>hexagon</b> grid Uber open-sourced in 2018.",
      a: "Finding a friend in a stadium by section number instead of checking every seat."
    },
    {
      t: "Why hexagons?",
      c: "geo-index",
      b: "Every neighbor of a hexagon is the <b>same distance</b> from its center. Squares have edge neighbors and farther diagonal neighbors. That makes \"expand the search ring by one\" and surge heatmaps smooth and fair in every direction.",
      a: "A honeycomb: bees found the shape that tiles a plane with equal neighbors long before engineers did."
    },
    {
      t: "Search rings, then rank by real ETA",
      c: "geo-index",
      b: "Look in the rider's cell, then ring 1, then ring 2… until enough candidate drivers are found. Then rank those few candidates by <b>road-network ETA</b>, not straight-line distance. The index makes the search cheap; routing makes it right.",
      a: "Ripples spreading from a stone dropped in a pond."
    },
    {
      t: "Lock the driver while offering",
      c: "ttl-lock",
      b: "Model the driver as a state machine: <code>AVAILABLE → OFFERED → ON_TRIP</code>. Moving to OFFERED is an <b>atomic conditional write with a timeout</b>. If the driver doesn't accept in ~15 s, they go back to AVAILABLE and the next candidate is offered. No driver is offered to two riders at once.",
      a: "Putting a \"reserved\" card on a restaurant table that expires if the guest doesn't show."
    },
    {
      t: "Shard by geography, and handle hotspots",
      c: "sharding",
      b: "Cities and regions map to different server groups (Uber built <b>Ringpop</b>, consistent-hashing-based, for this kind of sharding). Supply/demand per cell drives <b>surge pricing</b>, which also pulls drivers toward the hotspot. Very dense areas use finer cells.",
      a: "Each city has its own dispatch office, and the busiest neighborhoods get extra dispatchers."
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
      choice: "In-memory latest location",
      pro: "Handles 100k+ writes/s with low latency",
      con: "Must rebuild from pings after a crash (fine: they arrive every few seconds)"
    },
    {
      choice: "Hexagons (H3) vs. geohash squares",
      pro: "Uniform neighbors and smooth rings",
      con: "Hexagons don't subdivide perfectly into children"
    },
    {
      choice: "Offer to one driver at a time",
      pro: "No double-assignments; fair",
      con: "Declines add seconds of latency"
    }
  ],
  takeaways: ["Index space so search cost depends on locality, not total size.","Keep high-churn ephemeral state in memory.","Use state machines with atomic, expiring transitions for scarce resources."],
  quiz: [
    {
      q: "Why are hexagons nice for geo-indexing?",
      o: ["They're smaller","All neighbors are the same distance from the center","GPS outputs hexagons","They compress better"],
      a: 1,
      why: "Uniform adjacency makes ring searches and heatmaps consistent in all directions."
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
      why: "A conditional, expiring write gives one offer at a time and auto-recovers if ignored."
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
      why: "Ephemeral, constantly refreshed state doesn't need durable storage on the hot path."
    }
  ],
  sources: ["Uber Engineering: H3 hexagonal hierarchical spatial index (2018)","Uber Engineering: Ringpop","Uber 2024 annual report: ~11B trips"],
  deep: [
    {
      h: "Location ingestion",
      blocks: [
        ["img","A busy city street at night with cars and a parked taxi illuminated by neon signs and streetlights.jpg","Every car on a street like this is a moving point that has to be indexed every few seconds."],
        ["flow",{"nodes":[{"id":"d","x":90,"y":225,"label":"Driver app","sub":"GPS every ~4 s","kind":"client","icon":"🚕","desc":"Sends position, heading, speed and status."},{"id":"g","x":300,"y":225,"label":"Gateway","sub":"routes by city","kind":"edge","icon":"⚖️","desc":"Sends each ping to the shard that owns that city."},{"id":"l","x":530,"y":100,"label":"Location service","sub":"in-memory, per city","kind":"service","icon":"📍","desc":"Keeps only the latest position and the driver's H3 cell."},{"id":"i","x":770,"y":100,"label":"Cell index","sub":"cell → drivers","kind":"cache","icon":"⬡","desc":"Updated only when a driver crosses into a new cell."},{"id":"k","x":530,"y":350,"label":"Kafka","sub":"location history","kind":"queue","icon":"📬","desc":"Every ping, for ETA models, trip replay, safety and fraud."},{"id":"h","x":770,"y":350,"label":"History store","sub":"time-series","kind":"db","icon":"🗄️","desc":"Queried later, never on the matching path."}],"flows":[{"name":"A driver ping","steps":[["d","g","PING {lat, lng, heading, status}"],["g","l","City shard"],["l","i","Same cell as before? Nothing to do. New cell? Move the driver"],["l","k","Append to history asynchronously"],["k","h","Persist"]]}]},"Hot path in memory; history goes through a log."],
        ["chart",{"type":"line","title":"Location writes per second","x":{"label":"drivers online","values":["100k","250k","500k","1M","2M"]},"y":{"label":"writes / s"},"series":[{"name":"Ping every 4 s","values":[25000,62500,125000,250000,500000]},{"name":"Cell-change updates only (~1 in 10)","values":[2500,6250,12500,25000,50000]}],"note":"Updating the index only on cell crossings cuts index writes about 10× (the ratio is illustrative)."}]
      ]
    },
    {
      h: "Choosing the cell size",
      blocks: [
        ["table",["H3 resolution","Average hexagon edge (approx.)","Good for"],[["7","~1.2 km","City-level supply/demand, surge zones"],["8","~0.46 km","Neighbourhood matching"],["9","~0.17 km","Pickup points in dense downtowns"]]],
        ["p","H3 is hierarchical: each cell has about 7 children at the next resolution. Search a coarse cell first and drill down where it's dense. That's the same idea as the quadtree in the S3/HDFS lesson, with hexagons."]
      ]
    },
    {
      h: "Matching: trips and drivers as state machines",
      blocks: [
        ["table",["Entity","States","Key rule"],[["Driver","OFFLINE → AVAILABLE → OFFERED → EN_ROUTE → ON_TRIP → AVAILABLE","AVAILABLE → OFFERED is an atomic conditional write with a ~15 s timeout"],["Trip","REQUESTED → MATCHING → ACCEPTED → ARRIVED → IN_PROGRESS → COMPLETED / CANCELLED","Every transition is recorded (for billing and disputes)"]]],
        ["steps",[["Find candidates","The rider's cell plus 1–2 rings of neighbours gives ~10–20 available drivers."],["Rank by ETA","Driving time on the road graph with live traffic, not straight-line distance."],["Offer to the best","Atomically mark the driver OFFERED, then push the offer to the driver's app."],["Accept or time out","Accept → EN_ROUTE. Decline or timeout → back to AVAILABLE, offer to the next candidate."]]]
      ]
    },
    {
      h: "ETAs and surge pricing",
      blocks: [
        ["list",["<b>ETA:</b> the road network is a graph with edge weights = current travel time per segment, learned from recent GPS traces. Routing uses precomputed shortcuts (contraction hierarchies) so a route is computed in milliseconds.","<b>Surge:</b> for each cell, compare open requests (demand) with available drivers (supply) over the last few minutes. The multiplier rises with the ratio, is smoothed so prices don't flicker, and is capped. Higher prices also pull nearby drivers toward the hotspot."]]
      ]
    },
    {
      h: "Failure modes",
      blocks: [
        ["table",["Failure","Mitigation"],[["A city shard dies","A standby takes over; the index rebuilds from the next ~4 s of pings (state is ephemeral)"],["Driver loses signal mid-offer","The offer times out and goes to the next driver"],["Double assignment race","The conditional write on driver state means only one offer can win"],["Payment service slow","Trips complete; charges retry asynchronously with idempotency keys"]]]
      ]
    },
    {
      h: "Interview follow-ups",
      blocks: [
        ["list",["Pooled rides? → match several riders whose routes overlap, which is a harder optimisation.","Airports with driver queues? → a FIFO queue per airport zone instead of pure nearest-driver.","Privacy? → coarsen locations shown to riders; restrict history access.","How do you test matching changes? → replay real ping logs (from Kafka) through the new algorithm offline."]]
      ]
    }
  ]
});
