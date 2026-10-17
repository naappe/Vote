'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef} from 'react';
import {useMdpLanguage} from './MDPLanguageProvider';

const moreLinks=[
 {label:'Calls',href:'/mdp/calls/'},
 {label:'Door-to-door',href:'/mdp/door-to-door/'},
 {label:'Voting days',href:'/mdp/voting-days/'},
 {label:'Transportation',href:'/mdp/transportation/'},
 {label:'Remarks',href:'/mdp/remarks/'},
 {label:'Assignments',href:'/mdp/assignments/'},
 {label:'Link transport requests',href:'/mdp/transport-links/'},
 {label:'Reports',href:'/mdp/reports/'},
 {label:'Verification',href:'/mdp/verification/'},
 {label:'Staff and backup',href:'/users/'},
];

function isCurrent(pathname:string,href:string){
 if(href==='/')return pathname==='/';
 const normalized=href.replace(/\/$/,'');
 if(href==='/mdp/')return pathname===normalized;
 return pathname===normalized||pathname.startsWith(`${normalized}/`);
}

export default function MDPWorkspaceNavigation(){
 const {language,setLanguage}=useMdpLanguage();
 const pathname=usePathname()||'/mdp/';
 const moreRef=useRef<HTMLDetailsElement>(null);
 const home=isCurrent(pathname,'/mdp/');
 const residents=isCurrent(pathname,'/mdp/residents/')||isCurrent(pathname,'/mdp/resident-profile/');
 const moreActive=moreLinks.some(item=>isCurrent(pathname,item.href));

 useEffect(()=>{if(moreRef.current)moreRef.current.open=false},[pathname]);

 return <nav aria-label="Main navigation" className="mdp-nav">
  <Link prefetch href="/mdp/" aria-current={home?'page':undefined} className={`mdp-nav-link mdp-nav-home${home?' is-active':''}`}>Home</Link>
  <Link prefetch href="/mdp/residents/" aria-current={residents?'page':undefined} className={`mdp-nav-link${residents?' is-active':''}`}>Residents</Link>
  <details ref={moreRef} className={`mdp-nav-more${moreActive?' is-active':''}`}>
   <summary aria-current={moreActive?'page':undefined}>More</summary>
   <div className="mdp-nav-menu">{moreLinks.map(item=><Link key={item.href} href={item.href} onClick={()=>{if(moreRef.current)moreRef.current.open=false}} aria-current={isCurrent(pathname,item.href)?'page':undefined}>{item.label}</Link>)}</div>
  </details>
  <div className="mdp-lang-toggle" role="group" aria-label="Language">
   <button type="button" aria-pressed={language==='en'} aria-label="English" onClick={()=>setLanguage('en')}>EN</button>
   <button type="button" aria-pressed={language==='dv'} aria-label="Dhivehi" onClick={()=>setLanguage('dv')}>ދި</button>
  </div>
 </nav>
}
