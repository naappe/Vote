import type {ReactNode} from 'react';
import Link from 'next/link';

const links=[
 {label:'Home',href:'/mdp/'},
 {label:'Residents',href:'/mdp/residents/'},
 {label:'Calls',href:'/mdp/calls/'},
 {label:'Visits',href:'/mdp/door-to-door/'},
 {label:'Voting days',href:'/mdp/voting-days/'},
 {label:'Assignments',href:'/mdp/assignments/'},
 {label:'Transport',href:'/mdp/transportation/'},
 {label:'Link transport',href:'/mdp/transport-links/'},
 {label:'Remarks',href:'/mdp/remarks/'},
 {label:'Reports',href:'/mdp/reports/'},
 {label:'Verification',href:'/contact-verification/'},
 {label:'Staff & backup',href:'/users/'},
];

export default function MDPWorkspaceLayout({children}:{children:ReactNode}){
 return <div className="min-h-screen bg-calm-50">
  <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
   <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
    <Link href="/mdp/" className="min-w-0"><span className="block truncate text-sm font-extrabold text-navy sm:text-base">Maldivian Democratic Party</span><span className="text-xs font-semibold text-body">MDP Resident Operations</span></Link>
    <Link href="/" className="btn-secondary shrink-0 !px-3 !py-2 text-xs">Main app</Link>
   </div>
   <nav aria-label="MDP resident operations" className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6">{links.map(item=><Link key={item.href} prefetch={false} href={item.href} className="shrink-0 rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold text-body hover:border-primary hover:text-primary">{item.label}</Link>)}</nav>
  </header>
  <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">{children}</main>
  <footer className="mx-auto max-w-5xl px-4 pb-6 text-center text-xs text-body sm:px-6">MDP Resident Operations · Shared resident records</footer>
 </div>
}
