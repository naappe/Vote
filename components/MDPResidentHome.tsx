'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {getMdpHouseOptions} from '../lib/supabase';
import MDPUserWork from './MDPUserWork';

const dailyTasks=[
 {title:'Find resident',detail:'Search by MDP serial, name or house',href:'/mdp/residents/',mark:'01'},
 {title:'Call',detail:'Contact and record the result',href:'/mdp/calls/?status=need-call',mark:'02'},
 {title:'House visit',detail:'Record visit and resident remarks',href:'/mdp/residents/?focus=visit-pending',mark:'03'},
 {title:'Voting plan',detail:'Save intention and follow-up',href:'/mdp/residents/?focus=vote-pending',mark:'04'},
];

export default function MDPResidentHome(){
 const [houses,setHouses]=useState<{name:string;count:number}[]>([]),[houseLoading,setHouseLoading]=useState(true),[houseError,setHouseError]=useState('');
 useEffect(()=>{
  let active=true;
  void getMdpHouseOptions().then(all=>{
   if(active)setHouses([...all].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)).slice(0,10));
  }).catch(e=>{if(active)setHouseError(e instanceof Error?e.message:'Unable to load houses')})
   .finally(()=>{if(active)setHouseLoading(false)});
  return()=>{active=false};
 },[]);

 return <div className="mdp-home mdp-home-simple">
  <MDPUserWork/>
  <section className="mdp-home-section" aria-labelledby="mdp-daily-heading">
   <div className="mdp-home-section-heading"><h2 id="mdp-daily-heading">Quick actions</h2></div>
   <div className="mdp-home-quick-grid">{dailyTasks.map(task=><Link key={task.title} href={task.href} className="mdp-home-quick-card">
    <span className="mdp-home-step-number">{task.mark}</span><strong>{task.title}</strong><small>{task.detail}</small><span className="mdp-home-quick-arrow" aria-hidden="true">Continue →</span>
   </Link>)}</div>
  </section>
  <section className="mdp-home-section" aria-labelledby="mdp-top-houses-heading">
   <div className="mdp-home-section-heading"><h2 id="mdp-top-houses-heading">10 houses with the most residents</h2></div>
   {houseLoading?<div role="status" className="mdp-home-house-loading">Loading house counts…</div>:houseError?<p role="alert" className="mdp-home-house-loading">House counts unavailable. <Link prefetch={false} href="/mdp/residents/">Open Residents</Link></p>:houses.length?<div className="mdp-home-houses">{houses.map((house,index)=><Link prefetch={false} key={house.name} href={'/mdp/residents/?house='+encodeURIComponent(house.name)} className="mdp-home-house-row" title={'View residents in '+house.name}><span className="mdp-home-house-rank">{index+1}</span><strong>{house.name}</strong><span className="mdp-home-house-count">{house.count} {house.count===1?'resident':'residents'}</span><span className="mdp-home-house-arrow" aria-hidden="true">›</span></Link>)}</div>:<p className="mdp-home-house-loading">No house records are available.</p>}
  </section>
  <section className="mdp-home-section" aria-labelledby="mdp-other-heading">
   <div className="mdp-home-section-heading"><h2 id="mdp-other-heading">More actions</h2></div>
   <div className="mdp-home-simple-links">{otherTasks.map(task=><Link key={task.title} prefetch={false} href={task.href} className="mdp-home-simple-link"><span><strong>{task.title}</strong><small>{task.detail}</small></span><span aria-hidden="true">›</span></Link>)}
    {canHandleVotingDay&&<Link prefetch={false} href="/mdp/voting-days/" className="mdp-home-simple-link"><span><strong>Record who voted</strong><small>Mark residents who voted on election day.</small></span><span aria-hidden="true">›</span></Link>}
    {role==='admin'&&<Link prefetch={false} href="/mdp/import-review/" className="mdp-home-simple-link"><span><strong>Latest 2026 roster · ID review</strong><small>Review 540 imported names, missing IDs and conflicting matches before updating records.</small></span><span aria-hidden="true">›</span></Link>}
    {canManage&&<Link prefetch={false} href="/mdp/assignments/" className="mdp-home-simple-link"><span><strong>Assign staff work</strong><small>Give tasks to staff members.</small></span><span aria-hidden="true">›</span></Link>}
    {canHandleVotingDay&&<Link prefetch={false} href="/mdp/transport-links/" className="mdp-home-simple-link"><span><strong>Connect transport requests</strong><small>Match resident requests with transport arrangements.</small></span><span aria-hidden="true">›</span></Link>}
   </div>
  </section>
 </div>
}
