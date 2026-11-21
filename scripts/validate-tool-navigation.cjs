'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const read = path => fs.readFileSync(path, 'utf8');
const root = 'portal/src/main/resources/static/';
const dashboard = read(root + 'portal.html');
const calc = read(root + 'calculators.html');
const guided = read(root + 'guided-calculators.html');
const field = read(root + 'field-suite.html');
const android = read('android-client/app/src/main/java/com/gfh/electricalworkbench/MobileWorkbenchActivity.kt');
const more = read('android-client/app/src/main/java/com/gfh/electricalworkbench/MoreWorkspaces.kt');
const ios = read('ios-client/ElectricalWorkbench/WorkbenchTools.swift');
const desktop = read('desktop-client/src/main/java/com/example/desktop/ElectricalWorkbenchNativeApp.java');

const includes = (source, token, label) => assert.ok(source.includes(token), label + ': ' + token);
const exactlyOne = (source, token) => assert.equal(source.split(token).length - 1, 1, 'Expected one ' + token);
for (const id of ['dashboardTaskSearch','toolFinderSearch','dashboardFavorites','dashboardRecent']) {
  exactlyOne(dashboard, 'id="' + id + '"');
}
assert.ok(!dashboard.includes('id="toolDirectory"'), 'Dashboard must not duplicate the task catalog');
includes(dashboard, 'action="/start.html"', 'Dashboard search delegates to canonical task finder');
includes(dashboard, 'class="card workbench-shortcuts"', 'Personal shortcuts are collapsible');
for (const link of [
  '/bend-instruction-lab.html', '/guided-calculators.html',
  '/troubleshooting-kb.html', '/account-records.html'
]) includes(dashboard, 'class="workflow-link" href="' + link + '"', 'Quick task route');
includes(dashboard, '.nav .label{display:inline!important', 'Mobile navigation must keep labels');
includes(dashboard, 'id="dashboardTaskSearch"', 'Task search delegated to one finder');
assert.ok(!dashboard.includes('<h2>Reports & statistics</h2>'), 'Do not bring back empty dashboard placeholders');
includes(calc, 'id="sectionFinder"', 'Section-based calculator search');
includes(guided, '<h1>Step-by-Step Electrical Calculators</h1>', 'Guided calculator title');
includes(guided, 'id="findCalculator"', 'Guided task search');
includes(guided, 'function filterCalculators()', 'Guided filters wired');
includes(field, '<h1>Jobsite Tools</h1>', 'Field tools title');
for (const title of ['Find a Tool','Jobsite Tools','Equipment Troubleshooting']) {
  includes(dashboard, '<span class="label">' + title + '</span>', 'Portal navigation');
}
includes(android, 'initialMoreArea = area', 'Android direct home links');
includes(more, 'remember(initialArea)', 'Android direct target selection');
for (const area of ['LEARN','FIELD','PROJECTS','CAREER']) {
  includes(android, 'onOpenMore(MoreArea.' + area + ')', 'Android section deep link');
}
includes(ios, 'name: "Step-by-Step Calculators"', 'iOS tool naming');
includes(desktop, 'navButton("🧮  Electrical Calculators")', 'Desktop tool naming');
const mobileCatalog = read('android-client/app/src/main/java/com/gfh/electricalworkbench/MobileToolFinder.kt');
includes(mobileCatalog, 'Search tools by job or calculation', 'Native Android task search');
includes(mobileCatalog, 'getSharedPreferences("ewb.tool.shortcuts.v1."', 'Account-scoped Android favourites');
includes(mobileCatalog, 'CircuitSizingActivity::class.java', 'Native circuit shortcut');
includes(mobileCatalog, 'IndustrialFieldActivity::class.java', 'Native relay shortcut');
includes(ios, '.searchable(text: $searchText', 'Native iOS tool search');
includes(ios, 'toggleFavourite(tool.id)', 'Native iOS favourites');
includes(desktop, 'Search by job:', 'Windows task search');
includes(desktop, 'toolPreferenceKey(', 'Windows account-scoped favourites');
const vm = require('node:vm');
for (const file of ['tool-catalog.js','tool-state.js','dashboard-tools.js','worksheet-actions.js']) {
  new vm.Script(read(root+file), {filename:file});
}
const catalogContext = {window:{}};
vm.runInNewContext(read(root+'tool-catalog.js'),catalogContext);
const tasks = catalogContext.window.EWBTaskCatalog;
assert.ok(Array.isArray(tasks) && tasks.length>=20, 'Universal catalog has 20+ named tasks');
assert.equal(new Set(tasks.map(t=>t.id)).size,tasks.length,'Tool IDs must be unique');
const knownWebRoutes = ['engineering-power.html'];
for(const task of tasks) {
  assert.ok(task.id && task.name && task.path.startsWith('/'), 'Every task has a stable identity and local path');
  assert.ok(Array.isArray(task.steps)&&task.steps.length===3, 'Each task has a usable 3-step action guide');
  const base = task.path.slice(1).split(/[?#]/)[0];
  if(!knownWebRoutes.includes(base))assert.ok(require('node:fs').existsSync(root+base), 'Missing tool destination '+task.path);
}
const start = read(root+'start.html');
const themeScript=read(root+'workbench-theme.js');
const themeStyles=read(root+'workbench-themes.css');
new vm.Script(themeScript,{filename:'workbench-theme.js'});
for(const name of ['daylight','midnight','workshop','contrast','system'])
  includes(themeScript,"'"+name+"'",'Theme preference');
for(const name of ['daylight','midnight','workshop','contrast'])
  includes(themeStyles,'data-ewb-theme='+name,'Theme colour palette');
for(const file of ['index.html','portal.html','start.html','calculators.html','guided-calculators.html','advanced-calculations.html','bend-instruction-lab.html','bend-calcs.html','field-suite.html','troubleshooting-kb.html','account-records.html']){
  includes(read(root+file),'/workbench-theme.js','Shared theme logic on '+file);
  includes(read(root+file),'/workbench-themes.css','Shared palette on '+file);
}
includes(start, 'new URLSearchParams(window.location.search)', 'Dashboard query reaches canonical finder');
includes(start, 'alternateIds=new Set(', 'Specialist views are grouped instead of duplicated');
includes(start, 'Show specialist and alternate tools', 'Full catalog remains accessible');
includes(dashboard, '/workbench-flow.css', 'Readable shared UI styles');
includes(start, '/workbench-flow.css', 'Readable styles are shared with task finder');
const androidHome = read('android-client/app/src/main/java/com/gfh/electricalworkbench/MainActivity.kt');
const iosHome = read('ios-client/ElectricalWorkbench/WorkbenchRoot.swift');
for (const token of ['Find a tool for this job','COMMON WORKFLOWS','Resume saved work']) includes(androidHome, token, 'Android home workflow');
includes(iosHome, 'title: "Find a Tool"', 'iOS home uses the canonical task finder');
assert.ok(!androidHome.includes('Mobile report history, saved calculations and usage statistics will appear here'), 'Remove unimplemented Android dashboard placeholders');
assert.ok(!iosHome.includes('title: "Conduit Bends + 3D Preview"'), 'Alternate conduit view belongs in full catalog, not home');
includes(start, '<details class="panel shortlists"', 'Optional shortcuts collapse for readability');
for(const token of ['id="query"','id="catalog"','id="favourites"','id="recent"','tool-catalog.js','tool-state.js','Save or export'])includes(start,token,'Task launcher');
const script= start.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(script,'Task launcher requires a real script');
new vm.Script(script[1],{filename:'start-inline.js'});
includes(guided,"get('tool')",'Guided deep links');
includes(field,"show(location.hash.slice(1)||'home')",'Jobsite task deep links');
for(const file of ['guided-calculators.html','calculators.html','advanced-calculations.html']){
  includes(read(root+file),'worksheet-actions.js','Worksheet save/restore workflow mounted');
}
const helper=read(root+'worksheet-actions.js');
for(const text of ['Save input draft','Restore inputs','Export selected JSON','Copy visible result','password|token|secret|email|address','device','Save / export']){
  assert.ok(helper.toLowerCase().includes(text.toLowerCase()),'Worksheet workflow missing '+text);
}
// Shared task IDs must remain aligned, even if the native destination is offline.
const sharedTaskIds=['conduit-marks','bend-guide','bender-calibrate','pull-box','conductor-drop','service-demand',
  'transformer','motor','advanced-code','relay','power','fault','jobsite','saved','code-updates'];
for(const id of sharedTaskIds){
  assert.ok(tasks.some(task=>task.id===id),'Web catalog missing '+id);
  assert.ok(mobileCatalog.includes('MobileTask("'+id+'"'),'Android tool ID missing '+id);
  assert.ok(ios.includes('id: "'+id+'"'),'iOS tool ID missing '+id);
}
assert.ok(mobileCatalog.includes('Power System Analysis - Web'),'Android power-system web dependency must be labeled');
console.log('Task-first workflow validation passed: catalog links, deep links, native navigation and safe local drafts.');

console.log('Task-first navigation labels, routes, search controls, and Android section shortcuts verified.');
