import type {Metadata} from 'next';
import '../styles/tailwind.css';

export const metadata:Metadata={
  title:'CampaignOps',
  description:'Villimalé campaign management dashboard',
  icons:{
    icon:[
      {url:'/Vote/favicon.svg',type:'image/svg+xml'},
      {url:'/Vote/favicon.ico',sizes:'any'}
    ],
    shortcut:'/Vote/favicon.svg',
    apple:'/Vote/favicon.svg'
  }
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
