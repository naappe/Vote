'use client';

import {useEffect} from 'react';
import {usePathname, useRouter} from 'next/navigation';

const LAST_MDP_PAGE = 'mdp:last-page';

export default function MDPBackButton(){
 const pathname=usePathname();
 const router=useRouter();
 const fallback=pathname?.includes('/resident-profile')?'/mdp/residents/':'/mdp/';

 useEffect(()=>{
  const rememberCurrentPage=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const target=event.target;
   if(!(target instanceof Element))return;
   const anchor=target.closest('a[href]');
   if(!(anchor instanceof HTMLAnchorElement)||anchor.target==='_blank')return;
   const destination=new URL(anchor.href,window.location.href);
   if(destination.origin!==window.location.origin||!destination.pathname.includes('/mdp/'))return;
   const current=(pathname||'/mdp/')+window.location.search;
   if(destination.pathname+destination.search!==current)sessionStorage.setItem(LAST_MDP_PAGE,current);
  };
  document.addEventListener('click',rememberCurrentPage,true);
  return ()=>document.removeEventListener('click',rememberCurrentPage,true);
 },[pathname]);

 function goBack(){
  const previous=sessionStorage.getItem(LAST_MDP_PAGE);
  sessionStorage.removeItem(LAST_MDP_PAGE);
  router.push(previous||fallback);
 }

 if(pathname==='/mdp'||pathname==='/mdp/')return null;

 return <button type="button" className="mdp-back-button" onClick={goBack}>
  <span aria-hidden="true">←</span> Back
 </button>;
}
