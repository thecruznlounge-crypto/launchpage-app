/* LaunchPage data layer.
   Local mode: localStorage on this device only (never assumed to sync across devices).
   Supabase mode: mirrors writes to Postgres (RLS-protected) when LP_CONFIG is filled in. */
(function(){
const LP = window.LP = window.LP || {};
const ls = {
  get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch{return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){console.warn('storage full',e)}}
};
LP.uid=(p='id')=>p+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
LP.esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
LP.slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
LP.now=()=>new Date().toISOString();

/* ---------- v1 → v2 migration (non-destructive) ---------- */
(function migrate(){
  const ver=ls.get('lp_schema',1);
  if(ver<2){
    // v1 keys lp_saved & lp_signups are kept as-is and read directly. Tag legacy signups.
    const s=ls.get('lp_signups',[]);
    let changed=false;
    s.forEach(x=>{ if(!x.id){x.id=LP.uid('sig');changed=true} if(!x.kind){x.kind=x.launch?'help':'founders';changed=true} if(x.sync==null){x.sync='local';changed=true} });
    if(changed) ls.set('lp_signups',s);
    ls.set('lp_schema',2);
  }
})();

/* ---------- collections ---------- */
const K={saved:'lp_saved',signups:'lp_signups',follows:'lp2_follows',overrides:'lp2_overrides',custom:'lp2_launches',
  updates:'lp2_updates',projects:'lp2_projects',clients:'lp2_clients',activity:'lp2_activity',settings:'lp2_settings',audits:'lp2_audits'};
LP.db={
  get:(n,d)=>ls.get(K[n],d), set:(n,v)=>ls.set(K[n],v),
  list:n=>ls.get(K[n],[]),
  upsert(n,obj){const a=ls.get(K[n],[]);const i=a.findIndex(x=>x.id===obj.id);obj.updatedAt=LP.now();if(i>=0)a[i]={...a[i],...obj};else a.unshift(obj);ls.set(K[n],a);LP.remote.pushDoc(n,a[i>=0?i:0]);return obj},
  remove(n,id){ls.set(K[n],ls.get(K[n],[]).filter(x=>x.id!==id));LP.remote.deleteDoc(n,id)},
  find:(n,id)=>ls.get(K[n],[]).find(x=>x.id===id)
};
LP.settings=()=>ls.get(K.settings,{});
LP.setSettings=p=>ls.set(K.settings,{...LP.settings(),...p});
LP.log=(text,ref)=>{const a=ls.get(K.activity,[]);a.unshift({id:LP.uid('act'),text,ref,at:LP.now()});ls.set(K.activity,a.slice(0,200))};

/* ---------- launches ---------- */
function normMilestones(ms){
  return (ms||[]).map(m=>Array.isArray(m)?{id:LP.slug(m[0]),title:m[0],done:!!m[1],approved:true,published:true}:{approved:true,published:true,...m});
}
let remoteLaunches=null, remoteInterest={};
LP.allLaunches=function(){
  const ov=ls.get(K.overrides,{});
  const seeds=(remoteLaunches||SEED_LAUNCHES).map(l=>({visibility:'discoverable',source:'seed',...l,...(ov[l.id]||{})}));
  const custom=ls.get(K.custom,[]).filter(c=>!seeds.some(s=>s.id===c.id)).map(c=>({...c,...(ov[c.id]||{})}));
  return [...seeds,...custom].map(l=>({...l,milestones:normMilestones(l.milestones)}));
};
LP.publicLaunches=({listedOnly=true}={})=>LP.allLaunches().filter(l=>l.visibility==='discoverable'||(!listedOnly&&l.visibility==='page'));
LP.getLaunch=id=>LP.allLaunches().find(l=>l.id===id&&l.visibility!=='private');
LP.publicMilestones=l=>l.milestones.filter(m=>m.approved&&m.published);
LP.progress=l=>{const m=LP.publicMilestones(l);return m.length?Math.round(m.filter(x=>x.done).length/m.length*100):0};
LP.setOverride=(id,patch)=>{const ov=ls.get(K.overrides,{});ov[id]={...(ov[id]||{}),...patch,updatedAt:LP.now()};ls.set(K.overrides,ov);LP.remote.pushDoc('overrides',{id,...ov[id]});LP.remote.publishLaunch(id)};
LP.saveCustomLaunch=l=>{const a=ls.get(K.custom,[]);const i=a.findIndex(x=>x.id===l.id);if(i>=0)a[i]={...a[i],...l};else a.push(l);ls.set(K.custom,a);LP.remote.pushDoc('custom',i>=0?a[i]:l);LP.remote.publishLaunch(l.id)};
LP.signupCount=id=>ls.get(K.signups,[]).filter(s=>s.launch===id||(s.launches||[]).includes(id)).length+(remoteInterest[id]||0);
LP.interest=l=>(l.interest||0)+LP.signupCount(l.id);
LP.statusTone=l=>l.tone||(/live|launched/i.test(l.status)?'live':/beta|alpha|build|prototype/i.test(l.status)?'beta':'idea');

/* ---------- public progress updates ---------- */
LP.isLive=u=>u.state==='published'||(u.state==='scheduled'&&u.publishAt&&new Date(u.publishAt)<=new Date());
LP.publicUpdates=id=>ls.get(K.updates,[]).filter(u=>(!id||u.launchId===id)&&LP.isLive(u)).sort((a,b)=>(b.publishAt||b.createdAt).localeCompare(a.publishAt||a.createdAt));

/* ---------- saved / follow ---------- */
LP.isSaved=id=>ls.get(K.saved,[]).includes(id);
LP.toggleSave=id=>{let s=ls.get(K.saved,[]);s=s.includes(id)?s.filter(x=>x!==id):[...s,id];ls.set(K.saved,s);return s.includes(id)};
LP.isFollowing=id=>ls.get(K.follows,[]).includes(id);
LP.toggleFollow=id=>{let s=ls.get(K.follows,[]);s=s.includes(id)?s.filter(x=>x!==id):[...s,id];ls.set(K.follows,s);return s.includes(id)};

/* ---------- submissions (waitlist / I Can Help / Founders Club) ---------- */
LP.validEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e||'').trim());
LP.addSignup=async function(data){
  const rec={id:LP.uid('sig'),createdAt:LP.now(),status:'new',sync:'local',...data};
  rec.email=String(rec.email||'').trim().toLowerCase();
  const all=ls.get(K.signups,[]);
  const dupe=all.find(s=>s.email===rec.email&&s.kind===rec.kind&&(s.launch||'')===(rec.launch||''));
  if(dupe) return {ok:true,duplicate:true};
  all.push(rec);ls.set(K.signups,all);
  if(LP.remote.enabled){const r=await LP.remote.insertSignup(rec);rec.sync=r.ok?'synced':'pending';ls.set(K.signups,ls.get(K.signups,[]).map(s=>s.id===rec.id?rec:s));return {ok:true,remote:r.ok}}
  return {ok:true,remote:false};
};
LP.updateSignup=(id,patch)=>ls.set(K.signups,ls.get(K.signups,[]).map(s=>s.id===id?{...s,...patch}:s));

