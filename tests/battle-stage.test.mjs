import test from 'node:test';
import assert from 'node:assert/strict';
import { stageFocus, stageCell, stageCover, preparationBackdrop, stageBackdrop } from '../assets/scripts/presentation/BattleStage.ts';
const units=Array.from({length:18},(_,i)=>({uid:`u${i}`,side:i<9?'ally':'enemy',row:Math.floor(i%9/3),col:i%3}));
test('enemy attacks preserve faction sides and all focus bodies occupy 28–40 percent height',()=>{
 for(const [actor,target]of [['u0','u9'],['u9','u0']])for(const item of stageFocus(units,actor,[target])){
  assert.equal(item.x<0,Number(item.uid.slice(1))<9);assert.ok(item.bodyHeight/1280>=.28&&item.bodyHeight/1280<=.4);assert.ok(item.footY<-115);
 }
});
test('healing stays on its own side, self-healing is one figure, group attack never shrinks the full roster',()=>{
 const heal=stageFocus(units,'u1',['u3']);assert.ok(heal.every(item=>item.x<0));assert.notEqual(heal[0].footY,heal[1].footY);assert.equal(Math.abs(heal[0].x-heal[1].x),120);assert.equal(heal[0].bodyHeight,330);assert.equal(heal[1].bodyHeight,410);
 assert.equal(stageFocus(units,'u1',['u1']).length,1);assert.equal(stageFocus(units,'u1',units.slice(9).map(u=>u.uid)).length,2);
});
test('miniature formations retain their uncompressed row and front column orientation',()=>{
 for(const unit of units){const cell=stageCell(unit);assert.equal(cell.y,-420-unit.row*58);assert.equal(cell.x<0,unit.side==='ally');assert.ok(Math.abs(cell.x)<320);}
});
test('portrait and landscape surroundings cover the viewport without stretching character art',()=>{
 for(const [w,h]of [[390,844],[720,1280],[1440,900]]){const cover=stageCover(w,h);assert.ok(cover.width>=720&&cover.height>=1280);assert.ok(Math.abs(cover.width/cover.height-w/h)<1e-10);}
 assert.deepEqual([0,1,2,3].map(preparationBackdrop),['battle-bamboo-portrait','battle-temple-portrait','battle-underworld-portrait','battle-bamboo-portrait']);
});

test('full 440-high sword action alpha contours stay inside the portrait on both sides',()=>{
 const boxes=[[118,133,516,564],[129,92,454,564],[67,159,572,547],[118,135,513,547]];
 const feet=[[275,562],[311.5,562],[268,545],[276,546]],scale=440/428;
 for(const side of ['ally','enemy']){
  const sword={uid:'sword',heroId:'sword',side,row:0,col:0},other={uid:'other',heroId:'guard',side:side==='ally'?'enemy':'ally',row:0,col:0};
  for(const [actor,target]of [['sword','other'],['other','sword']]){
   const layout=stageFocus([sword,other],actor,[target]),focus=layout.find(p=>p.uid==='sword'),mirror=side==='ally'?1:-1;
   assert.equal(focus.bodyHeight,440);assert.equal(Math.abs(focus.x),150);assert.equal(Math.abs(layout.find(p=>p.uid==='other').x),170);
   for(const [i,box]of boxes.entries()){
    const edges=[box[0],box[2]].map(x=>focus.x+(x-feet[i][0])*scale*mirror);
    assert.ok(Math.min(...edges)>=-360&&Math.max(...edges)<=360,`side ${side}, pose ${i}: ${edges}`);
   }
  }
 }
});
test('sword safety inset does not change same-side healing or original fixed atlas cells',()=>{
 const healer={uid:'healer',heroId:'healer',side:'ally',row:0,col:0},sword={uid:'sword',heroId:'sword',side:'ally',row:1,col:0};
 const focus=stageFocus([healer,sword],'healer',['sword']);assert.deepEqual(focus.map(p=>[p.x,p.bodyHeight]),[[-220,330],[-100,410]]);
});

