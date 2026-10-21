/* Blueprint course — lesson: Case study: caching the Facebook news feed */
BP.LESSONS.push({
  id: "fb-feed",
  mod: "cache",
  icon: "📰",
  minutes: 25,
  title: "Case study: caching the Facebook news feed",
  scaler: "HLD 5 · Caching Case Studies: Facebook News Feed",
  summary: "After sharding by user, the feed becomes a scatter-gather nightmare. Back-of-the-envelope math reveals a surprisingly small derived store that fixes it.",
  concepts: ["sharding","fanout","caching","replication"],
  related: ["instagram"],
  sections: [
    { h: "Setup", blocks: [
      ["p","Version-0 Facebook has <code>Users</code>, <code>User_friends</code> and <code>Posts</code>: no likes, pages or groups. There are two views: the <b>profile page</b> (my info and my posts) and the <b>news feed</b> (my friends' recent posts)."],
      ["code","-- feed, if everything fit on one machine\nSELECT p.* FROM User_friends f JOIN Posts p\n  ON f.user_id = :me AND p.user_id = f.friend_id\n WHERE p.created_at > NOW() - INTERVAL 30 DAY\n ORDER BY p.created_at DESC LIMIT 20 OFFSET :page"],
      ["img","Outside Facebook Data Center.jpg","Facebook's data centre in Prineville, Oregon: the kind of building that serves a billion news feeds."],
      ["table",["Table","Columns","Sharded by"],[["Users","user_id, name, photo_url, …","user_id"],["User_friends","user_id, friend_id","user_id"],["Posts","post_id, user_id, text, media_path, location_id, created_at","user_id"]]],
      ["code","-- profile page: one shard, cheap\nSELECT * FROM Posts WHERE user_id = :uid ORDER BY created_at DESC LIMIT 20 OFFSET :page;"]
    ] },
    { h: "Sharding breaks the feed", blocks: [
      ["p","Data is sharded by <code>user_id</code>: my attributes, friend list and posts live on my shard. The profile page is easy (one shard). But the feed needs <i>my friends'</i> posts, which live on <i>their</i> shards. Building one feed is a fan-out read across hundreds of shards, and you wait for the slowest one."],
      ["p","<b>Idea: precompute each user's feed and cache it.</b> The notes reject this for v0: (1) storage blows up, since every post is copied into every friend's feed; (2) <b>fan-out on write</b>: a post by someone with 1,000+ friends triggers 1,000+ writes; (3) the ranking algorithm is baked into stored feeds and hard to change."],
      ["tip","Instagram-scale systems do use precomputed feeds (a hybrid push/pull design). Compare in the <a href=\"#/case/instagram\">Instagram case study</a>. Both are valid: it depends on the numbers."]
    ] },
    { h: "Do the math", blocks: [
      ["math",[["Monthly / daily active users","assumption","1 B / 500 M"],["Who posts (80-20-1 rule: ~1% post)","1% × 500M","5 M people"],["Posts per day","5M × ~4 (overestimate)","20 M"],["Size of a post (no media)","ids 8+8+8 B, media path ~24 B, text ~250 B","≈ 300 bytes"],["New post data / day","20M × 300 B","6 GB"],["Feed only needs the last 30 days","6 GB × 30","180 GB"]],"180 GB holds <b>every recent post by everyone</b>. That's small enough to keep in one separate store and replicate many times."],
      ["chart",{"type":"bar","title":"Feed writes per day","sub":"20M posts/day, ~1,000 friends each","data":[["Precomputed feeds (push to every friend)",20000000000],["Shared recent-posts store",20000000]],"log":true,"highlight":1,"note":"1,000× fewer writes, at the cost of a two-step read."}]
    ] },
    { h: "Why the 80-20-1 rule matters", blocks: [
      ["p","On social platforms, roughly <b>1%</b> of daily users create content, <b>20%</b> interact (like, comment) and <b>80%</b> only read. That makes the system overwhelmingly <b>read-heavy</b>, and it's why only ~5M of 500M daily users post. Design for reads first."],
      ["p","The 300-byte post estimate leaves out photos and videos on purpose: those live in object storage behind a CDN, and the post row only stores a ~24-byte path. Text is assumed slightly longer than Twitter's old 140-character limit."]
    ] },
    { h: "The design: a replicated “recent posts” store", blocks: [
      ["flow",{"nodes":[{"id":"u","x":90,"y":225,"label":"User X","sub":"opens feed","kind":"client","icon":"📱","desc":"Wants friends' posts from the last 30 days."},{"id":"api","x":300,"y":225,"label":"Feed service","sub":"app servers","kind":"service","icon":"⚙️","desc":"Two-step query."},{"id":"shard","x":560,"y":80,"label":"X's user shard","sub":"friend list","kind":"db","icon":"🗄️","desc":"Sharded by user_id. Holds X's friend list."},{"id":"r1","x":560,"y":225,"label":"Recent posts #1","sub":"180 GB replica","kind":"cache","icon":"⚡","desc":"All posts from the last 30 days, from everyone. Derived data."},{"id":"r2","x":820,"y":225,"label":"Recent posts #2","sub":"replica","kind":"cache","icon":"⚡","desc":"More replicas = more read capacity."},{"id":"w","x":560,"y":370,"label":"Post writes","sub":"user shards","kind":"db","icon":"✍️","desc":"New posts are written to the author's shard and appended to the recent-posts store."},{"id":"cron","x":820,"y":370,"label":"Daily cleanup job","sub":"delete > 30 days","kind":"queue","icon":"🧹","desc":"Keeps the derived store bounded."}],"flows":[{"name":"Read the feed","steps":[["u","api","GET /feed"],["api","shard","1) SELECT friend_ids for X (one shard)"],["api","r1","2) SELECT * FROM recent_posts WHERE user_id IN (friends) … LIMIT 20"],["api","u","Ranked page of posts, with no cross-shard fan-out"]]},{"name":"Write a post","steps":[["u","api","POST /posts"],["api","w","Persist on the author's shard"],["api","r1","Append to the recent-posts store"],["r1","r2","Replicate"],["cron","r1","Nightly: delete posts older than 30 days"]]}]},"Two cheap queries instead of a fan-out across hundreds of shards."],
      ["p","This \"cache\" lives on <b>disk</b>, not RAM, and it's still far faster than gathering from many shards. It also needs far less storage than per-user feeds, and the ranking can change freely because it runs at read time."],
      ["analogy","Instead of visiting every friend's house to read their diary, you read one community notice board that holds just this month's posts, and there are copies of that board on every street."],
      ["sim","fanout","For contrast: the push / pull / hybrid fan-out trade-off at Instagram scale."],
      ["code","-- 1) friends, from X's own shard\nSELECT friend_id FROM User_friends WHERE user_id = :x;\n\n-- 2) feed, from ANY replica of the recent-posts store\nSELECT * FROM recent_posts WHERE user_id IN (:friend_ids)\n ORDER BY created_at DESC LIMIT 20 OFFSET :page;\n\n-- nightly cron job keeps the store bounded to 30 days\nDELETE FROM recent_posts WHERE created_at < NOW() - INTERVAL 30 DAY;"],
      ["tip","Two lessons from this case study: a <b>cache doesn't have to be RAM</b>, since a replicated 180 GB disk store is a cache of derived data; and <b>read replicas</b> are the tool for scaling a read-heavy derived dataset."]
    ] }
  ],
  quiz: [
    {"q":"After sharding by user_id, why is the profile cheap but the feed expensive?","o":["Profiles are cached","The profile lives on one shard; the feed needs posts from many friends' shards","Feeds use SQL joins","Profiles are smaller"],"a":1,"why":"Co-located data is cheap. Scatter-gather across shards is slow and fragile."},
    {"q":"Roughly how big is 30 days of all posts (no media)?","o":["~180 MB","~180 GB","~180 TB","~18 PB"],"a":1,"why":"20M posts/day × 300 B = 6 GB/day, × 30 = 180 GB."},
    {"q":"Why did the notes reject precomputing every user's feed?","o":["It's illegal","Storage blow-up, 1000+ writes per post, algorithm lock-in","Feeds can't be cached","Redis is too slow"],"a":1,"why":"Push fan-out has real costs. At other scales the trade-off can flip (see Instagram)."}
  ],
  refs: [
    ["Meta: Scaling Memcache at Facebook","https://engineering.fb.com/2013/03/04/core-infra/scaling-memcache-at-facebook/"],
    ["ByteByteGo: Design a news feed system","https://bytebytego.com/courses/system-design-interview/design-a-news-feed-system"]
  ]
});
