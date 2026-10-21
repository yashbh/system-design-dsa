/* Blueprint building blocks — Architecture, Networking. Each concept: name, icon, cat, one (one-liner), analogy, body, optional fig/sim, when, pitfalls, used (case ids). */
Object.assign(BP.CONCEPTS, {
  "cdn": {
    name: "CDN & edge caching",
    icon: "🌍",
    cat: "Networking",
    one: "Serve static and heavy content from servers physically close to users.",
    analogy: "Instead of shipping every book from one central warehouse, put copies in neighborhood libraries.",
    body: "A CDN caches content at points of presence around the world. It cuts latency (shorter distance), offloads your origin, and absorbs traffic spikes. Netflix goes further and places its own appliances <i>inside</i> ISPs.",
    used: ["netflix","instagram","ticketmaster","youtube"],
    fig: "cachepath",
    when: "Static assets, images, video segments, and anything identical for many users far from your servers.",
    pitfalls: "Invalidation delays; personalised or private content shouldn't be cached at shared edges."
  },

  "websockets": {
    name: "Persistent connections (WebSockets)",
    icon: "🔌",
    cat: "Networking",
    one: "Keep one connection open so the server can push data instantly.",
    analogy: "Staying on a phone call instead of mailing a letter every few seconds asking \"anything new?\"",
    body: "Polling wastes requests and battery and adds delay. WebSockets (or raw long-lived TCP like WhatsApp's protocol) let the server push in milliseconds. Cost: servers hold millions of open connections, so you need a registry of who is connected where.",
    used: ["whatsapp","gdocs"],
    sim: "chat"
  },

  "abr": {
    name: "Adaptive bitrate streaming",
    icon: "📶",
    cat: "Networking",
    one: "Video is cut into short segments in many qualities; the player picks each segment's quality live.",
    analogy: "A driver shifting gears: high gear on the open highway, low gear on a steep hill, so the car never stalls.",
    body: "HLS/DASH split video into segments a few seconds long. The player measures throughput and buffer level and requests the highest quality it can sustain. Stalls hurt viewers more than blurry frames, so players are conservative.",
    used: ["netflix","youtube"],
    sim: "abr"
  },

  "http-redirects": {
    name: "HTTP redirects (301 vs 302)",
    icon: "↪️",
    cat: "Networking",
    one: "301 is permanent (browsers cache it); 302 is temporary (every click hits you again).",
    analogy: "A forwarding address with the post office (301) vs. a note on the door each visitor must read (302).",
    body: "301 reduces your load but you lose per-click analytics and can't change the target easily. 302/307 keeps you in the loop for analytics, A/B tests and expiry.",
    used: ["bitly"]
  },

  "dns": {
    used: [],
    name: "DNS (Domain Name System)",
    icon: "📇",
    cat: "Networking",
    fig: "dns",
    one: "The internet's phone book: turns names like del.icio.us into IP addresses.",
    analogy: "Saving \"Mom\" in your contacts instead of memorising her number. The phone looks up the number for you.",
    body: "Registrars sell names, and ICANN keeps the authoritative ownership records. You publish an <b>A record</b> (name → IPv4) with your DNS provider. Lookups go browser cache → OS → <b>recursive resolver</b> → root → TLD → <b>authoritative</b> server, and every answer is cached for its <b>TTL</b>. Replicating the directory worldwide avoids a single point of failure; the price is that changes take up to the TTL to propagate.",
    when: "Every public service. Also used for coarse load balancing and geo-routing (GSLB).",
    pitfalls: "Long TTLs slow down failover; short TTLs increase lookup load."
  },

  "microservices": {
    used: [],
    name: "Microservices (vs monolith & SOA)",
    icon: "🧩",
    cat: "Architecture",
    fig: "monolith",
    one: "Split a system into independently deployable services, each owning its own data.",
    analogy: "A food court of independent stalls instead of one giant restaurant kitchen.",
    body: "Pros: independent deploys, scaling and tech stacks, fault isolation, clear API contracts. Cons: more hops and latency, more machines, harder tracing, and cross-service consistency (sagas, CQRS). SOA services may share databases; microservices don't. Start monolithic and split only along real seams.",
    pitfalls: "Over-splitting tightly coupled features creates chatty, fragile systems."
  },

  "api-gateway": {
    used: [],
    name: "API gateway",
    icon: "🚪",
    cat: "Architecture",
    one: "An application-layer front door that authenticates, rate-limits and routes requests to the right service.",
    analogy: "A hotel reception: checks your ID, then directs you to the right floor.",
    body: "It sits behind the load balancer and routes by path (/ads → Ads service). It also handles auth, rate limiting, TLS, request aggregation and protocol translation (REST → gRPC). It's replicated for availability. A <b>BFF</b> (backend-for-frontend) is one gateway per client type.",
    pitfalls: "Don't let it become a god-service full of business logic."
  },

  "saga": {
    used: [],
    name: "Saga pattern",
    icon: "🎻",
    cat: "Architecture",
    fig: "saga",
    one: "A distributed transaction as a sequence of local transactions with compensating undo steps.",
    analogy: "Planning a trip: book the flight, then the hotel, then the car. If the car fails, cancel the hotel and the flight.",
    body: "Each step commits locally in its own service. On a permanent failure, completed steps run compensations (refund, restock). <b>Orchestration</b>: a central coordinator calls each step (faster, easier to observe). <b>Choreography</b>: services react to each other's events on Kafka (no central point of failure). Compensations must be idempotent; use a transactional outbox to publish events reliably.",
    pitfalls: "No isolation: other requests can see intermediate states."
  },

  "two-phase-commit": {
    used: [],
    name: "Two-phase commit (2PC)",
    icon: "🔒",
    cat: "Architecture",
    one: "A coordinator asks all participants to prepare (lock), then commit together.",
    analogy: "A wedding officiant: \"Do you? Do you?\" Only after both say yes is it final, and everyone waits in place meanwhile.",
    body: "It gives atomicity across databases, but locks are held across network round trips, every participant must be up, and a coordinator crash after prepare leaves locks stuck. That's why microservices treat it as an anti-pattern and prefer sagas."
  },

  "cqrs": {
    used: [],
    name: "CQRS",
    icon: "🪞",
    cat: "Architecture",
    one: "Command Query Responsibility Segregation: separate the write model from purpose-built read models.",
    analogy: "The kitchen records orders; a separate display board shows the summary diners actually want to see.",
    body: "Writes go to the owning services; their change events are relayed (e.g. via Kafka) into a read store designed for a specific query, often joining data from several services. It avoids querying another service's database directly. The read model is eventually consistent."
  },

  "event-sourcing": {
    name: "Event sourcing",
    icon: "📜",
    cat: "Architecture",
    used: ["gdocs"],
    one: "Store every change as an immutable event; the current state is a replay (or a snapshot plus recent events).",
    analogy: "A chess game recorded move by move: you can replay it to any point, and the board is just the result.",
    body: "The event log is the source of truth. You get full history and audit for free, and can rebuild read models later. Periodic snapshots keep replay fast. Kafka-style logs and WALs are the same idea at different layers.",
    pitfalls: "Event schemas must evolve carefully; replays of long histories need snapshots."
  }
});
