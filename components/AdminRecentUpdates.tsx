'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import {useStaffAccess} from './AuthGate';

type UpdateRow={id:number|string;resident_id:number|string;section:string;recorded_at:string|null;recorded_by:string|null};
const labels:Record<string,string>={'call-center':'Phone call','door-to-door':'House visit','in-person-meeting':'Meeting','voting-intention':'Voting plan',general:'Remark'};

export default function AdminRecentUpdates(){
 const access=useStaffAccess();
 const admin=access?.role==='admin';
 const [recent,setRecent]=useState<UpdateRow[]>([]);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  if(!admin){setLoading(false);return}
  let active=true;
  void supabase.from('remarks').select('id,resident_id,section,recorded_at,recorded_by').order('recorded_at',{ascending:false}).limit(20).then(({data,error})=>{
   if(!active)return;
   if(error)setError('Could not load recent updates.');
   else setRecent((data||[]) as UpdateRow[]);
   setLoading(false);
  });
  return()=>{active=false};
 },[admin]);
 if(!admin)return null;
 return <section className="panel">
  <div className="section-heading"><div><h2>Recent updates from all users</h2><p className="mt-1 text-sm text-body">Most recent saved results, newest first. Select a record to view its resident.</p></div></div>
  {loading?<p>Loading recent updates…</p>:error?<p role="alert">{error}</p>:recent.length?
   <div className="grid gap-2 md:grid-cols-2">{recent.map(row=><Link key={String(row.id)} prefetch={false} href={'/resident-profile/?id='+encodeURIComponent(String(row.resident_id))} className="dashboard-work-link"><span><b className="block text-navy">{labels[row.section]||'Resident update'} · Resident #{row.resident_id}</b><small>{row.recorded_by||'Unknown user'} · {row.recorded_at?new Date(row.recorded_at).toLocaleString():'Time unavailable'}</small></span><span className="font-semibold text-primary">View →</span></Link>)}</div>:
   <p className="text-sm text-body">No recent updates found.</p>}
 </section>;
}
