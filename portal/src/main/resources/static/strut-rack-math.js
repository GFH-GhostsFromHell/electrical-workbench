/* Strut Rack Builder: dimensional takeoff only, not a structural or code approval. */
(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.EWBStrutRackMath=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function finite(v,name,min,max){
    var n=Number(v);
    if(!Number.isFinite(n)||n<min||n>max)throw Error(name+' must be between '+min+' and '+max+'.');
    return n;
  }
  function mm(n){return Math.round(n*10)/10;}
  function buildStockPlan(parts,stockMm,kerfMm){
    var cuts=[];
    parts.forEach(function(p){for(var i=0;i<p.qty;i++)cuts.push({name:p.name,lengthMm:p.cutMm});});
    cuts.sort(function(a,b){return b.lengthMm-a.lengthMm;});
    var bars=[],oversize=[];
    cuts.forEach(function(p){
      if(p.lengthMm+kerfMm>stockMm){oversize.push(p);return;}
      var bar=bars.find(function(b){return b.remainingMm+1e-6>=p.lengthMm+kerfMm;});
      if(!bar){bar={number:bars.length+1,cuts:[],remainingMm:stockMm};bars.push(bar);}
      bar.cuts.push(p);bar.remainingMm=mm(bar.remainingMm-p.lengthMm-kerfMm);
    });
    return {bars:bars,oversize:oversize,totalWasteMm:mm(bars.reduce(function(n,b){return n+b.remainingMm;},0))};
  }
  function calculate(input){
    if(!input||!Array.isArray(input.devices)||!input.devices.length)throw Error('Add at least one enclosure.');
    var g=input.geometry||{},kind=g.mount==='wall'?'wall':'floor';
    var section=g.section==='41x21'?'41x21':'41x41',sectionWidth=41,sectionDepth=section==='41x21'?21:41;
    var gap=finite(g.gap,'Equipment gap',0,1000);
    var side=finite(g.side,'Side margin',40,1000);
    var above=finite(g.above,'Top margin',40,1500);
    var below=finite(g.below,'Bottom clearance',0,3000);
    var foot=finite(g.foot,'Foot length',150,1500);
    var maxSpan=finite(g.maxSpan,'Layout post spacing',250,3000);
    var stockMm=finite(g.stock,'Stock bar length',500,12000);
    var kerf=finite(g.kerf,'Saw kerf',0,15);
    var units=0,items=[],maxHeight=0,x=side;
    input.devices.forEach(function(d,index){
      var qty=finite(d.qty,'Quantity for item '+(index+1),1,20);
      if(!Number.isInteger(qty))throw Error('Equipment quantity must be a whole number.');
      var width=finite(d.width,'Width for item '+(index+1),100,3000);
      var height=finite(d.height,'Height for item '+(index+1),150,4000);
      var depth=finite(d.depth,'Depth for item '+(index+1),40,1500);
      var points=finite(d.points,'Mounting fasteners per item',0,24);
      if(!Number.isInteger(points))throw Error('Mounting fasteners must be a whole number.');
      for(var k=0;k<qty;k++){
        if(units)x+=gap;
        items.push({name:String(d.name||d.type||'Enclosure').slice(0,80),type:d.type==='Disconnect'?'Disconnect':'Panel',widthMm:width,heightMm:height,depthMm:depth,points:points,xMm:mm(x)});
        x+=width;units++;
      }
      maxHeight=Math.max(maxHeight,height);
    });
    if(units>30)throw Error('Limit this layout to 30 individual enclosures.');
    var widthMm=mm(x+side),heightMm=mm(below+maxHeight+above);
    var postSegments=Math.max(1,Math.ceil(widthMm/maxSpan));
    var posts=postSegments+1,postXs=[];
    for(var a=0;a<posts;a++)postXs.push(mm(a*widthMm/postSegments));
    items.forEach(function(d){d.bottomMm=mm(below+(maxHeight-d.heightMm)/2);});
    var inset=Math.min(180,Math.max(50,maxHeight*.18)),lower=mm(below+inset),upper=mm(below+maxHeight-inset);
    var pieces=[
      {name:'Horizontal cross rail',qty:2,cutMm:widthMm},
      {name:'Upright post',qty:posts,cutMm:heightMm}
    ];
    if(kind==='floor')pieces.push({name:'Foot / base outrigger',qty:posts,cutMm:foot});
    var strutTotalMm=mm(pieces.reduce(function(total,p){return total+p.qty*p.cutMm;},0));
    var joints=posts*2,mountFasteners=items.reduce(function(n,d){return n+d.points;},0),brackets=joints*2,baseFasteners=posts*2;
    var hardware=[
      {name:'90° strut angle fittings (2 per rail/post joint)',qty:brackets,kind:'estimated'},
      {name:'Channel nuts to suit selected channel',qty:brackets*2+mountFasteners+baseFasteners,kind:'estimated'},
      {name:'Compatible machine bolts + flat washers',qty:brackets*2+mountFasteners+baseFasteners,kind:'estimated'},
      {name:kind==='floor'?'Base plates / foot fittings':'Wall fixing plates / brackets',qty:posts,kind:'estimated'},
      {name:kind==='floor'?'Floor anchors':'Substrate anchors',qty:posts*2,kind:'estimated'},
      {name:'Post-to-base/wall fitting bolts (included in above bolts)',qty:baseFasteners,kind:'reference'},
      {name:'Equipment mounting bolt sets (included in above bolts)',qty:mountFasteners,kind:'reference'}
    ];
    var plan=buildStockPlan(pieces,stockMm,kerf);
    var warnings=[
      'Conceptual channel layout only. Post spacing and the two continuous cross rails are NOT verified for load, deflection, vibration, seismic restraint or cantilever stability. Obtain a manufacturer/engineer-approved support design.',
      'Enclosure positions are based on OUTSIDE dimensions, not verified mounting-hole centres. Confirm manufacturer hole patterns, bolt sizes, enclosure back clearances and the rail locations before cutting or ordering hardware.',
      'Allow for door swing, working space, cable/conduit entry, ventilation, access and applicable electrical/code requirements. Check all wall/floor anchors and substrate load ratings.',
      'Cut dimensions are end-to-end nominal lengths, before field adjustments, connection details, surface finishing and installation tolerances. Hardware quantities are planning estimates, not approved fastening schedules.'
    ];
    if(plan.oversize.length)warnings.unshift('One or more members exceed the selected stock length: choose longer stock or obtain an engineered splice design. Do NOT simply join short pieces.');
    if(items.some(function(d){return d.bottomMm+50>lower||d.bottomMm+d.heightMm-50<upper;}))warnings.push('Some shorter enclosures may not align with both continuous rack rails. Add manufacturer-approved intermediate supports or revise the layout.');
    if(kind==='floor'&&items.some(function(d){return d.depthMm>foot;}))warnings.push('An enclosure is deeper than the specified foot. Verify stability and base design; feet alone do not make this rack self-supporting.');
    return {
      mount:kind,section:section,sectionWidthMm:sectionWidth,sectionDepthMm:sectionDepth,
      widthMm:widthMm,heightMm:heightMm,maxDeviceHeightMm:maxHeight,lowerRailMm:lower,upperRailMm:upper,
      postXsMm:postXs,devices:items,pieces:pieces,hardware:hardware,stockPlan:plan,
      totalStrutMm:strutTotalMm,deviceCount:units,postCount:posts,footMm:kind==='floor'?foot:0,
      gapMm:gap,sideMm:side,aboveMm:above,belowMm:below,stockMm:stockMm,kerfMm:kerf,warnings:warnings
    };
  }
  return {calculate:calculate,buildStockPlan:buildStockPlan};
});
