'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const staticDir=path.resolve(__dirname,'../../main/resources/static');
const read=name=>fs.readFileSync(path.join(staticDir,name),'utf8');
const topics=require('../../main/resources/static/calculator-topics.js');
function info(url){
 const [pathname,raw='']=url.split('?'),params={};
 raw.split('&').filter(Boolean).forEach(x=>{const [k,v]=x.split('=');params[k]=decodeURIComponent(v||'');});
 return {pathname,params};
}
const guided=read('guided-calculators.html'),advanced=read('advanced-calculations.html'),sections=read('calculators.html');
test('one unique task entry per calculator family',()=>{
 assert.equal(topics.length,25);
 assert.equal(new Set(topics.map(t=>t.id)).size,topics.length);
 assert.ok(topics.every(t=>t.primary&&t.primary.label&&t.primary.url));
 assert.ok(topics.every(t=>Array.isArray(t.alternatives)));
});
test('every internal deep link maps to an actual worksheet',()=>{
 const extra=new Set(['/circuit-sizing.html','/pull-box-calcs.html','/bend-calcs.html','/motor-starter-selector.html','/industrial-commissioning.html']);
 for(const task of topics)for(const l of [task.primary,...task.alternatives]){
  const {pathname,params}=info(l.url);
  if(pathname==='/guided-calculators.html'){
    assert.ok(guided.includes('<section id="'+params.tool+'"'),task.id+' guided link '+params.tool);
  }else if(pathname==='/advanced-calculations.html'){
    assert.ok(advanced.includes('<section id="'+params.tool+'"'),task.id+' specialist link '+params.tool);
    assert.ok(advanced.includes('URLSearchParams(location.search)'), 'specialist deep link handler missing');
  }else if(pathname==='/calculators.html'){
    const s=params.section;
    assert.ok(sections.includes("'"+s+"'"),task.id+' CEC section '+s);
    if(s==='s2')continue; // Section 2 is general reference, not tabbed.
    const match=sections.match(new RegExp("tabSet\\('"+s+"',\\[(.*?)\\]\\)"));
    assert.ok(match,task.id+' CEC tab set '+s);
    const labelCount=[...match[1].matchAll(/'[^']*'/g)].length;
    const tab=params.tab===undefined?0:Number(params.tab);
    assert.ok(Number.isInteger(tab)&&tab>=0&&tab<labelCount,task.id+' CEC tab '+s+'/'+tab);
  }else assert.ok(extra.has(pathname),task.id+' unexpected destination '+pathname);
 }
});
test('corrected Section 4 labels match all five actual worksheets',()=>{
 const labels=sections.match(/tabSet\('s4',\[(.*?)\]\)/);
 assert.ok(labels);
 assert.equal([...labels[1].matchAll(/'[^']*'/g)].length,5);
 assert.equal((sections.match(/s4Panes.push\(/g)||[]).length,5);
 const b=topics.find(t=>t.id==='busbar');
 assert.equal(info(b.primary.url).params.tab,'1');
 assert.equal(info(b.alternatives[2].url).params.tab,'4');
});
test('Find a Tool indexes all 25 calculator families without a second search UI',()=>{
 const context={window:{EWBCalculatorTopics:topics}};
 vm.runInNewContext(read('tool-catalog.js'),context);
 const tasks=context.window.EWBTaskCatalog;
 assert.equal(new Set(tasks.map(t=>t.id)).size,tasks.length);
 const calculatorEntries=tasks.filter(t=>t.id.startsWith('calc-'));
 assert.equal(calculatorEntries.length,topics.length);
 for(const topic of topics) {
  const task=calculatorEntries.find(t=>t.id==='calc-'+topic.id);
  assert.ok(task,'Missing canonical calculator '+topic.id);
  assert.equal(task.path,topic.primary.url);
  assert.equal(task.category,'calculations');
  assert.equal(task.alternatives.length,topic.alternatives.length);
 }
 const formerHub=tasks.find(t=>t.id==='cec-sections');
 assert.equal(formerHub.path,'/start.html?category=calculations');
});
test('old calculator link redirects to the one finder, preserving search and topic',()=>{
 const old=read('calculator-center.html');
 assert.ok(old.includes("window.location.replace('/start.html?'"));
 assert.ok(old.includes("next.set('category','calculations')"));
 assert.ok(old.includes("next.set('topic',old.get('topic'))"));
 assert.ok(old.includes("next.set('q',old.get('q'))"));
 assert.ok(!old.includes('id="results"'),'Old page must not maintain a duplicate search UI');
});
test('single finder supports direct calculator category, descriptions and supplemental methods',()=>{
 const start=read('start.html');
 assert.ok(start.includes('/calculator-topics.js'));
 assert.ok(start.includes('/tool-catalog.js'));
 assert.ok(start.indexOf('/calculator-topics.js')<start.indexOf('/tool-catalog.js'));
 assert.ok(start.includes("initialParams.get('category')"));
 assert.ok(start.includes("initialParams.get('topic')"));
 assert.ok(start.includes('Different calculations ('));
 assert.ok(start.includes('legacyCalculatorIds'),'Old duplicate tasks should only appear in existing favourites');
 const portal=read('portal.html');
 assert.ok(portal.includes('href="/start.html?category=calculations"'));
 assert.ok(!portal.includes('href="/calculator-center.html"'));
});
