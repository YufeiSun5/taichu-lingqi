import test from 'node:test';
import assert from 'node:assert/strict';
import { stageFocus, stageCell, stageCover, preparationBackdrop } from '../assets/scripts/presentation/BattleStage.ts';
const units=Array.from({length:18},(_,i)=>({uid:`u${i}`,side:i<9?'ally':'enemy',row:Math.floor(i%9/3),col:i%3}));
test('enemy attacks preserve faction sides and all focus bodies occupy 28–40 percent height',()=>{
 for(const [actor,target]of [['u0','u9'],['u9','u0']])for(const item of stageFocus(units,actor,[target])){
  assert.equal(item.x<0,Number(item.uid.slice(1))<9);assert.ok(item.bodyHeight/1280>=.28&&item.bodyHeight/1280<=.4);assert.ok(item.footY<-115);
 }
});
test('healing stays on its own side, self-healing is one figure, group attack never shrinks the full roster',()=>{
 const heal=stageFocus(units,'u1',['u3']);assert.ok(heal.every(item=>item.x<0));assert.notEqual(heal[0].footY,heal[1].footY);assert.equal(Math.abs(heal[0].x-heal[1].x),120);assert.equal(heal[0].bodyHeight,410);assert.equal(heal[1].bodyHeight,330);
 assert.equal(stageFocus(units,'u1',['u1']).length,1);assert.equal(stageFocus(units,'u1',units.slice(9).map(u=>u.uid)).length,2);
});
test('miniature formations retain their uncompressed row and front column orientation',()=>{
 for(const unit of units){const cell=stageCell(unit);assert.equal(cell.y,-420-unit.row*58);assert.equal(cell.x<0,unit.side==='ally');assert.ok(Math.abs(cell.x)<320);}
});
test('portrait and landscape surroundings cover the viewport without stretching character art',()=>{
 for(const [w,h]of [[390,844],[720,1280],[1440,900]]){const cover=stageCover(w,h);assert.ok(cover.width>=720&&cover.height>=1280);assert.ok(Math.abs(cover.width/cover.height-w/h)<1e-10);}
 assert.deepEqual([0,1,2,3].map(preparationBackdrop),['battle-bamboo-portrait','battle-temple-portrait','battle-underworld-portrait','battle-bamboo-portrait']);
});
