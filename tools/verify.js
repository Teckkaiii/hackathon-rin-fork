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

  // ---- Task 1: card chrome stripped to name + segment + scoring pills ----
  const chenCard0 = page.locator('[data-testid="opportunity-card"]', { hasText: 'Chen Wei Liang' });
  const chenTxt0 = await chenCard0.innerText();
  check('Card leads with the client name (no rank badge, no orb initials)', chenTxt0.split('\n')[0].trim() === 'Chen Wei Liang');
  check('Card drops the RM name', !chenTxt0.includes('Aisha Rahman'));
  check('Card drops the client tier', !/\bPriority\b|\bSignature\b/.test(chenTxt0));
  check('Card drops the approach pill', !/\bNotify\b/.test(chenTxt0));
  check('Card drops the product-name pill', !chenTxt0.includes('Structured Deposit'));
  check('Card drops the signal-recency pill', !chenTxt0.includes('Signal:'));
  check('Card keeps the segment', chenTxt0.includes('Premier'));
  check('Card keeps all four scoring pills', ['Urgency:', 'Relevancy:', 'Momentum:', 'Conviction:'].every(s => chenTxt0.includes(s)));
  check('Card keeps the amount at stake', chenTxt0.includes('380,000'));
  check('Card keeps the three why-boxes', /why this client/i.test(chenTxt0) && /why now/i.test(chenTxt0) && /why this instrument/i.test(chenTxt0));

  // Only the name block navigates; the card body does not.
  const chenCard = page.locator('[data-testid="opportunity-card"]', { hasText: 'Chen Wei Liang' });
  await chenCard.locator('.t-micro', { hasText: 'Amount at stake' }).click();
  txt = await page.locator('main').innerText();
  check('Clicking the card body does NOT navigate away from the queue', txt.includes("Today's queue"));
  await chenCard.locator('[data-testid="client-open"]').click();
  txt = await page.locator('main').innerText();
  check('Clicking the client name opens that client\'s position page', txt.includes('Chen Wei Liang') && /binding constraint/i.test(txt));
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

  // Park is gone.
  txt = await page.locator('main').innerText();
  check('No Park button anywhere in the queue', await page.locator('button:has-text("Park")').count() === 0);
  check('No Parked section in the queue', !txt.includes('Parked') && !txt.includes('Resurfaces'));
  check('No parking cadence copy in the queue', !txt.includes('5 business days'));

  // ---- Task 5: the agent picks a different next step per opportunity ----
  const chenRoute = await page.locator('[data-testid="opportunity-card"]', { hasText: 'Chen Wei Liang' }).locator('[data-testid="route-primary"]').innerText();
  const priyaRoute = await page.locator('[data-testid="opportunity-card"]', { hasText: 'Priya Ravindran' }).locator('[data-testid="route-primary"]').innerText();
  const davidRoute = await page.locator('[data-testid="opportunity-card"]', { hasText: 'David Ong' }).locator('[data-testid="route-primary"]').innerText();
  check('Chen routed to a direct draft', chenRoute.includes('Draft outreach'));
  check('Priya routed to a specialist', priyaRoute.includes('Refer to specialist'));
  check('David routed to a clarifying call', davidRoute.includes('Call to clarify'));
  check('The three routes differ', new Set([chenRoute, priyaRoute, davidRoute]).size === 3);

  const davidCard = page.locator('[data-testid="opportunity-card"]', { hasText: 'David Ong' });
  check('Route shows a rationale', (await davidCard.locator('[data-testid="route-rationale"]').innerText()).length > 20);
  check('Priya rationale cites the concentration breach', (await page.locator('[data-testid="opportunity-card"]', { hasText: 'Priya Ravindran' }).locator('[data-testid="route-rationale"]').innerText()).includes('42%'));

  // Executing a non-draft route hands the item off and drops it from the queue
  await davidCard.locator('[data-testid="route-primary"]').click();
  check('Handoff opens the note modal', await page.locator('[data-testid="modal"]').count() === 1);
  await page.fill('[data-testid="modal"] textarea', 'Booked for Thursday morning');
  await page.click('[data-act="modal-confirm"]');
  txt = await page.locator('main').innerText();
  check('Handed-off item leaves the surfaced list', /2 surfaced/.test(txt));
  check('Handoff note is recorded', txt.includes('Booked for Thursday morning'));
  check('Handed-off section names the route taken', txt.includes('Handed off') && txt.includes('Call to clarify'));
  check('Handing off kept us on the Queue tab', txt.includes("Today's queue"));

  // The RM can overrule the agent's pick
  const priyaCard2 = page.locator('[data-testid="opportunity-card"]', { hasText: 'Priya Ravindran' });
  check('Alternate routes are hidden by default', await priyaCard2.locator('[data-testid="route-alt"]').count() === 0);
  await priyaCard2.locator('[data-testid="route-toggle"]').click();
  check('Other actions reveals the two routes not chosen', await priyaCard2.locator('[data-testid="route-alt"]').count() === 2);
  const altLabels = await priyaCard2.locator('[data-testid="route-alt"]').allInnerTexts();
  check('Alternates exclude the agent\'s own pick', !altLabels.some(l => l.includes('Refer to specialist')));
  await priyaCard2.locator('[data-testid="route-toggle"]').click();
  check('Other actions collapses again', await priyaCard2.locator('[data-testid="route-alt"]').count() === 0);

  // An overridden route runs that route's behaviour: Priya's agent pick is specialist,
  // so choosing "Draft outreach" from Other actions must open Outreach *for Priya*.
  await priyaCard2.locator('[data-testid="route-toggle"]').click();
  await priyaCard2.locator('[data-testid="route-alt"]', { hasText: 'Draft outreach' }).click();
  txt = await page.locator('main').innerText();
  check('Overridden draft route opens the Outreach tab', await page.locator('#outreach-text').count() === 1);
  check('Overridden draft route loads the overridden client, not the default', await page.inputValue('#outreach-client-select') === 'priya');
  await page.click('nav >> text=Queue');
  await page.waitForTimeout(150);

  // Dismiss with reason, via the in-app modal (not a browser prompt)
  let sawNativeDialog = false;
  page.on('dialog', d => { sawNativeDialog = true; d.dismiss(); });
  const priyaCard = page.locator('[data-testid="opportunity-card"]', { hasText: 'Priya Ravindran' });
  await priyaCard.locator('button:has-text("Dismiss")').click();
  check('Dismiss opens an in-app modal', await page.locator('[data-testid="modal"]').count() === 1);
  check('Dismiss did not use a native browser prompt', !sawNativeDialog);
  await page.fill('[data-testid="modal"] textarea', 'Client travelling, follow up next week');
  await page.click('[data-act="modal-confirm"]');
  check('Modal closes after confirming', await page.locator('[data-testid="modal"]').count() === 0);
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
  await page.selectOption('#outreach-client-select', 'david');
  check('Handoff wrote an entry to the client ledger', (await page.locator('main').innerText()).includes('Booked for Thursday morning'));
  await page.selectOption('#outreach-client-select', 'chen');
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
