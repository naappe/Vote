import type {ReactNode} from 'react';
import type {Resident} from '../lib/types';
import {ResidentIdentity} from './ResidentIdentity';

export function ResidentCard({resident,children,actions,selected=false,onClick,className}:{resident:Resident;children?:ReactNode;actions?:ReactNode;selected?:boolean;onClick?:()=>void;className?:string}){
 return <article className={`soft-card resident-card resident-card-standard flex h-full flex-col ${className||''} ${onClick?'cursor-pointer':''} ${selected?'ring-2 ring-primary':''}`} onClick={onClick}>
  <ResidentIdentity resident={resident}/>
  {children&&<div className="mt-4 flex-1">{children}</div>}
  {actions&&<div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">{actions}</div>}
 </article>;
}

export function ResidentFields({resident,includeBox=true}:{resident:Resident;includeBox?:boolean}){
 const fields=[
  ['Resident ID',String(resident.id)],
  ['National ID',resident.national_id],
  ['Mobile',resident.phone],
  ['Official address',resident.house],
  ['Living place',resident.lives_in],
  ...(includeBox?[['Election box',resident.election_box]]:[])
 ];
 return <dl className="grid gap-2 text-sm">{fields.map(([label,value])=><div key={label} className="flex justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0"><dt className="text-body">{label}</dt><dd className="text-right font-semibold text-navy">{value||'—'}</dd></div>)}</dl>;
}
