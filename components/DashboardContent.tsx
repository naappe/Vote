'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';
import type {DashboardStats} from '../lib/types';
import VoteStatusChart from './VoteStatusChart';
import PhoneStatusChart from './PhoneStatusChart';
import ReachProgressBar from './ReachProgressBar';

const empty:DashboardStats={total:0,willVote:0,undecided:0,notVote:0,needCall:0,called:0,reached:0,notReached:0,visited:0,unvisited:0};
type SectionCard={title:string;href:string;accent:string;cta:string;emptyMessage:string;progress?:number;values:{label:string;value:number;percentage?:boolean}[]};
type DashboardSnapshot={stats:DashboardStats;assigned:number;transport:number;voted:number;withRemarks:number;missingPhone:number};

function progressTone(progress:number){if(progress>=71)return{bar:'bg-emerald-500',text:'text-emerald-700',surface:'bg-emerald-50'};if(progress>=31)return{bar:'bg-amber-500',text:'text-amber-700',surface:'bg-amber-50'};return{bar:'bg-rose-500',text:'text-rose-700',surface:'bg-rose-50'}}

async function loadDashboardSnapshot():Promise<DashboardSnapshot>{
 const [residentCount,phones,calls,visits,assignments,transportCount,votedCount,remarksCount]=await Promise.all([
  supabase.from('Resident').select('id',{count:'exact',head:true}),
  supabase.from('Resident').select('phone'),
  supabase.from('call_center').select('resident_id,phone_status,reach_status,vote_status,support_level'),
  supabase.from('door_to_door').select('resident_id,d2d_status'),
  supabase.from('assignments').select('resident_id,status'),
  supabase.from('transportation').select('resident_id',{count:'exact',head:true}).eq('transport_status','need-transport'),
  supabase.from('election_day').select('resident_id',{count:'exact',head:true}).eq('has_voted',true),
  supabase.from('remarks').select('id',{count:'exact',head:true})
 ]);
 const responses=[residentCount,phones,calls,visits,assignments,transportCount,votedCount,remarksCount];
 const failed=responses.find(response=>response.error);
 if(failed?.error)throw new Error(`Dashboard load failed: ${failed.error.message}`);
 const total=residentCount.count||0;
 const callRows=calls.data||[];
 const callByResident=new Map<string,any>();
 for(const row of callRows)callByResident.set(String(row.resident_id),row);
 let willVote=0,notVote=0,called=0,reached=0;
 for(const row of callByResident.values()){
  if(row.vote_status==='will-vote')willVote++;
  else if(row.vote_status==='not-vote')notVote++;
  if(row.phone_status==='called')called++;
  if(row.reach_status==='reached'||row.phone_status==='called'||row.vote_status==='will-vote'||row.vote_status==='not-vote'||row.support_level==='guaranteed')reached++;
 }
 const visitedResidents=new Set<string>();
 for(const row of visits.data||[])if(row.d2d_status&&row.d2d_status!=='not-visited')visitedResidents.add(String(row.resident_id));
 const assignedResidents=new Set<string>();
 for(const row of assignments.data||[])if(row.status!=='inactive')assignedResidents.add(String(row.resident_id));
 const missingPhone=(phones.data||[]).filter(row=>!String(row.phone||'').trim()).length;
 const stats:DashboardStats={total,willVote,notVote,undecided:Math.max(0,total-willVote-notVote),called,needCall:Math.max(0,total-called),reached,notReached:Math.max(0,total-reached),visited:visitedResidents.size,unvisited:Math.max(0,total-visitedResidents.size)};
 return{stats,assigned:assignedResidents.size,transport:transportCount.count||0,voted:votedCount.count||0,withRemarks:remarksCount.count||0,missingPhone};
}

