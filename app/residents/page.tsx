import {Suspense} from 'react';
import AppLayout from '../../layout/AppLayout';
import VoterManagementContent from '../../components/VoterManagementContent';

function ResidentsFallback(){
 return <section className="panel"><div className="h-64 animate-pulse rounded-xl bg-primary-light"/></section>;
}

export default function Page(){
 return <AppLayout><Suspense fallback={<ResidentsFallback/>}><VoterManagementContent/></Suspense></AppLayout>;
}