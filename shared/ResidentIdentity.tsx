import type {Resident} from '../lib/types';
import {PartyBadge} from './PartyIdentity';

export function ResidentPhoto({resident,size='md'}:{resident:Resident;size?:'sm'|'md'|'lg'}){
 const initials=(resident.name||'?').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
 const cls=size==='lg'?'h-[110px] w-[110px]':size==='sm'?'h-16 w-16':'h-[72px] w-[72px]';
 const shared=`${cls} resident-photo shrink-0 rounded-2xl border-2 border-white object-cover bg-white shadow-sm transition duration-200`;
 return resident.photo_url?<img src={resident.photo_url} alt={resident.name||'Resident'} loading="lazy" className={shared}/>:<div className={`${shared} grid place-items-center bg-primary-light text-sm font-extrabold text-primary`}>{initials}</div>
}

export function ResidentIdentity({resident,compact=false}:{resident:Resident;compact?:boolean}){
 return <div className="flex min-w-0 items-center gap-4"><ResidentPhoto resident={resident} size={compact?'sm':'md'}/><div className="min-w-0"><div className="flex min-w-0 flex-wrap items-center gap-2"><b className="truncate text-base text-navy">{resident.name||'Unnamed resident'}</b><PartyBadge party={resident.party}/></div><p className="mt-1 truncate text-xs text-body">{resident.national_id||'No ID'} · {resident.lives_in||resident.house||'Location not recorded'}</p></div></div>
}

export function PartyFilter({value,onChange}:{value:string;onChange:(value:string)=>void}){
 return <div className="party-filter" role="group" aria-label="Party filter">{['all','PNC','MDP','Unspecified'].map(p=><button type="button" key={p} onClick={()=>onChange(p)} className={`party-filter-button ${value===p?'party-filter-active':''} ${p==='PNC'?'party-filter-pnc':p==='MDP'?'party-filter-mdp':p==='Unspecified'?'party-filter-other':''}`}>{p==='all'?'All parties':p==='Unspecified'?'No party':p}</button>)}</div>
}

export function matchesParty(resident:Resident,party:string){if(party==='all')return true;const value=(resident.party||'').toUpperCase();if(party==='Unspecified')return !value||value==='UNSPECIFIED';return value===party}