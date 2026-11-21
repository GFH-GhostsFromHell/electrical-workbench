/* Electrical Workbench appearance: local preference only, no account data. */
(function(w) {
 'use strict';
 const KEY='ewb.theme.v1';
 const choices=[
  ['system','Follow device','Use system light/dark','#e8f1fa','#13283a'],
  ['daylight','Daylight','Bright, cool and readable','#ffffff','#14557b'],
  ['midnight','Midnight','Low-glare dark','#15283b','#75daf0'],
  ['workshop','Warm Workshop','Soft paper and earth tones','#fffaf2','#74411e'],
  ['contrast','High Contrast','Maximum text separation','#050505','#ffe15c']
 ];
 const ids=choices.map(x=>x[0]);
 function read(){try{const x=w.localStorage.getItem(KEY);return ids.includes(x)?x:'daylight';}catch(e){return 'daylight';}}
 let selection=read();
 const dark=()=>Boolean(w.matchMedia&&w.matchMedia('(prefers-color-scheme: dark)').matches);
 const resolved=()=>selection==='system'?(dark()?'midnight':'daylight'):selection;
 function apply(){
  const html=w.document.documentElement;
  html.dataset.ewbTheme=resolved();html.dataset.ewbPreference=selection;
  html.style.colorScheme=['midnight','contrast'].includes(resolved())?'dark':'light';
  w.document.querySelectorAll('input[name="ewb-appearance"]').forEach(r=>r.checked=r.value===selection);
  const current=w.document.getElementById('ewb-theme-current');
  if(current)current.textContent=choices.find(x=>x[0]===selection)[1];
 }
 function set(value){
  if(!ids.includes(value))return false;
  selection=value;try{w.localStorage.setItem(KEY,value);}catch(e){}
  apply();w.dispatchEvent(new CustomEvent('ewb-theme-change',{detail:{preference:selection,theme:resolved()}}));return true;
 }
 w.EWBTheme={get:()=>selection,current:resolved,set,options:choices.map(x=>({id:x[0],name:x[1]}))};
 apply(); // apply before the rest of the page paints
 function mount(){
  if(w.document.getElementById('ewb-theme-button'))return;
  const container=w.document.querySelector('.top-actions')||w.document.querySelector('header nav');
  const host=w.document.createElement('div');host.id='ewb-theme-host';
  if(!container)host.className='ewb-theme-floating';
  const button=w.document.createElement('button');
  button.id='ewb-theme-button';button.type='button';button.textContent='◐ Theme';
  button.setAttribute('aria-controls','ewb-theme-panel');button.setAttribute('aria-expanded','false');
  const panel=w.document.createElement('section');
  panel.id='ewb-theme-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Appearance settings');
  const title=w.document.createElement('h2');title.textContent='Appearance';
  const message=w.document.createElement('p');message.textContent='Choose a theme. It stays saved on this device across the workbench.';
  const status=w.document.createElement('p');status.textContent='Selected: ';
  const current=w.document.createElement('strong');current.id='ewb-theme-current';status.append(current);
  const group=w.document.createElement('fieldset');
  const legend=w.document.createElement('legend');legend.textContent='Colour theme';group.append(legend);
  choices.forEach(item=>{
   const label=w.document.createElement('label');label.className='ewb-theme-option';
   const input=w.document.createElement('input');input.type='radio';input.name='ewb-appearance';input.value=item[0];
   input.addEventListener('change',()=>{if(input.checked)set(item[0]);});
   const swatches=w.document.createElement('span');swatches.className='ewb-theme-swatches';swatches.setAttribute('aria-hidden','true');
   [item[3],item[4]].forEach(color=>{const mark=w.document.createElement('i');mark.style.background=color;swatches.append(mark);});
   const words=w.document.createElement('span');
   const strong=w.document.createElement('strong');strong.textContent=item[1];
   const small=w.document.createElement('small');small.textContent=item[2];
   words.append(strong,small);label.append(input,swatches,words);group.append(label);
  });
  const done=w.document.createElement('button');done.id='ewb-theme-done';done.type='button';done.textContent='Done';
  function close(){panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus();}
  done.addEventListener('click',close);
  button.addEventListener('click',()=>{
   panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));
   if(!panel.hidden)panel.querySelector('input:checked')?.focus();
  });
  w.document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)close();});
  w.document.addEventListener('click',e=>{if(!panel.hidden&&!host.contains(e.target))close();});
  panel.append(title,message,status,group,done);host.append(button,panel);
  (container||w.document.body).append(host);apply();
 }
 if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 if(w.matchMedia){
  const query=w.matchMedia('(prefers-color-scheme: dark)');
  if(query.addEventListener)query.addEventListener('change',()=>{if(selection==='system')apply();});
  else if(query.addListener)query.addListener(()=>{if(selection==='system')apply();});
 }
 w.addEventListener('storage',e=>{if(e.key===KEY){selection=read();apply();}});
})(window);
