/**
 * Browser test for CEC Calculators inside the one canonical Find a Tool page.
 * Run with local static HTTP server on 127.0.0.1:8765 and Playwright Chromium.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs');
const rootUrl='http://127.0.0.1:8765';
const out=path.resolve(__dirname,'../docs/screenshots');
function rgb(s){
 const m=String(s).match(/[\d.]+/g);
 assert.ok(m&&m.length>=3,'Invalid RGB '+s);
 return m.slice(0,3).map(Number);
}
function lum(s){
 const c=rgb(s).map(x=>x/255).map(x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4));
 return c[0]*.2126+c[1]*.7152+c[2]*.0722;
}
function ratio(a,b){
 const c=[lum(a),lum(b)].sort((a,b)=>b-a);
 return (c[0]+.05)/(c[1]+.05);
}
async function verifyContrast(page,label,foreground,background){
 const pair=await page.evaluate(([fg,bg])=>{
  const a=document.querySelector(fg),b=document.querySelector(bg);
  if(!a||!b)throw Error('Missing '+fg+' or '+bg);
  return [getComputedStyle(a).color,getComputedStyle(b).backgroundColor];
 },[foreground,background]);
 const c=ratio(...pair);
 assert.ok(c>=4.5,label+' contrast '+c.toFixed(2)+':1 ['+pair.join(' vs ')+']');
 console.log(label+': '+c.toFixed(2)+':1');
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  for(const theme of ['daylight','midnight','workshop','contrast']){
   const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
   await context.addInitScript(t=>{localStorage.setItem('ewb.theme.v1',t);},theme);
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   const response=await page.goto(rootUrl+'/start.html?category=calculations',{waitUntil:'networkidle',timeout:30000});
   assert.ok(response&&response.ok());
   await page.waitForSelector('#catalog article.task');
   assert.equal(await page.locator('button[data-category="calculations"]').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('#catalog article.task').count(),25,'All 25 calculation families should be listed once');
   assert.equal(await page.locator('#catalog .task h3').filter({hasText:'Conductor ampacity and derating'}).count(),1);
   assert.equal(await page.locator('#catalog .task h3').filter({hasText:'Neutral current / conductor sizing'}).count(),1);
   console.log('Theme '+theme);
   await verifyContrast(page,'Task name','#catalog article.task h3','#catalog article.task');
   await verifyContrast(page,'Task description','#catalog article.task p','#catalog article.task');
   await verifyContrast(page,'Primary action','#catalog article.task a.open','#catalog article.task a.open');
   await verifyContrast(page,'Selected filter','button.filter[aria-pressed=true]','button.filter[aria-pressed=true]');
   await page.fill('#query','busbar');
   assert.ok(await page.locator('#catalog article.task').count()>=1);
   assert.match(await page.locator('#catalog').innerText(),/Busbar sizing/);
   await page.locator('#catalog .calc-options summary').first().click();
   assert.match(await page.locator('#catalog').innerText(),/Number of parallel bars/);
   await page.fill('#query','fire pump');
   assert.equal(await page.locator('#catalog article.task').count(),1);
   assert.equal(await page.locator('#catalog .calc-options').count(),0,'Do not show duplicate fire-pump formulas');
   await page.fill('#query','hospital');
   assert.ok((await page.locator('#catalog').innerText()).includes('Service demand / occupancy'));
   await page.fill('#query','');
   if(theme==='daylight'||theme==='midnight'){
    const file=theme==='daylight'?'tool-finder-calculators.png':'tool-finder-calculators-midnight.png';
    await page.screenshot({path:path.join(out,file),fullPage:false,animations:'disabled'});
   }
   await page.setViewportSize({width:390,height:844});
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('#catalog article.task').count(),25);
   const size=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:window.innerWidth}));
   assert.ok(size.document<=size.viewport+3,'Horizontal overflow: '+JSON.stringify(size));
   assert.deepEqual(errors,[],'Page JavaScript error');
   await context.close();
  }
  const redirect=await browser.newPage();
  await redirect.goto(rootUrl+'/calculator-center.html?topic=busbar',{waitUntil:'networkidle'});
  assert.ok(redirect.url().includes('/start.html?category=calculations'));
  assert.equal(await redirect.locator('button[data-category="calculations"]').getAttribute('aria-pressed'),'true');
  assert.match(await redirect.locator('#query').inputValue(),/Busbar/);
  await redirect.close();
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
