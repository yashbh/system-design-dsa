/* Blueprint case study — Google Docs: Design Real-time Collaborative Editing. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "gdocs",
  app: "Google Docs",
  icon: "📝",
  color: "#1a73e8",
  color2: "#34a853",
  title: "Design Real-time Collaborative Editing",
  tagline: "Several people typing in the same paragraph at the same instant, and everyone ends up with exactly the same document.",
  level: "Advanced",
  minutes: 18,
  concepts: ["ot-crdt","websockets","event-sourcing","consistent-hashing","wal","idempotency"],
  stats: [
    {v: 3,suf: "B+",label: "Google Workspace users (Google, 2021)",kind: "Reported"},
    {v: 100,label: "people who can view or edit one doc at the same time (Docs help)",kind: "Reported"},
    {v: 0,pre: "",suf: " lost",label: "keystrokes allowed",kind: "Requirement"}
  ],
  story: "11:58 pm, two minutes before a deadline. Three teammates are fixing the same paragraph: one rewrites the opening, one deletes a sentence, one adds a citation, all at the same moment. Each sees the others' coloured cursors move, and nobody's work vanishes.<br><br>The obvious design, \"save the whole document when someone types\", loses work the moment two people type at once. Google Docs sends <b>operations</b> instead of documents, gives each document a <b>single place that orders them</b>, and uses <b>operational transformation</b> so concurrent edits land in the right place for everyone.",
  requirements: {
    functional: ["Several people edit the same document in real time","See each other's cursors and selections","Comments and suggestions","Full revision history","Offline editing that syncs later","Sharing permissions"],
    nonFunctional: ["Your own typing appears instantly (no network wait)","Others' edits appear within a fraction of a second","Everyone converges to the same document","No edit is ever lost","Documents load fast even after years of history"]
  },
  estimate: [
    ["Documents open at once","assumption","10 M"],
    ["People actively typing","assumption","2 M"],
    ["Operations per second","2M × ~3 ops/s","≈ 6 M ops/s"],
    ["Bandwidth","6M × ~100 B","≈ 600 MB/s"],
    ["Editors per document","Docs limit","≤ 100 at once"]
  ],
  estimateNote: "Insight: total volume is large, but each document is small and has few editors. The scale problem shards naturally by document: one session server per open document.",
  naive: {
    title: "\"Send the whole document on every change; last write wins\"",
    desc: "Each client uploads its full copy when it changes; the server keeps whichever arrived last.",
    breaks: ["Two people typing at once: whoever saves second silently overwrites the other's work.","Locking paragraphs prevents conflicts but makes co-editing miserable.","Uploading the full document on every keystroke wastes bandwidth and adds latency."]
  },
  steps: [
    {
      t: "Send operations, not documents",
      c: "ot-crdt",
      b: "Every change is a tiny <b>operation</b>: insert \"very \" at position 4, delete 6 characters at 10. Each carries the <b>revision number</b> it was made against. Ops are a few bytes, not the whole document.",
      a: "Sending \"change line 3 to …\" instead of re-mailing the whole book."
    },
    {
      t: "Apply locally first",
      c: "ot-crdt",
      b: "Your own keystroke is applied to your screen <b>immediately</b>, then sent to the server. You never wait for the network to see your own typing. The client keeps a queue of sent-but-unacknowledged ops.",
      a: "Writing on your own notepad while a courier carries a copy to the office."
    },
    {
      t: "One server orders each document",
      c: "consistent-hashing",
      b: "All editors of a document connect (over WebSockets) to the <b>same session server</b>, chosen by consistent hashing on the document id. That server assigns every op a global sequence number, so there's one agreed order per document.",
      a: "One referee per match keeps the official scorebook."
    },
    {
      t: "Transform concurrent ops",
      c: "ot-crdt",
      b: "If Alice inserts at position 0 while Bob deletes at position 10, Bob's op arrives \"late\": the text shifted under it. <b>Operational transformation</b> rewrites the incoming op against the ops it didn't know about (shift its position, shrink its range) so it means the same thing in the new text. Every client and the server do this, and all copies converge.",
      a: "\"Meet at the third house on the left\" becomes \"the fourth house\" if someone built a new house before it."
    },
    {
      t: "Store an op log plus snapshots",
      c: "event-sourcing",
      b: "The document <i>is</i> its history: an append-only log of ops (event sourcing). Revision history comes for free. To load quickly, periodically save a <b>snapshot</b> and replay only the ops after it.",
      a: "A bank statement: the balance (snapshot) plus the transactions since."
    },
    {
      t: "Presence and cursors",
      c: "websockets",
      b: "Cursor positions and selections are <b>ephemeral</b> events broadcast over the same connections. They aren't stored, and they're transformed like ops so a cursor stays on the right word as text shifts around it.",
      a: "Seeing where everyone is standing in a shared room."
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
      choice: "Central server orders ops (OT)",
      pro: "Simpler, compact ops, one source of truth",
      con: "Needs a live server per document"
    },
    {
      choice: "CRDTs instead",
      pro: "Peer-to-peer and offline-first, no central order needed",
      con: "Larger metadata per character; harder rich-text semantics"
    },
    {
      choice: "Op log + snapshots",
      pro: "Full history; fast loads",
      con: "Storage grows; needs compaction policies"
    }
  ],
  takeaways: ["Send intent (operations), not state.","Give each shared object one place that orders its changes.","Concurrent edits are a transformation problem, not a locking problem."],
  quiz: [
    {
      q: "Why doesn't \"last write wins\" work for co-editing?",
      o: ["It's too slow","Whoever saves second silently erases the other person's changes","Browsers forbid it","It needs SQL"],
      a: 1,
      why: "Concurrent work must be merged, not overwritten."
    },
    {
      q: "Alice inserts 5 characters at the start while Bob deletes at position 10. What must happen to Bob's op on Alice's side?",
      o: ["Nothing","Shift it to position 15","Drop it","Lock the paragraph"],
      a: 1,
      why: "The text before position 10 grew by 5, so the same characters are now at 15."
    },
    {
      q: "Why route every editor of one doc to the same server?",
      o: ["Cheaper","So one place assigns a single agreed order to the doc's ops","For backups","It's required by WebSockets"],
      a: 1,
      why: "A single sequence per document makes transformation and convergence manageable."
    },
    {
      q: "How does a years-old document still open fast?",
      o: ["It replays every op since creation","Load the latest snapshot and replay only the recent ops","It's cached forever","It doesn't"],
      a: 1,
      why: "Snapshots bound the replay work."
    }
  ],
  sources: ["Google Drive blog: What's different about the new Google Docs (operational transformation, 2010)","Google Docs help: sharing and the 100 simultaneous editors limit","Ellis & Gibbs (1989) / Jupiter (1995): foundations of operational transformation"],
  deep: [
    {
      h: "The editing protocol",
      blocks: [
        ["img","Part of the HGN team during Tbilisi workshop 1.jpg","A team working side by side on laptops: in a shared document, every one of these keyboards is sending operations at once."],
        ["code","client → server   { doc: \"7f3\", rev: 41, ops: [{ insert: \"Wow! \", at: 0 }] }\nserver → client   { ack: true, rev: 42 }                                   // your op is now revision 42\nserver → others   { rev: 42, ops: [{ insert: \"Wow! \", at: 0 }], author: \"alice\" }\n\nclient rules:\n  • at most one batch of ops in flight; buffer the rest\n  • when a remote op arrives, transform it against your in-flight + buffered ops,\n    and transform those against it, then apply it locally"],
        ["p","Keeping <b>one batch in flight</b> per client (the approach from the Jupiter system that Docs-style OT builds on) means the server only ever transforms against a short, known history. Each op carries a client-generated id, so a retried send after a network blip is recognised and not applied twice."]
      ]
    },
    {
      h: "Transformation rules",
      blocks: [
        ["table",["Concurrent pair","Rule (for the op applied second)"],[["insert vs insert at the same spot","Tie-break by server order or user id, so both sides put them in the same order"],["insert before a delete","Shift the delete right by the inserted length"],["delete before an insert","Shift the insert left by the deleted length"],["insert inside a deleted range","Keep the inserted text; split the delete around it"],["overlapping deletes","Delete only the part not already deleted"]]],
        ["p","The lab further down this page implements exactly these rules, fuzz-tested against 300,000 random pairs of concurrent edits with zero divergence. Real editors extend them to rich text (formatting ranges, tables, images)."]
      ]
    },
    {
      h: "OT or CRDT?",
      blocks: [
        ["table",["","Operational transformation","CRDTs (e.g. Yjs, Automerge)"],[["Ordering","A server orders ops per document","No central order; every replica merges independently"],["Offline / peer-to-peer","Possible, but heavier to reconcile","Designed for it"],["Metadata","Small: positions only","Larger: a unique id per character or chunk"],["Used by","Google Docs (OT, per Google's 2010 description)","Many local-first apps and editors"]]],
        ["extra","A <b>CRDT</b> gives every character a unique, ordered identifier, so inserts and deletes commute: apply them in any order and every replica gets the same text. That avoids a central server but costs memory per character."]
      ]
    },
    {
      h: "Storage and history",
      blocks: [
        ["chart",{"type":"line","title":"Ops to replay when opening a document","x":{"label":"document age (edits made)","values":["1k","10k","100k","1M"]},"y":{"label":"ops replayed","log":true},"series":[{"name":"Replay full log","values":[1000,10000,100000,1000000]},{"name":"Snapshot every 1,000 ops","values":[500,500,500,500]}],"note":"With periodic snapshots the load cost stays flat however old the document gets (about 500 ops on average)."}],
        ["list",["<b>Revision history</b> groups the op log into human-sized versions (by time and author).","<b>Comments</b> are anchored to text ranges and transformed with the text so they stay attached.","<b>Permissions</b> are checked when the session opens and re-checked on change; a revoked editor's connection is closed."]]
      ]
    },
    {
      h: "Offline editing",
      blocks: [
        ["steps",[["Go offline","The client keeps editing its local copy and queues ops, all made against the last revision it knew."],["Reconnect","It sends the queue. The server transforms it against everything that happened meanwhile and returns the missed ops."],["Converge","The client transforms the missed ops against its queue and applies them. Long offline sessions mean bigger transforms, but the same rules."]]]
      ]
    },
    {
      h: "Failure modes",
      blocks: [
        ["table",["Failure","Mitigation"],[["Session server crashes","Clients reconnect; a new server loads snapshot + op log and continues from the last durable revision"],["Op sent but no ack","Client resends with the same op id; the server dedupes"],["Two servers think they own a doc","Ownership lease in a coordination service (e.g. a lock with a TTL); ops with a stale lease are rejected"],["Huge paste or many editors","Batch ops; the 100-editor cap bounds the transformation work"]]]
      ]
    }
  ]
});
