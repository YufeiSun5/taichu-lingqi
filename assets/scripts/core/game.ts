/** Engine-independent deterministic rules. col 0 is the front on BOTH sides. */
export type Role = 'guard' | 'sword' | 'mage' | 'healer' | 'archer';
export type CommanderSkill = 'swordRain' | 'fireball';
export interface Hero { id:string; name:string; role:Role; maxHp:number; attack:number; defense:number; speed:number; color:string }
export const HEROES: Hero[] = [
 {id:'guard',name:'岳沉山',role:'guard',maxHp:190,attack:27,defense:16,speed:8,color:'#d6ad64'},
 {id:'sword',name:'凌霄',role:'sword',maxHp:130,attack:40,defense:7,speed:15,color:'#9ed9e9'},
 {id:'healer',name:'苏灵音',role:'healer',maxHp:105,attack:31,defense:5,speed:13,color:'#9fd4ad'},
 {id:'mage',name:'赤璃',role:'mage',maxHp:100,attack:37,defense:4,speed:11,color:'#f49b7a'},
 {id:'archer',name:'叶流风',role:'archer',maxHp:110,attack:35,defense:5,speed:18,color:'#b5d59b'},
 {id:'frost',name:'白凝霜',role:'mage',maxHp:115,attack:39,defense:6,speed:12,color:'#a7c8f5'},
 {id:'monk',name:'玄照',role:'guard',maxHp:210,attack:29,defense:18,speed:7,color:'#dfc181'},
 {id:'blade',name:'夜无痕',role:'sword',maxHp:140,attack:45,defense:8,speed:19,color:'#c4b0ec'},
 {id:'lotus',name:'莲心',role:'healer',maxHp:120,attack:35,defense:7,speed:14,color:'#efb6d5'},
];
export interface Save {version:1;stage:number;coins:number;commanderLevel:number;commanderSkill:CommanderSkill;formation:(string|null)[];owned:string[];cleared:number[];strategies?:Record<string,StrategyRule[]>}
export interface Stage {number:number;regionIndex:number;regionName:string;wave:number;enemyIds:string[]}
export interface BattleUnit {uid:string;heroId:string;name:string;side:'ally'|'enemy';row:number;col:number;hp:number;maxHp:number;attack:number;defense:number;speed:number;role:Role}
export interface BattleEvent {type:'start'|'commander'|'attack'|'heal'|'death'|'end';actor?:string;target?:string;amount?:number;skill?:string;round:number;text:string;hp?:number}
export interface BattleResult {winner:'ally'|'enemy'|'draw';events:BattleEvent[];units:BattleUnit[];rounds:number;stage:number;initialUnits:BattleUnit[]}

export type StrategyCondition = 'always'|'allyInjured'|'allyBelowHalf'|'enemyBelowHalf'|'firstRound';
export type StrategyTarget = 'front'|'weakest'|'back';
export interface StrategyRule {skill:'attack'|'classSkill';condition:StrategyCondition;target:StrategyTarget}
export const STRATEGY_SKILLS: {id:StrategyRule['skill'];label:string}[] = [{id:'attack',label:'普通攻击'},{id:'classSkill',label:'职业技能'}];
export const STRATEGY_CONDITIONS: {id:StrategyCondition;label:string}[] = [{id:'always',label:'无条件'},{id:'allyInjured',label:'友方受伤'},{id:'allyBelowHalf',label:'友方生命低于50%'},{id:'enemyBelowHalf',label:'敌方生命低于50%'},{id:'firstRound',label:'首回合'}];
export const STRATEGY_TARGETS: {id:StrategyTarget;label:string}[] = [{id:'front',label:'前排优先'},{id:'weakest',label:'最低血量比例'},{id:'back',label:'后排优先'}];
export function getStrategy(save:Save,heroId:string):StrategyRule[] {
 const role=HEROES.find(h=>h.id===heroId)?.role;
 const custom=save.strategies?.[heroId];
 if(custom)return custom.map(r=>({...r}));
 return [{skill:role==='healer'||role==='mage'||role==='archer'?'classSkill':'attack',condition:role==='healer'?'allyInjured':'always',target:role==='healer'||role==='archer'?'weakest':'front'},{skill:'attack',condition:'always',target:'front'}];
}
function validateRules(rules:StrategyRule[]):void {
 if(!Array.isArray(rules)||rules.length<1||rules.length>3||rules.some(r=>!r||!STRATEGY_SKILLS.some(x=>x.id===r.skill)||!STRATEGY_CONDITIONS.some(x=>x.id===r.condition)||!STRATEGY_TARGETS.some(x=>x.id===r.target)))throw new Error('策略必须为1至3条有效规则');
}
export function setStrategy(save:Save,heroId:string,rules:StrategyRule[]):Save {
 if(!save.owned.includes(heroId))throw new Error('尚未招募此队友');validateRules(rules);
 const next=copy(save);next.strategies={...next.strategies,[heroId]:rules.map(r=>({...r}))};return next;
}

