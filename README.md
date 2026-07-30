# Story Mapper

A live, in-browser story mapping tool. Write your map as plain text, watch it turn
into an interactive board of index cards you can drag, drop, and reorganise — no
account, no install, no backend.

**Try it: https://story-mapper-2316.fly.dev**

## What is story mapping?

Story mapping is a technique for planning product work invented by
[Jeff Patton](https://jpattonassociates.com/story-mapping/). Instead of a flat,
one-dimensional backlog, stories are arranged on two axes:

- **Horizontally**, the *backbone* — the big steps a user takes through your
  product, left to right, in the order they'd actually do them (an **activity**
  like "Purchase", broken into **tasks** like "Cart" and "Checkout").
- **Vertically**, priority — each task's **stories** are stacked with the
  most important ones on top, sliced into **release** tiers ("MVP", "Beta", ...)
  that mark how deep into each column a given release reaches.

The point is to keep the whole shape of the product visible at once, so a team
can agree on a thin, coherent "walking skeleton" release instead of just
grinding through backlog items in whatever order they were filed.

## What this tool does

- Type the map as plain text in the left-hand editor; the right-hand canvas
  renders it live as a board of cards.
- Edit directly on the canvas too — rename cards inline, drag stories between
  cells, drag whole task columns to reorder them, drag release lines up and
  down — and the text updates to match. It's kept in sync both ways.
- Mark a story done by clicking its checkbox.
- Attach a ticket link to any story (`[PROJ-101](https://...)`), shown as a
  clickable badge on the card.
- The editor flags mistakes as you type — misspelled keywords, a `task:`
  with no `activity:` above it, an empty activity — each with a line number
  and, where possible, a suggested fix.
- Export the current map as a standalone SVG or HTML file.

## Sharing

There's no backend, no login, and no database — the entire map lives in the
URL itself. Every edit re-encodes the text into the URL's hash (debounced, so
it's not fighting you while you type), so the address bar is always a
complete, shareable snapshot of the map. Hit **Share** to copy it. Send that
URL to anyone and they see exactly what you see — no server round-trip
required to load it.

Because there's no server, the map also can't be lost to your browser
history: as a safety net, the same state is mirrored into `localStorage`, so
reloading — or opening a fresh tab with no hash — recovers your last edit
even if you never copied the link.

The tradeoff is that there's currently no single permanent URL for a map that
a team keeps coming back to and editing over time (see the "back pocket" idea
of an opt-in short-link service, not yet built).

### Loading from a source URL

For a team that keeps the map text under source control — say, a `.txt` file
in a GitHub repo — add `?src=<url>` to point the app at it instead of
encoding content in the hash:

```
https://your-story-mapper/?src=https://raw.githubusercontent.com/your-org/your-repo/main/storymap.txt
```

On first load the app fetches that URL and shows the result. From then on,
the URL hash is left alone (so the `?src=` link stays a clean, stable
pointer) and edits are kept in `localStorage` instead, so a stray refresh
never loses work. Hit **Sync from source** in the toolbar to discard local
edits and pull the latest version — useful after someone else has updated
the file upstream.

There's no write-back: this app has no backend and can't push commits, so
syncing changes into the repo is still a manual step (copy the text out of
the editor and commit it yourself). The `src` URL must be reachable and
CORS-enabled from wherever the app is hosted — `raw.githubusercontent.com`
sends permissive CORS headers, so it works out of the box for a **public**
repo. A private repo's raw URL requires an `Authorization` header that
plain `fetch()` can't attach without exposing a token in the page, so don't
put a GitHub token in the `src` URL. For a private repo, either mirror the
file to somewhere that doesn't need auth (an internal webserver, a private
S3/GCS bucket with signed access, etc.) or keep this as a future extension
point for a small proxy/token-exchange endpoint.

This composes with self-hosting: the app is a static build (see
[Deployment](#deployment)) with no server-side dependency on where the
source file lives, so a team can run it privately on their own webserver
(keeping the *app* private) while `?src=` points at wherever the *map
file* actually lives.

The neatest version of this sidesteps CORS entirely: if a team already has a
webapp with its own static-assets folder under source control, they can
build story-mapper's `dist/` into that same folder (as a sibling path, e.g.
`/tools/storymap/`, not the root, or it'll collide with their own
`index.html`) and check the map's `.txt` file into that same folder. Both
are then served from the same origin as the rest of their site, so `?src=`
can be a plain relative path (`?src=/storymap.txt`) — no CORS headers, no
GitHub auth, and whatever access control already guards the static folder
covers the map too. Deploying story-mapper under a subpath like that needs
Vite's [`base`](https://vite.dev/config/shared-options.html#base) config
option set to that subpath so its built asset URLs resolve correctly.

## The grammar

The text format is line-based; indentation is cosmetic (purely for your own
readability) — structure comes entirely from the keyword at the start of each
line. Keywords are case-insensitive, and blank lines or lines starting with
`#` are ignored.

```
title: E-Commerce Platform

release: MVP @ 1
release: Beta @ 3

activity: Discovery
  task: Search
    story: Search by keyword [PROJ-101](https://example.com/PROJ-101)
    story: Filter by category
    ---
    story: Save search
  task: Browse
    story: View product list
    ---
    story: Infinite scroll

activity: Purchase
  task: Cart
    story: Add to cart
    ---
    story: ~Save cart for later
```

| Keyword | Meaning |
|---|---|
| `title: <text>` | Optional map title. |
| `activity: <text>` | Starts a new activity (a backbone column group). |
| `task: <text>` | Starts a new task under the current activity. |
| `story: <text>` | Adds a story to the current task. |
| `---` | Skips this task down to the next row. It doesn't hold a story itself — it just pushes everything below it, in *this task only*, one row later, so a shorter task's later stories can still land in a later release. |
| `release: <name> @ <row>` | Draws a named line directly below physical row `<row>`, the same row for every task on the board. Stories above the line (or above no line yet) belong to that release or an earlier one. |

Rows are literal and counted straight down each task's own list of stories —
`release: MVP @ 1` always sits right below the first row, full stop. Whether a
story lands above or below a release line is purely a function of which row
it's on; `---` is the only way to nudge a task's later stories down past a
release they'd otherwise fall inside.

A couple of extras that live in the story text itself, rather than as
keywords:

- Prefixing the story text with `~` (e.g. `story: ~Save cart`) marks it
  done — same as ticking its checkbox on the canvas.
- Ending a story with a bare URL or a `[label](url)` link attaches a
  clickable ticket badge to the card.

Get it wrong and the editor tells you why: a `task:` before any `activity:`,
a typo'd keyword, an activity with no tasks, and so on all show up as
diagnostics with a line number.

## Development

Requires Node 22+.

```bash
npm install
npm run dev      # start the dev server
npm test         # run the test suite (vitest)
npm run lint     # oxlint
npm run build    # type-check (tsc) and produce a production build in dist/
```

CI (`.github/workflows/ci.yml`) runs lint, test, and build on every push to
`main` and on every pull request.

## Deployment

The app is a static site — `npm run build` produces `dist/`, and the
`Dockerfile` here builds it and serves it with a minimal static file server.
It's currently deployed to [Fly.io](https://fly.io) (`fly.toml`), redeployed
automatically on every push to `main` via
`.github/workflows/fly-deploy.yml`.
