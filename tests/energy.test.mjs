// Pure rules only: no Creator runtime, rendering, or GUI acceptance is implied.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../assets/scripts/core/game.ts';
const skill={skill:'classSkill',condition:'always',target:'front'};
const basic={skill:'attack',condition:'always',target:'front'};
const actions=(r,uid)=>r.events.filter(e=>e.type==='action'&&e.actor===uid);
function verifyReplay(result){
 const state=new Map(result.initialUnits.map(u=>[u.uid,{...u}]));
 for(const u of state.values())assert.equal(u.energy,2);
 let pending=null, effects=0;
 const flush=()=>{if(pending){assert(effects>0,'action must have effects');state.get(pending.actor).energy=pending.energyAfter;}pending=null;effects=0;};
 for(const e of result.events){
  if(e.type==='action'){
   flush();const u=state.get(e.actor);assert(u.hp>0);assert.equal(e.energyBefore,u.energy);
   assert(Number.isInteger(e.ruleIndex)&&e.ruleIndex>=-1);
   assert.equal(e.energyAfter,e.actionSkill==='classSkill'?u.energy-2:Math.min(2,u.energy+1));
   assert(e.energyAfter>=0&&e.energyAfter<=2);pending=e;
  }else if(e.type==='end')flush();
  else if(e.type==='attack'||e.type==='heal'){
   assert(pending);assert.equal(e.actor,pending.actor);effects++;
  }else if(e.type==='commander'){assert.equal(pending,null);assert.equal(e.energyAfter,undefined);}
  if(e.hp!==undefined)state.get(e.target).hp=e.hp;
 }
 assert.equal(result.events.at(-1).type,'end');
 for(const u of result.units){assert.equal(state.get(u.uid).hp,u.hp);assert.equal(state.get(u.uid).energy,u.energy);}
}
test('energy replay rebuilds HP and energy symmetrically, deterministically and without save mutation',()=>{
 for(const stage of [1,6,7,12,13,30]){ // Synthetic stages are rule fixtures, NOT a progression journey.
  const s=g.createSave();s.stage=stage;const before=JSON.stringify(s);const r=g.simulateBattle(s);
  verifyReplay(r);assert.deepEqual(r,g.simulateBattle(s));assert.equal(JSON.stringify(s),before);
  assert(r.events.some(e=>e.type==='action'&&e.actor.startsWith('enemy')));
 }
});
test('insufficient energy checks next rule; skill-only strategies fall back without waiting',()=>{
 let s=g.createSave();s.stage=6;
 let a=actions(g.simulateBattle(s),'ally-0');
 assert.deepEqual(a.slice(0,3).map(e=>[e.actionSkill,e.energyBefore,e.energyAfter,e.ruleIndex]),[['classSkill',2,0,0],['attack',0,1,1],['attack',1,2,1]]);
 s=g.setStrategy(s,'guard',[skill]);a=actions(g.simulateBattle(s),'ally-0');
 assert.deepEqual(a.slice(0,3).map(e=>e.ruleIndex),[0,-1,-1]);
});
test('full energy can be conserved and basic recovery is capped; unmet skills do not spend',()=>{
 let s=g.setStrategy(g.createSave(),'guard',[{...skill,condition:'allyBelowHalf'},basic]);
 const first=actions(g.simulateBattle(s),'ally-0')[0];assert.equal(first.actionSkill,'attack');assert.equal(first.energyBefore,2);assert.equal(first.energyAfter,2);
 s=g.setStrategy(g.createSave(),'guard',[basic]);assert(actions(g.simulateBattle(s),'ally-0').every(e=>e.energyAfter===2));
 // Synthetic stage 18: all surviving allies are full; defeated allies are not valid heal targets.
 const fixture=g.setStrategy(g.createSave(),'healer',[skill,basic]);fixture.stage=18;
 const replay=g.simulateBattle(fixture), hp=new Map(replay.initialUnits.map(u=>[u.uid,{...u}]));
 for(const e of replay.events){if(e.type==='action'&&e.actor==='ally-1')break;if(e.hp!==undefined)hp.get(e.target).hp=e.hp;}
 assert([...hp.values()].filter(u=>u.side==='ally'&&u.hp>0).every(u=>u.hp===u.maxHp));
 const heal=actions(replay,'ally-1')[0];assert.equal(heal.actionSkill,'attack');assert.equal(heal.energyAfter,2);
});
test('mage multi-target skill consumes once; death never grants an extra action',()=>{
 const r=g.simulateBattle(g.createSave());let found=false;
 for(let i=0;i<r.events.length;i++){const e=r.events[i];if(e.type!=='action'||e.actionSkill!=='classSkill')continue;
  const effects=[];for(let j=i+1;j<r.events.length&&!['action','end'].includes(r.events[j].type);j++)effects.push(r.events[j]);
  if(effects.filter(x=>x.type==='attack').length>1){found=true;assert.equal(e.energyBefore,2);assert.equal(e.energyAfter,0);}
 }assert(found);verifyReplay(r);
});
test('commander-only victory leaves initial energy untouched',()=>{
 const s=g.createSave();s.commanderLevel=100;const r=g.simulateBattle(s);
 assert.equal(r.rounds,0);assert.equal(r.events.filter(e=>e.type==='action').length,0);verifyReplay(r);
});
function equip(s){const ids=['monk','lotus','blade','frost','guard','mage','archer','sword','healer'].filter(id=>s.owned.includes(id));for(const [i,slot]of g.getUnlockedSlots(s.stage).entries())if(ids[i])s=g.setFormation(s,slot,ids[i]);return s;}
test('both commander choices and healer conditions clear 1–13 with normal earnings',()=>{
 for(const commander of ['swordRain','fireball'])for(const condition of ['allyInjured','allyBelowHalf']){
  let s=g.selectCommanderSkill(g.createSave(),commander);
  for(let stage=1;stage<=13;stage++){
   for(const id of ['blade','monk','lotus','archer','frost'])if(s.coins>=80&&!s.owned.includes(id))s=g.recruit(s,id);
   s=equip(s);for(const id of ['healer','lotus'])if(s.owned.includes(id))s=g.setStrategy(s,id,[{...skill,condition,target:'weakest'},basic]);
   while(s.coins>=g.commanderUpgradeCost(s))s=g.upgradeCommander(s);
   const r=g.simulateBattle(s);assert.equal(r.winner,'ally',JSON.stringify({commander,condition,stage,coins:s.coins,level:s.commanderLevel}));verifyReplay(r);
   if(stage===7||stage===13)assert.equal(s.formation.filter(Boolean).length,stage===7?6:9);
   s=g.settleBattle(s,r);assert(s.coins>=0);
  }assert.equal(s.stage,14);assert.equal(s.cleared.length,13);
 }
});
test('no-spend and commander-first routes recover their first loss with earned funds',()=>{
 for(const mode of ['none','upgrade']){
  let s=g.createSave(),failed;
  for(let i=0;i<30;i++){
   if(mode==='upgrade')while(s.coins>=g.commanderUpgradeCost(s))s=g.upgradeCommander(s);
   const r=g.simulateBattle(s);if(r.winner!=='ally'){failed=r;break;}s=g.settleBattle(s,r);
  }
  assert(failed,'fixture must actually encounter failure');
  assert.deepEqual(g.settleBattle(s,failed),s,'failure costs no money/progress');
  assert.deepEqual(g.simulateBattle(s),failed,'retry resets energy and reproduces result');
  assert.equal(s.stage,mode==='none'?6:10);assert.equal(s.coins,mode==='none'?355:215);
  if(mode==='none')while(s.coins>=g.commanderUpgradeCost(s))s=g.upgradeCommander(s);
  else for(const id of ['blade','monk','lotus'])if(s.coins>=80){s=g.recruit(s,id);s=g.setFormation(s,g.getUnlockedSlots(s.stage).find(slot=>!s.formation[slot]),id);}
  const recovered=g.simulateBattle(s);assert.equal(recovered.winner,'ally');verifyReplay(recovered);
  assert.equal(s.coins,mode==='none'?175:55);assert.equal(g.settleBattle(s,recovered).stage,s.stage+1);
 }
});
