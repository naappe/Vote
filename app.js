const SUPABASE_URL='https://espezmdpkoixnfchomqb.supabase.co';
const SUPABASE_KEY='sb_publishable_xP8z74zcMuCkj6xlu1bJ3w_Kudqbcu1';
const TABLE_NAME='2026';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let residents=[];
let activeFilter='all';
const list=document.querySelector('#residentList');
const searchInput=document.querySelector('#residentSearch');
const filterButton=document.querySelector('#filterButton');
const databaseStatus=document.querySelector('#databaseStatus');
const toast=document.querySelector('#toast');

const safe=value=>value===null||value===undefined?'':String(value);
const initials=name=>safe(name).trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'V';
const isReached=r=>r.reach_status==='reached'||r.phone_status==='called'||['will-vote','not-vote'].includes(r.vote_status)||r.support_level==='guaranteed';
const needsCall=r=>r.phone_status==='need-call'||(!r.phone_status&&!isReached(r));
const needsVisit=r=>r.d2d_status==='not-visited'||!r.d2d_status;
const needsReview=r=>r.vote_status==='not-decided'||!r.vote_status;
const isAssigned=r=>Boolean(r.vote_assigned_by||r.assigned_to||r.call_center_agent);
const percent=(done,total)=>total?Math.round(done/total*100):0;

function note(text){toast.textContent=text;toast.classList.add('show');clearTimeout(window.tt);window.tt=setTimeout(()=>toast.classList.remove('show'),2400)}
function setText(id,value){const el=document.querySelector(`#${id}`);if(el)el.textContent=value}
function setBar(id,value){const el=document.querySelector(`#${id}`);if(el)el.style.width=`${Math.max(0,Math.min(100,value))}%`}

function residentStatus(r){
  if(r.support_level==='guaranteed')return['confirmed','Guaranteed'];
  if(r.vote_status==='will-vote')return['confirmed','Will vote'];
  if(needsCall(r))return['pending','Needs call'];
  if(needsVisit(r))return['pending','Needs visit'];
  return['confirmed','Reached'];
}

function filteredResidents(query=''){
  const q=query.trim().toLowerCase();
  return residents.filter(r=>{
    const matchesText=!q||[r.name,r.national_id,r.house,r.lives_in,r.phone,r.mobile,r.official_address].some(v=>safe(v).toLowerCase().includes(q));
    const matchesFilter=activeFilter==='all'||(activeFilter==='calls'&&needsCall(r))||(activeFilter==='visits'&&needsVisit(r))||(activeFilter==='reviews'&&needsReview(r));
    return matchesText&&matchesFilter;
  });
}

function render(query=''){
  const rows=filteredResidents(query);
  list.innerHTML='';
  if(!rows.length){list.innerHTML='<div class="empty-state">No matching residents found.</div>';return}
  rows.slice(0,80).forEach(r=>{
    const [statusClass,statusLabel]=residentStatus(r);
    const card=document.createElement('article');
    card.className='resident-card';
    const address=safe(r.house||r.official_address||r.lives_in||r.living_place||'Address unavailable');
    const id=safe(r.national_id||r.id||'No ID');
    const phone=safe(r.phone||r.mobile);
    card.innerHTML=`<div class="resident-avatar">${initials(r.name)}</div><div class="resident-info"><b>${safe(r.name)||'Unnamed resident'}</b><small>${id} · ${address}${phone?` · ${phone}`:''}</small></div><span class="badge ${statusClass}">${statusLabel}</span>`;
    list.appendChild(card);
  });
  if(rows.length>80){const more=document.createElement('div');more.className='empty-state';more.textContent=`Showing 80 of ${rows.length.toLocaleString()} matching residents. Use search to narrow the list.`;list.appendChild(more)}
}

