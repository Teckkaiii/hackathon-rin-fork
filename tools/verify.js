import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4310;
const URL = `http://localhost:${PORT}`;

function startServer() {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [path.join(__dirname, 'serve.js'), String(PORT)], { stdio: 'pipe' });
    p.stdout.on('data', d => { if (d.toString().includes('serving')) resolve(p); });
    p.stderr.on('data', d => process.stderr.write(d));
    p.on('error', reject);
    setTimeout(() => resolve(p), 1500);
  });
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

  await page.goto(URL);
  await page.waitForSelector('[data-testid="opportunity-card"]');

  const results = [];
  const check = (label, ok, extra) => results.push(`${ok ? 'OK ' : 'FAIL'} ${label}${extra ? ' -- ' + extra : ''}`);

  // ---- Module 1: Queue (scoped to the signed-in RM's own book — Aisha Rahman) ----
  let txt = await page.locator('main').innerText();
  check('Queue renders opportunity cards', await page.locator('[data-testid="opportunity-card"]').count() === 3, 'count=' + await page.locator('[data-testid="opportunity-card"]').count());
  check('3 surfaced (all gates passed)', /3 surfaced/.test(txt));
  check('Blocked count shown, points to Blocked tab', txt.includes('1 withheld by gates') && txt.includes('Blocked tab'));
  check('No blocked card rendered inside Queue itself', await page.locator('[data-testid="blocked-card"]').count() === 0);
  check('No "Open client position" button in Queue', !txt.includes('Open client position'));

  // Signal score breakdown: quantifies order via momentum / relevancy / urgency / conviction, shown qualitatively (no raw digit score)
  check('Signal breakdown pills shown (Urgency/Relevancy/Momentum/Conviction)', ['Urgency:', 'Relevancy:', 'Momentum:', 'Conviction:'].every(s => txt.includes(s)));
  const bodyTxtQueue = await page.locator('body').innerText();
  check('No composite score digit shown anywhere', !/\/\s?100\b|\bscore\s*:\s*\d/i.test(bodyTxtQueue));
  check('Highest signal-score opportunity ranks first (Chen Wei Liang)', (await page.locator('[data-testid="opportunity-card"]').first().innerText()).includes('Chen Wei Liang'));

  // Clicking a card (not a button) opens the client's position page
  const chenCard = page.locator('[data-testid="opportunity-card"]', { hasText: 'Chen Wei Liang' });
  await chenCard.click({ position: { x: 20, y: 20 } });
  txt = await page.locator('main').innerText();
  check('Clicking a Queue card opens that client\'s position page', txt.includes('Chen Wei Liang') && /binding constraint/i.test(txt));
  await page.click('nav >> text=Queue');
  await page.waitForTimeout(150);

  // Gates vs filters
  await page.selectOption('select >> nth=3', '1000000'); // minAmount select (4th filter select)
  txt = await page.locator('main').innerText();
  check('Tightening min amount narrows surfaced set', !/^3 surfaced/m.test(txt));
  check('Withheld count still 1 when surfaced set shrinks', txt.includes('1 withheld by gates'));
  await page.selectOption('select >> nth=3', '0');
  txt = await page.locator('main').innerText();
  check('Withheld count still 1 after resetting filters', txt.includes('1 withheld by gates') && /3 surfaced/.test(txt));

  // Park David Ong (button click must not also trigger the card's own open-client navigation)
  const davidCard = page.locator('[data-testid="opportunity-card"]', { hasText: 'David Ong' });
  await davidCard.locator('button:has-text("Park")').click();
  txt = await page.locator('main').innerText();
  check('David Ong moved to Parked with resurface date', txt.includes('Parked') && txt.includes('Resurfaces'));
  check('Cadence rule text shown', txt.includes('5 business days'));
  check('Parking a card kept us on the Queue tab (button click did not bubble to open-client)', txt.includes('Today\'s queue'));

  // Dismiss with reason
  page.once('dialog', d => d.accept('Client travelling, follow up next week'));
  const priyaCard = page.locator('[data-testid="opportunity-card"]', { hasText: 'Priya Ravindran' });
  await priyaCard.locator('button:has-text("Dismiss")').click();
  txt = await page.locator('main').innerText();
  check('Priya dismissed with reason recorded', txt.includes('Dismissed') && txt.includes('Client travelling'));

  // ---- Module 2: Clients ----
  await page.click('nav >> text=Clients');
  await page.waitForSelector('[data-testid="client-row"]');
  check('Client directory lists 3 clients (Aisha\'s book, minus the blocked one)', await page.locator('[data-testid="client-row"]').count() === 3, 'count=' + await page.locator('[data-testid="client-row"]').count());
  check('Blocked client (Robert Teo) not listed among Clients', !(await page.locator('main').innerText()).includes('Robert Teo'));

  await page.locator('[data-client-id="priya"]').click();
  txt = await page.locator('main').innerText();
  check('Priya binding constraint = concentration', /Binding constraint[\s\S]{0,200}Exposure concentration/i.test(txt));
  check('Cross-border footprint kept inside client description', txt.includes('Cross-border footprint') && txt.includes('Operating countries'));

  await page.click('text=← All clients');

  // ---- Module 3: Blocked ----
  await page.click('nav >> text=Blocked');
  await page.waitForSelector('[data-testid="blocked-card"]');
  check('Blocked tab shows exactly 1 blocked card', await page.locator('[data-testid="blocked-card"]').count() === 1);
  txt = await page.locator('main').innerText();
  check('Robert Teo withheld (suitability) surfaced in Blocked tab', txt.includes('Robert Teo') && txt.includes('Suitability & mandate fit'));

  // ---- Module 4: Outreach (drafting + sending) ----
  await page.click('nav >> text=Outreach');
  await page.waitForSelector('#outreach-text');
  check('Blocked client (Robert Teo) excluded from Outreach client selector', !(await page.locator('#outreach-client-select').innerText()).includes('Robert Teo'));
  let draftVal = await page.inputValue('#outreach-text');
  check('Seeded Chen draft loaded with wrong figure', draftVal.includes('500,000'));
  await page.click('[data-act="outreach-review"]');
  txt = await page.locator('main').innerText();
  check('Fact-trace check fails on wrong figure', txt.includes('380,000') && txt.includes('Fact trace'));
  check('Suggested rewrite shown with corrected figure', (await page.locator('text=Suggested rewrite').locator('xpath=following-sibling::div[1]').innerText()).includes('380,000'));
  await page.click('[data-act="outreach-accept"]');
  draftVal = await page.inputValue('#outreach-text');
  check('Accepted rewrite replaces draft text with correct figure', draftVal.includes('380,000') && !draftVal.includes('500,000'));

  await page.click('[data-act="outreach-send"]');
  txt = await page.locator('main').innerText();
  check('Outreach send writes archived-channel ledger entry', txt.includes('Archived Client Comms'));

  // ---- Module 5: News ----
  await page.click('nav >> text=News');
  await page.waitForTimeout(150);
  txt = await page.locator('main').innerText();
  check('News tab shows yesterday\'s rate-cut item', txt.includes('SGD rates expected to ease') && txt.includes('Yesterday'));
  check('News tab shows a confirmed impact', txt.includes('Confirmed'));
  check('News tab shows an inferred impact', txt.includes('Inferred'));
  check('News tab flags the multi-client item as Priority', (() => {
    const i = txt.indexOf('SGD rates expected to ease');
    return i > -1 && txt.slice(Math.max(0, i - 300), i + 300).includes('Priority');
  })());

  // ---- Module 6: Past Week (momentum) ----
  await page.click('nav >> text=Past Week');
  await page.waitForTimeout(150);
  txt = await page.locator('main').innerText();
  check('Past Week tracks 3 themes', (() => {
    const i = txt.toLowerCase().indexOf('themes tracked');
    return i > -1 && txt.slice(i, i + 20).includes('3');
  })());
  check('Rate-cut theme flagged High momentum', (() => {
    const i = txt.indexOf('SGD rates expected to ease');
    return i > -1 && txt.slice(Math.max(0, i - 100), i).includes('High momentum');
  })());
  check('Foundry sentiment theme flagged Low momentum', (() => {
    const i = txt.indexOf('Foundry-segment sentiment');
    return i > -1 && txt.slice(Math.max(0, i - 100), i).includes('Low momentum');
  })());
  check('Vietnam FDI theme flagged High momentum', (() => {
    const i = txt.indexOf('Vietnam manufacturing FDI trend');
    return i > -1 && txt.slice(Math.max(0, i - 100), i).includes('High momentum');
  })());
  check('Priya deprioritized on volatile-only theme', (() => {
    const i = txt.indexOf('Priya Ravindran');
    return i > -1 && txt.slice(Math.max(0, i - 200), i).includes('Deprioritized');
  })());
  check('Chen kept active priority (touched by a high-momentum theme)', (() => {
    const i = txt.indexOf('Chen Wei Liang');
    return i > -1 && txt.slice(Math.max(0, i - 200), i).includes('Active priority');
  })());

  // ---- Nav no longer offers the removed Cross-Border / Desk View tabs ----
  const navTxt = await page.locator('nav').innerText();
  check('Cross-Border tab removed from nav', !navTxt.includes('Cross-Border'));
  check('Desk View tab removed from nav', !navTxt.includes('Desk View'));

  // ---- overflow check at phone width ----
  await page.setViewportSize({ width: 400, height: 900 });
  await page.click('nav >> text=Queue');
  await page.waitForTimeout(150);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  check('No horizontal overflow at 400px', !overflow);

  await page.click('nav >> text=Blocked');
  await page.waitForTimeout(150);
  const blockedOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  check('Blocked tab has no horizontal overflow at 400px', !blockedOverflow);

  await page.click('nav >> text=Past Week');
  await page.waitForTimeout(150);
  const pwOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  check('Past Week has no horizontal overflow at 400px', !pwOverflow);

  console.log(results.join('\n'));
  console.log('\nJS ERRORS:', errors.length ? errors.join(' | ') : 'none');
  console.log('FAIL COUNT:', results.filter(r => r.startsWith('FAIL')).length);

  await browser.close();
  server.kill();
  process.exit(results.some(r => r.startsWith('FAIL')) || errors.length ? 1 : 0);
})();
