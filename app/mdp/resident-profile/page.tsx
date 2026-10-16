import {Suspense} from 'react';
import VoterDetailContent from '../../../components/VoterDetailContent';

export default function Page(){return <Suspense fallback={<div className="panel">Loading resident profile…</div>}><VoterDetailContent workspaceMode="mdp"/></Suspense>}
