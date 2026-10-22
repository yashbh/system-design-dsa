/* Blueprint course — lesson: Case study: search typeahead (Google, Amazon) */
BP.LESSONS.push({
  id: "typeahead",
  mod: "cases",
  icon: "🔎",
  minutes: 20,
  title: "Case study: search typeahead (Google, Amazon)",
  summary: "Design Google-scale autocomplete from scratch: requirements, the scale math, tries vs hashmaps, taming a flood of writes with buffering and sampling, sharding by prefix, and letting old searches fade.",
  concepts: ["trie","sharding","consistent-hashing","caching"],
  related: [],
  sections: [
    { h: "Three letters and it reads your mind", blocks: [
      ["p","Open Google and type “mic”. Before your finger leaves the key, a little box drops down: <i>microsoft</i>, <i>michael jordan</i>, <i>microwave</i>. Type an “h” and the list changes again. It feels like nothing. It's one of the busiest services on the planet."],
      ["p","That drop-down is called <b>typeahead</b>, or autocomplete. Amazon has it on its search bar, Spotify has it, your IDE has it. It looks like a tiny feature, but at Google's size it has to answer tens of billions of requests a day, each one in less time than it takes you to press the next key."],
      ["p","Picture it as a story: the CEO walks over to you, the architect, and says “build typeahead for us, at Google scale”. That's what we'll do in this lesson, end to end, the way you would in a system design interview."],
      ["p","Along the way you'll meet a data structure (the trie), a classic sharding problem (hot prefixes), a neat trick for surviving a flood of writes (don't record most of them), and a gentle bit of maths for making yesterday's news fade away."]
    ] },
    { h: "A recipe for any design interview", blocks: [
      ["p","Before designing anything, let's pick up a tool we'll reuse in every case study. Big design questions feel overwhelming because they have no obvious starting point. A fixed sequence of steps gives you one."],
      ["steps",[["1 · MVP / functional requirements","What must it do? Ask clarifying questions and agree on scope with the interviewer. The MVP (minimum viable product) is the smallest version that solves the real problem."],["2 · Estimate scale","Three questions. Is sharding needed (how much total storage)? Is it read-heavy, write-heavy, or both? How many queries per second, and so how many machines? For example, 1M queries a second at 1,000 per machine means about 1,000 machines."],["3 · Design goals","The non-functional side. Consistency or availability? What latency target? Can we lose some data?"],["4 · APIs","How the outside world calls you. The parameters often hint at the sharding key."],["5 · Design","Data structures, sharding, the read path and the write path, caching and optimisations."]]],
      ["tip","Every case study in this module follows the same five steps. Practise saying them out loud. Interviewers love a candidate who brings structure to a vague question, and it stops you from drawing boxes before you know what they're for."]
    ] },
    { h: "Step 1: pin down what it must do", blocks: [
      ["p","“Build typeahead” could mean a dozen different products. So we ask questions. Here are the answers we settle on."],
      ["list",["<b>How many suggestions?</b> 5.","<b>How are they ranked?</b> By popularity. In general popularity mixes how often something is searched with how recently. For the MVP, it's just the raw search count.","<b>What counts as a match?</b> Strict <b>prefix</b> match only. “mic” matches “microsoft”, not “atomic”.","<b>Personalisation?</b> Out of scope for the MVP. Confirm this in a real interview; it changes the design a lot.","<b>Spelling correction?</b> Not supported. No special characters either.","<b>When do suggestions start?</b> After <b>3 characters</b>."]],
      ["p","One point matters a lot: the MVP is about <i>what</i> the system does. Latency, availability and the like belong in design goals, step 3. Keep them separate and your answer stays organised."],
      ["p","There's also a teaser to keep in your back pocket. “Roger Binny” has 1 million searches over 5 years, about 1,000 a day. “Roger Federer” won Wimbledon yesterday and has had 10,000 searches since. If you type “roger”, who should come first? Federer, obviously. But by raw count Binny wins 1,000,000 to 10,000. So raw frequency isn't enough. We'll fix that at the end."],
      ["img","Keyboard Closeup 02 (203533165).jpeg","A fast typist hits a key every 100–200 ms. Suggestions that arrive after the next keystroke are already out of date."]
    ] },
    { h: "Step 2: how big is this thing?", blocks: [
      ["p","Now the numbers. First, a definition: a <b>search</b> is the final query someone submits with Enter or the search button. Typeahead calls are the lookups that happen while they type."],
      ["math",[["Searches per day","Google scale","10 B"],["Typeahead calls per search","about 6 as you type","60 B reads/day"],["Average read rate","60 B ÷ 86,400 s","≈ 694k/s (peaks higher)"],["Average search rate","10 B ÷ 86,400 s","≈ 116k/s"],["New terms per day","10% of searches","1 B/day → 365 B/year"],["Terms over 10 years","365 B × 10","3.65 trillion"],["Bytes per term","32-character term + 8-byte count","40 B"],["Total storage","3.65 T × 40 B","≈ 146 TB"]],"146 TB will not fit on one machine, so sharding is not optional."],
      ["p","Where does “6 calls per search” come from? You don't send a request for every keystroke. The client batches a few keystrokes together, and an average search triggers about six lookups before you hit Enter."],
      ["p","Notice what we store: every search term ever seen, plus how often it's been searched. Each of those 10 billion daily searches is also a <b>write</b>, because it bumps a counter."]
    ] },
    { h: "Read-heavy, write-heavy or both?", blocks: [
      ["p","This question matters more than it looks. Writes in most databases take locks on the rows they change, and while a row is locked, reads of that row wait. So a system with lots of both reads and writes has them constantly fighting."],
      ["p","Here the ratio is <b>1 write for every 6 reads</b>: 10 billion writes and 60 billion reads a day. Is that read-heavy? No. A system only counts as read-heavy when reads outnumber writes by an order of magnitude or more, so that writes are a rounding error. One in six is not a rounding error."],
      ["p","So typeahead is <b>both read- and write-heavy</b>. That's the most interesting finding of the estimate, and it shapes the whole design. A heavy-on-both system has to absorb one side somewhere: cache the reads, or buffer and thin out the writes. Hold that thought."],
      ["warn","A common interview slip is to say “search is read-heavy” and move on. The count updates make typeahead write-heavy too. Spotting that early is what gets you to the clever part of the design."]
    ] },
    { h: "Steps 3 and 4: goals and APIs", blocks: [
      ["p","<b>Design goals.</b> Two of them stand out."],
      ["list",["<b>Availability over consistency.</b> If your suggestions are a few minutes behind reality, nobody notices. If the box doesn't appear at all, everybody does.","<b>Very low latency.</b> The suggestions are racing the user's fingers. If the list for “mic” arrives after they've typed “mich”, it's useless."]],
      ["p","<b>APIs.</b> Just two."],
      ["code","getSuggestions(prefix_term, limit = 5)   // called by the browser as you type\nupdateFrequency(search_term)             // called internally, asynchronously"],
      ["p","The second one is interesting. When you hit Enter, the search service builds your results page and, <b>in the background</b>, tells the typeahead service “this term was searched once more”. The user never waits for that update. That asynchrony is what gives us room to be clever with writes later."]
    ] },
    { h: "A trie, the obvious data structure", blocks: [
      ["p","Prefix matching has a textbook data structure: the <b>trie</b> (say “try”). It's a tree where each node is one character, and the path from the root to any node spells a prefix. With only letters, each node has up to 26 children, or 36 if you include digits."],
      ["p","Insert “mic”, “microsoft” and “michael” and they share the path m → i → c, then branch. A node where a complete search term ends is a <b>terminal node</b>, and it stores that term's search count."],
      ["p","So how do we answer <code>getSuggestions(\"mic\")</code>? The naive way: walk down to the “mic” node, then explore its entire subtree, collect every terminal node and pick the 5 with the highest counts."],
      ["p","Think about how big the subtree under “mic” is. Every search term ever typed that starts with those three letters: microsoft, microwave, michigan, mickey mouse, michelin star restaurants near me, and millions more. Scanning that on every keystroke would blow straight through the latency budget."]
    ] },
    { h: "Cache the answer at every node", blocks: [
      ["p","Here's the key trick: <b>store the top-5 list at every node</b>. The “mic” node doesn't just know its children; it also holds a ready-made list of the five most popular terms that start with “mic”."],
      ["p","Now a read is just: walk down the prefix, return the stored list. That's O(length of prefix), a handful of steps no matter how many terms exist. We've precomputed the answer for every possible prefix."],
      ["fig","trie","Type a prefix and watch the path light up with the cached top 5 at each node. Press Search to bump a term and see the update ripple up through its ancestors. Then turn on buffering and let a day pass to see time decay."],
      ["p","The cost moves to writes. When “michael jordan” gets one more search, find its terminal node and increment the count. Which top-5 lists could change? Only the ones on the path from the root to that node: “m”, “mi”, “mic”, “mich” and so on. Walk back up those ancestors and re-rank any list the term now belongs in."],
      ["code","class TrieNode {\n  children: Map<char, TrieNode>   // up to 26 (or 36 with digits)\n  frequency: number               // > 0 only if a full term ends here\n  top5: [term, frequency][]       // cached answer for this prefix\n}\n\ngetSuggestions(prefix):  walk prefix → return node.top5          // O(len(prefix))\nupdateFrequency(term):   walk term → frequency++ →\n                         for each ancestor: re-rank its top5 if term qualifies"],
      ["p","That's a good trade: reads are six times more common, and they're the ones the user waits on. Writes are asynchronous, so they can afford to do the extra work."],
      ["warn","The practical problem: no off-the-shelf database stores tries. You'd have to build, shard, replicate and operate your own custom storage engine. That's a lot of engineering for one feature."]
    ] },
    { h: "The hashmap version (what you'd ship)", blocks: [
      ["p","This is the more practical approach. Flatten the trie into two key–value tables, which any key–value store can hold."],
      ["table",["Table","Key","Value"],[["frequency","search term","its count, e.g. “michael jordan” → 48,210"],["top5","every prefix","its top-5 list, e.g. “mic” → [microsoft, michael jordan, …]"]]],
      ["p","<b>Read:</b> <code>getSuggestions(\"mich\")</code> is a single lookup of the key “mich” in the top5 table. A key–value store already shards by key using consistent hashing, so the client goes straight to the shard that owns “mich”."],
      ["p","Will “mic” and “mich” live on the same shard? Not necessarily, and it doesn't matter. Each read touches exactly one key, so it never needs both."],
      ["p","<b>Write:</b> an update to term S can only change the top5 entries for S's own prefixes. Those updates don't have to happen instantly. Put them on a queue of pending updates and let workers apply them to the shards that own each prefix. Remember, we chose availability over consistency, so a little lag is fine."],
      ["tip","When you can turn a clever data structure into plain key–value lookups, you usually should. You get sharding, replication and operations for free from a store your team already knows."]
    ] },
    { h: "Writes are the real problem", blocks: [
      ["p","We've made reads fast. Now look at the write side honestly. Every one of the 10 billion daily searches triggers an update. And one update isn't one write: it's the term's count plus the top5 entries for every prefix of that term. A 20-character term could touch nearly 20 rows."],
      ["p","Those writes also compete with reads for the same rows. Hot prefixes like “the” or “mic” would be locked and rewritten constantly while millions of people are reading them. This is the read-and-write-heavy problem from step 2 catching up with us."],
      ["p","The breakthrough is one small observation: <b>we only care about relative popularity, not exact counts</b>. Nobody needs to know that “microsoft” has exactly 4,812,337 searches. We only need to know it's more popular than “microwave”. Once you accept that, you can throw most writes away. Here are two ways to do it."]
    ] },
    { h: "Trick 1: a threshold buffer", blocks: [
      ["p","Instead of writing every search to the main store, <code>updateFrequency</code> writes to a separate, small <b>buffer</b>: another hashmap that just counts extra searches per term."],
      ["p","When a term's buffered count reaches a <b>threshold</b>, say 50, you apply <code>freq += 50</code> to the main store in one go and reset the buffer entry to 0. Let's see it on a made-up afternoon:"],
      ["steps",[["“michael jordan”, 120 searches","The buffer hits 50: one main-store write (+50), reset. It hits 50 again: another write (+50). 20 are left waiting in the buffer. That's 2 writes instead of 120."],["“micheal jrodan” (a typo), 2 searches","Never reaches 50, so it never touches the main store. The long tail of typos and one-off queries is filtered out for free."],["A breaking news term, 50,000 searches in an hour","Reaches the threshold 1,000 times and flows into the main store quickly. Trends still show up, so recency isn't lost."]]],
      ["p","How big can the buffer get? Worst case, 10 billion searches a day × 40 bytes is about <b>400 GB</b>. In practice it's much smaller, because only distinct terms create entries. That fits on one large machine, and if memory gets tight you can flush the buffer at the end of each day."]
    ] },
    { h: "Trick 2: sampling, like an exit poll", blocks: [
      ["p","On election night, TV channels predict the winner hours before the count is done. They don't ask every voter. They ask a random sample at the exit, and the sample shows the same trend as the whole population."],
      ["p","Typeahead can do the same. Record only <b>every 100th occurrence</b> of a search, a 1% sample, and drop the rest. Writes fall by <b>100×</b>, and the ranking barely moves. It works so well here because the counts are huge and we only need the trend."],
      ["chart",{"type":"bar","title":"Main-store writes per day","sub":"Google scale; the last bar is an estimate","data":[["Every search",10000000000],["1% sampling",100000000],["Sampling + threshold buffer",5000000]],"log":true,"highlight":2}],
      ["p","Combine both tricks and the main store sees a trickle instead of a flood. We've turned a read-and-write-heavy system into an essentially read-heavy one, and read-heavy systems are the easy kind: cache and replicate."],
      ["warn","Sampling only works when you don't need exact numbers. You couldn't sample bank transactions or ticket sales. Always say why the data tolerates it: here, only the relative order matters."]
    ] },
    { h: "Splitting 146 TB across machines", blocks: [
      ["p","We still need to shard. For the trie version, what's the sharding key? Suggestions only start after 3 characters, so the natural choice is the <b>first 3 characters of the prefix</b>. Every query for “mich”, “michael” or “michigan” starts with “mic”, so they all go to the shard that owns the “mic” subtree."],
      ["math",[["Letters only","26 × 26 × 26","17,576 groups"],["Letters and digits","36 × 36 × 36","46,656 ≈ 50k groups"]],"Up to about 50k three-character groups, which you then spread across your shards."],
      ["p","But not all prefixes are equal. “the”, “how” and “mic” are scorching hot. “qzx” and “aaa” get a handful of queries a day. Give each group its own machine and some machines melt while others sleep. This is the classic <b>hot-spot</b> problem."],
      ["p","The fix: <b>co-locate hot prefixes with cold ones</b>. Put “aaa” on the same shard as “mic”. Use consistent hashing on the first 3 characters to place each group, and balance shards by load rather than by the number of prefixes they hold."],
      ["p","The hashmap version is simpler still. Any key–value store with consistent hashing works, with the key itself as the sharding key. The hash function spreads prefixes around, and hot keys can be replicated or cached further."]
    ] },
    { h: "Yesterday's news: time decay", blocks: [
      ["p","Back to Roger Binny and Roger Federer. Or take “Shania Twain”: hugely popular a few years ago, rarely searched today. With raw counts, she keeps a top-5 slot forever, wasting a spot that a current trend deserves. We need recent searches to matter more."],
      ["p","Idea 1: subtract a fixed amount, say 10, from every count each day. That's unfair. A small, rising term with a count of 2 vanishes overnight, while a stale giant with 1,000,000 barely notices."],
      ["p","Idea 2, the one that works: decay by a <b>percentage</b>. Pick a <b>time decay factor</b> (TDF). Once a day, every count becomes <code>freq = freq / TDF</code>. Every search still adds <code>freq += 1</code>. A bigger TDF means faster forgetting."],
      ["p","With TDF = 2, a search made today counts as 1, yesterday's counts as ½, the day before ¼, and so on. That's <b>exponential decay</b>: every term loses the same share each day, and a term nobody searches any more eventually fades to nothing."],
      ["chart",{"type":"line","title":"How much a search still counts after d days","x":{"label":"days ago","values":[0,1,2,3,4,5,6,7]},"y":{"label":"weight","max":100},"fmt":"pct","series":[{"name":"TDF = 2","values":[100,50,25,12.5,6.25,3.125,1.5625,0.78125]},{"name":"TDF = 1.25","values":[100,80,64,51.2,40.96,32.768,26.2144,20.97152]}]}],
      ["extra","A quick sanity check with these numbers. With TDF = 2, a term searched a steady s times a day settles at about s × (1 + ½ + ¼ + …) = 2s. So Binny, at 1,000 a day, sits near 2,000 no matter how many years of history he has. Federer's 10,000 from yesterday are worth about 5,000 today, plus whatever today brings. Federer ranks first, as he should."],
      ["p","Try the moon button in the trie figure above: each press is one day passing, and you can watch old favourites slide down the lists."]
    ] },
    { h: "Putting it together", blocks: [
      ["steps",[["Requirements","5 suggestions, ranked by popularity, prefix match only, starting after 3 characters."],["Scale","10 B searches and 60 B lookups a day, 146 TB over 10 years. Both read- and write-heavy, and sharding is required."],["Goals and APIs","Available over consistent, very low latency. <code>getSuggestions</code> on the read path, an asynchronous <code>updateFrequency</code> on the write path."],["Data structure","A trie with the top 5 cached at every node, or more practically a key–value store with prefix → top 5 and term → count."],["Taming writes","Only relative popularity matters, so use a threshold buffer and 1% sampling. The system becomes effectively read-heavy."],["Sharding","By the first 3 characters (about 50k groups), mixing hot and cold prefixes on each shard, or simply consistent hashing in a key–value store."],["Recency","Divide every count by the time decay factor daily, so popularity decays exponentially."]]],
      ["p","The big lesson travels well beyond typeahead: when reads and writes fight, ask what the data actually needs. Here it needed order, not precision, and that one insight let us drop more than 99% of the writes."]
    ] },
    { h: "Interview corner", blocks: [
      ["p","Typeahead is a favourite interview question because it touches everything: estimation, data structures, sharding and a real trade-off. Walk the five steps out loud, and make sure you say “it's both read- and write-heavy” during the estimate; it sets up the best part of your answer."],
      ["p","Follow-up questions to expect:"],
      ["list",["<b>“Why not search the subtree on every keystroke?”</b> It's huge, and the answer has to beat the next keystroke. Precompute the top 5 per node.","<b>“Which nodes change when a count goes up?”</b> Only the ancestors on the path from the root to that term.","<b>“Trie or hashmap?”</b> Hashmap in practice: any key–value store can hold it, and tries need custom storage.","<b>“How do you handle 10 billion writes a day?”</b> Only relative popularity matters, so buffer with a threshold and sample 1%.","<b>“How do you shard, and what about hot prefixes?”</b> First 3 characters, about 50k groups, with hot and cold prefixes co-located.","<b>“How do you make trends show up?”</b> Exponential time decay with a TDF, not a fixed daily subtraction.","<b>“What would you cache?”</b> The top-5 lists for the hottest prefixes, at the edge or in the browser, since a few minutes of staleness is fine."]],
      ["tip","30-second answer: “I'd store a prefix → top-5 map and a term → count map in a sharded key–value store, so each keystroke is one lookup. Search updates go asynchronously through a threshold buffer with 1% sampling, because only relative popularity matters, which turns the system read-heavy. I'd shard by prefix with consistent hashing, spread hot prefixes across shards, cache popular prefixes, and decay counts by a daily time-decay factor so trends beat old favourites.”"]
    ] }
  ],
  quiz: [
    {"q":"Why store the top-5 list at every trie node?","o":["To save memory","So a read is O(prefix length) instead of scanning a huge subtree","To support spell-check","For sharding"],"a":1,"why":"You precompute the answer for each prefix and pay for it on writes, which are rarer and asynchronous."},
    {"q":"Roughly how much storage do 10 years of search terms need?","o":["~146 GB","~146 TB","~146 PB","~1.46 TB"],"a":1,"why":"365 billion new terms a year × 10 years × 40 bytes ≈ 146 TB."},
    {"q":"Sampling 1% of searches cuts main-store writes by…","o":["1%","10×","100×","Nothing"],"a":2,"why":"One write per 100 searches, and the ranking trend stays the same."},
    {"q":"Why decay counts by a percentage rather than a fixed amount?","o":["It's faster","Fixed subtraction wipes out small terms but barely touches big ones","Percentages use less memory","SQL needs it"],"a":1,"why":"Exponential decay treats every term proportionally, so old favourites fade fairly and new trends can rise."},
    {"q":"Typeahead sees 1 write for every 6 reads. How should you classify it?","o":["Read-heavy","Write-heavy","Both read- and write-heavy","Neither"],"a":2,"why":"Read-heavy needs reads to outnumber writes by an order of magnitude or more. One in six isn't enough."},
    {"q":"In the hashmap design, will “mic” and “mich” be on the same shard?","o":["Always","Never","Not necessarily, and it doesn't matter","Only with a trie"],"a":2,"why":"Each read is a single lookup of one key, so the two prefixes never need to be fetched together."},
    {"q":"With a threshold buffer of 50, what happens to a typo searched twice?","o":["It gets 2 main-store writes","It gets 1 write","It never reaches the main store","It's deleted from the buffer immediately"],"a":2,"why":"It never reaches the threshold, so the long tail of typos and one-offs is filtered out for free."}
  ],
  refs: [
    ["Design autocomplete / typeahead (video walkthrough)","https://www.youtube.com/watch?v=us0qySiUsGU"],
    ["ByteByteGo: Design a search autocomplete system","https://bytebytego.com/courses/system-design-interview/design-a-search-autocomplete-system"]
  ]
});
