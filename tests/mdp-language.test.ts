import test from 'node:test';
import assert from 'node:assert/strict';
import {translateMdpText} from '../lib/mdp-language.ts';

test('MDP language labels switch between English and Dhivehi',()=>{
 assert.equal(translateMdpText('Residents','dv'),'ދިރިއުޅުންތައް');
 assert.equal(translateMdpText('Residents','en'),'Residents');
 assert.equal(translateMdpText('Export CSV','en'),'Export CSV');
 assert.equal(translateMdpText('pending','dv'),'ބަލަން ޖެހޭ');
});

test('dynamic resident counts and pages preserve their numbers in Dhivehi',()=>{
 assert.equal(translateMdpText('Page 2 of 9','dv'),'ޞަފްޙާ 2 / 9');
 assert.equal(translateMdpText('125 residents','dv'),'125 ދިރިއުޅުންތައް');
});
