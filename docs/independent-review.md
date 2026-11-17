# Independent review — 2026-11-17

Scope: source and pure-rule validation on Linux cloud workspace, not Creator runtime QA.

## Executed
- `npm test` on Node 24: 15/15 pass (12 rule tests, 3 project-structure tests).
- Read Login/Game scene JSON, GameApp script, rule module and metadata.
- Inspected three PNG files; commander portrait is a valid 1312×1199 RGBA image. Backgrounds are 1672×941 RGB images.

## Findings addressed by implementation agent
- Detached UI nodes were not destroyed on page refresh. Clear now destroys old children.
- Battle-preview errors could overwrite save with defaults. Removed destructive fallback.
- Camera far plane now explicit at 2000 for UI at distance 1000.
- Battle simulation error resets the running lock rather than leaving inputs blocked.

## Limits
- Creator is not installed; these tests do not establish successful scene import, TypeScript compilation against real Cocos declarations, engine rendering or interaction correctness.
- Resource path and UI geometry reviewed statically only. Real SpriteFrame loading and final image dimensions need Creator verification.
- Characters remain procedural geometric placeholders; the commander portrait and backgrounds are original raster assets. This is not a finished visual match to Unicorn Overlord.
- No WeChat/Douyin build, developer-tool test or device test was run.
- A minimal editable tactics system is now present (see final strategy recheck below). Infinite stage indexing is not infinite-content or long-term balance validation.

## Final source recheck
- SpriteFrame assignment now sets CUSTOM first, then explicitly restores 1280×720 backgrounds and 450×410 portrait. This removes the identified default-size override risk.
- `npm test` repeated on final UI source: 15/15 pass.
- COCOS-SETUP.md correctly specifies Login as preview/start scene and requires both Login and Game in builds.
- Script component compressed UUID matches the GameApp metadata; both scene metadata UUIDs and source names are present. PNG/folder metadata is not checked in and must be generated on first Creator import; verify spriteFrame subassets then.
- Remaining blocker to calling this playable: actual Creator import, compilation and GUI execution have not occurred.

## Final strategy integration recheck
- Independently reran `npm test`: 19/19 pass (16 core tests, 3 structure tests).
- Reviewed GameApp imports against actual core exports. Strategy UI cycles skill/condition/target, preserves order via up/down, adds/deletes within 1–3 rules, calls setStrategy, persists and redraws. Nine owned-hero selectors fit the specified 720px design area statically.
- Executed an additional independent 270-case simulation sweep: each of nine heroes × two skill options × five conditions × three target preferences at stage 13 with full formations. All completed without exception and maintained finite HP in [0,maxHp]. This is a smoke sweep, not an exhaustive proof of tactics or balance.
- Rules now actually control first-match action selection; old saves fall back to defaults. Target conditions and front blocking are covered by existing tests.
- No new blocking source mismatch found. Real Cocos compilation, resource import, scene switching, touch interactions, visual layout and device builds remain unverified.

## 2026-11-17 · Approved collaboration-document initialization

- Scope: cloud-only documentation; no game/source/test/config changes, no user-computer access, commit or push in this task.
- Product under test: HEAD `a000f837f079204ed0cefde083304397760e72c5`, with documentation-only working-tree additions. Product fingerprint SHA-256 `03b9fe7e8b933764866643acb0886c0e5eb121324573de02ac82eb2ef86344a1` (tracked assets/tests/package.json/tsconfig.json/settings, `git ls-files` order, concatenated path + NUL + bytes + NUL). `git diff HEAD` for those paths was empty.
- Environment and entry: Linux cloud, Node v24.22.1, project-root `npm test`. Expected existing rule/structure suite success; actual exit 0, 19/19 passed. No Cocos or storage mocks were added. These tests exercise internal rules/structure, not UI journeys. npm environment and module-type warnings remain; they did not cause failures.
- Documentation validation: 31 local links/explicit anchors across all seven changed documents resolved. Manual review checked boundary responsibilities, current versus planned paths, input/output contracts, source dependencies versus runtime flow, state ownership, two flows, five source-derived journey entries, read triggers and test limitations.
- Side effects/cleanup: only documentation was written. Tests started no service and wrote no player save; no instance cleanup required. Evidence is preserved in this report and its source-linked documents.
- Risk correction: the earlier non-destructive *battle preview* fallback fix does not establish safe *save loading*. Current GameApp.load catches read/validation exceptions and returns a new Save; a later write could replace malformed prior data. persist failure also does not provide a durable-success result to the settlement message. These are source findings, not runtime reproductions; active follow-up is owned by SAVE-01/02 in AI_BOARD.md, not silently fixed by this documentation task.
- Not executed: Creator import/real types/GUI, storage-fault and restart journeys, device build/runtime, performance and visual acceptance. Current blocked/open states live only in AI_BOARD.md. No pstack, third-party workflow, new CI or verification tool was installed or imported.

