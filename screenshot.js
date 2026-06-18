const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000');

  // Wait for heroes to load
  await page.waitForTimeout(1000);

  // Open Gear screen by clicking the nav button
  await page.click('#btn-gear');

  // Wait a bit for animations/rendering
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: 'gear_screen.png' });
  await browser.close();
})();
