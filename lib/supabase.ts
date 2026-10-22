import {createClient} from '@supabase/supabase-js';
import type {CallCenterRecord,CallOutcome,Resident,SupportLevel,VoteStatus} from './types';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://espezmdpkoixnfchomqb.supabase.co';
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_xP8z74zcMuCkj6xlu1bJ3w_Kudqbcu1';
export const supabase=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const RESIDENT_TABLE='Resident';
const RESIDENT_CACHE_TTL=5*60*1000;
const RESIDENT_PAGE_CACHE_TTL=15000;
let residentCache:{data:Resident[];timestamp:number}|null=null;
let residentRequest:Promise<Resident[]>|null=null;
const residentPageCache=new Map<string,{data:ResidentPage;expires:number}>();
const residentPageRequests=new Map<string,Promise<ResidentPage>>();
let residentPageEpoch=0;
let optionCache:{houses:HouseOption[];parties:PartyOption[];boxes:string[];timestamp:number}|null=null;
let optionRequest:Promise<{houses:HouseOption[];parties:PartyOption[];boxes:string[]}>|null=null;
export function invalidateResidentCache(){directoryEpoch++;residentPageEpoch++;directoryPages.clear();directoryRequests.clear();residentPageCache.clear();residentPageRequests.clear();directoryOptions=null;residentCache=null;residentRequest=null;optionCache=null;optionRequest=null}
supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='USER_UPDATED')invalidateResidentCache()});
export interface ResidentPage{rows:Resident[];count:number}
export interface HouseOption{name:string;count:number}
export interface PartyOption{name:string;count:number}
export interface ResidentChangeRequest{id:number|string;resident_id:number|string;existing_phone?:string|null;requested_phone?:string|null;existing_lives_in?:string|null;requested_lives_in?:string|null;request_note?:string|null;status:'pending'|'approved'|'rejected';submitted_at?:string|null;reviewed_at?:string|null;resident?:Resident|null}
export interface CallCenterQueueOptions{page?:number;pageSize?:number;search?:string;party?:string;phoneStatus?:string;outcome?:string;reachStatus?:string}
export interface SaveCallCenterInput{outcome:CallOutcome;vote_status?:VoteStatus;support_level?:SupportLevel;includePoliticalFields?:boolean;notes?:string;duration_seconds?:number|null;callback_at?:string|null;next_action?:string|null;recorded_by?:string|null}
function normalizeHouse(value?:string|null){const name=(value||'').trim();if(!name)return'';const compact=name.toLowerCase().replace(/[._/\\-]+/g,' ').replace(/\s+/g,' ').trim();const dhaftharPattern=/^(?:no\s*)?(?:dh\s*r|dhr|rs)(?:\s*no)?\s*\d+/i;if(compact.includes('dhafthar')||dhaftharPattern.test(compact)||compact.startsWith('no rs')||compact.startsWith('no dh r')||compact.startsWith('dh r')||compact.startsWith('dhr'))return'Dhafthar';if(compact.includes('sina male')||compact.includes('sina malé'))return'Sina Malé';return name}
function normalizeParty(value?:string|null){const party=(value||'').trim();if(!party)return'Unspecified';const p=party.toUpperCase();if(p.includes('PNC'))return'PNC';if(p.includes('MDP'))return'MDP';return party}
function normalizeResident(row:any):Resident{return {...row,phone:row.phone===null||row.phone===undefined?null:String(row.phone),house:typeof row.house==='string'?row.house.trim():row.house,photo_url:row.photo_url??null,party:normalizeParty(row.party)} as Resident}
function callDefaults():CallCenterRecord{return {resident_id:0,phone_status:'need-call',reach_status:'not-reached',vote_status:'not-decided',support_level:'not-guaranteed',call_attempts:0}}
function mergeCall(resident:Resident,call?:Partial<CallCenterRecord>):Resident{const base=callDefaults();return {...resident,phone_status:call?.phone_status??base.phone_status,reach_status:call?.reach_status??base.reach_status,vote_status:call?.vote_status??base.vote_status,support_level:call?.support_level??base.support_level,call_outcome:call?.call_outcome??null,call_attempts:call?.call_attempts??0,call_notes:call?.call_notes??null,callback_scheduled_at:call?.callback_scheduled_at??null,last_call_at:call?.last_call_at??null,recorded_by:call?.recorded_by??null,updated_at:call?.updated_at??null}}
async function loadCallMap(ids:(string|number)[]){const map=new Map<string,CallCenterRecord>();if(!ids.length)return map;const chunks=Array.from({length:Math.ceil(ids.length/500)},(_,index)=>ids.slice(index*500,(index+1)*500));const results=await Promise.all(chunks.map(async chunk=>{const {data,error}=await supabase.from('call_center').select('*').in('resident_id',chunk);if(error)throw new Error(`Call Center load failed: ${error.message}`);return data||[]}));for(const rows of results)for(const row of rows)map.set(String(row.resident_id),row as CallCenterRecord);return map}
async function fetchResidentsFresh():Promise<Resident[]>{const pageSize=1000;const first=await supabase.from(RESIDENT_TABLE).select('*',{count:'exact'}).order('id',{ascending:true}).range(0,pageSize-1);if(first.error)throw new Error(`Resident load failed: ${first.error.message}`);const masters:Resident[]=(first.data||[]).map(normalizeResident);const pageCount=first.count===null?null:Math.ceil(first.count/pageSize);if(pageCount===null){for(let from=pageSize;;from+=pageSize){const {data,error}=await supabase.from(RESIDENT_TABLE).select('*').order('id',{ascending:true}).range(from,from+pageSize-1);if(error)throw new Error(`Resident load failed: ${error.message}`);masters.push(...(data||[]).map(normalizeResident));if((data||[]).length<pageSize)break}}else{for(let start=1;start<pageCount;start+=4){const pages=Array.from({length:Math.min(4,pageCount-start)},(_,offset)=>start+offset);const results=await Promise.all(pages.map(async page=>{const {data,error}=await supabase.from(RESIDENT_TABLE).select('*').order('id',{ascending:true}).range(page*pageSize,(page+1)*pageSize-1);if(error)throw new Error(`Resident load failed: ${error.message}`);return data||[]}));for(const rows of results)masters.push(...rows.map(normalizeResident))}}const calls=await loadCallMap(masters.map(r=>r.id));return masters.map(r=>mergeCall(r,calls.get(String(r.id))))}
export async function getResidents(forceRefresh=false):Promise<Resident[]>{const now=Date.now();if(!forceRefresh&&residentCache&&now-residentCache.timestamp<RESIDENT_CACHE_TTL)return residentCache.data;if(!forceRefresh&&residentRequest)return residentRequest;residentRequest=fetchResidentsFresh().then(data=>{residentCache={data,timestamp:Date.now()};residentRequest=null;return data}).catch(error=>{residentRequest=null;throw error});return residentRequest}
async function getFilterOptions(){const now=Date.now();if(optionCache&&now-optionCache.timestamp<RESIDENT_CACHE_TTL)return optionCache;if(optionRequest)return optionRequest;optionRequest=(async()=>{const pageSize=1000,rows:{house?:string|null;party?:string|null;election_box?:string|null}[]=[];for(let from=0;;from+=pageSize){const {data,error}=await supabase.from(RESIDENT_TABLE).select('house,party,election_box').range(from,from+pageSize-1);if(error)throw new Error(`Resident filter load failed: ${error.message}`);rows.push(...(data||[]));if((data||[]).length<pageSize)break}const houseCounts=new Map<string,number>(),partyCounts=new Map<string,number>(),boxValues=new Set<string>();for(const row of rows){const house=normalizeHouse(row.house);if(house)houseCounts.set(house,(houseCounts.get(house)||0)+1);const party=normalizeParty(row.party);partyCounts.set(party,(partyCounts.get(party)||0)+1);const box=String(row.election_box||'').trim();if(box)boxValues.add(box)}const houses=[...houseCounts.entries()].map(([name,count])=>({name,count})).sort((a,b)=>a.name.localeCompare(b.name));const preferred=['PNC','MDP','Other','Unspecified'],mapped=[...partyCounts.entries()].map(([name,count])=>({name,count})),parties=mapped.filter(x=>['PNC','MDP','Unspecified'].includes(x.name)),otherCount=mapped.filter(x=>!['PNC','MDP','Unspecified'].includes(x.name)).reduce((sum,x)=>sum+x.count,0);if(otherCount)parties.push({name:'Other',count:otherCount});parties.sort((a,b)=>preferred.indexOf(a.name)-preferred.indexOf(b.name));const boxes=[...boxValues].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));optionCache={houses,parties,boxes,timestamp:Date.now()};optionRequest=null;return {houses,parties,boxes}})().catch(error=>{optionRequest=null;throw error});return optionRequest}
export async function getHouseOptions():Promise<HouseOption[]>{return (await getFilterOptions()).houses}
export async function getPartyOptions():Promise<PartyOption[]>{return (await getFilterOptions()).parties}
export async function getElectionBoxOptions():Promise<string[]>{return (await getFilterOptions()).boxes}
function matchesSearch(r:Resident,search:string){const term=search.trim().toLowerCase();if(!term)return true;return [r.id,r.name,r.national_id,r.house,r.lives_in,r.phone,r.election_box].some(v=>String(v||'').toLowerCase().includes(term))}
function matchesParty(r:Resident,party:string){if(!party||party==='all')return true;const value=normalizeParty(r.party);if(party==='Other')return !['PNC','MDP','Unspecified'].includes(value);return value===party}
function matchesFilter(r:Resident,filter:string){if(!filter||filter==='all')return true;if(['will-vote','not-decided','not-vote'].includes(filter))return r.vote_status===filter;if(['need-call','called'].includes(filter))return r.phone_status===filter;if(['reached','not-reached'].includes(filter))return r.reach_status===filter;if(['guaranteed','not-guaranteed'].includes(filter))return r.support_level===filter;return true}
function matchesGender(r:Resident,gender:string){return !gender||gender==='all'||String(r.sex||'').trim().toUpperCase()===gender.toUpperCase()}
function matchesAge(r:Resident,age:string){if(!age||age==='all')return true;const value=Number(r.age);if(!Number.isFinite(value))return false;if(age==='18-25')return value>=18&&value<=25;if(age==='26-35')return value>=26&&value<=35;if(age==='36-45')return value>=36&&value<=45;if(age==='46-60')return value>=46&&value<=60;if(age==='61+')return value>=61;return true}
function matchesBox(r:Resident,box:string){return !box||box==='all'||String(r.election_box||'').trim()===box}
function ageBounds(age:string):[number|null,number|null]{if(age==='18-25')return[18,25];if(age==='26-35')return[26,35];if(age==='36-45')return[36,45];if(age==='46-60')return[46,60];if(age==='61+')return[61,null];return[null,null]}
interface ResidentPageOptions{page?:number;pageSize?:number;search?:string;filter?:string;house?:string;party?:string;gender?:string;age?:string;box?:string}
async function fetchResidentsPage({page=1,pageSize=25,search='',filter='all',house='all',party='all',gender='all',age='all',box='all'}:ResidentPageOptions):Promise<ResidentPage>{
 const requiresClientFallback=filter!=='all'||party==='Other'||house==='Dhafthar'||house==='Sina Malé';
 if(requiresClientFallback){const all=await getResidents();const filtered=all.filter(r=>matchesSearch(r,search)&&matchesParty(r,party)&&matchesFilter(r,filter)&&matchesGender(r,gender)&&matchesAge(r,age)&&matchesBox(r,box)&&(house==='all'||normalizeHouse(r.house)===house));const safeSize=Math.min(100,Math.max(10,pageSize)),start=(Math.max(1,page)-1)*safeSize;return {rows:filtered.slice(start,start+safeSize),count:filtered.length}}
 const result=await getDirectoryPage({search,house,party,gender,age,box},page,Math.min(100,Math.max(10,pageSize)));
 const calls=await loadCallMap(result.rows.map(r=>r.id));
 return {rows:result.rows.map(r=>mergeCall(r,calls.get(String(r.id)))),count:result.count}
}
export async function getResidentsPage(options:ResidentPageOptions={}):Promise<ResidentPage>{
 const normalized={page:options.page??1,pageSize:options.pageSize??25,search:options.search?.trim()??'',filter:options.filter??'all',house:options.house??'all',party:options.party??'all',gender:options.gender??'all',age:options.age??'all',box:options.box??'all'};
 const key=JSON.stringify(normalized),cached=residentPageCache.get(key);
 if(cached&&cached.expires>Date.now())return cached.data;
 if(residentPageRequests.has(key))return residentPageRequests.get(key)!;
 const epoch=residentPageEpoch;
 const request=fetchResidentsPage(normalized).then(data=>{if(epoch===residentPageEpoch){if(residentPageCache.size>=30)residentPageCache.clear();residentPageCache.set(key,{data,expires:Date.now()+RESIDENT_PAGE_CACHE_TTL})}return data});
 residentPageRequests.set(key,request);
 try{return await request}finally{if(residentPageRequests.get(key)===request)residentPageRequests.delete(key)}
}
export async function getResidentById(id:Resident['id']):Promise<Resident>{if(residentCache&&Date.now()-residentCache.timestamp<RESIDENT_CACHE_TTL){const cached=residentCache.data.find(r=>String(r.id)===String(id));if(cached)return cached}const {data,error}=await supabase.from(RESIDENT_TABLE).select('*').eq('id',id).maybeSingle();if(error)throw new Error(`Resident load failed: ${error.message}`);if(!data)throw new Error('Resident record not found.');const calls=await loadCallMap([id]);return mergeCall(normalizeResident(data),calls.get(String(id)))}
export async function getNextResidentId(id:Resident['id']):Promise<Resident['id']>{const cached=residentCache?.data;if(cached?.length){const index=cached.findIndex(r=>String(r.id)===String(id));return cached[(index+1+cached.length)%cached.length].id}const next=await supabase.from(RESIDENT_TABLE).select('id').gt('id',id).order('id',{ascending:true}).limit(1).maybeSingle();if(next.error)throw new Error(`Next resident lookup failed: ${next.error.message}`);if(next.data?.id!==undefined)return next.data.id;const first=await supabase.from(RESIDENT_TABLE).select('id').order('id',{ascending:true}).limit(1).maybeSingle();if(first.error)throw new Error(`Resident lookup failed: ${first.error.message}`);if(first.data?.id===undefined)throw new Error('No resident records are available.');return first.data.id}
export async function updateResident(_id:Resident['id'],_changes:Partial<Resident>):Promise<Resident>{throw new Error('Resident is read-only. Save results in the matching workflow section.')}
export async function getCallCenterQueue({page=1,pageSize=30,search='',party='all',phoneStatus='all',outcome='all',reachStatus='all'}:CallCenterQueueOptions={}):Promise<ResidentPage>{
 if(phoneStatus==='all'&&outcome==='all'&&reachStatus==='all')return getResidentsPage({page,pageSize,search,party});
 let callQuery=supabase.from('call_center').select('resident_id').order('resident_id',{ascending:true});
 if(phoneStatus!=='all')callQuery=callQuery.eq('phone_status',phoneStatus);
 if(reachStatus!=='all')callQuery=callQuery.eq('reach_status',reachStatus);
 if(outcome==='pending')callQuery=callQuery.or('call_outcome.is.null,call_outcome.eq.pending');
 else if(outcome!=='all')callQuery=callQuery.eq('call_outcome',outcome);
 const residentIds:(number|string)[]=[];
 for(let from=0;;from+=1000){const {data,error}=await callQuery.range(from,from+999);if(error)throw new Error(`Call Center filter failed: ${error.message}`);const batch=data||[];residentIds.push(...batch.map(row=>row.resident_id));if(batch.length<1000)break}
 if(!residentIds.length)return {rows:[],count:0};
 const size=Math.min(100,Math.max(10,pageSize)),start=(Math.max(1,page)-1)*size,end=start+size-1;
 let residentQuery=supabase.from(RESIDENT_TABLE).select('*',{count:'exact'}).in('id',residentIds).order('id',{ascending:true});
 const term=search.trim().replace(/[,%()]/g,' ');
 if(term){const exactId=/^\d+$/.test(term)?`,id.eq.${term}`:'';residentQuery=residentQuery.or(`name.ilike.%${term}%,national_id.ilike.%${term}%,phone.ilike.%${term}%,house.ilike.%${term}%,lives_in.ilike.%${term}%,election_box.ilike.%${term}${exactId}`)}
 if(party==='Unspecified')residentQuery=residentQuery.is('party',null);
 else if(party!=='all')residentQuery=residentQuery.ilike('party',`%${party}%`);
 const {data,error,count}=await residentQuery.range(start,end);
 if(error)throw new Error(`Call resident lookup failed: ${error.message}`);
 const masters=(data||[]).map(normalizeResident),calls=await loadCallMap(masters.map(r=>r.id));
 return {rows:masters.map(r=>mergeCall(r,calls.get(String(r.id)))),count:count||0}
}
export async function saveCallCenterResult(residentId:Resident['id'],input:SaveCallCenterInput):Promise<void>{const pending=input.outcome==='pending',connected=input.outcome==='connected';const current=await supabase.from('call_center').select('call_attempts').eq('resident_id',residentId).maybeSingle();if(current.error)throw new Error(`Call history lookup failed: ${current.error.message}`);const now=new Date().toISOString();const payload:any={resident_id:residentId,phone_status:pending?'need-call':'called',reach_status:connected?'reached':'not-reached',call_outcome:input.outcome,call_attempts:(current.data?.call_attempts||0)+(pending?0:1),call_notes:input.notes?.trim()||null,call_duration_seconds:pending?null:(input.duration_seconds??null),callback_scheduled_at:input.callback_at||null,last_call_at:pending?null:now,next_action:input.next_action?.trim()||null,recorded_by:input.recorded_by?.trim()||null,updated_at:now};if(input.includePoliticalFields!==false){payload.vote_status=connected?(input.vote_status||'not-decided'):'not-decided';payload.support_level=connected?(input.support_level||'not-guaranteed'):'not-guaranteed'}const {error}=await supabase.from('call_center').upsert(payload,{onConflict:'resident_id'});if(error)throw new Error(`Call Center save failed: ${error.message}`);invalidateResidentCache()}
export async function saveDoorToDoorResult(residentId:Resident['id'],visitStatus:'not-visited'|'visited'|'not-home'|'access-issue'|'address-not-found'|'visit-postponed',notes:string):Promise<void>{const current=await supabase.from('door_to_door').select('vote_status,support_level').eq('resident_id',residentId).maybeSingle();if(current.error)throw new Error(`Visit record lookup failed: ${current.error.message}`);const session=await supabase.auth.getSession();if(session.error)throw new Error(`Staff session lookup failed: ${session.error.message}`);const now=new Date().toISOString(),recorder=session.data.session?.user.email||null;const {error}=await supabase.from('door_to_door').upsert({resident_id:residentId,visit_status:visitStatus,vote_status:current.data?.vote_status||'not-decided',support_level:current.data?.support_level||'not-guaranteed',visit_notes:notes.trim()||null,last_visit_at:visitStatus==='not-visited'?null:now,recorded_by:recorder,updated_at:now},{onConflict:'resident_id'});if(error)throw new Error(`Door-to-door save failed: ${error.message}`);const visitLog=visitStatus==='not-visited'?`Door-to-door status set to pending.${notes.trim()?` Note: ${notes.trim()}`:''}`:`Visit result: ${visitStatus.replaceAll('-',' ')}.${notes.trim()?` Note: ${notes.trim()}`:''}`;const {error:historyError}=await supabase.from('remarks').insert({id:Date.now(),resident_id:Number(residentId),section:'door-to-door',remark:visitLog,recorded_by:recorder,recorded_at:now});if(historyError)throw new Error(`Visit status saved, but its history could not be added: ${historyError.message}`);invalidateResidentCache()}
export async function submitResidentContactChange(resident:Resident,{phone,lives_in,remarks}:{phone?:string|null;lives_in?:string|null;remarks?:string|null}){const payload={resident_id:resident.id,existing_phone:resident.phone??null,requested_phone:phone?.trim()||null,existing_lives_in:resident.lives_in??null,requested_lives_in:lives_in?.trim()||null,request_note:remarks?.trim()||null,status:'pending',submitted_at:new Date().toISOString()};if(payload.requested_phone===payload.existing_phone&&payload.requested_lives_in===payload.existing_lives_in)throw new Error('Enter a different mobile number or living place.');const {error}=await supabase.from('contact_verification').insert(payload);if(error)throw new Error(`Verification request failed: ${error.message}`)}
export async function getResidentChangeRequests(status:'pending'|'approved'|'rejected'='pending'):Promise<ResidentChangeRequest[]>{const {data,error}=await supabase.from('contact_verification').select('*').eq('status',status).order('submitted_at',{ascending:false});if(error)throw new Error(`Verification queue failed: ${error.message}`);const rows=data||[],ids=[...new Set(rows.map((r:any)=>r.resident_id).filter(Boolean))],residentMap=new Map<string,Resident>();if(ids.length){const response=await supabase.from(RESIDENT_TABLE).select('*').in('id',ids);if(response.error)throw new Error(`Resident lookup failed: ${response.error.message}`);for(const row of response.data||[])residentMap.set(String(row.id),normalizeResident(row))}return rows.map((row:any)=>({...row,resident:residentMap.get(String(row.resident_id))||null}))}
export async function reviewResidentChangeRequest(request:ResidentChangeRequest,decision:'approved'|'rejected'){const {error}=await supabase.from('contact_verification').update({status:decision,reviewed_at:new Date().toISOString()}).eq('id',request.id);if(error)throw new Error(`Review save failed: ${error.message}`)}
export interface DirectoryFilters{search?:string;house?:string;party?:string;gender?:string;age?:string;box?:string}
let directoryEpoch=0;
const directoryPages=new Map<string,{expires:number;data:ResidentPage}>();
const directoryRequests=new Map<string,Promise<ResidentPage>>();
let directoryOptions:Promise<{houses:HouseOption[];parties:PartyOption[];boxes:string[]}>|null=null;
export function getDirectoryFilterOptions(){
 if(!directoryOptions)directoryOptions=(async()=>{
  const {data,error}=await supabase.rpc('vote_resident_directory_filters');
  if(error)throw new Error(`Directory filters failed: ${error.message}`);
  return data as {houses:HouseOption[];parties:PartyOption[];boxes:string[]};
 })().catch(error=>{directoryOptions=null;throw error});
 return directoryOptions;
}
export async function getMdpRosterPage(filters:DirectoryFilters,page=1,pageSize=50):Promise<ResidentPage>{
 const args={p_page:page,p_page_size:pageSize,p_search:filters.search||'',p_house:filters.house||'all',p_gender:filters.gender||'all',p_age:filters.age||'all',p_box:filters.box||'all'};
 const {data,error}=await supabase.rpc('mdp_2026_roster_directory',args);
 if(error)throw new Error('MDP 2026 roster failed: '+error.message);
 return {count:Number(data.count||0),rows:(data.rows||[]).map((row:any)=>({...row,phone:row.phone==null?null:String(row.phone),party:normalizeParty(row.party)} as Resident))};
}

