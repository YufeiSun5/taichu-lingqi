// Layout contracts use a scene-graph recorder, NOT Cocos runtime or font rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import * as core from '../assets/scripts/core/game.ts';
let source = readFileSync(new URL('../assets/scripts/GameApp.ts', import.meta.url), 'utf8');
source = stripTypeScriptTypes(source.replace(/^@ccclass\([^\n]+\)\n/gm, '').replace(/@property /g, ''), { mode: 'strip' })
 .replace(/^import[^\n]+\n/gm, '').replace('export class GameApp', 'class GameApp');
const graphics = new Proxy({}, {get:(_,key)=>key==='enabled'?true:()=>{}});
const makeNode=(parent=null,x=0,y=0,w=0,h=0)=>({parent,x,y,w,h,isValid:true,children:[],events:{},on(key,fn){this.events[key]=fn;},destroy(){this.isValid=false;},removeAllChildren(){this.children=[];},addComponent(){return graphics;},position:{x,y,clone(){return {x,y};}},setScale(){}});
const GameApp = new Function('_decorator','Component','Node','resources','SpriteFrame','Graphics','Color',...Object.keys(core),source+'\nreturn GameApp;')({},class {},{EventType:{TOUCH_END:'tap'}},{load(){}},class {},class {},class {},...Object.values(core));
function setup(stage=1) {
 const app=new GameApp(); app.root=makeNode(); app.save=core.createSave(); app.save.stage=stage;
 app.save.owned=core.HEROES.map(h=>h.id); app.save.coins=10000;
 app.save.formation=Array(9).fill(null);core.getUnlockedSlots(stage).forEach((slot,i)=>app.save.formation[slot]=core.HEROES[i].id);
 app.nodes=[];app.scheduleOnce=()=>{};app.color=()=>({});app.persist=()=>true;
 app.make=(name,parent,x,y,w=0,h=0)=>{const n=makeNode(parent,x,y,w,h);n.name=name;parent.children.push(n);app.nodes.push(n);return n;};
 app.box=(p,x,y,w,h)=>app.make('Panel',p,x,y,w,h);
 app.label=(p,text,x,y,size=24,color='',w=640)=>{const n=app.make('Text',p,x,y,w,size*2.5);n.text=text;return {node:n,string:text,isValid:true};};
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
 for(const method of ['login','game','formation','placeHero','commander','savePanel']){
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
