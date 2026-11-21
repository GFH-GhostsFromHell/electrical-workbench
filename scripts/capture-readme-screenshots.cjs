/**
 * Capture representative Electrical Workbench web UI previews from checked-in HTML.
 * These are static local captures, not authenticated production screenshots.
 *
 * Usage: start a web server rooted at portal/src/main/resources/static on :8765,
 * npm install --no-save playwright@1.56.1, then node scripts/capture-readme-screenshots.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const out = path.resolve(__dirname, '../docs/screenshots');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const shots = [
    { page: 'index.html', file: 'login.png', title: 'Welcome and sign in' },
    { page: 'start.html', file: 'tool-finder.png', title: 'Find a Tool' },
    { page: 'bend-calcs.html', file: 'conduit-bending.png', title: 'Conduit Bend Marks' },
    { page: 'pull-box-calcs.html', file: 'pull-box-sizing.png', title: 'Pull Box Sizing' },
    { page: 'industrial-commissioning.html', file: 'industrial-worksheets.png', title: 'Industrial Electrical Worksheets' }
  ];
  try {
    for (const shot of shots) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        colorScheme: 'light'
      });
      const tab = await context.newPage();
      const address = 'http://127.0.0.1:8765/' + shot.page;
      const response = await tab.goto(address, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!response || !response.ok()) throw new Error('Could not load ' + address);
      await tab.waitForTimeout(900);
      await tab.screenshot({ path: path.join(out, shot.file), fullPage: false, animations: 'disabled' });
      console.log('Saved ' + shot.file + ' (' + shot.title + ')');
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