test('measured alpha silhouettes of the complete roster fit close-up and same-side healing layouts',()=>{
 // Source PNG alpha >16 bounds, not body rectangles; weapons and robes count.
 const art=[
  ['archer',484,1389,25,47,1091],['mage',552,1285,70,158,980],
  ['blade',459,1183,20,92,1261],['lotus',504,1282,45,170,1007],
  ['frost',528,1283,42,150,988],['monk',578,1264,13,52,1150],
  ['guardian',625,1240,105,178,1022],['healer',590,1265,50,129,1090],
  ['sword',470,1254,6,13,1216],
 ];
 for(const [heroId,groundX,groundY,bodyTop,left,right]of art)for(const side of ['ally','enemy']){
  const unit={uid:'subject',heroId,side,row:2,col:2};
  const healer={uid:'healing',heroId:'healer',side,row:0,col:0};
  const opponent={uid:'opponent',heroId:'guardian',side:side==='ally'?'enemy':'ally',row:0,col:0};
  const contexts=[stageFocus([unit,opponent],'subject',['opponent']),stageFocus([unit,healer],'healing',['subject'])];
  for(const focus of contexts.map(items=>items.find(item=>item.uid==='subject'))){
   const scale=focus.bodyHeight/(groundY-bodyTop),mirror=side==='ally'?1:-1;
   const edges=[left,right].map(x=>focus.x+(x-groundX)*scale*mirror);
   assert.ok(Math.min(...edges)>=-360&&Math.max(...edges)<=360,`${heroId} ${side} alpha silhouette outside portrait: ${edges}`);
  }
 }
});

 test('six-wave region stage mapping cycles independently of preparation artwork',()=>{
  for(const [stage,expected]of [[1,'bamboo'],[6,'bamboo'],[7,'temple'],[12,'temple'],[13,'underworld'],[18,'underworld'],[19,'bamboo']]){
   const region=Math.floor((stage-1)/6);
   assert.equal(stageBackdrop(region),`battle-${expected}-stage`);
   assert.equal(preparationBackdrop(region),`battle-${expected}-portrait`);
   assert.notEqual(stageBackdrop(region),preparationBackdrop(region));
  }
 });

test('support foreground prioritizes recipient, commander targets retain first-target prominence',()=>{
 const support=stageFocus(units,'u0',['u1']);assert.ok(support[1].footY<support[0].footY);assert.ok(support[1].bodyHeight>support[0].bodyHeight);
 const divine=stageFocus(units,undefined,['u9','u10']);assert.ok(divine[0].footY<divine[1].footY);assert.equal(divine[0].bodyHeight,410);
 const self=stageFocus(units,'u0',['u0']);assert.equal(self.length,1);assert.equal(self[0].bodyHeight,440);
});


test('explicit iterable conversion avoids the observed c78 web-mobile loose-spread failure',async()=>{
 // Exact offending expression read from Creator 3.8.8 c78 build/assets/main/index.js:25.
 // This is a focused compiler-output regression, not a new Creator build acceptance.
 const byId=new Map(units.map(unit=>[unit.uid,unit])),actor='u0',targets=['u9'];
 const brokenIds=[].concat(new Set([actor].concat(targets).filter(id=>!!id&&byId.has(id)))).slice(0,2);
 assert.equal(brokenIds.length,1);assert(brokenIds[0] instanceof Set);
 assert.throws(()=>brokenIds.map(id=>byId.get(id)).map(unit=>unit.uid),TypeError);
 assert.deepEqual(stageFocus(units,actor,targets).map(unit=>unit.uid),['u0','u9']);
 assert.deepEqual(stageFocus(units,'missing',['u9','u9','missing','u10']).map(unit=>unit.uid),['u9','u10']);
 assert.deepEqual(stageFocus(units,undefined,['missing']),[]);
 assert.deepEqual(stageFocus(units,'u0',['u0','u0']).map(unit=>unit.uid),['u0']);
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../assets/scripts/presentation/BattleStage.ts',import.meta.url),'utf8');
 assert.ok(source.includes('Array.from(new Set('),'non-array iterables must be materialized before Creator loose spread lowering');
 assert.ok(!/\[\s*\.\.\.\s*new Set/.test(source));
});
