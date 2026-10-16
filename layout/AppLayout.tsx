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
   <footer className="border-t border-border bg-card px-4 py-4 text-center text-xs text-body sm:px-6 lg:px-8">CampaignOps · Villimalé 2026 · Secure campaign operations</footer>
  </div>
 </div>;
}
