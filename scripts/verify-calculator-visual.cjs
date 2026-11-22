/**
 * Browser-level regression for the unified electrical calculator finder.
 * Run against an HTTP server rooted at portal/src/main/resources/static on :8765.
 * Install playwright (and its Chromium browser) before running this script.
 */
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const url = 'http://127.0.0.1:8765/calculator-center.html';
const screenshotRoot = path.resolve(__dirname,'../docs/screenshots');
function channels(rgb) {
  const m=String(rgb).match(/[\d.]+/g);
  assert.ok(m && m.length>=3,'Expected browser-computed RGB colour: '+rgb);
  return m.slice(0,3).map(Number);
}
function luminance(value) {
  const c=channels(value).map(n=>n/255).map(n=>n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4));
  return .2126*c[0]+.7152*c[1]+.0722*c[2];
}
function contrast(foreground,background) {
  const [light,dark]=[luminance(foreground),luminance(background)].sort((a,b)=>b-a);
  return (light+.05)/(dark+.05);
}
async function checkPair(page,label,fgSelector,bgSelector) {
  const pair=await page.evaluate(([fg,bg])=>{
    const a=document.querySelector(fg),b=document.querySelector(bg);
    if(!a||!b)throw new Error('Missing selectors: '+fg+' / '+bg);
    return [getComputedStyle(a).color,getComputedStyle(b).backgroundColor];
  },[fgSelector,bgSelector]);
  const value=contrast(...pair);
  assert.ok(value>=4.5, label+' contrast '+value.toFixed(2)+': '+pair.join(' / '));
  console.log('  '+label+': '+value.toFixed(2)+':1');
}
async function verify() {
  fs.mkdirSync(screenshotRoot,{recursive:true});
  const browser=await chromium.launch({headless:true});
  try{
    for(const theme of ['daylight','midnight','workshop','contrast']){
      const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
      await context.addInitScript(value=>{localStorage.setItem('ewb.theme.v1',value);},theme);
      const page=await context.newPage();
      const response=await page.goto(url,{waitUntil:'networkidle',timeout:30000});
      assert.ok(response&&response.ok(),'Could not load calculator finder');
      await page.waitForSelector('#results button.calc-task');
      assert.equal(await page.locator('#selectedName').innerText(),'Conductor ampacity and derating');
      console.log('Theme '+theme);
      await checkPair(page,'Intro heading','.calc-intro h1','.calc-intro');
      await checkPair(page,'Selected heading','.calc-detail h2','.calc-detail');
      await checkPair(page,'Description','#selectedDescription','.calc-detail');
      await checkPair(page,'Task name','.calc-task[aria-pressed=true] .calc-task-name','.calc-task[aria-pressed=true]');
      await checkPair(page,'Task description','.calc-task[aria-pressed=true] .calc-task-sub','.calc-task[aria-pressed=true]');
      await checkPair(page,'Primary action','#selectedLink','#selectedLink');
      await checkPair(page,'Active category','.calc-filter[aria-pressed=true]','.calc-filter[aria-pressed=true]');
      await page.fill('#query','busbar');
      assert.match(await page.locator('#selectedName').innerText(),/Busbar/);
      assert.match(await page.locator('#extraList').innerText(),/Number of parallel bars/);
      assert.equal(await page.locator('#extraMethods').isVisible(),true);
      await page.fill('#query','fire pump');
      assert.match(await page.locator('#selectedName').innerText(),/Fire pump/i);
      assert.equal(await page.locator('#extraMethods').isVisible(),false,'Duplicated fire-pump formulas should not be shown');
      await page.fill('#query','hospital');
      assert.match(await page.locator('#selectedName').innerText(),/Service demand/);
      await page.fill('#query','');
      if(theme==='daylight'||theme==='midnight'){
        await page.screenshot({
          path:path.join(screenshotRoot,theme==='daylight'?'calculator-center.png':'calculator-center-midnight.png'),
          fullPage:false,animations:'disabled'
        });
      }
      await page.setViewportSize({width:390,height:844});
      await page.reload({waitUntil:'networkidle'});
      assert.ok(await page.locator('#results button.calc-task').count()>0);
      const dimensions=await page.evaluate(()=>({width:document.documentElement.scrollWidth,screen:window.innerWidth}));
      assert.ok(dimensions.width<=dimensions.screen+3,'Horizontal overflow on mobile: '+JSON.stringify(dimensions));
      await page.locator('#results button.calc-task').nth(1).click();
      assert.ok(await page.locator('#selectedName').isVisible(),'Selected worksheet not visible on mobile');
      await context.close();
    }
  }finally{await browser.close();}
}
verify().catch(e=>{console.error(e);process.exitCode=1;});
