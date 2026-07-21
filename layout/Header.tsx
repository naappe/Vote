'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

const titles:Record<string,{title:string;eyebrow:string}>={
  '/':{title:'Operations Dashboard',eyebrow:'Villimalé Campaign'},
  '/voter-management':{title:'Voter Management',eyebrow:'Residents and field status'},
  '/voter-detail':{title:'Resident Profile',eyebrow:'Verified resident workspace'},
  '/call-center':{title:'Call Center',eyebrow:'Phone outreach'},
  '/door-to-door':{title:'Door-to-Door',eyebrow:'Field outreach'},
  '/election-day':{title:'Election Day',eyebrow:'Turnout operations'},
  '/admin-verification':{title:'Contact Verification',eyebrow:'Admin review queue'},
  '/reports':{title:'Reports',eyebrow:'Campaign analytics'},
  '/notifications':{title:'Notifications',eyebrow:'Items needing attention'},
  '/settings':{title:'Settings',eyebrow:'System configuration'}
};

function normalizePath(pathname:string){const withoutBase=pathname.replace(/^\/Vote(?=\/|$)/i,'')||'/';return withoutBase==='/'?'/':withoutBase.replace(/\/$/,'')}

export default function Header(){
  const pathname=usePathname();const current=normalizePath(pathname);const page=titles[current]||titles['/'];
  return <>
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:min-h-20 lg:px-8">
      <div className="min-w-0"><p className="eyebrow truncate">{page.eyebrow}</p><h1 className="truncate text-lg sm:text-xl">{page.title}</h1></div>
      <div className="flex items-center gap-2 sm:gap-3">
        <Link prefetch={false} href="/voter-management/" className="btn-secondary hidden sm:inline-flex">Search voters</Link>
        <Link prefetch={false} href="/notifications/" aria-label="Notifications" className="relative grid h-11 w-11 place-items-center rounded-pill border border-border bg-card text-body shadow-card transition hover:border-primary hover:bg-primary-light hover:text-primary"><span aria-hidden="true">●</span><span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-accent"/></Link>
        <div className="grid h-11 w-11 place-items-center rounded-pill bg-navy text-xs font-extrabold text-white shadow-card">MM</div>
      </div>
    </header>
    <nav className="sticky top-16 z-20 flex gap-2 overflow-x-auto border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur lg:hidden" aria-label="Mobile navigation">
      {[
        ['Dashboard','/'],['Voters','/voter-management/'],['Calls','/call-center/'],['Visits','/door-to-door/'],['Verify','/admin-verification/'],['Reports','/reports/']
      ].map(([label,href])=>{const target=href==='/'?'/':href.replace(/\/$/,'');return <Link prefetch={false} key={href} href={href} className={`shrink-0 rounded-pill px-4 py-2 text-xs font-semibold transition ${current===target?'bg-primary text-white shadow-card':'bg-primary-light text-body hover:text-primary'}`}>{label}</Link>})}
    </nav>
  </>;
}
