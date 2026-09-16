import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URL = 'http://localhost:4310';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(URL);
  await page.waitForSelector('[data-testid="opportunity-card"]');

  const tabs = [['Queue', 'queue'], ['Clients', 'clients'], ['Blocked', 'blocked'], ['Outreach', 'outreach'], ['News', 'news'], ['Past Week', 'pastweek']];
  for (const [label, id] of tabs) {
    await page.click(`nav >> text=${label}`);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.resolve(__dirname, `shot-${id}.png`), fullPage: true });
  }

  await page.click('nav >> text=Clients');
  await page.locator('[data-client-id="chen"]').click();
  await page.screenshot({ path: path.resolve(__dirname, 'shot-client-chen.png'), fullPage: true });

  await page.setViewportSize({ width: 400, height: 900 });
  await page.click('nav >> text=Queue');
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.resolve(__dirname, 'shot-queue-phone.png'), fullPage: true });

  await browser.close();
})();
