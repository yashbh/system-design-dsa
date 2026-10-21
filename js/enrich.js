/* Blueprint — the hero illustration for every lesson.
 * Scene format: nodes [[part, x, y, label]], links [[from, to]] (see scenes.js). Canvas is 520 × 320.
 * (Lesson charts live inline in each js/course/*.js file.)
 */
(function () {
  const S = (nodes, links) => ({ nodes, links });
  BP.LESSON_SCENES = {
    "hld-101": S([["laptop", 70, 230, "your laptop"], ["globe", 200, 80, "DNS"], ["lb", 260, 220, "load balancer"], ["server", 410, 95, "web 1"], ["server", 430, 245, "web 2"]], [[0, 1], [0, 2], [2, 3], [2, 4]]),
    "lb-ch": S([["phone", 60, 165, "users"], ["lb", 185, 165, "LB"], ["server", 330, 60, ""], ["server", 395, 165, ""], ["server", 330, 270, ""], ["db", 475, 165, "shard"]], [[0, 1], [1, 2], [1, 3], [1, 4], [3, 5]]),
    "caching": S([["laptop", 65, 225, "browser"], ["globe", 175, 85, "CDN"], ["gear", 290, 225, "app"], ["cache", 390, 95, "Redis"], ["db", 465, 235, "DB"]], [[0, 1], [0, 2], [2, 3], [2, 4], [3, 4]]),
    "cache-scaler": S([["user", 60, 170, "coder"], ["server", 190, 85, "judge"], ["server", 190, 255, "judge"], ["file", 340, 80, "test files"], ["cache", 340, 240, "ranklist"], ["chart", 465, 160, "leaderboard"]], [[0, 1], [0, 2], [1, 3], [2, 4], [4, 5]]),
    "fb-feed": S([["phone", 60, 170, "you"], ["gear", 180, 170, "feed"], ["db", 320, 70, "user shard"], ["db", 320, 270, "user shard"], ["cache", 450, 170, "recent posts"]], [[0, 1], [1, 2], [1, 3], [1, 4]]),
    "cap": S([["user", 60, 85, "Rohit"], ["user", 60, 255, "Raj"], ["db", 230, 85, "node 1"], ["db", 230, 255, "node 2"], ["lock", 410, 170, "C or A?"]], [[0, 2], [1, 3], [2, 3], [2, 4], [3, 4]]),
    "sql-nosql": S([["gear", 75, 170, "app"], ["db", 225, 70, "SQL"], ["db", 225, 270, "NoSQL"], ["file", 375, 70, "documents"], ["hex", 375, 270, "shard"], ["hex", 470, 170, "shard"]], [[0, 1], [0, 2], [2, 3], [2, 4], [2, 5]]),
    "shard-ops": S([["gear", 70, 170, "orchestrator"], ["db", 215, 70, "S1"], ["db", 215, 270, "S2"], ["db", 345, 170, "S3"], ["db", 470, 75, "new S4"], ["server", 470, 265, "spare"]], [[0, 1], [0, 2], [0, 3], [3, 4], [0, 5]]),
    "lsm": S([["file", 70, 170, "WAL"], ["cache", 190, 170, "memtable"], ["file", 320, 65, "SSTable"], ["file", 320, 170, "SSTable"], ["file", 320, 275, "SSTable"], ["db", 460, 170, "compacted"]], [[0, 1], [1, 2], [1, 3], [1, 4], [2, 5], [3, 5], [4, 5]]),
    "typeahead": S([["laptop", 70, 200, "“mic…”"], ["gear", 205, 105, "suggest"], ["hex", 335, 60, "mic"], ["hex", 335, 185, "mich"], ["cache", 460, 115, "top 5"], ["chart", 460, 260, "trends"]], [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4], [1, 5]]),
    "messaging": S([["phone", 60, 170, "Alice"], ["server", 200, 80, "chat server"], ["queue", 265, 245, "inbox"], ["server", 355, 80, "chat server"], ["phone", 470, 170, "Bob"]], [[0, 1], [1, 3], [3, 4], [1, 2], [2, 4]]),
    "search": S([["file", 60, 80, "posts"], ["file", 60, 260, "resumes"], ["gear", 200, 170, "Lucene"], ["hex", 340, 80, "shard 0"], ["hex", 340, 260, "shard 1"], ["laptop", 465, 170, "search"]], [[0, 2], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5]]),
    "storage-geo": S([["file", 60, 170, "50 TB file"], ["gear", 190, 70, "NameNode"], ["db", 315, 95, "rack 1"], ["db", 315, 255, "rack 2"], ["pin", 450, 90, "cafe"], ["pin", 465, 235, "cab"]], [[0, 1], [0, 2], [0, 3], [2, 3], [1, 4], [1, 5]]),
    "video": S([["video", 70, 170, "live feed"], ["gear", 200, 75, "transcode"], ["globe", 330, 170, "CDN"], ["phone", 460, 70, "phone"], ["laptop", 460, 260, "TV / laptop"]], [[0, 1], [1, 2], [2, 3], [2, 4]]),
    "kafka-zk": S([["gear", 60, 90, "producer"], ["gear", 60, 250, "producer"], ["queue", 235, 185, "topic"], ["server", 395, 85, "consumer"], ["server", 410, 260, "consumer"], ["cloud", 235, 55, "ZooKeeper"]], [[0, 2], [1, 2], [2, 3], [2, 4], [5, 2]]),
    "ids-limits": S([["server", 70, 85, "worker"], ["server", 70, 255, "worker"], ["gear", 220, 170, "Snowflake"], ["lock", 370, 80, "limiter"], ["chart", 370, 255, "429s"], ["phone", 480, 170, "client"]], [[0, 2], [1, 2], [5, 3], [3, 4]]),
    "microservices": S([["phone", 55, 170, "client"], ["lb", 165, 170, "gateway"], ["hex", 295, 65, "users"], ["hex", 345, 170, "cart"], ["hex", 295, 275, "orders"], ["hex", 460, 105, "pay"], ["hex", 460, 240, "search"]], [[0, 1], [1, 2], [1, 3], [1, 4], [3, 5], [3, 6]]),
    "ms-patterns": S([["gear", 80, 170, "orchestrator"], ["hex", 215, 65, "order"], ["hex", 320, 170, "payment"], ["hex", 215, 275, "inventory"], ["queue", 460, 85, "events"], ["lock", 460, 255, "breaker"]], [[0, 1], [0, 2], [0, 3], [2, 4], [2, 5]])
  };

})();
