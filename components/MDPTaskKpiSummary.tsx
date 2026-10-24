'use client';

export type TaskKpi = {
 key:string;
 label:string;
 value:number|null;
 detail?:string;
 onSelect:()=>void;
 active?:boolean;
 tone?:'green'|'red'|'yellow'|'gray'|'blue';
};

const toneClasses:Record<NonNullable<TaskKpi['tone']>,string>={
 green:'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400',
 red:'border-rose-200 bg-rose-50/40 hover:border-rose-400',
 yellow:'border-amber-200 bg-amber-50/40 hover:border-amber-400',
 gray:'border-slate-200 bg-white hover:border-slate-400',
 blue:'border-blue-200 bg-blue-50/40 hover:border-blue-400',
};
const numberClasses:Record<NonNullable<TaskKpi['tone']>,string>={
 green:'text-emerald-700',red:'text-rose-700',yellow:'text-amber-700',
 gray:'text-slate-800',blue:'text-blue-700',
};
function inferTone(item:TaskKpi):NonNullable<TaskKpi['tone']>{
 if(item.tone)return item.tone;
 const key=(item.key+' '+item.label).toLowerCase();
 if(/not.vote|won.t.vote|declin|reject|no.answer/.test(key))return 'red';
 if(/unsure|not.sure|pending|progress|unassigned|need|earlier/.test(key))return 'yellow';
 if(/will.vote|completed|visited|called|recorded|assigned|today/.test(key))return 'green';
 if(/all|total|matching/.test(key))return 'blue';
 return 'gray';
}

export default function MDPTaskKpiSummary({title,items}:{title:string;items:TaskKpi[]}){
 return <section aria-label={title} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
  {items.map(item=>{
   const tone=inferTone(item);
   return <button key={item.key} type="button"
    aria-label={`Filter by ${item.label}`}
    aria-pressed={Boolean(item.active)}
    onClick={item.onSelect}
    className={`group flex min-h-[128px] min-w-0 flex-col items-start justify-between rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:min-h-[144px] sm:p-5 ${toneClasses[tone]} ${item.active?'ring-2 ring-blue-600 ring-offset-2 shadow-md':''}`}>
    <span className={`text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl ${numberClasses[tone]}`}>{item.value===null?'…':item.value.toLocaleString()}</span>
    <span className="mt-3 block text-sm font-semibold leading-snug text-slate-800">{item.label}</span>
    <span className="mt-1 flex w-full items-center justify-between gap-2 text-xs leading-snug text-slate-500">
     <span>{item.detail||'Tap to filter'}</span>
     <span aria-hidden="true" className="shrink-0 text-base transition-transform group-hover:translate-x-1">→</span>
    </span>
   </button>;
  })}
 </section>
}
