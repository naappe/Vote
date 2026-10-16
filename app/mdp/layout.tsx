import type {Metadata} from 'next';
import MDPWorkspaceLayout from '../../layout/MDPWorkspaceLayout';

export const metadata:Metadata={title:'Maldivian Democratic Party (MDP) Resident Operations',description:'Resident operations workspace'};

export default function Layout({children}:{children:React.ReactNode}){
 return <MDPWorkspaceLayout>{children}</MDPWorkspaceLayout>
}
