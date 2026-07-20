import {Suspense} from 'react';
import AppLayout from '../../layout/AppLayout';
import VoterDetailContent from '../../components/VoterDetailContent';

export default function Page(){
 return <AppLayout><Suspense fallback={<div className="panel">Loading voter profile…</div>}><VoterDetailContent/></Suspense></AppLayout>;
}
