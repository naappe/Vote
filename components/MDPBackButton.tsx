'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';

const KEY='mdp:page-history';
const HOME='/mdp/';
function readHistory():string[]{try{const value=JSON.parse(sessionStorage.getItem(KEY)||'[]');return Array.isArray(value)?value.filter((x):x is string=>typeof x==='string'&&x.startsWith('/mdp/')&&!x.startsWith('//')).slice(-30):[]}catch{return []}}
export default function MDPBackButton(){
 const pathname=usePathname();
 const params=useSearchParams();
 const router=useRouter();
 const current=(pathname||HOME)+(params.toString()?'?'+params.toString():'');
 const [,setPrevious]=useState<string|null>(null);
 const navigatingBack=useRef(false);
 useEffect(()=>{
  const stack=readHistory();
  if(navigatingBack.current){navigatingBack.current=false}
  else if(stack[stack.length-1]!==current){stack.push(current);sessionStorage.setItem(KEY,JSON.stringify(stack.slice(-30)))}
  setPrevious(stack.length>1?stack[stack.length-2]:null);
 },[current]);
 function goBack(){
  const stack=readHistory();
  if(stack[stack.length-1]===current)stack.pop();
  const destination=stack[stack.length-1]||(pathname?.includes('/resident-profile')?'/mdp/vote-target/':HOME);
  sessionStorage.setItem(KEY,JSON.stringify(stack));
  navigatingBack.current=true;
  router.push(destination);
 }
 if(pathname===HOME||pathname==='/mdp'||pathname==='/mdp/vote-target/'||pathname==='/mdp/vote-target')return null;
 return <button type="button" className="mdp-back-button" onClick={goBack} aria-label="Back to previous page"><span aria-hidden="true">←</span> Back</button>;
}