/* ---------- Supabase adapter ---------- */
const cfg=window.LP_CONFIG||{};
LP.remote={
  enabled:!!(cfg.supabaseUrl&&cfg.supabaseAnonKey), client:null, user:null, role:null, ready:null,
  async init(){
    if(!this.enabled||!navigator.onLine) return false;
    if(this.ready) return this.ready;
    this.ready=(async()=>{
      try{
        const mod=await import('https://esm.sh/@supabase/supabase-js@2');
        this.client=mod.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,detectSessionInUrl:true}});
        const {data}=await this.client.auth.getSession(); await this.setUser(data.session?.user||null);
        this.client.auth.onAuthStateChange((_e,s)=>this.setUser(s?.user||null).then(()=>window.dispatchEvent(new Event('lp:auth'))));
        await this.fetchPublic(); this.flushPending();
        return true;
      }catch(e){console.warn('Supabase unavailable, staying local',e);return false}
    })();
    return this.ready;
  },
  async setUser(u){this.user=u;this.role=null;if(u){const {data}=await this.client.from('profiles').select('role,display_name').eq('id',u.id).maybeSingle();this.role=data?.role||'member';if(data?.display_name)LP.setSettings({operatorName:data.display_name})}},
  isOperator(){return ['operator','admin'].includes(this.role)},
  async signIn(email){return this.client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname+'#/studio'}})},
  async signOut(){await this.client?.auth.signOut();this.user=null;this.role=null},
  async fetchPublic(){
    const [l,u,i]=await Promise.all([this.client.from('launches').select('*'),this.client.from('launch_updates').select('*'),this.client.rpc('public_interest')]);
    if(l.data?.length) remoteLaunches=l.data.filter(x=>x.visibility!=='private').map(x=>({id:x.id,name:x.name,category:x.category,status:x.status,tone:x.tone,tagline:x.tagline,site:x.site,interest:x.interest,roles:x.roles||[],milestones:x.milestones||[],image:x.image,video:x.video,screenshots:x.screenshots||[],launchUrl:x.launch_url,targetDate:x.target_date,visibility:x.visibility}));
    if(u.data){const loc=ls.get(K.updates,[]).filter(x=>!u.data.some(r=>r.id===x.id));ls.set(K.updates,[...loc,...u.data.map(r=>({id:r.id,launchId:r.launch_id,type:r.type,title:r.title,body:r.body,mediaUrl:r.media_url,state:r.state,publishAt:r.publish_at,createdAt:r.created_at}))])}
    if(i.data) remoteInterest=Object.fromEntries(i.data.map(r=>[r.launch_id,r.n]));
    window.dispatchEvent(new Event('lp:data'));
  },
  async insertSignup(s){
    if(!(await this.init())) return {ok:false};
    const {error}=await this.client.from('launch_signups').insert({kind:s.kind,launch_id:s.launch||null,launches:s.launches||[],name:s.name,email:s.email,phone:s.phone||null,role:s.role||null,roles:s.roles||[],note:s.note||null,consent:!!s.consent,consent_at:s.consent?s.createdAt:null});
    return {ok:!error||error.code==='23505',error};
  },
  async flushPending(){for(const s of ls.get(K.signups,[]).filter(x=>x.sync==='pending')){const r=await this.insertSignup(s);if(r.ok)LP.updateSignup(s.id,{sync:'synced'})}},
  async pushDoc(collection,doc){if(!this.client||!this.isOperator()||!doc)return;await this.client.from('studio_docs').upsert({collection,id:doc.id,data:doc,updated_by:this.user.id})},
  async deleteDoc(collection,id){if(!this.client||!this.isOperator())return;await this.client.from('studio_docs').delete().match({collection,id})},
  async pullStudio(){
    if(!this.client||!this.isOperator())return;
    const {data}=await this.client.from('studio_docs').select('collection,id,data');
    if(!data)return;
    for(const n of ['projects','clients','audits','updates','custom']){const rows=data.filter(r=>r.collection===n).map(r=>r.data);if(rows.length){const loc=ls.get(K[n],[]).filter(x=>!rows.some(r=>r.id===x.id));ls.set(K[n],[...rows,...loc])}}
    const ov=ls.get(K.overrides,{});data.filter(r=>r.collection==='overrides').forEach(r=>{const {id,...rest}=r.data;ov[id]={...(ov[id]||{}),...rest}});ls.set(K.overrides,ov);
  },
  async publishLaunch(id){
    if(!this.client||!this.isOperator())return;
    const l=LP.allLaunches().find(x=>x.id===id); if(!l)return;
    await this.client.from('launches').upsert({id:l.id,name:l.name,category:l.category,status:l.status,tone:l.tone,tagline:l.tagline,site:l.site,interest:l.interest||0,roles:l.roles,milestones:l.milestones.filter(m=>m.approved&&m.published),image:l.image||null,video:l.video||null,screenshots:l.screenshots||[],launch_url:l.launchUrl||null,target_date:l.targetDate||null,visibility:l.visibility});
  },
  async publishUpdate(u){
    if(!this.client||!this.isOperator())return;
    if(u.state==='draft'){await this.client.from('launch_updates').delete().eq('id',u.id);return}
    await this.client.from('launch_updates').upsert({id:u.id,launch_id:u.launchId,type:u.type,title:u.title,body:u.body,media_url:u.mediaUrl||null,state:u.state,publish_at:u.publishAt||null});
  }
};
})();
