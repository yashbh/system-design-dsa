/* Blueprint case study — WhatsApp: Design Real-time Messaging. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "whatsapp",
  app: "WhatsApp",
  icon: "💬",
  color: "#25d366",
  color2: "#128c7e",
  title: "Design Real-time Messaging",
  tagline: "Deliver 100 billion messages a day instantly, in order, exactly once (as far as you can tell), and unreadable by the server.",
  level: "Intermediate",
  minutes: 29,
  concepts: ["websockets","store-forward","acks","idempotency","e2ee","backoff"],
  stats: [
    {v: 2,suf: "B+",label: "users (WhatsApp, 2020)",kind: "Reported"},
    {v: 100,suf: "B",label: "messages per day (Meta, 2020)",kind: "Reported"},
    {v: 2,suf: "M",label: "connections on one server (WhatsApp blog, 2012)",kind: "Reported"}
  ],
  story: "You type \"on my way 🚗\" and hit send. One grey tick. Two grey ticks. Two blue ticks. Your friend is on another continent and was offline five minutes ago.<br><br>Those three ticks are a <b>delivery protocol</b> you can see. Each one is an acknowledgement travelling back across the world, and together they explain how chat apps stay instant, reliable and private.",
  requirements: {
    functional: ["1:1 and group messaging","Sent / delivered / read receipts","Offline delivery on reconnect","Online / last-seen presence"],
    nonFunctional: ["Sub-second delivery when both users are online","Never lose a message; never show duplicates","End-to-end encrypted","Battery- and data-friendly on cheap phones"]
  },
  estimate: [
    ["Messages / sec","100B ÷ 86,400","≈ 1.16 M /s"],
    ["Concurrent connections","assumption: 500M online at peak","500 M"],
    ["Chat servers needed","500M ÷ ~1–2M per server","≈ 250–500"],
    ["Transient storage / day","100B × ~100 B","≈ 10 TB"]
  ],
  estimateNote: "Insight: the bottleneck isn't storage, because delivered messages are deleted from servers. It's holding hundreds of millions of open connections and routing between them.",
  naive: {
    title: "\"Phones poll the server every 2 seconds\"",
    desc: "Each app sends GET /messages?since=… on a timer.",
    breaks: ["2B users ÷ 2 s ≈ 1 billion requests per second, and almost all return \"nothing new\".","Constant radio wake-ups drain batteries and mobile data.","Messages arrive up to 2 seconds late, and shrinking the interval makes the cost worse."]
  },
  steps: [
    {
      t: "Keep a connection open",
      c: "websockets",
      b: "Each phone holds <b>one long-lived connection</b> to a chat server (WhatsApp uses a compact protocol over TCP; web apps use WebSockets). The server <b>pushes</b> messages the instant they arrive. Erlang, which WhatsApp is built on, is designed for millions of lightweight concurrent processes, one per connection.",
      a: "Staying on a phone call instead of mailing \"anything new?\" letters every two seconds."
    },
    {
      t: "Know where everyone is connected",
      c: "load-balancing",
      b: "Alice is connected to server 17, Bob to server 342. A <b>session registry</b> (user → server) lets server 17 forward Alice's message to server 342, which pushes it down Bob's connection. Entries are refreshed by heartbeats and removed when connections drop.",
      a: "A hotel front desk that knows which room every guest is in, so it can deliver a package."
    },
    {
      t: "Store and forward when offline",
      c: "store-forward",
      b: "If Bob is offline, the message is written to Bob's <b>durable inbox queue</b>. When Bob reconnects, his phone drains the inbox and acknowledges each message, and the server deletes them. The server is a relay, not an archive.",
      a: "The post office holds your mail while you're away and hands it over when you're back."
    },
    {
      t: "Ticks are acknowledgements",
      c: "acks",
      b: "✓ = the <b>server</b> received and durably stored it. ✓✓ = Bob's <b>device</b> received it and sent a delivery ACK. <span style=\"color:#53bdeb\">✓✓</span> = Bob <b>opened</b> the chat and his app sent a read receipt. Each tick is a tiny message flowing back to Alice.",
      a: "Registered mail with three signatures: the depot, the doorstep, and \"I opened it\"."
    },
    {
      t: "Exactly-once from at-least-once",
      c: "idempotency",
      b: "Networks drop packets, so Alice's phone <b>retries until it gets the server's ACK</b>, with backoff. Retries can create duplicates, so every message carries a <b>unique client-generated ID</b> and the server and recipient ignore IDs they've already seen. The user sees exactly one copy.",
      a: "Pressing an elevator button five times still calls one elevator."
    },
    {
      t: "Encrypt end to end",
      c: "e2ee",
      b: "With the <b>Signal Protocol</b> (rolled out across WhatsApp in 2016), only the devices hold keys. The server routes and queues ciphertext it can't read. Groups (now up to 1,024 members) use sender keys so a message is encrypted efficiently for many recipients, and the server fans it out.",
      a: "A courier carrying a locked box: they know the address, not the contents."
    }
  ],
  diagram: {
    nodes: [
      {
        id: "a",
        x: 90,
        y: 220,
        label: "Alice's phone",
        sub: "sender",
        kind: "client",
        icon: "📱",
        desc: "Encrypts the message, assigns a unique ID, and retries until the server ACKs."
      },
      {
        id: "s1",
        x: 300,
        y: 220,
        label: "Chat Server 17",
        sub: "Alice's connection",
        kind: "service",
        icon: "🔌",
        desc: "Holds Alice's persistent connection. Stores, ACKs, and routes."
      },
      {
        id: "reg",
        x: 500,
        y: 70,
        label: "Session Registry",
        sub: "user → server",
        kind: "cache",
        icon: "📇",
        desc: "Knows that Bob is currently on server 342 (or offline)."
      },
      {
        id: "inbox",
        x: 500,
        y: 370,
        label: "Offline Inbox",
        sub: "durable queue",
        kind: "queue",
        icon: "📦",
        desc: "Holds undelivered ciphertext until the recipient reconnects. Deleted after ACK."
      },
      {
        id: "s2",
        x: 700,
        y: 220,
        label: "Chat Server 342",
        sub: "Bob's connection",
        kind: "service",
        icon: "🔌",
        desc: "Pushes the message down Bob's open connection."
      },
      {
        id: "b",
        x: 910,
        y: 220,
        label: "Bob's phone",
        sub: "recipient",
        kind: "client",
        icon: "📱",
        desc: "Decrypts, sends a delivery ACK, and later a read receipt."
      }
    ],
    flows: [
      {
        name: "Both online",
        steps: [
          ["a","s1","MSG id=m42 (ciphertext)"],
          ["s1","a","ACK → ✓ (stored)"],
          ["s1","reg","Where is Bob? → server 342"],
          ["s1","s2","Forward m42"],
          ["s2","b","Push over Bob's open connection"],
          ["b","s2","DELIVERED m42"],
          ["s1","a","→ ✓✓ delivered"]
        ]
      },
      {
        name: "Bob offline",
        steps: [
          ["a","s1","MSG id=m43"],
          ["s1","a","ACK → ✓"],
          ["s1","reg","Where is Bob? → offline"],
          ["s1","inbox","Persist m43 in Bob's inbox"],
          ["b","s2","…later: Bob reconnects"],
          ["inbox","s2","Drain inbox"],
          ["s2","b","Deliver m43; Bob ACKs and the copy is deleted"]
        ]
      }
    ]
  },
  lab: {
    sim: "chat",
    title: "Delivery Protocol Lab",
    hint: "Send messages between Alice and Bob. Take Bob offline, make the network flaky, and watch store-and-forward, retries, and dedupe produce the ticks."
  },
  tradeoffs: [
    {
      choice: "Persistent connections",
      pro: "Instant push, low overhead per message",
      con: "Stateful servers; reconnect storms after outages"
    },
    {
      choice: "Delete after delivery",
      pro: "Small storage, better privacy",
      con: "History sync between devices is harder"
    },
    {
      choice: "E2E encryption",
      pro: "Server breaches don't reveal content",
      con: "No server-side search, spam scanning, or easy backups"
    }
  ],
  takeaways: ["Push beats poll when updates are frequent and latency matters.","Reliability = retries + unique IDs + acknowledgements.","Stateful connection servers need a registry to route between them."],
  quiz: [
    {
      q: "What does the second grey tick (✓✓) mean?",
      o: ["The server stored the message","The recipient's device received it","The recipient read it","The message was encrypted"],
      a: 1,
      why: "One tick = server ACK. Two = device delivery ACK. Blue = read receipt."
    },
    {
      q: "A phone retries a send after a timeout, but the first attempt actually succeeded. What prevents a duplicate?",
      o: ["Encryption","A unique message ID that the server deduplicates","Bigger servers","Polling"],
      a: 1,
      why: "At-least-once delivery + idempotent processing by ID = exactly-once effect."
    },
    {
      q: "Why not have phones poll every 2 seconds?",
      o: ["Polling is illegal","Billions of mostly-empty requests, battery drain, and added delay","HTTP can't carry text","It's too fast"],
      a: 1,
      why: "A persistent connection lets the server push only when there's something to send."
    },
    {
      q: "How does server 17 find which server holds Bob's connection?",
      o: ["Broadcasts to all servers","Looks him up in a session registry","Asks Bob by SMS","DNS"],
      a: 1,
      why: "A user → server map, kept fresh by heartbeats, gives direct routing."
    },
    {
      q: "What does a push notification (APNs/FCM) carry in this design?",
      o: ["The full decrypted message","A wake-up signal so the app connects and drains its queue","The encryption key","Nothing; it isn't used"],
      a: 1,
      why: "The message waits in the durable queue; the push just wakes the app."
    },
    {
      q: "How does the server deliver a photo it can't read?",
      o: ["It decrypts it","The phone uploads an encrypted blob and sends its address + key inside the E2E message","It forwards raw bytes in the chat stream","Photos aren't encrypted"],
      a: 1,
      why: "The server only stores ciphertext and pointers."
    }
  ],
  sources: ["WhatsApp blog: \"1 million is so 2011\" (2012)","WhatsApp: 2B users (Feb 2020); 100B messages/day (2020)","WhatsApp Encryption Overview (Signal Protocol)"],
  deep: [
    {
      h: "The connection layer",
      blocks: [
        ["img","Checking mobile messages.jpg","Most of a messenger's engineering goes into keeping this experience instant on unreliable mobile networks."],
        ["p","Each phone keeps one long-lived TCP connection to a chat server. The server-side work is mostly <b>holding connections</b>: millions of mostly idle sockets per machine, each with a heartbeat so dead connections are detected and cleaned up."],
        ["chart",{"type":"bar","title":"Requests per second needed to deliver messages","data":[["Polling every 2 s (2B devices)",1000000000],["Push over open connections (100B msgs/day)",1160000]],"log":true,"highlight":1,"note":"Polling sends a request whether or not there's a message. Push sends one only when there is."}],
        ["warn","<b>Reconnect storms.</b> If a data centre blips, millions of phones reconnect in the same second. Clients must back off with random jitter, and servers must accept connections faster than they authenticate them."]
      ]
    },
    {
      h: "Message lifecycle",
      blocks: [
        ["table",["State","Meaning","Who changes it","Alice sees"],[["Pending","Created on Alice's phone, not yet acknowledged","Alice's app","🕓"],["Sent","Server stored it durably","Server ACK","✓"],["Delivered","Bob's device received it","Bob's app ACK","✓✓"],["Read","Bob opened the chat","Bob's app receipt","blue ✓✓"]]],
        ["code","envelope {\n  id:        \"3EB0C0…\"        // generated by the sender; dedupe key for retries\n  from:      \"+91 98…\", to: \"+1 415…\"\n  ts:        1792488000123\n  type:      text | image | receipt\n  ciphertext: <bytes>          // the server can't read this\n}"]
      ]
    },
    {
      h: "Offline delivery and push notifications",
      blocks: [
        ["steps",[["Bob is offline","The registry has no live connection for Bob, so the message goes into Bob's durable offline queue, keyed by recipient."],["Wake Bob's phone","The server sends a push notification through Apple's APNs or Google's FCM. It's a wake-up signal, not the message itself."],["Bob's app connects","It drains the queue in order and ACKs each message, and the server deletes what was acknowledged."],["Receipts flow back","Delivered/read receipts are themselves small messages, queued for Alice if she's offline."]]]
      ]
    },
    {
      h: "Ordering, groups and media",
      blocks: [
        ["list",["<b>Ordering:</b> messages in one chat are delivered in the order the server received them, over a single connection. Phones display by server order with local timestamps as a tie-breaker, so clock skew between phones doesn't scramble a conversation.","<b>Groups (up to 1,024 members):</b> the sender encrypts once with a group \"sender key\". The server fans the ciphertext out to each member's queue and tracks per-member delivery.","<b>Media:</b> the phone encrypts the photo with a fresh key, uploads the encrypted blob to a media store, and sends a small message containing the blob's address and the decryption key. The server stores a blob it can't open."]]
      ]
    },
    {
      h: "Presence and last seen",
      blocks: [
        ["p","\"Online\" means a heartbeat arrived recently. Keep <code>presence:{user} = server_id</code> with a short TTL (say 30 s) refreshed by each heartbeat. When it expires, the user is offline and \"last seen\" becomes that moment. Presence changes are only pushed to people currently looking at that chat, never to everyone in a contact list."]
      ]
    },
    {
      h: "Failure modes",
      blocks: [
        ["table",["Failure","Mitigation"],[["A chat server dies","Its phones reconnect (with jitter) to other servers; registry entries expire and are rewritten"],["Lost ACK","Sender retries with the same id; server and recipient dedupe"],["Recipient offline for weeks","Queue persists; very old undelivered messages expire under a retention policy"],["Push provider delay","The message is already queued; it's delivered whenever the app next connects"]]]
      ]
    },
    {
      h: "Interview follow-ups",
      blocks: [
        ["list",["Multi-device? → each device has its own keys; the sender encrypts per device, and the server queues per device.","Chat backups with E2EE? → encrypted client-side with a user-held key before upload.","Message search? → on-device only, since the server can't read content.","Typing indicators? → ephemeral events over the open connection, never stored."]]
      ]
    }
  ]
});
