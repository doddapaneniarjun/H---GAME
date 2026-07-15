# Arcade

A GitHub Pages site that lists every folder in `/games` and plays it in an iframe. Push a game, it shows up. There's no build step and no list to maintain.

## Setup

1. Create a repo and drop these files at its root.
2. Push to `main`.
3. Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)`.
4. Open `https://YOURNAME.github.io/YOURREPO/`.

The site reads your own repo's `/games` folder through the GitHub API and figures out the owner and repo name from the URL. Nothing to configure.

**If you use a custom domain**, auto-detection can't work from the hostname — open `assets/app.js` and fill in `CONFIG.owner` and `CONFIG.repo`.

**If your default branch isn't `main`**, change `CONFIG.branch`.

## Adding a game

```
games/
  your-game/
    index.html      <- required, the entry point
    game.json       <- optional metadata
    (anything else: js, css, sprites, sounds)
```

`game.json`:

```json
{
  "title": "Your Game",
  "blurb": "One or two sentences for the card.",
  "controls": "Arrows · Space to jump",
  "year": "2026",
  "accent": "#7b6cf6"
}
```

Every field is optional. Without it, the title is derived from the folder name and an accent is picked from a rotation.

Deep links work: `?play=your-game` opens straight into a cabinet.

## The fallback

Unauthenticated GitHub API calls are limited to 60 per hour per IP. If that's hit — or you're opening the site locally — the page falls back to `games/index.json`:

```json
{ "games": ["snake", "your-game"] }
```

Keeping it current is optional. It only matters when the API is unavailable.

## Local preview

`file://` won't work (fetch is blocked). Serve it:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Locally, discovery uses `games/index.json` unless you set `CONFIG.owner` / `CONFIG.repo`.
