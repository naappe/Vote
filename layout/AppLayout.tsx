import type {ReactNode} from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
export default function AppLayout({children}:{children:ReactNode}){return <div className="flex min-h-screen bg-calm-50"><Sidebar/><div className="min-w-0 flex-1"><Header/><main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main></div></div>}
