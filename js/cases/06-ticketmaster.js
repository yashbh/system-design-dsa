/* Blueprint case study — Ticketmaster: Design a Flash-Sale Onsale. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "ticketmaster",
  app: "Ticketmaster",
  icon: "🎟️",
  color: "#026cdf",
  color2: "#4f9dff",
  title: "Design a Flash-Sale Onsale",
  tagline: "Millions of fans, tens of thousands of seats, one moment: keep it fair, keep it up, and never sell a seat twice.",
  level: "Advanced",
  minutes: 31,
  concepts: ["waiting-room","ttl-lock","optimistic-concurrency","idempotency","rate-limiting","hot-key","cdn"],
  stats: [
    {
      v: 3.5,
      d: 1,
      suf: "B",
      label: "system requests in one 2022 presale day (Ticketmaster statement)",
      kind: "Reported"
    },
    {v: 4,suf: "×",label: "the platform's previous peak (same statement)",kind: "Reported"},
    {v: 40,suf: ":1",label: "fans per seat in our example",kind: "Estimate"}
  ],
  story: "At 10:00:00 the tickets for the biggest tour of the year go on sale. A stadium holds about 50,000 people, and two million fans are staring at the same button.<br><br>This is the hardest kind of traffic: a <b>synchronized spike</b> aimed at a <b>tiny, contested inventory</b>. Every design choice here balances survival, fairness and correctness.<br><br><span class=\"muted small\">This lesson is a generic, educational design based on public information about ticketing systems, not a description of Ticketmaster's internal architecture.</span>",
  requirements: {
    functional: ["Browse event and seat map","Pick seats and hold them while paying","Checkout and payment","Fair access when demand ≫ supply"],
    nonFunctional: ["Survive 10–100× normal traffic at a known instant","Never sell the same seat twice","Fairness: arriving early beats refreshing fast; bots don't win","One hot event must not take down every other event"]
  },
  estimate: [
    ["Fans at T0","assumption","2 M"],
    ["Requests / sec if everyone refreshes every 5 s","2M ÷ 5","≈ 400,000 /s"],
    ["Seats available","one stadium show","≈ 50,000"],
    ["Demand : supply","2M ÷ 50k","40 : 1"],
    ["Checkout capacity (example)","assumption","≈ 2,000 shoppers/s"]
  ],
  estimateNote: "Insight: most of these fans can't get a ticket no matter what. The goal is to tell them gracefully and fairly, and protect the inventory path for the ones who can.",
  naive: {
    title: "\"Open the doors and let everyone click Buy\"",
    desc: "At 10:00, every fan hits the inventory API directly; the app reads seat status then writes SOLD.",
    breaks: ["Synchronized retries (a thundering herd) push the backend past capacity. Errors trigger more retries, a retry storm.","Read-then-write race: two fans both read \"available\" and both write \"sold\", so the seat is double-booked.","Fastest-refresh wins, which rewards bots and scripts over real fans."]
  },
  steps: [
    {
      t: "Absorb everything static at the edge",
      c: "cdn",
      b: "Event pages, images, JavaScript and even pre-rendered seat-map layouts are served from the <b>CDN</b>. Only the calls that truly need live inventory reach your origin, so the spike shrinks before it arrives.",
      a: "Hand out printed programs at the gate so nobody needs to ask the box office what's playing."
    },
    {
      t: "Put a virtual waiting room in front",
      c: "waiting-room",
      b: "Fans who arrive before the onsale get a <b>randomized queue position</b>, which removes the refresh race. Users are then <b>admitted at the rate the inventory system can handle</b>, while the rest see their position and an estimated wait. This is backpressure applied at the front door.",
      a: "A nightclub bouncer: the line can stretch around the block, but the dance floor never gets dangerously packed."
    },
    {
      t: "Hold seats with a timer",
      c: "ttl-lock",
      b: "Choosing a seat creates a <b>temporary hold</b> (for example a few minutes) instead of selling it. If you pay in time, the hold becomes SOLD; if you leave, the hold <b>expires</b> and the seat goes back into inventory for the next fan.",
      a: "A fitting-room tag: the clothes are yours for ten minutes, then they go back on the rack."
    },
    {
      t: "Make the hold atomic",
      c: "optimistic-concurrency",
      b: "The hold is a single <b>conditional write</b>: <code>set HELD by me IF status = AVAILABLE</code> (a DB conditional update, or Redis <code>SET NX PX</code>). Two fans can click the same seat in the same millisecond, but exactly one wins and the other instantly gets \"just taken, pick another\".",
      a: "Two hands reach for the last cookie, and the jar lid only opens for one."
    },
    {
      t: "Checkout safely with idempotency",
      c: "idempotency",
      b: "Payment calls carry an <b>idempotency key</b> (one per order attempt). If the network hiccups and the browser retries, the fan is charged once. Only after payment succeeds does the seat flip HELD → SOLD.",
      a: "Pressing the elevator button five times still calls one elevator."
    },
    {
      t: "Fight bots and isolate hot events",
      c: "rate-limiting",
      b: "Pre-registration (Ticketmaster's <b>Verified Fan</b> is a public example), <b>rate limits</b> per account, device and IP, and behavioral bot detection keep scripts out of line. Inventory is <b>partitioned by event</b> (bulkheads) so one mega-onsale can't starve every other show.",
      a: "Wristbands checked at the door, and the stadium's rush doesn't close the theatre next door."
    }
  ],
  diagram: {
    nodes: [
      {
        id: "f",
        x: 80,
        y: 230,
        label: "2M fans",
        sub: "browsers & apps",
        kind: "client",
        icon: "🧑‍🤝‍🧑",
        desc: "All arrive at once. Some are bots."
      },
      {
        id: "cdn",
        x: 250,
        y: 90,
        label: "CDN",
        sub: "pages, maps, JS",
        kind: "edge",
        icon: "🌍",
        desc: "Serves everything static so the origin only sees inventory calls."
      },
      {
        id: "wr",
        x: 250,
        y: 360,
        label: "Waiting Room",
        sub: "randomize & meter",
        kind: "edge",
        icon: "🚦",
        desc: "Assigns queue positions, admits at a controlled rate, issues signed admission tokens."
      },
      {
        id: "bot",
        x: 440,
        y: 360,
        label: "Bot / Rate Limiter",
        sub: "per account/IP",
        kind: "service",
        icon: "🛡️",
        desc: "Token buckets and risk scoring drop abusive traffic."
      },
      {
        id: "inv",
        x: 640,
        y: 230,
        label: "Inventory Service",
        sub: "partitioned by event",
        kind: "service",
        icon: "🎟️",
        desc: "Atomic seat holds with TTL; release on expiry."
      },
      {
        id: "lock",
        x: 860,
        y: 110,
        label: "Seat Holds",
        sub: "SET NX + TTL",
        kind: "cache",
        icon: "⏱️",
        desc: "seat → holder with expiry. Atomic compare-and-set."
      },
      {
        id: "db",
        x: 860,
        y: 350,
        label: "Orders DB",
        sub: "source of truth",
        kind: "db",
        icon: "🗄️",
        desc: "Durable orders; SOLD written transactionally after payment."
      },
      {
        id: "pay",
        x: 640,
        y: 400,
        label: "Payments",
        sub: "idempotent",
        kind: "external",
        icon: "💳",
        desc: "Charged with an idempotency key; retries are safe."
      }
    ],
    flows: [
      {
        name: "Fan buys a seat",
        steps: [
          ["f","cdn","Load event page (cached)"],
          ["f","wr","Join queue → position #18,204"],
          ["wr","bot","Admitted: signed token, risk check passes"],
          ["bot","inv","Hold seat 114-F-12"],
          ["inv","lock","SET NX seat 114-F-12 (5 min TTL) → OK"],
          ["inv","pay","Charge with Idempotency-Key"],
          ["inv","db","Order SOLD (transaction)"]
        ]
      },
      {
        name: "Two fans, one seat",
        steps: [
          ["bot","inv","Fan A: hold 114-F-12"],
          ["inv","lock","SET NX → OK (A wins)"],
          ["bot","inv","Fan B: hold 114-F-12 (same ms)"],
          ["inv","lock","SET NX → FAIL (already held)"],
          ["inv","bot","B: \"Just taken, here are nearby seats\""]
        ]
      }
    ]
  },
  lab: {
    sim: "onsale",
    title: "Onsale Simulator",
    hint: "Run the same onsale twice: once as a free-for-all, once with a waiting room and atomic holds. Watch server load, errors, double-bookings and released holds."
  },
  tradeoffs: [
    {
      choice: "Waiting room",
      pro: "Protects backend; fair; predictable",
      con: "Users wait; must communicate clearly"
    },
    {
      choice: "Short hold TTL",
      pro: "Abandoned seats recycle quickly",
      con: "Slow payers lose seats; tune carefully"
    },
    {
      choice: "Strong consistency on inventory",
      pro: "Never oversell",
      con: "Contention on hot rows; needs partitioning"
    }
  ],
  takeaways: ["When demand ≫ supply, controlling admission matters more than raw capacity.","Scarce resources need atomic, expiring reservations.","Fairness is a system property: design it in (randomize, verify, rate-limit)."],
  quiz: [
    {
      q: "Two fans click the same seat in the same millisecond. What guarantees only one gets it?",
      o: ["A faster database","An atomic conditional write (e.g. SET NX / UPDATE … WHERE status='AVAILABLE')","Reading the seat twice","A CDN"],
      a: 1,
      why: "The check and the write happen as one operation, so exactly one succeeds."
    },
    {
      q: "Why randomize queue positions for fans who arrive before the onsale?",
      o: ["To confuse bots","It removes the incentive to hammer refresh at 9:59:59","Databases prefer random","To sell more tickets"],
      a: 1,
      why: "If everyone who's early is treated equally, mashing refresh doesn't help."
    },
    {
      q: "Why do seat holds have a TTL?",
      o: ["To annoy users","So abandoned holds return seats to inventory automatically","Because Redis requires it","To speed up payment"],
      a: 1,
      why: "Without expiry, every abandoned cart would lock seats forever."
    },
    {
      q: "What does the waiting room primarily provide?",
      o: ["Caching","Backpressure: admission at a rate the system can sustain","Encryption","Analytics"],
      a: 1,
      why: "It converts an uncontrolled spike into a steady, survivable flow."
    },
    {
      q: "How do inventory servers verify a fan was admitted without calling the queue service?",
      o: ["They trust the client","A signed, short-lived admission token they can verify locally","A shared database lookup per request","IP allow-lists"],
      a: 1,
      why: "Signed tokens move the check off the critical path."
    }
  ],
  sources: ["Ticketmaster statement on the Nov 2022 presale (3.5B system requests, 4× prior peak)","Public descriptions of Verified Fan and virtual queues","Generic reservation / lease patterns"],
  deep: [
    {
      h: "API design for an onsale",
      blocks: [
        ["img","Beach-Please-2022-crowd-stage-lights-night-performance.jpg","Behind every packed show is an onsale where far more fans wanted tickets than there were seats."],
        ["code","POST /queue/{event_id}/join               → { position, est_wait_s, queue_token }\nGET  /queue/{event_id}/status             → { position, est_wait_s } | { admission_token }   (poll every few s)\nGET  /events/{id}/seatmap                 → cached snapshot: sections + availability counts\nPOST /events/{id}/holds  { seat_ids }     (needs admission_token)\n                                          → 201 { hold_id, expires_at } | 409 { taken: [...], suggestions: [...] }\nPOST /orders  { hold_id, payment }   Idempotency-Key: <uuid>  → 201 { order_id, status }"],
        ["p","The <b>admission token</b> is a signed, short-lived credential (event, user, expiry) that inventory endpoints check without calling the queue service. That keeps the queue off the critical path once you're in."]
      ]
    },
    {
      h: "Inventory data model",
      blocks: [
        ["table",["Table","Columns","Partitioned by"],[["seats","event_id, seat_id, section, row, price_tier, status (AVAILABLE / HELD / SOLD), holder_id, hold_expires_at, version","event_id (and section for huge venues)"],["holds","hold_id, user_id, seat_ids, expires_at","event_id"],["orders","order_id, user_id, hold_id, amount, status, idempotency_key","user_id"]]],
        ["code","-- atomic hold: succeeds for exactly one fan\nUPDATE seats SET status = 'HELD', holder_id = :user, hold_expires_at = NOW() + INTERVAL 5 MINUTE,\n                 version = version + 1\n WHERE event_id = :e AND seat_id = :s AND status = 'AVAILABLE';\n-- rows affected = 1 → yours.  0 → someone else got it: suggest nearby seats"]
      ]
    },
    {
      h: "How the waiting room works",
      blocks: [
        ["steps",[["Before the onsale","Fans who arrive early get a token, and when the sale starts they're placed in <b>random order</b>. Arriving at 9:55 or 9:59 gives the same odds, so there's no reason to hammer refresh."],["During","Late arrivals join at the back in arrival order. Each fan polls status; the queue only returns positions and estimates, which is cheap and cacheable."],["Admission control loop","A controller watches the inventory service (latency, error rate, number of active shoppers) and adjusts the admission rate up or down, like cruise control."],["Admitted","The fan receives a signed admission token valid for a few minutes of shopping."]]],
        ["chart",{"type":"line","title":"Requests hitting the inventory service at onsale (illustrative)","x":{"label":"minutes after 10:00","values":[0,1,2,3,4,5,6,7,8,9,10]},"y":{"label":"requests / s"},"series":[{"name":"Free-for-all","values":[400000,380000,300000,250000,200000,150000,120000,90000,60000,40000,30000]},{"name":"Metered by the waiting room","values":[20000,20000,20000,20000,20000,20000,20000,20000,20000,20000,18000]}],"note":"The same fans get served either way. The waiting room flattens the spike into a rate the backend can sustain."}]
      ]
    },
    {
      h: "Holds, expiry and checkout",
      blocks: [
        ["list",["<b>Expiry:</b> a sweeper (or Redis key expiry events) releases holds whose <code>hold_expires_at</code> has passed, returning seats to AVAILABLE. Reads also treat expired holds as available, so a late sweeper never blocks a sale.","<b>Checkout:</b> charge with an idempotency key, then in one transaction set the seats to SOLD <i>only if</i> the hold is still yours and unexpired. If the hold expired during a slow payment, refund automatically.","<b>Seat map reads:</b> served from a snapshot refreshed every couple of seconds. It can be slightly stale, and that's fine, because the atomic hold is the real check."]]
      ]
    },
    {
      h: "Fairness and bots",
      blocks: [
        ["table",["Defence","Stops"],[["Pre-registration / verified fans","Mass fake accounts"],["Per-account, device and IP rate limits","Scripts hammering endpoints"],["Purchase limits per account","Scalpers buying hundreds of seats"],["Behavioural signals and challenges","Headless browsers and automation"],["Signed, short-lived tokens","Replaying or sharing queue positions"]]]
      ]
    },
    {
      h: "Failure modes",
      blocks: [
        ["table",["Failure","Mitigation"],[["Inventory partition overloaded","Admission rate drops automatically; bulkheads keep other events unaffected"],["Payment provider slow","Holds extended slightly; payments queued and retried idempotently"],["Queue service down","Fail closed: nobody bypasses the queue; status served from cache"],["Double booking","Prevented structurally by the conditional update; detected by audits"]]],
        ["p","<span class=\"muted\">A generic, educational design based on public information about ticketing systems, not Ticketmaster's internal architecture.</span>"]
      ]
    }
  ]
});
