/* Blueprint course — lesson: Case study: caching Scaler's code judge & contest leaderboard (Redis) */
BP.LESSONS.push({
  id: "cache-scaler",
  mod: "cache",
  icon: "🏁",
  minutes: 30,
  title: "Case study: caching Scaler's code judge & contest leaderboard (Redis)",
  scaler: "HLD 4 · Caching Case Studies: Scaler Code Judge & Leaderboard",
  summary: "Two real caching decisions with opposite answers (local vs global), plus a practical tour of Redis: commands, eviction policies and cluster mode.",
  concepts: ["caching","ttl","redis","eviction"],
  related: [],
  sections: [
    { h: "Problem: test files are big and can change", blocks: [
      ["p","A submission travels browser → LB → one of many app servers with <code>user_id, problem_id, code, language</code>. To judge it, the server needs that problem's input and expected-output files. They're large: <b>~2 s</b> to fetch from file storage (S3). And when an admin edits a test file, the change must take effect <b>immediately</b>."],
      ["table",["Option","Verdict","Why"],[["TTL on a local cache","❌","Low TTL means constant 2 s misses. High TTL means submissions judged against old tests."],["One global cache machine","❌","In RAM: huge files cause constant eviction. On disk: every submission still drags a big file across the network."],["Local disk cache + versioned filenames","✅","Exact invalidation for the price of one tiny DB read we already make."]]],
      ["img","Keyboard Closeup 01 (203533167).jpeg","During a contest, thousands of submissions arrive within minutes, and each needs its test files."]
    ] },
    { h: "The versioned-filename trick", blocks: [
      ["steps",[["Store metadata in MySQL","<code>problems_test_data</code> has file paths plus <code>input_file_updated_at</code> (and the same for output). Editing a file bumps that timestamp."],["Cache with the version in the name","Each judge server saves files locally as <code>&lt;problem_id&gt;_&lt;updated_at&gt;_input.txt</code>."],["On each submission","Read path + updated_at from MySQL (~50 ms). If that exact filename exists locally, it is <b>guaranteed current</b>: read it from disk (~40 ms). Otherwise fetch from S3 (~2 s) and save it under the versioned name."],["Piggyback the lookup","The submission already queries MySQL (solved before? scores?). Fetch the file metadata in the same round trip, so validating the cache costs ~nothing."]]],
      ["fig","codejudge","Submit a few solutions, then edit the test file and submit again."],
      ["tip","Putting the version in the key makes stale reads <b>impossible</b>: no push to N servers, no TTL guessing. Old files are never read again and fall out through normal disk eviction. The same pattern appears as cache-busting asset URLs like <code>app.3f9a1c.js</code>."],
      ["chart",{"type":"bar","title":"Time per submission","data":[["Cache hit: 50 ms DB + 40 ms local disk",90],["Cache miss: 50 ms DB + 2 s from S3",2050]],"fmt":"ms","highlight":0,"note":"A hit is about 23× faster. Misses only happen once per server per file version."}]
    ] },
    { h: "The update flow, step by step", blocks: [
      ["p","When an admin edits the input file for problem 200:"],
      ["steps",[["Upload the new file to S3","S3 returns <code>new_path</code>."],["Update the metadata in MySQL","Set the new path and bump the timestamp (the notes' pseudo-SQL, written properly):"],["The next submission sees the new version","Any server: the lookup returns a new <code>updated_at</code>, so the local file <code>200_&lt;old&gt;_input.txt</code> doesn't match. Miss → fetch from <code>new_path</code> → save as <code>200_&lt;new&gt;_input.txt</code>."],["Old versions fade away","Nothing reads the old filename again, and normal disk eviction deletes it eventually."]]],
      ["code","UPDATE problems_test_data\n   SET input_filepath   = :new_path,\n       input_updated_at = NOW()\n WHERE problem_id = 200;\n\n-- every submission (same round trip it already makes):\nSELECT input_filepath, input_updated_at, output_filepath, output_updated_at, solved, score\n  FROM problems_test_data JOIN user_problem USING (problem_id)\n WHERE problem_id = 200 AND user_id = :uid;"],
      ["tip","<b>CPU-bound vs I/O-bound.</b> Running the code is CPU-bound, while fetching a 2 s test file is I/O-bound: the server sits idle waiting. Caching removes the I/O wait so the CPU spends its time judging. Whenever a task spends most of its time waiting on the network or disk, look for a cache."]
    ] },
    { h: "Problem: the contest ranklist", blocks: [
      ["p","During a contest, thousands of users refresh the ranklist while scores change constantly. Sorting everyone on every request hammers the database. Solution: <b>recompute the ranklist periodically</b> (say once a minute), store the snapshot in a cache, and serve every view from it, trading up to a minute of staleness for a huge drop in DB load."],
      ["p","<b>Local or global?</b> With local caches, every app server misses once a minute and recomputes, so DB load grows with the fleet. With <b>one global cache (Redis)</b> there's one miss per minute in total. Here global wins, the opposite of the test-file case."],
      ["table",["","Test files","Ranklist"],[["Size","Large","Small"],["Cost to validate","Cheap (timestamp)","-"],["Cost to compute","Cheap (copy)","Expensive (sort everyone)"],["Shared?","Read independently per server","Same result for everyone"],["Winner","Local disk cache","Global cache"]]],
      ["fig","leaderboard","A Redis sorted set keeps the leaderboard ordered on every update, an even better fit."],
      ["chart",{"type":"bar","title":"Ranklist recomputations per minute","sub":"5,000 ranklist views/min, 20 app servers","data":[["No cache",5000],["Local cache on each server",20],["One global cache (Redis)",1]],"log":true,"highlight":2}]
    ] },
    { h: "Redis in practice", blocks: [
      ["p","Redis is an <b>in-memory key-value store</b> used as a cache, database or message broker. Commands execute on a single thread, which keeps it simple and atomic. Values can be strings, lists, sets, sorted sets, hashes and bitmaps, and it can persist to disk (AOF/RDB) if you need it to survive restarts."],
      ["code","SET user:1 \"Tantia Tope\"     → OK\nGET user:1                    → \"Tantia Tope\"\nEXISTS user:1                 → 1\nINCR counter                  → 1     (atomic)\nDEL user:1                    → 1\nCONFIG SET maxmemory 1mb      → OK"],
      ["tip","Key naming: use <code>object-type:id[:field]</code>, like <code>user:1000:followers</code>. Not cryptic (<code>u1000flw</code>), not huge (hash a 1 KB value with SHA-1 if it must be a key). The maximum key size is 512 MB, but never get close."]
    ] },
    { h: "Redis eviction policies", blocks: [
      ["p","The default is <code>noeviction</code>: when memory is full, writes return errors. With no <code>maxmemory</code> set, Redis can grow until the OS kills it, and then apps see <i>connection refused</i>. For a cache, set a limit and an eviction policy."],
      ["table",["Policy","Evicts","Use when"],[["noeviction","nothing (writes error)","Redis used as a primary store"],["allkeys-lru","least recently used, any key","Good default: a few keys are hot"],["allkeys-lfu","least frequently used","Stable popularity"],["allkeys-random","random key","Uniform access"],["volatile-lru / -lfu / -random","same, but only keys with a TTL","Mixing cache keys and persistent keys"],["volatile-ttl","the key closest to expiry","You mark disposable keys with short TTLs"]]],
      ["p","The notes' demo: set <code>allkeys-lru</code> and <code>maxmemory 1mb</code>, write keys 0–4,999, <b>read</b> keys 0–999, then flood keys 5,000–9,999. Keys 0–999 survive (recently used), keys 1,000–4,999 are evicted heavily, and newer keys survive in creation order."]
    ] },
    { h: "Hands-on: watch LRU eviction happen", blocks: [
      ["p","The notes' experiment, which you can run in a few minutes with a local Redis and Python:"],
      ["code","import redis\nr = redis.Redis()\nr.config_set(\"maxmemory-policy\", \"allkeys-lru\")\nr.config_set(\"maxmemory\", \"1mb\")\nr.flushall()\n\nfor i in range(5000):  r.set(f\"key-{i}\", \"x\" * 100)   # fill\nfor i in range(1000):  r.get(f\"key-{i}\")              # touch 0–999 (recently used)\nfor i in range(5000, 10000): r.set(f\"key-{i}\", \"x\" * 100)  # flood past 1 MB\n\nprint(r.get(\"key-1\"), r.get(\"key-1000\"))   # key-1 survives, key-1000 likely evicted\nprint(r.info(\"stats\")[\"evicted_keys\"])"],
      ["p","Result: keys 0–999 (read just before the flood) mostly survive, keys 1,000–4,999 (written but never read) are evicted heavily, and the second batch is evicted in creation order. That's LRU behaviour, approximated by sampling."]
    ] },
    { h: "Redis Cluster", blocks: [
      ["p","A single Redis is a SPOF and limited to one machine's RAM. <b>Redis Cluster</b> shards keys across masters, each with replicas:"],
      ["list",["<b>16,384 hash slots.</b> <code>slot = CRC16(key) mod 16384</code>. Each master owns a range, roughly 0–5460 / 5461–10922 / 10923–16383 with 3 masters.","<b>Resharding moves whole slots</b>, so only those keys migrate.","<b>Hash tags</b> like <code>{user42}:cart</code> force related keys into one slot, so multi-key commands work.","<b>Two ports per node:</b> client (6379) and cluster bus (16379) for gossip and failure detection.","<b>Failover:</b> when a master dies, its replica is promoted. The minimum is 3 masters (typically 3 masters + 3 replicas).","<b>Redirects:</b> ask the wrong node and it replies <code>MOVED 12182 172.19.0.2:6379</code>. Smart clients cache the slot map."]]
    ] },
    { h: "Hands-on: a 3-master Redis Cluster in Docker", blocks: [
      ["code","# redis.conf on every node\nport 6379\ncluster-enabled yes\ncluster-config-file nodes.conf\ncluster-node-timeout 5000\nappendonly yes\n\n# 6 containers on one network\ndocker network create redis-cluster\nfor i in 1 2 3 4 5 6; do docker run -d --name redis-$i --net redis-cluster \\\n  -v $PWD/redis.conf:/usr/local/etc/redis/redis.conf redis redis-server /usr/local/etc/redis/redis.conf; done\n\n# 3 masters + 3 replicas (pass all 6 IPs)\ndocker exec -it redis-1 redis-cli --cluster create <ip1>:6379 ... <ip6>:6379 --cluster-replicas 1\n\ndocker exec -it redis-1 redis-cli -c\n> set foo bar      -> Redirected to slot [12182] located at 172.19.0.2:6379\n> set hello world  -> Redirected to slot [866] located at 172.19.0.4:6379"],
      ["p","<code>foo</code> and <code>hello</code> hash to different slots owned by different masters, and the <code>-c</code> client follows the redirects automatically. Kill a master and its replica takes over within <code>cluster-node-timeout</code>."]
    ] }
  ],
  quiz: [
    {"q":"Why not a short TTL for test-case files?","o":["Redis doesn't support TTL","Too many ~2 s misses (and a long TTL serves stale tests)","Files are too small","TTL needs a CDN"],"a":1,"why":"TTL forces a trade-off between misses and staleness. Versioned filenames avoid both."},
    {"q":"For the contest ranklist, why is a global cache better than local caches?","o":["It's cheaper RAM","One recompute per minute total, instead of one per app server","Local caches can't store lists","Global caches never go stale"],"a":1,"why":"Shared derived data that's expensive to compute should be computed once and shared."},
    {"q":"Redis's default eviction policy?","o":["allkeys-lru","volatile-ttl","noeviction","allkeys-random"],"a":2,"why":"noeviction returns errors on writes when memory is full. Set a policy for cache use."},
    {"q":"How many hash slots does Redis Cluster use?","o":["1,024","16,384","65,536","Unlimited"],"a":1,"why":"CRC16(key) mod 16384, with slots assigned to masters."}
  ],
  refs: [
    ["Redis: key eviction","https://redis.io/docs/latest/develop/reference/eviction/"],
    ["Redis: scale with Redis Cluster","https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/"],
    ["Redis Cluster specification","https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/"],
    ["MDN: cache busting with versioned URLs","https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching"]
  ]
});
