import test from 'node:test';
import assert from 'node:assert/strict';
import {clampPage,pageCount,votingStatusLabel} from '../lib/mdp-voting-utils.ts';

test('turnout labels are neutral',()=>{
 assert.equal(votingStatusLabel(true),'Voted');
 assert.equal(votingStatusLabel(false),'Pending · not yet recorded');
});

test('voting-day pagination clamps to available pages',()=>{
 assert.equal(pageCount(61,30),3);
 assert.equal(clampPage(9,61,30),3);
 assert.equal(clampPage(0,0,30),1);
});
