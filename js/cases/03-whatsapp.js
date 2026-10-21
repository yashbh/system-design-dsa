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
  minutes: 31,
  concepts: ["websockets","store-forward","acks","idempotency","e2ee","backoff"],
  stats: [
    {v: 2,suf: "B+",label: "users (WhatsApp, 2020)",kind: "Reported"},
    {v: 100,suf: "B",label: "messages a day (Meta, 2020)",kind: "Reported"},
    {v: 2,suf: "M",label: "connections held by one server (WhatsApp blog, 2012)",kind: "Reported"}
  ],
  story: "You're walking out of the office. You type “on my way 🚗” to your friend and hit send. One grey tick. A moment later, two grey ticks. Then, as you reach the car, they turn blue. Your friend is on another continent, on a cheap phone, on a train that went through a tunnel five minutes ago.<br><br>Those ticks are not decoration. They're a <b>delivery protocol</b> you can see. Each tick is a tiny acknowledgement travelling back across the world, saying “I've got it” from a different place: first the server, then your friend's phone, then your friend's eyes.<br><br>Behind them is a very hard set of promises. The message must arrive in about a second when you're both online. It must arrive eventually if your friend's phone is off for a week. It must never arrive twice, even though phone networks drop connections all the time and your phone will keep retrying. It must arrive in order. And the company running the servers must not be able to read it.<br><br>Now do that for more than 2 billion people and 100 billion messages a day, with a famously small engineering team. How?<br><br>We'll build it up one decision at a time, starting with the version that drains everyone's battery. (As with every case here, this is a simplified teaching model built from public talks, blog posts and the WhatsApp encryption overview, not WhatsApp's exact internal design.)",
  requirements: {
    functional: ["1:1 and group messaging","Sent / delivered / read receipts (the ticks)","Messages sent to an offline phone arrive when it comes back","Online and “last seen” presence","Photos, videos and voice notes","Typing indicators"],
    nonFunctional: ["Under a second from send to delivery when both people are online","Never lose a message, never show a duplicate","Messages in a chat appear in the right order","End-to-end encrypted: the server can't read content","Gentle on batteries and data plans, including on cheap phones and 2G networks","Keep working through server failures without users noticing much"]
  },
  estimate: [
    ["Messages per second","100B ÷ 86,400","≈ 1.16 M /s"],
    ["Phones connected at peak","assumption: 500M online at peak","500 M"],
    ["Chat servers needed","500M ÷ ~1–2M connections per server","≈ 250–500"],
    ["Temporary storage per day","100B × ~100 B","≈ 10 TB"],
    ["Receipts per second (2 per message)","1.16M × 2","≈ 2.3 M /s"]
  ],
  estimateNote: "Here's the surprising part. You might expect storage to be the monster, but it isn't. WhatsApp's servers are a relay, not an archive: a message is held only until the recipient's phone confirms it, then it's deleted. So the ~10 TB a day is mostly passing through, not piling up.<br><br>The real challenge is the connection count. Half a billion phones holding an open line to the servers at the same time, each one mostly idle, each one expecting a message to appear the instant it's sent. If each server can hold one to two million of those connections, you need a few hundred chat servers just to keep everyone on the line, plus a way for those servers to find each other when Alice on one wants to reach Bob on another.<br><br>And don't forget receipts. Every message produces “delivered” and usually “read” signals flowing back, so the system moves more tiny receipts than actual messages.",
  naive: {
    title: "\"Phones poll the server every 2 seconds\"",
    desc: "The simplest chat app works like checking your mailbox. Every two seconds, each phone asks the server <code>GET /messages?since=…</code>, meaning “anything new for me since last time?”. The server checks a table and answers. It's easy to build with normal web servers, and for a class project with ten users it works fine. Now let's put two billion phones on it.",
    breaks: ["<b>A billion requests a second, mostly for nothing.</b> 2B devices ÷ 2 seconds ≈ 1 billion requests a second. Most people get a few dozen messages a day, so almost every one of those requests comes back “nothing new”.","<b>Batteries and data plans die.</b> Each poll wakes up the phone's radio, which is one of the most power-hungry parts of a phone. Waking it every two seconds, all day, drains the battery and eats a prepaid data plan.","<b>Messages are still late.</b> On average a message waits a second before the next poll picks it up, up to two seconds. To make it faster you poll more often, which makes the first two problems worse.","<b>Offline phones aren't handled.</b> A phone that's off doesn't poll, so you still need somewhere to keep messages for it, and a way to tell it to wake up."]
  },
  steps: [
    {
      t: "Keep a connection open",
      c: "websockets",
      b: "Polling asks “anything new?” over and over. The fix is to flip it around: keep a line open and let the server speak first. Each phone holds <b>one long-lived connection</b> to a chat server. When a message arrives for you, the server <b>pushes</b> it down that connection immediately. No asking, no waiting for the next poll.<br><br>Web apps usually do this with <b>WebSockets</b>, a standard way to keep a two-way connection open between a browser and a server. WhatsApp's phones use their own compact protocol directly over TCP, which saves bytes on slow networks, but the idea is the same.<br><br>An idle open connection costs very little: a small heartbeat every so often to prove it's alive. WhatsApp's servers are written in <b>Erlang</b>, a language designed for telephone switches, which can run millions of lightweight processes at once, one per connection. In 2012 WhatsApp wrote publicly about a single server holding 2 million connections.<br><br>The cost? Servers are now <b>stateful</b>: each one is holding specific people's connections, so you can't just send any request to any server anymore. That leads straight to the next step.",
      a: "Staying on a phone call with someone instead of mailing them “anything new?” letters every two seconds."
    },
    {
      t: "Know where everyone is connected",
      c: "load-balancing",
      b: "Alice is connected to chat server 17. Bob is connected to server 342. Alice sends Bob a message. Server 17 has it, but Bob's open connection lives on server 342. How does 17 find out?<br><br>We keep a <b>session registry</b>: a fast lookup table from user to the server holding their connection, like <code>bob → server 342</code>. When Bob connects, server 342 writes that entry. When Bob's connection drops, the entry is removed, or it simply expires because the heartbeats stopped. Server 17 looks Bob up, forwards the message to 342, and 342 pushes it down Bob's connection.<br><br>Which server does a phone connect to in the first place? A load balancer spreads new connections across servers that have room. Once connected, the phone stays there until something breaks.<br><br>The cost: one extra lookup per message, and the registry has to be fast and always up. It's small (one short entry per online user), so it fits in memory and can be copied for safety.",
      a: "A hotel front desk that knows which room every guest is in, so a package for room 342 doesn't go door to door."
    },
    {
      t: "Store and forward when offline",
      c: "store-forward",
      b: "What if Bob's phone is off, or he's on that train in the tunnel? The registry says he has no live connection. We can't push to him, but we also can't drop the message.<br><br>So we <b>store and forward</b>. The message is written to Bob's <b>durable inbox</b>, a queue on disk keyed by recipient. When Bob's phone reconnects, it drains the inbox: the server sends each waiting message, Bob's phone acknowledges it, and only then does the server delete its copy.<br><br>That last part matters. WhatsApp's servers are a <b>relay, not an archive</b>. Once a message is delivered, the server doesn't keep it. Your chat history lives on your phone (and in a backup you control). This keeps server storage small and is also good for privacy.<br><br>The cost: syncing old history to a new device is harder, because the server doesn't have it. That's a real trade-off, and we'll come back to it.",
      a: "The post office holds your mail while you're on holiday and hands over the bundle when you're back. It doesn't keep photocopies."
    },
    {
      t: "Ticks are acknowledgements",
      c: "acks",
      b: "An <b>acknowledgement</b> (ACK) is a small message that says “I received message X”. Reliable systems are built from them, and WhatsApp shows you three.<br><br>✓ means the <b>server</b> received the message and stored it durably. Even if Alice's phone dies now, the message is safe. ✓✓ means Bob's <b>device</b> received it and sent back a delivery ACK. <span style=\"color:#53bdeb\">✓✓</span> means Bob <b>opened</b> the chat and his app sent a read receipt.<br><br>Each tick is itself a tiny message flowing back to Alice, through the same machinery: if Alice is offline when Bob reads her message, the read receipt waits in Alice's inbox until she reconnects. That's why the receipts-per-second number in the estimate is bigger than the messages-per-second number.<br><br>The rule underneath is simple. Nobody throws away a message until the next hop says “got it”. The phone keeps it until the server ACKs; the server keeps it until Bob's phone ACKs.",
      a: "Registered mail with three signatures: the depot signs when it arrives, the doorstep signs on delivery, and the recipient signs when they open it."
    },
    {
      t: "Exactly-once from at-least-once",
      c: "idempotency",
      b: "Phones lose connections all the time. Alice sends a message, the server stores it, and the ACK gets lost on the way back. Alice's phone doesn't know the send worked, so it does the only safe thing: it <b>retries</b>. This is <b>at-least-once delivery</b>: every message arrives one or more times.<br><br>Without care, Bob now sees “on my way” twice. The fix is to make sending <b>idempotent</b>, meaning that doing it twice has the same effect as doing it once. Alice's phone gives every message a <b>unique ID when it's composed</b>, and every retry reuses that same ID. The server and Bob's phone keep track of IDs they've already seen and silently drop repeats. A genuinely new “on my way” typed a second time gets a new ID, so it does go through.<br><br>How do you make an ID unique without asking a server? Combine things only this phone knows: a timestamp, the sender, the device and the recipient (adding the recipient keeps copies of a broadcast distinct). Retries also back off, waiting longer each time with a bit of randomness, so a flaky network isn't hammered.<br><br>At-least-once plus deduplication gives you what users actually care about: an <b>exactly-once effect</b>.",
      a: "Pressing the lift button five times still calls one lift. The lift knows the button is already lit."
    },
    {
      t: "Write to the recipient first",
      c: "store-forward",
      b: "Behind the scenes a message touches more than one place. In the classic design, each user has their own mailbox, and the mailboxes are split across many databases by user ID. Sending “Hi” means two writes: into Bob's mailbox (so he receives it) and into Alice's (so she sees it in her history). Those two mailboxes are on different machines, and either write can fail.<br><br>So which goes first? Think about what each failure looks like. If you write Alice's copy first and Bob's write then fails, Alice sees her message sitting in the chat, looking sent, but Bob never gets it. That's the worst possible outcome for a messenger: a silent non-delivery.<br><br>If you write <b>Bob's copy first</b>, then a failure on Alice's side only means Alice briefly doesn't see her own message on refresh. You put Alice's write on a retry queue and keep trying until it lands. The message has already been delivered, so the system is correct where it matters.<br><br>It's a small decision with a big lesson: when you can't make two writes happen together, order them so the failure in the gap is the one users can live with.",
      a: "When posting a parcel, get it into the courier's van before you write “sent” in your notebook. A missing notebook entry is annoying; a missing parcel is a disaster."
    },
    {
      t: "Encrypt end to end",
      c: "e2ee",
      b: "So far the server can read everything it relays. <b>End-to-end encryption</b> (E2EE) means only the sender's and recipient's devices hold the keys that unlock a message. The server routes and queues scrambled bytes, called <b>ciphertext</b>, that it cannot read, even if someone breaks into it.<br><br>WhatsApp finished rolling out the <b>Signal Protocol</b> across all its apps in 2016. Each device has its own key pair, and the protocol keeps changing the keys as a conversation goes on, so even if one key leaks, past and future messages stay protected.<br><br>Groups are trickier: encrypting a separate copy for every member would be slow. With <b>sender keys</b>, the sender shares a group key with each member once, then encrypts each message a single time; the server fans that one ciphertext out to everyone. Groups can now have up to 1,024 members.<br><br>The cost is real. The server can't search your messages, can't scan them for spam by content, and can't back them up for you in a readable form. Every one of those features has to be redesigned to work on the phone instead.",
      a: "A courier carrying a locked box. They know the address and can tell whether it arrived, but they have no key to look inside."
    },
    {
      t: "Wake sleeping phones with a nudge",
      c: "backoff",
      b: "Phones are aggressive about saving battery. When an app is in the background, the operating system may close its connection entirely. So when Bob's phone is asleep, how does it find out it has messages waiting?<br><br>The server sends a <b>push notification</b> through Apple's APNs or Google's FCM, the system services every phone keeps one connection open to. It's just a nudge: “you have something waiting”. Bob's app wakes up, reconnects to a chat server, and drains its inbox the normal way. The message itself never has to travel through Apple or Google, it's already waiting, encrypted, in Bob's inbox.<br><br>Reconnecting brings back the theme of <b>backoff</b>. If a connection fails, the app waits a little and tries again, then waits longer, then longer still, with a random wobble added. That randomness, called <b>jitter</b>, matters enormously when millions of phones are reconnecting at the same time, as you'll see in the failure stories below.",
      a: "A doorbell. It doesn't carry the parcel, it just tells you to come to the door and collect it."
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
      pro: "Messages arrive instantly and each one costs very few bytes",
      con: "Servers hold state, so you need a registry to route between them, and a data-centre blip causes a reconnect storm"
    },
    {
      choice: "Delete after delivery",
      pro: "Small server storage and better privacy: there's no archive to leak",
      con: "Syncing history to a new phone or a second device is much harder"
    },
    {
      choice: "End-to-end encryption",
      pro: "A server breach doesn't reveal what anyone said",
      con: "No server-side search, no content-based spam scanning, and backups must be encrypted on the phone"
    },
    {
      choice: "At-least-once delivery + dedupe",
      pro: "Messages are never lost, and users still see exactly one copy",
      con: "Every hop has to track message IDs it has seen, and senders must keep messages until ACKed"
    },
    {
      choice: "Recipient-first writes",
      pro: "The only failure in the gap is “the sender briefly doesn't see their own message”",
      con: "Needs a retry queue to repair the sender's copy, so history is briefly inconsistent"
    }
  ],
  takeaways: ["Push beats poll when updates matter and latency counts. Keep one connection open and let the server speak first.","Stateful connection servers need a registry so they can find each other.","Reliability is retries + unique IDs + acknowledgements. At-least-once plus dedupe looks like exactly-once.","Never throw a message away until the next hop says “got it”.","When two writes can't be atomic, order them so the failure in between is the harmless one.","End-to-end encryption moves features from the server to the phone: search, backups and spam detection all change.","Clients must back off with random jitter, or a small outage turns into a stampede."],
  quiz: [
    {
      q: "What does the second grey tick (✓✓) mean?",
      o: ["The server stored the message","The recipient's device received it","The recipient read it","The message was encrypted"],
      a: 1,
      why: "One tick is the server's ACK. Two grey ticks is the recipient device's delivery ACK. Blue is the read receipt."
    },
    {
      q: "A phone retries a send after a timeout, but the first attempt actually succeeded. What prevents a duplicate?",
      o: ["Encryption","A unique message ID that the server deduplicates","Bigger servers","Polling"],
      a: 1,
      why: "At-least-once delivery plus deduplication by message ID gives an exactly-once effect."
    },
    {
      q: "Why not have phones poll every 2 seconds?",
      o: ["Polling is illegal","Billions of mostly-empty requests, battery drain, and added delay","HTTP can't carry text","It's too fast"],
      a: 1,
      why: "About a billion requests a second, nearly all empty. A persistent connection lets the server push only when there's something to send."
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
      why: "The message already waits in the durable inbox; the push just wakes the app up."
    },
    {
      q: "How does the server deliver a photo it can't read?",
      o: ["It decrypts it","The phone uploads an encrypted blob and sends its address + key inside the E2E message","It forwards raw bytes in the chat stream","Photos aren't encrypted"],
      a: 1,
      why: "The server only ever stores ciphertext and pointers."
    },
    {
      q: "Alice's message must be written to Bob's mailbox and to her own. Which should go first?",
      o: ["Alice's, so she sees it immediately","Bob's, so the worst failure is Alice briefly not seeing her own message","Both at random","Neither; use a cron job"],
      a: 1,
      why: "Writing the recipient first means a failure in the gap never causes a silent non-delivery. Alice's copy is repaired from a retry queue."
    },
    {
      q: "A data centre blips and 10 million phones lose their connection at once. What stops them all reconnecting in the same second?",
      o: ["Bigger servers","Exponential backoff with random jitter","Polling","Encryption"],
      a: 1,
      why: "Jitter spreads reconnects over time, so servers see a manageable wave instead of a wall."
    },
    {
      q: "Why is server storage small even at 100 billion messages a day?",
      o: ["Messages are compressed to zero","Messages are deleted from servers once the recipient's device ACKs them","Only text is allowed","Messages are stored in the CDN"],
      a: 1,
      why: "The server is a relay, not an archive. It holds a message only until delivery is confirmed."
    }
  ],
  sources: ["WhatsApp blog: \"1 million is so 2011\" (2012)","WhatsApp: 2B users (Feb 2020); 100B messages/day (2020)","WhatsApp Encryption Overview (Signal Protocol)"],
  deep: [
    {
      h: "The connection layer",
      blocks: [
        ["img","Checking mobile messages.jpg","Most of a messenger's engineering goes into keeping this experience instant on unreliable mobile networks."],
        ["p","Each phone keeps one long-lived TCP connection to a chat server. The server-side work is mostly <b>holding connections</b>: millions of mostly idle sockets per machine, each with a heartbeat so dead connections are detected and cleaned up."],
        ["p","Why heartbeats? Because mobile networks often drop a connection without telling either side. Your phone goes into a lift, the cell tower forgets you, and the server still thinks the socket is open. A heartbeat, a tiny “still here” every few tens of seconds, lets both ends notice within a short window and clean up. Choosing the interval is a balance: shorter means faster detection but more battery use."],
        ["chart",{"type":"bar","title":"Requests per second needed to deliver messages","data":[["Polling every 2 s (2B devices)",1000000000],["Push over open connections (100B msgs/day)",1160000]],"log":true,"highlight":1,"note":"Polling sends a request whether or not there's a message. Push sends one only when there is."}],
        ["warn","<b>Reconnect storms.</b> If a data centre blips, millions of phones reconnect in the same second. Clients must back off with random jitter, and servers must accept connections faster than they authenticate them."]
      ]
    },
    {
      h: "Message lifecycle",
      blocks: [
        ["p","Every message moves through a few states, and each move is triggered by someone sending an acknowledgement. Here's the whole life of one message from Alice's point of view."],
        ["table",["State","Meaning","Who changes it","Alice sees"],[["Pending","Created on Alice's phone, not yet acknowledged","Alice's app","🕓"],["Sent","Server stored it durably","Server ACK","✓"],["Delivered","Bob's device received it","Bob's app ACK","✓✓"],["Read","Bob opened the chat","Bob's app receipt","blue ✓✓"]]],
        ["p","And here's roughly what travels over the wire. Notice that the server can see who it's from, who it's to and when, because it needs those to route, but the content is ciphertext."],
        ["code","envelope {\n  id:        \"3EB0C0…\"        // generated by the sender; dedupe key for retries\n  from:      \"+91 98…\", to: \"+1 415…\"\n  ts:        1792488000123\n  type:      text | image | receipt\n  ciphertext: <bytes>          // the server can't read this\n}"]
      ]
    },
    {
      h: "Offline delivery and push notifications",
      blocks: [
        ["p","Most of the time, someone in a chat isn't actively connected. Here's how a message reaches a phone that's asleep in someone's pocket."],
        ["steps",[["Bob is offline","The registry has no live connection for Bob, so the message goes into Bob's durable offline queue, keyed by recipient."],["Wake Bob's phone","The server sends a push notification through Apple's APNs or Google's FCM. It's a wake-up signal, not the message itself."],["Bob's app connects","It drains the queue in order and ACKs each message, and the server deletes what was acknowledged."],["Receipts flow back","Delivered/read receipts are themselves small messages, queued for Alice if she's offline."]]]
      ]
    },
    {
      h: "Where messages live: sharding the mailboxes",
      blocks: [
        ["p","Even a relay needs somewhere to keep undelivered messages, and a classic version of this design (the one often taught for Messenger-style apps, which keep full history) needs to store much more. Say, as a classroom example, 20 billion messages a day at up to 200 bytes each. That's 4 TB a day, about 1.5 PB a year. No single machine holds that, so the data has to be split, or <b>sharded</b>, across many. The big question is: split by what?"],
        ["table",["Shard by","Read my chat list","Read one chat","Send a message","Best for"],[["User ID (each user has a mailbox)","1 shard","1 shard","2 writes: recipient + sender","1:1 chats"],["Conversation ID (each chat lives together)","Needs a second index of “my chats”","1 shard","3 writes: chat + both users' chat lists","Big groups"]]],
        ["p","For 1:1 chat, sharding by user wins: 2 writes instead of 3, and everything a user looks at lives on their own shard. But try it for a 1,000-person work group: one message means writing into 1,000 mailboxes. That's why tools built around big channels, like Slack, tend to keep a channel's messages together and treat the “recent chats” ordering as best effort."],
        ["tip","Whichever you pick, the hot path should stay on one shard. Notice that both designs keep “read one chat” to a single shard. Designs that make the most common read touch many machines rarely survive scale."]
      ]
    },
    {
      h: "Ordering, groups and media",
      blocks: [
        ["p","Three topics interviewers love to poke at. Each one has a neat trick."],
        ["list",["<b>Ordering:</b> messages in one chat are delivered in the order the server received them, over a single connection. Phones display by server order with local timestamps as a tie-breaker, so clock skew between phones doesn't scramble a conversation.","<b>Groups (up to 1,024 members):</b> the sender encrypts once with a group \"sender key\". The server fans the ciphertext out to each member's queue and tracks per-member delivery.","<b>Media:</b> the phone encrypts the photo with a fresh key, uploads the encrypted blob to a media store, and sends a small message containing the blob's address and the decryption key. The server stores a blob it can't open."]],
        ["p","Why not order by the phones' clocks? Because phone clocks are wrong surprisingly often, by seconds or even hours. If Alice's clock is two minutes fast, her reply could appear above the question she was answering. Using the order in which the server received messages avoids that, because one server's view of “first” is consistent."]
      ]
    },
    {
      h: "Presence and last seen",
      blocks: [
        ["p","\"Online\" means a heartbeat arrived recently. Keep <code>presence:{user} = server_id</code> with a short TTL (say 30 s) refreshed by each heartbeat. When it expires, the user is offline and \"last seen\" becomes that moment. Presence changes are only pushed to people currently looking at that chat, never to everyone in a contact list."],
        ["p","That last rule saves a huge amount of traffic. Imagine you have 500 contacts and every time any of them opened or closed the app, your phone got a notification. With millions of people flipping between online and offline every second, presence updates would outnumber real messages. Sending presence only to people looking at that chat right now makes it a small cost instead of a flood."]
      ]
    },
    {
      h: "Failure stories",
      blocks: [
        ["p","Let's play out three bad days, with made-up but realistic numbers."],
        ["steps",[["A chat server dies","Server 342 crashes holding 1.5 million connections. Those phones notice within one heartbeat interval, wait a random short time, and reconnect to other servers. Their registry entries expire and are rewritten. Messages sent to them in the meantime simply went into their inboxes, so nothing is lost; they arrive a few seconds late."],["The ACK goes missing","Alice's phone sends, the server stores, the ACK is lost in a tunnel. Alice's phone retries with the same ID. The server recognises it, doesn't store a second copy, and just ACKs again. Alice sees one tick; Bob sees one message."],["A whole region blips","Ten million phones drop at once. Without jitter they'd all retry in the same second and knock the servers over again, over and over. With exponential backoff and jitter, the reconnects spread over a minute or two and the servers recover."]]],
        ["table",["Failure","Mitigation"],[["A chat server dies","Its phones reconnect (with jitter) to other servers; registry entries expire and are rewritten"],["Lost ACK","Sender retries with the same id; server and recipient dedupe"],["Recipient offline for weeks","Queue persists; very old undelivered messages expire under a retention policy"],["Push provider delay","The message is already queued; it's delivered whenever the app next connects"]]]
      ]
    },
    {
      h: "Numbers that matter",
      blocks: [
        ["table",["Number","Value","Why it matters"],[["Messages per day","100 billion","About 1.16 million a second on average"],["Connections per server","1–2 million","Sets the server count: a few hundred for 500M online"],["Polling cost","about 1 billion requests a second","Why push over an open connection wins"],["Temporary storage","about 10 TB a day","Small because messages are deleted after delivery"],["Group size","up to 1,024","Why groups use sender keys and server-side fan-out"],["Presence TTL (example)","about 30 s","How long before someone flips to “last seen”"]]]
      ]
    },
    {
      h: "Interview corner",
      blocks: [
        ["p","“Design WhatsApp” tests whether you can reason about unreliable networks, not just boxes. A good 45-minute answer usually goes like this."],
        ["steps",[["Requirements (5 min)","1:1, groups, ticks, offline delivery, E2EE. Ask about history: do servers keep it, or only relay?"],["Estimates (5 min)","1.16M messages a second, 500M connections, a few hundred chat servers. Say that connections, not storage, are the hard part."],["Connections (10 min)","Polling → persistent connections. Stateful servers → session registry."],["Reliability (10 min)","ACKs and ticks, client-generated IDs, retries with backoff, dedupe, recipient-first writes."],["Offline and push (5 min)","Durable inbox, push notification as a wake-up, drain on reconnect."],["Encryption and failures (10 min)","Signal Protocol, sender keys for groups, media as encrypted blobs. Then the failure stories."]]],
        ["p","Common follow-ups, with short answers:"],
        ["list",["Multi-device? → each device has its own keys; the sender encrypts per device, and the server queues per device.","Chat backups with E2EE? → encrypted client-side with a user-held key before upload.","Message search? → on-device only, since the server can't read content.","Typing indicators? → ephemeral events over the open connection, never stored.","How do you handle a message for a user with no connection for months? → keep it under a retention policy, then expire it; the sender never gets the second tick."]]
      ]
    }
  ]
});
