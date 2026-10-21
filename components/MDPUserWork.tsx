'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import {useStaffAccess} from './AuthGate';

type Activity={recorder_email:string;call_records:number;visit_records:number;meeting_records:number;voting_plan_records:number;note_records:number;total_records:number;last_activity:string|null};
export default function MDPUserWork(){
 const access=useStaffAccess();
 const admin=access?.role==='admin';
 const [items,setItems]=useState<Activity[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(!access?.user.id)return;
  let active=true;
  void(async()=>{try{
   const {data,error:queryError}=await supabase.rpc('vote_staff_activity_summary');
   if(queryError)throw queryError;
   if(active)setItems((data||[]) as Activity[]);
  }catch(e){if(active)setError(e instanceof Error?e.message:'Could not load work history')}
  finally{if(active)setLoading(false)}})();
  return()=>{active=false};
 },[access?.user.id,admin]);
 const totals=items.reduce((acc,item)=>({calls:acc.calls+Number(item.call_records||0),visits:acc.visits+Number(item.visit_records||0),meetings:acc.meetings+Number(item.meeting_records||0),plans:acc.plans+Number(item.voting_plan_records||0)}),{calls:0,visits:0,meetings:0,plans:0});
 return <section className="mdp-home-section" aria-labelledby="mdp-work-heading">
  <div className="mdp-home-section-heading"><h2 id="mdp-work-heading">{admin?'Work by Login User':'My Saved Work'}</h2><p>{admin?'Updates recorded by staff login accounts.':'Only updates recorded under your signed-in account.'}</p></div>
  {loading?<p role="status" className="mdp-home-house-loading">Loading saved work…</p>:error?<p role="alert" className="mdp-home-house-loading">{error}</p>:<>
   <div className="mdp-home-task-stats"><div><span>Call updates</span><strong>{totals.calls}</strong></div><div><span>House visits</span><strong>{totals.visits}</strong></div><div><span>Meetings</span><strong>{totals.meetings}</strong></div><div><span>Vote plan updates</span><strong>{totals.plans}</strong></div></div>
   {admin&&items.length>0&&<div className="mdp-home-task-list">{items.map(item=><div className="mdp-home-task-row" key={item.recorder_email}><span className="mdp-home-task-info"><strong>{item.recorder_email}</strong><small>{Number(item.call_records)} calls · {Number(item.visit_records)} visits · {Number(item.meeting_records)} meetings · {Number(item.voting_plan_records)} vote plans</small></span><span className="mdp-home-task-state">{Number(item.total_records)} updates</span></div>)}</div>}
   {!items.length&&<p className="mdp-home-house-loading">{admin?'No recorded user activity is available.':'No saved updates are recorded under your login yet.'}</p>}
  </>}
 </section>;
}
