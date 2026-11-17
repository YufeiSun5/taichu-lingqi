// Orchestration tests only. Cocos rendering is deliberately not mocked as runtime acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes, registerHooks } from 'node:module';
import { stageBackdrop } from '../assets/scripts/presentation/BattleStage.ts';
import * as core from '../assets/scripts/core/game.ts';
registerHooks({ resolve(specifier, context, nextResolve) {
 if (specifier.endsWith('/core/game')) return nextResolve(specifier + '.ts', context);
 return nextResolve(specifier, context);
}});
const { LocalSaveStore } = await import('../assets/scripts/infrastructure/LocalSaveStore.ts');
let source = readFileSync(new URL('../assets/scripts/GameApp.ts', import.meta.url), 'utf8');
source = stripTypeScriptTypes(source.replace(/^@ccclass\([^\n]+\)\n/gm, '').replace(/@property /g, ''), { mode: 'strip' });
source = source.replace(/^import[^\n]+\n/gm, '').replace('export class GameApp', 'class GameApp');
const GameApp = new Function('_decorator', 'Component', 'Node', 'LocalSaveStore', 'isValid', 'Mask', 'stageBackdrop', 'Sprite', ...Object.keys(core), source + '\nreturn GameApp;')({}, class {}, { EventType: { TOUCH_END: 'touch-end' } }, LocalSaveStore, n => !!n && n.isValid !== false, class {}, stageBackdrop, class {}, ...Object.values(core));
function setup(raw = null) {
 GameApp.session = null;
 const values = new Map(raw === null ? [] : [['save', raw]]);
 const storage = { fail: false, getItem: k => values.get(k) ?? null, setItem(k,v) { if(this.fail) throw Error('quota'); values.set(k,v); } };
 const app = new GameApp(); app.store = new LocalSaveStore(storage, 'save');
 app.entered = 0; app.renderEntry = () => app.entered++;
 app.recovery = (kind, message) => app.issue = { kind, message };
 app.toast = message => app.lastToast = message;
 return { app, storage, values };
}
test('app fresh startup persists before reporting saved', () => {
 const {app, values} = setup(); app.load();
 assert.equal(app.entered, 1); assert.equal(app.saveState, 'saved');
 assert.deepEqual(JSON.parse(values.get('save')), core.createSave());
});
test('app fresh startup write failure enters playable unsaved session, not false success', () => {
 const {app, storage, values} = setup(); storage.fail = true; app.load();
 assert.equal(app.entered, 1); assert.equal(app.saveState, 'unsaved'); assert.equal(values.has('save'), false);
 assert.equal(GameApp.session.save, app.save); assert.equal(GameApp.session.state, 'unsaved');
 storage.fail = false; assert.equal(app.persist(), true); assert.equal(app.saveState, 'saved');
});
test('app corrupt startup routes to explicit recovery without overwriting', () => {
 const {app, values} = setup('broken source'); app.load();
 assert.equal(app.entered, 0); assert.equal(app.issue.kind, 'corrupt'); assert.equal(values.get('save'), 'broken source');
 assert.equal(GameApp.session, null);
});
test('app session-only writes preserve unknown original and remain visibly temporary', () => {
 const {app, values} = setup('broken source'); app.store.load(); app.store.useSessionOnly();
 app.save = core.createSave(); app.saveState = 'session';
 assert.equal(app.persist(), false); assert.equal(app.saveState, 'session');
 assert.match(app.saveDescription(), /不会保存/); assert.equal(values.get('save'), 'broken source');
});

// Model the Cocos one-shot identity rule: a callback stays registered while it
// runs, then is removed. Scheduling that SAME callback during execution updates
// its old timer and is lost on removal. This is not a renderer acceptance test.
function replayHarness() {
 const { app } = setup(); app.load(); app.isValid = true;
 app.root = { children: [], getComponent: () => null }; app.status = { string: '' };
 app.make = () => ({ on() {}, destroy() {} });
 app.open = () => ({}); app.label = () => ({}); app.button = () => ({});
 const timers = new Map();
 app.scheduleOnce = (fn, delay) => { if (!timers.has(fn)) timers.set(fn, delay); };
 app.unscheduleAllCallbacks = () => timers.clear();
 return { app, timers, tick() {
  const fn = timers.keys().next().value; if (!fn) return false;
  fn(); timers.delete(fn); return true;
 }};
}
test('battle replay survives one-shot scheduler identity and settles exactly once', () => {
 const { app, timers, tick } = replayHarness();
 const expected = core.settleBattle(app.save, core.simulateBattle(app.save));
 app.fight(); app.fight(); // Double tap cannot start a second replay.
 let count = 0; while (tick()) { assert.ok(++count < 1000); }
 assert.ok(count > 2, 'replay continues beyond its first scheduled callback');
 assert.equal(app.running, false); assert.equal(timers.size, 0);
 assert.deepEqual(app.save, expected); assert.equal(app.saveState, 'saved');
});
test('destroyed replay cannot settle a stale queued callback', () => {
 const { app, timers } = replayHarness(); const before = structuredClone(app.save);
 app.fight(); const pending = timers.keys().next().value; app.onDestroy(); pending();
 assert.deepEqual(app.save, before); assert.equal(timers.size, 0);
});
