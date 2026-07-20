'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

const groups=[
  {label:'Operations',items:[
    {label:'Dashboard',href:'/'},
    {label:'Voter Management',href:'/voter-management',count:'1.1k'},
    {label:'Voter Detail',href:'/voter-detail'},
  ]},
  {label:'Outreach',items:[
    {label:'Call Center',href:'/call-center',count:'892'},
    {label:'Door-to-Door',href:'/door-to-door'},
    {label:'Election Day',href:'/election-day'},
  ]},
  {label:'Analytics',items:[{label:'Reports',href:'/reports'}]},
];

export default function Sidebar(){
  const pathname=usePathname();
  return <aside className="hidden min-h-screen w-72 shrink-0 border-r border-slate-200/80 bg-white px-5 py-6 lg:flex lg:flex-col">
    <div className="mb-8 flex items-center gap-3 px-2">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-calm-700 text-sm font-black text-white shadow-soft">CO</div>
      <div><strong className="block text-base text-slate-900">CampaignOps</strong><span className="text-xs text-slate-500">Villimalé Campaign</span></div>
    </div>
    <nav className="flex-1 space-y-7">
      {groups.map(group=><section key={group.label}>
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">{group.label}</p>
        <div className="space-y-1">{group.items.map(item=>{
          const active=pathname===item.href;
          return <Link key={item.href} href={item.href} className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold transition ${active?'bg-calm-100 text-calm-800 shadow-sm':'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            <span>{item.label}</span>{item.count&&<span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">{item.count}</span>}
          </Link>
        })}</div>
      </section>)}
    </nav>
    <div className="space-y-1 border-t border-slate-100 pt-4">
      <Link href="/notifications" className="block rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Notifications</Link>
      <Link href="/settings" className="block rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Settings</Link>
    </div>
  </aside>;
}