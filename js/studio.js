/* LaunchPage Studio — private production workspace */
(function(){
const LP=window.LP,E=LP.esc;
const STAGES=[['intake','Intake'],['audit','Audit'],['design','Design'],['review','In Review'],['build','Build'],['test','Testing'],['ready','Ready to Launch'],['launched','Launched']];
const stageLabel=s=>(STAGES.find(x=>x[0]===s)||[,s])[1];
const TYPES=['Website','PWA','App concept','Launch page'];
const VIS=[['private','Private','Only Studio operators can see it'],['page','Public launch page','Reachable by link, not listed in the directory'],['discoverable','Publicly discoverable','Listed in the directory and search']];
const UPDATE_TYPES=[['update','Development update'],['milestone','Milestone'],['feature','Feature announcement'],['screenshot','Screenshot'],['video','Video'],['launch-date','Launch date'],['beta','Beta invitation'],['testing','Testing opportunity']];
const DEFAULT_MS=['Planning & Scope','Platform Design','Development','Testing & Onboarding','Official Launch'];
const projects=()=>LP.db.list('projects'), clients=()=>LP.db.list('clients');
const projPct=p=>{const m=p.milestones||[];return m.length?Math.round(m.filter(x=>x.done).length/m.length*100):0};
const sessKey='lp2_studio_unlocked';
const head=(t,href,label='View All')=>`<div class="sec-head"><h2>${t}</h2>${href?`<button class="link-btn" data-go="${href}">${label} ${ic('arrow')}</button>`:''}</div>`;
const field=(label,inner)=>`<label class="f">${label}${inner}</label>`;
async function sha(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('lp-studio:'+s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}

/* ---------- access gate ---------- */
function gate(){
  if(LP.remote.enabled){
    if(!LP.remote.client) {LP.remote.init().then(()=>LP.render());return `<div class="card empty">${ic('lock')}<p>Connecting to LaunchPage Cloud…</p>${navigator.onLine?'':'<p class="small">You are offline. Studio needs a connection in Cloud mode.</p>'}</div>`}
    if(!LP.remote.user) return `<div class="card pad-lg" style="max-width:440px;margin:20px auto"><div class="row" style="color:var(--accent)">${ic('lock')}<h2>Studio sign in</h2></div><p class="small muted">Operators only. We'll email you a secure sign-in link.</p><form class="form" data-sform="signin"><input class="input" type="email" name="email" placeholder="you@company.com" required autocomplete="email"><p class="err-msg" aria-live="polite"></p><button class="btn primary block">Email me a sign-in link</button></form></div>`;
    if(!LP.remote.isOperator()) return `<div class="card empty">${ic('lock')}<h3>No Studio access</h3><p>Your account (${E(LP.remote.user.email)}) isn't an operator. Ask an admin to grant the operator role.</p><button class="btn ghost sm" data-sact="signout">Sign out</button></div>`;
    return null;
  }
  const s=LP.settings();
  if(!s.pinHash) return `<div class="card pad-lg" style="max-width:460px;margin:20px auto"><div class="row" style="color:var(--accent)">${ic('lock')}<h2>Set up Studio on this device</h2></div>
    <div class="note warn" style="margin:12px 0">${ic('info')} Local mode: Studio data is stored only in this browser on this device. Connect Supabase (see SETUP.md) for real accounts, cross-device sync and secure client access.</div>
    <form class="form" data-sform="setpin" novalidate><label class="f">Your name<input class="input" name="name" required maxlength="40" autocomplete="name"></label><label class="f">Create a Studio PIN (4–8 digits)<input class="input" name="pin" inputmode="numeric" pattern="[0-9]{4,8}" required autocomplete="new-password" type="password"></label><p class="err-msg" aria-live="polite"></p><button class="btn primary block">Create Studio</button></form></div>`;
  if(sessionStorage.getItem(sessKey)!==s.pinHash) return `<div class="card pad-lg" style="max-width:400px;margin:20px auto"><div class="row" style="color:var(--accent)">${ic('lock')}<h2>Unlock Studio</h2></div><form class="form" data-sform="unlock" style="margin-top:12px"><input class="input" name="pin" inputmode="numeric" type="password" placeholder="Studio PIN" required autocomplete="current-password"><p class="err-msg" aria-live="polite"></p><button class="btn primary block">Unlock</button></form></div>`;
  return null;
}

/* ---------- router ---------- */
LP.routes.studio=function(parts){
  const g=gate();
  if(g){LP.pageTitle='Studio';return LP.topbar({studio:true})+`<main class="main">${g}</main>`}
  const [a,b,c]=parts;
  if(!a) return dash();
  if(a==='projects'&&b) return project(b,c||'overview');
  if(a==='projects') return projList();
  if(a==='new') return newProject();
  if(a==='tools') return tools(b);
  if(a==='clients'&&b) return clientView(b);
  if(a==='clients') return clientList();
  if(a==='settings') return settings();
  return LP.topbar({studio:true})+`<main class="main"><div class="card empty">Not found</div></main>`;
};

/* ---------- dashboard ---------- */
function dash(){
  LP.pageTitle='Studio';
  const ps=projects(), name=LP.settings().operatorName||'there';
  const by=s=>ps.filter(p=>p.stage===s);
  const audits=LP.db.list('audits');
  const pendingAudits=ps.filter(p=>p.kind==='transform'&&!audits.some(a=>a.projectId===p.id));
  const failed=audits.filter(a=>a.error);
  const act=LP.db.list('activity').slice(0,8);
  const active=ps.filter(p=>p.stage!=='launched');
  return LP.topbar({studio:true})+`<main class="main">
  <div class="seg"><button class="on" aria-selected="true">${ic('laptop')} My Studio</button><button data-go="#/hq">${ic('eye')} Public View</button></div>
  <div class="row sec"><div class="avatar" style="width:52px;height:52px;font-size:20px">${E(name[0].toUpperCase())}</div><div><h2 style="font-size:22px">Hey ${E(name)},</h2><div class="muted">Here's what's in motion.</div></div></div>
  <div class="stats sec">
    <button class="stat" data-go="#/studio/projects"><b>${ps.length}</b><span>Projects</span></button>
    <button class="stat" data-go="#/studio/tools/audit"><b>${pendingAudits.length}</b><span>Audits pending</span></button>
    <button class="stat" data-go="#/studio/projects?stage=review"><b>${by('review').length}</b><span>In Review</span></button>
    <button class="stat" data-go="#/studio/projects?stage=ready"><b>${by('ready').length}</b><span>Ready to Launch</span></button>
  </div>
  ${failed.length?`<div class="note warn sec">${ic('alert')} ${failed.length} audit job${failed.length>1?'s':''} failed and need attention. <button class="link-btn" data-go="#/studio/tools/audit">Review</button></div>`:''}
  <section class="sec">${head('Active Projects','#/studio/projects')}
  ${active.length?`<div class="grid g2">${active.slice(0,6).map(projRow).join('')}</div>`:`<div class="card empty">${ic('folder')}<p>No projects yet.</p><button class="btn primary sm" data-go="#/studio/new">${ic('plus')} New project</button></div>`}</section>
  <section class="sec">${head('Studio Workflow')}
  <div class="grid g4" style="grid-template-columns:repeat(4,1fr)">${[['search','Audit Sites','#/studio/tools/audit'],['sparkle','Redesign with AI','#/studio/tools/redesign'],['code','Build & Test','#/studio/projects?stage=build'],['cloud','Deploy & Launch','#/studio/tools/pwa']].map(([i,t,h])=>`<button class="act" data-go="${h}">${ic(i)}<span style="text-align:center">${t}</span></button>`).join('')}</div></section>
  <div class="grid g2 sec">
    <div class="card"><h3>Pipeline</h3>${STAGES.map(([s,l])=>`<div class="li" style="padding:8px 0;cursor:pointer" data-go="#/studio/projects?stage=${s}"><span class="grow small">${l}</span><b>${by(s).length}</b></div>`).join('')}</div>
    <div class="card"><div class="row between"><h3>Recent Activity</h3><span class="xs muted">${clients().length} clients</span></div>${act.length?act.map(x=>`<div class="li" style="padding:8px 0"><span class="grow small">${E(x.text)}</span><span class="xs muted">${LP.ago(x.at)}</span></div>`).join(''):'<p class="small muted">Nothing yet.</p>'}</div>
  </div></main>`;
}
function projRow(p){
  const pct=projPct(p), l=p.launchId&&LP.allLaunches().find(x=>x.id===p.launchId);
  return `<div class="lrow" data-go="#/studio/projects/${E(p.id)}" role="link" tabindex="0">
    ${LP.logo(l||{id:p.id,name:p.name,logo:p.logo},'row')}
    <div class="grow"><div class="row between"><div class="nm" style="font-size:16px">${E(p.name)}</div><span class="pill ${p.stage==='ready'?'live':p.stage==='review'?'warn':'mute'}">${stageLabel(p.stage)}</span></div>
    <div class="sub">${E(p.type)}${p.kind==='transform'?' · Redesign':''} · ${p.visibility==='private'?'Private':p.visibility==='page'?'Public page':'Discoverable'}</div>
    <div class="row" style="margin-top:7px"><div class="progress grow"><i style="width:${pct}%"></i></div><span class="pct">${pct}%</span></div></div></div>`;
}

/* ---------- project list ---------- */
function projList(){
  LP.pageTitle='Projects';
  const st=LP.query.get('stage')||'all', q=(LP.query.get('q')||'').toLowerCase();
  const list=projects().filter(p=>(st==='all'||p.stage===st)&&(!q||(p.name+' '+(p.url||'')).toLowerCase().includes(q)));
  return LP.topbar({title:'Projects',studio:true})+`<main class="main">
  <div class="row"><form class="search grow" data-sform="psearch">${ic('search')}<input class="input" name="q" value="${E(LP.query.get('q')||'')}" placeholder="Search projects"></form><button class="btn primary" data-go="#/studio/new">${ic('plus')}<span class="sr">New project</span></button></div>
  <div class="chips" style="margin:10px 0"><button class="chip ${st==='all'?'on':''}" data-go="#/studio/projects">All</button>${STAGES.map(([s,l])=>`<button class="chip ${st===s?'on':''}" data-go="#/studio/projects?stage=${s}">${l}</button>`).join('')}</div>
  ${list.length?`<div class="grid g2">${list.map(projRow).join('')}</div>`:`<div class="card empty">${ic('folder')}<p>No projects here.</p><button class="btn primary sm" data-go="#/studio/new">New project</button></div>`}</main>`;
}

/* ---------- new project ---------- */
function newProject(){
  LP.pageTitle='New Project';
  const mode=LP.query.get('mode')||'create';
  const seeded=LP.allLaunches().filter(l=>!projects().some(p=>p.launchId===l.id));
  return LP.topbar({title:'New Project',studio:true})+`<main class="main narrow">
  <div class="seg"><button class="${mode==='create'?'on':''}" data-go="#/studio/new">${ic('plusc')} Create New</button><button class="${mode==='transform'?'on':''}" data-go="#/studio/new?mode=transform">${ic('wrench')} Transform Existing</button></div>
  <form class="card form sec" data-sform="newproject" data-mode="${mode}" novalidate>
    ${mode==='transform'?field('Existing website URL',`<input class="input" name="url" type="url" inputmode="url" placeholder="https://example.com" required>`)+`<p class="xs muted" style="margin:-4px 0 0">We'll queue an audit. Audits run on the LaunchPage audit worker — nothing is scored until a real scan completes.</p>`:''}
    ${field('Project name',`<input class="input" name="name" required maxlength="60">`)}
    <div class="grid g2">${field('Type',`<select name="type">${TYPES.map(t=>`<option>${t}</option>`).join('')}</select>`)}${field('Category',`<input class="input" name="category" placeholder="e.g. Wellness" maxlength="30">`)}</div>
    ${field('One-line description',`<input class="input" name="tagline" maxlength="140">`)}
    ${field('Client',`<select name="clientId"><option value="">— No client (internal) —</option>${clients().map(c=>`<option value="${E(c.id)}">${E(c.name)}</option>`).join('')}</select>`)}
    ${mode==='create'?field('Link to an existing LaunchPage launch (optional)',`<select name="launchId"><option value="">— Create a new launch record —</option>${seeded.map(l=>`<option value="${E(l.id)}">${E(l.name)}</option>`).join('')}</select>`):''}
    <fieldset style="border:0;padding:0;margin:0"><legend class="f muted small" style="font-weight:600;margin-bottom:6px">Visibility</legend>
    <div class="stack" style="gap:8px">${VIS.map(([v,t,d],i)=>`<label class="check"><input type="radio" name="visibility" value="${v}" ${i===0?'checked':''}><span><b>${t}</b><br><span class="xs muted">${d}</span></span></label>`).join('')}</div></fieldset>
    ${field('Roles you\'re looking for (comma separated, public)',`<input class="input" name="roles" placeholder="Beta Testers, Partners">`)}
    <p class="err-msg" aria-live="polite"></p>
    <button class="btn primary block">${ic('rocket')} Create project</button>
  </form></main>`;
}
function createProject(f){
  const fd=new FormData(f), err=f.querySelector('.err-msg'), mode=f.dataset.mode;
  const name=String(fd.get('name')||'').trim(); let url=String(fd.get('url')||'').trim();
  if(!name) return err.textContent='Give the project a name.';
  if(mode==='transform'){
    if(url&&!/^https?:\/\//i.test(url)) url='https://'+url;
    try{const u=new URL(url);if(!/^https?:$/.test(u.protocol)||!u.hostname.includes('.'))throw 0;url=u.href}catch{return err.textContent='Enter a valid website URL, like https://example.com'}
  }
  const vis=fd.get('visibility'), linkId=fd.get('launchId');
  const roles=String(fd.get('roles')||'').split(',').map(s=>s.trim()).filter(Boolean);
  const p={id:LP.uid('prj'),name,kind:mode,type:fd.get('type'),category:String(fd.get('category')||'').trim()||'General',tagline:String(fd.get('tagline')||'').trim(),url:mode==='transform'?url:'',clientId:fd.get('clientId')||'',visibility:vis,stage:mode==='transform'?'audit':'intake',notes:'',createdAt:LP.now(),deploy:{approved:false,target:'',checklist:{}}};
  if(linkId){const l=LP.allLaunches().find(x=>x.id===linkId);p.launchId=linkId;p.milestones=l.milestones.map(m=>({...m}));p.visibility=l.visibility}
  else{p.milestones=DEFAULT_MS.map(t=>({id:LP.uid('ms'),title:t,done:false,approved:false,published:false}))}
  if(!linkId&&vis!=='private'){
    let id=LP.slug(name)||p.id;if(LP.allLaunches().some(l=>l.id===id))id=id+'-'+Date.now().toString(36).slice(-4);
    p.launchId=id;
    LP.saveCustomLaunch({id,name,category:p.category,status:'Planning',tone:'idea',tagline:p.tagline||name,site:url?new URL(url).hostname:'',interest:0,roles:roles.length?roles:['Beta Testers','Feedback'],milestones:p.milestones,visibility:vis,source:'studio',updatedAt:LP.now()});
  }else if(linkId&&roles.length){LP.setOverride(linkId,{roles})}
  LP.db.upsert('projects',p);LP.log(`Created ${p.kind==='transform'?'redesign':'project'} “${name}”`,p.id);
  LP.toast('Project created');LP.go('#/studio/projects/'+p.id);
}

/* ---------- project detail ---------- */
function syncLaunch(p){ if(p.launchId) LP.setOverride(p.launchId,{milestones:p.milestones,visibility:p.visibility}) }
function project(id,tab){
  const p=LP.db.find('projects',id); if(!p) return LP.topbar({title:'Project',studio:true,back:true})+`<main class="main"><div class="card empty">Project not found.</div></main>`;
  LP.pageTitle=p.name;
  const l=p.launchId&&LP.allLaunches().find(x=>x.id===p.launchId), cl=p.clientId&&LP.db.find('clients',p.clientId);
  const audit=LP.db.list('audits').filter(a=>a.projectId===p.id).sort((a,b)=>(b.importedAt||'').localeCompare(a.importedAt||''))[0];
  const tabs=[['overview','Overview'],['milestones','Milestones'],['updates','Public Updates'],['audit',`Findings${audit?` (${audit.issues.length})`:''}`],['redesign','Redesign'],['deploy','Deploy']];
  const body={overview,milestones,updates,audit:auditTab,redesign:redesignTab,deploy}[tab]||overview;
  return LP.topbar({title:'Project',studio:true,back:true})+`<main class="main">
  <div class="card row" style="gap:14px">${LP.logo(l||{id:p.id,name:p.name,logo:p.logo},'xl')}
    <div class="grow"><h2>${E(p.name)}</h2>${p.url?`<a class="small" href="${E(p.url)}" target="_blank" rel="noopener noreferrer">${E(p.url.replace(/^https?:\/\//,''))}</a>`:`<div class="small muted">${E(p.type)}</div>`}
    <div class="row wrap" style="gap:6px;margin-top:6px"><span class="pill mute">${stageLabel(p.stage)}</span>${cl?`<span class="tag">${ic('user')} ${E(cl.name)}</span>`:''}${audit?`<span class="pill ${audit.error?'err':'live'}">${audit.error?'Audit failed':'Audit imported'}</span>`:p.kind==='transform'?'<span class="pill warn">Audit pending</span>':''}</div></div>
    <div style="text-align:center"><b style="font-size:24px">${projPct(p)}%</b><div class="xs muted">milestones</div></div></div>
  <div class="tabs sec" role="tablist">${tabs.map(([t,n])=>`<button role="tab" class="${tab===t?'on':''}" aria-selected="${tab===t}" data-go="#/studio/projects/${E(p.id)}/${t}">${n}</button>`).join('')}</div>
  <div class="sec">${body(p,l,audit)}</div></main>`;
}
function overview(p,l){
  return `<form class="card form" data-sform="overview" data-id="${E(p.id)}">
    <div class="grid g2">${field('Name',`<input class="input" name="name" value="${E(p.name)}" required>`)}${field('Stage',`<select name="stage">${STAGES.map(([s,t])=>`<option value="${s}" ${p.stage===s?'selected':''}>${t}</option>`).join('')}</select>`)}</div>
    <div class="grid g2">${field('Type',`<select name="type">${TYPES.map(t=>`<option ${p.type===t?'selected':''}>${t}</option>`).join('')}</select>`)}${field('Client',`<select name="clientId"><option value="">— None —</option>${clients().map(c=>`<option value="${E(c.id)}" ${p.clientId===c.id?'selected':''}>${E(c.name)}</option>`).join('')}</select>`)}</div>
    ${field('Website URL',`<input class="input" name="url" type="url" value="${E(p.url||'')}" placeholder="https://">`)}
    ${field('Visibility',`<select name="visibility">${VIS.map(([v,t])=>`<option value="${v}" ${p.visibility===v?'selected':''}>${t}</option>`).join('')}</select>`)}
    ${field(`Private notes ${ic('lock')}`,`<textarea name="notes" placeholder="Never shown publicly">${E(p.notes||'')}</textarea>`)}
    <button class="btn primary">Save changes</button></form>
  ${l?`<div class="card sec"><div class="row between"><div><h3>Public launch page</h3><p class="small muted" style="margin:4px 0 0">${l.visibility==='private'?'Hidden — project is private.':`<span class="kbd">#/launch/${E(l.id)}</span> · ${LP.progress(l)}% public progress`}</p></div>${l.visibility!=='private'?`<button class="btn ghost sm" data-go="#/launch/${E(l.id)}">${ic('eye')} View</button>`:''}</div>
    <form class="form" data-sform="launchinfo" data-id="${E(l.id)}" style="margin-top:12px">
      <div class="grid g2">${field('Public status',`<input class="input" name="status" value="${E(l.status)}">`)}${field('Target launch date',`<input class="input" name="targetDate" type="date" value="${E(l.targetDate||'')}">`)}</div>
      ${field('Public tagline',`<input class="input" name="tagline" value="${E(l.tagline)}">`)}
      ${field('Roles wanted (comma separated)',`<input class="input" name="roles" value="${E(l.roles.join(', '))}">`)}
      <div class="row" style="gap:12px">${LP.logo(l,'lg')}<div class="grow">${field('App logo (square PNG/JPG/SVG, shown everywhere on LaunchPage)',`<input class="input" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" data-logo-upload="${E(l.id)}">`)}<p class="xs muted" style="margin:4px 0 0">${l.logo?`Custom logo set · <button type="button" class="link-btn" style="min-height:0;padding:0" data-logo-clear="${E(l.id)}">use ${LP.hhListing(l)?'Hunnyhive icon':'initials'} instead</button>`:LP.hhListing(l)?'Using its Hunnyhive icon.':'No logo yet — showing initials. Sending it to Hunnyhive also adds its store icon.'}</p></div></div>
      <div class="grid g2">${field('Hero image URL',`<input class="input" name="image" type="url" value="${E(l.image||'')}" placeholder="https://…/hero.jpg">`)}${field('Hero video URL (approved)',`<input class="input" name="video" type="url" value="${E(l.video||'')}" placeholder="https://…/promo.mp4">`)}</div>
      ${field('Screenshot URLs (one per line)',`<textarea name="screenshots">${E((l.screenshots||[]).join('\n'))}</textarea>`)}
      ${field('Final launch link (shown when status is Live)',`<input class="input" name="launchUrl" type="url" value="${E(l.launchUrl||'')}" placeholder="https://hunnyhive.app/…">`)}
      <button class="btn ghost">Save public info</button></form></div>`:''}
  <button class="btn danger sec" data-sact="delproject" data-id="${E(p.id)}">${ic('trash')} Delete project</button>`;
}
function milestones(p){
  return `<div class="card"><p class="small muted" style="margin-top:0">Public progress only counts milestones that are <b>approved</b> and <b>published</b>. Nothing is estimated.</p>
  <table class="t"><thead><tr><th>Milestone</th><th>Done</th><th>Approved</th><th>Public</th><th></th></tr></thead><tbody>
  ${(p.milestones||[]).map((m,i)=>`<tr><td><b>${E(m.title)}</b>${m.targetDate?`<div class="xs muted">${E(m.targetDate)}</div>`:''}</td>
    ${['done','approved','published'].map(k=>`<td><input type="checkbox" aria-label="${k}" data-ms="${E(p.id)}" data-i="${i}" data-k="${k}" ${m[k]?'checked':''} ${k==='published'&&!m.approved?'disabled title="Approve first"':''} style="width:20px;height:20px;accent-color:var(--accent)"></td>`).join('')}
    <td class="row" style="gap:2px"><button class="icon-btn" data-msmove="${i}" data-dir="-1" data-id="${E(p.id)}" aria-label="Move up" ${i===0?'disabled':''}>↑</button><button class="icon-btn" data-msdel="${i}" data-id="${E(p.id)}" aria-label="Delete milestone">${ic('trash')}</button></td></tr>`).join('')}
  </tbody></table>
  <form class="row sec" data-sform="addms" data-id="${E(p.id)}" style="flex-wrap:wrap"><input class="input grow" name="title" placeholder="New milestone" required style="min-width:180px"><input class="input" name="targetDate" type="date" style="width:auto" aria-label="Target date"><button class="btn primary">${ic('plus')} Add</button></form></div>`;
}
function updates(p,l){
  if(!l) return `<div class="card empty">${ic('lock')}<p>This project is private. Change visibility in Overview to publish progress.</p></div>`;
  const ups=LP.db.list('updates').filter(u=>u.launchId===l.id);
  return `<form class="card form" data-sform="update" data-launch="${E(l.id)}">
    <h3>New public update</h3>
    <div class="grid g2">${field('Type',`<select name="type">${UPDATE_TYPES.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select>`)}${field('State',`<select name="state"><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option></select>`)}</div>
    ${field('Title',`<input class="input" name="title" required maxlength="100">`)}
    ${field('Details',`<textarea name="body" maxlength="1500"></textarea>`)}
    <div class="grid g2">${field('Image / video URL (optional)',`<input class="input" name="mediaUrl" type="url">`)}${field('Publish at (for Scheduled)',`<input class="input" name="publishAt" type="datetime-local">`)}</div>
    <p class="err-msg" aria-live="polite"></p><button class="btn primary">Save update</button></form>
  <div class="card sec">${ups.length?ups.map(u=>`<div class="li"><div class="grow"><b>${E(u.title)}</b><div class="xs muted">${E((UPDATE_TYPES.find(x=>x[0]===u.type)||[,u.type])[1])} · ${u.publishAt?LP.fmtDate(u.publishAt):LP.fmtDate(u.createdAt)}</div></div>
    <select data-upstate="${E(u.id)}" style="width:auto;min-height:38px" aria-label="State">${['draft','scheduled','published'].map(s=>`<option ${u.state===s?'selected':''}>${s}</option>`).join('')}</select>
    <span class="pill ${LP.isLive(u)?'live':'mute'}">${LP.isLive(u)?'Visible':'Hidden'}</span>
    <button class="icon-btn" data-updel="${E(u.id)}" aria-label="Delete update">${ic('trash')}</button></div>`).join(''):'<p class="small muted">No updates yet.</p>'}</div>`;
}

/* ---------- audit findings ---------- */
function auditTab(p,l,a){
  if(!a) return `<div class="card"><h3>No audit report yet</h3>
    <p class="small muted">Audits run on the LaunchPage audit worker (real headless browser — screenshots, broken links, overflow, accessibility, SEO, forms, console/network errors and PWA eligibility). Run it, then import the JSON report here.</p>
    ${p.url?`<pre class="code">cd workers/audit\nnpm install\nnode audit.mjs ${E(p.url)} --out reports</pre>`:'<p class="small">Add the website URL in Overview first.</p>'}
    <label class="btn primary" style="margin-top:10px">${ic('upload')} Import report JSON<input type="file" accept="application/json,.json" data-import-audit="${E(p.id)}" class="sr"></label></div>`;
  if(a.error) return `<div class="card"><div class="note warn">${ic('alert')} Audit failed: ${E(a.error)}</div><label class="btn primary" style="margin-top:10px">${ic('upload')} Import new report<input type="file" accept=".json" data-import-audit="${E(p.id)}" class="sr"></label></div>`;
  const sevs=['critical','high','medium','low'], cnt=s=>a.issues.filter(i=>i.severity===s).length;
  const conf=a.issues.filter(i=>i.verification==='confirmed'), pot=a.issues.filter(i=>i.verification!=='confirmed');
  const issue=i=>`<details class="card" style="padding:12px"><summary class="row" style="cursor:pointer;list-style:none"><span class="sev ${E(i.severity)}">!</span><div class="grow"><b>${E(i.title)}</b><div class="xs muted">${E(i.category)} · ${E(i.page.replace(/^https?:\/\/[^/]+/,'')||'/')}</div></div><span class="pill ${i.severity==='high'||i.severity==='critical'?'err':i.severity==='medium'?'warn':'beta'}">${E(i.severity)}</span></summary>
    <div class="stack small" style="margin-top:10px"><div>${E(i.description)}</div><div><b>Evidence</b><pre class="code">${E(typeof i.evidence==='string'?i.evidence:JSON.stringify(i.evidence,null,2))}</pre></div><div><b>Suggested solution</b><div class="muted">${E(i.suggestion)}</div></div>
    <label class="f">Status<select data-issue="${E(a.id)}" data-iid="${E(i.id)}" style="max-width:240px">${['open','fixed','verified','wont-fix'].map(s=>`<option ${i.status===s?'selected':''}>${s}</option>`).join('')}</select></label></div></details>`;
  return `<div class="card"><div class="row between wrap"><div><h3>Audit · ${E(a.url.replace(/^https?:\/\//,''))}</h3><div class="xs muted">${a.pages.length} pages scanned · ${LP.fmtDate(a.finishedAt)} · ${E(a.tool||'')}</div></div>
    <label class="btn ghost sm">${ic('upload')} Re-import<input type="file" accept=".json" data-import-audit="${E(p.id)}" class="sr"></label></div>
    <div class="stats" style="margin-top:12px">${sevs.map(s=>`<div class="stat"><b style="color:${s==='critical'||s==='high'?'var(--error)':s==='medium'?'var(--warn)':'var(--accent2)'}">${cnt(s)}</b><span>${s}</span></div>`).join('')}</div>
    ${a.lighthouse?`<div class="stats" style="margin-top:8px">${Object.entries(a.lighthouse).map(([k,v])=>`<div class="stat"><b>${v==null?'—':Math.round(v*100)}</b><span>Lighthouse ${E(k)}</span></div>`).join('')}</div>`:'<p class="xs muted">Lighthouse scores not included in this report (run the worker with --lighthouse).</p>'}
    ${a.pwa?`<p class="small" style="margin:8px 0 0">PWA install eligibility: <b class="${a.pwa.eligible?'':'err-msg'}" style="color:${a.pwa.eligible?'var(--ok)':'var(--error)'}">${a.pwa.eligible?'Meets checked criteria':'Not eligible'}</b></p>`:''}</div>
  ${(a.pages||[]).some(pg=>pg.shots)?`<div class="chips sec">${a.pages.filter(pg=>pg.shots).map(pg=>`<figure style="margin:0;flex:none"><img src="${pg.shots.mobile}" alt="Mobile screenshot of ${E(pg.url)}" style="height:300px;border-radius:12px;border:1px solid var(--line)"><figcaption class="xs muted">${E(pg.url.replace(/^https?:\/\/[^/]+/,'')||'/')}</figcaption></figure>`).join('')}</div>`:''}
  <section class="sec">${head(`Confirmed defects (${conf.length})`)}<div class="stack">${conf.map(issue).join('')||'<p class="small muted">None.</p>'}</div></section>
  <section class="sec">${head(`Potential issues (${pot.length})`)}<p class="xs muted" style="margin-top:-6px">Heuristic findings that need a human to verify.</p><div class="stack">${pot.map(issue).join('')||'<p class="small muted">None.</p>'}</div></section>
  <div class="row sec"><button class="btn ghost" data-sact="auditmd" data-aid="${E(a.id)}">${ic('download')} Export report (Markdown)</button><button class="btn primary" data-sact="printaudit" data-aid="${E(a.id)}">${ic('file')} Print / Save PDF</button></div>`;
}
function importAudit(input){
  const file=input.files[0],pid=input.dataset.importAudit;if(!file)return;
  const r=new FileReader();r.onload=()=>{
    try{const j=JSON.parse(r.result);
      if(j.tool!=='launchpage-audit-worker'||!Array.isArray(j.issues)||!Array.isArray(j.pages))throw new Error('Not a LaunchPage audit worker report');
      j.issues.forEach(i=>{i.status=i.status||'open'});
      const rec={...j,id:LP.uid('aud'),projectId:pid,importedAt:LP.now()};
      try{LP.db.upsert('audits',rec)}catch(e){rec.pages.forEach(p=>delete p.shots);LP.db.upsert('audits',rec)}
      const p=LP.db.find('projects',pid);if(p&&(p.stage==='audit'||p.stage==='intake'))LP.db.upsert('projects',{...p,stage:'design'});
      LP.log(`Imported audit for ${p?.name||'project'}: ${j.issues.length} findings`,pid);LP.toast('Audit imported');LP.render();
    }catch(e){LP.toast('Import failed: '+e.message)}
  };r.readAsText(file);
}
function auditMarkdown(a){
  const p=LP.db.find('projects',a.projectId);
  let md=`# Website Audit — ${a.url}\n\nProject: ${p?.name||''}  \nScanned: ${a.finishedAt}  \nPages: ${a.pages.length}  \nTool: ${a.tool} ${a.version||''}\n\n`;
  if(a.lighthouse)md+=`## Lighthouse\n${Object.entries(a.lighthouse).map(([k,v])=>`- ${k}: ${v==null?'n/a':Math.round(v*100)}`).join('\n')}\n\n`;
  for(const [h,list] of [['Confirmed defects',a.issues.filter(i=>i.verification==='confirmed')],['Potential issues (need verification)',a.issues.filter(i=>i.verification!=='confirmed')]]){
    md+=`## ${h} (${list.length})\n\n`;
    list.forEach(i=>{md+=`### [${i.severity.toUpperCase()}] ${i.title}\n- Page: ${i.page}\n- Category: ${i.category}\n- Status: ${i.status}\n\n${i.description}\n\n**Evidence:** \`${(typeof i.evidence==='string'?i.evidence:JSON.stringify(i.evidence)).slice(0,400)}\`\n\n**Suggested solution:** ${i.suggestion}\n\n`});
  }
  return md;
}

function redesignTab(){return `<div class="card"><div class="row" style="color:var(--accent)">${ic('sparkle')}<h3>AI Redesign Studio</h3><span class="pill warn">Not connected</span></div>
  <p class="small muted">Phase 4. Generating redesigns needs a server-side AI integration (keys never go in the browser) and isolated preview hosting. Until that's deployed, nothing here pretends to generate designs.</p>
  <p class="small">Planned modes: Preserve Existing Brand · Modernize Existing Design · App-Like Website · Complete Rebrand · Custom Instructions — with section regeneration, version history, before/after review and section-level approval.</p>
  <p class="small muted">See <span class="kbd">docs/ROADMAP.md</span> for the integration contract.</p></div>`}

function deploy(p){
  const d=p.deploy||{checklist:{}}, items=[['https','Site served over HTTPS'],['manifest','Manifest with name, icons 192 & 512, start_url, display'],['sw','Service worker registered with offline fallback'],['audit','Post-build audit run with no high/critical findings'],['backup','Client\'s current site backed up'],['dns','DNS / hosting access confirmed by client']];
  const cl=p.clientId&&LP.db.find('clients',p.clientId);
  return `<div class="card"><h3>Deployment</h3>
  <form class="form" data-sform="deploy" data-id="${E(p.id)}" style="margin-top:10px">
    ${field('Target',`<select name="target"><option value="">Choose…</option>${['Cloudflare Pages','Namecheap cPanel (File Manager)','Hunnyhive listing','ZIP hand-off to client'].map(t=>`<option ${d.target===t?'selected':''}>${t}</option>`).join('')}</select>`)}
    <div class="stack" style="gap:6px">${items.map(([k,t])=>`<label class="check"><input type="checkbox" name="ck_${k}" ${d.checklist?.[k]?'checked':''}> ${t}</label>`).join('')}</div>
    <label class="check" style="border-color:rgba(245,165,36,.5)"><input type="checkbox" name="approved" ${d.approved?'checked':''}> <span><b>Explicit approval to publish received</b>${cl?` from ${E(cl.name)}`:''} <span class="xs muted">— required before marking Launched. LaunchPage never deploys to a client domain on its own.</span></span></label>
    ${field('Approval reference (email, signed proposal, message)',`<input class="input" name="approvalRef" value="${E(d.approvalRef||'')}">`)}
    <button class="btn primary">Save deployment status</button></form></div>
  ${LP.hunnyhiveCard?LP.hunnyhiveCard(p):''}
  <div class="card sec"><h3>Packages</h3><p class="small muted">Generate the PWA install kit (manifest, icons, service worker, one-tap install snippet, Play Store asset links) as a ZIP.</p><button class="btn ghost" data-go="#/studio/tools/pwa?project=${E(p.id)}">${ic('download')} Open PWA Kit</button>
  <p class="small muted" style="margin-top:12px">Deployment guides: <span class="kbd">docs/DEPLOY.md</span> (Cloudflare Pages & cPanel).</p></div>`;
}

/* ---------- tools ---------- */
function tools(sub){
  LP.pageTitle='Tools';
  if(sub==='audit')return toolAudit();
  if(sub==='pwa')return toolPwa();
  if(sub==='inbox')return toolInbox();
  if(sub==='redesign')return LP.topbar({title:'Redesign with AI',studio:true,back:true})+`<main class="main narrow">${redesignTab()}</main>`;
  if(sub==='backup')return toolBackup();
  const sig=LP.db.list('signups').filter(s=>s.status==='new').length;
  return LP.topbar({title:'Tools',studio:true})+`<main class="main"><div class="grid g2">${[
    ['search','Website Audits','Queue, import and review evidence-based audit reports.','#/studio/tools/audit'],
    ['hand',`Submissions Inbox${sig?` · ${sig} new`:''}`,'Waitlists, I Can Help offers and Founders Club signups. Export CSV.','#/studio/tools/inbox'],
    ['install','PWA Kit','Manifest, icons, maskable icon, service worker, one-tap install & Play Store files — as a ZIP.','#/studio/tools/pwa'],
    ['sparkle','Redesign with AI','Phase 4 — not connected yet.','#/studio/tools/redesign'],
    ['download','Backup & Restore','Export or restore all Studio data on this device.','#/studio/tools/backup']
  ].map(([i,t,d,h])=>`<button class="card click row" style="text-align:left;align-items:flex-start" data-go="${h}"><span style="color:var(--accent)">${ic(i)}</span><span><b>${t}</b><div class="small muted">${d}</div></span></button>`).join('')}</div></main>`;
}
function toolAudit(){
  const ps=projects().filter(p=>p.url), audits=LP.db.list('audits');
  return LP.topbar({title:'Website Audits',studio:true,back:true})+`<main class="main">
  <div class="note">${ic('info')} Audits run on the LaunchPage audit worker (<span class="kbd">workers/audit</span>) in a real headless browser. Results are never estimated: nothing appears here until a report is imported.</div>
  <div class="card sec">${ps.length?ps.map(p=>{const a=audits.filter(x=>x.projectId===p.id).pop();return `<div class="li"><div class="grow"><b>${E(p.name)}</b><div class="xs muted">${E(p.url)}</div></div>${a?(a.error?'<span class="pill err">Failed</span>':`<span class="pill live">${a.issues.length} findings</span>`):'<span class="pill warn">Not run</span>'}<button class="btn ghost sm" data-go="#/studio/projects/${E(p.id)}/audit">Open</button></div>`}).join(''):`<div class="empty">${ic('search')}<p>No projects with a URL yet.</p><button class="btn primary sm" data-go="#/studio/new?mode=transform">Transform an existing site</button></div>`}</div>
  <div class="card sec"><h3>Run the worker</h3><pre class="code">cd workers/audit
npm install            # installs Playwright + Chromium
node audit.mjs https://example.com --out reports --max-pages 15
# optional: npm i lighthouse && add --lighthouse</pre><p class="small muted">Then open the project → Findings → Import report JSON.</p></div></main>`;
}
function toolInbox(){
  const f=LP.query.get('kind')||'all';
  const list=LP.db.list('signups').filter(s=>f==='all'||s.kind===f).slice().reverse();
  const name=id=>LP.allLaunches().find(l=>l.id===id)?.name||id;
  return LP.topbar({title:'Submissions',studio:true,back:true})+`<main class="main">
  <div class="row between wrap"><div class="chips">${[['all','All'],['waitlist','Waitlists'],['help','I Can Help'],['founders','Founders Club']].map(([k,t])=>`<button class="chip ${f===k?'on':''}" data-go="#/studio/tools/inbox${k==='all'?'':'?kind='+k}">${t}</button>`).join('')}</div><button class="btn ghost sm" data-sact="csv">${ic('download')} Export CSV</button></div>
  ${LP.remote.enabled?'':`<p class="xs muted">Local mode: shows submissions made on this device. Connect Supabase to receive submissions from all visitors.</p>`}
  <div class="card sec">${list.length?list.map(s=>`<div class="li" style="align-items:flex-start"><div class="avatar">${E((s.name||'?')[0].toUpperCase())}</div><div class="grow"><b>${E(s.name)}</b> <span class="xs muted">${E(s.email)}${s.phone?' · '+E(s.phone):''}</span>
    <div class="small">${s.kind==='founders'?'Founders Club':s.kind==='waitlist'?'Waitlist':'I Can Help'}${s.launch?' · '+E(name(s.launch)):''}${s.role?' · '+E(s.role):''}${(s.roles||[]).length?' · '+E(s.roles.join(', ')):''}</div>
    ${(s.launches||[]).length?`<div class="xs muted">Interested in: ${E(s.launches.map(name).join(', '))}</div>`:''}${s.note?`<div class="small muted" style="margin-top:4px">“${E(s.note)}”</div>`:''}<div class="xs muted">${LP.fmtDate(s.createdAt)}</div></div>
    <select data-sigstatus="${E(s.id)}" style="width:auto;min-height:38px" aria-label="Review status">${['new','contacted','accepted','declined'].map(x=>`<option ${s.status===x?'selected':''}>${x}</option>`).join('')}</select></div>`).join(''):`<div class="empty">${ic('mail')}<p>No submissions yet.</p></div>`}</div></main>`;
}
function toCSV(rows){const cols=['createdAt','kind','name','email','phone','launch','role','roles','launches','note','status','consent'];const q=v=>'"'+String(Array.isArray(v)?v.join('; '):v??'').replace(/"/g,'""')+'"';return [cols.join(','),...rows.map(r=>cols.map(c=>q(r[c])).join(','))].join('\n')}

/* ---------- PWA kit ---------- */
function toolPwa(){
  const p=LP.query.get('project')&&LP.db.find('projects',LP.query.get('project'));
  return LP.topbar({title:'PWA Kit',studio:true,back:true})+`<main class="main narrow">
  <form class="card form" data-sform="pwakit">
    <div class="grid g2">${field('App name',`<input class="input" name="name" required value="${E(p?.name||'')}" maxlength="45">`)}${field('Short name (≤12)',`<input class="input" name="short" required maxlength="12" value="${E((p?.name||'').slice(0,12))}">`)}</div>
    ${field('Description',`<input class="input" name="desc" value="${E(p?.tagline||'')}">`)}
    <div class="grid g2">${field('Start URL',`<input class="input" name="start" value="./">`)}${field('Display',`<select name="display"><option>standalone</option><option>fullscreen</option><option>minimal-ui</option></select>`)}</div>
    <div class="grid g2">${field('Theme color',`<input class="input" name="theme" type="color" value="#07141C" style="padding:4px">`)}${field('Background color',`<input class="input" name="bg" type="color" value="#07141C" style="padding:4px">`)}</div>
    ${field('Android package name (for Play Store / TWA)',`<input class="input" name="pkg" placeholder="app.example.twa" pattern="[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+">`)}
    ${field('App icon (square PNG/JPG/SVG, 512px+)',`<input class="input" name="icon" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" required>`)}
    <div id="iconPrev" class="row" style="gap:12px"></div>
    <p class="err-msg" aria-live="polite"></p>
    <button class="btn primary block">${ic('download')} Generate ZIP</button>
    <p class="xs muted">Installability still has to be verified on the deployed HTTPS site — run the audit worker against it afterwards.</p>
  </form></main>`;
}
function loadImg(file){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('Could not read that image'));i.src=URL.createObjectURL(file)})}
function drawIcon(img,size,{pad=0,bg=null}={}){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');if(bg){x.fillStyle=bg;x.fillRect(0,0,size,size)}const s=size*(1-pad*2),r=Math.min(s/img.width,s/img.height),w=img.width*r,h=img.height*r;x.imageSmoothingQuality='high';x.drawImage(img,(size-w)/2,(size-h)/2,w,h);return new Promise(res=>c.toBlob(res,'image/png'))}
async function buildKit(f){
  const fd=new FormData(f),err=f.querySelector('.err-msg');err.textContent='';
  const file=fd.get('icon');if(!file||!file.size)return err.textContent='Choose an icon image.';
  const pkg=String(fd.get('pkg')||'').trim();if(pkg&&!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(pkg))return err.textContent='Package name must look like app.example.twa';
  let img;try{img=await loadImg(file)}catch(e){return err.textContent=e.message}
  if(Math.min(img.width,img.height)<192&&file.type!=='image/svg+xml')return err.textContent='Icon should be at least 192px (512px+ recommended).';
  const name=String(fd.get('name')).trim(),short=String(fd.get('short')).trim(),bg=fd.get('bg'),theme=fd.get('theme');
  const manifest={id:'./',name,short_name:short,description:String(fd.get('desc')||''),start_url:String(fd.get('start')||'./'),scope:'./',display:fd.get('display'),orientation:'any',background_color:bg,theme_color:theme,
    icons:[{src:'icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'icons/icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]};
  if(pkg)manifest.related_applications=[{platform:'play',id:pkg}];
  const sw=`// Generated by LaunchPage Studio — offline-first service worker\nconst CACHE='${LP.slug(short)||'app'}-v1';\nconst CORE=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];\nself.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});\nself.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});\nself.addEventListener('fetch',e=>{\n  const r=e.request; if(r.method!=='GET'||new URL(r.url).origin!==location.origin) return;\n  if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{caches.open(CACHE).then(c=>c.put(r,res.clone()));return res}).catch(()=>caches.match(r).then(m=>m||caches.match('./index.html'))));return}\n  e.respondWith(caches.match(r).then(m=>{const net=fetch(r).then(res=>{if(res.ok)caches.open(CACHE).then(c=>c.put(r,res.clone()));return res}).catch(()=>m);return m||net}));\n});\n`;
  const head=`<!-- Paste inside <head> -->\n<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="${theme}">\n<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n\n<!-- One-tap install button (paste before </body>) -->\n<button id="installBtn" hidden>Install ${E(short)}</button>\n<script>\nlet dp;const b=document.getElementById('installBtn');\naddEventListener('beforeinstallprompt',e=>{e.preventDefault();dp=e;b.hidden=false});\nb.onclick=async()=>{if(!dp)return;dp.prompt();await dp.userChoice;dp=null;b.hidden=true};\naddEventListener('appinstalled',()=>b.hidden=true);\nif('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');\n<\/script>\n`;
  const assetlinks=JSON.stringify([{relation:['delegate_permission/common.handle_all_urls'],target:{namespace:'android_app',package_name:pkg||'REPLACE.WITH.PACKAGE',sha256_cert_fingerprints:['REPLACE_WITH_SHA256_FROM_PLAY_CONSOLE_APP_SIGNING']}}],null,2);
  const readme=`${name} — PWA kit (generated by LaunchPage Studio ${new Date().toISOString().slice(0,10)})\n\nFILES\n- manifest.webmanifest, sw.js, icons/*, install-snippet.html\n- .well-known/assetlinks.json (Play Store / Trusted Web Activity)\n\nINSTALL\n1. Copy everything to your site root.\n2. Paste install-snippet.html tags into your index.html.\n3. Serve over HTTPS.\n\nCLOUDFLARE PAGES: drag the folder into Pages (or push to the connected GitHub repo).\nNAMECHEAP cPANEL: File Manager → public_html → Upload → extract. Make sure .well-known is uploaded (enable "Show hidden files").\n\nPLAY STORE: use PWABuilder.com or Bubblewrap with this manifest. Put the SHA-256 app-signing fingerprint from Play Console into .well-known/assetlinks.json.\n\nVERIFY: run the LaunchPage audit worker against the live URL — install eligibility is only confirmed after a real check.\n`;
  const blobs=await Promise.all([drawIcon(img,192),drawIcon(img,512),drawIcon(img,512,{pad:.1,bg}),drawIcon(img,180,{bg}),drawIcon(img,32)]);
  const zip=await makeZip([{name:'manifest.webmanifest',data:JSON.stringify(manifest,null,2)},{name:'sw.js',data:sw},{name:'install-snippet.html',data:head},{name:'.well-known/assetlinks.json',data:assetlinks},{name:'README.txt',data:readme},
    {name:'icons/icon-192.png',data:blobs[0]},{name:'icons/icon-512.png',data:blobs[1]},{name:'icons/icon-maskable-512.png',data:blobs[2]},{name:'icons/apple-touch-icon.png',data:blobs[3]},{name:'icons/favicon-32.png',data:blobs[4]}]);
  downloadBlob(zip,(LP.slug(short)||'app')+'-pwa-kit.zip');LP.log(`Generated PWA kit for ${name}`);LP.toast('PWA kit downloaded');
}

/* ---------- backup ---------- */
function toolBackup(){
  return LP.topbar({title:'Backup & Restore',studio:true,back:true})+`<main class="main narrow"><div class="card"><p class="small muted" style="margin-top:0">Exports every LaunchPage key on this device (launch overrides, Studio projects, clients, audits, submissions, saved). Use it before switching devices or migrating to Supabase.</p>
  <div class="row wrap"><button class="btn primary" data-sact="backup">${ic('download')} Export backup</button><label class="btn ghost">${ic('upload')} Restore<input type="file" accept=".json" data-restore class="sr"></label></div></div></main>`;
}
const allKeys=()=>Object.keys(localStorage).filter(k=>/^lp(2)?_/.test(k));

/* ---------- clients ---------- */
const PAY=['Not invoiced','Estimate sent','Deposit due','Deposit paid','Balance due','Paid in full'];
function clientList(){
  LP.pageTitle='Clients';
  const cs=clients();
  return LP.topbar({title:'Clients',studio:true})+`<main class="main">
  <div class="row between"><p class="small muted" style="margin:0">${cs.length} client${cs.length===1?'':'s'}</p><button class="btn primary sm" data-sact="newclient">${ic('plus')} Add client</button></div>
  <div class="card sec">${cs.length?cs.map(c=>`<div class="li" style="cursor:pointer" data-go="#/studio/clients/${E(c.id)}"><div class="avatar">${E(c.name[0].toUpperCase())}</div><div class="grow"><b>${E(c.name)}</b><div class="xs muted">${E(c.company||c.email||'')}</div></div><span class="pill ${/paid/i.test(c.payment)&&!/due/i.test(c.payment)?'live':/due/i.test(c.payment)?'warn':'mute'}">${E(c.payment||'Not invoiced')}</span>${ic('right')}</div>`).join(''):`<div class="empty">${ic('user')}<p>No clients yet.</p></div>`}</div></main>`;
}
function clientForm(c={}){
  return `<form class="form" data-sform="client" data-id="${E(c.id||'')}">
    <div class="grid g2">${field('Name',`<input class="input" name="name" required value="${E(c.name||'')}" maxlength="80">`)}${field('Company',`<input class="input" name="company" value="${E(c.company||'')}">`)}</div>
    <div class="grid g2">${field('Email',`<input class="input" name="email" type="email" value="${E(c.email||'')}">`)}${field('Phone',`<input class="input" name="phone" type="tel" value="${E(c.phone||'')}">`)}</div>
    ${field('Requirements',`<textarea name="requirements">${E(c.requirements||'')}</textarea>`)}
    <div class="grid g2">${field('Estimate ($)',`<input class="input" name="estimate" type="number" min="0" step="0.01" value="${E(c.estimate||'')}">`)}${field('Deposit ($)',`<input class="input" name="deposit" type="number" min="0" step="0.01" value="${E(c.deposit||'')}">`)}</div>
    ${field('Payment status',`<select name="payment">${PAY.map(x=>`<option ${c.payment===x?'selected':''}>${x}</option>`).join('')}</select>`)}
    <p class="err-msg" aria-live="polite"></p><button class="btn primary block">Save client</button></form>`;
}
function clientView(id){
  const c=LP.db.find('clients',id);if(!c)return LP.topbar({title:'Client',studio:true,back:true})+`<main class="main"><div class="card empty">Client not found.</div></main>`;
  LP.pageTitle=c.name;
  const ps=projects().filter(p=>p.clientId===c.id), log=c.log||[];
  const money=v=>v?'$'+Number(v).toLocaleString(undefined,{minimumFractionDigits:2}):'—';
  return LP.topbar({title:'Client',studio:true,back:true})+`<main class="main"><div class="split">
  <div class="stack">
    <div class="card"><div class="row"><div class="avatar" style="width:54px;height:54px;font-size:22px">${E(c.name[0].toUpperCase())}</div><div class="grow"><h2>${E(c.name)}</h2><div class="small muted">${E(c.company||'')}</div></div><button class="btn ghost sm" data-sact="editclient" data-id="${E(c.id)}">${ic('edit')} Edit</button></div>
      <div class="stack small" style="margin-top:12px;gap:6px">${c.email?`<div>${ic('mail')} <a href="mailto:${E(c.email)}">${E(c.email)}</a></div>`:''}${c.phone?`<div>📞 <a href="tel:${E(c.phone)}">${E(c.phone)}</a></div>`:''}</div>
      <div class="stats" style="grid-template-columns:repeat(3,1fr);margin-top:12px"><div class="stat"><b style="font-size:18px">${money(c.estimate)}</b><span>Estimate</span></div><div class="stat"><b style="font-size:18px">${money(c.deposit)}</b><span>Deposit</span></div><div class="stat"><b style="font-size:14px">${E(c.payment||'—')}</b><span>Payment</span></div></div>
      ${c.requirements?`<h3 style="margin-top:14px">Requirements</h3><p class="small muted" style="white-space:pre-wrap">${E(c.requirements)}</p>`:''}</div>
    <div class="card"><div class="row between"><h3>Projects</h3><button class="btn ghost sm" data-go="#/studio/new">${ic('plus')} New</button></div>${ps.length?ps.map(projRow).join(''):'<p class="small muted">None linked.</p>'}</div>
  </div>
  <div class="card"><h3>History</h3><p class="xs muted">Proposals, estimates, deposits, revision requests, approvals and delivery records.</p>
    <form class="form" data-sform="clientlog" data-id="${E(c.id)}"><div class="grid g2"><select name="type">${['Proposal','Estimate','Deposit','Payment','Revision request','Approval','Delivery','Note'].map(t=>`<option>${t}</option>`).join('')}</select><select name="projectId"><option value="">— Any project —</option>${ps.map(p=>`<option value="${E(p.id)}">${E(p.name)}</option>`).join('')}</select></div><textarea name="text" required placeholder="Details, amount, link to document…" style="min-height:70px"></textarea><button class="btn primary">Add entry</button></form>
    <div style="margin-top:10px">${log.length?log.map(x=>`<div class="li" style="align-items:flex-start"><span class="pill ${x.type==='Approval'||x.type==='Delivery'?'live':x.type==='Revision request'?'warn':'mute'}">${E(x.type)}</span><div class="grow small">${E(x.text)}<div class="xs muted">${LP.fmtDate(x.at)}${x.projectId?' · '+E(LP.db.find('projects',x.projectId)?.name||''):''}</div></div></div>`).join(''):'<p class="small muted">No entries yet.</p>'}</div>
    <button class="btn danger sm sec" data-sact="delclient" data-id="${E(c.id)}">${ic('trash')} Delete client</button>
  </div></div></main>`;
}

/* ---------- settings ---------- */
function settings(){
  const s=LP.settings();
  return LP.topbar({title:'Studio Settings',studio:true,back:true})+`<main class="main narrow"><div class="card form">
  <form class="form" data-sform="settings">${field('Display name',`<input class="input" name="name" value="${E(s.operatorName||'')}">`)}<button class="btn primary">Save</button></form>
  <p class="small">Mode: <b>${LP.remote.enabled?'Cloud (Supabase)':'Local — this device only'}</b>${LP.remote.user?` · ${E(LP.remote.user.email)} (${E(LP.remote.role)})`:''}</p>
  ${LP.remote.enabled?`<button class="btn ghost" data-sact="signout">${ic('logout')} Sign out</button>`:`<button class="btn ghost" data-sact="lock">${ic('lock')} Lock Studio</button><button class="btn danger" data-sact="resetpin">Reset PIN (keeps data)</button>`}
  </div></main>`;
}

/* ---------- events ---------- */
document.addEventListener('submit',async e=>{
  const f=e.target, k=f.dataset.sform; if(!k)return; e.preventDefault();
  const fd=new FormData(f), err=f.querySelector('.err-msg');
  if(k==='setpin'){const pin=String(fd.get('pin'));if(!/^\d{4,8}$/.test(pin))return err.textContent='PIN must be 4–8 digits.';const h=await sha(pin);LP.setSettings({pinHash:h,operatorName:String(fd.get('name')).trim()});sessionStorage.setItem(sessKey,h);LP.log('Studio created on this device');return LP.render()}
  if(k==='unlock'){const h=await sha(String(fd.get('pin')));if(h!==LP.settings().pinHash)return err.textContent='Wrong PIN.';sessionStorage.setItem(sessKey,h);return LP.render()}
  if(k==='signin'){const em=String(fd.get('email')).trim();if(!LP.validEmail(em))return err.textContent='Enter a valid email.';const {error}=await LP.remote.signIn(em);err.style.color=error?'':'var(--ok)';err.textContent=error?error.message:'Check your email for the sign-in link.';return}
  if(k==='psearch'){return LP.go('#/studio/projects?q='+encodeURIComponent(fd.get('q')||''))}
  if(k==='newproject')return createProject(f);
  if(k==='overview'){const p=LP.db.find('projects',f.dataset.id);const n={...p,name:String(fd.get('name')).trim()||p.name,stage:fd.get('stage'),type:fd.get('type'),clientId:fd.get('clientId'),url:String(fd.get('url')||'').trim(),visibility:fd.get('visibility'),notes:fd.get('notes')};
    if(n.stage==='launched'&&!n.deploy?.approved){LP.toast('Record explicit approval in Deploy before marking Launched');return}
    if(n.visibility!=='private'&&!n.launchId){let id=LP.slug(n.name)||n.id;if(LP.allLaunches().some(l=>l.id===id))id+='-'+Date.now().toString(36).slice(-4);n.launchId=id;LP.saveCustomLaunch({id,name:n.name,category:n.category||'General',status:'Planning',tone:'idea',tagline:n.tagline||n.name,site:'',interest:0,roles:['Beta Testers','Feedback'],milestones:n.milestones,visibility:n.visibility,source:'studio'})}
    if(p.stage!==n.stage)LP.log(`${n.name} moved to ${stageLabel(n.stage)}`,n.id);
    LP.db.upsert('projects',n);syncLaunch(n);LP.toast('Saved');return LP.render()}
  if(k==='launchinfo'){const id=f.dataset.id,st=String(fd.get('status')).trim();LP.setOverride(id,{status:st,tone:/live|launched/i.test(st)?'live':undefined,tagline:String(fd.get('tagline')).trim(),targetDate:fd.get('targetDate')||'',roles:String(fd.get('roles')).split(',').map(s=>s.trim()).filter(Boolean),image:String(fd.get('image')||'').trim(),video:String(fd.get('video')||'').trim(),screenshots:String(fd.get('screenshots')||'').split('\n').map(s=>s.trim()).filter(s=>/^https?:\/\//.test(s)),launchUrl:String(fd.get('launchUrl')||'').trim()});LP.log('Updated public info for '+id);LP.toast('Public info saved');return LP.render()}
  if(k==='addms'){const p=LP.db.find('projects',f.dataset.id);const t=String(fd.get('title')).trim();if(!t)return;p.milestones=[...(p.milestones||[]),{id:LP.uid('ms'),title:t,targetDate:fd.get('targetDate')||'',done:false,approved:false,published:false}];LP.db.upsert('projects',p);syncLaunch(p);return LP.render()}
  if(k==='update'){const t=String(fd.get('title')).trim();if(!t)return err.textContent='Add a title.';const state=fd.get('state');let at=fd.get('publishAt');if(state==='scheduled'&&!at)return err.textContent='Pick a publish date for a scheduled update.';
    const u={id:LP.uid('upd'),launchId:f.dataset.launch,type:fd.get('type'),title:t,body:String(fd.get('body')||''),mediaUrl:String(fd.get('mediaUrl')||'').trim(),state,publishAt:at?new Date(at).toISOString():(state==='published'?LP.now():''),createdAt:LP.now()};
    LP.db.upsert('updates',u);LP.remote.publishUpdate(u);LP.setOverride(u.launchId,{});LP.log(`${state==='published'?'Published':state==='scheduled'?'Scheduled':'Drafted'} update “${t}”`);LP.toast('Update saved');return LP.render()}
  if(k==='deploy'){const p=LP.db.find('projects',f.dataset.id);const ck={};['https','manifest','sw','audit','backup','dns'].forEach(x=>ck[x]=!!fd.get('ck_'+x));const ap=!!fd.get('approved');if(ap&&!String(fd.get('approvalRef')||'').trim())return LP.toast('Add an approval reference so there\'s a record of it');
    p.deploy={target:fd.get('target'),checklist:ck,approved:ap,approvalRef:String(fd.get('approvalRef')||'').trim(),approvedAt:ap?(p.deploy?.approvedAt||LP.now()):''};if(ap&&Object.values(ck).every(Boolean)&&p.stage!=='launched')p.stage='ready';
    LP.db.upsert('projects',p);LP.log(`Deployment status saved for ${p.name}`,p.id);LP.toast('Saved');return LP.render()}
  if(k==='pwakit'){const b=f.querySelector('button.primary');b.disabled=true;try{await buildKit(f)}finally{b.disabled=false}return}
  if(k==='client'){const name=String(fd.get('name')).trim();if(!name)return err.textContent='Name is required.';const em=String(fd.get('email')||'').trim();if(em&&!LP.validEmail(em))return err.textContent='Email looks invalid.';
    const id=f.dataset.id||LP.uid('cli');const old=LP.db.find('clients',id)||{log:[],createdAt:LP.now()};
    LP.db.upsert('clients',{...old,id,name,company:fd.get('company'),email:em,phone:fd.get('phone'),requirements:fd.get('requirements'),estimate:fd.get('estimate'),deposit:fd.get('deposit'),payment:fd.get('payment')});
    if(!f.dataset.id)LP.log('Added client '+name);document.querySelector('.sheet-bg')?.remove();LP.toast('Client saved');return LP.go('#/studio/clients/'+id)}
  if(k==='clientlog'){const c=LP.db.find('clients',f.dataset.id);const t=String(fd.get('text')).trim();if(!t)return;c.log=[{type:fd.get('type'),text:t,projectId:fd.get('projectId'),at:LP.now()},...(c.log||[])];LP.db.upsert('clients',c);LP.log(`${fd.get('type')} logged for ${c.name}`);return LP.render()}
  if(k==='settings'){LP.setSettings({operatorName:String(fd.get('name')).trim()});LP.toast('Saved');return LP.render()}
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset.ms){const p=LP.db.find('projects',t.dataset.ms),m=p.milestones[+t.dataset.i];m[t.dataset.k]=t.checked;if(t.dataset.k==='approved'&&!t.checked)m.published=false;LP.db.upsert('projects',p);syncLaunch(p);if(t.dataset.k==='done'&&t.checked)LP.log(`Milestone “${m.title}” completed on ${p.name}`,p.id);return LP.render()}
  if(t.dataset.upstate){const u=LP.db.find('updates',t.dataset.upstate);u.state=t.value;if(u.state==='published'&&!u.publishAt)u.publishAt=LP.now();if(u.state==='scheduled'&&!u.publishAt){LP.toast('Scheduled updates need a date — recreate it with one');return LP.render()}LP.db.upsert('updates',u);LP.remote.publishUpdate(u);return LP.render()}
  if(t.dataset.issue){const a=LP.db.find('audits',t.dataset.issue);a.issues.find(i=>i.id===t.dataset.iid).status=t.value;LP.db.upsert('audits',a);return}
  if(t.dataset.sigstatus){LP.updateSignup(t.dataset.sigstatus,{status:t.value});return}
  if(t.dataset.importAudit!=null)return importAudit(t);
  if(t.matches('[data-restore]')){const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(j.app!=='launchpage'||!j.data)throw 0;if(!confirm(`Restore ${Object.keys(j.data).length} data sets from ${LP.fmtDate(j.exportedAt)}? Current Studio data on this device will be replaced.`))return;Object.entries(j.data).forEach(([k,v])=>{if(/^lp(2)?_/.test(k))localStorage.setItem(k,v)});LP.toast('Restored');LP.render()}catch{LP.toast('That is not a LaunchPage backup file')}};r.readAsText(t.files[0])}
  if(t.name==='icon'&&t.files?.[0]){const u=URL.createObjectURL(t.files[0]);document.getElementById('iconPrev').innerHTML=`<img src="${u}" alt="Icon preview" style="width:72px;height:72px;border-radius:16px;object-fit:contain;background:var(--surface)"><img src="${u}" alt="Maskable preview" style="width:72px;height:72px;border-radius:50%;object-fit:contain;padding:8px;background:var(--surface)"><span class="xs muted">Any / maskable (safe zone) preview</span>`}
});
document.addEventListener('click',async e=>{
  const t=e.target.closest('[data-sact],[data-msdel],[data-msmove],[data-updel]');if(!t)return;
  if(t.dataset.msdel!=null){const p=LP.db.find('projects',t.dataset.id);if(!confirm('Delete this milestone?'))return;p.milestones.splice(+t.dataset.msdel,1);LP.db.upsert('projects',p);syncLaunch(p);return LP.render()}
  if(t.dataset.msmove!=null){const p=LP.db.find('projects',t.dataset.id),i=+t.dataset.msmove;[p.milestones[i-1],p.milestones[i]]=[p.milestones[i],p.milestones[i-1]];LP.db.upsert('projects',p);syncLaunch(p);return LP.render()}
  if(t.dataset.updel){if(!confirm('Delete this update?'))return;const u=LP.db.find('updates',t.dataset.updel);LP.db.remove('updates',u.id);LP.remote.publishUpdate({...u,state:'draft'});return LP.render()}
  const a=t.dataset.sact;
  if(a==='signout'){await LP.remote.signOut();return LP.go('#/')}
  if(a==='lock'){sessionStorage.removeItem(sessKey);return LP.go('#/')}
  if(a==='resetpin'){if(confirm('Reset the Studio PIN on this device? Data is kept.')){LP.setSettings({pinHash:''});sessionStorage.removeItem(sessKey);LP.render()}return}
  if(a==='delproject'){const p=LP.db.find('projects',t.dataset.id);if(!confirm(`Delete “${p.name}”? Its public launch page (if any) will be set to private.`))return;if(p.launchId)LP.setOverride(p.launchId,{visibility:'private'});LP.db.remove('projects',p.id);LP.log('Deleted project '+p.name);return LP.go('#/studio/projects')}
  if(a==='newclient')return LP.sheet(`<div class="row between"><h2>New client</h2><button class="icon-btn" data-close aria-label="Close">✕</button></div><div style="margin-top:12px">${clientForm()}</div>`);
  if(a==='editclient')return LP.sheet(`<div class="row between"><h2>Edit client</h2><button class="icon-btn" data-close aria-label="Close">✕</button></div><div style="margin-top:12px">${clientForm(LP.db.find('clients',t.dataset.id))}</div>`);
  if(a==='delclient'){const c=LP.db.find('clients',t.dataset.id);if(!confirm(`Delete client ${c.name}? Linked projects are kept.`))return;LP.db.remove('clients',c.id);return LP.go('#/studio/clients')}
  if(a==='csv'){const rows=LP.db.list('signups');downloadBlob(new Blob([toCSV(rows)],{type:'text/csv'}),'launchpage-submissions.csv');return}
  if(a==='backup'){const data={};allKeys().forEach(k=>data[k]=localStorage.getItem(k));downloadBlob(new Blob([JSON.stringify({app:'launchpage',version:2,exportedAt:LP.now(),data},null,2)],{type:'application/json'}),'launchpage-backup-'+new Date().toISOString().slice(0,10)+'.json');return}
  if(a==='auditmd'){const au=LP.db.find('audits',t.dataset.aid);downloadBlob(new Blob([auditMarkdown(au)],{type:'text/markdown'}),'audit-'+LP.slug(au.url)+'.md');return}
  if(a==='printaudit'){const au=LP.db.find('audits',t.dataset.aid);const w=open('','_blank');if(!w)return LP.toast('Allow pop-ups to print');w.document.write(`<title>Audit ${E(au.url)}</title><style>body{font:14px system-ui;max-width:800px;margin:30px auto;padding:0 16px;color:#111}h1{font-size:22px}h3{margin-bottom:2px}code{background:#f3f3f3;padding:2px 4px;word-break:break-all}</style>`+auditMarkdown(au).split('\n').map(l=>l.startsWith('### ')?`<h3>${E(l.slice(4))}</h3>`:l.startsWith('## ')?`<h2>${E(l.slice(3))}</h2>`:l.startsWith('# ')?`<h1>${E(l.slice(2))}</h1>`:l?`<p>${E(l).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/`(.+?)`/g,'<code>$1</code>')}</p>`:'').join(''));w.document.close();w.focus();w.print();return}
});
window.addEventListener('lp:auth',()=>{if(LP.remote.isOperator())LP.remote.pullStudio().then(()=>LP.render());else LP.render()});
})();

/* ---------- logo upload: resized to a 256px square PNG, kept with the launch ---------- */
document.addEventListener('change',async e=>{
  const t=e.target; if(!t.dataset||t.dataset.logoUpload==null||!t.files[0])return;
  const f=t.files[0]; if(f.size>5e6)return LP.toast('That image is over 5 MB');
  const img=new Image(); img.src=URL.createObjectURL(f);
  try{await img.decode()}catch{return LP.toast('Could not read that image')}
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
  const s=Math.min(img.naturalWidth,img.naturalHeight)||256, sx=(img.naturalWidth-s)/2, sy=(img.naturalHeight-s)/2;
  x.imageSmoothingQuality='high';x.drawImage(img,sx,sy,s,s,0,0,256,256);
  LP.setOverride(t.dataset.logoUpload,{logo:c.toDataURL('image/png')});LP.log('Updated logo for '+t.dataset.logoUpload);LP.toast('Logo updated');LP.render();
});
document.addEventListener('click',e=>{const b=e.target.closest('[data-logo-clear]');if(!b)return;
  LP.setOverride(b.dataset.logoClear,{logo:''});
  LP.toast('Logo reset');LP.render();});
