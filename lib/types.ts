export type VoteStatus='will-vote'|'not-decided'|'not-vote';
export type PhoneStatus='need-call'|'called';
export type ReachStatus='reached'|'not-reached';
export type D2DStatus='reach'|'not-home'|'live-in-another-place'|'not-visited';
export type SupportLevel='guaranteed'|'not-guaranteed';
export interface Resident{ id:number|string; name:string|null; national_id:string|null; house:string|null; lives_in?:string|null; phone:string|null; photo_url?:string|null; vote_status?:VoteStatus|null; phone_status?:PhoneStatus|null; reach_status?:ReachStatus|null; d2d_status?:D2DStatus|null; support_level?:SupportLevel|null; remarks?:string|null; updated_at?:string|null }
export interface DashboardStats{total:number;willVote:number;undecided:number;notVote:number;needCall:number;called:number;reached:number;notReached:number;visited:number;unvisited:number}
export interface ActivityItem{id:string;title:string;detail:string;time:string;type:'call'|'visit'|'vote'|'remark'}
