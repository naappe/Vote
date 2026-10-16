'use client';
import {FormEvent,useState} from 'react';
import {supabase} from '../lib/supabase';
import {authErrorMessage} from '../lib/auth-utils';

export default function PasswordRecoveryForm({onContinue}:{onContinue:()=>void}){
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 async function update(event:FormEvent){
  event.preventDefault();setError('');
  if(password!==confirm){setError('The passwords do not match.');return}
  setBusy(true);
  try{const {error}=await supabase.auth.updateUser({password});if(error)throw error;setSaved(true);setPassword('');setConfirm('')}
  catch(error){setError(authErrorMessage(error))}finally{setBusy(false)}
 }
 return <main className="grid min-h-screen place-items-center bg-calm-50 p-5"><section className="panel w-full max-w-md">
  <div className="brand-mark mx-auto">VO</div><p className="eyebrow mt-5 text-center">Secure access</p><h1 className="mt-2 text-center text-3xl">{saved?'Password updated':'Choose a new password'}</h1>
  {saved?<><p className="mt-3 text-center text-sm text-body">Your password has been changed. Continue to the resident workspace.</p><button type="button" className="btn-primary mt-6 w-full" onClick={onContinue}>Continue</button></>:<form className="mt-6 space-y-4" onSubmit={update}>
   <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy">New password</span><input className="field" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={event=>setPassword(event.target.value)} placeholder="At least 6 characters"/></label>
   <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy">Confirm new password</span><input className="field" type="password" autoComplete="new-password" minLength={6} required value={confirm} onChange={event=>setConfirm(event.target.value)} placeholder="Enter it again"/></label>
   {error&&<div className="error-banner" role="alert">{error}</div>}
   <button type="submit" className="btn-primary w-full" disabled={busy}>{busy?'Saving…':'Save new password'}</button>
  </form>}
 </section></main>
}
