'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';

type Pending={serial:number;source_name:string;source_address:string;match_note?:string|null};
type Candidate={id:number;name:string|null;house:string|null;party:string|null};
export default function MDPUnmatchedReview(){
 const [pending,setPending]=useState<Pending[]>([]);
 const [selected,setSelected]=useState<number|null>(null);
 const [search,setSearch]=useState('');
 const [candidates,setCandidates]=useState<Candidate[]>([]);
 const [choice,setChoice]=useState<number|null>(null);
 const [note,setNote]=useState('');
 const [verified,setVerified]=useState(false);
 const [loading,setLoading]=useState(false);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 async function refresh(){
  const r=await supabase.from('mdp_2026_import_review').select('serial,source_name,source_address,match_note').is('matched_resident_id',null).order('serial');
  if(r.error)throw r.error;
  setPending((r.data||[]) as Pending[]);
 }
 useEffect(()=>{void refresh().catch(e=>setError(e.message))},[]);
 useEffect(()=>{
  if(search.trim().length<2){setCandidates([]);return}
  let active=true;
  const t=window.setTimeout(async()=>{
   const term=search.trim().replace(/[,%().]/g,' ');
   const r=await supabase.from('Resident').select('id,name,house,party').eq('party','MDP').or('name.ilike.%'+term+'%,house.ilike.%'+term+'%').limit(30);
   if(active){if(r.error)setError(r.error.message);else setCandidates((r.data||[]) as Candidate[])}
  },300);
  return()=>{active=false;window.clearTimeout(t)};
 },[search]);
 function choose(serial:number){const row=pending.find(x=>x.serial===serial);setSelected(serial);setSearch(row?.source_name||'');setChoice(null);setNote('');setVerified(false);setMessage('');setError('')}
 async function save(){
  if(selected===null||choice===null||!verified||note.trim().length<12)return;
  setSaving(true);setError('');setMessage('');
  try{
   const {error}=await supabase.rpc('mdp_confirm_pdf_match',{p_serial:selected,p_resident_id:choice,p_note:note.trim()});
   if(error)throw error;
   setMessage('Identity link saved. PDF roster and serial lookup updated.');
   await refresh();setSelected(null);setCandidates([]);setSearch('');setChoice(null);setVerified(false);setNote('');
  }catch(e){setError(e instanceof Error?e.message:'Could not save match')}
  finally{setSaving(false)}
 }
 return <section className="panel p-4 sm:p-6" aria-label="Unmatched PDF entries">
  <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-extrabold text-navy">Unmatched PDF entries ({pending.length})</h2><button className="btn-secondary" onClick={()=>void refresh().catch(e=>setError(e.message))}>Refresh</button></div>
  <div className="grid gap-2 sm:grid-cols-2">{pending.map(row=><button key={row.serial} type="button" onClick={()=>choose(row.serial)} className={'rounded-lg border p-3 text-left '+(selected===row.serial?'border-blue-500 bg-blue-50':'border-slate-200 bg-white')}><strong className="block text-sm">#{row.serial} · {row.source_name}</strong><small className="block text-body">{row.source_address}</small>{row.match_note?.startsWith("NEW ENTRY")&&<span className="mt-1 inline-block rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">NEW · ID & phone pending</span>}</button>)}</div>
  {selected!==null&&<div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
   <h3 className="mb-3 font-bold">Review PDF #{selected}</h3>
   <label className="block text-sm font-semibold">Find existing MDP resident<input className="field mt-1" value={search} onChange={e=>{setSearch(e.target.value);setChoice(null)}} placeholder="Search name or house"/></label>
   <div className="mt-3 max-h-64 space-y-1 overflow-auto">{candidates.map(c=><label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 text-sm"><input type="radio" name="candidate" checked={choice===c.id} onChange={()=>setChoice(c.id)}/><span><strong>{c.name}</strong><small className="block text-body">Resident #{c.id} · {c.house}</small></span></label>)}</div>
   <label className="mt-3 block text-sm font-semibold">Identity verification details<textarea className="field mt-1 min-h-20" value={note} onChange={e=>setNote(e.target.value)} placeholder="Describe the independent evidence confirming this person and PDF address"/></label>
   <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/><span>I verified the identity independently. This selection is not based on a similar name alone.</span></label>
   <button className="btn-primary mt-3" disabled={saving||choice===null||!verified||note.trim().length<12} onClick={()=>void save()}>{saving?'Saving…':'Confirm and link resident'}</button>
  </div>}
  {error&&<p className="error-banner mt-3" role="alert">{error}</p>}
  {message&&<p className="info-banner mt-3" role="status">{message}</p>}
 </section>;
}
