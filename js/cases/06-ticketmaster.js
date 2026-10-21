/* Blueprint case study — Ticketmaster: Design a Flash-Sale Onsale. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "ticketmaster",
  app: "Ticketmaster",
  icon: "🎟️",
  color: "#026cdf",
  color2: "#4f9dff",
  title: "Design a Flash-Sale Onsale",
  tagline: "Two million fans, fifty thousand seats, one moment: keep it fair, keep it up, and never sell the same seat twice.",
  level: "Advanced",
  minutes: 32,
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
  story: "It's 9:59 a.m. The biggest tour of the year goes on sale at 10:00. You have the page open on your laptop, the app open on your phone, and your friend on a video call doing the same. So do about two million other people. The stadium holds roughly 50,000.<br><br>Most websites get busy gradually. A shop's traffic climbs through the morning and fades at night, and the servers have time to scale up. An onsale is the opposite. Nothing happens, nothing happens, and then at one exact second the whole crowd hits the same button. Engineers call this a <b>synchronised spike</b>, and it's aimed at a <b>tiny, contested inventory</b>: a few tens of thousands of seats that everyone wants at once.<br><br>That creates three problems that pull against each other. <b>Survival</b>: the system has to stay up under traffic many times its normal peak. <b>Correctness</b>: seat 114-F-12 can be sold exactly once, even if two fans click it in the same millisecond. <b>Fairness</b>: the fan who has waited patiently should have a real chance, and a scalper's bot that refreshes 100 times a second should not.<br><br>Here's the uncomfortable truth hiding in those numbers: with 40 fans per seat, 39 out of 40 people will not get a ticket, no matter how good the system is. So the real job isn't \"sell everyone a ticket\". It's \"sell the seats correctly, keep the site up, and treat everyone fairly while you do it\". Let's design that.<br><br><span class=\"muted small\">This lesson is a generic, educational design based on public information about ticketing systems, not a description of Ticketmaster's internal architecture.</span>",
  requirements: {
    functional: ["Browse the event page and the seat map","Pick seats and hold them for a few minutes while you pay","Check out and pay","Fair access when demand is far bigger than supply","Tell waiting fans where they stand and roughly how long it will take"],
    nonFunctional: ["Survive 10–100× normal traffic arriving at a known instant","Never sell the same seat twice","Fairness: being on time beats refreshing fast, and bots don't win","One hot event must not take down every other event on the platform","Charge each fan exactly once, even if their browser retries"]
  },
  estimate: [
    ["Fans at the start of the sale","assumption","2 M"],
    ["Requests / sec if everyone refreshes every 5 s","2M ÷ 5","≈ 400,000 /s"],
    ["Seats available","one stadium show","≈ 50,000"],
    ["Demand : supply","2M ÷ 50k","40 : 1"],
    ["Checkout capacity (example)","assumption","≈ 2,000 shoppers/s"],
    ["Time to admit everyone at that rate","2M ÷ 2,000 /s","≈ 1,000 s, about 17 minutes"]
  ],
  estimateNote: "Read these numbers as a story. Two million people refreshing every five seconds is 400,000 requests a second hitting the system before anyone has bought anything. Meanwhile the part that actually sells seats can, in our example, comfortably handle about 2,000 shoppers a second. That's a 200× gap between what arrives and what the heart of the system can do.<br><br>You can't close that gap by buying 200× more servers for a ten-minute burst, and even if you could, the seat database would still be the bottleneck, because everyone is fighting over the same few rows. The design has to <b>control the flow</b>: let people in at the rate the inventory system can handle, and serve everyone else something cheap in the meantime.<br><br>The last row is also good news. At 2,000 a second, everyone in the crowd could get a turn in under twenty minutes. The seats will usually be gone before then, which is why telling people clearly and early matters so much.",
  naive: {
    title: "\"Open the doors and let everyone click Buy\"",
    desc: "The first design is the obvious one: at 10:00, the Buy button goes live, and every fan's browser talks directly to the inventory service. To buy a seat, the app reads the seat's status, and if it says AVAILABLE, writes SOLD. It's exactly how you'd build a small booking site for a local theatre, and for a local theatre it's fine.",
    breaks: ["<b>The thundering herd.</b> 400,000 requests a second land on a service built for 2,000. Responses slow down, timeouts start, and each timed-out browser retries, often several times. Errors cause retries, retries cause more errors: a <b>retry storm</b> that keeps the system down even after the first wave passes.","<b>The double-booking race.</b> Fan A reads seat 114-F-12: AVAILABLE. Fan B reads it a millisecond later: still AVAILABLE. A writes SOLD. B writes SOLD. Two people now own the same seat, and one of them finds out at the stadium gate.","<b>Fastest finger wins.</b> If the reward goes to whoever hits refresh fastest, people with scripts that refresh 100 times a second beat humans every time. Scalpers buy the seats and resell them at three times the price.","<b>Everyone else suffers too.</b> If all events share the same servers, the mega-onsale slows down the person buying two tickets to a comedy show in another city."]
  },
  steps: [
    {
      t: "Absorb everything static at the edge",
      c: "cdn",
      b: "Start by asking: of those 400,000 requests a second, how many actually need live seat data? Most don't. The event page, the artist photos, the JavaScript for the app, the venue's seat map layout, the FAQ about bag policies: none of that changes during the sale.<br><br>So serve all of it from a <b>CDN</b> (content delivery network): a worldwide network of cache servers that keeps copies of files close to users. The CDN can handle enormous traffic because each edge server answers from memory and there are thousands of them. Your own servers never see those requests.<br><br>You can go further. The seat map's <i>shape</i> is static, and even rough availability (\"Section 114: few left\") can be a snapshot refreshed every couple of seconds and cached too. Only the calls that truly need live, exact inventory, like \"hold this seat for me\", reach the origin. The spike shrinks dramatically before it gets anywhere near the database.<br><br>The cost: cached availability can be a few seconds out of date. A fan might click a seat that turned out to be taken. That's fine, as long as the real check happens later, at the moment of the hold.",
      a: "Hand out printed programmes at the gate, so nobody has to queue at the box office just to ask what time the show starts."
    },
    {
      t: "Put a virtual waiting room in front",
      c: "waiting-room",
      b: "Now the requests that do need the inventory system. The key idea is a <b>virtual waiting room</b>: a queue that sits in front of the shopping experience and lets people in a few at a time.<br><br>Fans who arrive before 10:00 don't get an advantage for arriving at 9:30 versus 9:58. When the sale starts, everyone already waiting is given a <b>randomised position</b> in the queue. That removes the whole reason to hammer refresh. People who arrive after 10:00 join at the back, in order. Each fan sees their place in line and an estimated wait.<br><br>Then a controller lets people out of the queue at the rate the inventory system can actually handle, say 2,000 a second in our example. That's <b>backpressure</b>: the downstream system's capacity sets the pace upstream, instead of the crowd setting the pace and the system collapsing. When a fan's turn comes, they get an <b>admission token</b>, a signed pass that lets them shop for a few minutes.<br><br>The cost: people have to wait, and waiting is stressful when you really want the ticket. The waiting room has to communicate honestly: your position, a realistic estimate, and an early warning when seats are running out, so people aren't left staring at a queue for tickets that no longer exist.",
      a: "A nightclub bouncer. The line can stretch around the block, but the dance floor never gets dangerously packed, and everyone in line can see it moving."
    },
    {
      t: "Hold seats with a timer",
      c: "ttl-lock",
      b: "A fan gets in and picks seat 114-F-12. Should you mark it SOLD right away? No: they haven't paid yet, and maybe their card will be declined, or they'll change their mind. But you also can't leave the seat open while they type their card number, or someone else will grab it.<br><br>So choosing a seat creates a <b>temporary hold</b>: the seat is reserved for this fan for a few minutes, say five. During those five minutes nobody else can take it. If they pay in time, the hold turns into SOLD. If they walk away, close the tab, or their payment fails, the hold simply <b>expires</b> and the seat goes back into the pool for the next fan in line.<br><br>A reservation that expires on its own like this is called a <b>lease</b>, or a TTL lock (TTL means time to live). The expiry is what makes it safe: without it, every abandoned checkout would lock seats forever, and at 40 fans per seat there will be a lot of abandoned checkouts.<br><br>The cost is choosing the timer. Too short and slow payers lose seats halfway through typing their card. Too long and abandoned seats sit idle while thousands of people wait. Real sites show a countdown so fans know exactly how much time they have.",
      a: "A fitting-room tag: the clothes are yours for ten minutes, then the staff put them back on the rack for the next shopper."
    },
    {
      t: "Make the hold atomic",
      c: "optimistic-concurrency",
      b: "The hold solves the waiting-to-pay problem. It doesn't yet solve the double-booking race: two fans clicking the same seat in the same millisecond. If the hold is \"read the seat, check it's AVAILABLE, then write HELD\", there's a gap between the read and the write, and two requests can both slip through it.<br><br>The fix is to make the check and the write a <b>single atomic operation</b>, one indivisible step: <code>set this seat to HELD by me IF its status is AVAILABLE</code>. In a relational database that's a conditional <code>UPDATE … WHERE status = 'AVAILABLE'</code>, and you look at how many rows changed. In Redis it's <code>SET seat:114-F-12 fanA NX PX 300000</code>, which sets the key only if it doesn't already exist, with a 300,000 ms (five minute) expiry.<br><br>Walk through it. Fan A and Fan B both send \"hold 114-F-12\". The database processes them one after the other on that row. A's update finds AVAILABLE and changes it: 1 row affected, A wins. B's update finds HELD: 0 rows affected, so B instantly sees \"just taken, here are some nearby seats\". No locks held while the fan thinks, no double booking, and the loser finds out in milliseconds rather than at the gate.<br><br>This style is called <b>optimistic concurrency</b>: don't lock anything up front, just make the final write conditional and let it fail cleanly if someone beat you. The cost is that on a very popular seat, many requests fail. That's fine here; failing fast and suggesting another seat is exactly what we want.",
      a: "Two hands reach for the last cookie in the jar, and the lid only opens for one of them."
    },
    {
      t: "Checkout safely with idempotency",
      c: "idempotency",
      b: "The fan has a hold and enters their card. They press Pay. The spinner spins... and the connection drops on their phone. Did the payment go through? They don't know, so they press Pay again. Or their browser quietly retries the request. Without care, that's two charges for one ticket, and a very angry fan.<br><br>The fix is an <b>idempotency key</b>: a unique ID, generated once per order attempt, sent along with every payment request. The payment service remembers which keys it has already processed. If the same key arrives a second time, it doesn't charge again; it just returns the result of the first attempt. \"Idempotent\" means doing it twice has the same effect as doing it once.<br><br>Only after the payment succeeds does the seat flip from HELD to SOLD, and that flip is also conditional: it only happens if the hold still belongs to this fan and hasn't expired. If the hold expired during a very slow payment, the system refunds automatically rather than selling a seat someone else now holds.<br><br>The cost: you need to store the keys and their results for a while, and every service in the payment path has to respect them. That's a small price for never double-charging anyone.",
      a: "Pressing the lift button five times still calls one lift."
    },
    {
      t: "Fight bots and isolate hot events",
      c: "rate-limiting",
      b: "Even with a fair queue, scalpers try to cheat: thousands of fake accounts to get thousands of queue positions, scripts that buy faster than any human, or one person sharing a single admission token with friends. A fair design needs defences in layers.<br><br>First, <b>pre-registration</b>. Ticketmaster's <b>Verified Fan</b> is a public example: fans sign up days ahead, and the system screens the sign-ups before handing out access codes. Second, <b>rate limits</b>, caps on how many requests one account, device or IP address can make in a time window, often enforced with a token bucket (each user gets a bucket of tokens that refills slowly; every request spends one). Third, <b>purchase limits</b> per account, so even a successful bot can only buy a few seats. Fourth, behavioural signals that tell real browsers from automation.<br><br>Then there's isolation. If every event shares the same inventory servers, the mega-onsale can slow down the comedy show next door. So inventory is <b>partitioned by event</b>: each event's seats live in their own partition, often on their own resources. This is the <b>bulkhead</b> pattern, named after the walls in a ship that stop one flooded compartment from sinking the whole ship.<br><br>The cost: every defence has false positives. A strict rate limit can block a real fan on a shared university network. Tuning these is a constant balancing act.",
      a: "Wristbands checked at the door, a limit of four drinks per person at the bar, and fire doors between the stadium's rush and the theatre next door."
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
      pro: "Protects the backend, removes the refresh race, and makes load predictable",
      con: "Fans have to wait, and a badly explained queue feels unfair even when it isn't"
    },
    {
      choice: "Short hold timer",
      pro: "Abandoned seats come back quickly for the next fan in line",
      con: "Slow payers can lose seats mid-checkout; the timer needs careful tuning"
    },
    {
      choice: "Strong consistency on inventory",
      pro: "A seat is never sold twice",
      con: "Popular rows become hot spots of contention, so inventory must be partitioned"
    },
    {
      choice: "Cached, slightly stale seat maps",
      pro: "The CDN absorbs nearly all map traffic",
      con: "Fans sometimes click a seat that was taken a second ago and must pick again"
    },
    {
      choice: "Strict bot defences",
      pro: "More seats go to real fans, fewer to scalpers",
      con: "False positives block some real fans, and every check adds friction"
    }
  ],
  takeaways: ["When demand is far bigger than supply, controlling who gets in, and how fast, matters more than raw capacity.","Scarce resources need atomic reservations that expire on their own.","Push everything that doesn't need live data to the edge, so the spike shrinks before it reaches you.","Fairness is a system property. You design it in with randomised queues, verification and rate limits.","Make every retry safe: conditional writes for seats, idempotency keys for payments."],
  quiz: [
    {
      q: "Two fans click the same seat in the same millisecond. What guarantees only one gets it?",
      o: ["A faster database","An atomic conditional write (e.g. SET NX / UPDATE … WHERE status='AVAILABLE')","Reading the seat twice","A CDN"],
      a: 1,
      why: "The check and the write happen as one operation, so exactly one succeeds."
    },
    {
      q: "Why randomise queue positions for fans who arrive before the onsale?",
      o: ["To confuse bots","It removes the incentive to hammer refresh at 9:59:59","Databases prefer random","To sell more tickets"],
      a: 1,
      why: "If everyone who's early is treated equally, mashing refresh doesn't help."
    },
    {
      q: "Why do seat holds have a TTL?",
      o: ["To annoy users","So abandoned holds return seats to inventory automatically","Because Redis requires it","To speed up payment"],
      a: 1,
      why: "Without expiry, every abandoned checkout would lock seats forever."
    },
    {
      q: "What does the waiting room primarily provide?",
      o: ["Caching","Backpressure: admission at a rate the system can sustain","Encryption","Analytics"],
      a: 1,
      why: "It turns an uncontrolled spike into a steady, survivable flow."
    },
    {
      q: "How do inventory servers verify a fan was admitted without calling the queue service?",
      o: ["They trust the client","A signed, short-lived admission token they can verify locally","A shared database lookup per request","IP allow-lists"],
      a: 1,
      why: "Signed tokens move the check off the critical path."
    },
    {
      q: "A fan's phone drops the connection after pressing Pay, and the app retries. What prevents a double charge?",
      o: ["Asking the fan to wait","An idempotency key sent with both attempts","A longer seat hold","The CDN"],
      a: 1,
      why: "The payment service sees the same key twice and returns the first result instead of charging again."
    },
    {
      q: "Why partition inventory by event?",
      o: ["To make seat maps prettier","So one huge onsale can't slow down or crash sales for every other event","Because payment providers require it","To randomise the queue"],
      a: 1,
      why: "Bulkheads keep a hot event's load in its own partition."
    },
    {
      q: "The seat map shows a seat as free, but the hold fails. Is that a bug?",
      o: ["Yes, the map must always be exact","No: the map is a cached snapshot, and the atomic hold is the real check","Yes, the CDN is broken","No, because holds always fail first"],
      a: 1,
      why: "Serving a slightly stale map from cache is a deliberate trade-off; correctness lives in the conditional write."
    }
  ],
  sources: ["Ticketmaster statement on the Nov 2022 presale (3.5B system requests, 4× prior peak)","Public descriptions of Verified Fan and virtual queues","Generic reservation / lease patterns"],
  deep: [
    {
      h: "API design for an onsale",
      blocks: [
        ["img","Beach-Please-2022-crowd-stage-lights-night-performance.jpg","Behind every packed show is an onsale where far more fans wanted tickets than there were seats."],
        ["p","Here's a sketch of the API a fan's app would use, from joining the queue to paying. Notice how the expensive, contested operations (holds and orders) sit behind a token, and the cheap ones (queue status, seat map) can be cached."],
        ["code","POST /queue/{event_id}/join               → { position, est_wait_s, queue_token }\nGET  /queue/{event_id}/status             → { position, est_wait_s } | { admission_token }   (poll every few s)\nGET  /events/{id}/seatmap                 → cached snapshot: sections + availability counts\nPOST /events/{id}/holds  { seat_ids }     (needs admission_token)\n                                          → 201 { hold_id, expires_at } | 409 { taken: [...], suggestions: [...] }\nPOST /orders  { hold_id, payment }   Idempotency-Key: <uuid>  → 201 { order_id, status }"],
        ["p","The <b>admission token</b> is a signed, short-lived credential (event, user, expiry) that inventory endpoints check without calling the queue service. That keeps the queue off the critical path once you're in."],
        ["p","\"Signed\" means the waiting room stamps the token with a cryptographic signature using a secret key. Any inventory server that knows the matching key can check the stamp in microseconds, locally, without asking anyone. A fan can't forge a token or change its expiry, because the signature would no longer match. And the 409 response is worth copying in your own designs: it doesn't just say \"no\", it suggests nearby seats, which turns a disappointment into a next step."]
      ]
    },
    {
      h: "Inventory data model",
      blocks: [
        ["p","Three tables carry the whole sale. The seats table is the hot one: every hold and every sale is a write to a row in it."],
        ["table",["Table","Columns","Partitioned by"],[["seats","event_id, seat_id, section, row, price_tier, status (AVAILABLE / HELD / SOLD), holder_id, hold_expires_at, version","event_id (and section for huge venues)"],["holds","hold_id, user_id, seat_ids, expires_at","event_id"],["orders","order_id, user_id, hold_id, amount, status, idempotency_key","user_id"]]],
        ["code","-- atomic hold: succeeds for exactly one fan\nUPDATE seats SET status = 'HELD', holder_id = :user, hold_expires_at = NOW() + INTERVAL 5 MINUTE,\n                 version = version + 1\n WHERE event_id = :e AND seat_id = :s AND status = 'AVAILABLE';\n-- rows affected = 1 → yours.  0 → someone else got it: suggest nearby seats"],
        ["p","Why partition seats by <code>event_id</code>? Because every query during a sale is about one event, so keeping an event's seats together makes each hold a local operation. For a 50,000-seat stadium, splitting further by section spreads the hot rows across more machines, so the front-row sections don't all fight on one server. The <code>version</code> column is a counter that goes up on every change; it lets other parts of the system notice that a row changed under them."],
        ["warn","Holding several seats at once (four seats together for a group) must be all-or-nothing. If you get three of four, release the three. Otherwise the system fills up with odd single seats nobody wants."]
      ]
    },
    {
      h: "How the waiting room works",
      blocks: [
        ["steps",[["Before the onsale","Fans who arrive early get a token, and when the sale starts they're placed in <b>random order</b>. Arriving at 9:55 or 9:59 gives the same odds, so there's no reason to hammer refresh."],["During","Late arrivals join at the back in arrival order. Each fan polls status; the queue only returns positions and estimates, which is cheap and cacheable."],["Admission control loop","A controller watches the inventory service (latency, error rate, number of active shoppers) and adjusts the admission rate up or down, like cruise control."],["Admitted","The fan receives a signed admission token valid for a few minutes of shopping."]]],
        ["chart",{"type":"line","title":"Requests hitting the inventory service at onsale (illustrative)","x":{"label":"minutes after 10:00","values":[0,1,2,3,4,5,6,7,8,9,10]},"y":{"label":"requests / s"},"series":[{"name":"Free-for-all","values":[400000,380000,300000,250000,200000,150000,120000,90000,60000,40000,30000]},{"name":"Metered by the waiting room","values":[20000,20000,20000,20000,20000,20000,20000,20000,20000,20000,18000]}],"note":"The same fans get served either way. The waiting room flattens the spike into a rate the backend can sustain."}],
        ["p","The waiting room itself has to survive two million fans polling it. That's possible because its job is so simple: \"what's my position?\" is a lookup of a number, and the answer can be computed from a counter (\"we've admitted up to position 412,000\") that changes a few times a second. Much of it can even be served from the edge."],
        ["analogy","The admission controller is like cruise control on a car. It doesn't floor the accelerator when the road is clear and slam the brakes on a hill. It watches the speed, here the inventory service's response time and error rate, and nudges the admission rate gently up or down."]
      ]
    },
    {
      h: "Holds, expiry and checkout",
      blocks: [
        ["list",["<b>Expiry:</b> a sweeper (or Redis key expiry events) releases holds whose <code>hold_expires_at</code> has passed, returning seats to AVAILABLE. Reads also treat expired holds as available, so a late sweeper never blocks a sale.","<b>Checkout:</b> charge with an idempotency key, then in one transaction set the seats to SOLD <i>only if</i> the hold is still yours and unexpired. If the hold expired during a slow payment, refund automatically.","<b>Seat map reads:</b> served from a snapshot refreshed every couple of seconds. It can be slightly stale, and that's fine, because the atomic hold is the real check."]],
        ["p","That middle bullet hides a subtle race worth walking through. Fan A's hold expires at 10:05:00. Their payment is slow and succeeds at 10:05:02. Meanwhile at 10:05:01 Fan B grabbed the now-free seat. The final \"set SOLD only if the hold is still mine\" check fails for A, so A gets an automatic refund and an apology, and B keeps the seat. Annoying for A, but correct: the alternative is two people with the same seat."]
      ]
    },
    {
      h: "What happens at 10:00:00",
      blocks: [
        ["p","Let's replay the onsale minute by minute, with made-up but realistic numbers."],
        ["steps",[["9:30–9:59","Fans load the event page from the CDN and join the waiting room. 1.6 million are already waiting by 10:00."],["10:00:00","The queue shuffles those 1.6 million into random order. Another 400,000 arrive in the next few minutes and join the back."],["10:00–10:01","The controller admits 2,000 fans a second. Each gets an admission token and a few minutes to shop. The inventory service is busy but comfortable."],["10:01–10:20","Holds are created, some expire, seats recycle. The cached seat map shows sections turning from green to red."],["About 10:25","Every seat is held or sold. The waiting room switches its message to \"sold out\" so the remaining fans can stop waiting, and offers a waitlist or resale option."]]],
        ["p","In this story, roughly one in forty fans got a ticket, which is exactly what the 40:1 ratio predicted. The system's job was never to change that ratio. It was to keep the site up, sell every seat exactly once, and make the line fair."]
      ]
    },
    {
      h: "Fairness and bots",
      blocks: [
        ["table",["Defence","Stops"],[["Pre-registration / verified fans","Mass fake accounts"],["Per-account, device and IP rate limits","Scripts hammering endpoints"],["Purchase limits per account","Scalpers buying hundreds of seats"],["Behavioural signals and challenges","Headless browsers and automation"],["Signed, short-lived tokens","Replaying or sharing queue positions"]]],
        ["p","No single defence is enough. Bots adapt: when IPs are rate-limited, they rent thousands of IPs; when accounts are limited, they create thousands of accounts. Layering defences raises the cost of cheating at every step, which is the realistic goal. You can't make bots impossible, only expensive."],
        ["p","A <b>headless browser</b>, by the way, is a real web browser driven by a script with no screen attached. It runs JavaScript like a human's browser does, which is why simple checks don't catch it and behavioural signals (mouse movement, timing, device consistency) are needed."]
      ]
    },
    {
      h: "Failure modes",
      blocks: [
        ["table",["Failure","Mitigation"],[["Inventory partition overloaded","Admission rate drops automatically; bulkheads keep other events unaffected"],["Payment provider slow","Holds extended slightly; payments queued and retried idempotently"],["Queue service down","Fail closed: nobody bypasses the queue; status served from cache"],["Double booking","Prevented structurally by the conditional update; detected by audits"]]],
        ["p","\"Fail closed\" means that when something breaks, the system defaults to the safe choice, here \"nobody gets in\", rather than the open choice, \"everyone gets in\". Letting two million people bypass a broken queue would turn a short outage into the thundering herd we started with."],
        ["p","<span class=\"muted\">A generic, educational design based on public information about ticketing systems, not Ticketmaster's internal architecture.</span>"]
      ]
    },
    {
      h: "A real-world reminder: the 2022 presale",
      blocks: [
        ["p","In November 2022, a presale for one of the most anticipated tours in years drew far more traffic than expected. Ticketmaster said publicly that the site received about <b>3.5 billion system requests</b> that day, around <b>four times its previous peak</b>, and that bots and fans without presale codes added a lot of that load. Many fans waited for hours or hit errors, and the event became a widely discussed example of what flash-sale demand looks like."],
        ["p","For a system designer, the lesson is that demand forecasts for onsales can be wrong by multiples, not percentages. That's why the levers in this design are about <b>control</b> (admission rate, verification, purchase limits) rather than only about capacity. You can't always buy enough servers for a surprise, but you can always choose to let people in more slowly."]
      ]
    },
    {
      h: "Interview corner: presenting this in 45 minutes",
      blocks: [
        ["steps",[["Minutes 0–5: requirements","Ask about seat selection versus general admission, expected demand versus supply, and whether bots are in scope. Agree that correctness (no double booking) and survival are must-haves."],["Minutes 5–10: estimate","2M fans refreshing every 5 s = 400k requests a second, versus checkout capacity of about 2,000 a second. Conclude that you need admission control, not just more servers."],["Minutes 10–20: edge and waiting room","CDN for static and cached data, randomised queue for early arrivals, controlled admission, signed tokens."],["Minutes 20–30: holds and atomicity","Seat state machine (AVAILABLE → HELD → SOLD), the conditional update, expiry and recycling."],["Minutes 30–40: checkout and fairness","Idempotent payments, the expired-hold race, bot defences, partitioning by event."],["Minutes 40–45: follow-ups","General admission tickets (a counter instead of seats), resale, waitlists, and how you'd load-test an onsale before the real one."]]],
        ["tip","For general-admission standing tickets there are no individual seats, just a count. The hold becomes an atomic decrement: \"reduce remaining by 2 if remaining ≥ 2\". Same idea, simpler data. Interviewers like to see you notice that."]
      ]
    }
  ]
});
