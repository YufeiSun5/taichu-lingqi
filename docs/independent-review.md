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

## 2026-11-17 PLAY-02 首轮真实运行与修复待复验

受测基线 dfaf6ea4f9fb265264def0036e445f57a8e92fff，Mac Creator 3.8.8，隔离工程副本、Chrome 无痕预览。真实按钮 Login→Game 成功；点击开始战斗后停在指挥官事件，控制台提示 `scheduler#scheduleSelector. Selector already scheduled. Updating interval`。Cocos 一次性回调执行期间仍以函数身份注册；同一回调重排被当成旧定时器更新，执行后删除。六张 PNG 默认导入为 texture，没有 spriteFrame 子资源，画面使用几何回退。未完成连续推进、存档重开和其他旅程，不称可试玩。Mac 原检出未改源码，隔离副本仅编辑器自动修改版本并生成 meta/cache。

云端最小修复：以新闭包排队下一事件，原有 generation 与销毁取消保护保留；六张 PNG 按 Creator 3.8.8 官方 sprite metadata schema 显式导入，稳定 UUID、原图尺寸、不裁切；两个 package 版本字段统一 3.8.8。新增调度身份模拟和资源元数据检查，40 项 Node 测试通过。这仍不代替修复后真实运行验收。截图及控制台证据由 Mac 调试会话保存，待最终报告归档。

## 2026-11-17 PLAY-02 修复后真实预览验收

受测提交 `058f5ab9d08a34bcab65a5a13a7e1f867f7bd554`，Mac Creator 3.8.8、Chrome 无痕独立测试会话；不使用用户原检出或已有玩家存档。此前项目声明 3.8.7（顶层 version 为 0.1.0），实际编辑器为 3.8.8；本轮已统一两个声明字段为实际受测 3.8.8，不声称其他版本兼容。

真实按钮流程：Login→Game；首战完整结算到第 2 关，重复点击没有重复奖励（80→125）；招募扣费、指定上阵和两格交换；策略技能/条件/目标切换、添加删除排序，守御的“镇岳击”实际进入战斗；指挥官剑雨/火球效果、余额不足不扣费、足额升阶 1→2（95→35）；正常连续打过前六关，到第 7 关换云宫背景、解锁六格并放入新队员。没有注入关卡或调用内部 handler 代替玩家路径。三类战斗角色、背景和指挥官原图均实际渲染；旧重复 scheduler 警告未再出现。

关闭再打开预览页面后，第 7 关、165 灵石、五人阵容与策略恢复一致。这只证明同一无痕浏览器会话内页面重开，不是完整浏览器退出/重启持久性。随后只读核对重开后的指挥官截图：境界 3、165 灵石、选中万剑归宗，立绘和保存提示正常；未用截图独自推断全部养成过程。

云端回收该隔离副本实际生成的 19 个 assets 元数据：PNG 原 UUID/子资源引用及脚本 UUID 保持；目录和 README meta 纳入，脚本 importer 升为 4.0.24，背景 RGB hasAlpha 规范为 false。未复制项目设置迁移或 library/temp 缓存。规范化后 `npm test` 40/40、`git diff --check` 通过。独立审查通过调度负向对照：旧同一回调只能前进一步，新闭包可完成结算；这项仍是模拟，不冒充实际运行。

结论：本地 Creator 预览的核心试玩正常流程可用，不是小游戏平台发布验收。未覆盖：第 13 关正常旅程、完整浏览器重启、战斗中断/后台、存储故障恢复 GUI、微信/抖音构建和真机、性能预算、最终美术风格。静态角色复用、无骨骼动作及部分文字对比度仍属于原型质量限制。

收尾补核：最终元数据提交 `1735bef9d8131e75cf5af44905905196ff8fd756` 的 19 个 meta 与实际受测隔离副本逐字节相同，无新增 UUID 漂移；没有重新执行整轮六关。Mac 原检出保持干净。系统应用状态确认 Creator 已退出，7456 无监听，浏览器清单仅余新标签页；测试证据与隔离副本保留，未删除用户数据。证据由本次 Mac 隔离测试保存（编号 09、17–18、23、34–35、37、40–44）。本仓库未配置 CI，不把本地测试写成 CI 通过。

## PORTRAIT-01 竖屏首轮（真实复验待完成）

720×1280 全页面重排，保留左右对峙；招募分页、单人策略切换、角色大图详情、空阵位与失败养成引导。守御/剑修默认职业技能优先，用户自定义策略不被覆盖。51/51 Node 测试通过，含8项布局记录器检查（1/7/13关、完整按钮边界、招募/策略翻页、存储重读确认、胜败结算）。记录器不加载Cocos、不渲染字体，不能证明真实画质或触控正确。原有横屏运行记录不能替代竖屏复验；正式美术/角色动画未达最终成品验收。

## PORTRAIT-02 / TACTICS-02 云端合并检查（真实复验待完成）

65/65 Node 测试通过。人物、阴影和 HUD 分层，按实测图像锚点校正脚底，事件驱动血条/死亡标记/行动目标反馈；保存错误跨面板持续显示。技能引入每场灵力2点、职业技耗2/普攻回1，新增action描述符并按行动效果结束更新显示，不额外增加描述符回放等待；Save/StrategyRule未迁移。测试独立从事件重建HP/灵力，覆盖不足续查、群攻单次扣费、无目标不扣、确定性与失败免费重试；4条正常经济路径通过前13关。此为规则/记录器证据，非引擎图形通过。

b18752c 的 Mac Creator 3.8.8 实际竖屏首屏被明确判定视觉不通过：旧横图裁切造成角色浮在天空/远山，人物比例过小，上下深色大矩形占屏、亮背景上的文字低对比。用户亦明确否决当前画面；新资源和构图须实质重做后复验。首次Creator附带TypeScript检查报告21条assets诊断（ES2016–2019标准库缺失及连带类型问题），云端补ES2019/DOM lib，等待真实生成声明复查；引擎声明自身诊断另记，不用skipLibCheck掩盖源代码错误。assets meta无漂移。

补充 a5ae396 真实类型复核：Creator 3.8.8 生成工程声明、编辑器附带 TypeScript5.8.2，assets 源码诊断为0；显式 `--skipLibCheck` 后 exit0。未跳过库声明时仍 exit2，剩余来自引擎 `.d.ts`，不称全部库声明通过。元数据无差异。390×844 的预览壳需切“网页全屏”，固定720设计模式导致的裁切不是游戏缺陷；实际手机viewport截图仍视觉不通过。

## PORTRAIT-03 待引擎复验的云端检查（2026-11-17）

以a5ae396为父版本：九人独立静态立绘、竖屏竹林连续地面、薄顶栏/紧凑底栏、标准Button、遮罩、剑雨/火球透明源图及命中时序。独立审查指出法术先扣血后落点，已改为0.24/speed命中回调统一更新HP/死亡/飘字，三剑一次性且代际保护；原0.65/speed事件节拍保留。资源缓存引用成对持有/释放。全套Node规则、mock展示与工程资源测试76/76，git diff --check通过；动态PNG完整性、尺寸及UUID链检查覆盖新资源。此记录不是Creator类型或运行、美术验收；用户否定的旧画面不能据此宣称已改善到目标品质。动作图未纳入此版本，仍待独立运行接入。
