'use strict';
// Audit computed browser text contrast on the actual page theme, not palette tokens.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const root=path.resolve('portal/src/main/resources/static');
const pages=['index.html','portal.html','start.html','guided-calculators.html','calculators.html','advanced-calculations.html','bend-instruction-lab.html','circuit-sizing.html','field-suite.html','troubleshooting-kb.html','account-records.html','pull-box-calcs.html'];
const themes=['daylight','midnight','workshop','contrast'];
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 if(pathname.startsWith('/api/')){
  res.setHeader('Content-Type','application/json');
  if(pathname==='/api/profile'){res.end(JSON.stringify({username:'contrast-qa',displayName:'Contrast QA',subscriptionTier:'TIER_1'}));return;}
  res.statusCode=404;res.end('{}');return;
 }
 const file=path.resolve(root,'.'+decodeURIComponent(pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;res.end('Not found');return;}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');
 res.end(fs.readFileSync(file));
});
async function inspect(page){
 return page.evaluate(()=>{
  function rgb(s){
   const m=s&&s.match(/^rgba?\(([^)]+)\)/);if(!m)return null;
   const a=m[1].split(',').map(x=>parseFloat(x));
   if(a.length<3||a.some(x=>!Number.isFinite(x)))return null;
   return {r:a[0],g:a[1],b:a[2],a:a.length>3?a[3]:1};
  }
  function background(node){
   for(let p=node;p;p=p.parentElement){
    const style=getComputedStyle(p),bg=rgb(style.backgroundColor);
    if(style.backgroundImage!=='none'&&(!bg||bg.a<.999))return null;
    if(bg&&bg.a>=.999)return bg;
    if(bg&&bg.a>0)return null;
   }
   return rgb(getComputedStyle(document.body).backgroundColor);
  }
  function lum(x){
   const c=[x.r,x.g,x.b].map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
   return c[0]*.2126+c[1]*.7152+c[2]*.0722;
  }
  function ratio(a,b){const l=lum(a),r=lum(b);return (Math.max(l,r)+.05)/(Math.min(l,r))+.05;}
  const results=[];
  let checked=0;
  for(const el of document.querySelectorAll('h1,h2,h3,h4,h5,p,small,label,a,button,summary,legend,span,strong,b,em,li,th,td,output,pre')){
   if(el.closest('svg,canvas,#ewb-theme-panel[hidden],script,style,template'))continue;
   if(!Array.from(el.childNodes).some(n=>n.nodeType===3&&n.nodeValue.trim()))continue;
   const s=getComputedStyle(el),rect=el.getBoundingClientRect();
   if(s.visibility!=='visible'||s.display==='none'||parseFloat(s.opacity)<.5||rect.width<1||rect.height<1)continue;
   const fg=rgb(s.color),bg=background(el);
   if(!fg||!bg||fg.a<.999)continue;
   const size=parseFloat(s.fontSize),weight=parseInt(s.fontWeight,10)||400;
   const min=(size>=24||(size>=18.66&&weight>=700))?3:4.5;
   const score=ratio(fg,bg);checked++;
   if(score<min-.02)results.push({txt:Array.from(el.childNodes).filter(n=>n.nodeType===3).map(n=>n.nodeValue).join('').trim().slice(0,65),tag:el.tagName,cls:String(el.className||'').slice(0,60),score:Number(score.toFixed(2)),min,fg:s.color,bg:'rgb('+bg.r+','+bg.g+','+bg.b+')'});
  }
  results.sort((a,b)=>a.score-b.score);
  return {checked,count:results.length,worst:results.slice(0,16)};
 });
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const findings=[];let checked=0;
 try{
  const page=await browser.newPage({viewport:{width:1280,height:860}});
  for(const name of pages){
   await page.goto('http://127.0.0.1:'+server.address().port+'/'+name,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForTimeout(90);
   assert.ok(await page.evaluate(()=>Boolean(window.EWBTheme)),'No theme chooser on '+name);
   for(const theme of themes){
    await page.evaluate(t=>window.EWBTheme.set(t),theme);
    const r=await inspect(page);checked+=r.checked;
    if(r.count)findings.push({page:name,theme,checked:r.checked,count:r.count,worst:r.worst});
   }
  }
  console.log('Audited '+checked+' text elements across '+pages.length+' pages and '+themes.length+' themes');
  if(findings.length)console.error('Contrast failures: '+JSON.stringify(findings,null,2));
  assert.equal(findings.length,0,'Low contrast on '+findings.length+' page/theme pairs');
  console.log('Contrast checks pass.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
