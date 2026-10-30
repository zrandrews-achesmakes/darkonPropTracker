'use strict';
const OWNER='zrandrews-achesmakes', REPO='darkonPropTracker', BRANCH='main';
const {safeURL,validateProposal,MAX_FILE_BYTES,MAX_PROPOSALS}=ProposalSecurity;
const rawUrl=(p,sha)=>`https://raw.githubusercontent.com/${OWNER}/${REPO}/${sha}/${p}`;

const COLUMNS=[
  ['to present','To Present','var(--new)'],
  ['up for vote','Up for Vote','var(--presented)'],
  ['passed senate/playtest','Passed Senate/Playtest','var(--voted)'],
  ['passed bod','Passed BOD','var(--scheduled)'],
  ['recorded on #passed-and-pending','Recorded on #passed-and-pending','var(--passed)'],
  ['withdraw/fail','Withdraw/Fail','var(--canceled)']
];

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate=d=>{ if(!d) return ''; const t=new Date(d.length<=10?d+'T12:00:00Z':d);
  return isNaN(t)?esc(d):t.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); };

async function copyText(btn,text){
  try{ await navigator.clipboard.writeText(text); }
  catch(e){
    const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta);
    ta.select(); try{document.execCommand('copy');}catch(_){} ta.remove();
  }
  const old=btn.textContent; btn.textContent='Copied ✓';
  setTimeout(()=>btn.textContent=old,1400);
}

function cardHTML(p){
  const colColor=(COLUMNS.find(c=>c[0]===(p.status||'').toLowerCase())||['','', 'var(--muted)'])[2];
  const poster = p.posted_by && p.posted_by!==p.author
    ? `<div>Posted by: ${esc(p.posted_by_username||p.posted_by)}</div>` : '';
  const summary=(p.summary||[]).map(s=>`<li>${esc(s)}</li>`).join('');
  const chips=(p.line_items||[]).map(l=>`<span class="chip">${esc(l)}</span>`).join('');
  const polls=(p.easypoll_blocks||[]).map((b,i)=>`
    <div class="poll"><pre>${esc(b)}</pre>
    <button type="button" class="copy" data-id="${esc(p.id)}" data-i="${i}">Copy poll block</button></div>`).join('');
  const links=[
    p.discord_post_url?`<a href="${esc(safeURL(p.discord_post_url,'discord'))}" target="_blank" rel="noopener noreferrer">Discord post</a>`:'',
    p.doc_url?`<a href="${esc(safeURL(p.doc_url,'doc'))}" target="_blank" rel="noopener noreferrer">Proposal doc</a>`:''
  ].filter(Boolean).join('');
  const dates=[
    p.presented_at_senate?`Presented: ${fmtDate(p.presented_at_senate)}`:'',
    p.voted_at_senate?`Voted: ${fmtDate(p.voted_at_senate)}`:'',
    (Array.isArray(p.vote_result)?p.vote_result:(p.vote_result&&p.vote_result!=='unknown'?[p.vote_result]:[])).length?`Result: ${esc((Array.isArray(p.vote_result)?p.vote_result:[p.vote_result]).join(', '))}`:''
  ].filter(Boolean).join(' · ');
  return `<article class="card">
    <span class="pill" style="background:${colColor}">${esc(p.status||'To Present')}</span>
    <h3>${esc(p.name||p.id)}</h3>
    <div class="meta"><div>Author: ${esc(p.author||'—')}</div>${poster}</div>
    ${summary?`<ul class="summary">${summary}</ul>`:''}
    ${chips?`<div class="chips">${chips}</div>`:''}
    ${links?`<div class="links">${links}</div>`:''}
    ${polls?`<details><summary>EasyPoll blocks (${p.easypoll_blocks.length}) — copy into Discord</summary>${polls}</details>`:''}
    ${p.notes?`<div class="notes">${esc(p.notes)}</div>`:''}
    ${dates?`<div class="foot">${dates}</div>`:''}
  </article>`;
}


async function fetchJSON(url,limit) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try {
    const response=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
    if(!response.ok)throw new Error('request failed ('+response.status+')');
    if(Number(response.headers.get('content-length'))>limit)throw new Error('response exceeds size limit');
    const reader=response.body.getReader(), chunks=[];
    let size=0;
    while(true) {
      const {value,done}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>limit){await reader.cancel();throw new Error('response exceeds size limit');}
      chunks.push(value);
    }
    const bytes=new Uint8Array(size);
    let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  }finally{clearTimeout(timer);}
}
async function mapLimited(items,limit,fn) {
  const results=new Array(items.length);
  let next=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(next<items.length){const i=next++;results[i]=await fn(items[i],i);}
  }));
  return results;
}

