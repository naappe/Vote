'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {getMdpRosterPage,supabase} from '../lib/supabase';
import {readOperationalRows} from '../lib/operations';
import {collectDirectoryPages} from '../lib/directory-utils';
import {useStaffAccess} from './AuthGate';
import OperationalPageLayout from './OperationalPageLayout';

type Snapshot={
 total:number;
 ids:string[];
 willVote:number;
 willNotVote:number;
 called:number;
 reached:number;
 noteCount:number;
 residentsWithRemarks:number;
 transportNeeded:number;
 transportInProgress:number;
 transportCompleted:number;
};
type BarRow={label:string;value:number;tone:string};
type GraphProps={title:string;detail:string;href:string;total:number;rows:BarRow[]};
type VotingDayReport={name:string;voted:number}|null;

const rosterFilters={search:'',party:'MDP',house:'all',gender:'all',age:'all',box:'all'};
const fraction=(value:number,total:number)=>total?Math.min(100,Math.max(0,Math.round(value/total*100))):0;

async function loadNavigationReport():Promise<Snapshot>{
 const residents=await collectDirectoryPages(page=>getMdpRosterPage(rosterFilters,page,500));
 const ids=residents.map(resident=>String(resident.id));
 const allowedIds=new Set(ids);
 // Only load data for workflows that appear in the MDP navigation.
 // Door-to-door, assignments and the old election_day table are intentionally omitted.
 const [callRows,remarkRows,transportRows]=await Promise.all([
  readOperationalRows('call_center','resident_id,phone_status,reach_status,vote_status'),
  readOperationalRows('remarks','resident_id,section'),
  readOperationalRows('transportation','resident_id,transport_status')
 ]);
 const callMap=new Map<string,(typeof callRows)[number]>();
 for(const row of callRows)if(allowedIds.has(String(row.resident_id)))callMap.set(String(row.resident_id),row);
 const transportMap=new Map<string,string>();
 for(const row of transportRows)if(allowedIds.has(String(row.resident_id)))transportMap.set(String(row.resident_id),String(row.transport_status||'not-needed'));
 const notedIds=new Set<string>();
 let noteCount=0;
 for(const note of remarkRows){
  if(note.section!=='general'||!allowedIds.has(String(note.resident_id)))continue;
  notedIds.add(String(note.resident_id));
  noteCount++;
 }
 let willVote=0,willNotVote=0,called=0,reached=0,transportNeeded=0,transportInProgress=0,transportCompleted=0;
 for(const resident of residents){
  const id=String(resident.id);
  const call=callMap.get(id);
  const voteStatus=String(call?.vote_status??resident.vote_status??'not-decided');
  const phoneStatus=String(call?.phone_status??resident.phone_status??'need-call');
  const reachStatus=String(call?.reach_status??resident.reach_status??'not-reached');
  const transportStatus=transportMap.get(id)||'not-needed';
  if(voteStatus==='will-vote')willVote++;
  if(voteStatus==='not-vote')willNotVote++;
  if(phoneStatus==='called')called++;
  if(reachStatus==='reached')reached++;
  if(['needed','need-transport','requested'].includes(transportStatus))transportNeeded++;
  if(['assigned','picked-up'].includes(transportStatus))transportInProgress++;
  if(transportStatus==='completed')transportCompleted++;
 }
 return {total:residents.length,ids,willVote,willNotVote,called,reached,noteCount,residentsWithRemarks:notedIds.size,transportNeeded,transportInProgress,transportCompleted};
}

function ReportGraph({title,detail,href,total,rows}:GraphProps){
 return <section className="panel min-w-0" aria-label={title+' progress chart'}>
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div className="min-w-0"><h2 className="text-base font-bold text-navy">{title}</h2><p className="mt-1 text-xs text-body">{detail}</p></div>
   <Link prefetch={false} href={href} className="text-xs font-semibold text-blue-700 hover:underline">Open {title} →</Link>
  </div>
  <div className="mt-5 space-y-4">{rows.map(row=><div key={row.label}>
   <div className="mb-2 flex items-center justify-between gap-2 text-sm"><span className="text-navy">{row.label}</span><span className="shrink-0 font-semibold text-navy">{row.value.toLocaleString()} · {fraction(row.value,total)}%</span></div>
   <div role="progressbar" aria-label={title+' — '+row.label} aria-valuemin={0} aria-valuemax={Math.max(1,total)} aria-valuenow={Math.min(total,row.value)} className="h-2.5 overflow-hidden rounded-full bg-slate-100">
    <div className={'h-full rounded-full '+row.tone} style={{width:fraction(row.value,total)+'%'}}/>
   </div>
  </div>)}</div>
 </section>;
}

function ReportSummary({title,value,detail,href}:{title:string;value:number;detail:string;href:string}){
 return <Link prefetch={false} href={href} className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
  <div><p className="text-sm font-semibold text-navy">{title}</p><strong className="mt-3 block text-3xl font-bold tabular-nums text-navy">{value.toLocaleString()}</strong><p className="mt-1 text-xs text-body">{detail}</p></div>
  <span className="mt-4 text-xs font-semibold text-blue-700">Open {title} →</span>
 </Link>;
}

