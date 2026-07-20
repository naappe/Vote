const styles:Record<string,string>={
  'will-vote':'bg-emerald-100 text-emerald-700',
  'not-decided':'bg-amber-100 text-amber-700',
  'not-vote':'bg-rose-100 text-rose-700',
  reached:'bg-sky-100 text-sky-700',
  'not-reached':'bg-slate-100 text-slate-600',
  called:'bg-violet-100 text-violet-700',
  'need-call':'bg-orange-100 text-orange-700',
  guaranteed:'bg-teal-100 text-teal-700'
};
export default function StatusBadge({status,label}:{status?:string|null;label?:string}){const key=status||'not-decided';return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[key]||'bg-slate-100 text-slate-600'}`}>{label||key.replaceAll('-',' ')}</span>}
