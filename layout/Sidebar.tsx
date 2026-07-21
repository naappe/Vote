'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

const groups=[
  {label:'Operations',items:[
    {label:'Dashboard',href:'/',icon:'⌂'},
    {label:'Voter Management',href:'/voter-management/',count:'3.2k',icon:'◎'},
    {label:'Voter Detail',href:'/voter-detail/',icon:'◉'},
  ]},
  {label:'Outreach',items:[
    {label:'Call Center',href:'/call-center/',icon:'☎'},
    {label:'Door-to-Door',href:'/door-to-door/',icon:'◇'},
    {label:'Election Day',href:'/election-day/',icon:'✓'},
  ]},
  {label:'Analytics',items:[{label:'Reports',href:'/reports/',icon:'▥'}]},
];

export default function Sidebar(){
  const pathname=usePathname();
  const normalized=(value:string)=>value==='/'?'/':value.replace(/\/$/,'');
  return <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-white text-[#051C33] shadow-[8px_0_32px_rgba(5,28,51,0.04)] lg:flex">
    <div className="border-b border-slate-200/80 px-5 py-6">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0066FF] text-sm font-black text-white shadow-[0_8px_20px_rgba(0,102,255,0.22)]">CO</div>
        <div className="min-w-0"><strong className="block text-base font-extrabold tracking-tight">CampaignOps</strong><span className="block truncate text-[11px] font-semibold uppercase tracking-[.16em] text-[#4F5E71]">Villimalé Campaign</span></div>
      </div>
      <div className="mt-5 rounded-2xl bg-[#EBF4FF] p-4">
        <div className="flex items-center justify-between text-xs"><span className="font-semibold text-[#4F5E71]">Campaign status</span><span className="rounded-full bg-[#00D084]/15 px-2.5 py-1 font-bold text-[#008E5B]">Live</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full w-[25%] rounded-full bg-[#0066FF]"/></div>
        <p className="mt-2 text-[11px] text-[#4F5E71]">429 vote target · operations active</p>
      </div>
    </div>
    <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
      {groups.map(group=><section key={group.label}>
        <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[.2em] text-slate-400">{group.label}</p>
        <div className="space-y-1">{group.items.map(item=>{
          const active=normalized(pathname)===normalized(item.href);
          return <Link prefetch={false} key={item.href} href={item.href} className={`group flex min-h-11 items-center gap-3 rounded-full px-3.5 text-sm font-semibold transition ${active?'bg-[#0066FF] text-white shadow-[0_8px_20px_rgba(0,102,255,0.20)]':'text-[#4F5E71] hover:bg-[#EBF4FF] hover:text-[#0066FF]'}`}>
            <span className={`grid h-7 w-7 place-items-center rounded-full text-sm ${active?'bg-white/15':'bg-[#EBF4FF] text-[#0066FF] group-hover:bg-white'}`} aria-hidden="true">{item.icon}</span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.count&&<span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${active?'bg-white/15':'bg-slate-100 text-[#4F5E71]'}`}>{item.count}</span>}
          </Link>;
        })}</div>
      </section>)}
    </nav>
    <div className="space-y-1 border-t border-slate-200/80 p-4">
      <Link prefetch={false} href="/notifications/" className="flex min-h-11 items-center rounded-full px-3.5 text-sm font-semibold text-[#4F5E71] transition hover:bg-[#EBF4FF] hover:text-[#0066FF]">Notifications</Link>
      <Link prefetch={false} href="/settings/" className="flex min-h-11 items-center rounded-full px-3.5 text-sm font-semibold text-[#4F5E71] transition hover:bg-[#EBF4FF] hover:text-[#0066FF]">Settings</Link>
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#F8FBFF] p-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#0066FF] text-xs font-black text-white">MM</div><div><p className="text-xs font-bold">Campaign Admin</p><p className="text-[10px] text-[#4F5E71]">Operations access</p></div></div>
    </div>
  </aside>;
}