function updateDashboard(){
  const total=residents.length;
  const calls=residents.filter(needsCall).length;
  const visits=residents.filter(needsVisit).length;
  const reviews=residents.filter(needsReview).length;
  const reached=residents.filter(isReached).length;
  const assigned=residents.filter(isAssigned).length;
  const callDone=total-calls;
  const visitDone=total-visits;
  const reachedPct=percent(reached,total);
  const callPct=percent(callDone,total);
  const visitPct=percent(visitDone,total);
  const assignPct=percent(assigned,total);

  setText('callsCount',calls.toLocaleString());
  setText('visitsCount',visits.toLocaleString());
  setText('reviewsCount',reviews.toLocaleString());
  setText('callsDetail',`${calls.toLocaleString()} residents still need a call`);
  setText('visitsDetail',`${visits.toLocaleString()} residents are not yet visited`);
  setText('reviewsDetail',`${reviews.toLocaleString()} vote statuses need review`);
  setText('progressPercent',`${reachedPct}%`);
  setText('callsPercent',`${callPct}%`);
  setText('visitsPercent',`${visitPct}%`);
  setText('assignPercent',`${assignPct}%`);
  setBar('callsBar',callPct);setBar('visitsBar',visitPct);setBar('assignBar',assignPct);
  const ring=document.querySelector('#progressRing');
  if(ring)ring.style.background=`conic-gradient(#789b83 0 ${reachedPct}%,#dfe9df ${reachedPct}% 100%)`;
  setText('healthTitle',reachedPct>=75?'Steady and positive':reachedPct>=45?'Moving forward':'Needs gentle attention');
  setText('healthText',`${reached.toLocaleString()} of ${total.toLocaleString()} residents have been reached. Calls, visits and assignments are calculated from live records.`);
  setText('healthMessage',`${reached.toLocaleString()} residents reached from ${total.toLocaleString()} live database records.`);
  databaseStatus.textContent=`Live · ${total.toLocaleString()} residents loaded`;
}

async function loadAllResidents(){
  databaseStatus.textContent='Loading residents from Supabase…';
  const pageSize=1000;
  let from=0;
  const all=[];
  try{
    while(true){
      const {data,error}=await db.from(TABLE_NAME).select('*').range(from,from+pageSize-1);
      if(error)throw error;
      const batch=data||[];
      all.push(...batch);
      if(batch.length<pageSize)break;
      from+=pageSize;
    }
    residents=all;
    updateDashboard();
    render(searchInput.value);
    note(`${residents.length.toLocaleString()} residents connected`);
  }catch(error){
    console.error('Supabase load failed:',error);
    databaseStatus.textContent='Database connection failed';
    list.innerHTML=`<div class="empty-state"><b>Could not load residents.</b><br>${safe(error.message)||'Check Supabase table access and Row Level Security.'}</div>`;
    setText('healthTitle','Connection needs attention');
    setText('healthText','The website reached Supabase but the residents table could not be read. Check the public SELECT policy for table “2026”.');
    note('Supabase connection failed');
  }
}

searchInput.addEventListener('input',e=>render(e.target.value));
const filters=['all','calls','visits','reviews'];
filterButton.onclick=()=>{
  const next=(filters.indexOf(activeFilter)+1)%filters.length;
  activeFilter=filters[next];
  filterButton.textContent={all:'All',calls:'Needs call',visits:'Needs visit',reviews:'Needs review'}[activeFilter];
  render(searchInput.value);
};

document.querySelectorAll('.care-card button,.priority-list button').forEach(b=>b.onclick=()=>note('Live section opened'));
document.querySelector('#continueButton').onclick=()=>{document.querySelector('.priorities').scrollIntoView({behavior:'smooth'});note("Today's live priorities are ready")};
document.querySelector('#viewResidents').onclick=()=>document.querySelector('.people').scrollIntoView({behavior:'smooth'});
const modal=document.querySelector('#searchModal'),globalSearch=document.querySelector('#globalSearch');
function openSearch(){modal.classList.add('open');setTimeout(()=>globalSearch.focus(),40)}
function closeSearch(){modal.classList.remove('open')}
document.querySelector('#searchButton').onclick=openSearch;
document.querySelector('#closeSearch').onclick=closeSearch;
modal.onclick=e=>{if(e.target===modal)closeSearch()};
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}if(e.key==='Escape')closeSearch()});
document.querySelectorAll('.search-box>button').forEach(b=>b.onclick=()=>{closeSearch();note(b.textContent.trim())});
document.querySelectorAll('.topbar nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.topbar nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');note(`${b.textContent} selected`)});
const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.1});
document.querySelectorAll('.reveal').forEach(e=>observer.observe(e));

loadAllResidents();