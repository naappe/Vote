'use client';
import {useEffect,useMemo,useState} from 'react';
import {getResidentsPage,supabase} from '../lib/supabase';
import {appendGeneralRemark,latestGeneralRemarks} from '../lib/resident-remarks';
import type {Resident} from '../lib/types';
import {PartyFilter,ResidentIdentity,matchesParty} from '../shared/ResidentIdentity';
import TaskState from '../shared/TaskState';

type Remark={id:number|string;resident_id:number|string;section:string;remark:string;recorded_by?:string|null;recorded_at?:string|null};
const sources=['general','call-center','door-to-door','candidate-meeting','election-day','transportation'];
const sourceLabels:Record<string,string>={'general':'General','call-center':'Call Center','door-to-door':'Door-to-Door','candidate-meeting':'Candidate Meeting','election-day':'Election Day','transportation':'Transportation'};
const sourceLabel=(value?:string|null)=>sourceLabels[value||'general']||String(value||'general').replaceAll('-',' ').replace(/^./,x=>x.toUpperCase());
const normalizeResident=(row:any):Resident=>({...row,phone:row.phone==null?null:String(row.phone)} as Resident);

export default function RemarksContent({partyControls=true}:{partyControls?:boolean}){
 const [residents,setResidents]=useState<Resident[]>([]),[searchRows,setSearchRows]=useState<Resident[]>([]),[items,setItems]=useState<Remark[]>([]),[query,setQuery]=useState(''),[party,setParty]=useState('all'),[selected,setSelected]=useState(''),[section,setSection]=useState('general'),[sourceFilter,setSourceFilter]=useState('all'),[remark,setRemark]=useState(''),[recordedBy,setRecordedBy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[searching,setSearching]=useState(false),[saving,setSaving]=useState(false);
 const [editingId,setEditingId]=useState<string|null>(null),[editingRemark,setEditingRemark]=useState(''),[editingSection,setEditingSection]=useState('general'),[savingEdit,setSavingEdit]=useState(false);
 const [canManage,setCanManage]=useState(false),[isAdmin,setIsAdmin]=useState(false),[currentEmail,setCurrentEmail]=useState('');
 async function load(){try{const [{data:{user},error:userError},response]=await Promise.all([supabase.auth.getUser(),supabase.from('remarks').select('*').eq('section','general').order('recorded_at',{ascending:false}).limit(300)]);if(userError)throw userError;if(response.error)throw response.error;if(user){setCurrentEmail(user.email||'');const {data:membership,error:roleError}=await supabase.from('user_roles').select('role,active').eq('user_id',user.id).maybeSingle();if(roleError)throw roleError;setIsAdmin(Boolean(membership?.active&&membership.role==='admin'));setCanManage(Boolean(membership?.active&&['admin','supervisor'].includes(membership.role)))}const nextItems=(response.data||[]) as Remark[];setItems(nextItems);const ids=[...new Set(nextItems.map(item=>Number(item.resident_id)).filter(Number.isFinite))];const rows:Resident[]=[];for(let start=0;start<ids.length;start+=500){const residentResponse=await supabase.from('Resident').select('*').in('id',ids.slice(start,start+500));if(residentResponse.error)throw residentResponse.error;rows.push(...(residentResponse.data||[]).map(normalizeResident))}setResidents(rows)}catch(e){setError(e instanceof Error?e.message:'Unable to load remarks')}}
 useEffect(()=>{load()},[]);
 useEffect(()=>{const term=query.trim();if(selected||term.length<2){setSearchRows([]);setSearching(false);return}let active=true;setSearching(true);const timer=setTimeout(()=>getResidentsPage({page:1,pageSize:20,search:term,party:partyControls?party:'MDP'}).then(result=>{if(active)setSearchRows(result.rows)}).catch(e=>active&&setError(e instanceof Error?e.message:'Resident search failed')).finally(()=>active&&setSearching(false)),250);return()=>{active=false;clearTimeout(timer)}},[query,party,selected,partyControls]);
 useEffect(()=>{const params=new URLSearchParams(window.location.search),residentId=params.get('resident'),requestedSection=params.get('section');if(requestedSection&&sources.includes(requestedSection)){setSection(requestedSection);setSourceFilter(requestedSection)}if(!residentId)return;setSelected(residentId);let active=true;void(async()=>{try{const [person,notes]=await Promise.all([supabase.from('Resident').select('*').eq('id',Number(residentId)).maybeSingle(),supabase.from('remarks').select('*').eq('resident_id',Number(residentId)).eq('section','general').order('recorded_at',{ascending:false}).limit(500)]);if(!active)return;if(person.error)throw person.error;if(notes.error)throw notes.error;if(person.data){const row=normalizeResident(person.data);setResidents(current=>current.some(x=>String(x.id)===residentId)?current:[row,...current]);setQuery(row.name||`Resident ${residentId}`)}setItems(current=>{const byId=new Map(current.map(item=>[String(item.id),item]));for(const item of (notes.data||[]) as Remark[])byId.set(String(item.id),item);return [...byId.values()].sort((x,y)=>String(y.recorded_at||'').localeCompare(String(x.recorded_at||'')))});}catch(e){if(active)setError(e instanceof Error?e.message:'Could not load resident remarks')}})();return()=>{active=false}},[]);
 const allResidents=useMemo(()=>{const map=new Map<string,Resident>();[...residents,...searchRows].forEach(r=>map.set(String(r.id),r));return [...map.values()]},[residents,searchRows]);
 const map=useMemo(()=>new Map(allResidents.map(r=>[String(r.id),r])),[allResidents]);
 const matches=useMemo(()=>searchRows.filter(r=>matchesParty(r,partyControls?party:'MDP')),[searchRows,party,partyControls]);
 const visibleItems=useMemo(()=>items.filter(item=>{const resident=map.get(String(item.resident_id));const partyMatch=resident?matchesParty(resident,partyControls?party:'MDP'):partyControls&&party==='all';const sourceMatch=sourceFilter==='all'||(item.section||'general')===sourceFilter;const text=[resident?.id,resident?.name,resident?.national_id,resident?.phone,resident?.house,item.remark,item.recorded_by,sourceLabel(item.section)].join(' ').toLowerCase();return partyMatch&&sourceMatch&&(!query.trim()||selected||text.includes(query.trim().toLowerCase()))}).filter((item,index,filtered)=>latestGeneralRemarks(filtered).some(latest=>String(latest.id)===String(item.id))),[items,map,party,partyControls,sourceFilter,query,selected]);
 async function save(){
  if(!selected||!remark.trim()){setError('Select a resident and enter a remark.');return}
  setSaving(true);setError('');setMessage('');
  try{
   const saved=await appendGeneralRemark(selected,remark);
   setItems(current=>[saved,...current]);
   setRemark('');
   setMessage('Latest remark saved. Previous versions remain preserved.');
  }catch(e){setError(e instanceof Error?e.message:'Could not save remark')}finally{setSaving(false)}
 }
 function beginEdit(item:Remark){setEditingId(String(item.id));setEditingRemark(item.remark);setEditingSection('general');setError('');setMessage('')}
 function cancelEdit(){setEditingId(null);setEditingRemark('');setEditingSection('general')}
 async function updateRemark(item:Remark){
  if(!editingRemark.trim()){setError('Remark cannot be empty.');return}
  setSavingEdit(true);setError('');setMessage('');
  try{
   const own=Boolean(currentEmail&&item.recorded_by?.trim().toLowerCase()===currentEmail.trim().toLowerCase());
   if(!own&&!isAdmin)throw new Error('You cannot revise this note.');
   const saved=await appendGeneralRemark(item.resident_id,editingRemark);
   setItems(current=>[saved,...current]);
   cancelEdit();
   setMessage('Latest remark revised; previous version preserved.');
  }catch(e){setError(e instanceof Error?e.message:'Could not revise remark')}finally{setSavingEdit(false)}
 }

 return <div className="space-y-4">
  <section className="page-hero"><p className="eyebrow">Resident task</p><h1 className="mt-2">Remarks</h1>{partyControls&&<div className="mt-4"><PartyFilter value={party} onChange={value=>{setParty(value);setSelected('')}}/></div>}</section>
  <section className="panel"><div className="grid gap-3"><label className="relative block"><span className="field-label">Find resident</span><input className="field w-full min-w-0" aria-label="Search resident or remark" value={query} onChange={e=>{setQuery(e.target.value);setSelected('')}} placeholder="Name, ID, house or phone"/>{query&&!selected&&<div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-card">{searching?<div className="p-3 text-sm text-body">Searching residents…</div>:matches.map(r=><button type="button" key={String(r.id)} className="block w-full border-b border-border p-3 text-left hover:bg-primary-light" onClick={()=>{setSelected(String(r.id));setQuery(r.name||String(r.id));setResidents(current=>current.some(x=>String(x.id)===String(r.id))?current:[r,...current])}}><ResidentIdentity resident={r} compact showParty={partyControls}/></button>)}</div>}</label><label className="block"><span className="field-label">Remark</span><textarea aria-label="Remark" className="field mt-1 min-h-28 py-3" value={remark} onChange={e=>setRemark(e.target.value)} placeholder="Write a short, factual note"/></label></div><div className="mt-3 flex justify-end"><button className="btn-primary w-full sm:w-auto" disabled={saving} onClick={()=>void save()}>{saving?'Saving…':'Save remark'}</button></div>{message&&<p className="mt-3 text-sm font-semibold text-primary" role="status">{message}</p>}{error&&<div className="error-banner mt-3" role="alert">{error}</div>}</section>
  <section className="panel"><p className="eyebrow">Resident notes</p><h2 className="mt-1">Written remarks</h2></section>
  <section className="panel overflow-hidden p-0"><div className="divide-y divide-border">{visibleItems.map(item=>{const resident=map.get(String(item.resident_id)),editing=editingId===String(item.id);return <article key={String(item.id)} className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div>{resident?<ResidentIdentity resident={resident} showParty={partyControls}/>:<b>Resident {item.resident_id}</b>}</div>{canManage&&!editing&&(isAdmin||item.recorded_by?.trim().toLowerCase()===currentEmail.trim().toLowerCase())&&<div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={()=>beginEdit(item)}>Edit</button></div>}</div>{editing?<div className="mt-4 rounded-xl border border-primary/30 bg-primary-soft p-4"><textarea aria-label="Edit remark" className="field mt-3 min-h-28 py-3" value={editingRemark} onChange={e=>setEditingRemark(e.target.value)} autoFocus/><div className="mt-3 flex flex-wrap justify-end gap-2"><button className="btn-secondary" onClick={cancelEdit}>Cancel</button><button className="btn-primary" disabled={savingEdit} onClick={()=>updateRemark(item)}>{savingEdit?'Saving…':'Save changes'}</button></div></div>:<><div className="mt-3 max-w-sm"><TaskState label="Remark" status={`Saved · ${sourceLabel(item.section)}`} icon="remark" complete/></div><p className="mt-3 whitespace-pre-wrap text-sm text-body">{item.remark}</p><p className="mt-2 text-xs text-body">Recorded by {item.recorded_by||'Unknown recorder'} · {item.recorded_at?new Date(item.recorded_at).toLocaleString():'—'}</p></>}</article>})}{!visibleItems.length&&<div className="empty-state m-4">No remarks found for this source or filter.</div>}</div></section>
 </div>
}
