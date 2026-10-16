type ExportRow={id:string|number;name?:string|null;national_id?:string|null;house?:string|null;lives_in?:string|null;phone?:string|null;age?:number|null;sex?:string|null;election_box?:string|null;party?:string|null;photo_url?:string|null};
function csvCell(value:unknown){
 let text=value==null?'':String(value);
 if(/^[\s]*[=+@\-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
 return /[",\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;
}
export function residentsCsv(rows:ExportRow[]){
 const columns:[keyof ExportRow,string][]=[['id','Record ID'],['national_id','National ID'],['name','Name'],['house','Official address / registration'],['lives_in','Living now'],['phone','Phone'],['age','Age'],['sex','Gender'],['election_box','Election box'],['party','Party'],['photo_url','Photo link']];
 return '\uFEFF'+[columns.map(([,title])=>csvCell(title)).join(','),...rows.map(row=>columns.map(([key])=>csvCell(row[key])).join(','))].join('\r\n');
}
export function mdpResidentsCsv(rows:ExportRow[]){
 const columns:[keyof ExportRow,string][]=[['id','Record ID'],['national_id','National ID'],['name','Name'],['house','Official address / registration'],['lives_in','Living now'],['phone','Phone'],['age','Age'],['sex','Gender'],['election_box','Election box']];
 return '\uFEFF'+[columns.map(([,title])=>csvCell(title)).join(','),...rows.map(row=>columns.map(([key])=>csvCell(row[key])).join(','))].join('\r\n');
}
export async function collectDirectoryPages<T>(fetchPage:(page:number)=>Promise<{rows:T[];count:number}>,progress?:(loaded:number,total:number)=>void):Promise<T[]>{
 const rows:T[]=[];let expected:number|undefined;
 for(let page=1;;page++){
  const result=await fetchPage(page);
  if(expected===undefined)expected=result.count;
  if(result.count!==expected)throw new Error('Results changed during export. Please retry.');
  if(!result.rows.length&&rows.length<expected)throw new Error('Export is incomplete. Please retry.');
  rows.push(...result.rows);progress?.(rows.length,expected);
  if(rows.length>=expected)return rows;
 }
}
