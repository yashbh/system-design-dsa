/* Blueprint case study — Google Docs: Design Real-time Collaborative Editing. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "gdocs",
  app: "Google Docs",
  icon: "📝",
  color: "#1a73e8",
  color2: "#34a853",
  title: "Design Real-time Collaborative Editing",
  tagline: "Several people typing in the same sentence at the same instant, and everyone still ends up looking at exactly the same document.",
  level: "Advanced",
  minutes: 29,
  concepts: ["ot-crdt","websockets","event-sourcing","consistent-hashing","wal","idempotency"],
  stats: [
    {v: 3,suf: "B+",label: "Google Workspace users (Google, 2021)",kind: "Reported"},
    {v: 100,label: "people who can view or edit one doc at the same time (Docs help)",kind: "Reported"},
    {v: 0,pre: "",suf: " lost",label: "keystrokes allowed",kind: "Requirement"}
  ],
  story: "It is 11:58 pm. The group project is due at midnight. Three of you have the same Google Doc open, and all three of you are fixing the same paragraph. Priya is rewriting the opening sentence. Sam is deleting a sentence that repeats itself. You are adding a citation at the end.<br><br>Nobody is waiting for anybody. You see Priya's purple cursor racing along the first line and Sam's green one chewing through the middle. Your citation appears exactly where you typed it. At 11:59 you all stop, and every screen shows the same text, letter for letter. Nobody's work has vanished.<br><br>That should feel a little bit magical, because the obvious way to build this is broken. If every laptop saved its own copy of the document and the last save won, two of you would lose your edits. If the app locked the paragraph so only one person could type, the other two would sit and watch the clock.<br><br>Google Docs does something cleverer. It never sends the whole document around. It sends tiny <b>operations</b> such as “insert ‘very ’ at position 4”. Each document has <b>one place that decides the order</b> of those operations. And when two operations were made at the same moment without knowing about each other, a technique called <b>operational transformation</b> adjusts one of them so that it still means what its author intended.<br><br>By the end of this page you will be able to explain operational transformation to a friend with a two-person example on a napkin, and you will know why the same document is kept as a log of every keystroke ever made. The architecture here is a simplified teaching model built from what Google and the research papers have said publicly, not a copy of Google's code.",
  requirements: {
    functional: ["Several people edit the same document at the same time","See each other's cursors and selections, in colour, as they move","Leave comments and suggestions attached to specific text","Keep a full revision history and restore any earlier version","Keep editing while offline, and sync when back online","Share with view, comment or edit permissions"],
    nonFunctional: ["Your own typing appears instantly, with no wait for the network","Other people's edits appear within a fraction of a second","Everyone ends up with exactly the same document (convergence)","No edit is ever lost, even if a server crashes","A document with years of history still opens quickly","Work on slow, flaky connections: messages may be delayed, repeated or arrive after a reconnect"]
  },
  estimate: [
    ["Documents open at the same time","assumption","10 M"],
    ["People actively typing","assumption","2 M"],
    ["Operations per second","2M typists × ~3 ops/s","≈ 6 M ops/s"],
    ["Bandwidth for operations","6M × ~100 B (op plus envelope)","≈ 600 MB/s"],
    ["Editors per document","Docs limit","≤ 100 at once"],
    ["Ops per document per second","say 5 people typing × ~3 ops/s (assumption)","≈ 15 ops/s"],
    ["Ops a busy document collects","say 20,000 a day for a year (assumption)","≈ 7 M ops"]
  ],
  estimateNote: "Two very different pictures hide in these numbers. Across the whole service, the load is large: millions of tiny operations a second. But a single document is small. Even a busy one has a handful of people typing, maybe 15 operations a second, and the 100-editor cap puts a hard ceiling on it.<br><br>That shape is good news. It means the problem <b>shards by document</b>. You do not need one giant machine that understands every document. You need many ordinary machines, each looking after a few thousand open documents, with every editor of one document talking to the same machine.<br><br>The last row is a warning. If a document is stored as a log of every operation, an old document can have millions of them. Replaying millions of ops every time someone opens it would be slow, so you will need snapshots too.",
  naive: {
    title: "“Send the whole document on every change; last write wins”",
    desc: "The first idea is to treat the document like any other file. Each person's browser keeps a full copy. When you change something, your browser uploads the whole document to the server, and the server keeps whichever version arrived most recently. Other people's browsers download the new copy every few seconds. It is the same model as two people emailing a Word file back and forth, just faster.",
    breaks: ["Two people typing at once lose work. Priya and Sam both start from the same version. Priya saves at 11:58:03 and Sam saves at 11:58:04. Sam's copy never had Priya's changes, so it overwrites them. Priya's new opening is gone, and nobody gets an error message.","Locking fixes that but ruins the experience. If you lock the paragraph while someone types, three people racing a deadline end up taking turns. With 100 editors on a planning doc, most of them would be waiting most of the time.","It wastes bandwidth. A 50-page document might be 500 KB. Uploading it on every keystroke, at 3 keystrokes a second, is 1.5 MB a second per typist to change a single letter.","It feels slow. Your own letter only “counts” once the server accepts your whole upload, and you see others' edits only on the next download."]
  },
  steps: [
    {
      t: "Send operations, not documents",
      c: "ot-crdt",
      b: "Start by changing what goes over the wire. Instead of sending the document, send a description of the change. Every edit becomes a tiny <b>operation</b> (op): “insert ‘very ’ at position 4” or “delete 6 characters starting at position 10”. Positions count characters from the start of the document, starting at 0.<br><br>Each op also carries the <b>revision number</b> it was made against. A revision is just a counter of how many ops the document has had. If you made your op while looking at revision 41, you say so. That small label turns out to be the key to everything later: it tells the server exactly which other ops you had and had not seen.<br><br>An op is a few dozen bytes instead of the whole document. More importantly, an op describes <i>intent</i>. “Insert a word here” can be merged with someone else's change. “Here is my whole copy” can only replace it.",
      a: "Sending your editor a note saying “change line 3 to …” instead of posting them a fresh printout of the whole book."
    },
    {
      t: "Apply your own edits first",
      c: "ot-crdt",
      b: "When you press a key, the letter appears on your screen <b>immediately</b>. Your browser applies the op to its own copy of the document first, then sends it to the server in the background. You never wait for a network round trip to see your own typing. This is sometimes called an <b>optimistic</b> update: assume it will be fine and fix things up if it is not.<br><br>The browser keeps a small queue of ops it has sent but the server has not yet confirmed. Most of the time the queue holds one or two ops and empties within a fraction of a second.<br><br>The cost of this choice is that, for a moment, your copy and everyone else's are different. You have your newest letter, and they do not. Later, you might receive someone else's op that was made without knowing about yours. That is the problem the rest of the design solves.",
      a: "Writing in your own notebook while a courier carries a copy of each new line to the office. You do not stop writing to wait for the courier."
    },
    {
      t: "Keep a live connection open",
      c: "websockets",
      b: "Edits need to flow both ways, many times a second. Opening a new HTTP request for each one, and asking the server “anything new?” on a timer, would add delay and waste a lot of requests.<br><br>So each open document keeps a <b>WebSocket</b>: a single long-lived connection between the browser and the server that either side can send messages on at any time. Your ops go up it. Other people's ops, cursor moves and “ack” (acknowledgement) messages come down it. When the connection drops on a train, the browser reconnects and catches up from the last revision it knew.<br><br>A WebSocket gateway layer holds these millions of connections and passes each message to the server responsible for that document.",
      a: "Keeping a phone line open with a colleague for the whole meeting, instead of hanging up and redialling for every sentence."
    },
    {
      t: "One server orders each document",
      c: "consistent-hashing",
      b: "If two people's ops arrive at two different servers, which one happened first? There is no good answer, and different answers on different machines are how copies drift apart. The fix is to make sure there is only one place that decides.<br><br>All editors of a document are routed to the <b>same session server</b>, chosen by <b>consistent hashing</b> on the document ID. Consistent hashing is a way of mapping keys to servers so that each key always lands on the same server, and adding or removing a server only moves a small share of the keys. That server stamps every incoming op with the next revision number. Revision 42, then 43, then 44. Now there is <b>one agreed order</b> per document, and every browser eventually applies ops in that order.<br><br>Is one server per document a bottleneck? Not here. A busy document might see 15 ops a second, and a single machine can handle thousands of documents like that. The risk is not load, it is that machine failing, which the deep dives below cover.",
      a: "One referee per match keeps the official scorebook. Fans can shout whatever they like, but the referee's book decides what happened and in what order."
    },
    {
      t: "Transform ops that crossed in the post",
      c: "ot-crdt",
      b: "Here is the heart of the design. Suppose the document says <code>Hello world</code>. You add “!” at the end, position 11. At the same moment Sam deletes “Hello ” (6 characters at position 0). Neither of you has seen the other's op yet. Both ops were made against the same revision.<br><br>Sam's op is fine to apply on your side: deleting the first 6 characters of <code>Hello world!</code> leaves <code>world!</code>. But your op arrives at Sam's side when his text is only <code>world</code>, 5 characters long. “Insert ‘!’ at position 11” now points past the end of the document. Applied blindly, it either crashes or puts the “!” in the wrong place.<br><br><b>Operational transformation</b> (OT) fixes this by rewriting the late op against the op it did not know about. Sam's delete removed 6 characters <i>before</i> your insert, so your insert should move 6 places left: position 11 becomes position 5. Sam applies “insert ‘!’ at 5” to <code>world</code> and gets <code>world!</code>. Both screens agree. The server and every browser follow the same small set of rules (shift a position, shrink a range), so every copy converges.",
      a: "“Meet me at the third house on the left” has to become “the second house” if someone demolished a house before it while your message was on its way."
    },
    {
      t: "Store the document as a log of ops, plus snapshots",
      c: "event-sourcing",
      b: "Where does the document actually live? Not as a file that is overwritten. It lives as an <b>append-only log</b> of every op in revision order: op 1, op 2, op 3 and so on. The document at any moment is simply what you get by applying the ops in order. This pattern is called <b>event sourcing</b>: store the events, derive the state.<br><br>The big bonus is that revision history comes free. “Show me this document as it was last Tuesday at 3 pm” means “replay the log up to the last op before then”. Nothing extra has to be saved to support it.<br><br>The cost is load time. A document edited for years can have millions of ops. So every so often (say, every 1,000 ops) the server writes a <b>snapshot</b>: the full document at that revision. Opening a document then means loading the latest snapshot and replaying only the ops after it, a few hundred instead of millions.",
      a: "A bank statement. It shows your balance at the start of the month (the snapshot) and then only this month's transactions, not every transaction since you opened the account."
    },
    {
      t: "Write the op down before saying yes",
      c: "wal",
      b: "The requirement says no edit is ever lost. So the server must not tell your browser “got it” until your op is safely stored. The order is: receive op, transform it, append it to the durable log, <b>then</b> send the ack and broadcast it to others.<br><br>This is the same idea as a database's <b>write-ahead log</b> (WAL): record what you are about to do in a durable, append-only file before doing anything that depends on it. If the session server crashes one millisecond after acking you, the op is already in the log, and the next server to pick up the document will find it.<br><br>If the server crashes before the ack, your browser never got its “yes”, still has the op in its pending queue, and will send it again after reconnecting.",
      a: "A shop that writes your order in the book before telling you it has been accepted, so even if the till crashes the order is still there in ink."
    },
    {
      t: "Make retries safe",
      c: "idempotency",
      b: "That resend creates a new problem. What if the server <i>did</i> store your op and the ack got lost on a bad Wi-Fi connection? Your browser sends the op again, and without care, the word you typed appears twice.<br><br>The fix is to give every op a unique ID made by the client, something like your session ID plus a counter. The server remembers which op IDs it has already applied for this document. If a duplicate arrives, it does not apply it again; it just re-sends the original ack. An operation that has the same effect no matter how many times it is delivered is called <b>idempotent</b>.<br><br>This costs a little memory on the server (recent op IDs per open document), and it makes the whole protocol safe on networks that drop and repeat messages, which is every real network.",
      a: "A cloakroom ticket. Hand the same ticket over twice and you still only get one coat back."
    },
    {
      t: "Show presence and cursors",
      c: "websockets",
      b: "The coloured cursors are what make Docs feel alive. Each browser sends its cursor position and selection over the same WebSocket, and the server broadcasts them to everyone else in the document. These are <b>ephemeral</b> events: they are not stored in the log, because nobody needs to know where your cursor was last Tuesday.<br><br>Cursors have the same problem as ops. If your cursor is at position 20 and someone inserts 5 characters before it, your cursor on their screen should now be at 25. So cursor positions are transformed with the same rules as ops, which keeps each cursor on the right word as text shifts around it.<br><br>Presence messages are also the cheapest thing to drop under load. If the server is busy, it can send cursor updates less often without anyone losing work.",
      a: "Seeing where everyone is standing in a shared room. If someone pushes a table in, everyone shuffles along, and you still see each person next to the same bookshelf."
    }
  ],
  diagram: {
    nodes: [
      {
        id: "a",
        x: 90,
        y: 110,
        label: "Alice's browser",
        sub: "local copy + pending ops",
        kind: "client",
        icon: "👩‍💻",
        desc: "Applies her edits instantly; transforms incoming ops."
      },
      {
        id: "b",
        x: 90,
        y: 340,
        label: "Bob's browser",
        sub: "local copy + pending ops",
        kind: "client",
        icon: "👨‍💻",
        desc: "Same: optimistic local edits."
      },
      {
        id: "gw",
        x: 300,
        y: 225,
        label: "WebSocket gateway",
        sub: "routes by doc id",
        kind: "edge",
        icon: "🔌",
        desc: "Keeps live connections; consistent hashing on doc id picks the session server."
      },
      {
        id: "ss",
        x: 530,
        y: 225,
        label: "Doc session server",
        sub: "orders & transforms",
        kind: "service",
        icon: "🧮",
        desc: "The single authority for this document's op order while it's open."
      },
      {
        id: "log",
        x: 780,
        y: 110,
        label: "Op log",
        sub: "append-only",
        kind: "queue",
        icon: "📜",
        desc: "Every op, durably. Revision history."
      },
      {
        id: "snap",
        x: 780,
        y: 340,
        label: "Snapshots",
        sub: "every N ops",
        kind: "db",
        icon: "🗄️",
        desc: "Fast loading: snapshot + replay recent ops."
      },
      {
        id: "acl",
        x: 530,
        y: 60,
        label: "Permissions",
        sub: "who can edit",
        kind: "db",
        icon: "🔐",
        desc: "Checked when a session opens."
      }
    ],
    flows: [
      {
        name: "Two people type at once",
        steps: [
          ["a","gw","op: insert \"Wow! \" @0 (rev 41)"],
          ["b","gw","op: delete 6 @10 (rev 41)"],
          ["gw","ss","Both reach the doc's session server"],
          ["ss","log","Alice's op becomes rev 42"],
          ["ss","log","Bob's op transformed (@10 → @15) becomes rev 43"],
          ["ss","a","Send Bob's transformed op to Alice"],
          ["ss","b","Ack Bob; send Alice's op (rev 42) for him to transform"]
        ]
      },
      {
        name: "Open a document",
        steps: [
          ["a","gw","Open doc 7f3…"],
          ["gw","ss","Route to (or start) its session server"],
          ["ss","acl","Check edit permission"],
          ["ss","snap","Load the latest snapshot"],
          ["ss","log","Replay ops after the snapshot"],
          ["ss","a","Document + current revision"]
        ]
      }
    ]
  },
  lab: {
    sim: "docs",
    title: "Collaborative Editing Lab",
    hint: "Alice and Bob edit offline at the same time. Sync with naive replay and watch the copies diverge, then switch to operational transformation."
  },
  tradeoffs: [
    {
      choice: "A central server orders ops (OT)",
      pro: "Simple to reason about, compact ops, one source of truth for each document",
      con: "Needs a live session server per open document, and that server must fail over cleanly"
    },
    {
      choice: "CRDTs instead",
      pro: "Works peer-to-peer and offline-first, with no central order needed",
      con: "More metadata per character, and rich-text features such as formatting ranges are harder to model"
    },
    {
      choice: "Op log plus snapshots",
      pro: "Full revision history for free, and fast loads",
      con: "Storage keeps growing; old ops need compaction or archiving policies"
    },
    {
      choice: "Apply local edits optimistically",
      pro: "Typing feels instant, even on a slow connection",
      con: "Copies differ for a moment, so every client must run the transformation logic correctly"
    },
    {
      choice: "Cap editors at 100 per document",
      pro: "Bounds the transformation work and the broadcast fan-out for any one document",
      con: "Very large audiences (a company-wide doc) need a view-only mode beyond the cap"
    }
  ],
  takeaways: ["Send intent (operations), not state.","Give each shared object one place that orders its changes.","Concurrent edits are a transformation problem, not a locking problem.","Transforming an op means shifting its position (or shrinking its range) to account for an op its author had not seen.","Apply your own edits instantly, and let the server's order sort out the rest.","Store the document as a log of ops for history, and add snapshots so it still opens fast.","Write the op down before acknowledging it, and give each op an ID so retries do not apply it twice."],
  quiz: [
    {
      q: "Why doesn't “last write wins” work for editing a document together?",
      o: ["It is too slow","Whoever saves second silently erases the other person's changes","Browsers forbid it","It needs SQL"],
      a: 1,
      why: "Concurrent work has to be merged, not overwritten."
    },
    {
      q: "Alice inserts 5 characters at the start while Bob deletes at position 10. What must happen to Bob's op on Alice's side?",
      o: ["Nothing","Shift it to position 15","Drop it","Lock the paragraph"],
      a: 1,
      why: "The text before position 10 grew by 5 characters, so the same characters are now at position 15."
    },
    {
      q: "Why route every editor of one document to the same server?",
      o: ["It is cheaper","So one place gives the document's ops a single agreed order","For backups","WebSockets require it"],
      a: 1,
      why: "A single sequence per document makes transformation and convergence manageable."
    },
    {
      q: "How does a document with years of history still open quickly?",
      o: ["It replays every op since it was created","It loads the latest snapshot and replays only the ops after it","It is cached forever","It doesn't"],
      a: 1,
      why: "Snapshots put a ceiling on how much replay work an open needs."
    },
    {
      q: "The document is “Hello world”. You insert “!” at position 11 while Sam deletes 6 characters at position 0. What does your op become on Sam's side?",
      o: ["Insert “!” at 11","Insert “!” at 5","Insert “!” at 17","It is dropped"],
      a: 1,
      why: "Sam's delete removed 6 characters before your insert, so your position moves 6 places left: 11 − 6 = 5."
    },
    {
      q: "Your browser sends an op, the server stores it, and the ack is lost. The browser sends the op again. How is the word stopped from appearing twice?",
      o: ["The server never stores ops","Each op carries a unique client-made ID, and the server ignores IDs it has already applied","The browser deletes the duplicate","It can't be stopped"],
      a: 1,
      why: "Op IDs make delivery idempotent: applying the same op twice has the same effect as applying it once."
    },
    {
      q: "Two people insert different letters at exactly the same position at the same moment. What must OT do?",
      o: ["Pick one and throw the other away","Use a fixed tie-break (such as server order or user ID) so every copy puts the two letters in the same order","Ask the users","Lock the document"],
      a: 1,
      why: "Both inserts are kept. The tie-break just needs to be the same on every copy so they all converge."
    }
  ],
  sources: ["Google Drive blog: What's different about the new Google Docs (operational transformation, 2010)","Google Docs help: sharing and the 100 simultaneous editors limit","Ellis & Gibbs (1989) / Jupiter (1995): foundations of operational transformation"],
  deep: [
    {
      h: "Operational transformation from scratch",
      blocks: [
        ["p","If you only remember one section from this page, make it this one. Operational transformation sounds intimidating, but the core idea fits on a napkin. You need two people, one short word and some patience."],
        ["p","The document is the word <code>cat</code>. Positions count from 0, so <code>c</code> is at 0, <code>a</code> at 1 and <code>t</code> at 2. Two people have it open: Asha and Ben. Both are at revision 1, both see <code>cat</code>."],
        ["steps",[["Asha types","She puts an <code>s</code> at the end. Her op is <b>insert “s” at 3</b>. Her screen now says <code>cats</code>."],["Ben types, at the same moment","He deletes the <code>c</code>. His op is <b>delete 1 at 0</b>. His screen now says <code>at</code>."],["The ops cross","Asha's op travels to Ben, and Ben's op travels to Asha. Neither knew about the other when they made it."],["Asha applies Ben's op as-is","Delete 1 at 0 on <code>cats</code> gives <code>ats</code>. That is what Ben intended: the <code>c</code> is gone, and Asha's <code>s</code> survives."],["Ben applies Asha's op as-is","Insert “s” at 3 on <code>at</code>. But <code>at</code> only has 2 letters, so position 3 does not exist. Depending on the code it crashes, or it clamps to the end and gives <code>ats</code> by luck. Change the example slightly and luck runs out."]]],
        ["p","Here is a version where luck runs out. Start again from <code>cat</code>. This time Asha inserts <code>h</code> at position 1 to make <code>chat</code>. Ben deletes the <code>t</code> at position 2 to make <code>ca</code>."],
        ["table",["","Asha's screen","Ben's screen"],[["Start","cat","cat"],["Own edit","insert “h” at 1 → chat","delete 1 at 2 → ca"],["Apply the other's op as-is","delete 1 at 2 on chat → cht","insert “h” at 1 on ca → cha"],["Result without OT","cht","cha (the copies disagree)"]]],
        ["p","Asha's screen deleted the wrong letter. Ben meant “delete the <code>t</code>”, but by the time his op reached Asha, her new <code>h</code> had pushed the <code>t</code> one place right, to position 3. Position 2 now held the <code>a</code>. Two people, one keystroke each, and the document is already broken in two different ways."],
        ["p","Transformation is the fix. Before applying an op that crossed in the post, you adjust it for the op you already applied. The rule here is simple: <b>if someone inserted text before your position, move right by that many characters</b>. Asha inserted 1 character at position 1, which is before Ben's position 2, so Ben's op becomes <b>delete 1 at 3</b>."],
        ["table",["","Asha's screen","Ben's screen"],[["Start","cat","cat"],["Own edit","insert “h” at 1 → chat","delete 1 at 2 → ca"],["Apply the other's op, transformed","delete 1 at <b>3</b> on chat → cha","insert “h” at 1 on ca → cha (1 is before 2, no change needed)"],["Result with OT","cha","cha (the copies agree)"]]],
        ["p","Both screens say <code>cha</code>. Asha's <code>h</code> is in, Ben's deletion of the <code>t</code> is in, and they agree. That is the whole idea: an op is a message about a position, and positions go stale when other people edit before them, so you update the position before using it."],
        ["tip","The property OT guarantees is called <b>convergence</b>: if two copies apply the same set of ops, each transformed against what it had not seen, they end up identical. Researchers often write it as “apply A then B′ equals apply B then A′”, where the prime means “transformed”."],
        ["p","A real editor needs a few more rules (the next section lists them), and the hard part in practice is not the rules but keeping track of exactly which ops each side had already seen. That is what the revision numbers and the single ordering server are for."]
      ]
    },
    {
      h: "Transformation rules",
      blocks: [
        ["p","With only two kinds of op, insert and delete, there are only a handful of cases to handle. Here they are, written for the op that gets applied second."],
        ["table",["Concurrent pair","Rule (for the op applied second)"],[["insert vs insert at the same spot","Tie-break by server order or user id, so both sides put them in the same order"],["insert before a delete","Shift the delete right by the inserted length"],["delete before an insert","Shift the insert left by the deleted length"],["insert inside a deleted range","Keep the inserted text; split the delete around it"],["overlapping deletes","Delete only the part not already deleted"]]],
        ["p","Two of these deserve a story. <b>Same-spot inserts:</b> Asha and Ben both type at position 3 of <code>cat</code>, Asha an <code>s</code> and Ben a <code>!</code>. Is it <code>cats!</code> or <code>cat!s</code>? Either is fine, as long as everyone picks the same one. So the rule says “the op the server ordered first goes first” (or “lower user ID goes first”). <b>Overlapping deletes:</b> both select the word “very” and press delete. Without care, the second delete removes four more characters that nobody meant to delete. The rule shrinks the second delete to whatever part is still there, which here is nothing."],
        ["p","The lab further down this page implements exactly these rules, fuzz-tested against 300,000 random pairs of concurrent edits with zero divergence. Real editors extend them to rich text (formatting ranges, tables, images)."]
      ]
    },
    {
      h: "The editing protocol",
      blocks: [
        ["img","Part of the HGN team during Tbilisi workshop 1.jpg","A team working side by side on laptops: in a shared document, every one of these keyboards is sending operations at once."],
        ["p","Now put the pieces together into the messages that actually go over the WebSocket. Three kinds matter: you send an op, the server acks it, and the server forwards it to everyone else."],
        ["code","client → server   { doc: \"7f3\", rev: 41, ops: [{ insert: \"Wow! \", at: 0 }] }\nserver → client   { ack: true, rev: 42 }                                   // your op is now revision 42\nserver → others   { rev: 42, ops: [{ insert: \"Wow! \", at: 0 }], author: \"alice\" }\n\nclient rules:\n  • at most one batch of ops in flight; buffer the rest\n  • when a remote op arrives, transform it against your in-flight + buffered ops,\n    and transform those against it, then apply it locally"],
        ["p","Keeping <b>one batch in flight</b> per client (the approach from the Jupiter system that Docs-style OT builds on) means the server only ever transforms against a short, known history. Each op carries a client-generated id, so a retried send after a network blip is recognised and not applied twice."],
        ["p","Walk through the diagram's example. Alice and Bob are both at revision 41. Alice sends “insert ‘Wow! ’ at 0”. Bob sends “delete 6 at 10”. Alice's op reaches the server first and becomes revision 42. Bob's op arrives claiming “I was made at revision 41”. The server sees one op it has that Bob had not seen (revision 42, an insert of 5 characters before his position), so it shifts Bob's delete from 10 to 15 and stores it as revision 43. Alice receives the transformed op and applies it. Bob gets his ack plus Alice's op, which he transforms against nothing (his own op is already confirmed) and applies."],
        ["extra","The Jupiter system came out of Xerox PARC in 1995. Its insight was that with a central server, each client only ever has to reconcile with one other party, the server, rather than with every other client. That makes the bookkeeping far simpler than the original 1989 OT work by Ellis and Gibbs, which tried to reconcile every pair of peers."]
      ]
    },
    {
      h: "What happens when you open a document",
      blocks: [
        ["steps",[["Find the right server","Your browser opens a WebSocket to the gateway with the document ID. Consistent hashing on the ID picks the session server. If no server has the document open yet, that one takes ownership."],["Check permissions","The session server asks the permissions store whether you can view, comment or edit. A viewer's connection simply refuses to accept ops."],["Load the latest snapshot","Say the last snapshot is at revision 48,000. That is the full text at that point, loaded in one read."],["Replay the tail of the log","Apply ops 48,001 to 48,417, the current revision. A few hundred ops take milliseconds."],["Join the live session","Your browser gets the document at revision 48,417 and starts receiving everyone else's ops and cursor positions from there on."]]],
        ["p","The numbers in that walk-through are made up, but they show why snapshots matter. Without them, step 4 would replay all 48,417 ops every time anyone opened the document."]
      ]
    },
    {
      h: "OT or CRDT?",
      blocks: [
        ["p","Operational transformation is not the only answer to collaborative editing. The other big family is <b>CRDTs</b>, short for conflict-free replicated data types. Interviewers often ask you to compare them."],
        ["table",["","Operational transformation","CRDTs (e.g. Yjs, Automerge)"],[["Ordering","A server orders ops per document","No central order; every replica merges independently"],["Offline / peer-to-peer","Possible, but heavier to reconcile","Designed for it"],["Metadata","Small: positions only","Larger: a unique id per character or chunk"],["Used by","Google Docs (OT, per Google's 2010 description)","Many local-first apps and editors"]]],
        ["extra","A <b>CRDT</b> gives every character a unique, ordered identifier, so inserts and deletes commute: apply them in any order and every replica gets the same text. That avoids a central server but costs memory per character."],
        ["p","Here is the same <code>cat</code> example in CRDT terms. Instead of “position 2”, every letter has a permanent ID, say <code>c#A1</code>, <code>a#A2</code>, <code>t#A3</code>. Ben's op is “delete t#A3”, and that means the same thing no matter how many letters anyone inserts before it, so nothing ever needs transforming. Asha's <code>h</code> is “insert after c#A1”. The price is that every character now carries an ID and some ordering metadata, and deleted characters are often kept as hidden markers (tombstones) so later ops can still refer to them."],
        ["p","So which would you pick? If you already have a server per document and want compact data, OT is a solid, proven choice. If the app must work peer-to-peer or offline for days, a CRDT is usually the easier path."]
      ]
    },
    {
      h: "Storage and history",
      blocks: [
        ["chart",{"type":"line","title":"Ops to replay when opening a document","x":{"label":"document age (edits made)","values":["1k","10k","100k","1M"]},"y":{"label":"ops replayed","log":true},"series":[{"name":"Replay full log","values":[1000,10000,100000,1000000]},{"name":"Snapshot every 1,000 ops","values":[500,500,500,500]}],"note":"With periodic snapshots the load cost stays flat however old the document gets (about 500 ops on average)."}],
        ["p","The chart is the whole argument for snapshots. Without them, opening a document gets slower the longer people use it, which is backwards. With a snapshot every 1,000 ops, the worst case is 999 ops to replay and the average is about 500, whether the document is a week old or ten years old."],
        ["list",["<b>Revision history</b> groups the op log into human-sized versions (by time and author).","<b>Comments</b> are anchored to text ranges and transformed with the text so they stay attached.","<b>Permissions</b> are checked when the session opens and re-checked on change; a revoked editor's connection is closed.","<b>Old ops</b> can be compacted. Once a snapshot exists, ops far older than it are only needed for detailed history and can move to cheaper, slower storage."]]
      ]
    },
    {
      h: "Offline editing",
      blocks: [
        ["p","You open the document on a plane, type for two hours, and land. Meanwhile your teammates kept editing online. How does it all fit back together?"],
        ["steps",[["Go offline","The client keeps editing its local copy and queues ops, all made against the last revision it knew."],["Reconnect","It sends the queue. The server transforms it against everything that happened meanwhile and returns the missed ops."],["Converge","The client transforms the missed ops against its queue and applies them. Long offline sessions mean bigger transforms, but the same rules."]]],
        ["p","The rules do not change, but the results can surprise people. If you rewrote a paragraph offline that a teammate deleted online, OT will faithfully keep your new text and apply their delete to the old text, and the result may read oddly. OT guarantees that everyone sees the <i>same</i> document, not that the document makes sense. That is why long offline sessions are a good moment to show people what changed."]
      ]
    },
    {
      h: "Failure modes",
      blocks: [
        ["table",["Failure","Mitigation"],[["Session server crashes","Clients reconnect; a new server loads snapshot + op log and continues from the last durable revision"],["Op sent but no ack","Client resends with the same op id; the server dedupes"],["Two servers think they own a doc","Ownership lease in a coordination service (e.g. a lock with a TTL); ops with a stale lease are rejected"],["Huge paste or many editors","Batch ops; the 100-editor cap bounds the transformation work"],["A client's transform code has a bug","Its copy drifts from the server's; a periodic checksum of the document catches it, and the client reloads from the server"],["Gateway loses all connections","Browsers reconnect with their last known revision and fetch only the ops they missed"]]],
        ["p","The “two owners” case is the scary one, because two servers would assign two different revision 43s and the copies would split. A <b>lease</b> is a lock that expires on its own after a time limit (TTL). The owning server keeps renewing it. If it crashes or is cut off, the lease runs out, another server takes over, and anything the old owner tries to write afterwards is rejected because its lease number is out of date."]
      ]
    },
    {
      h: "Interview corner",
      blocks: [
        ["p","“Design Google Docs” tests whether you can explain concurrency in plain words. Here is one way to spend 45 minutes."],
        ["steps",[["Minutes 0–5: scope","Real-time co-editing, cursors, history, offline. Ask about scale: millions of open documents, but at most 100 editors each."],["Minutes 5–10: the naive design","Whole-document saves with last write wins, and why it silently loses work. Mention locking and why users hate it."],["Minutes 10–25: operations and OT","Ops with revision numbers, optimistic local apply, one ordering server per document, and a worked transform example on a short word. This is the part they will remember."],["Minutes 25–35: storage","Append-only op log for history, snapshots for fast loads, write before ack, op IDs for safe retries."],["Minutes 35–45: failures and alternatives","Server failover with leases, offline sync, and OT versus CRDTs."]]],
        ["list",["Why not just use a database transaction per keystroke? → transactions stop two writes from corrupting a row, but they still pick a winner. You need both edits to survive, with adjusted positions.","How do you scale to 1,000 editors? → you mostly don't; Docs caps editing at 100 and switches the rest to viewing. Viewers only receive ops, which is cheap to fan out.","How do comments stay attached when text moves? → store each comment's start and end as positions and transform them like cursors.","How does undo work? → undo your own last op by sending its inverse (delete what you inserted), transformed against everything since. You undo your change, not other people's.","What does the server store per document while it is open? → current text, current revision, recent ops for transforming late arrivals, and recent op IDs for de-duplication."]]
      ]
    }
  ]
});
