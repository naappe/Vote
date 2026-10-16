export type NeutralVoteStatus='voted'|'not_yet_recorded';

export interface MDPVotingResident{
 id:number;
 name:string|null;
 national_id:string|null;
 house:string|null;
 lives_in:string|null;
 phone:number|string|null;
 election_box:string|null;
 has_voted:boolean;
 voted_at:string|null;
}

export function votingStatusLabel(hasVoted:boolean):string{
 return hasVoted?'Voted':'Not yet recorded';
}

export function pageCount(total:number,pageSize:number):number{
 return Math.max(1,Math.ceil(Math.max(0,total)/Math.max(1,pageSize)));
}

export function clampPage(page:number,total:number,pageSize:number):number{
 return Math.min(Math.max(1,page),pageCount(total,pageSize));
}
