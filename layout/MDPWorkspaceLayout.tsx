import type {ReactNode} from 'react';
import Link from 'next/link';
import MDPBackButton from '../components/MDPBackButton';
import MDPWorkspaceNavigation from '../components/MDPWorkspaceNavigation';

export default function MDPWorkspaceLayout({children}:{children:ReactNode}){
 return <div className="mdp-workspace flex min-h-screen flex-col">
  <header className="mdp-header">
   <div className="mdp-header-inner">
    <Link href="/mdp/" className="mdp-brand" aria-label="MDP Resident Voters home">
     <span className="mdp-brand-name"><strong>MDP</strong><small>Resident Voters</small></span>
    </Link>
    <MDPWorkspaceNavigation/>
   </div>
  </header>
  <main className="mdp-main flex-1"><div className="mdp-main-back"><MDPBackButton/></div>{children}</main>
  <footer className="mdp-footer">MDP Resident Voters · Staff Workspace</footer>
 </div>
}
