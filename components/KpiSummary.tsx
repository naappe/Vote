'use client';
import {memo} from 'react';
export type KpiTone='blue'|'green'|'red'|'yellow'|'gray';
export interface KpiItem{id:string;label:string;value:number|null;tone?:KpiTone;description?:string}
interface Props{title?:string;items:KpiItem[];activeId?:string;onSelect:(id:string)=>void;loading?:boolean}
function KpiSummary({title='Status summary',items,activeId,onSelect,loading=false}:Props){
 return <section aria-label={title} className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
  {items.map(item=><button key={item.id} type="button" disabled={loading}
   aria-pressed={activeId===item.id} aria-label={`Filter by ${item.label}`}
   onClick={()=>onSelect(item.id)}
   className={`flex min-h-[80px] min-w-0 flex-col items-start justify-center gap-2 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 ${activeId===item.id?'border-amber-300 bg-amber-50':'border-slate-200 bg-white hover:border-blue-200'}`}>
    <strong className="text-[27px] leading-none font-extrabold tabular-nums text-blue-700">{loading||item.value===null?'—':item.value.toLocaleString()}</strong>
    <span className="text-xs font-semibold leading-snug text-slate-700">{item.label}</span>
   </button>)}
 </section>;
}
export default memo(KpiSummary);
