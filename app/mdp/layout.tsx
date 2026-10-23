import type {Metadata} from 'next';
import MDPWorkspaceLayout from '../../layout/MDPWorkspaceLayout';
import MDPStaticCache from '../../components/MDPStaticCache';
import '../../styles/mdp-workspace.css';

export const metadata:Metadata={title:'MDP Resident Voters',description:'Villimalé MDP resident operations workspace',manifest:'/Vote/mdp-manifest.webmanifest?v=20261023',appleWebApp:{capable:true,statusBarStyle:'default',title:'MDP Voters'},icons:{icon:{url:'/Vote/mdp-icon.svg?v=20261023',type:'image/svg+xml'},shortcut:'/Vote/mdp-icon.svg?v=20261023',apple:'/Vote/mdp-icon.svg?v=20261023'}};

export default function Layout({children}:{children:React.ReactNode}){
 return <><MDPStaticCache/><MDPWorkspaceLayout>{children}</MDPWorkspaceLayout></>
}
