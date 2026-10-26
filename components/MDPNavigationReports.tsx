'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {getMdpReportsSnapshot,type MdpReportSnapshot} from '../lib/mdp-report-updates';
import {subscribeMdpReportChanges} from '../lib/mdp-report-events';
import {useStaffAccess} from './AuthGate';
import OperationalPageLayout from './OperationalPageLayout';

type Snapshot=MdpReportSnapshot;
type BarRow={label:string;value:number;tone:string};
type GraphProps={title:string;detail:string;href:string;total:number;rows:BarRow[]};
type VotingDayReport={name:string;voted:number}|null;

const fraction=(value:number,total:number)=>total?Math.min(100,Math.max(0,Math.round(value/total*100))):0;

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

function RestrictedSummary({title}:{title:string}){
 return <section className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-white p-4">
  <div><p className="text-sm font-semibold text-navy">{title}</p><strong className="mt-3 block text-3xl font-bold text-slate-400">—</strong><p className="mt-1 text-xs text-body">Access not granted</p></div>
 </section>;
}
function RestrictedGraph({title}:{title:string}){
 return <section className="panel min-w-0"><h2 className="text-base font-bold text-navy">{title}</h2><p className="mt-4 text-sm text-body">This report requires permission for that workflow.</p></section>;
}

export default function MDPNavigationReports(){
 const staff=useStaffAccess();
 const [data,setData]=useState<Snapshot|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [releaseReached,setReleaseReached]=useState(false);

 useEffect(()=>{
  let active=true,requestId=0,lastRequestAt=0;
  const refresh=(force=false)=>{
   if(!active||document.visibilityState==='hidden')return;
   const now=Date.now();
   if(!force&&now-lastRequestAt<10000)return;
   lastRequestAt=now;
   const current=++requestId;
   void getMdpReportsSnapshot(force).then(report=>{
    if(!active||current!==requestId)return;
    setData(report);
    setError('');
   }).catch(err=>{
    if(active&&current===requestId)setError(err instanceof Error?err.message:'Unable to load reports');
   }).finally(()=>{
    if(active&&current===requestId)setLoading(false);
   });
  };
  refresh();
  const unsubscribe=subscribeMdpReportChanges(()=>refresh(true));
  const resume=()=>refresh();
  window.addEventListener('focus',resume);
  window.addEventListener('pageshow',resume);
  document.addEventListener('visibilitychange',resume);
  const poll=window.setInterval(()=>refresh(),30000);
  return ()=>{
   active=false;
   requestId++;
   unsubscribe();
   window.removeEventListener('focus',resume);
   window.removeEventListener('pageshow',resume);
   document.removeEventListener('visibilitychange',resume);
   window.clearInterval(poll);
  };
 },[]);
 useEffect(()=>{
  const check=()=>setReleaseReached(Date.now()>=Date.parse('2026-11-27T23:30:00+05:00'));
  check();
  const interval=window.setInterval(check,60000);
  return()=>window.clearInterval(interval);
 },[]);
 const showVotingDay=Boolean(data?.canViewVotingDay&&(staff?.role==='admin'||releaseReached));
 const voteDay=data?.votingDay??null;

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
    {data.canViewVoting?<ReportSummary title="Target Votes" value={data.willVote} detail={'Will vote · '+fraction(data.willVote,total)+'% of residents'} href={target}/>:<RestrictedSummary title="Target Votes"/>}
    {data.canViewCalls?<ReportSummary title="Calls" value={data.called} detail={'Calls recorded · '+fraction(data.called,total)+'% of residents'} href={calls}/>:<RestrictedSummary title="Calls"/>}
    {data.canViewRemarks?<ReportSummary title="Remarks" value={data.residentsWithRemarks} detail={data.noteCount.toLocaleString()+' non-empty saved remarks'} href={remarks}/>:<RestrictedSummary title="Remarks"/>}
    {data.canViewTransport?<ReportSummary title="Transports" value={data.transportNeeded} detail="Transport arrangements needed" href={transports}/>:<RestrictedSummary title="Transports"/>}
   </section>
   <section aria-label="Charts aligned with navigation" className="grid gap-4 xl:grid-cols-2">
    {data.canViewVoting?<>
    <ReportGraph title="Target Votes" href={target} total={total} detail="Recorded voting plans" rows={[
     {label:'Will vote',value:data.willVote,tone:'bg-blue-600'},
     {label:'Will not vote',value:data.willNotVote,tone:'bg-rose-500'},
     {label:'No confirmed plan',value:unconfirmed,tone:'bg-amber-400'}
    ]}/>
    </>:<RestrictedGraph title="Target Votes"/>}
    {data.canViewCalls?<>
    <ReportGraph title="Calls" href={calls} total={total} detail="Call and contact coverage" rows={[
     {label:'Called',value:data.called,tone:'bg-blue-600'},
     {label:'Reached',value:data.reached,tone:'bg-emerald-500'},
     {label:'Need call',value:uncalled,tone:'bg-amber-400'}
    ]}/>
    </>:<RestrictedGraph title="Calls"/>}
    {data.canViewRemarks?<>
    <ReportGraph title="Remarks" href={remarks} total={total} detail={'General notes saved: '+data.noteCount.toLocaleString()} rows={[
     {label:'Residents with remarks',value:data.residentsWithRemarks,tone:'bg-emerald-500'},
     {label:'No general remark',value:withoutRemarks,tone:'bg-slate-300'}
    ]}/>
    </>:<RestrictedGraph title="Remarks"/>}
    {data.canViewTransport?<>
    <ReportGraph title="Transports" href={transports} total={total} detail="Transport requests and arrangements" rows={[
     {label:'Needed or requested',value:data.transportNeeded,tone:'bg-amber-400'},
     {label:'In progress',value:data.transportInProgress,tone:'bg-blue-600'},
     {label:'Completed',value:data.transportCompleted,tone:'bg-emerald-500'}
    ]}/>
    </>:<RestrictedGraph title="Transports"/>}
    {showVotingDay&&(voteDay?<ReportGraph title="Voting Day" href="/mdp/voting-days/" total={total} detail={voteDay.name} rows={[
     {label:'Voted',value:voteDay.voted,tone:'bg-emerald-500'},
     {label:'Not yet recorded',value:Math.max(0,total-voteDay.voted),tone:'bg-amber-400'}
    ]}/>:<section className="panel"><h2 className="text-base font-bold text-navy">Voting Day</h2><p className="mt-2 text-sm text-body">No active Voting Day figures are currently available.</p><Link prefetch={false} href="/mdp/voting-days/" className="mt-4 inline-block text-sm font-semibold text-blue-700">Open Voting Day →</Link></section>)}
   </section>
  </>}
 </OperationalPageLayout>;
}
