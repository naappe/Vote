import {createClient} from '@supabase/supabase-js';
import type {Resident} from './types';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://espezmdpkoixnfchomqb.supabase.co';
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_xP8z74zcMuCkj6xlu1bJ3w_Kudqbcu1';
export const supabase=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true}});

const RESIDENT_COLUMNS='id,name,national_id,house,lives_in,phone,photo_url,vote_status,phone_status,reach_status,d2d_status,support_level,remarks,updated_at';

export interface ResidentPage{
  rows:Resident[];
  count:number;
}

export async function getResidents():Promise<Resident[]>{
  const pageSize=1000;
  const rows:Resident[]=[];
  for(let from=0;;from+=pageSize){
    const {data,error}=await supabase.from('campaign').select(RESIDENT_COLUMNS).order('id',{ascending:true}).range(from,from+pageSize-1);
    if(error) throw new Error(`Campaign load failed: ${error.message}`);
    rows.push(...((data||[]) as Resident[]));
    if((data||[]).length<pageSize) break;
  }
  return rows;
}

export async function getResidentsPage({page=1,pageSize=25,search='',filter='all'}:{page?:number;pageSize?:number;search?:string;filter?:string}):Promise<ResidentPage>{
  const safePage=Math.max(1,page);
  const safeSize=Math.min(100,Math.max(10,pageSize));
  const from=(safePage-1)*safeSize;
  const to=from+safeSize-1;
  let query=supabase.from('campaign').select(RESIDENT_COLUMNS,{count:'exact'});

  const term=search.trim().replace(/[,%()]/g,' ');
  if(term){
    query=query.or(`name.ilike.%${term}%,national_id.ilike.%${term}%,house.ilike.%${term}%,lives_in.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  if(filter!=='all'){
    if(['will-vote','not-decided','not-vote'].includes(filter)) query=query.eq('vote_status',filter);
    else if(['need-call','called'].includes(filter)) query=query.eq('phone_status',filter);
    else if(['not-visited','reach','not-home','live-in-another-place'].includes(filter)) query=query.eq('d2d_status',filter);
    else if(['reached','not-reached'].includes(filter)) query=query.eq('reach_status',filter);
    else if(['guaranteed','not-guaranteed'].includes(filter)) query=query.eq('support_level',filter);
  }

  const {data,error,count}=await query.order('id',{ascending:true}).range(from,to);
  if(error) throw new Error(`Campaign search failed: ${error.message}`);
  return {rows:(data||[]) as Resident[],count:count||0};
}

export async function getResidentById(id:Resident['id']):Promise<Resident>{
  const {data,error}=await supabase.from('campaign').select(RESIDENT_COLUMNS).eq('id',id).maybeSingle();
  if(error) throw new Error(`Voter load failed: ${error.message}`);
  if(!data) throw new Error('Voter record not found.');
  return data as Resident;
}

export async function updateResident(id:Resident['id'],changes:Partial<Resident>){
  const allowed:Partial<Resident>={};
  const editable:(keyof Resident)[]=['name','national_id','house','lives_in','phone','vote_status','phone_status','reach_status','d2d_status','support_level','remarks'];
  for(const field of editable){
    if(Object.prototype.hasOwnProperty.call(changes,field)) (allowed as any)[field]=changes[field]??null;
  }
  if(Object.keys(allowed).length===0) throw new Error('No editable changes were provided.');
  const {data,error}=await supabase.from('campaign').update(allowed).eq('id',id).select(RESIDENT_COLUMNS).single();
  if(error) throw new Error(`Save failed: ${error.message}`);
  return data as Resident;
}