Navigation: [project entry](../AGENTS.md), [architecture contract](../.ai/docs/architecture.md), [feature map](../COCOS-SETUP.md#feature-map), [verification contract](../COCOS-SETUP.md#verification-contract), [active board](../AI_BOARD.md).

## 2026-11-17 · PLAY-01 storage and character-art recheck

- Reviewed only the cloud workspace; no user-computer access. This section is the reviewer's only project-file change. Source baseline HEAD: `4b3405db38e07c286baffe3acdd0b445e0412c40` plus the PLAY-01 working tree.
- Final product fingerprint: SHA-256 `329b0aa2c3f2751db91d7c8842912aa422a26d7745700518ac9cc3fa279961f3`. Method: sorted unique tracked and untracked non-ignored files under assets, tests, package.json, tsconfig.json and settings (25 files), concatenated path + NUL + bytes + NUL. Includes new assets, adapter and tests; excludes collaboration documents.
- Independently reran `npm test` with Node v24.22.1: exit 0, **37/37 passed** (16 core, 3 structure, 14 storage, 4 application-orchestration tests). Storage is an injected in-memory fake; orchestration strips TypeScript/decorators and replaces Cocos/rendering. Neither is an engine execution or real restart journey. No player save or service was created by these tests.
- Independently ran the temporary partial type checker against declarations emitted from official Cocos 3.8.7 source: exit 0, **0 app diagnostics**. It uses selected engine exports plus globals and `skipLibCheck`; this is not Creator's generated full project environment, complete engine typecheck, scene import or build. `git diff --check` also passed.
- Reviewed LocalSaveStore: absent/valid/corrupt/unreadable states are distinct; load failures do not silently replace the primary save. Explicit corrupt-save recovery verifies a unique raw backup before replacement. Temporary sessions cannot write. Writes require validation, baseline comparison and exact read-back; failed or blocked writes do not return saved. Retry after uncertain read-back is covered. Tests cover backup/write/read failures, silent corruption, conflicts, old-save compatibility and no duplicate settlement reward on save retry.
- Reviewed GameApp integration: initial fresh saves attempt persistence, static session state survives scene navigation, failed saves preserve in-memory progress and display an unsaved state, retry is explicit, and discarding memory for a reread requires a confirmation UI. Settlement copy distinguishes in-memory reward from persistence success. These conclusions are source/mock evidence, not actual UI observations.
- Review fixes now present: the modal has its own live save-status label; formation says “返回战场” rather than implying a save; strategy help says saving is attempted and points to the status. Character rows are centered at 190/40/-110, with 96px art and name/HP below, removing the identified overlap in static geometry. Lowest HP label bounds remain above the bottom panel. Actual font, transparent padding, resource loading, touch behavior and visual readability remain to be checked in engine.
- Three new fighter PNGs are valid RGBA assets (guardian 1238×1271, healer 1199×1312, sword 1229×1280). The source selects by role, mirrors enemies, sets CUSTOM before assigning SpriteFrame, restores explicit dimensions and retains geometric fallback on load failure. These are reused static figures, not unique animated art for all heroes. Earlier placeholder-only statements in this report describe historical versions.
- Remaining data limitations: localStorage read/check/write is not atomic compare-and-swap; the baseline guard reduces stale overwrite but does not guarantee simultaneous multi-instance safety. Read-back is not proof of future OS/browser durability or a successful real restart. Backups remain in the same local storage, not external recovery copies. Platform storage behavior is untested.
- **Runtime acceptance remains blocked/unexecuted.** Creator is unavailable. The engine investigation reported socket/file-access restrictions; no successful engine page, scene import, rendered game, input journey or real save-restart test was observed. No WeChat/Douyin build, device verification, performance or final art acceptance occurred. Passing this source review supports committing the implementation, not calling it a verified playable release.
