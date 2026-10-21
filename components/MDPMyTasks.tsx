'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import {useStaffAccess} from './AuthGate';
type Assignment={id:number|string;resident_id:number|string;assignee_name:string;assignee_user_id:string|null;assignment_type:string;status:string};
type ResidentLabel={id:number|string;name:string|null;house:string|null};
const complete=(s:string)=>['completed','complete','done'].includes(s.toLowerCase().trim());
export default function MDPMyTasks(){
 const access=useStaffAccess(),userId=access?.user.id,manager=access?.role==='admin'||access?.role==='supervisor';
 const [rows,setRows]=useState<Assignment[]>([]),[names,setNames]=useState<Record<string,ResidentLabel>>({}),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{if(!userId)return;let active=true;setLoading(true);setError('');
  void(async()=>{try{
   let q=supabase.from('assignments').select('id,resident_id,assignee_name,assignee_user_id,assignment_type,status').order('assigned_at',{ascending:false}).limit(200);
   if(!manager)q=q.eq('assignee_user_id',userId);
   const {data,error:e}=await q;if(e)throw e;const found=(data||[]) as Assignment[];
   if(!active)return;setRows(found);
   const ids=[...new Set(found.map(row=>row.resident_id))];
   if(ids.length){const {data:residents,error:re}=await supabase.from('Resident').select('id,name,house').in('id',ids);if(re)throw re;if(active)setNames(Object.fromEntries(((residents||[]) as ResidentLabel[]).map(row=>[String(row.id),row])))}
   else if(active)setNames({});
  }catch(e){if(active)setError(e instanceof Error?e.message:'Unable to load tasks')}
  finally{if(active)setLoading(false)}})();
  return()=>{active=false};
 },[userId,manager]);
 if(!userId)return null;
 const done=rows.filter(row=>complete(row.status)).length;
 return <section className="mdp-home-section" aria-labelledby="mdp-assignment-heading">
  <div className="mdp-home-section-heading"><h2 id="mdp-assignment-heading">{manager?'All staff assignments':'My Tasks'}</h2><p>{manager?'All accessible assigned work, including older assignments not linked to an account.':'Work assigned specifically to your login account.'}</p></div>
  {loading?<p role="status" className="mdp-home-house-loading">Loading tasks…</p>:error?<p role="alert" className="mdp-home-house-loading">{error}</p>:<>
   <div className="mdp-home-task-stats"><div><span>Assignments</span><strong>{rows.length}</strong></div><div><span>Completed</span><strong>{done}</strong></div><div><span>Remaining</span><strong>{rows.length-done}</strong></div>{manager&&<div><span>Linked accounts</span><strong>{rows.filter(row=>row.assignee_user_id).length}</strong></div>}</div>
   {rows.length?<div className="mdp-home-task-list">{rows.slice(0,10).map(row=><Link key={String(row.id)} prefetch={false} href={'/mdp/resident-profile/?id='+row.resident_id} className="mdp-home-task-row"><span className={complete(row.status)?'mdp-home-task-indicator is-done':'mdp-home-task-indicator'} aria-hidden="true">{complete(row.status)?'✓':'○'}</span><span className="mdp-home-task-info"><strong>{names[String(row.resident_id)]?.name||'Resident #'+row.resident_id}</strong><small>{row.assignment_type||'Assigned work'} · {names[String(row.resident_id)]?.house||'House not listed'}{manager?' · '+(row.assignee_name||'Unassigned'):''}</small></span><span className="mdp-home-task-state">{row.status||'Pending'}</span></Link>)}</div>:<p className="mdp-home-house-loading">{manager?'No assignment records.':'No assignments linked to your login yet. Ask Admin to link your assigned work.'}</p>}
   {manager&&<Link prefetch={false} href="/mdp/assignments/" className="mdp-home-tasks-manage">Manage assignments →</Link>}
   {rows.length===200&&<p className="text-xs text-body">Showing up to 200 assignments.</p>}
  </>}
 </section>;
}
