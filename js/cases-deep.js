/* Blueprint — case-study deep dives. Adds `deep` sections (same block format as lessons),
 * extra quiz questions and photos to each case study. Rendered between "The real design"
 * and "Architecture". Architectures are simplified teaching models from public sources.
 */
(function () {
  const byId = Object.fromEntries(BP.CASES.map((c) => [c.id, c]));
  const deep = (id, sections, quiz = []) => { byId[id].deep = sections; byId[id].quiz.push(...quiz); byId[id].minutes += 15; };
  const flow = (nodes, name, steps) => ({ nodes, flows: [{ name, steps }] });

  /* ═════════════ BITLY ═════════════ */
  deep("bitly", [
    { h: "API design", blocks: [
      ["img", "De Huurverhoging QR code, Utrecht (2023).jpg", "Short links live on posters, packaging and QR codes. Every scan is a redirect that has to resolve in milliseconds, for years."],
      ["code", "POST /api/v1/links                     (auth: API key, rate-limited per key)\n{ \"long_url\": \"https://example.com/very/long?utm=…\", \"custom_alias\": \"diwali-sale\", \"expires_at\": \"2026-12-31\" }\n→ 201 { \"code\": \"diwali-sale\", \"short_url\": \"https://blu.pr/diwali-sale\" }\n\nGET /{code}\n→ 302 Found   Location: https://example.com/very/long?utm=…\n→ 404 Not Found (unknown)   |   410 Gone (expired)\n\nGET /api/v1/links/{code}/stats?from=2026-10-01&group=day\n→ 200 { \"clicks\": 18234, \"by_day\": [...], \"by_country\": {...} }"],
      ["p", "Two very different paths: <b>create</b> is authenticated, validated and rare (~1k/s). <b>Redirect</b> is anonymous, read-only and constant (~100k/s). Serve them from separate fleets so a flood of creates can never slow down redirects."]
    ]},
    { h: "Data model", blocks: [
      ["table", ["Store", "Key", "Value / columns", "Why"], [["Links (KV, sharded by code)", "code", "long_url, owner_id, created_at, expires_at", "One lookup per redirect"], ["Links by owner (index)", "owner_id", "list of codes", "\"My links\" dashboard"], ["Click events (log)", "—", "code, ts, country, referrer, device", "Append-only; aggregated later"], ["Click aggregates (OLAP)", "(code, day)", "count, by_country, by_referrer", "Fast stats queries"]]],
      ["p", "<b>Size check:</b> a row is about 500 bytes (the URL dominates). 100M links/day × 500 B ≈ 50 GB/day ≈ 18 TB/year, which is a sharded KV store, not one database. Codes are random-looking strings, so hashing by code spreads load evenly."]
    ]},
    { h: "Generating codes: three approaches compared", blocks: [
      ["table", ["Approach", "How", "Pros", "Cons"], [["Hash + truncate", "MD5(url) → first 7 chars; on collision, add a salt and retry", "No coordination", "Collision checks on every write; the same URL always gives the same code"], ["Counter + Base62", "Unique integer → Base62", "No collisions, short, fast", "Needs ID coordination; sequential codes are guessable"], ["Key generation service", "Pre-generate random 7-char codes offline; app servers take batches", "Random-looking, no collisions at write time", "An extra service and a store of unused keys"]]],
      ["steps", [["Lease a range", "An app server atomically reserves the next 1,000 IDs: <code>UPDATE id_ranges SET next = next + 1000 WHERE name = 'links' RETURNING next</code> (or a ZooKeeper sequential node)."], ["Hand out locally", "It assigns IDs from memory with no network calls until the range runs out. A crash just wastes the rest of the range, which is harmless."], ["Scramble (optional)", "Pass the ID through a reversible permutation (e.g. multiply by a large odd number mod 62⁷) so consecutive links don't get consecutive codes."], ["Encode", "Base62 the result into 7 characters."]]]
    ]},
    { h: "Custom aliases, expiry and abuse", blocks: [
      ["list", ["<b>Custom alias</b> (<code>blu.pr/diwali-sale</code>): a <i>conditional</i> insert, \"put if absent\", so two users can't claim the same alias. Reserve words like <code>api</code>, <code>login</code>, <code>admin</code>.", "<b>Expiry:</b> check <code>expires_at</code> on every redirect and return <b>410 Gone</b>. A background job deletes expired rows in batches later, so reads never wait for cleanup.", "<b>Abuse:</b> short links hide destinations, which attracts phishing. Scan new URLs against threat lists, rate-limit creation per account, and show an interstitial warning for flagged links."]]
    ]},
    { h: "Serving redirects in milliseconds", blocks: [
      ["p", "The read path is everything here. A cache-aside Redis tier in front of the KV store absorbs most traffic, because popularity is extremely skewed. A link shared by a celebrity can get millions of clicks in minutes."],
      ["chart", { type: "bar", title: "Redirect latency by path (inside one region, approx.)", data: [["Redis hit", 1], ["Redis miss → KV store", 6], ["Cross-region request (no local copy)", 150]], fmt: "ms", log: true, highlight: 0 }],
      ["list", ["<b>Viral link stampede:</b> when a hot key expires, thousands of requests miss at once. Coalesce them so one request refills the cache while the rest wait for it.", "<b>Multi-region:</b> replicate the link table (it's write-once) to every region and serve redirects from the nearest one.", "<b>301 vs 302:</b> 302 keeps analytics accurate. Some services use 301 for anonymous, analytics-free links to save traffic."]]
    ]},
    { h: "The analytics pipeline", blocks: [
      ["flow", flow([
        { id: "r", x: 100, y: 225, label: "Redirect servers", sub: "emit click event", kind: "service", icon: "↪️", desc: "Fire-and-forget: the redirect never waits." },
        { id: "k", x: 330, y: 225, label: "Kafka", sub: "clicks topic", kind: "queue", icon: "📬", desc: "Buffers bursts; partitioned by code." },
        { id: "s", x: 560, y: 110, label: "Stream processor", sub: "per-minute rollups", kind: "service", icon: "🧮", desc: "Counts by code × minute × country × referrer." },
        { id: "o", x: 800, y: 110, label: "OLAP store", sub: "ClickHouse / Druid", kind: "db", icon: "📊", desc: "Answers dashboard queries in milliseconds." },
        { id: "a", x: 560, y: 350, label: "Raw archive", sub: "object storage", kind: "db", icon: "🪣", desc: "Every raw event, for re-processing and audits." }
      ], "Click analytics", [["r", "k", "{code, ts, ip→country, referrer, ua}"], ["k", "s", "Consume in parallel by partition"], ["s", "o", "Upsert per-minute aggregates"], ["k", "a", "Also archive raw events"]]), "Clicks flow through a log into rollups, so the redirect path does zero analytics work."]
    ]},
    { h: "Failure modes", blocks: [
      ["table", ["Failure", "Impact", "Mitigation"], [["Redis down", "Every redirect hits the KV store", "KV replicas sized for a cache-less day; circuit breaker; warm the cache on restart"], ["A KV shard down", "Links on that shard fail", "3× replication with automatic failover"], ["ID range service down", "New links can't get IDs", "Servers keep using their leased ranges; lease larger ranges"], ["Kafka down", "Clicks not recorded", "Buffer locally and replay; the redirect still succeeds"], ["Bad deploy", "Redirects break everywhere", "Canary by region; the redirect service changes rarely and is kept tiny"]]]
    ]},
    { h: "Interview follow-ups", blocks: [
      ["list", ["How would you prevent someone from enumerating every link? → scrambled IDs or random keys, plus rate limits.", "How do you delete a link that's cached in browsers via a 301? → you can't. Use 302 when control matters.", "How would you support 10× growth? → more KV shards (consistent hashing), more cache nodes, and redirects served from every region.", "What's the minimum code length for 10 years of 100M links/day? → 365B links needs 62⁷ ≈ 3.5T, so 7 chars."]]
    ]}
  ], [
    { q: "Why serve creates and redirects from separate fleets?", o: ["They use different languages", "A spike in rare, heavy creates must never slow the constant, latency-critical redirects", "Redirects need GPUs", "It's required by Kafka"], a: 1, why: "Isolate the hot read path." },
    { q: "How do you stop two users claiming the same custom alias at the same moment?", o: ["Check, then insert", "A conditional put-if-absent write", "A cron job", "A bigger cache"], a: 1, why: "Atomic check-and-write; the loser gets \"alias taken\"." }
  ]);

  /* ═════════════ INSTAGRAM ═════════════ */
  deep("instagram", [
    { h: "API design", blocks: [
      ["img", "Young women taking a selfie, Place du Château, Strasbourg, 2025.jpg", "Every photo taken like this becomes an upload, a set of resized copies on a CDN, and a post that gets fanned out to followers' feeds."],
      ["code", "POST /v1/media/upload-url            → { upload_url (pre-signed, 10 min), media_id }\nPUT  <upload_url>                    (client uploads bytes straight to object storage)\nPOST /v1/posts  { media_ids, caption, location } → 201 { post_id }\nGET  /v1/feed?cursor=<opaque>&limit=20 → { posts: [...], next_cursor }\nPOST /v1/users/{id}/follow           → 204"],
      ["p", "<b>Pre-signed uploads</b> keep megabytes of image data off your API servers entirely. Clients upload straight to object storage, and the API only handles small JSON. <b>Cursor pagination</b> (not page numbers) keeps the feed stable while new posts arrive."]
    ]},
    { h: "Data model", blocks: [
      ["table", ["Store", "Key", "Contents", "Sharded by"], [["Posts (wide-column / SQL)", "post_id (Snowflake)", "author_id, caption, media keys, created_at", "author_id"], ["Followers", "(followee_id, follower_id)", "\"Who follows me\": needed for fan-out", "followee_id"], ["Following", "(follower_id, followee_id)", "\"Who I follow\": needed for pull", "follower_id"], ["Feed cache (Redis)", "feed:{user_id}", "List of the newest ~500 post_ids", "user_id"], ["Media (object storage + CDN)", "media key", "Original + resized variants", "—"]]],
      ["tip", "The follow graph is stored <b>twice</b>, once per direction, because fan-out needs \"my followers\" and pull needs \"who I follow\". That's denormalization on purpose."]
    ]},
    { h: "The upload and media pipeline", blocks: [
      ["flow", flow([
        { id: "c", x: 90, y: 225, label: "Phone", sub: "uploads photo", kind: "client", icon: "📱", desc: "Gets a pre-signed URL, then uploads directly." },
        { id: "s3", x: 330, y: 90, label: "Object storage", sub: "original", kind: "db", icon: "🪣", desc: "Durable home of the original file." },
        { id: "img", x: 560, y: 90, label: "Image workers", sub: "resize & encode", kind: "service", icon: "🖼️", desc: "Thumbnail, feed size, full size, in WebP/AVIF." },
        { id: "cdn", x: 800, y: 90, label: "CDN", sub: "variants", kind: "edge", icon: "🌍", desc: "Serves the right size to each screen." },
        { id: "api", x: 330, y: 340, label: "Post API", sub: "metadata", kind: "service", icon: "⚙️", desc: "Creates the post row once media is ready." },
        { id: "q", x: 560, y: 340, label: "Fan-out queue", sub: "post_created", kind: "queue", icon: "📬", desc: "Triggers delivery to followers." }
      ], "Upload a photo", [["c", "s3", "PUT bytes to the pre-signed URL"], ["s3", "img", "Object-created event"], ["img", "cdn", "Publish 3–4 sizes"], ["c", "api", "POST /posts {media_id, caption}"], ["api", "q", "Enqueue post_created"]]), "Bytes go phone → storage → workers → CDN; the API only ever sees metadata."]
    ]},
    { h: "Fan-out workers in detail", blocks: [
      ["code", "on post_created(post):\n  author = users.get(post.author_id)\n  if author.followers > CELEBRITY_THRESHOLD:     # e.g. 100k\n      return                                      # pulled at read time instead\n  for batch in followers(author.id, page_size=1000):\n      for f in batch:\n          if not f.active_last_30_days: continue  # their feed is rebuilt on return\n          redis.lpush(f\"feed:{f.id}\", post.id)\n          redis.ltrim(f\"feed:{f.id}\", 0, 499)     # keep the newest 500"],
      ["chart", { type: "line", title: "Feed writes per post", sub: "35% of followers active; celebrity threshold 100k", x: { label: "author's followers", values: ["100", "1k", "10k", "100k", "1M", "10M", "100M"] }, y: { label: "writes", log: true }, series: [{ name: "Push to everyone", values: [100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8] }, { name: "Hybrid", values: [35, 350, 3500, 35000, 1, 1, 1] }], note: "Hybrid flattens to a single write once an account counts as a celebrity, because its posts are pulled at read time." }]
    ]},
    { h: "Reading the feed", blocks: [
      ["steps", [["Get candidates", "Read <code>feed:{me}</code> (~500 ids), plus the latest posts of the few celebrities I follow (themselves cached)."], ["Hydrate", "Multi-get the post objects and authors from cache in one round trip."], ["Rank", "Score each candidate on predicted engagement (likes, comments, saves, time spent) using features about me, the author and the post."], ["Diversify", "Avoid five posts in a row from one author; mix formats."], ["Paginate", "Return 20 posts plus an opaque cursor. The next request continues from the same ranked snapshot."]]]
    ]},
    { h: "Failure modes", blocks: [
      ["table", ["Failure", "Mitigation"], [["Fan-out queue backs up (a big creator posts)", "Prioritise active followers; followers whose feed isn't built yet fall back to pull"], ["Feed cache lost", "Rebuild on demand from the following list (slow first load, then cached)"], ["Ranking service down", "Serve reverse-chronological from the cached list (graceful degradation)"], ["CDN region degraded", "Multi-CDN, and DNS steering to another provider"]]]
    ]},
    { h: "Interview follow-ups", blocks: [
      ["list", ["How do you handle an unfollow? → remove the author's posts lazily at read time (filter), not by rewriting feeds.", "How do you delete a post everywhere? → tombstone it in the posts store; hydration skips it.", "Stories (24 h)? → separate store with TTL; the tray is computed at read time from who you follow.", "Notifications? → another consumer of the same post_created event."]]
    ]}
  ], [
    { q: "Why use pre-signed upload URLs?", o: ["They're encrypted", "Image bytes go straight to object storage, never through API servers", "They're faster to type", "CDNs need them"], a: 1, why: "API servers handle only small metadata." },
    { q: "Why store the follow graph in both directions?", o: ["Backups", "Fan-out needs \"my followers\" and pull needs \"who I follow\"", "SQL requires it", "For sorting"], a: 1, why: "Two access patterns → two denormalized copies." }
  ]);

  /* ═════════════ WHATSAPP ═════════════ */
  deep("whatsapp", [
    { h: "The connection layer", blocks: [
      ["img", "Checking mobile messages.jpg", "Most of a messenger's engineering goes into keeping this experience instant on unreliable mobile networks."],
      ["p", "Each phone keeps one long-lived TCP connection to a chat server. The server-side work is mostly <b>holding connections</b>: millions of mostly idle sockets per machine, each with a heartbeat so dead connections are detected and cleaned up."],
      ["chart", { type: "bar", title: "Requests per second needed to deliver messages", data: [["Polling every 2 s (2B devices)", 1e9], ["Push over open connections (100B msgs/day)", 1.16e6]], log: true, highlight: 1, note: "Polling sends a request whether or not there's a message. Push sends one only when there is." }],
      ["warn", "<b>Reconnect storms.</b> If a data centre blips, millions of phones reconnect in the same second. Clients must back off with random jitter, and servers must accept connections faster than they authenticate them."]
    ]},
    { h: "Message lifecycle", blocks: [
      ["table", ["State", "Meaning", "Who changes it", "Alice sees"], [["Pending", "Created on Alice's phone, not yet acknowledged", "Alice's app", "🕓"], ["Sent", "Server stored it durably", "Server ACK", "✓"], ["Delivered", "Bob's device received it", "Bob's app ACK", "✓✓"], ["Read", "Bob opened the chat", "Bob's app receipt", "blue ✓✓"]]],
      ["code", "envelope {\n  id:        \"3EB0C0…\"        // generated by the sender; dedupe key for retries\n  from:      \"+91 98…\", to: \"+1 415…\"\n  ts:        1792488000123\n  type:      text | image | receipt\n  ciphertext: <bytes>          // the server can't read this\n}"]
    ]},
    { h: "Offline delivery and push notifications", blocks: [
      ["steps", [["Bob is offline", "The registry has no live connection for Bob, so the message goes into Bob's durable offline queue, keyed by recipient."], ["Wake Bob's phone", "The server sends a push notification through Apple's APNs or Google's FCM. It's a wake-up signal, not the message itself."], ["Bob's app connects", "It drains the queue in order and ACKs each message, and the server deletes what was acknowledged."], ["Receipts flow back", "Delivered/read receipts are themselves small messages, queued for Alice if she's offline."]]]
    ]},
    { h: "Ordering, groups and media", blocks: [
      ["list", ["<b>Ordering:</b> messages in one chat are delivered in the order the server received them, over a single connection. Phones display by server order with local timestamps as a tie-breaker, so clock skew between phones doesn't scramble a conversation.", "<b>Groups (up to 1,024 members):</b> the sender encrypts once with a group \"sender key\". The server fans the ciphertext out to each member's queue and tracks per-member delivery.", "<b>Media:</b> the phone encrypts the photo with a fresh key, uploads the encrypted blob to a media store, and sends a small message containing the blob's address and the decryption key. The server stores a blob it can't open."]]
    ]},
    { h: "Presence and last seen", blocks: [
      ["p", "\"Online\" means a heartbeat arrived recently. Keep <code>presence:{user} = server_id</code> with a short TTL (say 30 s) refreshed by each heartbeat. When it expires, the user is offline and \"last seen\" becomes that moment. Presence changes are only pushed to people currently looking at that chat, never to everyone in a contact list."]
    ]},
    { h: "Failure modes", blocks: [
      ["table", ["Failure", "Mitigation"], [["A chat server dies", "Its phones reconnect (with jitter) to other servers; registry entries expire and are rewritten"], ["Lost ACK", "Sender retries with the same id; server and recipient dedupe"], ["Recipient offline for weeks", "Queue persists; very old undelivered messages expire under a retention policy"], ["Push provider delay", "The message is already queued; it's delivered whenever the app next connects"]]]
    ]},
    { h: "Interview follow-ups", blocks: [
      ["list", ["Multi-device? → each device has its own keys; the sender encrypts per device, and the server queues per device.", "Chat backups with E2EE? → encrypted client-side with a user-held key before upload.", "Message search? → on-device only, since the server can't read content.", "Typing indicators? → ephemeral events over the open connection, never stored."]]
    ]}
  ], [
    { q: "What does a push notification (APNs/FCM) carry in this design?", o: ["The full decrypted message", "A wake-up signal so the app connects and drains its queue", "The encryption key", "Nothing; it isn't used"], a: 1, why: "The message waits in the durable queue; the push just wakes the app." },
    { q: "How does the server deliver a photo it can't read?", o: ["It decrypts it", "The phone uploads an encrypted blob and sends its address + key inside the E2E message", "It forwards raw bytes in the chat stream", "Photos aren't encrypted"], a: 1, why: "The server only stores ciphertext and pointers." }
  ]);

  /* ═════════════ NETFLIX ═════════════ */
  deep("netflix", [
    { h: "What happens when you press play", blocks: [
      ["img", "TV remote control in hand 20170128.jpg", "Between pressing play and seeing the first frame, a dozen services are consulted and the nearest appliance holding the file is chosen."],
      ["steps", [["Authenticate and authorise", "The control plane checks the account, the plan (HD/4K) and the concurrent-stream limit."], ["Choose renditions", "Based on the device (codecs, screen) and the plan, pick the ladder of encodes this device may use."], ["DRM licence", "The player gets a licence so it can decrypt the protected segments."], ["Steer", "The steering service returns ranked URLs of nearby Open Connect appliances that hold these files."], ["Start low, then climb", "The first segments are fetched at modest quality for a fast start; ABR steps up as the buffer fills."]]]
    ]},
    { h: "The encoding pipeline", blocks: [
      ["flow", flow([
        { id: "m", x: 90, y: 225, label: "Studio master", sub: "huge source file", kind: "client", icon: "🎬", desc: "Very high bitrate source." },
        { id: "sp", x: 300, y: 225, label: "Splitter", sub: "chunks of a few minutes", kind: "service", icon: "✂️", desc: "Cuts on scene boundaries so chunks encode independently." },
        { id: "e", x: 520, y: 90, label: "Encoders ×1000s", sub: "parallel", kind: "service", icon: "🎞️", desc: "Each chunk × each resolution × each codec." },
        { id: "qc", x: 520, y: 360, label: "Quality check", sub: "per-title metrics", kind: "service", icon: "🔍", desc: "Measures visual quality per bitrate to build the ladder." },
        { id: "pk", x: 740, y: 225, label: "Packager + DRM", sub: "DASH / HLS", kind: "queue", icon: "📦", desc: "Segments, manifests and encryption." },
        { id: "o", x: 920, y: 225, label: "Origin storage", sub: "all renditions", kind: "db", icon: "🗄️", desc: "Feeds Open Connect at night." }
      ], "Encode a new episode", [["m", "sp", "Ingest"], ["sp", "e", "Fan out chunks to thousands of workers"], ["e", "qc", "Score quality at each bitrate"], ["qc", "pk", "Assemble the per-title ladder"], ["pk", "o", "Store packaged, encrypted renditions"]]), "Parallel chunk encoding turns days of encoding into hours."],
      ["chart", { type: "bar", title: "A typical bitrate ladder (illustrative)", data: [["240p", 0.3], ["360p", 0.75], ["480p", 1.75], ["720p", 3], ["1080p", 5.8], ["4K", 16]], unit: "Mbps", highlight: 4, note: "Per-title encoding moves these rungs: a cartoon might reach 1080p quality at far less than 5.8 Mbps." }]
    ]},
    { h: "Open Connect: filling the edge", blocks: [
      ["list", ["<b>Two tiers:</b> appliances embedded <i>inside</i> ISPs (closest to viewers) and larger ones at internet exchange points.", "<b>Proactive fill:</b> each night, in the region's quiet hours, appliances download the titles predicted to be popular there tomorrow. Peak-hour traffic then rarely leaves the ISP.", "<b>Health-aware steering:</b> appliances report load and health constantly, and steering avoids busy or failing ones mid-session."]],
      ["tip", "The win for ISPs: Netflix traffic stays inside their network instead of crossing expensive transit links, which is why ISPs host the hardware."]
    ]},
    { h: "Resilience in the control plane", blocks: [
      ["table", ["Technique", "What it does"], [["Chaos Monkey", "Randomly kills production instances so every service tolerates loss"], ["Circuit breakers + fallbacks", "If personalisation fails, show popular rows rather than an error"], ["Multi-region, active-active", "Traffic can be shifted out of a failing cloud region"], ["Bulkheads", "Separate thread pools per dependency so one slow service can't starve the rest"]]]
    ]},
    { h: "Interview follow-ups", blocks: [
      ["list", ["Live events? → segments must be encoded in real time, the manifest updates constantly, and everyone requests the same segment at once (see the video lesson).", "Downloads for offline viewing? → the same renditions with a time-limited offline DRM licence.", "\"Continue watching\"? → the player posts its position every few seconds to a small, eventually consistent store.", "Thumbnails and artwork? → personalised images chosen by a separate service and served from the CDN."]]
    ]}
  ], [
    { q: "Why does playback start at modest quality?", o: ["To save money", "A small first segment downloads fast, minimising startup time, then ABR climbs", "Licences require it", "TVs are slow"], a: 1, why: "Time-to-first-frame matters most; quality catches up within seconds." },
    { q: "Why fill Open Connect appliances at night?", o: ["Electricity is cheaper", "Off-peak bandwidth is free capacity, so peak traffic stays inside the ISP", "Encoding happens at night", "Security"], a: 1, why: "Move bytes when links are idle, serve them locally when everyone watches." }
  ]);
})();
