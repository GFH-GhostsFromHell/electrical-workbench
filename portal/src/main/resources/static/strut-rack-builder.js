/* Electrical Workbench · interactive strut rack layout and 3D projected solid model. */
(function(){
'use strict';
var M=window.EWBStrutRackMath, key='ewb.strutRack.project.v1';
var by=function(id){return document.getElementById(id);};
var defaultDevices=function(){return [
  {name:'Main distribution panel',type:'Panel',qty:1,width:600,height:800,depth:250,points:4},
  {name:'Local disconnect',type:'Disconnect',qty:1,width:300,height:500,depth:180,points:4}
];};
var devices=defaultDevices(),currentUnit='mm',last=null,zoom=1,yaw=-0.52,pitch=0.24,pointers=new Map();
function factor(unit){return unit==='in'?25.4:1;}
function number(v){return Number.isFinite(v)?(Math.round(v*100)/100).toString():'—';}
function showLength(v){return number(v/factor(currentUnit))+' '+currentUnit;}
function inputLength(v){return number(v/factor(currentUnit));}
function td(value,className){var c=document.createElement('td');c.textContent=String(value);if(className)c.className=className;return c;}
function fillTable(id,rows){
  var root=by(id);root.replaceChildren();
  rows.forEach(function(row){var tr=document.createElement('tr');row.forEach(function(v,i){tr.append(td(v,i>0?'num':''));});root.append(tr);});
}
function elt(tag,cls,txt){var n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;}
function safe(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function deviceEntry(d,i){
  var article=document.createElement('article');article.className='device';
  var head=elt('div','device-head');
  head.append(elt('b',null,(i+1)+'. '+(d.type==='Disconnect'?'Disconnect':'Panel')));
  var remove=elt('button','danger','Remove');remove.type='button';remove.dataset.remove=i;head.append(remove);article.append(head);
  var fields=document.createElement('div');fields.className='device-fields';
  var choices=[
    {key:'name',label:'Name / tag',wide:true},
    {key:'type',label:'Equipment type',options:['Panel','Disconnect']},
    {key:'qty',label:'Quantity',min:'1',max:'20',step:'1'},
    {key:'width',label:'Width ('+currentUnit+')',min:'1',step:'0.01'},
    {key:'height',label:'Height ('+currentUnit+')',min:'1',step:'0.01'},
    {key:'depth',label:'Depth ('+currentUnit+')',min:'1',step:'0.01'},
    {key:'points',label:'Mount bolts / enclosure',min:'0',max:'24',step:'1'}
  ];
  choices.forEach(function(f){
    var wrapper=elt('div','form-field'+(f.wide?' wide':''));
    var label=elt('label',null,f.label),control;
    if(f.options){
      control=document.createElement('select');
      f.options.forEach(function(o){var opt=new Option(o,o);control.add(opt);});
      control.value=d[f.key];
    } else {
      control=document.createElement('input');
      control.type=f.key==='name'?'text':'number';
      if(f.key==='name')control.maxLength=80;
      else {control.min=f.min;control.max=f.max||'';control.step=f.step||'any';}
      control.value=['width','height','depth'].includes(f.key)?inputLength(d[f.key]):d[f.key];
    }
    control.dataset.index=i;control.dataset.field=f.key;label.append(control);wrapper.append(label);fields.append(wrapper);
  });
  article.append(fields);return article;
}
function renderDevices(){by('devices').replaceChildren();devices.forEach(function(d,i){by('devices').append(deviceEntry(d,i));});}
function geometry(){
  var read=function(id){return Number(by(id).value)*factor(currentUnit);};
  return {mount:by('mount').value,section:by('section').value,
    gap:read('gap'),side:read('side'),above:read('above'),below:read('below'),
    maxSpan:read('maxSpan'),foot:read('foot'),kerf:read('kerf'),
    stock:by('stock').value==='custom'?read('customStock'):Number(by('stock').value)};
}
function projectState(){
  return {schema:'ewb-strut-rack-v1',name:by('project').value,unit:currentUnit,
    devices:devices.map(function(d){return Object.assign({},d);}),geometry:geometry()};
}
function populate(state){
  if(!state||!Array.isArray(state.devices)||!state.geometry)throw Error('Not a strut rack project file.');
  M.calculate(state);
  var g=state.geometry;
  currentUnit=state.unit==='in'?'in':'mm';by('unit').value=currentUnit;
  by('project').value=String(state.name||'Strut rack').slice(0,80);
  by('mount').value=g.mount==='wall'?'wall':'floor';by('section').value=g.section==='41x21'?'41x21':'41x41';
  for(var id of ['gap','side','above','below','maxSpan','foot','kerf'])by(id).value=inputLength(g[id]);
  var st=String(g.stock);by('stock').value=st==='3050'||st==='6100'?st:'custom';
  by('customStock').value=inputLength(g.stock);by('customStock').disabled=by('stock').value!=='custom';
  devices=state.devices.map(function(d){return {name:String(d.name||'Enclosure').slice(0,80),type:d.type==='Disconnect'?'Disconnect':'Panel',
    width:Number(d.width),height:Number(d.height),depth:Number(d.depth),qty:Number(d.qty),points:Number(d.points)};});
  renderDevices();update();by('saveStatus').textContent='Project loaded. Save if you want to keep it on this device.';
}
function changeUnit(to){
  if(to===currentUnit)return;
  var from=currentUnit;
  for(var id of ['gap','side','above','below','maxSpan','foot','kerf','customStock']){
    var val=Number(by(id).value)*factor(from);by(id).value=number(val/factor(to));
  }
  currentUnit=to;
  document.querySelectorAll('.unit-label').forEach(function(n){n.textContent=to;});
  renderDevices();update();
}
function update(){
  try{
    last=M.calculate(projectState());by('status').textContent='Preview updated · '+last.deviceCount+' enclosure'+(last.deviceCount!==1?'s':'')+' · '+last.postCount+' posts';
    renderResult(last);draw();
  }catch(e){
    last=null;by('status').textContent='Check inputs: '+e.message;
    for(var id of ['placementBody','cutBody','hardwareBody','stockBody'])by(id).replaceChildren();
    by('metrics').replaceChildren();by('warnings').replaceChildren();
    by('cutSummary').textContent='';by('stockSummary').textContent='';
    draw();
  }
}
function renderResult(r){
  var metrics=[
    ['Rack outside width',showLength(r.widthMm)],
    ['Rack overall height',showLength(r.heightMm)],
    ['Enclosures',r.deviceCount],
    ['Upright posts',r.postCount]
  ];
  by('metrics').replaceChildren();
  metrics.forEach(function(m){var cell=elt('div','metric'),b=elt('b',null,m[1]);cell.append(b,elt('span',null,m[0]));by('metrics').append(cell);});
  fillTable('placementBody',r.devices.map(function(d,i){return [
    (i+1)+'. '+d.name,showLength(d.xMm),showLength(d.bottomMm),
    showLength(d.widthMm)+' × '+showLength(d.heightMm)+' × '+showLength(d.depthMm)
  ];}));
  fillTable('cutBody',r.pieces.map(function(p){return [p.name,p.qty,showLength(p.cutMm),showLength(p.cutMm*p.qty)];}));
  by('cutSummary').textContent='Total channel required (before kerf): '+showLength(r.totalStrutMm)+'. Stock bar used: '+showLength(r.stockMm)+'.';
  fillTable('hardwareBody',r.hardware.map(function(h){return [h.name,h.qty,h.kind==='reference'?'Included above':'Estimate'];}));
  fillTable('stockBody',r.stockPlan.bars.map(function(bar){return ['#'+bar.number,bar.cuts.map(function(c){return c.name+': '+showLength(c.lengthMm);}).join(' + '),showLength(bar.remainingMm)];}));
  if(r.stockPlan.oversize.length){
    var rows=r.stockPlan.oversize.map(function(p){return ['Uncut',p.name+': '+showLength(p.lengthMm),'Exceeds stock'];});
    rows.forEach(function(row){var tr=elt('tr');row.forEach(function(v){tr.append(td(v));});by('stockBody').append(tr);});
  }
  by('stockSummary').textContent=r.stockPlan.bars.length+' stock bar(s) needed; unused length '+showLength(r.stockPlan.totalWasteMm)+' including '+showLength(r.kerfMm)+' saw loss per cut. Simple first-fit plan; improve with your cutting workflow.';
  by('warnings').replaceChildren();
  r.warnings.forEach(function(w){var li=elt('li',null,w);by('warnings').append(li);});
}
function scaleColor(hex,brightness){
  var n=parseInt(hex.replace('#',''),16),red=(n>>16)&255,green=(n>>8)&255,blue=n&255;
  return 'rgb('+[red,green,blue].map(function(v){return Math.min(255,Math.max(0,Math.round(v*brightness)));}).join(',')+')';
}
var canvas=by('rackCanvas'),ctx=canvas.getContext('2d');
function draw(){
  var rect=canvas.getBoundingClientRect(),w=Math.max(200,rect.width),h=Math.max(200,rect.height);
  var dpr=Math.min(2,window.devicePixelRatio||1);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  var gradient=ctx.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#dbeaf3');gradient.addColorStop(1,'#f8fcff');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
  if(!last){ctx.font='bold 16px Segoe UI, sans-serif';ctx.fillStyle='#8a3341';ctx.fillText('Correct the inputs to display the rack.',22,42);return;}
  var r=last,deepest=Math.max.apply(null,r.devices.map(function(d){return d.depthMm;}));
  var extent=Math.max(deepest+r.sectionDepthMm,r.footMm,250);
  function rotate(p){
    var x=p[0]-r.widthMm/2,y=p[1]-r.heightMm/2,z=p[2]-extent/6;
    var xx=x*Math.cos(yaw)+z*Math.sin(yaw),zz=-x*Math.sin(yaw)+z*Math.cos(yaw);
    return [xx,y*Math.cos(pitch)-zz*Math.sin(pitch),y*Math.sin(pitch)+zz*Math.cos(pitch)];
  }
  var bound=[];
  for(var bx of [0,r.widthMm])for(var by of [0,r.heightMm])for(var bz of [-Math.max(100,r.footMm)/2,deepest+r.sectionDepthMm+25])bound.push(rotate([bx,by,bz]));
  var lx=Math.min.apply(null,bound.map(function(p){return p[0];})),hx=Math.max.apply(null,bound.map(function(p){return p[0];}));
  var ly=Math.min.apply(null,bound.map(function(p){return p[1];})),hy=Math.max.apply(null,bound.map(function(p){return p[1];}));
  var scale=Math.min((w-64)/Math.max(1,hx-lx),(h-70)/Math.max(1,hy-ly))*zoom;
  var offsetX=w/2-(lx+hx)*scale/2,offsetY=h/2+(ly+hy)*scale/2;
  function proj(p){var v=rotate(p);return [offsetX+v[0]*scale,offsetY-v[1]*scale,v[2]];}
  var faces=[];
  function addFace(coords,color,mult){
    var vertices=coords.map(proj);
    faces.push({points:vertices,z:vertices.reduce(function(n,p){return n+p[2];},0)/vertices.length,color:scaleColor(color,mult)});
  }
  function cube(x,y,z,dx,dy,dz,color){
    var A=[x,y,z],B=[x+dx,y,z],C=[x+dx,y+dy,z],D=[x,y+dy,z];
    var E=[x,y,z+dz],F=[x+dx,y,z+dz],G=[x+dx,y+dy,z+dz],H=[x,y+dy,z+dz];
    addFace([A,B,C,D],color,.58);addFace([E,F,G,H],color,1);
    addFace([A,E,H,D],color,.72);addFace([B,F,G,C],color,.82);
    addFace([D,C,G,H],color,1.18);addFace([A,B,F,E],color,.68);
  }
  var section=r.sectionWidthMm,depth=r.sectionDepthMm;
  if(r.mount==='floor')r.postXsMm.forEach(function(x){cube(x-section/2,0,-r.footMm/2,section,section,r.footMm,'#17658a');});
  r.postXsMm.forEach(function(x){cube(x-section/2,0,-depth,section,r.heightMm,depth,'#17658a');});
  for(var y of [r.lowerRailMm,r.upperRailMm])cube(0,y-section/2,0,r.widthMm,section,depth,'#0b7194');
  r.devices.forEach(function(d){
    cube(d.xMm,d.bottomMm,depth+9,d.widthMm,d.heightMm,d.depthMm,d.type==='Disconnect'?'#dea95b':'#9dc2d1');
  });
  faces.sort(function(a,b){return a.z-b.z;});
  ctx.lineJoin='round';
  faces.forEach(function(f){
    ctx.beginPath();ctx.moveTo(f.points[0][0],f.points[0][1]);
    for(var i=1;i<f.points.length;i++)ctx.lineTo(f.points[i][0],f.points[i][1]);
    ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle='rgba(12,42,60,.45)';ctx.lineWidth=.9;ctx.stroke();
  });
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 12px Segoe UI, sans-serif';
  r.devices.forEach(function(d,i){
    var center=proj([d.xMm+d.widthMm/2,d.bottomMm+d.heightMm/2,depth+9+d.depthMm+2]);
    ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.95)';
    var label=(i+1)+'. '+(d.type==='Disconnect'?'DISC':'PANEL');
    ctx.strokeText(label,center[0],center[1]);ctx.fillStyle='#0c2b3e';ctx.fillText(label,center[0],center[1]);
  });
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='12px Segoe UI, sans-serif';ctx.fillStyle='#35566d';
  ctx.fillText(r.mount==='floor'?'Floor-mounted rack (anchor design required)':'Wall-mounted rack (wall fixings required)',14,22);
  ctx.fillText('Drag to orbit · '+r.section+' nominal strut · '+r.deviceCount+' enclosure(s)',14,h-14);
}
function download(name,data,type){
  var blob=new Blob([data],{type:type}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
function csvEscape(v){var s=String(v);return '"'+s.replace(/"/g,'""')+'"';}
function csv(){
  var r=last,lines=[['Category','Part','Quantity','Cut length (mm)','Total length (mm)','Notes']];
  r.pieces.forEach(function(p){lines.push(['Strut',p.name,p.qty,p.cutMm,p.qty*p.cutMm,r.section+' nominal channel']);});
  r.hardware.forEach(function(h){lines.push(['Hardware',h.name,h.qty,'','',h.kind]);});
  r.devices.forEach(function(d,i){lines.push(['Enclosure placement',(i+1)+'. '+d.name,1,'','',d.type+'; W='+d.widthMm+' H='+d.heightMm+' D='+d.depthMm+' mm; left='+d.xMm+' bottom='+d.bottomMm]);});
  r.stockPlan.bars.forEach(function(b){lines.push(['Stock allocation','Bar '+b.number,b.cuts.length,'','',b.cuts.map(function(c){return c.name+' '+c.lengthMm+' mm';}).join(' + ')+'; remainder '+b.remainingMm+' mm']);});
  r.warnings.forEach(function(w){lines.push(['Verification required',w,'','','','']);});
  return lines.map(function(row){return row.map(csvEscape).join(',');}).join('\r\n')+'\r\n';
}
function filename(ext){var name=by('project').value.trim().replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,60)||'strut-rack';return name+'.'+ext;}
by('devices').addEventListener('input',function(e){
  var field=e.target.dataset.field,index=Number(e.target.dataset.index);
  if(!field||!devices[index])return;
  var value=e.target.value;
  devices[index][field]=field==='name'||field==='type'?value:
    ['width','height','depth'].includes(field)?Number(value)*factor(currentUnit):Number(value);
  update();
});
by('devices').addEventListener('change',function(e){
  if(e.target.dataset.field==='type')renderDevices();
});
by('devices').addEventListener('click',function(e){
  if(e.target.dataset.remove===undefined)return;
  if(devices.length<=1){by('status').textContent='Keep at least one enclosure.';return;}
  devices.splice(Number(e.target.dataset.remove),1);renderDevices();update();
});
by('addPanel').addEventListener('click',function(){devices.push({name:'Panel '+(devices.length+1),type:'Panel',qty:1,width:600,height:800,depth:200,points:4});renderDevices();update();});
by('addDisconnect').addEventListener('click',function(){devices.push({name:'Disconnect '+(devices.length+1),type:'Disconnect',qty:1,width:300,height:450,depth:180,points:4});renderDevices();update();});
['project','mount','section','stock','customStock','gap','side','above','below','maxSpan','foot','kerf'].forEach(function(id){
  by(id).addEventListener('input',function(){
    if(id==='stock')by('customStock').disabled=by('stock').value!=='custom';
    if(id==='mount')by('foot').disabled=by('mount').value!=='floor';
    update();
  });
});
by('unit').addEventListener('change',function(){changeUnit(by('unit').value);});
by('reset').addEventListener('click',function(){
  if(!window.confirm('Reset the editor to the two-enclosure example? Unsaved edits will be lost.'))return;
  populate({name:'Panel & disconnect rack',unit:'mm',devices:defaultDevices(),geometry:
    {mount:'floor',section:'41x41',gap:75,side:100,above:100,below:300,foot:450,maxSpan:1000,stock:3050,kerf:3}});
  by('saveStatus').textContent='Example restored; previous saved project is unchanged.';
});
by('save').addEventListener('click',function(){
  if(!last){by('saveStatus').textContent='Correct the measurements before saving.';return;}
  try{localStorage.setItem(key,JSON.stringify(projectState()));by('saveStatus').textContent='Saved in this browser on this device.';}
  catch(e){by('saveStatus').textContent='Local saving unavailable. Use Export project JSON instead.';}
});
by('downloadJson').addEventListener('click',function(){if(last)download(filename('json'),JSON.stringify(projectState(),null,2),'application/json');});
by('downloadCsv').addEventListener('click',function(){if(last)download(filename('csv'),csv(),'text/csv;charset=utf-8');});
by('importJson').addEventListener('click',function(){by('jsonFile').click();});
by('jsonFile').addEventListener('change',function(){
  var file=this.files[0];if(!file)return;
  if(file.size>200000){by('saveStatus').textContent='Project file too large.';return;}
  file.text().then(function(t){populate(JSON.parse(t));}).catch(function(e){by('saveStatus').textContent='Cannot import project: '+e.message;});
  this.value='';
});
by('print').addEventListener('click',function(){if(last)window.print();});
document.querySelectorAll('[data-view]').forEach(function(b){
  b.addEventListener('click',function(){
    if(b.dataset.view==='front'){yaw=0;pitch=0;}
    else if(b.dataset.view==='side'){yaw=-Math.PI/2;pitch=0;}
    else {yaw=-.52;pitch=.24;}
    zoom=1;draw();
  });
});
by('zoomIn').addEventListener('click',function(){zoom=Math.min(3,zoom*1.15);draw();});
by('zoomOut').addEventListener('click',function(){zoom=Math.max(.4,zoom/1.15);draw();});
canvas.addEventListener('wheel',function(e){e.preventDefault();zoom=Math.min(3,Math.max(.4,zoom*(e.deltaY<0?1.1:.9)));draw();},{passive:false});
canvas.addEventListener('pointerdown',function(e){
  canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
});
canvas.addEventListener('pointermove',function(e){
  var previous=pointers.get(e.pointerId);if(!previous)return;
  var dx=e.clientX-previous.x,dy=e.clientY-previous.y;
  if(pointers.size===1){yaw+=dx*.008;pitch=Math.max(-1.05,Math.min(1.05,pitch+dy*.008));}
  else if(pointers.size===2){
    var others=Array.from(pointers.entries()).filter(function(row){return row[0]!==e.pointerId;});
    if(others.length){var other=others[0][1],a=Math.hypot(previous.x-other.x,previous.y-other.y),b=Math.hypot(e.clientX-other.x,e.clientY-other.y);
      if(a>15)zoom=Math.min(3,Math.max(.4,zoom*b/a));}
  }
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});draw();
});
function endPointer(e){pointers.delete(e.pointerId);}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);
window.addEventListener('resize',draw);
if(window.ResizeObserver)new ResizeObserver(draw).observe(canvas);
(function init(){
  var saved=null;
  try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch(e){}
  if(saved){
    try{populate(saved);by('saveStatus').textContent='Loaded the project saved on this device.';return;}
    catch(e){by('saveStatus').textContent='Saved project could not be loaded; showing example.';}
  }
  renderDevices();update();
})();
})();
