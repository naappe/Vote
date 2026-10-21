'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import {useStaffAccess} from './AuthGate';

const dailyTasks=[
 {title:'Find a resident',detail:'Search by name, ID, house or phone number.',href:'/mdp/residents/',mark:'01'},
 {title:'Record a phone call',detail:'See who was called and save the call result.',href:'/mdp/calls/',mark:'02'},
 {title:'Record a house visit',detail:'Find residents visited at home and update their visit result.',href:'/mdp/residents/?focus=visited',mark:'03'},
 {title:'Check voting plans',detail:'See who plans to vote, who is unsure, and who needs follow-up.',href:'/mdp/residents/?focus=undecided',mark:'04'},
];

const otherTasks=[
 {title:'Write or read notes',detail:'Check saved notes about residents.',href:'/mdp/residents/?focus=remarks'},
 {title:'Arrange transport',detail:'See residents who have a transport request.',href:'/mdp/transportation/'},
 {title:'View reports',detail:'See progress and saved results.',href:'/mdp/reports/'},
];

export default function MDPResidentHome(){
 const access=useStaffAccess(),role=access?.role||'';
 const canManage=role==='admin'||role==='supervisor';
 const [houses,setHouses]=useState<{name:string;count:number}[]>([]),[houseLoading,setHouseLoading]=useState(true),[houseError,setHouseError]=useState('');
 useEffect(()=>{let active=true;void(async()=>{try{
  const all:{house:string|null}[]=[];
  for(let start=0;start<10000;start+=1000){const {data,error}=await supabase.from('Resident').select('house').ilike('party','MDP').order('id',{ascending:true}).range(start,start+999);if(error)throw error;const batch=(data||[]) as {house:string|null}[];all.push(...batch);if(batch.length<1000)break;}
  const grouped=new Map<string,number>();
  for(const item of all){const raw=String(item.house||'').trim();if(!raw)continue;
   const name=/dhafthar|^(no\s*)?(dh\s*r|dhr|rs)(\s*no)?\s*[0-9]|^no\s*[0-9]/i.test(raw)?'Dhafthar':/sina mal[eé]/i.test(raw)?'Sina Malé':raw;
   grouped.set(name,(grouped.get(name)||0)+1);
  }
  const result=[...grouped].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)).slice(0,10);
  if(active)setHouses(result);
 }catch(e){if(active)setHouseError(e instanceof Error?e.message:'Unable to load houses')}finally{if(active)setHouseLoading(false)}})();return()=>{active=false}},[]);
 const canHandleVotingDay=canManage||role==='election_operator';
 return <div className="mdp-home mdp-home-simple">
  <section className="mdp-home-intro" aria-labelledby="mdp-home-title">
   <div><p className="mdp-eyebrow">MDP Resident Voters</p><h1 id="mdp-home-title">What would you like to do?</h1><p>Choose a task below. You can search for a resident and save your work in a few steps.</p></div>
   <Link prefetch={false} href="/mdp/residents/" className="mdp-home-main-link">Open Residents <span aria-hidden="true">→</span></Link>
  </section>
  <section className="mdp-home-section" aria-labelledby="mdp-daily-heading">
   <div className="mdp-home-section-heading"><h2 id="mdp-daily-heading">Everyday tasks</h2><p>Choose what you need to do now.</p></div>
   <div className="mdp-home-quick-grid">{dailyTasks.map(task=><Link prefetch={false} key={task.title} href={task.href} className="mdp-home-quick-card">
    <strong>{task.title}</strong><small>{task.detail}</small><span className="mdp-home-quick-arrow" aria-hidden="true">Open →</span>
   </Link>)}</div>
  </section>
  <section className="mdp-home-section" aria-labelledby="mdp-top-houses-heading">
   <div className="mdp-home-section-heading"><h2 id="mdp-top-houses-heading">10 houses with the most residents</h2><p>MDP resident records, grouped by house. Select a house to see its residents.</p></div>
   {houseLoading?<div role="status" className="mdp-home-house-loading">Loading house counts…</div>:houseError?<p role="alert" className="mdp-home-house-loading">House counts unavailable. <Link prefetch={false} href="/mdp/residents/">Open Residents</Link></p>:houses.length?<div className="mdp-home-houses">{houses.map((house,index)=><Link prefetch={false} key={house.name} href={'/mdp/residents/?house='+encodeURIComponent(house.name)} className="mdp-home-house-row" title={'View residents in '+house.name}><span className="mdp-home-house-rank">{index+1}</span><strong>{house.name}</strong><span className="mdp-home-house-count">{house.count} {house.count===1?'resident':'residents'}</span><span className="mdp-home-house-arrow" aria-hidden="true">›</span></Link>)}</div>:<p className="mdp-home-house-loading">No house records are available.</p>}
  </section>
  <section className="mdp-home-section" aria-labelledby="mdp-other-heading">
   <div className="mdp-home-section-heading"><h2 id="mdp-other-heading">Other tasks</h2><p>Reports, notes, transport and election work.</p></div>
   <div className="mdp-home-simple-links">{otherTasks.map(task=><Link key={task.title} prefetch={false} href={task.href} className="mdp-home-simple-link"><span><strong>{task.title}</strong><small>{task.detail}</small></span><span aria-hidden="true">›</span></Link>)}
    {canHandleVotingDay&&<Link prefetch={false} href="/mdp/voting-days/" className="mdp-home-simple-link"><span><strong>Record who voted</strong><small>Mark residents who voted on election day.</small></span><span aria-hidden="true">›</span></Link>}
    {canManage&&<Link prefetch={false} href="/mdp/assignments/" className="mdp-home-simple-link"><span><strong>Assign staff work</strong><small>Give tasks to staff members.</small></span><span aria-hidden="true">›</span></Link>}
    {canHandleVotingDay&&<Link prefetch={false} href="/mdp/transport-links/" className="mdp-home-simple-link"><span><strong>Connect transport requests</strong><small>Match resident requests with transport arrangements.</small></span><span aria-hidden="true">›</span></Link>}
   </div>
  </section>
 </div>
}
