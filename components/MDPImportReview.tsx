'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {useStaffAccess} from './AuthGate';
import {supabase} from '../lib/supabase';
import {buildExcelWorkbook} from '../lib/excel-export';

type ReviewRow={serial:number;source_address:string;source_name:string;source_location:string;matched_resident_id:number|null;match_status:'existing_mdp'|'other_party'|'no_match'|'ambiguous';match_method?:string|null;match_note?:string|null};
type ExistingId={id:number;national_id:string|null};
const options=[{value:'all',label:'All 540 records'},{value:'no_match',label:'No exact match'},{value:'other_party',label:'Party classification to review'},{value:'existing_mdp',label:'Matched existing MDP'},{value:'ambiguous',label:'Ambiguous matches'}] as const;
const labels:Record<ReviewRow['match_status'],string>={existing_mdp:'Existing MDP match',other_party:'Review classification',no_match:'Needs identity check',ambiguous:'Ambiguous match'};
const styles:Record<ReviewRow['match_status'],string>={existing_mdp:'border-emerald-200 bg-emerald-50 text-emerald-800',other_party:'border-amber-200 bg-amber-50 text-amber-900',no_match:'border-slate-200 bg-slate-100 text-slate-700',ambiguous:'border-rose-200 bg-rose-50 text-rose-800'};
export default function MDPImportReview(){
 const access=useStaffAccess(),allowed=access?.role==='admin';
 const [exporting,setExporting]=useState<'all'|'unmatched'|null>(null),[exportError,setExportError]=useState('');
 const [status,setStatus]=useState<string>('all'),[page,setPage]=useState(1),[search,setSearch]=useState(''),[rows,setRows]=useState<ReviewRow[]>([]),[ids,setIds]=useState<Record<number,string|null>>({}),[count,setCount]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const size=30;
 useEffect(()=>{setPage(1)},[status,search]);
 useEffect(()=>{
  if(!allowed){setLoading(false);return}
  let active=true;setLoading(true);setError('');
  void(async()=>{try{
   let query=supabase.from('mdp_2026_import_review').select('serial,source_address,source_name,source_location,matched_resident_id,match_status,match_method,match_note',{count:'exact'}).order('serial',{ascending:true});
   if(status!=='all')query=query.eq('match_status',status);
   const term=search.trim().replace(/[,()%]/g,' ');
   if(term)query=query.or('source_name.ilike.%'+term+'%,source_address.ilike.%'+term+'%');
   const {data,error:queryError,count:total}=await query.range((page-1)*size,page*size-1);
   if(queryError)throw queryError;
   const received=(data||[]) as ReviewRow[];
   if(!active)return;setRows(received);setCount(total||0);
   const matched=received.map(row=>row.matched_resident_id).filter((value):value is number=>value!==null);
   if(matched.length){
    const found=await supabase.from('Resident').select('id,national_id').in('id',matched);
    if(found.error)throw found.error;
    if(active)setIds(Object.fromEntries(((found.data||[]) as ExistingId[]).map(item=>[item.id,item.national_id])));
   }else if(active)setIds({});
  }catch(e){if(active)setError(e instanceof Error?e.message:'Unable to load roster review')}
  finally{if(active)setLoading(false)}})();
  return()=>{active=false};
 },[allowed,page,status,search]);
 async function downloadReview(mode:'all'|'unmatched'){
  if(!allowed||exporting)return;
  setExporting(mode);setExportError('');
  try{
   const all:ReviewRow[]=[];
   for(let offset=0;offset<600;offset+=200){
    let query=supabase.from('mdp_2026_import_review').select('serial,source_address,source_name,source_location,matched_resident_id,match_status,match_method,match_note').order('serial',{ascending:true}).range(offset,offset+199);
    if(mode==='unmatched')query=query.eq('match_status','no_match');
    const {data,error:queryError}=await query;
    if(queryError)throw queryError;
    const chunk=(data||[]) as ReviewRow[];
    all.push(...chunk);
    if(chunk.length<200)break;
   }
   if(mode==='all'&&all.length!==540)throw new Error('Expected 540 PDF rows, received '+all.length+'. Please retry the export.');
   const ids=[...new Set(all.map(item=>item.matched_resident_id).filter((id):id is number=>id!==null))];
   const existing=new Map<number,ExistingId>();
   for(let start=0;start<ids.length;start+=150){
    const result=await supabase.from('Resident').select('id,national_id').in('id',ids.slice(start,start+150));
    if(result.error)throw result.error;
    for(const row of (result.data||[]) as ExistingId[])existing.set(row.id,row);
   }
   const workbook=buildExcelWorkbook([{name:mode==='unmatched'?'Needs verification':'2026 PDF review',headers:['PDF Serial','PDF Name','PDF Address','Location','Match Status','Match Method','Resident Record ID','Existing National ID (candidate)','Review Notes','Verification Notes (fill manually)'],rows:all.map(row=>[row.serial,row.source_name,row.source_address,row.source_location,labels[row.match_status],row.match_method||'',row.matched_resident_id||'',row.matched_resident_id===null?'':existing.get(row.matched_resident_id)?.national_id||'',row.match_note||'',''])}]);
   const blob=new Blob([new Uint8Array(workbook)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
   const url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download='mdp-2026-'+(mode==='unmatched'?'unmatched':'all-540')+'-'+new Date().toISOString().slice(0,10)+'.xlsx';
   document.body.appendChild(link);link.click();link.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){setExportError(e instanceof Error?e.message:'Export failed')}
  finally{setExporting(null)}
 }
 const pages=Math.max(1,Math.ceil(count/size));
 const range=useMemo(()=>count?((page-1)*size+1)+'–'+Math.min(page*size,count):'0',[count,page]);
 if(!allowed)return <main className="panel"><h1 className="text-xl font-bold">Administrator access required</h1><p className="mt-2 text-sm text-body">Only Admin may review the latest MDP roster and identity matches.</p><Link prefetch={false} href="/mdp/" className="mt-3 inline-flex text-blue-700">Return to Home</Link></main>;
 return <div className="mdp-home mdp-home-simple">
  <section className="mdp-home-intro"><div><p className="mdp-eyebrow">Admin only · Import review</p><h1>MDP Inthihaabu 2026 · Villimalé</h1><p>540 entries from the latest supplied PDF. This is a confidential review list; it does not replace your Residents database or its saved tasks.</p></div></section>
  <section className="panel p-4 sm:p-6">
   <h2 className="text-lg font-extrabold text-navy">Identity verification</h2>
   <p className="mt-2 text-sm text-body">The PDF contains no national ID numbers. A national ID appears below only when an exact name-and-address match points to one existing resident. That is a candidate match, not definitive proof of identity. Check uncertain cases against a consented ID or the official Elections Commission service. Never copy an ID to a new record based on a name alone.</p>
   <div className="mt-4 flex flex-wrap gap-3"><a href="https://www.elections.gov.mv/en" target="_blank" rel="noopener noreferrer" className="btn-secondary">Elections Commission ↗</a><a href="https://my.elections.gov.mv/" target="_blank" rel="noopener noreferrer" className="btn-secondary">EC MyPortal ↗</a></div>
  </section>
  <section className="panel p-4 sm:p-6">
   <div className="mb-4 flex flex-wrap items-end gap-3"><label className="min-w-[210px] flex-1"><span className="field-label">Matching status</span><select className="field mt-1 w-full" value={status} onChange={e=>setStatus(e.target.value)}>{options.map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label><label className="min-w-[210px] flex-1"><span className="field-label">Find name or address</span><input className="field mt-1 w-full" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search imported roster"/></label></div>
   <div className="mb-4 flex flex-wrap gap-2">
    <button type="button" className="btn-primary" disabled={Boolean(exporting)||loading} onClick={()=>void downloadReview('unmatched')}>{exporting==='unmatched'?'Preparing Excel…':'Export unmatched · Excel'}</button>
    <button type="button" className="btn-secondary" disabled={Boolean(exporting)||loading} onClick={()=>void downloadReview('all')}>{exporting==='all'?'Preparing Excel…':'Export all 540 · Excel'}</button>
   </div>
   {exportError&&<p role="alert" className="error-banner mb-3">{exportError}</p>}
   <div className="mb-4 flex items-center justify-between gap-3"><span className="text-sm font-semibold text-navy">Showing {range} of {count}</span><span className="text-xs text-body">Page {page} / {pages}</span></div>
   {loading?<p role="status" className="mdp-home-house-loading">Loading confidential list…</p>:error?<p role="alert" className="error-banner">{error}</p>:<div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase text-body"><th className="p-3">#</th><th className="p-3">Name</th><th className="p-3">PDF address</th><th className="p-3">Match review</th><th className="p-3">Existing ID (unverified)</th></tr></thead><tbody>{rows.map(row=><tr key={row.serial} className="border-b border-slate-100"><td className="p-3 tabular-nums">{row.serial}</td><td className="p-3 font-semibold text-navy">{row.source_name}</td><td className="p-3">{row.source_address}</td><td className="p-3"><span className={'inline-block rounded-md border px-2 py-1 text-xs font-semibold '+styles[row.match_status]}>{row.match_method==='user_confirmed'?'User-confirmed match':labels[row.match_status]}</span>{row.match_method==='user_confirmed'&&<small className="mt-1 block max-w-xs text-amber-800" title={row.match_note||undefined}>Address discrepancy — verify Dhaftharu registration number</small>}</td><td className="p-3">{row.matched_resident_id!==null?<><span className="block">{ids[row.matched_resident_id]||'No ID recorded'}</span><Link prefetch={false} href={'/mdp/resident-profile/?id='+row.matched_resident_id} className="text-xs font-semibold text-blue-700">Compare resident #{row.matched_resident_id} ↗</Link></>:<span className="text-body">Not established</span>}</td></tr>)}</tbody></table>{rows.length===0&&<p className="p-5 text-sm text-body">No entries match this filter.</p>}</div>}
   <div className="mt-5 flex justify-end gap-2"><button type="button" className="btn-secondary" disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)}>Previous</button><button type="button" className="btn-secondary" disabled={page>=pages||loading} onClick={()=>setPage(p=>p+1)}>Next</button></div>
  </section>
 </div>;
}
