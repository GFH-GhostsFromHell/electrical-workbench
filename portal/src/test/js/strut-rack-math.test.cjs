'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {calculate,buildStockPlan} = require('../../main/resources/static/strut-rack-math.js');

const geometry = {
  mount:'floor', section:'41x41', gap:75, side:100, above:100, below:300,
  foot:450, maxSpan:1000, stock:3050, kerf:3
};
const panel = {name:'Panel',type:'Panel',width:600,height:800,depth:250,qty:1,points:4};
const disconnect = {name:'Disconnect',type:'Disconnect',width:300,height:500,depth:180,qty:1,points:4};
const rack = (devices,changes={})=>calculate({devices,geometry:{...geometry,...changes}});

test('sums enclosures, gaps, margins and automatically positions posts',()=>{
  const out = rack([panel,disconnect]);
  assert.equal(out.widthMm,1175);
  assert.equal(out.heightMm,1200);
  assert.equal(out.deviceCount,2);
  assert.deepEqual(out.postXsMm,[0,587.5,1175]);
  assert.equal(out.devices[1].xMm,775);
  assert.equal(out.devices[1].bottomMm,450);
});
test('produces cut list and hardware allowances from chosen rack geometry',()=>{
  const out = rack([panel,disconnect]);
  assert.deepEqual(out.pieces.map(p=>[p.name,p.qty,p.cutMm]),[
    ['Horizontal cross rail',2,1175],['Upright post',3,1200],['Foot / base outrigger',3,450]
  ]);
  assert.equal(out.totalStrutMm,7300);
  assert.equal(out.hardware.find(h=>h.name.startsWith('Channel nuts')).qty,32);
  assert.equal(out.hardware.find(h=>h.name==='Floor anchors').qty,6);
});
test('wall rack excludes feet and uses substrate fittings',()=>{
  const out=rack([panel],{mount:'wall',section:'41x21'});
  assert.equal(out.sectionDepthMm,21);
  assert.equal(out.pieces.length,2);
  assert.equal(out.footMm,0);
  assert.ok(out.hardware.find(h=>h.name==='Substrate anchors'));
});
test('quantity creates separated units with individual positions',()=>{
  const out=rack([{...disconnect,qty:3}]);
  assert.equal(out.deviceCount,3);
  assert.equal(out.widthMm,1250);
  assert.deepEqual(out.devices.map(d=>d.xMm),[100,475,850]);
});
test('oversize members are flagged rather than silently spliced',()=>{
  const out=rack([{...panel,qty:5,width:1000}]);
  assert.equal(out.stockPlan.oversize.length,2);
  assert.match(out.warnings[0],/exceed/);
});
test('first-fit bar plan includes each saw kerf',()=>{
  const plan=buildStockPlan([{name:'cut',qty:3,cutMm:999}],3000,2);
  assert.equal(plan.bars.length,2);
  assert.equal(plan.bars[0].remainingMm,1000);
});
test('rejects invalid and unbounded quantities',()=>{
  assert.throws(()=>rack([{...disconnect,qty:0}]),/Quantity/);
  assert.throws(()=>rack([{...disconnect,height:NaN}]),/Height/);
  assert.throws(()=>rack([{...disconnect,qty:2.5}]),/whole number/);
  assert.throws(()=>rack([{...disconnect,qty:20},{...panel,qty:20}]),/30/);
});
