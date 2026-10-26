import {supabase} from './supabase';
import {notifyMdpReportChanged} from './mdp-report-events';

export type GeneralRemark = {
 id:number|string; resident_id:number|string; section:string; remark:string;
 recorded_by?:string|null; recorded_at?:string|null;
};

// An append-only user-visible revision: the newest general remark is displayed,
// while previous notes remain queryable as history. Authorization stays with RLS.
export async function appendGeneralRemark(residentId:number|string, remark:string):Promise<GeneralRemark>{
 const text=remark.trim();
 if(!text)throw new Error('Remark cannot be empty.');
 const {data:auth,error:authError}=await supabase.auth.getUser();
 if(authError)throw authError;
 if(!auth.user)throw new Error('Sign in before saving a remark.');
 const timestamp=new Date().toISOString();
 const {data,error}=await supabase.from('remarks').insert({
  id:Date.now(),resident_id:Number(residentId),section:'general',
  remark:text,recorded_by:auth.user.email||null,recorded_at:timestamp,
 }).select('id,resident_id,section,remark,recorded_by,recorded_at').single();
 if(error)throw error;
 if(!data)throw new Error('Remark was not confirmed as saved.');
 notifyMdpReportChanged();
 return data as GeneralRemark;
}

export function latestGeneralRemarks<T extends GeneralRemark>(remarks:readonly T[]):T[]{
 const sorted=remarks.filter(item=>item.section==='general'&&Boolean(item.remark?.trim()))
  .slice().sort((a,b)=>String(b.recorded_at||'').localeCompare(String(a.recorded_at||''))||
   Number(b.id)-Number(a.id));
 const seen=new Set<string>();
 return sorted.filter(item=>{const key=String(item.resident_id);if(seen.has(key))return false;seen.add(key);return true});
}

export async function readGeneralRemarks(residentId:number|string,limit=100):Promise<GeneralRemark[]>{
 const {data,error}=await supabase.from('remarks').select('id,resident_id,section,remark,recorded_by,recorded_at')
  .eq('resident_id',Number(residentId)).eq('section','general')
  .order('recorded_at',{ascending:false}).limit(limit);
 if(error)throw error;
 return (data||[]) as GeneralRemark[];
}
