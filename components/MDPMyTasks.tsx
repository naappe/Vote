'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';
import {useStaffAccess} from './AuthGate';

type Update={update_id:number;resident_id:number;activity_type:string;update_text:string;staff_email:string;saved_at:string|null};
type ManagedUser={id:string;email:string;name?:string;username?:string;active:boolean;role:string};
const labelFor:Record<string,string>={'call-center':'Call','door-to-door':'House visit','in-person-meeting':'Meeting','voting-intention':'Voting plan','general':'Remark','transportation':'Transport'};
const norm=(email:string)=>email.trim().toLowerCase();
export default function MDPMyTasks(){
 const access=useStaffAccess(),userId=access?.user.id,admin=access?.role==='admin';
 const [updates,setUpdates]=useState<Update[]>([]),[users,setUsers]=useState<ManagedUser[]>([]),[selected,setSelected]=useState('all'),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{
  if(!userId)return;
  let active=true;setLoading(true);setError('');
  void(async()=>{try{
   // SQL function checks login identity on the server; staff cannot request another user's history.
   const [history,accounts]=await Promise.all([
    supabase.rpc('vote_staff_recent_updates',{p_limit:200}),
    admin?supabase.functions.invoke('manage-users',{body:{action:'list'}}):Promise.resolve(null)
   ]);
   if(history.error)throw history.error;
   if(!active)return;
   setUpdates((history.data||[]) as Update[]);
   if(admin&&accounts&&!accounts.error&&!accounts.data?.error)setUsers((accounts.data?.users||[]) as ManagedUser[]);
  }catch(e){if(active)setError(e instanceof Error?e.message:'Could not load your saved updates')}
  finally{if(active)setLoading(false)}})();
  return()=>{active=false};
 },[userId,admin]);
 const known=useMemo(()=>new Map(users.map(user=>[norm(user.email),user])),[users]);
 const activityUsers=useMemo(()=>[...new Set(updates.map(item=>norm(item.staff_email)).filter(Boolean))],[updates]);
 const activeEmails=useMemo(()=>[...new Set([...users.map(user=>norm(user.email)),...activityUsers])].sort(),[users,activityUsers]);
 const visible=useMemo(()=>!admin||selected==='all'?updates:updates.filter(row=>norm(row.staff_email)===selected),[admin,selected,updates]);
 const uniqueResidents=new Set(visible.map(item=>String(item.resident_id))).size;
 const recent=visible.slice(0,16);
 const totalLabel=admin?'Staff updates':'My updates';
 const staffName=(email:string)=>known.get(norm(email))?.name||known.get(norm(email))?.username||email;
 if(!userId)return null;
 return <section className="mdp-home-section" aria-labelledby="mdp-assignment-heading">
  <div className="mdp-home-section-heading"><h2 id="mdp-assignment-heading">{admin?'All users’ work':'My Work'}</h2><p>{admin?'Saved work by login account. Choose a user to review their updates.':'Only updates recorded under your signed-in account. Other users’ work is not shown here.'}</p></div>
  {loading?<p className="mdp-home-house-loading" role="status">Loading saved work…</p>:error?<p role="alert" className="mdp-home-house-loading">Could not load work activity: {error}</p>:<>
   {admin&&<label className="block max-w-sm"><span className="field-label">Login user</span><select className="field mt-1 w-full" value={selected} onChange={e=>setSelected(e.target.value)}><option value="all">All users</option>{activeEmails.map(email=><option key={email} value={email}>{staffName(email)}</option>)}</select></label>}
   <div className="mdp-home-task-stats">
    <div><span>{totalLabel}</span><strong>{visible.length}</strong></div>
    <div><span>Residents updated</span><strong>{uniqueResidents}</strong></div>
    <div><span>Calls recorded</span><strong>{visible.filter(item=>item.activity_type==='call-center').length}</strong></div>
    <div><span>House visits</span><strong>{visible.filter(item=>item.activity_type==='door-to-door').length}</strong></div>
   </div>
   {admin&&users.length>0&&selected==='all'&&<div className="mdp-home-houses">{users.map(user=><button type="button" key={user.id} className="mdp-home-house-row" onClick={()=>setSelected(norm(user.email))}><span className="mdp-home-house-rank" aria-hidden="true">●</span><strong>{user.name||user.username||user.email}</strong><span className="mdp-home-house-count">{updates.filter(item=>norm(item.staff_email)===norm(user.email)).length} updates</span><span className="mdp-home-house-arrow" aria-hidden="true">›</span></button>)}</div>}
   {recent.length?<div className="mdp-home-task-list">{recent.map(item=><Link prefetch={false} key={item.update_id} href={'/mdp/resident-profile/?id='+encodeURIComponent(String(item.resident_id))} className="mdp-home-task-row"><span className="mdp-home-task-indicator is-done" aria-hidden="true">✓</span><span className="mdp-home-task-info"><strong>{labelFor[item.activity_type]||'Task update'} · Resident #{item.resident_id}</strong><small>{item.saved_at?new Date(item.saved_at).toLocaleString():'Date unavailable'}{admin?' · '+staffName(item.staff_email):''}</small><small>{item.update_text||'Result saved'}</small></span><span className="mdp-home-task-state">View ›</span></Link>)}</div>:<p className="mdp-home-house-loading">{admin?'No saved updates for this login user.':'No saved updates under your login yet.'}</p>}
   <p className="text-xs text-body">Shows recent recorded call, visit, meeting, voting-plan and remark history. Resident records remain shared according to staff permissions. Older updates without a recorder cannot be attributed to a user.</p>
  </>}
 </section>;
}
