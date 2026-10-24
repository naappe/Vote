'use client';
import Link from 'next/link';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useMemo,useRef,useState} from 'react';
import {getDirectoryFilterOptions,getDirectoryPage,getMdpHouseOptions,getMdpRosterPage,getResidents,saveCallCenterResult,saveDoorToDoorResult,supabase} from '../lib/supabase';
import {readOperationalRows,saveTransportation} from '../lib/operations';
import {collectDirectoryPages,residentsCsv} from '../lib/directory-utils';
import {buildExcelWorkbook,type ExcelSheet} from '../lib/excel-export';
import type {HouseOption,PartyOption} from '../lib/supabase';
import type {CallOutcome,Resident,VoteStatus} from '../lib/types';
import {residentTaskCards} from '../lib/resident-task-presentation';
import {ResidentTaskIcon} from './ResidentTaskIcon';
import {useStaffAccess} from './AuthGate';

type ViewMode='list'|'gallery';
type Props={profilePath?:string;partyControls?:boolean};
type WorkflowSummary={hasCallRecord:boolean;callOutcome:string|null;callAttempts:number;voteStatus:string|null;hasVoteIntention:boolean;lastCallAt:string|null;visitStatus:string|null;lastVisitAt:string|null;transportStatus:string|null;transportNote:string|null;latestRemark:string|null;writtenRemarks:string[];hasRemarks:boolean;hasInPersonMeeting:boolean};
const focusOptions=[['all','All residents'],['missing-phone','Missing phone'],['call-pending','Pending calls'],['need-call','Need call'],['called','Called'],['reached','Reached'],['connected','Connected'],['visit-pending','Pending visits'],['visited','Visited'],['not-visited','Not visited'],['assignment-pending','Unassigned'],['unassigned','Unassigned (legacy)'],['remarks','Remarks recorded'],['remarks-pending','No remarks yet'],['transport-pending','Not requested'],['transport','Transport recorded'],['vote-pending','Not asked yet'],['vote-unsure','Not sure yet'],['will-vote','Will vote'],['not-vote','Will not vote'],['undecided','Undecided (all)']] as const;
const meetingWasCompleted=(remark:string)=>/^Meeting result:\s*Met resident in person\b|^Met resident in person\b/i.test(remark.trim());
export default function VoterManagementContent({profilePath='/resident-profile/',partyControls=true}:Props={}){
 const pathname=usePathname(),router=useRouter(),params=useSearchParams(),resultsRef=useRef<HTMLElement>(null);
 const workflowPageCache=useRef<Map<string,{data:Record<string,WorkflowSummary>;expires:number}>>(new Map());
 const updateVisibleWorkflow=(id:string|number,summary:WorkflowSummary)=>{workflowPageCache.current.clear();setWorkflow(current=>({...current,[String(id)]:summary}))};
 const initial=(key:string)=>params.get(key)||'all';
 const [pdfSerials,setPdfSerials]=useState<Record<string,number>>({});
 const [rosterTotals,setRosterTotals]=useState<{total:number;linked:number;pending:number}|null>(null);
 const [targetCounts,setTargetCounts]=useState<Record<string,number>|null>(null);
 const targetRoute=params.get('target')==='1';
 useEffect(()=>{if(partyControls||!targetRoute)return;let active=true;const empty={search:'',house:'all',gender:'all',age:'all',box:'all',party:'all'};void Promise.all((['will-vote','not-vote','vote-unsure','vote-pending'] as const).map(async status=>[status,(await getMdpRosterPage(empty,1,1,true,status)).count] as const)).then(entries=>{if(active)setTargetCounts(Object.fromEntries(entries))}).catch(()=>{if(active)setTargetCounts(null)});return()=>{active=false}},[partyControls,targetRoute]);

 useEffect(()=>{if(partyControls)return;let mounted=true;void supabase.rpc('mdp_2026_roster_counts').then(({data,error})=>{if(mounted&&!error&&data)setRosterTotals({total:Number(data.total)||0,linked:Number(data.linked)||0,pending:Number(data.pending)||0})});return()=>{mounted=false}},[partyControls]);
 const [serialInput,setSerialInput]=useState(()=>params.get('serial')||'');
 const [serialFilter,setSerialFilter]=useState(()=>params.get('serial')||'');
 const [rows,setRows]=useState<Resident[]>([]),[workflow,setWorkflow]=useState<Record<string,WorkflowSummary>>({}),[workflowError,setWorkflowError]=useState(''),[houses,setHouses]=useState<HouseOption[]>([]),[parties,setParties]=useState<PartyOption[]>([]),[boxes,setBoxes]=useState<string[]>([]),[loading,setLoading]=useState(true),[filtersLoading,setFiltersLoading]=useState(false),[filtersLoaded,setFiltersLoaded]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{
  if(partyControls||rows.length===0){setPdfSerials({});return}
  let active=true;
  const ids=rows.map(row=>Number(row.id)).filter(Number.isFinite);
  setPdfSerials({});
  void supabase.rpc('mdp_visible_pdf_serials',{p_resident_ids:ids}).then(({data,error})=>{
   if(!active)return;
   if(error){setPdfSerials({});return}
   setPdfSerials(Object.fromEntries(((data||[]) as {resident_id:number;pdf_serial:number}[]).map(item=>[String(item.resident_id),item.pdf_serial])));
  });
  return()=>{active=false};
 },[rows,partyControls]);
 const [focus,setFocus]=useState(()=>params.get('focus')||'all');
 // Next.js preserves the component when navigating between query-only task links.
 // Synchronize the selected task before updating the URL again.
 const incomingFocus=params.get('focus')||'all';
 useEffect(()=>{setFocus(current=>current===incomingFocus?current:incomingFocus);setPage(1)},[incomingFocus]);
 const [mdpView,setMdpView]=useState<'grid'|'house'|'compact'>('grid');
 const [query,setQuery]=useState(()=>params.get('q')||''),[debouncedQuery,setDebouncedQuery]=useState(()=>params.get('q')||''),[house,setHouse]=useState(()=>initial('house')),[party,setParty]=useState(()=>partyControls?initial('party'):'all'),[gender,setGender]=useState(()=>initial('gender')),[age,setAge]=useState(()=>initial('age')),[box,setBox]=useState(()=>initial('box')),[page,setPage]=useState(()=>Math.max(1,Number(params.get('page'))||1)),[count,setCount]=useState(0),[view,setView]=useState<ViewMode>(()=>!partyControls||params.get('view')==='gallery'?'gallery':'list'),[pageSize,setPageSize]=useState(50),[exporting,setExporting]=useState(false),[exportProgress,setExportProgress]=useState('');
 const filters=useMemo(()=>({search:debouncedQuery,house,party:partyControls?party:'MDP',gender,age,box:partyControls?box:'all'}),[debouncedQuery,house,party,partyControls,gender,age,box]);
 function loadFilters(){
  if(filtersLoaded||filtersLoading)return;
  setFiltersLoading(true);
  const request=partyControls?getDirectoryFilterOptions():getMdpHouseOptions();
  Promise.resolve(request).then(result=>{
   if(partyControls){
    const data=result as Awaited<ReturnType<typeof getDirectoryFilterOptions>>;
    setHouses(data.houses);setParties(data.parties);setBoxes(data.boxes);
   }else setHouses(result as Awaited<ReturnType<typeof getMdpHouseOptions>>);
   setFiltersLoaded(true);
  }).catch(e=>setError(e instanceof Error?e.message:'Unable to load filters')).finally(()=>setFiltersLoading(false));
 }
 useEffect(()=>{const timer=window.setTimeout(()=>setDebouncedQuery(query),250);return()=>window.clearTimeout(timer)},[query]);
 useEffect(()=>{const timer=window.setTimeout(()=>setSerialFilter(serialInput),160);return()=>window.clearTimeout(timer)},[serialInput]);
 useEffect(()=>{
  const next=new URLSearchParams();if(debouncedQuery)next.set('q',debouncedQuery);if(!partyControls&&serialFilter)next.set('serial',serialFilter);
  for(const [key,value] of Object.entries({house,party:partyControls?party:'all',gender,age,box:partyControls?box:'all'}))if(value!=='all')next.set(key,value);
  if(focus!==incomingFocus)return;
  if(focus!=='all')next.set('focus',focus);if(!partyControls&&targetRoute)next.set('target','1');if(page>1)next.set('page',String(page));if(view==='gallery'&&partyControls)next.set('view','gallery');
  const base=pathname.startsWith('/Vote')?pathname:`/Vote${pathname}`;
  const desired=`${base}${next.size?'?'+next.toString():''}`;
  if(window.location.pathname+window.location.search!==desired)window.history.replaceState(null,'',desired);
 },[debouncedQuery,serialFilter,house,party,partyControls,gender,age,box,focus,incomingFocus,page,view,pathname,targetRoute]);
 useEffect(()=>{let active=true;setLoading(true);setError('');setWorkflowError('');if(!partyControls)setWorkflow({});
  void(async()=>{try{const result=!partyControls&&serialFilter?await (async()=>{
   const serial=Number(serialFilter);
   if(!Number.isSafeInteger(serial)||serial<1||serial>540)return {rows:[] as Resident[],count:0};
   const linked=await supabase.rpc('mdp_resident_for_pdf_serial',{p_serial:serial});
   if(linked.error)throw new Error('MDP serial search failed: '+linked.error.message);
   if(linked.data===null)return {rows:[] as Resident[],count:0};
   const {data,error:residentError}=await supabase.from('Resident').select('*').eq('id',linked.data).maybeSingle();
   if(residentError)throw new Error('Resident lookup failed: '+residentError.message);
   if(!data)return {rows:[] as Resident[],count:0};
   return {rows:[{...data,phone:data.phone==null?null:String(data.phone)} as Resident],count:1};
  })():focus==='all'?await (partyControls?getDirectoryPage(filters,page,pageSize):getMdpRosterPage(filters,page,pageSize)):await (async()=>{if(!partyControls)return getMdpRosterPage(filters,page,pageSize,false,focus);const [all,operational]=await Promise.all([partyControls?getResidents():collectDirectoryPages(p=>getMdpRosterPage(filters,p,500)),(async()=>focus==='visited'||focus==='not-visited'?await readOperationalRows('door_to_door','resident_id,visit_status'):focus==='unassigned'?await readOperationalRows('assignments','resident_id,status'):focus==='remarks'?await readOperationalRows('remarks','resident_id,section,remark'):focus==='transport'?await readOperationalRows('transportation','resident_id,transport_status'):[])()]);const opMap=new Map(operational.filter(row=>focus!=='remarks'||!row.section||row.section==='general').map(row=>[String(row.resident_id),row]));const matches=(r:Resident)=>{const op=opMap.get(String(r.id));switch(focus){case 'missing-phone':return !String(r.phone||'').trim();case 'need-call':return r.phone_status!=='called';case 'called':return r.phone_status==='called';case 'reached':return r.reach_status==='reached';case 'connected':return r.call_outcome==='connected';case 'visited':return op?.visit_status==='visited';case 'not-visited':return op?.visit_status!=='visited';case 'unassigned':return !op||op.status==='inactive';case 'remarks':return Boolean(op?.remark);case 'transport':return Boolean(op?.transport_status);case 'will-vote':return r.vote_status==='will-vote';case 'not-vote':return r.vote_status==='not-vote';case 'undecided':return !r.vote_status||r.vote_status==='not-decided';default:return true}};const term=filters.search.trim().toLowerCase();const filtered=all.filter(r=>(partyControls||r.party==='MDP')&&(filters.party==='all'||r.party===filters.party)&&(filters.house==='all'||!partyControls||r.house===filters.house)&&(filters.gender==='all'||String(r.sex||'').toUpperCase()===filters.gender)&&(filters.age==='all'||(filters.age==='61+'?Number(r.age)>=61:(()=>{const [lo,hi]=filters.age.split('-').map(Number);return Number(r.age)>=lo&&Number(r.age)<=hi})()))&&(filters.box==='all'||r.election_box===filters.box)&&(!term||[r.id,r.name,r.national_id,r.house,r.phone,r.lives_in].some(v=>String(v||'').toLowerCase().includes(term)))&&matches(r));return {rows:filtered.slice((page-1)*pageSize,page*pageSize),count:filtered.length}})();if(!active)return;setRows(result.rows);setCount(result.count);setLoading(false);const max=Math.max(1,Math.ceil(result.count/pageSize));if(page>max)setPage(max);
   if(!partyControls&&result.rows.length){const ids=result.rows.map(row=>row.id);const cacheKey=ids.join(',');const cachedSummary=workflowPageCache.current.get(cacheKey);if(cachedSummary&&cachedSummary.expires>Date.now()){setWorkflow(cachedSummary.data);return;}const [callRows,visitRows,transportRows,remarkRows]=await Promise.all([
    supabase.from('call_center').select('resident_id,call_outcome,call_attempts,vote_status,last_call_at').in('resident_id',ids),
    supabase.from('door_to_door').select('resident_id,visit_status,last_visit_at').in('resident_id',ids),
    supabase.from('transportation').select('resident_id,transport_status,notes').in('resident_id',ids),
    supabase.from('remarks').select('resident_id,section,remark,recorded_at').in('resident_id',ids).order('recorded_at',{ascending:false}).limit(1000),
   ]);if(!active)return;const statusError=callRows.error||visitRows.error||transportRows.error||remarkRows.error;if(statusError){setWorkflowError('Task history could not load. Refresh before repeating a task.');return}const calls=new Map((callRows.data||[]).map(row=>[String(row.resident_id),row])),visits=new Map((visitRows.data||[]).map(row=>[String(row.resident_id),row])),transports=new Map((transportRows.data||[]).map(row=>[String(row.resident_id),row])),latestRemarks=new Map<string,string>(),writtenRemarks=new Map<string,string[]>();for(const row of remarkRows.data||[]){const key=String(row.resident_id);if(row.section!=='voting-intention'){const raw=String(row.remark||'').trim();const section=String(row.section||'general');let note=raw;if(section==='transport'){const match=raw.match(/(?:^|\.)\s*Note:\s*(.+)$/i);note=match?.[1]?.trim()||''}else if(section!=='general'){const explicit=raw.match(/(?:^|[.\\n])\s*Note:\s*([\s\S]+)$/i);const candidate=explicit?.[1]?.trim()||'';note=candidate&&!/^(?:none|n\/a|pending|not recorded)$/i.test(candidate)?candidate:'';}if(note){const label=({general:'Remark',transport:'Transport',call:'Call','call-center':'Call','door-to-door':'Door-to-door','in-person-meeting':'Meeting'} as Record<string,string>)[section]||'Remark';const entry=label+': '+note;const current=writtenRemarks.get(key)||[];if(!current.some(item=>item.toLowerCase()===entry.toLowerCase())){current.push(entry);writtenRemarks.set(key,current)}if(!latestRemarks.has(key))latestRemarks.set(key,note)}}}const residentsWithRemarks=new Set(writtenRemarks.keys());const latestVoteHistory=new Map<string,string>();for(const row of remarkRows.data||[]){const key=String(row.resident_id);if(row.section==='voting-intention'&&!latestVoteHistory.has(key))latestVoteHistory.set(key,String(row.remark||''))}const latestMeeting=new Map<string,string>();for(const row of remarkRows.data||[]){const key=String(row.resident_id);if(row.section==='in-person-meeting'&&!latestMeeting.has(key))latestMeeting.set(key,String(row.remark||''))}const residentsWithMeetings=new Set([...latestMeeting].filter(([,remark])=>meetingWasCompleted(remark)).map(([key])=>key));const summary:Record<string,WorkflowSummary>={};for(const resident of result.rows){const key=String(resident.id),call=calls.get(key),visit=visits.get(key),transport=transports.get(key);summary[key]={hasCallRecord:Boolean(call),callOutcome:call?.call_outcome||null,callAttempts:Number(call?.call_attempts||0),voteStatus:call?.vote_status||null,hasVoteIntention:Boolean(call?.vote_status&&call.vote_status!=='not-decided')||(call?.vote_status==='not-decided'&&Boolean(latestVoteHistory.get(key)&&!latestVoteHistory.get(key)!.startsWith('Intention pending:'))),lastCallAt:call?.last_call_at||null,visitStatus:visit?.visit_status||null,lastVisitAt:visit?.last_visit_at||null,transportStatus:transport?.transport_status||null,transportNote:transport?.notes||null,latestRemark:latestRemarks.get(key)||null,writtenRemarks:writtenRemarks.get(key)||[],hasRemarks:residentsWithRemarks.has(key),hasInPersonMeeting:residentsWithMeetings.has(key)}}if(workflowPageCache.current.size>=12)workflowPageCache.current.clear();workflowPageCache.current.set(cacheKey,{data:summary,expires:Date.now()+20000});setWorkflow(summary)
   }else if(!partyControls)setWorkflow({});
  }catch(e){if(active)setError(e instanceof Error?e.message:'Unable to load residents')}finally{if(active)setLoading(false)}})();
  return()=>{active=false}
 },[filters,page,pageSize,focus,partyControls,serialFilter]);
 const pages=Math.max(1,Math.ceil(count/pageSize)),range=count?`${(page-1)*pageSize+1}–${Math.min(page*pageSize,count)}`:'0';
 const hasFilters=Boolean((!partyControls&&serialInput)||focus!=='all'||query||house!=='all'||(partyControls&&party!=='all')||gender!=='all'||age!=='all'||(partyControls&&box!=='all'));
 function changeFilter(setter:(value:string)=>void,value:string){setter(value);setPage(1)}
 function clearFilters(){router.push(pathname);setSerialInput('');setSerialFilter('');setFocus('all');setQuery('');setDebouncedQuery('');setHouse('all');setParty('all');setGender('all');setAge('all');setBox('all');setPage(1)}
 function selectSummaryFocus(value:string){const next=new URLSearchParams(window.location.search);if(value==='all')next.delete('focus');else next.set('focus',value);next.delete('page');setFocus(value);setPage(1);router.push(pathname+(next.size?'?'+next.toString():''))}
 function changePage(next:number){setPage(Math.min(pages,Math.max(1,next)));resultsRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}
 async function exportResults(){
  setExporting(true);setError('');setMessage('');setExportProgress('Checking export permission…');
  // Capture the complete filter state so changing controls cannot alter a running export.
  const selected={...filters,search:query.trim()};
  try{
   const {data:mayExport,error:permissionError}=await supabase.rpc('staff_has_feature_permission',{p_feature:'export'});
   if(permissionError||mayExport!==true)throw new Error(permissionError?'Unable to verify export permission.':'Export permission not granted by Admin.');
   const all=await collectDirectoryPages(p=>partyControls?getDirectoryPage(selected,p,500,true):getMdpRosterPage(selected,p,500),(loaded,total)=>setExportProgress(`${loaded.toLocaleString()} / ${total.toLocaleString()}`));
   let blob:Blob, filename:string;
   if(partyControls){
    blob=new Blob([residentsCsv(all)],{type:'text/csv;charset=utf-8'});
    filename=`residents-${selected.party!=='all'?selected.party.toLowerCase().replace(/[^a-z0-9]+/g,'-'):'all'}-${new Date().toISOString().slice(0,10)}.csv`;
   }else{
    setExportProgress('Loading authorized task records…');
    const tables=['call_center','door_to_door','remarks','transportation','election_day','assignments','resident_voting_status'] as const;
    const taskRows=await Promise.all(tables.map(table=>readOperationalRows(table)));
    const permitted=new Set(all.map(resident=>String(resident.id)));
    const datasets=taskRows.map(rows=>rows.filter(row=>permitted.has(String(row.resident_id))));
    const maps=datasets.map(rows=>new Map(rows.map(row=>[String(row.resident_id),row])));
    const fields:{name:string;fields:string[];index:number}[]=[
     {name:'Call Center',index:0,fields:['resident_id','phone_status','reach_status','call_outcome','vote_status','support_level','call_attempts','call_notes','callback_scheduled_at','last_call_at','recorded_by','updated_at','call_duration_seconds','next_action']},
     {name:'Door to Door',index:1,fields:['resident_id','visit_status','vote_status','support_level','visit_notes','last_visit_at','recorded_by','updated_at']},
     {name:'Remarks History',index:2,fields:['id','resident_id','section','remark','recorded_by','recorded_at','context','context_record_id']},
     {name:'Transportation',index:3,fields:['resident_id','transport_status','pickup_location','pickup_time','vehicle','driver_name','driver_phone','passenger_count','special_assistance','notes','assigned_by','completed_at','updated_at']},
     {name:'Election Day',index:4,fields:['resident_id','vote_status','support_level','transport_status','has_voted','voted_at','voted_marked_by','confirmed','confirmed_at','contact_method','contact_note','updated_at','reach_status','reached_at','reached_by']},
     {name:'Assignments',index:5,fields:['id','resident_id','assignee_name','assignment_type','status','assigned_by','assigned_at','completed_at','notes']},
     {name:'Voting Records',index:6,fields:['resident_id','voting_day_id','voted_at','recorded_by']}
    ];
    const identity=new Map(all.map(r=>[String(r.id),r]));
    const value=(item:Record<string,unknown>,field:string)=>{const v=item[field];return typeof v==='string'||typeof v==='number'||typeof v==='boolean'?v:v==null?'':JSON.stringify(v)};
    const sheets:ExcelSheet[]=[{
     name:'Residents & Status',
     headers:['Record ID','National ID','Name','Official address','Living now','Phone','Age','Gender','Election box','Call status','Call result','Door-to-door status','Voting intention','Latest remark','Transport status','Has voted','Assigned staff'],
     rows:all.map(r=>{const id=String(r.id);const call=maps[0].get(id),door=maps[1].get(id),transport=maps[3].get(id),election=maps[4].get(id);
      const remarks=datasets[2].filter(x=>String(x.resident_id)===id).sort((a,b)=>String(b.recorded_at||'').localeCompare(String(a.recorded_at||'')));
      const assignment=datasets[5].filter(x=>String(x.resident_id)===id&&x.status!=='inactive');
      return [r.id,r.national_id||'',r.name||'',r.house||'',r.lives_in||'',r.phone||'',r.age??'',r.sex||'',r.election_box||'',call?.phone_status||'Pending',call?.call_outcome||'Pending',door?.visit_status||'Pending',call?.vote_status||door?.vote_status||'Not decided',remarks[0]?.remark||'',transport?.transport_status||'Pending',election?.has_voted===true?'Yes':election?.has_voted===false?'No':'Pending',assignment.map(x=>x.assignee_name).filter(Boolean).join('; ')]}
     )}
    ];
    for(const section of fields){
     const records=datasets[section.index];
     sheets.push({name:section.name,headers:['Resident name','National ID',...section.fields.map(key=>key.replace(/_/g,' ').replace(/\b\w/g,char=>char.toUpperCase()))],rows:records.map(record=>{const r=identity.get(String(record.resident_id));return [r?.name||'',r?.national_id||'',...section.fields.map(key=>value(record,key))]})});
    }
    setExportProgress('Creating Excel workbook…');
    const bytes=buildExcelWorkbook(sheets);
    blob=new Blob([new Uint8Array(bytes)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    filename=`residents-mdp-full-${new Date().toISOString().slice(0,10)}.xlsx`;
   }
   const url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download=filename;
   document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
   setMessage(`Exported ${all.length.toLocaleString()} residents matching your filters${partyControls?' as CSV':' with saved task records in Excel'}.`);
  }catch(e){setError(e instanceof Error?e.message:'Export failed')}finally{setExporting(false);setExportProgress('')}
 }
 const isVoteTarget=targetRoute;
 const isDoorTask=!partyControls&&!isVoteTarget&&['visit-pending','visited','not-visited'].includes(focus);
 const isRemarksTask=!partyControls&&!isVoteTarget&&['remarks','remarks-pending'].includes(focus);
 const taskFilterOptions=isVoteTarget?([['all','All'],['will-vote','Will vote'],['not-vote','Will not vote'],['vote-unsure','Not sure'],['vote-pending','Not asked']] as const):isDoorTask?([['all','All'],['visit-pending','Pending'],['visited','Visited'],['not-visited','Not visited']] as const):isRemarksTask?([['all','All'],['remarks','Recorded'],['remarks-pending','No remarks']] as const):null;
 const workspaceTitle=partyControls?'Resident directory':isVoteTarget?'Vote Target':focus==='visit-pending'||focus==='visited'||focus==='not-visited'?'Door-to-door':focus==='remarks'||focus==='remarks-pending'?'Remarks':'Residents';
 return <div className={partyControls?"space-y-4":"mdp-residents-page"}>
  <section className={partyControls?"flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center":"mdp-reference-header"}>
    <div className="mdp-reference-title">{!partyControls&&<div className="mb-2 flex flex-wrap items-center gap-2">{hasFilters&&<button type="button" onClick={clearFilters} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100">All residents</button>}</div>}<h1 className={partyControls?"text-2xl":"text-2xl font-extrabold tracking-tight text-[#0b214b]"}>{workspaceTitle}</h1><p className="mt-1 text-xs text-body">{loading?'Loading results…':partyControls?`${count.toLocaleString()} residents`:rosterTotals?`${rosterTotals.total.toLocaleString()} PDF entries · ${rosterTotals.linked.toLocaleString()} matched · ${rosterTotals.pending} awaiting verification`:`${count.toLocaleString()} matched residents`}</p></div>
    {!partyControls&&isVoteTarget&&<div aria-label="Vote Target status summary" className="mdp-reference-stats">
      {([
        {label:'Matched',value:rosterTotals?.linked??540,tone:'blue'},
        {label:'Will vote',value:targetCounts?.['will-vote'],tone:'green'},
        {label:'Not recorded',value:targetCounts?.['vote-pending'],tone:'slate'},
        {label:'Not sure',value:targetCounts?.['vote-unsure'],tone:'amber'},
        {label:'Will not vote',value:targetCounts?.['not-vote'],tone:'red'}
      ] as const).map(stat=><div key={stat.label} className={`mdp-reference-stat mdp-kpi-${stat.tone}`}><strong>{stat.value===undefined?'…':stat.value}</strong><span>{stat.label}</span></div>)}
    </div>}
    <button className="btn-primary mdp-reference-export" onClick={exportResults} disabled={exporting||loading||focus!=='all'||Boolean(serialFilter)} title={focus==='all'&&!serialFilter?'Download all matching residents across every page':'Clear the task status filter to export the full directory'}>{exporting?`Exporting ${exportProgress}`:partyControls?'Export CSV':'↓ Export Excel'}</button>
  </section>

<style>{`@media(max-width:640px){
.mdp-reference-filters{padding:10px 12px!important;margin:0 0 6px!important}
.mdp-polished-filter-grid{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;column-gap:10px!important;row-gap:8px!important;align-items:end!important}
.mdp-polished-filter-grid>.mdp-reference-search{grid-column:1/-1!important;min-width:0!important}
.mdp-polished-filter-grid>.mdp-reference-area{grid-column:1!important;grid-row:2!important;min-width:0!important;width:100%!important}
.mdp-polished-filter-grid>.mdp-reference-serial{grid-column:2!important;grid-row:2!important;min-width:0!important;width:100%!important}
.mdp-polished-filter-grid>.mdp-reference-clear{grid-column:2!important;grid-row:3!important;justify-self:end!important;min-height:32px!important;padding:5px 12px!important}
.mdp-polished-filter-grid .field,.mdp-polished-filter-grid select{width:100%!important;min-width:0!important;max-width:100%!important}
.mdp-polished-filter-grid label{min-width:0!important}
.mdp-polished-secondary{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;margin-top:4px!important;padding:0!important}
.mdp-polished-secondary>.group{min-width:0!important}
.mdp-polished-secondary>.btn-secondary{min-height:36px!important;padding:6px 9px!important;font-size:12px!important;white-space:nowrap}
.mdp-directory-paging{padding:7px 0!important;gap:6px!important}
.mdp-directory-paging>div{justify-content:space-between!important;gap:5px!important}
.mdp-directory-paging button{padding:6px 9px!important;min-height:36px!important}
.mdp-directory-paging select{min-height:36px!important}
.mdp-directory-paging p{font-size:12px!important}
}`}</style>
  <section className={partyControls?"panel space-y-3 !p-4":"mdp-reference-filters"}>
    <div className={partyControls?"grid gap-3":"mdp-reference-filter-main mdp-polished-filter-grid"}>
      <label className="mdp-reference-search">
        <span className="sr-only">Search residents</span>
        <span aria-hidden="true" className="mdp-search-icon">⌕</span>
        <input className="field w-full" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Search name, ID, house or phone..." type="search"/>
      </label>
      {!partyControls&&<div className="mdp-reference-area"><HousePicker houses={houses} value={house} onOpen={loadFilters} loading={filtersLoading} onChange={v=>changeFilter(setHouse,v)}/></div>}
      {!partyControls&&<label className="mdp-reference-serial"><span className="text-xs font-semibold text-slate-700">MDP Serial</span><input aria-label="Find resident by MDP serial number" className="field w-full" inputMode="numeric" autoComplete="off" type="text" maxLength={5} placeholder="e.g. 445" value={serialInput} onChange={e=>{setSerialInput(e.target.value.replace(/[^0-9]/g,''));setPage(1)}}/></label>}
      
      {partyControls&&<Select label="Party" value={party} onChange={v=>changeFilter(setParty,v)} options={[["all","All parties"],...parties.map(p=>[p.name,`${p.name==='Unspecified'?'No party':p.name} (${p.count})`])]}/>}
      <button className="btn-secondary mdp-reference-clear" onClick={clearFilters} disabled={!hasFilters}>Clear</button>
    </div>
    {!partyControls&&taskFilterOptions&&<div className="flex flex-wrap items-center gap-2 py-1" aria-label={isVoteTarget?'Vote target filters':isDoorTask?'Door-to-door filters':'Remarks filters'}>
      <span className="text-xs font-semibold text-slate-600">{isVoteTarget?'Recorded target:':isDoorTask?'Visit status:':'Remarks status:'}</span>
      {taskFilterOptions.map(([value,label])=><button key={value} type="button" aria-pressed={focus===value} onClick={()=>selectSummaryFocus(value)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${focus===value?'border-blue-600 bg-blue-600 text-white':'border-slate-200 bg-white text-slate-700'}`}>{label}</button>)}
    </div>}
    <div className="mdp-reference-secondary mdp-polished-secondary">
      <details className="group" onToggle={event=>{if(event.currentTarget.open)loadFilters()}}><summary className="cursor-pointer text-xs font-semibold text-primary">More filters{gender!=='all'||age!=='all'||(partyControls&&box!=='all')||house!=='all'?' (active)':''}</summary><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{partyControls&&<HousePicker houses={houses} value={house} onChange={v=>changeFilter(setHouse,v)}/>}<Select label="Gender" value={gender} onChange={v=>changeFilter(setGender,v)} options={[["all","All"],["M","Male"],["F","Female"]]}/><Select label="Age" value={age} onChange={v=>changeFilter(setAge,v)} options={[["all","All ages"],["18-25","18–25"],["26-35","26–35"],["36-45","36–45"],["46-60","46–60"],["61+","61+"]]}/>{partyControls&&<Select label="Election box" value={box} onChange={v=>changeFilter(setBox,v)} options={[["all","All election boxes"],...boxes.map(b=>[b,b])]}/>}{filtersLoading&&<p className="text-xs text-body" role="status">Loading filter options…</p>}</div></details>
      {!partyControls&&<button type="button" className="btn-secondary" aria-pressed={mdpView==='house'} onClick={()=>setMdpView(value=>value==='house'?'grid':'house')}>{mdpView==='house'?'Show all cards':'Group by house'}</button>}
      {partyControls&&<div className="inline-flex rounded-lg border border-border bg-white p-1">{(['list','gallery'] as const).map(mode=><button key={mode} type="button" aria-pressed={view===mode} onClick={()=>setView(mode)} className={`rounded-md px-3 py-1.5 text-xs font-bold ${view===mode?'bg-primary text-white':'text-body'}`}>{mode==='list'?'List':'Photos'}</button>)}</div>}
    </div>
  </section>
  {error&&<div className="error-banner" role="alert">{error}</div>}{workflowError&&<div className="error-banner" role="status">{workflowError}</div>}{message&&<div className="info-banner" role="status">{message}</div>}
  <section ref={resultsRef} className={partyControls?"panel scroll-mt-24 overflow-hidden p-0":"mdp-directory-results scroll-mt-24"} aria-busy={loading}><div className={partyControls?"flex flex-col gap-3 border-b border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4":"mdp-directory-paging flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"}><p className="text-sm text-body" role="status">{loading?'Loading…':`Showing ${range} of ${count.toLocaleString()} matched residents`}</p><div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end"><label className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-body">Rows<select aria-label="Rows per page" className="min-h-10 rounded-lg border border-border px-2" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}}>{[24,50,100].map(n=><option key={n} value={n}>{n}</option>)}</select></label><button className="btn-secondary min-h-10 whitespace-nowrap px-3 text-xs sm:text-sm" disabled={loading||page===1} onClick={()=>changePage(page-1)}>‹ Prev</button><span className="min-w-10 whitespace-nowrap text-center text-xs text-body" aria-label={`Page ${page} of ${pages}`}>{page} / {pages}</span><button className="btn-secondary min-h-10 whitespace-nowrap px-3 text-xs sm:text-sm" disabled={loading||page>=pages} onClick={()=>changePage(page+1)}>Next ›</button></div></div>{(!partyControls&&mdpView==='compact')?<List showRemarks={focus==='remarks'} rows={rows} loading={loading} profilePath={profilePath} partyControls={partyControls} workflow={workflow} workflowError={workflowError} pdfSerials={pdfSerials} onWorkflowUpdate={updateVisibleWorkflow}/>:(!partyControls||view==='gallery')?<Gallery layoutMode={!partyControls&&mdpView==='house'?'house':'grid'} showRemarks={focus==='remarks'} rows={rows} loading={loading} profilePath={profilePath} partyControls={partyControls} workflow={workflow} workflowError={workflowError} pdfSerials={pdfSerials} onWorkflowUpdate={updateVisibleWorkflow}/>:<List showRemarks={focus==='remarks'} rows={rows} loading={loading} profilePath={profilePath} partyControls={partyControls} workflow={workflow} workflowError={workflowError} pdfSerials={pdfSerials} onWorkflowUpdate={updateVisibleWorkflow}/>}<div className="flex flex-col gap-3 border-t border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"><span className="text-sm text-body">{count.toLocaleString()} residents</span><div className="grid grid-cols-2 gap-2 sm:flex"><button className="btn-secondary min-h-10 whitespace-nowrap px-3 text-xs sm:text-sm" disabled={loading||page===1} onClick={()=>changePage(page-1)}>‹ Previous</button><button className="btn-primary min-h-10 whitespace-nowrap px-3 text-xs sm:text-sm" disabled={loading||page>=pages} onClick={()=>changePage(page+1)}>Next ›</button></div></div></section>
 </div>
}
function Gallery({rows,loading,profilePath,partyControls,workflow,workflowError,pdfSerials,showRemarks,onWorkflowUpdate,layoutMode='grid'}:{rows:Resident[];loading:boolean;profilePath:string;partyControls:boolean;workflow:Record<string,WorkflowSummary>;workflowError:string;pdfSerials:Record<string,number>;showRemarks:boolean;onWorkflowUpdate:(id:string|number,summary:WorkflowSummary)=>void;layoutMode?:'grid'|'house'}){
 const [selected,setSelected]=useState<{resident:Resident;task:QuickTask}|null>(null);
 const [toast,setToast]=useState('');
 useEffect(()=>{if(!toast)return;const t=window.setTimeout(()=>setToast(''),4500);return()=>window.clearTimeout(t)},[toast]);
 if(loading)return <div className="mdp-residents-grid">{Array.from({length:6}).map((_,i)=><div key={i} className="h-64 animate-pulse rounded-xl bg-blue-50"/>)}</div>;
 if(!rows.length)return <div className="empty-state m-5">No residents found.</div>;
 const grouped=layoutMode==='house'&&!partyControls;
 const houseGroups=new Map<string,Resident[]>();
 if(grouped)for(const r of rows){const name=String(r.house||'House not recorded').trim()||'House not recorded';houseGroups.set(name,[...(houseGroups.get(name)||[]),r])}
 const renderCard=(r:Resident)=>partyControls?<ResidentFlipCard key={String(r.id)} resident={r} profilePath={profilePath} partyControls workflow={workflow[String(r.id)]} workflowError={workflowError}/>:<ResidentGalleryCard key={String(r.id)} resident={r} pdfSerial={pdfSerials[String(r.id)]} profilePath={profilePath} workflow={workflow[String(r.id)]} workflowError={workflowError} showRemark={showRemarks} onViewTasks={task=>setSelected({resident:r,task})}/>;
 return <>{grouped?<div className="space-y-5">{Array.from(houseGroups.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([name,people])=><section key={name} className="mdp-house-group"><div className="mdp-house-group-heading"><h3>{name}</h3><span>{people.length} {people.length===1?'resident':'residents'} on this page</span></div><div className="mdp-residents-grid mdp-house-grid">{people.map(renderCard)}</div></section>)}</div>:<div className={partyControls?"grid grid-cols-1 gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3":"mdp-residents-grid"}>{rows.map(renderCard)}</div>}{selected&&<ResidentTaskDialog key={String(selected.resident.id)} resident={selected.resident} initialTask={selected.task} profilePath={profilePath} workflow={workflow[String(selected.resident.id)]} workflowError={workflowError} onWorkflowUpdate={onWorkflowUpdate} onClose={()=>setSelected(null)} onSaved={()=>setToast('Resident result saved successfully.')}/>}{toast&&<div role="status" className="mdp-saved-toast">✓ {toast}</div>}</>;
}
function VotingIntentionHighlight({summary}:{summary?:WorkflowSummary}){
 const status=summary?.voteStatus;
 const undecided=status==='not-decided'&&summary?.hasVoteIntention,yes=status==='will-vote',no=status==='not-vote';
 const label=undecided?'Not sure yet':yes?'Will vote':no?'Will not vote':summary?'Pending':'Loading status';
 const style=undecided?'border-amber-200 bg-amber-50 text-amber-900':yes?'border-emerald-200 bg-emerald-50 text-emerald-800':no?'border-rose-200 bg-rose-50 text-rose-800':'border-slate-200 bg-slate-100 text-slate-700';
 return <span aria-label={'Voting plan: '+label} className={`mdp-master-vote-badge inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${style}`}><span aria-hidden="true" className="mdp-master-vote-mark">{undecided?'?':yes?'✓':no?'×':'◷'}</span>{label}</span>;
}
function ResidentGalleryCard({resident:r,profilePath,workflow,workflowError,pdfSerial,showRemark=false,onViewTasks}:{resident:Resident;profilePath:string;workflow?:WorkflowSummary;workflowError:string;pdfSerial?:number;showRemark?:boolean;onViewTasks:(task:QuickTask)=>void}){
 const profileHref=profilePath+'?id='+r.id;
 const access=useStaffAccess(),canAssign=access?.role==='admin'||access?.role==='supervisor';
 const taskStatuses=workflow?residentTaskCards(workflow):[];
 const taskState=(id:QuickTask)=>taskStatuses.find(item=>item.id===id);
 const taskClass=(id:QuickTask)=>'mdp-master-action'+(taskState(id)?.done?' mdp-master-action-green':'');
 const taskTooltip=(id:QuickTask,label:string)=>label+' · '+(taskState(id)?.status||'Status loading');

 return <article className="mdp-resident-card mdp-master-card min-w-0 bg-white">
  <div className="mdp-master-identity">
   <Link prefetch={false} href={profileHref} aria-label={'Open '+(r.name||'resident')+' profile'} className="shrink-0"><Photo r={r} small/></Link>
   <div className="min-w-0 flex-1">
    <Link prefetch={false} href={profileHref} className="mdp-master-resident-name">{r.name||'Unnamed resident'}</Link>
    <p className="mdp-master-id">{r.national_id||'ID unavailable'}{pdfSerial!==undefined&&<> · <span className="font-semibold text-blue-700">MDP #{pdfSerial}</span></>}</p>
    {pdfSerial!==undefined&&!r.national_id&&!r.phone&&<span className="mt-1 inline-flex rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900">NEW · ID / phone pending</span>}
    <div className="mt-2"><VotingIntentionHighlight summary={workflow}/></div>
   </div>
   <Link prefetch={false} href={profileHref} className="mdp-master-chevron" aria-label={'Open profile of '+(r.name||'resident')} title="Open full resident details">›</Link>
  </div>
  <div className="mdp-master-actions" aria-label="Resident tasks">
   <button type="button" title={taskTooltip('call','Call')} aria-label={taskTooltip('call','Call')} onClick={()=>onViewTasks('call')} className={taskClass('call')}><ResidentTaskIcon name="phone"/></button>
   <button type="button" title={taskTooltip('voting-intention','Voting plan')} aria-label={taskTooltip('voting-intention','Voting plan')} onClick={()=>onViewTasks('voting-intention')} className={taskClass('voting-intention')}><ResidentTaskIcon name="vote"/></button>
   <button type="button" title={taskTooltip('remarks','Remarks')} aria-label={taskTooltip('remarks','Remarks')} onClick={()=>onViewTasks('remarks')} className={taskClass('remarks')}><ResidentTaskIcon name="remark"/></button>

  </div>
  <div className="mdp-master-data">
   <div><span>House</span><strong title={r.house||''}>{r.house||'Not recorded'}</strong></div>
   <div><span>Mobile</span>{r.phone?<a href={'tel:'+r.phone} className="mdp-master-phone">{r.phone}</a>:<strong>—</strong>}</div>
   <div><span>Age</span><strong>{r.age??'—'}</strong></div>
   <div><span>Sex</span><strong>{r.sex||'—'}</strong></div>
  </div>
  {workflowError&&<p className="mt-2 text-xs text-amber-700" role="status">Task status unavailable</p>}
  {showRemark&&<div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3" aria-label="Written resident remarks">{workflow?.writtenRemarks?.length?<><div className="mb-2 flex items-center justify-between gap-2"><strong className="text-sm text-slate-900">Resident notes</strong><span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">{workflow.writtenRemarks.length} notes</span></div><p className="line-clamp-2 break-words text-sm font-medium leading-relaxed text-slate-900">{workflow.writtenRemarks[0]}</p>{workflow.writtenRemarks.length>1&&<details className="mt-2 border-t border-amber-200 pt-2"><summary className="cursor-pointer text-sm font-semibold text-blue-800">View all {workflow.writtenRemarks.length} notes</summary><ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">{workflow.writtenRemarks.map((remark,index)=><li key={index} className="break-words rounded-lg bg-white p-2 text-sm leading-relaxed text-slate-800">{remark}</li>)}</ul></details>}</>:<span className="text-sm text-slate-600">No written notes</span>}</div>}
 </article>;
}
function ResidentFlipCard({resident:r,profilePath,partyControls,workflow,workflowError}:{resident:Resident;profilePath:string;partyControls:boolean;workflow?:WorkflowSummary;workflowError:string}){
 const [flipped,setFlipped]=useState(false),showTasks=!partyControls&&flipped,profileHref=profilePath+'?id='+r.id;
 const face='col-start-1 row-start-1 overflow-hidden rounded-2xl border border-border bg-white shadow-sm [backface-visibility:hidden]';
 const flipButton='flex min-h-11 w-full items-center justify-between rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm font-bold text-blue-900 transition hover:border-yellow-400 hover:bg-yellow-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700';
 return <div className="[perspective:1200px]"><article className={`grid [transform-style:preserve-3d] transition-transform duration-500 ease-in-out motion-reduce:duration-0 ${showTasks?'[transform:rotateY(180deg)]':''}`}>
  <div aria-hidden={showTasks} inert={showTasks||undefined} className={`${face} transition-shadow hover:shadow-card`}>
   <div className="flex items-center gap-3 border-b border-border p-4"><Link prefetch={false} href={profileHref} aria-label={'Open '+(r.name||'resident')+' profile'}><Photo r={r}/></Link><div className="min-w-0 flex-1"><Link prefetch={false} href={profileHref} className="block whitespace-normal break-words font-bold leading-snug text-navy hover:text-primary">{r.name||'Unnamed resident'}</Link><p className="mt-1 break-words text-xs leading-snug text-body">{r.national_id||'No national ID'}</p></div>{partyControls&&<Party party={r.party}/>}</div>
   <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-4 text-sm">{partyControls?<><Info label="House" value={r.house}/><Info label="Living now" value={r.lives_in}/><Info label="Mobile" value={r.phone} href={r.phone?`tel:${r.phone}`:undefined}/><Info label="Age" value={String(r.age??'—')}/><Info label="Sex" value={r.sex}/><Info label="Election box" value={r.election_box}/></>:<><Info label="House" value={r.house}/><Info label="Mobile" value={r.phone} href={r.phone?`tel:${r.phone}`:undefined}/><Info label="Age" value={String(r.age??'—')}/><Info label="Sex" value={r.sex}/></>}</dl>
   <div className="border-t border-border px-4 py-3">{partyControls?<Link prefetch={false} href={profileHref} className="text-xs font-bold text-primary hover:underline">Open resident profile →</Link>:<button type="button" onClick={()=>setFlipped(true)} className={flipButton}><span>View tasks</span><span aria-hidden="true">↻</span></button>}</div>
  </div>
  {!partyControls&&<div aria-hidden={!showTasks} inert={!showTasks||undefined} className={`${face} [transform:rotateY(180deg)]`}>
   <div className="flex items-center justify-between gap-2 border-b border-border bg-yellow-50/70 p-4"><div className="min-w-0"><p className="text-sm font-bold text-navy">Resident tasks</p><p className="mt-1 truncate text-xs text-body">{r.name||'Unnamed resident'}</p></div><button type="button" onClick={()=>setFlipped(false)} aria-label="Flip back to resident details" title="Back to resident" className="btn-secondary min-h-10 shrink-0 px-3">← Back</button></div>
   <div className="p-3"><WorkflowStatus summary={workflow} unavailable={Boolean(workflowError)} profileHref={profileHref}/><Link prefetch={false} href={profileHref} className="mt-3 block text-center text-xs font-bold text-primary hover:underline">Open full profile →</Link></div>
  </div>}
 </article></div>
}
function List({rows,loading,profilePath,partyControls,workflow,workflowError,pdfSerials,showRemarks,onWorkflowUpdate}:{rows:Resident[];loading:boolean;profilePath:string;partyControls:boolean;workflow:Record<string,WorkflowSummary>;workflowError:string;pdfSerials:Record<string,number>;showRemarks:boolean;onWorkflowUpdate:(id:string|number,summary:WorkflowSummary)=>void}){
 const [selected,setSelected]=useState<Resident|null>(null);
 if(loading)return <div className="p-5"><div className="h-64 animate-pulse rounded-xl bg-primary-light"/></div>;
 if(!rows.length)return <div className="empty-state m-5">No residents found.</div>;
 if(!partyControls)return <><div className="divide-y divide-border">{rows.map(r=><ResidentListCard key={String(r.id)} resident={r} pdfSerial={pdfSerials[String(r.id)]} profilePath={profilePath} workflow={workflow[String(r.id)]} workflowError={workflowError} showRemark={showRemarks} onViewTasks={()=>setSelected(r)}/>)}</div>{selected&&<ResidentTaskDialog resident={selected} profilePath={profilePath} workflow={workflow[String(selected.id)]} workflowError={workflowError} onWorkflowUpdate={onWorkflowUpdate} onClose={()=>setSelected(null)}/>}</>;
 return <>
  <div className="divide-y divide-border lg:hidden">{rows.map(r=><article key={String(r.id)} className="p-4 sm:p-5">
   <div className="flex min-w-0 flex-wrap items-center gap-3"><div className="flex min-w-0 flex-1 items-center gap-3"><Photo r={r} small/><div className="min-w-0 flex-1"><Link prefetch={false} href={profilePath+'?id='+r.id} className="block truncate font-bold text-navy hover:text-primary">{r.name||'Unnamed resident'}</Link><p className="mt-1 truncate text-xs text-body">{r.national_id||'No national ID'}</p></div>{partyControls&&<Party party={r.party}/>}</div>{!partyControls&&<Link prefetch={false} href={profilePath+'?id='+r.id} className="btn-primary min-h-11 w-full justify-center sm:min-h-10 sm:w-auto sm:px-5">Open profile</Link>}</div>
   <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3 xl:grid-cols-5"><Info label="House" value={r.house}/><Info label="Living now" value={r.lives_in}/><Info label="Mobile" value={r.phone} href={r.phone?`tel:${r.phone}`:undefined}/><Info label="Age" value={String(r.age??'—')}/><Info label="Sex" value={r.sex}/><Info label="Election box" value={r.election_box}/></dl>
  </article>)}</div>
  <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1080px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-body"><tr><th className="p-4">Resident</th><th className="p-4">National ID</th><th className="p-4">House</th><th className="p-4">Living now</th><th className="p-4">Phone</th><th className="p-4">Age</th><th className="p-4">Gender</th><th className="p-4">Box</th><th className="p-4">Party</th></tr></thead><tbody>{rows.map(r=><tr key={String(r.id)} className="border-t border-border hover:bg-slate-50"><td className="p-4"><Link prefetch={false} href={profilePath+'?id='+r.id} className="flex items-center gap-3 font-bold text-navy hover:text-primary"><Photo r={r} small/>{r.name||'Unnamed resident'}</Link></td><td className="p-4">{r.national_id||'—'}</td><td className="p-4">{r.house||'—'}</td><td className="p-4">{r.lives_in||'—'}</td><td className="whitespace-nowrap p-4">{r.phone?<a href={'tel:'+r.phone} className="font-semibold text-primary">{r.phone}</a>:'—'}</td><td className="p-4">{r.age??'—'}</td><td className="p-4">{r.sex||'—'}</td><td className="p-4">{r.election_box||'—'}</td><td className="p-4"><Party party={r.party}/></td></tr>)}</tbody></table></div>
 </>
}
function ResidentListCard({resident:r,profilePath,workflow,workflowError,pdfSerial,showRemark=false,onViewTasks}:{resident:Resident;profilePath:string;workflow?:WorkflowSummary;workflowError:string;pdfSerial?:number;showRemark?:boolean;onViewTasks:()=>void}){
 const profileHref=profilePath+'?id='+r.id;
 return <article role="button" tabIndex={0} aria-label={'Open tasks for '+(r.name||'resident')} onClick={event=>{if(!(event.target as HTMLElement).closest('a,button,input,select,textarea'))onViewTasks()}} onKeyDown={event=>{if((event.key==='Enter'||event.key===' ')&&event.target===event.currentTarget){event.preventDefault();onViewTasks()}}} className="cursor-pointer p-4 transition-colors hover:bg-slate-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:p-5">
  {showRemark&&<div className="mb-2 flex flex-wrap items-start gap-1.5" aria-label="Written resident remarks">{workflow?.writtenRemarks?.length?workflow.writtenRemarks.map((remark,index)=><span key={index} className="max-w-full break-words rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-medium leading-snug text-blue-900" title={remark}>{remark}</span>):<span className="text-xs text-body">Loading written remarks…</span>}</div>}
  <div className="flex min-w-0 items-center gap-3"><Link prefetch={false} href={profileHref} aria-label={'Open '+(r.name||'resident')+' profile'}><Photo r={r} small/></Link><div className="min-w-0 flex-1"><Link prefetch={false} href={profileHref} className="block whitespace-normal break-words font-bold leading-snug text-navy hover:text-primary">{r.name||'Unnamed resident'}</Link><p className="mt-1 break-words text-xs leading-snug text-body">{r.national_id||'No national ID'}{pdfSerial!==undefined&&<> · <span className="font-semibold text-blue-700">MDP #{pdfSerial}</span></>}</p><TaskProgress summary={workflow} unavailable={Boolean(workflowError)}/></div></div>
  <dl className="mt-4 grid grid-cols-3 gap-x-3 gap-y-3 text-sm"><div className="col-span-3"><Info label="House" value={r.house}/></div><Info label="Mobile" value={r.phone} href={r.phone?`tel:${r.phone}`:undefined}/><Info label="Age" value={String(r.age??'—')}/><Info label="Sex" value={r.sex}/></dl>
  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3"><button type="button" onClick={onViewTasks} className="btn-primary min-h-11 whitespace-nowrap justify-center px-3">View tasks</button><Link prefetch={false} href={profileHref} className="btn-secondary min-h-11 whitespace-nowrap justify-center px-3">Profile</Link></div>
 </article>
}
function TaskProgress({summary,unavailable}:{summary?:WorkflowSummary;unavailable:boolean}){
 if(unavailable)return <span className="mt-1.5 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">Status unavailable</span>;
 if(!summary)return <span className="mt-1.5 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">Loading tasks…</span>;
 const tasks=residentTaskCards(summary),complete=tasks.filter(task=>task.done).length,allDone=complete===tasks.length;
 return <div className="mt-2 flex flex-wrap items-center gap-2"><span className={['inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold',allDone?'bg-emerald-100 text-emerald-800':complete?'bg-yellow-100 text-blue-900':'bg-slate-100 text-slate-700'].join(' ')}>{allDone&&<span aria-hidden="true">✓</span>}{allDone?'All tasks complete':`${complete}/${tasks.length} done`}</span><span className="inline-flex items-center gap-1" aria-label="Task completion by category">{tasks.map(task=><span key={task.id} title={`${task.label}: ${task.status}`} aria-label={`${task.label}: ${task.status}${task.done?' (complete)':''}`} className={['grid h-6 w-6 place-items-center rounded-full',task.done?'bg-emerald-100 text-emerald-800':task.id==='voting-intention'&&task.status.startsWith('Not sure')?'bg-amber-100 text-amber-800':'bg-slate-100 text-slate-400'].join(' ')}><ResidentTaskIcon name={task.icon} className="h-3.5 w-3.5"/></span>)}</span></div>
}
type QuickTask='call'|'door-to-door'|'in-person-meeting'|'voting-intention'|'remarks'|'transport';
type ResidentRemark={id:number|string;section?:string|null;remark:string;recorded_by?:string|null;recorded_at?:string|null};
function ResidentTaskDialog({resident:r,profilePath,workflow,workflowError,onWorkflowUpdate,onClose,onSaved,initialTask='voting-intention'}:{resident:Resident;profilePath:string;workflow?:WorkflowSummary;workflowError:string;onWorkflowUpdate:(id:string|number,summary:WorkflowSummary)=>void;onClose:()=>void;onSaved?:()=>void;initialTask?:QuickTask}){
 const [activeTask,setActiveTask]=useState<QuickTask>(initialTask),[currentWorkflow,setCurrentWorkflow]=useState(workflow),[success,setSuccess]=useState(''),[revision,setRevision]=useState(0);
 const profileHref=profilePath+'?id='+r.id,scrollRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};window.addEventListener('keydown',closeOnEscape);const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{window.removeEventListener('keydown',closeOnEscape);document.body.style.overflow=previous}},[onClose]);
 const taskItems=currentWorkflow?residentTaskCards(currentWorkflow):[];
 function choose(task:QuickTask){setSuccess('');setActiveTask(task);scrollRef.current?.scrollTo({top:0,behavior:'smooth'})}
 return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-5" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <div role="dialog" aria-modal="true" aria-label={`Resident tasks for ${r.name||'resident'}`} className="flex max-h-[98dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-border bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl" onMouseDown={event=>event.stopPropagation()}>
   <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
    <Photo r={r} small/>
    <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Resident</p><h2 className="truncate text-base font-extrabold text-navy sm:text-lg">{r.name||'Unnamed resident'}</h2><p className="truncate text-xs text-body">{r.house||'House not recorded'} · {r.phone||'No phone'} · {r.national_id||'ID unavailable'}</p></div>
    <Link prefetch={false} href={profileHref} className="hidden shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 sm:inline-flex">Profile ↗</Link>
    <button type="button" onClick={onClose} aria-label="Close resident tasks" className="btn-secondary min-h-10 shrink-0 px-3">Close</button>
   </div>
   {workflowError?<p role="alert" className="mx-4 mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{workflowError}</p>:null}
   <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(215px,0.75fr)_minmax(0,1.8fr)]">
    <nav aria-label="Resident task categories" className="border-b border-slate-200 bg-slate-50/70 p-3 md:overflow-y-auto md:border-b-0 md:border-r md:p-5">
     <div className="hidden md:block"><h3 className="text-sm font-extrabold text-navy">Tasks</h3><p className="mt-1 text-xs text-body">Choose a task to update.</p></div>
     <div className="flex gap-2 overflow-x-auto pb-1 md:mt-4 md:flex-col md:overflow-visible">
      {(taskItems.length?taskItems:residentTaskCards({callAttempts:0,callOutcome:null,voteStatus:null,visitStatus:null,transportStatus:null,hasRemarks:false})).map(item=><button key={item.id} type="button" aria-current={activeTask===item.id?'true':undefined} onClick={()=>choose(item.id)} className={`flex min-w-[145px] items-center gap-2 rounded-xl border px-3 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 md:min-w-0 ${activeTask===item.id?'border-blue-500 bg-blue-50 shadow-sm':'border-transparent bg-white hover:border-blue-200'}`}>
       <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${item.done?'bg-emerald-100 text-emerald-700':item.status.toLowerCase().includes('follow up')?'bg-amber-100 text-amber-700':'bg-slate-100 text-blue-700'}`}><ResidentTaskIcon name={item.icon} className="h-5 w-5"/></span>
       <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-navy">{item.label}</span><span className="block break-words text-[11px] text-body">{item.status}</span></span>
      </button>)}
     </div>
    </nav>
    <div ref={scrollRef} className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
     {success&&<p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">✓ {success}</p>}
     <QuickTaskEditor key={activeTask+'-'+revision} resident={r} task={activeTask} summary={currentWorkflow} onBack={()=>choose('voting-intention')} onClose={onClose} onSaved={summary=>{setCurrentWorkflow(summary);onWorkflowUpdate(r.id,summary);onSaved?.();onClose()}}/>
    </div>
   </div>
  </div>
 </div>
}
function Photo({r,small=false}:{r:Resident;small?:boolean}){const [failed,setFailed]=useState(false);const size=small?'h-10 w-10 mdp-card-photo':'h-20 w-20';const initials=(r.name||'?').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();return r.photo_url&&!failed?<img src={r.photo_url} alt="" className={`${size} shrink-0 rounded-xl border border-border object-cover`} loading="lazy" onError={()=>setFailed(true)}/>:<div aria-label={`${r.name||'Resident'} photo unavailable`} className={`grid ${size} shrink-0 place-items-center rounded-xl bg-primary-light text-sm font-extrabold text-primary`}>{initials}</div>}
function Party({party}:{party?:string|null}){const p=(party||'No party').toUpperCase();const cls=p==='PNC'?'bg-teal-50 text-teal-700':p==='MDP'?'bg-yellow-50 text-yellow-800':'bg-slate-100 text-slate-600';return <span className={`ml-auto rounded-md px-2 py-1 text-[10px] font-bold ${cls}`}>{party||'No party'}</span>}
function Info({label,value,href}:{label:string;value?:string|null;href?:string}){const fullHouse=label==='House';return <div className={[label==='Election box'||fullHouse?'col-span-2':'','min-w-0'].filter(Boolean).join(' ')}><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>{href?<a href={href} className={`mt-1 block font-bold text-blue-700 underline-offset-2 hover:underline ${fullHouse?'whitespace-normal break-words':'truncate'}`}>{value||'Not recorded'}</a>:<strong className={`mt-1 block text-navy ${fullHouse?'whitespace-normal break-words':'truncate'}`}>{value||'Not recorded'}</strong>}</div>}
function TaskAnswerChoices<T extends string>({label,value,options,onChange}:{label:string;value:T;options:{value:T;label:string;hint?:string}[];onChange:(next:T)=>void}){
 const tone=(v:string)=>v==='pending'?'amber':v==='will-vote'?'green':v==='not-vote'?'red':'neutral';
 const selectedStyle=(v:string)=>tone(v)==='amber'?'border-amber-400 bg-amber-100 text-amber-950 ring-1 ring-amber-300':tone(v)==='green'?'border-emerald-500 bg-emerald-500 text-white ring-1 ring-emerald-300':tone(v)==='red'?'border-red-500 bg-red-500 text-white ring-1 ring-red-300':'border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-200';
 return <fieldset className="space-y-3"><legend className="mb-2 text-sm font-bold text-navy">{label}</legend>
  <div className={options.length===4?'grid grid-cols-2 gap-2 sm:grid-cols-4':'grid grid-cols-2 gap-2 sm:grid-cols-3'}>{options.map(item=><label key={item.value} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-2 py-3 text-center text-xs font-bold transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-500 sm:text-sm ${value===item.value?selectedStyle(item.value):'border-slate-200 bg-slate-50 text-navy hover:border-blue-300 hover:bg-blue-50'}`}><input type="radio" name={label} checked={value===item.value} onChange={()=>onChange(item.value)} className="sr-only"/><span>{item.label}</span></label>)}</div>
 </fieldset>
}
function QuickTaskEditor({resident,task,summary,onBack,onClose,onSaved}:{resident:Resident;task:QuickTask;summary?:WorkflowSummary;onBack:()=>void;onClose:()=>void;onSaved:(summary:WorkflowSummary)=>void}){
 const base:WorkflowSummary=summary||{hasCallRecord:false,callOutcome:null,callAttempts:0,voteStatus:null,hasVoteIntention:false,lastCallAt:null,visitStatus:null,lastVisitAt:null,transportStatus:null,transportNote:null,latestRemark:null,writtenRemarks:[],hasRemarks:false,hasInPersonMeeting:false};
 const [transportLoaded,setTransportLoaded]=useState(false);const [callResult,setCallResult]=useState<CallOutcome>((base.callOutcome as CallOutcome)||'pending'),[visitResult,setVisitResult]=useState<'not-visited'|'visited'|'not-home'|'access-issue'|'address-not-found'|'visit-postponed'>((base.visitStatus as any)||'not-visited'),[intention,setIntention]=useState<'pending'|VoteStatus>(base.hasVoteIntention?(base.voteStatus as VoteStatus)||'not-decided':'pending'),[meetingResult,setMeetingResult]=useState(''),[transport,setTransport]=useState(base.transportStatus||'needed'),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(''),[remarkHistory,setRemarkHistory]=useState<ResidentRemark[]>([]),[remarkHistoryLoading,setRemarkHistoryLoading]=useState(false),[remarkHistoryError,setRemarkHistoryError]=useState(''),[remarkReload,setRemarkReload]=useState(0),[deletingRemark,setDeletingRemark]=useState<string|null>(null),[currentEmail,setCurrentEmail]=useState<string|null>(null),[isRemarkAdmin,setIsRemarkAdmin]=useState(false);
 useEffect(()=>{if(task!=='transport')return;let active=true;setTransportLoaded(false);void(async()=>{const {data,error}=await supabase.from('transportation').select('transport_status,notes').eq('resident_id',resident.id).maybeSingle();if(!active)return;if(error){setError('Could not load saved transport details: '+error.message);return}setTransport(data?.transport_status||'needed');setNote(data?.notes||'');setTransportLoaded(true)})();return()=>{active=false}},[resident.id,task]);
 useEffect(()=>{if(task!=='remarks')return;let active=true;setRemarkHistoryLoading(true);setRemarkHistoryError('');void(async()=>{try{const {data,error}=await supabase.from('remarks').select('id,section,remark,recorded_by,recorded_at').eq('resident_id',resident.id).order('recorded_at',{ascending:false}).limit(100);if(!active)return;if(error)throw error;setRemarkHistory(((data||[]) as ResidentRemark[]).filter(item=>{const value=(item.remark||'').trim();if(!value)return false;return !/^(?:door-to-door status set to pending\.?|intention pending:\s*no response recorded yet\.?|call task left pending\.?|door-to-door visit result:\s*(?:not visited|pending)\.?|meeting result:\s*not met yet\.?)$/i.test(value);}));}catch(e){if(active)setRemarkHistoryError(e instanceof Error?e.message:'Could not load saved remarks.')}finally{if(active)setRemarkHistoryLoading(false)}})();return()=>{active=false}},[resident.id,task,remarkReload]);
 useEffect(()=>{let active=true;void(async()=>{const {data,error}=await supabase.auth.getUser();if(error||!active)return;setCurrentEmail(data.user?.email||null);if(data.user){const role=await supabase.from('user_roles').select('role,active').eq('user_id',data.user.id).maybeSingle();if(active&&!role.error)setIsRemarkAdmin(Boolean(role.data?.active&&role.data.role==='admin'))}})();return()=>{active=false}},[]);
 async function deleteSavedRemark(item:ResidentRemark){
  const own=Boolean(item.section==='general'&&currentEmail&&item.recorded_by?.trim().toLowerCase()===currentEmail.trim().toLowerCase());
  if(deletingRemark||item.section!=='general'||(!own&&!isRemarkAdmin))return;
  if(!window.confirm(own?'Delete this written remark? An audit copy will be retained.':'Admin: Remove another staff member’s written remark? The original note and your identity will be retained in the deletion audit.'))return;
  setDeletingRemark(String(item.id));setRemarkHistoryError('');
  try{
   const query=supabase.from('remarks').delete().eq('id',item.id).eq('resident_id',resident.id).eq('section','general');
   const {data,error}=await (own?query.eq('recorded_by',item.recorded_by!):query).select('id');
   if(error)throw error;
   if(!data?.length)throw new Error('The note was not deleted. Verify your authorization or refresh the record.');
   const remaining=remarkHistory.filter(row=>String(row.id)!==String(item.id));
   setRemarkHistory(remaining);
   onSaved({...base,hasRemarks:remaining.length>0,latestRemark:remaining[0]?.remark||null,writtenRemarks:remaining.map(row=>row.remark)});
  }catch(e){setRemarkHistoryError(e instanceof Error?e.message:'Could not delete remark')}
  finally{setDeletingRemark(null)}
 }
 const taskLabel=({call:'Call', 'door-to-door':'Door-to-door','in-person-meeting':'Meeting','voting-intention':'Vote plan',remarks:'Remark',transport:'Transport'} as Record<QuickTask,string>)[task];
 async function save(){if(saving)return;setSaving(true);setError('');setSaved('');try{const next={...base};const now=new Date().toISOString();
  if(task==='call'){await saveCallCenterResult(resident.id,{outcome:callResult,includePoliticalFields:false,notes:note.trim()||undefined});const session=await supabase.auth.getSession();if(session.error)throw session.error;const pending=callResult==='pending';const {error:historyError}=await supabase.from('remarks').insert({id:Date.now(),resident_id:Number(resident.id),section:'call-center',remark:`${pending?'Call task left pending':'Call result: '+friendly(callResult)}.${note.trim()?` Note: ${note.trim()}`:''}`,recorded_by:session.data.session?.user.email||null,recorded_at:now});if(historyError)throw new Error(`Call saved, but history could not be added: ${historyError.message}`);next.hasCallRecord=true;next.callOutcome=callResult;next.callAttempts=base.callAttempts+(pending?0:1);next.lastCallAt=pending?base.lastCallAt:now;}
  if(task==='door-to-door'){await saveDoorToDoorResult(resident.id,visitResult,note);next.visitStatus=visitResult;next.lastVisitAt=visitResult==='not-visited'?base.lastVisitAt:now;}
  if(task==='in-person-meeting'){if(!meetingResult)throw new Error('Choose what happened at the meeting.');const session=await supabase.auth.getSession();if(session.error)throw session.error;const resultLabel=meetingResult==='met'?'Met resident in person':meetingResult==='postponed'?'Meeting postponed':meetingResult==='unavailable'?'Resident unavailable':'Not met yet';const {error:saveError}=await supabase.from('remarks').insert({id:Date.now(),resident_id:Number(resident.id),section:'in-person-meeting',remark:`Meeting result: ${resultLabel}.${note.trim()?` Note: ${note.trim()}`:''}`,recorded_by:session.data.session?.user.email||null,recorded_at:now});if(saveError)throw saveError;next.hasInPersonMeeting=meetingResult==='met';}
  if(task==='voting-intention'){const session=await supabase.auth.getSession();if(session.error)throw session.error;const recordedBy=session.data.session?.user.email||null,pending=intention==='pending',storedStatus:VoteStatus=pending?'not-decided':intention;const current=await supabase.from('call_center').select('resident_id').eq('resident_id',resident.id).maybeSingle();if(current.error)throw current.error;const changes={vote_status:storedStatus,recorded_by:recordedBy,updated_at:now};const response=current.data?await supabase.from('call_center').update(changes).eq('resident_id',resident.id).select('resident_id').maybeSingle():await supabase.from('call_center').insert({resident_id:resident.id,phone_status:'need-call',reach_status:'not-reached',call_outcome:'pending',call_attempts:0,support_level:'not-guaranteed',...changes}).select('resident_id').single();if(response.error)throw response.error;if(!response.data)throw new Error('Voting intention was not saved.');const remark=pending?'Intention pending: No response recorded yet.':`Resident stated: ${intention==='will-vote'?'Plans to vote':intention==='not-vote'?'Does not plan to vote':'Not sure yet'}${note.trim()?`\nPerson or candidate named by resident: ${note.trim()}`:''}`;const {error:historyError}=await supabase.from('remarks').insert({id:Date.now(),resident_id:Number(resident.id),section:'voting-intention',remark,recorded_by:recordedBy,recorded_at:now});if(historyError)throw new Error(`Intention saved, but its history could not be added: ${historyError.message}`);next.voteStatus=storedStatus;next.hasVoteIntention=!pending;}
  if(task==='remarks'){if(!note.trim())throw new Error('Write a short remark before saving.');const session=await supabase.auth.getSession();if(session.error)throw session.error;const {data,error:saveError}=await supabase.from('remarks').insert({id:Date.now(),resident_id:Number(resident.id),section:'general',remark:note.trim(),recorded_by:session.data.session?.user.email||null,recorded_at:now}).select('id,remark,recorded_by,recorded_at').single();if(saveError)throw saveError;if(!data)throw new Error('The remark was not confirmed as saved.');setRemarkHistory(current=>[data as ResidentRemark,...current]);next.hasRemarks=true;next.latestRemark=note.trim();next.writtenRemarks=[note.trim(),...(base.writtenRemarks||[])];}
  if(task==='transport'){if(!transportLoaded)throw new Error('Wait for saved transport details to load.');const preserved=note.trim()||base.transportNote||null;await saveTransportation(resident.id,{transport_status:transport,notes:preserved});next.transportStatus=transport;next.transportNote=preserved;if(note.trim()){const session=await supabase.auth.getSession();if(session.error)throw session.error;const {error:historyError}=await supabase.from('remarks').insert({id:Date.now(),resident_id:Number(resident.id),section:'transport',remark:'Transport: '+friendly(transport)+'. Note: '+note.trim(),recorded_by:session.data.session?.user.email||null,recorded_at:now});if(historyError)throw new Error('Transport saved, but remark history failed: '+historyError.message);next.hasRemarks=true;next.latestRemark=note.trim();}}
  onSaved(next);
 }catch(e){setError(e instanceof Error?e.message:'Could not save this result.')}finally{setSaving(false)}}
 return <><div className="border-b border-slate-100 pb-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Update selected task</p><h2 className="mt-1 text-xl font-extrabold text-navy">{taskLabel}</h2><p className="mt-1 text-sm text-body">Choose the recorded result, add a note if needed, and save.</p></div>
  <div className="space-y-5 py-5">
   {task==='call'&&<><p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">Saving Pending leaves this call unfinished. Select the actual call result to update its task status. Voting plans are recorded separately under Vote plan.</p><TaskAnswerChoices label="Call result" value={callResult} onChange={setCallResult} options={(['pending','connected','busy','not-answer','out-of-coverage','disconnected','wrong-number'] as CallOutcome[]).map(value=>({value,label:friendly(value)}))}/>{resident.phone&&<a className="btn-secondary inline-flex min-h-10 items-center justify-center" href={'tel:'+resident.phone}>Call {resident.phone}</a>}</>}
   {task==='door-to-door'&&<TaskAnswerChoices label="Visit result" value={visitResult} onChange={setVisitResult} options={([{value:'not-visited',label:'Pending · not visited yet'},{value:'visited',label:'Resident reached'},{value:'not-home',label:'Nobody home'},{value:'access-issue',label:'Could not access home'},{value:'address-not-found',label:'Address not found'},{value:'visit-postponed',label:'Visit postponed'}] as {value:typeof visitResult;label:string}[])}/>} 
   {task==='in-person-meeting'&&<><TaskAnswerChoices label="Meeting result" value={meetingResult} onChange={setMeetingResult} options={[{value:'met',label:'Met resident in person',hint:'Completed'},{value:'pending',label:'Not met yet',hint:'Pending'},{value:'unavailable',label:'Resident unavailable',hint:'Follow up'},{value:'postponed',label:'Meeting postponed',hint:'Follow up'}]}/><p className="text-xs text-body">Only “Met resident in person” completes this task.</p><label className="block"><span className="field-label">Resident remark (optional)</span><textarea name="resident_task_remark" className="field min-h-24 py-3" value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a brief meeting note"/></label></>}
   
   {task==='voting-intention'&&<TaskAnswerChoices label="What did the resident say?" value={intention} onChange={setIntention} options={[{value:'pending',label:'Not asked yet',hint:'Pending'},{value:'will-vote',label:'Will vote',hint:'Recorded'},{value:'not-vote',label:'Will not vote',hint:'Recorded'},{value:'not-decided',label:'Not sure yet',hint:'Follow up'}]}/>} 
   {task==='transport'&&!transportLoaded&&<p role="status" className="text-sm text-body">Loading saved pickup details…</p>}
   {task==='transport'&&transportLoaded&&<p className="whitespace-pre-wrap break-words text-sm text-body">Saved pickup details: {note.trim()||'No pickup details recorded'}</p>}
   {task==='transport'&&<TaskAnswerChoices label="Transport result" value={transport} onChange={setTransport} options={['needed','requested','assigned','picked-up','completed','not-needed','cancelled'].map(value=>({value,label:friendly(value)}))}/>} 
   {task!=='in-person-meeting'&&<label className="block"><span className="field-label">{task==='remarks'?'Resident remark':'Resident remark (optional)'}</span><textarea name="resident_task_remark" className="field min-h-24 py-3" value={note} onChange={e=>setNote(e.target.value)} placeholder={task==='remarks'?'Write a short, factual remark':'Add a short note'}/></label>}
   {error&&<div role="alert" className="error-banner">{error}</div>}{saved&&<div role="status" className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{saved}</div>}
   <button type="button" onClick={()=>void save()} disabled={saving||(task==='transport'&&!transportLoaded)||(task==='in-person-meeting'&&!meetingResult)} className="btn-primary min-h-12 w-full">{saving?'Saving…':`Save ${taskLabel.toLowerCase()} result`}</button>
  </div></>;
}
function WorkflowStatus({summary,unavailable,onSelectTask,profileHref}:{summary?:WorkflowSummary;unavailable:boolean;onSelectTask?:(task:QuickTask)=>void;profileHref?:string}){
 if(unavailable)return <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Task status could not be loaded. Refresh before changing a result.</div>;
 if(!summary)return <div role="status" className="rounded-xl border border-border bg-slate-50 p-5 text-sm text-body">Loading saved task statuses…</div>;
 const items=residentTaskCards(summary),done=items.filter(item=>item.done).length;
 return <section aria-label="Resident tasks" className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h3 className="text-base font-extrabold text-navy">Tasks and next steps</h3><p className="mt-1 text-sm text-body">{onSelectTask?'Choose any task to update the saved result.':'Open a task to view and update the result.'}</p></div>
   <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-900">{done} of {items.length} completed</span>
  </div>
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{items.map(item=>{
   const followUp=!item.done&&item.status.toLowerCase().includes('follow up');
   const bg=item.done?'border-emerald-200 bg-emerald-50/70':followUp?'border-amber-300 bg-amber-50':'border-slate-200 bg-white';
   const content=<><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${item.done?'bg-emerald-100 text-emerald-800':followUp?'bg-amber-100 text-amber-800':'bg-blue-50 text-blue-800'}`}><ResidentTaskIcon name={item.icon} className="h-5 w-5"/></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-navy">{item.label}</span><span className="mt-1 block break-words text-xs text-body">{item.status}</span>{item.id==='remarks'&&summary.latestRemark&&<span className="mt-1 block break-words text-xs text-body">{summary.latestRemark}</span>}{item.id==='transport'&&summary.transportNote&&<span className="mt-1 block break-words text-xs text-body">{summary.transportNote}</span>}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${item.done?'bg-emerald-100 text-emerald-800':followUp?'bg-amber-200 text-amber-900':'bg-slate-100 text-slate-600'}`}>{item.done?'Done':followUp?'Follow up':'Pending'}</span></>;
   const cls=`flex min-h-[92px] min-w-0 items-center gap-3 rounded-2xl border p-3.5 text-left transition hover:border-blue-300 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${bg}`;
   return onSelectTask?<button type="button" key={item.id} onClick={()=>onSelectTask(item.id)} aria-label={item.label+': '+item.status+'. Update task'} className={cls}>{content}</button>:<Link prefetch={false} key={item.id} href={(profileHref||'')+'&section='+item.id} aria-label={item.label+': '+item.status+'. Open task'} className={cls}>{content}</Link>;
  })}</div>
 </section>
}
function friendly(value:string){const labels:Record<string,string>={'will-vote':'Plans to vote','not-vote':'Does not plan to vote','not-decided':'Not decided','not-visited':'Not visited','not-home':'Not home','access-issue':'Could not access home','address-not-found':'Address not found','visit-postponed':'Visit postponed','live-in-another-place':'Lives elsewhere','connected':'Reached resident','not-answer':'No answer','wrong-number':'Wrong number','out-of-coverage':'Out of coverage','disconnected':'Disconnected','busy':'Line busy','pending':'Pending'};return labels[value]||value.replaceAll('-',' ').replace(/^./,c=>c.toUpperCase())}
function transportLabel(value:string){if(value==='not-needed')return 'Not requested';if(['need-transport','needed','requested'].includes(value))return 'Requested';if(value==='picked-up')return 'Picked up';return friendly(value)}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-body">{label}</span>{children}</label>}
function Select({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:string[][]}){return <Field label={label}><select className="field" value={value} onChange={e=>onChange(e.target.value)}>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>}
function Metric({label,value}:{label:string;value:number}){return <div className="min-w-24 rounded-lg border border-border bg-white px-4 py-3"><strong className="block text-2xl text-navy">{value.toLocaleString()}</strong><span className="text-xs text-body">{label}</span></div>}
function Chip({label,clear}:{label:string;clear:()=>void}){return <button onClick={clear} className="filter-chip">{label} ×</button>}
function HousePicker({houses,value,onChange,onOpen,loading=false}:{houses:HouseOption[];value:string;onChange:(v:string)=>void;onOpen?:()=>void;loading?:boolean}){const [open,setOpen]=useState(false),[search,setSearch]=useState('');const root=useRef<HTMLDivElement>(null);useEffect(()=>{const close=(e:MouseEvent)=>{if(root.current&&!root.current.contains(e.target as Node))setOpen(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[]);const filtered=useMemo(()=>houses.filter(h=>h.name.toLowerCase().includes(search.trim().toLowerCase())),[houses,search]);return <div ref={root} className="relative"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-body">House</span><button type="button" onClick={()=>{if(!open)onOpen?.();setOpen(v=>!v)}} className="field flex items-center justify-between text-left">{value==='all'?'All houses':value}<span>⌄</span></button>{open&&<div className="absolute z-50 mt-2 w-full min-w-[280px] rounded-lg border border-border bg-white p-2 shadow-card"><input className="field mb-2" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search house"/>{loading&&<p className="p-2 text-xs text-body" role="status">Loading houses…</p>}<div className="max-h-72 overflow-y-auto"><button className="w-full rounded-md p-3 text-left font-bold hover:bg-slate-50" onClick={()=>{onChange('all');setOpen(false)}}>All houses</button>{filtered.map(h=><button key={h.name} className="flex w-full justify-between rounded-md p-3 text-left hover:bg-slate-50" onClick={()=>{onChange(h.name);setOpen(false)}}><span className="truncate font-bold">{h.name}</span><span className="text-xs text-body">{h.count}</span></button>)}</div></div>}</div>}