export const RECRUIT_COST = 80;
export function createSave():Save {return {version:1,stage:1,coins:80,commanderLevel:1,commanderSkill:'swordRain',formation:['guard','healer',null,'sword','mage',null,null,null,null],owned:['guard','sword','healer','mage'],cleared:[]};}
export function getUnlockedSlots(stage:number):number[] {return stage>=13?[0,1,2,3,4,5,6,7,8]:stage>=7?[0,1,3,4,6,7]:[0,1,3,4];}
export function getStage(stage:number):Stage {
 if (!Number.isSafeInteger(stage)||stage<1) throw new Error('关卡编号无效');
 const regionIndex=Math.floor((stage-1)/6), wave=(stage-1)%6+1;
 const regions=['青竹幽径','云海仙山','幽冥古殿'];
 const n=stage>=13?9:stage>=7?6:4;
 const pool=['guard','sword','mage','archer','healer','frost','monk','blade','lotus'];
 return {number:stage,regionIndex,regionName:regions[regionIndex%regions.length],wave,enemyIds:Array.from({length:n},(_,i)=>pool[(i+regionIndex)%pool.length])};
}
function copy(save:Save):Save {return {...save,formation:[...save.formation],owned:[...save.owned],cleared:[...save.cleared],...(save.strategies?{strategies:Object.fromEntries(Object.entries(save.strategies).map(([id,rules])=>[id,rules.map(r=>({...r}))]))}:{})};}
export function setFormation(save:Save,slot:number,heroId:string|null):Save {
 if(!getUnlockedSlots(save.stage).includes(slot)) throw new Error('阵位尚未解锁');
 if(heroId!==null&&!save.owned.includes(heroId)) throw new Error('尚未招募此队友');
 const next=copy(save); const old=heroId===null?-1:next.formation.indexOf(heroId);
 if(old>=0) next.formation[old]=next.formation[slot];
 next.formation[slot]=heroId; return next;
}
export function recruit(save:Save,heroId:string):Save {
 if(!HEROES.some(h=>h.id===heroId)) throw new Error('未知队友');
 if(save.owned.includes(heroId)) throw new Error('已经招募');
 if(save.coins<RECRUIT_COST) throw new Error('灵石不足');
 const next=copy(save);next.coins-=RECRUIT_COST;next.owned.push(heroId);return next;
}
export function commanderUpgradeCost(save:Save):number {return save.commanderLevel*60;}
export function upgradeCommander(save:Save):Save {const cost=commanderUpgradeCost(save);if(save.coins<cost)throw new Error('灵石不足');const next=copy(save);next.coins-=cost;next.commanderLevel++;return next;}
export function selectCommanderSkill(save:Save,skill:CommanderSkill):Save {if(skill!=='swordRain'&&skill!=='fireball')throw new Error('未知神通');return {...copy(save),commanderSkill:skill};}
export function validateSave(value:unknown):Save {
 const s=value as Save;
 if(!s||s.version!==1||!Number.isSafeInteger(s.stage)||s.stage<1||!Number.isSafeInteger(s.coins)||s.coins<0||!Number.isSafeInteger(s.commanderLevel)||s.commanderLevel<1||!['swordRain','fireball'].includes(s.commanderSkill))throw new Error('存档格式错误');
 if(!Array.isArray(s.owned)||new Set(s.owned).size!==s.owned.length||!s.owned.every(id=>HEROES.some(h=>h.id===id)))throw new Error('队友存档错误');
 if(!Array.isArray(s.formation)||s.formation.length!==9||s.formation.some((id,i)=>id!==null&&(!s.owned.includes(id)||!getUnlockedSlots(s.stage).includes(i)))||new Set(s.formation.filter(Boolean)).size!==s.formation.filter(Boolean).length)throw new Error('阵型存档错误');
 if(!Array.isArray(s.cleared)||!s.cleared.every(n=>Number.isSafeInteger(n)&&n>=1&&n<s.stage)||new Set(s.cleared).size!==s.cleared.length)throw new Error('关卡存档错误');
 if(s.strategies!==undefined){if(!s.strategies||typeof s.strategies!=='object'||Array.isArray(s.strategies))throw new Error('策略存档错误');for(const [id,rules] of Object.entries(s.strategies)){if(!s.owned.includes(id))throw new Error('策略队友错误');validateRules(rules);}}
 return copy(s);
}
function makeUnit(heroId:string,side:'ally'|'enemy',slot:number,scale:number):BattleUnit {const h=HEROES.find(x=>x.id===heroId)!;const maxHp=Math.round(h.maxHp*scale);return {uid:`${side}-${slot}`,heroId,name:h.name,side,row:Math.floor(slot/3),col:slot%3,hp:maxHp,maxHp,attack:Math.round(h.attack*scale),defense:Math.round(h.defense*scale),speed:h.speed,role:h.role};}
/** Produces a complete replay; UI must animate initialUnits using events, not mutate rules. */
export function simulateBattle(input:Save):BattleResult {
 const save=validateSave(input), stage=getStage(save.stage), slots=getUnlockedSlots(save.stage);
 const allies=save.formation.flatMap((id,i)=>id?[makeUnit(id,'ally',i,1+Math.floor((save.stage-1)/6)*.1)]:[]);
 if(allies.length===0)throw new Error('至少上阵一名队友');
 // Repeatable six-wave curve, gently increasing across regions; no random outcomes.
 const scale=.65+(stage.wave-1)*.07+Math.floor((save.stage-1)/6)*.07;
 const units=[...allies,...stage.enemyIds.map((id,i)=>makeUnit(id,'enemy',slots[i],scale))];
 const initialUnits=units.map(u=>({...u})), events:BattleEvent[]=[{type:'start',round:0,text:`${stage.regionName} ${stage.wave}/6 · 战斗开始`}];
 const living=(side:string)=>units.filter(u=>u.side===side&&u.hp>0);
 function damage(target:BattleUnit,amount:number,type:'attack'|'commander',actor:string,skill:string,round:number){const actual=Math.min(target.hp,Math.max(1,Math.round(amount)));target.hp-=actual;events.push({type,actor,target:target.uid,amount:actual,skill,round,hp:target.hp,text:`${skill} · ${target.name} -${actual}`});if(target.hp===0)events.push({type:'death',target:target.uid,round,hp:0,text:`${target.name} 倒下`});}
 const enemies=living('enemy');
 // Sword rain reaches every unit; fireball hits the most populated row with a larger burst.
 const rowCounts=[0,1,2].map(r=>enemies.filter(u=>u.row===r).length);
 const fireRow=rowCounts.indexOf(Math.max(...rowCounts));
 for(const target of enemies.filter(u=>save.commanderSkill==='swordRain'||u.row===fireRow))damage(target,save.commanderSkill==='swordRain'?18+save.commanderLevel*8:38+save.commanderLevel*14,'commander','commander',save.commanderSkill==='swordRain'?'万剑归宗':'焚天流火',0);
 let rounds=0;
 for(let round=1;round<=40&&living('ally').length&&living('enemy').length;round++) {
 rounds=round;
 const queue=units.filter(u=>u.hp>0).sort((a,b)=>b.speed-a.speed||a.uid.localeCompare(b.uid));
 for(const actor of queue){if(actor.hp<=0)continue;const foes=living(actor.side==='ally'?'enemy':'ally');if(!foes.length)break;
 const friends=living(actor.side);

 const rules=getStrategy(actor.side==='ally'?save:{...save,strategies:undefined},actor.heroId);
 const matches=(r:StrategyRule)=>r.condition==='always'||(r.condition==='firstRound'&&round===1)||(r.condition==='allyInjured'&&friends.some(u=>u.hp<u.maxHp))||(r.condition==='allyBelowHalf'&&friends.some(u=>u.hp/u.maxHp<.5))||(r.condition==='enemyBelowHalf'&&foes.some(u=>u.hp/u.maxHp<.5));
 const rule=rules.find(r=>matches(r)&&!(actor.role==='healer'&&r.skill==='classSkill'&&!friends.some(u=>u.hp<u.maxHp))&&(r.condition!=='enemyBelowHalf'||(actor.role==='healer'&&r.skill==='classSkill')||foes.some(u=>u.hp/u.maxHp<.5&&((actor.role==='mage'||actor.role==='archer')||u.col===Math.min(...foes.map(f=>f.col))))))||{skill:'attack',condition:'always',target:'front'};
 const special=rule.skill==='classSkill';
 const order=(pool:BattleUnit[])=>[...pool].sort((a,b)=>rule.target==='weakest'?(a.hp/a.maxHp-b.hp/b.maxHp||a.uid.localeCompare(b.uid)):rule.target==='back'?(b.col-a.col||Math.abs(a.row-actor.row)-Math.abs(b.row-actor.row)||a.uid.localeCompare(b.uid)):(a.col-b.col||Math.abs(a.row-actor.row)-Math.abs(b.row-actor.row)||a.uid.localeCompare(b.uid)));
 if(actor.role==='healer'&&special){let pool=friends.filter(u=>u.hp<u.maxHp);if(rule.condition==='allyBelowHalf')pool=pool.filter(u=>u.hp/u.maxHp<.5);const injured=order(pool)[0];const amount=Math.min(injured.maxHp-injured.hp,Math.round(actor.attack*1.15));injured.hp+=amount;events.push({type:'heal',actor:actor.uid,target:injured.uid,amount,round,hp:injured.hp,skill:'回春诀',text:`回春诀 · ${injured.name} +${amount}`});continue;}
 // Near-range fighters must respect the first occupied column even with weak/back targeting.
 const ranged=actor.role==='mage'||actor.role==='archer';
 const front=Math.min(...foes.map(u=>u.col));
 let candidates=ranged?foes:foes.filter(u=>u.col===front);
 if(rule.condition==='enemyBelowHalf'){const weak=candidates.filter(u=>u.hp/u.maxHp<.5);if(weak.length)candidates=weak;}
 const target=order(candidates)[0];
 const targets=special&&actor.role==='mage'?foes.filter(u=>u.row===target.row):[target];
 const skill=!special?'普通攻击':actor.role==='mage'?'灵焰横扫':actor.role==='archer'?'逐影箭':actor.role==='guard'?'镇岳击':'破阵斩';
 for(const t of targets){const power=!special?1:actor.role==='mage'?.72:1.3;const armor=special&&(actor.role==='mage'||actor.role==='archer')?t.defense*.35:t.defense;damage(t,actor.attack*power-armor,'attack',actor.uid,skill,round);}

 }
 }
 const winner=living('enemy').length===0?'ally':living('ally').length===0?'enemy':'draw';events.push({type:'end',round:rounds,text:winner==='ally'?'破阵成功':winner==='enemy'?'暂且整备，再战':'回合上限 · 平局'});
 return {winner,events,units,initialUnits,rounds,stage:save.stage};
}
/** Settlement is single-use per stage; failure leaves progression untouched. */
export function settleBattle(save:Save,result:BattleResult):Save {
 const next=validateSave(save);if(result.winner!=='ally'||result.stage!==save.stage||save.cleared.includes(result.stage))return next;
 next.cleared.push(save.stage);next.coins+=40+getStage(save.stage).wave*5;next.stage++;return next;
}
