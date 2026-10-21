/* Blueprint course — lesson: System Design 101: from one laptop to the internet */
BP.LESSONS.push({
  id: "hld-101",
  mod: "found",
  icon: "💻",
  minutes: 25,
  title: "System Design 101: from one laptop to the internet",
  scaler: "HLD 1 · System Design and Computer Networks 101",
  summary: "Follow del.icio.us from a dorm-room laptop to a real web service, and meet DNS, scaling, load balancers and health checks along the way.",
  concepts: ["dns","vertical-horizontal","load-balancing","health-checks"],
  related: ["bitly"],
  sections: [
    { h: "LLD vs HLD", blocks: [
      ["p","<b>Low-level design</b> is about the inside of one component: classes, interfaces, design patterns. <b>High-level design</b> zooms out: which components should exist (servers, databases, caches, queues, CDNs), how they talk, and how the whole thing stays fast and reliable as it grows."],
      ["analogy","LLD is designing the rooms inside a house. HLD is planning the city: roads, power, water, where the houses go."],
      ["p","The course builds HLD the way real systems evolve: start with the simplest thing that works, find what breaks, add exactly one component to fix it, and repeat. Learn the <i>patterns</i>, because tools change but the reasoning lasts."]
    ] },
    { h: "The story: del.icio.us on a laptop", blocks: [
      ["p","In 2003, bookmarks lived inside one browser on one computer. Switch machines and they were gone. Delicious put bookmarks on a server under your account. Functionally it's just two calls:"],
      ["code","addBookmark(userId, siteUrl)\ngetAllBookmarks(userId)"],
      ["p","Any developer can build that on a laptop with a local MySQL database. Then three real-world problems show up, one after another, and each one forces a new piece of architecture:"],
      ["steps",[["Nobody can reach my laptop","People type a name, but the internet routes by IP address → <b>DNS</b>."],["Every deploy takes the site down","Restarting the only server means errors for everyone → <b>multiple servers + a load balancer</b>."],["The disk fills up","Data outgrows one machine → <b>sharding</b> (next lesson)."]]]
    ] },
    { h: "Problem 1: how does a name find a machine? (DNS)", blocks: [
      ["p","You buy <code>del.icio.us</code> from a registrar (GoDaddy, Namecheap…). Many registrars sell names, so one authority, <b>ICANN</b>, keeps the master record of who owns what. You then add an <b>A record</b>: <i>name → IP address</i>."],
      ["p","Should every browser ask ICANN directly? No: that would make one organization a <b>single point of failure</b> and a bottleneck for the entire internet. Instead the directory is <b>replicated</b> onto thousands of DNS servers worldwide, and browsers ask a nearby one. Answers are cached (in the browser, the OS, the resolver) for a <b>TTL</b>, so most lookups take about a millisecond."],
      ["fig","dns","Step through a full DNS resolution, then press “Visit again” to see why caching makes repeat lookups nearly free."],
      ["tip","This is your first taste of a recurring trade-off. Replicated DNS is highly available, but a change takes up to the TTL (sometimes hours) to propagate. That's <b>eventual consistency</b>."],
      ["extra","The real hierarchy has <b>recursive resolvers</b> (your ISP, 8.8.8.8, 1.1.1.1), <b>root servers</b>, <b>TLD servers</b> (.com, .io) and <b>authoritative servers</b> (your DNS provider), as shown in the figure. The notes keep this out of scope, but it's a common interview follow-up."]
    ] },
    { h: "DNS in more detail: names, records and propagation", blocks: [
      ["p","Owning a name and pointing it at a machine are two separate steps. You buy <code>del.icio.us</code> from a registrar, which reports the ownership to <b>ICANN</b>, the non-profit that keeps the master directory of registered domains, their owners and expiry dates. Then you publish records that say where the name points:"],
      ["table",["Record","Maps","Example"],[["A","name → IPv4 address","del.icio.us → 54.23.11.8"],["AAAA","name → IPv6 address","del.icio.us → 2600:1f18::8"],["CNAME","name → another name (an alias)","www.del.icio.us → del.icio.us"],["ALIAS / ANAME","Like CNAME but allowed at the root domain","del.icio.us → my-lb.aws.com"],["NS","Which servers are authoritative for the domain","ns1.dnsprovider.com"],["MX","Where email goes","mail.del.icio.us"]]],
      ["p","Thousands of DNS servers hold copies of this information and <b>re-sync every few hours</b>. That's why a change can take hours to be seen everywhere, and why each record carries a <b>TTL</b>: lower it a day before a migration so the switch propagates quickly."],
      ["tip","The browser and the OS cache DNS answers too, so DNS is your first cache, long before you add Redis."]
    ] },
    { h: "Problem 2: one server isn't enough", blocks: [
      ["p","With a single server, every deploy means restarting the app, and for that window users get <b>HTTP 502</b>. Growth makes it worse. The first instinct is <b>vertical scaling</b>: more CPU, RAM, disk. It works for a while, but there's a hardware ceiling, cost grows faster than capacity, and it's still one machine that can die. When a contest promises 10× traffic, vertical scaling is a dead end."],
      ["fig","scaling","Drag the traffic up in both modes. Then kill a server."],
      ["table",["","Vertical (scale up)","Horizontal (scale out)"],[["Effort","Easy: no code changes","Needs a load balancer, stateless servers, data partitioning"],["Ceiling","Biggest machine money can buy","Practically unlimited"],["Cost curve","Super-linear","Roughly linear"],["Failure","Single point of failure","Survives losing machines"],["Deploys","Downtime on restart","Rolling deploys, zero downtime"]]],
      ["img","Racks Amravati Data Center.jpg","Horizontal scaling in real life: rows of identical servers in a data centre. Each one is replaceable; none is special."],
      ["chart",{"type":"line","title":"What extra capacity costs","sub":"illustrative: big machines get pricier per core","x":{"label":"capacity needed (× today)","values":["1×","2×","3×","4×","5×","6×","7×","8×","9×","10×"]},"y":{"label":"monthly cost (× today)"},"unit":"×","series":[{"name":"Vertical","values":[1,3,5.8,9.2,13.1,17.6,22.5,27.9,33.6,39.8]},{"name":"Horizontal","values":[1,2,3,4,5,6,7,8,9,10]}],"band":[6,9,"no bigger machine exists"],"note":"Vertical scaling also stops altogether once you hit the biggest machine available."}]
    ] },
    { h: "The load balancer", blocks: [
      ["p","With several machines, something must decide where each request goes and avoid machines that are dead or being deployed. Write that logic down and you have a load balancer:"],
      ["steps",[["For each host, one at a time","Mark it inactive → deploy new code → restart → run sanity checks → mark it active."],["Never route to an inactive host","If a host stops responding, mark it inactive automatically."],["Serve only from active hosts","Users never notice the deploy. The notes call this a beautiful invisible dance."]]],
      ["flow",{"nodes":[{"id":"u","x":90,"y":225,"label":"Users","sub":"browsers & apps","kind":"client","icon":"👥","desc":"Every client talks to one public entry point."},{"id":"dns","x":270,"y":70,"label":"DNS","sub":"name → LB IP","kind":"edge","icon":"📇","desc":"Resolves the domain to the load balancer, not to individual servers."},{"id":"lb","x":320,"y":225,"label":"Load balancer","sub":"reverse proxy","kind":"edge","icon":"⚖️","desc":"Terminates TLS, health-checks hosts, routes each request."},{"id":"a","x":620,"y":90,"label":"Server A","sub":"v1 → v2","kind":"service","icon":"🖥️","desc":"Taken out of rotation, upgraded, checked, put back."},{"id":"b","x":620,"y":225,"label":"Server B","sub":"serving","kind":"service","icon":"🖥️","desc":"Keeps serving while A deploys."},{"id":"c","x":620,"y":360,"label":"Server C","sub":"serving","kind":"service","icon":"🖥️","desc":"Keeps serving while A deploys."},{"id":"db","x":880,"y":225,"label":"Database","sub":"shared","kind":"db","icon":"🗄️","desc":"Source of truth."}],"flows":[{"name":"Normal request","steps":[["u","dns","Resolve del.icio.us → LB's IP"],["u","lb","HTTPS request hits the single entry point"],["lb","b","Round robin picks a healthy server"],["b","db","Read the bookmarks"],["b","lb","Response"],["lb","u","Relayed back. The client never learns which server answered."]]},{"name":"Rolling deploy","steps":[["lb","a","Detach A: stop sending it traffic"],["a","a","Deploy v2, restart, sanity checks"],["lb","a","Health check passes → re-attach A"],["lb","b","Now detach B and repeat…"],["lb","c","…then C. Zero downtime for users."]]}]},"A load balancer is the single entry point. Trace a normal request, then a rolling deploy."],
      ["list",["<b>Deployments:</b> rolling deploys with no downtime.","<b>Autoscaling:</b> all traffic passes through it, so it sees trends. Add hosts above an upper threshold, remove them below a lower one.","<b>Availability:</b> health checks pull dead hosts out and add recovered ones back.","<b>Security:</b> server IPs stay hidden, and a smart LB can drop malicious traffic.","<b>Performance:</b> SSL/TLS termination and compression happen once, at the edge."]],
      ["p","Technically a load balancer is a <b>reverse proxy</b>: it sits in front of servers and answers on their behalf. (A <i>forward</i> proxy sits in front of clients.) It's critical, so cloud providers scale and replicate the load balancer itself."]
    ] },
    { h: "Why use a load balancer: the five benefits in depth", blocks: [
      ["steps",[["Deployments (scalability)","Rolling deploys: detach a host, deploy, restart, sanity-check, re-attach, then the next host. Users never see downtime."],["Load balancing and autoscaling (resilience)","All traffic passes through the LB, so it sees trends with low latency. Set an <b>upper threshold</b> (say 70% CPU) to add hosts and a <b>lower bound</b> to remove them gradually. React <i>before</i> traffic overwhelms you, not after."],["Higher availability","Health checks remove dead hosts and add recovered ones automatically."],["Security","Server IPs stay hidden behind one entry point, making direct attacks harder. A smart LB can spot and drop malicious traffic (DDoS mitigation)."],["Performance","<b>SSL/TLS termination</b>: encrypted from the user to the LB, plain from the LB to the servers, so servers skip the crypto work. The LB can also compress responses."]]]
    ] },
    { h: "Reverse proxy, forward proxy and types of load balancer", blocks: [
      ["table",["","Forward proxy","Reverse proxy (a load balancer)"],[["Sits in front of","Clients","Servers"],["Protects","The clients' identity (e.g. a corporate proxy, a VPN)","The servers: clients never learn which backend answered"],["Example","Squid, a school web filter","NGINX, HAProxy, AWS ALB"]]],
      ["p","Response headers reveal the proxy rather than the app server's software, which leaks less information. The load balancer is critical, so providers scale it themselves (AWS LBs scale automatically, up to about 100 nodes per the notes)."],
      ["table",["Type","Works at","Routes by","Example"],[["Application LB (L7)","HTTP","Path, host, headers, cookies","/admin/* → admin fleet"],["Network LB (L4)","TCP/UDP","IP and port only, very fast","Game servers, databases"],["DNS / global LB","DNS","User's location, region health","India users → Mumbai region"]]]
    ] },
    { h: "Setting one up on AWS: listeners, rules, target groups", blocks: [
      ["p","The reading walks through the AWS concepts you'll configure:"],
      ["list",["<b>Listeners:</b> the protocol + port combinations the LB accepts, e.g. HTTPS:443 and HTTP:80. Everything else is dropped. Each forwards to a destination such as HTTP:8080 on the hosts.","<b>Routing rules:</b> conditional forwarding. For example, requests whose path starts with <code>/admin</code> go to an internal admin fleet.","<b>Target groups:</b> named sets of registered servers. A rule pairs a condition with a target group: one for general traffic, one per microservice."]],
      ["code","Listener HTTPS:443  (TLS certificate for del.icio.us)\n  rule: path /admin/*  → target group \"admin\"  (2 hosts, port 8080)\n  default              → target group \"web\"    (10 hosts, port 8080)\nHealth check: HTTP GET / on 8080, every 30 s, timeout 5 s, unhealthy after 2"]
    ] },
    { h: "Heartbeats and health checks", blocks: [
      ["p","How does the LB know who's alive? There are two styles: servers send a <b>heartbeat</b> (\"I'm alive\"), or the LB sends a <b>health check</b> (\"are you alive?\"). The notes' example health check:"],
      ["table",["Setting","Example value","Meaning"],[["Port / path / protocol","8080 · / · HTTP","What the LB pings"],["Interval","30 s","How often"],["Timeout","5 s","How long to wait for a reply"],["Unhealthy threshold","2","Consecutive failures before marking DOWN"],["Healthy threshold","2","Consecutive successes before re-adding"]]],
      ["p","With these numbers, a dead host can still receive traffic for about 2 × 30 s + 5 s ≈ <b>65 s</b>. A shorter interval detects failures faster but adds load. A check on <code>/</code> can pass even when the database behind the app is broken, so good health endpoints check their dependencies."],
      ["fig","lb","Crash a server. Requests still go to it (and time out) until it fails 2 health checks in a row; revive it and it needs 2 passes to come back."],
      ["chart",{"type":"bar","title":"Worst-case time a dead server still gets traffic","sub":"unhealthy threshold 2, timeout 5 s","data":[["check every 10 s",25],["check every 30 s",65],["check every 60 s",125]],"unit":"s","highlight":1,"note":"≈ threshold × interval + timeout. Faster checks find failures sooner but add load."}]
    ] },
    { h: "Questions the notes leave you with", blocks: [
      ["p","The reading ends with three open questions. Here's how to answer them:"],
      ["steps",[["How do you run in several regions?","A <b>global server load balancer</b> (usually DNS-based) sends each user to the nearest healthy region, and each region has its own LB. Deploy region by region so one bad release doesn't take down everything."],["A user logs in on host A and the next request goes to host B. What breaks?","If the session lives in A's memory, B doesn't know the user and they look logged out. Fix it with <b>sticky sessions</b> (IP hash or a cookie), or better, <b>stateless servers</b> with sessions in Redis or the DB."],["Static vs dynamic content?","Serve static files (images, JS, CSS) from a CDN or object storage, and send only dynamic requests to the app servers. The LB fleet can then be much smaller."]]]
    ] }
  ],
  quiz: [
    {"q":"Why can't ICANN answer every DNS query directly?","o":["It's too expensive","It would be a single point of failure and a global bottleneck","ICANN doesn't know IP addresses","DNS must be encrypted"],"a":1,"why":"Replicating the directory to many DNS servers spreads the load and survives failures. The price is propagation delay."},
    {"q":"A contest will bring 10× traffic next week. Best move?","o":["Buy the biggest single machine","Add identical servers behind a load balancer","Optimise code overnight and hope","Turn off the database"],"a":1,"why":"Horizontal scaling has no hard ceiling and survives failures. Vertical scaling hits a wall and stays a SPOF."},
    {"q":"Interval 30 s, timeout 5 s, unhealthy threshold 2. Roughly how long until a dead host stops getting traffic?","o":["5 s","~35 s","~65 s","10 min"],"a":2,"why":"Two failed checks 30 s apart plus the timeout ≈ 65 s. Tune these numbers to your tolerance."},
    {"q":"Which record maps a domain to an IPv4 address?","o":["MX","A","TXT","NS"],"a":1,"why":"An A record maps name → IPv4. AAAA is IPv6, CNAME is an alias to another name."},
    {"q":"What does SSL termination at the load balancer buy you?","o":["Stronger encryption","App servers skip the TLS crypto work; traffic is encrypted user → LB","Faster DNS","Sticky sessions"],"a":1,"why":"Decrypt once at the edge, and keep servers simple."}
  ],
  refs: [
    ["AWS: What is DNS?","https://aws.amazon.com/route53/what-is-dns/"],
    ["NGINX HTTP load balancing guide","https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/"],
    ["AWS ALB health checks","https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html"],
    ["AWS: What is load balancing?","https://aws.amazon.com/what-is/load-balancing/"]
  ]
});
