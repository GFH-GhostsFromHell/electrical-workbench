/* Task-first calculator search: primary route per job; alternatives are disclosed in each card. */
(function(root){
'use strict';
const tasks=root.EWBCalculatorTopics||[], by=id=>document.getElementById(id);
const input=by('query'),out=by('results'),clear=by('clear'),groups=Array.from(document.querySelectorAll('[data-group]'));
const common=['conductor','voltage','service','transformer','motors','busbar','tap','firealarm'];
let group='all',browseAll=false;
function el(tag,cls,value){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!==undefined)node.textContent=value;
  return node;
}
function words(s){return s.toLowerCase().trim().split(/\s+/).filter(Boolean);}
function matches(t,q){
  const hay=(t.name+' '+t.description+' '+t.group+' '+t.terms+' '+t.alternatives.map(x=>x.label).join(' ')).toLowerCase();
  return words(q).every(x=>hay.includes(x));
}
function card(t){
  const article=el('article','topic'),heading=el('h3',null,t.name),tag=el('div','tag',t.group),desc=el('p',null,t.description);
  const link=el('a','open','Open '+t.primary.label);link.href=t.primary.url;
  article.append(tag,heading,desc,link);
  if(t.alternatives&&t.alternatives.length){
    const details=document.createElement('details'),summary=el('summary',null,'Other methods ('+t.alternatives.length+')');
    const alternate=el('div','other');
    t.alternatives.forEach(a=>{const href=el('a',null,a.label);href.href=a.url;alternate.append(href);});
    details.append(summary,alternate);article.append(details);
  }
  return article;
}
function selectGroup(next){
  group=next;groups.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===next)));render();
}
function render(){
  const q=input.value.trim();
  let filtered=tasks.filter(t=>(q?matches(t,q):group==='all'||t.group===group));
  if(!q&&group==='all'&&!browseAll)filtered=filtered.filter(t=>common.includes(t.id)).sort((a,b)=>common.indexOf(a.id)-common.indexOf(b.id));
  else if(q)filtered=filtered.sort((a,b)=>{
    const f=t=> t.name.toLowerCase()===q.toLowerCase()?0:t.name.toLowerCase().startsWith(q.toLowerCase())?1:common.includes(t.id)?2:3;
    return f(a)-f(b)||a.name.localeCompare(b.name);
  });
  out.replaceChildren();filtered.forEach(t=>out.append(card(t)));
  by('noResults').hidden=filtered.length>0;
  by('count').textContent=filtered.length+' matching calculator '+(filtered.length===1?'topic':'topics');
  by('sectionHeading').textContent=q?'Search results':group==='all'?(browseAll?'All electrical calculations':'Common electrical calculations'):group;
  by('browseAll').hidden=!!q||group!=='all';
  by('browseAll').textContent=browseAll?'Show common jobs':'Browse every calculation';
}
input.addEventListener('input',()=>{
  if(input.value.trim())selectGroup('all');else render();
});
groups.forEach(b=>b.addEventListener('click',()=>{browseAll=false;input.value='';selectGroup(b.dataset.group);}));
document.querySelectorAll('[data-search]').forEach(b=>b.addEventListener('click',()=>{
  input.value=b.dataset.search;selectGroup('all');input.focus();
}));
by('browseAll').addEventListener('click',()=>{browseAll=!browseAll;render();});
clear.addEventListener('click',()=>{input.value='';browseAll=true;selectGroup('all');input.focus();});
const query=new URLSearchParams(location.search).get('q');
if(query)input.value=query.slice(0,120);
render();
})(window);