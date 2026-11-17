import test from 'node:test';
import assert from 'node:assert/strict';
import {createSave,getUnlockedSlots,getStage,setFormation,recruit,upgradeCommander,selectCommanderSkill,validateSave,simulateBattle,settleBattle} from '../assets/scripts/core/game.ts';
test('formation expansion 4 → 6 → 9',()=>{assert.equal(getUnlockedSlots(1).length,4);assert.equal(getUnlockedSlots(7).length,6);assert.equal(getUnlockedSlots(13).length,9);});
test('six waves per background and endless regions',()=>{assert.equal(getStage(6).wave,6);assert.equal(getStage(7).wave,1);assert.notEqual(getStage(6).regionIndex,getStage(7).regionIndex);assert.equal(getStage(1000).number,1000);});
test('placement swaps, ownership and locked slots',()=>{let s=createSave();let n=setFormation(s,1,'guard');assert.equal(n.formation[1],'guard');assert.equal(n.formation[0],'healer');assert.equal(s.formation[0],'guard');assert.throws(()=>setFormation(s,2,'guard'));assert.throws(()=>setFormation(s,0,'blade'));});
test('recruit and commander spending cannot go negative',()=>{let s=createSave();s=recruit(s,'archer');assert.equal(s.coins,0);assert.throws(()=>recruit(s,'archer'));assert.throws(()=>upgradeCommander(s));});
test('battle deterministic, read-only, bounded and replayable',()=>{let s=createSave();let before=JSON.stringify(s);let a=simulateBattle(s);assert.deepEqual(a,simulateBattle(s));assert.equal(JSON.stringify(s),before);assert(a.rounds<=40);let hp=new Map(a.initialUnits.map(u=>[u.uid,u.hp]));for(const e of a.events){if(e.hp!==undefined)hp.set(e.target,e.hp);}for(const u of a.units){assert.equal(hp.get(u.uid),u.hp);assert(u.hp>=0&&u.hp<=u.maxHp);}assert.equal(a.winner,'ally');});
test('commander once opening, sword rain covers all; fireball row',()=>{let s=createSave(),a=simulateBattle(s);let c=a.events.filter(e=>e.type==='commander');assert.equal(c.length,4);assert(c.every(e=>e.round===0));a=simulateBattle(selectCommanderSkill(s,'fireball'));assert.equal(a.events.filter(e=>e.type==='commander').length,2);});
test('settlement does not double reward or advance stale results',()=>{let s=createSave(),r=simulateBattle(s),n=settleBattle(s,r);assert.equal(n.stage,2);assert.equal(n.coins,125);assert.deepEqual(settleBattle(n,r),n);assert.equal(s.stage,1);assert.deepEqual(settleBattle(s,{...r,winner:'enemy'}),s);});
test('empty formation and invalid save rejected',()=>{let s=createSave();s.formation.fill(null);assert.throws(()=>simulateBattle(s));assert.throws(()=>validateSave({...createSave(),coins:-1}));assert.throws(()=>validateSave({...createSave(),formation:Array(9).fill('guard')}));});
test('nine units per side have unique IDs and finish',()=>{let s=createSave();s.stage=13;s.owned=['guard','sword','healer','mage','archer','frost','monk','blade','lotus'];s.formation=[...s.owned];let r=simulateBattle(s);assert.equal(r.units.length,18);assert.equal(new Set(r.units.map(u=>u.uid)).size,18);assert(r.rounds<=40);});
test('dead units never act and melee respects front blockers',()=>{let s=createSave();let r=simulateBattle(s);const state=new Map(r.initialUnits.map(u=>[u.uid,{...u}]));for(const e of r.events){if(e.type==='attack'||e.type==='heal'){assert(state.get(e.actor).hp>0,'dead actor acted');}if(e.type==='attack'){const actor=state.get(e.actor),target=state.get(e.target);if(actor.role==='sword'||actor.role==='guard'||actor.role==='healer'){const foes=[...state.values()].filter(u=>u.side!==actor.side&&u.hp>0);assert.equal(target.col,Math.min(...foes.map(u=>u.col)));}}if(e.hp!==undefined)state.get(e.target).hp=e.hp;}});
test('commander can end battle without dead enemy acting',()=>{let s=createSave();s.commanderLevel=100;let r=simulateBattle(s);assert.equal(r.winner,'ally');assert.equal(r.rounds,0);assert.equal(r.events.filter(e=>e.type==='attack').length,0);});
test('failure advances neither stage nor coins',()=>{let s=createSave();s.formation.fill(null);s.formation[1]='healer';s.stage=100;let r=simulateBattle(s);assert.notEqual(r.winner,'ally');assert.deepEqual(settleBattle(s,r),s);});

