export function PartyBadge({party}:{party?:string|null}){
 const value=(party||'Unspecified').toUpperCase();
 const cls=value.includes('PNC')?'bg-teal-100 text-teal-800 ring-teal-200':value.includes('MDP')?'bg-yellow-100 text-yellow-900 ring-yellow-300':'bg-slate-100 text-slate-700 ring-slate-200';
 return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${cls}`}>{party||'Unspecified'}</span>
}
export function partyBorder(party?:string|null){const value=(party||'').toUpperCase();return value.includes('PNC')?'border-l-4 border-l-teal-500':value.includes('MDP')?'border-l-4 border-l-yellow-400':'border-l-4 border-l-slate-300'}
export function PartyLegend(){return <div className="flex items-center gap-2 text-[11px] font-bold text-body"><span className="h-2.5 w-2.5 rounded-full bg-teal-500"/>PNC<span className="ml-1 h-2.5 w-2.5 rounded-full bg-yellow-400"/>MDP<span className="ml-1 h-2.5 w-2.5 rounded-full bg-slate-400"/>Other</div>}
