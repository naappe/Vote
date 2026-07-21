'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';

const groups=[
 {label:'Core',items:[
  {label:'Dashboard',href:'/',icon:'D'},
  {label:'Residents',href:'/residents/',icon:'R'},
 ]},
 {label:'Field Operations',items:[
  {label:'Call Center',href:'/call-center/',icon:'C'},
  {label:'Door-to-Door',href:'/door-to-door/',icon:'V'},
  {label:'Assignments',href:'/assignments/',icon:'A'},
  {label:'Remarks',href:'/remarks/',icon:'N'},
 ]},
 {label:'Election Operations',items:[
  {label:'Election Day',href:'/election-day/',icon:'E'},
  {label:'Transportation',href:'/transportation/',icon:'T'},
 ]},
 {label:'Control',items:[
  {label:'Contact Verification',href:'/contact-verification/',icon:'Q'},
  {label:'Reports',href:'/reports/',icon:'P'},
  {label:'Admin Backup',href:'/backup/',icon:'B'},
 ]},
];

export default function Sidebar(){
 const pathname=usePathname();
 const normalized=(value:string)=>value==='/'?'/':value.replace(/\/$/,'');
 return <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col border-r border-border bg-card lg:flex">
  <div className="border-b border-border px-6 py-6"><div className="flex items-center gap-3"><div className="brand-mark">VO</div><div><strong className="block text-base text-navy">Vote Operations</strong><span className="text-[11px] font-semibold uppercase tracking-[.14em] text-body">Villimalé 2026</span></div></div></div>
  <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-6">{groups.map(group=><section key={group.label}><p className="nav-group-label">{group.label}</p><div className="mt-2 space-y-1">{group.items.map(item=>{const active=normalized(pathname)===normalized(item.href);return <Link prefetch key={item.href} href={item.href} aria-current={active?'page':undefined} className={`nav-item ${active?'nav-item-active':''}`}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span className="truncate">{item.label}</span></Link>})}</div></section>)}</nav>
 </aside>
}
