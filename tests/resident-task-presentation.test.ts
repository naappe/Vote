import test from 'node:test';
import assert from 'node:assert/strict';
import {residentTaskCards} from '../lib/resident-task-presentation.ts';

test('unrecorded resident tasks show Pending and no completion tick',()=>{
 const cards=residentTaskCards({callAttempts:0,callOutcome:null,voteStatus:null,visitStatus:null,transportStatus:null,hasRemarks:false});
 assert.equal(cards.length,6);
 assert.ok(cards.every(card=>card.status==='Pending'&&!card.done));
});

test('saved outcomes show clear status and completed tasks get a check',()=>{
 const cards=residentTaskCards({callAttempts:1,callOutcome:'connected',voteStatus:'not-decided',hasVoteIntention:true,visitStatus:'visited',hasInPersonMeeting:true,transportStatus:'completed',hasRemarks:true});
 assert.deepEqual(cards.map(card=>card.done),[true,true,true,true,true,true]);
 assert.equal(cards.find(card=>card.id==='call')?.label,'Call');
 assert.equal(cards.find(card=>card.id==='call')?.status,'Connected');
 assert.equal(cards.find(card=>card.id==='transport')?.status,'Completed');
});

test('in-person meeting is tracked separately from an uncompleted door visit',()=>{
 const cards=residentTaskCards({callAttempts:0,callOutcome:null,voteStatus:null,visitStatus:'not-home',hasInPersonMeeting:true,transportStatus:null,hasRemarks:true});
 assert.equal(cards.find(card=>card.id==='door-to-door')?.done,false);
 assert.equal(cards.find(card=>card.id==='in-person-meeting')?.status,'Met');
 assert.equal(cards.find(card=>card.id==='in-person-meeting')?.done,true);
});

test('a default not-decided value is not shown as a completed intention',()=>{
 const card=residentTaskCards({callAttempts:1,callOutcome:'connected',voteStatus:'not-decided',visitStatus:null,transportStatus:null,hasRemarks:false}).find(item=>item.id==='voting-intention');
 assert.equal(card?.status,'Pending');
 assert.equal(card?.done,false);
});

test('a door visit marked not home stays pending because nobody was reached',()=>{
 const card=residentTaskCards({callAttempts:0,callOutcome:null,voteStatus:null,visitStatus:'not-home',transportStatus:null,hasRemarks:false}).find(item=>item.id==='door-to-door');
 assert.equal(card?.status,'Not home · pending');
 assert.equal(card?.done,false);
});

test('an unattempted door-to-door task remains pending and incomplete',()=>{
 const task=residentTaskCards({callAttempts:0,callOutcome:null,voteStatus:null,visitStatus:'not-visited',transportStatus:null,hasRemarks:false}).find(item=>item.id==='door-to-door');
 assert.equal(task?.status,'Pending');
 assert.equal(task?.done,false);
});

test('a call reset to pending stays incomplete even when earlier attempts exist',()=>{
 const task=residentTaskCards({callAttempts:2,callOutcome:'pending',voteStatus:null,visitStatus:null,transportStatus:null,hasRemarks:false}).find(item=>item.id==='call');
 assert.equal(task?.status,'Follow-up');
 assert.equal(task?.done,false);
});
