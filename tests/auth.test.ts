import test from 'node:test';
import assert from 'node:assert/strict';
import {loginEmail,authErrorMessage} from '../lib/auth-utils.ts';

test('administrator username resolves to the existing email account',()=>{
 assert.equal(loginEmail(' Naappe '),'naappe@gmail.com');
 assert.equal(loginEmail('STAFF_1'),'staff_1@users.voteoperations.app');
 assert.equal(loginEmail(' Name@Example.com '),'name@example.com');
});
test('network failures give a useful retry message without exposing credentials',()=>{
 assert.match(authErrorMessage(new TypeError('Failed to fetch')),/connection/i);
 assert.match(authErrorMessage({message:'Invalid login credentials'}),/email or password/i);
 assert.equal(authErrorMessage({message:'Account is disabled.'}),'Account is disabled.');
});
