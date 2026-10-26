import {supabase} from './supabase';

export type MdpReportSnapshot={
 total:number;
 willVote:number;
 willNotVote:number;
 called:number;
 reached:number;
 noteCount:number;
 residentsWithRemarks:number;
 transportNeeded:number;
 transportInProgress:number;
 transportCompleted:number;
 canViewVoting:boolean;
 canViewCalls:boolean;
 canViewRemarks:boolean;
 canViewTransport:boolean;
 canViewVotingDay:boolean;
 votingDay:{name:string;voted:number}|null;
};

const UPDATE_EVENT='vote:mdp-report-updated';
const UPDATE_STORAGE_KEY='vote:mdp-report-revision';
const CACHE_MS=8000;
let cacheEpoch=0;
let reportCache:{userId:string;epoch:number;expires:number;data:MdpReportSnapshot}|null=null;
let pending:{userId:string;epoch:number;request:Promise<MdpReportSnapshot>}|null=null;

function clearReportCache(){
 cacheEpoch++;
 reportCache=null;
 pending=null;
}

// A save on another tab invalidates its cached report without sharing resident data.
export function notifyMdpReportChanged(){
 clearReportCache();
 if(typeof window==='undefined')return;
 window.dispatchEvent(new Event(UPDATE_EVENT));
 try{window.localStorage.setItem(UPDATE_STORAGE_KEY,Date.now()+':'+Math.random())}catch{}
}

export function subscribeMdpReportChanges(callback:()=>void){
 if(typeof window==='undefined')return ()=>{};
 const handleLocal=()=>callback();
 const handleStorage=(event:StorageEvent)=>{
  if(event.key!==UPDATE_STORAGE_KEY)return;
  clearReportCache();
  callback();
 };
 window.addEventListener(UPDATE_EVENT,handleLocal);
 window.addEventListener('storage',handleStorage);
 return ()=>{
  window.removeEventListener(UPDATE_EVENT,handleLocal);
  window.removeEventListener('storage',handleStorage);
 };
}

// A report never reuses an earlier user's data after sign-in or sign-out.
supabase.auth.onAuthStateChange(event=>{
 if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='USER_UPDATED')clearReportCache();
});

export async function getMdpReportsSnapshot(fresh=false):Promise<MdpReportSnapshot>{
 const {data:{session},error:sessionError}=await supabase.auth.getSession();
 if(sessionError)throw sessionError;
 const userId=session?.user.id;
 if(!userId)throw new Error('Sign in to view MDP Reports.');
 const now=Date.now();
 if(!fresh&&reportCache?.userId===userId&&reportCache.epoch===cacheEpoch&&reportCache.expires>now)return reportCache.data;
 if(pending?.userId===userId&&pending.epoch===cacheEpoch)return pending.request;
 const epoch=cacheEpoch;
 const request=(async()=>{
  const {data,error}=await supabase.rpc('mdp_2026_reports_snapshot');
  if(error)throw new Error('Reports could not load: '+error.message);
  const snapshot=data as MdpReportSnapshot|null;
  if(!snapshot||typeof snapshot.total!=='number'||typeof snapshot.canViewVoting!=='boolean')
   throw new Error('Reports returned an invalid summary.');
  if(epoch===cacheEpoch)reportCache={userId,epoch,expires:Date.now()+CACHE_MS,data:snapshot};
  return snapshot;
 })();
 pending={userId,epoch,request};
 try{return await request}finally{if(pending?.request===request)pending=null}
}
