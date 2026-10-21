/* Blueprint course — lesson: Case study: messaging apps (Messenger, WhatsApp, Slack) */
BP.LESSONS.push({
  id: "messaging",
  mod: "cases",
  icon: "💬",
  minutes: 30,
  title: "Case study: messaging apps (Messenger, WhatsApp, Slack)",
  scaler: "HLD 11 · Case Study: Messaging Apps",
  summary: "Idempotent sends, the userId vs conversationId sharding decision, which shard to write first, and why the app servers themselves become the cache.",
  concepts: ["idempotency","sharding","write-policies","websockets"],
  related: ["whatsapp"],
  sections: [
    { h: "Requirements & scale", blocks: [
      ["list",["Send a message to a recipient, in real time.","Message history (paginated).","A list of most-recent conversations."]],
      ["math",[["Messages / day","given","20 B"],["Size","≤ 200 bytes","4 TB / day"],["Per year","4 TB × 365","≈ 1.5 PB"]],"Sharding is mandatory, and the system is both read- and write-heavy. Goals: <b>high consistency</b> (a message the sender thinks was sent must arrive) and low latency."],
      ["img","Cell Tower in Stykkishólmur.jpg","Messages travel over mobile networks like this one: connections drop, packets get lost, and clients retry, which is why sends must be idempotent."]
    ] },
    { h: "Idempotent writes", blocks: [
      ["p","Phones live on flaky networks. The client sends \"Hello\", the server stores it, the ACK is lost, and the client retries. A naive server now shows two \"Hello\"s. Fix: the <b>client generates a <code>messageId</code></b> when the message is composed (timestamp + senderId + deviceId + recipientId) and reuses it on every retry. The server dedupes on that id. Typing \"Hello\" twice on purpose creates two ids, so both go through."],
      ["code","sendMessage(sender, recipient, text, messageId)\ngetMessages(userId, conversationId, offset, limit)\ngetConversations(userId, offset, limit)"],
      ["sim","chat","The same idea in WhatsApp: lose an ACK and watch the duplicate get ignored."]
    ] },
    { h: "Sharding key: userId or conversationId?", blocks: [
      ["fig","msgshard","Compare write counts as the conversation grows. Then try both write orders with a failing second write."],
      ["table",["","Shard by userId (mailboxes)","Shard by conversationId"],[["getConversations","1 shard","Needs a secondary index (userId → conversations by last message)"],["getMessages","1 shard","1 shard"],["sendMessage (1:1)","2 writes (sender + recipient mailbox)","3 writes (conversation + both users' lists)"],["sendMessage (1,000-member group)","1,000 writes 😱","1 write + best-effort list updates"],["Used by","1:1-centric messengers","Slack, Teams, Discord, Telegram groups"]]],
      ["code","-- conversationId sharding needs a secondary index for the inbox list\nconversations_by_user(user_id, last_message_at DESC, conversation_id, snippet)\n\n-- sendMessage then costs 3 writes:\n1) messages(conversation_id, message_id, sender, text, ts)      -- conversation shard\n2) upsert conversations_by_user(sender, ...)                     -- sender's list\n3) upsert conversations_by_user(recipient, ...)                  -- recipient's list"],
      ["chart",{"type":"line","title":"Database writes per message","x":{"label":"people in the conversation","values":[2,5,10,50,100,500,1000]},"y":{"label":"writes","log":true},"series":[{"name":"userId","values":[2,5,10,50,100,500,1000]},{"name":"conversationId","values":[1,1,1,1,1,1,1]}],"note":"Group chat is what pushes Slack-like apps to shard by conversation."}]
    ] },
    { h: "Consistency across two shards: write the recipient first", blocks: [
      ["p","With userId sharding a send is two writes on two machines. If one fails, which outcome do you prefer?"],
      ["table",["Order","If the 2nd write fails","Verdict"],[["Sender first","Alice sees \"Hi\" in her chat; Bob never got it","❌ The worst failure: silent non-delivery"],["Recipient first","Bob has it; Alice briefly doesn't see her own message. Retry the sender write from a queue until it succeeds","✅ Self-healing and acceptable"]]]
    ] },
    { h: "Caching: the app servers are the cache", blocks: [
      ["p","Writes can't be sampled or batched here, because every message must persist. So absorb the <b>reads</b> with a cache that is (1) consistent (write-through), (2) huge (so sharded), and (3) race-free under concurrent writes for the same user."],
      ["p","Solution: assign users to app servers by <b>consistent hashing</b>. Each server caches its users' recent data in RAM, takes a <b>per-user lock</b> so writes are serialized, writes through to the DB, and evicts cold users with LRU."],
      ["table",["Pros","Cons"],[["Scales horizontally (more servers = more cache)","A dead server's users are unavailable for a few seconds"],["Consistency and races handled in one place","A restarted server has a cold cache"]]],
      ["p","With reads absorbed, the database is write-heavy and must be consistent: the notes pick <b>HBase</b> (wide-column, write-optimized). Facebook Messages famously chose HBase for this."],
      ["extra","The notes don't design real-time delivery. In practice clients keep a <b>WebSocket</b> / long-lived connection to a gateway, a session registry maps user → gateway, and offline users get a durable inbox plus push notifications. See the <a href=\"#/case/whatsapp\">WhatsApp case study</a>."]
    ] }
  ],
  quiz: [
    {"q":"How do you make sendMessage idempotent without merging two genuine \"Hello\"s?","o":["Dedupe by message text","A client-generated messageId reused only on retries","Server timestamps","Locks"],"a":1,"why":"Retries share an id; new messages get new ids."},
    {"q":"Which shard do you write first with userId sharding?","o":["Sender's","Recipient's","Either","Both in parallel without checking"],"a":1,"why":"The failure mode becomes \"sender briefly doesn't see it\" (and retry), not \"recipient never got it\"."},
    {"q":"Why do Slack-like apps shard by conversationId?","o":["It's alphabetical","One message to a huge group would otherwise mean one write per member","To support emojis","It's required by HBase"],"a":1,"why":"Group fan-out under userId sharding is prohibitively expensive."}
  ],
  refs: [
    ["ByteByteGo: Design a chat system","https://bytebytego.com/courses/system-design-interview/design-a-chat-system"],
    ["Meta: The underlying technology of Messages (HBase)","https://engineering.fb.com/2010/11/15/core-infra/the-underlying-technology-of-messages/"],
    ["Discord: How Discord stores trillions of messages","https://discord.com/blog/how-discord-stores-trillions-of-messages"]
  ]
});
