// Login geometry/lifecycle contracts, not rendered visual acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
let source=readFileSync(new URL('../assets/scripts/GameApp.ts',import.meta.url),'utf8');
source=stripTypeScriptTypes(source.replace(/^@ccclass\([^\n]+\)\n/gm,'').replace(/@property /g,''),{mode:'strip'}).replace(/^import[^\n]+\n/gm,'').replace('export class GameApp','class GameApp');
class Frame{isValid=true;refs=0;addRef(){this.refs++;}decRef(){this.refs--;}}
class Sprite{static SizeMode={CUSTOM:0};}class Transform{}class Graphics{}class Color{constructor(r,g,b,a){Object.assign(this,{r,g,b,a});}}
const resources={loads:[],load(path,type,callback){this.loads.push({path,callback});}};
const GameApp=new Function('_decorator','Component','resources','SpriteFrame','Sprite','UITransform','Graphics','Color','isValid','director',source+'\nreturn GameApp;')({},class{},resources,class{},Sprite,Transform,Graphics,Color,n=>!!n&&n.isValid!==false,{loadScene(){}});
function setup(){resources.loads=[];const app=new GameApp();app.isValid=true;app.nodes=[];
 app.make=(name,parent,x,y,w=0,h=0)=>{const node={name,parent,x,y,w,h,isValid:true,children:[],components:new Map(),destroy(){this.isValid=false;for(const child of this.children)child.destroy();},setSiblingIndex(i){const old=parent.children.indexOf(this);parent.children.splice(old,1);parent.children.splice(i,0,this);},addComponent(type){const component=type===Graphics?{rects:[],rect(...args){this.rects.push({args,alpha:this.fillColor.a});},fill(){}}:{};this.components.set(type,component);return component;},getComponent(type){return type===Transform?{setContentSize:(w,h)=>{node.w=w;node.h=h;}}:this.components.get(type);}};if(parent)parent.children.push(node);app.nodes.push(node);return node;};
 app.root=app.make('Root',null,0,0,720,1280);app.clear=()=>{for(const n of app.root.children)n.destroy();app.root.children=[];};app.background=()=>{};app.color=()=>({});app.saveDescription=()=> '进度已保存在本机';
 app.label=(parent,text,x,y,size,color,w)=>({node:app.make('Text',parent,x,y,w,size*2.5),string:text});
 app.button=(parent,text,x,y,w,action)=>{const node=app.make('Entry',parent,x,y,w,80);node.action=action;node.addComponent(Graphics);app.label(node,text,0,0,28,'',w-22);return node;};return app;
}
test('waist-up login portrait preserves proportion and puts its opaque source cut below screen',()=>{
 const app=setup();app.login();const bytes=readFileSync(new URL('../assets/resources/art/commander.png',import.meta.url)),width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 resources.loads.find(r=>r.path==='art/commander/spriteFrame').callback(null,Object.assign(new Frame(),{originalSize:{width,height}}));
 const portrait=app.nodes.find(n=>n.name==='LoginCommander');assert.ok(Math.abs(portrait.w/portrait.h-width/height)<1e-10);assert.equal(portrait.h,1060);assert.ok(portrait.y-portrait.h/2<-640);assert.equal(portrait.y+portrait.h/2,340);
 assert.equal(app.nodes.filter(n=>n.name==='Entry').length,1);assert.equal(app.saveStatusLabel.string,'进度已保存在本机');
});
test('painted entry is behind its text and leaves the 490x80 touch target unchanged',()=>{
 const app=setup();app.login();resources.loads.find(r=>r.path==='art/ui-skill-banner/spriteFrame').callback(null,Object.assign(new Frame(),{originalSize:{width:2172,height:724}}));
 const entry=app.nodes.find(n=>n.name==='Entry'),art=app.nodes.find(n=>n.name==='LoginEntryArt');assert.equal(entry.children[0],art);assert.equal(entry.w,490);assert.equal(entry.h,80);assert.equal(entry.getComponent(Graphics).enabled,false);assert.ok(Math.abs(art.w/art.h-3)<1e-10);assert.ok(Math.abs(art.w*2118/2172-490)<1e-10);
});
test('late login resource callbacks cannot add components to a destroyed portrait or entry',()=>{
 const app=setup();app.login();const nodes=[app.nodes.find(n=>n.name==='LoginCommander'),app.nodes.find(n=>n.name==='LoginEntryArt')],requests=[...resources.loads];app.clear();for(const request of requests)request.callback(null,Object.assign(new Frame(),{originalSize:{width:2172,height:724}}));assert.ok(nodes.every(n=>!n.isValid&&!n.getComponent(Sprite)));
});
test('veils have contiguous non-overlapping single-pixel alpha samples rather than sixteen hard bands',()=>{
 for(const top of [true,false]){const app=setup();app.edgeVeil(app.root,top,380);const g=app.nodes.at(-1).getComponent(Graphics);assert.equal(g.rects.length,380);for(let i=0;i<380;i++){assert.equal(g.rects[i].args[3],1);if(i){assert.equal(Math.abs(g.rects[i].args[1]-g.rects[i-1].args[1]),1);assert.ok(g.rects[i].alpha<=g.rects[i-1].alpha);assert.ok(g.rects[i-1].alpha-g.rects[i].alpha<=2);}}}
});
test('text uses the supported built-in Label outline properties without adding a deprecated component',()=>{
 const app=setup(),label=app.shadowText(app.root,'字',0,0);assert.equal(label.enableOutline,true);assert.equal(label.outlineWidth,2);assert.ok(label.outlineColor);assert.equal(label.node.components.size,0);assert.ok(!source.includes('addComponent(LabelOutline)'));
});
