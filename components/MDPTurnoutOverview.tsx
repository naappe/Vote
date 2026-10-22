'use client';
import {useEffect,useState} from 'react';
import {getMdpRosterPage,supabase} from '../lib/supabase';

type Summary={total:number;willVote:number;reached:number;voted:number;notSure:number;prediction:number};
const filter={party:'MDP',search:'',house:'all',gender:'all',age:'all',box:'all'};
export default function MDPTurnoutOverview({dayId,refresh=0}:{dayId:string;refresh?:number}){
 const [data,setData]=useState<Summary|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(!dayId){setData(null);return}
  let active=true;
  setError('');
  void(async()=>{try{
   const first=await getMdpRosterPage(filter,1,500);
   const second=first.count>500?await getMdpRosterPage(filter,2,500):{rows:[],count:first.count};
   const ids=[...first.rows,...second.rows].map(row=>Number(row.id));
   if(ids.length!==first.count)throw new Error('Roster count incomplete; cannot calculate turnout accurately.');
   const [calls,visits,votes]=await Promise.all([
    supabase.from('call_center').select('resident_id,vote_status,reach_status').in('resident_id',ids),
    supabase.from('door_to_door').select('resident_id,visit_status,vote_status').in('resident_id',ids),
    supabase.from('resident_voting_status').select('resident_id').eq('voting_day_id',dayId).in('resident_id',ids)
   ]);
   if(calls.error||visits.error||votes.error)throw new Error(calls.error?.message||visits.error?.message||votes.error?.message||'Summary unavailable');
   const votePlans=new Map<number,string>();
   const reached=new Set<number>();
   for(const row of calls.data||[]){
    if(row.vote_status&&row.vote_status!=='not-decided')votePlans.set(Number(row.resident_id),row.vote_status);
    if(row.reach_status==='reached')reached.add(Number(row.resident_id));
   }
   for(const row of visits.data||[]){
    const id=Number(row.resident_id);
    if(!votePlans.has(id)&&row.vote_status&&row.vote_status!=='not-decided')votePlans.set(id,row.vote_status);
    if(row.visit_status==='visited')reached.add(id);
   }
   const willVote=[...votePlans.values()].filter(v=>v==='will-vote').length;
   const notSure=[...votePlans.values()].filter(v=>v==='not-sure'||v==='unsure').length;
   const reachedUncommitted=[...reached].filter(id=>!votePlans.has(id)).length;
   const voted=new Set((votes.data||[]).map(row=>Number(row.resident_id))).size;
   // An explicit scenario assumption, not a statistical estimate.
   const prediction=Math.min(ids.length,Math.max(voted,Math.round(willVote+0.35*reachedUncommitted+0.15*notSure)));
   if(active)setData({total:ids.length,willVote,reached:reached.size,voted,notSure,prediction});
  }catch(e){if(active)setError(e instanceof Error?e.message:'Unable to load overview')}}
  )();
  return()=>{active=false};
 },[dayId,refresh]);
 if(error)return <div className="text-xs text-rose-700" role="status">Turnout overview unavailable: {error}</div>;
 if(!data)return <div className="text-xs text-body" role="status">Loading turnout overview…</div>;
 const bars=[{label:'Not yet voted',n:Math.max(0,data.total-data.voted),color:'bg-slate-500'},{label:'Will vote',n:data.willVote,color:'bg-emerald-500'},{label:'Reached',n:data.reached,color:'bg-blue-500'},{label:'Forecast (estimate)',n:data.prediction,color:'bg-amber-500'},{label:'Already voted',n:data.voted,color:'bg-violet-500'}];
 return <div aria-label="Turnout overview based on matched MDP roster" className="rounded-xl border border-slate-200 bg-white p-3">
  <div className="mb-2 flex items-center justify-between gap-2"><strong className="text-sm text-navy">Turnout overview</strong><span className="text-xs text-body">{data.total} matched</span></div>
  <div className="grid gap-2">{bars.map(item=><div key={item.label}>
   <div className="flex justify-between text-xs"><span>{item.label}</span><b>{item.n} / {data.total}</b></div>
   <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={item.color+' h-full rounded-full'} style={{width:(data.total?Math.min(100,100*item.n/data.total):0)+'%'}}/></div>
  </div>)}</div>
  <p className="mt-2 text-[11px] leading-4 text-body">Estimate only · based on recorded intentions and contact assumptions.</p>
 </div>;
}
