'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import {useStaffAccess} from './AuthGate';

type ActivitySummary={recorder_email:string;call_records:number;visit_records:number;meeting_records:number;voting_plan_records:number;note_records:number;total_records:number;last_activity:string|null};
type Activity={update_id:number;resident_id:number;activity_type:string;update_text:string;staff_email:string;saved_at:string|null};
type ManagedUser={id:string;email:string;name:string;role:string;active:boolean};
const normalize=(value:string|null|undefined)=>String(value||'').trim().toLowerCase();
const labels:Record<string,string>={'call-center':'Phone call','door-to-door':'House visit','in-person-meeting':'Meeting','voting-intention':'Voting plan','general':'Remark'};
const dateLabel=(value:string|null)=>value?new Date(value).toLocaleString():'Date not recorded';
export default function MDPUserUpdates(){
 const access=useStaffAccess(),userId=access?.user.id,admin=access?.role==='admin',email=normalize(access?.user.email);
 const [summary,setSummary]=useState<ActivitySummary[]>([]),[recent,setRecent]=useState<Activity[]>([]),[accounts,setAccounts]=useState<ManagedUser[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[selected,setSelected]=useState('');
 useEffect(()=>{if(!userId)return;let active=true;setLoading(true);setError('');
  void(async()=>{try{
   const [totals,updates,users]=await Promise.all([
    supabase.rpc('vote_staff_activity_summary'),
    supabase.rpc('vote_staff_recent_updates',{p_limit:100}),
    admin?supabase.functions.invoke('manage-users',{body:{action:'list'}}):Promise.resolve(null),
   ]);
   if(totals.error)throw totals.error;
   if(updates.error)throw updates.error;
   if(admin&&(users?.error||users?.data?.error))throw new Error(users?.data?.error||users?.error?.message||'Unable to load login users');
   if(!active)return;
   const allSummary=(totals.data||[]) as ActivitySummary[],allRecent=(updates.data||[]) as Activity[];
   // This is a display safeguard; database functions independently enforce ownership.
   setSummary(admin?allSummary:allSummary.filter(item=>normalize(item.recorder_email)===email));
   setRecent(admin?allRecent:allRecent.filter(item=>normalize(item.staff_email)===email));
   if(admin)setAccounts(((users?.data?.users||[]) as ManagedUser[]).filter(user=>user.email).sort((a,b)=>(a.name||a.email).localeCompare(b.name||b.email)));
  }catch(e){if(active)setError(e instanceof Error?e.message:'Unable to load saved updates')}
  finally{if(active)setLoading(false)}
  })();return()=>{active=false};
 },[userId,admin,email]);
 if(!userId)return null;
 const own=summary.find(item=>normalize(item.recorder_email)===email);
 const users=admin?accounts.map(user=>({user,stats:summary.find(row=>normalize(row.recorder_email)===normalize(user.email))})):[],known=new Set(users.map(item=>normalize(item.user.email)));
 const other=admin?summary.filter(row=>!known.has(normalize(row.recorder_email))):[];
 const visible=recent.filter(item=>!admin||!selected||normalize(item.staff_email)===selected);
 const total=admin?summary.reduce((n,item)=>n+Number(item.total_records||0),0):Number(own?.total_records||0);
 return <section className="mdp-home-section" aria-labelledby="mdp-user-updates-heading">
  <div className="mdp-home-section-heading">
   <h2 id="mdp-user-updates-heading">{admin?'Login users · Work updates':'My Saved Updates'}</h2>
   <p>{admin?'Review saved activity by login account. Users with no updates appear with zero.':'Only updates recorded under your signed-in email are displayed here.'}</p>
  </div>
  {loading?<p role="status" className="mdp-home-house-loading">Loading saved work…</p>:error?<p role="alert" className="mdp-home-house-loading">{error}</p>:<>
   <div className="mdp-home-task-stats">
    <div><span>{admin?'All saved updates':'My saved updates'}</span><strong>{total.toLocaleString()}</strong></div>
    <div><span>Phone call updates</span><strong>{(admin?summary.reduce((n,v)=>n+Number(v.call_records||0),0):Number(own?.call_records||0)).toLocaleString()}</strong></div>
    <div><span>House visit updates</span><strong>{(admin?summary.reduce((n,v)=>n+Number(v.visit_records||0),0):Number(own?.visit_records||0)).toLocaleString()}</strong></div>
    <div><span>Voting plan updates</span><strong>{(admin?summary.reduce((n,v)=>n+Number(v.voting_plan_records||0),0):Number(own?.voting_plan_records||0)).toLocaleString()}</strong></div>
   </div>
   {admin&&<>
    <div className="mdp-home-section-heading"><h3>Users created in User Management</h3><p>Counts are saved activity entries, not unique residents or completed tasks.</p></div>
    <div className="mdp-home-user-list">{users.map(({user,stats})=><button type="button" key={user.id} className={'mdp-home-user-row'+(selected===normalize(user.email)?' is-active':'')} onClick={()=>setSelected(current=>current===normalize(user.email)?'':normalize(user.email))} aria-pressed={selected===normalize(user.email)}>
     <span><strong>{user.name||user.email}</strong><small>{user.email} · {user.role.replaceAll('_',' ')}{user.active?'':' · Inactive'}</small></span><span>{Number(stats?.total_records||0)} updates</span>
    </button>)}</div>
    {other.length>0&&<p className="text-xs text-body">{other.length} historical recorder email(s) do not match a current managed user. Their entries remain in the total and recent history where authorized.</p>}
   </>}
   <div className="mdp-home-section-heading"><h3>{admin?(selected?'Selected user’s recent updates':'Recent updates from all users'):'My recent updates'}</h3><p>{admin&&selected?'Select the user again to return to everyone’s updates.':'This is a saved activity log; it does not replace the shared resident status.'}</p></div>
   {visible.length?<div className="mdp-home-task-list">{visible.slice(0,20).map(item=><div className="mdp-home-task-row" key={item.update_id}>
    <span className="mdp-home-task-indicator is-done" aria-hidden="true">✓</span>
    <span className="mdp-home-task-info"><strong>{labels[item.activity_type]||item.activity_type} · Resident #{item.resident_id}</strong><small>{admin?item.staff_email+' · ':''}{dateLabel(item.saved_at)}</small></span>
   </div>)}</div>:<p className="mdp-home-house-loading">No saved updates found{selected?' for this user':''}.</p>}
  </>}
 </section>;
}
