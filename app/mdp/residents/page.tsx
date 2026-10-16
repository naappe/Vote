import {Suspense} from 'react';
import VoterManagementContent from '../../../components/VoterManagementContent';

export default function Page(){return <Suspense fallback={<div className="panel h-64 animate-pulse"/>}><VoterManagementContent profilePath="/mdp/resident-profile/"/></Suspense>}
