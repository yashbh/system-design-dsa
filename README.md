# Blueprint: learn system design by reverse-engineering real apps

An interactive, animated system-design course built from case studies of famous products. It's a standalone static app, separate from REA's code. It borrows only REA's idea: *see a feature you like, understand how it works.*

## Run it

```bash
node blueprint/serve.mjs 5179
```

Then open http://localhost:5179. No build step and no dependencies.

## HLD course (new)

18 interactive lessons in 6 modules that follow the Scaler HLD curriculum (2025 sheet): Foundations → Caching → Databases at scale → Classic case studies → Infrastructure building blocks → Microservices. Each lesson has the story, the derivation, the back-of-the-envelope math, interactive figures, a quiz, and checked further-reading links (ByteByteGo, official docs, engineering blogs).

The lessons were written for this app from the topics, stories and numbers in the Scaler notes: the public 2024 notes and readings, plus the S3/Uber/Hotstar documents. The 2025 docs need a Scaler login. Anything beyond the notes is marked "📚 Beyond the notes".

The interactive figure library (`js/figs-*.js`, 28 figures) covers DNS resolution, vertical vs horizontal scaling, load-balancer algorithms with health checks, the memory hierarchy, the cache request path, write policies, eviction (FIFO/LRU/LFU side by side), a Redis leaderboard, CAP/PACELC, replication, quorum (R+W>N), a sharding-key playground, data models, an LSM tree, a Bloom filter, a typeahead trie, Kafka, ZooKeeper election, an inverted index, HDFS, a quadtree, Snowflake IDs, rate-limiting algorithms, monolith vs microservices, saga, circuit breaker, the code-judge cache and messenger sharding.

## DSA section (new)

The **DSA** tab in the top bar is a separate interview-prep track built from the handwritten DSA notes (64 PDFs, 16 topics) plus LeetCode practice:

- **Step-through animations.** Each one shows the data (arrays, bars, grids, trees, graphs, linked lists, stacks, bits, intervals), highlights the line of code being run, and explains each step. You can play, pause, step, scrub and change the speed, and edit the input to rerun.
- **Topic pages** organised in six phases, from Foundations to Optimisation. Each topic starts from intuition, works through every problem in the notes as a card (brute force → key idea → complexity → code, with company tags), and ends with a cheat sheet and a quiz.
- **LeetCode practice** for every topic, mostly from the Top Interview 150 list. Ticks are saved in the browser.
- A **pattern table** that maps question wording to the technique it calls for, and a **playground** with every animation.

## What's inside

| Case study | Core question | Lab |
| --- | --- | --- |
| 🔗 Bitly: URL shortener | Unique IDs at scale + read-heavy caching | Base62 encoder + LRU cache under Zipf traffic |
| 💬 WhatsApp: messaging | Instant, reliable, private delivery | Delivery-tick protocol: offline inbox, lost ACKs, dedupe |
| 💳 Stripe: payments API | Charge exactly once over a flaky network | Token-bucket limiter + idempotency-key retries |
| 📸 Instagram: news feed | Pay at write time or read time? | Push / pull / hybrid fan-out from 10 to 1B followers |
| 🚗 Uber: ride matching | "Who's near me?" over moving points | H3-style hex ring search + surge heatmap |
| 🎬 Netflix: streaming | HD in a second on any network | Adaptive-bitrate player you control, edge vs. origin |
| 🎮 Discord: message storage | Partitioning trillions of rows | Consistent-hash ring vs. `hash % N`, virtual nodes |
| 🎟️ Ticketmaster: onsale | Millions of fans, few seats, one instant | Free-for-all vs. waiting room + atomic TTL holds |
| ▶️ YouTube: upload & streaming | Ingest 500 h/min, publish in minutes, count views | Parallel chunked transcoding, low resolutions first |
| 🐦 Twitter / X: timeline, search, trends | Read-heavy fan-out, the celebrity exception, real-time search | Trending = acceleration vs baseline, not volume |
| 📝 Google Docs: collaborative editing | Concurrent edits that always converge | Naive replay diverges; operational transformation converges |

Every lesson follows the same arc: **story → requirements → back-of-the-envelope math → naive design that breaks → step-by-step real design (each step with an analogy) → animated, traceable architecture diagram → lab → trade-offs → quiz**.

Also included: a concept library (searchable, with a slide-out drawer for each concept), an interview toolkit (5-step framework, live capacity calculator, log-scale latency numbers, building-block cheat sheet), XP progress saved in `localStorage`, and light/dark themes.

## Files

- `js/lessons-1.js`, `js/lessons-2.js`: the HLD course (block-based lesson format, documented at the top of lessons-1.js).
- `js/concepts-2.js`: the expanded building-block library (65 concepts, each linked to an interactive figure and its lessons).
- `js/figs-core.js`, `js/figs-data.js`, `js/figs-arch.js`: interactive figures; each is `BP.FIGS[name](el) → destroy`.
- `js/lessons-deep.js`: deeper content matched against the notes (the caching lesson rebuilt section by section, plus worked examples, commands and the notes' own questions across the other lessons). `js/images.js`: free-licensed photos from Wikimedia Commons, credited under each image.
- `js/charts.js`: dependency-free animated SVG charts (bar, line, donut). `js/scenes.js`: animated hero illustrations built from a small parts kit (servers, databases, caches, phones, queues…); case-study scenes are generated from each architecture diagram. `js/enrich.js`: each lesson's illustration and its 26 charts.
- `css/figs.css`: styles for the figures and course pages.
- `js/cases-new.js` + `js/sims2.js`: the YouTube, Twitter and Google Docs case studies and their labs (the Docs lab's transform is fuzz-tested for convergence).
- `js/content.js`: case-study content (case studies, concepts, toolkit data). Add a case study by appending to `BP.CASES`.
- `js/sims.js`: the eight simulations. Each one renders into a container and returns a cleanup function.
- `js/algoviz.js`: the DSA animation engine and player (frame/panel format documented at the top). `js/algos.js`: the core algorithm library. `js/dsa-core.js`: DSA topic order and pattern table; `js/dsa-*.js`: topic content (and extra animations) per group. `css/dsa.css`: the player and DSA page styles.
- `js/app.js`: hash router, views, the diagram/trace engine, quizzes and progress.
- `css/styles.css`: base layout and components. `css/theme.css` (loaded last) is the visual theme: the "Stone and blueprint" palette and Hanken Grotesk from the taste-skill library, with gradients, glows, tracked micro-labels and hover lifts removed. Hanken Grotesk loads from Google Fonts and falls back to the system sans offline.

## Colour

Each course module has its own colour (Foundations blue, Caching amber, Databases green, Case studies rose, Infrastructure teal, Microservices olive), which carries through headings, steps, charts and illustrations. Case-study pages use the company's brand colour, darkened for legibility.

## Accuracy note

Architectures are simplified teaching models based on public engineering blogs and talks. They are not internal documentation of any company. Stats are labelled *Reported* (from public statements), *Estimate* or *Assumption*.
