// Layout contracts use a scene-graph recorder, NOT Cocos runtime or font rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { stageFocus, stageCell, stageCover, preparationBackdrop, stageBackdrop } from '../assets/scripts/presentation/BattleStage.ts';
import * as core from '../assets/scripts/core/game.ts';
let source = readFileSync(new URL('../assets/scripts/GameApp.ts', import.meta.url), 'utf8');
source = stripTypeScriptTypes(source.replace(/^@ccclass\([^\n]+\)\n/gm, '').replace(/@property /g, ''), { mode: 'strip' })
 .replace(/^import[^\n]+\n/gm, '').replace('export class GameApp', 'class GameApp');
class FakeGraphics {}
class FakeMask { static Type = Object.freeze({ GRAPHICS_RECT: 0, GRAPHICS_ELLIPSE: 1, GRAPHICS_STENCIL: 2, SPRITE_STENCIL: 3 }); }
const screenMock = { windowSize: {width:390,height:844} };
class FakeSprite { static SizeMode = { CUSTOM: 0 }; }
class FakeTransform {}
class FakeFrame {refs=0;isValid=true;reset(info){Object.assign(this,info);}addRef(){this.refs++;}decRef(){this.refs--;}}
class FakeRect {constructor(x,y,width,height){Object.assign(this,{x,y,width,height});}}
class FakeSize {constructor(width,height){Object.assign(this,{width,height});}}
class FakeVec2 {constructor(x,y){Object.assign(this,{x,y});}}
class FakeButton { static EventType = { CLICK: 'tap' }; static Transition = { NONE: 0 }; }
class FakeColor { constructor(r,g,b,a){Object.assign(this,{r,g,b,a});} }
const resources = { loads: [], load(path,type,callback){this.loads.push({path,callback});} };
const graphics = () => {const calls=[];return new Proxy({calls}, {get:(obj,key)=>key in obj?obj[key]:(...args)=>{calls.push([key,...args]);}});};
const world=n=>{let x=n.x,y=n.y;for(let p=n.parent;p;p=p.parent){x=x*p.scaleX+p.x;y=y*p.scaleY+p.y;}return {x,y,z:0};};
const makeNode=(parent=null,x=0,y=0,w=0,h=0)=>{
 let owner=null;
 const node={x,y,w,h,isValid:true,children:[],events:{},components:new Map(),scaleX:1,scaleY:1,
  get parent(){return owner;},set parent(value){if(owner){const i=owner.children.indexOf(this);if(i>=0)owner.children.splice(i,1);}owner=value;if(owner&&!owner.children.includes(this))owner.children.push(this);},
  on(key,fn){this.events[key]=fn;},destroy(){this.isValid=false;},removeAllChildren(){for(const child of [...this.children])child.parent=null;},
  addComponent(type){const c=type===FakeSprite?{}:graphics();this.components.set(type,c);return c;},
  getComponent(type){if(type===FakeTransform)return {setContentSize:(w,h)=>{this.w=w;this.h=h;},convertToNodeSpaceAR:p=>{const origin=world(this);return {x:p.x-origin.x,y:p.y-origin.y,z:0};}};return this.components.get(type);},
  setSiblingIndex(index){if(!owner)return;const old=owner.children.indexOf(this);if(old>=0)owner.children.splice(old,1);owner.children.splice(index,0,this);},
  setPosition(x,y){if(typeof x==='object'){this.x=x.x;this.y=x.y;}else{this.x=x;this.y=y;}},
  get position(){const {x,y}=this;return {x,y,z:0,clone(){return {x,y,z:0};}};},get worldPosition(){return world(this);},
  setScale(x,y){this.scaleX=x;this.scaleY=y;}
 };node.parent=parent;return node;
};
const motions=[];
const tweenMock=target=>{const steps=[];const chain={};for(const name of ['to','by','delay','call'])chain[name]=(...args)=>{steps.push({name,args});return chain;};chain.start=()=>{motions.push({target,steps});return chain;};return chain;};
class FakeVec3 {constructor(x,y,z){Object.assign(this,{x,y,z});}}
const GameApp = new Function('_decorator','Component','Node','resources','SpriteFrame','Graphics','Color','Sprite','UITransform','LabelOutline','Button','BlockInputEvents','UIOpacity','Texture2D','Rect','Size','Vec2','tween','Vec3','isValid','stageFocus','stageCell','stageCover','preparationBackdrop','stageBackdrop','screen','Mask',...Object.keys(core),source+'\nreturn GameApp;')({},class {},{EventType:{TOUCH_END:'tap'}},resources,FakeFrame,FakeGraphics,FakeColor,FakeSprite,FakeTransform,class {},FakeButton,class {},class {},class {},FakeRect,FakeSize,FakeVec2,tweenMock,FakeVec3,n=>!!n&&n.isValid!==false,stageFocus,stageCell,stageCover,preparationBackdrop,stageBackdrop,screenMock,FakeMask,...Object.values(core));
function setup(stage=1) {
 resources.loads.length=0;
 const app=new GameApp(); app.root=makeNode();app.node=makeNode(); app.save=core.createSave(); app.save.stage=stage;
 app.save.owned=core.HEROES.map(h=>h.id); app.save.coins=10000;
 app.save.formation=Array(9).fill(null);core.getUnlockedSlots(stage).forEach((slot,i)=>app.save.formation[slot]=core.HEROES[i].id);
 // Existing renderer contracts start with ready resources; dedicated gate tests restore the real method.
 app.awaitBattleAssets=(units,token,ready)=>ready();
 app.nodes=[];app.scheduleOnce=()=>{};app.color=()=>({});app.persist=()=>true;
 app.make=(name,parent,x,y,w=0,h=0)=>{const n=makeNode(parent,x,y,w,h);n.name=name;app.nodes.push(n);return n;};
 app.box=(p,x,y,w,h)=>app.make('Panel',p,x,y,w,h);
 app.label=(p,text,x,y,size=24,color='',w=640)=>{const n=app.make('Text',p,x,y,w,size*2.5);n.text=text;n.fontSize=size;return {node:n,string:text,isValid:true};};
 const button=app.button;app.button=function(...args){const n=button.apply(this,args);n.button=true;n.text=args[1];return n;};
 return app;
}
function readyFigures(app){for(const unit of core.simulateBattle(app.save).initialUnits){app.unitArtReady.add(unit.uid);app.spellFrames.set(app.fighterArt(unit.role,unit.heroId).name,new FakeFrame());}for(const name of ['commander','ui-skill-banner'])app.spellFrames.set(name,new FakeFrame());}
function alive(n){return n.active!==false&&n.isValid&&(!n.parent||alive(n.parent));}
function rect(n){let x=n.x,y=n.y;for(let p=n.parent;p;p=p.parent){x+=p.x;y+=p.y;}return {left:x-n.w/2,right:x+n.w/2,bottom:y-n.h/2,top:y+n.h/2};}
function verify(app) {
 const visible=n=>{if(!alive(n))return false;if(!app.modal)return true;for(let p=n;p;p=p.parent)if(p===app.modal)return true;return false;};
 const nodes=app.nodes.filter(visible);
 for(const n of nodes.filter(n=>n.button||n.name==='Text')) {
  const r=rect(n);assert.ok(r.left>=-340&&r.right<=340&&r.bottom>=-610&&r.top<=610,`${n.text}: ${JSON.stringify(r)}`);
  if(n.button){assert.ok(n.w>=80&&n.h>=80,`touch size: ${n.text}`);}
 }
 const buttons=nodes.filter(n=>n.button);
 for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){
  const a=rect(buttons[i]),b=rect(buttons[j]);
  assert.ok(Math.min(a.right,b.right)<=Math.max(a.left,b.left)||Math.min(a.top,b.top)<=Math.max(a.bottom,b.bottom),`overlap: ${buttons[i].text} / ${buttons[j].text}`);
 }
}
for(const stage of [1,7,13])test(`portrait controls stay in safe bounds at stage ${stage}`,()=>{
 for(const method of ['login','game','formation','placeHero','commander','savePanel','strategyHelp']){
  const app=setup(stage);app[method](core.HEROES[0].id);verify(app);
 }
 for(const page of [0,1]){const app=setup(stage);app.recruitment(page);verify(app);}
 for(const h of core.HEROES){const app=setup(stage);app.save=core.setStrategy(app.save,h.id,[{skill:'classSkill',condition:'enemyBelowHalf',target:'weakest'},{skill:'attack',condition:'always',target:'front'},{skill:'attack',condition:'always',target:'back'}]);app.strategies(h.id);verify(app);}
 for(const kind of ['corrupt','unavailable']){const app=setup(stage);app.recovery(kind,'测试存档读取问题');verify(app);}
 const app=setup(stage);app.game();app.unitDetail(core.simulateBattle(app.save).initialUnits[0]);verify(app);
});
test('portrait hero and recruitment pagination reaches every character without losing choices',()=>{
 const app=setup(13);app.strategies(app.save.owned[0]);
 for(let i=1;i<app.save.owned.length;i++){
  app.nodes.filter(alive).find(n=>n.button&&n.text==='›').events.tap();
  assert.ok(app.nodes.filter(alive).some(n=>n.text?.includes(`${i+1}/${app.save.owned.length}`)));
 }
 app.recruitment(0);app.nodes.filter(alive).find(n=>n.button&&n.text==='下一页').events.tap();
 assert.ok(app.nodes.filter(alive).some(n=>n.text==='2 / 2'));
});
test('portrait battle prevents navigation via every button while running',()=>{
 const app=setup();let fired=0;const b=app.button(app.root,'test',0,0,100,()=>fired++);app.running=true;b.events.tap();assert.equal(fired,0);app.running=false;b.events.tap();assert.equal(fired,1);
});
test('portrait save reread confirmation keeps both choices accessible',()=>{
 const app=setup();app.savePanel();app.nodes.filter(alive).find(n=>n.button&&n.text==='重新读取…').events.tap();verify(app);
 assert.ok(app.nodes.filter(alive).some(n=>n.button&&n.text==='保留当前进度'));
 assert.ok(app.nodes.filter(alive).some(n=>n.button&&n.text==='确认舍弃并重新读取'));
});
for(const stage of [1,999])test(`portrait settlement controls fit after replay at stage ${stage}`,()=>{
 const app=setup(stage);if(stage===999)app.save.formation=['healer',null,null,null,null,null,null,null,null];app.isValid=true;app.game();app.unitNodes.clear();app.hpLabels.clear();
 const pending=[];app.scheduleOnce=fn=>pending.push(fn);
 app.fight();let count=0;while(pending.length){pending.shift()();assert.ok(count++<2000);}
 assert.equal(app.running,false);verify(app);
 if(stage===999){assert.ok(app.nodes.filter(alive).some(n=>n.button&&n.text==='查看阵位'));assert.ok(app.nodes.filter(alive).some(n=>n.button&&n.text==='指挥官养成'));}
});
test('source anchors ground both mirrored and non-mirrored art without moving shadow or HUD',()=>{
 const app=setup(13);app.game();
 for(const u of [...core.simulateBattle(app.save).initialUnits].sort((a,b)=>a.row-b.row||b.col-a.col)){
  const n=app.unitNodes.get(u.uid);const art=app.fighterArt(u.role,u.heroId);const portrait=app.unitPortraits.get(u.uid);
  const bytes=readFileSync(new URL(`../assets/resources/art/${art.name}.png`,import.meta.url));const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  const request=resources.loads.find(r=>r.path===`art/${art.name}/spriteFrame`&&!r.used);request.used=true;request.callback(null,Object.assign(new FakeFrame(),{originalSize:{width,height}}));
  const scale=app.battlePlacement(u).bodyHeight/(art.groundY-art.bodyTop),mirror=u.side==='enemy'?-1:1;
  assert.ok(Math.abs(portrait.x+(art.groundX-width/2)*scale*mirror)<1e-9);
  assert.ok(Math.abs(portrait.y+(height/2-art.groundY)*scale+40)<1e-9);
  assert.equal(portrait.scaleX,mirror);
  assert.equal(n.children.find(c=>c.name==='GroundShadow').y,-40);
  assert.equal(n.children.find(c=>c.name==='UnitHUD').y,0);
  assert.ok(n.children.find(c=>c.name==='GroundShadow').isValid);
 }
});
test('HP display consumes bounded event values and delayed art cannot resurrect a dead unit',()=>{
 const app=setup();app.game();const u=core.simulateBattle(app.save).initialUnits[0];
 app.updateHealth(u.uid,u.maxHp/2);assert.equal(app.unitHealth.get(u.uid).hp,u.maxHp/2);
 const calls=app.hpBars.get(u.uid).calls;assert.ok(calls.some(c=>c[0]==='rect'&&c[3]===41));
 app.updateHealth(u.uid,u.maxHp*2);assert.equal(app.unitHealth.get(u.uid).hp,u.maxHp);
 app.updateHealth(u.uid,0,true);assert.equal(app.hpLabels.get(u.uid).string,'已退场');
 const art=app.fighterArt(u.role,u.heroId),request=resources.loads.find(r=>r.path===`art/${art.name}/spriteFrame`);
 const bytes=readFileSync(new URL(`../assets/resources/art/${art.name}.png`,import.meta.url));request.callback(null,Object.assign(new FakeFrame(),{originalSize:{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)}}));
 assert.equal(app.unitPortraits.get(u.uid).getComponent(FakeSprite).color.a,90);
 assert.equal(app.unitNodes.get(u.uid).scaleX,1);assert.equal(app.unitNodes.get(u.uid).scaleY,1);
});
test('event feedback points to actor and target and clears the previous event',()=>{
 const app=setup();app.game();const units=core.simulateBattle(app.save).initialUnits;
 const a=units[0].uid,b=units.find(u=>u.side==='enemy').uid;
 app.eventFeedback(a,b);assert.equal(app.feedbackLabels.get(a).string,'');assert.equal(app.feedbackLabels.get(b).string,'');assert.ok(app.unitMarkers.get(a).calls.some(c=>c[0]==='stroke'));assert.ok(app.unitMarkers.get(b).calls.some(c=>c[0]==='stroke'));
 app.eventFeedback(b,a,true);assert.equal(app.feedbackLabels.get(a).string,'');assert.equal(app.feedbackLabels.get(b).string,'');
 app.eventFeedback();assert.equal(app.feedbackLabels.get(a).string,'');assert.equal(app.feedbackLabels.get(b).string,'');
});
test('save failure detail survives rebuilt panels without retrying storage',()=>{
 const app=setup();let writes=0;const message='存档已被其他实例更改。本次未覆盖，请保留当前窗口并重新读取确认。';
 app.store={write(){writes++;return {status:'blocked',message};}};
 const persist=Object.getPrototypeOf(app).persist;assert.equal(persist.call(app),false);assert.equal(writes,1);
 for(const render of ['recruitment','strategies','commander','game']){
  app[render]();assert.equal(app.saveStatusLabel.string,message);assert.equal(writes,1);
 }
 assert.equal(GameApp.session.error,message);
 app.store.write=()=>{writes++;return {status:'saved'};};assert.equal(persist.call(app),true);app.commander();
 assert.equal(app.lastSaveError,'');assert.equal(app.saveStatusLabel.string,'进度已保存在本机');assert.equal(writes,2);
});
test('energy playback applies event after-values only after all effects, with no action delay',()=>{
 const app=setup(13);app.game();app.isValid=true;
 const result=core.simulateBattle(app.save),expected=[];
 result.events.forEach((e,i)=>{if(e.type==='action'){
  let j=i+1;while(j<result.events.length&&!['action','end'].includes(result.events[j].type))j++;
  expected.push({uid:e.actor,value:e.energyAfter,lastEffect:result.events[j-1].text});
 }});
 for(const u of result.initialUnits)assert.equal(app.unitEnergy.get(u.uid).value,u.energy);
 // Keep real display state, but remove target nodes to omit renderer-only tweens.
 app.unitNodes.clear();const pending=[],changes=[];let waits=0;
 app.scheduleOnce=(fn,delay)=>{pending.push(fn);waits++;};
 const update=app.updateEnergy;app.updateEnergy=function(uid,value){changes.push({uid,value,lastEffect:this.status.string});return update.call(this,uid,value);};
 app.fight();let ticks=0;while(pending.length){pending.shift()();assert.ok(ticks++<2000);}
 assert.deepEqual(changes,expected);
 assert.equal(waits,result.events.filter(e=>e.type!=='action').length,'action descriptor adds zero timed frames');
 for(const u of result.units)assert.equal(app.unitEnergy.get(u.uid).value,u.energy);
});
test('strategy energy help returns to the same hero without changing strategy',()=>{
 const app=setup(13),id=app.save.owned[6],before=structuredClone(app.save);
 app.strategies(id);app.nodes.filter(alive).find(n=>n.button&&n.text==='说明').events.tap();verify(app);
 assert.ok(app.nodes.filter(alive).some(n=>n.text?.includes('灵力不足会跳过')));
 app.nodes.filter(alive).find(n=>n.button&&n.text==='返回策略').events.tap();
 assert.ok(app.nodes.filter(alive).some(n=>n.text?.includes('7/9')));assert.deepEqual(app.save,before);
});
test('battle names have a larger design font while precise HP remains in details',()=>{
 const app=setup();app.game();const unit=core.simulateBattle(app.save).initialUnits[0];
 const name=app.nodes.find(n=>n.text===unit.name);
 assert.equal(name.fontSize,24);assert.equal(app.hpLabels.get(unit.uid).string,'');
 app.unitDetail(unit);assert.ok(app.nodes.filter(alive).some(n=>n.text?.includes(`生命 ${unit.hp}/${unit.maxHp}`)));
});
test('formation density drives body size and spreads the two-column opening formation',()=>{
 for(const [stage,height,columns] of [[1,170,2],[7,156,2],[13,132,3]]){
  const app=setup(stage),units=core.simulateBattle(app.save).initialUnits;
  for(const unit of units){const layout=app.battlePlacement(unit);assert.equal(layout.bodyHeight,height);assert.ok(Math.abs(layout.x)+layout.width/2<=340);}
  const positions=units.filter(u=>u.side==='ally'&&u.row===0).map(u=>app.battlePlacement(u).x);
  assert.equal(positions.length,columns);
  if(columns===2)assert.deepEqual(positions,[-110,-250]);
 }
});
test('battle uses a thin header and separated command bands instead of giant opaque panels',()=>{
 const app=setup();app.game();
 assert.ok(app.nodes.some(n=>n.name==='JadeFrame'&&n.w===672&&n.h===70));
 assert.ok(app.nodes.some(n=>n.name==='JadeFrame'&&n.w===660&&n.h===54));
 assert.ok(!app.nodes.some(n=>n.name==='Panel'&&n.w===672&&n.h>=150&&n.h<=350));
 assert.ok(source.includes('this.root.addComponent(Mask)'),'portrait canvas clips artwork on wider views');
});
test('formal archer and fire mage have separate hero-identity assets',()=>{
 const app=setup();assert.equal(app.fighterArt('archer','archer').name,'fighter-archer');assert.equal(app.fighterArt('mage','mage').name,'fighter-mage');
 assert.notEqual(app.fighterArt('mage','frost').name,'fighter-mage','frost is not falsely assigned the fire-mage design');
});
test('close callback clears the commander overlay and preserves the save',()=>{
 const app=setup(),before=structuredClone(app.save);app.commander();const modal=app.modal;
 const close=app.nodes.filter(alive).find(n=>n.button&&n.text==='关闭');
 assert.ok(close.getComponent(FakeButton));close.events.tap();
 assert.equal(app.modal,null);assert.equal(modal.isValid,false);assert.deepEqual(app.save,before);
 assert.ok(app.nodes.filter(alive).some(n=>n.button&&n.text==='开始战斗'));
});

