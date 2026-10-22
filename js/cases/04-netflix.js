/* Blueprint case study — Netflix: Design Video Streaming. Architectures are simplified teaching models from public sources. */
BP.CASES.push({
  id: "netflix",
  app: "Netflix",
  icon: "🎬",
  color: "#e50914",
  color2: "#ff5f6d",
  title: "Design Video Streaming",
  tagline: "Press play and get a picture in about a second, whether you're on fibre at home, a crowded train, or the worst hotel Wi-Fi in the world.",
  level: "Advanced",
  minutes: 32,
  concepts: ["cdn","abr","transcoding","chaos","object-storage"],
  stats: [
    {v: 300,suf: "M+",label: "paid memberships (Netflix, 2025)",kind: "Reported"},
    {v: 250,suf: " Tbps",label: "peak traffic in our estimate: 50M streams × 5 Mbps",kind: "Estimate"},
    {v: 2,pre: "~",suf: " s",label: "of video per quality decision, roughly",kind: "Design"}
  ],
  story: "It's Friday night. You finally sit down, pick a show, and press play. A second later the opening scene is on your screen. You don't think about it at all, and that is exactly the point.<br><br>Now zoom out. At the same moment, tens of millions of other people are doing the same thing. One HD stream is a few million bits every second. Multiply by tens of millions and you get <b>hundreds of terabits per second</b>, more than any single data center on the planet could ever push out of its front door.<br><br>And those viewers are not on the same kind of connection. One is on gigabit fibre with a 65-inch TV. One is on a phone in a train that keeps entering tunnels. One is in a hotel where forty guests share a router from 2009. All of them expect it to <i>just work</i>.<br><br>So this case is really three puzzles stacked on top of each other. Where do the video bytes live so they're close to everyone? How does one movie turn into the right file for every screen and every network? And how does the whole thing keep running when, every day, some server somewhere is on fire?<br><br>Netflix's answers, in one breath: <b>move the movie close to you before you ask for it</b>, <b>let your player change the quality every few seconds</b>, and <b>break things on purpose so nothing surprises you</b>. Let's build that up one decision at a time.<br><br><span class=\"muted small\">The architecture here is a simplified teaching model based on Netflix's public talks, blog posts and docs, not a full description of its internal systems.</span>",
  requirements: {
    functional: ["Browse, search and get recommendations","Play video on thousands of different devices (TVs, phones, laptops, game consoles)","Resume where you left off, even on a different device","Pick audio languages and subtitles","Download some titles to watch offline"],
    nonFunctional: ["Start playing in about a second","Rebuffering (the spinning wheel) is the worst sin, so avoid stalls above all","Keep working when a whole service, or even a whole cloud region, fails","Keep the bandwidth bill sane at hundreds of terabits per second","Picture quality as high as each connection can honestly carry"]
  },
  estimate: [
    ["Peak concurrent streams","assumption","50 M"],
    ["Average bitrate","assumption (a mix of SD, HD and 4K)","5 Mbps"],
    ["Peak egress (data going out)","50M × 5 Mbps","≈ 250 Tbps"],
    ["One hour of HD at 5 Mbps","5 Mb/s × 3,600 s ÷ 8","≈ 2.25 GB"],
    ["Files per title","resolutions × codecs × audio tracks × subtitles","hundreds or more"]
  ],
  estimateNote: "What do these numbers tell us? First, 250 Tbps is not a \"buy a bigger server\" problem. A very good server might push 100 Gbps, so you'd need thousands of them at once, and the long-distance internet links between continents and cities can't carry that much traffic from one place anyway. The video has to be served from <b>thousands of machines spread out near viewers</b>, ideally inside the viewer's own internet provider.<br><br>Second, \"hundreds of files per title\" tells you that one movie is not one file. Every device and every network speed needs its own version, which means a big encoding job up front and a lot of storage. Storage is cheap compared with bandwidth, so that's a trade Netflix happily makes.",
  naive: {
    title: "\"Stream the MP4 from our data center\"",
    desc: "The first design almost everyone draws: put one high-quality MP4 file per title on a big storage server in one data center, and when someone presses play, send them the file over HTTP. It's how you'd share a home video with a friend, and for a few hundred viewers it works fine. The trouble starts when the viewers are spread across the world and there are millions of them at once.",
    breaks: ["<b>Distance hurts.</b> A viewer in Mumbai streaming from a data center in Virginia waits about 200 ms for every round trip, and the long-haul links in between get congested at peak hours. Congestion means the download slows below the video's bitrate, and the player stalls.","<b>One bitrate fits nobody.</b> Pick 5 Mbps and the person on a 2 Mbps phone connection buffers every ten seconds. Pick 1 Mbps and the person with fibre and a 4K TV gets a blurry mess. And the right answer changes minute to minute as the train enters a tunnel.","<b>The physics and the bill don't work.</b> 250 Tbps out of one building would need thousands of 100 Gbps links. Even if you could build it, paying internet transit prices for every byte would cost a fortune.","<b>One file for every device.</b> An old smart TV may not decode the newest codec, a phone doesn't need 4K, and some devices need a specific format and protection scheme. One MP4 can't satisfy all of them."]
  },
  steps: [
    {
      t: "Split the control plane from the data plane",
      c: "chaos",
      b: "Look at what actually happens in a streaming app, and you'll notice two very different kinds of work. One kind is small and clever: signing in, loading your home screen, ranking recommendations, checking your plan, deciding which file you should get. The other kind is big and dumb: shovelling gigabytes of video bytes down a pipe as fast as possible.<br><br>Netflix splits these into two separate systems. The <b>control plane</b> is everything <i>before</i> the video starts, and it runs as hundreds of small services (microservices) on AWS, Amazon's cloud. The <b>data plane</b> is the video itself, and it comes from Netflix's own content delivery network, called <b>Open Connect</b>.<br><br>Why bother? Because they scale for different reasons. The control plane cares about requests per second and smart logic, so it wants flexible cloud servers it can add and remove. The data plane cares about raw bandwidth near viewers, so it wants racks of disks sitting inside internet providers. Mixing them would force you to pay for the worst of both.<br><br>The cost is that you now run two very different systems, and they have to agree on things like \"which servers have this file\". We'll see how that handshake works in a moment.",
      a: "A cinema's ticket office and its screens are in different buildings. The ticket office handles questions, payments and seat choices; the screens just show the film. You'd never make the projector booth also sell popcorn."
    },
    {
      t: "Transcode once, into many shapes",
      c: "transcoding",
      b: "A studio delivers a film as a giant master file, often hundreds of gigabytes. Nobody can stream that. So before a title goes live, Netflix <b>transcodes</b> it: it re-encodes the master into many smaller versions called <b>renditions</b>, at different resolutions (240p up to 4K) and bitrates, using different <b>codecs</b> (the compression formats devices can decode, such as H.264, HEVC and AV1). The full set of quality levels is called a <b>bitrate ladder</b>.<br><br>Encoding a two-hour film on one machine would take ages, so the pipeline chops the master into chunks of a few minutes each and encodes all of them <b>in parallel</b> across thousands of machines. Days of work become hours.<br><br>Then comes a clever trick, <b>per-title encoding</b>, which Netflix described publicly in 2015. Instead of using the same ladder for everything, it measures how complex each title looks. A flat, clean cartoon can look perfect at 1080p with very few bits. A grainy, dark action film full of explosions needs far more bits to look as good. So each title gets its own ladder, and simple shows save a lot of bandwidth for free.<br><br>The cost is a huge amount of compute up front and a lot of files to store. But you encode a title once and stream it millions of times, so that trade is a good one.",
      a: "One manuscript printed as a paperback, a hardcover, a large-print edition and an audiobook, by many printers at once, so every reader gets the version that suits them."
    },
    {
      t: "Pre-position content at the edge",
      c: "cdn",
      b: "Here's the biggest idea in the whole design. If the video can't come from one place, put copies of it <b>close to viewers</b>. A system that keeps copies of content near users is a <b>CDN</b> (content delivery network). Most companies rent one. Netflix built its own, Open Connect, starting around 2012.<br><br>Open Connect is made of servers called <b>Open Connect Appliances</b> (OCAs): boxes packed with disks and network cards. Netflix offers them to internet providers (ISPs) to install <i>inside their own networks</i>, and also places bigger ones at <b>internet exchange points</b>, the buildings where many networks meet and swap traffic. Your Friday night show probably travels only a few kilometres, from a box in your ISP's building to your router.<br><br>The neat part is <b>when</b> the boxes get filled. Netflix knows a lot about what people will watch tomorrow: a new season drops, a show is trending in Brazil, a film is popular in Japan. So each night, during that region's quiet hours, the appliances download the titles predicted to be popular there. When the evening rush arrives, most bytes never touch the long-distance internet at all.<br><br>The cost: designing hardware, shipping it around the world and working with thousands of ISPs is a huge investment. It only pays off at Netflix's size.",
      a: "A corner shop gets its delivery at 5 a.m. with exactly what the neighbourhood buys for breakfast, so at 8 a.m. nobody has to drive to the central warehouse for milk."
    },
    {
      t: "Steer each viewer to the best server",
      c: "load-balancing",
      b: "Having thousands of appliances creates a new question: which one should <i>you</i> talk to? It has to be close to you, healthy, not overloaded, and, most important for us, it must actually <b>hold the file you want</b>. A small appliance inside a little ISP can't store the whole catalogue.<br><br>That decision is called <b>steering</b>, and it lives in the control plane. Appliances constantly report their health, load and which files they hold. When you press play, the steering service looks at where you are on the network, picks the best few appliances that have your renditions, and hands your player a <b>ranked list of URLs</b>.<br><br>Say the list is: appliance inside your ISP first, a bigger one at the nearby exchange second. Your player starts with the first. If that box gets slow or dies halfway through an episode, the player simply moves to the next URL in the list. You might see a brief quality dip, but not an error.<br><br>The cost is that steering has to be fast and accurate, and the health data it relies on is always a few seconds old. Giving the player backup options is what makes slightly stale data good enough.",
      a: "A sat-nav that sends you to the nearest open shop that actually has your item in stock, and already has the second-nearest one loaded in case the first is closed."
    },
    {
      t: "Adapt the bitrate every segment",
      c: "abr",
      b: "Now the bytes are close by. But your network still changes from second to second. The fix is <b>adaptive bitrate streaming</b> (ABR). The video isn't sent as one long file; each rendition is cut into short <b>segments</b>, a few seconds of video each. Before each segment, the player decides which quality to fetch.<br><br>How does it decide? It watches two things. One is <b>throughput</b>: how fast the last few segments downloaded. The other is the <b>buffer</b>: how many seconds of video are already downloaded and waiting to be shown. A big buffer is a safety cushion. If the buffer is healthy and the network is fast, the player steps up a rung. If the buffer is draining, it steps down <i>before</i> it hits zero, because zero is the spinning wheel.<br><br>Tiny example (numbers made up): you're watching at 1080p (5.8 Mbps) with 20 seconds in the buffer. Your train enters a tunnel and throughput drops to 2 Mbps. The buffer starts shrinking: 20 s, 16 s, 12 s. The player switches to 480p (1.75 Mbps), which the network can keep up with, and the buffer stops falling. Out of the tunnel, throughput jumps back, the buffer refills, and the player climbs back up. You saw a slightly softer picture for half a minute. You never saw a spinner.<br><br>Notice that the <b>client</b> makes this choice, not the server. The player is the only one that can see the network from your side of the pipe. The cost is that the player logic becomes subtle, and a too-greedy player causes stalls while a too-timid one wastes good bandwidth.",
      a: "Changing gears on a bike: an easier gear up the hill, a harder gear on the flat, and the whole point is that you never stop pedalling."
    },
    {
      t: "Start fast, then climb",
      c: "abr",
      b: "The first second after you press play is special. Your buffer is empty, so the player has no cushion at all, and it doesn't yet know how fast your network is. What should it fetch first?<br><br>The answer is usually: something modest. A small first segment at, say, 720p downloads quickly, so the picture appears fast. Within a few segments the player has measured your throughput, the buffer has grown, and it starts climbing to 1080p or 4K. Most people never notice the first few seconds were a bit softer.<br><br>A lot of other work happens in parallel to make that first second short: the app can prefetch information for the title you're hovering over, the licence for decrypting the video can be requested early, and the steering answer is ready before the first segment is asked for.<br><br>The cost is a few seconds of lower quality at the start, which almost every viewer prefers to staring at a black screen.",
      a: "A runner doesn't sprint from the blocks at full stride. Short quick steps first, then longer strides once they're moving."
    },
    {
      t: "Design for failure, and practice it",
      c: "chaos",
      b: "With hundreds of services and thousands of servers, something is always broken somewhere. Netflix's response, famously, was to break things on purpose. In 2011 it described <b>Chaos Monkey</b>, a tool that randomly shuts down production servers during working hours. If your service falls over when one of its machines vanishes, you find out on a Tuesday afternoon with engineers at their desks, not at 9 p.m. on a Friday.<br><br>The second tool is the <b>circuit breaker</b>, which Netflix popularised with its open-source library <b>Hystrix</b>. Picture a service that calls the recommendations service. If recommendations becomes slow, every call waits, threads pile up, and soon the caller is stuck too. A circuit breaker notices the failures and \"trips\": it stops calling the sick service for a while and returns a <b>fallback</b> instead. If personalised rows can't load, you see a row of popular titles rather than an error page.<br><br>This is called <b>graceful degradation</b>: the app gets a little less smart, but it keeps working. Nobody cancels a subscription because their \"Because you watched\" row was generic for ten minutes.<br><br>The cost is real effort: every service needs sensible fallbacks, good monitoring, and a culture that accepts deliberate failure in production.",
      a: "Fire drills on a random Tuesday, plus fuses that trip in one room before the whole house goes dark."
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
      choice: "Build your own CDN inside ISPs",
      pro: "Bytes travel a few kilometres instead of thousands, so startup is faster, stalls are rarer, and both Netflix and ISPs save on transit costs",
      con: "A huge investment in hardware, logistics and partnerships with thousands of ISPs; it only makes sense at enormous scale"
    },
    {
      choice: "Conservative ABR (step down early, climb slowly)",
      pro: "Far fewer stalls, which viewers hate more than anything",
      con: "Sometimes you watch at a lower quality than your network could actually carry"
    },
    {
      choice: "Microservices plus chaos engineering",
      pro: "Teams ship independently, and one failing service degrades a feature instead of the whole app",
      con: "Hundreds of moving parts; you need excellent monitoring, tracing and fallbacks everywhere"
    },
    {
      choice: "Per-title encoding with many renditions",
      pro: "Each title uses only the bits it needs, saving bandwidth on every single view",
      con: "Much more compute and storage per title, and a more complex pipeline"
    },
    {
      choice: "Predictive overnight fill",
      pro: "Peak-hour traffic stays inside the ISP; fills use idle off-peak capacity",
      con: "Predictions can be wrong; a surprise hit has to be served from a farther tier until the next fill"
    }
  ],
  takeaways: ["When the data is huge, move it close to people before they ask (predictive caching), and use idle hours to do the moving.","Let the client choose the quality: it is the only one that can see the network from the viewer's side.","Separate the control plane (smart, small requests) from the data plane (big, dumb bytes) and scale each in its own way.","A short blurry patch beats a spinner. Design every fallback around that preference.","Practise failure on purpose so real failures are boring."],
  quiz: [
    {
      q: "Your buffer is dropping fast. What should the ABR player do?",
      o: ["Switch to a higher bitrate","Switch to a lower bitrate for upcoming segments","Pause and restart","Re-download the whole video"],
      a: 1,
      why: "A lower bitrate downloads faster than real time, so the buffer refills and you avoid the stall viewers hate most."
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
      why: "Simple content, like a clean cartoon, reaches the same visual quality with far fewer bits."
    },
    {
      q: "Personalised recommendations are down. Best behaviour?",
      o: ["Show an error page","A circuit breaker serves a fallback such as popular titles","Retry forever","Log the user out"],
      a: 1,
      why: "Graceful degradation keeps people watching while the dependency recovers."
    },
    {
      q: "Why does playback start at modest quality?",
      o: ["To save money","A small first segment downloads fast, minimising startup time, then ABR climbs","Licences require it","TVs are slow"],
      a: 1,
      why: "Time to first frame matters most, and the buffer is empty at the start; quality catches up within seconds."
    },
    {
      q: "Why fill Open Connect appliances at night?",
      o: ["Electricity is cheaper","Off-peak bandwidth is free capacity, so peak traffic stays inside the ISP","Encoding happens at night","Security"],
      a: 1,
      why: "Move bytes when links are idle, serve them locally when everyone watches."
    },
    {
      q: "Which part of the system decides the quality of the next segment?",
      o: ["The origin storage","The steering service","The player on the viewer's device","The encoding pipeline"],
      a: 2,
      why: "Only the player sees its own download speed and buffer level in real time, so it makes the call."
    },
    {
      q: "The ISP appliance serving your episode dies halfway through. What happens in this design?",
      o: ["Playback errors out","The player moves to the next URL in the ranked list steering gave it","The user must restart the app","Netflix re-encodes the episode"],
      a: 1,
      why: "Steering returns several ranked options, so the player can fail over on its own without a new round trip."
    },
    {
      q: "Why is the control plane run separately from the data plane?",
      o: ["They are written in different languages","They scale on different things: request logic versus raw bandwidth near viewers","Regulators require it","To make recommendations slower"],
      a: 1,
      why: "Cloud servers suit small, smart requests; disk-packed appliances in ISPs suit shovelling bytes. Splitting lets each scale its own way."
    }
  ],
  sources: ["Netflix Open Connect overview (openconnect.netflix.com)","Netflix Tech Blog: Per-Title Encode Optimization; Chaos Monkey; Hystrix","Netflix Q4 2024 letter: 300M+ paid memberships"],
  deep: [
    {
      h: "What happens when you press play",
      blocks: [
        ["img","TV remote control in hand 20170128.jpg","Between pressing play and seeing the first frame, a dozen services are consulted and the nearest appliance holding the file is chosen."],
        ["p","Pressing play feels like one action, but it's a short relay race. Here's the order of events, simplified. Each step is in the control plane except the very last one, which is where the data plane finally takes over."],
        ["steps",[["Authenticate and authorise","The control plane checks your account, your plan (does it include HD or 4K?) and the concurrent-stream limit, so a plan for two screens doesn't play on five."],["Choose renditions","Based on your device (which codecs it can decode, how big the screen is) and your plan, it picks the ladder of encodes this device may use. A phone won't be offered 4K."],["DRM licence","The video segments are encrypted. The player gets a licence (a key, under strict rules) so it can decrypt them. This is DRM, digital rights management, and studios require it."],["Steer","The steering service returns ranked URLs of nearby Open Connect appliances that hold these files."],["Start low, then climb","The first segments are fetched at modest quality for a fast start; ABR steps up as the buffer fills."]]],
        ["p","After that, the control plane mostly steps aside. The player talks directly to the appliance for every segment, and only checks back now and then, for example to report your viewing position so \"Continue watching\" works on your phone later."]
      ]
    },
    {
      h: "The encoding pipeline",
      blocks: [
        ["p","Think of the encoding pipeline as a factory that takes one enormous master file in and puts hundreds of neat, streamable files out. The key trick is splitting the work so thousands of machines can do it at once."],
        ["flow",{"nodes":[{"id":"m","x":90,"y":225,"label":"Studio master","sub":"huge source file","kind":"client","icon":"🎬","desc":"Very high bitrate source."},{"id":"sp","x":300,"y":225,"label":"Splitter","sub":"chunks of a few minutes","kind":"service","icon":"✂️","desc":"Cuts on scene boundaries so chunks encode independently."},{"id":"e","x":520,"y":90,"label":"Encoders ×1000s","sub":"parallel","kind":"service","icon":"🎞️","desc":"Each chunk × each resolution × each codec."},{"id":"qc","x":520,"y":360,"label":"Quality check","sub":"per-title metrics","kind":"service","icon":"🔍","desc":"Measures visual quality per bitrate to build the ladder."},{"id":"pk","x":740,"y":225,"label":"Packager + DRM","sub":"DASH / HLS","kind":"queue","icon":"📦","desc":"Segments, manifests and encryption."},{"id":"o","x":920,"y":225,"label":"Origin storage","sub":"all renditions","kind":"db","icon":"🗄️","desc":"Feeds Open Connect at night."}],"flows":[{"name":"Encode a new episode","steps":[["m","sp","Ingest"],["sp","e","Fan out chunks to thousands of workers"],["e","qc","Score quality at each bitrate"],["qc","pk","Assemble the per-title ladder"],["pk","o","Store packaged, encrypted renditions"]]}]},"Parallel chunk encoding turns days of encoding into hours."],
        ["p","Why cut on <b>scene boundaries</b>? Video compression works by describing each frame as changes from nearby frames. If you cut in the middle of a scene, each chunk loses the context it needs and quality suffers at the joins. Cutting where the picture changes anyway keeps every chunk self-contained."],
        ["p","The <b>quality check</b> step is what makes per-title encoding possible. Netflix measures how good each encode looks to a human eye, using a metric it built and open-sourced called <b>VMAF</b>. Then it picks ladder rungs where each extra bit actually buys visible quality."],
        ["chart",{"type":"bar","title":"A typical bitrate ladder (illustrative)","data":[["240p",0.3],["360p",0.75],["480p",1.75],["720p",3],["1080p",5.8],["4K",16]],"unit":"Mbps","highlight":4,"note":"Per-title encoding moves these rungs: a cartoon might reach 1080p quality at far less than 5.8 Mbps."}],
        ["p","Finally the <b>packager</b> cuts each rendition into small segments, writes a <b>manifest</b> (a menu file that lists every rendition and where its segments live), and encrypts everything. The two common streaming formats are <b>DASH</b> and <b>HLS</b>; both work the same basic way, with a manifest plus many little segment files."],
        ["analogy","A manifest is like a restaurant menu with the same dish in small, medium and large. The player reads the menu once, then orders one plate at a time, picking the size based on how hungry the network is right now."]
      ]
    },
    {
      h: "Open Connect: filling the edge",
      blocks: [
        ["list",["<b>Two tiers:</b> appliances embedded <i>inside</i> ISPs (closest to viewers) and larger ones at internet exchange points.","<b>Proactive fill:</b> each night, in the region's quiet hours, appliances download the titles predicted to be popular there tomorrow. Peak-hour traffic then rarely leaves the ISP.","<b>Health-aware steering:</b> appliances report load and health constantly, and steering avoids busy or failing ones mid-session."]],
        ["tip","The win for ISPs: Netflix traffic stays inside their network instead of crossing expensive transit links, which is why ISPs host the hardware."],
        ["p","Why does popularity prediction work so well? Because viewing is very <b>skewed</b>: a small share of titles gets most of the watching on any given night. A box that can't hold the whole catalogue can still hold the part that covers most of the evening's viewing. The rare title someone digs up from 2009 is fetched from the bigger tier at the exchange, which takes a little longer but still works."],
        ["p","This is the same pattern you'd use anywhere: <b>cache the hot set close, keep the long tail farther away</b>. Netflix just does it with physical boxes and a daily schedule instead of an in-memory cache that fills on demand."]
      ]
    },
    {
      h: "What happens when the network goes bad",
      blocks: [
        ["p","Let's follow one viewer, made up for illustration, through a rough evening. Priya is watching on her phone on a train. Her player keeps a target buffer of about 30 seconds."],
        ["steps",[["Minute 0","She presses play. First segment at 720p arrives in under a second. Picture on screen. Buffer grows quickly because her 4G is doing 15 Mbps."],["Minute 2","Buffer full, throughput steady. The player climbs to the 1080p rung. A phone screen doesn't benefit much beyond that, so it stops there."],["Minute 9","Tunnel. Throughput falls to 1 Mbps. The buffer starts draining: 30 s, 24 s, 18 s. The player drops to 360p for the next segments, which download faster than they play."],["Minute 11","Out of the tunnel. Downloads are fast again, the buffer refills, and the player steps up rung by rung rather than jumping straight to the top, in case the good signal doesn't last."],["Minute 20","The ISP appliance she's using gets overloaded. Segment downloads slow down. The player switches to the second URL from steering, at the exchange, and carries on."]]],
        ["p","She noticed a softer picture for a couple of minutes. She never saw the spinner. That is the whole design working as intended: the buffer absorbs short problems, ABR absorbs longer ones, and the ranked server list absorbs server problems."]
      ]
    },
    {
      h: "Resilience in the control plane",
      blocks: [
        ["p","The data plane is resilient because it's simple and duplicated. The control plane is trickier: it's hundreds of services calling each other, and a slow one can drag others down. These are the main defences."],
        ["table",["Technique","What it does"],[["Chaos Monkey","Randomly kills production instances so every service tolerates loss"],["Circuit breakers + fallbacks","If personalisation fails, show popular rows rather than an error"],["Multi-region, active-active","Traffic can be shifted out of a failing cloud region"],["Bulkheads","Separate thread pools per dependency so one slow service can't starve the rest"]]],
        ["p","<b>Active-active</b> means more than one cloud region serves real traffic at the same time, so moving users away from a broken region is a routing change, not a cold start. Netflix later went beyond killing single servers and ran drills that take a whole region out of service on purpose."],
        ["warn","A fallback that is never exercised is a fallback that doesn't work. That's the real reason for chaos testing: it proves the fallbacks run, not just that they exist in the code."]
      ]
    },
    {
      h: "A short history: why Netflix ended up here",
      blocks: [
        ["p","Netflix started out mailing DVDs. In 2008 a database corruption in its own data center stopped DVD shipments for about three days. That outage pushed it to move to the cloud and to design for failure rather than hoping hardware wouldn't break. The move to AWS took years and finished around 2016."],
        ["p","Meanwhile streaming grew so fast that renting other companies' CDNs got expensive and hard to control. Building Open Connect gave Netflix control over where every byte comes from. So the split between AWS for the brains and Open Connect for the bytes wasn't drawn on a whiteboard in one go; it grew out of real pain."]
      ]
    },
    {
      h: "Numbers that matter",
      blocks: [
        ["math",[["Peak streams","assumption","50 M"],["Average bitrate","assumption","5 Mbps"],["Peak egress","50M × 5 Mbps","250 Tbps"],["One appliance (illustrative)","assumption","≈ 100 Gbps"],["Appliances needed at peak","250 Tbps ÷ 100 Gbps","≈ 2,500 (plus headroom and spares)"]]],
        ["p","That last row is a back-of-envelope, not a real count. But it shows the shape of the answer: thousands of boxes spread around the world, not one giant building. It also shows why bitrate savings matter so much. Cut the average bitrate by 20% with better encoding, and you need about 500 fewer appliances at peak."]
      ]
    },
    {
      h: "Interview follow-ups",
      blocks: [
        ["list",["Live events? → segments must be encoded in real time, the manifest updates constantly, and everyone requests the same segment at once (see the video lesson).","Downloads for offline viewing? → the same renditions with a time-limited offline DRM licence.","\"Continue watching\"? → the player posts its position every few seconds to a small, eventually consistent store.","Thumbnails and artwork? → personalised images chosen by a separate service and served from the CDN."]],
        ["extra","<b>Live is a different beast.</b> In Hotstar's case, live cricket is cut into short segments (about 15–30 seconds there) that are transcoded the moment they arrive and pushed to the CDN, while players keep polling for the newest segment list. Smaller segments mean less delay but more metadata to fetch. Hotstar also scales up <i>before</i> big moments using predictions from viewing patterns, because autoscaling reacts too slowly when, say, a star batsman walks out and millions of people open the app at once."]
      ]
    },
    {
      h: "Interview corner: presenting this in 45 minutes",
      blocks: [
        ["steps",[["Minutes 0–5: requirements","Ask: on-demand or live? How many viewers at peak? Which devices? Agree that startup time and no rebuffering are the top goals."],["Minutes 5–10: estimate","Do the 50M × 5 Mbps = 250 Tbps maths out loud. Conclude that video must come from many edge servers, not one origin."],["Minutes 10–20: the two planes","Draw the control plane (cloud services) and the data plane (CDN). Walk through pressing play."],["Minutes 20–30: encoding and ABR","Explain renditions, segments, manifests and how the player picks quality from throughput and buffer."],["Minutes 30–40: edge and failure","Cover nightly fill, steering with ranked URLs, circuit breakers and fallbacks."],["Minutes 40–45: follow-ups","Be ready for live streaming, offline downloads, and how you'd measure quality of experience (startup time, rebuffer rate, average bitrate)."]]],
        ["tip","Interviewers love the question \"who decides the bitrate, the server or the client, and why?\" Have a crisp answer: the client, because only it can see its own buffer and download speed in real time."]
      ]
    }
  ]
});
