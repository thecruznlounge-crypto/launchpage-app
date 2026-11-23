/* LaunchPage.link 2.0 — shell, router, public experience */
(function(){
const LP=window.LP, E=LP.esc, $=s=>document.querySelector(s);
const cfg=window.LP_CONFIG||{};
const STORE=cfg.storeName||'Hunnyhive', STORE_URL=cfg.storeUrl||'https://hunnyhive.app';
LP.routes={};
LP.view=null;

/* ---------- helpers ---------- */
LP.toast=msg=>{document.querySelectorAll('.toast').forEach(t=>t.remove());const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2800)};
LP.go=h=>{if(location.hash===h)LP.render();else location.hash=h};
LP.sheet=function(html,onMount){
  const bg=document.createElement('div');bg.className='sheet-bg';
  bg.innerHTML=`<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  const close=()=>{bg.remove();document.removeEventListener('keydown',esc);LP.lastFocus?.focus?.()};
  const esc=e=>{if(e.key==='Escape')close()};
  LP.lastFocus=document.activeElement;
  bg.addEventListener('click',e=>{if(e.target===bg||e.target.closest('[data-close]'))close()});
  document.addEventListener('keydown',esc);document.body.appendChild(bg);
  bg.querySelector('input,select,textarea,button')?.focus();
  onMount&&onMount(bg.querySelector('.sheet'),close);return close;
};
LP.fmtDate=d=>d?new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'';
LP.ago=d=>{const s=(Date.now()-new Date(d))/1000;if(s<60)return'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago'};
const pillFor=l=>{const t=LP.statusTone(l);return `<span class="pill ${t==='live'?'live':t==='beta'?'beta':'idea'}">${E(l.status)}</span>`};
LP.pillFor=pillFor;
const media=(l,opts)=>l.image?`<img src="${E(l.image)}" alt="${E(l.name)}" loading="lazy">`:launchArt(l,opts);
LP.media=media;

/* ---------- shell ---------- */
const PUBLIC_NAV=[['#/','home','Home'],['#/launches','rocket','Launches'],['#/ican','users','I Can'],['#/saved','bookmark','Saved'],['#/hq','grid','HQ']];
const STUDIO_NAV=[['#/studio','home','Home'],['#/studio/projects','folder','Projects'],['#/studio/new','plus','New',true],['#/studio/tools','layers','Tools'],['#/studio/clients','user','Clients']];
function navActive(href,hash){if(href==='#/')return hash==='#/'||hash==='';if(href==='#/studio')return hash==='#/studio';return hash===href||hash.startsWith(href+'/')||(href==='#/launches'&&hash.startsWith('#/launch/'))}
function renderShell(isStudio){
  const h=location.hash||'#/';
  const nav=isStudio?STUDIO_NAV:PUBLIC_NAV;
  $('#bottomNav').innerHTML=nav.map(([href,icon,label,fab])=>fab
    ?`<button class="nav-btn fab ${navActive(href,h)?'active':''}" data-go="${href}" aria-label="${label}"><span class="fabdot">${ic('plus')}</span>${label}</button>`
    :`<button class="nav-btn ${navActive(href,h)?'active':''}" data-go="${href}" ${navActive(href,h)?'aria-current="page"':''}>${ic(icon)}${label}</button>`).join('');
  const side=(items)=>items.map(([href,icon,label])=>`<button class="side-btn ${navActive(href,h)?'active':''}" data-go="${href}" title="${label}">${ic(icon)}<span class="lbl">${label}</span></button>`).join('');
  $('#sidebar').innerHTML=`<div class="row" style="padding:4px 6px 10px"><button class="brand" data-go="#/" aria-label="LaunchPage home"><span class="mark">${ic('rocket')}</span><span class="brand-txt">LaunchPage<em>.link</em><small>Who Can? I Can!</small></span></button></div>
    <div class="side-h">${ic('globe')}<span>Public</span></div>${side(PUBLIC_NAV)}
    <div class="side-h">${ic('lock')}<span>Studio · Private</span></div>${side(STUDIO_NAV.map(x=>x[0]==='#/studio'?['#/studio','home','Studio Home']:x))}
    <div style="flex:1"></div>
    <button class="side-btn ${LP.installReady()?'':'hidden'}" data-act="install">${ic('install')}<span class="lbl">Install app</span></button>
    <button class="side-btn" data-act="collapse" aria-label="Collapse sidebar">${ic('sidebar')}<span class="lbl">Collapse</span></button>`;
}
LP.topbar=function({title,back,studio}={}){
  const unseen=LP.publicUpdates().filter(u=>(u.publishAt||u.createdAt)>(LP.settings().seenUpdates||'')).length;
  const left=back?`<button class="icon-btn" data-act="back" aria-label="Back">${ic('back')}</button>`:`<button class="icon-btn menu-mobile" data-act="menu" aria-label="Menu">${ic('menu')}</button>`;
  const center=title?`<div class="title">${E(title)}</div>`:studio
    ?`<div class="grow row" style="justify-content:center"><button class="brand" data-go="#/studio"><span class="mark">${ic('rocket')}</span><span>LaunchPage <em>Studio</em><small>Project Production HQ</small></span></button></div>`
    :`<div class="grow row" style="justify-content:center"><button class="brand" data-go="#/" aria-label="LaunchPage home"><span class="mark">${ic('rocket')}</span><span>LaunchPage<em>.link</em></span></button></div>`;
  const right=`<button class="icon-btn ${LP.installReady()?'':'hidden'}" data-act="install" aria-label="Install app">${ic('install')}</button>`+
    (studio?`<button class="icon-btn" data-go="#/studio/settings" aria-label="Studio settings">${ic('user')}</button>`
    :`<button class="icon-btn" data-act="updates" aria-label="Launch announcements">${ic('bell')}${unseen?'<span class="badge"></span>':''}</button>`);
  return `<header class="topbar">${left}${center}${right}</header>`;
};

/* ---------- router ---------- */
LP.render=function(){
  const h=location.hash||'#/';
  const [path,qs]=h.slice(1).split('?');
  const parts=path.split('/').filter(Boolean);
  LP.query=new URLSearchParams(qs||'');
  const isStudio=parts[0]==='studio';
  let fn,arg;
  if(isStudio){fn=LP.routes['studio']; arg=parts.slice(1)}
  else if(!parts.length) fn=home;
  else if(parts[0]==='launches') fn=launches;
  else if(parts[0]==='launch'){fn=detail;arg=decodeURIComponent(parts[1]||'')}
  else if(parts[0]==='ican') fn=ican;
  else if(parts[0]==='saved') fn=saved;
  else if(parts[0]==='hq') fn=hq;
  else fn=notFound;
  renderShell(isStudio);
  const out=fn?fn(arg):notFound();
  const root=$('#app');
  root.innerHTML=`<div class="view">${out}</div>`;
  LP.afterRender&&LP.afterRender(root);LP.afterRender=null;
  if(LP._lastHash!==h){scrollTo(0,0);LP._lastHash=h;const hd=root.querySelector('h1,h2');if(hd&&document.activeElement===document.body){}}
  document.title=(LP.pageTitle?LP.pageTitle+' · ':'')+'LaunchPage.link — Who Can? I Can!';LP.pageTitle='';
};
window.addEventListener('hashchange',LP.render);
window.addEventListener('lp:data',()=>LP.render());

/* ---------- components ---------- */
function lrow(l,extra=''){
  const p=LP.progress(l),s=LP.isSaved(l.id);
  return `<div class="lrow" data-go="#/launch/${E(l.id)}" role="link" tabindex="0" aria-label="${E(l.name)}">
    <div class="thumb">${media(l,{w:236,h:152})}</div>
    <div class="grow"><div class="row between"><div class="nm">${E(l.name)}</div><button class="save-btn ${s?'on':''}" data-save="${E(l.id)}" aria-label="${s?'Unsave':'Save'} ${E(l.name)}" aria-pressed="${s}">${ic('bookmark')}</button></div>
      <div class="sub">${E(l.category)} · ${E(l.status)}</div>
      <div class="row" style="margin-top:8px"><div class="progress grow" aria-label="${p}% of approved milestones complete"><i style="width:${p}%"></i></div><span class="pct">${p}%</span></div>${extra}</div></div>`;
}
function lcard(l){
  const p=LP.progress(l),s=LP.isSaved(l.id);
  return `<article class="lcard" data-go="#/launch/${E(l.id)}" role="link" tabindex="0" aria-label="${E(l.name)}">
    <div class="cover">${media(l,{w:640,h:320})}${pillFor(l)}<button class="save-btn ${s?'on':''}" data-save="${E(l.id)}" aria-label="${s?'Unsave':'Save'} ${E(l.name)}" aria-pressed="${s}">${ic('bookmark')}</button></div>
    <div class="body"><div class="row between"><div class="nm">${E(l.name)}</div><span class="tag">${E(l.category)}</span></div>
    <p class="muted small" style="margin:0">${E(l.tagline)}</p>
    <div class="row xs muted between"><span>${p}% approved milestones</span><span>${ic('users')} ${LP.interest(l)}</span></div>
    <div class="progress"><i style="width:${p}%"></i></div></div></article>`;
}
LP.lrow=lrow;LP.lcard=lcard;
const secHead=(t,href,label='View All')=>`<div class="sec-head"><h2>${t}</h2>${href?`<button class="link-btn" data-go="${href}">${label} ${ic('arrow')}</button>`:''}</div>`;

/* ---------- Home ---------- */
function home(){
  const all=LP.publicLaunches();
  const cats=[...new Set(all.map(l=>l.category))];
  const ann=LP.publicUpdates().slice(0,3);
  const recent=[...all].filter(l=>l.updatedAt).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,4);
  const upcoming=all.filter(l=>l.targetDate).sort((a,b)=>a.targetDate.localeCompare(b.targetDate)).slice(0,4);
  const seeking=[...all].sort((a,b)=>b.roles.length-a.roles.length).slice(0,6);
  return LP.topbar()+`<main class="main">
  <section class="hero" aria-labelledby="h1">
    <svg class="hero-art" viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="hg"><stop offset="0" stop-color="#00E0E5" stop-opacity=".6"/><stop offset="1" stop-color="#00E0E5" stop-opacity="0"/></radialGradient></defs><circle cx="120" cy="80" r="80" fill="url(#hg)"/><g transform="translate(60 30) scale(5)" fill="none" stroke="#00E0E5" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></g></svg>
    <h1 id="h1">Who Can?<em>I Can!</em></h1>
    <p>Discover upcoming apps, brands, and digital experiences. Follow the journey, contribute, and be part of the launch.</p>
    <div class="actions"><button class="btn primary" data-go="#/launches">${ic('rocket')} Explore Launches</button><button class="btn ghost" data-go="#/studio/new">${ic('plusc')} Start a Project</button></div>
  </section>
  <form class="search sec" role="search" data-search><label class="sr" for="hs">Search launches</label>${ic('search')}<input id="hs" class="input" name="q" placeholder="Search launches, categories, roles…" autocomplete="off"></form>
  <div class="chips" style="margin-top:10px" role="list">${cats.map(c=>`<button class="chip" role="listitem" data-go="#/launches?cat=${encodeURIComponent(c)}">${E(c)}</button>`).join('')}</div>
  ${ann.length?`<section class="sec">${secHead('Launch Announcements')}<div class="stack">${ann.map(u=>{const l=LP.getLaunch(u.launchId);return l?`<div class="card click" data-go="#/launch/${E(l.id)}"><div class="row between"><span class="tag">${E(l.name)}</span><span class="xs muted">${LP.fmtDate(u.publishAt||u.createdAt)}</span></div><h3 style="margin-top:8px">${E(u.title)}</h3>${u.body?`<p class="muted small" style="margin:6px 0 0">${E(u.body)}</p>`:''}</div>`:''}).join('')}</div></section>`:''}
  <section class="sec">${secHead('Featured Launches','#/launches')}<div class="grid g2">${all.slice(0,6).map(l=>lrow(l)).join('')}</div></section>
  ${recent.length?`<section class="sec">${secHead('Recently Updated')}<div class="grid g2">${recent.map(l=>lrow(l)).join('')}</div></section>`:''}
  ${upcoming.length?`<section class="sec">${secHead('Upcoming Launches')}<div class="grid g2">${upcoming.map(l=>lrow(l,`<div class="xs muted" style="margin-top:4px">Target ${E(l.targetDate)}</div>`)).join('')}</div></section>`
   :all.length>6?`<section class="sec">${secHead('More Launches','#/launches')}<div class="grid g2">${all.slice(6,10).map(l=>lrow(l)).join('')}</div></section>`:''}
  <section class="sec">${secHead('Seeking Collaborators','#/ican','I Can Help')}
    <div class="grid g3">${seeking.map(l=>`<div class="card click" data-go="#/launch/${E(l.id)}"><div class="row between"><b>${E(l.name)}</b><span class="xs muted">${E(l.category)}</span></div><div class="row wrap" style="gap:6px;margin-top:10px">${l.roles.map(r=>`<span class="tag">${E(r)}</span>`).join('')}</div></div>`).join('')}</div></section>
  <section class="sec">${secHead('How LaunchPage works')}
    <div class="grid g3">
      <div class="card"><div class="row" style="color:var(--accent)">${ic('rocket')}<h3>1. List the launch</h3></div><p class="muted small">Post the concept, audience, milestones, and what kind of people are needed.</p></div>
      <div class="card"><div class="row" style="color:var(--accent)">${ic('radar')}<h3>2. Capture roles</h3></div><p class="muted small">People don't just join a waitlist. They say whether they're customers, partners, testers, suppliers, sponsors, or promoters.</p></div>
      <div class="card"><div class="row" style="color:var(--accent)">${ic('install')}<h3>3. Graduate to ${E(STORE)}</h3></div><p class="muted small">Once ready, the page changes from Join Waitlist to Install App and sends traffic to the live product on <a href="${E(STORE_URL)}" target="_blank" rel="noopener">${E(STORE_URL.replace(/^https?:\/\//,''))}</a>.</p></div>
    </div></section>
  </main>`;
}

/* ---------- Directory ---------- */
function launches(){
  LP.pageTitle='Launches';
  const q=(LP.query.get('q')||'').toLowerCase(), cat=LP.query.get('cat')||'all', sort=LP.query.get('sort')||'featured', st=LP.query.get('status')||'all';
  const all=LP.publicLaunches();
  const cats=[...new Set(all.map(l=>l.category))];
  let list=all.filter(l=>(cat==='all'||l.category===cat)&&(st==='all'||LP.statusTone(l)===st)&&(!q||[l.name,l.tagline,l.category,l.status,...l.roles].join(' ').toLowerCase().includes(q)));
  if(sort==='progress')list.sort((a,b)=>LP.progress(b)-LP.progress(a));
  if(sort==='interest')list.sort((a,b)=>LP.interest(b)-LP.interest(a));
  if(sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name));
  const qp=(k,v)=>{const p=new URLSearchParams(LP.query);if(v==null||v==='all'||v==='')p.delete(k);else p.set(k,v);const s=p.toString();return '#/launches'+(s?'?'+s:'')};
  LP.afterRender=root=>{const i=root.querySelector('#ls');if(q){i.focus();i.setSelectionRange(i.value.length,i.value.length)}};
  return LP.topbar({title:'Launch Directory'})+`<main class="main">
  <form class="search" role="search" data-search><label class="sr" for="ls">Search launches</label>${ic('search')}<input id="ls" class="input" name="q" value="${E(LP.query.get('q')||'')}" placeholder="Search ${all.length} launches…" autocomplete="off"></form>
  <div class="chips" style="margin-top:10px"><button class="chip ${cat==='all'?'on':''}" data-go="${qp('cat','all')}">All</button>${cats.map(c=>`<button class="chip ${cat===c?'on':''}" data-go="${qp('cat',c)}" aria-pressed="${cat===c}">${E(c)}</button>`).join('')}</div>
  <div class="row between wrap" style="margin:12px 0">
    <div class="chips">${[['all','Any status'],['beta','In build'],['idea','Validating'],['live','Live']].map(([v,t])=>`<button class="chip ${st===v?'on':''}" data-go="${qp('status',v)}">${t}</button>`).join('')}</div>
    <label class="row small muted">Sort <select data-sort style="min-height:40px;width:auto;padding:6px 10px">${[['featured','Featured'],['progress','Progress'],['interest','Most interest'],['name','A–Z']].map(([v,t])=>`<option value="${v}" ${sort===v?'selected':''}>${t}</option>`).join('')}</select></label>
  </div>
  <p class="xs muted" aria-live="polite">${list.length} launch${list.length===1?'':'es'}</p>
  ${list.length?`<div class="grid g3">${list.map(lcard).join('')}</div>`:`<div class="card empty">${ic('search')}<p>No launches match that search.</p><button class="btn ghost sm" data-go="#/launches">Clear filters</button></div>`}
  </main>`;
}

/* ---------- Detail ---------- */
function detail(id){
  const l=LP.getLaunch(id);
  if(!l) return notFound();
  LP.pageTitle=l.name;
  const p=LP.progress(l), ms=LP.publicMilestones(l), nowIdx=ms.findIndex(m=>!m.done);
  const updates=LP.publicUpdates(l.id), fol=LP.isFollowing(l.id), sv=LP.isSaved(l.id);
  const live=LP.statusTone(l)==='live'&&l.launchUrl;
  const hero=l.video?`<video src="${E(l.video)}" controls playsinline preload="metadata" poster="${E(l.image||'')}"></video>`:media(l,{w:960,h:540,big:true});
  return LP.topbar({title:'Launch Detail',back:true})+`<main class="main narrow">
  <div class="dhero">${hero}</div>
  <div class="row wrap" style="gap:6px;margin-top:12px"><span class="tag">${E(l.category)}</span>${pillFor(l)}${l.site?`<span class="tag">${ic('globe')} ${E(l.site)}</span>`:''}</div>
  <h1 style="font-size:32px;margin-top:10px">${E(l.name)}</h1>
  <div class="row" style="margin-top:10px"><div class="progress grow"><i style="width:${p}%"></i></div><b class="small">${p}% Complete</b></div>
  <p class="xs muted" style="margin:4px 0 0">Based on ${ms.length} owner-approved milestones · ${LP.interest(l)} people interested</p>
  <p style="margin:14px 0">${E(l.tagline)}</p>
  ${live?`<a class="btn primary block" href="${E(l.launchUrl)}" target="_blank" rel="noopener">${ic('install')} Open / Install ${E(l.name)}</a><div style="height:10px"></div>`:''}
  <div class="actbar">
    <button class="act ${fol?'on':''}" data-follow="${E(l.id)}" aria-pressed="${fol}">${ic('bell')}${fol?'Following':'Follow'}</button>
    <button class="act ${live?'':'hot'}" data-waitlist="${E(l.id)}">${ic('mail')}Join Waitlist</button>
    <button class="act" data-help="${E(l.id)}">${ic('hand')}I Can Help</button>
    <button class="act" data-share="${E(l.id)}">${ic('share')}Share</button>
  </div>
  <section class="sec card"><div class="sec-head"><h2>Project Roadmap</h2><button class="act ${sv?'on':''}" style="min-height:40px;flex-direction:row;padding:0 12px" data-save="${E(l.id)}" aria-pressed="${sv}">${ic('bookmark')} ${sv?'Saved':'Save'}</button></div>
    <div class="roadmap">${ms.map((m,i)=>`<div class="rm ${m.done?'done':i===nowIdx?'now':''}"><span class="dot">${m.done?ic('check'):''}</span><span class="t">${E(m.title)}</span><span class="s">${m.done?'Completed':i===nowIdx?'In progress':(m.targetDate?E(m.targetDate):'Upcoming')}</span></div>`).join('')}</div>
    ${l.targetDate?`<p class="small muted" style="margin:8px 0 0">${ic('clock')} Target launch: ${E(l.targetDate)}</p>`:''}
  </section>
  ${(l.screenshots||[]).length?`<section class="sec">${secHead('Screenshots')}<div class="chips">${l.screenshots.map(s=>`<img src="${E(s)}" alt="${E(l.name)} screenshot" loading="lazy" style="height:260px;border-radius:14px;border:1px solid var(--line)">`).join('')}</div></section>`:''}
  <section class="sec">${secHead('Announcements')}${updates.length?`<div class="card stack">${updates.map(u=>`<div class="update"><div class="row between"><b>${E(u.title)}</b><span class="xs muted">${LP.fmtDate(u.publishAt||u.createdAt)}</span></div>${u.body?`<p class="small muted" style="margin:4px 0 0">${E(u.body)}</p>`:''}${u.mediaUrl?(/\.(mp4|webm)$/i.test(u.mediaUrl)?`<video src="${E(u.mediaUrl)}" controls playsinline style="width:100%;border-radius:12px;margin-top:8px"></video>`:`<img src="${E(u.mediaUrl)}" alt="" loading="lazy" style="width:100%;border-radius:12px;margin-top:8px">`):''}</div>`).join('')}</div>`:`<div class="card small muted">No public updates yet. Follow ${E(l.name)} to get notified on this device when the owner posts one.</div>`}</section>
  <section class="sec card"><div class="row" style="color:var(--accent)">${ic('radar')}<h2>Opportunity Radar</h2></div>
    <p class="muted small">${E(l.name)} is looking for people who can help as:</p>
    <div class="row wrap" style="gap:6px">${l.roles.map(r=>`<button class="tag" data-help="${E(l.id)}" data-role="${E(r)}">${E(r)}</button>`).join('')}</div>
    <button class="btn primary block" style="margin-top:14px" data-help="${E(l.id)}">${ic('hand')} I Can Help With ${E(l.name)}</button>
  </section>
  </main>`;
}

/* ---------- Forms ---------- */
const consentBox=`<label class="check" style="align-items:flex-start"><input type="checkbox" name="consent" required> <span class="small">I agree to be contacted by the LaunchPage team about this launch. I can ask to delete my info anytime.</span></label>`;
function waitlistSheet(id){
  const l=LP.getLaunch(id);
  LP.sheet(`<div class="row between"><h2>Join the ${E(l.name)} waitlist</h2><button class="icon-btn" data-close aria-label="Close">✕</button></div>
  <form class="form" data-form="waitlist" data-launch="${E(l.id)}" novalidate style="margin-top:12px">
    <label class="f">Name<input class="input" name="name" autocomplete="name" required maxlength="80"></label>
    <label class="f">Email<input class="input" name="email" type="email" autocomplete="email" required maxlength="120"></label>
    ${consentBox}<p class="err-msg" aria-live="polite"></p>
    <button class="btn primary block">${ic('mail')} Join Waitlist</button></form>`);
}
function helpSheet(id,role){
  const l=LP.getLaunch(id), roles=[...new Set([...l.roles,'Beta Tester','Partner','Promoter','Marketing','Feedback'])];
  LP.sheet(`<div class="row between"><h2>I Can Help — ${E(l.name)}</h2><button class="icon-btn" data-close aria-label="Close">✕</button></div>
  <form class="form" data-form="help" data-launch="${E(l.id)}" novalidate style="margin-top:12px">
    <label class="f">Name<input class="input" name="name" autocomplete="name" required maxlength="80"></label>
    <label class="f">Email<input class="input" name="email" type="email" autocomplete="email" required maxlength="120"></label>
    <label class="f">I can help as<select name="role">${roles.map(r=>`<option ${r===role?'selected':''}>${E(r)}</option>`).join('')}</select></label>
    <label class="f">What can you bring? <textarea name="note" maxlength="1000" placeholder="Skills, experience, availability…"></textarea></label>
    ${consentBox}<p class="err-msg" aria-live="polite"></p>
    <button class="btn primary block">${ic('hand')} Send to ${E(l.name)}</button></form>`);
}
async function submitForm(form){
  const fd=new FormData(form), kind=form.dataset.form, err=form.querySelector('.err-msg');
  const name=String(fd.get('name')||'').trim(), email=String(fd.get('email')||'').trim();
  err.textContent='';
  if(!name) return err.textContent='Please enter your name.';
  if(!LP.validEmail(email)) return err.textContent='Please enter a valid email address.';
  if(!fd.get('consent')) return err.textContent='Please confirm you agree to be contacted.';
  const rec={kind,name,email,consent:true};
  if(kind==='waitlist'||kind==='help'){rec.launch=form.dataset.launch;rec.role=fd.get('role')||(kind==='waitlist'?'Waitlist':'');rec.note=fd.get('note')||''}
  if(kind==='founders'){rec.phone=fd.get('phone')||'';rec.launches=fd.getAll('launches');rec.roles=fd.getAll('roles');rec.note=fd.get('note')||'';if(!rec.launches.length&&!rec.roles.length)return err.textContent='Pick at least one launch or role.'}
  const btn=form.querySelector('button.primary');btn.disabled=true;
  const r=await LP.addSignup(rec);btn.disabled=false;
  form.closest('.sheet-bg')?.remove();
  LP.toast(r.duplicate?"You're already on this list.":kind==='waitlist'?"You're on the waitlist!":kind==='help'?'Thanks! Your offer was sent to the project owner.':'Welcome to the Founders Club!');
  if(kind==='founders'){form.reset();LP.render()}else if(location.hash.startsWith('#/launch/'))LP.render();
}

/* ---------- I Can (Opportunity Radar + Founders Club) ---------- */
function ican(){
  LP.pageTitle='I Can Help';
  const all=LP.publicLaunches();
  const mine=LP.db.list('signups');
  return LP.topbar({title:'I Can Help'})+`<main class="main">
  <section class="hero" style="padding-bottom:22px"><h1 style="font-size:clamp(36px,9vw,56px)">I Can <em style="display:inline">Help</em></h1><p>Join the LaunchPage Founders Club. Pick the projects, interests, and roles that fit you — owners see exactly what you can bring.</p></section>
  <section class="split sec">
  <form class="card form" data-form="founders" novalidate>
    <h2>Collective Founders Club</h2>
    <div class="grid g2"><label class="f">Name<input class="input" name="name" autocomplete="name" required maxlength="80"></label><label class="f">Email<input class="input" name="email" type="email" autocomplete="email" required maxlength="120"></label></div>
    <label class="f">Phone (optional)<input class="input" name="phone" type="tel" autocomplete="tel" maxlength="30"></label>
    <fieldset style="border:0;padding:0;margin:0"><legend class="f muted small" style="font-weight:600;margin-bottom:6px">I'm interested in</legend><div class="checkgrid">${all.map(l=>`<label class="check"><input type="checkbox" name="launches" value="${E(l.id)}"> ${E(l.name)}</label>`).join('')}</div></fieldset>
    <fieldset style="border:0;padding:0;margin:0"><legend class="f muted small" style="font-weight:600;margin-bottom:6px">I can help as</legend><div class="checkgrid">${HELP_ROLES.map(r=>`<label class="check"><input type="checkbox" name="roles" value="${E(r)}"> ${E(r)}</label>`).join('')}</div></fieldset>
    <label class="f">Anything specific you want to help with?<textarea name="note" maxlength="1000"></textarea></label>
    ${consentBox}<p class="err-msg" aria-live="polite"></p>
    <button class="btn primary block">${ic('users')} Join Founders Club</button>
  </form>
  <aside class="stack">
    <div class="card"><h2>Founder Badges</h2><div class="roadmap" style="margin-top:8px">${[['Explorer','joins LaunchPage'],['Pioneer','follows 3 launches'],['Builder','submits feedback'],['Founder','refers 25 users'],['Legend','refers 100 users']].map(([b,d])=>`<div class="rm"><span class="dot" style="border-color:var(--accent2)">${ic('star')}</span><span class="t">${b}</span><span class="s">${d}</span></div>`).join('')}</div></div>
    <div class="card"><h3>Opportunity Radar</h3><p class="small muted">Prefer one project? Offer help directly:</p><div class="stack" style="gap:6px">${all.slice(0,8).map(l=>`<button class="btn ghost sm" style="justify-content:space-between" data-help="${E(l.id)}">${E(l.name)} <span class="xs muted">${E(l.roles.slice(0,2).join(' · '))}</span></button>`).join('')}<button class="link-btn" data-go="#/launches">All launches ${ic('arrow')}</button></div></div>
    <div class="card"><h3>Your submissions</h3>${mine.length?`<p class="xs muted">Stored on this device${LP.remote.enabled?' and sent securely to LaunchPage':''}.</p>${mine.slice(-6).reverse().map(s=>`<div class="li"><div class="grow small"><b>${E(s.kind==='founders'?'Founders Club':s.kind==='waitlist'?'Waitlist':'I Can Help')}</b>${s.launch?' · '+E(LP.getLaunch(s.launch)?.name||s.launch):''}<div class="xs muted">${E(s.email)} · ${LP.fmtDate(s.createdAt)}</div></div><button class="icon-btn" data-del-sig="${E(s.id)}" aria-label="Delete this submission">${ic('trash')}</button></div>`).join('')}`:'<p class="small muted">Nothing yet.</p>'}</div>
  </aside></section></main>`;
}

/* ---------- Saved ---------- */
function saved(){
  LP.pageTitle='Saved';
  const all=LP.publicLaunches({listedOnly:false});
  const sv=all.filter(l=>LP.isSaved(l.id)), fo=all.filter(l=>LP.isFollowing(l.id)&&!LP.isSaved(l.id));
  return LP.topbar({title:'Saved'})+`<main class="main">
  ${sv.length?`<div class="grid g2">${sv.map(l=>lrow(l)).join('')}</div>`:`<div class="card empty">${ic('bookmark')}<h3>No saved launches yet</h3><p>Tap the bookmark on any launch to keep it here.</p><button class="btn primary sm" data-go="#/launches">Browse launches</button></div>`}
  ${fo.length?`<section class="sec">${secHead('Following')}<div class="grid g2">${fo.map(l=>lrow(l)).join('')}</div></section>`:''}
  <p class="xs muted" style="margin-top:16px">Saved and followed launches live on this device.</p></main>`;
}

/* ---------- HQ (public traction) ---------- */
function hq(){
  LP.pageTitle='HQ';
  const all=LP.publicLaunches();
  const total=all.reduce((a,l)=>a+LP.interest(l),0), sig=LP.db.list('signups').length;
  const top=[...all].sort((a,b)=>LP.interest(b)-LP.interest(a)).slice(0,6), max=LP.interest(top[0]||{})||1;
  return LP.topbar({title:'LaunchPage HQ'})+`<main class="main">
  <div class="seg" role="tablist"><button class="on" role="tab" aria-selected="true">${ic('eye')} Public View</button><button role="tab" data-go="#/studio">${ic('laptop')} My Studio</button></div>
  <div class="stats sec"><div class="stat"><b>${total}</b><span>Total interest</span></div><div class="stat"><b>${sig}</b><span>Signups (this device)</span></div><div class="stat"><b>${all.length}</b><span>Launches</span></div><div class="stat"><b>${LP.db.list('saved').length}</b><span>Saved</span></div></div>
  <section class="sec">${secHead('Momentum')}<p class="small muted" style="margin-top:-6px">Use this to decide which products deserve the next development sprint.</p>
  <div class="card">${top.map(l=>`<div class="li click" data-go="#/launch/${E(l.id)}" style="cursor:pointer"><div class="grow"><div class="row between"><b>${E(l.name)}</b><b>${LP.interest(l)}</b></div><div class="progress" style="margin:6px 0"><i style="width:${Math.round(LP.interest(l)/max*100)}%"></i></div><div class="xs muted">${E(l.roles.join(' · '))}</div></div></div>`).join('')}</div></section>
  <section class="sec card"><div class="row" style="color:var(--accent)">${ic('lock')}<h2>LaunchPage Studio</h2></div><p class="small muted">The private production workspace: projects, audits, client records, milestone publishing and PWA export. Signed-in operators only.</p><button class="btn primary" data-go="#/studio">${ic('laptop')} Open Studio</button></section>
  </main>`;
}
function notFound(){return LP.topbar({title:'Not found',back:true})+`<main class="main"><div class="card empty">${ic('alert')}<h3>That page isn't available</h3><p>It may be private or no longer published.</p><button class="btn primary sm" data-go="#/">Go home</button></div></main>`}

/* ---------- menus & sheets ---------- */
function menuSheet(){
  LP.sheet(`<div class="row between"><h2>LaunchPage</h2><button class="icon-btn" data-close aria-label="Close">✕</button></div>
  <div class="side-h small muted" style="margin-top:10px">PUBLIC</div>
  <div class="stack" style="gap:6px">${PUBLIC_NAV.map(([h,i,t])=>`<button class="btn ghost" style="justify-content:flex-start" data-go="${h}" data-close>${ic(i)} ${t}</button>`).join('')}</div>
  <div class="side-h small muted" style="margin-top:14px">STUDIO · PRIVATE</div>
  <div class="stack" style="gap:6px">${STUDIO_NAV.map(([h,i,t])=>`<button class="btn ghost" style="justify-content:flex-start" data-go="${h}" data-close>${ic(i)} ${t==='Home'?'Studio Home':t}</button>`).join('')}</div>
  <div style="height:12px"></div>
  ${LP.installReady()?`<button class="btn primary block" data-act="install" data-close>${ic('install')} Install LaunchPage</button>`:''}
  <p class="xs muted" style="text-align:center;margin-top:12px">Who Can? I Can! · v2.0 · ${LP.remote.enabled?'Cloud mode':'Local mode'}</p>`);
}
function updatesSheet(){
  const u=LP.publicUpdates().slice(0,20);
  LP.setSettings({seenUpdates:LP.now()});
  LP.sheet(`<div class="row between"><h2>Launch Announcements</h2><button class="icon-btn" data-close aria-label="Close">✕</button></div>
  ${u.length?u.map(x=>{const l=LP.getLaunch(x.launchId);return l?`<div class="li" style="cursor:pointer" data-go="#/launch/${E(l.id)}" data-close><div class="avatar">${E(l.name[0])}</div><div class="grow"><b>${E(x.title)}</b><div class="xs muted">${E(l.name)} · ${LP.fmtDate(x.publishAt||x.createdAt)}</div></div></div>`:''}).join(''):`<div class="empty">${ic('bell')}<p>No announcements yet. Owners publish updates from Studio.</p></div>`}`);
  renderBadge();
}
function renderBadge(){document.querySelectorAll('[data-act="updates"] .badge').forEach(b=>b.remove())}

/* ---------- install (one tap) ---------- */
let deferred=null;
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
LP.installReady=()=>!isStandalone()&&(!!deferred||isIOS());
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;LP.render()});
window.addEventListener('appinstalled',()=>{deferred=null;LP.toast('LaunchPage installed');LP.render()});
async function install(){
  if(deferred){deferred.prompt();const c=await deferred.userChoice;deferred=null;if(c.outcome==='accepted')LP.toast('Installing…');LP.render();return}
  if(isIOS()) return LP.sheet(`<div class="row between"><h2>Add to Home Screen</h2><button class="icon-btn" data-close aria-label="Close">✕</button></div><p class="muted">iPhone and iPad don't offer one-tap install. In Safari:</p><ol class="small"><li>Tap the <b>Share</b> button.</li><li>Choose <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>.</li></ol>`);
  LP.toast(isStandalone()?'Already installed':'Install is available from your browser menu');
}

/* ---------- share ---------- */
async function share(id){
  const l=LP.getLaunch(id), url=location.origin+location.pathname+'#/launch/'+id;
  const data={title:l.name+' on LaunchPage',text:l.tagline,url};
  try{if(navigator.share){await navigator.share(data);return}await navigator.clipboard.writeText(url);LP.toast('Link copied')}catch(e){if(e.name!=='AbortError'){prompt('Copy this link:',url)}}
}

/* ---------- global events ---------- */
document.addEventListener('click',e=>{
  const t=e.target.closest('button,[data-go],a');if(!t)return;
  if(t.dataset.save){e.stopPropagation();const on=LP.toggleSave(t.dataset.save);LP.toast(on?'Saved':'Removed from saved');LP.render();return}
  if(t.dataset.follow){const on=LP.toggleFollow(t.dataset.follow);LP.toast(on?'Following — you\'ll see new announcements in the bell':'Unfollowed');LP.render();return}
  if(t.dataset.waitlist){e.stopPropagation();return waitlistSheet(t.dataset.waitlist)}
  if(t.dataset.help){e.stopPropagation();return helpSheet(t.dataset.help,t.dataset.role)}
  if(t.dataset.share){return share(t.dataset.share)}
  if(t.dataset.delSig){if(confirm('Delete this submission from this device?')){LP.db.set('signups',LP.db.list('signups').filter(s=>s.id!==t.dataset.delSig));LP.toast(LP.remote.enabled?'Deleted here. To remove it from our servers, email the LaunchPage team.':'Deleted');LP.render()}return}
  const a=t.dataset.act;
  if(a==='back'){history.length>1?history.back():LP.go('#/');return}
  if(a==='menu')return menuSheet();
  if(a==='updates')return updatesSheet();
  if(a==='install')return install();
  if(a==='collapse'){document.querySelector('.shell').classList.toggle('collapsed');LP.setSettings({collapsed:document.querySelector('.shell').classList.contains('collapsed')});return}
  if(t.dataset.go){e.preventDefault();LP.go(t.dataset.go)}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[role="link"][data-go]'))LP.go(e.target.dataset.go)});
document.addEventListener('submit',e=>{
  const f=e.target;
  if(f.matches('[data-search]')){e.preventDefault();const q=new FormData(f).get('q');LP.go('#/launches'+(q?'?q='+encodeURIComponent(q):''));return}
  if(f.dataset.form&&['waitlist','help','founders'].includes(f.dataset.form)){e.preventDefault();submitForm(f)}
});
let st;document.addEventListener('input',e=>{if(e.target.id==='ls'){clearTimeout(st);st=setTimeout(()=>{const p=new URLSearchParams(LP.query);const v=e.target.value.trim();v?p.set('q',v):p.delete('q');const s=p.toString();history.replaceState(null,'','#/launches'+(s?'?'+s:''));LP.render()},250)}});
document.addEventListener('change',e=>{if(e.target.matches('[data-sort]')){const p=new URLSearchParams(LP.query);p.set('sort',e.target.value);LP.go('#/launches?'+p)}});

/* ---------- boot ---------- */
if(LP.settings().collapsed)document.querySelector('.shell').classList.add('collapsed');
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
addEventListener('online',()=>LP.remote.enabled&&LP.remote.init().then(()=>LP.remote.flushPending()));
LP.boot=()=>{LP.render();LP.remote.init()};
})();
