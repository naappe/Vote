'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import type {User} from '@supabase/supabase-js';
import {supabase,invalidateResidentCache} from '../lib/supabase';
import AuthControl from './AuthControl';
import PasswordRecoveryForm from './PasswordRecoveryForm';
import {authErrorMessage} from '../lib/auth-utils';

type Access={user:User;role:string;partyScope:string|null}|null;
const StaffAccessContext=createContext<Access>(null);
export function useStaffAccess(){return useContext(StaffAccessContext)}
export default function AuthGate({children}:{children:React.ReactNode}){
 const [access,setAccess]=useState<Access>(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[recovery,setRecovery]=useState(false),[mdpAccess,setMdpAccess]=useState<{userId:string;allowed:boolean;checkFailed?:boolean}|null>(null),[mdpAttempt,setMdpAttempt]=useState(0);
 const [featureAccess,setFeatureAccess]=useState<{route:string;allowed:boolean;failed:boolean}|null>(null);
 const pathname=usePathname();
 const route=pathname.replace(/^\/Vote(?=\/|$)/i,'').replace(/\/$/,'');
 const isMdpRoute=route==='/mdp'||route.startsWith('/mdp/');
 const featurePaths:[string,string][]=[['/mdp/calls','calls'],['/mdp/door-to-door','door_to_door'],['/mdp/voting-days','election_day'],['/mdp/voting','voting'],['/mdp/transportation','transport'],['/mdp/transport-links','transport'],['/mdp/assignments','assignments'],['/mdp/remarks','remarks'],['/mdp/reports','reports'],['/mdp/residents','residents']];
 const feature=featurePaths.find(([path])=>route===path||route.startsWith(path+'/'))?.[1]||(isMdpRoute?'residents':null);
 useEffect(()=>{
  let active=true;
  if(!access||!isMdpRoute||!feature){setFeatureAccess(null);return()=>{active=false}}
  setFeatureAccess(null);
  void supabase.rpc('staff_has_feature_permission',{p_feature:feature}).then(({data,error})=>{if(active)setFeatureAccess({route,allowed:!error&&data===true,failed:!!error})});
  return()=>{active=false}
 },[access?.user.id,access?.role,isMdpRoute,feature,route,attempt]);
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
    const [membershipResult,partyResult,mdpResult]=await Promise.all([
     supabase.from('user_roles').select('role,active').eq('user_id',user.id).maybeSingle(),
     supabase.from('staff_party_access').select('party_scope').eq('user_id',user.id).maybeSingle(),
     isMdpRoute?supabase.rpc('mdp_has_access'):Promise.resolve(null),
    ]);
    if(!active||current!==generation)return;
    const {data:membership,error:roleError}=membershipResult;
    if(roleError)throw roleError;
    if(!membership?.active){setAccess(null);setError('No active staff access was found for this account. Ask an administrator to verify your account permissions.');return}
    const {data:partyAccess,error:partyError}=partyResult;
    if(partyError)throw partyError;
    setAccess({user,role:membership.role,partyScope:membership.role==='admin'?'ALL':partyAccess?.party_scope||null});
    if(isMdpRoute&&mdpResult)setMdpAccess({userId:user.id,allowed:!mdpResult.error&&mdpResult.data===true,checkFailed:!!mdpResult.error});
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
 },[attempt,isMdpRoute]);
 useEffect(()=>{
  let active=true;
  if(!isMdpRoute||!access){return()=>{active=false}}
  if(mdpAccess?.userId===access.user.id)return()=>{active=false}
  const allowedRoles=['admin','supervisor','call_agent','field_agent','election_operator'];
  if(!allowedRoles.includes(access.role)||!['MDP','ALL'].includes(access.partyScope||'')){setMdpAccess({userId:access.user.id,allowed:false});return()=>{active=false}}
  setMdpAccess(null);
  void supabase.rpc('mdp_has_access').then(({data,error})=>{
   if(active)setMdpAccess({userId:access.user.id,allowed:!error&&data===true,checkFailed:!!error});
  });
  return()=>{active=false};
 },[access,isMdpRoute,mdpAttempt]);
 if(recovery)return <PasswordRecoveryForm onContinue={()=>{window.history.replaceState(null,'',window.location.pathname);setRecovery(false);setAttempt(value=>value+1)}}/>;
 if(!ready)return <div className="grid min-h-screen place-items-center bg-calm-50 p-6"><p role="status">Checking secure access…</p></div>;
 if(!access)return <main className="grid min-h-screen place-items-center bg-calm-50 p-5"><section className="panel w-full max-w-md text-center"><div className="brand-mark mx-auto">{isMdpRoute?'MDP':'VO'}</div><p className="eyebrow mt-5">{isMdpRoute?'MDP Resident Operations':'Secure administrator access'}</p><h1 className="mt-2 text-3xl">{isMdpRoute?'Sign in to MDP operations':'Administrator login required'}</h1><p className="mt-3 text-sm text-body">{isMdpRoute?'Use the staff account that an administrator has approved for MDP operations. Access is checked after sign-in.':'Sign in with an active administrator account to open the main Vote app.'}</p>{error&&<p role="alert" className="error-banner mt-4">{error}</p>}<div className="mt-6 flex justify-center gap-3"><AuthControl defaultIdentity={isMdpRoute?'':''} identityPlaceholder={isMdpRoute?'MDP staff username or email':'Administrator username or email'}/><button className="btn-secondary" onClick={()=>setAttempt(value=>value+1)}>Check access again</button></div></section></main>;
 if(isMdpRoute&&(!mdpAccess||mdpAccess.userId!==access.user.id))return <main className="grid min-h-screen place-items-center p-6"><p role="status">Checking MDP access…</p></main>;
 if(isMdpRoute&&!mdpAccess?.allowed){
  const mdpRoles=['admin','supervisor','call_agent','field_agent','election_operator'];
  const accessMessage=mdpAccess?.checkFailed
   ?'We could not verify MDP access just now. Check again, or try again shortly.'
   :!mdpRoles.includes(access.role)
    ?'This staff role is not enabled for the MDP workspace. Ask an administrator to review the role.'
    :!['MDP','ALL'].includes(access.partyScope||'')
     ?'This account needs MDP resident access. An administrator can set Resident data to “MDP residents” in User Management.'
     :'The MDP link is turned off for this account. An administrator can turn it on in User Management. MDP resident access is already assigned.';
  return <main className="grid min-h-screen place-items-center bg-calm-50 p-5"><section className="panel w-full max-w-md"><div className="brand-mark">MDP</div><p className="eyebrow mt-5">MDP Resident Operations</p><h1 className="mt-2 text-3xl">You’re signed in, but MDP access is off</h1><p className="mt-3 text-sm text-body">Signed in account</p><p className="mt-1 break-all rounded-xl border border-border bg-slate-50 px-3 py-3 font-semibold text-navy">{access.user.email||'Current staff account'}</p><div className="info-banner mt-4" role={mdpAccess?.checkFailed?'alert':'status'}>{accessMessage}</div><div className="mt-5 flex flex-wrap items-center gap-3"><button className="btn-primary" onClick={()=>{setMdpAccess(null);setMdpAttempt(value=>value+1)}}>Check access again</button><AuthControl/></div></section></main>;
 }
 if(['/users','/backup'].includes(route)&&access.role!=='admin')return <main className="p-6"><h1>Administrator access required</h1><a href="/Vote/">Return to dashboard</a></main>;
 if(isMdpRoute&&feature&&(!featureAccess||featureAccess.route!==route))return <main className="grid min-h-screen place-items-center p-6"><p role="status">Checking task permission…</p></main>;
 if(isMdpRoute&&feature&&!featureAccess?.allowed)return <main className="grid min-h-screen place-items-center bg-calm-50 p-6"><section className="panel max-w-lg"><h1>Permission required</h1><p className="mt-2 text-sm text-body">{featureAccess?.failed?'Could not verify your task permission. Please retry.':'An administrator has not authorized this feature for your account.'}</p><a className="btn-primary mt-4 inline-flex" href="/Vote/mdp/">Return to MDP home</a></section></main>;
  if(!isMdpRoute&&access.role!=='admin')return <main className="grid min-h-screen place-items-center bg-calm-50 p-6"><section className="panel max-w-lg"><h1>Administrator access required</h1><p className="mt-2 text-sm text-body">The main Vote app is for administrators. Staff approved for MDP operations should use the separate MDP workspace link.</p><a className="btn-primary mt-4 inline-flex" href="/Vote/mdp/">Open MDP workspace</a></section></main>;
 if(route==='/contact-verification'&&!['admin','supervisor'].includes(access.role))return <main className="p-6"><h1>Supervisor access required</h1><a href="/Vote/">Return to dashboard</a></main>;
 return <StaffAccessContext.Provider value={access}>{children}</StaffAccessContext.Provider>;
}
