/* Electrical Workbench — dependency-free, rotatable 3D bend centreline preview.
   A planning illustration, NOT physical shoe mark, bend radius, developed length or collision validation. */
(function(){
 'use strict';
 const views=new Map(),RAD=Math.PI/180;
 const finite=n=>Number.isFinite(n)?n:0;
 const pos=n=>Math.max(0,finite(n));
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const add=(a,b)=>a.map((v,i)=>v+b[i]);
 const mul=(a,k)=>a.map(v=>v*k);
 const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const norm=a=>{const d=Math.hypot(...a);return d>1e-9?a.map(x=>x/d):[0,0,0];};
 const rot=(v,axis,degrees)=>{const a=norm(axis),c=Math.cos(degrees*RAD),s=Math.sin(degrees*RAD);
  return add(add(mul(v,c),mul(cross(a,v),s)),mul(a,dot(a,v)*(1-c)));};
 const point=(p,label='')=>({p,label});
 const make=(name,arr,labels={},status='Illustrative finished centreline, with ideal bends rather than shoe-radius arcs.')=>({
  name,paths:[{points:arr.map((p,i)=>point(p,labels[i]||''))}],status
 });
 const track=(name,arr)=>({name,paths:arr,status:'Parallel conduits are separate pieces. The 3D view is a schematic stagger, not a bank clearance or shoe fit check.'});
 function single(kind,angle,unit,read){
  const v=id=>pos(read(id)),a=clamp(Number(angle)||30,1,89),t=Math.tan(a*RAD),metric=unit==='mm',minimum=metric?80:3;
  const lead=(run,h)=>Math.max(minimum,h*.75,run*.50),tail=(run,h)=>Math.max(minimum,h*.75,run*.50);
  if(['offsetFar','offsetNear','rollFar','rollNear'].includes(kind)){
   const rolling=kind.startsWith('roll'),h=rolling?v('rise'):v('off'),y=rolling?v('roll'):0,shift=Math.hypot(h,y);
   if(shift<=0)return null;
   const run=shift/t,L=lead(run,shift),R=tail(run,shift);
   return make(rolling?'Rolling offset':'Two-bend offset',[[0,0,0],[L,0,0],[L+run,y,h],[L+run+R,y,h]],{1:'A',2:'B'},
    'Ideal centreline: the sloped segment uses the selected bend angle. A/B are approximate bend locations, not calibrated shoe arrow marks.');
  }
  if(['saddle3','round'].includes(kind)){
   const h=kind==='round'?v('diam')+v('clear'):v('height'),ca=v('centerAngle')||45,side=ca/2;
   if(h<=0)return null;
   const run=h/Math.tan(side*RAD),L=lead(run,h),R=tail(run,h);
   return make('Three-point saddle',[[0,0,0],[L,0,0],[L+run,0,h],[L+2*run,0,0],[L+2*run+R,0,0]],{1:'A',2:'B',3:'C'},
    'Saddle shown with ideal tangent corners. The physical centre notch and outer arrow positions do NOT equal these schematic corner locations.');
  }
  if(['saddle4','rect','square'].includes(kind)){
   const h=v('height'),w=v('width');if(h<=0||w<=0)return null;
   const run=h/t,L=lead(run,h),R=tail(run,h);
   return make('Four-point saddle',[[0,0,0],[L,0,0],[L+run,0,h],[L+run+w,0,h],[L+2*run+w,0,0],[L+2*run+w+R,0,0]],{1:'A',2:'B',3:'C',4:'D'},
    'Two idealized offsets around an obstacle. Real shoe radius and tangent references change finished lengths and obstacle clearances.');
  }
  if(kind==='stub'){
   const h=v('stub');if(h<=0)return null;
   return make('90° stub',[[0,0,h],[0,0,0],[Math.max(minimum,h*2),0,0]],{1:'90°'},
    'Finished stub schematic; the shoe ARROW location is obtained separately from the calibrated take-up/deduct.');
  }
  if(kind==='kick90'){
   const h=v('stub'),k=v('kick');if(h<=0||k<=0)return null;
   const run=k/t,L=lead(run,k),R=tail(run,k);
   return make('Kicked 90°',[[0,0,h],[0,0,0],[L,0,0],[L+run,0,k],[L+run+R,0,k]],{1:'90°',2:'KICK'},
    'The kick starting point is deliberately illustrative; kick rise alone cannot locate a physical kick mark.');
  }
  if(kind==='back2back'){
   const h=v('stub'),gap=v('backdist');if(h<=0||gap<=0)return null;
   return make('Back-to-back 90s',[[0,0,h],[0,0,0],[gap,0,0],[gap,0,h]],{1:'1',2:'2'},
    'The second 90° uses your bender STAR / back-of-90 method; this model does not establish that shoe reference.');
  }
  if(kind==='segment90'){
   const r=v('radius'),N=Math.max(3,Math.min(12,Math.round(v('segments')||6)));if(r<=0)return null;
   const pts=[[-r*.5,0,0]];
   for(let j=0;j<=N;j++){const theta=j*Math.PI/(2*N);pts.push([r*Math.sin(theta),0,r*(1-Math.cos(theta))]);}
   pts.push([r,0,r+r*.5]);
   return make('Segmented 90°',pts,{1:'START',[N+1]:'END'},
    'The arc uses straight chord segments only; this is not a shoe-specific segmented-radius bending plan.');
  }
  if(kind==='parallel'){
   const gap=v('sep'),N=Math.max(2,Math.min(10,Math.round(v('count')||4)));if(gap<=0)return null;
   const rise=gap*2,run=rise/t,L=lead(run,rise),R=tail(run,rise),stagger=gap*Math.tan(a*RAD/2),arr=[];
   for(let i=0;i<N;i++){const x=i*stagger,y=(i-(N-1)/2)*gap;
    arr.push({points:[[x,y,0],[x+L,y,0],[x+L+run,y,rise],[x+L+run+R,y,rise]].map((p,j)=>point(p,j===1?String(i+1):'')),color:i});}
   return track('Parallel conduits',arr);
  }
  if(kind==='gainCut'){
   const h=v('cutFirst'),span=v('cutSpan'),two=document.getElementById('cutShape')?.value==='Back-to-back 90s';
   if(h<=0)return null;
   return make('Gain / stock cut illustration',two?[[0,0,h],[0,0,0],[Math.max(minimum,span),0,0],[Math.max(minimum,span),0,h]]:[[0,0,h],[0,0,0],[Math.max(minimum,h),0,0]],{},
    'Arrangement illustration only: this calculator computes stock cut length, not shoe arrow/star bending positions.');
  }
  return null;
 }
 function multi(ops,stock){
  if(!Array.isArray(ops)||!ops.length||!(stock>0)||!Number.isFinite(stock))return null;
  const events=[];
  const normal=op=>{
   const plane=op.plane;
   if(op.kind==='Rolling offset'){const rise=pos(op.h),side=pos(op.r),length=Math.hypot(rise,side)||1;
    const sign=['Down','Left'].includes(plane)?-1:1;
    return [0,sign*side/length,sign*rise/length];}
   return plane==='Down'?[0,0,-1]:plane==='Right'?[0,1,0]:plane==='Left'?[0,-1,0]:[0,0,1];
  };
  ops.slice().sort((a,b)=>a.pos-b.pos).forEach((o,k)=>{
   const a=finite(o.a),h=pos(o.h),r=pos(o.r),s=finite(o.pos),sp=h/Math.sin(Math.max(1,a)*RAD),group='G'+(k+1);
   const push=(at,theta,label)=>events.push({at,theta,label,group,normal:normal(o)});
   if(o.kind==='Two-bend offset'){push(s,a,'A');push(s+sp,-a,'B');}
   else if(o.kind==='Rolling offset'){const trueOffset=Math.hypot(h,r);const span=trueOffset/Math.sin(Math.max(1,a)*RAD);push(s,a,'A');push(s+span,-a,'B');}
   else if(o.kind==='90° arrow mark'){push(s,90,'A');}
   else if(o.kind==='Single kick'){push(s,a,'K');}
   else if(o.kind==='Three-point saddle'){
    const factor=a===45?2.5:a===30?3.8:1/Math.sin(a*RAD/2);
    const flank=h*factor;push(s-flank,a/2,'A');push(s,-a,'B');push(s+flank,a/2,'C');
   }else if(o.kind==='Four-point saddle'){
    push(s,a,'A');push(s+sp,-a,'B');push(s+sp+pos(o.w),-a,'C');push(s+2*sp+pos(o.w),a,'D');
   }
  });
  events.sort((a,b)=>a.at-b.at);
  if(!events.length||events.some(e=>!Number.isFinite(e.at)||e.at<0||e.at>stock||!Number.isFinite(e.theta)))return null;
  let at=0,p=[0,0,0],dir=[1,0,0];const points=[point(p)],axes=new Map();
  for(const e of events){
   p=add(p,mul(dir,e.at-at));points.push(point(p,e.group+' '+e.label));at=e.at;
   let axis=axes.get(e.group);
   if(!axis){
    const wanted=e.normal,perp=add(wanted,mul(dir,-dot(dir,wanted)));
    axis=norm(cross(dir,Math.hypot(...perp)>1e-6?perp:[0,1,0]));
    if(Math.hypot(...axis)<1e-6)axis=[0,-1,0];
    axes.set(e.group,axis);
   }
   dir=norm(rot(dir,axis,e.theta));
  }
  const end=add(p,mul(dir,stock-at));points.push(point(end));
  return {name:'Multiple bends on one pipe',paths:[{points}],status:'SCHEMATIC ONLY: events are plotted at straight-stock mark stations as ideal corners. They are NOT verified physical bend centres; this is not a collision, clearance, bend radius or developed-length solver.'};
 }
 function project(p,yaw,pitch){
  const c=Math.cos(yaw),s=Math.sin(yaw),v=p[0]*s+p[1]*c;
  return [p[0]*c-p[1]*s,p[2]*Math.cos(pitch)-v*Math.sin(pitch)];
 }
 function draw(state){
  const c=state.canvas;if(!c||!c.isConnected||!state.model)return;
  const rect=c.getBoundingClientRect(),W=Math.max(200,rect.width||400),H=Math.max(180,rect.height||320);
  const dpr=Math.min(2,window.devicePixelRatio||1),pw=Math.round(W*dpr),ph=Math.round(H*dpr);
  if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph;}
  const ctx=c.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0c263c');bg.addColorStop(1,'#071320');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  const pts=state.model.paths.flatMap(path=>path.points.map(v=>v.p));if(!pts.length)return;
  const min=[0,1,2].map(i=>Math.min(...pts.map(p=>p[i]))),max=[0,1,2].map(i=>Math.max(...pts.map(p=>p[i])));
  const center=min.map((n,i)=>(n+max[i])/2);
  const pp=pts.map(p=>project(add(p,mul(center,-1)),state.yaw,state.pitch));
  const spreadX=Math.max(1,...pp.map(p=>Math.abs(p[0]))),spreadY=Math.max(1,...pp.map(p=>Math.abs(p[1])));
  const scale=Math.min(W*.39/spreadX,H*.34/spreadY)*state.zoom;
  const toScreen=p=>{const q=project(add(p,mul(center,-1)),state.yaw,state.pitch);return [W/2+q[0]*scale,H*.53-q[1]*scale];};
  const drawLine=(from,to,color,width,dash)=>{
   const a=toScreen(from),b=toScreen(to);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);
   ctx.lineWidth=width;ctx.strokeStyle=color;ctx.setLineDash(dash||[]);ctx.stroke();ctx.setLineDash([]);
  };
  const range=Math.max(...max.map((v,i)=>v-min[i]),1),gridSize=range*.65;
  for(let i=-3;i<=3;i++){
   const o=i*gridSize/3;
   drawLine([center[0]-gridSize,o+center[1],min[2]],[center[0]+gridSize,o+center[1],min[2]],'#1a3a4b',1);
   drawLine([o+center[0],center[1]-gridSize,min[2]],[o+center[0],center[1]+gridSize,min[2]],'#1a3a4b',1);
  }
  const origin=[center[0]-range*.42,center[1]-range*.42,min[2]];
  const arrows=[{delta:[range*.33,0,0],color:'#fca5a5',letter:'X · RUN'},
   {delta:[0,range*.33,0],color:'#c4b5fd',letter:'Y · SIDE'},
   {delta:[0,0,range*.33],color:'#5eead4',letter:'Z · UP'}];
  ctx.font='bold 11px system-ui,sans-serif';
  for(const a of arrows){const tip=add(origin,a.delta);drawLine(origin,tip,a.color,2);const q=toScreen(tip);ctx.fillStyle=a.color;ctx.fillText(a.letter,q[0]+5,q[1]-7);}
  const colors=['#a6bdcb','#a0d8d8','#c2b9db','#b9d3aa','#dad0a4'];
  for(const [index,path] of state.model.paths.entries()){
   const pix=path.points.map(x=>toScreen(x.p));if(pix.length<2)continue;
   const drawPath=()=>{ctx.beginPath();pix.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));};
   ctx.lineCap='round';ctx.lineJoin='round';
   drawPath();ctx.shadowColor='#000a';ctx.shadowBlur=14;ctx.shadowOffsetY=6;ctx.strokeStyle='#233a48';ctx.lineWidth=18;ctx.stroke();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
   drawPath();ctx.strokeStyle=colors[index%colors.length];ctx.lineWidth=13;ctx.stroke();
   drawPath();ctx.strokeStyle='#f2fbff';ctx.globalAlpha=.52;ctx.lineWidth=3;ctx.stroke();ctx.globalAlpha=1;
   for(let j=0;j<path.points.length;j++){
    const label=path.points[j].label;if(!label)continue;
    const [x,y]=pix[j],tx=clamp(x+12,8,W-110),ty=clamp(y-15,18,H-9);
    ctx.fillStyle='#082238';ctx.strokeStyle='#7ee5dc';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#ecffff';ctx.font='bold 12px system-ui,sans-serif';ctx.fillText(label,tx,ty);
   }
  }
  ctx.fillStyle='#acc8d9';ctx.font='12px system-ui,sans-serif';ctx.fillText('Drag to orbit • Scroll/pinch buttons to zoom • Not a shoe-radius simulation',12,H-12,W-24);
 }
 function mount(id,model){
  const canvas=document.getElementById(id);if(!canvas)return;
  let state=views.get(id);
  if(!state){
   state={canvas,model:null,yaw:-.68,pitch:.48,zoom:1,drag:null};
   views.set(id,state);
   canvas.setAttribute('tabindex','0');canvas.setAttribute('role','img');
   canvas.addEventListener('pointerdown',e=>{state.drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);});
   canvas.addEventListener('pointermove',e=>{if(!state.drag||state.drag.id!==e.pointerId)return;
    const dx=e.clientX-state.drag.x,dy=e.clientY-state.drag.y;state.drag.x=e.clientX;state.drag.y=e.clientY;
    state.yaw+=dx*.009;state.pitch=clamp(state.pitch+dy*.007,-1.27,1.27);draw(state);});
   const end=e=>{if(state.drag&&state.drag.id===e.pointerId)state.drag=null;};
   canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
   canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=clamp(state.zoom*Math.exp(-e.deltaY*.001),.55,3);draw(state);},{passive:false});
   canvas.addEventListener('keydown',e=>{const moves={ArrowLeft:[-.16,0],ArrowRight:[.16,0],ArrowUp:[0,-.12],ArrowDown:[0,.12]};
    if(!moves[e.key])return;e.preventDefault();state.yaw+=moves[e.key][0];state.pitch=clamp(state.pitch+moves[e.key][1],-1.27,1.27);draw(state);});
   if(typeof ResizeObserver!=='undefined'){const ro=new ResizeObserver(()=>{if(state.canvas.isConnected)draw(state);});ro.observe(canvas);state.observer=ro;}
  }
  state.canvas=canvas;state.model=model;
  canvas.setAttribute('aria-label','Rotatable 3D schematic centreline of '+(model?.name||'conduit')+'. Arrow keys rotate. Not a fabrication drawing.');
  if(model){canvas.hidden=false;draw(state);}
  else {canvas.hidden=true;const ctx=canvas.getContext('2d');if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);}
 }
 function adjust(id,action){const v=views.get(id);if(!v)return;
  if(action==='reset'){v.yaw=-.68;v.pitch=.48;v.zoom=1;}
  else if(action==='left')v.yaw-=.25;
  else if(action==='right')v.yaw+=.25;
  else if(action==='up')v.pitch=clamp(v.pitch-.2,-1.27,1.27);
  else if(action==='down')v.pitch=clamp(v.pitch+.2,-1.27,1.27);
  else if(action==='zoomIn')v.zoom=clamp(v.zoom*1.2,.55,3);
  else if(action==='zoomOut')v.zoom=clamp(v.zoom/1.2,.55,3);
  draw(v);
 }
 function orient(model,kind,choice){
  if(!model)return model;
  const get=id=>choice?.(id)||'';
  for(const path of model.paths){
   for(const pt of path.points){
    const p=pt.p;if(kind==='rollFar'||kind==='rollNear'){
     if(get('rollVertical')==='Down')p[2]*=-1;
     if(get('rollSide')==='Left')p[1]*=-1;
    }else if(['offsetFar','offsetNear','saddle3','round','saddle4','rect','square'].includes(kind)){
     const plane=kind.startsWith('offset')?get('offsetPlane'):get('saddlePlane');
     const z=p[2];if(plane==='Down')p[2]=-z;
     else if(plane==='Left'){p[1]=-z;p[2]=0;}
     else if(plane==='Right'){p[1]=z;p[2]=0;}
    }
   }
  }
  return model;
 }
 window.BendView3D={single,multi,mount,adjust,orient};
})();
