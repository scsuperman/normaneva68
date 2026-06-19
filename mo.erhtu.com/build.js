/* ==========================================================================
   Static site generator for MOM GAMES
   Reads assets/js/games.json and outputs SEO-friendly static HTML:
     - index.html (home)
     - category/<slug>.html
     - game/<slug>-<id>.html
     - sitemap.xml, robots.txt
   No external dependencies. Run with: node build.js
   ========================================================================== */
const fs = require("fs");
const path = require("path");

/* ------------------------------ config ---------------------------------- */
const SITE_URL = "https://mo.erhtu.com";
const BRAND = "MOM GAMES";
const ADSENSE_CLIENT = "ca-pub-5899441324359347";
const AD_SLOT_DISPLAY = "5006059485";
const AD_SLOT_GAME = "8534501683";
const GA_ID = "G-EESGWMGEC0";
const ROOT = __dirname;

/* ------------------------------ helpers --------------------------------- */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&rsquo;|&#8217;/g, "\u2019")
    .replace(/&lsquo;|&#8216;/g, "\u2018")
    .replace(/&ldquo;/g, "\u201c")
    .replace(/&rdquo;/g, "\u201d")
    .replace(/&hellip;/g, "\u2026")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function plain(s) {
  return decodeEntities(String(s || "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function metaDesc(s, max) {
  const t = plain(s);
  const limit = max || 155;
  if (t.length <= limit) return t;
  return t.slice(0, limit - 1).replace(/\s+\S*$/, "") + "\u2026";
}

function slugify(s) {
  return decodeEntities(String(s || ""))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "game";
}

function cleanCat(name) {
  return String(name || "Misc").replace(/^\.+/, "").trim() || "Misc";
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function write(rel, content) {
  const full = path.join(ROOT, rel);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, content);
}

/* --------------------------- IP / copyright filter ----------------------- */
// Games whose title contains any of these (case-insensitive) are skipped to
// avoid hosting trademarked / copyrighted brands and characters.
const BLOCKLIST = [
  // Sandbox / Roblox ecosystem knockoffs
  "minecraft", "minescraft", "mine craft", "minecaft", "craftsman", "lokicraft",
  "mastercraft", "blockman", "blockcraft", "roblox", "obby", "rainbow friends",
  "huggy", "poppy playtime", "skibidi", "sprunki", "incredibox", "digital circus",
  // Nintendo / Sega
  "pokemon", "pikachu", "mario", "sonic", "zelda", "nintendo", "kirby", "luigi",
  // Marvel / DC
  "batman", "superman", "spiderman", "spider-man", "spider man", "marvel", "hulk",
  "thor", "avenger", "iron man", "ironman", "captain america", "venom", "deadpool",
  "redpool", "wolverine", "x-men",
  // Disney / fairy tale brands
  "disney", "frozen", "elsa", "moana", "little mermaid", "encanto", "cinderella",
  "rapunzel", "snow white", "mickey", "minnie",
  // Dolls / fashion brands
  "barbie", "barbi", "monster high", "lol omg", "l.o.l", "lol surprise",
  // K-pop / music IP
  "bts", "blackpink", "black pink",
  // Mobile / console game brands
  "talking tom", "my talking", "among us", "fortnite", "pubg", "free fire", "gta",
  "grand theft", "call of duty", "valorant", "fall guys", "fall boys", "brawl star",
  "clash of", "clash royale", "stumble guys", "subway surf", "temple run",
  "angry birds", "candy crush", "geometry dash", "friday night funkin", "fnf",
  "granny", "baldi", "poppy", "gacha", "toca", "adopt me", "royale high", "piggy",
  // Other IP / characters
  "hello kitty", "sanrio", "kuromi", "squid game", "squid maze", "fnaf",
  "five nights", "freddy", "ben 10", "ben10", "gumball", "paw patrol", "peppa",
  "cocomelon", "bluey", "naruto", "dragon ball", "goku", "one piece", "sailor moon",
  "demon slayer", "siren head", "wednesday", "addams",
];

function isBlocked(title) {
  const t = decodeEntities(String(title || "")).toLowerCase();
  return BLOCKLIST.some((k) => t.includes(k));
}

/* ------------------------------ data ------------------------------------ */
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/js/games.json"), "utf8"));
let allGames = Array.isArray(raw) ? raw.flat() : Object.values(raw).flat();

// de-duplicate by id, drop blocked IP games, and attach derived fields
const seenIds = new Set();
const games = [];
let blockedCount = 0;
for (const g of allGames) {
  if (!g || !g.title || !g.url || seenIds.has(g.id)) continue;
  if (isBlocked(g.title)) {
    blockedCount++;
    continue;
  }
  seenIds.add(g.id);
  const cat = cleanCat(g.category);
  games.push({
    id: g.id,
    title: decodeEntities(g.title),
    rawTitle: g.title,
    description: g.description || "",
    instructions: g.instructions || "",
    url: g.url,
    category: cat,
    catSlug: slugify(cat),
    tags: (g.tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    thumb: g.thumb,
    slug: slugify(g.title) + "-" + g.id,
  });
}

// group by category, preserve insertion order
const categoryMap = new Map();
for (const g of games) {
  if (!categoryMap.has(g.category)) categoryMap.set(g.category, []);
  categoryMap.get(g.category).push(g);
}
const categories = [...categoryMap.entries()]
  .map(([name, list]) => ({ name, slug: slugify(name), games: list }))
  .sort((a, b) => b.games.length - a.games.length);

/* ------------------------------ partials -------------------------------- */
function headTag({ title, description, canonical, image, base, robots }) {
  const img = image || SITE_URL + "/logo.png";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  ${robots ? `<meta name="robots" content="${esc(robots)}">` : `<meta name="robots" content="index, follow">`}
  <link rel="canonical" href="${esc(canonical)}">
  <link rel="icon" href="${base}logo.png">
  <link rel="stylesheet" href="${base}prod-css/site.css">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(BRAND)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${esc(img)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(img)}">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>
</head>`;
}

function header(base, activeSlug) {
  const navItems = categories
    .map(
      (c) =>
        `<a href="${base}category/${c.slug}.html"${
          activeSlug === c.slug ? ' class="is-active"' : ""
        }>${esc(c.name)}</a>`
    )
    .join("\n        ");
  return `<header class="site-header">
  <div class="container site-header__inner">
    <a class="brand" href="${base}index.html" aria-label="${esc(BRAND)} home">
      <img src="${base}logo.png" alt="${esc(BRAND)} logo">
      <span>${esc(BRAND)}</span>
    </a>
    <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false" onclick="toggleNav(this)">&#9776;</button>
    <nav class="main-nav" id="mainNav">
        ${navItems}
    </nav>
    <a class="header-search" href="${base}search.html" aria-label="Search games">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
      <span>Search</span>
    </a>
  </div>
</header>
<script>
  function toggleNav(btn){var n=document.getElementById('mainNav');var o=n.classList.toggle('is-open');btn.setAttribute('aria-expanded',o);}
</script>`;
}

function footer(base) {
  const cats = categories
    .map((c) => `<a href="${base}category/${c.slug}.html">${esc(c.name)}</a>`)
    .join("\n          ");
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <a class="brand" href="${base}index.html">
          <img src="${base}logo.png" alt="${esc(BRAND)} logo">
          <span>${esc(BRAND)}</span>
        </a>
        <p style="color:var(--text-muted);max-width:320px;margin-top:10px;font-size:.9rem;">
          Free online HTML5 games you can play instantly in your browser, on any device. No downloads, no installs.
        </p>
      </div>
      <nav class="footer-cats" aria-label="Game categories">
          ${cats}
      </nav>
    </div>
    <div class="footer-bottom">
      <span>&copy; ${new Date().getFullYear()} ${esc(BRAND)}. All rights reserved.</span>
      <nav class="footer-links">
        <a href="${base}PrivacyPolicy.html">Privacy Policy</a>
        <a href="${base}TermsofService.html">Terms of Service</a>
        <a href="${base}search.html">Search</a>
      </nav>
    </div>
  </div>
</footer>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA_ID}');
</script>
</body>
</html>`;
}

function adSlot(slot) {
  return `<div class="ad-slot container">
  <div class="ad-slot__label">Advertisement</div>
  <ins class="adsbygoogle" style="display:block"
    data-ad-client="${ADSENSE_CLIENT}"
    data-ad-slot="${slot}"
    data-ad-format="auto"
    data-full-width-responsive="true"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>`;
}

function gameCard(g, base) {
  return `<a class="game-card" href="${base}game/${g.slug}.html">
  <img class="game-card__thumb" src="${esc(g.thumb)}" alt="${esc(g.title)}" loading="lazy" decoding="async" width="512" height="384">
  <span class="game-card__badge">${esc(g.category)}</span>
  <div class="game-card__title">${esc(g.title)}</div>
</a>`;
}

function gameGrid(list, base) {
  return `<div class="game-grid-wrap">
<div class="game-grid">
${list.map((g) => gameCard(g, base)).join("\n")}
</div>
</div>`;
}

/* ------------------------------ pages ----------------------------------- */
function buildHome() {
  const base = "";
  const canonical = SITE_URL + "/";
  const hot = games.slice(0, 12);
  const featured = hot[0];
  const title = `${BRAND} - Play Free Online Games Instantly`;
  const description =
    "Play hundreds of free online HTML5 games at MOM GAMES. Adventure, arcade, racing, puzzle, sports and more - no download, play instantly in your browser on any device.";

  const sections = [];
  sections.push(`<section class="section container" id="hot">
  <div class="section__head"><h2>Hot Games</h2></div>
  ${gameGrid(hot, base)}
</section>`);

  for (const c of categories) {
    const list = c.games.slice(0, 12);
    if (!list.length) continue;
    sections.push(`<section class="section container">
  <div class="section__head">
    <h2>${esc(c.name)}</h2>
    <a class="more-link" href="${base}category/${c.slug}.html">View all ${c.games.length} &rsaquo;</a>
  </div>
  ${gameGrid(list, base)}
</section>`);
  }

  const ld = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND,
    url: SITE_URL + "/",
    potentialAction: {
      "@type": "SearchAction",
      target: SITE_URL + "/search.html?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const html = `${headTag({ title, description, canonical, base })}
<body>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
${header(base, null)}
<main>
  <div class="container">
    <section class="hero">
      <h1>Play Free Online Games, Anytime, Anywhere</h1>
      <p>Discover ${games.length}+ free HTML5 games across ${categories.length} categories. No downloads, no sign-up - just tap and play instantly on your phone, tablet or computer.</p>
      <a class="btn" href="${base}game/${featured.slug}.html">&#9658; Play ${esc(featured.title)}</a>
    </section>
  </div>

  ${adSlot(AD_SLOT_DISPLAY)}

  ${sections.join("\n\n  ")}

  <div class="container">
    <section class="seo-block">
      <h2>About ${BRAND}</h2>
      <p>${BRAND} is a free online games portal where you can play a huge collection of HTML5 browser games instantly. Whether you love fast-paced arcade action, brain-teasing puzzles, high-speed racing, or relaxing casual games, you will find something to enjoy here - all playable directly in your web browser with no downloads or installations required.</p>
      <p>Our games work seamlessly across desktops, laptops, tablets and smartphones. Just open the site, pick a game and start playing. New titles are added regularly, so there is always something fresh to discover. Browse by category to quickly find your favourite genre, or use the search to jump straight to a specific game.</p>
    </section>
  </div>
</main>
${footer(base)}`;

  write("index.html", html);
}

function buildCategory(c) {
  const base = "../";
  const canonical = `${SITE_URL}/category/${c.slug}.html`;
  const title = `${c.name} Games - Play Free Online | ${BRAND}`;
  const description = `Play the best free ${c.name.toLowerCase()} games online at ${BRAND}. ${c.games.length} ${c.name.toLowerCase()} games to play instantly in your browser, no download needed.`;

  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL + "/" },
      { "@type": "ListItem", position: 2, name: c.name + " Games", item: canonical },
    ],
  };

  const html = `${headTag({ title, description, canonical, base })}
<body>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
${header(base, c.slug)}
<main>
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="${base}index.html">Home</a> <span>&rsaquo;</span> <span>${esc(c.name)} Games</span>
    </nav>
    <h1 style="font-size:1.7rem;margin-bottom:8px;">${esc(c.name)} Games</h1>
    <p style="color:var(--text-muted);max-width:760px;margin-bottom:20px;">Browse our collection of ${c.games.length} free ${esc(
    c.name.toLowerCase()
  )} games. Click any game to start playing instantly in your browser.</p>
  </div>
  ${adSlot(AD_SLOT_DISPLAY)}
  <section class="section container">
    ${gameGrid(c.games, base)}
  </section>
</main>
${footer(base)}`;

  write(path.join("category", c.slug + ".html"), html);
}

function buildGame(g) {
  const base = "../";
  const canonical = `${SITE_URL}/game/${g.slug}.html`;
  const title = `${g.title} - Play Free Online | ${BRAND}`;
  const description = metaDesc(
    g.description || `Play ${g.title} for free online at ${BRAND}. ${g.category} game, no download required.`
  );
  const similar = categoryMap
    .get(g.category)
    .filter((x) => x.id !== g.id)
    .slice(0, 12);

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "VideoGame",
      name: g.title,
      description: plain(g.description) || `Play ${g.title} online for free.`,
      image: g.thumb,
      url: canonical,
      genre: g.category,
      applicationCategory: "Game",
      operatingSystem: "Web Browser",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL + "/" },
        {
          "@type": "ListItem",
          position: 2,
          name: g.category + " Games",
          item: `${SITE_URL}/category/${g.catSlug}.html`,
        },
        { "@type": "ListItem", position: 3, name: g.title, item: canonical },
      ],
    },
  ];

  const tagsHtml = g.tags.length
    ? `<div class="tag-row">${g.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>`
    : "";

  const instructionsHtml = plain(g.instructions)
    ? `<h2>How to Play</h2><p>${esc(plain(g.instructions))}</p>`
    : "";

  const html = `${headTag({ title, description, canonical, image: g.thumb, base })}
<body>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
${header(base, g.catSlug)}
<main>
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="${base}index.html">Home</a> <span>&rsaquo;</span>
      <a href="${base}category/${g.catSlug}.html">${esc(g.category)}</a> <span>&rsaquo;</span>
      <span>${esc(g.title)}</span>
    </nav>

    <div class="play-layout">
      <div>
        <div class="game-stage">
          <div class="game-stage__frame" id="gameFrame">
            <div class="game-cover" data-url="${esc(g.url)}" onclick="launchGame(this)" style="background-image:url('${esc(
    g.thumb
  )}')">
              <div class="game-cover__title">${esc(g.title)}</div>
              <button class="btn play-btn-big" type="button" onclick="event.stopPropagation();launchGame(this.parentElement)">&#9658; Play Now</button>
            </div>
          </div>
          <div class="game-meta">
            <h1>${esc(g.title)}</h1>
            <div class="tag-row"><span class="tag">${esc(g.category)}</span></div>
            ${tagsHtml}
            <div class="prose">
              <h2>About ${esc(g.title)}</h2>
              <p>${g.description ? g.description : esc("Play " + g.title + " for free online.")}</p>
              ${instructionsHtml}
            </div>
          </div>
        </div>
      </div>
      <aside class="sidebar">
        ${adSlot(AD_SLOT_GAME).replace(' container', "")}
      </aside>
    </div>
  </div>

  <section class="section container">
    <div class="section__head">
      <h2>More ${esc(g.category)} Games</h2>
      <a class="more-link" href="${base}category/${g.catSlug}.html">View all &rsaquo;</a>
    </div>
    ${gameGrid(similar, base)}
  </section>
</main>
<script>
  function launchGame(cover){
    var url = cover.getAttribute('data-url');
    var frame = document.getElementById('gameFrame');
    frame.innerHTML = '<iframe src="' + url + '" title="${esc(
      g.title
    )}" allow="fullscreen; autoplay; gamepad; accelerometer; gyroscope" allowfullscreen loading="lazy"></iframe>';
  }
</script>
${footer(base)}`;

  write(path.join("game", g.slug + ".html"), html);
}

function buildSearch() {
  const base = "";
  const canonical = SITE_URL + "/search.html";
  const title = `Search Games - ${BRAND}`;
  const description = `Search ${games.length}+ free online games at ${BRAND}. Find your favourite game and play instantly in your browser.`;

  const html = `${headTag({ title, description, canonical, base, robots: "noindex, follow" })}
<body>
${header(base, null)}
<main class="container">
  <div class="search-wrap">
    <h1 style="font-size:1.6rem;margin-bottom:14px;">Search Games</h1>
    <input id="searchInput" class="search-input" type="search" placeholder="Type a game name..." autocomplete="off" aria-label="Search games">
  </div>
  <p id="searchHint" style="color:var(--text-muted);margin-bottom:16px;"></p>
  <div class="game-grid" id="results"></div>
  <div id="empty"></div>
</main>
<script>
  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

  var allGames=[];
  var params=new URLSearchParams(location.search);
  var category=params.get("category");
  var q=params.get("q")||"";

  function card(g){
    return '<a class="game-card" href="game/'+g.slug+'.html">'+
      '<img class="game-card__thumb" src="'+esc(g.thumb)+'" alt="'+esc(g.title)+'" loading="lazy" width="512" height="384">'+
      '<span class="game-card__badge">'+esc(g.category)+'</span>'+
      '<div class="game-card__title">'+esc(g.title)+'</div></a>';
  }

  function render(list){
    var results=document.getElementById("results");
    var empty=document.getElementById("empty");
    if(!list.length){
      results.innerHTML="";
      empty.innerHTML='<div class="empty-state"><h2>No games found</h2><p>Try a different keyword or browse our categories.</p></div>';
      return;
    }
    empty.innerHTML="";
    results.innerHTML=list.slice(0,120).map(card).join("");
  }

  function search(){
    var term=(document.getElementById("searchInput").value||"").trim().toLowerCase();
    var hint=document.getElementById("searchHint");
    var list=allGames;
    if(category){list=list.filter(function(g){return (g.category||"").toLowerCase()===category.toLowerCase();});}
    if(term){list=list.filter(function(g){return (g.title||"").toLowerCase().indexOf(term)>-1;});}
    hint.textContent=(category?("Category: "+category+" \\u00b7 "):"")+list.length+" game(s)";
    render(list);
  }

  fetch("assets/js/games.public.json").then(function(r){return r.json();}).then(function(d){
    allGames=d;
    var input=document.getElementById("searchInput");
    input.value=q;
    input.addEventListener("input",search);
    search();
  });
</script>
${footer(base)}`;

  write("search.html", html);
}

function buildLegal(file, title, description, inner) {
  const base = "";
  const canonical = `${SITE_URL}/${file}`;
  const html = `${headTag({ title, description, canonical, base })}
<body>
${header(base, null)}
<main class="container">
  <article class="legal">
${inner}
  </article>
</main>
${footer(base)}`;
  write(file, html);
}

function buildLegalPages() {
  buildLegal(
    "PrivacyPolicy.html",
    `Privacy Policy - ${BRAND}`,
    `Privacy Policy for ${BRAND}, including how cookies and third-party advertising such as Google AdSense are used.`,
    `    <h1>Privacy Policy</h1>
    <p><em>Last updated: June 19, 2026</em></p>
    <p>Welcome to ${BRAND} ("we", "our", or "us"). We value your privacy. This Privacy Policy explains what information is collected when you visit our website, how it is used, and the choices you have. By using our website, you agree to the practices described in this Privacy Policy.</p>
    <h2>Information We Collect</h2>
    <p>Our website is a free online games portal. You do not need to create an account or provide personal details to play. We may collect the following information automatically:</p>
    <ul>
      <li><strong>Device and Log Information</strong>: such as your IP address, browser type, operating system, referring pages, and the date and time of your visit.</li>
      <li><strong>Usage Information</strong>: such as the pages and games you view and how you interact with the site, collected through analytics tools.</li>
      <li><strong>Cookies and Similar Technologies</strong>: used to remember preferences, measure traffic, and serve advertising.</li>
    </ul>
    <h2>Cookies</h2>
    <p>Cookies are small text files stored on your device. We and our partners use cookies to operate the site, understand traffic through analytics, and deliver and measure advertising. You can disable cookies in your browser settings, although some features may not work properly as a result.</p>
    <h2>Advertising and Third-Party Vendors</h2>
    <ul>
      <li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.</li>
      <li>Google's use of advertising cookies enables it and its partners to serve ads to users based on their visit to this site and/or other sites on the Internet.</li>
      <li>You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener">Google Ads Settings</a>.</li>
      <li>You can also opt out of a third-party vendor's use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener">www.aboutads.info</a>.</li>
      <li>For more information, see <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">How Google uses information from sites or apps that use our services</a>.</li>
    </ul>
    <h2>Analytics</h2>
    <p>We use Google Analytics to understand how visitors use our website. You can learn more at <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google's Privacy Policy</a>.</p>
    <h2>Third-Party Games and Links</h2>
    <p>The games featured on our website are provided by third-party game providers and may be embedded from external sources. These third parties may have their own privacy practices, which we do not control.</p>
    <h2>Children's Privacy</h2>
    <p>Our website is not directed to children under the age of 13, and we do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will take steps to remove it.</p>
    <h2>Changes to This Privacy Policy</h2>
    <p>We may update this Privacy Policy from time to time. We will post any changes on this page and update the date above. Your continued use of our website after any changes constitutes your acceptance of the updated Privacy Policy.</p>
    <h2>Contact Us</h2>
    <p>If you have any questions about this Privacy Policy, please contact us at: gyhsuperman999@gmail.com</p>`
  );

  buildLegal(
    "TermsofService.html",
    `Terms of Service - ${BRAND}`,
    `Terms of Service for ${BRAND}, a free online HTML5 games portal.`,
    `    <h1>Terms of Service</h1>
    <p><em>Last updated: June 19, 2026</em></p>
    <p>Welcome to ${BRAND} ("we", "our", or "us"). By accessing or using our website, you agree to comply with and be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our website.</p>
    <h2>Use of the Website</h2>
    <p>Our website provides free online games for entertainment purposes. You may use the website for personal, non-commercial use only. No account or registration is required to play.</p>
    <h3>Eligibility</h3>
    <p>Our website is intended for users aged 13 and over. If you are under the age of 13, please do not use this website.</p>
    <h3>Prohibited Conduct</h3>
    <p>You agree not to:</p>
    <ul>
      <li>Use the website for any illegal or unauthorized purpose.</li>
      <li>Interfere with or disrupt the operation, integrity, or performance of the website.</li>
      <li>Attempt to gain unauthorized access to our website, servers, or any related systems.</li>
      <li>Use automated means (such as bots or scrapers) to access the website or generate artificial traffic.</li>
      <li>Interfere with, deceive, or artificially manipulate any advertising displayed on the website.</li>
    </ul>
    <h2>Third-Party Games and Content</h2>
    <p>The games on our website are provided by third-party developers and may be embedded from external sources. We do not own these games and are not responsible for their content. All trademarks and intellectual property belong to their respective owners. If you believe any content infringes your rights, please contact us and we will review and remove it where appropriate.</p>
    <h2>Intellectual Property</h2>
    <p>The layout, design, and original text of this website are owned by us or our licensors. You agree not to reproduce, distribute, or create derivative works from our original content without prior written permission.</p>
    <h2>Advertising</h2>
    <p>This website is supported by advertising, including ads served by Google. Please see our <a href="PrivacyPolicy.html">Privacy Policy</a> for details on how advertising cookies are used and how to opt out of personalized advertising.</p>
    <h2>Disclaimers</h2>
    <p>Our website and its content are provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the website will be uninterrupted, error-free, or free of harmful components.</p>
    <h2>Limitation of Liability</h2>
    <p>To the fullest extent permitted by law, we are not liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of, or inability to use, the website or any third-party content accessed through it.</p>
    <h2>Changes to These Terms</h2>
    <p>We may update these Terms from time to time. We will post any changes on this page and update the date above. Your continued use of the website after any changes constitutes your acceptance of the updated Terms.</p>
    <h2>Contact Us</h2>
    <p>If you have any questions about these Terms, please contact us at: gyhsuperman999@gmail.com</p>`
  );
}

function buildPublicData() {
  const data = games.map((g) => ({
    id: g.id,
    title: g.title,
    thumb: g.thumb,
    category: g.category,
    url: g.url,
    slug: g.slug,
  }));
  write("assets/js/games.public.json", JSON.stringify(data));
}

function buildSitemap() {
  const now = new Date().toISOString().slice(0, 10);
  const urls = [];
  const add = (loc, priority, changefreq) =>
    urls.push(
      `  <url><loc>${loc}</loc><lastmod>${now}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
    );

  add(SITE_URL + "/", "1.0", "daily");
  add(SITE_URL + "/PrivacyPolicy.html", "0.3", "yearly");
  add(SITE_URL + "/TermsofService.html", "0.3", "yearly");
  for (const c of categories) add(`${SITE_URL}/category/${c.slug}.html`, "0.8", "weekly");
  for (const g of games) add(`${SITE_URL}/game/${g.slug}.html`, "0.7", "weekly");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
  write("sitemap.xml", xml);
}

function buildRobots() {
  const txt = `User-agent: *
Allow: /
Disallow: /search.html

Sitemap: ${SITE_URL}/sitemap.xml
`;
  write("robots.txt", txt);
}

/* ------------------------------ run ------------------------------------- */
// clean previous generated dirs
for (const dir of ["game", "category"]) {
  const p = path.join(ROOT, dir);
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

buildHome();
for (const c of categories) buildCategory(c);
for (const g of games) buildGame(g);
buildSearch();
buildLegalPages();
buildPublicData();
buildSitemap();
buildRobots();

console.log(
  `Built: 1 home, ${categories.length} categories, ${games.length} games ` +
    `(blocked ${blockedCount} IP/copyright titles), sitemap (${
      games.length + categories.length + 3
    } urls), robots.txt`
);
