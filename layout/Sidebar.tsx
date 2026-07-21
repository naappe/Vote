'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

const groups=[
  {label:'Operations',items:[
    {label:'Dashboard',href:'/',icon:'⌂'},
    {label:'Residents',href:'/voter-management/',count:'3.2k',icon:'◎'},
  ]},
  {label:'Outreach',items:[
    {label:'Call Center',href:'/call-center/',icon:'☎'},
    {label:'Door-to-Door',href:'/door-to-door/',icon:'◇'},
    {label:'Election Day',href:'/election-day/',icon:'✓'},
  ]},
  {label:'Administration',items:[
    {label:'Contact Verification',href:'/admin-verification/',icon:'✓'},
    {label:'Reports',href:'/reports/',icon:'▥'}
  ]},
];

export default function Sidebar(){
  const pathname=usePathname();
  const normalized=(value:string)=>value==='/'?'/':value.replace(/\/$/,'');
  return <aside className="sticky top-0 hidden h-screen w-[300px] shrink-0 flex-col overflow-hidden border-r border-border bg-card text-navy shadow-card lg:flex">
    <div className="border-b border-border px-5 py-5">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-primary text-sm font-black text-white shadow-card">CO</div>
        <div className="min-w-0"><strong className="block text-base font-extrabold tracking-tight">CampaignOps</strong><span className="block truncate text-[11px] font-semibold uppercase tracking-[.16em] text-body">Villimalé Campaign</span></div>
      </div>
      <div className="mt-4 rounded-card bg-primary-light p-4">
        <div className="flex items-center justify-between text-xs"><span className="font-semibold text-body">Campaign status</span><span className="status-chip bg-accent/15 text-accent">Live</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-pill bg-white"><div className="h-full w-[25%] rounded-pill bg-primary"/></div>
        <p className="mt-2 text-[11px] text-body">429 vote target · operations active</p>
      </div>
    </div>
    <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
      {groups.map(group=><section key={group.label}>
        <p className="eyebrow mb-2 px-3">{group.label}</p>
        <div className="space-y-1">{group.items.map(item=>{
          const active=normalized(pathname)===normalized(item.href);
          return <Link prefetch={false} key={item.href} href={item.href} className={`group flex min-h-11 items-center gap-3 rounded-pill px-3.5 text-sm font-semibold transition ${active?'bg-primary text-white shadow-card':'text-body hover:bg-primary-light hover:text-primary'}`}>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-pill text-sm ${active?'bg-white/15':'bg-primary-light text-primary group-hover:bg-white'}`} aria-hidden="true">{item.icon}</span>
            <span className="min-w-0 flex-1 whitespace-nowrap">{item.label}</span>
            {item.count&&<span className={`rounded-pill px-2 py-0.5 text-[10px] font-extrabold ${active?'bg-white/15':'bg-primary-light text-body'}`}>{item.count}</span>}
          </Link>;
        })}</div>
      </section>)}
    </nav>
    <div className="space-y-1 border-t border-border p-4">
      <Link prefetch={false} href="/notifications/" className="flex min-h-10 items-center rounded-pill px-3.5 text-sm font-semibold text-body transition hover:bg-primary-light hover:text-primary">Notifications</Link>
      <Link prefetch={false} href="/settings/" className="flex min-h-10 items-center rounded-pill px-3.5 text-sm font-semibold text-body transition hover:bg-primary-light hover:text-primary">Settings</Link>
      <div className="mt-2 flex items-center gap-3 rounded-card bg-primary-light p-3"><div className="grid h-9 w-9 place-items-center rounded-pill bg-primary text-xs font-black text-white">MM</div><div><p className="text-xs font-bold text-navy">Campaign Admin</p><p className="text-[10px] text-body">Operations access</p></div></div>
    </div>
  </aside>;
}