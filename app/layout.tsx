import type {Metadata,Viewport} from 'next';
import '../styles/tailwind.css';
import RootAccessGate from '../components/RootAccessGate';

export const metadata:Metadata={
  title:'CampaignOps',
  description:'Villimalé campaign management dashboard',
  manifest:'/Vote/manifest.webmanifest',
  appleWebApp:{capable:true,statusBarStyle:'default',title:'CampaignOps'},
  icons:{
    icon:{url:'/Vote/favicon.svg',type:'image/svg+xml'},
    shortcut:'/Vote/favicon.svg',
    apple:'/Vote/favicon.svg'
  }
};

export const viewport:Viewport={themeColor:'#0066ff'};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><RootAccessGate>{children}</RootAccessGate></body></html>;
}