test('legacy save gets defaults and custom rules persist without mutation',async()=>{const {getStrategy,setStrategy}=await import('../assets/scripts/core/game.ts');let s=createSave();assert.equal(getStrategy(s,'healer')[0].condition,'allyInjured');const rules=[{skill:'attack',condition:'always',target:'front'}];let n=setStrategy(s,'healer',rules);rules[0].target='back';assert.equal(getStrategy(n,'healer')[0].target,'front');assert.equal(s.strategies,undefined);assert.deepEqual(validateSave(JSON.parse(JSON.stringify(n))),n);assert.throws(()=>setStrategy(s,'blade',rules));assert.throws(()=>setStrategy(s,'healer',[]));assert.throws(()=>validateSave({...s,strategies:{healer:[{skill:'bogus'}]}}));});
test('priority order actually changes action choice',async()=>{const {setStrategy}=await import('../assets/scripts/core/game.ts');const attack={skill:'attack',condition:'always',target:'front'},special={skill:'classSkill',condition:'always',target:'front'};const first=s=>simulateBattle(s).events.find(e=>e.actor==='ally-4'&&e.type==='attack');assert.equal(first(setStrategy(createSave(),'mage',[attack,special])).skill,'普通攻击');assert.equal(first(setStrategy(createSave(),'mage',[special,attack])).skill,'灵焰横扫');});
test('first-round condition falls back next round and ranged back target works',async()=>{const {setStrategy}=await import('../assets/scripts/core/game.ts');let s=setStrategy(createSave(),'mage',[{skill:'classSkill',condition:'firstRound',target:'back'},{skill:'attack',condition:'always',target:'front'}]);let r=simulateBattle(s);let first=r.events.find(e=>e.actor==='ally-4'&&e.type==='attack');assert.equal(first.round,1);assert.equal(first.skill,'灵焰横扫');assert(r.events.filter(e=>e.actor==='ally-4'&&e.type==='attack'&&e.round>1).every(e=>e.skill==='普通攻击'));let ar=recruit(createSave(),'archer');ar=setFormation(ar,3,'archer');ar=setStrategy(ar,'archer',[{skill:'attack',condition:'always',target:'back'}]);r=simulateBattle(ar);first=r.events.find(e=>e.actor==='ally-3'&&e.type==='attack');assert.equal(r.initialUnits.find(u=>u.uid===first.target).col,1);});
test('half-health heal rules never heal an above-half target',async()=>{const {setStrategy}=await import('../assets/scripts/core/game.ts');let s=createSave();s.stage=6;s=setStrategy(s,'healer',[{skill:'classSkill',condition:'allyBelowHalf',target:'weakest'},{skill:'attack',condition:'always',target:'front'}]);const r=simulateBattle(s);const state=new Map(r.initialUnits.map(u=>[u.uid,{...u}]));let count=0;for(const e of r.events){if(e.type==='heal'&&e.actor==='ally-1'){const t=state.get(e.target);assert(t.hp/t.maxHp<.5);count++;}if(e.hp!==undefined)state.get(e.target).hp=e.hp;}assert(count>0);});

test('default guard and sword strategies prefer class skill with attack fallback', async () => {
 const { getStrategy } = await import('../assets/scripts/core/game.ts');
 const legacy = validateSave(JSON.parse(JSON.stringify(createSave())));
 const before = JSON.stringify(legacy);
 for (const id of ['guard', 'sword', 'monk', 'blade']) {
  assert.deepEqual(getStrategy(legacy, id), [
   { skill: 'classSkill', condition: 'always', target: 'front' },
   { skill: 'attack', condition: 'always', target: 'front' },
  ]);
 }
 const result = simulateBattle(legacy);
 assert.equal(result.events.find(e => e.actor === 'ally-0' && e.type === 'attack').skill, '镇岳击');
 assert.equal(result.events.find(e => e.actor === 'ally-3' && e.type === 'attack').skill, '破阵斩');
 assert.equal(JSON.stringify(legacy), before);
 assert.equal(legacy.strategies, undefined, 'legacy schema is not rewritten');
});

test('custom melee attack rules override new defaults unchanged across save reload', async () => {
 const { getStrategy, setStrategy } = await import('../assets/scripts/core/game.ts');
 for (const [id, uid] of [['guard', 'ally-0'], ['sword', 'ally-3']]) {
  const rules = [{ skill: 'attack', condition: 'always', target: 'front' }];
  const save = validateSave(JSON.parse(JSON.stringify(setStrategy(createSave(), id, rules))));
  assert.deepEqual(getStrategy(save, id), rules);
  assert.equal(simulateBattle(save).events.find(e => e.actor === uid && e.type === 'attack').skill, '普通攻击');
  const returned = getStrategy(save, id); returned[0].skill = 'classSkill';
  assert.deepEqual(getStrategy(save, id), rules, 'returned rules remain isolated copies');
 }
});

test('normal public-API recruitment and upgrades clear first thirteen stages', async () => {
 const { RECRUIT_COST, commanderUpgradeCost } = await import('../assets/scripts/core/game.ts');
 let save = createSave();
 for (let stage = 1; stage <= 13; stage++) {
  assert.equal(save.stage, stage);
  for (const id of ['blade', 'monk', 'lotus', 'archer', 'frost']) {
   if (save.coins >= RECRUIT_COST && !save.owned.includes(id)) save = recruit(save, id);
  }
  const ids = ['monk', 'lotus', 'blade', 'frost', 'guard', 'mage', 'archer', 'sword', 'healer'].filter(id => save.owned.includes(id));
  for (const [i, slot] of getUnlockedSlots(save.stage).entries()) {
   if (ids[i]) save = setFormation(save, slot, ids[i]);
  }
  while (save.coins >= commanderUpgradeCost(save)) save = upgradeCommander(save);
  const result = simulateBattle(save);
  assert.equal(result.winner, 'ally', `public-API progression stalled on stage ${stage}`);
  save = settleBattle(save, result);
  assert.equal(save.coins >= 0, true);
 }
 assert.equal(save.stage, 14);
 assert.equal(save.formation.filter(Boolean).length, 9);
 assert.equal(save.cleared.length, 13);
});
