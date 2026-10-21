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
  minutes: 33,
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
    {v: 99.999,d: 3,suf: "%",label: "API uptime target (about 5 minutes of downtime a year)",kind: "Reported"},
    {v: 1,suf: "×",label: "times a customer should be charged, no matter what fails",kind: "Requirement"}
  ],
  story: "Priya is buying concert tickets on her phone. She taps <b>Pay $49.99</b>. The shop's server sends a charge request to the payments API, and then the train goes into a tunnel. Or the shop's server hiccups. Or a router somewhere in between drops a packet. Whatever the reason, the shop's server waits ten seconds and gets... nothing. A timeout.<br><br>Now the shop's code has to make a decision, and both options are bad. Did the charge go through? If it retries and the first one worked, Priya pays $99.98 for one ticket and writes an angry review. If it doesn't retry and the first one failed, the shop loses a sale and Priya loses her seat.<br><br>This is one of the most common bugs in distributed systems, and it hides in every app that talks over a network. A <b>timeout doesn't mean \"failed\"</b>. It means \"I don't know\". The request might never have arrived. It might have arrived and crashed halfway. Or it might have succeeded completely, and only the reply got lost on the way back.<br><br>Stripe moves over a trillion dollars a year through an API that millions of businesses call over the open internet, so it can't wish this problem away. This case walks through how a payments API makes retries safe: <b>idempotency keys</b> so that \"do it again\" can never mean \"charge again\", <b>retries with backoff and jitter</b> so that recovering servers aren't stampeded, <b>rate limiting</b> so that one buggy client can't hurt everyone, and a <b>ledger and webhooks</b> so that money is never lost and merchants always find out what happened.<br><br>The architecture here is a simplified teaching model built from Stripe's public engineering posts and API docs.",
  requirements: {
    functional: ["Create charges / payment intents","Refund all or part of a payment","Notify merchants of events (payment succeeded, refund issued) with webhooks","API keys and per-account limits","Let merchants look up the current state of any payment"],
    nonFunctional: ["Correctness above all: no double charges, no lost money","Very high availability: a payments outage stops every shop that depends on it","Safe for clients to retry anything, any number of times","Protect the platform from runaway clients and traffic spikes","Every money movement must be auditable later","Predictable latency, even when banks and card networks are slow"]
  },
  estimate: [
    ["API requests per second","assumption (illustrative)","10,000"],
    ["Timeout or ambiguous result rate","assumption","0.1%"],
    ["Ambiguous payments per second","10,000 × 0.001","≈ 10 /s"],
    ["Per day","10 × 86,400","≈ 864,000 maybes"],
    ["Idempotency keys stored","10,000/s × 86,400 s × 1 day kept","≈ 864 M rows live at any time"],
    ["Downtime allowed at 99.999%","525,600 min × 0.00001","≈ 5.3 minutes / year"]
  ],
  estimateNote: "These are made-up round numbers, not Stripe's real traffic. Look at the fourth row. A failure rate of one in a thousand sounds tiny, but at this scale it produces nearly <b>a million \"did it charge?\" moments every day</b>. If even 1% of those were handled wrongly, that's thousands of double charges or lost sales daily. So retries can't be safe \"most of the time\" or \"if you're careful\"; they must be safe <b>by design</b>. The fifth row tells you the safety mechanism has its own cost: you need to remember every request for a while, which is hundreds of millions of small rows. And the last row shows why there's no room for maintenance windows: five nines leaves you about five minutes of downtime per year.",
  naive: {
    title: "\"Just retry on timeout\"",
    desc: "The first instinct of every developer: wrap the API call in a loop. If <code>POST /charge</code> times out or errors, wait a second and call it again, up to five times. It looks responsible, and it works fine in testing, because in testing the network never loses a response after the charge succeeds. In production, it does, all the time.",
    breaks: ["The first request may have succeeded and only the response was lost, so the retry charges a second time. With ~864,000 ambiguous requests a day (illustrative), that's a lot of refunds and angry customers.","Thousands of clients retrying in sync after an outage hammer the recovering service (a thundering herd). If 100,000 clients all retry exactly 1 second after a blip, the server gets 100,000 requests in the same instant, falls over again, and the cycle repeats.","One buggy client in a tight retry loop can degrade the API for everyone. A single merchant's script stuck retrying 5,000 times a second can eat capacity meant for everybody else's checkouts.","Some errors should never be retried. Retrying a declined card five times doesn't make the bank change its mind; it just looks like fraud to the card network."]
  },
  steps: [
    {
      t: "Attach an idempotency key",
      c: "idempotency",
      b: "A request is <b>idempotent</b> if doing it twice has the same effect as doing it once. \"Set my balance to $10\" is idempotent. \"Add $10 to my balance\" isn't. A charge is naturally the second kind, so we need a way to make it behave like the first.<br><br>The trick: the client generates a unique random key for each <i>logical operation</i> (for example, one per checkout attempt) and sends it with the request: <code>Idempotency-Key: 7f3c…</code>. If the client retries, it sends the <b>same key</b>. The key means \"this is the same request you may have already seen\". A genuinely new purchase, even of the same item for the same amount, gets a new key.<br><br>Back to Priya: the shop creates key K1 when she taps Pay. The request times out. The shop retries with K1. The server sees K1, recognises it, and knows not to charge again. If Priya later buys a second ticket on purpose, that's key K2 and a separate charge. The cost is a small responsibility pushed onto the client: generate the key <i>before</i> the first attempt, store it, and reuse it on every retry. Stripe's official client libraries do this for you when they retry.",
      a: "Writing a cheque number on every cheque. If the same cheque #1042 shows up at the bank twice, the bank cashes it once and recognises the second one as a duplicate."
    },
    {
      t: "Server: store key → result atomically",
      c: "optimistic-concurrency",
      b: "The key only helps if the server remembers it. On first sight of a key, the server records it, does the work, and stores the <b>final response</b> next to the key. When a retry arrives with the same key, the server <b>returns the stored response</b> without executing anything again. The client can't tell the difference between the original reply and the replay, and that's the point.<br><br>Two tricky cases need rules. First, two copies of the same request can arrive at the same time (say the client retried too eagerly). Only one may proceed, so the server inserts the key with a uniqueness constraint or a lock. Whoever inserts first wins; the other gets a <b>409 Conflict</b> (\"that request is still in progress, try again shortly\"). Second, a client might reuse a key with a <i>different</i> body, say $49.99 the first time and $59.99 the second. That's a bug in the client, so the server stores a fingerprint of the original request and rejects mismatches.<br><br>The most important rule is about timing. The key must be recorded <b>before or atomically with</b> the side effect. If the server charged the card and then crashed before writing down the key, a retry would find no key and charge again. Stripe's docs say keys are kept for at least 24 hours, which covers any reasonable retry window.",
      a: "A coat check. Hand over ticket #42 a second time and you get the same coat back, not a second coat. And if you show up with ticket #42 but describe a different coat, the attendant knows something's wrong."
    },
    {
      t: "Retry with exponential backoff + jitter",
      c: "backoff",
      b: "Idempotency makes retries <i>safe</i>. Now we need to make them <i>polite</i>. If every client retries immediately, a struggling server gets hit even harder at the moment it's weakest.<br><br><b>Exponential backoff</b> means waiting longer after each failure: maybe 0.5 s, then 1 s, then 2 s, then 4 s, up to a cap such as 30 s. That gives the server breathing room. But backoff alone has a flaw. Imagine 50,000 clients that all failed at the same moment during a 2-second outage. With plain backoff they all retry together at 0.5 s, then together at 1 s, then together at 2 s. You've turned one spike into a series of synchronised spikes.<br><br><b>Jitter</b> fixes that by adding randomness: instead of waiting exactly 2 s, wait a random time between 0 and 2 s. Those 50,000 retries now arrive spread across two seconds instead of in one instant. Also be picky about <i>what</i> you retry: timeouts, connection errors, 5xx server errors and 429 (rate limited) are worth retrying. A 402 (card declined) or 400 (bad request) will fail the same way every time.",
      a: "After a crowded door jams, people trying again at random moments get through faster than everyone pushing on \"3, 2, 1\"."
    },
    {
      t: "Rate limit with token buckets",
      c: "rate-limiting",
      b: "Even polite, well-behaved clients can overwhelm an API, and some clients aren't well-behaved. A merchant's script with a bug might loop forever, sending thousands of requests a second. Without limits, that one script eats capacity that every other shop's checkout needs.<br><br>A <b>token bucket</b> is the classic fix. Each API key has a bucket that holds up to, say, 100 tokens and refills at 25 tokens a second (illustrative numbers). Every request spends one token. If the bucket is empty, the request gets <b>429 Too Many Requests</b>. This allows short bursts (a merchant running a flash sale can spend all 100 tokens at once) while capping the long-run average. Stripe has written publicly about using token-bucket rate limiters backed by <b>Redis</b>, so every API server sees the same counts.<br><br>On top of per-user limits, Stripe described <b>load shedders</b>: when the whole system is stressed, it deliberately drops low-priority traffic (like listing old invoices) so that critical traffic (creating charges) keeps working. It's better to say \"try again later\" to a report request than to fail someone's payment.",
      a: "A cup of arcade tokens: you can spend a handful in a burst, but refills come one per second. And when the arcade gets too crowded, the staff close the claw machines first so the ticket counter keeps running."
    },
    {
      t: "Model each payment as a state machine",
      c: "optimistic-concurrency",
      b: "A card payment isn't one instant event. It's a short journey: the customer enters a card, the bank may ask for extra verification (like a one-time code), the request goes to the card network, the bank approves or declines, and sometimes the money is only reserved now and collected later. Stripe models this as a <b>PaymentIntent</b> that moves through clear states: <code>requires_payment_method</code>, <code>requires_action</code>, <code>processing</code>, <code>succeeded</code> and so on.<br><br>Why bother? Because when something goes wrong in the middle, \"what state is this payment in?\" is a question with one clear answer. A retry can check the state before acting. Support staff can see exactly where a payment got stuck. Two workers trying to move the same payment forward at once can use <b>optimistic concurrency</b>: each update says \"move from <code>processing</code> to <code>succeeded</code>\", and if the payment is no longer in <code>processing</code>, the update fails instead of silently overwriting someone else's work.<br><br>The cost is more design up front: you need to list every state, every allowed transition and what each one means. That's exactly the kind of work you want to do before money is involved, not after.",
      a: "A parcel tracking page: \"label created\", \"in transit\", \"out for delivery\", \"delivered\". Nobody has to guess where the parcel is, and it can't jump from \"label created\" to \"delivered\" without passing the steps in between."
    },
    {
      t: "Keep a ledger, and reconcile",
      c: "replication",
      b: "Behind every payment is the question accountants have asked for 500 years: where did the money go? A payments company records every movement in an append-only, <b>double-entry ledger</b>. Double-entry means every movement is written as two matching sides: money leaves one account and arrives in another, and the totals must always balance. If they don't, something is wrong, and you know immediately.<br><br>The ledger is <b>append-only</b>: entries are never edited or deleted. A refund isn't \"undo the charge\"; it's a new entry that moves money back. That gives you a complete history you can audit years later. It lives in strongly consistent, replicated storage, because \"eventually correct\" is not good enough for a bank balance.<br><br>Then there's the outside world. Banks and card networks keep their own records, and sometimes they disagree with yours: a response was lost, a network reversed a charge, a settlement file arrived late. Background <b>reconciliation</b> jobs compare your ledger with the banks' reports, and flag or fix anything that doesn't match. It's the final safety net under all the others.",
      a: "Accountants never erase lines; they add correcting entries and balance the books every night. And once a month they compare their books with the bank statement, line by line."
    },
    {
      t: "Deliver webhooks at least once",
      c: "acks",
      b: "Some outcomes take time. A bank transfer might clear tomorrow; a dispute might arrive next month. The merchant can't sit and wait on an open request, so Stripe tells them later using <b>webhooks</b>: an HTTP POST from Stripe to a URL the merchant provides, saying \"event <code>charge.succeeded</code> happened for payment X\".<br><br>The merchant's server might be down, slow or buggy at that moment. So Stripe treats the merchant's <b>2xx response as an acknowledgement</b> and keeps retrying with backoff until it gets one, for up to about three days. That's <b>at-least-once delivery</b>: you'll get the event, but you might get it twice (say, your server processed it but crashed before replying).<br><br>So the merchant needs idempotency too, in the other direction. Each event has a unique ID like <code>evt_9</code>. A good webhook handler records the IDs it has processed and ignores repeats, so a duplicate \"payment succeeded\" doesn't ship the order twice. Each webhook is also <b>signed</b>, so the merchant can check it really came from Stripe and not from someone pretending.",
      a: "A courier who keeps coming back until someone signs for the parcel. And a sensible household that notices \"we already got this parcel\" when the courier's confused colleague tries to deliver it again."
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
      pro: "Retries become safe by construction: \"try again\" can never mean \"charge again\"",
      con: "The server must store hundreds of millions of keys and results; clients must generate and reuse keys correctly"
    },
    {
      choice: "Token bucket rate limiting",
      pro: "Allows short bursts (a flash sale) while capping the long-run rate",
      con: "Needs shared, fast state (e.g. Redis) across every edge server, and that store must not become a single point of failure"
    },
    {
      choice: "Strong consistency for money",
      pro: "Balances are always correct; no \"eventually right\" bank accounts",
      con: "Higher latency and less availability during network splits than eventual consistency"
    },
    {
      choice: "Load shedding by priority",
      pro: "Payments keep working while the system is overloaded",
      con: "Lower-priority requests (reports, listings) fail during stress, and someone has to decide what counts as critical"
    },
    {
      choice: "At-least-once webhooks",
      pro: "Merchants never silently miss an event",
      con: "Duplicates are possible, so every merchant must write idempotent handlers"
    }
  ],
  takeaways: ["A timeout means \"unknown\", not \"failed\". Design for the case where the work happened and only the reply was lost.","Make mutating APIs idempotent, so clients can retry freely without fear.","Record the idempotency key before, or atomically with, the side effect.","Add jitter to every retry policy, and only retry errors that can change on retry.","Rate-limit per client, and shed low-priority work first when the whole system is stressed.","Money lives in an append-only, double-entry ledger, checked against the banks by reconciliation.","Exactly-once delivery over a network isn't possible; at-least-once plus idempotent handlers gets you the same result."],
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
      why: "Without jitter, clients that failed together retry together, and the recovering server gets hit by the same spike again."
    },
    {
      q: "Token bucket capacity 10, refill 1/s. A client sends 15 requests instantly. Roughly what happens?",
      o: ["All 15 succeed","10 succeed, 5 get 429","All fail","5 succeed"],
      a: 1,
      why: "The bucket allows a burst up to its capacity; the rest must wait for refills."
    },
    {
      q: "A client reuses an idempotency key with a different amount. What should the server do?",
      o: ["Charge the new amount","Reject it with an error because the request doesn't match the original","Replay the old response silently","Delete the key"],
      a: 1,
      why: "A key identifies one specific request; a different body is a client bug, and silently guessing would hide it."
    },
    {
      q: "Which errors should a payment client retry?",
      o: ["402 card declined","Timeouts, 429 and 5xx","400 bad request","All of them"],
      a: 1,
      why: "Only transient failures; a decline or a malformed request won't change on retry."
    },
    {
      q: "The server charges the card, then crashes before saving the idempotency key. The client retries with the same key. What happens?",
      o: ["Nothing bad: keys always prevent duplicates","The server sees no record of the key and may charge again","The card network blocks it automatically","The client gets a 409"],
      a: 1,
      why: "The key only protects you if it's recorded before or atomically with the side effect. That ordering is the whole trick."
    },
    {
      q: "A merchant's webhook handler receives the same evt_9 \"payment succeeded\" event twice. What should it do?",
      o: ["Ship the order twice","Record processed event IDs and ignore the repeat","Return an error so Stripe stops sending","Refund the payment"],
      a: 1,
      why: "Webhooks are at-least-once, so duplicates are normal. Handlers must be idempotent, keyed on the event ID."
    },
    {
      q: "A customer is refunded. How should the ledger record it?",
      o: ["Delete the original charge entry","Edit the charge amount to $0","Add new entries that move the money back","Nothing; refunds aren't recorded"],
      a: 2,
      why: "Ledgers are append-only. Corrections are new entries, so the full history stays auditable."
    }
  ],
  sources: ["Stripe Engineering: Designing robust and predictable APIs with idempotency (2017)","Stripe Engineering: Scaling your API with rate limiters (2017)","Stripe 2024 annual letter ($1.4T TPV)"],
  deep: [
    {
      h: "The payment lifecycle",
      blocks: [
        ["img","Ingenico iPP350 payment terminal.jpg","Tap, insert or click \"Pay\": behind each one is a request that must succeed exactly once, even when networks fail."],
        ["p","Before designing anything, it helps to know what actually happens when a card is charged. Several companies are involved: the <b>merchant</b> (the shop), the <b>payment processor</b> (Stripe), the <b>card network</b> (Visa, Mastercard), and the <b>issuing bank</b> (the bank that gave the customer the card). An <b>authorisation</b> asks the issuing bank \"can this card pay $49.99?\" and reserves the money. A <b>capture</b> actually collects it. Days later, <b>settlement</b> moves real money between banks."],
        ["table",["PaymentIntent state","Meaning"],[["requires_payment_method","Created; no card attached yet"],["requires_confirmation","Card attached; waiting for the merchant or customer to confirm"],["requires_action","Extra step needed, e.g. 3-D Secure authentication"],["processing","Sent to the card network; result pending"],["requires_capture","Authorised; money held but not yet captured"],["succeeded / canceled","Final states"]]],
        ["p","Modelling a payment as an explicit state machine means every retry, webhook and support query can ask \"what state is it in?\" instead of guessing from partial logs."],
        ["tip","Why separate authorise and capture? A hotel authorises your card at check-in and captures the final bill at check-out. An online shop might authorise at checkout and capture only when the item ships. Splitting the steps gives merchants control, and it's another reason to track state carefully."]
      ]
    },
    {
      h: "What happens when Priya taps Pay",
      blocks: [
        ["p","Let's replay the opening story with the full design in place. Timings are illustrative."],
        ["steps",[["0 ms: key first","The shop's server creates idempotency key K1 for this checkout and stores it with the order."],["5 ms: through the edge","The request reaches Stripe's API edge. The shop's token bucket has tokens, so it's allowed through."],["10 ms: reserve the key","The payments service inserts K1 with status \"started\". Nobody has seen K1 before, so the insert succeeds."],["600 ms: ask the bank","The service sends an authorisation to the card network. The bank approves."],["620 ms: write it down","The charge is recorded in the ledger, and K1's row is updated to \"finished\" with the response."],["625 ms: the reply is lost","The 200 OK leaves Stripe, but the shop's connection has already timed out."],["1.4 s: retry","The shop's library waits a random 0.8 s (backoff with jitter) and sends the same request with the same K1."],["1.41 s: replay","The server finds K1 \"finished\" and returns the stored response. Priya is charged once, and the shop knows it."]]],
        ["p","Now try the nasty variant: what if the retry arrives at 300 ms, while the first attempt is still waiting on the bank? K1 exists with status \"started\", so the retry gets a 409 Conflict. The client waits and retries again. By then the original has finished, and the retry gets the stored result. At no point are two charges in flight for the same key."]
      ]
    },
    {
      h: "Implementing idempotency keys",
      blocks: [
        ["code","idempotency_keys (\n  account_id, key,               -- unique together\n  request_hash,                  -- reject the same key reused with a different body\n  status,                        -- started | finished\n  response_code, response_body,\n  locked_at, created_at          -- kept at least 24 hours\n)\n\nhandle(req):\n  row = insert_if_absent(account, key, hash(req.body), status='started')\n  if row.existed:\n     if row.request_hash != hash(req.body): return error  // key reused with different parameters\n     if row.status == 'started':            return 409  // the original is still running\n     return row.response                                // replay the stored result\n  result = charge(req)                                  // the real side effect, exactly once\n  save(row, status='finished', response=result)\n  return result"],
        ["warn","Store the key in the <b>same transaction</b> as the charge record, or at least before calling the card network. Otherwise a crash in between can still produce a duplicate."],
        ["p","There's one more gap the sketch above glosses over. Calling the card network is a call to <i>another company</i>, and you can't put it inside your database transaction. What if your server crashes after the bank approves but before you save the result? The row says \"started\" forever. The fix is to treat the request as a series of <b>recovery points</b>: \"key reserved\", \"sent to network\", \"result recorded\". A background job looks for keys stuck in \"started\" for too long, asks the card network what actually happened to that request, and finishes the job. A well-known post by Stripe engineer Brandur Leach walks through this pattern in Postgres."],
        ["p","Where should keys live? They're looked up on every mutating request, so they need to be fast. But they also need to be as durable as the charge itself, or a crash could lose them. Storing them in the same database as the payment, in the same transaction, gives you both at once."]
      ]
    },
    {
      h: "Retries done right",
      blocks: [
        ["code","delay(attempt) = random(0, min(cap, base × 2^attempt))      // \"full jitter\"\n// base = 0.5 s, cap = 30 s  →  attempt 1: 0–1 s, 2: 0–2 s, 3: 0–4 s, 4: 0–8 s …\nretry on:      timeouts, connection errors, HTTP 429, 5xx\nnever retry:   HTTP 400 / 401 / 402 (card declined) / 404"],
        ["chart",{"type":"line","title":"Retry delay ceiling by attempt","sub":"base 0.5 s, cap 30 s","x":{"label":"attempt","values":[1,2,3,4,5,6,7]},"y":{"label":"max wait"},"unit":"s","series":[{"name":"Exponential ceiling","values":[1,2,4,8,16,30,30]},{"name":"Fixed 1 s retry","values":[1,1,1,1,1,1,1]}],"note":"Full jitter picks a random point under the ceiling, so thousands of clients spread out instead of retrying in sync."}],
        ["p","Picture 50,000 clients that all failed during the same 2-second blip (illustrative). With a fixed 1-second retry, all 50,000 come back in the same instant, every second, until the server gives up. With full jitter, attempt 3's requests are spread evenly over 4 seconds: about 12,500 a second, which a recovering server has a real chance of handling."],
        ["tip","Also cap the <b>number</b> of retries, not just the delay. A client that retries forever turns a permanent problem into permanent load. After a handful of attempts, give up and surface the error, or put the job on a queue to try later."]
      ]
    },
    {
      h: "Four kinds of limiter",
      blocks: [
        ["p","Stripe has described running four protections in front of its API:"],
        ["table",["Limiter","Limits","Protects against"],[["Request rate limiter","N requests per second per user (token bucket)","A client in a runaway loop"],["Concurrent requests limiter","How many requests a user can have in flight at once","Slow, expensive endpoints hogging capacity"],["Fleet usage load shedder","Reserves capacity for critical traffic (creating charges)","Non-critical traffic crowding out payments"],["Worker utilization load shedder","Sheds lower-priority traffic when workers are saturated","Total overload: degrade gracefully instead of falling over"]]],
        ["p","The first two protect Stripe from individual users. The last two protect Stripe from itself, by deciding in advance what to sacrifice when there isn't enough capacity to go round. Stripe's post describes shedding traffic in priority order: test-mode traffic and less important API calls go first, and the requests that actually create charges are the last to be dropped."],
        ["code","// token bucket, checked atomically in Redis (sketch)\nallow(api_key):\n  now     = clock()\n  b       = redis.get(api_key) or {tokens: CAPACITY, ts: now}\n  b.tokens = min(CAPACITY, b.tokens + (now - b.ts) × REFILL_PER_SEC)\n  b.ts    = now\n  if b.tokens < 1: return 429          // tell the client when to retry\n  b.tokens -= 1\n  redis.set(api_key, b)\n  return ALLOW"],
        ["p","In real deployments the read-modify-write above runs as one atomic Redis script, otherwise two API servers could both read \"1 token left\" and both let a request through. And if Redis itself is unreachable, a common choice is to <b>fail open</b> (let requests through) rather than block every payment because the rate limiter is down."]
      ]
    },
    {
      h: "The ledger and webhooks",
      blocks: [
        ["table",["Entry","Debit","Credit"],[["Customer pays $50","Card network receivable $50","Merchant balance $48.25, fees $1.75"],["Payout to the merchant's bank","Merchant balance $48.25","Bank settlement $48.25"]]],
        ["p","<b>Double-entry</b>: every movement is recorded as matching debits and credits, so the books always balance and an error shows up as an imbalance. Entries are never edited, only corrected by new entries."],
        ["p","Read the table as a story. The customer pays $50 (an illustrative fee split). Stripe is now owed $50 by the card network, and it owes the merchant $48.25 and itself $1.75 in fees. Both sides add up to $50. Later the merchant is paid out, and another balanced entry moves $48.25 from \"owed to merchant\" to \"sent to their bank\". At any moment you can add up every account and the total is zero. If it isn't, a bug or a lost message has been caught."],
        ["p","<b>Webhooks</b> notify merchants of events. Each delivery is signed (the merchant verifies the signature), retried with backoff for up to about three days until it gets a 2xx, and carries a unique event id, so merchant handlers must be idempotent too."],
        ["warn","A subtle trap: \"save the charge, then publish the webhook event\" is two separate steps. Crash between them and the merchant is never told. The usual fix is the <b>transactional outbox</b>: write the event into an outbox table in the same database transaction as the charge, and let a separate worker read the outbox and deliver it. The event can be delayed, but it can't be lost."]
      ]
    },
    {
      h: "When payments span several services",
      blocks: [
        ["p","Real checkouts touch more than the payments API. A shop's order service creates the order, an inventory service reserves the item, payments charges the card, and shipping books a courier. Each has its own database. How do you keep them consistent?"],
        ["p","The textbook answer, <b>two-phase commit</b> (2PC), locks the affected rows in every service, asks all of them \"ready?\", and only then commits. It works inside one company's databases, but it holds locks across network round trips, and a card network will never join your 2PC anyway."],
        ["p","The practical answer is a <b>saga</b>: a sequence of local steps, each with a matching <b>compensation</b> (a business-level undo). Reserve stock, then charge the card, then book shipping. If shipping fails, compensate: refund the charge and release the stock. Notice that the compensation for a charge is a <b>refund</b>, a new ledger entry, not a rollback. Compensations get retried too, so they must be idempotent: refund key R1 must refund once, however many times it's sent."],
        ["tip","This is why idempotency shows up everywhere in payments. Charges, refunds, webhook handlers and saga steps all get retried, so every one of them needs a key that says \"I've done this already\"."]
      ]
    },
    {
      h: "Failure stories",
      blocks: [
        ["table",["What goes wrong","What the design does"],[["Response lost after a successful charge","Retry with the same key replays the stored result; one charge"],["Client retries while the original is still running","409 Conflict; the client backs off and later gets the stored result"],["Server crashes after the bank approves","The key is stuck in \"started\"; a recovery job asks the network and finishes the record"],["Card network times out","Mark the payment processing; reconcile with the network's records rather than guessing"],["Merchant script loops at 5,000 requests/s","Token bucket returns 429; everyone else is unaffected"],["Whole fleet is overloaded","Load shedders drop reports and test traffic first; charges keep flowing"],["Merchant's webhook endpoint is down for a day","Webhooks retry with backoff for up to about three days"],["Ledger total doesn't match the bank's report","Reconciliation flags it, and a correcting entry fixes it with a full audit trail"]]]
      ]
    },
    {
      h: "Interview corner",
      blocks: [
        ["p","\"Design a payments API\" or \"how would you prevent double charges?\" comes up often. Here's a 45-minute plan."],
        ["steps",[["Minutes 0–5: requirements","Charge, refund, notify. Stress that correctness beats latency: no double charges, no lost money."],["Minutes 5–10: the core problem","Say it out loud: a timeout means unknown. Show the naive retry loop and the double charge."],["Minutes 10–20: idempotency","Client-generated keys, the key table, the 409 case, the mismatched-body case and the ordering rule."],["Minutes 20–28: retries and limits","Exponential backoff with jitter, which errors to retry, token buckets in Redis, load shedding."],["Minutes 28–38: money and state","PaymentIntent state machine, double-entry append-only ledger, reconciliation with banks."],["Minutes 38–45: notifying merchants","At-least-once webhooks, signatures, idempotent handlers, transactional outbox."]]],
        ["list",["What if the card network times out? → mark the payment <code>processing</code> and reconcile with the network's records; never guess.","Refunds? → a new ledger entry and a new idempotent request, never an edit.","Multi-region? → strongly consistent primary storage for money; replicas for reads.","Exactly-once webhooks? → impossible over a network. Deliver at-least-once plus idempotent handlers.","How long do you keep keys? → long enough to cover any retry window; Stripe documents at least 24 hours.","Who generates the key, client or server? → the client, because only the client knows that two requests are the same attempt.","Why not dedupe on (card, amount)? → a customer can legitimately buy two identical items in a row. Only the client's key can tell a retry from a new purchase."]]
      ]
    }
  ]
});
