// Resource ownership and label selection only, not Creator font rendering acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {supportsTypeface, TYPEFACE_CHARACTERS} from '../assets/scripts/presentation/Typeface.ts';
const raw=readFileSync(new URL('../assets/scripts/GameApp.ts',import.meta.url),'utf8');
const source=stripTypeScriptTypes(raw.replace(/^@ccclass\([^\n]+\)\n/gm,'').replace(/@property /g,''),{mode:'strip'}).replace(/^import[^\n]+\n/gm,'').replace('export class GameApp','class GameApp');
const resources={loads:[],load(path,type,callback){this.loads.push({path,callback});}};
const App=new Function('_decorator','Component','resources','TTFFont','supportsTypeface','isValid','Mask','Sprite','screen',source+'\nreturn GameApp;')({},class{},resources,class{},supportsTypeface,n=>!!n&&n.isValid!==false,class{},class{},{off(){}});
const node=()=>({isValid:true,parent:null,children:[],getComponent(){return null;},removeAllChildren(){this.children=[];}});
function setup(){const app=new App();app.isValid=true;app.root=node();app.unscheduleAllCallbacks=()=>{};return app;}
const label=(string='太初灵契')=>({string,node:node(),isValid:true,font:null,isBold:true,enableOutline:true,outlineWidth:2});
const font=()=>({isValid:true,refs:0,addRef(){this.refs++;},decRef(){this.refs--;}});
const last=()=>resources.loads.at(-1);
test('runtime coverage exactly matches the reviewed generated manifest character set',()=>{
 const chars=readFileSync(new URL('../tools/fonts/characters.txt',import.meta.url),'utf8').replace(/\n$/,'');
 const manifest=JSON.parse(readFileSync(new URL('../tools/fonts/manifest.json',import.meta.url)));
 assert.equal(TYPEFACE_CHARACTERS,chars);assert.equal([...TYPEFACE_CHARACTERS].length,manifest.characterCount);
 const module=readFileSync(new URL('../assets/scripts/presentation/Typeface.ts',import.meta.url),'utf8');assert.ok(module.includes(manifest.outputSHA256));
 assert.equal(supportsTypeface('太初灵契 123'),true);assert.equal(supportsTypeface('太初灵契龘'),false);
});
test('one deferred request updates current page only and never synthesizes extra bold on 600',()=>{
 resources.loads=[];const app=setup(),old=label();app.displayTypeface(old);app.displayTypeface(label());assert.equal(resources.loads.length,1);
 app.clear();const current=label('招募同道');app.displayTypeface(current);assert.equal(resources.loads.length,1);
 const f=font();last().callback(null,f);assert.equal(old.font,null);assert.equal(current.font,f);assert.equal(current.isBold,false);assert.equal(current.outlineWidth,1);assert.equal(f.refs,1);
 app.onDestroy();assert.equal(current.font,null);assert.equal(f.refs,0);
});
test('closed panel and destroyed instance never receive late font assignments or take ownership',()=>{
 resources.loads=[];const app=setup(),closed=label();closed.node.parent=node();app.displayTypeface(closed);closed.node.parent.isValid=false;
 const f=font();last().callback(null,f);assert.equal(closed.font,null);app.onDestroy();assert.equal(f.refs,0);
 const gone=setup(),l=label();gone.displayTypeface(l);const pending=last();gone.onDestroy();const late=font();pending.callback(null,late);assert.equal(l.font,null);assert.equal(late.refs,0);
});
test('two adjacent scene owners retain shared font independently through 100 redraws',()=>{
 resources.loads=[];const first=setup(),second=setup(),a=label(),b=label(),f=font();first.displayTypeface(a);const requestA=last();second.displayTypeface(b);const requestB=last();requestA.callback(null,f);requestB.callback(null,f);assert.equal(f.refs,2);
 for(let i=0;i<100;i++){second.clear();second.displayTypeface(label());assert.equal(f.refs,2);}
 assert.equal(resources.loads.length,2);first.onDestroy();assert.equal(a.font,null);assert.equal(f.refs,1);second.onDestroy();assert.equal(f.refs,0);
});
test('uncovered whole label and unregistered small numeric feedback keep system font; failures retry next page',()=>{
 resources.loads=[];const app=setup(),missing=label('太初龘'),numbers=label('+36');app.displayTypeface(missing);assert.equal(resources.loads.length,0);assert.equal(missing.font,null);
 const title=label();app.displayTypeface(title);last().callback(Error('unavailable'));assert.equal(title.font,null);app.displayTypeface(label());assert.equal(resources.loads.length,1);
 app.clear();const next=label();app.displayTypeface(next);assert.equal(resources.loads.length,2);last().callback(null,font());assert.ok(next.font);assert.equal(numbers.font,null);assert.equal(numbers.outlineWidth,2);
});
test('explicit display whitelist leaves mixed HP and battle log labels untouched',()=>{
 assert.match(raw,/primary \? 32 : 24/);assert.match(raw,/if \(primary\) this.displayTypeface\(label\)/);
 assert.match(raw,/displayTypeface\(this.shadowText\(this.root, '太 初 灵 契'/);
 assert.match(raw,/displayTypeface\(this.label\(mask, title/);
 assert.match(raw,/displayTypeface\(this.label\(p, h.name/);
 assert.ok(!raw.includes('displayTypeface(this.status'));assert.ok(!raw.includes('displayTypeface(this.stageLabels'));
});

test('font coverage materializes string codepoints before Creator loose spread lowering',()=>{ const module=readFileSync(new URL('../assets/scripts/presentation/Typeface.ts',import.meta.url),'utf8'); assert.match(module,/Array\.from\(text\)/); assert.ok(!module.includes('[...text]')); assert.equal(supportsTypeface('太初灵契'),true); assert.equal(supportsTypeface('龘'),false); });
