import type {ReactNode} from 'react';
import Link from 'next/link';
import MDPBackButton from '../components/MDPBackButton';
import MDPWorkspaceNavigation from '../components/MDPWorkspaceNavigation';

export default function MDPWorkspaceLayout({children}:{children:ReactNode}){
 return <div className="mdp-workspace min-h-screen">
  <header className="mdp-header">
   <div className="mdp-header-inner">
    <Link href="/mdp/" className="mdp-brand" aria-label="MDP Resident Operations home">
     <span className="mdp-brand-mark">MDP</span>
     <span className="mdp-brand-name">MDP Resident Operations</span>
    </Link>
    <MDPWorkspaceNavigation/>
   </div>
  </header>
  <main className="mdp-main"><MDPBackButton/>{children}</main>
 </div>
}
