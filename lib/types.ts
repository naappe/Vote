export type VoteStatus='will-vote'|'not-decided'|'not-vote';
export type PhoneStatus='need-call'|'called';
export type ReachStatus='reached'|'not-reached';
export type D2DStatus='reach'|'not-home'|'live-in-another-place'|'not-visited';
export type SupportLevel='guaranteed'|'not-guaranteed';
export type CallOutcome='connected'|'busy'|'not-answer'|'disconnected'|'out-of-coverage'|'wrong-number';

/** Read-only identity record from public."Resident". */
export interface Resident{
 id:number|string;
 photo_url?:string|null;
 name:string|null;
 national_id:string|null;
 house:string|null;
 lives_in?:string|null;
 phone:string|null;
 sex?:string|null;
 age?:number|null;
 party?:string|null;
 election_box?:string|null;
 call_vote_recorded_by?:string|null;
 /** Joined workflow values. These are never persisted to Resident. */
 vote_status?:VoteStatus|null;
 phone_status?:PhoneStatus|null;
 reach_status?:ReachStatus|null;
 d2d_status?:D2DStatus|null;
 support_level?:SupportLevel|null;
 remarks?:string|null;
 call_outcome?:CallOutcome|null;
 call_attempts?:number|null;
 call_notes?:string|null;
 callback_scheduled_at?:string|null;
 last_call_at?:string|null;
 recorded_by?:string|null;
 updated_at?:string|null;
}

export interface CallCenterRecord{
 resident_id:number|string;
 phone_status:PhoneStatus;
 reach_status:ReachStatus;
 call_outcome?:CallOutcome|null;
 vote_status:VoteStatus;
 support_level:SupportLevel;
 call_attempts:number;
 call_notes?:string|null;
 call_duration_seconds?:number|null;
 callback_scheduled_at?:string|null;
 last_call_at?:string|null;
 next_action?:string|null;
 recorded_by?:string|null;
 updated_at?:string|null;
}

export interface DashboardStats{total:number;willVote:number;undecided:number;notVote:number;needCall:number;called:number;reached:number;notReached:number;visited:number;unvisited:number}
export interface ActivityItem{id:string;title:string;detail:string;time:string;type:'call'|'visit'|'vote'|'remark'}