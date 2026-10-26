// One non-sensitive signal for report freshness across pages and browser tabs.
const REPORT_EVENT='vote:mdp-report-updated';
const REPORT_STORAGE='vote:mdp-report-revision';

export function notifyMdpReportChanged(){
 if(typeof window==='undefined')return;
 window.dispatchEvent(new Event(REPORT_EVENT));
 try{window.localStorage.setItem(REPORT_STORAGE,Date.now()+':'+Math.random())}catch{}
}

export function subscribeMdpReportChanges(callback:()=>void){
 if(typeof window==='undefined')return ()=>{};
 const onLocal=()=>callback();
 const onStorage=(event:StorageEvent)=>{
  if(event.key===REPORT_STORAGE)callback();
 };
 window.addEventListener(REPORT_EVENT,onLocal);
 window.addEventListener('storage',onStorage);
 return ()=>{
  window.removeEventListener(REPORT_EVENT,onLocal);
  window.removeEventListener('storage',onStorage);
 };
}
