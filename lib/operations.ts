import {supabase} from './supabase';
import type {Resident} from './types';

export type ElectionReach='reached'|'not-reached';
export interface ElectionRecord{resident_id:number|string;reach_status:ElectionReach;has_voted:boolean;transport_status:string;voted_at?:string|null;reached_at?:string|null;contact_note?:string|null;updated_at?:string|null}
export interface TransportRecord{resident_id:number|string;transport_status:string;pickup_location?:string|null;pickup_time?:string|null;vehicle?:string|null;driver_name?:string|null;driver_phone?:string|null;passenger_count?:number;special_assistance?:string|null;notes?:string|null;assigned_by?:string|null;completed_at?:string|null;updated_at?:string|null}
export interface WorkflowShare{id:number|string;token:string;workflow:string;title?:string|null;party?:string|null;house?:string|null;status_filter?:string|null;resident_ids?:number[]|null;can_update:boolean;active:boolean;expires_at?:string|null}

async function residentMap(ids:(number|string)[]){const map=new Map<string,Resident>();if(!ids.length)return map;for(let start=0;start<ids.length;start+=500){const {data,error}=await supabase.from('Resident').select('*').in('id',ids.slice(start,start+500));if(error)throw new Error(error.message);for(const row of data||[])map.set(String(row.id),{...row,phone:row.phone==null?null:String(row.phone)} as Resident)}return map}

export async function getElectionBoard(){
 const residents:Resident[]=[];
 for(let from=0;;from+=1000){const {data,error}=await supabase.from('Resident').select('*').order('id').range(from,from+999);if(error)throw new Error(`Resident load failed: ${error.message}`);residents.push(...(data||[]).map(row=>({...row,phone:row.phone==null?null:String(row.phone)} as Resident)));if((data||[]).length<1000)break}
 const [electionResponse,transportResponse]=await Promise.all([supabase.from('election_day').select('*'),supabase.from('transportation').select('resident_id,transport_status')]);
 if(electionResponse.error)throw new Error(`Election Day load failed: ${electionResponse.error.message}`);
 if(transportResponse.error)throw new Error(`Transportation load failed: ${transportResponse.error.message}`);
 const elections=new Map((electionResponse.data||[]).map(row=>[String(row.resident_id),row as ElectionRecord]));
 const transport=new Map((transportResponse.data||[]).map(row=>[String(row.resident_id),String(row.transport_status||'not-needed')]));
 return residents.map(resident=>{const saved=elections.get(String(resident.id));return {resident,election:{resident_id:resident.id,reach_status:saved?.reach_status||'not-reached',has_voted:Boolean(saved?.has_voted),transport_status:transport.get(String(resident.id))||saved?.transport_status||'not-needed',voted_at:saved?.voted_at,reached_at:saved?.reached_at,contact_note:saved?.contact_note,updated_at:saved?.updated_at}}})
}

export async function saveElectionStatus(residentId:number|string,changes:Partial<ElectionRecord>){const now=new Date().toISOString();const payload:any={resident_id:residentId,...changes,updated_at:now};if(changes.reach_status==='reached')payload.reached_at=now;if(changes.has_voted===true)payload.voted_at=now;if(changes.has_voted===false)payload.voted_at=null;const {error}=await supabase.from('election_day').upsert(payload,{onConflict:'resident_id'});if(error)throw new Error(`Election Day save failed: ${error.message}`)}
export async function getTransportationBoard(){const {data,error}=await supabase.from('transportation').select('*').order('updated_at',{ascending:false});if(error)throw new Error(`Transportation load failed: ${error.message}`);const records=(data||[]) as TransportRecord[];const residents=await residentMap(records.map(r=>r.resident_id));return records.map(record=>({record,resident:residents.get(String(record.resident_id))||null}))}
export async function saveTransportation(residentId:number|string,changes:Partial<TransportRecord>){const payload={resident_id:residentId,...changes,updated_at:new Date().toISOString()};const {error}=await supabase.from('transportation').upsert(payload,{onConflict:'resident_id'});if(error)throw new Error(`Transportation save failed: ${error.message}`)}
export async function createWorkflowShare(input:{workflow:string;title:string;status_filter?:string;resident_ids?:number[];can_update?:boolean;expires_at?:string|null}){const {data,error}=await supabase.from('workflow_shares').insert({...input,can_update:Boolean(input.can_update),active:true}).select('*').single();if(error)throw new Error(`Share link creation failed: ${error.message}`);return data as WorkflowShare}
export async function getWorkflowShare(token:string){const {data,error}=await supabase.from('workflow_shares').select('*').eq('token',token).maybeSingle();if(error)throw new Error(`Share link load failed: ${error.message}`);if(!data)throw new Error('This share link is invalid or expired.');return data as WorkflowShare}
export async function getSharedResidents(share:WorkflowShare){const ids=share.resident_ids||[];const map=await residentMap(ids);return ids.map(id=>map.get(String(id))).filter(Boolean) as Resident[]}
