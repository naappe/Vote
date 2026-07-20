'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {getResidentsPage} from '../lib/supabase';
import type {Resident} from '../lib/types';
import StatusBadge from '../shared/StatusBadge';

const PAGE_SIZE=25;

export default function VoterManagementContent(){
 const [rows,setRows]=useState<Resident[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [query,setQuery]=useState('');
 const [debouncedQuery,setDebouncedQuery]=useState('');
 const [filter,setFilter]=useState('all');
 const [page,setPage]=useState(1);
 const [count,setCount]=useState(0);

 useEffect(()=>{const timer=window.setTimeout(()=>setDebouncedQuery(query),300);return()=>window.clearTimeout(timer)},[query]);
 useEffect(()=>setPage(1),[debouncedQuery,filter]);
 useEffect(()=>{
  let active=true;
  setLoading(true);setError('');
  getResidentsPage({page,pageSize:PAGE_SIZE,search:debouncedQuery,filter})
   .then(result=>{if(active){setRows(result.rows);setCount(result.count)}})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load voters')})
   .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[page,debouncedQuery,filter]);

 const pages=Math.max(1,Math.ceil(count/PAGE_SIZE));
 const range=useMemo(()=>{if(count===0)return'0';const start=(page-1)*PAGE_SIZE+1;const end=Math.min(page*PAGE_SIZE,count);return`${start.toLocaleString()}–${end.toLocaleString()}`},[page,count]);

 return <div className="space-y-6">
  <section><p className="muted">Operations</p><h1 className="text-3xl font-bold">Voter Management</h1><p className="mt-2 text-slate-500">Search and filter campaign residents without loading the entire database.</p></section>
  <section className="panel">
   <div className="mb-5 flex flex-col gap-3 md:flex-row">
    <label className="sr-only" htmlFor="voter-search">Search voters</label>
    <input id="voter-search" className="input-base flex-1" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, ID, house, phone or living address" autoComplete="off"/>
    <label className="sr-only" htmlFor="voter-filter">Filter voters</label>
    <select id="voter-filter" className="input-base" value={filter} onChange={e=>setFilter(e.target.value)}>
     <option value="all">All voters</option><option value="will-vote">Will vote</option><option value="not-decided">Not decided</option><option value="not-vote">Not voting</option><option value="need-call">Need call</option><option value="called">Called</option><option value="not-visited">Not visited</option><option value="reach">Visited / reached</option><option value="guaranteed">Guaranteed</option>
    </select>
   </div>
   {error&&<div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
   <div className="overflow-x-auto" aria-busy={loading}>
    <table className="w-full min-w-[850px] text-left text-sm">
     <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><th className="p-3">Resident</th><th className="p-3">ID</th><th className="p-3">Address</th><th className="p-3">Phone</th><th className="p-3">Vote</th><th className="p-3">Call</th><th className="p-3">Visit</th></tr></thead>
     <tbody>{loading?Array.from({length:6}).map((_,i)=><tr key={i} className="border-b border-slate-100"><td colSpan={7} className="p-3"><div className="h-9 animate-pulse rounded-lg bg-slate-100"/></td></tr>):rows.length?rows.map(r=><tr key={String(r.id)} className="border-b border-slate-100 hover:bg-slate-50"><td className="p-3"><Link prefetch={false} href={`/voter-detail/?id=${encodeURIComponent(String(r.id))}`} className="font-semibold text-slate-900 hover:text-calm-700">{r.name||'Unnamed resident'}</Link></td><td className="p-3 text-slate-500">{r.national_id||'—'}</td><td className="p-3 text-slate-500">{r.house||r.lives_in||'—'}</td><td className="p-3 text-slate-500">{r.phone||'—'}</td><td className="p-3"><StatusBadge status={r.vote_status}/></td><td className="p-3"><StatusBadge status={r.phone_status}/></td><td className="p-3"><StatusBadge status={r.d2d_status}/></td></tr>):<tr><td colSpan={7} className="p-10 text-center text-slate-500">No voters match the current search and filter.</td></tr>}</tbody>
    </table>
   </div>
   <div className="mt-5 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row"><span className="text-slate-500">Showing {range} of {count.toLocaleString()} · Page {page} of {pages}</span><div className="flex gap-2"><button className="btn-ghost" disabled={loading||page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</button><button className="btn-primary" disabled={loading||page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))}>Next</button></div></div>
  </section>
 </div>;
}
