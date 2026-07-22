'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {PartyLegend} from '../shared/PartyIdentity';
import AuthControl from '../components/AuthControl';
import PWAControl from '../components/PWAControl';

const pages:Record<string,{title:string;eyebrow:string}>= {
 '/':{title:'Operations Dashboard',eyebrow:'Campaign overview'},
 '/residents':{title:'Residents',eyebrow:'Read-only resident master'},
 '/resident-profile':{title:'Resident Profile',eyebrow:'Verified resident information'},
 '/call-center':{title:'Call Center',eyebrow:'Phone outreach results'},
 '/door-to-door':{title:'Door-to-Door',eyebrow:'Field visit results'},
 '/assignments':{title:'Assignments',eyebrow:'Field ownership'},
 '/remarks':{title:'Remarks',eyebrow:'Operational history'},
 '/election-day':{title:'Election Day',eyebrow:'Reach and turnout operations'},
 '/transportation':{title:'Transportation',eyebrow:'Election logistics'},
 '/contact-verification':{title:'Contact Verification',eyebrow:'Correction review queue'},
 '/reports':{title:'Reports',eyebrow:'Cross-section analytics'},
 '/backup':{title:'Backup & Export',eyebrow:'Admin control'}
};
function normalize(path:string){const clean=path.replace(/^\/Vote(?=\/|$)/i,'')||'/';return clean==='/'?'/':clean.replace(/\/$/,'')}
export default function Header(){
 const current=normalize(usePathname()),page=pages[current]||pages['/'];
 const mobile=[
  ['Dashboard','/'],['Residents','/residents/'],['Calls','/call-center/'],['Visits','/door-to-door/'],
  ['Assignments','/assignments/'],['Remarks','/remarks/'],['Election Day','/election-day/'],
  ['Transportation','/transportation/'],['Verification','/contact-verification/'],['Reports','/reports/'],['Backup','/backup/']
 ];
 return <><header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:min-h-20 lg:px-8"><div className="min-w-0"><p className="eyebrow truncate">{page.eyebrow}</p><h1 className="truncate text-lg sm:text-xl">{page.title}</h1></div><div className="flex shrink-0 items-center gap-2 sm:gap-3"><PWAControl/><div className="hidden xl:block"><PartyLegend/></div><AuthControl/></div></header><nav className="sticky top-16 z-20 flex gap-2 overflow-x-auto border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur lg:hidden" aria-label="Mobile navigation">{mobile.map(([label,href])=>{const target=href==='/'?'/':href.replace(/\/$/,'');const active=current===target;return <Link role="button" aria-current={active?'page':undefined} prefetch key={href} href={href} className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition ${active?'border-primary bg-primary !text-white shadow-sm':'border-border bg-white !text-navy hover:border-primary hover:bg-primary-soft hover:!text-primary'}`}>{label}</Link>})}</nav></>
}
