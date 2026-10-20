/** Minimal Office Open XML writer: no external browser dependency. */
type ExcelCell=string|number|boolean|null|undefined;
export type ExcelSheet={name:string;headers:string[];rows:ExcelCell[][]};
const enc=new TextEncoder();
function xml(value:unknown){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');}
function excelColumn(index:number){let s='';for(let n=index+1;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s}
function cell(value:ExcelCell,column:number,row:number,isHeading=false){
 const ref=excelColumn(column)+row;
 if(typeof value==='number'&&Number.isFinite(value))return `<c r="${ref}"${isHeading?' s="1"':''}><v>${value}</v></c>`;
 if(typeof value==='boolean')return `<c r="${ref}" t="b"><v>${value?1:0}</v></c>`;
 // Inline strings are not interpreted as formulas even when they start with =.
 const safe=xml(value);
 return `<c r="${ref}" t="inlineStr"${isHeading?' s="1"':''}><is><t xml:space="preserve">${safe}</t></is></c>`;
}
function worksheet(sheet:ExcelSheet){
 const rows=[sheet.headers,...sheet.rows];
 const body=rows.map((values,index)=>`<row r="${index+1}">${values.map((v,col)=>cell(v,col,index+1,index===0)).join('')}</row>`).join('');
 const end=excelColumn(Math.max(0,sheet.headers.length-1));
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="16"/><sheetData>${body}</sheetData><autoFilter ref="A1:${end}${Math.max(1,rows.length)}"/></worksheet>`;
}
const table:number[]=(()=>{const t:number[]=[];for(let n=0;n<256;n++){let c=n;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;t.push(c>>>0)}return t})();
function crc(bytes:Uint8Array){let c=0xffffffff;for(const v of bytes)c=table[(c^v)&255]^(c>>>8);return (c^0xffffffff)>>>0}
function u16(v:number){return [v&255,(v>>>8)&255]}
function u32(v:number){return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]}
function makeZip(files:{name:string;content:string}[]){
 const pieces:Uint8Array[]=[];const central:Uint8Array[]=[];let position=0;
 for(const file of files){
  const filename=enc.encode(file.name),data=enc.encode(file.content),sum=crc(data);
  const local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(sum),...u32(data.length),...u32(data.length),...u16(filename.length),...u16(0),...filename]);
  pieces.push(local,data);
  central.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(sum),...u32(data.length),...u32(data.length),...u16(filename.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(position),...filename]));
  position+=local.length+data.length;
 }
 const directorySize=central.reduce((total,item)=>total+item.length,0);
 const end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(directorySize),...u32(position),...u16(0)]);
 const total=position+directorySize+end.length,out=new Uint8Array(total);let offset=0;
 for(const chunk of [...pieces,...central,end]){out.set(chunk,offset);offset+=chunk.length}
 return out;
}
export function buildExcelWorkbook(sheets:ExcelSheet[]):Uint8Array{
 if(!sheets.length)throw new Error('At least one worksheet is required');
 const types=['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">','<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>','<Default Extension="xml" ContentType="application/xml"/>','<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>','<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',...sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`),'</Types>'].join('');
 const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${xml(s.name.slice(0,31))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`;
 const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
 const files=[
 {name:'[Content_Types].xml',content:types},
 {name:'_rels/.rels',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
 {name:'xl/workbook.xml',content:workbook},
 {name:'xl/_rels/workbook.xml.rels',content:rels},
 {name:'xl/styles.xml',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>'},
 ...sheets.map((s,i)=>({name:`xl/worksheets/sheet${i+1}.xml`,content:worksheet(s)}))
 ];
 return makeZip(files);
}
