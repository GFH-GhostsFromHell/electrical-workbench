/* Electrical Workbench · one task => one recommended calculator.
 * Related methods are shown only if they solve a distinct problem. */
(function(root){
'use strict';
const tasks=root.EWBCalculatorTopics||[];
const by=id=>document.getElementById(id);
const input=by('query'),results=by('results'),groups=Array.from(document.querySelectorAll('[data-group]'));
const common=['conductor','voltage','service','transformer','motors','busbar','tap','firealarm'];
let group='all',browseAll=false,selectedId=null,firstRender=true;
function el(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
}
function matches(t,q){
  const words=q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const source=(t.name+' '+t.description+' '+t.group+' '+t.terms+' '+
    t.primary.label+' '+t.alternatives.map(x=>x.label+' '+(x.purpose||'')).join(' ')).toLowerCase();
  return words.every(w=>source.includes(w));
}
function labelFor(id){return {busbar:'Busbar',motors:'Motor',service:'Service',voltage:'Voltage drop'}[id]||'Electrical';}
function currentMatches(){
  const q=input.value.trim();
  let visible=tasks.filter(t=>q?matches(t,q):(group==='all'||t.group===group));
  if(!q&&group==='all'&&!browseAll){
    visible=visible.filter(t=>common.includes(t.id));
    visible.sort((a,b)=>common.indexOf(a.id)-common.indexOf(b.id));
  }else if(q){
    const rank=t=>{
      const phrase=t.name.toLowerCase(),needle=q.toLowerCase();
      if(phrase===needle)return 0;
      if(phrase.startsWith(needle))return 1;
      if(phrase.includes(needle))return 2;
      return 3;
    };
    visible.sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name));
  }else visible.sort((a,b)=>a.name.localeCompare(b.name));
  return visible;
}
function showDetail(t){
  by('selected').hidden=!t;by('emptyState').hidden=!!t;
  if(!t)return;
  by('selectedGroup').textContent=t.group;
  by('selectedName').textContent=t.name;
  by('selectedDescription').textContent=t.description;
  by('selectedPurpose').textContent=t.primary.purpose||'The recommended calculation for this task. Enter the real job values and review the worked result.';
  const start=by('selectedLink');
  start.textContent=t.primary.label;
  start.href=t.primary.url;
  const extras=by('extraMethods'),list=by('extraList');
  list.replaceChildren();
  // A specialist page is not treated as a separate duplicate tool.
  // This list contains only distinct related calculations, not different
  // presentations of the exact same formula.
  const alternatives=t.alternatives||[];
  extras.hidden=!alternatives.length;
  alternatives.forEach(a=>{
    const link=el('a','calc-branch');
    link.href=a.url;
    const words=el('span');
    words.append(el('strong',null,a.label));
    if(a.purpose)words.append(el('small',null,a.purpose));
    link.append(words,el('span','calc-branch-arrow','→'));
    list.append(link);
  });
}
function render(){
  const q=input.value.trim(),shown=currentMatches();
  if(!shown.some(t=>t.id===selectedId))selectedId=shown.length?shown[0].id:null;
  results.replaceChildren();
  shown.forEach(t=>{
    const button=el('button','calc-task');
    button.type='button';
    button.setAttribute('aria-pressed',String(t.id===selectedId));
    button.dataset.task=t.id;
    const labels=el('span');
    labels.append(el('span','calc-task-name',t.name));
    labels.append(el('span','calc-task-sub',t.group));
    button.append(labels,el('span','calc-task-arrow','›'));
    button.addEventListener('click',()=>{
      selectedId=t.id;
      showDetail(t);
      results.querySelectorAll('button.calc-task').forEach(b=>
        b.setAttribute('aria-pressed',String(b.dataset.task===selectedId)));
      const detail=by('detail');
      if(root.matchMedia&&root.matchMedia('(max-width: 700px)').matches)
        detail.scrollIntoView({behavior:'auto',block:'start'});
    });
    results.append(button);
  });
  by('count').textContent=shown.length+' calculation'+(shown.length===1?'':'s')+' shown';
  by('noResults').hidden=shown.length>0;
  by('listHeading').textContent=q?'Matching calculations':group==='all'?(browseAll?'All calculations':'Common calculations'):group;
  by('browseAll').hidden=!!q||group!=='all';
  by('browseAll').textContent=browseAll?'Show common':'See all '+tasks.length;
  by('browseAll').setAttribute('aria-expanded',String(browseAll));
  showDetail(shown.find(t=>t.id===selectedId)||null);
  firstRender=false;
}
input.addEventListener('input',()=>{
  if(input.value.trim())group='all';
  groups.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===group)));
  render();
});
groups.forEach(button=>button.addEventListener('click',()=>{
  group=button.dataset.group;
  browseAll=false;
  input.value='';
  groups.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  render();
}));
by('browseAll').addEventListener('click',()=>{browseAll=!browseAll;render();});
by('clear').addEventListener('click',()=>{
  input.value='';group='all';browseAll=true;
  groups.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group==='all')));
  render();input.focus();
});
const params=new URLSearchParams(root.location.search);
const requested=params.get('topic')||root.location.hash.slice(1);
if(requested&&tasks.some(t=>t.id===requested)){selectedId=requested;browseAll=true;}
const query=params.get('q');if(query)input.value=query.slice(0,120);
render();
})(window);