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
  minutes: 32,
  concepts: ["fanout","hot-key","caching","object-storage","cdn","message-queue"],
  stats: [
    {v: 2,suf: "B+",label: "monthly active users (Meta, 2022)",kind: "Reported"},
    {v: 600,suf: "M+",label: "followers on the biggest accounts",kind: "Reported"},
    {v: 1,pre: "<",suf: " s",label: "how fast the feed should load",kind: "Design goal"}
  ],
  story: "You're in a queue at the coffee shop. You open Instagram, and before your thumb has even settled, the feed is just <i>there</i>: your cousin's beach photo from an hour ago, a recipe video from a creator you love, a footballer's post from this morning, already sorted so the good stuff is on top.<br><br>Think about what that screen actually is. You follow, say, 300 accounts. Each of them posts whenever they like. Your feed is a merge of all their recent posts, filtered and ranked just for you. Now do that for hundreds of millions of people, each opening the app ten times a day, and make every one of those merges finish in under a second on a shaky mobile connection.<br><br>If you did that merge from scratch every time someone opened the app, you'd bury any database ever built. So the real question in feed design isn't <i>how</i> to merge. It's <b>when</b>. Do you do the work when someone posts, or when someone reads?<br><br>And then a footballer with 600 million followers posts a photo, and whichever answer you picked gets tested very, very hard.<br><br>We'll build the feed step by step, starting with the obvious query and watching it fall over. (As with every case here, this is a simplified teaching model built from public talks and write-ups, not Instagram's exact internal design.)",
  requirements: {
    functional: ["Post photos and videos with a caption","Follow and unfollow other accounts","See a ranked feed of posts from accounts you follow","Infinite scroll: keep loading older posts as you swipe","Like and comment (the feed shows counts)"],
    nonFunctional: ["The feed loads in under a second, even on a slow phone network","Reads vastly outnumber posts: people scroll far more than they share","Eventual consistency is fine: a new post can appear in followers' feeds a few seconds late","Photos and videos must never be lost and must load fast anywhere in the world","Has to cope with accounts that have hundreds of millions of followers"]
  },
  estimate: [
    ["Daily active users","assumption","500 M"],
    ["Feed opens per second","500M × 10 opens ÷ 86,400","≈ 58,000 /s"],
    ["New posts per second","100M posts ÷ 86,400","≈ 1,160 /s"],
    ["Feed writes per second if we push every post","1,160 × 200 avg followers","≈ 230,000 /s"],
    ["New photos and videos per day","100M × 2 MB","≈ 200 TB"],
    ["Feed cache for one user","500 post ids × 8 B","≈ 4 KB"]
  ],
  estimateNote: "Let's read these like a story. People open the feed about 58,000 times a second, and every one of those opens wants a merged, ranked list right now. Meanwhile only about 1,160 posts are created per second.<br><br>If we do the merge at post time (push each post into every follower's feed), those 1,160 posts turn into about 230,000 small feed writes a second. That sounds scary, but each write is tiny, they run in parallel, and nobody is waiting on them. In exchange, 58,000 expensive merges a second become 58,000 simple lookups. That's the trade at the heart of this design.<br><br>The media number is a different problem altogether. 200 TB of new photos and videos a day can't live in a database. It goes to cheap object storage and gets served through a CDN, which is why the first step below separates the pictures from everything else.",
  naive: {
    title: "\"Query it live on every open\"",
    desc: "The first version is one SQL query. When you open the app, find the people you follow and grab their newest posts: <code>SELECT * FROM posts WHERE author_id IN (…the 300 people I follow…) ORDER BY created_at DESC LIMIT 20</code>. On a single database with a few thousand users, this is honestly fine. It's always fresh, posting costs nothing, and there's no extra machinery. The trouble starts when the data no longer fits on one machine.",
    breaks: ["<b>The query scatters across shards.</b> Once posts are split across many databases by author, your 300 followed accounts live on hundreds of different machines. One feed open becomes hundreds of queries, and you wait for the slowest one. If one machine is having a bad second, everyone's feed is slow.","<b>58,000 of those a second is a self-inflicted attack.</b> Each open fans out to hundreds of shards, so the databases see millions of small queries a second, almost all of them asking for the same recent posts again and again.","<b>Ranking needs far more than 20 posts.</b> To pick the best 20, a ranking model wants a few hundred candidates. That multiplies the read cost again.","<b>The media makes it worse.</b> If photos are stored in the same database as BLOBs, every feed open drags megabytes through the database too."]
  },
  steps: [
    {
      t: "Separate the bytes from the metadata",
      c: "object-storage",
      b: "A post has two very different parts. There's the photo or video, which is big (a couple of megabytes) and never changes. And there's the post record: who posted it, the caption, the time, and where the photo lives. That's a few hundred bytes.<br><br>So we split them. Photos and videos go to <b>object storage</b>, a service built to hold huge numbers of files cheaply and durably (think Amazon S3). They're delivered through a <b>CDN</b>, a network of servers around the world that keep copies close to users, so a photo opened in Delhi comes from a server in or near Delhi.<br><br>The database stores only the small post record, with a pointer to the media. Now the hard problem, building the feed, is purely about shuffling tiny records. A feed of 20 posts is a few kilobytes of metadata, and the phone fetches the images separately from the CDN.",
      a: "A library catalogue card points to a book in the warehouse. You don't photocopy the whole book onto the card."
    },
    {
      t: "Fan-out on write: precompute every feed",
      c: "fanout",
      b: "Here's the big idea. Instead of merging when someone reads, merge when someone posts. This is called <b>fan-out on write</b>, or “push”: one post fans out into many feeds.<br><br>Every user gets a <b>precomputed feed list</b>, a short list of post IDs kept in a fast in-memory store like Redis. When your friend posts, the post goes onto a queue, and background workers look up their followers and add the new post ID to the top of each follower's list. Opening the app becomes one read: “give me my list”.<br><br>A tiny example: Priya has 200 followers and posts a photo. The workers do 200 quick writes, each adding one 8-byte ID to someone's list. Five seconds later, all 200 followers have it at the top of their feed, and none of them had to wait for a merge.<br><br>The cost is <b>write amplification</b>: one post becomes many writes. At our scale that's about 230,000 writes a second, and we keep only the newest ~500 IDs per user so the lists don't grow forever.",
      a: "Delivering the newspaper to every doorstep at dawn, so breakfast reading is instant. Printing is a lot of work, but it happens before anyone wakes up."
    },
    {
      t: "Meet the celebrity problem",
      c: "hot-key",
      b: "Push works beautifully for Priya and her 200 followers. Now a footballer with 600 million followers posts.<br><br>Fan-out on write means <b>600 million writes for one post</b>. Even at a very fast rate, that takes many minutes, so followers at the end of the line see the post long after the people at the front. It clogs the queue, so ordinary users' posts get stuck behind it. And it's mostly wasted: a big share of those 600 million people won't open the app today at all.<br><br>This is a <b>hot key</b> problem. A hot key is one item, here one account, that gets wildly more traffic than everything else. Designs that assume load is spread evenly break the moment a single key carries a huge share of the work.",
      a: "Printing and hand-delivering 600 million copies of one newspaper before anyone is allowed to read the headline."
    },
    {
      t: "Fan-out on read for the famous few",
      c: "fanout",
      b: "The fix is to stop pushing for the famous. For accounts above a follower threshold (say, 100,000 followers, a number you'd tune), we <b>don't fan out at all</b>. Their posts are written once, to the posts store.<br><br>At read time, when you open your feed, we take your precomputed list (which has all the normal accounts) and merge in the recent posts from the handful of celebrities you follow. This is <b>fan-out on read</b>, or “pull”.<br><br>Why is this cheap? Because you follow maybe five or ten celebrities, not three hundred. And their posts are hot: millions of people are asking for them, so they're sitting in a cache already. Merging ten cached lists into one is quick work.<br><br>The cost is a second code path. The feed service now has two ways to get posts, and you have to pick and maintain the threshold.",
      a: "Most news is delivered to your door, but for the one famous paper everyone reads, you grab a copy at the newsstand on your way past."
    },
    {
      t: "Go hybrid, and skip the inactive",
      c: "caching",
      b: "So the final rule is a <b>hybrid</b>: push for normal accounts, pull for celebrities. Real social networks are extremely skewed, a few accounts have enormous followings and most have a few hundred, so the hybrid matches how the data actually looks.<br><br>There's another easy saving. Why build a feed for someone who isn't going to read it? <b>Only push to active users</b>, say people who opened the app in the last 30 days. If 35% of followers are active (a made-up but reasonable figure), you've just cut fan-out writes by nearly two thirds.<br><br>When an inactive follower comes back after a summer away, their feed list is empty. We build it on demand: look up who they follow, pull recent posts, merge, cache. Their first load is slower, maybe a second instead of a tenth of a second, and after that they're back on the fast path.<br><br>Notice what this really is. A precomputed feed is a cache, and the oldest rule of caching applies: don't cache things nobody will read.",
      a: "Don't deliver papers to houses that have been empty all summer. When the family comes home, they can pick up the week's news at the shop."
    },
    {
      t: "Rank, don't just sort",
      c: "message-queue",
      b: "Early Instagram showed posts newest-first. In 2016 it moved to a <b>ranked</b> feed, because people were missing a large share of posts from friends they cared about, buried under whatever was most recent.<br><br>Ranking works in two stages. First, gather a few hundred <b>candidates</b> from the steps above (your precomputed list plus celebrity posts). Then <b>score</b> each one with machine learning models that predict how likely you are to engage with it: like it, comment, save it, or spend time looking at it. The model uses signals about you, about the author, about the post, and about your history with that author. The top results are returned.<br><br>Where do those signals come from? Every like, comment and view is an event, and events flow through message queues into pipelines that keep the features up to date. That's why this step is tied to the <b>message queue</b> concept: ranking depends on a steady stream of asynchronous updates, and the feed request just reads the latest values.<br><br>The cost: the feed now depends on a ranking service, and that service can be slow or down. We'll handle that in the failure section.",
      a: "A friend who reads every newspaper in town and hands you the five articles you'll actually care about."
    },
    {
      t: "Paginate with a cursor, not page numbers",
      c: "caching",
      b: "You scroll, and more posts load. How does the server know what to send next?<br><br>The naive answer is page numbers: page 1 is posts 1 to 20, page 2 is 21 to 40. But the feed keeps changing while you scroll. If five new posts arrive between page 1 and page 2, everything shifts down by five, and you see five posts twice.<br><br>Instead, each response includes an opaque <b>cursor</b>, a small token that says “you stopped here”. It encodes where you were in the ranked list (or the ID of the last post you saw). The next request sends the cursor back, and the server continues from exactly that point. New posts don't push old ones around; they'll show up next time you pull to refresh.<br><br>It costs almost nothing, and it fixes one of the most visible bugs a feed can have.",
      a: "A bookmark in a book, instead of remembering “I was on page 42” in a book where someone keeps inserting new pages at the front."
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
      pro: "Opening the feed is a single lookup, so reads are fast and predictable",
      con: "One post becomes hundreds or millions of writes; very slow for celebrities, and wasted on people who never open the app"
    },
    {
      choice: "Pull (fan-out on read)",
      pro: "Posting costs nothing extra and the feed is always fresh",
      con: "Every feed open is an expensive merge across many shards, 58,000 times a second"
    },
    {
      choice: "Hybrid (push for most, pull for celebrities)",
      pro: "Matches the real, skewed shape of social graphs, so both posting and reading stay cheap",
      con: "Two code paths to build and test, and a follower threshold to tune"
    },
    {
      choice: "Ranked vs. chronological feed",
      pro: "People see the posts they care about instead of whatever is newest",
      con: "Needs ML models, feature pipelines and a fallback; harder to explain why a post appears where it does"
    },
    {
      choice: "Only pushing to active users",
      pro: "Cuts fan-out writes by a large fraction for free",
      con: "Returning users get one slow first load while their feed is rebuilt"
    }
  ],
  takeaways: ["The core question in feed design: pay at write time or at read time?","Reads outnumber writes here, so paying at write time usually wins, until a single account breaks the maths.","Real traffic is skewed. Design for the hot keys explicitly instead of hoping they average out.","A precomputed feed is a cache. Skip it for users who won't read it.","Keep media out of the database: object storage for the bytes, a CDN for delivery, tiny records for the feed.","Every feature that depends on a smart service (like ranking) needs a dumb fallback (like newest-first)."],
  quiz: [
    {
      q: "Why does fan-out on write make feed reads cheap?",
      o: ["It compresses images","The feed is precomputed, so reading is a single lookup","It uses SQL joins","Readers download every post"],
      a: 1,
      why: "The expensive merge already happened when the post was created; reading just fetches a ready-made list."
    },
    {
      q: "An account with 50M followers posts. Best strategy?",
      o: ["Push to all 50M feeds immediately","Pull: merge their posts at read time","Email everyone","Delay the post a day"],
      a: 1,
      why: "Pushing would mean 50M writes for one post. Pulling is cheap because that post is hot and already cached."
    },
    {
      q: "Where should photo bytes live?",
      o: ["In the posts table as BLOBs","In Redis","Object storage, served via a CDN","On the app servers' disks"],
      a: 2,
      why: "Object storage is cheap and durable; a CDN puts copies near users so photos load fast worldwide."
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
      why: "API servers only handle small JSON, so a wave of uploads can't tie them up."
    },
    {
      q: "Why store the follow graph in both directions?",
      o: ["Backups","Fan-out needs \"my followers\" and pull needs \"who I follow\"","SQL requires it","For sorting"],
      a: 1,
      why: "Two access patterns, so two denormalised copies, each sharded by the user who asks."
    },
    {
      q: "Five new posts arrive while you scroll. With page-number pagination, what goes wrong?",
      o: ["Nothing","Everything shifts, so you see some posts twice","The app crashes","Images fail to load"],
      a: 1,
      why: "Page 2 is now offset by five posts. A cursor remembers where you actually stopped, so nothing repeats."
    },
    {
      q: "The ranking service is down. What should the feed do?",
      o: ["Show an error","Show the cached list newest-first","Wait until it recovers","Show only celebrity posts"],
      a: 1,
      why: "Graceful degradation: a chronological feed is worse than a ranked one but far better than an empty screen."
    },
    {
      q: "Roughly how many feed writes per second does pushing every post cause in our estimate?",
      o: ["1,160","58,000","230,000","200 TB"],
      a: 2,
      why: "About 1,160 posts a second × 200 average followers ≈ 230,000 small writes a second."
    }
  ],
  sources: ["Instagram/Meta engineering talks on feed ranking","Meta: Instagram reached 2B monthly users (2022)"],
  deep: [
    {
      h: "API design",
      blocks: [
        ["img","Young women taking a selfie, Place du Château, Strasbourg, 2025.jpg","Every photo taken like this becomes an upload, a set of resized copies on a CDN, and a post that gets fanned out to followers' feeds."],
        ["p","Here are the calls a phone actually makes. Notice that the upload happens in two parts, and the API server never touches the image itself."],
        ["code","POST /v1/media/upload-url            → { upload_url (pre-signed, 10 min), media_id }\nPUT  <upload_url>                    (client uploads bytes straight to object storage)\nPOST /v1/posts  { media_ids, caption, location } → 201 { post_id }\nGET  /v1/feed?cursor=<opaque>&limit=20 → { posts: [...], next_cursor }\nPOST /v1/users/{id}/follow           → 204"],
        ["p","<b>Pre-signed uploads</b> keep megabytes of image data off your API servers entirely. A pre-signed URL is a temporary link, valid for a few minutes, that lets the phone upload one file straight into object storage without needing storage credentials. The API only handles small JSON. <b>Cursor pagination</b> (not page numbers) keeps the feed stable while new posts arrive."]
      ]
    },
    {
      h: "Data model",
      blocks: [
        ["p","Each store below answers one question quickly. That's the general shape of large systems: instead of one database that does everything, several stores that each do one thing well."],
        ["table",["Store","Key","Contents","Sharded by"],[["Posts (wide-column / SQL)","post_id (Snowflake)","author_id, caption, media keys, created_at","author_id"],["Followers","(followee_id, follower_id)","\"Who follows me\": needed for fan-out","followee_id"],["Following","(follower_id, followee_id)","\"Who I follow\": needed for pull","follower_id"],["Feed cache (Redis)","feed:{user_id}","List of the newest ~500 post_ids","user_id"],["Media (object storage + CDN)","media key","Original + resized variants","—"]]],
        ["tip","The follow graph is stored <b>twice</b>, once per direction, because fan-out needs \"my followers\" and pull needs \"who I follow\". That's denormalization on purpose."],
        ["p","A word on <b>Snowflake IDs</b>: they're 64-bit numbers that start with a timestamp, so sorting by ID is roughly sorting by time, and any server can create one without asking a central counter. That's handy for a feed, where “newest first” is the default order and posts are created all over the world at once."]
      ]
    },
    {
      h: "The upload and media pipeline",
      blocks: [
        ["p","A photo from a modern phone might be 4,000 pixels wide. Nobody needs that on a feed thumbnail. So uploads go through a small pipeline that makes several sizes, and the CDN serves the right one to each screen."],
        ["flow",{"nodes":[{"id":"c","x":90,"y":225,"label":"Phone","sub":"uploads photo","kind":"client","icon":"📱","desc":"Gets a pre-signed URL, then uploads directly."},{"id":"s3","x":330,"y":90,"label":"Object storage","sub":"original","kind":"db","icon":"🪣","desc":"Durable home of the original file."},{"id":"img","x":560,"y":90,"label":"Image workers","sub":"resize & encode","kind":"service","icon":"🖼️","desc":"Thumbnail, feed size, full size, in WebP/AVIF."},{"id":"cdn","x":800,"y":90,"label":"CDN","sub":"variants","kind":"edge","icon":"🌍","desc":"Serves the right size to each screen."},{"id":"api","x":330,"y":340,"label":"Post API","sub":"metadata","kind":"service","icon":"⚙️","desc":"Creates the post row once media is ready."},{"id":"q","x":560,"y":340,"label":"Fan-out queue","sub":"post_created","kind":"queue","icon":"📬","desc":"Triggers delivery to followers."}],"flows":[{"name":"Upload a photo","steps":[["c","s3","PUT bytes to the pre-signed URL"],["s3","img","Object-created event"],["img","cdn","Publish 3–4 sizes"],["c","api","POST /posts {media_id, caption}"],["api","q","Enqueue post_created"]]}]},"Bytes go phone → storage → workers → CDN; the API only ever sees metadata."],
        ["p","Making several sizes costs extra storage, maybe 30–50% more per photo, but it saves enormous amounts of bandwidth. A phone on a slow network downloading a 200 KB feed-sized image instead of a 4 MB original is the difference between a feed that loads and one that spins."]
      ]
    },
    {
      h: "Fan-out workers in detail",
      blocks: [
        ["p","Here's roughly what a fan-out worker does when it picks a “post created” event off the queue. It's short, and every line is one of the decisions from above."],
        ["code","on post_created(post):\n  author = users.get(post.author_id)\n  if author.followers > CELEBRITY_THRESHOLD:     # e.g. 100k\n      return                                      # pulled at read time instead\n  for batch in followers(author.id, page_size=1000):\n      for f in batch:\n          if not f.active_last_30_days: continue  # their feed is rebuilt on return\n          redis.lpush(f\"feed:{f.id}\", post.id)\n          redis.ltrim(f\"feed:{f.id}\", 0, 499)     # keep the newest 500"],
        ["chart",{"type":"line","title":"Feed writes per post","sub":"35% of followers active; celebrity threshold 100k","x":{"label":"author's followers","values":["100","1k","10k","100k","1M","10M","100M"]},"y":{"label":"writes","log":true},"series":[{"name":"Push to everyone","values":[100,1000,10000,100000,1000000,10000000,100000000]},{"name":"Hybrid","values":[35,350,3500,35000,1,1,1]}],"note":"Hybrid flattens to a single write once an account counts as a celebrity, because its posts are pulled at read time."}],
        ["p","Two details make this safe to run at scale. Followers are read in <b>batches of 1,000</b>, so a worker never loads a giant list into memory. And the work is <b>idempotent</b> enough to retry: if a worker crashes halfway, the event is redelivered and some followers get the ID pushed twice. Removing duplicate IDs when the feed is read (or checking before pushing) keeps that harmless."]
      ]
    },
    {
      h: "Reading the feed",
      blocks: [
        ["p","Now the other side. You open the app. Here's what happens in the few hundred milliseconds before the first post appears."],
        ["steps",[["Get candidates","Read <code>feed:{me}</code> (~500 ids), plus the latest posts of the few celebrities I follow (themselves cached)."],["Hydrate","Multi-get the post objects and authors from cache in one round trip."],["Rank","Score each candidate on predicted engagement (likes, comments, saves, time spent) using features about me, the author and the post."],["Diversify","Avoid five posts in a row from one author; mix formats."],["Paginate","Return 20 posts plus an opaque cursor. The next request continues from the same ranked snapshot."]]],
        ["p","“Hydrate” is a good word to learn. The feed list only holds IDs, which are tiny. Hydrating means turning those IDs into full objects (caption, author name, like count, image URLs) by fetching them, ideally all at once from a cache. Keeping IDs in the feed and details elsewhere means an edited caption or a new like count shows up everywhere without rewriting a million feeds."]
      ]
    },
    {
      h: "A different take from the classroom: the recent-posts store",
      blocks: [
        ["p","There's another clever design worth knowing, often taught for a simpler, early Facebook-style feed. Instead of a precomputed feed per user, keep <b>one shared copy of everyone's recent posts</b>."],
        ["math",[["Daily active users","given","500 million"],["People who post on a given day (about 1%)","1% × 500M","5 million"],["Posts per day (about 4 each, generous)","5M × 4","20 million"],["Size of one post record","ids + text","≈ 300 B"],["Per day","20M × 300 B","6 GB"],["Last 30 days","6 GB × 30","180 GB"]]],
        ["p","180 GB fits comfortably on one machine's disk. So you put all recent posts in a separate store, copy it onto many machines to spread the read traffic, and build a feed with two steps: get my friend list from my own shard, then ask any copy for “recent posts where author is in my friends”. A daily job deletes anything older than 30 days."],
        ["p","Why is this nice? It uses far less storage than a feed per user, there's no fan-out at all, and you can change the ranking algorithm whenever you like, because nothing is baked in ahead of time. It also teaches a lesson: <b>a cache is any faster derived copy of data</b>, not only something in RAM. Here it's a disk-based copy, and it's still much faster than gathering posts across hundreds of shards."],
        ["extra","Why doesn't Instagram simply do this? The trade changes with scale and with media-heavy, ranked feeds read tens of thousands of times a second. Precomputed per-user candidate lists make each read cheaper. Both designs are reasonable, and explaining when each wins is a strong interview answer."]
      ]
    },
    {
      h: "What happens when a celebrity posts",
      blocks: [
        ["p","Let's walk through the scariest moment for this system, with made-up but realistic timings."],
        ["steps",[["The post is saved","The photo is uploaded, resized and on the CDN. The post record is written to the posts store. This is the same as for anyone else."],["The worker checks the follower count","600 million is far above the threshold, so the worker does nothing. No fan-out, no queue backlog."],["The post enters the celebrity cache","The author's recent-posts list is updated and cached. Every feed read that includes this author will read this one small list."],["Millions open their feeds","Each feed read merges the reader's precomputed list with the cached lists of the celebrities they follow. The celebrity post appears for everyone within seconds."],["Likes pour in","Millions of likes on one post make its like counter a hot key too. Counts are batched and aggregated (for example, counted per shard and summed) rather than updating one row millions of times."]]],
        ["warn","The hot-key problem doesn't vanish, it moves. After you fix fan-out, the celebrity's post object and its counters become the hottest keys in your cache. Spreading reads over several cache replicas, and counting likes in batches, are the usual next fixes."]
      ]
    },
    {
      h: "Failure modes",
      blocks: [
        ["p","Every box in the diagram can fail. The question is whether users notice. The answer here is usually “a little”, which is the goal."],
        ["table",["Failure","Mitigation"],[["Fan-out queue backs up (a big creator posts)","Prioritise active followers; followers whose feed isn't built yet fall back to pull"],["Feed cache lost","Rebuild on demand from the following list (slow first load, then cached)"],["Ranking service down","Serve reverse-chronological from the cached list (graceful degradation)"],["CDN region degraded","Multi-CDN, and DNS steering to another provider"]]],
        ["p","The theme is <b>graceful degradation</b>: when a fancy part breaks, fall back to a simpler version that still works. A newest-first feed is worse than a ranked one, but nobody closes the app over it. An empty screen, on the other hand, makes the news."]
      ]
    },
    {
      h: "Numbers that matter",
      blocks: [
        ["table",["Number","Value","Why it matters"],[["Feed opens per second","about 58,000","Each must be a cheap lookup, not a merge"],["Posts per second","about 1,160","Small, so paying extra at write time is affordable"],["Average followers (assumed)","200","Sets the push cost: about 230,000 writes a second"],["Biggest accounts","600M+ followers","Why pure push fails and the hybrid exists"],["Feed list per user","about 500 ids, about 4 KB","Small enough to keep in RAM for active users"],["New media per day","about 200 TB","Why media lives in object storage behind a CDN"]]]
      ]
    },
    {
      h: "Interview corner",
      blocks: [
        ["p","“Design a news feed” is one of the most common interview questions, and the interviewer is almost always waiting for one moment: when you notice the celebrity problem. Here's a way to get there in 45 minutes."],
        ["steps",[["Requirements (5 min)","Post, follow, see a feed, scroll. Ask whether it's ranked or chronological, and how fresh it must be."],["Estimates (5 min)","58,000 feed reads a second vs 1,160 posts a second. Point out that reads dominate."],["Media first (5 min)","Object storage, CDN, pre-signed uploads. Get the bytes out of the way."],["Pull vs push (10 min)","Start with the live query, show it scattering across shards, then propose fan-out on write."],["The celebrity (10 min)","Bring up the 600M-follower account yourself, then the hybrid and the active-users trick."],["Ranking, pagination, failures (10 min)","Candidates → hydrate → rank → cursor. Then the failure table."]]],
        ["p","Common follow-ups, with short answers:"],
        ["list",["How do you handle an unfollow? → remove the author's posts lazily at read time (filter), not by rewriting feeds.","How do you delete a post everywhere? → tombstone it in the posts store; hydration skips it.","Stories (24 h)? → separate store with TTL; the tray is computed at read time from who you follow.","Notifications? → another consumer of the same post_created event.","Where do you set the celebrity threshold? → measure it: the point where push takes longer than your freshness target, or costs more than the extra read-time merge."]]
      ]
    }
  ]
});
