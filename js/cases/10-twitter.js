/* Blueprint case study — Twitter / X: Design the Home Timeline, Search & Trends. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "twitter",
  app: "Twitter / X",
  icon: "🐦",
  color: "#1d9bf0",
  color2: "#7cc7ff",
  title: "Design the Home Timeline, Search & Trends",
  tagline: "Half a billion short messages a day, read far more often than they are written, by a crowd that all looks at the same thing at the same second.",
  level: "Advanced",
  minutes: 30,
  concepts: ["fanout","hot-key","snowflake","caching","inverted-index","trending","message-queue"],
  stats: [
    {v: 500,suf: "M",label: "tweets posted per day (Twitter, reported)",kind: "Reported"},
    {
      v: 143,
      suf: "k/s",
      label: "record tweets in one second (a 2013 TV broadcast of a film in Japan)",
      kind: "Reported"
    },
    {v: 300,suf: "k/s",label: "home timeline reads per second (Twitter talk, 2013)",kind: "Reported"}
  ],
  story: "It is the 89th minute of a World Cup final. The score is level. Then a striker curls the ball into the top corner, and somewhere around a billion people react at once.<br><br>Within five seconds, millions of them post something. Most of it is the player's name in capital letters, followed by a lot of exclamation marks. Millions more pull down to refresh their home timeline, because they want to see what everyone else is saying. A few hundred thousand type the player's name into search, and they expect tweets from <i>seconds</i> ago, not from last Tuesday. And his name should be sitting at the top of Trends before the replay has finished.<br><br>Now picture the servers behind that. On a normal afternoon Twitter handles a few thousand new tweets a second. In that moment it can be twenty-five times more, and the spike arrives with no warning. Reads and writes go up together, which is the worst thing that can happen to a database.<br><br>This case study is about how you build a system that shrugs at that. Four ideas carry most of the weight. You do the hard work <b>when a tweet is written</b> so that reading is cheap (fan-out). You make an exception for <b>celebrities</b>, because copying one tweet into 100 million mailboxes is silly. You keep a <b>search index in memory</b> so new tweets are findable almost instantly. And you build Trends to spot what is <b>surging</b>, not what is merely big.<br><br>Along the way you will see why Twitter invented its own ID format, why your home timeline only remembers about 800 tweets, and why the answer to “push or pull?” turns out to be “both”. As with every case here, this is a simplified teaching model built from what Twitter has said publicly, not a copy of their production code.",
  requirements: {
    functional: ["Post a tweet: up to 280 characters, optionally with photos or video","Follow and unfollow other accounts","See a home timeline: recent tweets from everyone you follow, newest first","Search all tweets, including ones posted seconds ago","See Trends: topics that are taking off right now, overall and per country or city","Like, retweet and reply","Scroll back through older tweets with stable paging (no duplicates, no gaps)"],
    nonFunctional: ["The home timeline loads in a couple of hundred milliseconds","A new tweet shows up in followers' timelines within a few seconds","New tweets are searchable within seconds","Survive spikes of 25× normal traffic that arrive with no warning","Prefer availability over strict consistency: a timeline that is 3 seconds stale is fine, a timeline that fails to load is not","Never lose a tweet once the author sees it posted"]
  },
  estimate: [
    ["Tweets per second (average)","500M ÷ 86,400 seconds in a day","≈ 5,800 /s"],
    ["Peak tweets per second","reported record (Aug 2013)","≈ 143,000 /s (about 25× average)"],
    ["Timeline writes caused by fan-out","5,800 tweets/s × ~200 followers each (assumption)","≈ 1.2M /s"],
    ["Timeline reads","reported in a 2013 Twitter talk","≈ 300,000 /s"],
    ["Reads compared with tweets written","300,000 ÷ 5,800","≈ 50 reads per tweet"],
    ["Timeline cache RAM","300M users × 800 ids × 8 B","≈ 1.9 TB (×3 replicas ≈ 5.8 TB)"],
    ["Raw tweet text per day","500M × ~300 B (text plus metadata, assumption)","≈ 150 GB /day"]
  ],
  estimateNote: "What do these numbers tell you? First, people read timelines about fifty times more often than they write tweets. When reads outnumber writes like that, you want to do the expensive work once, at write time, and make every read a cheap lookup. That is what fan-out on write does.<br><br>Second, fan-out multiplies writes: one tweet becomes about 200 timeline inserts, so 5,800 tweets a second becomes over a million small writes a second. That is fine only because each insert is tiny (an 8-byte ID pushed onto a list in RAM) and because it can happen a few seconds later, through a queue.<br><br>Third, the cache fits. Even with every active user's timeline held in memory three times over, you need a few terabytes of RAM. That is a big cluster, but an ordinary one. And the 25× peak means you cannot wait for autoscaling to save you: the capacity has to be there before the goal is scored.",
  naive: {
    title: "“SELECT tweets FROM people I follow ORDER BY time”",
    desc: "The first design almost everyone draws: keep one big tweets table and one follows table. When someone opens the app, look up the accounts they follow, fetch those accounts' recent tweets, sort them by time and return the top 20. It is honest, it is always up to date, and on a laptop with a thousand users it works perfectly.",
    breaks: ["It does a lot of work on every single read. Say you follow 400 accounts. Once tweets are spread across many database shards, building your timeline means asking many shards for recent tweets and merging the answers. Do that 300,000 times a second and the database spends its whole life answering the same kind of question.","Spikes hit both sides at once. When the goal goes in, the tweets table takes 25× more writes in the same seconds that timeline queries jump too. A database being hammered by writes is exactly the one you do not want to be reading from.","Everyone pays, even for unchanged answers. If you refresh twice in ten seconds and nobody you follow tweeted, the query still runs from scratch. Nothing is reused.","Search with LIKE '%messi%' has to scan every row: billions of tweets, many seconds per query, millions of queries. It cannot work.","Trends with GROUP BY over all of today's tweets is a giant batch job. By the time it finishes, the moment it was meant to catch is over."]
  },
  steps: [
    {
      t: "Give every tweet an ID that sorts by time",
      c: "snowflake",
      b: "Before you can build timelines you need a way to name tweets. A database auto-increment counter does not work once many machines are creating tweets at the same time: two machines would hand out the same number. Random IDs (UUIDs) are unique but say nothing about order. Twitter wanted both: unique without any central coordinator, and sorted by time.<br><br>So in 2010 it built <b>Snowflake</b>. Each ID is a 64-bit number made of three parts: a timestamp in milliseconds, the ID of the machine that made it, and a small counter for tweets made by that machine in the same millisecond. Because the timestamp sits in the highest bits, a bigger ID almost always means a newer tweet.<br><br>That one design choice pays off everywhere. “Newest first” becomes “highest ID first”. Paging becomes “give me 20 tweets with an ID lower than X”. And the tweets themselves can live in a plain sharded key-value store, looked up by ID, with no global sort needed.",
      a: "Raffle tickets that have the time of printing stamped into the number, so sorting the tickets also sorts them by when they were sold."
    },
    {
      t: "Do the work at write time: fan out to every follower",
      c: "fanout",
      b: "Here is the central trick. Instead of building your timeline when you open the app, Twitter builds it in advance. Every user has a <b>home timeline list</b> stored in Redis, an in-memory store, holding the IDs of recent tweets from people they follow.<br><br>When you tweet, a <b>fan-out service</b> looks up your followers and pushes your new tweet ID onto the front of each of their lists. If you have 200 followers, that is 200 tiny inserts. Each list is trimmed to about the latest 800 entries, so it never grows without limit.<br><br>Now reading is almost free. Opening the app becomes one lookup: “give me the first 20 IDs from my list.” No joins, no scatter across shards, no sorting. You moved the cost from the read (which happens about 50 times per tweet) to the write (which happens once). The price is <b>write amplification</b>: one tweet turns into hundreds of writes, and the same ID is stored in hundreds of places.",
      a: "A newspaper that prints one copy per subscriber and drops it in each mailbox overnight, instead of making every reader come to the printing press and assemble their own."
    },
    {
      t: "Put the fan-out behind a queue",
      c: "message-queue",
      b: "Fan-out takes time. Two hundred inserts are quick, but a popular account with 2 million followers needs 2 million. You do not want the author to stare at a spinner while that happens.<br><br>So the write path is split in two. Step one is fast and synchronous: give the tweet its Snowflake ID, store it durably, and tell the author “posted”. Step two is slow and asynchronous: drop a “fan this out” job onto a <b>message queue</b>, and let a pool of workers pick it up and insert the ID into follower timelines in batches.<br><br>This is what makes spikes survivable. When the goal goes in, tweets keep getting stored at full speed. The queue gets longer, the workers chew through it, and timelines catch up a few seconds later. Nobody's tweet is lost; some timelines are just briefly behind.",
      a: "A restaurant that takes your order and payment right away, then lets the kitchen work through the tickets at its own pace."
    },
    {
      t: "The celebrity exception",
      c: "hot-key",
      b: "Fan-out on write has one terrible case. Imagine an account with 100 million followers. Every tweet means 100 million inserts. If that account tweets during the final, the fan-out workers spend minutes on one tweet while everyone else's tweets wait in line behind it. In Twitter's 2013 talk, engineers described exactly this problem: very large accounts could take minutes to reach every follower.<br><br>The fix is to stop pushing for those accounts. Above a follower threshold, an account is treated as a <b>celebrity</b>, and its tweets are <b>not fanned out</b>. Instead, when you open your timeline, the read service checks which celebrities you follow, fetches their few most recent tweets (which are cached, because millions of people want the same ones), and merges them into your list.<br><br>So the system is a <b>hybrid</b>: push for the 99.9% of accounts with normal follower counts, pull for the handful with huge ones. Instagram and many other feeds use the same split. A “hot key” in general means one item that gets far more traffic than everything else, and celebrity accounts are the classic example.",
      a: "The paper is delivered to your door, but the famous columnist's piece is pinned up in the town square and you read it there, because printing 100 million personal copies would be absurd."
    },
    {
      t: "Hydrate and rank when you read",
      c: "caching",
      b: "Your timeline list holds only IDs, not tweets. Why? An 8-byte ID is tiny, so 800 of them per user fits in RAM for hundreds of millions of users. A full tweet with text, author and counts is a few hundred bytes. Copying full tweets into every follower's list would multiply storage by roughly 40. And if a tweet were edited or deleted, you would have to find and fix every copy.<br><br>So the read path does a step called <b>hydration</b>: take the 20 IDs, plus the celebrity tweet IDs, and fetch the real tweet bodies and author profiles from caches in one batched request (a “multi-get”). Then merge, drop anything deleted or blocked, optionally rank, and return a page with a cursor for the next one.<br><br>A small worked example: your list has IDs 905, 901, 897 and you follow one celebrity whose latest tweet is 903. The merged order is 905, 903, 901, 897. Because IDs sort by time, merging is just sorting numbers.",
      a: "Your mailbox holds little slips with parcel numbers on them. When you open it, you take the slips to the counter and collect the actual parcels in one trip."
    },
    {
      t: "Only keep timelines warm for active people",
      c: "caching",
      b: "Hundreds of millions of accounts exist, but many of them have not opened the app in weeks. Keeping a full timeline in RAM for each of them, and fanning every tweet into lists nobody reads, would waste a lot of memory and work.<br><br>Twitter's 2013 talk described the fix: only users who have been active recently get a timeline kept in the cache. If you come back after a long break, your timeline is missing, so the system <b>rebuilds it</b> on demand from the social graph (who you follow) and the tweet store (their recent tweets). The first load is a little slower, and every load after that is fast again.<br><br>This is a common pattern: a cache is a copy you can always rebuild, so you are free to throw parts of it away when they stop paying for themselves.",
      a: "A hotel that only makes up the rooms of guests who are actually checked in, and prepares a room fresh when someone new arrives."
    },
    {
      t: "Real-time search with an in-memory index",
      c: "inverted-index",
      b: "Search needs a different structure. An <b>inverted index</b> is like the index at the back of a book: for every word, a list of the tweets that contain it. To find “messi”, you jump straight to the word and read its list. No scanning.<br><br>The twist for Twitter is speed. Most search engines rebuild their index in batches. Twitter needed new tweets findable within seconds, so it built <b>Earlybird</b>, a real-time search system based on Lucene (an open-source search library). Each new tweet is split into words (tokenised) and appended to an in-memory index segment as it arrives.<br><br>Recent tweets live on small, fast, in-memory indexes. Older tweets live on larger archive indexes. A search query is sent to both, and the results are merged and ranked by recency, engagement and the author's signals. During a big event, almost every query is about the last few minutes, so the in-memory tier does most of the work.",
      a: "A library that adds each new book to the card catalogue the moment it comes through the door, instead of once a month."
    },
    {
      t: "Trends: what is surging, not what is big",
      c: "trending",
      b: "If Trends just showed the most-tweeted words, it would show the same boring things every day: “good morning”, “love”, “happy”. That is not news. What you want is what is <b>unusual</b> right now.<br><br>So a stream processor counts hashtags and phrases in short <b>sliding windows</b> (say, the last 5 minutes) and compares each one's current rate with its usual rate, its <b>baseline</b>. A tag going at 50× its normal rate beats one that is always huge but flat. Say “#GoodMorning” runs at 2,000 tweets a minute every morning and the striker's name usually gets 10. Now his name is at 900 a minute: that is 90× normal, while “#GoodMorning” is at 1×. He wins.<br><br>Counting millions of distinct phrases exactly would need a lot of memory, so approximate counters such as a <b>count-min sketch</b> keep it small, at the cost of tiny over-counts. Spam and bot filters then remove anything being pushed artificially, and similar spellings are grouped so “Messi” and “#Messi” do not split the vote.",
      a: "A traffic report does not tell you the motorway is busy (it always is). It tells you about the sudden jam on a road that is usually empty."
    }
  ],
  diagram: {
    nodes: [
      {
        id: "u",
        x: 90,
        y: 110,
        label: "Author",
        sub: "posts a tweet",
        kind: "client",
        icon: "✍️",
        desc: "Sends a tweet."
      },
      {
        id: "w",
        x: 290,
        y: 110,
        label: "Write API",
        sub: "validate & store",
        kind: "service",
        icon: "⚙️",
        desc: "Assigns a Snowflake ID and stores the tweet."
      },
      {
        id: "ts",
        x: 500,
        y: 50,
        label: "Tweet store",
        sub: "sharded KV",
        kind: "db",
        icon: "🗄️",
        desc: "Tweets by ID."
      },
      {
        id: "fo",
        x: 500,
        y: 190,
        label: "Fan-out service",
        sub: "queue-driven",
        kind: "queue",
        icon: "📣",
        desc: "Inserts the ID into followers' timelines (skipping celebrities)."
      },
      {
        id: "g",
        x: 720,
        y: 60,
        label: "Social graph",
        sub: "followers",
        kind: "db",
        icon: "🕸️",
        desc: "Who follows whom."
      },
      {
        id: "tl",
        x: 720,
        y: 220,
        label: "Timeline cache",
        sub: "Redis lists (~800 ids)",
        kind: "cache",
        icon: "⚡",
        desc: "Precomputed home timelines."
      },
      {
        id: "r",
        x: 90,
        y: 360,
        label: "Reader",
        sub: "opens home",
        kind: "client",
        icon: "📱",
        desc: "Reads the home timeline."
      },
      {
        id: "ra",
        x: 300,
        y: 360,
        label: "Timeline API",
        sub: "merge & hydrate",
        kind: "service",
        icon: "🧩",
        desc: "Merges celebrity tweets, hydrates bodies, ranks."
      },
      {
        id: "se",
        x: 520,
        y: 370,
        label: "Search index",
        sub: "real-time, in memory",
        kind: "db",
        icon: "🔎",
        desc: "New tweets searchable within seconds."
      },
      {
        id: "tr",
        x: 900,
        y: 370,
        label: "Trends",
        sub: "stream counts",
        kind: "service",
        icon: "📈",
        desc: "Sliding-window counts vs baseline."
      }
    ],
    flows: [
      {
        name: "Post a tweet",
        steps: [
          ["u","w","POST tweet"],
          ["w","ts","Store under its Snowflake ID"],
          ["w","fo","Enqueue fan-out"],
          ["fo","g","Fetch followers (author isn't a celebrity)"],
          ["fo","tl","LPUSH id into each follower's timeline"],
          ["w","se","Index for search"],
          ["w","tr","Count hashtags"]
        ]
      },
      {
        name: "Read home timeline",
        steps: [
          ["r","ra","GET /home"],
          ["ra","tl","Read my cached id list"],
          ["ra","ts","Multi-get tweet bodies (+ celebrity tweets)"],
          ["ra","r","Merged, ranked page"]
        ]
      }
    ]
  },
  lab: {
    sim: "trends",
    title: "Trending Topics Lab",
    hint: "Watch the two rankings. Trigger a breaking event and see it top Trends while it's still small by raw volume."
  },
  tradeoffs: [
    {
      choice: "Fan-out on write (push)",
      pro: "Reading a timeline is one cache lookup, which is what you want when reads outnumber writes about 50 to 1",
      con: "One tweet becomes hundreds of writes, the same ID is stored in many places, and accounts with huge followings would take minutes to deliver"
    },
    {
      choice: "Celebrity tweets merged at read time (pull)",
      pro: "No 100-million-insert storms; celebrity tweets are cached once and shared",
      con: "The read path gets more complex, and every read does a small extra merge"
    },
    {
      choice: "Timelines capped at about 800 IDs",
      pro: "Memory stays bounded and predictable, a few terabytes in total",
      con: "Scrolling far back falls off the cache and onto slower paths"
    },
    {
      choice: "Only cache timelines for active users",
      pro: "Saves RAM and fan-out work for accounts nobody is reading",
      con: "Returning users get one slower load while their timeline is rebuilt"
    },
    {
      choice: "Approximate trend counting",
      pro: "Tiny memory, results in real time",
      con: "Small counting errors, and it still needs separate spam and bot filtering"
    },
    {
      choice: "Availability over consistency",
      pro: "Timelines keep loading during spikes and partial outages",
      con: "Followers may see a tweet a few seconds apart, and counts like likes can briefly disagree"
    }
  ],
  takeaways: ["When reads outnumber writes, do the work once at write time and make reads a lookup.","Every push design needs a pull exception for the hot keys. Here, that means celebrities.","Store IDs in the precomputed lists and fetch the full objects when reading. Copy the pointers, not the content.","Time-sortable IDs such as Snowflake make “newest first” and stable paging come for free.","Put slow, fan-out work behind a queue so a spike makes timelines a bit late instead of making posting fail.","Trending means a high rate compared with a baseline, not a high count.","Spikes arrive in seconds. Have the capacity ready in advance, because autoscaling is too slow."],
  quiz: [
    {
      q: "Why do the cached timeline lists hold tweet IDs instead of full tweets?",
      o: ["IDs look nicer","Small lists fit in RAM, and the bodies are fetched from caches at read time, so edits and deletes only happen in one place","Redis cannot store text","Search needs it"],
      a: 1,
      why: "Copy the small pointers into every timeline, and keep the actual content in one place."
    },
    {
      q: "Which one ranks higher in Trends?",
      o: ["A tag that is always tweeted a lot","A tag tweeted at 40× its usual rate","The longest hashtag","Whatever was posted most recently"],
      a: 1,
      why: "Trends look at how fast a topic is growing compared with its baseline, not at its raw volume."
    },
    {
      q: "An account has 100 million followers. How do its tweets reach those followers' timelines?",
      o: ["100 million inserts for every tweet","They are merged into each follower's timeline when it is read","By email","They don't"],
      a: 1,
      why: "This is the celebrity exception: these accounts are pulled at read time instead of pushed at write time."
    },
    {
      q: "Why can search show tweets from just a few seconds ago?",
      o: ["It scans the database for every query","Each new tweet is added to an in-memory inverted index as soon as it arrives","It uses the CDN","It can't, search is a day behind"],
      a: 1,
      why: "Earlybird keeps a real-time index of recent tweets in memory."
    },
    {
      q: "The goal goes in and tweets jump to 25× normal. The fan-out queue backs up. What do users see?",
      o: ["Their tweets fail to post","Tweets post normally, and some followers' timelines show them a few seconds late","All timelines go blank","Older tweets are deleted"],
      a: 1,
      why: "The write path stores the tweet first and fans out later, so a backlog only delays delivery."
    },
    {
      q: "Why do Snowflake IDs make paging through a timeline stable while new tweets pour in?",
      o: ["They are random","IDs grow with time, so “20 tweets older than ID X” always means the same set no matter what was posted since","They are stored in SQL","They are shorter than UUIDs"],
      a: 1,
      why: "A max_id cursor is anchored to a point in time, unlike an offset that shifts every time a new tweet arrives at the top."
    },
    {
      q: "A classic Facebook news-feed design rejects precomputed per-user feeds. Why does Twitter choose them anyway?",
      o: ["Twitter has fewer users","Reads outnumber writes heavily, lists are capped at about 800 IDs, and huge accounts are handled by the celebrity exception","Redis is free","Facebook was wrong"],
      a: 1,
      why: "The worrying costs (storage, write fan-out) are kept small by storing only IDs, capping lists and pulling celebrities."
    }
  ],
  sources: ["Twitter Engineering: Timelines at Scale (2013 talk)","Twitter Engineering: Announcing Snowflake (2010)","Twitter Engineering: Earlybird real-time search","Twitter: 143,199 tweets per second record (2013)"],
  deep: [
    {
      h: "API design",
      blocks: [
        ["img","Crowd of people with phones.jpg","During a big moment, a crowd like this posts and refreshes at the same time, so writes and reads peak together."],
        ["p","Start with the few calls the app needs. There are only four that matter for this design: post a tweet, read the home timeline, search, and fetch trends. Everything else (likes, follows, replies) is a variation on these."],
        ["code","POST /2/tweets              { text, reply_to?, media_ids? }    → 201 { id: \"1839…\" }   (Snowflake)\nGET  /2/timeline/home?cursor=<max_id>&count=20                → { tweets, next_cursor }\nGET  /2/search/recent?q=messi&since_id=…                      → { tweets }\nGET  /2/trends/place?id=<woeid>                               → [{ name, tweet_volume }]"],
        ["p","Pagination uses <b>max_id cursors</b>: “give me 20 tweets older than ID X”. Snowflake IDs sort by time, so this is stable even while new tweets pour in at the top."],
        ["p","Why not plain page numbers, like <code>?page=2</code>? Picture yourself reading page 1 during the final. While you read, 30 new tweets land at the top. Page 2 is now made of what used to be page 1's tweets, so you see the same tweets twice. With a cursor you say “older than the last one I saw”, and new arrivals at the top cannot shift anything underneath you. The <code>since_id</code> parameter does the same thing in the other direction: “anything newer than what I already have”, which is how the app shows the “12 new tweets” button."],
        ["tip","Notice that the POST returns the new ID right away. The author's client can show the tweet immediately, even though the fan-out to followers has not finished yet."]
      ]
    },
    {
      h: "A tweet's journey, second by second",
      blocks: [
        ["p","Follow one tweet from the moment you press Post to the moment your friend sees it. Say you have 300 followers and you are not a celebrity."],
        ["steps",[["0 ms: you press Post","The app sends the text to the write API. The API checks the length, your account status and rate limits."],["~5 ms: the tweet gets a name","A Snowflake ID is generated locally on the server, with no call to any central counter. Something like 1839…, where the leading bits are the current time."],["~20 ms: stored for good","The tweet is written to the sharded tweet store, keyed by its ID. From now on it cannot be lost. The API replies 201 and your app shows the tweet."],["~20 ms: three jobs are queued","A fan-out job, an indexing job for search, and a counting job for trends. Each runs independently, so a slow one does not hold up the others."],["~1 s: fan-out","A worker reads your 300 followers from the social graph and pushes your ID onto 300 Redis lists, trimming each to about 800 entries."],["~1–10 s: searchable and counted","The search indexer tokenises your text into the in-memory index. The trends counter adds your hashtags to the current window."],["Next refresh: your friend sees it","Their app asks for the home timeline. The read service reads their list, finds your ID near the top, hydrates it, and shows it."]]],
        ["p","The timings are illustrative, not measured, but the shape is the point: the only part the author waits for is storing the tweet. Everything that multiplies (fan-out, indexing, counting) happens after the reply, through queues."]
      ]
    },
    {
      h: "Timeline cache in numbers",
      blocks: [
        ["math",[["Active users with cached timelines","assumption","300 M"],["Entries per timeline","capped","~800"],["Bytes per entry","tweet id (+ a few flags)","~8 B"],["Total","300M × 800 × 8 B","≈ 1.9 TB"],["With 3 replicas","× 3","≈ 5.8 TB of RAM"]],"That's large but very achievable as a Redis cluster, and it's why inactive users' timelines aren't kept warm: rebuild them on their next visit."],
        ["p","Compare that with storing full tweets in every list. At roughly 300 bytes a tweet instead of 8, the same cache would need about 37 times more memory: around 70 TB before replicas. That single comparison is why the lists hold IDs."],
        ["p","Here is the logic in pseudocode. It is short, which is a good sign: the clever part is the shape of the data, not the code."],
        ["code","on tweet(t):\n  if followers(t.author) > CELEBRITY_THRESHOLD: return    # merged at read time\n  for f in followers(t.author):                        # in batches, via a queue\n    redis.lpush(\"tl:\" + f, t.id); redis.ltrim(\"tl:\" + f, 0, 799)\n\nhome(user, max_id):\n  ids  = redis.lrange(\"tl:\" + user, 0, 799) filtered by < max_id\n  ids += recent_ids_of(celebrities_followed_by(user))  # cached per celebrity\n  return hydrate(sort_desc(ids)[:20])                  # multi-get bodies + users"],
        ["p","<code>LPUSH</code> adds to the front of a Redis list and <code>LTRIM</code> cuts it down to the first 800 entries, so each timeline behaves like a fixed-size window that slides forward as new tweets arrive. Twitter's 2013 talk also mentioned keeping each timeline on several Redis machines, so losing one machine does not empty anyone's timeline."]
      ]
    },
    {
      h: "Push, pull, or both? (and how this compares with an early Facebook feed)",
      blocks: [
        ["p","A classic design for an early Facebook news feed works through the same problem and reaches the opposite conclusion. That is worth understanding, because interviewers love asking “why not the other way?”"],
        ["p","In that design, sharding by user_id makes the profile page cheap (everything about you lives on your shard) but the feed expensive (your friends' posts live on their shards). It <b>rejects</b> precomputing each user's feed for three reasons: far more storage, 1,000+ writes for every post, and the feed algorithm being baked in. Instead it estimates the data: about 5 million posters a day (1% of 500 million, from the 80-20-1 rule), around 4 posts each, about 300 bytes a post, so 6 GB a day and 180 GB for 30 days. That is small enough to keep <b>all recent posts</b> in one derived store, replicated on many machines, and query it at read time."],
        ["table",["","Fan-out on write (push)","Fan-out on read (pull)","Hybrid (Twitter)"],[["When the work happens","When a tweet is posted","When a timeline is opened","Push for most accounts, pull for celebrities"],["Read cost","One list lookup","Gather and merge many accounts' posts","One lookup plus a small merge"],["Write cost","One insert per follower","One insert","One insert per follower, except celebrities"],["Storage","IDs copied into every follower's list","One copy of each post","Mostly IDs, bounded by the 800 cap"],["Changing ranking","Harder: lists are precomputed","Easy: rank at read time","Ranking applied on read over the merged candidates"],["Weak spot","Huge accounts, wasted work for inactive readers","Users who follow thousands of accounts","More moving parts"]]],
        ["p","So why does Twitter push? Its numbers lean differently. Reads beat writes about 50 to 1, follow lists are one-directional and can be long, and storing only IDs with an 800 cap keeps the worrying storage cost small. Ranking still happens at read time over the merged list, which keeps the algorithm flexible. And the celebrity exception removes the worst write storms. Both designs are right for their numbers. The skill is showing <i>which numbers</i> tip the decision."],
        ["tip","A useful habit: think of a cache as any faster derived copy of data. Twitter's Redis timelines and the Facebook design's “recent posts” disk store are both caches in that sense. One is in RAM, the other is on disk."]
      ]
    },
    {
      h: "How a Snowflake ID is built",
      blocks: [
        ["p","It's worth walking through why the obvious ID schemes fail in a distributed system: an auto-increment counter repeats across machines, UUIDs are not ordered, and a plain timestamp collides when two machines act in the same millisecond. Snowflake fixes all three by packing several fields into one 64-bit number."],
        ["table",["Bits","Field","What it buys you"],[["1","Sign bit, always 0","The ID stays a positive number in every language"],["41","Milliseconds since a custom epoch (Twitter used 4 Nov 2010)","Time ordering; about 69.7 years of range"],["5","Datacenter ID","Up to 32 datacenters"],["5","Machine ID","Up to 32 machines per datacenter, 1,024 in total"],["12","Sequence number, reset every millisecond","4,096 IDs per millisecond per machine"]]],
        ["p","Do the maths and one machine can produce about 4.1 million IDs a second, with no network call. Even the record 143,000 tweets a second is a rounding error for that."],
        ["warn","Two catches. IDs are only <i>roughly</i> ordered across machines, because their clocks differ by a few milliseconds. That is fine for a timeline. And if a machine's clock jumps backwards, it could repeat an ID, so the generator must refuse to issue IDs until its clock catches up. If a machine runs out of its 4,096 numbers within a millisecond, it simply waits for the next millisecond."]
      ]
    },
    {
      h: "Surviving spikes",
      blocks: [
        ["p","Spikes are what make Twitter different from most products. Netflix knows when a big show launches. Twitter does not know when a goal will be scored, a celebrity will announce something, or an earthquake will hit. The record of 143,199 tweets a second came in August 2013, during a TV broadcast in Japan of the film <i>Castle in the Sky</i>, when viewers all posted the same word at the same scene."],
        ["chart",{"type":"line","title":"Tweets per second around a big moment (illustrative)","x":{"label":"seconds from the goal","values":[-30,-15,0,5,10,20,40,60,90,120]},"y":{"label":"tweets / s"},"series":[{"name":"Tweets","values":[6000,6200,9000,90000,140000,110000,60000,30000,15000,9000]}],"note":"Peaks arrive within seconds and fade within minutes, so capacity must be pre-provisioned. Autoscaling is too slow."}],
        ["p","Look at the shape. From normal to fifteen times normal in about five seconds, then back down within two minutes. A new server takes minutes to start, warm its caches and join the pool. By the time it is ready, the spike is over. So the defence is a mix of spare capacity and graceful bending:"],
        ["list",["<b>Queue the fan-out:</b> the write returns once the tweet is stored; fan-out catches up seconds later.","<b>Shed non-critical work:</b> delay analytics and recommendations, keep posting and timelines.","<b>Cache hot objects aggressively:</b> the goal-scorer's profile and the official account's tweets are read millions of times.","<b>Collapse identical requests:</b> if 50,000 readers ask for the same celebrity tweet in the same instant, fetch it once and hand the answer to all of them (request coalescing).","<b>Keep spare capacity:</b> run with enough headroom for known big events (finals, award shows, New Year's Eve in each time zone)."]]
      ]
    },
    {
      h: "Search and trends in detail",
      blocks: [
        ["p","Search and Trends read the same stream of tweets as the timeline does, but each needs its own data structure. Here is how the pieces fit."],
        ["table",["Component","How it works"],[["Ingestion","Tweets are tokenised and appended to an in-memory index segment; searchable within seconds"],["Recent vs archive","Recent tweets on small in-memory indexes; older ones on bigger on-disk indexes; queries fan out to both and merge"],["Ranking","Recency, engagement and author signals"],["Trend counting","Sliding windows (e.g. 5 min) per term, compared with a slowly updated baseline; count-min sketches bound memory"],["Trend quality","Spam and bot filtering, per-location trends, and de-duplication of near-identical terms"]]],
        ["p","A tiny inverted index example. Three tweets arrive: #1 “what a goal”, #2 “goal of the year”, #3 “what a save”. The index becomes: <i>what</i> → [1, 3], <i>goal</i> → [1, 2], <i>save</i> → [3], and so on. A search for “what goal” intersects [1, 3] and [1, 2] and returns tweet 1. Because the lists are kept in ID order and IDs follow time, “most recent matches first” is a walk from the end of the lists."],
        ["p","A <b>count-min sketch</b> is a small grid of counters. To count a phrase you hash it with a few different hash functions and add one to the cell each hash points to. To read a count you take the smallest of those cells. Collisions can only make counts too high, never too low, and the error is small for popular phrases, which are the only ones that can trend anyway. The point is that memory stays fixed no matter how many distinct phrases people invent during a final."],
        ["extra","Twitter's real ranking of trends also considers who is tweeting (many different people rather than one bot farm) and location. The per-location part is why a local football derby can trend in one city while the rest of the country never sees it."]
      ]
    },
    {
      h: "Failure modes",
      blocks: [
        ["p","Things will break. The design is good if each failure makes things slower or a little stale instead of losing tweets or showing errors."],
        ["table",["Failure","What the user sees","Mitigation"],[["Fan-out backlog during a spike","Some tweets reach timelines a few seconds late","Tweets are already stored; timelines catch up; readers merge recent tweets on read"],["Timeline cache node lost","Usually nothing","Replicas take over; missing timelines are rebuilt from the graph and the tweet store"],["Search index lag","Results briefly miss the newest tweets","Results are briefly incomplete; the index catches up"],["Hot celebrity tweet","Nothing, if caching works","Replicated caches and request coalescing"],["Tweet store shard slow","Some tweets fail to hydrate and are skipped for now","Time out the multi-get, return a slightly shorter page, retry later"],["Spam wave pushes a fake trend","A junk topic in Trends","Spam filters weight unique, established accounts; humans can remove a trend"]]]
      ]
    },
    {
      h: "Numbers that matter",
      blocks: [
        ["table",["Number","Why it matters"],[["≈ 5,800 tweets/s average","Sets the normal write load"],["≈ 143,000 tweets/s record","Sets the peak you must provision for, about 25× normal"],["≈ 300,000 timeline reads/s","Why reads must be a cache lookup"],["~800 IDs per timeline","Bounds memory; deeper scrolling goes to slower storage"],["~8 bytes per ID","Why storing IDs (not tweets) makes the cache fit"],["4,096 IDs per ms per machine","Snowflake will not be the bottleneck"],["Seconds","How fresh search and trends need to be"]]]
      ]
    },
    {
      h: "Interview corner",
      blocks: [
        ["p","“Design Twitter” is one of the most common interview questions. Here is one way to spend 45 minutes on it."],
        ["steps",[["Minutes 0–5: scope","Agree on post, follow, home timeline, and (if time) search and trends. Ask about scale: 500M tweets a day, 300k timeline reads a second, spikes of 25×."],["Minutes 5–10: estimate","Show the read-to-write ratio (about 50 to 1), the fan-out write rate (about 1.2M a second), and the cache size (about 2 TB before replicas). These numbers justify everything that follows."],["Minutes 10–15: the naive design","Draw the SQL join version and explain why it falls over at 300k reads a second. Interviewers like seeing you find the problem yourself."],["Minutes 15–30: the timeline","Snowflake IDs, the tweet store, fan-out on write through a queue, Redis lists of IDs capped at 800, hydration on read. Then the celebrity exception."],["Minutes 30–40: search and trends","Inverted index, in-memory recent tier plus archive tier; trends as rate against a baseline with approximate counters."],["Minutes 40–45: failures and spikes","Backlogged fan-out, lost cache nodes, hot tweets, pre-provisioning."]]],
        ["p","Common follow-up questions, with short answers:"],
        ["list",["Deleting a tweet? → tombstone it in the tweet store; hydration drops it from every timeline automatically.","Replies and threads? → a conversation id on each tweet; threads are queries by conversation id.","Notifications (likes, mentions)? → separate consumers of the same tweet and engagement events.","\"For you\" ranking? → candidate generation from many sources, plus an ML ranker on top of the same hydrated tweets.","Unfollowing someone? → filter their tweets out at read time right away, and let their old IDs age out of the 800-entry list rather than rewriting it.","Where is the celebrity threshold? → it is a tuning knob. Pick it where fan-out time for one tweet starts to hurt everyone else in the queue, and you can measure that.","What if someone follows 5,000 celebrities? → cap how many pulled accounts are merged per read, and cache each celebrity's recent tweets so the merge is cheap."]]
      ]
    }
  ]
});
