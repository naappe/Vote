'use client';
import KpiSummary,{type KpiItem,type KpiTone} from './KpiSummary';

export type TaskKpi={
 key:string;label:string;value:number|null;detail?:string;
 onSelect:()=>void;active?:boolean;tone?:KpiTone;
};
function tone(item:TaskKpi):KpiTone{
 if(item.tone)return item.tone;
 const key=(item.key+' '+item.label).toLowerCase();
 if(/will.not.vote|not.vote|reject|no.answer/.test(key))return 'red';
 if(/not.sure|unsure|pending|progress|need|unassigned/.test(key))return 'yellow';
 if(/will.vote|completed|visited|called|recorded|assigned|today/.test(key))return 'green';
 if(/all|total|matching/.test(key))return 'blue';
 return 'gray';
}
// Compatibility adapter: existing operational pages share the exact same
// accessible, responsive KpiSummary rendering and retain their filter callbacks.
export default function MDPTaskKpiSummary({title,items}:{title:string;items:TaskKpi[]}){
 const selected=items.find(item=>item.active)?.key;
 const mapped:KpiItem[]=items.map(item=>({
  id:item.key,label:item.label,value:item.value,
  description:item.detail,tone:tone(item),
 }));
 return <KpiSummary title={title} items={mapped} activeId={selected}
  onSelect={id=>items.find(item=>item.key===id)?.onSelect()}/>;
}
