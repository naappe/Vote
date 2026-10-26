'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {getResidentDataRevision,supabase} from '../lib/supabase';
import type {DashboardStats} from '../lib/types';
import VoteStatusChart from './VoteStatusChart';
import PhoneStatusChart from './PhoneStatusChart';
import AdminRecentUpdates from './AdminRecentUpdates';
import ReachProgressBar from './ReachProgressBar';

const empty:DashboardStats={total:0,willVote:0,undecided:0,notVote:0,needCall:0,called:0,reached:0,notReached:0,visited:0,unvisited:0};
type SectionCard={title:string;href:string;accent:string;cta:string;emptyMessage:string;progress?:number;values:{label:string;value:number;percentage?:boolean}[]};
type DashboardSnapshot={stats:DashboardStats;assigned:number;transport:number;voted:number;withRemarks:number;missingPhone:number};

function progressTone(progress:number){if(progress>=71)return{bar:'bg-emerald-500',text:'text-emerald-700',surface:'bg-emerald-50'};if(progress>=31)return{bar:'bg-amber-500',text:'text-amber-700',surface:'bg-amber-50'};return{bar:'bg-rose-500',text:'text-rose-700',surface:'bg-rose-50'}}

async function fetchDashboardSnapshot():Promise<DashboardSnapshot>{
 const [residentCount,phones,willVoteCount,notVoteCount,calledCount,reachedCount,visitedCount,assignedCount,transportCount,votedCount,remarksCount]=await Promise.all([
  supabase.from('Resident').select('id',{count:'exact',head:true}),
  supabase.from('Resident').select('id',{count:'exact',head:true}).is('phone',null),
  supabase.from('call_center').select('resident_id',{count:'exact',head:true}).eq('vote_status','will-vote'),
  supabase.from('call_center').select('resident_id',{count:'exact',head:true}).eq('vote_status','not-vote'),
  supabase.from('call_center').select('resident_id',{count:'exact',head:true}).eq('phone_status','called'),
  supabase.from('call_center').select('resident_id',{count:'exact',head:true}).eq('reach_status','reached'),
  supabase.from('door_to_door').select('resident_id',{count:'exact',head:true}).neq('visit_status','not-visited'),
  supabase.from('assignments').select('resident_id',{count:'exact',head:true}).neq('status','inactive'),
  supabase.from('transportation').select('resident_id',{count:'exact',head:true}).eq('transport_status','need-transport'),
  supabase.from('election_day').select('resident_id',{count:'exact',head:true}).eq('has_voted',true),
  supabase.from('remarks').select('id',{count:'exact',head:true})
 ]);
 const responses=[residentCount,phones,willVoteCount,notVoteCount,calledCount,reachedCount,visitedCount,assignedCount,transportCount,votedCount,remarksCount];
 const failed=responses.find(response=>response.error);
 if(failed?.error)throw new Error(`Dashboard load failed: ${failed.error.message}`);
 const total=residentCount.count||0;
 const willVote=willVoteCount.count||0,notVote=notVoteCount.count||0,called=calledCount.count||0,reached=reachedCount.count||0,visited=visitedCount.count||0;
 const missingPhone=phones.count||0;
 const stats:DashboardStats={total,willVote,notVote,undecided:Math.max(0,total-willVote-notVote),called,needCall:Math.max(0,total-called),reached,notReached:Math.max(0,total-reached),visited,unvisited:Math.max(0,total-visited)};
 return{stats,assigned:assignedCount.count||0,transport:transportCount.count||0,voted:votedCount.count||0,withRemarks:remarksCount.count||0,missingPhone};
}

// Reuse a recent administrator snapshot during rapid navigation, without keeping
// old counts after a local resident/task mutation or an authentication change.
let dashboardCache:{revision:number;expires:number;data:DashboardSnapshot}|null=null;
let dashboardRequest:{revision:number;request:Promise<DashboardSnapshot>}|null=null;
async function loadDashboardSnapshot():Promise<DashboardSnapshot>{
 const revision=getResidentDataRevision();
 if(dashboardCache&&dashboardCache.revision===revision&&dashboardCache.expires>Date.now())return dashboardCache.data;
 if(dashboardRequest?.revision===revision)return dashboardRequest.request;
 const request=fetchDashboardSnapshot().then(data=>{
  if(getResidentDataRevision()===revision)dashboardCache={revision,expires:Date.now()+12000,data};
  return data;
 });
 dashboardRequest={revision,request};
 try{return await request}finally{if(dashboardRequest?.request===request)dashboardRequest=null}
}

