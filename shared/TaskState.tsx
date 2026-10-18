import {ResidentTaskIcon} from '../components/ResidentTaskIcon';

type Icon='phone'|'home'|'person'|'vote'|'remark'|'transport';

export default function TaskState({label,status,icon,complete=false}:{label:string;status:string;icon:Icon;complete?:boolean}){
 return <div className={['flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5',complete?'border-emerald-300 bg-emerald-50':'border-slate-200 bg-white'].join(' ')}>
  <span className={['grid h-9 w-9 shrink-0 place-items-center rounded-lg',complete?'bg-emerald-100 text-emerald-800':'bg-yellow-100 text-blue-900'].join(' ')}><ResidentTaskIcon name={icon} className="h-4 w-4"/></span>
  <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span><span className={['mt-0.5 block truncate text-sm font-semibold',complete?'text-emerald-800':'text-navy'].join(' ')} title={status}>{status}</span></span>
  {complete&&<span aria-label="Completed" title="Completed" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-700 text-xs font-black text-white">✓</span>}
 </div>
}
