/* Syntax, required control IDs and key content regression checks for static field tools. */
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../portal/src/main/resources/static');
const files=['field-suite.html','troubleshooting-kb.html','bend-calcs.html','bender-calibration.html'];
let failed=false;
for(const name of files){
 const html=fs.readFileSync(path.join(root,name),'utf8');
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
 if(!scripts.length)throw new Error('No inline script in '+name);
 for(let i=0;i<scripts.length;i++)new vm.Script(scripts[i],{filename:name+'#inline'+i});
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 const literals=[...html.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
 const missing=[...new Set(literals.filter(id=>!ids.has(id)))];
 if(missing.length){console.error(name+': missing DOM controls '+missing.join(', '));failed=true}
 console.log(name+': '+scripts.length+' JavaScript scripts parse; '+ids.size+' element IDs; '+missing.length+' missing control IDs');
}

// The separate experiment is retired. Its former URL must not break bookmarks.
const stableBender=fs.readFileSync(path.join(root,'bend-calcs.html'),'utf8');
const retiredRoute=fs.readFileSync(path.join(root,'bend-instruction-lab.html'),'utf8');
if(!retiredRoute.includes('location.replace("/bend-calcs.html")')){
 console.error('Retired bender route must redirect to the stable field calculator');failed=true;
}
if(stableBender.includes('href="/bend-instruction-lab.html"')){
 console.error('Experimental bender still linked from the stable calculator');failed=true;
}
const stableIds=new Set([...stableBender.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
for(const id of ['menuScreen','toolScreen','multiScreen','marks','stepList','stepWarning',
 'fieldFocusToggle','fieldFocusCount','fieldFocusText','fieldFocusPrevious','fieldFocusNext',
 'mbMarkCanvas','mbSteps','mbWarnings','mbFocusToggle','mbFocusPanel','mbFocusContent',
 'mbFocusPrevious','mbFocusNext']){
 if(!stableIds.has(id)){console.error('Stable bender missing control '+id);failed=true}
}
for(const token of ['function calcOffset()','function calcRoll()','function calcS3()','function calcStub()',
 'function calcBack()','function mbCompute()','function fieldFocusUpdate()','function mbFocusUpdate()',
 'CALCULATION NOT POSSIBLE','BENDS TOO CLOSE','3048','hookFaceBadge','function applySavedCalibration()']){
 if(!stableBender.includes(token)){console.error('Stable bender regression: '+token);failed=true}
}
for(const token of ['id="shoeMethod"','function setShoeMethod(','B FIRST · hook LEFT','A SECOND · FLIP bender handle DOWN',
 'B SECOND · FLIP bender handle DOWN','C THIRD · move bender','D FOURTH · FLIP handle DOWN',
 'hookFaceCaption','HOOK toward free end being raised','USE MANUFACTURER SHOE PROCEDURE']){
 if(!stableBender.includes(token)){console.error('Missing bend setup guidance: '+token);failed=true}
}
if(stableBender.includes('? VERIFY HOOK DIRECTION')||stableBender.includes("'? VERIFY'")){
 console.error('Old ambiguous hook warning has returned');failed=true;
}
const viewer=fs.readFileSync(path.join(root,'bend-view-3d.js'),'utf8');
new vm.Script(viewer,{filename:'bend-view-3d.js'});
for(const id of ['bendView2d','bendView3d','bend3dCanvas','mbView2d','mbView3d','mb3dCanvas','offsetPlane','rollVertical','rollSide']){
 if(!stableBender.includes(id)){console.error('2D/3D field view missing '+id);failed=true}
}
for(const token of ["BendView3D.single(","BendView3D.multi(","BendView3D.mount(","refreshBendView()","refreshMultiBendView()",
 '3D · rotate','FLIP, THEN BEND B','TURN BENDER & BEND C']){
 if(!stableBender.includes(token)){console.error('Missing integrated 3D/precise guide: '+token);failed=true}
}
for(const token of ['pointerdown','pointermove','touch','canvas','function orient(','function single(','function multi(']){
 if(!viewer.includes(token)){console.error('3D viewer regression: '+token);failed=true}
}
console.log('Stable bender: formulas, calibrated marks, 2D/3D orbit viewer and precise field steps validated');
const kb=fs.readFileSync(path.join(root,'troubleshooting-kb.html'),'utf8');
const procedures=[...kb.matchAll(/\btopic\('[a-z0-9-]+'/g)].length;
if(procedures<20){console.error('Expected >=20 troubleshooting procedures, found '+procedures);failed=true}
for(const term of ['battery-electric','PLC input ON','VFD DC-bus overvoltage','Furnace','lockout/tagout']){
 if(!kb.includes(term)){console.error('Missing diagnostic content: '+term);failed=true}
}
const suite=fs.readFileSync(path.join(root,'field-suite.html'),'utf8');
const views=['home','trouble','bend','blueprint','controls','sld','code','quote','projects','commission','capture'];
for(const view of views){if(!suite.includes('id="view-'+view+'"')){console.error('Missing suite view '+view);failed=true}}
const sw=fs.readFileSync(path.join(root,'field-tools-sw.js'),'utf8');
new vm.Script(sw,{filename:'field-tools-sw.js'});
if(sw.includes('/api/')){console.error('Offline cache must not cache API calls');failed=true}
console.log('KB procedures: '+procedures+'; Suite views: '+views.length+'; Offline worker syntax validated');
if(failed)process.exit(1);
