'use client';
import {memo} from 'react';
export type KpiTone='blue'|'green'|'red'|'yellow'|'gray';
export interface KpiItem{id:string;label:string;value:number|null;tone?:KpiTone;description?:string}
interface Props{title?:string;items:KpiItem[];activeId?:string;onSelect:(id:string)=>void;loading?:boolean}
function KpiSummary({title='Status summary',items,activeId,onSelect,loading=false}:Props){
 return <section aria-label={title} className="grid grid-cols-3 gap-1.5 sm:gap-3 xl:grid-cols-5">
  {items.map(item=><button key={item.id} type="button" disabled={loading}
   aria-pressed={activeId===item.id} aria-label={`Filter by ${item.label}`}
   onClick={()=>onSelect(item.id)}
   className={`flex min-h-[68px] min-w-0 flex-col items-start justify-center gap-1 rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315b91] disabled:opacity-60 ${activeId===item.id?'border-[#e8d58f] bg-[#fff9e9]':'border-slate-200 bg-white hover:border-blue-200'}`}>
    <strong className="text-[22px] sm:text-[27px] leading-none font-semibold tabular-nums text-[#273a5e]">{loading||item.value===null?'—':item.value.toLocaleString()}</strong>
    <span className="text-[10px] sm:text-xs font-medium leading-snug text-slate-500">{item.label}</span>
   </button>)}
 </section>;
}
export default memo(KpiSummary);
