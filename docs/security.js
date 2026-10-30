/* Shared proposal contract: also enforced by pipeline/skills/validation.py. */
(function(root) {
  'use strict';
  const STATUSES=['To Present','Up for Vote','Passed Senate/Playtest','Passed BOD',
    'Recorded on #passed-and-pending','Withdraw/Fail'];
  const RESULTS=['passed_senate','failed_senate','passed_bod','failed_bod','withdrawn'];
  const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const MAX_FILE_BYTES=131072, MAX_PROPOSALS=200;
  const text=(s,n=8000)=>typeof s==='string'&&s.length<=n;
  function safeURL(value,kind) {
    if(!text(value,2048)||/[\s\\<>]/.test(value)) return '';
    try {
      const u=new URL(value);
      if(u.protocol!=='https:'||u.username||u.password||u.port) return '';
      const valid=kind==='doc'
        ? u.hostname==='docs.google.com'&&/^\/document\/d\/[A-Za-z0-9_-]+(?:\/(?:edit|view|preview))?\/?$/.test(u.pathname)
        : kind==='discord'
        ? u.hostname==='discord.com'&&/^\/channels\/766364534495117383\/1286801164326797385\/[0-9]+$/.test(u.pathname)
        : u.hostname==='github.com'&&/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/[0-9]+$/.test(u.pathname);
      return valid?u.href:'';
    } catch { return ''; }
  }
  function validateProposal(p,filename) {
    const require=(ok,message)=>{if(!ok)throw new Error(message);};
    require(p!==null&&typeof p==='object'&&!Array.isArray(p),'proposal must be an object');
    require(text(p.id,100)&&SLUG.test(p.id)&&filename===p.id+'.json','invalid proposal id');
    require(text(p.name,300)&&p.name.trim().length>0&&text(p.author,300),'invalid name or author');
    require(STATUSES.includes(p.status),'invalid status');
    for(const [key,count,limit] of [['summary',5,8000],['line_items',50,2000],
      ['easypoll_blocks',50,32000],['vote_result',5,30]]) {
      require(Array.isArray(p[key])&&p[key].length<=count&&p[key].every(s=>text(s,limit)),'invalid '+key);
    }
    require(p.vote_result.every(r=>RESULTS.includes(r)),'invalid vote result');
    for(const key of ['notes','posted_by','posted_by_username']) {
      require(p[key]==null||text(p[key]),'invalid '+key);
    }
    for(const [key,kind] of [['doc_url','doc'],['discord_post_url','discord'],['github_issue_url','issue']]) {
      require(p[key]==null||Boolean(safeURL(p[key],kind)),'invalid '+key);
    }
    for(const key of ['presented_at_senate','voted_at_senate']) {
      if(p[key]!=null) {
        require(typeof p[key]==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p[key]),'invalid '+key);
        const d=new Date(p[key]+'T12:00:00Z');
        require(!Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===p[key],'invalid '+key);
      }
    }
    require(p.hidden===undefined||typeof p.hidden==='boolean','invalid hidden flag');
    return p;
  }
  const api={STATUSES,SLUG,MAX_FILE_BYTES,MAX_PROPOSALS,safeURL,validateProposal};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.ProposalSecurity=api;
})(typeof window==='undefined'?globalThis:window);

