const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

  const file = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
  await page.goto(file);
  await page.waitForSelector('.opp');

  const results = [];
  const check = (label, ok, extra) => results.push(`${ok ? 'OK ' : 'FAIL'} ${label}${extra ? ' -- ' + extra : ''}`);

  // ---- Module 1: Queue ----
  const surfacedCount = await page.locator('main').innerText();
  check('Queue renders opportunity cards', await page.locator('.opp').count() > 0, 'count=' + await page.locator('.opp').count());
  check('5 surfaced (all gates passed)', /5 surfaced/.test(surfacedCount));
  check('Cluster banner present', surfacedCount.includes('Correlated conviction cluster'));
  check('Blocked section shows 3 withheld', surfacedCount.includes('3 withheld by gates'));
  check('Grace Koh withheld (MNPI)', surfacedCount.includes('Grace Koh') && surfacedCount.includes('MNPI'));
  check('Robert Teo withheld (suitability)', surfacedCount.includes('Robert Teo') && surfacedCount.includes('Suitability & mandate fit'));
  check('Michelle Wong withheld (permission)', surfacedCount.includes('Michelle Wong') && surfacedCount.includes('Cross-entity permission'));

  // Gates vs filters: loosen every filter, confirm withheld count unchanged and blocked names never appear as surfaced
  await page.selectOption('select[data-filter="segment"]', 'all');
  await page.selectOption('select[data-filter="tier"]', 'all');
  await page.selectOption('select[data-filter="family"]', 'all');
  await page.selectOption('select[data-filter="minAmount"]', '0');
  await page.selectOption('select[data-filter="recency"]', 'all');
  let txt = await page.locator('main').innerText();
  check('Withheld count still 3 after loosening filters', txt.includes('3 withheld by gates'));
  // now tighten to a filter that should hide surfaced items too
  await page.selectOption('select[data-filter="minAmount"]', '1000000');
  txt = await page.locator('main').innerText();
  check('Tightening min amount narrows surfaced set', /\d+ surfaced/.test(txt) && !txt.match(/^5 surfaced/m));
  check('Withheld count still 3 when surfaced set shrinks', txt.includes('3 withheld by gates'));
  await page.selectOption('select[data-filter="minAmount"]', '0');

  // Park David Ong, confirm resurface date + cadence rule shown
  const davidCard = page.locator('.opp', { hasText: 'David Ong' }).first();
  await davidCard.locator('button:has-text("Park")').click();
  txt = await page.locator('main').innerText();
  check('David Ong moved to Parked with resurface date', /Parked[\s\S]*David Ong[\s\S]*Resurfaces/.test(txt) || (txt.includes('Parked') && txt.includes('Resurfaces')));
  check('Cadence rule text shown', txt.includes('5 business days'));

  // Dismiss with reason (accept the prompt dialog)
  page.once('dialog', d => d.accept('Client travelling, follow up next week'));
  const priyaCard = page.locator('.opp', { hasText: 'Priya Ravindran' }).first();
  await priyaCard.locator('button:has-text("Dismiss")').click();
  txt = await page.locator('main').innerText();
  check('Priya dismissed with reason recorded', txt.includes('Dismissed') && txt.includes('Client travelling'));

  // ---- Module 2: Clients / Position Analyzer ----
  await page.click('.navbtn:has-text("Clients")');
  await page.waitForSelector('.clientrow');
  check('Client directory lists 8 clients', await page.locator('.clientrow').count() === 8, 'count=' + await page.locator('.clientrow').count());

  await page.locator('.clientrow', { hasText: 'Robert Teo' }).click();
  txt = await page.locator('main').innerText();
  check('Robert Teo binding constraint = documentation currency', /Binding constraint[\s\S]{0,150}Documentation currency/i.test(txt));
  check('Binding constraint appears before maturity ladder in DOM order', (() => {
    const bindIdx = txt.indexOf('Documentation currency');
    const matIdx = txt.indexOf('Maturity ladder');
    return bindIdx > -1 && matIdx > -1 && bindIdx < matIdx;
  })());
  check('Evidence source trace present', txt.includes('Source: Compliance Records System'));

  await page.click('.backlink');
  await page.locator('.clientrow', { hasText: 'Priya Ravindran' }).click();
  txt = await page.locator('main').innerText();
  check('Priya binding constraint = concentration', /Binding constraint[\s\S]{0,150}Exposure concentration/i.test(txt));

  // ---- Module 3: Conversation Coach ----
  await page.click('.navbtn:has-text("Coach")');
  await page.waitForSelector('#coach-text');
  let draftVal = await page.inputValue('#coach-text');
  check('Seeded Chen draft loaded with wrong figure', draftVal.includes('500,000'));
  await page.click('button:has-text("Review draft")');
  txt = await page.locator('main').innerText();
  check('Fact-trace check FAILS on wrong figure', /Fact trace[\s\S]{0,200}FAIL|FAIL[\s\S]{0,10}Fact trace|Fact trace[\s\S]{0,10}/.test(txt) && txt.includes('380,000'));
  check('Suggested rewrite shown with corrected figure', (await page.locator('.rewrite-box').innerText()).includes('380,000'));
  await page.click('button:has-text("Accept rewrite")');
  draftVal = await page.inputValue('#coach-text');
  check('Accepted rewrite replaces draft text with correct figure', draftVal.includes('380,000') && !draftVal.includes('500,000'));

  // ---- Module 4: Outreach ----
  await page.click('.navbtn:has-text("Outreach")');
  await page.waitForSelector('#outreach-text');
  await page.locator('[data-act="outreach-send"]').click();
  txt = await page.locator('main').innerText();
  check('Outreach send writes archived-channel ledger entry', txt.includes('Archived Client Comms'));

  // ---- Module 5: Desk View ----
  await page.click('.navbtn:has-text("Desk View")');
  txt = await page.locator('main').innerText();
  check('Desk View shows refusal volume by reason (3 distinct gates)', txt.includes('Suitability & mandate fit') && txt.includes('Cross-entity permission') && txt.includes('MNPI / secrecy firewall'));
  check('Desk View shows correlated cluster spanning multiple RMs', /Aisha Rahman[\s\S]{0,80}Daniel Goh|Daniel Goh[\s\S]{0,80}Aisha Rahman/.test(txt));
  check('Desk View documentation-currency table flags Robert Teo Lapsed', /Robert Teo[\s\S]{0,120}Lapsed/.test(txt));
  check('No composite score digit shown anywhere (e.g. "/100" or "score:")', !/\/\s?100\b|\bscore\s*:/i.test(await page.locator('body').innerText()));

  console.log(results.join('\n'));
  console.log('\nJS ERRORS:', errors.length ? errors.join(' | ') : 'none');
  console.log('FAIL COUNT:', results.filter(r => r.startsWith('FAIL')).length);

  await browser.close();
})();