export async function getDirectoryPage(filters:DirectoryFilters,page=1,pageSize=24,fresh=false):Promise<ResidentPage>{
 const args={p_page:page,p_page_size:pageSize,p_search:filters.search||'',p_house:filters.house||'all',p_party:filters.party||'all',p_gender:filters.gender||'all',p_age:filters.age||'all',p_box:filters.box||'all'};
 const key=JSON.stringify(args),cached=directoryPages.get(key);
 if(!fresh&&cached&&cached.expires>Date.now())return cached.data;
 if(!fresh&&directoryRequests.has(key))return directoryRequests.get(key)!;
 const epoch=directoryEpoch;
 const request=(async()=>{
  const {data,error}=await supabase.rpc('vote_resident_directory',args);
  if(error)throw new Error(`Resident directory failed: ${error.message}`);
  const result={count:Number(data.count),rows:(data.rows||[]).map((row:any)=>({...row,phone:row.phone==null?null:String(row.phone),party:normalizeParty(row.party)} as Resident))};
  if(epoch===directoryEpoch){
   if(directoryPages.size>=50)directoryPages.clear();
   directoryPages.set(key,{data:result,expires:Date.now()+30000});
  }
  return result;
 })();
 directoryRequests.set(key,request);
 try{return await request}finally{if(directoryRequests.get(key)===request)directoryRequests.delete(key)}
}