test('frost and monk use their own source anchors',()=>{
 const app=setup();assert.deepEqual(app.fighterArt('mage','frost'),{name:'fighter-frost',groundX:528,groundY:1283,bodyTop:42});
 assert.deepEqual(app.fighterArt('guard','monk'),{name:'fighter-monk',groundX:578,groundY:1264,bodyTop:13});
});
test('preloaded spells preserve source aspect and terminate at event target without geometry substitutes',()=>{
 const app=setup();app.node=makeNode();app.preloadSpells();
 const frames={'fx-sword':{originalSize:{width:1156,height:1361}},'fx-fireball':{originalSize:{width:1774,height:887}}};
 for(const frame of Object.values(frames)){frame.addRef=()=>{};frame.decRef=()=>{};}
 for(const [name,frame] of Object.entries(frames)){app.save.commanderSkill=name==='fx-sword'?'swordRain':'fireball';app.preloadSpells();resources.loads.filter(l=>l.path===`art/${name}/spriteFrame`).at(-1).callback(null,frame);}
 app.spellFrames.set('fx-sword',frames['fx-sword']);
 const target=makeNode(app.root,110,240);app.unitNodes.set('enemy',target);app.speed=2;
 for(const [skill,count,width] of [['swordRain',3,145],['fireball',1,220]]){
  motions.length=0;const before=app.nodes.length;app.spellEffect('enemy',skill);const nodes=app.nodes.slice(before);
  const sources=nodes.filter(n=>n.name==='SpellSource');assert.equal(sources.length,count);
  const frame=skill==='swordRain'?frames['fx-sword']:frames['fx-fireball'];
  for(const n of sources){assert.equal(n.w,width);assert.equal(n.h/n.w,frame.originalSize.height/frame.originalSize.width);assert.equal(n.getComponent(FakeSprite).spriteFrame,frame);assert.equal(n.getComponent(FakeGraphics),undefined);}
  const travels=motions.filter(m=>m.target.name==='CommanderSpell');assert.equal(travels.length,count);
  for(const m of travels){assert.equal(m.steps[0].args[0],.12);assert.equal(m.steps[0].args[1].position.y,262);assert.ok(Math.abs(m.steps[0].args[1].position.x-110)<=22);assert.deepEqual(m.steps[2].args[1].scale,new FakeVec3(1.12,1.12,1));}
 }
});
test('missing spell assets display an explicit fallback and late preload cannot revive destroyed scene',()=>{
 const app=setup();app.node=makeNode();app.preloadSpells();app.node.destroy();resources.loads.find(l=>l.path==='art/fx-sword/spriteFrame').callback(null,{originalSize:{width:10,height:10}});assert.equal(app.spellFrames.size,0);
 app.unitNodes.set('enemy',makeNode(app.root,110,240));app.spellEffect('enemy','swordRain');assert.ok(app.nodes.some(n=>n.text==='法术图未就绪'));assert.ok(!app.nodes.some(n=>n.name==='CommanderSpell'));
});

