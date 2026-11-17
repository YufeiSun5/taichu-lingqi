import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root));
const base='assets/resources/fonts/';
const font=read(base+'TaichuUISerifSubset-SemiBold.ttf');
const manifest=JSON.parse(read('tools/fonts/manifest.json'));
function tables(){const t={};for(let i=0;i<font.readUInt16BE(4);i++){const o=12+16*i;t[font.toString('ascii',o,o+4)]={offset:font.readUInt32BE(o+8),length:font.readUInt32BE(o+12)};}return t;}
const tt=tables();
function coverage(){const out=new Set(),base=tt.cmap.offset;for(let j=0;j<font.readUInt16BE(base+2);j++){const o=base+font.readUInt32BE(base+4+8*j+4),format=font.readUInt16BE(o);if(format===12){for(let k=0;k<font.readUInt32BE(o+12);k++){const g=o+16+12*k,start=font.readUInt32BE(g),end=font.readUInt32BE(g+4),id=font.readUInt32BE(g+8);for(let cp=start;cp<=end;cp++)if(id+cp-start)out.add(cp);}}else if(format===4){const n=font.readUInt16BE(o+6)/2,ends=o+14,starts=ends+2*n+2,deltas=starts+2*n,ranges=deltas+2*n;for(let k=0;k<n;k++){const start=font.readUInt16BE(starts+k*2),end=font.readUInt16BE(ends+k*2),delta=font.readInt16BE(deltas+k*2),range=font.readUInt16BE(ranges+k*2);for(let cp=start;cp<=end&&cp<65535;cp++){let id=range?font.readUInt16BE(ranges+k*2+range+2*(cp-start)):cp;if(id)id=(id+delta)&65535;if(id)out.add(cp);}}}}return out;}
const cmap=coverage();
const isSourceGlyph = c => /\p{Script=Han}/u.test(c) || (c.codePointAt(0) >= 32 && c.codePointAt(0) < 127);
function assertSourceCovered(text) {
  for (const c of text) if (isSourceGlyph(c)) {
    assert.ok(cmap.has(c.codePointAt(0)), `New UI character requires font rebuild: ${c}`);
  }
}
test('coverage guard rejects an injected uncovered Han character', () => {
  assert.equal(isSourceGlyph('契'), true);
  assert.equal(isSourceGlyph('龘'), true);
  assert.equal(cmap.has('龘'.codePointAt(0)), false, 'negative-test glyph must remain outside this UI subset');
  assert.throws(() => assertSourceCovered('太初灵契龘'), /requires font rebuild: 龘/);
  assert.doesNotThrow(() => assertSourceCovered('太初灵契 ABC 123'));
});

test('font is a small static genuine TrueType 600, with reviewed hash',()=>{assert.equal(font.readUInt32BE(0),0x00010000);assert.ok(tt.glyf&&tt.loca);assert.ok(!tt['CFF ']&&!tt.CFF2&&!tt.fvar);assert.equal(font.readUInt16BE(tt['OS/2'].offset+4),600);assert.equal(font.length,manifest.outputBytes);assert.ok(font.length<400000);assert.equal(createHash('sha256').update(font).digest('hex'),manifest.outputSHA256);});
test('font covers manifest and all current Han/ASCII UI source without silent fallback',()=>{const chars=read('tools/fonts/characters.txt').toString().trimEnd();assert.equal([...chars].length,manifest.characterCount);for(const c of chars)assert.ok(cmap.has(c.codePointAt(0)),`Missing manifest U+${c.codePointAt(0).toString(16)}`);const source=[read('assets/scripts/GameApp.ts').toString()];const dir=new URL('assets/scripts/core/',root);function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.ts'))source.push(fs.readFileSync(p,'utf8'));}}walk(dir.pathname);assertSourceCovered(source.join(''));assert.deepEqual(manifest.missing,[]);});
test('license and renamed internal font family are shipped',()=>{const license=read(base+'OFL.txt').toString();assert.match(license,/SIL OPEN FONT LICENSE Version 1.1/);assert.equal(read('tools/fonts/OFL.txt').toString(),license);const n=tt.name.offset,count=font.readUInt16BE(n+2),strings=n+font.readUInt16BE(n+4);const names=[];for(let i=0;i<count;i++){const o=n+6+i*12,platform=font.readUInt16BE(o),id=font.readUInt16BE(o+6),len=font.readUInt16BE(o+8),start=strings+font.readUInt16BE(o+10);if(platform===3){let s='';for(let k=0;k<len;k+=2)s+=String.fromCharCode(font.readUInt16BE(start+k));names.push([id,s]);}}assert.ok(names.some(([id,s])=>id===1&&s==='TaichuUISerifSubset'));assert.ok(names.some(([id,s])=>id===0&&s.includes('Adobe')));assert.ok(names.some(([id,s])=>id===13&&s.includes('Open Font License')));});
test('font assets each have unique importer metadata',()=>{const uuids=new Set();for(const name of ['fonts.meta','fonts/TaichuUISerifSubset-SemiBold.ttf.meta','fonts/OFL.txt.meta','fonts/README.md.meta']){const m=JSON.parse(read('assets/resources/'+name));assert.match(m.uuid,/^[\da-f-]{36}$/);assert.ok(!uuids.has(m.uuid));uuids.add(m.uuid);if(name.includes('.ttf'))assert.equal(m.importer,'ttf-font');}});
