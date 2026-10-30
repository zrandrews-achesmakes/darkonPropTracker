const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const security=require('../docs/security.js');
const root=path.resolve(__dirname,'..');
const records=fs.readdirSync(path.join(root,'proposals')).filter(f=>f.endsWith('.json'))
  .map(file=>({file,p:JSON.parse(fs.readFileSync(path.join(root,'proposals',file),'utf8'))}));
const fixture=records.find(x=>x.p.status==='To Present').p;

test('all existing proposals satisfy the frontend contract',()=>{
  for(const {file,p} of records)assert.equal(security.validateProposal(p,file),p);
});
test('dangerous schemes, impersonating hosts, and credentials are rejected',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,test','https://evil.example/login',
    'https://docs.google.com.evil.example/document/d/id/edit',
    'https://user@docs.google.com/document/d/id/edit',
    'https://docs.google.com:444/document/d/id/edit','https://docs.google.com/document/d/id/edit\n']) {
    assert.equal(security.safeURL(url,'doc'),'');
  }
  assert.ok(security.safeURL(fixture.doc_url,'doc'));
});
test('prototype names, bad arrays, and impossible dates fail validation',()=>{
  for(const [key,value] of [['status','constructor'],['status','__proto__'],
    ['summary','bad'],['hidden','true'],['presented_at_senate','2026-02-30']]) {
    assert.throws(()=>security.validateProposal({...fixture,[key]:value},fixture.id+'.json'));
  }
});

async function appHarness(proposals) {
  const elements=new Map();
  const get=id=>{
    if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',hidden:false,disabled:false,value:'',
      handlers:{},addEventListener(event,fn){this.handlers[event]=fn;},
      querySelectorAll(){return [];},scrollIntoView(){},focus(){}});
    return elements.get(id);
  };
  const calls=[];
  const context={ProposalSecurity:security,document:{getElementById:get},console,
    AbortController,TextDecoder,Uint8Array,URL,setTimeout,clearTimeout,
    navigator:{clipboard:{writeText:async text=>{context.copied=text;}}},
    fetch:async url=>{
      calls.push(url);
      if(url.includes('/commits/'))return new Response(JSON.stringify({sha:'a'.repeat(40)}));
      if(url.includes('/git/trees/'))return new Response(JSON.stringify({tree:proposals.map(p=>({
        type:'blob',path:'proposals/'+p.id+'.json'}))}));
      const p=proposals.find(p=>url.endsWith('/'+p.id+'.json'));
      return new Response(JSON.stringify(p));
    }};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'docs/app.js'),'utf8'),context);
  for(let i=0;i<30&&!get('counts').textContent;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.ok(get('counts').textContent,'load completed');
  return {context,get,calls};
}
test('board loads real data and agenda contains current voting/discussion items',async()=>{
  const {context,get,calls}=await appHarness(records.map(x=>x.p));
  assert.match(get('counts').textContent,/11 proposals/);
  assert.equal(get('agenda-builder').disabled,false);
  assert.ok(get('board').innerHTML.includes(fixture.name));
  assert.ok(calls.filter(u=>u.includes('raw.githubusercontent')).every(u=>u.includes('/'+'a'.repeat(40)+'/')));
  get('agenda-date').value='2026-11-14';
  context.buildAgenda();
  assert.match(get('agenda-output').textContent,/November 14, 2026/);
  assert.ok(get('agenda-output').textContent.includes(fixture.name));
  await get('copy-agenda').handlers.click({currentTarget:get('copy-agenda')});
  assert.equal(context.copied,get('agenda-output').textContent);
});
test('bad records are isolated while valid proposals still render',async()=>{
  const bad={...fixture,id:'bad-record',status:'constructor'};
  const malicious={...fixture,id:'bad-link',doc_url:'https://evil.example/login'};
  const {get}=await appHarness([fixture,bad,malicious]);
  assert.match(get('counts').textContent,/1 proposals.*2 invalid\/unavailable/);
  assert.ok(get('board').innerHTML.includes(fixture.name));
  assert.ok(!get('board').innerHTML.includes('evil.example'));
});
test('proposal strings stay escaped in generated card markup',async()=>{
  const hostile={...fixture,name:'<img src=x onerror=alert(1)>',summary:['<script>alert(1)</script>']};
  const {get}=await appHarness([hostile]);
  assert.ok(!get('board').innerHTML.includes('<img'));
  assert.ok(get('board').innerHTML.includes('&lt;img'));
});
test('download size limit is enforced',async()=>{
  const {context}=await appHarness([fixture]);
  context.fetch=async()=>new Response('x'.repeat(101));
  await assert.rejects(()=>context.fetchJSON('https://example.invalid',100),/size limit/);
});
