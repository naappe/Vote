'use client';

import {useEffect} from 'react';

export default function LegacyVoterDetailPage(){
 useEffect(()=>{
  const query=window.location.search;
  window.location.replace(`/Vote/resident-profile/${query}`);
 },[]);
 return <main className="grid min-h-[60vh] place-items-center p-6"><div className="panel max-w-md text-center"><h1>Opening resident…</h1><p className="mt-2 text-sm text-body">Redirecting to the current resident profile.</p></div></main>;
}
