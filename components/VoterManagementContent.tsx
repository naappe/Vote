'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {getHouseOptions,getResidentsPage} from '../lib/supabase';
import type {HouseOption} from '../lib/supabase';
import type {Resident} from '../lib/types';
import StatusBadge from '../shared/StatusBadge';

const PAGE_SIZE=25;

export default function VoterManagementContent(){
 const [rows,setRows]=useState<Resident[]>([]);
 const [houses,setHouses]=useState<HouseOption[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [query,setQuery]=useState('');
 const [debouncedQuery,setDebouncedQuery]=useState('');
 const [filter,setFilter]=useState('all');
 const [house,setHouse]=useState('all');
 const [houseSearch,setHouseSearch]=useState('');
 const [page,setPage]=useState(1);
 const [count,setCount]=useState(0);

 useEffect(()=>{getHouseOptions().then(setHouses).catch(()=>setHouses([]))},[]);
 useEffect(()=>{const timer=window.setTimeout(()=>setDebouncedQuery(query),300);return()=>window.clearTimeout(timer)},[query]);
 useEffect(()=>setPage(1),[debouncedQuery,filter,house]);
 useEffect(()=>{
  let active=true;setLoading(true);setError('');
  getResidentsPage({page,pageSize:PAGE_SIZE,search:debouncedQuery,filter,house})
   .then(result=>{if(active){setRows(result.rows);setCount(result.count)}})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load residents')})
   .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[page,debouncedQuery,filter,house]);

 const pages=Math.max(1,Math.ceil(count/PAGE_SIZE));
 const range=useMemo(()=>{if(count===0)return'0';const start=(page-1)*PAGE_SIZE+1;const end=Math.min(page*PAGE_SIZE,count);return`${start.toLocaleString()}–${end.toLocaleString()}`},[page,count]);
 const visibleHouses=useMemo(()=>houses.filter(item=>item.name.toLowerCase().includes(houseSearch.toLowerCase())).slice(0,80),[houses,houseSearch]);
 const selectedHouse=houses.find(item=>item.name===house);
 const hasFilters=Boolean(query||filter!=='all'||house!=='all');
 function clearFilters(){setQuery('');setFilter('all');setHouse('all');setHouseSearch('')}

 return <div className="space-y-6">
  <section className="rounded-3xl bg-gradient-to-br from-[#17324D] via-[#183B57] to-[#0F5960] p-6 text-white shadow-xl md:p-8">
   <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
    <div><p className="text-xs font-bold uppercase tracking-[.22em] text-teal-100">Campaign operations</p><h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Residents</h1><p className="mt-2 max-w-2xl text-sm text-slate-200 md:text-base">Search every resident, filter by house and status, then open the profile to update campaign work.</p></div>
    <div className="grid grid-cols-2 gap-3 sm:flex"><Metric label="Results" value={count.toLocaleString()}/><Metric label="Houses" value={houses.length.toLocaleString()}/></div>
   </div>
  </section>

  <section className="panel overflow-visible">
   <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_minmax(240px,.8fr)_220px_auto]">
    <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Search resident</span><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span><input className="field pl-9" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, ID, phone or address" autoComplete="off"/></div></label>

    <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">House</span><div className="relative"><input className="field pr-10" list="house-options" value={house==='all'?houseSearch:house} onChange={e=>{setHouseSearch(e.target.value);setHouse('all')}} onBlur={()=>{const match=houses.find(h=>h.name.toLowerCase()===houseSearch.trim().toLowerCase());if(match){setHouse(match.name);setHouseSearch('')}}} placeholder="Search or select house"/><button type="button" aria-label="Clear house" onClick={()=>{setHouse('all');setHouseSearch('')}} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100">×</button><datalist id="house-options">{visibleHouses.map(item=><option key={item.name} value={item.name}>{item.count} residents</option>)}</datalist></div>{selectedHouse&&<span className="mt-1 block text-xs font-semibold text-teal-700">{selectedHouse.count} residents in {selectedHouse.name}</span>}</label>

    <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Campaign status</span><select className="field" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All statuses</option><option value="will-vote">Will vote</option><option value="not-decided">Not decided</option><option value="not-vote">Not voting</option><option value="need-call">Need call</option><option value="called">Called</option><option value="not-visited">Not visited</option><option value="reach">Visited / reached</option><option value="guaranteed">Guaranteed</option></select></label>

    <div className="flex items-end"><button type="button" className="action w-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 xl:w-auto" onClick={clearFilters} disabled={!hasFilters}>Clear filters</button></div>
   </div>
  </section>

  {error&&<div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}

  <section className="panel overflow-hidden p-0">
   <div className="border-b border-slate-200 px-5 py-4"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h2 className="font-bold text-slate-900">Resident directory</h2><p className="text-sm text-slate-500">Showing {range} of {count.toLocaleString()}</p></div>{house!=='all'&&<span className="inline-flex w-fit rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-200">House: {house}</span>}</div></div>
   <div className="overflow-x-auto" aria-busy={loading}>
    <table className="w-full min-w-[980px] text-left text-sm">
     <thead className="bg-slate-50"><tr className="border-b border-slate-200 text-[11px] uppercase tracking-[.12em] text-slate-500"><th className="p-4">Resident</th><th className="p-4">National ID</th><th className="p-4">Official address</th><th className="p-4">Phone</th><th className="p-4">Party</th><th className="p-4">Vote</th><th className="p-4">Call</th><th className="p-4">Visit</th></tr></thead>
     <tbody>{loading?Array.from({length:7}).map((_,i)=><tr key={i} className="border-b border-slate-100"><td colSpan={8} className="p-4"><div className="h-12 animate-pulse rounded-xl bg-slate-100"/></td></tr>):rows.length?rows.map(r=><tr key={String(r.id)} className="border-b border-slate-100 transition hover:bg-[#F7FAFC]"><td className="p-4"><div className="flex items-center gap-3"><ResidentPhoto resident={r}/><div className="min-w-0"><Link prefetch={false} href={`/voter-detail/?id=${encodeURIComponent(String(r.id))}`} className="block truncate font-bold text-slate-900 hover:text-teal-700">{r.name||'Unnamed resident'}</Link><div className="truncate text-xs text-slate-500">{r.lives_in||'Living address not recorded'}</div></div></div></td><td className="p-4 font-medium text-slate-600">{r.national_id||'—'}</td><td className="p-4 text-slate-600">{r.house||'—'}</td><td className="p-4 text-slate-600">{r.phone||'—'}</td><td className="p-4"><PartyBadge party={r.party}/></td><td className="p-4"><StatusBadge status={r.vote_status}/></td><td className="p-4"><StatusBadge status={r.phone_status}/></td><td className="p-4"><StatusBadge status={r.d2d_status}/></td></tr>):<tr><td colSpan={8} className="p-14 text-center"><div className="mx-auto max-w-sm"><div className="text-3xl">⌕</div><h3 className="mt-3 font-bold text-slate-900">No residents found</h3><p className="mt-1 text-sm text-slate-500">Try another search, house, or campaign status.</p></div></td></tr>}</tbody>
    </table>
   </div>
   <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm sm:flex-row"><span className="text-slate-500">Page {page} of {pages}</span><div className="flex gap-2"><button className="action border border-slate-200 bg-white text-slate-700" disabled={loading||page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</button><button className="action bg-[#0F8B8D] text-white shadow-sm hover:bg-[#0C7476]" disabled={loading||page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))}>Next</button></div></div>
  </section>
 </div>;
}

function Metric({label,value}:{label:string;value:string}){return <div className="min-w-28 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"><div className="text-2xl font-extrabold">{value}</div><div className="text-xs font-semibold text-slate-200">{label}</div></div>}
function ResidentPhoto({resident}:{resident:Resident}){const initials=(resident.name||'?').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();return resident.photo_url?<img src={resident.photo_url} alt={resident.name?`${resident.name} photo`:'Resident photo'} className="h-12 w-12 rounded-2xl border border-slate-200 object-cover shadow-sm" loading="lazy" referrerPolicy="no-referrer"/>:<div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-extrabold text-slate-600">{initials}</div>}
function PartyBadge({party}:{party?:string|null}){if(!party)return <span className="text-slate-400">—</span>;const key=party.toUpperCase();const cls=key==='PNC'?'bg-teal-50 text-teal-700 ring-teal-200':key==='MDP'?'bg-yellow-50 text-yellow-800 ring-yellow-200':'bg-slate-50 text-slate-700 ring-slate-200';return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${cls}`}>{party}</span>}
