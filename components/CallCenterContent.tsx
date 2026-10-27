'use client';
import {useDeferredValue,useEffect,useMemo,useRef,useState,startTransition} from 'react';
import {getCallCenterQueue,saveCallCenterResult,supabase} from '../lib/supabase';
import type {CallOutcome,Resident} from '../lib/types';
import {PartyFilter,ResidentIdentity} from '../shared/ResidentIdentity';
import {ResidentCard,ResidentFields} from '../shared/ResidentCard';
import TaskState from '../shared/TaskState';
import MDPTaskKpiSummary from './MDPTaskKpiSummary';
import {getMyPrivateWork,saveMyPrivateWork} from '../lib/mdp-private-work';

const outcomes:CallOutcome[]=['pending','connected','busy','not-answer','out-of-coverage','disconnected','wrong-number'];
const text=(value:string)=>value.replace(/-/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
const phoneDigits=(value?:string|null)=>String(value||'').replace(/\D/g,'');
const phoneHref=(value?:string|null)=>{const digits=phoneDigits(value);if(!digits)return'';return digits.startsWith('960')?`+${digits}`:`+960${digits}`};

export default function CallCenterContent({partyControls=true}:{partyControls?:boolean}){
 const [rows,setRows]=useState<Resident[]>([]),[count,setCount]=useState(0),[page,setPage]=useState(1),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [searchInput,setSearchInput]=useState(''),[partyInput,setPartyInput]=useState('all'),[statusInput,setStatusInput]=useState('all'),[outcomeInput,setOutcomeInput]=useState('all'),[reachInput,setReachInput]=useState('all');
 const [search,setSearch]=useState(''),[party,setParty]=useState('all'),[status,setStatus]=useState('all'),[outcome,setOutcome]=useState('all'),[reach,setReach]=useState('all'),[selected,setSelected]=useState<Resident|null>(null),[queryReady,setQueryReady]=useState(false);
 useEffect(()=>{const params=new URLSearchParams(window.location.search),requestedStatus=params.get('status'),requestedOutcome=params.get('outcome'),requestedReach=params.get('reach');if(['need-call','called'].includes(requestedStatus||'')){setStatus(requestedStatus!);setStatusInput(requestedStatus!)}if(outcomes.includes(requestedOutcome as CallOutcome)){setOutcome(requestedOutcome!);setOutcomeInput(requestedOutcome!)}if(['reached','not-reached'].includes(requestedReach||'')){setReach(requestedReach!);setReachInput(requestedReach!)}setQueryReady(true)},[]);
 const deferredSearch=useDeferredValue(search);
 const callQueryId=useRef(0);
 useEffect(()=>{
  if(!queryReady)return;
  const requestId=++callQueryId.current;
  setLoading(true);setError('');
  void getCallCenterQueue({page,pageSize:30,search:deferredSearch,party:partyControls?party:'MDP',phoneStatus:partyControls?status:'all',outcome:partyControls?outcome:'all',reachStatus:partyControls?reach:'all'})
   .then(async result=>{if(requestId!==callQueryId.current)return;if(partyControls){setRows(result.rows);setCount(result.count);return;}setRows(result.rows.map(row=>({...row,phone_status:'need-call' as Resident['phone_status'],reach_status:'not-reached' as Resident['reach_status'],call_outcome:'pending' as Resident['call_outcome'],call_attempts:0,call_notes:null})));setCount(result.count);setLoading(false);
    const ids=result.rows.map(row=>Number(row.id)).filter(Number.isFinite);
    if(!ids.length)return;
    const {data:ownRows,error:ownError}=await supabase.from('staff_private_work_records').select('resident_id,payload').eq('workflow_type','call').in('resident_id',ids);
    if(requestId!==callQueryId.current)return;
    if(ownError){setError('Private call history unavailable: '+ownError.message);return;}
    const ownMap=new Map((ownRows||[]).map(item=>[String(item.resident_id),(item.payload||{}) as Record<string,unknown>]));
    setRows(result.rows.map(row=>{const p=ownMap.get(String(row.id))||{};return {...row,phone_status:(p.phone_status as Resident['phone_status'])||'need-call',reach_status:(p.reach_status as Resident['reach_status'])||'not-reached',call_outcome:(p.outcome as Resident['call_outcome'])||'pending',call_attempts:Number(p.call_attempts||0),call_notes:(p.notes as string)||null,callback_scheduled_at:(p.callback_at as string)||null,last_call_at:(p.last_call_at as string)||null};}));})
   .catch(e=>{if(requestId===callQueryId.current)setError(e instanceof Error?e.message:'Unable to load calls')})
   .finally(()=>{if(requestId===callQueryId.current)setLoading(false)});
  return()=>{callQueryId.current++};
 },[deferredSearch,party,partyControls,status,outcome,reach,page,queryReady]);
 function applySearch(){startTransition(()=>{setPage(1);setSearch(searchInput.trim());setParty(partyInput);setStatus(statusInput);setOutcome(outcomeInput);setReach(reachInput)})}
 function reset(){setSearchInput('');setPartyInput('all');setStatusInput('all');setOutcomeInput('all');setReachInput('all');setSearch('');setParty('all');setStatus('all');setOutcome('all');setReach('all');setPage(1)}
 const visibleRows=useMemo(()=>partyControls?rows:rows.filter(r=>(status==='all'||(status==='called'?r.phone_status==='called':r.phone_status!=='called'))&&(outcome==='all'||r.call_outcome===outcome)&&(reach==='all'||r.reach_status===reach)),[rows,partyControls,status,outcome,reach]);
 const pageCallCounts=useMemo(()=>({need:rows.filter(r=>r.phone_status!=='called').length,called:rows.filter(r=>r.phone_status==='called').length,noAnswer:rows.filter(r=>r.call_outcome==='not-answer').length}),[rows]);
 return <div className="space-y-4">
  <section className="page-hero"><p className="eyebrow">Resident calls</p><h1 className="mt-2">Calls</h1></section>
  {!partyControls&&<MDPTaskKpiSummary title="Call task KPI summary" items={[
    {key:'all',label:'Matching residents',value:loading?null:count,detail:'Current search',active:status==='all'&&outcome==='all',onSelect:()=>{setStatus('all');setStatusInput('all');setOutcome('all');setOutcomeInput('all');setPage(1)}},
    {key:'need',label:'Need a call',value:loading?null:rows.filter(r=>r.phone_status!=='called').length,detail:'Current page',active:status==='need-call',onSelect:()=>{setStatus('need-call');setStatusInput('need-call');setOutcome('all');setOutcomeInput('all');setPage(1)}},
    {key:'called',label:'Calls recorded',value:loading?null:rows.filter(r=>r.phone_status==='called').length,detail:'Current page',active:status==='called',onSelect:()=>{setStatus('called');setStatusInput('called');setOutcome('all');setOutcomeInput('all');setPage(1)}},
    {key:'no-answer',label:'No answer',value:loading?null:rows.filter(r=>r.call_outcome==='not-answer').length,detail:'Current page',active:outcome==='not-answer',onSelect:()=>{setOutcome('not-answer');setOutcomeInput('not-answer');setStatus('all');setStatusInput('all');setPage(1)}},
   ]}/>}
  <section className="panel space-y-4">{partyControls&&<PartyFilter value={partyInput} onChange={value=>{setPartyInput(value);setParty(value)}}/>}<label className="block"><span className="field-label">Find a resident or house</span><input className="field w-full min-w-0" value={searchInput} onChange={e=>setSearchInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')applySearch()}} placeholder="Name, ID, house or phone"/></label><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto_auto]"><select aria-label="Filter by call status" className="field" value={statusInput} onChange={e=>{setStatusInput(e.target.value);setStatus(e.target.value);setPage(1)}}><option value="all">All call statuses</option><option value="need-call">Need call</option><option value="called">Called</option></select><select aria-label="Filter by call result" className="field" value={outcomeInput} onChange={e=>{setOutcomeInput(e.target.value);setOutcome(e.target.value);setPage(1)}}><option value="all">All call results</option>{outcomes.map(item=><option key={item} value={item}>{text(item)}</option>)}</select><select aria-label="Filter by resident reach" className="field" value={reachInput} onChange={e=>{setReachInput(e.target.value);setReach(e.target.value);setPage(1)}}><option value="all">All reach statuses</option><option value="reached">Reached</option><option value="not-reached">Not reached</option></select><button className="btn-primary" onClick={applySearch}>Search</button><button className="btn-secondary" onClick={reset}>Reset</button></div></section>
  {error&&<div className="error-banner">{error}</div>}
  <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{loading?Array.from({length:6}).map((_,i)=><div key={i} className="h-72 animate-pulse rounded-card bg-primary-light"/>):visibleRows.map(r=>{const callResult=String(r.call_outcome||'pending');const callComplete=callResult!=='pending'&&callResult!=='';return <ResidentCard key={String(r.id)} resident={r} showParty={partyControls} className="call-resident-card"><TaskState label="Call" status={callComplete?text(callResult):'Pending'} icon="phone" complete={callComplete}/><button onClick={()=>setSelected(r)} className="btn-primary mt-3 w-full">Record call</button><div className="mt-3"><ResidentFields resident={r} includeBox={false}/></div><details className="mt-3 rounded-xl border border-border bg-slate-50 px-3 py-2"><summary className="cursor-pointer py-1 text-sm font-semibold text-navy">Previous call details</summary><div className="mt-3 grid grid-cols-2 gap-2 text-xs call-card-summary"><Box label="Attempts" value={String(r.call_attempts||0)}/><Box label="Last result" value={text(callResult)}/></div>{r.call_notes&&<div className="mt-3 rounded-lg border border-border bg-white p-3"><span className="text-[11px] font-semibold uppercase tracking-wide text-body">Latest call remark</span><p className="mt-1 whitespace-pre-wrap text-sm text-navy">{r.call_notes}</p></div>}</details></ResidentCard>})}</section>
  {!loading&&!visibleRows.length&&<div className="empty-state">No residents match the selected filters.</div>}{!loading&&count>30&&<section className="panel flex items-center justify-between"><button className="btn-secondary" disabled={page<=1} onClick={()=>setPage(value=>value-1)}>Previous</button><span className="text-sm text-body">Page {page} of {Math.ceil(count/30)}</span><button className="btn-secondary" disabled={page>=Math.ceil(count/30)} onClick={()=>setPage(value=>value+1)}>Next</button></section>}
  {selected&&<CallForm resident={selected} showParty={partyControls} privateMode={!partyControls} close={()=>setSelected(null)} saved={updated=>{setRows(current=>current.map(row=>String(row.id)===String(updated.id)?updated:row));setSelected(null)}}/>}
 </div>
}

function CallForm({resident,close,saved,showParty=true,privateMode=false}:{resident:Resident;close:()=>void;saved:(updated:Resident)=>void;showParty?:boolean;privateMode?:boolean}){
 const [outcome,setOutcome]=useState<CallOutcome>((resident.call_outcome as CallOutcome)||'pending'),[followUp,setFollowUp]=useState(''),[callbackAt,setCallbackAt]=useState(''),[remark,setRemark]=useState(resident.call_notes||''),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const dialNumber=phoneHref(resident.phone);
 async function submit(){
  setSaving(true);setError('');
  try{
   const cleanRemark=remark.trim();
   const callAt=new Date().toISOString();
   if(privateMode){await saveMyPrivateWork(Number(resident.id),'call',{outcome,notes:cleanRemark,next_action:followUp,callback_at:callbackAt?new Date(callbackAt).toISOString():null,phone_status:outcome==='pending'?'need-call':'called',reach_status:outcome==='connected'?'reached':'not-reached',call_attempts:(resident.call_attempts||0)+(outcome==='pending'?0:1),last_call_at:callAt});saved({...resident,phone_status:outcome==='pending'?'need-call':'called',reach_status:outcome==='connected'?'reached':'not-reached',call_outcome:outcome,call_attempts:(resident.call_attempts||0)+(outcome==='pending'?0:1),call_notes:cleanRemark});return;}
   const [,sessionResult]=await Promise.all([
    saveCallCenterResult(resident.id,{outcome,includePoliticalFields:false,notes:cleanRemark||undefined,next_action:followUp||undefined,callback_at:callbackAt?new Date(callbackAt).toISOString():null}),
    supabase.auth.getSession(),
   ]);
   const session=sessionResult.data.session;
   const followUpText=followUp?` Follow-up: ${text(followUp)}${callbackAt?` at ${new Date(callbackAt).toLocaleString()}`:''}.`:'';
   const logText=`Call result: ${text(outcome)}.${followUpText}${cleanRemark?` Note: ${cleanRemark}`:''}`;
   const {error:remarkError}=await supabase.from('remarks').insert({id:Date.now(),resident_id:Number(resident.id),section:'call-center',remark:logText,recorded_by:session?.user.email||null,recorded_at:new Date().toISOString()});
   if(remarkError)throw new Error(`Call result saved, but its history could not be added: ${remarkError.message}`);
   saved({...resident,phone_status:outcome==='pending'?'need-call':'called',reach_status:outcome==='connected'?'reached':'not-reached',call_outcome:outcome,call_attempts:(resident.call_attempts||0)+(outcome==='pending'?0:1),call_notes:cleanRemark||null,callback_scheduled_at:callbackAt?new Date(callbackAt).toISOString():null,last_call_at:outcome==='pending'?resident.last_call_at||null:callAt,updated_at:callAt});
  }catch(e){setError(e instanceof Error?e.message:'Save failed')}finally{setSaving(false)}
 }
 return <div className="fixed inset-0 z-50 flex justify-end bg-navy/40"><aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"><header className="sticky top-0 z-10 border-b border-border bg-white p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><ResidentIdentity resident={resident} showParty={showParty}/><button className="btn-ghost shrink-0" onClick={close}>Close</button></div><div className="mt-4 rounded-xl border border-border bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-body">Mobile number</p><div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><a className="text-xl font-semibold text-navy" href={dialNumber?`tel:${dialNumber}`:undefined}>{resident.phone||'No phone recorded'}</a>{dialNumber&&<div className="grid grid-cols-2 gap-2 sm:flex"><a className="btn-primary min-w-28" href={`tel:${dialNumber}`}>Call</a><a className="btn-secondary min-w-28" href={`sms:${dialNumber}`}>SMS</a></div>}</div></div></header><div className="space-y-5 p-5"><section><p className="eyebrow">Call task</p><h2 className="mt-1 text-lg font-bold text-navy">Record contact result</h2><p className="mt-1 text-sm text-body">Save what happened on this call. Follow-up is tracked separately.</p></section><ChoiceGroup title="Call result" values={outcomes} selected={outcome} choose={v=>setOutcome(v as CallOutcome)}/><section className="space-y-3"><h3>Follow-up task</h3><select className="field" value={followUp} onChange={e=>setFollowUp(e.target.value)}><option value="">No follow-up needed</option><option value="call-back">Call again</option><option value="home-visit">Arrange a home visit</option><option value="transport-request">Review transport request</option></select>{followUp==='call-back'&&<label className="block"><span className="field-label">Call back at (optional)</span><input className="field" type="datetime-local" value={callbackAt} onChange={e=>setCallbackAt(e.target.value)}/></label>}</section><section><div className="flex items-center justify-between gap-3"><h3>Call note</h3><span className="text-xs text-body">Saved privately to your account</span></div><textarea className="field mt-3 min-h-28 py-3" value={remark} onChange={e=>setRemark(e.target.value)} placeholder="Write a factual call note"/></section>{error&&<div className="error-banner">{error}</div>}<div className="grid gap-2 sm:grid-cols-2"><button className="btn-secondary" onClick={close}>Cancel</button><button disabled={saving} onClick={submit} className="btn-primary">{saving?'Saving…':'Save call task'}</button></div></div></aside></div>
}
function ChoiceGroup({title,values,selected,choose}:{title:string;values:string[];selected:string;choose:(v:string)=>void}){return <section><h3>{title}</h3><div className="mt-3 grid grid-cols-2 gap-2">{values.map(v=><button key={v} onClick={()=>choose(v)} className={`rounded-lg border p-3 text-sm font-semibold ${selected===v?'border-primary bg-primary-light text-primary':'border-border text-body'}`}>{text(v)}</button>)}</div></section>}
function Box({label,value}:{label:string;value:string}){return <div className="rounded-lg bg-slate-50 p-3"><span className="block text-body">{label}</span><b className="block truncate text-navy">{value}</b></div>}
