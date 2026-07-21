'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {PartyLegend} from '../shared/PartyIdentity';

const pages:Record<string,{title:string;eyebrow:string;dot:string;active:string}>= {
 '/':{title:'Operations Dashboard',eyebrow:'Campaign overview',dot:'bg-blue-500',active:'bg-blue-600'},
 '/residents':{title:'Residents',eyebrow:'Read-only resident master',dot:'bg-blue-500',active:'bg-blue-600'},
 '/resident-profile':{title:'Resident Profile',eyebrow:'Verified resident information',dot:'bg-blue-500',active:'bg-blue-600'},
 '/call-center':{title:'Call Center',eyebrow:'Phone outreach results',dot:'bg-violet-500',active:'bg-violet-600'},
 '/door-to-door':{title:'Door-to-Door',eyebrow:'Field visit results',dot:'bg-emerald-500',active:'bg-emerald-600'},
 '/assignments':{title:'Assignments',eyebrow:'Field ownership',dot:'bg-indigo-500',active:'bg-indigo-600'},
 '/remarks':{title:'Remarks',eyebrow:'Operational history',dot:'bg-amber-500',active:'bg-amber-600'},
 '/election-day':{title:'Election Day',eyebrow:'Reach and turnout operations',dot:'bg-rose-500',active:'bg-rose-600'},
 '/transportation':{title:'Transportation',eyebrow:'Election logistics',dot:'bg-orange-500',active:'bg-orange-600'},
 '/contact-verification':{title:'Contact Verification',eyebrow:'Correction review queue',dot:'bg-cyan-500',active:'bg-cyan-600'},
 '/reports':{title:'Reports',eyebrow:'Cross-section analytics',dot:'bg-slate-700',active:'bg-slate-800'}
};
function normalize(path:string){const clean=path.replace(/^\/Vote(?=\/|$)/i,'')||'/';return clean==='/'?'/':clean.replace(/\/$/,'')}
export default function Header(){
 const current=normalize(usePathname()),page=pages[current]||pages['/'];
 const mobile=[['Dashboard','/'],['Residents','/residents/'],['Calls','/call-center/'],['Visits','/door-to-door/'],['Assign','/assignments/'],['Election','/election-day/'],['Transport','/transportation/']];
 return <><header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:min-h-20 lg:px-8"><div className="flex min-w-0 items-center gap-3"><span className={`h-10 w-1.5 rounded-full ${page.dot}`}/><div className="min-w-0"><p className="eyebrow truncate">{page.eyebrow}</p><h1 className="truncate text-lg sm:text-xl">{page.title}</h1></div></div><div className="hidden xl:block"><PartyLegend/></div></header><nav className="sticky top-16 z-20 flex gap-2 overflow-x-auto border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur lg:hidden">{mobile.map(([label,href])=>{const target=href==='/'?'/':href.replace(/\/$/,'');return <Link prefetch={false} key={href} href={href} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold text-white ${current===target?page.active:'bg-slate-500'}`}>{label}</Link>})}</nav></>
}
