'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import type {User} from '@supabase/supabase-js';
import {supabase,invalidateResidentCache} from '../lib/supabase';
import AuthControl from './AuthControl';
import PasswordRecoveryForm from './PasswordRecoveryForm';
import {authErrorMessage} from '../lib/auth-utils';

type Access={user:User;role:string;partyScope:string|null}|null;
export default function AuthGate({children}:{children:React.ReactNode}){
 const [access,setAccess]=useState<Access>(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[recovery,setRecovery]=useState(false),[mdpAccess,setMdpAccess]=useState<{route:string;allowed:boolean}|null>(null);
 const pathname=usePathname();
 useEffect(()=>{
  let active=true,generation=0;
  const hashParams=new URLSearchParams(window.location.hash.replace(/^#/,'?'));
  if(hashParams.get('type')==='recovery'||new URLSearchParams(window.location.search).get('type')==='recovery')setRecovery(true);
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
    const {data:partyAccess,error:partyError}=await supabase.from('staff_party_access').select('party_scope').eq('user_id',user.id).maybeSingle();
    if(!active||current!==generation)return;
    if(partyError)throw partyError;
    setAccess({user,role:membership.role,partyScope:membership.role==='admin'?'ALL':partyAccess?.party_scope||null});
   }catch(error){if(active&&current===generation){setAccess(null);setError(authErrorMessage(error))}}
   finally{if(active&&current===generation)setReady(true)}
  }
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{
   // Supabase auth callbacks must stay synchronous; schedule network work outside the lock.
   if(event==='SIGNED_OUT'){generation++;invalidateResidentCache();setAccess(null);setMdpAccess(null);setRecovery(false);setReady(true)}
   else if(event==='PASSWORD_RECOVERY'){setRecovery(true);setTimeout(()=>{if(active)void check()},0)}
   else if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||event==='USER_UPDATED')setTimeout(()=>{if(active)void check()},0);
  });
  void check();
  return()=>{active=false;generation++;subscription.unsubscribe()};
 },[attempt]);
 const route=pathname.replace(/^\/Vote(?=\/|$)/i,'').replace(/\/$/,'');
 const isMdpRoute=route==='/mdp'||route.startsWith('/mdp/');
 useEffect(()=>{
  let active=true;
  if(!isMdpRoute||!access){return()=>{active=false}}
  const allowedRoles=['admin','supervisor','call_agent','field_agent','election_operator'];
  if(!allowedRoles.includes(access.role)||!['MDP','ALL'].includes(access.partyScope||'')){setMdpAccess({route,allowed:false});return()=>{active=false}}
  setMdpAccess(null);
  void supabase.rpc('mdp_has_access').then(({data,error})=>{
   if(active)setMdpAccess({route,allowed:!error&&data===true});
  });
  return()=>{active=false};
 },[access,route,isMdpRoute]);
 if(recovery)return <PasswordRecoveryForm onContinue={()=>{window.history.replaceState(null,'',window.location.pathname);setRecovery(false);setAttempt(value=>value+1)}}/>;
 if(!ready)return <div className="grid min-h-screen place-items-center bg-calm-50 p-6"><p role="status">Checking secure access…</p></div>;
 if(!access)return <main className="grid min-h-screen place-items-center bg-calm-50 p-5"><section className="panel w-full max-w-md text-center"><div className="brand-mark mx-auto">VO</div><p className="eyebrow mt-5">Secure campaign access</p><h1 className="mt-2 text-3xl">Login required</h1><p className="mt-3 text-sm text-body">Sign in with your staff account. Administrator: naappe@gmail.com</p>{error&&<p role="alert" className="error-banner mt-4">{error}</p>}<div className="mt-6 flex justify-center gap-3"><AuthControl/><button className="btn-secondary" onClick={()=>setAttempt(value=>value+1)}>Check access again</button></div></section></main>;
 if(isMdpRoute&&(!mdpAccess||mdpAccess.route!==route))return <main className="grid min-h-screen place-items-center p-6"><p role="status">Checking MDP access…</p></main>;
 if(isMdpRoute&&!mdpAccess?.allowed)return <main className="grid min-h-screen place-items-center bg-calm-50 p-6"><section className="panel max-w-lg"><h1>MDP access required</h1><p className="mt-2 text-sm text-body">This link is limited to staff accounts approved for MDP operations. Ask an administrator to enable MDP access for your account.</p><a className="btn-primary mt-4 inline-flex" href="/Vote/">Return to dashboard</a></section></main>;
 if(['/users','/backup'].includes(route)&&access.role!=='admin')return <main className="p-6"><h1>Administrator access required</h1><a href="/Vote/">Return to dashboard</a></main>;
 if(!isMdpRoute&&access.role!=='admin'&&!access.partyScope)return <main className="grid min-h-screen place-items-center bg-calm-50 p-6"><section className="panel max-w-lg"><h1>Resident access not assigned</h1><p className="mt-2 text-sm text-body">An administrator must assign this account to MDP or PNC and allow main app access. Resident records stay hidden until then.</p><a className="btn-primary mt-4 inline-flex" href="/Vote/">Check access again</a></section></main>;
 if(route==='/contact-verification'&&!['admin','supervisor'].includes(access.role))return <main className="p-6"><h1>Supervisor access required</h1><a href="/Vote/">Return to dashboard</a></main>;
 return <>{children}</>;
}