async function load(){
  document.getElementById('agenda-builder').disabled=true;
  document.getElementById('agenda-panel').hidden=true;
  const board=document.getElementById('board');
  board.innerHTML='<div class="status-msg">Loading proposals from the tracker repo…</div>';
  try{
    const api='https://api.github.com/repos/'+OWNER+'/'+REPO;
    const commit=await fetchJSON(api+'/commits/'+BRANCH,1048576);
    if(!/^[a-f0-9]{40}$/.test(commit.sha))throw new Error('invalid repository revision');
    const tree=await fetchJSON(api+'/git/trees/'+commit.sha+'?recursive=1',1048576);
    if(!Array.isArray(tree.tree)||tree.truncated)throw new Error('incomplete proposal list');
    const files=tree.tree.filter(n=>n.type==='blob'&&/^proposals\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(n.path))
      .map(n=>n.path).sort();
    if(files.length>MAX_PROPOSALS)throw new Error('too many proposal files');
    const records=await mapLimited(files,6,async f=>{
      try {
        const p=validateProposal(await fetchJSON(rawUrl(f,commit.sha),MAX_FILE_BYTES),f.slice(10));
        return {p};
      }catch(error){return {error};}
    });
    const ids=new Set(), proposals=[];
    let rejected=0;
    for(const record of records) {
      if(record.error||ids.has(record.p.id)){rejected++;continue;}
      ids.add(record.p.id);
      if(record.p.hidden!==true)proposals.push(record.p);
    }

    const buckets=Object.create(null); COLUMNS.forEach(c=>buckets[c[0]]=[]);
    const extra=[];
    proposals.forEach(p=>{
      const s=(p.status||'To Present').toLowerCase();
      if(buckets[s]) buckets[s].push(p);
      else { let b=extra.find(e=>e.key===s); if(!b){b={key:s,list:[]};extra.push(b);} b.list.push(p); }
    });
    const cols=[...COLUMNS.map(c=>({key:c[0],label:c[1],color:c[2],list:buckets[c[0]]})),
                ...extra.map(e=>({key:e.key,label:e.key,color:'var(--muted)',list:e.list}))];

    board.innerHTML=cols.map(c=>`
      <section class="col"><div class="col-head">
        <span class="col-title" style="color:${c.color}">${esc(c.label)}</span>
        <span class="count">${c.list.length}</span></div>
        <div class="cards" data-col="${esc(c.key)}">
          ${c.list.map(cardHTML).join('')||'<div class="status-msg" style="padding:16px">—</div>'}
        </div></section>`).join('');

    board.querySelectorAll('.copy').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const card=btn.closest('.card'); const idx=+btn.dataset.i;
        const p=current.find(x=>x.id===btn.dataset.id);
        if(p&&p.easypoll_blocks[idx]) copyText(btn,p.easypoll_blocks[idx]);
      });
    });
    current=proposals;
    document.getElementById('agenda-builder').disabled=false;
    const now=new Date();
    document.getElementById('updated').textContent='Updated '+now.toLocaleTimeString();
    document.getElementById('counts').textContent=proposals.length+' proposals · '+files.length+' files'+(rejected?' · '+rejected+' invalid/unavailable record(s) omitted':'');
  }catch(err){
    board.innerHTML=`<div class="status-msg error">Couldn’t reach the tracker repo (${esc(err.message)}).<br>
      <button type="button" id="retry" style="margin-top:12px">Try again</button></div>`;
    document.getElementById('retry').addEventListener('click',load);
  }
}
function localToday(){
  const t=new Date();
  const mm=String(t.getMonth()+1).padStart(2,'0');
  const dd=String(t.getDate()).padStart(2,'0');
  return `${t.getFullYear()}-${mm}-${dd}`;
}
function openAgendaBuilder(){
  const input=document.getElementById('agenda-date');
  input.value=localToday();
  const panel=document.getElementById('agenda-panel');
  panel.hidden=false;
  panel.scrollIntoView({behavior:'smooth',block:'start'});
  input.focus();
  try{ input.showPicker(); }catch(e){ /* calendar opens on click where showPicker is unsupported */ }
}
function buildAgenda(){
  const dateText=document.getElementById('agenda-date').value.trim();
  const date=new Date(`${dateText}T12:00:00Z`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dateText) ||
     Number.isNaN(date.getTime()) ||
     date.toISOString().slice(0,10)!==dateText){
    alert('Pick a valid date.');
    return;
  }

  const formattedDate=date.toLocaleDateString('en-US',{
    year:'numeric',month:'long',day:'numeric',timeZone:'UTC'
  });
  const formatProposal=p=>[
    `### ${p.name||p.id}`,
    `**Author:** *${p.author||'—'}*`,
    `**Link to Proposal:** ${safeURL(p.doc_url,'doc') ? `<${safeURL(p.doc_url,'doc')}>` : '—'}`
  ].join('\n');
  const section=list=>list.length
    ? list.map(formatProposal).join('\n\n')
    : '*None*';
  const votes=current.filter(p=>(p.status||'').toLowerCase()==='up for vote');
  const discussion=current.filter(p=>(p.status||'').toLowerCase()==='to present');

  const agenda=[
    `# Senate Date: ${formattedDate}`,
    '',
    '---',
    '',
    '## Proposals for Vote',
    '',
    section(votes),
    '',
    '---',
    '',
    '## Proposals for Discussion',
    '',
    section(discussion),
    '',
    '---'
  ].join('\n');

  document.getElementById('agenda-output').textContent=agenda;
  const panel=document.getElementById('agenda-panel');
  panel.hidden=false;
  panel.scrollIntoView({behavior:'smooth',block:'start'});
}
let current=[];
document.getElementById('refresh').addEventListener('click',load);
document.getElementById('agenda-builder').addEventListener('click',openAgendaBuilder);
document.getElementById('build-agenda').addEventListener('click',buildAgenda);
document.getElementById('copy-agenda').addEventListener('click',e=>{
  copyText(e.currentTarget,document.getElementById('agenda-output').textContent);
});
document.getElementById('close-agenda').addEventListener('click',()=>{
  document.getElementById('agenda-panel').hidden=true;
});
load();

