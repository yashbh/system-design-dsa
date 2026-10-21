/* Blueprint course — lesson: Case study: full-text search with Elasticsearch */
BP.LESSONS.push({
  id: "search",
  mod: "cases",
  icon: "🔍",
  minutes: 25,
  title: "Case study: full-text search with Elasticsearch",
  scaler: "HLD 13 · Case Study: ElasticSearch",
  summary: "Why LIKE '%job post%' can't search LinkedIn, how Lucene builds an inverted index, and how Elasticsearch shards, replicates and fans out queries.",
  concepts: ["inverted-index","sharding","replication"],
  related: [],
  sections: [
    { h: "Why databases can't do this", blocks: [
      ["p","Goal: find LinkedIn posts matching \"job posting\", including \"job post\" and \"jobs posted\". In SQL, <code>WHERE content LIKE '%job post%'</code> has a leading wildcard, so no index helps: it's a <b>full table scan</b> doing a substring search in every row (roughly O(N × M²)). NoSQL stores have the same problem: you'd still read every value."]
    ] },
    { h: "The inverted index", blocks: [
      ["p","Flip the relationship: instead of document → words, store <b>word → list of (document, position)</b>. Apache Lucene builds it with a text-analysis pipeline:"],
      ["steps",[["Tokenize","Split text into words."],["Remove stop words","Drop \"a\", \"the\", \"is\"… (the notes call this character elimination)."],["Stem","Reduce to roots: ran / running → run, crashed / crashes → crash."],["Index","For each term, append (docId, position). Positions enable phrase queries and highlighting."]]],
      ["fig","invindex","Click a document to see the pipeline. Search for \"running app\" and notice it matches \"ran the app\"."],
      ["p","Uses go well beyond posts: log analysis (the \"E\" in ELK), resume search, product search, site search."],
      ["img","Card catalog at the Indiana State Library - cabinet exterior.jpg","A library card catalogue is an inverted index on paper: look up a subject and get the list of books (documents) about it."],
      ["chart",{"type":"bar","title":"Work to answer one search over 1B posts (approx.)","data":[["SQL LIKE '%job post%' (scan every row)",1000000000],["Inverted index (read 2 posting lists)",2000000]],"log":true,"unit":"rows","highlight":1}]
    ] },
    { h: "Elasticsearch: Lucene, distributed", blocks: [
      ["p","A single Lucene instance is a SPOF, runs out of disk and can't take high traffic. Elasticsearch distributes it, favouring <b>availability over consistency</b> (search results a second stale are fine)."],
      ["list",["<b>Document</b> = one post · <b>Index</b> = a collection (posts, resumes) · <b>Node</b> = a machine.","<b>Sharding:</b> by document id: <code>shard = hash(id) % number_of_primary_shards</code>. Plain modulo works because the shard count is <b>fixed at index creation</b>.","<b>Replication:</b> each shard has a primary and replicas, for durability <i>and</i> read throughput."]],
      ["flow",{"nodes":[{"id":"c","x":90,"y":225,"label":"Client","sub":"index / search","kind":"client","icon":"🧑‍💻","desc":"Can send requests to any node."},{"id":"co","x":320,"y":225,"label":"Coordinating node","sub":"routes & merges","kind":"edge","icon":"🧭","desc":"Whichever node receives the request."},{"id":"p0","x":600,"y":80,"label":"Shard 0 primary","sub":"node A","kind":"db","icon":"🗂️","desc":"Writes for docs hashing to shard 0 go here first."},{"id":"r0","x":860,"y":80,"label":"Shard 0 replica","sub":"node B","kind":"db","icon":"🗂️","desc":"Async copy; can serve reads."},{"id":"p1","x":600,"y":370,"label":"Shard 1 primary","sub":"node B","kind":"db","icon":"🗂️","desc":"Owns the other half of the documents."},{"id":"r1","x":860,"y":370,"label":"Shard 1 replica","sub":"node C","kind":"db","icon":"🗂️","desc":"Async copy."}],"flows":[{"name":"Index a post","steps":[["c","co","PUT /posts/_doc/42"],["co","p0","hash(42) % 2 = 0 → shard 0's primary runs the Lucene pipeline"],["p0","r0","Replicate to the shard's replicas"],["co","c","Acknowledged"]]},{"name":"Search","steps":[["c","co","GET /posts/_search?q=job posting"],["co","r0","Fan out: one copy of shard 0 (a replica is fine)"],["co","p1","…and one copy of shard 1, in parallel"],["r0","co","Top hits from shard 0"],["p1","co","Top hits from shard 1"],["co","c","Merge, rank, return. If a copy fails, retry another copy of that shard."]]}]},"Writes go to one shard's primary; searches fan out to every shard and are merged."],
      ["tip","Writes know their document id, so they hit one shard. Searches don't know which documents match, so they must ask <b>every</b> shard. That asymmetry is why ES clusters add replicas to scale reads."],
      ["p","<b>A concrete layout (from the notes):</b> 3 nodes, an index with 2 primary shards (0 and 1) and replicas. With few nodes, several shard copies share a node, and adding nodes spreads them out automatically. Some search APIs return <b>partial results</b> when a shard is unavailable, choosing speed and availability over completeness."]
    ] }
  ],
  quiz: [
    {"q":"Why is SQL LIKE '%term%' bad for full-text search?","o":["It's case-sensitive","A leading wildcard forces a full scan of every row","It can't use JOINs","It's not ACID"],"a":1,"why":"No B-tree can help with substring matches in long text."},
    {"q":"What does stemming buy you?","o":["Smaller documents","\"ran\", \"running\" and \"runs\" all match \"run\"","Encryption","Faster writes"],"a":1,"why":"Normalizing to roots improves recall."},
    {"q":"Why can ES use hash(id) % N instead of consistent hashing?","o":["It's faster","The number of primary shards is fixed at index creation","ES doesn't replicate","IDs are sorted"],"a":1,"why":"N never changes, so modulo never reshuffles."}
  ],
  refs: [
    ["Elastic: Elasticsearch from the bottom up","https://www.elastic.co/blog/found-elasticsearch-from-the-bottom-up"],
    ["Elastic: Text analysis","https://www.elastic.co/docs/manage-data/data-store/text-analysis"],
    ["Elastic: Reading and writing documents","https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-replication.html"]
  ]
});
