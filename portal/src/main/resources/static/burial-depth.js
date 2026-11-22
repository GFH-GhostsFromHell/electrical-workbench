(function(){
'use strict';
const M=window.EWBBurialDepth;
const $=id=>document.getElementById(id);
const fields=['voltage','kind','area','method','owner','condition','diameter','bedding','approvedMinimum','plannedCover'];
let latest=null;
function format(mm){return Math.round(mm)+' mm';}
function feet(mm){return (mm/25.4).toFixed(1)+' in';}
function both(mm){return format(mm)+' / '+feet(mm);}
function read(){
 return M.calculate({
  voltage:$('voltage').value,kind:$('kind').value,area:$('area').value,method:$('method').value,
  owner:$('owner').value,condition:$('condition').value,diameter:$('diameter').value,
  bedding:$('bedding').value,approvedMinimum:$('approvedMinimum').value,
  plannedCover:$('plannedCover').value
 });
}
function update(){
 try{
  latest=read();const r=latest;
  $('codeCover').textContent=format(r.table53CoverMm);
  $('requiredCover').textContent=format(r.referenceCoverMm);
  $('trenchBottom').textContent=format(r.estimatedTrenchBottomMm);
  $('classification').textContent=(r.classification==='high'?'HIGH voltage':'Low / extra-low voltage')+' ('+r.kind.toUpperCase()+')';
  $('areaOut').textContent=r.area==='vehicular'?'Vehicular':'Non-vehicular';
  $('diameterOut').textContent=both(r.diameterMm);
  $('beddingOut').textContent=both(r.beddingMm);
  $('diagramCover').textContent=format(r.referenceCoverMm);
  $('diagramDiameter').textContent='Ø '+format(r.diameterMm);
  $('diagramBedding').textContent='Bedding '+format(r.beddingMm);
  $('diagramBottom').textContent='Excavation: '+format(r.estimatedTrenchBottomMm);
  const delta=r.deltaMm;
  $('difference').textContent=delta===null?'Not entered':delta<0?Math.abs(Math.round(delta))+' mm below planning reference':delta===0?'Exactly at planning reference':Math.round(delta)+' mm above planning reference';
  if(r.status==='below-reference')$('status').textContent='Planned cover is less than the reference requirement.';
  else if(r.status==='at-or-above-reference')$('status').textContent='Planned cover meets the reference depth only — full design verification still required.';
  else $('status').textContent='Baseline cover and trench-bottom estimate ready.';
  $('flag').classList.toggle('notice',r.needsEngineering||r.status==='below-reference');
  $('flag').textContent=r.owner==='utility'?'Utility engineering review required':r.classification==='high'?'High-voltage design review required':r.status==='below-reference'?'Planned cover below reference':'CEC Table 53 reference — verify installation';
  $('alerts').replaceChildren();
  r.alerts.forEach(msg=>{const li=document.createElement('li');li.textContent=msg;$('alerts').append(li);});
  if(r.status==='below-reference'){
    const li=document.createElement('li');
    li.textContent='Do not proceed using the entered cover: the proposed burial depth is '+Math.round(-r.deltaMm)+' mm less than the larger of the CEC reference and the entered approved minimum.';
    $('alerts').prepend(li);
  }
 }catch(e){
  latest=null;
  for(const id of ['codeCover','requiredCover','trenchBottom','classification','areaOut','diameterOut','beddingOut','difference'])$(id).textContent='—';
  $('status').textContent='Check the inputs: '+e.message;
  $('flag').textContent='Calculation unavailable until inputs are corrected';
  $('flag').classList.add('notice');
  $('alerts').replaceChildren();
 }
}
fields.forEach(id=>{const field=$(id);field.addEventListener('input',update);field.addEventListener('change',update);});
document.querySelectorAll('[data-volt]').forEach(b=>b.addEventListener('click',()=>{
 $('voltage').value=b.dataset.volt;
 syncVoltageButtons();update();
}));
function syncVoltageButtons(){
 document.querySelectorAll('[data-volt]').forEach(b=>
  b.setAttribute('aria-pressed',String(Number(b.dataset.volt)===Number($('voltage').value))));
}
$('voltage').addEventListener('input',syncVoltageButtons);
$('reset').addEventListener('click',()=>{
 Object.entries({voltage:'600',kind:'ac',area:'ordinary',method:'raceway',owner:'private',condition:'normal',diameter:'63',bedding:'75',approvedMinimum:'',plannedCover:''}).forEach(([id,value])=>{$(id).value=value;});
 syncVoltageButtons();update();
});
$('print').addEventListener('click',()=>{if(latest)window.print();});
$('csv').addEventListener('click',()=>{
 if(!latest)return;
 const r=latest,metadata=[
  ['Category','Detail'],
  ['Electrical Workbench','Underground Burial Depth — preliminary planning only'],
  ['Voltage',r.voltage+' '+r.kind.toUpperCase()],
  ['Voltage class',r.classification],['Traffic',r.area],['Method',r.method],['Ownership',r.owner],['Condition',r.condition],
  ['CEC 2024 Table 53 reference (mm)',r.table53CoverMm],
  ['Approved site/utility minimum (mm)',r.approvedMinimumMm===null?'Not entered':r.approvedMinimumMm],
  ['Planning cover (mm)',r.referenceCoverMm],
  ['Outside diameter (mm)',r.diameterMm],['Bottom bedding (mm)',r.beddingMm],
  ['Estimated excavation bottom (mm)',r.estimatedTrenchBottomMm],
  ['Planned cover (mm)',r.plannedCoverMm===null?'Not entered':r.plannedCoverMm],
  ['Status',r.status],['High voltage / utility review required',r.needsEngineering?'YES':'Check general installation'],
  ...r.alerts.map(a=>['Verification reminder',a])
 ];
 const csv=metadata.map(row=>row.map(s=>'"'+String(s).replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='burial-depth-planning.csv';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});
update();
})();
