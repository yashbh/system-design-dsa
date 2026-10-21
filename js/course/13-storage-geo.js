/* Blueprint course — lesson: Case study: large-file storage (S3/HDFS) & nearest neighbours (quadtrees, Uber) */
BP.LESSONS.push({
  id: "storage-geo",
  mod: "cases",
  icon: "🗺️",
  minutes: 35,
  title: "Case study: large-file storage (S3/HDFS) & nearest neighbours (quadtrees, Uber)",
  scaler: "HLD 14 · Case Study: S3, HDFS + Quad Trees · HLD 15 · Design Uber",
  summary: "Store a 50 TB file reliably with chunks and replicas, then find the 10 nearest restaurants or cabs with a quadtree that adapts to density.",
  concepts: ["hdfs","object-storage","quadtree","geo-index"],
  related: ["uber"],
  sections: [
    { h: "Storing very large files", blocks: [
      ["p","Posts store only metadata in the DB, while the media goes to a blob store that returns a URL. But how do you store a 50 TB video, or a log file that never stops growing? <b>Split it into chunks spread across machines.</b>"],
      ["p","Chunk size matters. 50 TB in 1 MB chunks = <b>5 × 10⁷ chunks</b>, each needing a metadata entry and collation on read. HDFS benchmarked common workloads and settled on <b>128 MB</b> blocks (64 MB in HDFS 1)."],
      ["fig","hdfs","Upload a file, see how it's split and where replicas land. Kill a DataNode and watch re-replication."],
      ["list",["<b>NameNode:</b> metadata only: file → blocks → DataNodes (kept in RAM, itself replicated).","<b>DataNodes:</b> store the blocks, heartbeat to the NameNode.","<b>Rack-aware replication:</b> never put all copies on one rack, so a rack power failure can't lose data.","<b>Upload:</b> buffer 128 MB → ask the NameNode where → write to a DataNode, which pipelines to the replicas → repeat. A 200 MB file = 128 MB + 72 MB.","<b>Download:</b> get the block list, fetch blocks in order (or in parallel), stream to the client."]],
      ["analogy","Like a torrent: a 1,000 MB movie split into 100 parts can be fetched from 100 peers at once, and a slow peer's part is simply re-requested elsewhere."],
      ["extra","<b>S3</b> exposes the same idea as a flat bucket/key namespace with multipart upload (up to 10,000 parts), strong read-after-write consistency, and erasure coding internally. <b>Erasure coding</b> (e.g. RS(6,3)) survives 3 losses with 50% overhead, vs 200% for 3× replication."],
      ["img","Seagate ST33232A hard disk inner view.jpg","HDFS runs on many cheap commodity disks like this, so it assumes disks will fail and replicates every block three times."],
      ["chart",{"type":"bar","title":"NameNode entries for one 50 TB file","data":[["1 MB blocks",50000000],["64 MB blocks",781250],["128 MB blocks",390625]],"log":true,"highlight":2}]
    ] },
    { h: "Nearest neighbours: why normal indexes fail", blocks: [
      ["list",["<b>Brute force:</b> distance to every place on Earth. Hopeless.","<b>Bounding square</b> <code>lat BETWEEN x±k AND lng BETWEEN y±k</code>: picking k is hard, and a B-tree can use only one of the two ranges.","<b>Fixed grid</b> (1 km² cells): oceans need huge cells and cities tiny ones. A cell should hold a <i>count</i> of points (~100), not cover a fixed area."]]
    ] },
    { h: "The quadtree", blocks: [
      ["p","Start with the whole world as one node. If a node holds more than <b>100</b> points, split it into <b>4</b> equal quadrants and recurse. Dense areas get deep, tiny cells and empty areas stay as big cells. Height ≈ log N."],
      ["fig","quadtree","Drop points (try the dense city), then switch to “Find 5 nearest” and click the map."],
      ["list",["<b>Find my cell:</b> at each node compare x with x_mid and y with y_mid → O(log N).","<b>Neighbours:</b> follow sibling pointers, or probe just outside the cell boundary in 8 directions.","<b>Insert:</b> find the leaf; if it would exceed the limit, split it (and update ~100 places' grid ids).","<b>Delete:</b> merge four children back when together they drop below the limit."]],
      ["math",[["Places","given","100 M"],["Nodes if ~20 places per leaf","(10⁸ × 4/3) ÷ 20","≈ 6.5 M"],["Bytes per node","4 coords + 4 child pointers","≈ 80 B"],["Tree size","6.5 M × 80 B","≈ 520 MB"],["Points (lat, lng)","10⁸ × 32 B","3.2 GB"],["Total","","≈ 4 GB: fits in one machine's RAM"]],"Small enough to hold in memory and replicate for availability."],
      ["code","findGrid(x, y, node):\n  if node.isLeaf: return node.gridId\n  xMid = (node.x1 + node.x2) / 2;  yMid = (node.y1 + node.y2) / 2\n  if x <  xMid and y >= yMid: return findGrid(x, y, node.NW)\n  if x >= xMid and y >= yMid: return findGrid(x, y, node.NE)\n  if x <  xMid and y <  yMid: return findGrid(x, y, node.SW)\n  return findGrid(x, y, node.SE)                       // O(log N)"],
      ["chart",{"type":"donut","title":"RAM for a quadtree of 100M places","data":[["Tree nodes",0.52],["Coordinates",3.2]],"center":"≈ 4 GB","centerSub":"fits on one box","fmt":"num","unit":"GB"}]
    ] },
    { h: "Design Uber: when the points move", blocks: [
      ["list",["<b>Shard by city.</b> 10M cabs worldwide, but a rider in Mumbai only needs Mumbai's (the busiest Indian cities have ~50k).","<b>Density changes with place and time</b>, so build a quadtree per city from current cab positions.","Cabs ping every ~60 s; keep <code>cab → last location</code> in Redis.","<b>Don't update the tree on every ping.</b> The driver app knows its cell's bounding box and only reports when it <i>crosses</i> into a new cell.","<b>Hysteresis:</b> split above ~75 and merge below ~50, so cells don't flap as cabs move in and out. Or rebalance every few hours.","Offer the ride to nearby drivers round-robin until one accepts."]],
      ["tip","Uber's production system uses <b>H3</b> hexagons instead of quadtrees. Explore it in the <a href=\"#/case/uber\">Uber case study</a>."]
    ] }
  ],
  quiz: [
    {"q":"How does HDFS chunk a 200 MB file?","o":["2 × 100 MB","128 MB + 72 MB","200 × 1 MB","One 200 MB block"],"a":1,"why":"128 MB blocks; the last block holds the remainder."},
    {"q":"Why rack-aware replication?","o":["Faster writes","A rack-level failure (power, switch) would otherwise lose every copy","Cheaper disks","It's required by S3"],"a":1,"why":"Spread replicas across failure domains."},
    {"q":"Why do quadtrees beat fixed grids?","o":["They're simpler","Cells adapt to density: tiny in cities, huge over oceans","They use less CPU","They're SQL-native"],"a":1,"why":"Split when a cell holds too many points."},
    {"q":"How do you avoid hammering Uber's quadtree with location pings?","o":["Ignore pings","Update only when a cab crosses into a new cell (client-side check)","Use a bigger server","Ping every second"],"a":1,"why":"Most pings stay within the same cell, so they need no tree update."}
  ],
  refs: [
    ["Apache HDFS architecture","https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html"],
    ["HDFS erasure coding","https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/HDFSErasureCoding.html"],
    ["S3 multipart upload","https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html"],
    ["Interactive quadtree visualization","https://jimkang.com/quadtreevis/"],
    ["Uber: H3 hexagonal spatial index","https://www.uber.com/blog/h3/"],
    ["The Google File System paper","https://research.google/pubs/the-google-file-system/"]
  ]
});
