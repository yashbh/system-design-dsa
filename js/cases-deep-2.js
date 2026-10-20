/* Blueprint — case-study deep dives, part 2 (Uber, Ticketmaster, Discord, Stripe). */
(function () {
  const byId = Object.fromEntries(BP.CASES.map((c) => [c.id, c]));
  const deep = (id, sections, quiz = []) => { byId[id].deep = sections; byId[id].quiz.push(...quiz); byId[id].minutes += 15; };
  const flow = (nodes, name, steps) => ({ nodes, flows: [{ name, steps }] });

  /* ═════════════ UBER ═════════════ */
  deep("uber", [
    { h: "Location ingestion", blocks: [
      ["img", "A busy city street at night with cars and a parked taxi illuminated by neon signs and streetlights.jpg", "Every car on a street like this is a moving point that has to be indexed every few seconds."],
      ["flow", flow([
        { id: "d", x: 90, y: 225, label: "Driver app", sub: "GPS every ~4 s", kind: "client", icon: "🚕", desc: "Sends position, heading, speed and status." },
        { id: "g", x: 300, y: 225, label: "Gateway", sub: "routes by city", kind: "edge", icon: "⚖️", desc: "Sends each ping to the shard that owns that city." },
        { id: "l", x: 530, y: 100, label: "Location service", sub: "in-memory, per city", kind: "service", icon: "📍", desc: "Keeps only the latest position and the driver's H3 cell." },
        { id: "i", x: 770, y: 100, label: "Cell index", sub: "cell → drivers", kind: "cache", icon: "⬡", desc: "Updated only when a driver crosses into a new cell." },
        { id: "k", x: 530, y: 350, label: "Kafka", sub: "location history", kind: "queue", icon: "📬", desc: "Every ping, for ETA models, trip replay, safety and fraud." },
        { id: "h", x: 770, y: 350, label: "History store", sub: "time-series", kind: "db", icon: "🗄️", desc: "Queried later, never on the matching path." }
      ], "A driver ping", [["d", "g", "PING {lat, lng, heading, status}"], ["g", "l", "City shard"], ["l", "i", "Same cell as before? Nothing to do. New cell? Move the driver"], ["l", "k", "Append to history asynchronously"], ["k", "h", "Persist"]]), "Hot path in memory; history goes through a log."],
      ["chart", { type: "line", title: "Location writes per second", x: { label: "drivers online", values: ["100k", "250k", "500k", "1M", "2M"] }, y: { label: "writes / s" }, series: [{ name: "Ping every 4 s", values: [25e3, 62.5e3, 125e3, 250e3, 500e3] }, { name: "Cell-change updates only (~1 in 10)", values: [2.5e3, 6.25e3, 12.5e3, 25e3, 50e3] }], note: "Updating the index only on cell crossings cuts index writes about 10× (the ratio is illustrative)." }]
    ]},
    { h: "Choosing the cell size", blocks: [
      ["table", ["H3 resolution", "Average hexagon edge (approx.)", "Good for"], [["7", "~1.2 km", "City-level supply/demand, surge zones"], ["8", "~0.46 km", "Neighbourhood matching"], ["9", "~0.17 km", "Pickup points in dense downtowns"]]],
      ["p", "H3 is hierarchical: each cell has about 7 children at the next resolution. Search a coarse cell first and drill down where it's dense. That's the same idea as the quadtree in the S3/HDFS lesson, with hexagons."]
    ]},
    { h: "Matching: trips and drivers as state machines", blocks: [
      ["table", ["Entity", "States", "Key rule"], [["Driver", "OFFLINE → AVAILABLE → OFFERED → EN_ROUTE → ON_TRIP → AVAILABLE", "AVAILABLE → OFFERED is an atomic conditional write with a ~15 s timeout"], ["Trip", "REQUESTED → MATCHING → ACCEPTED → ARRIVED → IN_PROGRESS → COMPLETED / CANCELLED", "Every transition is recorded (for billing and disputes)"]]],
      ["steps", [["Find candidates", "The rider's cell plus 1–2 rings of neighbours gives ~10–20 available drivers."], ["Rank by ETA", "Driving time on the road graph with live traffic, not straight-line distance."], ["Offer to the best", "Atomically mark the driver OFFERED, then push the offer to the driver's app."], ["Accept or time out", "Accept → EN_ROUTE. Decline or timeout → back to AVAILABLE, offer to the next candidate."]]]
    ]},
    { h: "ETAs and surge pricing", blocks: [
      ["list", ["<b>ETA:</b> the road network is a graph with edge weights = current travel time per segment, learned from recent GPS traces. Routing uses precomputed shortcuts (contraction hierarchies) so a route is computed in milliseconds.", "<b>Surge:</b> for each cell, compare open requests (demand) with available drivers (supply) over the last few minutes. The multiplier rises with the ratio, is smoothed so prices don't flicker, and is capped. Higher prices also pull nearby drivers toward the hotspot."]]
    ]},
    { h: "Failure modes", blocks: [
      ["table", ["Failure", "Mitigation"], [["A city shard dies", "A standby takes over; the index rebuilds from the next ~4 s of pings (state is ephemeral)"], ["Driver loses signal mid-offer", "The offer times out and goes to the next driver"], ["Double assignment race", "The conditional write on driver state means only one offer can win"], ["Payment service slow", "Trips complete; charges retry asynchronously with idempotency keys"]]]
    ]},
    { h: "Interview follow-ups", blocks: [
      ["list", ["Pooled rides? → match several riders whose routes overlap, which is a harder optimisation.", "Airports with driver queues? → a FIFO queue per airport zone instead of pure nearest-driver.", "Privacy? → coarsen locations shown to riders; restrict history access.", "How do you test matching changes? → replay real ping logs (from Kafka) through the new algorithm offline."]]
    ]}
  ], [
    { q: "Why can a city shard's location index be rebuilt quickly after a crash?", o: ["It's backed up hourly", "Every driver pings every few seconds, so the state refills itself", "It's stored in SQL", "It can't"], a: 1, why: "Ephemeral, constantly refreshed state doesn't need durable storage on the hot path." }
  ]);

  /* ═════════════ TICKETMASTER ═════════════ */
  deep("ticketmaster", [
    { h: "API design for an onsale", blocks: [
      ["img", "Beach-Please-2022-crowd-stage-lights-night-performance.jpg", "Behind every packed show is an onsale where far more fans wanted tickets than there were seats."],
      ["code", "POST /queue/{event_id}/join               → { position, est_wait_s, queue_token }\nGET  /queue/{event_id}/status             → { position, est_wait_s } | { admission_token }   (poll every few s)\nGET  /events/{id}/seatmap                 → cached snapshot: sections + availability counts\nPOST /events/{id}/holds  { seat_ids }     (needs admission_token)\n                                          → 201 { hold_id, expires_at } | 409 { taken: [...], suggestions: [...] }\nPOST /orders  { hold_id, payment }   Idempotency-Key: <uuid>  → 201 { order_id, status }"],
      ["p", "The <b>admission token</b> is a signed, short-lived credential (event, user, expiry) that inventory endpoints check without calling the queue service. That keeps the queue off the critical path once you're in."]
    ]},
    { h: "Inventory data model", blocks: [
      ["table", ["Table", "Columns", "Partitioned by"], [["seats", "event_id, seat_id, section, row, price_tier, status (AVAILABLE / HELD / SOLD), holder_id, hold_expires_at, version", "event_id (and section for huge venues)"], ["holds", "hold_id, user_id, seat_ids, expires_at", "event_id"], ["orders", "order_id, user_id, hold_id, amount, status, idempotency_key", "user_id"]]],
      ["code", "-- atomic hold: succeeds for exactly one fan\nUPDATE seats SET status = 'HELD', holder_id = :user, hold_expires_at = NOW() + INTERVAL 5 MINUTE,\n                 version = version + 1\n WHERE event_id = :e AND seat_id = :s AND status = 'AVAILABLE';\n-- rows affected = 1 → yours.  0 → someone else got it: suggest nearby seats"]
    ]},
    { h: "How the waiting room works", blocks: [
      ["steps", [["Before the onsale", "Fans who arrive early get a token, and when the sale starts they're placed in <b>random order</b>. Arriving at 9:55 or 9:59 gives the same odds, so there's no reason to hammer refresh."], ["During", "Late arrivals join at the back in arrival order. Each fan polls status; the queue only returns positions and estimates, which is cheap and cacheable."], ["Admission control loop", "A controller watches the inventory service (latency, error rate, number of active shoppers) and adjusts the admission rate up or down, like cruise control."], ["Admitted", "The fan receives a signed admission token valid for a few minutes of shopping."]]],
      ["chart", { type: "line", title: "Requests hitting the inventory service at onsale (illustrative)", x: { label: "minutes after 10:00", values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }, y: { label: "requests / s" }, series: [{ name: "Free-for-all", values: [400e3, 380e3, 300e3, 250e3, 200e3, 150e3, 120e3, 90e3, 60e3, 40e3, 30e3] }, { name: "Metered by the waiting room", values: [20e3, 20e3, 20e3, 20e3, 20e3, 20e3, 20e3, 20e3, 20e3, 20e3, 18e3] }], note: "The same fans get served either way. The waiting room flattens the spike into a rate the backend can sustain." }]
    ]},
    { h: "Holds, expiry and checkout", blocks: [
      ["list", ["<b>Expiry:</b> a sweeper (or Redis key expiry events) releases holds whose <code>hold_expires_at</code> has passed, returning seats to AVAILABLE. Reads also treat expired holds as available, so a late sweeper never blocks a sale.", "<b>Checkout:</b> charge with an idempotency key, then in one transaction set the seats to SOLD <i>only if</i> the hold is still yours and unexpired. If the hold expired during a slow payment, refund automatically.", "<b>Seat map reads:</b> served from a snapshot refreshed every couple of seconds. It can be slightly stale, and that's fine, because the atomic hold is the real check."]]
    ]},
    { h: "Fairness and bots", blocks: [
      ["table", ["Defence", "Stops"], [["Pre-registration / verified fans", "Mass fake accounts"], ["Per-account, device and IP rate limits", "Scripts hammering endpoints"], ["Purchase limits per account", "Scalpers buying hundreds of seats"], ["Behavioural signals and challenges", "Headless browsers and automation"], ["Signed, short-lived tokens", "Replaying or sharing queue positions"]]]
    ]},
    { h: "Failure modes", blocks: [
      ["table", ["Failure", "Mitigation"], [["Inventory partition overloaded", "Admission rate drops automatically; bulkheads keep other events unaffected"], ["Payment provider slow", "Holds extended slightly; payments queued and retried idempotently"], ["Queue service down", "Fail closed: nobody bypasses the queue; status served from cache"], ["Double booking", "Prevented structurally by the conditional update; detected by audits"]]],
      ["p", "<span class=\"muted\">A generic, educational design based on public information about ticketing systems, not Ticketmaster's internal architecture.</span>"]
    ]}
  ], [
    { q: "How do inventory servers verify a fan was admitted without calling the queue service?", o: ["They trust the client", "A signed, short-lived admission token they can verify locally", "A shared database lookup per request", "IP allow-lists"], a: 1, why: "Signed tokens move the check off the critical path." }
  ]);

  /* ═════════════ DISCORD ═════════════ */
  deep("discord", [
    { h: "The message table", blocks: [
      ["img", "Gaming PC setup with RGB lighting and plant.jpg", "Discord started with gamers like this, and grew into millions of communities, each with years of searchable chat history."],
      ["code", "CREATE TABLE messages (\n  channel_id bigint,\n  bucket     int,          -- fixed time window derived from the Snowflake timestamp (Discord used ~10 days)\n  message_id bigint,       -- Snowflake: sorts by time\n  author_id  bigint,\n  content    text,\n  PRIMARY KEY ((channel_id, bucket), message_id)\n) WITH CLUSTERING ORDER BY (message_id DESC);\n\n-- latest 50 messages in a channel: one partition, already sorted\nSELECT * FROM messages WHERE channel_id = ? AND bucket = ? LIMIT 50;"],
      ["p", "<b>Scrolling back</b> walks to older buckets: current bucket, then bucket − 1, and so on, until it has 50 messages. Quiet channels may skip several empty buckets; busy ones fill a page from one."]
    ]},
    { h: "Why they left Cassandra", blocks: [
      ["list", ["<b>Garbage-collection pauses</b> on the JVM caused latency spikes, and operators had to restart nodes by hand.", "<b>Hot partitions:</b> one huge server's announcement channel overloaded the nodes holding it, slowing every query on those nodes.", "<b>Compaction backlogs</b> grew, making reads touch more SSTables and get slower."]],
      ["p", "ScyllaDB is Cassandra-compatible but written in C++ (no GC pauses) with a shard-per-core design. Combined with a new data-services layer, Discord reported running on <b>72 nodes instead of 177</b>."],
      ["chart", { type: "bar", title: "p99 message-read latency (Discord, 2023)", data: [["Cassandra (worst of reported range)", 125], ["Cassandra (best of reported range)", 40], ["ScyllaDB + data services", 15]], fmt: "ms", highlight: 2 }]
    ]},
    { h: "Data services: routing and coalescing", blocks: [
      ["steps", [["Route by channel", "API servers send each message query to a data-service instance chosen by consistent hashing on channel_id, so all requests for one channel meet in one place."], ["Coalesce", "If a query for (channel, bucket) is already in flight, new requests subscribe to its result instead of issuing another database query."], ["Answer everyone", "One database read is fanned out to every waiting request, so 100,000 readers cost about one query."]]],
      ["tip", "Coalescing only works because routing puts identical requests on the same instance. Consistent hashing is what makes them meet."]
    ]},
    { h: "The migration", blocks: [
      ["list", ["New writes went to <b>both</b> clusters, so the new one stayed current.", "Historical data was copied by a purpose-built migrator (written in Rust) at millions of messages per second, checkpointed so it could resume.", "Reads switched over once the copy was verified, and the old cluster was retired."]]
    ]},
    { h: "Pitfalls: deletes and tombstones", blocks: [
      ["p", "In an LSM-based store, a delete is a <b>tombstone</b>. A channel where thousands of messages were deleted makes every read scan past all those tombstones until compaction removes them. Keep partitions bounded (time buckets), and watch the tombstone counts on hot partitions."]
    ]},
    { h: "Interview follow-ups", blocks: [
      ["list", ["Search? → a separate inverted-index cluster (Elasticsearch-style), fed by message events.", "Unread counts and mentions? → per-user read-state store updated on view, separate from messages.", "Voice channels? → real-time UDP media servers, a different architecture entirely.", "Edits? → overwrite the row by message_id (same partition), and emit an event for search and caches."]]
    ]}
  ], [
    { q: "Why does request coalescing need consistent-hash routing?", o: ["It doesn't", "Identical requests must land on the same instance to share one in-flight query", "To encrypt data", "To sort messages"], a: 1, why: "If duplicates were spread randomly, each instance would query the DB separately." }
  ]);

  /* ═════════════ STRIPE ═════════════ */
  deep("stripe", [
    { h: "The payment lifecycle", blocks: [
      ["img", "Ingenico iPP350 payment terminal.jpg", "Tap, insert or click \"Pay\": behind each one is a request that must succeed exactly once, even when networks fail."],
      ["table", ["PaymentIntent state", "Meaning"], [["requires_payment_method", "Created; no card attached yet"], ["requires_confirmation", "Card attached; waiting for the merchant or customer to confirm"], ["requires_action", "Extra step needed, e.g. 3-D Secure authentication"], ["processing", "Sent to the card network; result pending"], ["requires_capture", "Authorised; money held but not yet captured"], ["succeeded / canceled", "Final states"]]],
      ["p", "Modelling a payment as an explicit state machine means every retry, webhook and support query can ask \"what state is it in?\" instead of guessing from partial logs."]
    ]},
    { h: "Implementing idempotency keys", blocks: [
      ["code", "idempotency_keys (\n  account_id, key,               -- unique together\n  request_hash,                  -- reject the same key reused with a different body\n  status,                        -- started | finished\n  response_code, response_body,\n  locked_at, created_at          -- kept at least 24 hours\n)\n\nhandle(req):\n  row = insert_if_absent(account, key, hash(req.body), status='started')\n  if row.existed:\n     if row.request_hash != hash(req.body): return error  // key reused with different parameters\n     if row.status == 'started':            return 409  // the original is still running\n     return row.response                                // replay the stored result\n  result = charge(req)                                  // the real side effect, exactly once\n  save(row, status='finished', response=result)\n  return result"],
      ["warn", "Store the key in the <b>same transaction</b> as the charge record, or at least before calling the card network. Otherwise a crash in between can still produce a duplicate."]
    ]},
    { h: "Retries done right", blocks: [
      ["code", "delay(attempt) = random(0, min(cap, base × 2^attempt))      // \"full jitter\"\n// base = 0.5 s, cap = 30 s  →  attempt 1: 0–1 s, 2: 0–2 s, 3: 0–4 s, 4: 0–8 s …\nretry on:      timeouts, connection errors, HTTP 429, 5xx\nnever retry:   HTTP 400 / 401 / 402 (card declined) / 404"],
      ["chart", { type: "line", title: "Retry delay ceiling by attempt", sub: "base 0.5 s, cap 30 s", x: { label: "attempt", values: [1, 2, 3, 4, 5, 6, 7] }, y: { label: "max wait" }, unit: "s", series: [{ name: "Exponential ceiling", values: [1, 2, 4, 8, 16, 30, 30] }, { name: "Fixed 1 s retry", values: [1, 1, 1, 1, 1, 1, 1] }], note: "Full jitter picks a random point under the ceiling, so thousands of clients spread out instead of retrying in sync." }]
    ]},
    { h: "Four kinds of limiter", blocks: [
      ["p", "Stripe has described running four protections in front of its API:"],
      ["table", ["Limiter", "Limits", "Protects against"], [["Request rate limiter", "N requests per second per user (token bucket)", "A client in a runaway loop"], ["Concurrent requests limiter", "How many requests a user can have in flight at once", "Slow, expensive endpoints hogging capacity"], ["Fleet usage load shedder", "Reserves capacity for critical traffic (creating charges)", "Non-critical traffic crowding out payments"], ["Worker utilization load shedder", "Sheds lower-priority traffic when workers are saturated", "Total overload: degrade gracefully instead of falling over"]]]
    ]},
    { h: "The ledger and webhooks", blocks: [
      ["table", ["Entry", "Debit", "Credit"], [["Customer pays $50", "Card network receivable $50", "Merchant balance $48.25, fees $1.75"], ["Payout to the merchant's bank", "Merchant balance $48.25", "Bank settlement $48.25"]]],
      ["p", "<b>Double-entry</b>: every movement is recorded as matching debits and credits, so the books always balance and an error shows up as an imbalance. Entries are never edited, only corrected by new entries."],
      ["p", "<b>Webhooks</b> notify merchants of events. Each delivery is signed (the merchant verifies the signature), retried with backoff for up to about three days until it gets a 2xx, and carries a unique event id, so merchant handlers must be idempotent too."]
    ]},
    { h: "Interview follow-ups", blocks: [
      ["list", ["What if the card network times out? → mark the payment <code>processing</code> and reconcile with the network's records; never guess.", "Refunds? → a new ledger entry and a new idempotent request, never an edit.", "Multi-region? → strongly consistent primary storage for money; replicas for reads.", "Exactly-once webhooks? → impossible over a network. Deliver at-least-once plus idempotent handlers."]]
    ]}
  ], [
    { q: "A client reuses an idempotency key with a different amount. What should the server do?", o: ["Charge the new amount", "Reject it with an error because the request doesn't match the original", "Replay the old response silently", "Delete the key"], a: 1, why: "A key identifies one specific request; a different body is a client bug." },
    { q: "Which errors should a payment client retry?", o: ["402 card declined", "Timeouts, 429 and 5xx", "400 bad request", "All of them"], a: 1, why: "Only transient failures; a decline won't change on retry." }
  ]);
})();
