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
    const conduit=page.locator('.task:has(h3:text-is("Conduit Bender · Field Marks"))');
    await conduit.getByRole('button',{name:/Add to favourites/}).click();
    await page.locator('.shortlists summary').click();
    await visible('#favourites a:text-is("Conduit Bender · Field Marks")');
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>document.getElementById('accountStatus').textContent.includes('qa-account-a'));
    await page.locator('.shortlists summary').click();
    await visible('#favourites a:text-is("Conduit Bender · Field Marks")');
    await conduit.getByRole('button',{name:'Preview steps'}).click();
    await visible('#selectedTask');
    assert.ok((await page.locator('#selectedTask').innerText()).includes('Your workflow'),'Guidance explains next steps');
    await conduit.locator('a.open').click();
    await page.waitForURL('**/bend-calcs.html');
    await goto('/start.html');
    await page.waitForFunction(()=>document.getElementById('accountStatus').textContent.includes('qa-account-a'));
    await page.locator('.shortlists summary').click();
    await visible('#recent a:text-is("Conduit Bender · Field Marks")');

    activeUser='qa-account-b';
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>document.getElementById('accountStatus').textContent.includes('qa-account-b'));
    await page.locator('.shortlists summary').click();
    assert.ok(!(await page.locator('#favourites').innerText()).includes('Conduit Bender · Field Marks'),'Account B should not see A favourites');
    activeUser='qa-account-a';
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>document.getElementById('accountStatus').textContent.includes('qa-account-a'));
    await page.locator('.shortlists summary').click();
    await visible('#favourites a:text-is("Conduit Bender · Field Marks")');

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

    // The retired URL must redirect; the regular bender retains all original calculators.
    await goto('/bend-instruction-lab.html');
    await page.waitForURL('**/bend-calcs.html');
    await visible('#menuScreen.screen.active');
    await page.locator('button.bendbtn').filter({hasText:'Offset · far bend critical'}).click();
    await visible('#toolScreen.screen.active');
    await page.locator('#off').fill('2');
    await page.locator('#dist').fill('30');
    await page.locator('#marks .markitem').first().waitFor({state:'visible'});
    const regularMarks=await page.locator('#marks').innerText();
    assert.ok(regularMarks.includes('HOOK TOWARD TAPE ZERO'),'Offset shows physical hook direction');
    assert.ok(regularMarks.includes('FLIP bender handle DOWN'),'Offset return identifies when to flip the bender');
    assert.ok(regularMarks.includes('roll conduit 180°'),'Offset return identifies required cradle roll');
    assert.ok(!regularMarks.includes('? VERIFY HOOK'),'No generic verify hook warning');
    assert.ok((await page.locator('#stepList li strong').allInnerTexts()).some(s=>s.includes('FLIP, THEN BEND B')),'Action steps identify the exact bend to flip before');
    await page.locator('#bendView3d').click();
    await visible('#bend3dPanel');
    assert.equal(await page.locator('#diagram').isVisible(),false,'3D selection hides only the original 2D illustration');
    assert.equal(await page.locator('#bendView3d').getAttribute('aria-pressed'),'true','3D toggle reports selection');
    const rendered=await page.evaluate(()=>{const c=document.getElementById('bend3dCanvas');return {
      width:c.width,height:c.height,alpha:c.getContext('2d').getImageData(2,2,1,1).data[3]};});
    assert.ok(rendered.width>250&&rendered.height>200&&rendered.alpha===255,'3D canvas draws its own background and conduit');
    await page.locator('#offsetPlane').selectOption('Right');
    const turned=await page.evaluate(()=>{
      const model=BendView3D.orient(BendView3D.single(current,angle,unit,v),current,id=>document.getElementById(id)?.value);
      return model.paths[0].points[2].p;});
    assert.ok(turned[1]>0&&Math.abs(turned[2])<.00001,'Rightward offset is actually displayed in sideways axis');
    await page.locator('#offsetPlane').selectOption('Up');
    await page.locator('#bend3dPanel button[aria-label="Rotate left"]').click();
    await page.locator('#bend3dPanel button[aria-label="Zoom in"]').click();
    await page.locator('#bendView2d').click();
    await visible('#diagram');
    assert.equal(await page.locator('#bend3dPanel').isVisible(),false,'Switch back to original 2D diagram');
    assert.equal(await page.locator('#marks').innerText(),regularMarks,'2D/3D mode and direction never change physical mark values');
    await page.locator('#shoeMethod').selectOption('other');
    const otherMarks=await page.locator('#marks').innerText();
    assert.ok(otherMarks.includes('USE MANUFACTURER SHOE PROCEDURE'),'Other brands do not inherit the Klein arrow directions');
    assert.ok(!otherMarks.includes('FLIP bender handle DOWN'),'Other shoe method suppresses unsupported Klein flip instruction');
    await page.locator('#shoeMethod').selectOption('klein');
    const stepTotal=await page.locator('#stepList li').count();
    assert.ok(stepTotal>=4,'Working calculator still has the complete field steps');
    await page.locator('#fieldFocusToggle').click();
    await visible('#fieldFocus');
    assert.ok((await page.locator('#fieldFocusCount').innerText()).includes('Step 1 of'),'Field focus begins at the first instruction');
    assert.equal(await page.locator('#stepList').isVisible(),false,'One-step view hides long steps list');
    await page.locator('#fieldFocusNext').click();
    assert.ok((await page.locator('#fieldFocusCount').innerText()).includes('Step 2 of'),'Next advances only the guide');
    await page.locator('#fieldFocusToggle').click();
    await visible('#stepList');
    assert.equal(await page.locator('#marks').innerText(),regularMarks,'Guided mode never changes the physical mark calculation');
    await page.locator('#toolScreen .back').click();
    await page.locator('button.bendbtn').filter({hasText:'Three-bend saddle'}).first().click();
    await visible('#toolScreen.screen.active');
    const saddleMarks=await page.locator('#marks').innerText();
    for(const note of ['B FIRST','A SECOND','C THIRD','HOOK TOWARD FAR END','FLIP bender handle DOWN']){
      assert.ok(saddleMarks.includes(note),'Saddle must identify correct three-bend sequence: '+note);
    }
    await page.locator('#toolScreen .back').click();
    await page.locator('button.bendbtn').filter({hasText:'Four-bend saddle'}).first().click();
    await visible('#toolScreen.screen.active');
    const fourMarks=await page.locator('#marks').innerText();
    for(const note of ['A FIRST','B SECOND','C THIRD','D FOURTH','HOOK TOWARD FAR END','TURN bender AROUND']){
      assert.ok(fourMarks.includes(note),'Four-point saddle sequence: '+note);
    }
    await page.locator('#toolScreen .back').click();

    // Multi-bend mark math stays intact; only the step presentation changes.
    await page.locator('button.bendbtn').filter({hasText:'Advanced · multiple bends on one pipe'}).click();
    await visible('#multiScreen.screen.active');
    await page.locator('#mbMarkCanvas .tick').first().waitFor({state:'visible'});
    const multiCount=await page.locator('#mbSteps .advanced-mark').count();
    assert.ok(multiCount>=2,'Working multi-bend example produces numbered marks');
    const multiMarks=await page.locator('#mbMarkCanvas').innerText();
    await page.locator('#mbView3d').click();
    await visible('#mb3dPanel');
    assert.ok((await page.locator('#mb3dNote').innerText()).includes('SCHEMATIC ONLY'),'Advanced 3D states that the shape is not fabrication verified');
    assert.ok((await page.locator('#mb3dCanvas').evaluate(c=>c.width))>200,'Advanced 3D canvas renders');
    await page.locator('#mbView2d').click();
    await visible('#mb2dPanel');
    assert.equal(await page.locator('#mbMarkCanvas').innerText(),multiMarks,'Advanced switching preserves original stock marks');
    await page.locator('#mbFocusToggle').click();
    await visible('#mbFocusPanel');
    assert.equal(await page.locator('#mbSteps').isVisible(),false,'Focused multi-bend view reduces scrolling');
    await page.locator('#mbFocusNext').click();
    assert.ok((await page.locator('#mbFocusCount').innerText()).includes('Bend 2 of'),'Next highlights the second bend');
    assert.equal(await page.locator('#mbMarkCanvas').innerText(),multiMarks,'Focused mode does not recalculate marks');
    await page.locator('#mbView3d').click();
    await visible('#mb3dPanel');
    await page.locator('#mbStock').fill('121');
    await page.waitForFunction(()=>document.getElementById('mbWarnings').textContent.includes('CALCULATION NOT POSSIBLE'));
    assert.equal(await page.locator('#mbFocusPanel').isVisible(),false,'Invalid stock never leaves stale focused instructions');
    assert.equal(await page.locator('#mb3dCanvas').isVisible(),false,'Invalid stock clears 3D shape rather than showing a stale fabrication preview');
    await page.locator('#mbStock').fill('120');
    await visible('#mb3dCanvas');
    await visible('#mbFocusPanel');
    await page.locator('#mbFocusToggle').click();
    await page.locator('#mbSteps .advanced-mark').first().waitFor({state:'visible'});
    await page.locator('#mbView2d').click();
    for(const width of [320,390,768,1280]){
      await page.setViewportSize({width,height:820});
      await checkNoOverflow('Stable conduit bender at '+width);
      if(width===390)await take('conduit-bender-stable-mobile.png');
      if(width===1280)await take('conduit-bender-stable-desktop.png');
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
