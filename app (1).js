/* Arcade — lists every folder in /games and plays it in an iframe.
 *
 * Discovery order:
 *   1. GitHub contents API (zero maintenance — a pushed folder just appears)
 *   2. games/index.json manifest (fallback: offline, local file://, or API rate-limited)
 */

const CONFIG = {
  // Leave blank to auto-detect from the github.io URL.
  // Fill these in if you use a custom domain or want to test locally.
  owner: "",
  repo: "",
  branch: "main",
  dir: "games",
};

const ACCENTS = ["#45c4a0", "#ffc531", "#e2483d", "#7b6cf6", "#f28fb0"];

const el = (id) => document.getElementById(id);

/* ---------- repo detection ---------- */

function detectRepo() {
  if (CONFIG.owner && CONFIG.repo) {
    return { owner: CONFIG.owner, repo: CONFIG.repo };
  }
  const match = location.hostname.match(/^([\w-]+)\.github\.io$/i);
  if (!match) return null;

  const owner = match[1];
  const segments = location.pathname.split("/").filter((s) => s && !s.includes("."));
  const repo = segments.length ? segments[0] : `${owner}.github.io`;
  return { owner, repo };
}

/* ---------- discovery ---------- */

async function listFromApi() {
  const target = detectRepo();
  if (!target) return null;

  const url = `https://api.github.com/repos/${target.owner}/${target.repo}/contents/${CONFIG.dir}?ref=${CONFIG.branch}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) return null;
    const items = await res.json();
    if (!Array.isArray(items)) return null;
    return items.filter((i) => i.type === "dir").map((i) => i.name);
  } catch {
    return null;
  }
}

async function listFromManifest() {
  try {
    const res = await fetch(`${CONFIG.dir}/index.json`, { cache: "no-cache" });
    if (!res.ok) return null;
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.games;
    if (!Array.isArray(list)) return null;
    return list.map((g) => (typeof g === "string" ? g : g.folder)).filter(Boolean);
  } catch {
    return null;
  }
}

function titleFromFolder(folder) {
  return folder
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function readMeta(folder, index) {
  const fallback = {
    folder,
    title: titleFromFolder(folder),
    blurb: "No description yet. Add a game.json to this folder.",
    controls: "",
    year: "",
    accent: ACCENTS[index % ACCENTS.length],
  };
  try {
    const res = await fetch(`${CONFIG.dir}/${folder}/game.json`, { cache: "no-cache" });
    if (!res.ok) return fallback;
    const meta = await res.json();
    return { ...fallback, ...meta, folder };
  } catch {
    return fallback;
  }
}

async function loadGames() {
  const folders = (await listFromApi()) || (await listFromManifest());
  if (!folders || folders.length === 0) return [];
  const games = await Promise.all(folders.map(readMeta));
  return games.sort((a, b) => a.title.localeCompare(b.title));
}

/* ---------- rendering ---------- */

function renderRow(games) {
  const row = el("row");
  row.textContent = "";

  if (games.length === 0) {
    el("count").textContent = "no cabinets yet";
    const p = document.createElement("p");
    p.className = "status";
    p.textContent = "Nothing in /games yet. Add a folder with an index.html and it lands here.";
    row.append(p);
    return;
  }

  el("count").textContent = `${games.length} cabinet${games.length === 1 ? "" : "s"} plugged in`;

  for (const game of games) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "cab";
    card.style.setProperty("--accent", game.accent);
    card.addEventListener("click", () => play(game, true));

    const marquee = document.createElement("div");
    marquee.className = "cab-marquee";
    const title = document.createElement("h2");
    title.className = "cab-title";
    title.textContent = game.title;
    marquee.append(title);

    const body = document.createElement("div");
    body.className = "cab-body";

    const blurb = document.createElement("p");
    blurb.className = "cab-blurb";
    blurb.textContent = game.blurb;
    body.append(blurb);

    if (game.year || game.controls) {
      const meta = document.createElement("p");
      meta.className = "cab-meta";
      meta.textContent = [game.year, game.controls].filter(Boolean).join(" · ");
      body.append(meta);
    }

    const slot = document.createElement("div");
    slot.className = "cab-slot";
    const left = document.createElement("span");
    left.textContent = "Insert coin";
    const right = document.createElement("span");
    right.textContent = "▶ Play";
    slot.append(left, right);
    body.append(slot);

    card.append(marquee, body);
    row.append(card);
  }
}

/* ---------- play / back ---------- */

let library = [];

function play(game, pushHistory) {
  el("row").hidden = true;
  el("stage").hidden = false;
  el("stage-title").textContent = game.title;
  el("stage-controls").textContent = game.controls ? `Controls — ${game.controls}` : "";
  el("frame").src = `${CONFIG.dir}/${game.folder}/index.html`;
  if (pushHistory) {
    history.pushState({ folder: game.folder }, "", `?play=${encodeURIComponent(game.folder)}`);
  }
  window.scrollTo({ top: 0 });
}

function showRow(pushHistory) {
  el("frame").src = "about:blank";
  el("stage").hidden = true;
  el("row").hidden = false;
  if (pushHistory) history.pushState({}, "", location.pathname);
}

function syncFromUrl() {
  const folder = new URLSearchParams(location.search).get("play");
  const game = library.find((g) => g.folder === folder);
  if (game) play(game, false);
  else showRow(false);
}

/* ---------- boot ---------- */

el("back").addEventListener("click", () => showRow(true));

el("full").addEventListener("click", () => {
  const frame = el("frame");
  if (frame.requestFullscreen) frame.requestFullscreen();
});

window.addEventListener("popstate", syncFromUrl);

(async function boot() {
  library = await loadGames();
  renderRow(library);

  const target = detectRepo();
  el("repo-note").textContent = target
    ? `Reading ${target.owner}/${target.repo} → /${CONFIG.dir} on ${CONFIG.branch}.`
    : `Not on github.io — reading ${CONFIG.dir}/index.json instead. Set CONFIG.owner and CONFIG.repo in assets/app.js to use auto-discovery here.`;

  syncFromUrl();
})();