test('all nine roster heroes resolve to distinct full-body illustrations',()=>{
 const app=setup();const names=core.HEROES.map(h=>app.fighterArt(h.role,h.id).name);assert.equal(new Set(names).size,9);
 assert.deepEqual(app.fighterArt('sword','blade'),{name:'fighter-blade',groundX:459,groundY:1183,bodyTop:20});
 assert.deepEqual(app.fighterArt('healer','lotus'),{name:'fighter-lotus',groundX:504,groundY:1282,bodyTop:45});
});

test('spell damage callback waits for contact, runs once and rejects stale generations',()=>{
 for(const skill of ['swordRain','fireball']){
  const app=setup();app.unitNodes.set('enemy',makeNode(app.root,100,200));app.spellFrames.set(skill==='swordRain'?'fx-sword':'fx-fireball',{originalSize:{width:100,height:100}});
  motions.length=0;let hits=0;app.spellEffect('enemy',skill,()=>hits++);assert.equal(hits,0);
  const contacts=motions.filter(m=>m.target.name==='CommanderSpell').map(m=>m.steps[1].args[0]);
  for(const hit of contacts){hit();hit();}assert.equal(hits,1);
  motions.length=0;app.spellEffect('enemy',skill,()=>hits++);app.generation++;
  for(const m of motions.filter(m=>m.target.name==='CommanderSpell'))m.steps[1].args[0]();assert.equal(hits,1);
 }
 const app=setup();let hits=0;app.unitNodes.set('enemy',makeNode(app.root,100,200));app.spellEffect('enemy','swordRain',()=>hits++);assert.equal(hits,1,'missing asset fallback still consumes the event');
});

