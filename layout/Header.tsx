'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {PartyLegend} from '../shared/PartyIdentity';

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
 '/reports':{title:'Reports',eyebrow:'Cross-section analytics'}
};
function normalize(path:string){const clean=path.replace(/^\/Vote(?=\/|$)/i,'')||'/';return clean==='/'?'/':clean.replace(/\/$/,'')}
export default function Header(){
 const current=normalize(usePathname()),page=pages[current]||pages['/'];
 const mobile=[
  ['Dashboard','/'],['Residents','/residents/'],['Calls','/call-center/'],['Visits','/door-to-door/'],
  ['Assignments','/assignments/'],['Remarks','/remarks/'],['Election Day','/election-day/'],
  ['Transportation','/transportation/'],['Verification','/contact-verification/'],['Reports','/reports/']
 ];
 return <><header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:min-h-20 lg:px-8"><div className="min-w-0"><p className="eyebrow truncate">{page.eyebrow}</p><h1 className="truncate text-lg sm:text-xl">{page.title}</h1></div><div className="hidden xl:block"><PartyLegend/></div></header><nav className="sticky top-16 z-20 flex gap-2 overflow-x-auto border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur lg:hidden">{mobile.map(([label,href])=>{const target=href==='/'?'/':href.replace(/\/$/,'');return <Link prefetch={false} key={href} href={href} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${current===target?'border-primary bg-primary text-white':'border-border bg-white text-navy'}`}>{label}</Link>})}</nav></>
}