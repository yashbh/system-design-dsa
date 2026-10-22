/* Blueprint course — lesson: Case study: large-file storage (S3/HDFS) & nearest neighbours (quadtrees, Uber) */
BP.LESSONS.push({
  id: "storage-geo",
  mod: "cases",
  icon: "🗺️",
  minutes: 22,
  title: "Case study: large-file storage (S3/HDFS) & nearest neighbours (quadtrees, Uber)",
  summary: "Store a 50 TB file without losing a byte by chopping it into replicated 128 MB blocks, then find the 10 nearest restaurants, or the nearest moving cab, with a quadtree that adapts to how crowded the map is.",
  concepts: ["hdfs","object-storage","quadtree","geo-index"],
  related: ["uber"],
  sections: [
    { h: "Two questions a database can’t answer", blocks: [
      ["p","Here are two requests that sound ordinary and quietly break a normal database. First: “Store this 50 TB video archive, and never lose it.” Second: “I’m standing at this street corner. Show me the 10 nearest restaurants.” Then a twist on the second: “…and the restaurants are actually taxis, and they keep moving.”"],
      ["p","The first is a storage problem. No single disk holds 50 TB comfortably, and disks die. The second is an indexing problem. Database indexes are brilliant at “find rows where x equals 5” and surprisingly bad at “find points near (x, y)”."],
      ["p","This lesson tackles both, in order. You’ll design the idea behind <b>HDFS</b> and <b>S3</b>, the systems that store huge files by chopping them up. Then you’ll build a <b>quadtree</b>, a map index that zooms in where things are crowded, and finally adapt it for Uber, where every point on the map is driving around. The two halves share a theme: when one thing is too big, split it, and decide carefully how big each piece should be."]
    ] },
    { h: "Where does a 50 TB file go?", blocks: [
      ["p","Start with something you already know. When you post a photo on a social network, the database doesn’t store the photo. It stores <b>metadata</b>: user_id, post_id, timestamp and a media URL. The photo itself goes to a <b>blob store</b> (blob = “binary large object”, a fancy word for a file), which hands back that URL."],
      ["p","That works for a 3 MB photo. Now the blob is a 50 TB video archive, or a log file that grows forever as servers keep writing to it. The requirements:"],
      ["list",["<b>Store large files</b>, far bigger than any one machine’s disk.","<b>Reliable and durable:</b> no data loss, ever, even as disks fail.","<b>Downloads:</b> people need to read the files back.","<b>Analytics:</b> jobs need to crunch through the data, ideally in parallel."]],
      ["p","The core idea is the one you’d come up with yourself: <b>split the file into chunks and spread them across many machines</b>. Ten machines with 10 TB disks can hold a file none of them could hold alone. The interesting question is how big each chunk should be."]
    ] },
    { h: "Chunk it, but how big?", blocks: [
      ["p","Try small chunks first, say 1 MB. Then 50 TB becomes <b>5 × 10⁷ chunks</b>, fifty million pieces. Every one of them needs a metadata entry saying which machine holds it, and reading the file means fetching and stitching together (<b>collating</b>) fifty million pieces. The bookkeeping starts to cost more than the data."],
      ["p","Huge chunks have the opposite problem. A 50 GB chunk is clumsy to move, slow to re-copy when a machine dies, and leaves less room to spread work across many machines in parallel. Somewhere in between is a sweet spot."],
      ["chart",{"type":"bar","title":"NameNode entries for one 50 TB file","data":[["1 MB blocks",50000000],["64 MB blocks",781250],["128 MB blocks",390625]],"log":true,"highlight":2}],
      ["p","HDFS, the Hadoop Distributed File System, found its sweet spot the empirical way. Its designers <b>benchmarked the most common workloads</b> (storing, downloading, running analytics) at different chunk sizes and took the best performer. The result: <b>128 MB</b> blocks in HDFS 2, up from <b>64 MB</b> in HDFS 1. For our 50 TB file that’s about 390,000 entries instead of 50 million."],
      ["tip","In an interview, “how did they pick 128 MB?” has a refreshingly honest answer: they measured. Saying “I’d benchmark the real workloads at a few chunk sizes” is a perfectly good design answer for any size-tuning question."]
    ] },
    { h: "HDFS: one librarian, many shelves", blocks: [
      ["p","HDFS has two kinds of machines, and the split between them is the whole design:"],
      ["list",["<b>NameNode:</b> metadata only: file → blocks → DataNodes (kept in RAM, itself replicated).","<b>DataNodes:</b> store the blocks, heartbeat to the NameNode.","<b>Rack-aware replication:</b> never put all copies on one rack, so a rack power failure can't lose data.","<b>Upload:</b> buffer 128 MB → ask the NameNode where → write to a DataNode, which pipelines to the replicas → repeat. A 200 MB file = 128 MB + 72 MB.","<b>Download:</b> get the block list, fetch blocks in order (or in parallel), stream to the client."]],
      ["analogy","The NameNode is a librarian with a card index who never touches a book. Ask “where is chapter 3 of File 1?” and you get “shelf D3”. The DataNodes are the shelves. Because the librarian only handles small index cards, one librarian can keep track of an enormous library."],
      ["p","A <b>heartbeat</b> is a small “I’m alive” message each DataNode sends the NameNode every few seconds. When the heartbeats from a DataNode stop, the NameNode assumes it’s dead and arranges for its blocks to be copied elsewhere from the surviving replicas."],
      ["fig","hdfs","Upload a file and watch it split into blocks, with each block’s copies landing on different machines. Then kill a DataNode and see the NameNode re-replicate what it held."],
      ["img","Seagate ST33232A hard disk inner view.jpg","HDFS runs on many cheap commodity disks like this, so it assumes disks will fail and replicates every block three times."]
    ] },
    { h: "Uploading and downloading, step by step", blocks: [
      ["p","Follow a 200 MB log file on its way in. The client streams data to an app server, which runs the HDFS client library."],
      ["steps",[["Ask the chunk size","The app server asks the NameNode: how big are blocks here? 128 MB."],["Buffer","It buffers the incoming stream until it has 128 MB, or the file ends."],["Ask where","It asks the NameNode where to put this block. The NameNode records the metadata, for example “F1, chunk 1 → D3”, and names the DataNodes for the copies."],["Write and replicate","It writes the block to that DataNode, which passes the bytes along a pipeline to the replica DataNodes."],["Repeat","Back to buffering until the file is done. Our 200 MB file becomes two blocks: <b>128 MB + 72 MB</b>. The last block only holds what’s left."]]],
      ["p","Upload latency isn’t amazing, because it’s one stream of data written block after block. That’s fine; HDFS is built for big, throughput-heavy jobs, not for snappy little writes."],
      ["p","Reading is the reverse. The app server asks the NameNode for the file’s block list and the DataNodes holding each block, fetches the blocks in order, and streams each one to the client as soon as it arrives, so the client doesn’t wait for the whole file."],
      ["analogy","Like a torrent: a 1,000 MB movie split into 100 parts can be fetched from 100 peers at once, and a slow peer's part is simply re-requested elsewhere."],
      ["p","That’s the hidden superpower of chunking: <b>parallelism</b>. An analytics job can process 400 blocks on 400 machines at once, each machine working on the blocks it already stores. Moving the computation to the data, instead of the data to the computation, is the trick behind Hadoop MapReduce."]
    ] },
    { h: "Surviving dead disks and dead racks", blocks: [
      ["p","HDFS runs on lots of cheap disks, and at that scale something is always failing. So every block is <b>replicated</b>, by default to three DataNodes. Lose one disk and two copies remain while a new third is made."],
      ["p","But where you put the copies matters. Machines in a data centre sit in <b>racks</b>, tall cabinets that share a power supply and a network switch. If all three copies sit in one rack and that rack loses power, all three are gone at once. So HDFS is <b>rack-aware</b>: it never puts all of a block’s replicas in the same rack. Its default policy keeps one copy near the writer and the other two on a different rack."],
      ["math",[["Block copies","default replication","3"],["Raw disk for 50 TB","50 TB × 3","150 TB"],["Overhead","extra copies","200%"]],"Three copies are simple and fast to read from, but you pay for the 50 TB file three times over."],
      ["extra","<b>S3</b> exposes the same idea as a flat bucket/key namespace with multipart upload (up to 10,000 parts), strong read-after-write consistency, and erasure coding internally. <b>Erasure coding</b> (e.g. RS(6,3)) survives 3 losses with 50% overhead, vs 200% for 3× replication."],
      ["p","Erasure coding in one sentence: split data into 6 pieces, compute 3 extra “parity” pieces from them using some clever maths, and you can rebuild everything from any 6 of the 9. It’s cheaper on disk, but rebuilding a lost piece takes more CPU and network than just copying a replica, so it’s often used for colder data."]
    ] },
    { h: "Ten restaurants near me", blocks: [
      ["p","Switch problems. You’re building a food app. A user at (x, y) taps “Nearby”, and you must show the 10 closest restaurants out of, say, 100 million places worldwide. Normal database indexes don’t work well for this, and it’s worth seeing exactly why."],
      ["p","<b>Brute force.</b> Compute the distance √((x₂−x₁)² + (y₂−y₁)²) from the user to every place on Earth, sort, take 10. With 100 million places that’s 100 million calculations per tap. Hopeless."],
      ["p","<b>A bounding square.</b> Only look at places within some distance k:"],
      ["code","SELECT * FROM places\nWHERE lat  BETWEEN x - k AND x + k\n  AND long BETWEEN y - k AND y + k;"],
      ["p","Why a square and not a circle? Because a circle can’t be written as a range query; “distance less than k” isn’t a range on either column. Two problems remain. What should k be? In central Mumbai, 200 metres finds dozens of restaurants; in rural Rajasthan, 20 km might find none. And a normal <b>B-tree</b> index can only use <b>one</b> of the two ranges efficiently. It finds every place in the right latitude band, a strip right around the planet, and then filters those one by one by longitude."]
    ] },
    { h: "Grids, and why one size fits nobody", blocks: [
      ["p","Next idea: chop the world into a <b>fixed grid</b> of 1 km × 1 km cells. Give every place a grid_id. Now “nearby” means “my cell plus the 8 around it”:"],
      ["code","SELECT * FROM places WHERE grid_id IN (mine, n1, n2, ..., n8);"],
      ["p","That’s an exact-match query on one column, which databases love. So what’s wrong? <b>Density.</b> A 1 km² cell in the middle of an ocean holds nothing, and you’d search outwards for ages. The same cell in a busy city centre might hold 2,000 restaurants, way more than you need. No single cell size works for both."],
      ["p","The key insight: <b>size a cell by how many points it holds, not by how much area it covers.</b> Aim for about <b>100 points per cell</b>. Over the ocean a cell can be the size of a country; downtown it can be the size of a block. And because restaurants open and close, the cells need to adapt as the data changes."]
    ] },
    { h: "The quadtree: split when crowded", blocks: [
      ["p","A <b>quadtree</b> is a tree where every node is a rectangle on the map, and every node that has children has exactly four (hence “quad”). It turns the “cells sized by count” idea into an algorithm:"],
      ["steps",[["Start with the world","The root node is a rectangle covering the whole map."],["Too crowded? Split","If a node holds more than <b>100</b> points, split it into 4 equal quadrants: north-west, north-east, south-west, south-east."],["Recurse","Apply the same rule to each child. Crowded children split again; sparse ones stay as they are."]]],
      ["p","When it stops, every <b>leaf</b> (a node with no children) holds at most 100 points. Dense areas end up with deep, tiny cells and empty areas stay as big cells. The tree’s height is about <b>log N</b>, because each level divides space into four."],
      ["fig","quadtree","Drop points on the map, piling them into the dense city to watch cells split. Then switch to “Find 5 nearest” and click anywhere to see which cells get searched."],
      ["analogy","It’s like a map app zooming in. Over the ocean you see one big tile. Over a city the map breaks into finer and finer tiles until each one shows a manageable amount of detail."]
    ] },
    { h: "Finding your cell, and your neighbours", blocks: [
      ["p","Given the user’s (x, y), which leaf are they in? At each node, compute the midpoints, compare, and go down into the matching quadrant:"],
      ["code","findGrid(x, y, node):\n  if node.isLeaf: return node.gridId\n  xMid = (node.x1 + node.x2) / 2;  yMid = (node.y1 + node.y2) / 2\n  if x <  xMid and y >= yMid: return findGrid(x, y, node.NW)\n  if x >= xMid and y >= yMid: return findGrid(x, y, node.NE)\n  if x <  xMid and y <  yMid: return findGrid(x, y, node.SW)\n  return findGrid(x, y, node.SE)                       // O(log N)"],
      ["p","Two comparisons per level and about log N levels, so it’s <b>O(log N)</b>. Each place’s grid_id is also stored in MySQL, so once you know the user’s cell you can fetch its places directly."],
      ["list",["<b>Find my cell:</b> at each node compare x with x_mid and y with y_mid → O(log N).","<b>Neighbours:</b> follow sibling pointers, or probe just outside the cell boundary in 8 directions.","<b>Insert:</b> find the leaf; if it would exceed the limit, split it (and update ~100 places' grid ids).","<b>Delete:</b> merge four children back when together they drop below the limit."]],
      ["p","The neighbour trick is cute. If your cell doesn’t have 10 restaurants, or the user is near its edge, you need adjacent cells. One option is to keep pointers between neighbouring leaves. The other: take points just outside your cell, say x + 0.1 past the right edge, in all <b>8 directions</b>, and run <code>findGrid</code> on each one. Eight lookups at log N each is still tiny."],
      ["p","Inserts are rare and cheap: find the leaf, add the place, and split if it goes over 100, which means re-assigning about 100 places’ grid ids in MySQL. Deletes, rarer still, merge four children back into their parent when together they drop below the limit."]
    ] },
    { h: "Does the whole tree fit in RAM?", blocks: [
      ["p","A quadtree is fast because you can walk it in memory. So how much memory does one for 100 million places need? Let’s estimate."],
      ["p","If every leaf held one place, the node count would be 10⁸ + 10⁸/4 + 10⁸/16 + … , a geometric series that adds up to 10⁸ × 4/3 ≈ 1.33 × 10⁸. With about 20 places per leaf on average, divide by 20."],
      ["math",[["Places","given","100 M"],["Nodes if ~20 places per leaf","(10⁸ × 4/3) ÷ 20","≈ 6.5 M"],["Bytes per node","4 coords + 4 child pointers","≈ 80 B"],["Tree size","6.5 M × 80 B","≈ 520 MB"],["Points (lat, lng)","10⁸ × 32 B","3.2 GB"],["Total","","≈ 4 GB: fits in one machine's RAM"]],"Small enough to hold in memory and replicate for availability."],
      ["p","The 80 bytes per node come from the boundary (two corners, four coordinates at an assumed 16 bytes each, so 64 B) plus four child pointers at 4 B each. The tree size works out to 520 × 10⁶ bytes, about 520 MB."],
      ["chart",{"type":"donut","title":"RAM for a quadtree of 100M places","data":[["Tree nodes",0.52],["Coordinates",3.2]],"center":"≈ 4 GB","centerSub":"fits on one box","fmt":"num","unit":"GB"}],
      ["p","Around 4 GB, when production machines commonly have 64 GB. The whole index of the world’s restaurants fits comfortably on one server. You then run several copies of it on several servers, not because it’s too big, but for availability and to share the query load."]
    ] },
    { h: "Uber: now the points move", blocks: [
      ["p","The quadtree story ends with a teaser: what if the points move? Welcome to Uber. A rider in Bandra opens the app and wants the nearest <b>available</b> cab. The scope: intra-city rides only; a cab is either available or not, and only available cabs are matched."],
      ["p","<b>Shard by city.</b> There are about 10 million cabs worldwide, but a rider in Mumbai only cares about Mumbai’s. Cities are independent, so each city (or wider hub) gets its own shard and its own quadtree. Even the busiest Indian cities have around <b>50,000</b> cabs. A problem of 10 million moving points becomes many separate problems of a few thousand to a few hundred thousand."],
      ["p","<b>Use a density-based grid, not a uniform one.</b> Cab density changes with <i>place</i> (city centre vs suburbs) and with <i>time</i> (office hours vs 3 a.m.). In a dense area you don’t want to offer a cab 5 km away; in a sparse one that’s fine. So each city builds a quadtree from the cabs’ current positions."],
      ["p","<b>Track locations.</b> Each cab pings its location about every <b>60 seconds</b>, and the backend keeps a last-known-location map, <code>cab_id → (x, y)</code>, in something fast like <b>Redis</b>. Within one city you could even brute-force the distances, since it’s only thousands of cabs. The quadtree is what keeps it quick at the busiest times."]
    ] },
    { h: "Taming the location pings", blocks: [
      ["p","Here is the trap. If every ping moves the cab in the quadtree (remove it from its old leaf, insert it into the new one, maybe split or merge cells), the tree becomes a write-hotspot. Say 50,000 cabs ping once a minute: that’s roughly 830 tree updates a second for one city, and pings get more frequent during a trip. Most of those updates are pointless, because the cab is still in the same cell. Four fixes stack up:"],
      ["steps",[["Don’t ping when nothing changed","The driver app only sends an update if its location actually changed in the last minute. A parked cab stays quiet."],["Let the app know its own cell","The app is told the bounding box of its current leaf, corners (a, b) and (c, d). Each time it moves it checks <code>a ≤ x ≤ c && d ≤ y ≤ b</code>. Only when it <b>crosses into a new cell</b> does the backend update cab → grid, deleting it from the old leaf and inserting it into the new one."],["Use a range, not a single threshold","If cells split above 50 cabs and merge below 50, a cell hovering around 50 would split and merge over and over as cabs drift in and out. Use a <b>range</b> instead, for example 50–75: split only above the top, merge only below the bottom. Engineers call this <b>hysteresis</b>, the same trick your home thermostat uses so it doesn’t click on and off every second."],["Or rebalance on a schedule","Traffic patterns shift slowly, so another option is a job every ~3 hours (or longer) that splits and merges leaves in one go."]]],
      ["p","Then matching. When a rider requests a trip, the backend finds their leaf and the nearby ones, picks the closest available cabs, and offers the ride to the drivers <b>round-robin</b>: one at a time, each accepting or rejecting, until someone says yes."],
      ["tip","Uber's production system uses <b>H3</b> hexagons instead of quadtrees. Explore it in the <a href=\"#/case/uber\">Uber case study</a>."],
      ["p","Why hexagons? Every neighbour of a hexagon is the same distance from its centre, while a square’s diagonal neighbours are farther away than its side neighbours. That makes “cells within one step of me” a fairer approximation of “nearby”, which matters when you’re pricing rides and positioning drivers."]
    ] },
    { h: "Common mistakes", blocks: [
      ["list",["<b>Tiny chunks “for flexibility”.</b> Fifty million metadata entries for one file is a NameNode problem. Size chunks by benchmarking real workloads.","<b>Replicas in the same rack.</b> Three copies that share a power supply are one copy with extra steps.","<b>Range queries on lat and long.</b> The index can only narrow one dimension; you scan a band around the planet.","<b>Fixed-size grids.</b> Empty in the ocean, overflowing downtown. Size cells by point count.","<b>Updating the quadtree on every ping.</b> Most pings stay in the same cell. Let the client detect cell crossings.","<b>A single split/merge threshold.</b> Cells flap. Use a range."]]
    ] },
    { h: "Putting it together", blocks: [
      ["p","For huge files: split into 128 MB blocks (chosen by benchmarking), keep a NameNode that maps file → blocks → DataNodes, and store each block on three DataNodes across at least two racks; S3 offers the same idea behind a bucket/key API, with erasure coding inside."],
      ["p","For “nearest things”: skip brute force, range queries and fixed grids, and build a quadtree that splits cells holding more than about 100 points, giving O(log N) lookups in about 4 GB of RAM for 100 million places."],
      ["p","For moving cabs: shard by city, keep last-known locations in Redis, and only touch the tree when a cab crosses into a new cell, with split/merge hysteresis or periodic rebalancing."]
    ] },
    { h: "Interview corner", blocks: [
      ["p","These ideas power three common questions: “Design Dropbox / Google Drive / S3”, “Design Yelp / nearby restaurants” and “Design Uber”. They also show up as follow-ups in many others (“where do the videos go?”)."],
      ["p","<b>How to bring it up.</b> For storage: “Large files are split into fixed-size blocks, about 128 MB like HDFS, with a metadata service mapping blocks to storage nodes and three rack-aware replicas.” For location: “Normal indexes don’t handle 2D proximity, so I’d use a quadtree that splits when a cell exceeds about 100 points.”"],
      ["p","<b>Follow-ups you should expect:</b>"],
      ["list",["“Why not 1 MB chunks?” (5 × 10⁷ chunks for 50 TB: metadata and collation overhead.)","“What if the NameNode dies?” (It’s replicated; its metadata lives in RAM and is backed up.)","“Why not just index lat and long?” (A B-tree uses one range; the choice of k is unclear.)","“How do you find neighbours of a cell?” (Sibling pointers, or probe 8 points just outside the boundary.)","“Does the tree fit in memory?” (About 4 GB for 100 million places. Yes, and replicate it.)","“Cabs move. How do you avoid hammering the tree?” (Shard by city, client-side cell-crossing checks, hysteresis, periodic rebalancing.)"]],
      ["p","<b>A 30-second answer (Uber):</b> “Rides are intra-city, so I shard by city; even a big city has only around 50,000 cabs. Cabs ping every minute or so into a Redis map of last-known locations. For nearest-cab queries I keep a quadtree per city that splits dense cells, so lookups are O(log N). To avoid rewriting the tree on every ping, the driver app knows its cell’s bounding box and only reports when it crosses into a new cell, and cells split and merge with a range, like 50 to 75, so they don’t flap. Requests are offered to the nearest drivers round-robin until one accepts. In production Uber uses H3 hexagons for the same job.”"]
    ] }
  ],
  quiz: [
    {"q":"How does HDFS chunk a 200 MB file?","o":["2 × 100 MB","128 MB + 72 MB","200 × 1 MB","One 200 MB block"],"a":1,"why":"Blocks are 128 MB, and the last block simply holds whatever is left over."},
    {"q":"Why rack-aware replication?","o":["Faster writes","A rack-level failure (power, switch) would otherwise lose every copy","Cheaper disks","It’s required by S3"],"a":1,"why":"Machines in a rack share power and a switch. Spreading copies across racks means one rack going dark can’t take all of them."},
    {"q":"Why do quadtrees beat fixed grids?","o":["They’re simpler","Cells adapt to density: tiny in cities, huge over oceans","They use less CPU","They’re SQL-native"],"a":1,"why":"A cell splits when it holds too many points, so every leaf holds a manageable number, wherever it is."},
    {"q":"How do you avoid hammering Uber’s quadtree with location pings?","o":["Ignore pings","Update only when a cab crosses into a new cell (client-side check)","Use a bigger server","Ping every second"],"a":1,"why":"Most pings stay within the same cell, so the driver app checks its cell’s bounding box and only reports a crossing."},
    {"q":"Why is a 1 MB chunk size a bad idea for a 50 TB file?","o":["Disks can’t store 1 MB files","It creates 5 × 10⁷ chunks, each needing metadata and collation on read","1 MB chunks can’t be replicated","It makes the file bigger"],"a":1,"why":"50 TB ÷ 1 MB is fifty million pieces. The NameNode has to track every one, and every read has to stitch them back together."},
    {"q":"Why use a split/merge range (say 50–75) instead of one threshold for Uber’s cells?","o":["To save memory","So cells don’t split and merge over and over as cabs drift across the boundary","Because Redis requires it","To make cells hexagonal"],"a":1,"why":"With a single threshold, a cell hovering at the limit flaps. A range (hysteresis) only reshapes cells when the count clearly moves outside it."},
    {"q":"Roughly how much RAM does a quadtree of 100 million places need?","o":["About 40 MB","About 4 GB","About 4 TB","It can’t fit on one machine"],"a":1,"why":"About 520 MB of tree nodes plus 3.2 GB of coordinates: around 4 GB, which fits on one machine and is replicated for availability."}
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
