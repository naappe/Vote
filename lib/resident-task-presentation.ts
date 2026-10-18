export type ResidentTaskSummary = {
 callAttempts:number;
 callOutcome:string|null;
 voteStatus:string|null;
 hasVoteIntention?:boolean;
 visitStatus:string|null;
 transportStatus:string|null;
 hasRemarks:boolean;
};

export type ResidentTaskCard = {
 id:'call'|'door-to-door'|'voting-intention'|'remarks'|'transport';
 label:string;
 status:string;
 done:boolean;
 icon:'phone'|'home'|'vote'|'remark'|'transport';
};

const friendly=(value:string)=>value.replaceAll('-',' ').replace(/^./,letter=>letter.toUpperCase());
const transportLabel=(value:string)=>{
 if(value==='not-needed')return 'Not requested';
 if(['need-transport','needed','requested'].includes(value))return 'Requested';
 if(value==='picked-up')return 'Picked up';
 return friendly(value);
};

export function residentTaskCards(summary:ResidentTaskSummary):ResidentTaskCard[]{
 return [
  {id:'call',label:'Call',icon:'phone',status:summary.callAttempts?`${friendly(summary.callOutcome||'pending')} · ${summary.callAttempts} ${summary.callAttempts===1?'attempt':'attempts'}`:'Pending',done:summary.callAttempts>0},
  {id:'door-to-door',label:'Door-to-door',icon:'home',status:summary.visitStatus?(summary.visitStatus==='visited'?'Resident reached':'Not reached · '+friendly(summary.visitStatus)):'Pending',done:summary.visitStatus==='visited'},
  {id:'voting-intention',label:'Voting intention',icon:'vote',status:summary.voteStatus&&(summary.voteStatus!=='not-decided'||summary.hasVoteIntention)?friendly(summary.voteStatus):'Pending',done:Boolean(summary.voteStatus&&(summary.voteStatus!=='not-decided'||summary.hasVoteIntention))},
  {id:'remarks',label:'Remarks',icon:'remark',status:summary.hasRemarks?'Saved':'Pending',done:summary.hasRemarks},
  {id:'transport',label:'Transport',icon:'transport',status:summary.transportStatus?transportLabel(summary.transportStatus):'Pending',done:['completed','picked-up'].includes(summary.transportStatus||'')},
 ];
}
