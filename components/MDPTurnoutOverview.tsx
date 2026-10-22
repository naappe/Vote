'use client';
import {useEffect,useState} from 'react';
import {getMdpRosterPage,supabase} from '../lib/supabase';

type Summary={total:number;willVote:number;reached:number;voted:number;notSure:number;prediction:number};
const filter={party:'MDP',search:'',house:'all',gender:'all',age:'all',box:'all'};
export default function MDPTurnoutOverview({dayId,refresh=0,onSelect,selected='all'}:{dayId:string;refresh?:number;onSelect:(filter:'all'|'voted'|'remaining'|'will-vote')=>void;selected?:string}){
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
 const cards=[
  {label:'Voted',n:data.voted,key:'voted' as const,color:'bg-emerald-500',hint:'View confirmed votes'},
  {label:'Not yet voted',n:Math.max(0,data.total-data.voted),key:'remaining' as const,color:'bg-blue-500',hint:'Find residents remaining'},
  {label:'Will vote',n:data.willVote,key:'will-vote' as const,color:'bg-violet-500',hint:'View recorded voting plans'}
 ];
 return <div aria-label="Election turnout summary" className="rounded-xl border border-slate-200 bg-white p-4">
  <div className="mb-3 flex items-center justify-between"><strong className="text-base text-navy">Voting progress</strong><button onClick={()=>onSelect('all')} className="text-xs font-bold text-blue-700">All {data.total} →</button></div>
  <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{width:(100*data.voted/Math.max(1,data.total))+'%'}}/></div>
  <div className="grid gap-2">{cards.map(c=><button key={c.key} type="button" onClick={()=>onSelect(c.key)} aria-pressed={selected===c.key} className={'rounded-xl border p-3 text-left transition hover:border-blue-400 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 '+(selected===c.key?'border-blue-500 bg-blue-50':'border-slate-200')}>
   <div className="flex items-center justify-between gap-2"><span className="text-sm font-bold text-navy">{c.label}</span><span className="text-xl font-extrabold tabular-nums text-navy">{c.n}</span></div>
   <span className="mt-1 block text-xs text-body">{c.hint} →</span>
  </button>)}</div>
  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs"><span className="text-body">Reached: <b>{data.reached}</b></span><span className="text-body">Estimated turnout: <b>{data.prediction}</b></span></div>
 </div>;
}
