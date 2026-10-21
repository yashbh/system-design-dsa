/* Blueprint course — lesson: Microservices: distributed transactions, Saga, CQRS & circuit breakers */
BP.LESSONS.push({
  id: "ms-patterns",
  mod: "micro",
  icon: "🎻",
  minutes: 35,
  title: "Microservices: distributed transactions, Saga, CQRS & circuit breakers",
  scaler: "HLD 20 · Microservices: Data Management, Consistency & Fault Tolerance",
  summary: "Keep data consistent across services without global locks, answer cross-service queries without breaking ownership, and stop one sick service from taking down everyone.",
  concepts: ["saga","two-phase-commit","cqrs","circuit-breaker"],
  related: ["stripe","ticketmaster"],
  sections: [
    { h: "The consistency problem", blocks: [
      ["p","In a monolith, moving ₹10 from A to B is one ACID transaction. Across systems it isn't: A banks with Axis, B with SBI, and two independent databases must change together. Inside one company it's the same: placing a Flipkart order touches <b>Orders</b>, <b>Inventory</b>, <b>Payments</b> and <b>Shipping</b>, each with its own database."]
    ] },
    { h: "Two-phase commit, and why it's an anti-pattern here", blocks: [
      ["flow",{"nodes":[{"id":"co","x":200,"y":225,"label":"Coordinator","sub":"order flow","kind":"edge","icon":"🎯","desc":"Asks everyone to prepare, then commit."},{"id":"o","x":620,"y":100,"label":"Order service","sub":"create order","kind":"service","icon":"📝","desc":"Locks rows while prepared."},{"id":"i","x":620,"y":350,"label":"Inventory","sub":"iPhone 15: 100 → 99","kind":"db","icon":"📦","desc":"The iPhone 15 row is locked: every other read/write on it queues."},{"id":"q","x":900,"y":350,"label":"Other shoppers","sub":"blocked","kind":"client","icon":"⏳","desc":"Waiting on the lock."}],"flows":[{"name":"2PC","steps":[["co","o","Phase 1: PREPARE (lock)"],["co","i","PREPARE: lock the iPhone 15 row"],["q","i","Other buyers' reads/writes queue behind the lock…"],["o","co","READY"],["i","co","READY"],["co","o","Phase 2: COMMIT, release locks"],["co","i","COMMIT, release locks"]]}]},"Locks are held across network round trips. If the coordinator dies after PREPARE, participants stay stuck."],
      ["p","Locks held across slow services make every other request on those rows wait, and a crashed coordinator can leave locks held. Many systems (Kafka, NoSQL, third-party APIs) don't support it at all. Microservices avoid 2PC."]
    ] },
    { h: "The Saga pattern", blocks: [
      ["p","Split the transaction into <b>local steps</b>, each fully atomic inside one service. Run them in order. If a step fails permanently, run <b>compensating actions</b> for the steps already done (refund, restock, cancel). Example: Axis debits A ₹1,000; SBI credits B; if the credit fails, Axis credits A back."],
      ["fig","saga","Run the order saga in both modes, failing at different steps."],
      ["table",["","Orchestration","Choreography"],[["Control","A central orchestrator calls each step","Services react to each other's events on Kafka"],["Speed","Faster (direct calls)","Slower (a queue hop per step)"],["Reliability","The orchestrator can die mid-saga (persist its state)","No single point whose failure causes inconsistency"],["Observability","Easy: read the orchestrator's log","Needs distributed tracing"],["Retry","Orchestrator retries","Kafka offsets only advance after the event is processed"]]],
      ["warn","Sagas aren't isolated: other requests can see intermediate states. Compensations must be <b>idempotent</b> (they may be retried), and \"write to the DB, then publish the event\" needs the <b>transactional outbox</b> pattern so a crash in between doesn't lose the event."],
      ["p","<b>Choreography at Flipkart (from the notes):</b> OrderService stores the order and publishes <code>new_order_created</code> (user, payment details, items, prices). InvoiceService, ProductService (to reduce inventory) and NotificationService all subscribe and run in parallel, each publishing its own event: <code>new_invoice_created</code>, <code>inventory_updated</code>, <code>user_notified</code>. On a permanent failure a service publishes e.g. <code>invoice_generation_failed</code>, and the services it affects subscribe to that event and roll back."]
    ] },
    { h: "CQRS: queries that span services", blocks: [
      ["p","Analysts want \"Pages with many messages but few notifications\", which needs a join across the Messages and Notifications services. Letting one query the other's DB is an anti-pattern. <b>Command Query Responsibility Segregation</b>: writes (commands) go to their owners as usual, and the relevant changes are relayed (e.g. via Kafka) into a separate <b>read model</b> built for that query."],
      ["flow",{"nodes":[{"id":"m","x":150,"y":90,"label":"Messages svc","sub":"addMessage","kind":"service","icon":"💬","desc":"Owns message data."},{"id":"n","x":150,"y":360,"label":"Notifications svc","sub":"addNotification","kind":"service","icon":"🔔","desc":"Owns notification data."},{"id":"k","x":450,"y":225,"label":"Kafka","sub":"change events","kind":"queue","icon":"📬","desc":"Both services publish what they write."},{"id":"r","x":730,"y":225,"label":"Page-insights read DB","sub":"pre-joined","kind":"cache","icon":"📊","desc":"Only Page-related data, already combined."},{"id":"a","x":910,"y":90,"label":"Analyst","sub":"queries","kind":"client","icon":"🧑‍💼","desc":"Reads only the read model."}],"flows":[{"name":"CQRS","steps":[["m","k","MessageAdded {page 7}"],["n","k","NotificationAdded {page 7}"],["k","r","Consumer updates the joined view for page 7"],["a","r","SELECT pages WHERE msgs high AND notifs low: easy, local"]]}]},"Writes stay with their owners; a purpose-built read model answers the cross-service query."],
      ["p","Trade-offs: the read model is <b>eventually consistent</b> (it lags slightly), and it's more infrastructure to run and rebuild."]
    ] },
    { h: "Circuit breaker", blocks: [
      ["p","User → Message → Notification, and Notification is degraded after a bad deploy. Calls to it hang until timeout, Message's threads pile up waiting, Message slows down, then User… a <b>cascading failure</b>. Even after the fix, the backlog hammers Notification so it recovers slowly (a <b>thundering herd</b>)."],
      ["steps",[["Classify errors","\"User not found\" is a normal answer. Timeouts, connection resets and 5xx mean the service is sick, and only these count."],["Track failures","e.g. more than 100 failures in the last minute, counted in the caller's Redis."],["Closed → Open","Stop calling. Fail fast or return a fallback so threads stay free."],["Open → Half-open","After T seconds, let a small sample through."],["Half-open → Closed / Open","Probes succeed → resume. They fail → open again."]]],
      ["fig","breaker","Raise the failure rate and watch the breaker trip. Then disable it to see the cascade."],
      ["img","Coloured Circuit Breaker Panel (1245142933).jpg","Circuit breakers in an aircraft panel: each circuit trips on its own, so one faulty system can't take the others down with it. Software circuit breakers do the same for services."],
      ["code","// the notes' pseudocode, cleaned up: failures are counted, and half-open is explicit\nfunction callNotifications(req) {\n  const b = redis.hgetall(\"breaker:notif\");            // { state, openedAt }\n  if (b.state === \"open\") {\n    if (Date.now() - b.openedAt < 30_000) return fallback(req);   // still cooling off: fail fast\n    redis.hset(\"breaker:notif\", { state: \"half-open\" });          // time to probe\n    b.state = \"half-open\";\n  }\n  if (b.state === \"half-open\" && Math.random() > 0.01) return fallback(req); // let ~1% through\n  try {\n    const res = notifications.send(req, { timeout: 2000 });\n    if (b.state === \"half-open\") redis.hset(\"breaker:notif\", { state: \"closed\" });\n    return res;\n  } catch (e) {\n    if (!isInfraError(e)) throw e;                     // \"user not found\" doesn't count\n    const fails = redis.incr(\"breaker:notif:fails\"); redis.expire(\"breaker:notif:fails\", 60);\n    if (b.state === \"half-open\" || fails > 100)        // >100 failures in a minute → open\n      redis.hset(\"breaker:notif\", { state: \"open\", openedAt: Date.now() });\n    return fallback(req);\n  }\n}"],
      ["chart",{"type":"line","title":"Caller threads stuck waiting (pool of 50)","sub":"20 req/s, 2 s timeout","x":{"label":"dependency failure rate","values":["0%","20%","40%","60%","80%","100%"]},"y":{"label":"busy threads","max":50},"series":[{"name":"No breaker","values":[0,8,16,24,32,40]},{"name":"With breaker","values":[0,8,16,1,1,1]}],"note":"Without a breaker the caller's threads fill up, and that's how a cascading failure starts."}]
    ] }
  ],
  quiz: [
    {"q":"Why is 2PC an anti-pattern in microservices?","o":["It's not ACID","Locks held across services block other requests, and a coordinator crash can leave them stuck","It needs Kafka","It's too new"],"a":1,"why":"Long-held distributed locks kill latency and availability."},
    {"q":"Saga step 3 fails permanently. What happens?","o":["Everything is rolled back by the database","Compensating actions undo steps 2 and 1","Nothing","Retry forever"],"a":1,"why":"Each service undoes its own completed local transaction."},
    {"q":"Which saga style is faster? Which is more resilient to a single crash?","o":["Choreography / orchestration","Orchestration / choreography","Both the same","Neither"],"a":1,"why":"Direct calls are faster; event-driven has no central owner to die mid-flight."},
    {"q":"Which errors should trip a circuit breaker?","o":["User not found","Timeouts, connection resets, 5xx","Validation errors","All errors"],"a":1,"why":"Only service-health errors indicate the dependency is sick."}
  ],
  refs: [
    ["microservices.io: Saga","https://microservices.io/patterns/data/saga.html"],
    ["microservices.io: CQRS","https://microservices.io/patterns/data/cqrs.html"],
    ["Martin Fowler: Circuit breaker","https://martinfowler.com/bliki/CircuitBreaker.html"],
    ["microservices.io: Circuit breaker","https://microservices.io/patterns/reliability/circuit-breaker.html"]
  ]
});
