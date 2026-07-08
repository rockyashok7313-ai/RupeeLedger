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

  console.log("Navigating to http://localhost:9005 to set localStorage...");
  await page.goto('http://localhost:9005');
  
  await page.evaluate(() => {
    localStorage.setItem("rupee_ledger_activeTab", "gst");
  });

  console.log("Reloading...");
  await page.reload({ waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log("Reload timeout"));
  
  await browser.close();
  console.log("Done.");
})();