export default function DashboardContent(){
 const [snapshot,setSnapshot]=useState<DashboardSnapshot|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{loadDashboardSnapshot().then(setSnapshot).catch(e=>setError(e.message||'Unable to load campaign')).finally(()=>setLoading(false))},[]);
 const stats=snapshot?.stats||empty;
 const percentage=(value:number)=>stats.total?Math.round(value/stats.total*100):0;
 const kpis=[
  {label:'Residents loaded',value:stats.total,detail:'Campaign resident master',tone:'text-primary',bar:'bg-primary',progress:100},
  {label:'Need call',value:stats.needCall,detail:'Awaiting phone outreach',tone:'text-amber-500',bar:'bg-amber-500',progress:percentage(stats.needCall)},
  {label:'Resident reach',value:percentage(stats.reached)+'%',detail:stats.reached.toLocaleString()+' residents reached',tone:'text-emerald-600',bar:'bg-emerald-500',progress:percentage(stats.reached)},
  {label:'Will vote',value:stats.willVote,detail:percentage(stats.willVote)+'% of residents',tone:'text-primary',bar:'bg-primary',progress:percentage(stats.willVote)}
 ];
 const quick=[
  {label:'Assigned residents',value:snapshot?.assigned||0,tone:'bg-primary'},
  {label:'Field visits completed',value:stats.visited,tone:'bg-emerald-500'},
  {label:'Transport needed',value:snapshot?.transport||0,tone:'bg-amber-500'},
  {label:'Missing phone numbers',value:snapshot?.missingPhone||0,tone:'bg-rose-500'}
 ];
 if(loading)return <div className="panel"><div className="h-72 animate-pulse rounded-card bg-primary-light"/></div>;
 if(error)return <div className="error-banner">{error}</div>;
 return <div className="space-y-5">
  <section className="dashboard-banner"><div><p className="eyebrow">Campaign overview</p><h1 className="mt-1">Operations Dashboard</h1></div><div className="status-chip bg-emerald-50 text-emerald-700">{stats.total.toLocaleString()} residents loaded</div></section>
  <section className="dashboard-kpi-grid">{kpis.map(item=><article key={item.label} className="dashboard-kpi"><p className="text-sm font-semibold text-navy">{item.label}</p><strong className={`mt-2 block text-3xl ${item.tone}`}>{typeof item.value==='number'?item.value.toLocaleString():item.value}</strong><p className="mt-1 text-xs text-body">{item.detail}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.bar}`} style={{width:`${Math.max(3,Math.min(100,item.progress))}%`}}/></div></article>)}</section>
  <section className="grid gap-4 xl:grid-cols-2">
   <ProgressPanel title="Call Center Progress" action="Open Call Center" href="/call-center/" rows={[
    ['Calls completed',stats.called,percentage(stats.called),'bg-emerald-500'],
    ['Awaiting calls',stats.needCall,percentage(stats.needCall),'bg-amber-500'],
    ['Residents reached',stats.reached,percentage(stats.reached),'bg-primary']
   ]}/>
   <ProgressPanel title="Door-to-Door Progress" action="Open Door-to-Door" href="/door-to-door/" rows={[
    ['Visits completed',stats.visited,percentage(stats.visited),'bg-emerald-500'],
    ['Visits remaining',stats.unvisited,percentage(stats.unvisited),'bg-amber-500'],
    ['Coverage',stats.visited,percentage(stats.visited),'bg-primary']
   ]}/>
  </section>
  <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
   <article className="panel"><div className="section-heading"><div><p className="eyebrow">Operational workload</p><h2 className="mt-1">Start where work is needed</h2></div></div><div className="grid gap-3 sm:grid-cols-2">{[
    ['Call Center',stats.needCall,'Residents waiting for outreach','/call-center/'],
    ['Door-to-Door',stats.unvisited,'Residents not yet visited','/door-to-door/'],
    ['Assignments',Math.max(0,stats.total-(snapshot?.assigned||0)),'Residents not assigned','/assignments/'],
    ['Contact Verification',snapshot?.missingPhone||0,'Residents missing phone numbers','/contact-verification/']
   ].map(([label,value,detail,href])=><Link key={String(label)} href={String(href)} className="dashboard-work-link"><span><b className="block text-navy">{label}</b><small>{detail}</small></span><strong>{Number(value).toLocaleString()}</strong></Link>)}</div></article>
   <article className="panel"><div className="section-heading"><div><p className="eyebrow">Quick stats</p><h2 className="mt-1">Campaign pulse</h2></div></div><div className="space-y-4">{quick.map(item=><div key={item.label}><div className="flex items-center justify-between gap-3 text-sm"><span className="text-body">{item.label}</span><b className="text-xl text-navy">{item.value.toLocaleString()}</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.tone}`} style={{width:`${Math.max(4,Math.min(100,percentage(item.value)))}%`}}/></div></div>)}</div></article>
  </section>
  <AdminRecentUpdates/>
  <section className="panel">
   <div className="section-heading"><div><p className="eyebrow">Administrator tools</p><h2 className="mt-1">Review and manage the system</h2><p className="mt-1 text-sm text-body">These controls are available only in the admin app.</p></div></div>
   <div className="grid gap-3 sm:grid-cols-3">
    <AdminTool href="/contact-verification/" title="Contact verification" detail="Review resident contact corrections and missing phone details."/>
    <AdminTool href="/users/" title="Staff accounts" detail="Manage staff access and roles."/>
    <AdminTool href="/backup/" title="Backup and export" detail="Review backup tables and export records."/>
   </div>
  </section>
 </div>;
}
function ProgressPanel({title,action,href,rows}:{title:string;action:string;href:string;rows:[string,number,number,string][]}){
 return <article className="panel"><div className="section-heading"><h2>{title}</h2><Link href={href} className="text-sm font-semibold text-primary">{action} →</Link></div><div className="space-y-4">{rows.map(([label,value,pct,tone])=><div key={label}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="text-body">{label}</span><b className="text-navy">{value.toLocaleString()} <span className="text-body">({pct}%)</span></b></div><div className="progress-bar h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone}`} style={{width:`${Math.max(3,Math.min(100,pct))}%`}}/></div></div>)}</div></article>
}
function AdminTool({href,title,detail}:{href:string;title:string;detail:string}){
 return <Link prefetch={false} href={href} className="dashboard-work-link min-h-24"><span><b className="block text-navy">{title}</b><small>{detail}</small></span><span aria-hidden="true" className="text-xl font-bold text-primary">→</span></Link>
}
