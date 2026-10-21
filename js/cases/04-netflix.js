/* Blueprint case study — Netflix: Design Video Streaming. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "netflix",
  app: "Netflix",
  icon: "🎬",
  color: "#e50914",
  color2: "#ff5f6d",
  title: "Design Video Streaming",
  tagline: "Press play and get HD in about a second, on a train, in a stadium, or on a slow hotel Wi-Fi.",
  level: "Advanced",
  minutes: 31,
  concepts: ["cdn","abr","transcoding","chaos","object-storage"],
  stats: [
    {v: 300,suf: "M+",label: "paid memberships (Netflix, 2025)",kind: "Reported"},
    {v: 250,suf: " Tbps",label: "50M streams × 5 Mbps",kind: "Estimate"},
    {v: 2,pre: "~",suf: " s",label: "per-segment buffer decisions",kind: "Design"}
  ],
  story: "It's Friday night. Tens of millions of people press play within the same hour. A single HD stream is millions of bits per second, and together that's hundreds of terabits per second.<br><br>No data center on Earth can push that across the internet backbone. Netflix's answer is to <b>move the movie close to you before you ask for it</b>, then <b>let your player adapt the quality every few seconds</b>.",
  requirements: {
    functional: ["Browse, search and get recommendations","Play video on thousands of device types","Resume across devices","Multiple audio and subtitle tracks"],
    nonFunctional: ["Start playback in about a second","Rebuffering is the #1 sin: avoid stalls","Survive failures of entire services or regions","Keep bandwidth costs sane"]
  },
  estimate: [
    ["Peak concurrent streams","assumption","50 M"],
    ["Average bitrate","assumption (mix of SD/HD/4K)","5 Mbps"],
    ["Peak egress","50M × 5 Mbps","≈ 250 Tbps"],
    ["Files per title","resolutions × codecs × audio × subs","hundreds+"]
  ],
  estimateNote: "Insight: 250 Tbps can't come from one place. The video must be served from thousands of edge servers, ideally inside your ISP's own network.",
  naive: {
    title: "\"Stream the MP4 from our data center\"",
    desc: "One high-quality file per title, served over HTTP from a central origin.",
    breaks: ["Distance adds latency, and long-haul links congest at peak, so playback stalls.","One fixed bitrate is too much for weak connections (buffering) and too little for fiber (blurry).","Egress of hundreds of Tbps from one origin is physically and financially impossible."]
  },
  steps: [
    {
      t: "Split the control plane from the data plane",
      c: "chaos",
      b: "Everything <i>before</i> you press play (sign-in, browsing, recommendations, choosing what to stream) runs as microservices in the cloud (AWS). The <b>video bytes</b> come from Netflix's own CDN, <b>Open Connect</b>. Each plane scales independently.",
      a: "The ticket office and the cinema screens are different buildings."
    },
    {
      t: "Transcode once, into many shapes",
      c: "transcoding",
      b: "A studio master is chopped into chunks and encoded <b>in parallel</b> into a ladder of resolutions and bitrates, for multiple codecs and devices. <b>Per-title encoding</b> tunes the ladder to the content: an animated show looks great at bitrates that would make a grainy action film look blocky.",
      a: "One manuscript printed as a paperback, a hardcover and large print, by many printers at once."
    },
    {
      t: "Pre-position content at the edge",
      c: "cdn",
      b: "Open Connect Appliances sit <b>inside ISPs</b> and at internet exchanges. During off-peak hours they're <b>proactively filled</b> with the titles predicted to be popular in that region tomorrow. At peak, most traffic never crosses the backbone.",
      a: "Stocking the corner store overnight with what the neighborhood will want for breakfast."
    },
    {
      t: "Steer each viewer to the best server",
      c: "load-balancing",
      b: "When you press play, the control plane checks which nearby appliances are healthy, close, and actually <b>have your file</b>, and returns a ranked list of URLs. If one fails mid-stream, the player switches to the next.",
      a: "A GPS that routes you to the nearest open store that has your item in stock."
    },
    {
      t: "Adapt the bitrate every segment",
      c: "abr",
      b: "Video is served as short segments. The player continuously estimates throughput and watches its <b>buffer</b>. Healthy buffer and fast network: step up. Buffer draining: step down before it hits zero. A brief blurry patch is far better than a spinner.",
      a: "Shifting gears on a bike: easier gear on the hill, harder gear on the flat, and you never stop pedaling."
    },
    {
      t: "Design for failure, and practice it",
      c: "chaos",
      b: "Netflix built <b>Chaos Monkey</b> to randomly kill production instances, forcing every service to tolerate loss. <b>Circuit breakers</b> (popularized by its Hystrix library) stop calling a sick dependency and serve a fallback: if personalized rows fail, show popular titles instead of an error.",
      a: "Fire drills on a random Tuesday, plus fuses that trip before the whole house goes dark."
    }
  ],
  diagram: {
    nodes: [
      {
        id: "tv",
        x: 90,
        y: 240,
        label: "Your TV / phone",
        sub: "player",
        kind: "client",
        icon: "📺",
        desc: "Runs the ABR algorithm: picks quality per segment from throughput + buffer."
      },
      {
        id: "ctl",
        x: 320,
        y: 80,
        label: "Control Plane",
        sub: "AWS microservices",
        kind: "service",
        icon: "☁️",
        desc: "Auth, catalog, recommendations, playback licensing and steering."
      },
      {
        id: "steer",
        x: 560,
        y: 80,
        label: "Steering",
        sub: "picks best OCAs",
        kind: "service",
        icon: "🧭",
        desc: "Chooses healthy, nearby appliances that hold the requested files."
      },
      {
        id: "oca",
        x: 320,
        y: 360,
        label: "Open Connect (in ISP)",
        sub: "edge appliance",
        kind: "edge",
        icon: "📡",
        desc: "Serves the video segments from inside your ISP's network."
      },
      {
        id: "ix",
        x: 560,
        y: 360,
        label: "IXP Appliance",
        sub: "fallback edge",
        kind: "edge",
        icon: "🛰️",
        desc: "Larger cache at an internet exchange; fills ISP caches and serves misses."
      },
      {
        id: "enc",
        x: 800,
        y: 80,
        label: "Encoding Pipeline",
        sub: "parallel chunks",
        kind: "queue",
        icon: "🎞️",
        desc: "Turns studio masters into many renditions using per-title encoding."
      },
      {
        id: "s3",
        x: 800,
        y: 360,
        label: "Origin Storage",
        sub: "all renditions",
        kind: "db",
        icon: "🗄️",
        desc: "Master copies of every encoded file. Edge caches fill from here off-peak."
      }
    ],
    flows: [
      {
        name: "Press play",
        steps: [
          ["tv","ctl","Play \"Stranger Things S1E1\""],
          ["ctl","steer","Which edges are best for this viewer?"],
          ["steer","tv","Ranked URLs: ISP appliance #1, IXP #2"],
          ["tv","oca","GET segment 1 @ 720p (fast start)"],
          ["oca","tv","Segment bytes from inside the ISP"],
          ["tv","oca","Throughput looks great: next segments @ 1080p"]
        ]
      },
      {
        name: "Nightly fill",
        steps: [
          ["enc","s3","New episode encoded into dozens of renditions"],
          ["s3","ix","Off-peak: fill the IXP caches"],
          ["ix","oca","Pre-position tomorrow's predicted hits"]
        ]
      }
    ]
  },
  lab: {
    sim: "abr",
    title: "Adaptive Bitrate Lab",
    hint: "You are the network. Drag bandwidth up and down (or turn on the storm) and watch the player shift quality to protect its buffer. Compare edge vs. origin startup time."
  },
  tradeoffs: [
    {
      choice: "Own CDN inside ISPs",
      pro: "Lower latency and cost at massive scale; ISPs save transit",
      con: "Huge hardware and partnership investment"
    },
    {
      choice: "Conservative ABR",
      pro: "Fewer stalls",
      con: "Sometimes lower quality than the network could carry"
    },
    {
      choice: "Microservices + chaos",
      pro: "Teams move fast; failures are contained",
      con: "Operational complexity; needs strong observability"
    }
  ],
  takeaways: ["Move bytes close to users before they ask (predictive caching).","Let the client adapt: it sees the network best.","Separate control plane and data plane; scale each on its own terms."],
  quiz: [
    {
      q: "Your buffer is dropping fast. What should the ABR player do?",
      o: ["Switch to a higher bitrate","Switch to a lower bitrate for upcoming segments","Pause and restart","Re-download the whole video"],
      a: 1,
      why: "Lowering quality refills the buffer and avoids a stall, which viewers hate most."
    },
    {
      q: "Why place servers inside ISPs?",
      o: ["Legal requirement","Bytes travel a short distance and skip congested long-haul links","ISPs can't route traffic","To store user passwords"],
      a: 1,
      why: "Shorter paths mean lower latency, fewer bottlenecks, and lower transit costs for everyone."
    },
    {
      q: "What is per-title encoding?",
      o: ["Encrypting each title separately","Tuning the bitrate ladder to each title's visual complexity","Charging per title","Titles in many languages"],
      a: 1,
      why: "Simple content reaches the same quality with far fewer bits."
    },
    {
      q: "Personalized recommendations are down. Best behavior?",
      o: ["Show an error page","A circuit breaker serves a fallback such as popular titles","Retry forever","Log the user out"],
      a: 1,
      why: "Graceful degradation keeps people watching while the dependency recovers."
    },
    {
      q: "Why does playback start at modest quality?",
      o: ["To save money","A small first segment downloads fast, minimising startup time, then ABR climbs","Licences require it","TVs are slow"],
      a: 1,
      why: "Time-to-first-frame matters most; quality catches up within seconds."
    },
    {
      q: "Why fill Open Connect appliances at night?",
      o: ["Electricity is cheaper","Off-peak bandwidth is free capacity, so peak traffic stays inside the ISP","Encoding happens at night","Security"],
      a: 1,
      why: "Move bytes when links are idle, serve them locally when everyone watches."
    }
  ],
  sources: ["Netflix Open Connect overview (openconnect.netflix.com)","Netflix Tech Blog: Per-Title Encode Optimization; Chaos Monkey; Hystrix","Netflix Q4 2024 letter: 300M+ paid memberships"],
  deep: [
    {
      h: "What happens when you press play",
      blocks: [
        ["img","TV remote control in hand 20170128.jpg","Between pressing play and seeing the first frame, a dozen services are consulted and the nearest appliance holding the file is chosen."],
        ["steps",[["Authenticate and authorise","The control plane checks the account, the plan (HD/4K) and the concurrent-stream limit."],["Choose renditions","Based on the device (codecs, screen) and the plan, pick the ladder of encodes this device may use."],["DRM licence","The player gets a licence so it can decrypt the protected segments."],["Steer","The steering service returns ranked URLs of nearby Open Connect appliances that hold these files."],["Start low, then climb","The first segments are fetched at modest quality for a fast start; ABR steps up as the buffer fills."]]]
      ]
    },
    {
      h: "The encoding pipeline",
      blocks: [
        ["flow",{"nodes":[{"id":"m","x":90,"y":225,"label":"Studio master","sub":"huge source file","kind":"client","icon":"🎬","desc":"Very high bitrate source."},{"id":"sp","x":300,"y":225,"label":"Splitter","sub":"chunks of a few minutes","kind":"service","icon":"✂️","desc":"Cuts on scene boundaries so chunks encode independently."},{"id":"e","x":520,"y":90,"label":"Encoders ×1000s","sub":"parallel","kind":"service","icon":"🎞️","desc":"Each chunk × each resolution × each codec."},{"id":"qc","x":520,"y":360,"label":"Quality check","sub":"per-title metrics","kind":"service","icon":"🔍","desc":"Measures visual quality per bitrate to build the ladder."},{"id":"pk","x":740,"y":225,"label":"Packager + DRM","sub":"DASH / HLS","kind":"queue","icon":"📦","desc":"Segments, manifests and encryption."},{"id":"o","x":920,"y":225,"label":"Origin storage","sub":"all renditions","kind":"db","icon":"🗄️","desc":"Feeds Open Connect at night."}],"flows":[{"name":"Encode a new episode","steps":[["m","sp","Ingest"],["sp","e","Fan out chunks to thousands of workers"],["e","qc","Score quality at each bitrate"],["qc","pk","Assemble the per-title ladder"],["pk","o","Store packaged, encrypted renditions"]]}]},"Parallel chunk encoding turns days of encoding into hours."],
        ["chart",{"type":"bar","title":"A typical bitrate ladder (illustrative)","data":[["240p",0.3],["360p",0.75],["480p",1.75],["720p",3],["1080p",5.8],["4K",16]],"unit":"Mbps","highlight":4,"note":"Per-title encoding moves these rungs: a cartoon might reach 1080p quality at far less than 5.8 Mbps."}]
      ]
    },
    {
      h: "Open Connect: filling the edge",
      blocks: [
        ["list",["<b>Two tiers:</b> appliances embedded <i>inside</i> ISPs (closest to viewers) and larger ones at internet exchange points.","<b>Proactive fill:</b> each night, in the region's quiet hours, appliances download the titles predicted to be popular there tomorrow. Peak-hour traffic then rarely leaves the ISP.","<b>Health-aware steering:</b> appliances report load and health constantly, and steering avoids busy or failing ones mid-session."]],
        ["tip","The win for ISPs: Netflix traffic stays inside their network instead of crossing expensive transit links, which is why ISPs host the hardware."]
      ]
    },
    {
      h: "Resilience in the control plane",
      blocks: [
        ["table",["Technique","What it does"],[["Chaos Monkey","Randomly kills production instances so every service tolerates loss"],["Circuit breakers + fallbacks","If personalisation fails, show popular rows rather than an error"],["Multi-region, active-active","Traffic can be shifted out of a failing cloud region"],["Bulkheads","Separate thread pools per dependency so one slow service can't starve the rest"]]]
      ]
    },
    {
      h: "Interview follow-ups",
      blocks: [
        ["list",["Live events? → segments must be encoded in real time, the manifest updates constantly, and everyone requests the same segment at once (see the video lesson).","Downloads for offline viewing? → the same renditions with a time-limited offline DRM licence.","\"Continue watching\"? → the player posts its position every few seconds to a small, eventually consistent store.","Thumbnails and artwork? → personalised images chosen by a separate service and served from the CDN."]]
      ]
    }
  ]
});
