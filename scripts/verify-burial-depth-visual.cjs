'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const images=path.resolve(__dirname,'../docs/screenshots');
const uri='http://127.0.0.1:8765/burial-depth.html';
function rgb(value){
 const m=value.match(/\d+(?:\.\d+)?/g);
 assert.ok(m&&m.length>=3,'Unsupported colour '+value);
 return m.slice(0,3).map(Number);
}
function luminance(value){
 const channels=rgb(value).map(v=>v/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
 return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}
function ratio(a,b){
 const [bright,dark]=[luminance(a),luminance(b)].sort((x,y)=>y-x);
 return (bright+.05)/(dark+.05);
}
(async()=>{
 fs.mkdirSync(images,{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  for(const theme of ['daylight','midnight','workshop','contrast']){
   const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
   await context.addInitScript(t=>localStorage.setItem('ewb.theme.v1',t),theme);
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   const response=await page.goto(uri,{waitUntil:'networkidle'});
   assert.ok(response&&response.ok());
   assert.equal(await page.locator('#codeCover').innerText(),'450 mm');
   assert.equal(await page.locator('#trenchBottom').innerText(),'588 mm');
   const fg=await page.locator('h1').evaluate(el=>getComputedStyle(el).color);
   const bg=await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor);
   assert.ok(ratio(fg,bg)>=4.5,'Heading unreadable in '+theme);
   const title=await page.locator('label[for="voltage"]').evaluate(el=>getComputedStyle(el).color);
   const surface=await page.locator('.panel').first().evaluate(el=>getComputedStyle(el).backgroundColor);
   assert.ok(ratio(title,surface)>=4.5,'Form labels unreadable in '+theme);
   await page.locator('button[data-volt="13800"]').click();
   assert.equal(await page.locator('#codeCover').innerText(),'750 mm');
   await page.locator('#area').selectOption('vehicular');
   assert.equal(await page.locator('#codeCover').innerText(),'1000 mm');
   assert.equal(await page.locator('#trenchBottom').innerText(),'1138 mm');
   assert.match(await page.locator('#classification').innerText(),/HIGH voltage/);
   await page.locator('#approvedMinimum').fill('1250');
   assert.equal(await page.locator('#requiredCover').innerText(),'1250 mm');
   await page.locator('#plannedCover').fill('1100');
   assert.match(await page.locator('#status').innerText(),/less than/);
   await page.locator('#reset').click();
   assert.equal(await page.locator('#codeCover').innerText(),'450 mm');
   if(theme==='daylight')await page.screenshot({
    path:path.join(images,'burial-depth-desktop.png'),animations:'disabled'
   });
   await page.setViewportSize({width:390,height:844});
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('#codeCover').innerText(),'450 mm');
   const screen=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert.ok(screen.page<=screen.viewport+3,'Horizontal overflow on '+theme+' '+JSON.stringify(screen));
   if(theme==='daylight')await page.screenshot({
    path:path.join(images,'burial-depth-mobile.png'),animations:'disabled',fullPage:false
   });
   assert.deepEqual(errors,[],'Browser script errors in '+theme);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
