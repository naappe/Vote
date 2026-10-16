import Link from 'next/link';

const actions=[
 {title:'Residents',detail:'Search the resident directory, open profiles, and export results.',href:'/mdp/residents/',icon:'01'},
 {title:'Calls and visits',detail:'Record call outcomes and follow-up actions.',href:'/mdp/calls/',icon:'02'},
 {title:'Door-to-door',detail:'Log household visits and field outcomes.',href:'/mdp/door-to-door/',icon:'03'},
 {title:'Voting days',detail:'Choose a voting day and record or undo turnout.',href:'/mdp/voting-days/',icon:'04'},
 {title:'Transportation',detail:'Review requests or link them to a voting day or door-to-door visit.',href:'/mdp/transportation/',icon:'05'},
 {title:'Link transport',detail:'Connect an existing transport request to a voting day or field visit.',href:'/mdp/transport-links/',icon:'06'},
 {title:'Remarks',detail:'Add resident notes and review their history.',href:'/mdp/remarks/',icon:'07'},
 {title:'Reports',detail:'Open operational reports and exports.',href:'/mdp/reports/',icon:'08'},
 {title:'Assignments',detail:'Assign resident follow-up work to staff.',href:'/mdp/assignments/',icon:'09'},
 {title:'Administration',detail:'Staff, verification, and backup tools remain role-restricted.',href:'/contact-verification/',icon:'10',admin:true},
];

export default function MDPResidentHome(){
 return <div className="space-y-5">
  <section className="panel !p-5 sm:!p-7"><p className="eyebrow">Resident operations</p><h1 className="mt-2 text-2xl sm:text-3xl">What would you like to do?</h1><p className="mt-2 max-w-2xl text-sm text-body">Choose a task. Your work uses the same resident records and secure staff access as the main app.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{actions.map(item=><Link key={item.title} prefetch={false} href={item.href} className="group flex min-h-24 items-start gap-4 rounded-xl border border-border bg-white p-4 transition hover:border-primary hover:shadow-card"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-light text-sm font-extrabold text-primary">{item.icon}</span><span className="min-w-0"><strong className="block text-navy group-hover:text-primary">{item.title}</strong><small className="mt-1 block leading-5 text-body">{item.detail}</small></span><span aria-hidden="true" className="ml-auto text-lg text-body">›</span></Link>)}</div></section>
  <p className="px-1 text-xs leading-5 text-body">Only staff accounts already authorized in the main app can open resident records or perform role-restricted actions.</p>
 </div>
}
