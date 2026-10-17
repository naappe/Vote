import type {ReactNode} from 'react';
import Link from 'next/link';
import MDPBackButton from '../components/MDPBackButton';

const moreLinks=[
 {label:'Calls',href:'/mdp/calls/'},
 {label:'Door-to-door',href:'/mdp/door-to-door/'},
 {label:'Voting days',href:'/mdp/voting-days/'},
 {label:'Transportation',href:'/mdp/transportation/'},
 {label:'Remarks',href:'/mdp/remarks/'},
 {label:'Assignments',href:'/mdp/assignments/'},
 {label:'Link transport requests',href:'/mdp/transport-links/'},
 {label:'Reports',href:'/mdp/reports/'},
 {label:'Verification',href:'/contact-verification/'},
 {label:'Staff and backup',href:'/users/'},
 {label:'Main app',href:'/'},
];

export default function MDPWorkspaceLayout({children}:{children:ReactNode}){
 return <div className="mdp-workspace min-h-screen">
  <header className="mdp-header">
   <div className="mdp-header-inner">
    <Link href="/mdp/" className="mdp-brand" aria-label="MDP Resident Operations home">
     <span className="mdp-brand-mark">MDP</span>
     <span className="mdp-brand-name">MDP Resident Operations</span>
    </Link>
    <nav aria-label="Main navigation" className="mdp-nav">
     <Link prefetch href="/mdp/" className="mdp-nav-link">Home</Link>
     <Link prefetch href="/mdp/residents/" className="mdp-nav-link">Residents</Link>
     <details className="mdp-nav-more">
      <summary>More</summary>
      <div className="mdp-nav-menu">{moreLinks.map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}</div>
     </details>
    </nav>
   </div>
  </header>
  <main className="mdp-main"><MDPBackButton/>{children}</main>
 </div>
}
