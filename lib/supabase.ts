import {createClient} from '@supabase/supabase-js';
import type {Resident} from './types';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://espezmdpkoixnfchomqb.supabase.co';
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_xP8z74zcMuCkj6xlu1bJ3w_Kudqbcu1';
export const supabase=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true}});

export interface ResidentPage{rows:Resident[];count:number}
export interface HouseOption{name:string;count:number}

function normalizeHouse(value?:string|null){
  const name=(value||'').trim();
  if(!name)return'';
  const compact=name.toLowerCase().replace(/[.\s-]+/g,' ');
  if(compact.includes('dhafthar')||compact.includes('no rs')||compact.includes('no dh r'))return'Dhafthar';
  if(compact.includes('sina male')||compact.includes('sina malé'))return'Sina Malé';
  return name;
}

function normalizeResident(row:any):Resident{
  return {...row,house:normalizeHouse(row.house),photo_url:row.photo_url??row.photo??row.image_url??null,party:row.party??row.party_name??row.political_party??row.affiliation??null} as Resident;
}

export async function getResidents():Promise<Resident[]>{
  const pageSize=1000;const rows:Resident[]=[];
  for(let from=0;;from+=pageSize){
    const {data,error}=await supabase.from('campaign').select('*').order('id',{ascending:true}).range(from,from+pageSize-1);
    if(error)throw new Error(`Campaign load failed: ${error.message}`);
    rows.push(...(data||[]).map(normalizeResident));
    if((data||[]).length<pageSize)break;
  }
  return rows;
}

export async function getHouseOptions():Promise<HouseOption[]>{
  const counts=new Map<string,number>();
  const pageSize=1000;
  for(let from=0;;from+=pageSize){
    const {data,error}=await supabase.from('campaign').select('house').order('house',{ascending:true}).range(from,from+pageSize-1);
    if(error)throw new Error(`House list failed: ${error.message}`);
    for(const row of data||[]){const house=normalizeHouse(row.house);if(house)counts.set(house,(counts.get(house)||0)+1)}
    if((data||[]).length<pageSize)break;
  }
  return [...counts.entries()].map(([name,count])=>({name,count})).sort((a,b)=>a.name.localeCompare(b.name));
}

export async function getResidentsPage({page=1,pageSize=25,search='',filter='all',house='all'}:{page?:number;pageSize?:number;search?:string;filter?:string;house?:string}):Promise<ResidentPage>{
  const safePage=Math.max(1,page);const safeSize=Math.min(100,Math.max(10,pageSize));const from=(safePage-1)*safeSize;const to=from+safeSize-1;
  let query=supabase.from('campaign').select('*',{count:'exact'});
  const term=search.trim().replace(/[,%()]/g,' ');
  if(term)query=query.or(`name.ilike.%${term}%,national_id.ilike.%${term}%,house.ilike.%${term}%,lives_in.ilike.%${term}%,phone.ilike.%${term}%`);
  if(house&&house!=='all')query=query.eq('house',house);
  if(filter!=='all'){
    if(['will-vote','not-decided','not-vote'].includes(filter))query=query.eq('vote_status',filter);
    else if(['need-call','called'].includes(filter))query=query.eq('phone_status',filter);
    else if(['not-visited','reach','not-home','live-in-another-place'].includes(filter))query=query.eq('d2d_status',filter);
    else if(['reached','not-reached'].includes(filter))query=query.eq('reach_status',filter);
    else if(['guaranteed','not-guaranteed'].includes(filter))query=query.eq('support_level',filter);
  }
  const {data,error,count}=await query.order('id',{ascending:true}).range(from,to);
  if(error)throw new Error(`Campaign search failed: ${error.message}`);
  return {rows:(data||[]).map(normalizeResident),count:count||0};
}

export async function getResidentById(id:Resident['id']):Promise<Resident>{
  const {data,error}=await supabase.from('campaign').select('*').eq('id',id).maybeSingle();
  if(error)throw new Error(`Voter load failed: ${error.message}`);
  if(!data)throw new Error('Voter record not found.');
  return normalizeResident(data);
}

export async function updateResident(id:Resident['id'],changes:Partial<Resident>){
  const allowed:Partial<Resident>={};
  const editable:(keyof Resident)[]=['name','national_id','house','lives_in','phone','vote_status','phone_status','reach_status','d2d_status','support_level','remarks'];
  for(const field of editable){if(Object.prototype.hasOwnProperty.call(changes,field))(allowed as any)[field]=changes[field]??null}
  if(Object.keys(allowed).length===0)throw new Error('No editable changes were provided.');
  const {data,error}=await supabase.from('campaign').update(allowed).eq('id',id).select('*').single();
  if(error)throw new Error(`Save failed: ${error.message}`);
  return normalizeResident(data);
}
