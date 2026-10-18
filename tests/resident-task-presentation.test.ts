import test from 'node:test';
import assert from 'node:assert/strict';
import {residentTaskCards} from '../lib/resident-task-presentation.ts';

test('unrecorded resident tasks show Pending and no completion tick',()=>{
 const cards=residentTaskCards({callAttempts:0,callOutcome:null,voteStatus:null,visitStatus:null,transportStatus:null,hasRemarks:false});
 assert.equal(cards.length,5);
 assert.ok(cards.every(card=>card.status==='Pending'&&!card.done));
});

test('saved outcomes show clear status and completed tasks get a check',()=>{
 const cards=residentTaskCards({callAttempts:1,callOutcome:'connected',voteStatus:'not-decided',visitStatus:'visited',transportStatus:'completed',hasRemarks:true});
 assert.deepEqual(cards.map(card=>card.done),[true,true,true,true,true]);
 assert.equal(cards.find(card=>card.id==='call')?.status,'Connected · 1 attempt');
 assert.equal(cards.find(card=>card.id==='transport')?.status,'Completed');
});
