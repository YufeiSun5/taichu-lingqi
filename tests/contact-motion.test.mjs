import test from 'node:test';
import assert from 'node:assert/strict';
import {contactOffsets,boundedRetreat} from '../assets/scripts/presentation/ContactMotion.ts';
test('contact motion has fixed bounded travel, a 45ms contact hold, and no accumulated displacement',()=>{
 for(let i=0;i<1000;i++){const t=i/1000,value=contactOffsets(t);assert.ok(value.actor>=0&&value.actor<=12);assert.ok(value.target>=0&&value.target<=6);if(t>=.34)assert.deepEqual(value,{actor:0,target:0});}
 for(const t of [.14,.15,.17,.185])assert.deepEqual(contactOffsets(t),{actor:12,target:0});
 assert.deepEqual(contactOffsets(.22),{actor:12*(1-(.22-.185)/(.34-.185)),target:6});
 assert.equal(boundedRetreat(358,1),2);assert.equal(boundedRetreat(-358,-1),2);assert.equal(boundedRetreat(370,1),0);assert.equal(boundedRetreat(-370,-1),0);assert.equal(boundedRetreat(300,1),6);
});
