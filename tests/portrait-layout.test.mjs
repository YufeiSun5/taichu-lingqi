// Layout contracts use a scene-graph recorder, NOT Cocos runtime or font rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import * as core from '../assets/scripts/core/game.ts';
let source = readFileSync(new URL('../assets/scripts/GameApp.ts', import.meta.url), 'utf8');
source = stripTypeScriptTypes(source.replace(/^@ccclass\([^\n]+\)\n/gm, '').replace(/@property /g, ''), { mode: 'strip' })
 .replace(/^import[^\n]+\n/gm, '').replace('export class GameApp', 'class GameApp');
class FakeGraphics {}
class FakeSprite { static SizeMode = { CUSTOM: 0 }; }
class FakeTransform {}
class FakeColor { constructor(r,g,b,a){Object.assign(this,{r,g,b,a});} }
const resources = { loads: [], load(path,type,callback){this.loads.push({path,callback});} };
const graphics = () => {const calls=[];return new Proxy({calls}, {get:(obj,key)=>key in obj?obj[key]:(...args)=>{calls.push([key,...args]);}});};
const makeNode=(parent=null,x=0,y=0,w=0,h=0)=>({parent,x,y,w,h,isValid:true,children:[],events:{},components:new Map(),scaleX:1,scaleY:1,
 on(key,fn){this.events[key]=fn;},destroy(){this.isValid=false;},removeAllChildren(){this.children=[];},
 addComponent(type){const c=type===FakeSprite?{}:graphics();this.components.set(type,c);return c;},
 getComponent(type){if(type===FakeTransform)return {setContentSize:(w,h)=>{this.w=w;this.h=h;}};return this.components.get(type);},
 setPosition(x,y){this.x=x;this.y=y;},position:{x,y,clone(){return {x,y};}},setScale(x,y){this.scaleX=x;this.scaleY=y;}});
const GameApp = new Function('_decorator','Component','Node','resources','SpriteFrame','Graphics','Color','Sprite','UITransform',...Object.keys(core),source+'\nreturn GameApp;')({},class {},{EventType:{TOUCH_END:'tap'}},resources,class {},FakeGraphics,FakeColor,FakeSprite,FakeTransform,...Object.values(core));
function setup(stage=1) {
 resources.loads.length=0;
 const app=new GameApp(); app.root=makeNode(); app.save=core.createSave(); app.save.stage=stage;
 app.save.owned=core.HEROES.map(h=>h.id); app.save.coins=10000;
 app.save.formation=Array(9).fill(null);core.getUnlockedSlots(stage).forEach((slot,i)=>app.save.formation[slot]=core.HEROES[i].id);
 app.nodes=[];app.scheduleOnce=()=>{};app.color=()=>({});app.persist=()=>true;
 app.make=(name,parent,x,y,w=0,h=0)=>{const n=makeNode(parent,x,y,w,h);n.name=name;parent.children.push(n);app.nodes.push(n);return n;};
 app.box=(p,x,y,w,h)=>app.make('Panel',p,x,y,w,h);
 app.label=(p,text,x,y,size=24,color='',w=640)=>{const n=app.make('Text',p,x,y,w,size*2.5);n.text=text;n.fontSize=size;return {node:n,string:text,isValid:true};};
 const button=app.button;app.button=function(...args){const n=button.apply(this,args);n.button=true;n.text=args[1];return n;};
 return app;
}
function alive(n){return n.isValid&&(!n.parent||alive(n.parent));}
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
 for(const u of core.simulateBattle(app.save).initialUnits){
  const n=app.unitNodes.get(u.uid);const art=app.fighterArt(u.role);const portrait=app.unitPortraits.get(u.uid);
  const bytes=readFileSync(new URL(`../assets/resources/art/${art.name}.png`,import.meta.url));const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  const request=resources.loads.find(r=>r.path===`art/${art.name}/spriteFrame`&&!r.used);request.used=true;request.callback(null,{originalSize:{width,height}});
  const scale=112/(art.groundY-art.bodyTop),mirror=u.side==='enemy'?-1:1;
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
 const art=app.fighterArt(u.role),request=resources.loads.find(r=>r.path===`art/${art.name}/spriteFrame`);
 const bytes=readFileSync(new URL(`../assets/resources/art/${art.name}.png`,import.meta.url));request.callback(null,{originalSize:{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)}});
 assert.equal(app.unitPortraits.get(u.uid).getComponent(FakeSprite).color.a,90);
 assert.equal(app.unitNodes.get(u.uid).scaleX,1);assert.equal(app.unitNodes.get(u.uid).scaleY,1);
});
test('event feedback points to actor and target and clears the previous event',()=>{
 const app=setup();app.game();const units=core.simulateBattle(app.save).initialUnits;
 const a=units[0].uid,b=units.find(u=>u.side==='enemy').uid;
 app.eventFeedback(a,b);assert.equal(app.feedbackLabels.get(a).string,'行动');assert.equal(app.feedbackLabels.get(b).string,'受击');
 app.eventFeedback(b,a,true);assert.equal(app.feedbackLabels.get(a).string,'治疗');assert.equal(app.feedbackLabels.get(b).string,'行动');
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
 const name=app.unitNodes.get(unit.uid).children.find(n=>n.name==='UnitHUD').children.find(n=>n.text===unit.name);
 assert.equal(name.fontSize,24);assert.equal(app.hpLabels.get(unit.uid).string,'');
 app.unitDetail(unit);assert.ok(app.nodes.filter(alive).some(n=>n.text?.includes(`生命 ${unit.hp}/${unit.maxHp}`)));
});
