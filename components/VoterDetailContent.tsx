'use client';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import {getResidentById,updateResident} from '../lib/supabase';
import type {Resident} from '../lib/types';
import StatusBadge from '../shared/StatusBadge';

const tabs=['Overview','Call Center','Door-to-Door','Candidate Meeting','Election Day','Remarks','Assignments'];
const editableFields:(keyof Resident)[]=['name','national_id','house','lives_in','phone','party','vote_status','phone_status','reach_status','d2d_status','support_level','remarks'];

export default function VoterDetailContent(){
 const params=useSearchParams();
 const id=params.get('id');
 const [resident,setResident]=useState<Resident|null>(null);
 const [draft,setDraft]=useState<Partial<Resident>>({});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [active,setActive]=useState('Overview');
 const [saving,setSaving]=useState(false);
 const [saved,setSaved]=useState('');

 useEffect(()=>{
  let mounted=true;
  setSaved('');setError('');
  if(!id){setResident(null);setDraft({});setLoading(false);return()=>{mounted=false}}
  setLoading(true);
  getResidentById(id).then(data=>{if(mounted){setResident(data);setDraft(data)}}).catch(e=>{if(mounted)setError(e instanceof Error?e.message:'Unable to load voter')}).finally(()=>{if(mounted)setLoading(false)});
  return()=>{mounted=false};
 },[id]);

 const changes=useMemo(()=>{
  if(!resident)return{};
  const next:Partial<Resident>={};
  for(const field of editableFields){const before=resident[field]??null;const after=draft[field]??null;if(before!==after)(next as any)[field]=after}
  return next;
 },[resident,draft]);
 const dirty=Object.keys(changes).length>0;

 async function save(){if(!resident||!dirty||saving)return;setSaving(true);setSaved('');setError('');try{const updated=await updateResident(resident.id,changes);setResident(updated);setDraft(updated);setSaved('Changes saved successfully.')}catch(e){setError(e instanceof Error?e.message:'Save failed')}finally{setSaving(false)}}
 function reset(){if(resident){setDraft(resident);setError('');setSaved('Changes discarded.')}}

 if(loading)return <div className="panel" aria-busy="true">Loading voter profile…</div>;
 if(!id)return <div className="panel text-center"><h1 className="text-2xl font-bold">Select a voter first</h1><p className="mt-2 text-slate-500">Voter Detail needs a resident ID from the management list.</p><Link prefetch={false} href="/voter-management/" className="btn-primary mt-5 inline-flex">Open Voter Management</Link></div>;
 if(error&&!resident)return <div role="alert" className="panel text-rose-700">{error}<div><Link prefetch={false} href="/voter-management/" className="btn-ghost mt-4 inline-flex">Back to voters</Link></div></div>;
 if(!resident)return <div className="panel">No voter record found.</div>;

 return <div className="space-y-6">
  <section className="panel"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div className="flex items-center gap-4">{resident.photo_url?<img src={resident.photo_url} alt={resident.name?`${resident.name} photo`:'Resident photo'} className="h-20 w-20 rounded-2xl border border-slate-200 object-cover" referrerPolicy="no-referrer"/>:<div className="grid h-20 w-20 place-items-center rounded-2xl bg-slate-100 text-xl font-bold text-slate-500">{(resident.name||'?').slice(0,2).toUpperCase()}</div>}<div><p className="muted">Resident profile</p><h1 className="text-3xl font-bold">{resident.name||'Unnamed resident'}</h1><p className="mt-2 text-slate-500">{resident.national_id||'No ID'} · {resident.house||resident.lives_in||'Address unavailable'}</p>{resident.party&&<span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{resident.party}</span>}</div></div><div className="flex flex-wrap gap-2"><StatusBadge status={draft.vote_status}/><StatusBadge status={draft.phone_status}/><StatusBadge status={draft.d2d_status}/></div></div></section>
  <div role="tablist" aria-label="Voter detail sections" className="flex gap-2 overflow-x-auto pb-1">{tabs.map(t=><button type="button" role="tab" aria-selected={active===t} key={t} onClick={()=>setActive(t)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold ${active===t?'bg-calm-700 text-white':'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{t}</button>)}</div>
  <section className="panel space-y-5"><h2 className="section-title">{active}</h2>
   {active==='Overview'&&<div className="grid gap-4 md:grid-cols-2"><Field label="Name" value={draft.name||''} onChange={v=>setDraft({...draft,name:v})}/><Field label="National ID" value={draft.national_id||''} onChange={v=>setDraft({...draft,national_id:v})}/><Field label="Official address" value={draft.house||''} onChange={v=>setDraft({...draft,house:v})}/><Field label="Living now" value={draft.lives_in||''} onChange={v=>setDraft({...draft,lives_in:v})}/><Field label="Phone" value={draft.phone||''} onChange={v=>setDraft({...draft,phone:v})}/><Field label="Party" value={draft.party||''} onChange={v=>setDraft({...draft,party:v})}/></div>}
   {active==='Call Center'&&<div className="grid gap-4 md:grid-cols-2"><Select label="Phone status" value={draft.phone_status||'need-call'} options={['need-call','called']} onChange={v=>setDraft({...draft,phone_status:v as Resident['phone_status']})}/><Select label="Reach status" value={draft.reach_status||'not-reached'} options={['not-reached','reached']} onChange={v=>setDraft({...draft,reach_status:v as Resident['reach_status']})}/></div>}
   {active==='Door-to-Door'&&<Select label="Visit result" value={draft.d2d_status||'not-visited'} options={['not-visited','reach','not-home','live-in-another-place']} onChange={v=>setDraft({...draft,d2d_status:v as Resident['d2d_status']})}/>} 
   {active==='Candidate Meeting'&&<Select label="Support level" value={draft.support_level||'not-guaranteed'} options={['not-guaranteed','guaranteed']} onChange={v=>setDraft({...draft,support_level:v as Resident['support_level']})}/>} 
   {active==='Election Day'&&<Select label="Vote intention" value={draft.vote_status||'not-decided'} options={['not-decided','will-vote','not-vote']} onChange={v=>setDraft({...draft,vote_status:v as Resident['vote_status']})}/>} 
   {active==='Remarks'&&<label className="block"><span className="mb-2 block text-sm font-semibold">Remarks</span><textarea className="input-base min-h-40 w-full" value={draft.remarks||''} onChange={e=>setDraft({...draft,remarks:e.target.value})}/></label>}
   {active==='Assignments'&&<div className="soft-card text-sm text-slate-500">Assignment records are stored in <strong>resident_assignments</strong>. This panel is read-only until the assignment integration is connected.</div>}
   <div className="flex flex-col items-stretch justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center"><div aria-live="polite">{saved&&<span className="text-sm text-emerald-700">{saved}</span>}{error&&<span role="alert" className="text-sm text-rose-700">{error}</span>}{dirty&&!saved&&!error&&<span className="text-sm text-amber-700">Unsaved changes</span>}</div><div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={reset} disabled={!dirty||saving}>Discard</button><button type="button" className="btn-primary" onClick={save} disabled={!dirty||saving}>{saving?'Saving…':'Save voter update'}</button></div></div>
  </section>
 </div>;
}

function Field({label,value,onChange}:{label:string,value:string,onChange:(v:string)=>void}){return <label><span className="mb-2 block text-sm font-semibold">{label}</span><input className="input-base w-full" value={value} onChange={e=>onChange(e.target.value)} autoComplete="off"/></label>}
function Select({label,value,options,onChange}:{label:string,value:string,options:string[],onChange:(v:string)=>void}){return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span><select className="input-base w-full" value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o} value={o}>{o.replaceAll('-',' ')}</option>)}</select></label>}