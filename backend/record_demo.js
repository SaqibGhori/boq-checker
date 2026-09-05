const { chromium } = require('playwright');
const path = require('path');
const PDF_DIR = 'C:\\Users\\Saqib Ghori\\Desktop\\ai-projects\\project-6-boq-reconciliation\\backend';
const OUT_DIR = 'C:\\Users\\SAQIBG~1\\AppData\\Local\\Temp\\claude\\c--Users-Saqib-Ghori-Desktop-ai-projects\\55f10381-fb04-477f-90ea-f072c00a4b89\\scratchpad';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1000, height: 750 },
    recordVideo: { dir: OUT_DIR, size: { width: 1000, height: 750 } },
  });
  const page = await context.newPage();

  await page.goto('http://localhost:5183');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, 'boq_demo_1_landing.png') });

  const inputs = await page.$$('input[type="file"]');
  await inputs[0].setInputFiles(path.join(PDF_DIR, 'test_invoice.pdf'));
  await page.waitForTimeout(600);
  await inputs[1].setInputFiles(path.join(PDF_DIR, 'test_boq.pdf'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, 'boq_demo_2_uploaded.png') });

  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, 'boq_demo_3_loading.png') });

  await page.waitForSelector('text=Invoice total', { timeout: 45000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, 'boq_demo_4_result.png'), fullPage: true });

  await page.waitForTimeout(2000);
  await context.close();
  await browser.close();
  console.log('done');
})();
