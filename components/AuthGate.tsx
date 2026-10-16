'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import type {User} from '@supabase/supabase-js';
import {supabase,invalidateResidentCache} from '../lib/supabase';
import AuthControl from './AuthControl';
import {authErrorMessage} from '../lib/auth-utils';

type Access={user:User;role:string}|null;
export default function AuthGate({children}:{children:React.ReactNode}){
 const [access,setAccess]=useState<Access>(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const pathname=usePathname();
 useEffect(()=>{
  let active=true,generation=0;
  async function check(){
   const current=++generation;
   setReady(false);setError('');
   try{
    const {data:{user},error}=await supabase.auth.getUser();
    if(!active||current!==generation)return;
    if(error||!user){setAccess(null);if(error&&error.name!=='AuthSessionMissingError')setError(authErrorMessage(error));return}
    const {data:membership,error:roleError}=await supabase.from('user_roles').select('role,active').eq('user_id',user.id).maybeSingle();
    if(!active||current!==generation)return;
    if(roleError)throw roleError;
    if(!membership?.active){setAccess(null);setError('No active staff access was found for this account. Ask an administrator to verify your account permissions.');return}
    setAccess({user,role:membership.role});
   }catch(error){if(active&&current===generation){setAccess(null);setError(authErrorMessage(error))}}
   finally{if(active&&current===generation)setReady(true)}
  }
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{
   // Supabase auth callbacks must stay synchronous; schedule network work outside the lock.
   if(event==='SIGNED_OUT'){generation++;invalidateResidentCache();setAccess(null);setReady(true)}
   else if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||event==='USER_UPDATED')setTimeout(()=>{if(active)void check()},0);
  });
  void check();
  return()=>{active=false;generation++;subscription.unsubscribe()};
 },[attempt]);
 if(!ready)return <div className="grid min-h-screen place-items-center bg-calm-50 p-6"><p role="status">Checking secure access…</p></div>;
 if(!access)return <main className="grid min-h-screen place-items-center bg-calm-50 p-5"><section className="panel w-full max-w-md text-center"><div className="brand-mark mx-auto">VO</div><p className="eyebrow mt-5">Secure campaign access</p><h1 className="mt-2 text-3xl">Login required</h1><p className="mt-3 text-sm text-body">Sign in with your staff account. Administrator: naappe@gmail.com</p>{error&&<p role="alert" className="error-banner mt-4">{error}</p>}<div className="mt-6 flex justify-center gap-3"><AuthControl/><button className="btn-secondary" onClick={()=>setAttempt(value=>value+1)}>Check access again</button></div></section></main>;
 const route=pathname.replace(/^\/Vote(?=\/|$)/i,'').replace(/\/$/,'');
 if(['/users','/backup'].includes(route)&&access.role!=='admin')return <main className="p-6"><h1>Administrator access required</h1><a href="/Vote/">Return to dashboard</a></main>;
 if(route==='/contact-verification'&&!['admin','supervisor'].includes(access.role))return <main className="p-6"><h1>Supervisor access required</h1><a href="/Vote/">Return to dashboard</a></main>;
 return <>{children}</>;
}
