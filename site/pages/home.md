---
title: ArchiveTuna
description: Digital archaeology for the things you made, collected, and forgot.
---
<div class="at-home">
<section class="at-hero">
<div class="at-intro"><img class="at-mascot" src="/logo.png" width="1774" height="887" alt="A muted bronze tuna dissolving into archive drawings and digital fragments." fetchpriority="high"><p class="at-eyebrow">LOCAL TOOLS. LASTING DIGITAL LIFE.</p><h1>There’s good work<br>buried in there.</h1><p class="at-lede">Old projects, forgotten experiments, folders from three computers ago. ArchiveTuna helps you discover what survived—and what deserves another look.</p><div class="at-actions"><a class="at-button" href="/docs/">Start exploring <span aria-hidden="true">↗</span></a><a class="at-text-link" href="/docs/example">Read an example report →</a></div><p class="at-small">Open source · Local Ollama · Your files stay yours</p></div>
<div class="at-record"><div class="at-record-top"><span>FIELD RECORD / 001</span><span class="at-stamp">LOCAL</span></div><p class="at-record-title">A little context, recovered.</p><pre class="at-tree">old-work/
├── garden-sensor/
│   ├── README.md
│   └── firmware/
├── garden-sensor-backup/
└── workshop-organizer/
    ├── bracket.stl
    └── notes.txt</pre><div class="at-find"><span class="at-score">86<small>/100</small></span><div><strong>Worth a second look</strong><p>A sensor prototype that fits your interest in small, useful hardware projects.</p></div></div><p class="at-record-caption">Illustrative report · fictional files and model judgment</p></div>
</section>
<section class="at-workflow"><div class="at-section-heading"><p class="at-eyebrow">DIGITAL ARCHAEOLOGY</p><h2>The files survived.<br>Recover the context.</h2><p>A folder name tells you where something is. A good description helps you remember why it mattered.</p></div><div class="at-steps"><article><span>01</span><div><h3>Survey the ground</h3><p>Map an archive and spot folders with matching names or metadata. Keep every candidate visible for a closer look.</p></div></article><article><span>02</span><div><h3>Follow your interests</h3><p>Choose how much evidence to share with a local model. Describe folders, then rank them against a profile you write.</p></div></article><article><span>03</span><div><h3>Keep your findings</h3><p>Save readable Markdown and structured JSON reports. Rebuild reports from saved results without another model call.</p></div></article></div></section>
<section class="at-start"><div><p class="at-eyebrow">START WITH A SURVEY</p><h2>A path back into<br>your own work.</h2><p>Inventory and duplicate candidate reports run without Ollama. Preview an analysis before letting the model read anything.</p><a class="at-text-link" href="/docs/getting-started">Follow the setup guide →</a></div><div class="at-terminal"><div class="at-terminal-top"><span>archivetuna</span><span>YOUR TERMINAL</span></div><pre><code>npm install -g archivetuna
archivetuna init
archivetuna scan ./old-work
archivetuna dupes
archivetuna run ./old-work \
  --profile profile.yaml --dry-run</code></pre><p>Node.js 22+. Install from npm, then start with a small archive.</p></div></section>
<section class="at-details"><article><p class="at-eyebrow">CAREFUL COMPARISONS</p><h3>A match is a clue.</h3><p>Matching filenames and sizes do not prove identical content. ArchiveTuna labels candidates clearly and never automatically deletes or merges your archive.</p><a href="/docs/duplicates">How comparisons work →</a></article><article><p class="at-eyebrow">MORE THAN TEXT</p><h3>Find the shape of an idea.</h3><p>For STL collections, generate view collages and adjacent notes with file facts and optional local vision descriptions.</p><a href="/docs/models">Explore the STL workflow →</a></article></section>
<section class="at-family"><div><p class="at-eyebrow">PART OF THE TUNA FAMILY</p><h2>Good things are worth keeping.</h2><p>ArchiveTuna uncovers the context in old folders. Its sibling MediaTuna helps you work with and preserve your media.</p></div><a class="at-text-link" href="https://mediatuna.dev">Meet MediaTuna ↗</a></section>
<p class="at-release"><strong>0.2.0 is available on npm.</strong> Start with an inventory, then add a local model for descriptions and rankings.</p>
</div>
