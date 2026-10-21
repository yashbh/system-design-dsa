/* Blueprint course — lesson: NoSQL internals: LSM trees, SSTables & Bloom filters */
BP.LESSONS.push({
  id: "lsm",
  mod: "db",
  icon: "🌲",
  minutes: 30,
  title: "NoSQL internals: LSM trees, SSTables & Bloom filters",
  scaler: "HLD 10 · NoSQL Internals: LSM Tree + Bloom Filter + Sparse Index",
  summary: "Derive, step by step, how Cassandra-style databases make writes blazing fast: append-only logs, memtables, sorted SSTables, sparse indexes, compaction, tombstones and Bloom filters.",
  concepts: ["lsm","bloom-filter","wal"],
  related: ["discord"],
  sections: [
    { h: "The problem", blocks: [
      ["p","NoSQL values have no fixed size (a document can grow, a wide row keeps getting columns). In-place updates of variable-size records are painful, and SQL's B-trees give O(log N) reads <i>and</i> writes. Can we make writes much faster, and keep reads acceptable?"]
    ] },
    { h: "Derive it in five steps", blocks: [
      ["steps",[["1 · One file, update in place","To update key 002, scan to find it and overwrite. Reads scan too. Both are slow, variable sizes make overwriting messy, and writers need locks."],["2 · Append every write","Never overwrite, just append. Writes become sequential and very fast, with no locks. Read by scanning from the end (the first match is the latest). But reads are O(N), and old versions waste space."],["3 · In-memory hashmap: key → byte offset","Reads jump straight to the latest entry. But billions of keys won't fit in RAM, and duplicates still waste disk."],["4 · Chunks + memtable + compaction","Split into ~100 MB chunks. The newest chunk lives in RAM as a <b>memtable</b> (updated in place) and is flushed when full. Background <b>compaction</b> merges old chunks and drops duplicates, best run off-peak."],["5 · Sort it","Make the memtable a balanced tree (TreeMap). Flushes are written <b>sorted</b> as an <b>SSTable</b>. Split each SSTable into 64 KB blocks and keep one index entry per block, a <b>sparse index</b>. A 1 GB file ≈ 16k blocks, so the index fits easily in RAM."]]],
      ["p","That's a <b>Log-Structured Merge (LSM) tree</b>, the storage engine behind Cassandra, HBase, RocksDB, LevelDB and ScyllaDB."],
      ["analogy","A busy restaurant: orders are scribbled on a notepad (WAL) and pinned on the rail (memtable). At the end of each hour, they're sorted and filed into a binder (SSTable). On quiet nights, the binders get merged and cleaned up (compaction)."],
      ["img","Hard disk head on platter.jpg","A disk head has to physically move for every random read or write (~10 ms). Appending to the end of a log avoids that seek."]
    ] },
    { h: "Play with an LSM tree", blocks: [
      ["fig","lsm","PUT keys until the memtable flushes. GET a key and watch Bloom filters skip tables. DELETE (tombstone), then compact."],
      ["table",["Operation","What happens"],[["Write","Append to the WAL (durability) + insert into the memtable (RAM) → ack. No random disk I/O."],["Flush","Memtable full → written sequentially as a new immutable, sorted SSTable."],["Read","Memtable → newest SSTable → older ones. Per table: Bloom filter → sparse index → scan one 64 KB block."],["Delete","Write a <b>tombstone</b>. If the newest version found is a tombstone, the key is gone. Compaction removes it physically later."],["Crash","RAM is lost; on restart, replay the WAL since the last flush to rebuild the memtable."],["Compaction","Merge-sort SSTables, keep the newest version per key, drop overwritten values and tombstones."]]],
      ["extra","Why are appends so fast? Sequential I/O is dramatically faster than random I/O, especially on spinning disks where every random write means a physical seek (~10 ms). LSM trees turn random writes into RAM updates plus sequential flushes."],
      ["chart",{"type":"bar","title":"Spinning-disk write throughput (approx.)","data":[["Sequential appends",150],["Random 4 KB writes (~120 IOPS)",0.5]],"unit":"MB/s","log":true,"highlight":0,"note":"Turning random writes into sequential ones is the whole trick of an LSM tree."}]
    ] },
    { h: "Reads, recovery and wide rows in detail", blocks: [
      ["code","get(key):\n  if key in memtable:            return memtable[key]          // tombstone → \"not found\"\n  for sst in sstables (newest → oldest):\n    if not sst.bloom.mightContain(key): continue               // skip: no disk read\n    block = sst.sparseIndex.floor(key)                        // last block whose first key ≤ key\n    if key in read64KB(sst, block): return value             // tombstone → \"not found\"\n  return \"not found\""],
      ["steps",[["Crash recovery","RAM (the memtable) is lost on a crash. Before serving again, replay WAL entries written since the last flush. It's fast because it's in-memory work; reading the WAL from disk is the slow part."],["Wide rows (column families)","Writes append (row key, column family) entries to the memtable. Compaction <b>merges</b> the entries rather than keeping only the latest, and a \"last N entries\" read collects from the memtable, then from successive SSTables, until it has N."],["Deletes are tombstones","SSTables are immutable, so a delete writes a marker. The newest version found is the tombstone, so the key reads as gone. Compaction physically drops it later."],["Why deleting is cheaper than writing","An aside from the notes: deleting a file just drops a reference (which is why deleted files can be recovered), while writing must change every bit."]]],
      ["extra","<b>Compaction strategies.</b> <i>Size-tiered</i> merges SSTables of similar size: cheap writes, more files to check on reads. <i>Leveled</i> keeps each level's SSTables non-overlapping: more rewriting, faster reads. Cassandra lets you choose per table: read-heavy → leveled, write-heavy → size-tiered."]
    ] },
    { h: "Bloom filters: making “not found” cheap", blocks: [
      ["p","The worst read is for a key that doesn't exist: you'd check the memtable and <i>every</i> SSTable before giving up. A <b>Bloom filter</b> per SSTable answers instantly: <b>“definitely not here”</b> (skip the disk) or <b>“maybe here”</b> (go look)."],
      ["fig","bloom","Add some words, then check words you did and didn't add. Look for a false positive."],
      ["list",["Bit array of m bits + k hash functions.","<b>Add:</b> set the k bits for the key.","<b>Check:</b> any of the k bits is 0 → definitely absent. All 1 → probably present.","<b>No false negatives</b>, only occasional false positives. ~10 bits per key gives about 1% false positives."]],
      ["chart",{"type":"line","title":"Bloom filter false positives vs memory","x":{"label":"bits per key","values":[2,4,6,8,10,12,14,16]},"y":{"label":"false-positive rate","log":true},"fmt":"pct","series":[{"name":"false positives","values":[38.254225000000005,14.633857303506254,5.598068699062217,2.1414977957938333,0.8192133851730137,0.31338373159420135,0.1198825177974419,0.04586012809389847]}],"note":"With the best number of hash functions, about 10 bits per key gives roughly 1% false positives."}]
    ] }
  ],
  quiz: [
    {"q":"Why are LSM writes fast?","o":["They skip durability","Writes go to RAM plus a sequential append; no random disk seeks","They use B-trees","They're compressed"],"a":1,"why":"WAL append + memtable insert; sorted data is flushed later in one sequential write."},
    {"q":"A Bloom filter says “maybe”. What do you know?","o":["The key definitely exists","The key might exist; you must check","The key definitely doesn't exist","The filter is broken"],"a":1,"why":"All k bits being set could be other keys' doing: a false positive."},
    {"q":"How is a delete represented before compaction?","o":["The row is erased immediately","A tombstone entry that shadows older values","The SSTable is rewritten","It isn't supported"],"a":1,"why":"SSTables are immutable. Tombstones mark deletion until compaction cleans up."},
    {"q":"Why a sparse index (one entry per 64 KB block)?","o":["Faster writes","It fits in RAM, and you only scan one small block","It's required by SQL","It avoids compaction"],"a":1,"why":"1 GB ≈ 16k blocks, so the index is tiny compared with one entry per key."}
  ],
  refs: [
    ["ByteByteGo: The secret sauce behind NoSQL, LSM tree","https://www.youtube.com/watch?v=I6jB0nM9SKU"],
    ["Cassandra storage engine","https://cassandra.apache.org/doc/stable/cassandra/architecture/storage-engine.html"],
    ["Cassandra compaction","https://cassandra.apache.org/doc/stable/cassandra/managing/operating/compaction/index.html"],
    ["Bloom filters by example (interactive)","https://llimllib.github.io/bloomfilter-tutorial/"],
    ["Bloom filter calculator","https://hur.st/bloomfilter/"]
  ]
});
