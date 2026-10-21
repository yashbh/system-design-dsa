/* Blueprint course — lesson: Database orchestration, shard creation & tunable consistency */
BP.LESSONS.push({
  id: "shard-ops",
  mod: "db",
  icon: "🎛️",
  minutes: 30,
  title: "Database orchestration, shard creation & tunable consistency",
  scaler: "HLD 8 · Database Orchestration & Shard Creation",
  summary: "Design the black box that adds shards, replaces dead machines and keeps replication levels, then see how multi-master stores like Cassandra make consistency a dial with R + W > N.",
  concepts: ["orchestrator","quorum","consistent-hashing","replication"],
  related: ["discord"],
  sections: [
    { h: "The manual-sharding black box", blocks: [
      ["p","Inputs: a sharding key and a replication level (say 3). Jobs: add shards and migrate data, keep load even, and when a machine dies, restore the replication level."],
      ["warn","Tempting idea: \"when a shard's load crosses a threshold, add a machine and move data to it.\" But traffic peaks daily, so the threshold trips <b>at peak</b>, and you'd start a heavy migration exactly when the system is most stressed."]
    ] },
    { h: "“SulochanaDB”: shards of master + slaves", blocks: [
      ["p","Three shards, each with 1 master + 2 slaves. Clients run the consistent-hashing code (4 hash functions per shard on a ring of [0, 10¹⁸]) to find a user's shard. New machines arrive. Where should they go: replace dead machines, form a new shard, or wait on standby?"],
      ["steps",[["Priority 1: restore replication","A shard below its replication level is one failure away from data loss or downtime."],["Priority 2: create new shards","Add capacity."],["Priority 3: standby","Spare machines ready for the next failure."],["A naive formula fails","\"Use N % M machines to replace dead ones, the rest form shards\". With N = 3 new, M = 3 per shard and one dead machine, N % M = 0, so nothing replaces it!"],["Fix","Always keep <b>X machines in standby</b> (X can grow with the number of shards). Use the rest for new shards."]]],
      ["p","The component running this logic is the <b>orchestrator</b> (HDFS calls its version the NameNode, HBase the HMaster). It watches heartbeats, which are almost free: a few bytes per second per machine."],
      ["tip","Don't let spares sit idle: attach them to shards as <b>extra replicas</b>. When a slave dies, a warm copy already exists. When creating a shard, promote warmed spares and let fresh machines refill the spare pool."]
    ] },
    { h: "Creating a shard without downtime", blocks: [
      ["flow",{"nodes":[{"id":"orc","x":120,"y":225,"label":"Orchestrator","sub":"runs the plan","kind":"service","icon":"🎛️","desc":"Decides ranges and phases."},{"id":"s1","x":420,"y":80,"label":"Shard S1","sub":"live","kind":"db","icon":"🗄️","desc":"Currently owns the range the new shard will take over."},{"id":"s2","x":420,"y":225,"label":"Shard S2","sub":"live","kind":"db","icon":"🗄️","desc":"Also gives up some ranges."},{"id":"s4","x":760,"y":225,"label":"New shard S4","sub":"staging → live","kind":"cache","icon":"🆕","desc":"Not on the ring until the real phase."},{"id":"c","x":420,"y":370,"label":"Clients","sub":"consistent hashing","kind":"client","icon":"👥","desc":"Don't know about S4 until it's added to the ring."}],"flows":[{"name":"Seamless shard creation","steps":[["orc","s4","10:00:00 · STAGING: simulate the ring with S4 to learn which hash ranges it will own"],["s1","s4","Copy those ranges from S1…"],["s2","s4","…and from S2, while S1 and S2 keep serving (Manmeet adds bookmarks at 10:01 that land on S1)"],["orc","c","10:15:00 · REAL PHASE: S4 goes live on the ring"],["s1","s4","Catch up the 10:00–10:15 delta (a few seconds)"],["orc","s1","10:15:15 · Done: S1 and S2 delete the ranges S4 now owns"]]}]},"Staging → real phase → cleanup. Downtime shrinks from 15 minutes to ~15 seconds (or zero, if you accept stale reads)."],
      ["p","Between 10:15:00 and 10:15:15, a read for Manmeet's new bookmark is either <b>stale</b> (highly-available mode returns what S4 has) or <b>briefly unavailable</b> (highly-consistent mode waits). That's CAP again, in miniature."]
    ] },
    { h: "Rules of thumb from the discussion", blocks: [
      ["list",["<b>One machine belongs to exactly one shard.</b> Sharing machines across shards breaks consistent hashing and doesn't scale.","<b>Heartbeats are nearly free:</b> a few bytes per second, one of 65,536 sockets. Skipping them saves under 0.1% and costs you failure detection.","<b>Rack-aware placement:</b> a shard's replicas go on different racks, so a rack's power or switch failure can't take out every copy.","<b>Data-centre-aware placement:</b> for disaster recovery, keep at least one replica in another data centre.","<b>How many spares?</b> Reserved = X × number of shards, where X comes from how many machines tend to fail at the same time, which depends on hardware quality and age. Estimate the probability of k simultaneous failures and size X for it."]],
      ["tip","A reboot doesn't lose acknowledged data: the node replays its write-ahead log (next lesson) to rebuild its in-memory state before rejoining."]
    ] },
    { h: "Multi-master: every node is a master", blocks: [
      ["p","Dynamo-style stores (Cassandra, DynamoDB) skip master/slave and reserves entirely. Machines join the ring, and with replication level 3 a key's copies live on the <b>next 3 distinct machines clockwise</b>. If M1 dies, requests naturally flow to M2, which already has a replica."],
      ["p","Consistency becomes a dial. For each request choose <b>W</b> (replicas that must ack a write) and <b>R</b> (replicas that must answer a read)."],
      ["fig","quorum","Move N, W and R. When R + W > N, every read overlaps the latest write."],
      ["p","<b>Shopping cart (Dynamo):</b> N = 5, R = 2, W = 2. Since 4 ≤ 5, a read can return two different versions: {Lux soap 10:00, Oil 10:15} and {Lux soap 10:00, Mask 10:20}. Dynamo merges them using timestamps → {Lux soap, Oil, Mask}. It's always available, and occasionally a deleted item reappears, which Amazon accepted for carts."],
      ["chart",{"type":"bar","title":"Dead replicas a write can survive (N = 5)","data":[["W = 1 (fast, weak)",4],["W = 3 (majority)",2],["W = 5 (all)",0]],"highlight":1,"note":"Pair W = 3 with R = 3 and every read overlaps the latest write (3 + 3 > 5)."}]
    ] }
  ],
  quiz: [
    {"q":"N = 3, R = 2, W = 2. Strongly consistent?","o":["Yes, R + W = 4 > 3","No","Only for writes","Only with a master"],"a":0,"why":"Read and write sets must overlap in at least one up-to-date replica."},
    {"q":"N = 5, R = 2, W = 2 (Dynamo cart)?","o":["Strong","Not strong: needs conflict resolution (merge)","Unavailable","Invalid configuration"],"a":1,"why":"4 ≤ 5, so reads may miss the latest write, and versions get merged."},
    {"q":"Why not add a shard when load crosses a threshold?","o":["Thresholds are hard to compute","It triggers at peak traffic, adding migration load when you can least afford it","Shards can't be added online","It breaks consistent hashing"],"a":1,"why":"Plan capacity ahead and migrate off-peak."},
    {"q":"With RF 3 on a ring, where do key U1's replicas live?","o":["Random machines","The next 3 distinct machines clockwise","All machines","The orchestrator"],"a":1,"why":"When M1 fails, traffic flows to M2, which already holds a copy."}
  ],
  refs: [
    ["Cassandra: Dynamo architecture & tunable consistency","https://cassandra.apache.org/doc/stable/cassandra/architecture/dynamo.html"],
    ["DynamoDB read consistency","https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html"],
    ["Amazon's Dynamo paper","https://www.allthingsdistributed.com/2007/10/amazons_dynamo.html"],
    ["Designing Data-Intensive Applications","https://dataintensive.net/"]
  ]
});
