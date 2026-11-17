// Pure presentation copy contracts, not GUI or guaranteed-win assertions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { getStage, ENCOUNTERS, createSave } from '../assets/scripts/core/game.ts';
import { ENCOUNTER_GUIDES, getEncounterGuide, GUIDE_SUGGESTION_HEADING } from '../assets/scripts/presentation/EncounterGuide.ts';

test('eighteen unique guides correspond exactly to authored stage lesson IDs', () => {
 const ids = Array.from({length:18}, (_,i) => getStage(i+1).encounter.lessonId);
 assert.equal(new Set(ids).size,18);
 assert.deepEqual(Object.keys(ENCOUNTER_GUIDES).sort(), [...ids].sort());
 for (const id of ids) assert.equal(getEncounterGuide(id).lessonId,id);
 assert.equal(GUIDE_SUGGESTION_HEADING,'可以试试');
});

test('short teaching and suggestions contain no invented mechanics or guaranteed wins', () => {
 for (const guide of Object.values(ENCOUNTER_GUIDES)) {
  for (const text of [guide.beforeBattle,guide.suggestion]) {
   assert.ok(text.length>0 && Array.from(text).length<=28, `${guide.lessonId}: ${text}`);
   assert.doesNotMatch(text,/冰冻|嘲讽|必胜|保证胜利|必须购买|必须招募|失败原因/);
  }
 }
 const row=getEncounterGuide('choose-target-row');
 assert.match(row.beforeBattle,/站上行.*后排/);assert.match(row.suggestion,/上行后列/);
 assert.match(getEncounterGuide('front-and-back').beforeBattle,/全场最前存活列/);
 assert.match(getEncounterGuide('commander-targets').beforeBattle,/平手优先上行/);
 assert.match(getEncounterGuide('dense-row').beforeBattle,/火球命中中行/);
 assert.match(getEncounterGuide('cloud-trial').beforeBattle,/九位.*五种职业/);
});

test('continuation and unknown or prototype names do not receive fabricated lessons', () => {
 for (const stage of [19,30,100]) assert.equal(getEncounterGuide(getStage(stage).encounter.lessonId),null);
 for (const id of ['continuation','','missing','toString','constructor','__proto__']) assert.equal(getEncounterGuide(id),null);
});

test('guide mapping is deeply immutable and lookup never changes core config or save', () => {
 const save=createSave(),beforeSave=JSON.stringify(save),beforeConfig=JSON.stringify(ENCOUNTERS);
 assert.ok(Object.isFrozen(ENCOUNTER_GUIDES));
 for(const guide of Object.values(ENCOUNTER_GUIDES)) {
  assert.ok(Object.isFrozen(guide));
  assert.throws(()=>{guide.suggestion='必胜';},TypeError);
  assert.equal(getEncounterGuide(guide.lessonId),guide);
 }
 assert.throws(()=>{ENCOUNTER_GUIDES.fake={};},TypeError);
 assert.equal(JSON.stringify(save),beforeSave);assert.equal(JSON.stringify(ENCOUNTERS),beforeConfig);
});
