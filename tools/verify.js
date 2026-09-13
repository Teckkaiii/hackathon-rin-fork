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

  // ---- Module 1: Queue ----
  let txt = await page.locator('main').innerText();
  check('Queue renders opportunity cards', await page.locator('[data-testid="opportunity-card"]').count() === 5, 'count=' + await page.locator('[data-testid="opportunity-card"]').count());
  check('5 surfaced (all gates passed)', /5 surfaced/.test(txt));
  check('Cluster banner present', txt.includes('Correlated conviction cluster'));
  check('Blocked section shows 3 withheld', txt.includes('3 withheld by gates'));
  check('Grace Koh withheld (MNPI)', txt.includes('Grace Koh') && txt.includes('MNPI'));
  check('Robert Teo withheld (suitability)', txt.includes('Robert Teo') && txt.includes('Suitability & mandate fit'));
  check('Michelle Wong withheld (permission)', txt.includes('Michelle Wong') && txt.includes('Cross-entity permission'));
  check('3 blocked cards rendered', await page.locator('[data-testid="blocked-card"]').count() === 3);

  // Gates vs filters
  await page.selectOption('select >> nth=3', '1000000'); // minAmount select (4th filter select)
  txt = await page.locator('main').innerText();
  check('Tightening min amount narrows surfaced set', !/^5 surfaced/m.test(txt));
  check('Withheld count still 3 when surfaced set shrinks', txt.includes('3 withheld by gates'));
  await page.selectOption('select >> nth=3', '0');
  txt = await page.locator('main').innerText();
  check('Withheld count still 3 after resetting filters', txt.includes('3 withheld by gates') && /5 surfaced/.test(txt));

  // Park David Ong
  const davidCard = page.locator('[data-testid="opportunity-card"]', { hasText: 'David Ong' });
  await davidCard.locator('button:has-text("Park")').click();
  txt = await page.locator('main').innerText();
  check('David Ong moved to Parked with resurface date', txt.includes('Parked') && txt.includes('Resurfaces'));
  check('Cadence rule text shown', txt.includes('5 business days'));

  // Dismiss with reason
  page.once('dialog', d => d.accept('Client travelling, follow up next week'));
  const priyaCard = page.locator('[data-testid="opportunity-card"]', { hasText: 'Priya Ravindran' });
  await priyaCard.locator('button:has-text("Dismiss")').click();
  txt = await page.locator('main').innerText();
  check('Priya dismissed with reason recorded', txt.includes('Dismissed') && txt.includes('Client travelling'));

  // ---- Module 2: Clients / Position Analyzer ----
  await page.click('nav >> text=Clients');
  await page.waitForSelector('[data-testid="client-row"]');
  check('Client directory lists 8 clients', await page.locator('[data-testid="client-row"]').count() === 8, 'count=' + await page.locator('[data-testid="client-row"]').count());

  await page.locator('[data-client-id="robert"]').click();
  txt = await page.locator('main').innerText();
  check('Robert Teo binding constraint = documentation currency', /Binding constraint[\s\S]{0,200}Documentation currency/i.test(txt));
  check('Binding constraint appears before maturity ladder in DOM order', (() => {
    const bindIdx = txt.indexOf('Documentation currency');
    const matIdx = txt.indexOf('Maturity ladder');
    return bindIdx > -1 && matIdx > -1 && bindIdx < matIdx;
  })());
  check('Evidence source trace present', txt.includes('Source: Compliance Records System'));

  await page.click('text=← All clients');
  await page.locator('[data-client-id="priya"]').click();
  txt = await page.locator('main').innerText();
  check('Priya binding constraint = concentration', /Binding constraint[\s\S]{0,200}Exposure concentration/i.test(txt));

  // ---- Module 3: Conversation Coach ----
  await page.click('nav >> text=Coach');
  await page.waitForSelector('#coach-text');
  let draftVal = await page.inputValue('#coach-text');
  check('Seeded Chen draft loaded with wrong figure', draftVal.includes('500,000'));
  await page.click('[data-act="coach-review"]');
  txt = await page.locator('main').innerText();
  check('Fact-trace check fails on wrong figure', txt.includes('380,000') && txt.includes('Fact trace'));
  check('Suggested rewrite shown with corrected figure', (await page.locator('text=Suggested rewrite').locator('xpath=following-sibling::div[1]').innerText()).includes('380,000'));
  await page.click('[data-act="coach-accept"]');
  draftVal = await page.inputValue('#coach-text');
  check('Accepted rewrite replaces draft text with correct figure', draftVal.includes('380,000') && !draftVal.includes('500,000'));

  // ---- Module 4: Outreach ----
  await page.click('nav >> text=Outreach');
  await page.waitForSelector('#outreach-text');
  await page.click('[data-act="outreach-send"]');
  txt = await page.locator('main').innerText();
  check('Outreach send writes archived-channel ledger entry', txt.includes('Archived Client Comms'));

  // ---- Module 5: Desk View ----
  await page.click('nav >> text=Desk View');
  txt = await page.locator('main').innerText();
  check('Desk View shows refusal volume by reason (3 distinct gates)', txt.includes('Suitability & mandate fit') && txt.includes('Cross-entity permission') && txt.includes('MNPI / secrecy firewall'));
  check('Desk View shows correlated cluster spanning multiple RMs', /Aisha Rahman[\s\S]{0,80}Daniel Goh|Daniel Goh[\s\S]{0,80}Aisha Rahman/.test(txt));
  check('Desk View documentation-currency table flags Robert Teo Lapsed', /Robert Teo[\s\S]{0,150}Lapsed/.test(txt));
  const bodyTxt = await page.locator('body').innerText();
  check('No composite score digit shown anywhere', !/\/\s?100\b|\bscore\s*:/i.test(bodyTxt));

  // ---- overflow check at phone width ----
  await page.setViewportSize({ width: 400, height: 900 });
  await page.click('nav >> text=Queue');
  await page.waitForTimeout(150);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  check('No horizontal overflow at 400px', !overflow);

  console.log(results.join('\n'));
  console.log('\nJS ERRORS:', errors.length ? errors.join(' | ') : 'none');
  console.log('FAIL COUNT:', results.filter(r => r.startsWith('FAIL')).length);

  await browser.close();
  server.kill();
  process.exit(results.some(r => r.startsWith('FAIL')) || errors.length ? 1 : 0);
})();
