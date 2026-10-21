/* Blueprint course — lesson: NoSQL internals: LSM trees, SSTables & Bloom filters */
BP.LESSONS.push({
  id: "lsm",
  mod: "db",
  icon: "🌲",
  minutes: 22,
  title: "NoSQL internals: LSM trees, SSTables & Bloom filters",
  scaler: "HLD 10 · NoSQL Internals: LSM Tree + Bloom Filter + Sparse Index",
  summary: "Build, one fix at a time, the storage engine behind Cassandra and RocksDB, and see how append-only logs, memtables, sorted files and Bloom filters make writes fly.",
  concepts: ["lsm","bloom-filter","wal"],
  related: ["discord"],
  sections: [
    { h: "A database that drowns in writes", blocks: [
      ["p","Say you run the backend for a fitness watch. A couple of million watches each send a heart-rate reading every few seconds (illustrative numbers, but real fitness and IoT apps look a lot like this). That's hundreds of thousands of writes a second, all day, and most of the data is read back rarely: a weekly chart here, a doctor's export there."],
      ["p","You try a classic relational database first. It works at small scale. Then the write rate climbs and the disks start to queue up. Every new reading means finding the right spot on disk and updating it in place. Your database spends its life moving a disk head around."],
      ["p","This is the kind of workload that databases like Cassandra, HBase, RocksDB and ScyllaDB were built for. They all use the same idea underneath, called a <b>Log-Structured Merge tree</b>, or LSM tree. The name sounds intimidating. The idea is not."],
      ["p","We won't start from the answer. We'll start with the dumbest possible storage engine and fix one problem at a time, exactly the way the lecture does it. By the end you'll have reinvented the LSM tree yourself, and you'll know why every piece is there."]
    ] },
    { h: "Why variable-size data makes updates hard", blocks: [
      ["p","First, what makes NoSQL storage different? In a SQL table, rows usually have a fixed shape. An <code>INT</code> is 4 bytes, a <code>CHAR(20)</code> is 20 bytes. That makes it easy to update a row in place: the new value fits exactly where the old one was."],
      ["p","NoSQL values don't play along. A JSON document can grow from 200 bytes to 20 KB. A wide row in Cassandra keeps collecting columns. If an updated value is bigger than the old one, it doesn't fit in its old slot, and now you have to move things around on disk."],
      ["p","SQL databases typically store data in a <b>B-tree</b>, a balanced tree kept on disk. It gives O(log N) reads <i>and</i> O(log N) writes, which is a great all-rounder. But every write still means finding the right page and changing it in place, which is a random disk write."],
      ["p","So here's our goal: <b>make writes much faster than O(log N)</b>, keep reads acceptable, and cope with values of any size. And while we're at it, think about how we'd tune the design differently for a read-heavy workload versus a write-heavy one."]
    ] },
    { h: "Two things every database keeps", blocks: [
      ["p","Before building anything, notice that a database really stores data in two forms."],
      ["steps",[["The write-ahead log (WAL)","An append-only file that records every write and update in order, like a diary. If you replayed the whole WAL from the start, you'd rebuild the entire database. It's huge, it only ever grows at the end, and it's rarely read. When it is read, it's usually the tail: “give me every entry after timestamp X”."],["The current state","What the data looks like right now, organised so you can answer queries quickly. This is the hard part, and it's what the rest of the lesson builds."]]],
      ["p","The WAL is your safety net. A write is first appended to the WAL, so even if the machine loses power a moment later, the write is on disk and can be replayed. Keep that in mind, because we're about to put some data in RAM and we'll need the WAL to get it back after a crash."]
    ] },
    { h: "Attempt 1: one file, edit in place", blocks: [
      ["p","The simplest storage engine is a single file of key–value pairs. To update the record with ID 002 to “Ram”, scan the file until you find 002, then overwrite its value."],
      ["p","Reads work the same way: scan until you find the key. And that's the first problem. Both reads and writes are O(N), a full scan in the worst case."],
      ["p","It gets worse. If “Ram” is longer than the old value, it doesn't fit, so you have to shuffle the rest of the file. And if two clients update at the same time, they can corrupt each other's writes, so you need <b>write locks</b>, which means writers wait in line."],
      ["warn","Slow reads, slow writes, messy resizing and lock contention. Attempt 1 fails at everything except being easy to explain."]
    ] },
    { h: "Attempt 2: never overwrite, just append", blocks: [
      ["p","Here's a strange-sounding fix. What if we <b>never</b> edit anything? Every write, whether it's a new key or an update, just gets appended to the end of the file. If key 002 is updated five times, the file has five entries for 002."],
      ["p","Writes become very fast. There's no searching, no resizing, no shuffling. And since existing entries never change, there's nothing to lock: writers just append."],
      ["p","Why is appending so much faster than editing in the middle? On a spinning disk, every random read or write means physically moving the disk head to a new spot, which takes around 10 ms. Appending means the head stays where it is and data streams onto the platter."],
      ["img","Hard disk head on platter.jpg","That arm has to swing to a new track for every random write, and each swing costs milliseconds. An append-only log lets it stay put."],
      ["chart",{"type":"bar","title":"Spinning-disk write throughput (approx.)","data":[["Sequential appends",150],["Random 4 KB writes (~120 IOPS)",0.5]],"unit":"MB/s","log":true,"highlight":0,"note":"Turning random writes into sequential ones is the whole trick of an LSM tree."}],
      ["p","That gap is a factor of a few hundred on spinning disks. SSDs have no moving head, so the gap is smaller there, but sequential writes still win: they're kinder to the drive and easier to batch."],
      ["p","How do reads work now? Scan <i>from the end</i>. The first match you meet is the latest version. But reads are still O(N), and we're wasting disk on all those old versions. One problem fixed, two left."]
    ] },
    { h: "Attempt 3: a hashmap of byte offsets", blocks: [
      ["p","To speed up reads, keep an index in memory: a <b>hashmap</b> from each key to the byte offset of its latest entry in the file. A hashmap is a lookup table that finds a key in roughly constant time."],
      ["list",["<b>Write:</b> append the entry to the file, then set <code>index[key] = offset</code>.","<b>Read:</b> look up the offset, jump straight to that spot on disk, read the value. One seek."]],
      ["p","Reads are fast now. So what breaks? Size. A big database might have billions of keys. Holding every one of them, plus an offset, in RAM gets expensive quickly. And we still haven't dealt with the disk filling up with stale duplicates."],
      ["tip","This design is real, by the way. Bitcask, the storage engine from Riak, works roughly like this. It's very fast as long as all the keys fit in memory."]
    ] },
    { h: "Attempt 4: chunks, a memtable and cleanup", blocks: [
      ["p","Let's fix the disk waste. Instead of one giant file, write data in <b>chunks</b> of, say, 100 MB. Once a chunk is full, it's never modified again; it's immutable."],
      ["p","The newest chunk is special. It lives in RAM as a <b>memtable</b>, an in-memory table of recent writes. Because it's in memory, it can be updated in place cheaply: if key 002 is written twice, the memtable keeps just the latest value. When the memtable is nearly full, it gets <b>flushed</b> to disk as a new immutable chunk, and a fresh empty memtable takes its place."],
      ["p","Old chunks still contain duplicates across each other. So a background job called <b>compaction</b> takes two chunks, X and Y, merges them into a new chunk Z keeping only the latest value for each key, then deletes X and Y and updates the offsets. Disk space comes back."],
      ["warn","Compaction is real work: reading and rewriting files. Like any heavy background job, schedule it for off-peak hours where you can, or throttle it so it doesn't steal I/O from live traffic."],
      ["p","Disk waste is under control. But the RAM problem from attempt 3 is still there: we still need an index entry for every single key. Time for the last and cleverest step."]
    ] },
    { h: "Attempt 5: keep everything sorted", blocks: [
      ["p","What if the data on disk were <b>sorted by key</b>? Then we wouldn't need to remember where every key is. We'd only need a few signposts, and we could find anything in between."],
      ["p","Make the memtable a balanced binary search tree (a TreeMap, usually a red-black or AVL tree). It keeps keys in order as you insert them, in any order. When it's flushed, write the keys out in sorted order. A sorted, immutable file like this is called an <b>SSTable</b>, short for Sorted String Table."],
      ["p","Can we binary search an SSTable on disk directly? Not easily. Records have different sizes, so jumping to the middle of the file could land you halfway through a value. The fix: split each SSTable into <b>blocks of 64 KB</b>, and keep a small in-memory index with one entry per block, holding that block's first key. That's a <b>sparse index</b>: sparse because it has one entry per block, not one per key."],
      ["math",[["SSTable size","given","1 GB"],["Block size","given","64 KB"],["Blocks per SSTable","1 GB ÷ 64 KB","16,384 ≈ 16k"],["Index entries","one per block","16k, instead of millions of keys"]],"A 16k-entry index fits in memory without breaking a sweat, even for many SSTables."],
      ["p","To find a key, look in the sparse index for the <b>last block whose first key is ≤ your key</b>. In code that's “the entry just before <code>upper_bound(key)</code>”. Read that single 64 KB block from disk and scan it. One small read, no full scan."],
      ["analogy","A dictionary works the same way. You don't memorise the page of every word. The guide words at the top of each page (“mango – maple”) tell you which page to open, and then you scan one page."]
    ] },
    { h: "Congratulations, you built an LSM tree", blocks: [
      ["p","Step back and look at what we have. All writes go into a sorted memtable in RAM, overwriting if the key exists. When it fills up, it's flushed as a sorted SSTable. SSTables are linked from newest to oldest, each with a sparse block index in memory. And compaction periodically merges SSTables and removes duplicates, which is basically merge sort on sorted files."],
      ["p","That structure is the <b>Log-Structured Merge tree</b>. “Log-structured” because writes are appended, never edited in place. “Merge” because compaction keeps merging sorted files. It's the storage engine behind Cassandra, HBase, RocksDB, LevelDB and ScyllaDB."],
      ["analogy","Think of a busy restaurant kitchen. Every order is scribbled on a notepad first (the WAL) and pinned on the rail (the memtable). At the end of each hour, the slips are sorted and filed into a binder (an SSTable). On quiet nights, someone merges the binders and throws out the duplicates (compaction)."],
      ["fig","lsm","PUT a handful of keys until the memtable flushes into an SSTable. Then GET a key and watch the Bloom filters skip tables. Finally DELETE a key and compact to see the tombstone disappear."],
      ["table",["Operation","What happens"],[["Write","Append to the WAL (durability) and insert into the memtable (RAM), then acknowledge. No random disk I/O."],["Flush","The memtable is full, so it's written sequentially to disk as a new immutable, sorted SSTable."],["Read","Memtable first, then the newest SSTable, then older ones. In each table: Bloom filter, then sparse index, then scan one 64 KB block."],["Delete","Write a <b>tombstone</b>. If the newest version you find is a tombstone, the key is gone. Compaction removes it physically later."],["Crash","RAM is lost. On restart, replay the WAL since the last flush to rebuild the memtable."],["Compaction","Merge-sort SSTables, keep the newest version of each key, drop overwritten values and tombstones."]]]
    ] },
    { h: "Following a read, step by step", blocks: [
      ["p","Writes are the easy part. Reads are where an LSM tree has to work a little, because the latest value of a key could be in the memtable or in any SSTable. The rule is to search from newest to oldest and stop at the first match."],
      ["code","get(key):\n  if key in memtable:            return memtable[key]          // tombstone → \"not found\"\n  for sst in sstables (newest → oldest):\n    if not sst.bloom.mightContain(key): continue               // skip: no disk read\n    block = sst.sparseIndex.floor(key)                        // last block whose first key ≤ key\n    if key in read64KB(sst, block): return value             // tombstone → \"not found\"\n  return \"not found\""],
      ["p","Walk through an example. You ask for the heart-rate reading for watch <code>w-4821</code>. It's not in the memtable. The newest SSTable's Bloom filter (coming up in a moment) says “definitely not here”, so you skip it without touching disk. The next one says “maybe”. Its sparse index points to block 9,204. You read those 64 KB, find the key, and return."],
      ["p","See the weakness? A key that was written long ago, or never written at all, might make you check many SSTables. That's why LSM trees are described as <b>write-optimised</b>: writes are always cheap, while reads depend on how many SSTables there are. Compaction (fewer files) and Bloom filters (skip files) are the two levers that keep reads fast."]
    ] },
    { h: "Crashes, deletes and wide rows", blocks: [
      ["p","Three follow-up questions always come up once the basic design is clear. Each one has a neat answer that falls out of the structure."],
      ["steps",[["What if the machine crashes?","The memtable lives in RAM, so a crash wipes it. But every write was appended to the WAL first. Before the node serves traffic again, it replays the WAL entries written since the last flush to rebuild the memtable. Rebuilding is in-memory work and is quick; reading the WAL from disk is the slow part."],["How do you delete from an immutable file?","You can't edit an SSTable, so a delete writes a new entry: a <b>tombstone</b>, a marker that says “this key is deleted”. A read that finds the tombstone first reports “not found”, even though older SSTables still hold the old value. Compaction drops the old values and, eventually, the tombstone."],["What about wide rows?","In column-family stores, a row keeps collecting columns. Writes append (row key, column family) entries to the memtable. Compaction <b>merges</b> the entries for a row instead of keeping only the latest one. A query like “last N entries for this row” collects from the memtable, then from successive SSTables, until it has N or runs out."]]],
      ["warn","Tombstones aren't free. They take space and reads must step over them until compaction removes them. Discord has written about this: in their Cassandra cluster, reads over channels with lots of deleted messages had to scan past piles of tombstones and slowed down badly."],
      ["extra","An aside from the notes on why deleting a <i>file</i> is cheaper than writing one: deleting just drops the reference to the data, and the bits stay on disk, which is why deleted files can often be recovered. Writing has to change every bit. Tombstones play on the same idea: mark it gone now, clean up later."]
    ] },
    { h: "Compaction: the cleaning crew", blocks: [
      ["p","Without compaction, an LSM tree would collect SSTables forever. Reads would check more and more files, and the disk would fill with stale versions and tombstones. Compaction is what keeps the system tidy."],
      ["p","The core operation is the merge step of merge sort. Take several sorted SSTables, walk through them side by side, and write out one new sorted SSTable. When the same key appears in more than one input, keep the newest version. When the newest version is a tombstone that's old enough, drop the key entirely."],
      ["extra","<b>Compaction strategies.</b> <i>Size-tiered</i> compaction merges SSTables of similar size: it's cheap on writes, but leaves more files to check on reads. <i>Leveled</i> compaction keeps each level's SSTables non-overlapping: it rewrites more data, but a read touches fewer files. Cassandra lets you choose per table: leveled for read-heavy tables, size-tiered for write-heavy ones."],
      ["p","This is the read-heavy vs write-heavy tuning the lecture asked about. More aggressive compaction means faster reads and more background I/O. Lazier compaction means faster writes and slower reads. The same engine can lean either way depending on the knob."]
    ] },
    { h: "Bloom filters: making “not found” cheap", blocks: [
      ["p","Here's the worst read in an LSM tree: a key that doesn't exist. You check the memtable, then every single SSTable, and only after reading a block from each do you get to say “not found”. If you have 50 SSTables, that's 50 disk reads to learn nothing."],
      ["p","Wouldn't it be nice if each SSTable could answer “do you even have this key?” from memory? That's what a <b>Bloom filter</b> does. It's a tiny in-memory structure that answers with either <b>“definitely not here”</b> (skip the disk read) or <b>“maybe here”</b> (go and look)."],
      ["list",["A Bloom filter is a bit array of <b>m</b> bits, all starting at 0, plus <b>k</b> different hash functions.","<b>Add a key:</b> run it through all k hash functions and set those k bits to 1.","<b>Check a key:</b> run the same k hashes. If <i>any</i> of those bits is 0, the key was never added: definitely absent. If <i>all</i> are 1, it was probably added, but those bits might have been set by other keys.","So it has <b>no false negatives</b>, only occasional false positives."]],
      ["fig","bloom","Add a few words, then check some you added and some you didn't. Keep adding until a word you never added comes back “maybe”: that's a false positive."],
      ["p","How big does a Bloom filter need to be? Surprisingly small. With the best number of hash functions, about <b>10 bits per key gives roughly 1% false positives</b>. For a billion keys that's 10 billion bits, about 1.25 GB, spread across all the SSTables. Every extra bit per key cuts the false-positive rate further."],
      ["chart",{"type":"line","title":"Bloom filter false positives vs memory","x":{"label":"bits per key","values":[2,4,6,8,10,12,14,16]},"y":{"label":"false-positive rate","log":true},"fmt":"pct","series":[{"name":"false positives","values":[38.254225000000005,14.633857303506254,5.598068699062217,2.1414977957938333,0.8192133851730137,0.31338373159420135,0.1198825177974419,0.04586012809389847]}],"note":"With the best number of hash functions, about 10 bits per key gives roughly 1% false positives."}],
      ["tip","Why does a filter's false-positive rate rise over time? Every added key sets more bits to 1, so random keys find all their bits set more often. That's why filters are sized for the expected number of keys, and why each SSTable gets its own filter: an SSTable never changes, so its filter never gets fuller."]
    ] },
    { h: "LSM trees vs B-trees", blocks: [
      ["p","So should everything use an LSM tree? No. B-trees, the default in MySQL and Postgres, are still a great choice for many workloads. Here's a rough comparison."],
      ["table",["","LSM tree","B-tree"],[["Writes","Very fast: memory plus sequential appends","O(log N), with random page writes"],["Reads","Can touch several SSTables; helped by Bloom filters and compaction","O(log N), predictable"],["Background work","Compaction uses I/O in the background","Little, but pages fragment over time"],["Good fit","Write-heavy: logs, metrics, messages, IoT","Mixed or read-heavy, transactional work"],["Used by","Cassandra, HBase, RocksDB, LevelDB, ScyllaDB","MySQL (InnoDB), PostgreSQL"]]],
      ["p","Our fitness watch backend is a textbook LSM workload: a firehose of small writes, reads that are mostly “recent data for one device”. A banking ledger with lots of point reads and transactions is happier on a B-tree."]
    ] },
    { h: "Putting it together", blocks: [
      ["p","Let's replay the whole derivation in one breath, because each step exists to fix the one before it."],
      ["steps",[["One file, edit in place","Slow reads, slow writes, locks. Doesn't work."],["Append-only","Fast, lock-free writes thanks to sequential I/O. Reads scan, and duplicates waste space."],["Hashmap of offsets","Fast reads, but every key must fit in RAM."],["Chunks, memtable, compaction","Disk waste under control. Still one index entry per key."],["Sort it","Sorted memtable flushed as SSTables, split into 64 KB blocks with a sparse index. The index fits in RAM."],["Plus the safety nets","A WAL for crash recovery, tombstones for deletes, Bloom filters to skip SSTables that can't have the key."]]],
      ["p","The result is a storage engine where writes are cheap because they never touch disk randomly, and reads stay reasonable because of sorting, sparse indexes, Bloom filters and compaction."]
    ] },
    { h: "Interview corner", blocks: [
      ["p","LSM trees come up whenever you pick Cassandra, HBase or DynamoDB in a design and the interviewer asks “why is that good for writes?”. Bring it up briefly when you choose a write-heavy store, then go deeper only if asked."],
      ["p","Follow-up questions to expect:"],
      ["list",["<b>“Walk me through a write.”</b> WAL append, memtable insert, ack. Flush to an SSTable when full.","<b>“And a read?”</b> Memtable, then SSTables newest to oldest. Bloom filter, sparse index, one block.","<b>“What happens on a crash?”</b> Replay the WAL since the last flush.","<b>“How do deletes work?”</b> Tombstones, cleaned up by compaction.","<b>“How would you make it faster for reads?”</b> Leveled compaction, bigger Bloom filters, caching hot blocks.","<b>“Can a Bloom filter be wrong?”</b> Only with false positives, never false negatives."]],
      ["tip","30-second answer: “Writes go to an append-only commit log for durability and a sorted in-memory memtable, so they never do random disk I/O. When the memtable fills, it's flushed as an immutable sorted SSTable with a sparse block index. Reads check the memtable and then SSTables from newest to oldest, using a Bloom filter per SSTable to skip files that can't contain the key. Deletes are tombstones, and background compaction merges SSTables to drop old versions and keep reads fast.”"]
    ] }
  ],
  quiz: [
    {"q":"Why are LSM-tree writes fast?","o":["They skip durability","Writes go to RAM plus a sequential append, with no random disk seeks","They use B-trees","They're compressed"],"a":1,"why":"A write is a WAL append plus a memtable insert. The sorted data hits disk later in one big sequential flush."},
    {"q":"A Bloom filter says “maybe”. What do you know?","o":["The key definitely exists","The key might exist, so you have to check","The key definitely doesn't exist","The filter is broken"],"a":1,"why":"All k bits being set could be other keys' doing. That's a false positive, so you still read the block."},
    {"q":"How is a delete stored before compaction runs?","o":["The row is erased immediately","As a tombstone entry that hides older values","By rewriting the SSTable","Deletes aren't supported"],"a":1,"why":"SSTables are immutable, so a tombstone marks the key as gone. Compaction removes the old data later."},
    {"q":"Why use a sparse index with one entry per 64 KB block?","o":["It makes writes faster","It fits in RAM, and you only scan one small block","SQL requires it","It removes the need for compaction"],"a":1,"why":"A 1 GB SSTable is about 16k blocks, so the index is tiny compared with one entry per key."},
    {"q":"A node crashes and restarts. How does it get its memtable back?","o":["It can't; those writes are lost","It replays the WAL entries written since the last flush","It copies the memtable from the orchestrator","It reads the newest SSTable"],"a":1,"why":"Every write was appended to the WAL before being acknowledged, so the recent ones can be replayed."},
    {"q":"Which read is the most expensive in an LSM tree without Bloom filters?","o":["A key in the memtable","A key in the newest SSTable","A key that doesn't exist at all","A recently updated key"],"a":2,"why":"You have to check the memtable and every SSTable before you can say “not found”. Bloom filters exist for exactly this case."},
    {"q":"Your table is read-heavy. Which compaction strategy fits better?","o":["Size-tiered","Leveled","No compaction","Compaction only on reboot"],"a":1,"why":"Leveled compaction keeps SSTables non-overlapping within a level, so a read touches fewer files. It costs more rewriting."}
  ],
  refs: [
    ["ByteByteGo: The secret sauce behind NoSQL, LSM tree","https://www.youtube.com/watch?v=I6jB0nM9SKU"],
    ["Cassandra storage engine","https://cassandra.apache.org/doc/stable/cassandra/architecture/storage-engine.html"],
    ["Cassandra compaction","https://cassandra.apache.org/doc/stable/cassandra/managing/operating/compaction/index.html"],
    ["Bloom filters by example (interactive)","https://llimllib.github.io/bloomfilter-tutorial/"],
    ["Bloom filter calculator","https://hur.st/bloomfilter/"],
    ["What is a LSM tree?","https://dev.to/creativcoder/what-is-a-lsm-tree-3d75"],
    ["Discord: How Discord stores billions of messages","https://discord.com/blog/how-discord-stores-billions-of-messages"]
  ]
});
