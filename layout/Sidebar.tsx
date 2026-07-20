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
  return <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-calm-900 text-white lg:flex">
    <div className="border-b border-white/10 px-5 py-6">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gold-500 text-sm font-black text-calm-900 shadow-lg shadow-black/20">CO</div>
        <div className="min-w-0"><strong className="block text-base font-extrabold tracking-tight">CampaignOps</strong><span className="block truncate text-[11px] font-semibold uppercase tracking-[.16em] text-slate-400">Villimalé Campaign</span></div>
      </div>
      <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-300">Campaign status</span><span className="rounded-full bg-emerald-500/15 px-2 py-1 font-bold text-emerald-300">Live</span></div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[25%] rounded-full bg-gold-500"/></div>
        <p className="mt-2 text-[11px] text-slate-400">429 vote target · operations active</p>
      </div>
    </div>
    <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
      {groups.map(group=><section key={group.label}>
        <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[.2em] text-slate-500">{group.label}</p>
        <div className="space-y-1">{group.items.map(item=>{
          const active=normalized(pathname)===normalized(item.href);
          return <Link prefetch={false} key={item.href} href={item.href} className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${active?'bg-gold-500 text-calm-900 shadow-lg shadow-black/15':'text-slate-300 hover:bg-white/7 hover:text-white'}`}>
            <span className={`grid h-7 w-7 place-items-center rounded-lg text-sm ${active?'bg-black/10':'bg-white/5 text-gold-400 group-hover:bg-white/10'}`} aria-hidden="true">{item.icon}</span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.count&&<span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${active?'bg-black/10':'bg-white/8 text-slate-300'}`}>{item.count}</span>}
          </Link>;
        })}</div>
      </section>)}
    </nav>
    <div className="space-y-1 border-t border-white/10 p-4">
      <Link prefetch={false} href="/notifications/" className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-slate-300 transition hover:bg-white/7 hover:text-white">Notifications</Link>
      <Link prefetch={false} href="/settings/" className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-slate-300 transition hover:bg-white/7 hover:text-white">Settings</Link>
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 p-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-xs font-black">MM</div><div><p className="text-xs font-bold">Campaign Admin</p><p className="text-[10px] text-slate-500">Operations access</p></div></div>
    </div>
  </aside>;
}