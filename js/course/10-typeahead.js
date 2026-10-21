/* Blueprint course — lesson: Case study: search typeahead (Google, Amazon) */
BP.LESSONS.push({
  id: "typeahead",
  mod: "cases",
  icon: "🔎",
  minutes: 35,
  title: "Case study: search typeahead (Google, Amazon)",
  scaler: "HLD 9 · Case Study: Typeahead",
  summary: "The 5-step interview process applied end to end: requirements, scale math, tries vs hashmaps, taming writes with buffering and sampling, sharding by prefix, and time decay.",
  concepts: ["trie","sharding","consistent-hashing","caching"],
  related: [],
  sections: [
    { h: "The 5-step process for any HLD problem", blocks: [
      ["steps",[["1 · MVP / functional requirements","What must it do? Ask clarifying questions and agree on scope."],["2 · Estimate scale","Is sharding needed (total storage)? Read-heavy, write-heavy or both? QPS → number of machines."],["3 · Design goals","Consistency vs availability, latency target, tolerance for data loss."],["4 · APIs","How the world calls you. The parameters often hint at the sharding key."],["5 · Design","Data structures, sharding, read and write paths, caching, optimizations."]]],
      ["tip","Every case study in this module follows the same five steps. Practise saying them out loud; interviewers love a structured approach."]
    ] },
    { h: "1 · Requirements", blocks: [
      ["list",["Show <b>5</b> suggestions.","Rank by <b>popularity</b> (search frequency for the MVP; recency later).","<b>Prefix</b> match only, no spell-correct, no personalization (confirm with the interviewer).","Start suggesting after <b>3 characters</b>."]],
      ["p","Recency teaser: \"Roger Binny\" has 1M searches over 5 years (~1,000/day). \"Roger Federer\" won Wimbledon yesterday: 10,000 searches since. Federer should rank first, so raw counts aren't enough."],
      ["img","Keyboard Closeup 02 (203533165).jpeg","Suggestions have to arrive before the next keystroke, roughly within 100 ms of each key press."]
    ] },
    { h: "2 · Scale estimation", blocks: [
      ["math",[["Searches / day","Google scale","10 B"],["Typeahead calls per search","~6 keystroke batches","60 B reads/day ≈ 700k/s"],["New terms / day","10% of searches","1 B → 365 B/year"],["Terms over 10 years","365 B × 10","3.65 T"],["Bytes per term","32 chars + 8 B count","40 B"],["Total storage","3.65 T × 40 B","≈ 146 TB → must shard"]],"1 write (frequency++) per 6 reads: that's <b>both read- and write-heavy</b>. Reads only dominate when they outnumber writes by an order of magnitude or more."],
      ["p","<b>3 · Goals:</b> availability over consistency (a slightly stale suggestion is fine) and <b>very low latency</b>, because suggestions race the user's fingers. <b>4 · APIs:</b> <code>getSuggestions(prefix, limit=5)</code> and <code>updateFrequency(term)</code>, called asynchronously by the search service."]
    ] },
    { h: "5a · Trie with top-5 at every node", blocks: [
      ["p","In a trie each node is a character, and the path from the root spells a prefix. The naive read walks to the prefix node and then scans the whole subtree for the top 5, which is huge for \"mic\". The trick is to <b>store the top-5 list at every node</b>. A read is then O(prefix length)."],
      ["fig","trie","Type a prefix, then press Search to bump a term. Turn on buffering, then let a day pass to see time decay."],
      ["p","<b>Write:</b> increment the terminal node's count, then walk back up its ancestors and fix any top-5 list that changed. Only ancestors can be affected."],
      ["warn","Practical problem: no off-the-shelf database stores tries, so you'd build and operate a custom store."],
      ["code","class TrieNode {\n  children: Map<char, TrieNode>   // up to 26 (or 36 with digits)\n  frequency: number               // > 0 only if a full term ends here\n  top5: [term, frequency][]       // cached answer for this prefix\n}\n\ngetSuggestions(prefix):  walk prefix → return node.top5          // O(len(prefix))\nupdateFrequency(term):   walk term → frequency++ →\n                         for each ancestor: re-rank its top5 if term qualifies"]
    ] },
    { h: "5b · The hashmap approach (more practical)", blocks: [
      ["p","Two key-value tables: <code>frequency: term → count</code> and <code>top5: prefix → [terms]</code>, with one entry per prefix. Reading \"mich\" is <b>one lookup</b> in a KV store, which shards by key with consistent hashing. \"mic\" and \"mich\" may live on different shards, and that's fine. Updates to the prefix entries can be applied <b>asynchronously</b>."]
    ] },
    { h: "Taming the writes", blocks: [
      ["p","Insight: <b>only relative popularity matters</b>, not exact counts. So we can drop most writes:"],
      ["table",["Technique","How","Effect"],[["Threshold buffer","Count searches in a separate buffer map; flush <code>+50</code> to the main store when a term reaches 50","Long-tail terms (typos, one-offs) never touch the main store; trending terms still flow quickly. Worst case ~400 GB/day, fits one machine, flush daily."],["Sampling","Record only every 100th occurrence (1% sample)","100× fewer writes, same trend, like an exit poll."]]],
      ["chart",{"type":"bar","title":"Main-store writes per day","sub":"Google scale; the last bar is an estimate","data":[["Every search",10000000000],["1% sampling",100000000],["Sampling + threshold buffer",5000000]],"log":true,"highlight":2}]
    ] },
    { h: "Sharding the trie", blocks: [
      ["p","Suggestions start at 3 characters, so shard by the <b>first 3 characters</b>: 36³ ≈ 46,656 ≈ 50k groups. Some prefixes (\"the\", \"mic\") are scorching and others (\"qzx\") are idle. Use consistent hashing and <b>co-locate hot prefixes with cold ones</b> so shards are balanced."]
    ] },
    { h: "Recency with time decay", blocks: [
      ["p","Subtracting a fixed amount daily is unfair: a term with count 2 vanishes while one with 1,000 barely notices. Instead decay by a <b>percentage</b>: every day <code>freq = freq / TDF</code>, and every search <code>freq += 1</code>. With TDF = 2, today's searches weigh 1, yesterday's ½, the day before ¼… Old fads fade and trends rise. Try the 🌙 button in the trie figure."],
      ["chart",{"type":"line","title":"How much a search still counts after d days","x":{"label":"days ago","values":[0,1,2,3,4,5,6,7]},"y":{"label":"weight","max":100},"fmt":"pct","series":[{"name":"TDF = 2","values":[100,50,25,12.5,6.25,3.125,1.5625,0.78125]},{"name":"TDF = 1.25","values":[100,80,64,51.2,40.96,32.768,26.2144,20.97152]}]}]
    ] }
  ],
  quiz: [
    {"q":"Why store the top-5 list at every trie node?","o":["To save memory","So reads are O(prefix length) instead of scanning a huge subtree","To support spell-check","For sharding"],"a":1,"why":"Precompute the answer per prefix and pay on writes, which are fewer and async."},
    {"q":"Total storage for 10 years of terms?","o":["~146 GB","~146 TB","~146 PB","~1.46 TB"],"a":1,"why":"365B new terms/year × 10 × 40 bytes ≈ 146 TB."},
    {"q":"1% sampling of searches reduces main-store writes by…","o":["1%","10×","100×","Nothing"],"a":2,"why":"One write per 100 searches, and the ranking trend is unchanged."},
    {"q":"Why decay by percentage, not a fixed amount?","o":["It's faster","Fixed subtraction kills small terms but barely affects big ones","Percentages are smaller","SQL needs it"],"a":1,"why":"Exponential decay treats all terms proportionally."}
  ],
  refs: [
    ["Design autocomplete / typeahead (video walkthrough)","https://www.youtube.com/watch?v=us0qySiUsGU"],
    ["ByteByteGo: Design a search autocomplete system","https://bytebytego.com/courses/system-design-interview/design-a-search-autocomplete-system"]
  ]
});