export default function MDPNavigationReports(){
 const staff=useStaffAccess();
 const [data,setData]=useState<Snapshot|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [releaseReached,setReleaseReached]=useState(false);
 const [voteDay,setVoteDay]=useState<VotingDayReport>(null);
 const [votingError,setVotingError]=useState('');

 useEffect(()=>{
  let active=true;
  void loadNavigationReport().then(report=>{if(active)setData(report)}).catch(err=>{if(active)setError(err instanceof Error?err.message:'Unable to load reports')}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[]);
 useEffect(()=>{
  const check=()=>setReleaseReached(Date.now()>=Date.parse('2026-11-27T23:30:00+05:00'));
  check();
  const interval=window.setInterval(check,60000);
  return()=>window.clearInterval(interval);
 },[]);
 const showVotingDay=staff?.role==='admin'||releaseReached;
 useEffect(()=>{
  if(!showVotingDay||!data){setVoteDay(null);setVotingError('');return}
  let active=true;
  void (async()=>{
   try{
    const {data:day,error:dayError}=await supabase.from('voting_days').select('id,name').eq('active',true).order('voting_date',{ascending:true}).limit(1).maybeSingle();
    if(dayError)throw dayError;
    if(!day){if(active)setVoteDay(null);return}
    const votedIds=new Set<string>();
    for(let start=0;;start+=1000){
     const {data:records,error:voteError}=await supabase.from('resident_voting_status').select('resident_id').eq('voting_day_id',day.id).order('resident_id').range(start,start+999);
     if(voteError)throw voteError;
     const batch=records||[];
     for(const record of batch)votedIds.add(String(record.resident_id));
     if(batch.length<1000)break;
    }
    const voted=data.ids.filter(id=>votedIds.has(id)).length;
    if(active)setVoteDay({name:String(day.name||'Active voting day'),voted});
   }catch(err){if(active)setVotingError(err instanceof Error?err.message:'Voting Day figures unavailable')}
  })();
  return()=>{active=false};
 },[showVotingDay,data]);

 const target='/mdp/vote-target/';
 const calls='/mdp/calls/?status=need-call';
 const remarks='/mdp/remarks/';
 const transports='/mdp/transportation/?status=pending';
 const total=data?.total||0;
 const unconfirmed=Math.max(0,total-(data?.willVote||0)-(data?.willNotVote||0));
 const uncalled=Math.max(0,total-(data?.called||0));
 const withoutRemarks=Math.max(0,total-(data?.residentsWithRemarks||0));

 return <OperationalPageLayout title="Reports" actions={<Link prefetch={false} href={target} className="btn-secondary">Target Votes</Link>}>
  {error&&<div role="alert" className="error-banner">{error}</div>}
  {loading?<div aria-busy="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({length:4}).map((_,index)=><div key={index} className="h-36 animate-pulse rounded-xl bg-slate-100"/>)}</div>:data&&<>
   <p className="text-sm text-body">Operational progress for {total.toLocaleString()} MDP residents. These charts follow the same sections as the navigation.</p>
   <section aria-label="Navigation report summaries" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <ReportSummary title="Target Votes" value={data.willVote} detail={'Will vote · '+fraction(data.willVote,total)+'% of residents'} href={target}/>
    <ReportSummary title="Calls" value={data.called} detail={'Calls recorded · '+fraction(data.called,total)+'% of residents'} href={calls}/>
    <ReportSummary title="Remarks" value={data.noteCount} detail={data.residentsWithRemarks.toLocaleString()+' residents with written remarks'} href={remarks}/>
    <ReportSummary title="Transports" value={data.transportNeeded} detail="Transport arrangements needed" href={transports}/>
   </section>
   <section aria-label="Charts aligned with navigation" className="grid gap-4 xl:grid-cols-2">
    <ReportGraph title="Target Votes" href={target} total={total} detail="Recorded voting plans" rows={[
     {label:'Will vote',value:data.willVote,tone:'bg-blue-600'},
     {label:'Will not vote',value:data.willNotVote,tone:'bg-rose-500'},
     {label:'No confirmed plan',value:unconfirmed,tone:'bg-amber-400'}
    ]}/>
    <ReportGraph title="Calls" href={calls} total={total} detail="Call and contact coverage" rows={[
     {label:'Called',value:data.called,tone:'bg-blue-600'},
     {label:'Reached',value:data.reached,tone:'bg-emerald-500'},
     {label:'Need call',value:uncalled,tone:'bg-amber-400'}
    ]}/>
    <ReportGraph title="Remarks" href={remarks} total={total} detail={'General notes saved: '+data.noteCount.toLocaleString()} rows={[
     {label:'Residents with remarks',value:data.residentsWithRemarks,tone:'bg-emerald-500'},
     {label:'No general remark',value:withoutRemarks,tone:'bg-slate-300'}
    ]}/>
    <ReportGraph title="Transports" href={transports} total={total} detail="Transport requests and arrangements" rows={[
     {label:'Needed or requested',value:data.transportNeeded,tone:'bg-amber-400'},
     {label:'In progress',value:data.transportInProgress,tone:'bg-blue-600'},
     {label:'Completed',value:data.transportCompleted,tone:'bg-emerald-500'}
    ]}/>
    {showVotingDay&&(voteDay?<ReportGraph title="Voting Day" href="/mdp/voting-days/" total={total} detail={voteDay.name} rows={[
     {label:'Voted',value:voteDay.voted,tone:'bg-emerald-500'},
     {label:'Not yet recorded',value:Math.max(0,total-voteDay.voted),tone:'bg-amber-400'}
    ]}/>:<section className="panel"><h2 className="text-base font-bold text-navy">Voting Day</h2><p className="mt-2 text-sm text-body">{votingError||'No active Voting Day figures are currently available.'}</p><Link prefetch={false} href="/mdp/voting-days/" className="mt-4 inline-block text-sm font-semibold text-blue-700">Open Voting Day →</Link></section>)}
   </section>
  </>}
 </OperationalPageLayout>;
}
