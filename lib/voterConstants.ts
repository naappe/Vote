export const VOTER_TABS=['Overview','Call Center','Door-to-Door','Candidate Visit','Election Day','Remarks'] as const;

export const STATUS_LABELS:Record<string,string>={
  'will-vote':'Will vote',
  'not-decided':'Not decided',
  'not-vote':'Not voting',
  reached:'Reached',
  'not-reached':'Not reached',
  called:'Called',
  'need-call':'Need call',
  guaranteed:'Guaranteed',
  'not-guaranteed':'Not guaranteed',
  'not-visited':'Not visited',
  reach:'Visited',
  'not-home':'Not home',
  'live-in-another-place':'Lives elsewhere'
};

export const STATUS_STYLES:Record<string,string>={
  'will-vote':'bg-emerald-100 text-emerald-700',
  'not-decided':'bg-amber-100 text-amber-700',
  'not-vote':'bg-rose-100 text-rose-700',
  reached:'bg-primary-light text-primary',
  'not-reached':'bg-slate-100 text-body',
  called:'bg-violet-100 text-violet-700',
  'need-call':'bg-orange-100 text-orange-700',
  guaranteed:'bg-emerald-100 text-emerald-700',
  'not-guaranteed':'bg-slate-100 text-body',
  'not-visited':'bg-slate-100 text-body',
  reach:'bg-primary-light text-primary',
  'not-home':'bg-amber-100 text-amber-700',
  'live-in-another-place':'bg-violet-100 text-violet-700'
};

export function residentInitials(name?:string|null){
  return (name||'?').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'?';
}

export function statusLabel(status?:string|null){
  const key=status||'not-decided';
  return STATUS_LABELS[key]||key.replaceAll('-',' ');
}