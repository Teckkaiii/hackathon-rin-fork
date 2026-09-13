const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const file = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
  await page.goto(file);

  const tabs = [['Queue','queue'],['Clients','clients'],['Coach','coach'],['Outreach','outreach'],['Desk View','desk']];
  for (const [label, id] of tabs) {
    await page.click(`.navbtn:has-text("${label}")`);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.resolve(__dirname, `shot-${id}.png`), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    console.log(id, 'horizontal overflow:', overflow);
  }

  // a client detail page
  await page.click('.navbtn:has-text("Clients")');
  await page.locator('.clientrow', { hasText: 'Robert Teo' }).click();
  await page.screenshot({ path: path.resolve(__dirname, 'shot-client-robert.png'), fullPage: true });

  // narrow / phone width check on queue
  await page.setViewportSize({ width: 400, height: 900 });
  await page.click('.navbtn:has-text("Queue")');
  await page.waitForTimeout(150);
  const overflowPhone = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  console.log('queue phone-width overflow:', overflowPhone);
  await page.screenshot({ path: path.resolve(__dirname, 'shot-queue-phone.png'), fullPage: true });

  await browser.close();
})();
