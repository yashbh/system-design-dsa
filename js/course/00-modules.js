/* Blueprint course — modules. Each lesson lives in its own file in this folder and pushes itself onto BP.LESSONS.
 * Block types: ["p",html] ["fig",name,caption] ["sim",name,caption] ["flow",diagram,caption] ["chart",spec] ["img",commonsTitle,caption]
 * ["analogy"|"tip"|"warn"|"extra",html] ["table",head,rows] ["steps",[[title,body]...]] ["list",[...]] ["code",text] ["math",[[label,calc,result]...],note]
 */
window.BP = window.BP || {};
BP.MODULES = [
  {
    "id": "found",
    "name": "Foundations",
    "icon": "🧱",
    "desc": "From one laptop to a fleet of servers"
  },
  {
    "id": "cache",
    "name": "Caching",
    "icon": "⚡",
    "desc": "Make reads fast, keep them correct"
  },
  {
    "id": "db",
    "name": "Databases at scale",
    "icon": "🗄️",
    "desc": "Replication, sharding, consistency, internals"
  },
  {
    "id": "cases",
    "name": "Classic HLD case studies",
    "icon": "🧪",
    "desc": "Interview problems, end to end"
  },
  {
    "id": "infra",
    "name": "Infrastructure building blocks",
    "icon": "🔧",
    "desc": "Coordination, queues, IDs, limits"
  },
  {
    "id": "micro",
    "name": "Microservices",
    "icon": "🧩",
    "desc": "Splitting systems and keeping them consistent"
  }
];
BP.LESSONS = [];
BP.SHARD_SCENARIOS = [
  {
    "name": "🏦 Banking",
    "desc": "Users can hold accounts in several cities. Frequent ops: balance, transaction history, list a user's accounts, create transactions.",
    "queries": [
      "Get my balance",
      "Show my transaction history",
      "List my accounts"
    ],
    "keys": [
      {
        "key": "UserID",
        "dist": [
          26,
          24,
          25,
          25
        ],
        "q": [
          1,
          1,
          1
        ],
        "good": true,
        "why": "All of a user's accounts and transactions sit together, so every frequent operation touches one shard. Spread active and inactive users evenly."
      },
      {
        "key": "CityID",
        "dist": [
          58,
          22,
          12,
          8
        ],
        "q": [
          1,
          4,
          4
        ],
        "good": false,
        "why": "Big cities make hot shards, users with accounts in several cities fan out, and moving cities means migrating data."
      },
      {
        "key": "TransactionID",
        "dist": [
          25,
          25,
          25,
          25
        ],
        "q": [
          4,
          4,
          4
        ],
        "good": false,
        "why": "Perfectly even, but every user-centric query must ask every shard."
      }
    ]
  },
  {
    "name": "🚕 Uber",
    "desc": "The dominant operation is \"find drivers near me\". Drivers move constantly.",
    "queries": [
      "Find nearby drivers",
      "Update a driver's location",
      "Show a driver's trips"
    ],
    "keys": [
      {
        "key": "CityID",
        "dist": [
          34,
          28,
          22,
          16
        ],
        "q": [
          1,
          1,
          1
        ],
        "good": true,
        "why": "A rider only needs drivers in their own city, so nearby search stays on one shard. City sizes differ, but cities are independent and big ones can be split further."
      },
      {
        "key": "DriverID",
        "dist": [
          25,
          25,
          25,
          25
        ],
        "q": [
          4,
          1,
          1
        ],
        "good": false,
        "why": "Nearby drivers are scattered across all shards, so every search fans out."
      },
      {
        "key": "PIN code",
        "dist": [
          30,
          27,
          23,
          20
        ],
        "q": [
          4,
          4,
          1
        ],
        "good": false,
        "why": "Cabs cross PIN codes constantly, which means endless reshuffling, and searches near a boundary span shards."
      }
    ]
  },
  {
    "name": "💬 Slack",
    "desc": "Channels can have 100,000 members. Sending to a channel is the hot path.",
    "queries": [
      "Send a message to a channel",
      "Load a channel's messages",
      "List my channels"
    ],
    "keys": [
      {
        "key": "GroupID (channel)",
        "dist": [
          27,
          25,
          24,
          24
        ],
        "q": [
          1,
          1,
          4
        ],
        "good": true,
        "why": "One write per message, and one shard to load a channel. The \"my channels\" list lives in a small per-user index, and unread counts load lazily."
      },
      {
        "key": "UserID",
        "dist": [
          25,
          25,
          25,
          25
        ],
        "q": [
          4,
          1,
          1
        ],
        "good": false,
        "why": "One message to a 100k-member channel means writing to 100k mailboxes on every shard."
      }
    ]
  },
  {
    "name": "🚆 IRCTC",
    "desc": "Never double-book a berth. Tatkal opens at a fixed time and everyone books tomorrow's trains at once.",
    "queries": [
      "Book a berth on train T",
      "Check berth availability",
      "My bookings"
    ],
    "keys": [
      {
        "key": "TrainID",
        "dist": [
          26,
          25,
          25,
          24
        ],
        "q": [
          1,
          1,
          4
        ],
        "good": true,
        "why": "All berths of a train live on one shard, so allocation is local and atomic (no double-booking). Thousands of trains run tomorrow, so tatkal load spreads."
      },
      {
        "key": "Date of journey",
        "dist": [
          85,
          5,
          5,
          5
        ],
        "q": [
          1,
          1,
          4
        ],
        "good": false,
        "why": "Every tatkal opening hammers the single shard holding tomorrow."
      },
      {
        "key": "UserID",
        "dist": [
          25,
          25,
          25,
          25
        ],
        "q": [
          4,
          4,
          1
        ],
        "good": false,
        "why": "Two users on different shards could get the same berth unless every booking checks every shard, which is impossible at tatkal scale."
      }
    ]
  },
  {
    "name": "🔤 Username",
    "desc": "A tempting but naive idea: shard users by the first letter of their username.",
    "queries": [
      "Login",
      "Load profile",
      "Add a 27th shard"
    ],
    "keys": [
      {
        "key": "First letter",
        "dist": [
          46,
          30,
          18,
          6
        ],
        "q": [
          1,
          1,
          26
        ],
        "good": false,
        "why": "Far more names start with 'a' or 's' than 'x', there are only 26 possible shards, and a hot letter can't be split."
      },
      {
        "key": "hash(UserID)",
        "dist": [
          25,
          25,
          25,
          24
        ],
        "q": [
          1,
          1,
          1
        ],
        "good": true,
        "why": "Even distribution, one shard per lookup, and consistent hashing makes adding shards cheap."
      }
    ]
  }
];
