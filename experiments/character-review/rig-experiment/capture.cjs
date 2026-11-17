// Optional development-only capture; install/provide Playwright outside the production project.
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
(async () => {
 const options = {headless: true, chromiumSandbox: true};
 if (process.env.CHROMIUM_PATH) options.executablePath = process.env.CHROMIUM_PATH;
 const browser = await chromium.launch(options);
 try {
  const page = await browser.newPage({viewport:{width:1710,height:1040},deviceScaleFactor:1});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
  await page.evaluate(()=>window.ready);
  for (const mode of ['original','none','generated']) {
   await page.locator('#'+mode).click();
   await page.screenshot({path:path.join(__dirname,'rig-'+mode+'.png'),fullPage:true});
  }
  console.log(JSON.stringify({title:await page.title(),images:await page.locator('img').evaluateAll(ns=>ns.map(n=>({src:n.getAttribute('src'),loaded:n.complete&&n.naturalWidth>0}))),errors},null,2));
  if(errors.length)process.exitCode=1;
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
