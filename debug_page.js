const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  console.log("Navigating to http://localhost:9003 ...");
  try {
    await page.goto('http://localhost:9003', { waitUntil: 'networkidle0', timeout: 10000 });
  } catch (e) {
    console.log("Goto error:", e.message);
  }
  
  await browser.close();
  console.log("Done.");
})();
