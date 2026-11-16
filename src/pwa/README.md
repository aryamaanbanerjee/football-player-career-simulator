# Installable version (web app)

These files let people install the game on a phone or computer and play offline.
A web app has to be served from a website (https), so this folder is for hosting;
the single `football-career-simulator-v14.1.html` file still works on its own.

1. Upload everything in this folder to any static host (GitHub Pages, Netlify Drop, Cloudflare Pages…).
2. Open the address on a phone. Use "Add to Home Screen" (iPhone) or "Install app" (Android / desktop Chrome).
3. After the first visit it works offline. Saves stay on that device.

When you update the game, change `VERSION` in `sw.js` so phones pick up the new copy.
