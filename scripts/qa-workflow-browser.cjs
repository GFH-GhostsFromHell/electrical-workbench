'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const root = path.resolve('portal/src/main/resources/static');
const screenshots = path.resolve('qa-screenshots');
fs.mkdirSync(screenshots, { recursive: true });
let activeUser = 'qa-account-a';
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (pathname === '/api/profile') {
    res.setHeader('Content-Type','application/json');
    res.statusCode = activeUser ? 200 : 401;
    res.end(JSON.stringify(activeUser ? { username: activeUser, displayName: activeUser, subscriptionTier:'TIER_1' } : { error:'Unauthorized' }));
    return;
  }
  if (pathname.startsWith('/api/')) {
    res.statusCode=404;res.end('{}');return;
  }
  const candidate = path.resolve(root, '.' + decodeURIComponent(pathname === '/' ? '/start.html' : pathname));
  if (!candidate.startsWith(root + path.sep) || !fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    res.statusCode=404;res.end('Not found');return;
  }
  res.setHeader('Content-Type',mime[path.extname(candidate)]||'application/octet-stream');
  res.end(fs.readFileSync(candidate));
});

(async()=>{
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const executablePath=process.env.CHROME_BIN||'/usr/bin/google-chrome';
  const browser=await chromium.launch({ executablePath, headless:true, args:['--no-sandbox','--disable-dev-shm-usage'] });
  const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
  const page=await context.newPage();
  const issues=[];
  page.on('pageerror',error=>{issues.push(error.message);});
  async function goto(url){await page.goto(base+url,{waitUntil:'load'});await page.waitForTimeout(350);}
  async function checkNoOverflow(label){
    const dims=await page.evaluate(()=>({
      clientWidth:document.documentElement.clientWidth,
      scrollWidth:document.documentElement.scrollWidth,
      bodyWidth:document.body.scrollWidth
    }));
    assert.ok(dims.scrollWidth<=dims.clientWidth+2,label+' horizontal overflow: '+JSON.stringify(dims));
  }
  async function visible(selector){assert.ok(await page.locator(selector).isVisible(),'Expected visible: '+selector);}
  async function take(name){await page.screenshot({path:path.join(screenshots,name),fullPage:true,animations:'disabled'});}
  async function checkThemeNavContrast(theme){
    const values=await page.evaluate(()=>{
      const el=document.querySelector('header nav a');
      const bar=document.querySelector('body > header');
      return {fg:getComputedStyle(el).color,bg:getComputedStyle(bar).backgroundColor};
    });
    const rgb=s=>(s.match(/[0-9.]+/g)||[]).slice(0,3).map(Number);
    const lum=s=>{
      const value=rgb(s).map(v=>{
        const c=v/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;
      });
      return value[0]*0.2126+value[1]*0.7152+value[2]*0.0722;
    };
    const a=lum(values.fg),b=lum(values.bg);
    const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    assert.ok(ratio>=4.5,theme+' header navigation contrast too low: '+ratio.toFixed(2)+' '+JSON.stringify(values));
  }

  try{
    await goto('/start.html');
    await visible('#ewb-theme-button');
    assert.equal(await page.locator('html').getAttribute('data-ewb-theme'),'daylight','Default is readable Daylight');
    await checkThemeNavContrast('Daylight');
    await page.locator('#ewb-theme-button').click();
    await visible('#ewb-theme-panel');
    await page.locator('input[name="ewb-appearance"][value="midnight"]').check();
    assert.equal(await page.locator('html').getAttribute('data-ewb-theme'),'midnight','Midnight applied');
    await checkThemeNavContrast('Midnight');
    const darkBackground=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
    await page.locator('#ewb-theme-done').click();
    await goto('/guided-calculators.html?tool=service');
    assert.equal(await page.locator('html').getAttribute('data-ewb-theme'),'midnight','Theme persists between tools');
    await goto('/start.html');
    await page.locator('#ewb-theme-button').click();
    await page.locator('input[value="workshop"][name="ewb-appearance"]').check();
    assert.equal(await page.locator('html').getAttribute('data-ewb-theme'),'workshop');
    await checkThemeNavContrast('Warm Workshop');
    assert.notEqual(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),darkBackground,'Warm theme differs from dark');
    await page.locator('input[value="contrast"][name="ewb-appearance"]').check();
    assert.equal(await page.locator('html').getAttribute('data-ewb-theme'),'contrast');
    await checkThemeNavContrast('High Contrast');
    await page.emulateMedia({colorScheme:'dark'});
    await page.locator('input[value="system"][name="ewb-appearance"]').check();
    assert.equal(await page.locator('html').getAttribute('data-ewb-theme'),'midnight','System dark chosen');
    await page.emulateMedia({colorScheme:'light'});
    await page.waitForFunction(()=>document.documentElement.getAttribute('data-ewb-theme')==='daylight');
    assert.equal(await page.locator('html').getAttribute('data-ewb-theme'),'daylight','System light auto updates');
    await page.locator('input[value="daylight"][name="ewb-appearance"]').check();
    await page.locator('#ewb-theme-done').click();
    await page.waitForFunction(()=>document.getElementById('accountStatus').textContent.includes('qa-account-a'));
    assert.equal(await page.locator('.task').count(),8,'Only common tasks should show initially');
    await page.locator('#showAllTools').click();
    assert.equal(await page.locator('.task').count(),25,'Show all tools reveals full catalog');
    await page.locator('#showAllTools').click();
    assert.equal(await page.locator('.task').count(),8,'Show common tools reduces screen length');
    await visible('#query');
    await page.locator('#query').fill('hospital');
    await visible('.task:has(h3:text-is("Service Load Calculations"))');
    assert.equal(await page.locator('.task').count(),1,'Plain-language search finds service calculator');
    await page.locator('#query').fill('');
    await page.locator('button[data-category="installation"]').click();
    assert.ok((await page.locator('.task').count())>=3,'Installation filter');
    await page.locator('button[data-category="all"]').click();
    const conduit=page.locator('.task:has(h3:text-is("Conduit Bend Marks + 3D"))');
    await conduit.getByRole('button',{name:/Add to favourites/}).click();
    await page.locator('.shortlists summary').click();
    await visible('#favourites a:text-is("Conduit Bend Marks + 3D")');
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>document.getElementById('accountStatus').textContent.includes('qa-account-a'));
    await page.locator('.shortlists summary').click();
    await visible('#favourites a:text-is("Conduit Bend Marks + 3D")');
    await conduit.getByRole('button',{name:'Preview steps'}).click();
    await visible('#selectedTask');
    assert.ok((await page.locator('#selectedTask').innerText()).includes('Your workflow'),'Guidance explains next steps');
    await conduit.locator('a.open').click();
    await page.waitForURL('**/bend-instruction-lab.html');
    await goto('/start.html');
    await page.waitForFunction(()=>document.getElementById('accountStatus').textContent.includes('qa-account-a'));
    await page.locator('.shortlists summary').click();
    await visible('#recent a:text-is("Conduit Bend Marks + 3D")');

    activeUser='qa-account-b';
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>document.getElementById('accountStatus').textContent.includes('qa-account-b'));
    await page.locator('.shortlists summary').click();
    assert.ok(!(await page.locator('#favourites').innerText()).includes('Conduit Bend Marks + 3D'),'Account B should not see A favourites');
    activeUser='qa-account-a';
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>document.getElementById('accountStatus').textContent.includes('qa-account-a'));
    await page.locator('.shortlists summary').click();
    await visible('#favourites a:text-is("Conduit Bend Marks + 3D")');

    for(const width of [320,360,390,768,1280]){
      await page.setViewportSize({width,height:860});
      await checkNoOverflow('Find a Tool @'+width+'px');
      if([320,390,1280].includes(width))await take('tool-finder-'+width+'.png');
      const controls=await page.locator('button.filter').evaluateAll(nodes=>nodes.map(n=>Math.round(n.getBoundingClientRect().height)));
      assert.ok(controls.every(h=>h>=43),'Category touch targets @'+width);
    }
    await page.setViewportSize({width:390,height:860});
    // Dashboard no longer duplicates the full tool directory. It forwards search
    // to the canonical task finder, including a prefilled task query.
    await goto('/portal.html');
    await visible('#dashboardTaskSearch');
    assert.equal(await page.locator('#toolDirectory').count(),0,'Dashboard must not duplicate full tool directory');
    await page.locator('#toolFinderSearch').fill('motor');
    await Promise.all([
      page.waitForURL('**/start.html?q=motor'),
      page.locator('#dashboardTaskSearch button[type=submit]').click()
    ]);
    await visible('.task:has(h3:text-is("Motor Protection & Starter Sizing"))');
    await page.setViewportSize({width:390,height:860});
    await goto('/portal.html');
    await checkNoOverflow('Dashboard @390px');
    await take('dashboard-390.png');
    await page.setViewportSize({width:1280,height:900});
    await checkNoOverflow('Dashboard @1280px');
    await take('dashboard-1280.png');
    await page.setViewportSize({width:390,height:860});
    await goto('/guided-calculators.html?tool=conductor');
    await visible('#conductor.module.active');
    await page.waitForFunction(()=>document.getElementById('ewbStatus').textContent.includes('qa-account-a'));
    await visible('#ewbSave');
    await page.locator('#c_i').fill('43');
    await page.locator('#ewbDraftName').fill('Release QA test feeder');
    await page.locator('#ewbSave').click();
    assert.ok((await page.locator('#ewbStatus').innerText()).includes('Saved'),'Draft successfully saved');
    const selections=await page.locator('#ewbSaved option').count();
    assert.ok(selections>=2,'Saved draft exists in selector');
    await page.locator('#c_i').fill('99');
    await page.locator('#ewbRestore').click();
    assert.equal(await page.locator('#c_i').inputValue(),'43','Restored exact input');
    assert.ok((await page.locator('#ewbStatus').innerText()).includes('Press Calculate again'),'Restored result requires revalidation');
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#ewbExport').click()]);
    assert.equal(download.suggestedFilename(),'electrical-workbench-worksheet.json');
    await take('guided-calculator-390.png');
    await checkNoOverflow('Guided calculator @390px');

    activeUser='qa-account-b';
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>document.getElementById('ewbStatus').textContent.includes('qa-account-b'));
    assert.equal(await page.locator('#ewbSaved option').count(),1,'Account B cannot see A saved drafts');
    activeUser='qa-account-a';
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>document.getElementById('ewbStatus').textContent.includes('qa-account-a'));
    assert.ok((await page.locator('#ewbSaved option').count())>=2,'Account A local saved draft preserved');
    await page.locator('#ewbSaved').selectOption({index:1});
    page.once('dialog', dialog=>dialog.accept());
    await page.locator('#ewbDelete').click();
    assert.equal(await page.locator('#ewbSaved option').count(),1,'Draft deleted');

    // The motor/drive selector is a real interactive tool, not a catalog placeholder.
    await goto('/motor-starter-selector.html');
    await visible('#selector');
    await page.locator('#fla').fill('40');
    await page.locator('#leads').selectOption('6');
    await page.locator('#deltaVolts').fill('600');
    await page.locator('#goal').selectOption('inrush');
    await page.locator('#calculate').click();
    await visible('#result');
    assert.ok((await page.locator('#recommendations').innerText()).includes('soft starter'),'Motor selector recommends soft start for reduced inrush');
    assert.ok((await page.locator('#methods').innerText()).includes('Wye–delta'),'Star-delta option is available for eligible six-lead motors');
    await page.locator('#family').selectOption('dc_pm');
    await page.locator('#volts').fill('180');
    await page.locator('#motorVolts').fill('180');
    await page.locator('#supply').selectOption('dc');
    await page.locator('#calculate').click();
    assert.ok((await page.locator('#recommendations').innerText()).includes('DC armature drive'),'DC input selects a DC drive');
    await take('motor-drive-selector.png');
    await checkNoOverflow('Motor drive selector @390px');

    // The field bender should open with concise marks, not four expanded panels.
    await goto('/bend-instruction-lab.html');
    for(const id of ['measurementHelp','markingInstructions','bendSteps','threeDDetails','editorDetails']){
      assert.equal(await page.locator('#'+id).getAttribute('open'),null,id+' should start collapsed');
    }
    await page.locator('#height').fill('120');
    await page.locator('#distance').fill('600');
    await page.waitForFunction(()=>Boolean(document.querySelector('#quickSummary .quick-mark')),{timeout:5000});
    assert.ok((await page.locator('#quickSummary').innerText()).includes('A'),'Live tape marks appear');
    await page.locator('#goSteps').click();
    await visible('#stepBrief');
    assert.equal(await page.locator('#bendSteps').getAttribute('open'),'','Bend steps open in one tap');
    await page.locator('#open3D').click();
    await visible('#tubeCanvas');
    assert.equal(await page.locator('#threeDDetails').getAttribute('open'),'','3D opens with one tap');
    const snapshot=async()=>page.locator('#tubeCanvas').evaluate(canvas=>{
      const bounds=canvas.getBoundingClientRect();
      const dpr=Math.min(2.5,Math.max(1,window.devicePixelRatio||1));
      const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let light=0,hash=0;
      for(let y=0;y<canvas.height;y+=5)for(let x=0;x<canvas.width;x+=5){
        const i=(y*canvas.width+x)*4;
        if(data[i]>140&&data[i+1]>140&&data[i+2]>150)light++;
        hash=(hash*31+data[i]+3*data[i+1]+7*data[i+2])%1000000007;
      }
      return {width:bounds.width,height:bounds.height,backing:canvas.width,backingHeight:canvas.height,dpr,light,hash};
    });
    let frame=await snapshot();
    assert.ok(frame.width>180&&frame.height>=230,'3D viewer visible on a phone');
    assert.ok(Math.abs(frame.backing-frame.width*frame.dpr)<3,'Canvas is resolution-matched to the display width');
    assert.ok(Math.abs(frame.backingHeight-frame.height*frame.dpr)<3,'Canvas is resolution-matched to the display height');
    assert.ok(frame.light>15,'3D conduit rendered bright line pixels, not only a dark background');
    const box=await page.locator('#tubeCanvas').boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.down();await page.mouse.move(box.x+box.width/2+95,box.y+box.height/2+35,{steps:5});await page.mouse.up();
    let rotated=await snapshot();
    assert.notEqual(rotated.hash,frame.hash,'Dragging rotates 3D conduit');
    await page.locator('#zoomPlus').click();
    let zoomed=await snapshot();
    assert.notEqual(zoomed.hash,rotated.hash,'Zoom button changes projected 3D shape');
    await page.locator('#resetView').click();
    await page.locator('#unit').selectOption('in');
    await page.waitForTimeout(120);
    assert.ok((await page.locator('#geometryNote').innerText()).includes('mm stock'),'3D geometry remains valid in inches mode; tail stays in mm');
    assert.ok((await snapshot()).light>15,'3D remains visible after changing units');
    for(const width of [320,390,768,1280]){
      await page.setViewportSize({width,height:820});
      await page.waitForTimeout(100);
      await checkNoOverflow('Conduit field view at '+width);
      const resized=await snapshot();
      assert.ok(Math.abs(resized.backing-resized.width*resized.dpr)<3,'3D backing follows resized width at '+width);
      assert.ok(resized.light>15,'3D still visible at '+width);
      if(width===390)await take('conduit-bender-field-3d-mobile.png');
      if(width===1280)await take('conduit-bender-field-3d-desktop.png');
    }
    await page.setViewportSize({width:390,height:860});
    await goto('/field-suite.html#quote');
    await visible('#view-quote.view.active');
    await checkNoOverflow('Jobsite tools @390px');
    await take('jobsite-390.png');

    await goto('/start.html');
    await page.keyboard.press('Tab');
    const focusTag=await page.evaluate(()=>document.activeElement.tagName);
    assert.ok(['A','BUTTON','INPUT'].includes(focusTag),'Keyboard navigation finds interactive element');
    await page.evaluate(()=>{document.body.style.zoom='1.3';});
    await checkNoOverflow('Zoomed tool launcher @390px');
    await take('tool-finder-390-zoom.png');

    assert.equal(issues.length,0,'Unexpected browser runtime exceptions: '+issues.join(' | '));
    console.log('BROWSER QA PASS: search, categories, favourites, recent, account isolation, guided deep links, local draft save/restore/export/delete, field deep links, mobile overflow and keyboard focus.');
  } finally {
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(e=>{console.error('BROWSER QA FAILED:',e.stack||e);process.exitCode=1;});
