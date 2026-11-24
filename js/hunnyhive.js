/* LaunchPage Studio → Hunnyhive: send a finished project to the store's submission queue.
   Uses the store's own API (POST /api/submit.php), which runs Hunnyhive's install check and
   queues the app for review in MasterDash. Nothing is listed until it is approved there. */
(function(){
const LP=window.LP, E=LP.esc, cfg=window.LP_CONFIG||{};
const HH=(cfg.storeUrl||'https://hunnyhive.app').replace(/\/$/,''), STORE=cfg.storeName||'Hunnyhive';
const HH_CATS=['Games','Social','Travel','Entertainment','Business','Productivity','Marketplace','Education','Lifestyle','Sports','Events & Photo'];
const MAP={Transportation:'Travel',Travel:'Travel',Delivery:'Marketplace',Social:'Social',Productivity:'Productivity',Education:'Education',Feedback:'Business',
  Shopping:'Marketplace',Commerce:'Marketplace',Media:'Events & Photo',Income:'Business',Gaming:'Games',Games:'Games',Entertainment:'Entertainment',
  Promotion:'Business',Wellness:'Lifestyle',Health:'Lifestyle',Fitness:'Lifestyle',Lifestyle:'Lifestyle',Sports:'Sports',Business:'Business',Marketplace:'Marketplace'};
LP.hhCategory=c=>HH_CATS.includes(c)?c:(MAP[c]||'');
const launchOf=p=>p.launchId&&LP.allLaunches().find(x=>x.id===p.launchId);
const appUrl=p=>{const l=launchOf(p);const u=(l&&l.launchUrl&&!l.launchUrl.startsWith(HH))?l.launchUrl:p.url;return u||''};
const hostOf=u=>{try{return new URL(u).host.toLowerCase()}catch{return ''}};
const save=(p,patch)=>{p.hunnyhive={...(p.hunnyhive||{}),...patch};LP.db.upsert('projects',p)};

function blockers(p){
  const b=[];
  if(!/^https:\/\//i.test(appUrl(p)))b.push('The finished app’s https:// address (Overview → Website URL)');
  if(!['ready','launched'].includes(p.stage))b.push('Stage set to Ready to Launch or Launched');
  if(p.clientId&&!p.deploy?.approved)b.push('Client’s approval to publish recorded in Deployment above');
  return b;
}
async function findListing(p){
  try{
    const j=await (await fetch(HH+'/apps.json',{cache:'no-store'})).json();
    const h=p.hunnyhive||{}, host=hostOf(appUrl(p));
    return (j.apps||[]).find(a=>(h.slug&&a.slug===h.slug)||(host&&[a.url,a.installUrl,a.domain].some(x=>/^https:/i.test(x||'')&&hostOf(x)===host)))||null;
  }catch{return undefined}   // offline / store unreachable
}
const checkList=checks=>(checks||[]).map(c=>`<div class="li" style="padding:7px 0"><span class="pill ${c.level==='pass'?'live':c.level==='warn'?'warn':'err'}" style="min-width:54px;justify-content:center">${c.level==='pass'?'Pass':c.level==='warn'?'Tip':'Fix'}</span><div class="grow small"><b>${E(c.label)}</b>${c.required?'':' <span class="xs muted">(optional)</span>'}${c.msg?`<div class="xs muted">${E(c.msg)}</div>`:''}</div></div>`).join('');

LP.hunnyhiveCard=function(p){
  const h=p.hunnyhive||{}, bl=blockers(p);
  const head=`<div class="row between"><div class="row" style="gap:8px"><img src="img/hunnyhive-mark.svg" alt="" class="hh-mark"><h3>${E(STORE)} store</h3></div>${
    h.status==='live'?'<span class="pill live">Live</span>':h.status==='submitted'?'<span class="pill warn">In review</span>':h.status==='opened'?'<span class="pill warn">Finish on Hunnyhive</span>':'<span class="pill mute">Not sent</span>'}</div>`;
  let body;
  if(h.status==='live') body=`<p class="small muted">Listed as <b>${E(h.slug)}</b>. Installs go through the store's one-tap install.</p>
    <div class="row wrap"><a class="btn ghost sm" href="${E(HH)}/apps/${E(h.slug)}" target="_blank" rel="noopener">${ic('external')} View listing</a>
    ${launchOf(p)&&launchOf(p).launchUrl!==HH+'/apps/'+h.slug?`<button class="btn primary sm" data-hh="uselisting" data-id="${E(p.id)}">${ic('link')} Make it the public launch link</button>`:''}</div>`;
  else if(h.status==='submitted') body=`<p class="small muted">Sent ${LP.fmtDate(h.at)} · submission <span class="kbd">${E(h.id)}</span>. Approve it in MasterDash to list it. The store ${h.pass?'<b style="color:var(--ok)">passed</b>':'<b style="color:var(--warn)">flagged</b>'} its install check${h.pass?'':' — it would list as Preview until fixed'}.</p>
    <details><summary class="small" style="cursor:pointer">Store check results</summary>${checkList(h.checks)}</details>
    <div class="row wrap" style="margin-top:8px"><button class="btn ghost sm" data-hh="status" data-id="${E(p.id)}">${ic('search')} Check if it's live</button><button class="btn ghost sm" data-hh="send" data-id="${E(p.id)}">Send again</button></div>`;
  else if(bl.length) body=`<p class="small muted">Send this project to ${E(STORE)} once it's finished. Still needed:</p><ul class="small" style="margin:6px 0 0;padding-left:18px">${bl.map(x=>`<li>${E(x)}</li>`).join('')}</ul>`;
  else body=`<p class="small muted">Submits <span class="kbd">${E(appUrl(p))}</span> to the store. ${E(STORE)} runs its install check and holds it for your approval in MasterDash — nothing goes public until you approve.</p>
    <button class="btn primary" data-hh="send" data-id="${E(p.id)}">${ic('rocket')} Send to ${E(STORE)}</button>
    ${h.status==='opened'?`<button class="btn ghost sm" style="margin-left:6px" data-hh="status" data-id="${E(p.id)}">Check if it's live</button>`:''}`;
  return `<div class="card sec">${head}<div style="margin-top:10px">${body}</div></div>`;
};

function sendSheet(p){
  const l=launchOf(p), s=LP.settings(), cl=p.clientId&&LP.db.find('clients',p.clientId);
  const cat=LP.hhCategory(l?.category||p.category||'');
  LP.sheet(`<div class="row between"><div class="row" style="gap:10px"><img src="img/hunnyhive-mark.svg" alt="" class="hh-mark lg"><h2>Send to ${E(STORE)}</h2></div><button class="icon-btn" data-close aria-label="Close">✕</button></div>
  <form class="form" data-hhform="${E(p.id)}" novalidate style="margin-top:12px">
    <label class="f">App address<input class="input" name="url" type="url" value="${E(appUrl(p))}" required></label>
    <label class="f">Name<input class="input" name="name" value="${E(l?.name||p.name)}" maxlength="80"></label>
    <label class="f">One-line description<input class="input" name="tagline" value="${E(((l?.tagline||p.tagline)||'').slice(0,140))}" maxlength="140"></label>
    <div class="grid g2"><label class="f">Developer or brand<input class="input" name="developer" value="${E(cl?.company||s.hhDeveloper||'')}" maxlength="80" placeholder="Shown on the listing"></label>
    <label class="f">Category<select name="category"><option value="">Let Hunnyhive pick</option>${HH_CATS.map(c=>`<option ${c===cat?'selected':''}>${E(c)}</option>`).join('')}</select></label></div>
    <label class="f">Contact email (for the store review)<input class="input" name="email" type="email" value="${E(s.hhEmail||LP.remote.user?.email||'')}" required autocomplete="email"></label>
    <p class="err-msg" aria-live="polite"></p><div data-hhresult></div>
    <button class="btn primary block">${ic('rocket')} Submit for review</button></form>`);
}
async function submit(form){
  const p=LP.db.find('projects',form.dataset.hhform), fd=new FormData(form), err=form.querySelector('.err-msg'), out=form.querySelector('[data-hhresult]'), btn=form.querySelector('button.primary');
  const data={url:String(fd.get('url')||'').trim(),email:String(fd.get('email')||'').trim(),name:String(fd.get('name')||'').trim(),tagline:String(fd.get('tagline')||'').trim(),developer:String(fd.get('developer')||'').trim(),category:fd.get('category')||'',source:'launchpage'};
  err.textContent='';
  if(!/^https:\/\//i.test(data.url))return err.textContent='The store only accepts https:// addresses.';
  if(!LP.validEmail(data.email))return err.textContent='Enter a contact email for the store review.';
  if(!navigator.onLine)return err.textContent='You’re offline — sending needs a connection.';
  LP.setSettings({hhEmail:data.email,hhDeveloper:p.clientId?LP.settings().hhDeveloper:data.developer});
  btn.disabled=true;btn.textContent='Running the store’s install check…';
  let j;
  try{ j=await (await fetch(HH+'/api/submit.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).json(); }
  catch(e){
    // Store didn't accept a call from this site (older store version) — hand off to its submit page, pre-filled.
    const q=new URLSearchParams(data).toString();
    save(p,{status:'opened',at:LP.now(),url:data.url});
    LP.log(`Opened ${STORE} submission for ${p.name}`,p.id);
    btn.style.display='none';
    out.innerHTML=`<div class="note">${ic('info')} ${E(STORE)} couldn’t be reached directly from here, so finish on its submit page — everything is filled in.</div>
      <a class="btn primary block" style="margin-top:10px" href="${E(HH)}/submit/?${E(q)}" target="_blank" rel="noopener">${ic('external')} Open ${E(STORE)} submit page</a>`;
    return;
  }
  btn.disabled=false;btn.innerHTML=`${ic('rocket')} Submit for review`;
  if(!j||!j.ok)return err.textContent=(j&&j.error)||'The store rejected the submission.';
  save(p,{status:'submitted',id:j.id,pass:!!j.pass,checks:j.checks,at:LP.now(),url:data.url,slug:(j.id||'').split('-').slice(2).join('-')||LP.slug(data.name)});
  LP.log(`Sent ${p.name} to ${STORE} (${j.pass?'passed':'flagged by'} install check)`,p.id);
  if(p.clientId){const c=LP.db.find('clients',p.clientId);if(c){c.log=[{type:'Delivery',text:`Submitted to ${STORE} for listing (${j.id})`,projectId:p.id,at:LP.now()},...(c.log||[])];LP.db.upsert('clients',c)}}
  btn.style.display='none';
  out.innerHTML=`<div class="note">${ic('check')} Sent. ${j.pass?'It passed the store’s install check.':'The store flagged some items below — it would list as Preview until they’re fixed.'} Approve it in MasterDash to go live.</div>${checkList(j.checks)}`;
  LP.render();
}
async function status(p,btn){
  btn.disabled=true;const a=await findListing(p);btn.disabled=false;
  if(a===undefined)return LP.toast(`Couldn't reach ${STORE} — try again when online`);
  if(!a)return LP.toast(`Not listed yet — approve it in MasterDash`);
  save(p,{status:'live',slug:a.slug,listedAt:LP.now()});LP.log(`${p.name} is live on ${STORE} as ${a.slug}`,p.id);LP.toast(`Live on ${STORE}`);LP.render();
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-hh]');if(!b)return;
  const p=LP.db.find('projects',b.dataset.id);if(!p)return;
  const a=b.dataset.hh;
  if(a==='send')return sendSheet(p);
  if(a==='status')return status(p,b);
  if(a==='uselisting'){const l=launchOf(p);LP.setOverride(l.id,{launchUrl:HH+'/apps/'+p.hunnyhive.slug,status:'Live',tone:'live'});LP.log(`${p.name} public page now links to its ${STORE} listing`,p.id);LP.toast('Public page now says Open / Install');LP.render()}
});
document.addEventListener('submit',e=>{if(e.target.dataset.hhform){e.preventDefault();submit(e.target)}});
})();