test('preloaded spell cache owns exactly one reference per frame until scene destruction',()=>{
 const app=setup();app.node=makeNode();app.unscheduleAllCallbacks=()=>{};app.preloadSpells();let refs=0;
 const frame={isValid:true,addRef(){refs++;},decRef(){refs--;}};
 resources.loads.find(l=>l.path==='art/fx-sword/spriteFrame').callback(null,frame);assert.equal(refs,1);
 resources.loads.find(l=>l.path==='art/fx-sword/spriteFrame').callback(null,frame);assert.equal(refs,1,'replacement releases previous ownership');
 app.clear();assert.equal(refs,1,'page clearing keeps scene-owned cache');
 app.onDestroy();assert.equal(refs,0);assert.equal(app.spellFrames.size,0);
 app.isValid=false;resources.loads[1].callback(null,frame);assert.equal(refs,0,'late callback does not retain a released scene');
});

test('commander replay defers health death rings and numbers to contact without extending cadence',()=>{
 const app=setup();app.game();app.isValid=true;app.save.commanderLevel=99;
 const event=core.simulateBattle(app.save).events.find(e=>e.type==='commander');const initial=app.unitHealth.get(event.target).hp;
 app.spellFrames.set('fx-sword',{isValid:true,originalSize:{width:1156,height:1361}});
 const pending=[];app.scheduleOnce=(fn,delay)=>pending.push({fn,delay});motions.length=0;app.fight();pending.shift().fn();
 assert.equal(app.unitHealth.get(event.target).hp,initial);assert.equal(app.unitHealth.get(event.target).dead,false);
 assert.ok(app.status.string.includes('施法'));assert.ok(!app.nodes.some(n=>n.text===`-${event.amount}`));
 assert.equal(pending.length,1);assert.equal(pending[0].delay,.65);
 const contacts=motions.filter(m=>m.target.name==='CommanderSpell').map(m=>m.steps[1].args[0]);contacts.forEach(fn=>fn());
 assert.equal(app.unitHealth.get(event.target).hp,event.hp);assert.equal(app.unitHealth.get(event.target).dead,event.hp<=0);
 assert.equal(app.status.string,event.text);assert.equal(app.nodes.filter(n=>n.text===`-${event.amount}`).length,1);
 assert.equal(pending.length,1,'impact does not add another playback timer');
});

test('runtime sword frames retain exact 627 cells and one scale with mirrored foot anchoring',()=>{
 const app=setup(13);app.game();app.node=makeNode();app.preloadSwordActions();
 let textureRefs=0;const texture={width:1254,height:1254,isValid:true,addRef(){textureRefs++;},decRef(){textureRefs--;}};
 resources.loads.find(l=>l.path==='art/fighter-sword-actions/texture').callback(null,texture);assert.equal(textureRefs,1);
 assert.equal(app.swordFrames.length,4);
 for(const [i,frame] of app.swordFrames.entries()){assert.deepEqual(frame.rect,new FakeRect(i%2*627,Math.floor(i/2)*627,627,627));assert.deepEqual(frame.originalSize,new FakeSize(627,627));assert.deepEqual(frame.offset,new FakeVec2(0,0));assert.equal(frame.refs,1);}
 for(const unit of core.simulateBattle(app.save).initialUnits.filter(u=>u.heroId==='sword')){
  const art=app.unitPortraits.get(unit.uid),hud=app.unitNodes.get(unit.uid).children.find(n=>n.name==='UnitHUD');const scale=app.battlePlacement(unit).bodyHeight/428,mirror=unit.side==='enemy'?-1:1;
  for(const [i,foot] of [[275,562],[311.5,562],[268,545],[276,546]].entries()){
   assert.equal(app.swordPose(unit.uid,i),true);assert.equal(art.w,627*scale);assert.equal(art.h,627*scale);
   assert.ok(Math.abs(art.x+(foot[0]-313.5)*scale*mirror)<1e-9);assert.ok(Math.abs(art.y+(313.5-foot[1])*scale+40)<1e-9);assert.equal(hud.y,0);
  }
 }
 const blade=core.simulateBattle(app.save).initialUnits.find(u=>u.heroId==='blade');assert.equal(app.swordPose(blade.uid,1),false);
 const frames=[...app.swordFrames];app.unscheduleAllCallbacks=()=>{};app.onDestroy();assert.equal(textureRefs,0);assert.ok(frames.every(f=>f.refs===0));
});
test('sword action contact and recovery stay inside effect budget at both speeds',()=>{
 for(const speed of [1,2]){
  const app=setup(13);app.game();app.isValid=true;app.speed=speed;app.swordFrames=Array.from({length:4},()=>new FakeFrame());
  const result=core.simulateBattle(app.save),pending=[];let now=0,serial=0;const poses=[],health=[],energies=[];
  app.scheduleOnce=(fn,delay)=>pending.push({fn,time:now+delay,serial:serial++});
  app.spellEffect=(uid,skill,hit)=>hit();
  const pose=app.swordPose;app.swordPose=function(uid,i){const ok=pose.call(this,uid,i);if(ok)poses.push({uid,i,time:now});return ok;};
  const hp=app.updateHealth;app.updateHealth=function(uid,value,dead){health.push({uid,value,time:now});return hp.call(this,uid,value,dead);};
  const energy=app.updateEnergy;app.updateEnergy=function(uid,value){energies.push({uid,value,time:now});return energy.call(this,uid,value);};
  app.fight();let steps=0;while(pending.length){pending.sort((a,b)=>a.time-b.time||a.serial-b.serial);const next=pending.shift();now=next.time;next.fn();assert.ok(steps++<4000);}
  const expected=result.events.filter(e=>e.type==='action'&&app.unitActors.get(e.actor)?.heroId==='sword');
  const starts=poses.filter(p=>p.i===1);assert.equal(starts.length,expected.length);
  starts.forEach(start=>{for(const [i,dt]of [[2,.14],[3,.25],[0,.34]])assert.ok(poses.some(p=>p.uid===start.uid&&p.i===i&&Math.abs(p.time-start.time-dt/speed)<1e-8));});
  let time=0;
  for(let j=0;j<result.events.length;j++){
   const e=result.events[j];if(e.type==='action'){
    const actor=app.unitActors.get(e.actor);if(actor?.heroId==='sword'){
     let k=j+1;while(k<result.events.length&&['attack','heal','death'].includes(result.events[k].type))k++;
     for(const effect of result.events.slice(j+1,k).filter(e=>typeof e.hp==='number'))assert.ok(health.some(h=>h.uid===effect.target&&h.value===effect.hp&&Math.abs(h.time-time-.14/speed)<1e-8));
     const end=time+(k-j-1)*.38/speed;assert.ok(energies.some(v=>v.uid===e.actor&&v.value===e.energyAfter&&Math.abs(v.time-end)<1e-8));
    }continue;
   }time+=(e.type==='commander'?.65:.38)/speed;
  }
  assert.ok(Math.abs(now-time)<1e-8,'same total replay duration as unanimated event budget');
  for(const unit of result.units)assert.equal(app.unitHealth.get(unit.uid).hp,unit.hp);
 }
});
test('dead or cleared units cannot be restored by queued sword poses or late texture loads',()=>{
 const app=setup();app.game();app.isValid=true;app.swordFrames=Array.from({length:4},()=>new FakeFrame());const uid=[...app.unitActors].find(([,a])=>a.heroId==='sword')[0];
 const queue=[];app.scheduleOnce=fn=>queue.push(fn);let hits=0;app.playSwordAction(uid,()=>hits++);app.updateHealth(uid,0,true);queue.forEach(fn=>fn());assert.equal(hits,0);assert.equal(app.unitActors.get(uid).pose,1);
 const other=setup();other.game();other.isValid=true;other.swordFrames=Array.from({length:4},()=>new FakeFrame());const id=[...other.unitActors].find(([,a])=>a.heroId==='sword')[0];const stale=[];other.scheduleOnce=fn=>stale.push(fn);other.playSwordAction(id,()=>hits++);other.clear();stale.forEach(fn=>fn());assert.equal(hits,0);
 app.node=makeNode();app.running=false;app.preloadSwordActions();const texture={width:1254,height:1254,isValid:true,addRef(){},decRef(){}};resources.loads.find(l=>l.path==='art/fighter-sword-actions/texture').callback(null,texture);assert.equal(app.unitActors.get(uid).pose,1,'late asset does not restore dead stance');
});

