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
  minutes: 33,
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
  story: "At 10 pm a creator in Pune uploads a 20-minute 4K vlog from a café's patchy Wi-Fi. The upload stalls twice and resumes. By 10:06 a fan on a train in Delhi is watching it in 360p, and by 10:15 it's available in 4K. By morning it has a million views, and the counter got every one of them roughly right.<br><br>That little story hides three separate engineering problems. The first is <b>getting the file in</b>: a 4 GB upload over café Wi-Fi will fail at some point, and \"start again from zero\" is not an acceptable answer. The second is <b>turning one file into something every device can play</b>: the fan's phone on a train can't handle raw 4K, and an old smart TV may not understand the codec the creator's camera used. The third is <b>serving and counting at planet scale</b>: billions of hours watched a day, and a view counter that can't just be a number in a database row.<br><br>Unlike Netflix, YouTube doesn't choose its catalogue: <b>anyone can upload anything, any time</b>. Every minute, about 500 hours of new video arrive. Most of it will be watched a handful of times. A tiny fraction will be watched by hundreds of millions of people, and nobody knows in advance which.<br><br>So the hard problems are an <b>ingest and processing pipeline that never loses an upload</b> and publishes fast, <b>cost-efficient storage</b> for a huge long tail of rarely watched videos, <b>delivery from servers near the viewer</b>, and <b>counting views at enormous scale</b>. This case builds each one up from the version that breaks. As always, it's a simplified teaching model based on public information, not Google's internal design.",
  requirements: {
    functional: ["Upload videos (resumable, from flaky networks)","Transcode into many resolutions and codecs","Watch with adaptive streaming on any device, switching quality as the network changes","Seek anywhere in a video and see preview thumbnails while scrubbing","View counts, likes and comments","Search and recommendations"],
    nonFunctional: ["Never lose an upload","Publish within minutes, low resolutions first","Playback starts fast worldwide (about a second or two)","Little or no buffering, even on weak mobile networks","View counts eventually accurate and fraud-resistant","Storage cost under control for a huge long tail"]
  },
  estimate: [
    ["Uploads per day","500 h/min × 60 × 24","720,000 hours"],
    ["Raw storage per day","720k h × ~2 GB/h (assumption)","≈ 1.4 PB"],
    ["Encoded copies","~7 resolutions × 2–3 codecs","≈ 15–20 renditions per video"],
    ["Average egress","1B h/day × 3 Mbps ÷ 86,400 s","≈ 125 Tbps"],
    ["View events","billions/day ÷ 86,400","≈ 100k+ per second"],
    ["Transcode work per day","720k h × ~15–20 renditions","≈ 11–14 M rendition-hours of encoding"]
  ],
  estimateNote: "The 2 GB per hour, 3 Mbps and rendition counts are illustrative assumptions; the 500 hours a minute and 1 billion hours a day are reported figures. Put together, they reveal <b>two pipelines with very different shapes</b>. Ingest is moderate in bytes (a petabyte or so a day) but brutally <b>CPU-heavy</b>: every uploaded hour is encoded 15–20 times, so you need a huge fleet of encoders and a way to spread one video across many of them. Playback is the opposite: almost no CPU per view, but a <b>gigantic amount of bandwidth</b>. 125 terabits per second is far more than any single data centre could push out, so the bytes must come from caches spread around the world, close to viewers. Counting is a third shape: tiny events, but 100,000+ of them a second, some concentrated on a single viral video.",
  naive: {
    title: "\"Save the uploaded file and stream it as-is\"",
    desc: "The version you'd build in a weekend: one HTTP upload, saved to disk on a server. Viewers download the original file from that server. A SQL table has one row per video, and every view runs <code>UPDATE videos SET views = views + 1</code>. It works for a club's ten videos. Here's what happens at YouTube's scale.",
    breaks: ["A dropped connection at 95% means starting a 4 GB upload again. On café Wi-Fi that might fail every single time, and the creator gives up.","The original 4K HEVC file won't play on many phones, and on a slow network it stalls constantly. A phone on a train with 2 Mbps can't keep up with a 40 Mbps file; it buffers every few seconds.","Every viewer pulls bytes from your one server. At, say, 10,000 concurrent viewers × 5 Mbps (illustrative), that's 50 Gbps from one box, which no single machine or network link can serve.","Every view updating one counter row creates a hot row with massive lock contention on popular videos. At 50,000 views a second, the database spends its time queueing for one row's lock.","Storing everything on fast disks forever is ruinously expensive, because most videos are almost never watched after their first week."]
  },
  steps: [
    {
      t: "Resumable, chunked uploads",
      c: "chunking",
      b: "Big files over bad networks will fail mid-way. You can't prevent that, so make failure cheap. <b>Chunking</b> means splitting the upload into pieces that are sent and acknowledged one at a time, so a failure only costs you the piece in flight.<br><br>The client first asks for an <b>upload session</b>: \"I'm about to send 3.8 GB\". The server returns a session URL. The client then sends the file in chunks (say 8 MB each), and the server confirms each one. If the connection drops, the client asks \"how much did you get?\", the server says \"the first 1,166 MB\", and the client resumes from there. Chunks go straight to <b>object storage</b> (a huge, cheap, durable store for files, like Google Cloud Storage or Amazon S3); the API only tracks the session.<br><br>Back to Pune: the upload stalls twice, and each time the creator loses at most one 8 MB chunk instead of the whole file. The cost is a little extra state (each session remembers its offset) and a protocol both sides must follow. A side benefit: the server can start checking the file while the end is still arriving.",
      a: "Moving house box by box: if the van breaks down, you don't unpack and start over. You just keep loading from the box you were holding."
    },
    {
      t: "A transcoding DAG, in parallel",
      c: "transcoding",
      b: "The raw file is now safe, but it's in whatever format the creator's camera produced. <b>Transcoding</b> means re-encoding the video into new formats: different resolutions (144p to 4K), different bitrates, and different <b>codecs</b> (compression schemes such as H.264, VP9 and AV1, which different devices support). Each combination is called a <b>rendition</b>. A single video might need 15–20 of them.<br><br>Encoding is slow. If one machine encoded a 20-minute 4K video into every rendition, it could take over an hour. So the pipeline splits the video into <b>segments</b> of a few seconds or minutes (cut at keyframes, so each segment can be encoded on its own), then runs one job per segment per rendition on <b>thousands of workers in parallel</b>. The work is laid out as a <b>DAG</b> (a directed acyclic graph, which is just a to-do list where some tasks must wait for others): split first, then encode everything in parallel, then stitch and package.<br><br>Example (illustrative): a 20-minute video in 1-minute segments, times 7 resolutions, is 140 independent jobs. With 64 workers, those finish in a couple of minutes instead of 70. And if one worker crashes, only its 30-second job is retried, not the whole video. The cost is orchestration: something has to track hundreds of jobs per video, retry failures and know when all the pieces are done.",
      a: "A kitchen where twenty cooks each make one dish at once, instead of one chef cooking the whole banquet alone."
    },
    {
      t: "Publish the low resolutions first",
      c: "transcoding",
      b: "Not all renditions are equally urgent. A fan who wants to watch right now would rather have 360p in three minutes than 4K in fifteen. So the scheduler puts <b>360p and audio at the front of the queue</b>, ahead of 1080p and 4K.<br><br>As soon as one complete rendition exists, the video's status flips to <b>watchable</b> and the player can offer it. Higher resolutions appear in the quality menu as they finish. That's how the fan in Delhi is watching at 10:06 while 4K is still being encoded.<br><br>The cost is that early viewers see lower quality for a while. For most videos that's a fine trade, because the first few minutes after upload are exactly when subscribers get notified and rush in.",
      a: "A restaurant that brings bread to the table while the main course is still cooking. Nobody stares at an empty plate."
    },
    {
      t: "Hot and cold storage",
      c: "object-storage",
      b: "Video popularity is extremely uneven. A small number of videos get most of the views, and a huge \"long tail\" of videos is watched a few times and then hardly ever again. Keeping all 15–20 renditions of every video on fast, expensive storage forever would cost a fortune.<br><br>So storage is tiered. Popular renditions live on fast storage and in edge caches. The long tail moves to cheaper, colder storage that's slower to read but costs much less per gigabyte. The original upload is kept safely so new renditions can always be made later.<br><br>You can go one step further and be <b>lazy</b>: don't create rare renditions (say, 4K in an old codec) until someone actually asks for them. The first viewer to request one waits a little longer, but the platform saves storage on millions of videos that will never need it.",
      a: "A bookshop keeps bestsellers on the front table and the rest in the back room. Ask for an obscure title and they'll fetch it, it just takes a minute."
    },
    {
      t: "Edge caches inside ISPs",
      c: "cdn",
      b: "Remember the 125 terabits per second? No single data centre can push that out, and even if it could, video crossing oceans would be slow and expensive. The answer is a <b>CDN</b> (content delivery network): many cache servers spread around the world that keep copies of popular content close to viewers.<br><br>Like Netflix's Open Connect, Google places caching servers <b>inside ISPs</b> (internet service providers, the companies that sell you your connection), a programme called Google Global Cache. When the fan in Delhi presses play on a popular video, the segments probably come from a server inside her mobile network, a few hops away. Only cache misses travel back to Google's data centres. This also saves the ISP money, because the same bytes don't have to cross its expensive outside links for every viewer.<br><br>The cost is coordination: thousands of caches to fill, monitor and update. And a brand-new viral video starts with cold caches everywhere, so the first wave of requests all miss at once (more on that in the failure section).",
      a: "Corner shops stocked with what the neighbourhood buys most. You don't drive to the central warehouse for milk."
    },
    {
      t: "Let the player pick the quality per segment",
      c: "abr",
      b: "A train's network speed changes every few seconds: 10 Mbps at a station, 1 Mbps in a cutting, nothing in a tunnel. If the player picked one quality at the start, it would either look bad all the time or stall whenever the signal dipped.<br><br><b>Adaptive bitrate streaming</b> (ABR) fixes this. Because each rendition is cut into short segments (a few seconds each) at the same boundaries, the player can switch between renditions at any segment boundary. It first downloads a <b>manifest</b>, a small file listing every rendition and where its segments live. Then, segment by segment, it measures how fast the last downloads were and how many seconds of video are already buffered, and picks the next segment's quality to match. YouTube uses the <b>DASH</b> standard for this.<br><br>Example: the fan's player is fetching 720p segments. Bandwidth drops, the buffer shrinks from 20 s to 8 s, so the player asks for 360p for the next few segments. Video keeps playing, slightly blurrier. When the train leaves the cutting, it climbs back up. The player also <b>pre-loads</b> a few segments ahead, so a short dip never reaches the screen. The cost: viewers sometimes notice quality changing, and every rendition must be cut at matching boundaries.",
      a: "A car with an automatic gearbox: it shifts down on hills and up on the flat, so you keep moving instead of stalling."
    },
    {
      t: "Count views asynchronously",
      c: "message-queue",
      b: "A view is an <b>event</b>, not a database update. Rather than touching a counter row on every view, players send small view pings into a log (Kafka-style: an append-only stream of events that many readers can consume). Writing to the end of a log is cheap and scales by adding partitions.<br><br>Stream processors then read that log and do the careful work. They drop duplicates (the same user refreshing ten times) and suspected bots. They add up counts in memory for a few seconds, then write <b>one batched increment</b> per video to <b>sharded counters</b>: instead of one counter row per video, keep many partial counters and add them up when displaying. A viral video's 50,000 views a second becomes a handful of writes.<br><br>The cost is that the number shown is <b>eventually consistent</b>: it might lag reality by seconds or minutes, and counts can be adjusted later when fraud checks finish. For a view counter, that's fine. Nobody's bank balance depends on it.",
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
      pro: "Watchable within minutes, right when subscribers rush in",
      con: "Early viewers see lower quality for a while"
    },
    {
      choice: "Approximate, batched view counts",
      pro: "No hot-row contention; bots and duplicates filtered before counting",
      con: "The count lags reality and can be revised later"
    },
    {
      choice: "Lazily create rare renditions",
      pro: "Saves storage on the long tail of rarely watched videos",
      con: "The first request for that rendition is slow"
    },
    {
      choice: "Segment-level parallel transcoding",
      pro: "Hours of encoding become minutes; a crash only retries one small job",
      con: "Needs an orchestrator to track hundreds of jobs per video and stitch them back"
    },
    {
      choice: "Caches inside ISPs",
      pro: "Bytes travel a few hops instead of across oceans; cheaper for everyone",
      con: "Thousands of boxes to fill and operate; new viral videos start with cold caches"
    },
    {
      choice: "Short segments for ABR",
      pro: "The player can react to bandwidth changes within seconds",
      con: "More files, larger manifests and slightly worse compression per segment"
    }
  ],
  takeaways: ["Make big uploads resumable: chunk them, acknowledge each chunk, and resume from the last stored byte.","Make processing parallel: split videos into independent segments so many workers share one video.","Publish the cheapest useful version first, and improve it in the background.","Separate the CPU-heavy ingest path from the bandwidth-heavy playback path; they scale differently.","Serve bytes from caches close to viewers, and let the player adapt quality per segment.","Tier storage by popularity; the long tail is most of your videos and little of your traffic.","Counters at scale are event streams aggregated in batches, not row updates."],
  quiz: [
    {
      q: "Why split a video into segments before transcoding?",
      o: ["To compress it","So thousands of workers can encode pieces in parallel","CDNs require it","To remove ads"],
      a: 1,
      why: "Parallel jobs turn hours into minutes, and a failed job only retries one small segment."
    },
    {
      q: "A popular video gets 50k views per second. How do you count them?",
      o: ["UPDATE views = views + 1 for each","Stream view events, dedupe, and add batched increments to sharded counters","Count once a month","Store every view in the video row"],
      a: 1,
      why: "Avoid a single hot row; aggregate events and write in batches."
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
    },
    {
      q: "An upload drops at 80% of a 4 GB file. With a resumable protocol, what happens next?",
      o: ["The creator starts over","The client asks how many bytes arrived and sends only the rest","The server guesses the missing part","The video is published without the end"],
      a: 1,
      why: "The session remembers the last stored byte, so only the missing part is sent."
    },
    {
      q: "A viewer's bandwidth drops from 8 Mbps to 1.5 Mbps mid-video. What does an ABR player do?",
      o: ["Stops and shows an error","Fetches the next segments from a lower-bitrate rendition","Re-downloads the whole video in 144p","Asks the server to re-encode"],
      a: 1,
      why: "Renditions share segment boundaries, so the player can switch quality at the next segment."
    },
    {
      q: "Why put cache servers inside ISPs' networks?",
      o: ["To encrypt the video","So popular bytes travel a few hops instead of crossing the internet for every viewer","To transcode videos","To count views"],
      a: 1,
      why: "Serving from nearby cuts latency and long-haul bandwidth, which is the dominant cost of video."
    }
  ],
  sources: ["YouTube official blog and press statistics (500 h/min, 1B hours/day)","Vitess: MySQL sharding, built at YouTube","Google: Argos video transcoding chips (2021)"],
  deep: [
    {
      h: "The resumable upload protocol",
      blocks: [
        ["img","An elderly man uses his smartphone to video record the large crowd gathered on Jinan Road (濟南路).jpg","On YouTube anyone with a phone is a broadcaster, so uploads arrive from every kind of network, including terrible ones."],
        ["p","Here's roughly how a resumable upload looks on the wire, modelled on the style of YouTube's public upload API. Read the comments on the right; the important moment is the line that asks \"how much do you have?\""],
        ["code","POST /upload/videos?uploadType=resumable   { title, size: 3.8 GB }\n→ 200  Location: /upload/session/abc123\n\nPUT /upload/session/abc123   Content-Range: bytes 0-8388607/3800000000\n→ 308 Resume Incomplete      Range: bytes=0-8388607\n…connection drops…\nPUT /upload/session/abc123   Content-Range: bytes */3800000000     (\"how much do you have?\")\n→ 308   Range: bytes=0-1166016511                                   (resume from here)\n…\n→ 201 Created { video_id: \"dQw4w9WgXcQ\", status: \"processing\" }"],
        ["p","Each chunk is stored as it arrives. The session remembers the offset, so a phone that loses signal resumes instead of restarting, which matters when uploads are gigabytes over mobile data."],
        ["tip","How big should a chunk be? Too small (say 64 KB) and you spend more time on request overhead than on data. Too big (say 1 GB) and every failure throws away a lot of work. A few megabytes is a common middle ground. Distributed file systems face the same question: HDFS settled on 128 MB blocks for large files by benchmarking real workloads."]
      ]
    },
    {
      h: "The transcoding pipeline in detail",
      blocks: [
        ["steps",[["Validate and probe","Check that the file is a real video; read its duration, codec, frame rate and resolution."],["Split","Cut at keyframes into independent segments."],["Fan out","Create one job per segment × rendition, scheduling 360p and audio first."],["Encode","Workers pull jobs from the queue. A failed job is simply retried, because segments are independent."],["Assemble and package","Stitch segments per rendition, write DASH/HLS manifests, generate thumbnails and storyboards."],["Publish","Update the metadata status as rungs become ready, and notify subscribers."]]],
        ["p","Why cut at <b>keyframes</b>? Most frames in compressed video are stored as \"what changed since the previous frame\". A keyframe is a complete picture that doesn't depend on anything before it. Cut anywhere else and the segment's first frames would refer to a picture that's in a different segment, on a different worker."],
        ["chart",{"type":"line","title":"Time until a 20-minute video is fully processed","x":{"label":"encoding workers","values":[1,2,4,8,16,32,64]},"y":{"label":"minutes","log":true},"series":[{"name":"Chunked (1-min segments)","values":[70,35,18,9,5,3,2]},{"name":"One encoder per video","values":[70,70,70,70,70,70,70]}],"note":"Illustrative: 140 segment-jobs at 30 s each, plus about a minute to split and assemble. Without chunking, extra workers can't help a single video."}],
        ["p","Notice the curve flattens near the end. With 64 workers the encoding itself is under a minute, but splitting, assembling and packaging still take time. That fixed overhead is why you can't make a video ready in zero seconds just by adding machines."],
        ["extra","At YouTube's scale even CPUs get expensive: Google has described custom video-transcoding chips (\"Argos\") that encode many times more efficiently than general-purpose servers."]
      ]
    },
    {
      h: "How the player streams: manifests, segments and ABR",
      blocks: [
        ["p","Once a video is watchable, playback is surprisingly simple on the server side: it's just files. The clever part is in the player."],
        ["code","manifest for video dQw4w9WgXcQ (simplified)\n  audio  128 kbps      segments: a/1.m4s a/2.m4s …\n  144p   ~0.1 Mbps     segments: v144/1.m4s …\n  360p   ~0.7 Mbps     segments: v360/1.m4s …\n  720p   ~2.5 Mbps     segments: v720/1.m4s …\n  1080p  ~5 Mbps       segments: v1080/1.m4s …\n  2160p  ~20 Mbps      segments: v2160/1.m4s …\n  every segment ≈ a few seconds, same boundaries across renditions\n\n(bitrates are illustrative)"],
        ["steps",[["Fetch the manifest","The player learns which renditions exist and where their segments are."],["Start low, start fast","It fetches the first segment at a modest quality so playback begins within a second or two."],["Measure","After each segment, it notes how fast the download was and how many seconds are buffered."],["Choose the next rung","Plenty of bandwidth and a full buffer? Step up. Buffer draining? Step down before it runs dry."],["Stay ahead","It pre-loads several segments ahead of the playhead and throws away segments far behind it to save memory."]]],
        ["p","Seeking works the same way. Jump to minute 14 and the player simply asks for the segment that covers minute 14. Preview thumbnails while scrubbing come from <b>storyboards</b>: small sprite images generated during transcoding, one tiny frame every few seconds."],
        ["tip","Live streams use the same machinery with one twist: the manifest keeps growing. The player re-fetches it every few seconds to learn about new segments. Shorter segments mean lower delay behind the live moment, at the cost of more requests."]
      ]
    },
    {
      h: "Data model",
      blocks: [
        ["table",["Store","Contents","Notes"],[["videos (sharded MySQL via Vitess)","video_id, channel_id, title, status, duration, created_at","Vitess, which shards MySQL, was born at YouTube"],["renditions","video_id, resolution, codec, segment manifest URL","Added as each rung finishes"],["Object storage","Raw upload + encoded segments","Hot vs cold tiers"],["view_counts (sharded counters)","video_id → N partial counters","Sum the shards to display"],["Comments / likes","Separate services and stores","Scale independently"]]],
        ["p","Notice how little of the data is in the database. Metadata (titles, owners, status) is tiny: a few kilobytes per video. The video bytes themselves, petabytes a day, live in object storage, and the database only stores where to find them. That split is why a sharded MySQL could keep up: it never touches the heavy data."],
        ["tip","<b>Sharded counters:</b> instead of one row per video, keep N counter rows (video_id, shard) and increment a random shard. Reading the total sums N rows, which can be cached. That spreads the write contention N ways."],
        ["extra","Vitess started at YouTube around 2010 because a single MySQL setup couldn't keep up. It sits in front of many MySQL servers, routes each query to the right shard, and lets the application pretend it's talking to one database. It's now an open-source project used well beyond YouTube."]
      ]
    },
    {
      h: "Counting views",
      blocks: [
        ["chart",{"type":"bar","title":"Writes to the counter store per second for one viral video","data":[["UPDATE per view (50k views/s)",50000],["Batched every 10 s across 100 aggregators",10]],"log":true,"highlight":1}],
        ["list",["Players send pings at watch milestones (e.g. after ~30 s), not on page load.","Stream processors drop duplicates (same user and video within a window) and suspected bots.","Aggregators add counts locally and flush every few seconds as one increment per video.","Displayed counts come from a cache refreshed periodically. Exactness is traded for scale on purpose."]],
        ["p","Look at the chart's numbers again: 50,000 writes a second becomes 10. That's a 5,000× reduction, and it's the difference between a database on fire and a database that doesn't notice the video went viral. All it costs is a few seconds of delay before the count moves."],
        ["warn","<b>The Gangnam Style lesson.</b> In December 2014 PSY's video passed 2,147,483,647 views, the largest number a signed 32-bit integer can hold. YouTube had already moved the counter to 64 bits. The general rule: when you pick a number type for something that only grows, ask what happens if your wildest guess is off by a factor of 100."]
      ]
    },
    {
      h: "Failure modes",
      blocks: [
        ["table",["Failure","Mitigation"],[["Upload connection drops","Resumable sessions continue from the last stored byte"],["Encoder job crashes","Idempotent segment jobs are retried on another worker"],["Transcode backlog after a spike","Prioritise low rungs and popular channels; autoscale workers"],["Edge cache miss storm (a new viral video)","Request coalescing at the edge; pre-warm caches for big creators"],["Bot view inflation","Filter in the stream pipeline before counting"]]],
        ["p","The miss storm deserves a closer look. A huge creator publishes, and within a minute a million subscribers press play. Every edge cache is empty for this video, so every request misses and goes upstream at once. Two fixes work together. <b>Request coalescing</b> means each cache sends one upstream request per segment and makes the other waiting viewers share the answer. <b>Pre-warming</b> means pushing the first segments of big creators' new videos to the edges before the notification goes out."],
        ["p","Why must encoder jobs be <b>idempotent</b>? A worker might finish a job, write its output, and crash before reporting \"done\". The queue then hands the job to someone else. If the job always writes the same output file for the same segment and rendition, running it twice is harmless: the second run simply overwrites identical bytes."]
      ]
    },
    {
      h: "Numbers that matter",
      blocks: [
        ["table",["Number","Value","What it tells you"],[["Uploaded per minute","500 hours (reported)","Ingest never stops; the pipeline must run continuously"],["Watched per day","1 billion hours (2017, reported)","Playback dwarfs uploads, so delivery dominates cost"],["Renditions per video","≈ 15–20 (illustrative)","Every uploaded hour multiplies into many encoded hours"],["Average egress","≈ 125 Tbps (illustrative)","Only a worldwide edge network can serve this"],["Upload chunk","a few MB (illustrative)","Small enough to retry cheaply, big enough to be efficient"],["Largest signed 32-bit integer","2,147,483,647","The view count Gangnam Style passed in 2014"]]]
      ]
    },
    {
      h: "Interview corner",
      blocks: [
        ["p","\"Design YouTube\" is a classic. It's too big to cover fully in 45 minutes, so say early which parts you'll focus on: upload, processing, playback and view counts."],
        ["steps",[["Minutes 0–5: scope","Upload, watch, count. Put search, recommendations and comments out of scope unless asked."],["Minutes 5–10: estimates","Upload volume, renditions, egress. Conclude out loud: ingest is CPU-bound, playback is bandwidth-bound."],["Minutes 10–18: upload","Resumable chunked sessions straight into object storage."],["Minutes 18–28: processing","Segment, fan out a DAG of jobs, low rungs first, idempotent retries, publish when one rung is ready."],["Minutes 28–38: playback","Manifest plus segments, ABR in the player, CDN and ISP caches, tiered storage."],["Minutes 38–45: counting and failures","Event log, dedupe, batched sharded counters. Then walk through the failure table."]]],
        ["list",["Live streaming? → real-time segmenting, a constantly updating manifest, low-latency players (see the video-streaming lesson).","Copyright matching? → fingerprint every upload's audio and video and compare against a reference index.","Recommendations? → offline models on watch history plus online candidate ranking, served separately from playback.","Deleting a video? → mark it removed in metadata immediately; purge storage and caches asynchronously.","Why not store videos in the database? → databases are for small, structured, frequently updated data; video bytes belong in object storage.","Why not encode every rendition up front for every video? → most videos are rarely watched; lazy encoding saves storage on the long tail.","How do you keep playback starting fast? → small first segment at modest quality, nearby caches, and a manifest that's cached too."]]
      ]
    }
  ]
});
