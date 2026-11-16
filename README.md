# Football Career Simulator

Live a whole football career, one summer decision at a time. Pick a position, a continent and a nation, start at 17 in an academy, and decide at every transfer window: stay, move, go on loan, negotiate. The game plays out each season match by match, and the career ends with a legacy score, a Hall of Fame entry and a shareable career card.

**Play it:** `https://aryamaanbanerjee.github.io/football-career-simulator/` (works once GitHub Pages is switched on; see below)

It's a single web page with no server and no accounts. Saves stay in your own browser.

## What's in the game

- **Careers:** 10 positions, 346 real clubs in 18 leagues across five continents, transfers, loans, negotiation, contracts with bonuses and clauses, and three save slots.
- **Seasons, match by match:** fixtures, league tables, cups and continental competitions, a winter transfer window, and squad competition for your place.
- **Your player:** about 20 detailed attributes, training focus, a weak foot, traits, learning new positions, and injuries with real recovery times.
- **The world around you:** champions of every league, fictional world stars who move and retire, Ballon d'Or podiums, managers who come and go, press conferences, and sponsors.
- **Stories:** hundreds of short story moments with choices, a best mate, a rival, and a sticker album that carries over between careers.
- **Settings:** three difficulty levels (Relaxed, Normal, Ambitious), three detail levels (Light, Standard, Full), dark and light themes, a larger-text option, and full keyboard and screen-reader support.

Clubs are real. Every person in the game is fictional and generated for each career.

## Folder layout

```
docs/       the playable game, ready for GitHub Pages (index.html plus files for installing it as an app)
src/        the source code
  index.html    page template (the build inserts the styles and code)
  styles.css    one stylesheet, in labelled sections
  js/           numbered modules, joined in order by the build
  fonts/        Barlow Condensed (SIL Open Font License, licence text included)
  pwa/          app manifest, offline support and icons
tests/      automated tests (Node)
build.cjs   builds the single-file game into dist/
```

## Building and testing (optional)

You only need this if you change the code. It requires [Node.js](https://nodejs.org) 18 or newer.

```
npm run build      # makes dist/football-career-simulator-v14.1.html and dist/pwa/
npm test           # runs the automated tests
npm run balance    # plays many careers and prints a balance table
```

After building, copy everything from `dist/pwa/` into `docs/` to update the playable version.

## Legacy score (out of 1000)

| Category | Max |
|---|---|
| Match performance | 150 |
| Team trophies | 200 |
| Ballon d'Or | 150 |
| Individual awards | 100 |
| International career | 100 |
| Club legacy | 100 |
| Peak value | 100 |
| Longevity and output | 100 |

## Good to know

- A **career code** (for example `ST-EU-ENG-2-35-B-C-K7Q2M9`) fixes the random seed: the same code and the same choices give the same career.
- Saves live in the browser's local storage. Use **Settings → Backups** to download a career and load it on another device.
- The game collects no data and needs no internet connection after it loads.
