/* Blueprint course — lesson: Monolith vs SOA vs microservices, API gateways & observability */
BP.LESSONS.push({
  id: "microservices",
  mod: "micro",
  icon: "🧩",
  minutes: 30,
  title: "Monolith vs SOA vs microservices, API gateways & observability",
  scaler: "HLD 18 · Monolith vs Microservices vs SOA · HLD 19 · Communication, Observability",
  summary: "When to split a system and when not to, how to decompose Flipkart, what an API gateway does, and how to find the hop that dropped a request.",
  concepts: ["microservices","api-gateway","observability"],
  related: ["netflix"],
  sections: [
    { h: "What is a service?", blocks: [
      ["p","A service is an application layer plus its storage (and caches) exposing APIs for one job. Google search uses two: <b>typeahead</b> (<code>getTopSuggestions</code>, <code>updateFrequency</code>) and <b>search results</b>, which calls typeahead in the background."],
      ["analogy","A restaurant: kitchen, cooks and ingredients are hidden. Customers only talk to waiters (the API). The whole restaurant is the service."],
      ["img","Shipping container stacks - Port of Rotterdam - 2017 - 5.jpg","Shipping containers standardise how goods move, whatever is inside. Service APIs do the same for how teams' code talks to each other."]
    ] },
    { h: "Monolith first", blocks: [
      ["p","A <b>monolith</b> is one codebase compiled into one deployable. Every app server can handle every request. Modular code inside is fine; it's still a monolith. It works great while the product and team are small."],
      ["list",["A huge codebase is slow to learn, and changes have hidden dependencies.","Any small change means rebuilding and redeploying everything; build times grow.","One slow or crashing component affects every request on that server."]],
      ["tip","The notes' advice: <b>stay monolithic until you actually feel these pains.</b> Microservices are expensive and slow to build. Don't migrate for fashion."],
      ["fig","monolith","Try each event in both modes: scale Cart, leak memory in Recs, ship a Payments fix."]
    ] },
    { h: "SOA vs microservices", blocks: [
      ["table",["","SOA","Microservices"],[["Database","Services may share DBs","Each service owns its DB (duplicated data is OK)"],["Calls","Mostly synchronous","Sync + async, event-driven"],["Consistency","Easier via a shared DB","Eventual, across services"],["Independence","Partial","Own stack, own deploys, own scaling"]]]
    ] },
    { h: "Pick the right tool per service", blocks: [
      ["p","Each service picks its own stack and scales on its own, and that's the main payoff (from the notes):"],
      ["table",["Service","Needs","Possible stack","Scale"],[["ProductService","Full-text search, speed, flexible schema for many categories","Java Spring Boot + MongoDB + Elasticsearch","Many app servers, sharded Mongo, big ES cluster"],["UserService","Simple, relational, low traffic","Python + MySQL (unsharded)","A few app servers, one DB"]]],
      ["p","Rarely changing services deploy rarely, while busy ones deploy many times a day. Each has a clear API contract, so internal changes don't break others as long as the API behaves the same."]
    ] },
    { h: "Decomposing Flipkart", blocks: [
      ["p","Look for independent flows: <b>User</b>, <b>Product</b> (pages, search, inventory), <b>Cart</b>, <b>Payment</b>, <b>Order</b>, <b>Invoice</b>, <b>Review</b>. Rule: <b>don't split things that constantly need each other's data</b>. Product search and product details share data, so they stay together. Over-splitting creates chatty services that are slower than the monolith."],
      ["p","A Facebook page loads a skeleton, then fires <b>parallel</b> requests to <code>/newsfeed</code>, <code>/ads</code>, <code>/events</code>, <code>/pymk</code>, <code>/user</code>. Talking to many services doesn't have to be slow if the calls are concurrent."]
    ] },
    { h: "The API gateway", blocks: [
      ["p","A load balancer works at the network level and doesn't know that <code>/ads/…</code> belongs to the Ads service. An <b>API gateway</b> sits behind it at the application layer and routes by path. Gateways are replicated, and each holds the full routing table. They also centralize <b>authentication</b>, <b>rate limiting</b> and <b>TLS/encryption</b>."],
      ["flow",{"nodes":[{"id":"c","x":80,"y":225,"label":"Client","sub":"web / app","kind":"client","icon":"📱","desc":"Calls one domain."},{"id":"lb","x":250,"y":225,"label":"Load balancer","sub":"L4/L7","kind":"edge","icon":"⚖️","desc":"Spreads traffic over gateway instances."},{"id":"gw","x":440,"y":225,"label":"API gateway","sub":"auth · limits · routing","kind":"edge","icon":"🚪","desc":"Validates the token, applies rate limits, routes by path."},{"id":"ads","x":700,"y":80,"label":"Ads service","sub":"own LB + DB","kind":"service","icon":"📣","desc":"Owns ad data."},{"id":"feed","x":700,"y":225,"label":"Feed service","sub":"own LB + DB","kind":"service","icon":"📰","desc":"Owns the feed."},{"id":"user","x":700,"y":370,"label":"User service","sub":"own LB + DB","kind":"service","icon":"👤","desc":"Owns profiles."},{"id":"db","x":910,"y":225,"label":"Feed DB","sub":"private","kind":"db","icon":"🗄️","desc":"No other service queries it directly."}],"flows":[{"name":"GET /ads/42","steps":[["c","lb","GET /ads/42 with a session token"],["lb","gw","Any gateway instance"],["gw","gw","Auth ✓ · rate limit ✓"],["gw","ads","Route by prefix /ads → Ads service"],["ads","c","Response"]]},{"name":"GET /newsfeed/42","steps":[["c","lb","GET /newsfeed/42"],["lb","gw","Gateway"],["gw","feed","Route /newsfeed → Feed service"],["feed","db","Query its own DB"],["feed","c","Feed JSON"]]}]},"Client → DNS → LB → API gateway → service's LB → app → DB."]
    ] },
    { h: "The price of microservices", blocks: [
      ["list",["<b>Latency:</b> more hops (gateway, service LBs, inter-service calls).","<b>Cost:</b> every service needs at least an app server and a DB: 20 services means 40+ machines before any traffic.","<b>Debugging:</b> one request spans many services and logs.","<b>Consistency:</b> Order and Payment both track <code>payment_status</code>, and nothing forces them to agree (see the next lesson)."]],
      ["chart",{"type":"line","title":"Minimum machines before any traffic","x":{"label":"number of services","values":[1,5,10,20,40]},"y":{"label":"machines"},"series":[{"name":"Microservices","values":[2,10,20,40,80]},{"name":"Monolith","values":[2,2,2,2,2]}],"note":"Each service needs at least one app server and one database."}]
    ] },
    { h: "Observability: detect → diagnose → verify", blocks: [
      ["p","Failures will happen. What matters is <b>knowing</b> quickly, finding the cause, and confirming the fix. In a messenger, a message goes Gateway → MessageService → Kafka → NotificationService. If Bob never gets a notification, which hop failed?"],
      ["flow",{"nodes":[{"id":"gw","x":100,"y":120,"label":"Gateway","sub":"trace=msg-123","kind":"edge","icon":"🚪","desc":"Generates a trace id and passes it along."},{"id":"ms","x":330,"y":120,"label":"MessageService","sub":"logs msg-123","kind":"service","icon":"💬","desc":"Stores the message, publishes an event with the same id."},{"id":"k","x":560,"y":120,"label":"Kafka","sub":"message_sent","kind":"queue","icon":"📬","desc":"The event carries the trace id."},{"id":"ns","x":790,"y":120,"label":"NotificationService","sub":"❌ no log","kind":"service","icon":"🔔","desc":"If its logs never mention msg-123, this is where it broke."},{"id":"elk","x":450,"y":340,"label":"ELK / Splunk","sub":"search: msg-123","kind":"db","icon":"🔎","desc":"Centralized, full-text-searchable logs (Elasticsearch + Logstash + Kibana)."},{"id":"ts","x":790,"y":340,"label":"Metrics TSDB","sub":"p95, error rate","kind":"cache","icon":"📈","desc":"Per-minute aggregates → alarms (CloudWatch, Prometheus, PagerDuty)."}],"flows":[{"name":"Trace a lost notification","steps":[["gw","ms","Request with trace id msg-123"],["ms","elk","log: stored msg-123"],["ms","k","Publish message_sent {msg-123}"],["k","elk","log: msg-123 enqueued"],["k","ns","Consumer should pick it up…"],["elk","ns","Search msg-123: the logs stop at Kafka → NotificationService is the culprit"]]},{"name":"Alarm fires","steps":[["ns","ts","ods.publish(\"notification.errors\", 1) every minute"],["ts","ts","Error rate crosses the threshold → page the on-call"]]}]},"A trace id propagated through every hop. The hop where the logs stop is where it failed."],
      ["list",["<b>Logs</b> (with a trace id, centralized) explain <i>what</i> happened.","<b>Metrics</b> (time-series: rate, errors, p90/p95 latency, CPU) tell you <i>that</i> something is wrong. Logs are too heavy and best-effort for this; an agent aggregates numbers every minute.","<b>Traces</b> (spans per hop) show <i>where</i> time went. OpenTelemetry, Jaeger and Zipkin are common tools."]],
      ["code","// application code publishes one number; an agent aggregates per minute\nods.publish(\"messagestore.latency\", 50);\nods.publish(\"notification.errors\", 1);\n\n// alert rule in the time-series DB\nIF p95(messagestore.latency, 5m) > 300 ms  OR  sum(notification.errors, 1m) > 100\nTHEN page on-call (PagerDuty / IVRS)"]
    ] }
  ],
  quiz: [
    {"q":"Key structural difference between SOA and microservices?","o":["Language","Database per service + async/event-driven communication","Cloud vs on-prem","REST vs SOAP only"],"a":1,"why":"Microservices own their data and often communicate through events."},
    {"q":"Why not let one service query another's database for a report?","o":["It's slower","It breaks ownership and separation of concerns (an anti-pattern)","Databases forbid it","It's fine"],"a":1,"why":"Use the owner's API or a CQRS read model instead."},
    {"q":"Why use metrics rather than logs for alerting?","o":["Logs are encrypted","Logs are heavy and best-effort; you only need per-minute aggregates","Metrics are free","Logs can't be searched"],"a":1,"why":"A time-series DB with aggregation is the right tool for detection."}
  ],
  refs: [
    ["microservices.io: Microservice architecture","https://microservices.io/patterns/microservices.html"],
    ["Database per service","https://microservices.io/patterns/data/database-per-service.html"],
    ["API gateway / BFF pattern","https://microservices.io/patterns/apigateway.html"],
    ["Distributed tracing pattern","https://microservices.io/patterns/observability/distributed-tracing.html"],
    ["OpenTelemetry observability primer","https://opentelemetry.io/docs/concepts/observability-primer/"],
    ["gRPC introduction","https://grpc.io/docs/what-is-grpc/introduction/"]
  ]
});
