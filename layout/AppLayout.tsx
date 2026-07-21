import type {ReactNode} from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({children}:{children:ReactNode;showCampaignShowcase?:boolean}){
 return <div className="min-h-screen bg-calm-50 lg:flex">
  <Sidebar/>
  <div className="min-w-0 flex-1">
   <Header/>
   <main className="mx-auto w-full max-w-[1600px] p-3 sm:p-5 lg:p-7 xl:p-8">
    {children}
   </main>
  </div>
 </div>;
}