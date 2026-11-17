import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const json = p => JSON.parse(read(p));
test('Creator source has two scenes with correct app mode and script UUID', () => {
 const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 const h=json('assets/scripts/GameApp.ts.meta').uuid.replaceAll('-','');
 let id=h.slice(0,5); for(let i=5;i<32;i+=3){const n=parseInt(h.slice(i,i+3),16);id+=alphabet[n>>6]+alphabet[n&63];}
 for(const name of ['Login','Game']) {
  const scene=json(`assets/scenes/${name}.scene`);
  assert.equal(scene[0].__type__,'cc.SceneAsset'); assert.equal(scene[1]._name,name);
  assert.equal(scene[3].__type__,id); assert.equal(scene[3].startInGame,name==='Game');
  assert.equal(scene[2]._components[0].__id__,3);
 }
});
test('art sources exist and source uses native Cocos components, not DOM', () => {
 for(const p of ['battle-bamboo','battle-temple','commander'])assert.ok(existsSync(new URL(`assets/resources/art/${p}.png`,root)));
 const s=read('assets/scripts/GameApp.ts');
 assert.match(s,/from 'cc'/); assert.match(s,/battle\.initialUnits/);
 assert.match(s,/settleBattle\(this.save, result\)/);
 assert.doesNotMatch(s,/document\.|innerHTML|<canvas/);
});
test('Creator version and resolution are explicit',()=>{
 assert.match(json('package.json').creator.version,/^3\.8\./);
 assert.equal(json('settings/v2/packages/project.json').general.designResolution.width,720);
 assert.equal(json('settings/v2/packages/project.json').general.designResolution.height,1280);
 assert.match(read('assets/scripts/GameApp.ts'),/setDesignResolutionSize\(720, 1280/);
});

test('every original PNG has a reproducible SpriteFrame import and matching dimensions', () => {
 for (const name of ['battle-bamboo','battle-temple','commander','fighter-sword','fighter-guardian','fighter-healer']) {
  const path=`assets/resources/art/${name}.png`;
  const bytes=readFileSync(new URL(path,root)); const meta=json(path+'.meta');
  assert.equal(meta.userData.type,'sprite-frame');
  const frame=meta.subMetas.f9941; const texture=meta.subMetas['6c48a'];
  assert.equal(frame.name,'spriteFrame'); assert.equal(frame.importer,'sprite-frame');
  assert.equal(frame.userData.rawWidth,bytes.readUInt32BE(16));
  assert.equal(frame.userData.rawHeight,bytes.readUInt32BE(20));
  assert.equal(frame.userData.imageUuidOrDatabaseUri,texture.uuid);
  assert.equal(texture.userData.imageUuidOrDatabaseUri,meta.uuid);
 }
 assert.equal(json('package.json').version,json('package.json').creator.version);
});
