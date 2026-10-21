/* Blueprint case study — Instagram: Design the News Feed. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "instagram",
  app: "Instagram",
  icon: "📸",
  color: "#e1306c",
  color2: "#f77737",
  title: "Design the News Feed",
  tagline: "Merge posts from hundreds of accounts, rank them, and show them in under a second, for over a billion people.",
  level: "Intermediate",
  minutes: 30,
  concepts: ["fanout","hot-key","caching","object-storage","cdn","message-queue"],
  stats: [
    {v: 2,suf: "B+",label: "monthly active users (Meta, 2022)",kind: "Reported"},
    {v: 600,suf: "M+",label: "followers on the largest accounts",kind: "Reported"},
    {v: 1,pre: "<",suf: " s",label: "feed load target",kind: "Design goal"}
  ],
  story: "You open Instagram and your feed is just <i>there</i>: friends' photos, a creator you love, a celebrity's latest post, already ranked.<br><br>That feed is a merge of posts from every account you follow. Doing that merge from scratch for over a billion people, many times a day, would bury any database. The trick is deciding <b>when</b> to do the work: at post time or at read time.",
  requirements: {
    functional: ["Post photos/videos with captions","Follow other accounts","See a ranked feed of followed accounts' posts","Infinite scroll (pagination)"],
    nonFunctional: ["Feed loads fast (<1 s), even on mobile","Reads vastly outnumber posts","Eventual consistency is fine: a post can appear a few seconds late","Media must be durable and globally fast"]
  },
  estimate: [
    ["Daily active users","assumption","500 M"],
    ["Feed opens / sec","500M × 10 ÷ 86,400","≈ 58,000 /s"],
    ["New posts / sec","100M ÷ 86,400","≈ 1,160 /s"],
    ["Fan-out writes / sec","1,160 × 200 avg followers","≈ 230,000 /s"],
    ["New media / day","100M × 2 MB","≈ 200 TB"]
  ],
  estimateNote: "Insight: push-based fan-out turns ~1k posts/s into ~230k feed writes/s. That's a lot of work, but it's cheap, parallel writes, and it turns 58k expensive merges per second into 58k single lookups.",
  naive: {
    title: "\"Query it live on every open\"",
    desc: "SELECT * FROM posts WHERE author_id IN (…the 300 people I follow…) ORDER BY created_at DESC LIMIT 20",
    breaks: ["Posts are sharded by author, so one feed open fans out to hundreds of shards and waits for the slowest one.","58,000 of those scatter-gather queries per second is a self-inflicted DDoS on the database.","Ranking needs many more candidates than 20, which multiplies the cost again."]
  },
  steps: [
    {
      t: "Separate the bytes from the metadata",
      c: "object-storage",
      b: "Photos and videos go to <b>object storage</b> and are delivered through a <b>CDN</b>. The database stores only a small post record: id, author, caption, media URL, timestamp. Now the hard problem is purely about tiny records.",
      a: "A library catalog card points to a book in the warehouse; you don't photocopy the book onto the card."
    },
    {
      t: "Fan-out on write: precompute every feed",
      c: "fanout",
      b: "When you post, a background worker (fed by a queue) inserts your post ID at the top of each follower's <b>precomputed feed list</b> in an in-memory store like Redis. Opening the app becomes one read: \"give me my list\".",
      a: "Delivering the newspaper to every doorstep at dawn, so everyone's breakfast reading is instant."
    },
    {
      t: "Meet the celebrity problem",
      c: "hot-key",
      b: "An account with 600M followers posts. Push means 600M writes for one post: it could take many minutes to deliver and wastes work on followers who won't open the app today. One hot key breaks the push model.",
      a: "Printing and hand-delivering 600 million copies before anyone can read the headline."
    },
    {
      t: "Fan-out on read for the famous few",
      c: "fanout",
      b: "For accounts above a follower threshold, <b>don't push</b>. At read time, merge your precomputed list with the recent posts of the handful of celebrities you follow. Those celebrity posts are themselves hot and cached, so this merge is cheap.",
      a: "Most news is delivered to the door, but for the one famous paper, you stop at the newsstand."
    },
    {
      t: "Go hybrid, and skip the inactive",
      c: "caching",
      b: "Push for normal accounts, pull for celebrities. A further saving: <b>only push to active users</b>. A follower who hasn't opened the app in a month gets their feed built on demand when they return.",
      a: "Don't deliver papers to houses that have been empty all summer."
    },
    {
      t: "Rank, don't just sort",
      c: "message-queue",
      b: "Instagram moved from a chronological feed to a ranked feed in 2016. Candidate posts (from the steps above) are scored by ML models predicting how likely you are to engage, then the top results are returned. Feature data and signals flow in asynchronously through event pipelines.",
      a: "A friend who reads every newspaper and hands you the five articles you'll actually care about."
    }
  ],
  diagram: {
    nodes: [
      {
        id: "u",
        x: 90,
        y: 110,
        label: "Poster",
        sub: "uploads photo",
        kind: "client",
        icon: "🤳",
        desc: "Creates a post: media upload + metadata."
      },
      {
        id: "r",
        x: 90,
        y: 340,
        label: "Reader",
        sub: "opens feed",
        kind: "client",
        icon: "📱",
        desc: "Opens the app many times per day."
      },
      {
        id: "api",
        x: 290,
        y: 220,
        label: "Post / Feed API",
        sub: "stateless",
        kind: "service",
        icon: "⚙️",
        desc: "Handles uploads and feed requests."
      },
      {
        id: "s3",
        x: 290,
        y: 60,
        label: "Object Store + CDN",
        sub: "media bytes",
        kind: "edge",
        icon: "🪣",
        desc: "Durable media storage. The CDN serves the images to everyone."
      },
      {
        id: "pdb",
        x: 520,
        y: 60,
        label: "Posts DB",
        sub: "sharded by author",
        kind: "db",
        icon: "🗄️",
        desc: "Source of truth for post metadata."
      },
      {
        id: "q",
        x: 520,
        y: 220,
        label: "Fan-out Queue",
        sub: "Kafka",
        kind: "queue",
        icon: "📬",
        desc: "Decouples posting from feed delivery."
      },
      {
        id: "fw",
        x: 730,
        y: 220,
        label: "Fan-out Workers",
        sub: "push to followers",
        kind: "service",
        icon: "📣",
        desc: "Look up followers (skipping celebrities' and inactive users) and append post IDs to feeds."
      },
      {
        id: "feed",
        x: 730,
        y: 380,
        label: "Feed Cache",
        sub: "Redis lists",
        kind: "cache",
        icon: "⚡",
        desc: "user_id → [post ids…] precomputed timelines."
      },
      {
        id: "rank",
        x: 520,
        y: 380,
        label: "Ranking",
        sub: "ML scoring",
        kind: "service",
        icon: "🧠",
        desc: "Scores candidates; merges in celebrity posts pulled at read time."
      },
      {
        id: "g",
        x: 920,
        y: 220,
        label: "Social Graph",
        sub: "who follows whom",
        kind: "db",
        icon: "🕸️",
        desc: "Follower lists, with counts that decide push vs. pull."
      }
    ],
    flows: [
      {
        name: "Normal user posts",
        steps: [
          ["u","s3","Upload photo bytes"],
          ["u","api","POST /posts {caption, media_url}"],
          ["api","pdb","Persist post metadata"],
          ["api","q","Enqueue \"post created\""],
          ["q","fw","Worker picks it up"],
          ["fw","g","Fetch 200 followers (active only)"],
          ["fw","feed","Prepend post id to 200 feed lists"]
        ]
      },
      {
        name: "Reader opens feed",
        steps: [
          ["r","api","GET /feed"],
          ["api","feed","Read my precomputed list (1 lookup)"],
          ["api","rank","Merge celebrity posts and score candidates"],
          ["rank","pdb","Fetch hot celebrity posts (cached)"],
          ["api","r","Ranked page of posts; images load from CDN"]
        ]
      }
    ]
  },
  lab: {
    sim: "fanout",
    title: "Fan-out Lab",
    hint: "Drag the follower count from 10 to 1 billion, switch strategies, and hit Post. Watch where the work lands and when push stops working."
  },
  tradeoffs: [
    {
      choice: "Push (fan-out on write)",
      pro: "Feed reads are a single lookup",
      con: "Huge write amplification; slow for celebrities"
    },
    {
      choice: "Pull (fan-out on read)",
      pro: "Posting is free; always fresh",
      con: "Every feed open is an expensive scatter-gather"
    },
    {choice: "Hybrid",pro: "Best of both for real-world skew",con: "Two code paths and a threshold to tune"}
  ],
  takeaways: ["The core question in feed design: pay at write time or at read time?","Real traffic is skewed. Design for the hot keys explicitly.","Precomputation is a cache. Skip it for users who won't read it."],
  quiz: [
    {
      q: "Why does fan-out on write make feed reads cheap?",
      o: ["It compresses images","The feed is precomputed, so reading is a single lookup","It uses SQL joins","Readers download every post"],
      a: 1,
      why: "The expensive merge happened at post time; reading is just fetching a ready list."
    },
    {
      q: "An account with 50M followers posts. Best strategy?",
      o: ["Push to all 50M feeds immediately","Pull: merge their posts at read time","Email everyone","Delay the post a day"],
      a: 1,
      why: "Pushing would mean 50M writes per post. Pulling is cheap because that post is hot and cached."
    },
    {
      q: "Where should photo bytes live?",
      o: ["In the posts table as BLOBs","In Redis","Object storage, served via a CDN","On the app servers' disks"],
      a: 2,
      why: "Object storage is cheap and durable; CDNs make delivery fast worldwide."
    },
    {
      q: "A cheap optimization for push fan-out?",
      o: ["Skip followers who haven't been active recently","Push twice for safety","Use a bigger font","Only push to celebrities"],
      a: 0,
      why: "Inactive users get their feed built on demand if they return, which saves a huge number of writes."
    },
    {
      q: "Why use pre-signed upload URLs?",
      o: ["They're encrypted","Image bytes go straight to object storage, never through API servers","They're faster to type","CDNs need them"],
      a: 1,
      why: "API servers handle only small metadata."
    },
    {
      q: "Why store the follow graph in both directions?",
      o: ["Backups","Fan-out needs \"my followers\" and pull needs \"who I follow\"","SQL requires it","For sorting"],
      a: 1,
      why: "Two access patterns → two denormalized copies."
    }
  ],
  sources: ["Instagram/Meta engineering talks on feed ranking","Meta: Instagram reached 2B monthly users (2022)"],
  deep: [
    {
      h: "API design",
      blocks: [
        ["img","Young women taking a selfie, Place du Château, Strasbourg, 2025.jpg","Every photo taken like this becomes an upload, a set of resized copies on a CDN, and a post that gets fanned out to followers' feeds."],
        ["code","POST /v1/media/upload-url            → { upload_url (pre-signed, 10 min), media_id }\nPUT  <upload_url>                    (client uploads bytes straight to object storage)\nPOST /v1/posts  { media_ids, caption, location } → 201 { post_id }\nGET  /v1/feed?cursor=<opaque>&limit=20 → { posts: [...], next_cursor }\nPOST /v1/users/{id}/follow           → 204"],
        ["p","<b>Pre-signed uploads</b> keep megabytes of image data off your API servers entirely. Clients upload straight to object storage, and the API only handles small JSON. <b>Cursor pagination</b> (not page numbers) keeps the feed stable while new posts arrive."]
      ]
    },
    {
      h: "Data model",
      blocks: [
        ["table",["Store","Key","Contents","Sharded by"],[["Posts (wide-column / SQL)","post_id (Snowflake)","author_id, caption, media keys, created_at","author_id"],["Followers","(followee_id, follower_id)","\"Who follows me\": needed for fan-out","followee_id"],["Following","(follower_id, followee_id)","\"Who I follow\": needed for pull","follower_id"],["Feed cache (Redis)","feed:{user_id}","List of the newest ~500 post_ids","user_id"],["Media (object storage + CDN)","media key","Original + resized variants","—"]]],
        ["tip","The follow graph is stored <b>twice</b>, once per direction, because fan-out needs \"my followers\" and pull needs \"who I follow\". That's denormalization on purpose."]
      ]
    },
    {
      h: "The upload and media pipeline",
      blocks: [
        ["flow",{"nodes":[{"id":"c","x":90,"y":225,"label":"Phone","sub":"uploads photo","kind":"client","icon":"📱","desc":"Gets a pre-signed URL, then uploads directly."},{"id":"s3","x":330,"y":90,"label":"Object storage","sub":"original","kind":"db","icon":"🪣","desc":"Durable home of the original file."},{"id":"img","x":560,"y":90,"label":"Image workers","sub":"resize & encode","kind":"service","icon":"🖼️","desc":"Thumbnail, feed size, full size, in WebP/AVIF."},{"id":"cdn","x":800,"y":90,"label":"CDN","sub":"variants","kind":"edge","icon":"🌍","desc":"Serves the right size to each screen."},{"id":"api","x":330,"y":340,"label":"Post API","sub":"metadata","kind":"service","icon":"⚙️","desc":"Creates the post row once media is ready."},{"id":"q","x":560,"y":340,"label":"Fan-out queue","sub":"post_created","kind":"queue","icon":"📬","desc":"Triggers delivery to followers."}],"flows":[{"name":"Upload a photo","steps":[["c","s3","PUT bytes to the pre-signed URL"],["s3","img","Object-created event"],["img","cdn","Publish 3–4 sizes"],["c","api","POST /posts {media_id, caption}"],["api","q","Enqueue post_created"]]}]},"Bytes go phone → storage → workers → CDN; the API only ever sees metadata."]
      ]
    },
    {
      h: "Fan-out workers in detail",
      blocks: [
        ["code","on post_created(post):\n  author = users.get(post.author_id)\n  if author.followers > CELEBRITY_THRESHOLD:     # e.g. 100k\n      return                                      # pulled at read time instead\n  for batch in followers(author.id, page_size=1000):\n      for f in batch:\n          if not f.active_last_30_days: continue  # their feed is rebuilt on return\n          redis.lpush(f\"feed:{f.id}\", post.id)\n          redis.ltrim(f\"feed:{f.id}\", 0, 499)     # keep the newest 500"],
        ["chart",{"type":"line","title":"Feed writes per post","sub":"35% of followers active; celebrity threshold 100k","x":{"label":"author's followers","values":["100","1k","10k","100k","1M","10M","100M"]},"y":{"label":"writes","log":true},"series":[{"name":"Push to everyone","values":[100,1000,10000,100000,1000000,10000000,100000000]},{"name":"Hybrid","values":[35,350,3500,35000,1,1,1]}],"note":"Hybrid flattens to a single write once an account counts as a celebrity, because its posts are pulled at read time."}]
      ]
    },
    {
      h: "Reading the feed",
      blocks: [
        ["steps",[["Get candidates","Read <code>feed:{me}</code> (~500 ids), plus the latest posts of the few celebrities I follow (themselves cached)."],["Hydrate","Multi-get the post objects and authors from cache in one round trip."],["Rank","Score each candidate on predicted engagement (likes, comments, saves, time spent) using features about me, the author and the post."],["Diversify","Avoid five posts in a row from one author; mix formats."],["Paginate","Return 20 posts plus an opaque cursor. The next request continues from the same ranked snapshot."]]]
      ]
    },
    {
      h: "Failure modes",
      blocks: [
        ["table",["Failure","Mitigation"],[["Fan-out queue backs up (a big creator posts)","Prioritise active followers; followers whose feed isn't built yet fall back to pull"],["Feed cache lost","Rebuild on demand from the following list (slow first load, then cached)"],["Ranking service down","Serve reverse-chronological from the cached list (graceful degradation)"],["CDN region degraded","Multi-CDN, and DNS steering to another provider"]]]
      ]
    },
    {
      h: "Interview follow-ups",
      blocks: [
        ["list",["How do you handle an unfollow? → remove the author's posts lazily at read time (filter), not by rewriting feeds.","How do you delete a post everywhere? → tombstone it in the posts store; hydration skips it.","Stories (24 h)? → separate store with TTL; the tray is computed at read time from who you follow.","Notifications? → another consumer of the same post_created event."]]
      ]
    }
  ]
});
