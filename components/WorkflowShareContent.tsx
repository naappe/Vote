'use client';
import {useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {getSharedResidents,getWorkflowShare} from '../lib/operations';
import type {Resident} from '../lib/types';

export default function WorkflowShareContent(){
 const token=useSearchParams().get('token')||'';const [rows,setRows]=useState<Resident[]>([]),[title,setTitle]=useState('Shared worklist'),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{if(!token){setError('Missing share token.');setLoading(false);return}getWorkflowShare(token).then(async share=>{setTitle(share.title||'Shared worklist');setRows(await getSharedResidents(share))}).catch(e=>setError(e instanceof Error?e.message:'Unable to load share link')).finally(()=>setLoading(false))},[token]);
 if(loading)return <main className="mx-auto max-w-6xl p-5"><div className="h-40 animate-pulse bg-primary-light"/></main>;
 return <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6"><header className="page-hero"><p className="eyebrow">Restricted campaign worklist</p><h1 className="mt-2">{title}</h1><p className="mt-2 text-sm text-body">This link shows only approved contact fields. Party and internal campaign results are hidden.</p></header>{error?<div className="error-banner">{error}</div>:<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map(r=><article key={String(r.id)} className="soft-card"><h2 className="text-base">{r.name||'Unnamed resident'}</h2><dl className="mt-4 grid gap-2 text-sm"><Info label="National ID" value={r.national_id}/><Info label="Mobile" value={r.phone}/><Info label="Living place" value={r.lives_in}/><Info label="Election box" value={r.election_box}/></dl></article>)}</section>} {!error&&!rows.length&&<div className="empty-state">No residents match this shared worklist.</div>}</main>
}
function Info({label,value}:{label:string;value?:string|null}){return <div className="flex justify-between gap-3 border-b border-border pb-2"><dt className="text-body">{label}</dt><dd className="text-right font-semibold text-navy">{value||'—'}</dd></div>}
