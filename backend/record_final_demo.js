const { chromium } = require('playwright');
const path = require('path');
const PDF_DIR = 'C:\\Users\\Saqib Ghori\\Desktop\\ai-projects\\project-6-boq-reconciliation\\backend';
const OUT_DIR = 'C:\\Users\\SAQIBG~1\\AppData\\Local\\Temp\\claude\\c--Users-Saqib-Ghori-Desktop-ai-projects\\55f10381-fb04-477f-90ea-f072c00a4b89\\scratchpad\\boq_video';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1100, height: 800 },
    recordVideo: { dir: OUT_DIR, size: { width: 1100, height: 800 } },
  });
  const page = await context.newPage();

  // Inject a fake cursor dot so mouse movement is visible in the recording
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const dot = document.createElement('div');
      dot.style.cssText = 'position:fixed;width:16px;height:16px;border-radius:50%;background:rgba(139,92,246,0.9);box-shadow:0 0 12px rgba(139,92,246,0.8);pointer-events:none;z-index:99999;transition:left 0.15s,top 0.15s;left:0;top:0;';
      dot.id = '__cursor';
      document.body.appendChild(dot);
      document.addEventListener('mousemove', (e) => {
        dot.style.left = e.clientX - 8 + 'px';
        dot.style.top = e.clientY - 8 + 'px';
      });
    });
  });

  await page.goto('http://localhost:5183');
  await page.waitForTimeout(2500); // let viewer read the landing page

  const invoiceBox = await page.$('#file-INVOICE');
  const boqBox = await page.$('#file-BOQ\\ \\(ORIGINAL\\ PLAN\\)');

  const invBoxHandle = (await page.$$('input[type="file"]'))[0];
  const boqBoxHandle = (await page.$$('input[type="file"]'))[1];

  // move mouse toward the invoice box before dropping the file, for visible motion
  const box1 = await invBoxHandle.boundingBox();
  await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2, { steps: 20 });
  await page.waitForTimeout(400);
  await invBoxHandle.setInputFiles(path.join(PDF_DIR, 'test_invoice.pdf'));
  await page.waitForTimeout(1200);

  const box2 = await boqBoxHandle.boundingBox();
  await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2, { steps: 20 });
  await page.waitForTimeout(400);
  await boqBoxHandle.setInputFiles(path.join(PDF_DIR, 'test_boq.pdf'));
  await page.waitForTimeout(1500);

  const btn = await page.$('button[type="submit"]');
  const boxBtn = await btn.boundingBox();
  await page.mouse.move(boxBtn.x + boxBtn.width / 2, boxBtn.y + boxBtn.height / 2, { steps: 15 });
  await page.waitForTimeout(500);
  await btn.click();

  await page.waitForSelector('text=Invoice total', { timeout: 45000 });
  await page.waitForTimeout(4000); // let viewer read the result

  // scroll a little to make sure all flag rows are visible
  await page.mouse.move(600, 600, { steps: 10 });
  await page.waitForTimeout(3000);

  await context.close();
  await browser.close();
  console.log('done');
})();
