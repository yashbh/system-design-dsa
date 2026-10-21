/* Blueprint course — lesson: Case study: video streaming (Hotstar, Google Meet) */
BP.LESSONS.push({
  id: "video",
  mod: "cases",
  icon: "🎥",
  minutes: 30,
  title: "Case study: video streaming (Hotstar, Google Meet)",
  scaler: "HLD 17 · Case Study: Video Streaming",
  summary: "Adaptive bitrate, chunking and pre-loading for recorded video; segmentation pipelines for live cricket at 50M viewers; and why video calls need a different architecture.",
  concepts: ["abr","cdn","transcoding","chunking"],
  related: ["netflix"],
  sections: [
    { h: "Q1 · Different bandwidths: adaptive bitrate", blocks: [
      ["p","If everyone downloads the same heavy stream, slow connections buffer forever. Encode each video at several resolutions/bitrates and let the player pick the <b>best quality the connection can sustain right now</b>, re-measuring continuously. That's <b>adaptive bitrate streaming (ABR)</b>."],
      ["sim","abr","You are the network: drag bandwidth and watch the player change quality to protect its buffer."],
      ["p","Device matters too: 1080p on a phone wastes data. Hotstar detects the device via the <b>user-agent</b> string and <b>fingerprinting</b> (screen size, time zone…)."],
      ["img","TVB Pay Vision satellite dish (Hong Kong).jpg","Traditional broadcast sends one signal to everyone. Internet streaming has to adapt to each viewer's own connection."]
    ] },
    { h: "Q2 · Recorded content: chunking & pre-loading", blocks: [
      ["list",["<b>Chunking:</b> never download the whole movie. Split it into short chunks and request only what's being watched (seek to 10:00 → fetch that chunk).","<b>Chunk metadata first:</b> fetch timestamps, chunk ids and low-res thumbnails up front, so scrubbing shows previews instantly.","<b>Pre-load</b> the next chunk around 30–40 s into a 60 s chunk; evict watched chunks with LRU to bound memory.","Each chunk is fetched at the current ABR quality, so quality can change chunk by chunk.","Serve chunks from a <b>CDN</b>, not straight from S3/HDFS. Cache popular titles' metadata server-side (a few titles get most views)."]],
      ["tip","Homework from the notes: split chunks by <b>scene/shot</b> instead of fixed time. Most people skip the cast intro, so align a chunk boundary there."]
    ] },
    { h: "Q3 · Live: segments, not files", blocks: [
      ["p","Live content can't be transcoded in advance, and viewers accept about a minute of lag at most. Large chunks mean large lag, so use short <b>15–30 s segments</b> (modern low-latency HLS goes to a few seconds)."],
      ["flow",{"nodes":[{"id":"cam","x":90,"y":225,"label":"Stadium feed","sub":"RTMP ingest","kind":"client","icon":"🎥","desc":"The broadcaster pushes a continuous stream."},{"id":"seg","x":300,"y":225,"label":"Segmenter","sub":"15–30 s pieces","kind":"service","icon":"✂️","desc":"Cuts the live stream into segments."},{"id":"enc","x":520,"y":80,"label":"Transcoders","sub":"240p → 1080p","kind":"service","icon":"🎞️","desc":"Each segment is encoded at several bitrates in parallel."},{"id":"meta","x":520,"y":370,"label":"Metadata DB","sub":"cache + MySQL","kind":"db","icon":"🗂️","desc":"Which segments exist, at which qualities."},{"id":"cdn","x":760,"y":80,"label":"CDN (Akamai)","sub":"edges in India","kind":"edge","icon":"🌍","desc":"Delivers segments: by far the heaviest workload."},{"id":"v","x":900,"y":225,"label":"50M viewers","sub":"polling players","kind":"client","icon":"📱","desc":"Each player polls for new segments and downloads them from the nearest edge."}],"flows":[{"name":"One live segment","steps":[["cam","seg","Continuous RTMP stream"],["seg","enc","Segment #1,204 (15 s) → transcode to 4 qualities"],["enc","meta","Record the segment's metadata"],["enc","cdn","Push the renditions to CDN edges"],["v","meta","Player polls: \"anything after #1,203?\""],["v","cdn","Download #1,204 at the right quality from the nearest edge"]]}]},"Live pipeline: segment → transcode → metadata + CDN → polling players."],
      ["list",["Lagging viewers are fine: not everyone needs to be at the same timestamp, and replays come for free.","Trade-off: tiny segments mean lots of metadata and requests; big segments mean more delay.","<b>Predictive scaling:</b> autoscaling reacts too slowly, so Hotstar pre-scales using viewing patterns (traffic spikes when Dhoni walks out to bat)."]],
      ["img","A flood light at the D Y Patil Stadium (5739171528).jpg","Floodlights at the DY Patil Stadium in Navi Mumbai. During a big match, millions of people are watching the same ball at the same moment."],
      ["chart",{"type":"line","title":"Live delay vs segment length","sub":"players buffer about 3 segments","x":{"label":"segment length","values":["2 s","6 s","10 s","15 s","30 s","60 s"]},"y":{"label":"delay behind live"},"unit":"s","series":[{"name":"delay","values":[6,18,30,45,90,180]},{"name":"requests per viewer / min","values":[30,10,6,4,2,1]}],"note":"Short segments mean low delay but many more requests and much more metadata."}]
    ] },
    { h: "Q4 · From 100 to 50 million viewers", blocks: [
      ["table",["Workload","Scales with viewers?","How to scale"],[["Ingest + transcode","No","Fixed per stream"],["Metadata polling","Yes","More app servers + metadata cache"],["Video delivery","Yes, and dominant","CDN edges near users, reached via Anycast"]]]
    ] },
    { h: "Google Meet is a different problem", blocks: [
      ["extra","Video calls need &lt;300 ms delay, not 30 s, so HTTP segments are out. Meet uses <b>WebRTC</b> over UDP: signaling to exchange session info, STUN/TURN for NAT traversal, and an <b>SFU</b> (selective forwarding unit) that receives each participant's stream once (often several resolutions via simulcast) and forwards the right layer to each viewer. Mesh (peer-to-peer) only works for 2–4 people."]
    ] }
  ],
  quiz: [
    {"q":"Why short segments for live streaming?","o":["Better compression","Large chunks mean large lag; segments keep delay to seconds","CDNs require it","To save storage"],"a":1,"why":"A player can't play a chunk until it has been produced."},
    {"q":"Which live workload dominates at 50M viewers?","o":["Transcoding","Video delivery via the CDN","Metadata DB","Ingest"],"a":1,"why":"Transcoding is per stream; delivery is per viewer."},
    {"q":"Why not use HLS for a video call?","o":["No audio support","Seconds of latency; calls need real-time WebRTC","Too expensive","No encryption"],"a":1,"why":"Interactive media needs sub-second delay."}
  ],
  refs: [
    ["Scaling Hotstar for 25M concurrent viewers (talk)","https://www.youtube.com/watch?v=QjvyiyH4rr0"],
    ["Apple HLS developer hub","https://developer.apple.com/streaming/"],
    ["ByteByteGo: How YouTube handles massive uploads","https://bytebytego.com/guides/how-does-youtube-handle-massive-video-content-upload/"],
    ["WebRTC getting started","https://webrtc.org/getting-started/overview"],
    ["Wikipedia: Adaptive bitrate streaming","https://en.wikipedia.org/wiki/Adaptive_bitrate_streaming"]
  ]
});
