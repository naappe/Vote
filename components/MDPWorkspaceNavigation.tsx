'use client';

import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import {useEffect,useRef} from 'react';
import {useStaffAccess} from './AuthGate';
import AuthControl from './AuthControl';

const moreLinks=[
 {label:'Call Center',href:'/mdp/residents/?focus=called'},
 {label:'Door to Door',href:'/mdp/residents/?focus=visited'},
 {label:'Remarks',href:'/mdp/residents/?focus=remarks'},
 {label:'Transport',href:'/mdp/residents/?focus=transport'},
 {label:'Voting days',href:'/mdp/voting-days/',roles:['admin','supervisor','election_operator']},
 {label:'Assignments',href:'/mdp/assignments/',roles:['admin','supervisor']},
 {label:'Link transport requests',href:'/mdp/transport-links/',roles:['admin','supervisor','election_operator']},
 {label:'Reports',href:'/mdp/reports/'},
];

function isCurrent(pathname:string,href:string){
 if(href==='/')return pathname==='/';
 const normalized=href.replace(/\/$/,'');
 if(href==='/mdp/')return pathname===normalized;
 return pathname===normalized||pathname.startsWith(`${normalized}/`);
}

export default function MDPWorkspaceNavigation(){
 const access=useStaffAccess(),role=access?.role||'';
 const pathname=usePathname()||'/mdp/',params=useSearchParams();
 const moreRef=useRef<HTMLDetailsElement>(null);
 const home=isCurrent(pathname,'/mdp/');
 const residents=(isCurrent(pathname,'/mdp/residents/')&&!params.get('focus'))||isCurrent(pathname,'/mdp/resident-profile/');
 const activeHref=(href:string)=>{const [path,query]=href.split('?');if(!isCurrent(pathname,path))return false;return !query||new URLSearchParams(query).get('focus')===params.get('focus')};
 const moreActive=moreLinks.some(item=>activeHref(item.href));

 useEffect(()=>{if(moreRef.current)moreRef.current.open=false},[pathname,params]);
 const visibleMoreLinks=moreLinks.filter(item=>!('roles'in item)||!item.roles||item.roles.includes(role));

 return <nav aria-label="Main navigation" className="mdp-nav">
  <Link prefetch={false} href="/mdp/" aria-current={home?'page':undefined} className={`mdp-nav-link mdp-nav-home${home?' is-active':''}`}>Home</Link>
  <Link prefetch={false} href="/mdp/residents/" aria-current={residents?'page':undefined} className={`mdp-nav-link${residents?' is-active':''}`}>Residents</Link>
  <details ref={moreRef} className={`mdp-nav-more${moreActive?' is-active':''}`}>
   <summary aria-current={moreActive?'page':undefined}>More</summary>
   <div className="mdp-nav-menu">{visibleMoreLinks.map(item=><Link key={item.href} prefetch={false} href={item.href} onClick={()=>{if(moreRef.current)moreRef.current.open=false}} aria-current={activeHref(item.href)?'page':undefined}>{item.label}</Link>)}</div>
  </details>
  <div className="mdp-nav-account"><AuthControl/></div>
 </nav>
}
