/* Blueprint course — lesson: CAP, PACELC & master-slave replication */
BP.LESSONS.push({
  id: "cap",
  mod: "db",
  icon: "⚖️",
  minutes: 35,
  title: "CAP, PACELC & master-slave replication",
  scaler: "HLD 6 · CAP / PACELC theorem + Master Slave Replication",
  summary: "Why a distributed system must choose between consistency and availability during a partition, the latency trade-off the rest of the time, and how leader-follower replication actually works.",
  concepts: ["cap","pacelc","replication","consistency-models"],
  related: ["whatsapp","ticketmaster"],
  sections: [
    { h: "CAP, told as a story", blocks: [
      ["p","<b>Rohit</b> starts a reminder service. Call <b>123456</b>, tell him a reminder, call back later to hear it. He writes everything in a diary. Business booms, so he hires <b>Raj</b>, who keeps his own diary."],
      ["steps",[["Problem 1: inconsistency","X asks Raj to note his flight. Later X's call lands with Rohit: \"you have no flight.\" X misses the plane. Two copies of the data disagree."],["Fix 1","On every write, <i>both</i> Rohit and Raj write it down before saying \"done\"."],["Problem 2: availability","Raj is absent one day. Under fix 1, no write can ever succeed."],["Fix 2","Accept writes anyway. When Raj returns, he catches up on everything he missed <i>before</i> taking calls."],["Problem 3: partition","Rohit and Raj have a fight and stop talking. X calls Raj with a new reminder. Raj can either write it (and risk Rohit giving X a wrong answer) or refuse (and be unavailable)."]]],
      ["p","That's the <b>CAP theorem</b>. With data on more than one machine, when the network between them breaks (<b>P</b>artition), you must choose <b>C</b>onsistency (every read sees the latest write, or you return an error) or <b>A</b>vailability (every request gets an answer, possibly stale). Partitions are a fact of life in distributed systems, so \"CA\" only exists on a single machine."],
      ["fig","cap","Cut the network, then write and read in CP mode and AP mode. Heal the partition to watch reconciliation."],
      ["img","Optical fiber cable-06ASD.jpg","A fibre-optic cable. A network partition is often literally a cut, unplugged or overloaded link like this between two machines or data centres."]
    ] },
    { h: "Choosing C or A", blocks: [
      ["table",["System","Priority","Why"],[["Banking balance","Consistency","Wrong balances are unacceptable (though ATM networks really use eventual consistency with reconciliation)"],["Facebook news feed","Availability","A slightly stale feed is fine; an error page isn't"],["Quora","Availability","Same: show something"],["Messenger","Consistency","A message the sender thinks was delivered but wasn't hurts relationships"],["Ticket / seat booking","Consistency","Never sell a seat twice"]]],
      ["extra","Martin Kleppmann argues that labelling whole databases \"CP\" or \"AP\" is too crude: real systems choose per operation and per configuration. Google Spanner is technically CP, but its private network makes partitions so rare that it feels CA in practice."]
    ] },
    { h: "PACELC: the trade-off even when nothing is broken", blocks: [
      ["p","CAP only describes partitions. <b>PACELC</b> adds the normal case: <b>if P</b>artition → choose <b>A</b> or <b>C</b>; <b>E</b>lse → choose <b>L</b>atency or <b>C</b>onsistency. Keeping replicas perfectly in sync means waiting for them to acknowledge every write, which is slower. Replying before they confirm is faster, but leaves a window of staleness."],
      ["p","In the CAP figure above, switch the PACELC toggle between <i>sync</i> and <i>async</i> replication and compare write latency."]
    ] },
    { h: "Master-slave (leader-follower) replication", blocks: [
      ["p","One machine is the <b>master</b>: all writes go there. The others are <b>slaves</b> (replicas): they apply the master's changes <i>in the same order</i> and serve reads. If the master dies, a slave is elected as the new master."],
      ["table",["Variant (from the notes)","When the client hears “success”","Example"],[["Highly available, not eventually consistent","Master wrote it; slaves synced best-effort","Splunk-style logs: losing a few lines is OK"],["Highly available + eventually consistent","Master + at least one slave wrote it","Posts for a news feed: may be delayed, must not be lost"],["Highly consistent","Master + all slaves wrote it","Banking"]]],
      ["fig","replication","Write under async, semi-sync and sync replication. Read from a lagging slave. Then kill the master."],
      ["warn","<b>Drawbacks.</b> A single master is a write bottleneck. In fully synchronous mode every extra slave adds latency and another thing that can block writes. With 1,000 slaves the scheme collapses: shard instead."],
      ["tip","A common middle ground is to make <b>one</b> slave synchronous and the rest async (MySQL calls this semi-synchronous). That guarantees two up-to-date copies without letting any slow replica stall every write."],
      ["chart",{"type":"bar","title":"Write latency by replication mode","sub":"example: replicas take 2–20 ms to confirm","data":[["Async: ack from master only",2],["Semi-sync: master + 1 replica",6],["Sync: master + all 3 replicas",22]],"fmt":"ms","note":"The slowest replica sets the speed of synchronous writes. That's PACELC's latency/consistency trade."}]
    ] },
    { h: "When the master dies", blocks: [
      ["steps",[["Detect","Replicas (or an orchestrator, or ZooKeeper) notice the master's heartbeats have stopped."],["Elect","The most up-to-date replica is promoted. With async replication it may be missing the last few acknowledged writes, which is the data-loss window."],["Redirect","Clients and the other replicas learn the new master's address (DNS change, a virtual IP, or a ZooKeeper watch)."],["Rejoin","If the old master comes back, it must rejoin as a slave and discard any writes the new master never saw."]]],
      ["warn","<b>Split brain:</b> if the old master was only partitioned, not dead, two masters may accept writes at once. Coordination systems that use majority quorums (next lessons) exist to prevent this."]
    ] },
    { h: "How MySQL replicates (the TunTun Ladoo story)", blocks: [
      ["p","<b>TunTun Ladoo</b>, an online sweet shop, went down for ~1 hour during last year's Diwali sale. The postmortem found expensive <i>read-only</i> joins (stock, pricing, live analytics) overloading the single MySQL box. The plan: replicate to read replicas, keep a standby for failover, and stream changes to an analytics warehouse."],
      ["flow",{"nodes":[{"id":"app","x":90,"y":225,"label":"App","sub":"writes","kind":"client","icon":"⚙️","desc":"All writes go to the master."},{"id":"m","x":320,"y":225,"label":"Master","sub":"commits txn","kind":"service","icon":"👑","desc":"Before committing, writes every change to its binary log, in order."},{"id":"bin","x":320,"y":70,"label":"Binlog","sub":"1.000003 @ pos 851","kind":"queue","icon":"📜","desc":"Ordered stream of changes. Replicas track a file + position (or a GTID)."},{"id":"io","x":580,"y":70,"label":"Replica IO thread","sub":"TCP to master","kind":"service","icon":"🧵","desc":"Pulls binlog events and writes them to the local relay log."},{"id":"relay","x":820,"y":70,"label":"Relay log","sub":"on replica","kind":"queue","icon":"📼","desc":"Local copy of events waiting to be applied."},{"id":"sql","x":820,"y":225,"label":"Replica SQL thread","sub":"replays in order","kind":"service","icon":"⚙️","desc":"Applies events one by one. Parallel master transactions become a single line here, a source of lag."},{"id":"r","x":580,"y":360,"label":"Read replica","sub":"serves reads","kind":"db","icon":"📖","desc":"Serves the expensive read-only queries."}],"flows":[{"name":"Replicate one write","steps":[["app","m","INSERT customer 'Joydeep'"],["m","bin","Append the change to the binlog, then commit"],["bin","io","Binlog dump streams the event"],["io","relay","Write it to the relay log"],["relay","sql","SQL thread picks it up"],["sql","r","Row appears on the replica, a moment later (async lag)"]]}]},"MySQL's asynchronous replication pipeline."],
      ["table",["Format","Logs","Good","Bad"],[["Statement-based","the SQL text","Tiny binlog for big UPDATEs","NOW(), RAND(), UUID() give different results on replicas"],["Row-based","actual row changes","Always correct; tiny for INSERT … SELECT SUM()","Huge for UPDATE big_table SET x=0"],["MIXED","switches automatically","Best of both","More complex to reason about"]]],
      ["p","Adding a new replica later: take a consistent snapshot tied to an exact binlog position, restore it on the new machine, then ask the master for everything after that position. The replica catches up."]
    ] },
    { h: "Hands-on: MySQL replication in Docker", blocks: [
      ["p","The reading's lab, condensed. Two <code>mysql:8</code> containers, <code>masternode</code> and <code>slavenode</code>, with database <code>scalerdb</code>:"],
      ["code","# master.conf                      # slave.conf\n[mysqld]                           [mysqld]\nserver-id = 1                      server-id = 2\nlog_bin = 1                        log_bin = 1\nbinlog_format = ROW                binlog_do_db = scalerdb\nbinlog_do_db = scalerdb\n\n-- on the master\nCREATE USER 'replication_user'@'%' IDENTIFIED WITH mysql_native_password BY '…';\nGRANT REPLICATION SLAVE ON *.* TO 'replication_user'@'%';\nFLUSH PRIVILEGES;\nSHOW MASTER STATUS;          -- File: 1.000003   Position: 851\n\n-- on the slave\nCHANGE MASTER TO MASTER_HOST='172.17.0.2', MASTER_USER='replication_user',\n  MASTER_PASSWORD='…', MASTER_LOG_FILE='1.000003', MASTER_LOG_POS=851;\nSTART SLAVE;\nSHOW SLAVE STATUS\\G\n\n-- on the master\nCREATE TABLE customers (id INT AUTO_INCREMENT PRIMARY KEY, firstname TEXT, lastname TEXT,\n  address TEXT, city TEXT, unique_id VARCHAR(36));\nINSERT INTO customers (firstname, lastname, address, city, unique_id)\n  VALUES ('Joydeep','Mukherjee','Sakti Statesman, Bellandur','Bangalore', UUID());"],
      ["p","Run <code>SELECT * FROM customers</code> on the slave right away and you may get an empty set. A moment later the row appears. That's <b>replication lag</b>, and eventual consistency you can see. On AWS the same setup is a few clicks: an <b>RDS read replica</b> (async) or <b>Multi-AZ</b> (a synchronous standby with automatic failover)."],
      ["extra","<b>Read-your-writes:</b> after a user updates their profile, a read from a lagging replica may show the old version. Common fixes are to read from the master for a few seconds after a write, or to route that user's reads to the master."]
    ] }
  ],
  quiz: [
    {"q":"Rohit and Raj aren't talking. X calls Raj with a reminder. Which response makes the system AP?","o":["Raj refuses","Raj writes it and says success","Raj hangs up","Raj waits for Rohit"],"a":1,"why":"Available: always answer. The diaries diverge and reconcile later."},
    {"q":"There's no partition. Is there still a trade-off?","o":["No","Yes: latency vs consistency (PACELC)","Yes: cost vs security","Only for SQL"],"a":1,"why":"Waiting for replicas costs latency. Not waiting costs consistency."},
    {"q":"Async replication: a write is acknowledged and the master dies 5 ms later. Is the write safe?","o":["Yes, always","No, it may exist only on the dead master","Only on SSDs","Only with row-based logs"],"a":1,"why":"Async acks before replicas have the data. Failover can lose recent writes."},
    {"q":"Why make just one slave synchronous?","o":["MySQL limit","Guarantees two up-to-date copies without letting every slow replica block writes","It's faster than async","To save disk"],"a":1,"why":"Semi-sync balances durability and availability."}
  ],
  refs: [
    ["Kleppmann: Please stop calling databases CP or AP","https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html"],
    ["ByteByteGo: CAP, PACELC, ACID, BASE","https://blog.bytebytego.com/p/cap-pacelc-acid-base-essential-concepts"],
    ["ByteByteGo video: CAP theorem simplified","https://www.youtube.com/watch?v=BHqjEjzAicA"],
    ["MySQL: replication implementation","https://dev.mysql.com/doc/refman/8.0/en/replication-implementation.html"],
    ["MySQL: replication formats","https://dev.mysql.com/doc/refman/8.0/en/replication-formats.html"],
    ["AWS RDS Multi-AZ","https://aws.amazon.com/rds/features/multi-az/"]
  ]
});
