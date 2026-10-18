import test from 'node:test';
import assert from 'node:assert/strict';
import {residentTaskCards} from '../lib/resident-task-presentation.ts';

test('unrecorded resident tasks show Pending and no completion tick',()=>{
 const cards=residentTaskCards({callAttempts:0,callOutcome:null,voteStatus:null,visitStatus:null,transportStatus:null,hasRemarks:false});
 assert.equal(cards.length,5);
 assert.ok(cards.every(card=>card.status==='Pending'&&!card.done));
});

test('saved outcomes show clear status and completed tasks get a check',()=>{
 const cards=residentTaskCards({callAttempts:1,callOutcome:'connected',voteStatus:'not-decided',hasVoteIntention:true,visitStatus:'visited',transportStatus:'completed',hasRemarks:true});
 assert.deepEqual(cards.map(card=>card.done),[true,true,true,true,true]);
 assert.equal(cards.find(card=>card.id==='call')?.status,'Connected · 1 attempt');
 assert.equal(cards.find(card=>card.id==='transport')?.status,'Completed');
});

test('a default not-decided value is not shown as a completed intention',()=>{
 const card=residentTaskCards({callAttempts:1,callOutcome:'connected',voteStatus:'not-decided',visitStatus:null,transportStatus:null,hasRemarks:false}).find(item=>item.id==='voting-intention');
 assert.equal(card?.status,'Pending');
 assert.equal(card?.done,false);
});

test('a door visit marked not home stays pending because nobody was reached',()=>{
 const card=residentTaskCards({callAttempts:0,callOutcome:null,voteStatus:null,visitStatus:'not-home',transportStatus:null,hasRemarks:false}).find(item=>item.id==='door-to-door');
 assert.equal(card?.status,'Not reached · Not home');
 assert.equal(card?.done,false);
});
