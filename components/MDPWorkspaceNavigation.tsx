'use client';

import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
import AuthControl from './AuthControl';

const moreLinks=[
 {label:'Door-to-door',href:'/mdp/door-to-door/'},
 {label:'Calls',href:'/mdp/calls/',roles:['admin','supervisor','call_agent']},
 {label:'Remarks',href:'/mdp/remarks/'},
 {label:'Transportation',href:'/mdp/transportation/',roles:['admin','supervisor','election_operator']},
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
 const [role,setRole]=useState('');
 const pathname=usePathname()||'/mdp/',router=useRouter();
 const moreRef=useRef<HTMLDetailsElement>(null);
 const home=isCurrent(pathname,'/mdp/');
 const residents=isCurrent(pathname,'/mdp/residents/')||isCurrent(pathname,'/mdp/resident-profile/');
 const moreActive=moreLinks.some(item=>isCurrent(pathname,item.href));

 useEffect(()=>{if(moreRef.current)moreRef.current.open=false},[pathname]);
 useEffect(()=>{let active=true;void(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data}=await supabase.from('user_roles').select('role,active').eq('user_id',user.id).maybeSingle();if(active&&data?.active)setRole(data.role)})();return()=>{active=false}},[]);
 const visibleMoreLinks=moreLinks.filter(item=>!('roles'in item)||!item.roles||item.roles.includes(role));

 return <nav aria-label="Main navigation" className="mdp-nav">
  <Link href="/mdp/" onPointerEnter={()=>router.prefetch('/mdp/')} onFocus={()=>router.prefetch('/mdp/')} onTouchStart={()=>router.prefetch('/mdp/')} aria-current={home?'page':undefined} className={`mdp-nav-link mdp-nav-home${home?' is-active':''}`}>Home</Link>
  <Link href="/mdp/residents/" onPointerEnter={()=>router.prefetch('/mdp/residents/')} onFocus={()=>router.prefetch('/mdp/residents/')} onTouchStart={()=>router.prefetch('/mdp/residents/')} aria-current={residents?'page':undefined} className={`mdp-nav-link${residents?' is-active':''}`}>Residents</Link>
  <details ref={moreRef} className={`mdp-nav-more${moreActive?' is-active':''}`}>
   <summary aria-current={moreActive?'page':undefined}>More</summary>
   <div className="mdp-nav-menu">{visibleMoreLinks.map(item=><Link key={item.href} href={item.href} onPointerEnter={()=>router.prefetch(item.href)} onFocus={()=>router.prefetch(item.href)} onTouchStart={()=>router.prefetch(item.href)} onClick={()=>{if(moreRef.current)moreRef.current.open=false}} aria-current={isCurrent(pathname,item.href)?'page':undefined}>{item.label}</Link>)}</div>
  </details>
  <div className="mdp-nav-account"><AuthControl/></div>
 </nav>
}
