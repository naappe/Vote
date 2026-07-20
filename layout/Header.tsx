'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

const titles:Record<string,{title:string;eyebrow:string}>={
  '/':{title:'Operations Dashboard',eyebrow:'Villimalé Campaign'},
  '/voter-management':{title:'Voter Management',eyebrow:'Residents and field status'},
  '/voter-detail':{title:'Voter Detail',eyebrow:'Resident workspace'},
  '/call-center':{title:'Call Center',eyebrow:'Phone outreach'},
  '/door-to-door':{title:'Door-to-Door',eyebrow:'Field outreach'},
  '/election-day':{title:'Election Day',eyebrow:'Turnout operations'},
  '/reports':{title:'Reports',eyebrow:'Campaign analytics'},
  '/notifications':{title:'Notifications',eyebrow:'Items needing attention'},
  '/settings':{title:'Settings',eyebrow:'System configuration'}
};

export default function Header(){
  const pathname=usePathname();
  const page=titles[pathname]||titles['/'];
  return <>
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:min-h-20 lg:px-8">
      <div className="min-w-0">
        <p className="truncate text-[10px] font-extrabold uppercase tracking-[.2em] text-gold-600 sm:text-xs">{page.eyebrow}</p>
        <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">{page.title}</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <Link prefetch={false} href="/voter-management/" className="action hidden border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-gold-500 sm:inline-flex">Search voters</Link>
        <Link prefetch={false} href="/notifications/" aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-gold-500 hover:text-gold-600">
          <span aria-hidden="true">●</span><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold-500"/>
        </Link>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-calm-900 text-xs font-extrabold text-white shadow-soft">MM</div>
      </div>
    </header>
    <nav className="sticky top-16 z-20 flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden" aria-label="Mobile navigation">
      {[
        ['Dashboard','/'],['Voters','/voter-management/'],['Calls','/call-center/'],['Visits','/door-to-door/'],['Election','/election-day/'],['Reports','/reports/']
      ].map(([label,href])=><Link prefetch={false} key={href} href={href} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${pathname===href.replace(/\/$/,'')||pathname===href?'bg-calm-900 text-white':'text-slate-600 hover:bg-slate-100'}`}>{label}</Link>)}
    </nav>
  </>;
}