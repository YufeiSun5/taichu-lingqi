// Orchestration tests only. Cocos rendering is deliberately not mocked as runtime acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes, registerHooks } from 'node:module';
import * as core from '../assets/scripts/core/game.ts';
registerHooks({ resolve(specifier, context, nextResolve) {
 if (specifier.endsWith('/core/game')) return nextResolve(specifier + '.ts', context);
 return nextResolve(specifier, context);
}});
const { LocalSaveStore } = await import('../assets/scripts/infrastructure/LocalSaveStore.ts');
let source = readFileSync(new URL('../assets/scripts/GameApp.ts', import.meta.url), 'utf8');
source = stripTypeScriptTypes(source.replace(/^@ccclass\([^\n]+\)\n/gm, '').replace(/@property /g, ''), { mode: 'strip' });
source = source.replace(/^import[^\n]+\n/gm, '').replace('export class GameApp', 'class GameApp');
const GameApp = new Function('_decorator', 'Component', 'LocalSaveStore', ...Object.keys(core), source + '\nreturn GameApp;')({}, class {}, LocalSaveStore, ...Object.values(core));
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
