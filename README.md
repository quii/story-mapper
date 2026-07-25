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

## The grammar

The text format is line-based; indentation is cosmetic (purely for your own
readability) — structure comes entirely from the keyword at the start of each
line. Keywords are case-insensitive, and blank lines or lines starting with
`#` are ignored.

```
title: E-Commerce Platform

release: MVP @ 1
release: Beta @ 2

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
| `---` | Marks a tier break within the current task — everything above is tier 1, everything after the first `---` is tier 2, and so on. |
| `release: <name> @ <tier>` | Names a tier (e.g. `release: MVP @ 1`) so it gets a coloured band across the whole board. |

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
