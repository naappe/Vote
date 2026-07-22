'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';

function NavGlyph({name}:{name:string}){
 const common={viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
 const paths:Record<string,React.ReactNode>={
  dashboard:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  residents:<><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20"/><circle cx="9.5" cy="7" r="3.2"/><path d="M17 11a3 3 0 0 0 0-6M21 20v-1.5a4 4 0 0 0-2.5-3.7"/></>,
  calls:<><path d="M6.6 3.8 4.8 5.6c-1.1 1.1 1.4 6.5 5.7 10.8s9.7 6.8 10.8 5.7l1.8-1.8-4.2-4.2-2.3 2.3a14.8 14.8 0 0 1-5-5l2.3-2.3z"/></>,
  visits:<><path d="m3 11 9-7 9 7"/><path d="M5.5 10.5V20h13v-9.5M9 20v-5h6v5"/></>,
  assignments:<><><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5h6v3H9zM9 12h6M9 16h4"/></>,
  remarks:<><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.4 8.4 0 0 1-3.2-.7L4 20l1.5-4.1A7.1 7.1 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></>,
  election:<><path d="M4 6h16v14H4z"/><path d="M8 3h8v3H8zM8 11l2 2 4-4M8 17h8"/></>,
  transport:<><path d="M5 16 6.5 9h11L19 16"/><path d="M3 16h18v3H3z"/><circle cx="7" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></>,
  verify:<><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
  reports:<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  users:<><circle cx="9" cy="8" r="3"/><path d="M3 20v-1.5a4.5 4.5 0 0 1 4.5-4.5h3A4.5 4.5 0 0 1 15 18.5V20M17 8h4M19 6v4"/></>,
  backup:<><path d="M5 8h14v13H5z"/><path d="M8 4h8v4H8zM9 15h6M12 12v6"/></>
 };
 return <svg {...common} aria-hidden="true">{paths[name]||paths.dashboard}</svg>
}
const groups=[
 {label:'Core',items:[
  {label:'Dashboard',href:'/',icon:'dashboard'},
  {label:'Residents',href:'/residents/',icon:'residents'},
 ]},
 {label:'Field Operations',items:[
  {label:'Call Center',href:'/call-center/',icon:'calls'},
  {label:'Door-to-Door',href:'/door-to-door/',icon:'visits'},
  {label:'Assignments',href:'/assignments/',icon:'assignments'},
  {label:'Remarks',href:'/remarks/',icon:'remarks'},
 ]},
 {label:'Election Operations',items:[
  {label:'Election Day',href:'/election-day/',icon:'election'},
  {label:'Transportation',href:'/transportation/',icon:'transport'},
 ]},
 {label:'Control',items:[
  {label:'Contact Verification',href:'/contact-verification/',icon:'verify'},
  {label:'Reports',href:'/reports/',icon:'reports'},
  {label:'User Management',href:'/users/',icon:'users'},
  {label:'Admin Backup',href:'/backup/',icon:'backup'},
 ]},
];

export default function Sidebar(){
 const pathname=usePathname(),[isAdmin,setIsAdmin]=useState(false);
 useEffect(()=>{let active=true;supabase.functions.invoke('manage-users',{body:{action:'admin_status'}}).then(({data,error})=>{if(active&&!error&&data?.is_admin)setIsAdmin(true)}).catch(()=>{});return()=>{active=false}},[]);
 const normalized=(value:string)=>value==='/'?'/':value.replace(/\/$/,'');
 return <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col border-r border-border bg-card lg:flex">
  <div className="border-b border-border px-6 py-6"><div className="flex items-center gap-3"><div className="brand-mark">VM</div><div><strong className="block text-base text-navy">Vote Operations</strong><span className="text-[11px] font-semibold uppercase tracking-[.14em] text-body">Villimalé 2026</span></div></div></div>
  <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-6">{groups.map(group=><section key={group.label}><p className="nav-group-label">{group.label}</p><div className="mt-2 space-y-1">{group.items.filter(item=>item.href!=='/users/'||isAdmin).map(item=>{const active=normalized(pathname)===normalized(item.href);return <Link prefetch key={item.href} href={item.href} aria-current={active?'page':undefined} className={`nav-item ${active?'nav-item-active':''}`}><span className="nav-icon" aria-hidden="true"><NavGlyph name={item.icon}/></span><span className="truncate">{item.label}</span></Link>})}</div></section>)}</nav>
 </aside>
}
