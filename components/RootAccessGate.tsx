'use client';
import {usePathname} from 'next/navigation';
import AuthGate from './AuthGate';
export default function RootAccessGate({children}:{children:React.ReactNode}){
 const path=usePathname().replace(/^\/Vote(?=\/|$)/i,'').replace(/\/$/,'');
 return path==='/share'?<>{children}</>:<AuthGate>{children}</AuthGate>;
}
