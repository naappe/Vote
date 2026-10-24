'use client';

export type KpiTone='blue'|'green'|'red'|'yellow'|'gray';
export interface KpiItem{
 id:string;label:string;value:number|null;tone?:KpiTone;description?:string;
}
interface Props{
 title?:string;items:KpiItem[];activeId?:string;
 onSelect:(id:string)=>void;loading?:boolean;
}
const colors:Record<KpiTone,string>={
 blue:'border-blue-200 bg-blue-50 text-blue-700',
 green:'border-emerald-200 bg-emerald-50 text-emerald-700',
 red:'border-rose-200 bg-rose-50 text-rose-700',
 yellow:'border-amber-200 bg-amber-50 text-amber-700',
 gray:'border-slate-200 bg-slate-50 text-slate-700',
};
export default function KpiSummary({title='Status summary',items,activeId,onSelect,loading=false}:Props){
 return <section aria-label={title} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-5">
  {items.map(item=><button key={item.id} type="button" disabled={loading}
   aria-pressed={activeId===item.id} aria-label={`Filter by ${item.label}`}
   onClick={()=>onSelect(item.id)}
   className={`group flex min-h-28 min-w-0 flex-col items-start justify-between rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60 sm:p-5 ${colors[item.tone||'gray']} ${activeId===item.id?'ring-2 ring-blue-600 ring-offset-2 shadow-md':''}`}>
    <strong className="text-3xl font-extrabold tabular-nums sm:text-4xl">{loading||item.value===null?'—':item.value.toLocaleString()}</strong>
    <div className="mt-3 w-full"><span className="block text-sm font-semibold text-slate-800">{item.label}</span>
     <span className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
      <span>{item.description||'Click to filter'}</span>
      <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
     </span>
    </div>
   </button>)}
 </section>;
}
