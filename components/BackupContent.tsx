'use client';
import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';

type TableConfig={key:string;label:string;table:string;description:string};
type AdminState='checking'|'allowed'|'denied';

const sections:TableConfig[]=[
 {key:'residents',label:'Residents',table:'Resident',description:'Read-only resident master data'},
 {key:'call-center',label:'Call Center',table:'call_center',description:'Call outcomes, vote intention and support'},
 {key:'door-to-door',label:'Door-to-Door',table:'door_to_door',description:'Field visit results'},
 {key:'assignments',label:'Assignments',table:'assignments',description:'Resident assignments by assignee'},
 {key:'assignment-links',label:'Assignment Links',table:'workflow_shares',description:'Private workflow share links'},
 {key:'election-day',label:'Election Day',table:'election_day',description:'Turnout records'},
 {key:'transportation',label:'Transportation',table:'transportation',description:'Transport requirements and progress'},
 {key:'remarks',label:'Remarks',table:'remarks',description:'Central operational remarks'},
 {key:'contact-verification',label:'Contact Verification',table:'contact_verification',description:'Pending and reviewed contact corrections'}
];

function safeName(value:string){return value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function stamp(){return new Date().toISOString().replace(/[:.]/g,'-')}
function download(name:string,content:string,type:string){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
function csvCell(value:unknown){if(value===null||value===undefined)return'';const text=typeof value==='object'?JSON.stringify(value):String(value);return /[",\n\r]/.test(text)?`"${text.replace(/"/g,'""')}"`:text}
function toCsv(rows:Record<string,unknown>[]){if(!rows.length)return'';const headers=[...new Set(rows.flatMap(row=>Object.keys(row)))];return [headers.map(csvCell).join(','),...rows.map(row=>headers.map(key=>csvCell(row[key])).join(','))].join('\r\n')}
async function readAll(table:string){const rows:Record<string,unknown>[]=[];const pageSize=1000;for(let from=0;;from+=pageSize){const {data,error}=await supabase.from(table).select('*').range(from,from+pageSize-1);if(error)throw new Error(error.message);rows.push(...((data||[]) as Record<string,unknown>[]));if((data||[]).length<pageSize)break}return rows}

export default function BackupContent(){
 const [admin,setAdmin]=useState<AdminState>('checking'),[email,setEmail]=useState(''),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{(async()=>{const {data,error}=await supabase.auth.getUser();if(error||!data.user){setAdmin('denied');return}const user=data.user;setEmail(user.email||'');const {data:role,error:roleError}=await supabase.from('user_roles').select('role,active').eq('user_id',user.id).maybeSingle();setAdmin(!roleError&&role?.active&&role.role==='admin'?'allowed':'denied')})()},[]);
 const sectionCount=useMemo(()=>sections.length,[]);
 async function exportCsv(section:TableConfig){setBusy(section.key);setError('');setMessage('');try{const rows=await readAll(section.table);download(`${safeName(section.label)}-${stamp()}.csv`,toCsv(rows),'text/csv;charset=utf-8');setMessage(`${section.label}: ${rows.length.toLocaleString()} rows exported.`)}catch(e){setError(`${section.label} export failed: ${e instanceof Error?e.message:'Unknown error'}`)}finally{setBusy('')}}
 async function fullBackup(){setBusy('all');setError('');setMessage('');try{const tables:Record<string,unknown[]>={},failures:Record<string,string>={};for(const section of sections){try{tables[section.table]=await readAll(section.table)}catch(e){failures[section.table]=e instanceof Error?e.message:'Unknown error'}}const payload={format:'CampaignOps Backup',version:1,created_at:new Date().toISOString(),created_by:email||null,table_count:Object.keys(tables).length,tables,failures};download(`campaignops-backup-${stamp()}.json`,JSON.stringify(payload,null,2),'application/json;charset=utf-8');setMessage(`Full JSON backup created with ${Object.keys(tables).length} tables${Object.keys(failures).length?` and ${Object.keys(failures).length} unavailable table(s)`:''}.`)}catch(e){setError(e instanceof Error?e.message:'Backup failed')}finally{setBusy('')}}
 if(admin==='checking')return <div className="panel"><div className="h-24 animate-pulse rounded-xl bg-primary-light"/></div>;
 if(admin==='denied')return <div className="space-y-4"><section className="page-hero"><p className="eyebrow">Admin control</p><h1 className="mt-2">Backup & Export</h1></section><div className="error-banner"><b>Admin access required.</b><p className="mt-1">Sign in with an account whose Supabase role is <code>admin</code>. CSV exports and full backups are not available to regular users.</p></div></div>;
 return <div className="space-y-4">
  <section className="page-hero"><p className="eyebrow">Admin control</p><h1 className="mt-2">Backup & Export</h1><p className="mt-2 text-sm text-body">Create a structured JSON backup of all operational tables or export an individual section as CSV.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><span className="status-chip status-success">Admin · {email||'Authenticated user'}</span><button className="btn-primary" disabled={Boolean(busy)} onClick={fullBackup}>{busy==='all'?'Preparing backup…':'Download full JSON backup'}</button></div></section>
  <section className="info-banner"><div><b>JSON is the primary backup format.</b><p className="mt-1">It preserves every field, data type, table name and nested value. CSV is provided for viewing and working with one section at a time.</p></div></section>
  {message&&<div className="info-banner">{message}</div>}{error&&<div className="error-banner">{error}</div>}
  <section className="panel"><div className="section-heading"><div><p className="eyebrow">Section exports</p><h2 className="mt-1">{sectionCount} CSV exports</h2></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{sections.map(section=><article key={section.key} className="soft-card"><div className="flex h-full flex-col"><div><h3>{section.label}</h3><p className="mt-2 text-sm text-body">{section.description}</p><p className="mt-2 text-xs text-body">Table: <code>{section.table}</code></p></div><button className="btn-secondary mt-5 w-full" disabled={Boolean(busy)} onClick={()=>exportCsv(section)}>{busy===section.key?'Exporting…':'Export CSV'}</button></div></article>)}</div></section>
 </div>
}