test('performance view removes preparation menus and keeps only large focal actors with tiny formation portraits',()=>{
 const app=setup(13);app.game();const units=core.simulateBattle(app.save).initialUnits;app.enterBattleStage(units);verify(app);
 assert.ok(!app.nodes.filter(alive).some(n=>n.button),'no form menu remains during combat');
 assert.equal(app.miniPortraits.size,units.length);assert.ok(app.nodes.filter(alive).filter(n=>n.name==='FighterArt').length<=2);
 assert.ok(app.nodes.filter(alive).every(n=>!['TopVignette','BottomVignette'].includes(n.name)));
 for(const placement of app.stagePlacements.values())assert.ok(placement.bodyHeight>=1280*.28&&placement.bodyHeight<=1280*.4);
 const enemy=units.find(u=>u.side==='enemy'),ally=units.find(u=>u.side==='ally');app.focusBattle(enemy.uid,[ally.uid]);
 assert.ok(app.unitNodes.get(enemy.uid).x>0);assert.ok(app.unitNodes.get(ally.uid).x<0);
 const before=structuredClone(app.save);app.focusBattle(ally.uid,[ally.uid]);assert.equal(app.stagePlacements.size,1);assert.deepEqual(app.save,before);
});
test('stage hides all eighteen nameplates while retaining live health energy and fixed death cells',()=>{
 const app=setup(13);app.game();const units=core.simulateBattle(app.save).initialUnits;app.enterBattleStage(units);
 const unit=units[0],mini=app.miniPortraits.get(unit.uid),cell=mini.parent,before={x:cell.x,y:cell.y};app.focusBattle(unit.uid,[units[1].uid]);
 app.updateHealth(unit.uid,11);app.updateEnergy(unit.uid,1);assert.ok(app.stageLabels.get(unit.uid).string.includes('11/'));assert.ok(app.stageLabels.get(unit.uid).string.includes('1灵'));
 app.updateHealth(unit.uid,0,true);assert.ok(app.stageLabels.get(unit.uid).string.includes('已退场'));assert.deepEqual({x:cell.x,y:cell.y},before);
 for(const other of units){const hud=app.miniPortraits.get(other.uid).parent.children.find(n=>n.name==='UnitHUD');const plaque=hud.children.find(n=>n.name==='JadeFrame');assert.equal(plaque.active,false);}
});
test('preparation backgrounds follow all three region identities and stage preserves the actual source ratio',()=>{
 for(const [region,name]of [[0,'bamboo'],[1,'temple'],[2,'underworld'],[3,'bamboo']]){
  const app=setup();app.background(region);assert.ok(resources.loads.some(l=>l.path===`art/battle-${name}-portrait/spriteFrame`));
 }
 const app=setup();app.game();app.enterBattleStage(core.simulateBattle(app.save).initialUnits);
 resources.loads.filter(l=>l.path==='art/battle-bamboo-stage/spriteFrame').at(-1).callback(null,Object.assign(new FakeFrame(),{originalSize:{width:941,height:1670}}));
 const bg=app.nodes.find(n=>n.name==='StageBackdrop');assert.ok(Math.abs(bg.w/bg.h-941/1670)<1e-10);assert.ok(bg.h>=720*844/390);
});
test('focus locks per complete action and commander sequence without changing results',()=>{
 const app=setup(13);app.game();app.isValid=true;const result=core.simulateBattle(app.save),calls=[];
 const focus=app.focusBattle;app.focusBattle=function(actor,targets,commander){calls.push({actor,targets:[...targets],commander});return focus.call(this,actor,targets,commander);};
 app.spellEffect=(uid,skill,hit)=>hit();const queue=[];app.scheduleOnce=fn=>queue.push(fn);app.fight();while(queue.length)queue.shift()();
 assert.equal(calls.filter(c=>c.commander).length,1);
 assert.equal(calls.filter(c=>c.actor).length,result.events.filter(e=>e.type==='action').length+1,'one initial view plus one camera selection per action');
 assert.deepEqual(calls.find(c=>c.commander).targets,result.events.filter(e=>e.type==='commander').map(e=>e.target));
 for(const unit of result.units)assert.equal(app.unitHealth.get(unit.uid).hp,unit.hp);
});

