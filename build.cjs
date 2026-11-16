// Bundles src/ into one self-contained HTML file (no dependencies), like the original single-file game.
// Usage: node build.cjs   ->  dist/football-career-simulator-v14.1.html
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, 'src');
const css = ['styles.css'].map((f) => fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
const jsDir = path.join(src, 'js');
const files = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js')).sort();
const js = files.map((f) => `    /* ---- ${f} ---- */\n${fs.readFileSync(path.join(jsDir, f), 'utf8')}`).join('\n');
// v8: embed the display font (SIL Open Font License, see src/fonts) so the single file stays offline.
const fontDir = path.join(src, 'fonts');
const fonts = [800].map((w) => `    @font-face { font-family: "Barlow Condensed"; font-style: normal; font-weight: 600 900; font-display: swap; src: url(data:font/woff2;base64,${fs.readFileSync(path.join(fontDir, `barlow-condensed-latin-${w}-normal.woff2`)).toString('base64')}) format("woff2"); }`).join('\n');
let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
html = html.replace('/*__CSS__*/', () => css.replace('/*__FONTS__*/', () => fonts)).replace('//__JS__', () => js);
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
const out = path.join(__dirname, 'dist', 'football-career-simulator-v14.1.html');
fs.writeFileSync(out, html);

// v8: installable web-app copy (needs a website to install; the single file above still works offline on its own).
const pwaDir = path.join(__dirname, 'dist', 'pwa');
fs.mkdirSync(pwaDir, { recursive: true });
const pwaHtml = html
  .replace('</head>', '  <link rel="manifest" href="manifest.webmanifest" />\n  <meta name="theme-color" content="#111317" />\n  <link rel="icon" href="icon.svg" type="image/svg+xml" />\n  <link rel="apple-touch-icon" href="icon-192.png" />\n  <meta name="apple-mobile-web-app-capable" content="yes" />\n</head>')
  .replace('</body>', '  <script>if (\'serviceWorker\' in navigator && location.protocol.startsWith(\'http\')) navigator.serviceWorker.register(\'sw.js\');</script>\n</body>');
fs.writeFileSync(path.join(pwaDir, 'index.html'), pwaHtml);
for (const f of fs.readdirSync(path.join(src, 'pwa'))) fs.copyFileSync(path.join(src, 'pwa', f), path.join(pwaDir, f));
try { new Function(js); } catch (e) { console.error('SYNTAX ERROR:', e.message); process.exit(1); }
console.log(`Built ${out} (${(html.length / 1024).toFixed(0)} KB, ${files.length} modules, ${html.split('\n').length} lines)`);
