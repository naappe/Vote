type IconName='phone'|'home'|'person'|'vote'|'remark'|'transport';

const paths:Record<IconName,React.ReactNode>={
 phone:<><path d="M7 3H5a2 2 0 0 0-2 2c0 8.84 7.16 16 16 16a2 2 0 0 0 2-2v-2l-5-2-2 3a14 14 0 0 1-6-6l3-2-2-5H7Z"/><path d="M14 4a6 6 0 0 1 6 6M14 8a2 2 0 0 1 2 2"/></>,
 home:<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-7h6v7"/></>,
 person:<><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M19 8h3M20.5 6.5v3"/></>,
 vote:<><path d="M4 4h16v17H4z"/><path d="m7 10 2 2 4-4M7 16h10M16 3v4M8 3v4"/></>,
 remark:<><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2 1.5-4A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></>,
 transport:<><path d="M3 7h11v11H3zM14 11h4l3 3v4h-7z"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="17.5" cy="19" r="1.5"/><path d="M5 10h6M5 13h4"/></>,
};

export function ResidentTaskIcon({name,className='h-5 w-5'}:{name:IconName;className?:string}){
 return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}
