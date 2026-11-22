'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculate,table53}=require('../../main/resources/static/burial-depth-math.js');
const defaults={
 voltage:600,kind:'ac',area:'ordinary',method:'raceway',owner:'private',
 condition:'normal',diameter:63,bedding:75,approvedMinimum:'',plannedCover:''
};
const run=changes=>calculate({...defaults,...changes});
test('2024 Table 53 values: all 12 baseline combinations',()=>{
 const expected={
  unarmoured:{ordinary:{low:600,high:750},vehicular:{low:900,high:1000}},
  armoured:{ordinary:{low:450,high:750},vehicular:{low:600,high:1000}},
  raceway:{ordinary:{low:450,high:750},vehicular:{low:600,high:1000}}
 };
 assert.deepEqual(table53,expected);
 for(const method of Object.keys(expected)){
  for(const area of ['ordinary','vehicular']){
   for(const [classification,voltage] of [['low',600],['high',13800]]){
    const result=run({method,area,voltage});
    assert.equal(result.table53CoverMm,expected[method][area][classification],
      'Table 53 '+method+' '+area+' '+classification);
   }
  }
 }
});
test('AC threshold is 1000 V, DC threshold is 1500 V (CEC 2024)',()=>{
 assert.equal(run({voltage:1000,kind:'ac'}).classification,'low');
 assert.equal(run({voltage:1001,kind:'ac'}).classification,'high');
 assert.equal(run({voltage:1500,kind:'dc'}).classification,'low');
 assert.equal(run({voltage:1501,kind:'dc'}).classification,'high');
});
test('cover vs trench excavation bottom are intentionally different',()=>{
 const r=run({voltage:4160,area:'vehicular',diameter:110,bedding:75});
 assert.equal(r.table53CoverMm,1000);
 assert.equal(r.estimatedTrenchBottomMm,1185);
 assert.equal(r.plannedTrenchBottomMm,null);
});
test('site/utility cover only raises, never silently reduces, baseline',()=>{
 let r=run({approvedMinimum:1200,plannedCover:1300});
 assert.equal(r.table53CoverMm,450);
 assert.equal(r.referenceCoverMm,1200);
 assert.equal(r.estimatedTrenchBottomMm,1338);
 assert.equal(r.deltaMm,100);
 assert.equal(r.status,'at-or-above-reference');
 r=run({approvedMinimum:200,plannedCover:300});
 assert.equal(r.referenceCoverMm,450);
 assert.equal(r.status,'below-reference');
 assert.ok(r.alerts.some(msg=>msg.includes('shallower')));
});
test('unexpected high voltage utility conditions require additional approval',()=>{
 const r=run({voltage:27600,owner:'utility',condition:'shared'});
 assert.equal(r.needsEngineering,true);
 assert.ok(r.alerts.some(msg=>msg.includes('Section 36')));
 assert.ok(r.alerts.some(msg=>msg.includes('UTILITY FACILITY')));
 assert.ok(r.alerts.some(msg=>msg.includes('SHARED TRENCH')));
 assert.ok(r.alerts.some(msg=>msg.includes('No utility-approved cover')));
});
test('reduction cases never automatically reduce cover',()=>{
 for(const condition of ['rock','concrete','pool','shared','other']){
  const r=run({condition});
  assert.equal(r.table53CoverMm,450);
  assert.equal(r.referenceCoverMm,450);
  assert.ok(r.needsEngineering);
  assert.ok(r.alerts.length>=4);
 }
});
test('planned cover checks do not claim full code compliance',()=>{
 const r=run({plannedCover:500});
 assert.equal(r.status,'at-or-above-reference');
 assert.equal(r.deltaMm,50);
 assert.ok(r.alerts.some(msg=>msg.includes('Measure cover')));
});
test('reject missing wiring methods and impossible dimensions',()=>{
 assert.throws(()=>run({method:'other'}),/listed wiring method/);
 assert.throws(()=>run({voltage:'nope'}),/Circuit voltage/);
 assert.throws(()=>run({diameter:-1}),/Outside diameter/);
 assert.throws(()=>run({bedding:1001}),/Below-cable bedding/);
 assert.throws(()=>run({plannedCover:-20}),/Planned cover depth/);
});
test('single Find a Tool entry without duplicating LV/HV',()=>{
 const code=fs.readFileSync(path.resolve(__dirname,'../../main/resources/static/tool-catalog.js'),'utf8');
 const docs=fs.readFileSync(path.resolve(__dirname,'../../main/resources/static/burial-depth.html'),'utf8');
 assert.equal((code.match(/"id": "burial-depth"/g)||[]).length,1);
 assert.ok(code.includes('"path": "/burial-depth.html"'));
 assert.ok(docs.includes('/burial-depth-math.js'));
 assert.ok(docs.includes('/burial-depth.js'));
 assert.ok(docs.includes('High-voltage installations also require Section 36'));
 assert.ok(docs.includes('Ontario Dig Authority'));
});
