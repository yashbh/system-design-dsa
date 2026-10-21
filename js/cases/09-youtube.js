/* Blueprint case study — YouTube: Design Video Upload & Streaming. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "youtube",
  app: "YouTube",
  icon: "▶️",
  color: "#ff0033",
  color2: "#ff7a7a",
  title: "Design Video Upload & Streaming",
  tagline: "Take 500 hours of new video every minute, make each one playable on any phone within minutes, and count billions of views.",
  level: "Advanced",
  minutes: 18,
  concepts: ["chunking","transcoding","object-storage","cdn","abr","message-queue","sharding"],
  stats: [
    {v: 500,suf: " h",label: "of video uploaded every minute (YouTube, reported)",kind: "Reported"},
    {v: 1,suf: "B h",label: "watched per day (YouTube, 2017)",kind: "Reported"},
    {
      v: 2.1,
      d: 1,
      suf: "B",
      label: "views that overflowed a 32-bit counter (Gangnam Style, 2014)",
      kind: "Reported"
    }
  ],
  story: "At 10 pm a creator in Pune uploads a 20-minute 4K vlog from a café's patchy Wi-Fi. The upload stalls twice and resumes. By 10:06 a fan on a train in Delhi is watching it in 360p, and by 10:15 it's available in 4K. By morning it has a million views, and the counter got every one of them roughly right.<br><br>Unlike Netflix, YouTube doesn't choose its catalogue: <b>anyone can upload anything, any time</b>. The hard problems are an <b>ingest and processing pipeline that never loses an upload</b> and publishes fast, <b>cost-efficient storage</b> for a huge long tail of rarely watched videos, and <b>counting views at enormous scale</b>.",
  requirements: {
    functional: ["Upload videos (resumable, from flaky networks)","Transcode into many resolutions and codecs","Watch with adaptive streaming on any device","View counts, likes and comments","Search and recommendations"],
    nonFunctional: ["Never lose an upload","Publish within minutes, low resolutions first","Playback starts fast worldwide","View counts eventually accurate and fraud-resistant","Storage cost under control for a huge long tail"]
  },
  estimate: [
    ["Uploads per day","500 h/min × 60 × 24","720,000 hours"],
    ["Raw storage per day","720k h × ~2 GB/h (assumption)","≈ 1.4 PB"],
    ["Encoded copies","~7 resolutions × 2–3 codecs","≈ 15–20 renditions per video"],
    ["Average egress","1B h/day × 3 Mbps ÷ 86,400 s","≈ 125 Tbps"],
    ["View events","billions/day ÷ 86,400","≈ 100k+ per second"]
  ],
  estimateNote: "Insight: two pipelines with very different shapes. Ingest is moderate in volume but CPU-heavy (transcoding). Playback is gigantic in bandwidth and must be served from edge caches near viewers.",
  naive: {
    title: "\"Save the uploaded file and stream it as-is\"",
    desc: "One HTTP upload, stored on a server; viewers download the original file; a SQL row per video with UPDATE views = views + 1 on every view.",
    breaks: ["A dropped connection at 95% means starting a 4 GB upload again.","The original 4K HEVC file won't play on many phones, and on a slow network it stalls constantly.","Every view updating one counter row creates a hot row with massive lock contention on popular videos."]
  },
  steps: [
    {
      t: "Resumable, chunked uploads",
      c: "chunking",
      b: "The client asks for an upload session, then sends the file in chunks (say 8 MB), each acknowledged. After a drop it asks \"how much did you get?\" and resumes from there. Chunks go straight to <b>object storage</b>; the API only tracks the session.",
      a: "Moving house box by box: if the van breaks down, you don't unpack and start over."
    },
    {
      t: "A transcoding DAG, in parallel",
      c: "transcoding",
      b: "Once the raw file lands, a workflow splits it into segments of a few seconds or minutes, encodes every segment into every resolution and codec on <b>thousands of workers in parallel</b>, then stitches and packages them. A 20-minute video becomes hundreds of small jobs instead of one long one.",
      a: "A kitchen where twenty cooks each make one dish at once, instead of one chef cooking the whole banquet."
    },
    {
      t: "Publish the low resolutions first",
      c: "transcoding",
      b: "Schedule 360p (and audio) ahead of 1080p and 4K, and mark the video watchable as soon as one complete rung exists. Higher resolutions appear minutes later. Viewers wait minutes, not hours.",
      a: "A restaurant that serves bread while the main course is still cooking."
    },
    {
      t: "Hot and cold storage",
      c: "object-storage",
      b: "A few videos get most views, while most videos are rarely watched. Keep popular renditions on fast storage and edge caches, and move the long tail to cheaper, colder storage. You can even skip rarely requested renditions until someone asks for them.",
      a: "A bookshop keeps bestsellers on the front table and the rest in the back room."
    },
    {
      t: "Edge caches inside ISPs",
      c: "cdn",
      b: "Like Netflix's Open Connect, Google places caching servers inside ISPs (Google Global Cache). Popular segments are served from a few network hops away, and only misses travel back to Google's data centres. Players then use <b>adaptive bitrate</b> (DASH) to switch quality per segment.",
      a: "Corner shops stocked with what the neighbourhood buys most."
    },
    {
      t: "Count views asynchronously",
      c: "message-queue",
      b: "A view is an <b>event</b>, not a database update. Players send view pings into a log (Kafka-style). Stream processors filter bots and duplicates, then add counts in batches to <b>sharded counters</b>. The number shown is eventually consistent, and that's fine.",
      a: "A cricket scorer tallies runs on paper and updates the big board every over, not after every ball."
    }
  ],
  diagram: {
    nodes: [
      {
        id: "cr",
        x: 90,
        y: 110,
        label: "Creator",
        sub: "uploads",
        kind: "client",
        icon: "🎥",
        desc: "Uploads a file in resumable chunks."
      },
      {
        id: "up",
        x: 290,
        y: 110,
        label: "Upload service",
        sub: "resumable sessions",
        kind: "service",
        icon: "⬆️",
        desc: "Issues sessions, tracks received bytes, triggers processing."
      },
      {
        id: "raw",
        x: 500,
        y: 60,
        label: "Raw storage",
        sub: "object store",
        kind: "db",
        icon: "🪣",
        desc: "Durable home of the original file."
      },
      {
        id: "tq",
        x: 500,
        y: 200,
        label: "Transcode queue",
        sub: "job DAG",
        kind: "queue",
        icon: "📬",
        desc: "One job per segment × rendition."
      },
      {
        id: "wk",
        x: 720,
        y: 130,
        label: "Encoder fleet",
        sub: "thousands of workers",
        kind: "service",
        icon: "🎞️",
        desc: "Encodes segments in parallel; low rungs first."
      },
      {
        id: "meta",
        x: 720,
        y: 290,
        label: "Video metadata",
        sub: "sharded MySQL (Vitess)",
        kind: "db",
        icon: "🗄️",
        desc: "Title, owner, status, available renditions."
      },
      {
        id: "edge",
        x: 910,
        y: 210,
        label: "Edge caches",
        sub: "inside ISPs",
        kind: "edge",
        icon: "🌍",
        desc: "Serve popular segments near viewers."
      },
      {
        id: "v",
        x: 910,
        y: 380,
        label: "Viewer",
        sub: "DASH player",
        kind: "client",
        icon: "📱",
        desc: "Adapts quality per segment; sends view pings."
      },
      {
        id: "vc",
        x: 500,
        y: 380,
        label: "View pipeline",
        sub: "log → counters",
        kind: "queue",
        icon: "🔢",
        desc: "Dedupes, filters bots, batches increments."
      }
    ],
    flows: [
      {
        name: "Upload & publish",
        steps: [
          ["cr","up","Start a resumable session"],
          ["up","raw","Chunks land in object storage"],
          ["up","tq","File complete → create the transcode DAG"],
          ["tq","wk","Segments × renditions fan out"],
          ["wk","meta","360p ready → status = watchable"],
          ["wk","edge","Renditions available to the edge"]
        ]
      },
      {
        name: "Watch & count",
        steps: [
          ["v","meta","Get the manifest (renditions, segment URLs)"],
          ["v","edge","Fetch segments, adapting quality"],
          ["v","vc","View ping {video, user, watch time}"],
          ["vc","meta","Batched, deduplicated count update"]
        ]
      }
    ]
  },
  lab: {
    sim: "transcode",
    title: "Transcoding Pipeline Lab",
    hint: "Upload a video with one encoder, then split it into chunks and add workers. Watch when it becomes watchable (360p) versus fully processed."
  },
  tradeoffs: [
    {
      choice: "Publish low resolutions first",
      pro: "Watchable within minutes",
      con: "Early viewers see lower quality for a while"
    },
    {
      choice: "Approximate, batched view counts",
      pro: "No hot-row contention; bots filtered",
      con: "The count lags reality"
    },
    {
      choice: "Lazily create rare renditions",
      pro: "Saves storage on the long tail",
      con: "The first request for that rendition is slow"
    }
  ],
  takeaways: ["Make big uploads resumable and processing parallel.","Separate the CPU-heavy ingest path from the bandwidth-heavy playback path.","Counters at scale are event streams aggregated in batches, not row updates."],
  quiz: [
    {
      q: "Why split a video into segments before transcoding?",
      o: ["To compress it","So thousands of workers can encode pieces in parallel","CDNs require it","To remove ads"],
      a: 1,
      why: "Parallel jobs turn hours into minutes."
    },
    {
      q: "A popular video gets 50k views per second. How do you count them?",
      o: ["UPDATE views = views + 1 for each","Stream view events, dedupe, and add batched increments to sharded counters","Count once a month","Store every view in the video row"],
      a: 1,
      why: "Avoid a single hot row; aggregate events."
    },
    {
      q: "Why can a viewer watch before the 4K version exists?",
      o: ["They can't","The pipeline encodes and publishes low resolutions first","4K is streamed raw","The CDN upscales it"],
      a: 1,
      why: "Prioritising the lower rungs makes the video watchable sooner."
    },
    {
      q: "What did Gangnam Style famously break in 2014?",
      o: ["The CDN","A 32-bit signed view counter (max ≈ 2.1B)","The upload limit","Search"],
      a: 1,
      why: "2,147,483,647 is the largest 32-bit signed integer. YouTube moved to 64-bit."
    }
  ],
  sources: ["YouTube official blog and press statistics (500 h/min, 1B hours/day)","Vitess: MySQL sharding, built at YouTube","Google: Argos video transcoding chips (2021)"],
  deep: [
    {
      h: "The resumable upload protocol",
      blocks: [
        ["img","An elderly man uses his smartphone to video record the large crowd gathered on Jinan Road (濟南路).jpg","On YouTube anyone with a phone is a broadcaster, so uploads arrive from every kind of network, including terrible ones."],
        ["code","POST /upload/videos?uploadType=resumable   { title, size: 3.8 GB }\n→ 200  Location: /upload/session/abc123\n\nPUT /upload/session/abc123   Content-Range: bytes 0-8388607/3800000000\n→ 308 Resume Incomplete      Range: bytes=0-8388607\n…connection drops…\nPUT /upload/session/abc123   Content-Range: bytes */3800000000     (\"how much do you have?\")\n→ 308   Range: bytes=0-1166016511                                   (resume from here)\n…\n→ 201 Created { video_id: \"dQw4w9WgXcQ\", status: \"processing\" }"],
        ["p","Each chunk is stored as it arrives. The session remembers the offset, so a phone that loses signal resumes instead of restarting, which matters when uploads are gigabytes over mobile data."]
      ]
    },
    {
      h: "The transcoding pipeline in detail",
      blocks: [
        ["steps",[["Validate and probe","Check that the file is a real video; read its duration, codec, frame rate and resolution."],["Split","Cut at keyframes into independent segments."],["Fan out","Create one job per segment × rendition, scheduling 360p and audio first."],["Encode","Workers pull jobs from the queue. A failed job is simply retried, because segments are independent."],["Assemble and package","Stitch segments per rendition, write DASH/HLS manifests, generate thumbnails and storyboards."],["Publish","Update the metadata status as rungs become ready, and notify subscribers."]]],
        ["chart",{"type":"line","title":"Time until a 20-minute video is fully processed","x":{"label":"encoding workers","values":[1,2,4,8,16,32,64]},"y":{"label":"minutes","log":true},"series":[{"name":"Chunked (1-min segments)","values":[70,35,18,9,5,3,2]},{"name":"One encoder per video","values":[70,70,70,70,70,70,70]}],"note":"Illustrative: 140 segment-jobs at 30 s each, plus about a minute to split and assemble. Without chunking, extra workers can't help a single video."}],
        ["extra","At YouTube's scale even CPUs get expensive: Google has described custom video-transcoding chips (\"Argos\") that encode many times more efficiently than general-purpose servers."]
      ]
    },
    {
      h: "Data model",
      blocks: [
        ["table",["Store","Contents","Notes"],[["videos (sharded MySQL via Vitess)","video_id, channel_id, title, status, duration, created_at","Vitess, which shards MySQL, was born at YouTube"],["renditions","video_id, resolution, codec, segment manifest URL","Added as each rung finishes"],["Object storage","Raw upload + encoded segments","Hot vs cold tiers"],["view_counts (sharded counters)","video_id → N partial counters","Sum the shards to display"],["Comments / likes","Separate services and stores","Scale independently"]]],
        ["tip","<b>Sharded counters:</b> instead of one row per video, keep N counter rows (video_id, shard) and increment a random shard. Reading the total sums N rows, which can be cached. That spreads the write contention N ways."]
      ]
    },
    {
      h: "Counting views",
      blocks: [
        ["chart",{"type":"bar","title":"Writes to the counter store per second for one viral video","data":[["UPDATE per view (50k views/s)",50000],["Batched every 10 s across 100 aggregators",10]],"log":true,"highlight":1}],
        ["list",["Players send pings at watch milestones (e.g. after ~30 s), not on page load.","Stream processors drop duplicates (same user and video within a window) and suspected bots.","Aggregators add counts locally and flush every few seconds as one increment per video.","Displayed counts come from a cache refreshed periodically. Exactness is traded for scale on purpose."]]
      ]
    },
    {
      h: "Failure modes",
      blocks: [
        ["table",["Failure","Mitigation"],[["Upload connection drops","Resumable sessions continue from the last stored byte"],["Encoder job crashes","Idempotent segment jobs are retried on another worker"],["Transcode backlog after a spike","Prioritise low rungs and popular channels; autoscale workers"],["Edge cache miss storm (a new viral video)","Request coalescing at the edge; pre-warm caches for big creators"],["Bot view inflation","Filter in the stream pipeline before counting"]]]
      ]
    },
    {
      h: "Interview follow-ups",
      blocks: [
        ["list",["Live streaming? → real-time segmenting, a constantly updating manifest, low-latency players (see the video-streaming lesson).","Copyright matching? → fingerprint every upload's audio and video and compare against a reference index.","Recommendations? → offline models on watch history plus online candidate ranking, served separately from playback.","Deleting a video? → mark it removed in metadata immediately; purge storage and caches asynchronously."]]
      ]
    }
  ]
});
