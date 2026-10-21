'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {supabase} from '../lib/supabase';
import {useStaffAccess} from './AuthGate';

type Activity={recorder_email:string;call_records:number;visit_records:number;meeting_records:number;voting_plan_records:number;note_records:number;total_records:number;last_activity:string|null};
type UpdateRow={id:number|string;resident_id:number|string;section:string;recorded_at:string|null;recorded_by:string|null};
const taskLabels:Record<string,string>={'call-center':'Phone call','door-to-door':'House visit','in-person-meeting':'Meeting','voting-intention':'Voting plan',general:'Remark'};
export default function MDPUserWork(){
 const access=useStaffAccess();
 const admin=access?.role==='admin';
 const loginEmail=access?.user.email?.trim();
 const [items,setItems]=useState<Activity[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [recent,setRecent]=useState<UpdateRow[]>([]);
 const [recentError,setRecentError]=useState('');
 useEffect(()=>{
  if(!access?.user.id)return;
  let active=true;
  void(async()=>{try{
   const {data,error:queryError}=await supabase.rpc('vote_staff_activity_summary');
   if(queryError)throw queryError;
   if(active)setItems((data||[]) as Activity[]);
   // The query is scoped at the database request; ordinary staff never request coworkers' entries.
   let recentQuery=supabase.from('remarks').select('id,resident_id,section,recorded_at,recorded_by').order('recorded_at',{ascending:false}).limit(20);
   if(!admin){const email=loginEmail;if(!email){if(active)setRecentError('Your login has no email linked to recorded activity.');return;}recentQuery=recentQuery.eq('recorded_by',email);}
   const result=await recentQuery;
   if(result.error){if(active)setRecentError('Could not load recent updates.')}else if(active)setRecent((result.data||[]) as UpdateRow[]);
  }catch(e){if(active)setError(e instanceof Error?e.message:'Could not load work history')}
  finally{if(active)setLoading(false)}})();
  return()=>{active=false};
 },[access?.user.id,loginEmail,admin]);
 const totals=items.reduce((acc,item)=>({calls:acc.calls+Number(item.call_records||0),visits:acc.visits+Number(item.visit_records||0),meetings:acc.meetings+Number(item.meeting_records||0),plans:acc.plans+Number(item.voting_plan_records||0)}),{calls:0,visits:0,meetings:0,plans:0});
 return <section className="mdp-home-section" aria-labelledby="mdp-work-heading">
  <div className="mdp-home-section-heading"><h2 id="mdp-work-heading">{admin?'Work by Login User':'My Saved Work'}</h2><p>{admin?'Updates recorded by staff login accounts.':'Only updates recorded under your signed-in account.'}</p></div>
  {loading?<p role="status" className="mdp-home-house-loading">Loading saved work…</p>:error?<p role="alert" className="mdp-home-house-loading">{error}</p>:<>
   <div className="mdp-home-task-stats"><div><span>Call updates</span><strong>{totals.calls}</strong></div><div><span>House visits</span><strong>{totals.visits}</strong></div><div><span>Meetings</span><strong>{totals.meetings}</strong></div><div><span>Vote plan updates</span><strong>{totals.plans}</strong></div></div>
   {admin&&items.length>0&&<div className="mdp-home-task-list">{items.map(item=><div className="mdp-home-task-row" key={item.recorder_email}><span className="mdp-home-task-info"><strong>{item.recorder_email}</strong><small>{Number(item.call_records)} calls · {Number(item.visit_records)} visits · {Number(item.meeting_records)} meetings · {Number(item.voting_plan_records)} vote plans</small></span><span className="mdp-home-task-state">{Number(item.total_records)} updates</span></div>)}</div>}
   {!items.length&&<p className="mdp-home-house-loading">{admin?'No recorded user activity is available.':'No saved updates are recorded under your login yet.'}</p>}
   <div className="mdp-home-section-heading"><h3 className="mdp-work-recent-heading">{admin?'Recent updates from all users':'My recent updates'}</h3><p>Most recent saved results, newest first. Select a record to view its resident.</p></div>
   {recentError?<p role="alert" className="mdp-home-house-loading">{recentError}</p>:recent.length?<div className="mdp-home-task-list">{recent.map(row=><Link key={String(row.id)} prefetch={false} href={'/mdp/resident-profile/?id='+encodeURIComponent(String(row.resident_id))} className="mdp-home-task-row"><span className="mdp-home-task-indicator" aria-hidden="true">✓</span><span className="mdp-home-task-info"><strong>{taskLabels[row.section]||'Resident update'} · Resident #{row.resident_id}</strong><small>{admin?(row.recorded_by||'Unknown user')+' · ':''}{row.recorded_at?new Date(row.recorded_at).toLocaleString():'Time unavailable'}</small></span><span className="mdp-home-task-state">View →</span></Link>)}</div>:<p className="mdp-home-house-loading">No recent updates found for this view.</p>}
  </>}
 </section>;
}