export default function DashboardContent(){
 const [snapshot,setSnapshot]=useState<DashboardSnapshot|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{loadDashboardSnapshot().then(setSnapshot).catch(e=>setError(e.message||'Unable to load campaign')).finally(()=>setLoading(false))},[]);
 const stats=snapshot?.stats||empty;
 const sections=useMemo<SectionCard[]>(()=>{
  const assigned=snapshot?.assigned||0,transport=snapshot?.transport||0,voted=snapshot?.voted||0,withRemarks=snapshot?.withRemarks||0,missingPhone=snapshot?.missingPhone||0;
  const pct=(value:number)=>stats.total?Math.round(value/stats.total*100):0;
  return[
   {title:'Residents',href:'/residents/',accent:'bg-sky-500',cta:'Browse residents',emptyMessage:'No residents loaded yet',progress:pct(stats.reached),values:[{label:'Total',value:stats.total},{label:'Reached',value:stats.reached},{label:'Pending',value:stats.notReached}]},
   {title:'Call Center',href:'/call-center/',accent:'bg-cyan-500',cta:stats.called?'Continue calling':'Get started',emptyMessage:'No calls completed yet',progress:pct(stats.called),values:[{label:'Need call',value:stats.needCall},{label:'Called',value:stats.called},{label:'Coverage',value:pct(stats.called),percentage:true}]},
   {title:'Door-to-Door',href:'/door-to-door/',accent:'bg-emerald-500',cta:stats.visited?'Continue visits':'Get started',emptyMessage:'No visits completed yet',progress:pct(stats.visited),values:[{label:'Pending',value:stats.unvisited},{label:'Completed',value:stats.visited},{label:'Coverage',value:pct(stats.visited),percentage:true}]},
   {title:'Assignments',href:'/assignments/',accent:'bg-violet-500',cta:assigned?'View assignments':'Create assignment',emptyMessage:'No assignments created yet',progress:pct(assigned),values:[{label:'Assigned',value:assigned},{label:'Unassigned',value:Math.max(0,stats.total-assigned)},{label:'Coverage',value:pct(assigned),percentage:true}]},
   {title:'Transportation',href:'/transportation/',accent:'bg-amber-500',cta:transport?'Open transport queue':'Review transport',emptyMessage:'No transport requests',values:[{label:'Need transport',value:transport},{label:'Not needed',value:Math.max(0,stats.total-transport)},{label:'Open',value:transport}]},
   {title:'Election Day',href:'/election-day/',accent:'bg-rose-500',cta:voted?'Open turnout queue':'Get started',emptyMessage:'No votes recorded yet',progress:pct(voted),values:[{label:'Voted',value:voted},{label:'Remaining',value:Math.max(0,stats.total-voted)},{label:'Turnout',value:pct(voted),percentage:true}]},
   {title:'Contact Verification',href:'/contact-verification/',accent:'bg-orange-500',cta:missingPhone?'Review contacts':'Open verification',emptyMessage:'No contact issues detected',values:[{label:'Missing phone',value:missingPhone},{label:'With phone',value:Math.max(0,stats.total-missingPhone)},{label:'Review',value:missingPhone}]},
   {title:'Remarks',href:'/remarks/',accent:'bg-fuchsia-500',cta:withRemarks?'View timeline':'Add first remark',emptyMessage:'No remarks recorded yet',values:[{label:'Remark records',value:withRemarks},{label:'Residents',value:stats.total},{label:'Records',value:withRemarks}]},
   {title:'Reports',href:'/reports/',accent:'bg-indigo-500',cta:'Open reports',emptyMessage:'No campaign outcomes recorded yet',progress:pct(stats.willVote+stats.notVote),values:[{label:'Will vote',value:stats.willVote},{label:'Not decided',value:stats.undecided},{label:'Not vote',value:stats.notVote}]}
  ];
 },[snapshot,stats]);
 if(loading)return <div className="panel"><div className="h-24 animate-pulse rounded-card bg-primary-light"/></div>;
 if(error)return <div className="error-banner">{error}</div>;
 return <div className="space-y-5">
  <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Campaign overview</p><h1 className="mt-1">Operations Dashboard</h1><p className="mt-1 text-sm text-body">Monitor campaign workload, team progress and urgent actions.</p></div><div className="status-chip bg-emerald-50 text-emerald-700">{stats.total.toLocaleString()} residents loaded</div></section>
  <div className="grid gap-4 xl:grid-cols-3"><VoteStatusChart stats={stats}/><PhoneStatusChart stats={stats}/><ReachProgressBar stats={stats}/></div>
  <section><div className="mb-3"><p className="eyebrow">Operational workload</p><h2 className="mt-1">Start work and track progress</h2></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{sections.map(section=>{const tone=section.progress===undefined?null:progressTone(section.progress);const isEmpty=section.values.every(item=>item.value===0);return <Link prefetch href={section.href} key={section.title} aria-label={`${section.cta}: ${section.title}`} className="group flex min-h-[210px] flex-col rounded-xl border border-border bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"><div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${section.accent}`}/><h3 className="font-semibold text-navy group-hover:text-primary">{section.title}</h3><span className="ml-auto text-lg text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-primary">→</span></div>{isEmpty?<div className="mt-5 flex flex-1 flex-col justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center"><strong className="text-sm font-semibold text-navy">{section.emptyMessage}</strong><span className="mt-1 text-xs text-body">Use this section to begin recording activity.</span></div>:<div className="mt-4 grid grid-cols-3 gap-2">{section.values.map(item=><div key={item.label} className="rounded-lg bg-slate-50 px-3 py-3"><strong className="block text-lg font-semibold text-navy">{item.percentage?`${item.value}%`:item.value.toLocaleString()}</strong><span className="mt-1 block text-[11px] text-body">{item.label}</span></div>)}</div>}{tone&&section.progress!==undefined&&<div className="mt-4"><div className="mb-1.5 flex items-center justify-between text-xs"><span className="text-body">Progress</span><span className={`rounded-full px-2 py-0.5 font-semibold ${tone.surface} ${tone.text}`}>{section.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all ${tone.bar}`} style={{width:`${Math.min(100,Math.max(0,section.progress))}%`}}/></div></div>}<div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-sm font-semibold text-primary">{section.cta}</span><span className="text-xs text-body">Open section</span></div></Link>})}</div></section>
 </div>;
}