test('hand-painted skill banner fits alpha bounds rather than compressing the transparent canvas',()=>{
 const app=setup();app.game();app.spellFrames.set('ui-skill-banner',Object.assign(new FakeFrame(),{originalSize:{width:2172,height:724}}));app.enterBattleStage(core.simulateBattle(app.save).initialUnits);
 const banner=app.nodes.find(n=>n.name==='SkillBanner');assert.ok(Math.abs(banner.w/banner.h-3)<1e-9);assert.ok(Math.abs(banner.h*340/724-620*340/2118)<1e-9);assert.ok(banner.h>200);
});
test('off-camera third and ninth commander hits use their own miniatures, even after first focus dies',()=>{
 const app=setup(13);app.game();const units=core.simulateBattle(app.save).initialUnits,enemies=units.filter(u=>u.side==='enemy');app.enterBattleStage(units);
 app.focusBattle(undefined,enemies.map(u=>u.uid),true);app.updateHealth(enemies[0].uid,0,true);
 app.root.setPosition(17,29);app.stageLayer.setPosition(11,-7);app.spellFrames.set('fx-sword',{isValid:true,originalSize:{width:1156,height:1361}});
 for(const enemy of [enemies[2],enemies[8]]){
  const mini=app.miniPortraits.get(enemy.uid),world=mini.worldPosition,root=app.root.worldPosition;
  const point=app.spellImpactPoint(enemy.uid);assert.equal(point.x,world.x-root.x);assert.equal(point.y,world.y-root.y);
  assert.notEqual(point.y,app.spellImpactPoint(enemies[0].uid).y);
  motions.length=0;app.spellEffect(enemy.uid,'swordRain');const travels=motions.filter(m=>m.target.name==='CommanderSpell');assert.equal(travels.length,3);
  assert.ok(travels.some(m=>m.steps[0].args[1].position.x===point.x));assert.ok(travels.every(m=>m.steps[0].args[1].position.y===point.y));
 }
});
test('scene-graph mock updates local and world position plus reparenting like the engine contract',()=>{
 const root=makeNode(null,10,20),left=makeNode(root,30,40),right=makeNode(root,-10,-20),child=makeNode(left,2,3);
 child.setPosition(5,7);assert.equal(child.position.x,5);assert.deepEqual(child.worldPosition,{x:45,y:67,z:0});
 child.parent=right;assert.ok(!left.children.includes(child));assert.ok(right.children.includes(child));assert.deepEqual(child.worldPosition,{x:5,y:7,z:0});
 const app=setup();app.game();const units=core.simulateBattle(app.save).initialUnits;app.enterBattleStage(units);const figure=app.unitNodes.get(units[0].uid),tile=app.miniPortraits.get(units[0].uid).parent;
 assert.ok(!figure.children.some(n=>n.name==='UnitHUD'));assert.ok(tile.children.some(n=>n.name==='UnitHUD'));assert.equal(figure.parent.name,'StageFigures');
});
test('cold battle gate waits for stage, selected spell and all figures before starting exactly once',()=>{
 const app=setup();app.game();app.isValid=true;app.awaitBattleAssets=Object.getPrototypeOf(app).awaitBattleAssets;
 const queue=[];app.scheduleOnce=(fn,delay)=>queue.push({fn,delay});let starts=0;app.replayBattle=()=>starts++;const before=structuredClone(app.save);
 app.fight();app.fight();assert.equal(starts,0);assert.equal(queue.length,1);assert.equal(app.stageMode,false);assert.equal(app.running,true);
 assert.ok(app.nodes.filter(alive).some(n=>n.button&&n.text==='开始战斗'),'preparation remains visible under the loading status');
 readyFigures(app);app.spellFrames.set('battle-bamboo-stage',new FakeFrame());
 queue.shift().fn();assert.equal(starts,0,'selected spell is also required');app.spellFrames.set('fx-sword',new FakeFrame());
 const final=queue.shift().fn;final();final();assert.equal(starts,1);assert.deepEqual(app.save,before);assert.equal(app.resultAwarded,false);
});
test('failed or timed-out loading exposes retry without awards, and generation change cancels the gate',()=>{
 for(const fail of [true,false]){
  const app=setup();app.game();app.isValid=true;app.awaitBattleAssets=Object.getPrototypeOf(app).awaitBattleAssets;const before=structuredClone(app.save),queue=[];let starts=0;
  app.scheduleOnce=fn=>queue.push(fn);app.replayBattle=()=>starts++;if(fail)app.unitArtFailed.add([...app.unitNodes.keys()][0]);app.fight();
  let ticks=0;while(queue.length){queue.shift()();assert.ok(ticks++<110);}
  assert.equal(starts,0);assert.equal(app.running,false);assert.equal(app.resultAwarded,false);assert.deepEqual(app.save,before);
  const retry=app.nodes.filter(alive).find(n=>n.button&&n.text==='重试加载并开始');assert.ok(retry);retry.events.tap();assert.equal(app.running,true);assert.ok(resources.loads.some(l=>l.path==='art/battle-bamboo-stage/spriteFrame'));
  readyFigures(app);app.spellFrames.set('battle-bamboo-stage',new FakeFrame());app.spellFrames.set('fx-sword',new FakeFrame());queue.shift()();assert.equal(starts,1);
 }
 const app=setup();app.game();app.isValid=true;app.awaitBattleAssets=Object.getPrototypeOf(app).awaitBattleAssets;const queue=[];let starts=0;app.scheduleOnce=fn=>queue.push(fn);app.replayBattle=()=>starts++;app.fight();const old=queue.shift();app.clear();old();assert.equal(starts,0);assert.equal(queue.length,0);
});
test('same-side healing labels remain separated by at least their full text bounds',()=>{
 const app=setup(13);app.game();const units=core.simulateBattle(app.save).initialUnits;app.enterBattleStage(units);const allies=units.filter(u=>u.side==='ally'&&u.heroId!=='sword');app.focusBattle(allies[0].uid,[allies[1].uid]);
 const labels=[...app.stageLabels.values()].map(l=>l.node);assert.ok(Math.abs(labels[0].y-labels[1].y)>=75);assert.ok(Math.abs(labels[0].y-labels[1].y)>=(labels[0].h+labels[1].h)/2);
});
test('opening commander and hand-painted banner are required before the gate opens',()=>{
 const app=setup();app.game();app.isValid=true;app.awaitBattleAssets=Object.getPrototypeOf(app).awaitBattleAssets;readyFigures(app);app.spellFrames.delete('commander');app.spellFrames.delete('ui-skill-banner');
 app.spellFrames.set('battle-bamboo-stage',new FakeFrame());app.spellFrames.set('fx-sword',new FakeFrame());const queue=[];app.scheduleOnce=fn=>queue.push(fn);let starts=0;app.replayBattle=()=>starts++;
 app.fight();assert.equal(starts,0);app.spellFrames.set('commander',new FakeFrame());queue.shift()();assert.equal(starts,0);app.spellFrames.set('ui-skill-banner',new FakeFrame());queue.shift()();assert.equal(starts,1);
});
test('ready stage reuses cache synchronously for commander, banner and original miniature art',()=>{
 const app=setup(13);app.game();const units=core.simulateBattle(app.save).initialUnits;
 for(const name of [stageBackdrop(core.getStage(app.save.stage).regionIndex),'commander','ui-skill-banner',...units.map(u=>app.fighterArt(u.role,u.heroId).name)])app.spellFrames.set(name,Object.assign(new FakeFrame(),{originalSize:{width:name==='ui-skill-banner'?2172:941,height:name==='ui-skill-banner'?724:1670}}));
 const requests=resources.loads.length;app.enterBattleStage(units);assert.equal(resources.loads.length,requests,'no async re-fetch after readiness');
 assert.ok(app.nodes.find(n=>n.name==='CommanderPortrait').getComponent(FakeSprite));assert.ok(app.nodes.find(n=>n.name==='SkillBanner').getComponent(FakeSprite));
 for(const unit of units)assert.equal(app.miniPortraits.get(unit.uid).getComponent(FakeSprite).spriteFrame,app.spellFrames.get(app.fighterArt(unit.role,unit.heroId).name));
 const ninth=units.filter(u=>u.side==='enemy')[8];app.focusBattle(undefined,units.filter(u=>u.side==='enemy').map(u=>u.uid),true);const before=app.spellImpactPoint(ninth.uid);app.updateHealth(ninth.uid,0,true);assert.deepEqual(app.spellImpactPoint(ninth.uid),before,'death never relocates the real target miniature');
});

