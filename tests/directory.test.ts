import test from 'node:test';
import assert from 'node:assert/strict';
import {mdpResidentsCsv,residentsCsv,collectDirectoryPages} from '../lib/directory-utils.ts';

test('CSV retains registration numbers, handles commas and neutralizes spreadsheet formulas',()=>{
 const csv=residentsCsv([{id:7,name:'=HYPERLINK("bad")',national_id:'A012345',house:'No RS 1172',lives_in:'House, flat 2',phone:'0777777',party:'Verify party'}]);
 assert.ok(csv.startsWith('\uFEFF'));
 assert.ok(csv.includes('No RS 1172'));
 assert.ok(csv.includes('"House, flat 2"'));
 assert.ok(csv.includes("\"'=HYPERLINK"));
 assert.ok(csv.includes('0777777'));
});
test('MDP CSV uses an explicit allowlist without party or photo fields',()=>{
 const csv=mdpResidentsCsv([{id:9,name:'Resident',national_id:'A123456',house:'House 1',party:'MDP',photo_url:'https://example.test/photo'}]);
 const header=csv.split('\r\n')[0];
 assert.match(header,/Record ID,National ID,Name/);
 assert.doesNotMatch(header,/Party|Photo/i);
 assert.doesNotMatch(csv,/MDP|example\.test/i);
});
test('filtered export collects all result pages rather than only the visible page',async()=>{
 const calls:number[]=[];
 const rows=await collectDirectoryPages(async page=>{calls.push(page);return {rows:page===1?[{id:1},{id:2}]:[{id:3}],count:3}});
 assert.deepEqual(rows.map(r=>r.id),[1,2,3]);
 assert.deepEqual(calls,[1,2]);
});
test('export fails visibly when a response ends before its reported total',async()=>{
 await assert.rejects(()=>collectDirectoryPages(async()=>({rows:[],count:10})),/changed|incomplete/i);
});
