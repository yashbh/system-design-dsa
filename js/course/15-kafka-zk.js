/* Blueprint course — lesson: Coordination & messaging: ZooKeeper and Kafka */
BP.LESSONS.push({
  id: "kafka-zk",
  mod: "infra",
  icon: "📬",
  minutes: 35,
  title: "Coordination & messaging: ZooKeeper and Kafka",
  scaler: "HLD 12 · Messaging Queues: Apache Kafka & Zookeeper",
  summary: "How a cluster agrees on who the master is (ephemeral znodes, watches, quorums), and how persistent queues with topics, partitions and consumer groups decouple a system.",
  concepts: ["zookeeper","message-queue","kafka","quorum"],
  related: ["whatsapp","bitly"],
  sections: [
    { h: "Problem 1: everyone must know who the master is", blocks: [
      ["p","With master-slave replication, every write must go to the master, so every app server needs its address, and when it dies, everyone must quickly agree on a new one. A single \"who's the master?\" machine is itself a <b>single point of failure</b> and adds a <b>network hop</b> to every request. Enter <b>ZooKeeper</b>: a small, strongly consistent, file-system-like store for coordination data."]
    ] },
    { h: "Znodes, election and watches", blocks: [
      ["list",["Data lives at paths like <code>/clusterx/master_ip</code>. Each entry is a <b>znode</b> (a file, not a machine).","<b>Persistent znode:</b> stays until deleted, for config.","<b>Ephemeral znode:</b> lives only while its creator's session heartbeats. If the owner dies, it's deleted automatically. Only the owner can modify it."]],
      ["steps",[["Election","Every storage machine races to create the same ephemeral znode with its own IP. ZooKeeper serializes the writes, so exactly one wins."],["Watches","App servers read the znode once, cache the master's IP, and set a <b>watch</b>. There's no extra hop per request."],["Master dies","Its heartbeats stop → session expires → znode deleted → every watcher notified."],["Re-election","Slaves race again. App servers clear their cache; a write arriving in this gap fails."],["Old master returns","It reads the znode, sees a new master, and rejoins as a slave."]]],
      ["fig","zookeeper","Start an election, then kill the master and watch failover."]
    ] },
    { h: "ZooKeeper's own reliability: majority quorum", blocks: [
      ["p","ZooKeeper runs as an odd-sized ensemble with an elected leader. Every write goes to the leader, which broadcasts it; it commits only if a <b>majority</b> acknowledge (3 of 5, 4 of 7), counted against the <i>total</i> cluster size."],
      ["warn","<b>Why a majority?</b> Partition 5 nodes into {z1,z2} and {z3,z4,z5}. If half were enough, one write could land on z1–z2 and a conflicting one on z4–z5, giving <b>split brain</b>. Any two majorities must overlap in at least one node, so only one side can win."],
      ["tip","Odd sizes are cheaper: 4 nodes need 3 acks and tolerate only 1 failure, the same as 3 nodes."],
      ["chart",{"type":"bar","title":"ZooKeeper nodes that can fail","data":[["3 nodes",1],["4 nodes",1],["5 nodes",2],["7 nodes",3]],"highlight":2,"note":"An even fourth node adds cost but no fault tolerance."}]
    ] },
    { h: "Problem 2: don't make users wait for side effects", blocks: [
      ["p","Abhi messages Raj. We should also notify Raj, email him if he's been away for 24 h, and update analytics. Abhi shouldn't wait for any of that, and an email failure doesn't mean the message failed. Publish a \"message sent\" event to a <b>persistent queue</b> (durable on disk) and let each consumer process it at its own pace. That's <b>pub-sub</b>."],
      ["p","Different events interest different consumers (Flipkart's invoice service doesn't care about vendor chat messages), so events go into named <b>topics</b>."]
    ] },
    { h: "Kafka, from first principles", blocks: [
      ["table",["Question","Kafka's answer"],[["A topic is too big for one machine","Split it into <b>partitions</b> spread across brokers"],["Is it still ordered?","Only <b>within a partition</b>. Messages with the same <b>key</b> go to the same partition: <code>hash(key) % partitions</code>"],["One consumer is too slow","A <b>consumer group</b>: each partition is assigned to exactly one consumer in the group"],["A broker dies","Each partition is <b>replicated</b> (leader + followers) on different brokers"],["Which broker do I talk to?","Any. It knows where each partition's leader lives"],["How do I get only new events?","Each group tracks an <b>offset</b> per partition and commits it after processing"],["Kept forever?","No: until the <b>retention period</b> ends (or compacted per key)"]]],
      ["fig","kafka","Produce with keys, change the number of consumers, then add a second consumer group."],
      ["warn","More consumers than partitions? The extras sit <b>idle</b>. Changing the partition count changes <code>hash % N</code>, which breaks per-key ordering for in-flight keys."],
      ["extra","<b>Kafka vs RabbitMQ.</b> RabbitMQ is a broker with exchanges routing into queues: messages are pushed to consumers and deleted on ack, with rich routing, priorities and dead-letter queues, which suits task queues. Kafka is a replicated append-only <b>log</b>: consumers pull and track their own offsets, many groups can re-read the same data, and you can replay. That suits event streaming and analytics."],
      ["chart",{"type":"line","title":"Consumer-group throughput, 6 partitions","x":{"label":"consumers in the group","values":[1,2,3,4,5,6,7,8,9,10]},"y":{"label":"messages / s"},"series":[{"name":"throughput","values":[1000,2000,3000,4000,5000,6000,6000,6000,6000,6000]}],"band":[5,9,"extra consumers sit idle"]}]
    ] },
    { h: "From the Kafka reading: topics, offsets and the Scaler use case", blocks: [
      ["p","<b>The motivating story.</b> Thousands of Scaler learners are active at once: asking questions in live classes, reacting, solving problems, checking the leaderboard, ordering swag. Every action should be recorded for ML, search and reports, along with device and location. That must not slow the app, and it must still work at 10× today's load. So the app publishes events to Kafka and moves on, and consumers process them at their own pace."],
      ["table",["Topic type","Retention","Use"],[["Regular","Deleted after a time or size limit","Event streams: clicks, orders, logs"],["Compacted","Keeps the <b>latest message per key</b> indefinitely","Current state: a user's latest profile, config"]]],
      ["steps",[["Consumers track an offset per partition","\"I've processed up to message 1,204 in partition 2.\""],["Process first, then acknowledge","The offset advances only when you commit it. If the consumer crashes before committing, the message is delivered again."],["So consumers must be idempotent","At-least-once delivery means duplicates are possible. Dedupe by message id, as in the messaging lesson."]]],
      ["p","Kafka is fast (latency as low as ~2 ms per the reading) because brokers append to disk sequentially and serve reads straight from the OS page cache. It's fault tolerant because every partition is replicated to several brokers <i>within</i> the cluster. (The reading mislabels this \"intra-cluster replication\" as copying to another cluster; cross-cluster copying is a separate tool, MirrorMaker.)"]
    ] }
  ],
  quiz: [
    {"q":"How many acks does a 5-node ZooKeeper write need (one node is down)?","o":["2","3","4","5"],"a":1,"why":"Majority of the total size (5) = 3, regardless of how many are alive."},
    {"q":"Topic with 6 partitions, consumer group of 10. What happens?","o":["Messages are duplicated","4 consumers sit idle","Kafka adds partitions","Error"],"a":1,"why":"Each partition is consumed by exactly one member of a group."},
    {"q":"How do you keep each user's messages in order?","o":["One partition for everything","Use userId as the message key","Sort on the consumer","Use RabbitMQ"],"a":1,"why":"Same key → same partition → ordered."},
    {"q":"Why do app servers set a watch instead of asking ZooKeeper on every request?","o":["Watches are cheaper to store","To avoid an extra hop per request and get notified only when the master changes","ZooKeeper forbids reads","For encryption"],"a":1,"why":"Cache + notify beats polling."}
  ],
  refs: [
    ["ZooKeeper overview","https://zookeeper.apache.org/doc/current/zookeeperOver.html"],
    ["ZooKeeper recipes (leader election, locks)","https://zookeeper.apache.org/doc/current/recipes.html"],
    ["Apache Kafka introduction","https://kafka.apache.org/intro"],
    ["ByteByteGo: Why is Kafka fast?","https://bytebytego.com/guides/why-is-kafka-fast/"],
    ["Confluent: choosing partition counts","https://www.confluent.io/blog/how-choose-number-topics-partitions-kafka-cluster/"],
    ["RabbitMQ: AMQP concepts","https://www.rabbitmq.com/tutorials/amqp-concepts"]
  ]
});