test('normal focus labels clear the guardian spear while sword keeps raised-weapon headroom',()=>{
 const app=setup(13);app.game();const units=core.simulateBattle(app.save).initialUnits;app.enterBattleStage(units);
 const guardian=units.find(u=>u.heroId==='guard'||u.role==='guard'),sword=units.find(u=>u.heroId==='sword'&&u.side!==guardian.side);
 app.focusBattle(guardian.uid,[sword.uid]);
 for(const [unit,gap]of [[guardian,80],[sword,120]]){
  const layout=app.stagePlacements.get(unit.uid),label=app.stageLabels.get(unit.uid).node;
  assert.equal(label.y,layout.footY+layout.bodyHeight+gap);
 }
 const guardLayout=app.stagePlacements.get(guardian.uid),guardLabel=app.stageLabels.get(guardian.uid).node;
 const spearTop=guardLayout.footY+440+(105-5)*440/(1240-105);
 assert.ok(guardLabel.y-guardLabel.h/2>spearTop,'full label rectangle clears the measured spear tip');
});
test('Login does not request battle stages, spells or action sheets',()=>{
 const app=setup();app.login();assert.ok(resources.loads.every(r=>!/(?:-stage\/|fx-|actions\/)/.test(r.path)));
 const onLoad=source.slice(source.indexOf('onLoad()'),source.indexOf('onDestroy()'));assert.ok(!onLoad.includes('preloadSpells'));assert.ok(!onLoad.includes('preloadSwordActions'));
});
test('current region and selected spell alone are requested and stale callbacks never acquire ownership',()=>{
 const app=setup(7);app.game();const oldStage=resources.loads.find(r=>r.path==='art/battle-temple-stage/spriteFrame'),oldSpell=resources.loads.find(r=>r.path==='art/fx-sword/spriteFrame');
 assert.ok(oldStage&&oldSpell);assert.ok(!resources.loads.some(r=>r.path==='art/battle-underworld-stage/spriteFrame'||r.path==='art/fx-fireball/spriteFrame'));
 app.save.stage=13;app.save.commanderSkill='fireball';app.game();const stale=new FakeFrame();oldStage.callback(null,stale);oldSpell.callback(Error('stale failure'));
 assert.equal(stale.refs,0);assert.ok(!app.presentationFailures.has('fx-sword'));assert.ok(!app.spellFrames.has('battle-temple-stage'));
 const current=new FakeFrame();resources.loads.find(r=>r.path==='art/battle-underworld-stage/spriteFrame').callback(null,current);assert.equal(current.refs,1);
 app.unscheduleAllCallbacks=()=>{};app.onDestroy();assert.equal(current.refs,0);
 const late=new FakeFrame();resources.loads.find(r=>r.path==='art/fx-fireball/spriteFrame').callback(null,late);assert.equal(late.refs,0);
});
test('100 preparation redraws keep one owner per cached asset and detach old stage before release',()=>{
 const app=setup();const frames=new Map(),texture={width:1254,height:1254,isValid:true,refs:0,addRef(){this.refs++;},decRef(){this.refs--;}};let processed=0;
 const flush=()=>{while(processed<resources.loads.length){const request=resources.loads[processed++];if(request.path.endsWith('/texture')){request.callback(null,texture);continue;}let frame=frames.get(request.path);if(!frame){frame=Object.assign(new FakeFrame(),{originalSize:{width:941,height:1670}});frames.set(request.path,frame);}request.callback(null,frame);}};
 for(let i=0;i<100;i++){app.game();flush();}
 for(const name of ['battle-bamboo-stage','fx-sword','commander','ui-skill-banner'])assert.equal(resources.loads.filter(r=>r.path===`art/${name}/spriteFrame`).length,1,name);
 assert.equal(resources.loads.filter(r=>r.path.endsWith('fighter-sword-actions/texture')).length,1);assert.equal(texture.refs,1);assert.ok([...app.spellFrames.values()].every(frame=>frame.refs===1));
 app.enterBattleStage(core.simulateBattle(app.save).initialUnits);const oldSprite=app.nodes.find(n=>n.name==='StageBackdrop').getComponent(FakeSprite),oldFrame=oldSprite.spriteFrame;
 const release=oldFrame.decRef.bind(oldFrame);oldFrame.decRef=()=>{assert.equal(oldSprite.spriteFrame,null,'display detached before last ownership release');release();};
 app.save.stage=7;app.game();flush();assert.equal(oldFrame.refs,0);assert.ok(!app.spellFrames.has('battle-bamboo-stage'));assert.equal(app.spellFrames.get('battle-temple-stage').refs,1);
 app.save.stage=13;app.game();flush();assert.ok(!app.spellFrames.has('battle-temple-stage'));assert.equal(app.spellFrames.get('battle-underworld-stage').refs,1);
 app.unscheduleAllCallbacks=()=>{};app.onDestroy();assert.equal(texture.refs,0);assert.ok([...frames.values()].every(frame=>frame.refs===0));
});
test('retry invalidates only missing relevant tickets, including same-key late results',()=>{
 const app=setup(7);app.preloadSpells();const old=resources.loads.find(r=>r.path==='art/battle-temple-stage/spriteFrame');app.preloadSpells(undefined,true);
 const newest=resources.loads.filter(r=>r.path==='art/battle-temple-stage/spriteFrame').at(-1);assert.notEqual(newest,old);const abandoned=new FakeFrame(),accepted=new FakeFrame();old.callback(null,abandoned);assert.equal(abandoned.refs,0);newest.callback(null,accepted);assert.equal(accepted.refs,1);
 assert.ok(!resources.loads.some(r=>/battle-(bamboo|underworld)-stage|fx-fireball/.test(r.path)));
});
test('battle stage key is captured before waiting and used unchanged by replay',()=>{
 const app=setup(7);app.game();app.isValid=true;let waited,played;app.awaitBattleAssets=(units,token,ready,key)=>{waited=key;app.save.stage=13;ready();};app.replayBattle=(result,token,key)=>{played=key;};app.fight();assert.equal(waited,'battle-temple-stage');assert.equal(played,waited);
});
test('adjacent Game and Login owners sharing frames do not release the new page resource',()=>{
 const old=setup(),portrait=Object.assign(new FakeFrame(),{originalSize:{width:1299,height:1199}}),banner=Object.assign(new FakeFrame(),{originalSize:{width:2172,height:724}});old.cachePresentationFrame('commander',portrait);old.cachePresentationFrame('ui-skill-banner',banner);
 const login=setup();login.login();resources.loads.find(r=>r.path==='art/commander/spriteFrame').callback(null,portrait);resources.loads.find(r=>r.path==='art/ui-skill-banner/spriteFrame').callback(null,banner);assert.equal(portrait.refs,2);assert.equal(banner.refs,2);
 old.unscheduleAllCallbacks=()=>{};old.onDestroy();assert.equal(portrait.refs,1);assert.equal(banner.refs,1);assert.equal(login.nodes.find(n=>n.name==='LoginCommander').getComponent(FakeSprite).spriteFrame,portrait);
 login.unscheduleAllCallbacks=()=>{};login.onDestroy();assert.equal(portrait.refs,0);assert.equal(banner.refs,0);
});
test('late stage fallback failure cannot change a cleared loading label or retain a frame',()=>{
 const app=setup();app.game();let label;const shadow=app.shadowText;app.shadowText=function(...args){const value=shadow.apply(this,args);if(args[1]==='舞台加载中…')label=value;return value;};app.enterBattleStage(core.simulateBattle(app.save).initialUnits);const late=resources.loads.filter(r=>r.path==='art/battle-bamboo-stage/spriteFrame').at(-1);app.clear();const before=label.string;late.callback(Error('late'));assert.equal(label.string,before);const frame=new FakeFrame();late.callback(null,frame);assert.equal(frame.refs,0);
});

test('actual cold game-to-fight resource callbacks complete the gate despite the new battle token',()=>{
 const app=setup();app.game();app.isValid=true;app.awaitBattleAssets=Object.getPrototypeOf(app).awaitBattleAssets;const queue=[];app.scheduleOnce=fn=>queue.push(fn);let starts=0;app.replayBattle=()=>starts++;
 const display=app.displayGeneration,eventToken=app.generation;app.fight();assert.equal(starts,0);assert.equal(app.displayGeneration,display);assert.ok(app.generation>eventToken);
 for(const request of [...resources.loads]){
  if(request.path.endsWith('/texture')){request.callback(null,{width:1254,height:1254,isValid:true,addRef(){},decRef(){}});continue;}
  request.callback(null,Object.assign(new FakeFrame(),{originalSize:{width:941,height:1670}}));
 }
 assert.equal(app.unitArtReady.size,app.unitNodes.size,'actual original-art callbacks populated readiness, no manual Set writes');
 const check=queue.shift();check();check();assert.equal(starts,1);assert.equal(app.presentationFailures.size,0);
});

