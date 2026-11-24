/* Seeded launches — preserved from LaunchPage.link v1 (do not edit without a migration).
   Optional v2 fields per launch: image, video, screenshots[], launchUrl, targetDate. */
window.SEED_LAUNCHES = [
  {id:'voyus',name:'VOYUS',category:'Transportation',status:'Private Beta',tone:'beta',tagline:'Group transportation marketplace connecting riders, planners, and operators.',site:'voyus.app',interest:438,roles:['Riders','Operators','Corporate Planners','Beta Testers'],milestones:[['Branding',1],['Mobile PWA',1],['Operator Flow',1],['Supabase Backend',0],['Payments',0],['Public Launch',0]]},
  {id:'tourvue',name:'TourVue',category:'Travel',status:'Alpha Build',tone:'beta',tagline:'Live tourism platform where viewers connect with guides in real time.',site:'tourvue.live',interest:214,roles:['Guides','Travelers','Viewers','Real Estate Hosts'],milestones:[['Branding',1],['Viewer Mode',1],['Guide Mode',1],['Streaming Layer',0],['Guide Payouts',0],['Public Launch',0]]},
  {id:'thenwe',name:'ThenWe',category:'Social',status:'Concept Validation',tone:'idea',tagline:'Meet people through shared activities, trips, and real-world experiences.',site:'thenwe.link',interest:171,roles:['Social Users','Event Hosts','Travelers','Beta Testers'],milestones:[['Concept',1],['Map UI',1],['Profile Flow',1],['Calendar Sync',0],['Safety Tools',0],['Public Launch',0]]},
  {id:'kayaos',name:'Kayaos',category:'Productivity',status:'Prototype',tone:'beta',tagline:'Organize tasks, reminders, locations, and urgency through adaptive cards.',site:'kayaos.space',interest:126,roles:['Busy Parents','Students','Professionals','ADHD-Friendly Testers'],milestones:[['Branding',1],['Task Cards',1],['Calendar View',1],['Sound Alerts',0],['Location Reminders',0],['Public Launch',0]]},
  {id:'piggybrain',name:'PiggyBrain',category:'Education',status:'Concept Validation',tone:'idea',tagline:'Micro-scholarships and achievement rewards for students, teams, and schools.',site:'piggybrain.app',interest:193,roles:['Parents','Students','Teachers','Sponsors','Schools'],milestones:[['Concept',1],['Student Profiles',1],['Sponsor Model',1],['School Pilot',0],['Payments',0],['Public Launch',0]]},
  {id:'ratestar',name:'RateStar',category:'Feedback',status:'Prototype',tone:'beta',tagline:'Feedback without the noise through private Think Rooms and business insight.',site:'ratestar.fyi',interest:102,roles:['Consumers','Businesses','Moderators','Beta Testers'],milestones:[['Branding',1],['Think Rooms',1],['Feedback Flow',1],['Business Dashboard',0],['Subdomains',0],['Public Launch',0]]},
  {id:'merkuri',name:'Merkuri',category:'Delivery',status:'Concept Validation',tone:'idea',tagline:'Launch, scale and manage local micro-delivery. Compare real couriers, watch video profiles, compare rates, capture proof of delivery and pay with SecurePay escrow.',site:'merkuri.app',image:'img/launches/merkuri.jpg',interest:88,roles:['Shoppers','Customers','Delivery Drivers','Local Stores'],milestones:[['Concept',1],['Camera Flow',1],['RateSync Model',1],['Shopper Accounts',0],['Payments',0],['Public Launch',0]]},
  {id:'snaplery',name:'Snaplery',category:'Media',status:'Prototype',tone:'beta',tagline:'Photo booth and event media tools for capture, sharing, CRM, and galleries.',site:'snaplery.com',interest:76,roles:['Photographers','Event Hosts','Venues','Guests'],milestones:[['Branding',1],['Camera UI',1],['Gallery Flow',1],['Guest PINs',0],['CRM Export',0],['Public Launch',0]]},
  {id:'domin8',name:'Domin8',category:'Income',status:'Concept Validation',tone:'idea',tagline:'Help hourly workers supplement income beyond the 9-to-5.',site:'domin8925.com',interest:141,roles:['Hourly Workers','Side Hustlers','Employers','Partners'],milestones:[['Concept',1],['Branding',1],['PWA UI',1],['Opportunity Feed',0],['User Accounts',0],['Public Launch',0]]},
  {id:'thrifteyes',name:'ThriftEyes',category:'Commerce',status:'Concept Validation',tone:'idea',tagline:'Virtual and in-person yard, estate, resale, and hosted consignment discovery.',site:'thrifteyes.com',interest:95,roles:['Sellers','Hosts','Buyers','Estate Organizers'],milestones:[['Concept',1],['Map UI',1],['AI Listing Agent',1],['Host Yard Flow',0],['Payments',0],['Public Launch',0]]},
  {id:'vewr',name:'VEWR',category:'Entertainment',status:'Prototype',tone:'beta',tagline:'Movie companion, recap, ticketing, and on-demand streaming experience.',site:'vewr.link',interest:118,roles:['Movie Fans','Theaters','Streamers','Beta Testers'],milestones:[['Branding',1],['Player UI',1],['Library',1],['Geo Theater Mode',0],['Ticketing',0],['Public Launch',0]]},
  {id:'blockmogul',name:'BlockMogul',category:'Gaming',status:'Prototype',tone:'beta',tagline:'Map-based real estate strategy game with property cards and portfolio growth.',site:'blockmogul.games',interest:67,roles:['Gamers','Real Estate Fans','Testers','Creators'],milestones:[['Concept',1],['Map Cards',1],['Portfolio UI',1],['Game Economy',0],['Accounts',0],['Public Launch',0]]},
  {id:'onedrful',name:'OneDrful',category:'Promotion',status:'Concept Validation',tone:'idea',tagline:'Referral promotion network connecting businesses with individual promoters.',site:'onedrful.app',interest:84,roles:['Promoters','Businesses','Creators','Local Brands'],milestones:[['Concept',1],['Account Types',1],['QR Links',1],['Wallets',0],['Compliance',0],['Public Launch',0]]}
];

