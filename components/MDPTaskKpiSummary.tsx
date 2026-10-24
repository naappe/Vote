'use client';

export type TaskKpi = {
 key:string;
 label:string;
 value:number|null;
 detail?:string;
 onSelect:()=>void;
 active?:boolean;
};

export default function MDPTaskKpiSummary({title,items}:{title:string;items:TaskKpi[]}){
 return <section aria-label={title} className="mdp-operation-summary" style={{display:'flex',flexWrap:'wrap',gap:8}}>
  {items.map(item=><button key={item.key} type="button"
   aria-label={`Show ${item.label.toLowerCase()} residents`}
   aria-pressed={Boolean(item.active)}
   onClick={item.onSelect}
   className="mdp-operation-stat"
   style={{minWidth:120,textAlign:'left',cursor:'pointer',
    border:item.active?'2px solid #2563eb':'1px solid #dbe4ef',
    borderRadius:12,background:item.active?'#eff6ff':'#fff',padding:'10px 14px'}}>
    <span>{item.label}</span>
    <strong>{item.value===null?'…':item.value.toLocaleString()}</strong>
    {item.detail&&<small>{item.detail}</small>}
   </button>)}
 </section>
}