test('viewport scenery covers tall and wide windows independently of the fixed safe content',()=>{
 for(const [width,height] of [[390,844],[1440,900]]){
  screenMock.windowSize={width,height};const app=setup();app.root.w=720;app.root.h=1280;app.root.addComponent(FakeMask);
  const canvas=makeNode();app.backgroundLayer=makeNode(canvas);app.root.parent=canvas;
  app.login();const frame=Object.assign(new FakeFrame(),{originalSize:{width:941,height:1672}});
  resources.loads.find(r=>r.path==='art/battle-bamboo-portrait/spriteFrame').callback(null,frame);
  const bg=app.nodes.find(n=>n.name==='BackgroundArt'),cover=stageCover(width,height);
  assert.equal(bg.parent,app.backgroundLayer);assert.equal(app.root.parent,app.backgroundLayer.parent);
  assert.ok(bg.w+1e-8>=cover.width&&bg.h+1e-8>=cover.height);assert.ok(Math.abs(bg.w/bg.h-941/1672)<1e-10);
  assert.deepEqual([app.root.w,app.root.h,app.root.scaleX,app.root.scaleY],[720,1280,1,1]);
  assert.equal(app.root.getComponent(FakeMask).enabled,true);assert.equal(app.backgroundLayer.getComponent(FakeMask),undefined);
  let detached=false;frame.decRef=()=>{detached=bg.getComponent(FakeSprite).spriteFrame===null;frame.refs--;};
  app.unscheduleAllCallbacks=()=>{};app.onDestroy();assert.equal(detached,true);assert.equal(frame.refs,0);
 }
 screenMock.windowSize={width:390,height:844};
 const startup=source.slice(source.indexOf('onLoad()'),source.indexOf('onDestroy()'));
 assert.match(startup,/canvasNode.addComponent\(Canvas\)/);assert.match(startup,/this.root = this.make\('SafeContent', canvasNode/);
 assert.ok(!source.includes('getFrameSize'));
});
test('outer scenery is detached on clear, ignores late loads and stays behind the ready battle stage',()=>{
 const app=setup();app.backgroundLayer=makeNode();app.login();const old=resources.loads[0];app.clear();const late=Object.assign(new FakeFrame(),{originalSize:{width:941,height:1672}});old.callback(null,late);assert.equal(late.refs,0);
 app.game();const frame=Object.assign(new FakeFrame(),{originalSize:{width:941,height:1670}});app.cachePresentationFrame('battle-bamboo-stage',frame);
 app.enterBattleStage(core.simulateBattle(app.save).initialUnits);assert.equal(app.backgroundLayer.active,false);
 app.clear();assert.equal(app.backgroundLayer.active,true);assert.equal(app.backgroundLayer.children.length,0);
});
test('commander is a masked head-shoulders cut-in, with no source waist edge on the battlefield',()=>{
 const app=setup();app.game();const frame=Object.assign(new FakeFrame(),{originalSize:{width:1299,height:1199}});app.cachePresentationFrame('commander',frame);
 const units=core.simulateBattle(app.save).initialUnits;app.enterBattleStage(units);
 const cut=app.stageCommander,crop=app.nodes.find(n=>n.name==='CommanderCrop'),art=app.nodes.find(n=>n.name==='CommanderPortrait');
 assert.deepEqual([cut.x,cut.y,cut.w,cut.h],[-220,330,160,160]);assert.equal(crop.getComponent(FakeMask).type,FakeMask.Type.GRAPHICS_ELLIPSE);assert.equal(crop.w,150);assert.equal(crop.h,150);
 assert.equal(art.parent,crop);assert.ok(Math.abs(art.w/art.h-1299/1199)<1e-10);assert.ok(art.y-art.h/2<-75);
 assert.equal(cut.getComponent(FakeSprite),undefined);assert.equal(cut.active,false);
 app.focusBattle(undefined,units.filter(u=>u.side==='enemy').map(u=>u.uid),true);assert.equal(cut.active,true);
 app.focusBattle(units[0].uid,[units.at(-1).uid]);assert.equal(cut.active,false);
});
test('healing recipient is foreground and positive feedback is above all stage figures',()=>{
 const app=setup(13);app.game();app.isValid=true;const result=core.simulateBattle(app.save),units=result.initialUnits;
 const actor=units.find(u=>u.side==='ally'&&u.heroId==='healer'),target=units.find(u=>u.side==='ally'&&u.role==='guard');
 result.events=[{type:'action',actor:actor.uid,energyAfter:0,actionSkill:'classSkill',text:'治疗',round:1},{type:'heal',actor:actor.uid,target:target.uid,hp:target.hp,amount:36,text:'恢复',round:1},{type:'end',text:'结束',round:1}];
 app.replayBattle(result,app.generation);const float=app.nodes.find(n=>n.text==='+36'),focus=app.stagePlacements.get(target.uid);
 assert.equal(float.parent,app.root);assert.equal(float.x,focus.x);assert.equal(float.y,focus.footY+focus.bodyHeight*.6);
 const foreground=app.unitNodes.get(target.uid),rear=app.unitNodes.get(actor.uid);assert.ok(foreground.parent.children.indexOf(foreground)>rear.parent.children.indexOf(rear));
 assert.ok(app.root.children.indexOf(float)>app.root.children.indexOf(app.stageLayer));
});

test('positive and negative event numbers have dark outlines without changing size or timing',()=>{
 for(const type of ['heal','attack']){
  const app=setup(13);app.game();app.isValid=true;const result=core.simulateBattle(app.save),units=result.initialUnits;
  const actor=units.find(u=>u.side==='ally'&&u.heroId==='healer'),target=units.find(u=>u.side===(type==='heal'?'ally':'enemy')&&u.role==='guard');
  let feedback;const shadow=app.shadowText;app.shadowText=function(...args){const label=shadow.apply(this,args);if(args[1]===(type==='heal'?'+36':'-36'))feedback=label;return label;};
  const scheduled=[];app.scheduleOnce=(fn,delay)=>scheduled.push({fn,delay});
  result.events=[{type:'action',actor:actor.uid,energyAfter:0,actionSkill:'classSkill',text:'行动',round:1},{type,actor:actor.uid,target:target.uid,hp:target.hp,amount:36,text:'效果',round:1},{type:'end',text:'结束',round:1}];
  app.replayBattle(result,app.generation);assert.ok(feedback);assert.equal(feedback.enableOutline,true);assert.equal(feedback.outlineWidth,2);assert.ok(feedback.outlineColor);assert.equal(feedback.isBold,true);assert.equal(feedback.node.fontSize,26);assert.equal(scheduled[0].delay,.38);
 }
});

test('login portrait and continuous veils extend outside safe content to actual tall and wide viewport edges',()=>{
 for(const [width,height] of [[390,844],[720,1280],[1440,900]]){
  screenMock.windowSize={width,height};const app=setup(),canvas=makeNode();app.backgroundLayer=makeNode(canvas);app.root.parent=canvas;app.root.addComponent(FakeMask);
  app.login();const cover=stageCover(width,height),frame=Object.assign(new FakeFrame(),{originalSize:{width:1299,height:1199}});
  resources.loads.find(r=>r.path==='art/commander/spriteFrame').callback(null,frame);
  const art=app.nodes.find(n=>n.name==='LoginCommander');assert.equal(art.parent,app.backgroundLayer);assert.equal(art.y+art.h/2,340);assert.ok(art.y-art.h/2<=-cover.height/2-80+1e-8);assert.ok(Math.abs(art.w/art.h-1299/1199)<1e-10);
  for(const page of ['login','game']){
   if(page==='game')app.game();
   for(const top of [true,false]){
    const veil=app.nodes.filter(alive).find(n=>n.name===(top?'TopVignette':'BottomVignette'));assert.equal(veil.parent,app.backgroundLayer);
    const rects=veil.getComponent(FakeGraphics).calls.filter(c=>c[0]==='rect');
    const first=rects[0];assert.equal(first[1],-cover.width/2);assert.equal(first[3],cover.width);
    assert.ok(Math.abs((top?first[2]+first[4]:first[2])-(top?cover.height/2:-cover.height/2))<1e-8);
    for(let i=1;i<rects.length;i++)assert.ok(Math.abs(Math.abs(rects[i][2]-rects[i-1][2])-rects[i][4])<1e-8);
   }
  }
 }
 screenMock.windowSize={width:390,height:844};
});
