import type {ReactNode} from 'react';

type Props={
 title:string;
 eyebrow?:string;
 kpis?:ReactNode;
 filters?:ReactNode;
 actions?:ReactNode;
 children:ReactNode;
 className?:string;
};
export const operationalFilterClass='mdp-unified-filter rounded-xl border border-slate-200 bg-white p-3 sm:p-4';
export const operationalPillClass='inline-flex min-h-9 items-center rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600';

export default function OperationalPageLayout({title,eyebrow,kpis,filters,actions,children,className=''}:Props){
 return <main className={`mdp-operational-page space-y-3 sm:space-y-4 ${className}`}>
  <header className="mdp-operational-heading flex flex-wrap items-center justify-between gap-3">
   <div className="min-w-0">
    {eyebrow&&<p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-700">{eyebrow}</p>}
    <h1 className="text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">{title}</h1>
   </div>
   {actions&&<div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
  {kpis&&<div className="w-full">{kpis}</div>}
  {filters&&<section aria-label={`${title} search and filters`} className={operationalFilterClass}>{filters}</section>}
  {children}
 </main>;
}
