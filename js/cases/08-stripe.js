/* Blueprint case study — Stripe: Design a Reliable Payments API. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "stripe",
  app: "Stripe",
  icon: "💳",
  color: "#635bff",
  color2: "#00d4ff",
  title: "Design a Reliable Payments API",
  tagline: "Networks fail mid-request. Make sure a customer is charged exactly once, every time.",
  level: "Intermediate",
  minutes: 28,
  concepts: ["idempotency","rate-limiting","backoff","acks","optimistic-concurrency","replication"],
  stats: [
    {
      v: 1.4,
      d: 1,
      pre: "$",
      suf: "T",
      label: "total payment volume in 2024 (Stripe annual letter)",
      kind: "Reported"
    },
    {v: 99.999,d: 3,suf: "%",label: "API uptime target",kind: "Reported"},
    {v: 1,suf: "×",label: "times a customer should be charged",kind: "Requirement"}
  ],
  story: "A customer taps <b>Pay $49.99</b>. Your server calls the payments API… and the connection times out. Did the charge go through? If you retry, you might charge them twice. If you don't, you might lose the sale.<br><br>This is one of the most common real-world distributed-systems bugs. Stripe's API is a well-known example of the fix: <b>idempotency keys</b>, <b>retries with backoff and jitter</b>, and <b>rate limiting</b> to keep everyone safe.",
  requirements: {
    functional: ["Create charges / payment intents","Refunds","Webhooks to notify merchants of events","Per-account limits and API keys"],
    nonFunctional: ["Correctness above all: no double charges, no lost money","Very high availability","Safe for clients to retry anything","Protect the platform from runaway clients"]
  },
  estimate: [
    ["API requests / sec","assumption","10,000"],
    ["Timeout / ambiguous rate","assumption","0.1%"],
    ["Ambiguous payments / sec","10,000 × 0.001","≈ 10 /s"],
    ["Per day","10 × 86,400","≈ 864,000 maybes"]
  ],
  estimateNote: "Insight: even a tiny failure rate at scale creates nearly a million \"did it charge?\" moments a day. Retries must be safe by design, not by luck.",
  naive: {
    title: "\"Just retry on timeout\"",
    desc: "If POST /charge times out, call it again.",
    breaks: ["The first request may have succeeded and only the response was lost, so the retry charges a second time.","Thousands of clients retrying in sync after an outage hammer the recovering service (a thundering herd).","One buggy client in a tight retry loop can degrade the API for everyone."]
  },
  steps: [
    {
      t: "Attach an idempotency key",
      c: "idempotency",
      b: "The client generates a unique key per logical operation (for example per checkout attempt) and sends it with the request: <code>Idempotency-Key: 7f3c…</code>. The same key on a retry means \"this is the same request\".",
      a: "Writing a check number on every check: the bank won't cash #1042 twice."
    },
    {
      t: "Server: store key → result atomically",
      c: "optimistic-concurrency",
      b: "On first sight of a key, the server records it (in the same transaction as the charge, or with a lock) and stores the final response. A retry with the same key <b>returns the stored response</b> instead of executing again. A concurrent duplicate waits or gets a conflict error.",
      a: "A coat check: the second time you hand over ticket #42 you get the same coat, not a new one."
    },
    {
      t: "Retry with exponential backoff + jitter",
      c: "backoff",
      b: "Retry only on safe signals (timeouts, 5xx, 429), waiting <code>base × 2^attempt</code> with <b>randomness</b>. Jitter spreads retries out so a recovering service isn't hit by synchronized waves.",
      a: "After a crowded door jams, people trying again at random moments get through faster than everyone pushing on \"3, 2, 1\"."
    },
    {
      t: "Rate limit with token buckets",
      c: "rate-limiting",
      b: "Stripe has written publicly about using <b>token bucket</b> rate limiters (backed by Redis) per user, plus <b>load shedders</b> that drop low-priority traffic when the system is stressed, so critical requests like charges survive.",
      a: "A cup of arcade tokens: spend a handful in a burst, but refills come one per second."
    },
    {
      t: "Keep a ledger, and reconcile",
      c: "replication",
      b: "Money movement is recorded in an append-only, <b>double-entry ledger</b> in strongly consistent, replicated storage. Background jobs reconcile with banks and card networks so any mismatch is detected and fixed.",
      a: "Accountants never erase lines; they add correcting entries and balance the books every night."
    },
    {
      t: "Deliver webhooks at least once",
      c: "acks",
      b: "Merchants learn about events (payment succeeded, refund issued) via <b>webhooks</b>, retried with backoff until acknowledged. Each event has a unique ID, so merchants must handle them idempotently too. Idempotency is needed in both directions.",
      a: "A courier who keeps coming back until someone signs for the parcel."
    }
  ],
  diagram: {
    nodes: [
      {
        id: "m",
        x: 90,
        y: 230,
        label: "Merchant server",
        sub: "Stripe client lib",
        kind: "client",
        icon: "🏪",
        desc: "Generates idempotency keys and retries with backoff."
      },
      {
        id: "edge",
        x: 290,
        y: 230,
        label: "API Edge",
        sub: "auth + rate limit",
        kind: "edge",
        icon: "🪣",
        desc: "Token buckets per key/account; load shedding by priority."
      },
      {
        id: "idem",
        x: 500,
        y: 90,
        label: "Idempotency Store",
        sub: "key → response",
        kind: "cache",
        icon: "🔁",
        desc: "Remembers each key and its final response for a retention window."
      },
      {
        id: "pay",
        x: 500,
        y: 300,
        label: "Payments Service",
        sub: "charge logic",
        kind: "service",
        icon: "⚙️",
        desc: "Executes the charge exactly once per key."
      },
      {
        id: "net",
        x: 730,
        y: 300,
        label: "Card Networks",
        sub: "banks",
        kind: "external",
        icon: "🏦",
        desc: "External, slow, sometimes flaky."
      },
      {
        id: "ledger",
        x: 730,
        y: 90,
        label: "Ledger",
        sub: "double-entry, replicated",
        kind: "db",
        icon: "📒",
        desc: "Append-only record of all money movement."
      },
      {
        id: "wh",
        x: 920,
        y: 200,
        label: "Webhooks",
        sub: "at-least-once",
        kind: "queue",
        icon: "📮",
        desc: "Delivers events to merchants with retries until acknowledged."
      }
    ],
    flows: [
      {
        name: "Retry after timeout",
        steps: [
          ["m","edge","POST /charges  Idempotency-Key: K1"],
          ["edge","pay","Token available → allowed"],
          ["pay","idem","K1 unseen → reserve it"],
          ["pay","net","Authorize $49.99"],
          ["pay","ledger","Record charge ch_1"],
          ["pay","m","200 OK… response lost in transit ✗"],
          ["m","edge","Retry after 0.8 s (backoff + jitter), same K1"],
          ["edge","idem","K1 seen → stored response"],
          ["idem","m","200 OK ch_1 (no second charge)"]
        ]
      },
      {
        name: "Webhook delivery",
        steps: [
          ["ledger","wh","Event: charge.succeeded evt_9"],
          ["wh","m","POST /webhook (attempt 1) → 500"],
          ["wh","m","Retry with backoff → 200 ✓"]
        ]
      }
    ]
  },
  lab: {
    sim: "stripe",
    title: "Reliability Lab",
    hint: "Part 1: spam the API and watch the token bucket allow bursts, then return 429s. Part 2: make the network drop responses and compare retries with and without an idempotency key."
  },
  tradeoffs: [
    {
      choice: "Idempotency keys",
      pro: "Retries become safe by construction",
      con: "Server must store keys/results; clients must generate keys correctly"
    },
    {
      choice: "Token bucket",
      pro: "Allows bursts, bounds average rate",
      con: "Needs shared, fast state (e.g. Redis) across edge servers"
    },
    {
      choice: "Strong consistency for money",
      pro: "Correct balances",
      con: "Higher latency than eventual consistency"
    }
  ],
  takeaways: ["A timeout means \"unknown\", not \"failed\".","Make mutating APIs idempotent so clients can retry freely.","Add jitter to every retry policy."],
  quiz: [
    {
      q: "A charge request times out. What do you know?",
      o: ["It failed","It succeeded","Nothing: it may or may not have executed","The card is invalid"],
      a: 2,
      why: "The request or just the response could have been lost. That's exactly why idempotency keys exist."
    },
    {
      q: "Same idempotency key, second request. The server should…",
      o: ["Charge again","Return the stored result of the first request","Return 404","Delete the key"],
      a: 1,
      why: "Same key means same logical operation, so replay the original outcome."
    },
    {
      q: "Why add jitter to backoff?",
      o: ["To look random","To prevent synchronized retry waves from many clients","To make retries faster","Required by HTTP"],
      a: 1,
      why: "Without jitter, clients that failed together retry together."
    },
    {
      q: "Token bucket capacity 10, refill 1/s. A client sends 15 requests instantly. Roughly what happens?",
      o: ["All 15 succeed","10 succeed, 5 get 429","All fail","5 succeed"],
      a: 1,
      why: "The bucket allows a burst up to capacity; the rest must wait for refills."
    },
    {
      q: "A client reuses an idempotency key with a different amount. What should the server do?",
      o: ["Charge the new amount","Reject it with an error because the request doesn't match the original","Replay the old response silently","Delete the key"],
      a: 1,
      why: "A key identifies one specific request; a different body is a client bug."
    },
    {
      q: "Which errors should a payment client retry?",
      o: ["402 card declined","Timeouts, 429 and 5xx","400 bad request","All of them"],
      a: 1,
      why: "Only transient failures; a decline won't change on retry."
    }
  ],
  sources: ["Stripe Engineering: Designing robust and predictable APIs with idempotency (2017)","Stripe Engineering: Scaling your API with rate limiters (2017)","Stripe 2024 annual letter ($1.4T TPV)"],
  deep: [
    {
      h: "The payment lifecycle",
      blocks: [
        ["img","Ingenico iPP350 payment terminal.jpg","Tap, insert or click \"Pay\": behind each one is a request that must succeed exactly once, even when networks fail."],
        ["table",["PaymentIntent state","Meaning"],[["requires_payment_method","Created; no card attached yet"],["requires_confirmation","Card attached; waiting for the merchant or customer to confirm"],["requires_action","Extra step needed, e.g. 3-D Secure authentication"],["processing","Sent to the card network; result pending"],["requires_capture","Authorised; money held but not yet captured"],["succeeded / canceled","Final states"]]],
        ["p","Modelling a payment as an explicit state machine means every retry, webhook and support query can ask \"what state is it in?\" instead of guessing from partial logs."]
      ]
    },
    {
      h: "Implementing idempotency keys",
      blocks: [
        ["code","idempotency_keys (\n  account_id, key,               -- unique together\n  request_hash,                  -- reject the same key reused with a different body\n  status,                        -- started | finished\n  response_code, response_body,\n  locked_at, created_at          -- kept at least 24 hours\n)\n\nhandle(req):\n  row = insert_if_absent(account, key, hash(req.body), status='started')\n  if row.existed:\n     if row.request_hash != hash(req.body): return error  // key reused with different parameters\n     if row.status == 'started':            return 409  // the original is still running\n     return row.response                                // replay the stored result\n  result = charge(req)                                  // the real side effect, exactly once\n  save(row, status='finished', response=result)\n  return result"],
        ["warn","Store the key in the <b>same transaction</b> as the charge record, or at least before calling the card network. Otherwise a crash in between can still produce a duplicate."]
      ]
    },
    {
      h: "Retries done right",
      blocks: [
        ["code","delay(attempt) = random(0, min(cap, base × 2^attempt))      // \"full jitter\"\n// base = 0.5 s, cap = 30 s  →  attempt 1: 0–1 s, 2: 0–2 s, 3: 0–4 s, 4: 0–8 s …\nretry on:      timeouts, connection errors, HTTP 429, 5xx\nnever retry:   HTTP 400 / 401 / 402 (card declined) / 404"],
        ["chart",{"type":"line","title":"Retry delay ceiling by attempt","sub":"base 0.5 s, cap 30 s","x":{"label":"attempt","values":[1,2,3,4,5,6,7]},"y":{"label":"max wait"},"unit":"s","series":[{"name":"Exponential ceiling","values":[1,2,4,8,16,30,30]},{"name":"Fixed 1 s retry","values":[1,1,1,1,1,1,1]}],"note":"Full jitter picks a random point under the ceiling, so thousands of clients spread out instead of retrying in sync."}]
      ]
    },
    {
      h: "Four kinds of limiter",
      blocks: [
        ["p","Stripe has described running four protections in front of its API:"],
        ["table",["Limiter","Limits","Protects against"],[["Request rate limiter","N requests per second per user (token bucket)","A client in a runaway loop"],["Concurrent requests limiter","How many requests a user can have in flight at once","Slow, expensive endpoints hogging capacity"],["Fleet usage load shedder","Reserves capacity for critical traffic (creating charges)","Non-critical traffic crowding out payments"],["Worker utilization load shedder","Sheds lower-priority traffic when workers are saturated","Total overload: degrade gracefully instead of falling over"]]]
      ]
    },
    {
      h: "The ledger and webhooks",
      blocks: [
        ["table",["Entry","Debit","Credit"],[["Customer pays $50","Card network receivable $50","Merchant balance $48.25, fees $1.75"],["Payout to the merchant's bank","Merchant balance $48.25","Bank settlement $48.25"]]],
        ["p","<b>Double-entry</b>: every movement is recorded as matching debits and credits, so the books always balance and an error shows up as an imbalance. Entries are never edited, only corrected by new entries."],
        ["p","<b>Webhooks</b> notify merchants of events. Each delivery is signed (the merchant verifies the signature), retried with backoff for up to about three days until it gets a 2xx, and carries a unique event id, so merchant handlers must be idempotent too."]
      ]
    },
    {
      h: "Interview follow-ups",
      blocks: [
        ["list",["What if the card network times out? → mark the payment <code>processing</code> and reconcile with the network's records; never guess.","Refunds? → a new ledger entry and a new idempotent request, never an edit.","Multi-region? → strongly consistent primary storage for money; replicas for reads.","Exactly-once webhooks? → impossible over a network. Deliver at-least-once plus idempotent handlers."]]
      ]
    }
  ]
});
