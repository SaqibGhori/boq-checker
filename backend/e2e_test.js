const { chromium } = require('playwright');
const path = require('path');
const PDF_DIR = 'C:\\Users\\Saqib Ghori\\Desktop\\ai-projects\\project-6-boq-reconciliation\\backend';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGE ERROR: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE ERROR: ' + msg.text()); });

  await page.goto('http://localhost:5183');
  await page.waitForTimeout(500);

  const inputs = await page.$$('input[type="file"]');
  await inputs[0].setInputFiles(path.join(PDF_DIR, 'test_invoice.pdf'));
  await inputs[1].setInputFiles(path.join(PDF_DIR, 'test_boq.pdf'));

  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Invoice total', { timeout: 45000 }).catch((e) => console.log('WAIT FAILED', e.message));
  await page.waitForTimeout(500);

  const bodyText = await page.evaluate(() => document.body.innerText);
  await page.screenshot({ path: 'C:\\Users\\SAQIBG~1\\AppData\\Local\\Temp\\claude\\c--Users-Saqib-Ghori-Desktop-ai-projects\\55f10381-fb04-477f-90ea-f072c00a4b89\\scratchpad\\boq_result.png', fullPage: true });

  console.log(JSON.stringify({ bodyText, errors }, null, 2));
  await browser.close();
})();
