import {supabase} from './supabase';
import {subscribeMdpReportChanges} from './mdp-report-events';

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

const CACHE_MS=8000;
let cacheEpoch=0;
let reportCache:{userId:string;epoch:number;expires:number;data:MdpReportSnapshot}|null=null;
let pending:{userId:string;epoch:number;request:Promise<MdpReportSnapshot>}|null=null;

function clearReportCache(){
 cacheEpoch++;
 reportCache=null;
 pending=null;
}

subscribeMdpReportChanges(clearReportCache);

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
  const {data:accessData,error:accessError}=await supabase.rpc('mdp_2026_reports_snapshot');
  if(accessError)throw new Error('Report permissions could not load: '+accessError.message);
  const access=accessData as MdpReportSnapshot|null;
  if(!access||typeof access.total!=='number'||typeof access.canViewVoting!=='boolean')throw new Error('Report permissions returned an invalid summary.');
  const {data:privateRows,error:privateError}=await supabase.from('staff_private_work_records').select('resident_id,workflow_type,payload');
  if(privateError)throw new Error('Private report records could not load: '+privateError.message);
  const own=new Map<string,Record<string,Record<string,unknown>>>();
  for(const row of privateRows||[]){
   const key=String(row.resident_id),entry=own.get(key)||{};
   entry[row.workflow_type]=(row.payload||{}) as Record<string,unknown>;
   own.set(key,entry);
  }
  let willVote=0,willNotVote=0,called=0,reached=0,noteCount=0,residentsWithRemarks=0,transportNeeded=0,transportInProgress=0,transportCompleted=0;
  for(const records of own.values()){
   const vote=String(records.status?.vote_status||'not-decided');
   if(vote==='will-vote')willVote++;
   if(vote==='not-vote')willNotVote++;
   const call=records.call;
   if(call&&call.outcome!=='pending')called++;
   if(call?.reach_status==='reached')reached++;
   const remark=String(records.remark?.remark||'').trim();
   if(remark){noteCount++;residentsWithRemarks++;}
   const transport=String(records.transport?.transport_status||'');
   if(transport==='needed'||transport==='requested')transportNeeded++;
   if(transport==='in-progress')transportInProgress++;
   if(transport==='completed')transportCompleted++;
  }
  const snapshot:MdpReportSnapshot={...access,willVote,willNotVote,called,reached,noteCount,residentsWithRemarks,transportNeeded,transportInProgress,transportCompleted,votingDay:null,canViewVotingDay:false};
  if(epoch===cacheEpoch)reportCache={userId,epoch,expires:Date.now()+CACHE_MS,data:snapshot};
  return snapshot;
 })();
 pending={userId,epoch,request};
 try{return await request}finally{if(pending?.request===request)pending=null}
}
