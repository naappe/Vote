import {supabase} from './supabase';

export type PrivateWorkflowType='call'|'visit'|'meeting'|'remark'|'transport'|'status';
export type PrivateWorkflowRecord={
 id:number;
 owner_user_id:string;
 resident_id:number;
 workflow_type:PrivateWorkflowType;
 payload:Record<string,unknown>;
 updated_at:string;
};

/** Never accept a caller-supplied owner: Supabase auth and RLS establish ownership. */
export async function getMyPrivateWork(residentId:number,workflowType:PrivateWorkflowType){
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError)throw authError;
 if(!user)throw new Error('Sign in to view saved work.');
 const {data,error}=await supabase.from('staff_private_work_records')
  .select('id,owner_user_id,resident_id,workflow_type,payload,updated_at')
  .eq('resident_id',residentId).eq('workflow_type',workflowType)
  .eq('owner_user_id',user.id).maybeSingle();
 if(error)throw error;
 return data as PrivateWorkflowRecord|null;
}

export async function saveMyPrivateWork(residentId:number,workflowType:PrivateWorkflowType,payload:Record<string,unknown>){
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError)throw authError;
 if(!user)throw new Error('Sign in to save work.');
 const {data,error}=await supabase.from('staff_private_work_records')
  .upsert({owner_user_id:user.id,resident_id:residentId,workflow_type:workflowType,payload,updated_at:new Date().toISOString()},
   {onConflict:'owner_user_id,resident_id,workflow_type'})
  .select('id,owner_user_id,resident_id,workflow_type,payload,updated_at').single();
 if(error)throw error;
 return data as PrivateWorkflowRecord;
}