/* Renamed launches: old id → new id (old links and saved data keep working). */
window.LAUNCH_ALIASES={shoppervon:'merkuri'};

/* Real app logos (copied from each app's Hunnyhive icon) and its Hunnyhive store slug. */
window.SEED_LAUNCHES.forEach(l=>{ l.logo='img/logos/'+l.id+'.png'; l.hh=({thrifteyes:'thrifteye'})[l.id]||l.id; });

window.HELP_ROLES=['Customer','Beta Tester','Partner','Promoter','Investor','Supplier','Creator','Sponsor','Operator','Guide','Teacher','Driver','Photographer','Marketing','Feedback','Developer','Designer'];

/* Generated brand cover art (used until a real image/screenshot is uploaded for the launch). */
(function(){
  const hues={Delivery:186,Transportation:188,Travel:200,Social:172,Productivity:192,Education:178,Feedback:196,Shopping:184,Media:190,Income:170,Commerce:180,Gaming:194,Entertainment:186,Promotion:176};
  function hash(s){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)}
  window.launchArt=function(l,{w=640,h=360,big=false}={}){
    const hu=hues[l.category]??(hash(l.category||'x')%40+170), k=hash(l.id||l.name), gid='g'+k%100000;
    const cx=(k%5)*0.1+.55, ry=((k>>3)%4)*0.08+.12;
    const name=(l.name||'').replace(/[<&>"]/g,'');
    const fs=big?Math.min(110,Math.round(w*.9/Math.max(name.length,3))):Math.min(70,Math.round(w*.82/Math.max(name.length,3)));
    let rings='';for(let i=1;i<6;i++)rings+=`<circle cx="${w*cx}" cy="${h*ry}" r="${i*w*.12}" fill="none" stroke="hsla(${hu},100%,70%,${.22-i*.03})" stroke-width="1.2"/>`;
    let gridl='';for(let x=0;x<w;x+=40)gridl+=`<path d="M${x} ${h*.62}L${w/2+(x-w/2)*2.2} ${h}" stroke="hsla(${hu},100%,60%,.12)"/>`;
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${name} cover art">
<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hu},55%,16%)"/><stop offset=".6" stop-color="hsl(${hu+10},60%,9%)"/><stop offset="1" stop-color="hsl(${hu-8},70%,6%)"/></linearGradient>
<radialGradient id="${gid}r" cx="${cx}" cy="${ry}" r=".7"><stop offset="0" stop-color="hsla(${hu},100%,55%,.55)"/><stop offset="1" stop-color="hsla(${hu},100%,50%,0)"/></radialGradient></defs>
<rect width="${w}" height="${h}" fill="url(#${gid})"/><rect width="${w}" height="${h}" fill="url(#${gid}r)"/>${rings}${gridl}
<path d="M0 ${h*.62}H${w}" stroke="hsla(${hu},100%,65%,.35)"/>
<text x="${w*.06}" y="${h*.9}" font-family="Inter,system-ui,sans-serif" font-weight="900" font-style="italic" font-size="${fs}" fill="#F5FAFC" letter-spacing="-1">${name}</text>
<text x="${w*.065}" y="${h*.9-fs*.95}" font-family="Inter,system-ui,sans-serif" font-weight="700" font-size="${Math.round(fs*.24)+6}" fill="hsl(${hu},100%,70%)" letter-spacing="3">${(l.category||'').toUpperCase()}</text></svg>`;
  };
})();
