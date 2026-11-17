// Authored content and public-API economy simulations, NOT a Creator GUI journey.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as g from '../assets/scripts/core/game.ts';
const basic={skill:'attack',condition:'always',target:'front'};
const skill={skill:'classSkill',condition:'always',target:'front'};
const fingerprint=e=>e.enemies.map(s=>`${s.slot}:${s.heroId}`).join(' ');
const expected=[
 '0:sword 1:mage 3:guard 4:archer','0:blade 1:sword 3:guard 4:mage',
 '0:guard 1:healer 3:sword 4:mage','0:guard 1:healer 3:monk 4:archer',
 '0:sword 1:mage 3:guard 4:healer','0:monk 1:healer 3:blade 4:mage',
 '0:guard 1:mage 3:sword 4:healer 6:archer','0:guard 1:mage 3:monk 4:healer 6:sword 7:archer',
 '0:guard 1:archer 3:monk 4:mage 6:sword 7:healer','0:guard 1:healer 3:monk 4:lotus 6:archer 7:mage',
 '0:blade 1:archer 3:sword 4:mage 6:guard 7:healer','0:monk 1:lotus 3:blade 4:frost 6:guard 7:archer',
 '0:guard 1:mage 2:healer 3:sword 4:archer 6:monk 7:frost','0:guard 1:mage 2:healer 3:sword 4:archer 5:lotus 6:monk 7:frost 8:blade',
 '0:monk 1:healer 3:guard 4:mage 5:archer 6:sword 7:lotus 8:blade','0:guard 1:archer 2:mage 3:monk 4:blade 5:healer 6:sword 7:frost 8:lotus',
 '0:guard 1:healer 2:lotus 3:monk 4:mage 5:frost 6:sword 7:blade 8:archer','0:monk 1:lotus 2:frost 3:guard 4:mage 5:healer 6:blade 7:sword 8:archer',
];
// Synthetic fixtures below are marked separately from the earned progression routes.
function fixture(stage,full=false){const s=g.createSave();s.stage=stage;if(full){s.owned=g.HEROES.map(h=>h.id);s.formation=Array(9).fill(null);g.getUnlockedSlots(stage).forEach((slot,i)=>s.formation[slot]=s.owned[i]);}return s;}
function verifyReplay(r){
 const state=new Map(r.initialUnits.map(u=>[u.uid,{...u}]));let pending;
 for(const e of r.events){
  if(e.type==='action'||e.type==='end'){if(pending)state.get(pending.actor).energy=pending.energyAfter;pending=undefined;}
  if(e.type==='action'){const u=state.get(e.actor);assert(u.hp>0);assert.equal(e.energyBefore,u.energy);assert.equal(e.energyAfter,e.actionSkill==='classSkill'?u.energy-2:Math.min(2,u.energy+1));pending=e;}
  if(e.hp!==undefined){const u=state.get(e.target);assert(u);u.hp=e.hp;}
 }
 for(const u of r.units){assert.equal(state.get(u.uid).hp,u.hp);assert.equal(state.get(u.uid).energy,u.energy);}
}
test('eighteen distinct authored encounters use legal immutable slots and per-slot strategies',()=>{
 assert.equal(Object.keys(g.ENCOUNTERS).length,18);assert.equal(new Set(expected).size,18);
 for(let n=1;n<=18;n++){
  const stage=g.getStage(n),e=stage.encounter;assert.equal(fingerprint(e),expected[n-1]);assert.equal(e.id,`encounter-${n}`);assert(e.title&&e.lessonId);assert(Object.isFrozen(e)&&Object.isFrozen(e.enemies));
  assert.equal(new Set(e.enemies.map(s=>s.slot)).size,e.enemies.length);assert.deepEqual(stage.enemyIds,e.enemies.map(s=>s.heroId));
  for(const s of e.enemies){assert(g.getUnlockedSlots(n).includes(s.slot));assert(g.HEROES.some(h=>h.id===s.heroId));assert(Object.isFrozen(s));if(s.strategy){assert(Object.isFrozen(s.strategy));for(const rule of s.strategy){assert(Object.isFrozen(rule));assert(g.STRATEGY_SKILLS.some(x=>x.id===rule.skill));assert(g.STRATEGY_CONDITIONS.some(x=>x.id===rule.condition));assert(g.STRATEGY_TARGETS.some(x=>x.id===rule.target));}}}
  stage.enemyIds[0]='invalid';assert.equal(fingerprint(g.getStage(n).encounter),expected[n-1]);
 }
 assert.throws(()=>{g.ENCOUNTERS[9].enemies[1].strategy[0].target='front';},TypeError);
 const overrides=Object.values(g.ENCOUNTERS).flatMap(e=>e.enemies.filter(s=>s.strategy).map(s=>[e.id,s.slot]));assert.deepEqual(overrides,[['encounter-9',1],['encounter-16',1],['encounter-16',2]]);
 assert.equal(new Set(g.HEROES.map(h=>h.role)).size,5,'nine identities remain five roles');
});
test('sparse transition formations keep explicit UID/row/column rather than compacting',()=>{
 for(const [n,count,slots]of [[7,5,[0,1,3,4,6]],[13,7,[0,1,2,3,4,6,7]],[15,8,[0,1,3,4,5,6,7,8]]]){
  const r=g.simulateBattle(fixture(n,true)),enemies=r.initialUnits.filter(u=>u.side==='enemy');assert.equal(enemies.length,count);
  assert.deepEqual(enemies.map(u=>u.uid),slots.map(s=>`enemy-${s}`));assert.deepEqual(enemies.map(u=>u.row*3+u.col),slots);
  if(n===13)assert.equal(r.initialUnits.filter(u=>u.side==='ally').length,9);
 }
});
test('authored encounters preserve deterministic HP/energy replays and input saves',()=>{
 for(let n=1;n<=18;n++){const s=fixture(n,true),before=JSON.stringify(s),r=g.simulateBattle(s);assert.deepEqual(r,g.simulateBattle(s));assert.equal(JSON.stringify(s),before);verifyReplay(r);assert(r.rounds<=40);}
});
test('enemy back targeting is bound to slots and never inherits same-name player strategies',()=>{
 for(const n of [9,16]){
  let s=fixture(n,true);s=g.setStrategy(s,'archer',[basic]);s=g.setStrategy(s,'mage',[basic]);const r=g.simulateBattle(s),state=new Map(r.initialUnits.map(u=>[u.uid,{...u}]));const checked=new Set();
  for(const [i,e] of r.events.entries()){
   if(e.type==='action'&&(e.actor==='enemy-1'||n===16&&e.actor==='enemy-2')&&!checked.has(e.actor)){
    const targets=[];for(let j=i+1;j<r.events.length&&!['action','end'].includes(r.events[j].type);j++)if(r.events[j].type==='attack')targets.push(state.get(r.events[j].target));
    const deepest=Math.max(...[...state.values()].filter(u=>u.side==='ally'&&u.hp>0).map(u=>u.col));
    assert(targets.some(t=>t.col===deepest));if(e.actor==='enemy-2')assert.equal(new Set(targets.map(t=>t.row)).size,1);checked.add(e.actor);
   }
   if(e.hp!==undefined)state.get(e.target).hp=e.hp;
  }
  assert(checked.has('enemy-1'));if(n===16)assert(checked.has('enemy-2'));
 }
 assert.equal(g.getStage(8).encounter.enemies.find(e=>e.heroId==='archer').strategy,undefined);
});
test('commander sets match explicit sparse formations and dense-row ties',()=>{
 for(const [stage,targets]of [[5,['enemy-0','enemy-1']],[15,['enemy-3','enemy-4','enemy-5']]]){
  const s=fixture(stage);assert.deepEqual(g.simulateBattle(g.selectCommanderSkill(s,'fireball')).events.filter(e=>e.type==='commander').map(e=>e.target),targets);
  assert.deepEqual(g.simulateBattle(s).events.filter(e=>e.type==='commander').map(e=>e.target),g.getStage(stage).encounter.enemies.map(e=>`enemy-${e.slot}`));
 }
});
test('row choice, global melee blockers and half-health fallback remain actual event contracts',()=>{
 let s=fixture(3);const sweep=slot=>g.simulateBattle(g.setStrategy(g.setFormation(s,slot,'mage'),'mage',[{...skill,target:'back'},basic])).events.filter(e=>e.type==='attack'&&e.actor===`ally-${slot}`&&e.round===1).map(e=>e.target);
 assert.deepEqual(sweep(1),['enemy-0','enemy-1']);assert.deepEqual(sweep(4),['enemy-3','enemy-4']);
 s=fixture(17,true);s=g.setStrategy(s,'sword',[{...skill,condition:'enemyBelowHalf'},basic]);const r=g.simulateBattle(s),state=new Map(r.initialUnits.map(u=>[u.uid,{...u}]));let swordActions=0;
 for(const e of r.events){
  if(e.type==='action'&&state.get(e.actor).heroId==='sword'&&e.actor.startsWith('ally')){swordActions++;const enemies=[...state.values()].filter(u=>u.side==='enemy'&&u.hp>0),front=Math.min(...enemies.map(u=>u.col));if(!enemies.some(u=>u.col===front&&u.hp/u.maxHp<.5))assert.equal(e.actionSkill,'attack');}
  if(e.type==='attack'){const a=state.get(e.actor),foes=[...state.values()].filter(u=>u.side!==a.side&&u.hp>0);if(['guard','sword','healer'].includes(a.role))assert.equal(state.get(e.target).col,Math.min(...foes.map(u=>u.col)));}
  if(e.hp!==undefined)state.get(e.target).hp=e.hp;
 }assert(swordActions>0);
});
const recruitOrder=['blade','monk','lotus','archer','frost'];
function equip(s){const ids=['monk','lotus','blade','frost','guard','mage','archer','sword','healer'].filter(id=>s.owned.includes(id));for(const [i,slot]of g.getUnlockedSlots(s.stage).entries())if(ids[i])s=g.setFormation(s,slot,ids[i]);return s;}
test('three public-API economy routes clear 1–18 with both commanders, including mixed recovery',()=>{
 for(const mode of ['recruit-first','moderate-upgrades','mixed-recovery'])for(const commander of ['swordRain','fireball']){
  let s=g.selectCommanderSkill(g.createSave(),commander),recovering=false,losses=[];
  while(s.stage<=18){
   const stage=s.stage;
   if(mode==='moderate-upgrades'&&s.commanderLevel<3&&s.coins>=g.commanderUpgradeCost(s))s=g.upgradeCommander(s);
   if(mode==='mixed-recovery'&&!recovering){while(s.coins>=g.commanderUpgradeCost(s))s=g.upgradeCommander(s);}
   else {for(const id of recruitOrder)if(s.coins>=g.RECRUIT_COST&&!s.owned.includes(id))s=g.recruit(s,id);s=equip(s);while(s.coins>=g.commanderUpgradeCost(s))s=g.upgradeCommander(s);}
   const result=g.simulateBattle(s);verifyReplay(result);
   if(result.winner!=='ally'){
    assert.equal(mode,'mixed-recovery',JSON.stringify({mode,commander,stage,coins:s.coins,level:s.commanderLevel}));assert.equal(recovering,false,'only one planned first-loss recovery');
    assert.deepEqual(g.settleBattle(s,result),s);assert.deepEqual(g.simulateBattle(s),result);losses.push([stage,s.coins,s.commanderLevel]);recovering=true;continue;
   }
   const before=JSON.stringify(s);const next=g.settleBattle(s,result);assert.equal(JSON.stringify(s),before);assert.equal(next.stage,stage+1);assert.equal(next.coins,s.coins+40+g.getStage(stage).wave*5);assert.deepEqual(g.settleBattle(next,result),next);s=g.validateSave(JSON.parse(JSON.stringify(next)));
  }
  assert.deepEqual(s.cleared,Array.from({length:18},(_,i)=>i+1));assert.equal(s.coins,115);assert.equal(s.commanderLevel,5);assert.equal(s.owned.length,9);
  assert.deepEqual(losses,mode==='mixed-recovery'?[commander==='swordRain'?[10,215,4]:[9,160,4]]:[]);
 }
});
test('legacy Save v1 stays unchanged and post-18 battle outputs match c78cd7d exactly',()=>{
 const hashes={19:'1555c5c55bc9da0e7947a59dcc0cad21d01fe6866c34bf1edae9b8c88738de4f',30:'0a1433c54e0151182882e80007629c5581873740d85c490bedc04c80200d55a6',100:'ad7f1442fb1b087815786e705d4f3cf79f90aa7ebc8ab94d766b251fda03c0a8'};
 for(const stage of [1,13,19,30,100])for(const custom of [false,true]){let s=fixture(stage);if(custom)s=g.setStrategy(s,'guard',[basic]);const raw=JSON.stringify(s);assert.equal(JSON.stringify(g.validateSave(JSON.parse(raw))),raw);g.simulateBattle(s);assert.equal(JSON.stringify(s),raw);assert.equal(s.version,1);assert.equal('encounter'in s,false);}
 for(const [n,hash]of Object.entries(hashes)){const stage=Number(n),content=g.getStage(stage).encounter;assert.equal(content.lessonId,'continuation');assert.equal(content.title,'延续试阵');assert.equal(createHash('sha256').update(JSON.stringify(g.simulateBattle(fixture(stage)))).digest('hex'),hash);}
});
