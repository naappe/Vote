'use client';
import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {getSharedResidents,getWorkflowShare,submitSharedAssignments} from '../lib/operations';
import type {WorkflowShare} from '../lib/operations';
import type {Resident} from '../lib/types';

export default function WorkflowShareContent(){
 const token=useSearchParams().get('token')||'';
 const [rows,setRows]=useState<Resident[]>([]),[share,setShare]=useState<WorkflowShare|null>(null),[title,setTitle]=useState('Shared worklist'),[loading,setLoading]=useState(true),[submitting,setSubmitting]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(''),[name,setName]=useState(''),[query,setQuery]=useState(''),[selected,setSelected]=useState<Set<string>>(new Set());
 useEffect(()=>{if(!token){setError('Missing share token.');setLoading(false);return}getWorkflowShare(token).then(async item=>{setShare(item);setTitle(item.title||'Shared worklist');setRows(await getSharedResidents(item))}).catch(e=>setError(e instanceof Error?e.message:'Unable to load share link')).finally(()=>setLoading(false))},[token]);
 const visible=useMemo(()=>rows.filter(r=>[r.name,r.national_id,r.phone,r.house,r.lives_in,r.election_box].join(' ').toLowerCase().includes(query.toLowerCase())),[rows,query]);
 const assignmentMode=share?.workflow==='assignments'&&share.can_update;
 function toggle(id:string){setSelected(current=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next})}
 function toggleVisible(){setSelected(current=>{const next=new Set(current);const ids=visible.map(r=>String(r.id));const allSelected=ids.length>0&&ids.every(id=>next.has(id));ids.forEach(id=>allSelected?next.delete(id):next.add(id));return next})}
 async function submit(){if(!share)return;setSubmitting(true);setError('');setSuccess('');try{const count=await submitSharedAssignments(share,name,[...selected]);setSuccess(`${count} resident${count===1?'':'s'} assigned successfully to ${name.trim()}.`);setSelected(new Set())}catch(e){setError(e instanceof Error?e.message:'Unable to submit assignments')}finally{setSubmitting(false)}}
 if(loading)return <main className="mx-auto max-w-6xl p-5"><div className="h-40 animate-pulse rounded-2xl bg-primary-light"/></main>;
 return <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
  <header className="page-hero"><p className="eyebrow">Restricted campaign worklist</p><h1 className="mt-2">{title}</h1><p className="mt-2 text-sm text-body">This link shows only the resident information required for assignment.</p></header>
  {error&&<div className="error-banner">{error}</div>}
  {success&&<div className="info-banner"><div><b className="text-navy">Assignment submitted</b><p className="mt-1">{success}</p></div></div>}
  {!error&&assignmentMode&&<section className="panel"><div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><div><label className="field-label">Your name</label><input className="field" value={name} onChange={e=>setName(e.target.value)} placeholder="Enter assigner name"/></div><div><label className="field-label">Search residents</label><input className="field" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, ID, mobile, address or box"/></div><div className="flex items-end"><button className="btn-secondary w-full" onClick={toggleVisible}>{visible.length&&visible.every(r=>selected.has(String(r.id)))?'Unselect visible':'Select visible'}</button></div></div><div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><b className="text-navy">{selected.size} selected</b><p className="mt-1 text-xs text-body">Select the residents you will handle, then submit.</p></div><button className="btn-primary" disabled={submitting||!name.trim()||!selected.size} onClick={submit}>{submitting?'Submitting…':'Submit assignments'}</button></div></section>}
  {!error&&<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visible.map(r=>{const id=String(r.id),checked=selected.has(id);return <article key={id} className={`soft-card ${assignmentMode?'cursor-pointer':''} ${checked?'ring-2 ring-primary':''}`} onClick={()=>assignmentMode&&toggle(id)}>{assignmentMode&&<div className="mb-3 flex items-center justify-between"><span className="eyebrow">Resident ID {id}</span><input type="checkbox" checked={checked} onChange={()=>toggle(id)} onClick={e=>e.stopPropagation()} className="h-5 w-5" aria-label={`Select ${r.name||id}`}/></div>}<h2 className="text-base">{r.name||'Unnamed resident'}</h2><dl className="mt-4 grid gap-2 text-sm"><Info label="National ID" value={r.national_id}/><Info label="Mobile" value={r.phone}/><Info label="Official address" value={r.house}/><Info label="Living place" value={r.lives_in}/><Info label="Election box" value={r.election_box}/></dl></article>})}</section>}
  {!error&&!visible.length&&<div className="empty-state">No residents match this shared worklist.</div>}
 </main>
}
function Info({label,value}:{label:string;value?:string|null}){return <div className="flex justify-between gap-3 border-b border-border pb-2"><dt className="text-body">{label}</dt><dd className="text-right font-semibold text-navy">{value||'—'}</dd></div>}
