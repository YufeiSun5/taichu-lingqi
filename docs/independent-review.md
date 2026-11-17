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

## STAGE-01 近景战斗重构：云端门禁（2026-11-17）

父版本ee04ae2。战前全阵与战中近景分离；新增纯展示BattleStage模块，左右固定、大人物焦点、同侧治疗错层、底角阵盘、原创舞台与手绘技能横幅，凌霄四关键姿势运行时切片。规则及存档结构未改。

独立审查发现并修复：离镜神通错误借用首个人物为视觉靶点，现按真实mini节点worldPosition转root；冷加载未等素材齐便回放，现等待舞台、选中法术、指挥官、横幅与全队原图，失败/10秒超时提供重试且不结算；治疗浮签至少75间距。mock补真实position/worldPosition和reparent子节点模型，不能据此冒充引擎。

集成者与独立审阅者均实跑95/95 Node测试，git diff --check通过。当前尚无新近景Creator截图/触控/动作实测；Mac前台被其他操作切换后QA停止点击避免抢占。须复验冷加载、神通第3/9目标、首焦点死亡、治疗遮挡、岳沉山矛与姓名、四姿势裁切及首尾、全屏边界、六类动作与1×/2×。不以测试数或新素材数量认定符合参考品质。

STAGE-01 补核：已发布 `15b1d1441d496fffb98c5e13a047e7f1a6d44811` 对四姿势透明轮廓测量后将凌霄普通对峙位置从±170内收至±150，保持440身体高度；普通角色浮签上移避开岳沉山矛尖。98/98 Node测试通过。Mac隔离副本同步该提交后，Creator3.8.8实际生成声明配套TypeScript5.8.2，`--noEmit --skipLibCheck`退出0；此前不跳库检查的剩余诊断来自引擎声明。编辑器导入尚未刷新，未重启GUI，不能把此项写成新舞台已运行。原用户检出及隔离assets/meta无改动。待控制窗口后仍需新舞台实拍与真实旅程。

## STAGE-02 云端独立审查中

已按源PNG alpha>16测量九人完整轮廓（含弓/剑/袍摆），正反方向、近景对峙与同侧治疗后排均纳入边界测试；这只能证明给定几何映射，不证明实际遮挡、体积、渲染质量。新增六波区域1/6/7/12/13/18/19的独立近景背景映射测试，准备页背景与近景背景不可混用。登录界面修正半身源图截边、渐变分段及废弃描边属性，结构/晚回调测试通过；实际页面仍未重新查看。

STAGE-02 集成者完整检查：113/113 Node测试、git diff --check通过。三地区近景按与整备相同的六波region选择，战斗开始锁定key贯穿加载门禁与实际舞台。登录不再请求战斗舞台、法术或动作图；准备页只请求当前舞台、选定法术、共用横幅/指挥官与必要角色。动态Sprite赋帧不会自行持有引用，所有展示回调改由应用owner持有；清空旧Sprite引用后再配对释放过期舞台/法术/准备背景，迟到回调不减未拥有的引用。相邻Game/Login共享资源、100次重绘、区域乱序、同key重试、销毁晚回调纳入模拟检查。

集成复核发现并修复一项冷加载回归：fight推进事件generation，不应使正在等待的原图页面回调失效。现独立displayGeneration只在页面清理/销毁变更；新增game→立即fight→交付真实pending回调→门禁仅启动一次的模拟测试，不手填ready集合。上述全部仍为云端源码/替身检查，尚无本轮Creator类型复验、新舞台截图或设备性能结论。八姿势直刺研发仍留仓库外，首稿跨格/非整数切格已拒绝接入，不随本轮发布。

独立只读审阅者亦执行113/113全测与diff检查，未发现阻断送Creator验证的生命周期问题。FakeFrame只验证计数，不模拟真实依赖销毁、缓存队列或GPU回收；真实冷进开战、失败重试、场景往返和6→7/12→13仍须复验。

## STAGE-02 首轮真实近景运行（8e9be77）

Mac隔离Creator3.8.8已在用户明确允许后重启导入，Chrome无痕390×844网页全屏。实际编辑器声明+TypeScript5.8.2 `--noEmit --skipLibCheck`退出0，原检出保持干净。集成者逐张查看原始截图17–19、21、23、24：Login、整备、新竹林近景、普通敌我对峙、离镜目标反馈、治疗均实际渲染，不是静态模拟合成。

正常保留测试档第2关45石开始，1倍胜到第3关95石；第3关2倍与双击开始胜到第4关150石，重复结算未重复奖励。双击招募白凝霜只扣80，余70，替换上阵与策略有效。第5关实拍回春诀岳沉山+36；正常完成第6关到第7关，境界2、205灵石、六位置解锁，寺院整备与近景真实加载，补队员后六人正常胜。尚不据此称第13关、存储故障或平台验收通过。

**视觉仍未通过**：17/18上下青色留边；19指挥官半身原图在地面硬截底；24治疗施法者前景遮住受疗者，正数落后层；21浅色衣纹上伤害数对比不足。新舞台比例与实际接地已显著不同于旧全阵小立绘，但不因此宣称达到参考游戏品质。控制台目前未报告阻断或资源错误，报告了View.getFrameSize弃用，安排官方API替换。证据保存在隔离测试目录，编号27为正常第7关寺院连续截图。后续修复必须以新SHA复验。

补充正常旅程：8e9be77在Chrome真正Reload后重新加载引擎与Login，第8关250灵石及六人阵容恢复一致（证据28）；随后正常通过8、9、10关，未报告新JS错误。此为页面刷新持久化，不扩大成完整浏览器退出恢复。

## STAGE-03 对实拍问题的云端修正

外层Canvas保留Camera，视口背景独立等比覆盖实际窗口，720×1280安全内容仍裁切；clear/onDestroy同时解除外层背景Sprite引用再释放，旧回调仍有页面代际保护。神通改为150圆形头肩cut-in，地面不再摆半身像。只有actor存在的同侧双人支援将受疗者置前、施法者置后；无actor神通与自疗维持语义，治疗数值在根前景，所有正负数加暗描边与粗体。核心规则、奖励、存档无改动。

集成者最终119/119全测与diff检查通过。独立审阅先执行118项，发现手册旧示例Mask.Type.ELLIPSE被mock掩盖，已依v3.8.8官方源码改GRAPHICS_ELLIPSE并收紧mock；新增正负反馈可读性断言再跑119。仍须真实Creator编译、Canvas适配、圆形裁切和治疗截图。当前窗口尺寸在重绘时计算，未声明支持任意实时旋转/resize。不把几何测试当作新的视觉通过。

7e558fd实际Creator声明检查通过，真实截图41确认圆形指挥官头像裁切成功、不再将半身像放地面；治疗岳沉山在前、苏灵音在后，目标不再被医修遮挡；敌方莲心自疗只有单主体，绿色+35暗描边在前景可读。39/40却证实全视口修复仍有横接缝：背景扩满但渐变和胸像仍被旧安全框截断，故该版本不算整页视觉通过。

后续小修将Login胸像及两页渐变移至未遮罩背景层，冠顶固定340、源图底部固定在实际视口下80设计像素，原图比例保持；渐变自真实窗口上下边缘起，深度包含超出安全区的半高，文字触控仍留安全框。当前发布范围120/120 Node测试通过；工作树另有5项尚未发布字体资产测试，不混为该源码提交的实机证据。仍待新SHA实际截图复验。

## 0483195 实机补核与 TYPE-01 待发布检查

集成者亲自逐张查看42-0483195-login及43-0483195-preparation原始截图：390×844初始页面的上下青边、渐变横缝和Login胸像安全框截断已消除。QA使用真实Creator3.8.8声明检查通过，导入后assets/meta无漂移；正常第15关胜至16关、460灵石，320×568策略九人可切换、三条策略可见。在线从320×568切至390×932仍出现青边，冷Reload长屏恢复正常，故尚不支持稳定实时resize，已回云端修复，不以初始截图覆盖此回归。

此前7e558fd通过官方web-mobile构建面板完成调试构建（Login/Game均包含，VConsole关闭），但尚未运行导出包入口，不能把构建成功或编辑器预览等同包内旅程或小游戏真机。

TYPE-01字体工作树131/131 Node测试及独立只读审查通过：真实TTF静态600子集、517字符覆盖、许可及哈希、显式标题/主按钮白名单、缺字整段sans回退、晚回调/页面切换/共享引用配对均检查；纯数字、小字、战斗日志不替换。实际Creator导入、nativeUrl注册、字形/行高/SHRINK及手机截图仍未执行。字体Git blob与本地hash-object一致；源文件249412字节，不包含24MB上游字体或离线字样图。后续resize改动需重新完整测试，131不是下一版本最终计数。

TYPE-01 + VIEWPORT-01集成：132/132 Node全测通过。screen window-resize注册/销毁解绑，当前页面有界节点布局表仅调整背景、渐变、Login立绘几何，异步素材按最新窗口计算；不重新开始战斗、清状态、发资源请求或修改存档。20次320×568↔390×932往返及战斗中resize的替身测试通过，真实引擎复验仍待新提交。QA在048正常完成16、17关，18关/585灵石开战后立即真实Reload，返回仍18/585，未提前结算（52/53证据），不把中断后重新开战称断点续战。

## c78cd7d 真实预览与正式包分歧：发布阻断

真实Creator3.8.8导入后TS检查通过，字体TTFFont原UUID不变、assets/meta零漂移；预览宋体标题/主要按钮/招募九人已实际加载，普通小字仍sans。预览长短屏往返及演出中resize无青边，死亡/HP继续推进，不重复神通。正常测试档18关/585灵石中断刷新未结算。

正式web-mobile调试构建成功，包约50MB，官方Run打开导出入口后实际Login→Game成功，使用普通Chrome独立旧档3关/175灵石，未改无痕正常档。**但正式包开战空场停住**，报stageFocus读取undefined.uid。QA只读bundle确认Set展开被编译为`[].concat(new Set(...))`，Set整体变为一个元素；Node与编辑器预览没有经过同一转换，因此之前测试不证明包可玩。调试FPS叠层仍存在，不做DOM隐藏伪装正式画面。

云端修复所有非数组展开：BattleStage Set、GameApp Map/Set集合迭代/values排序、Typeface字符串均显式Array.from；核心其余spread/for-of输入是真数组，已检查。新增精确旧bundle表达式回归可复现崩溃，再验证新实现。字体修复也须正式包重新确认，预览字形成功不可代替正式包。此问题未复验前维持发布包运行失败状态。

## ENCOUNTERS-01 与 PRESENTATION-04 集成候选

18关明确敌阵/slot策略，Save v1、经济、伤害不变；19/30/100完整战报与旧版哈希一致。三种公开API经济路线×两神通均通18，无注入资源，最终115灵石/5级/九人；混合先升阶路线剑雨10关215币4级、火球9关160币4级首败，用当时资金招募恢复。具体序列及旧fixture变化见core/README。第3关仅改后排优先不能独自改变赤璃目标行，已通过实际事件断言校正设计假设；此批不发布未经验证的教学承诺。

战果改专用透明overlay、保留实际结束舞台，奖励为settle前后coins差；回合/存活/战报来自结果，无MVP虚构。保存重试只persist而不重复结算。指挥官改明确胸肩肖像窗和薄云玉案收口。两张原画等比、迟到回调/缓存持有，100次弹窗替换布局表有界通过。当前151/151 Node全测及diffcheck通过，独立审查未发现阻断云端正确性；不等同真实引擎的新UI、遭遇或正式包通过。

字体扩为533字符/401汉字，255588字节，SHA256 `62629459758eb2ab9d6d7a6489f923b0146beac2e1fcf3d88874415112ef98ed`；源码字符抽取扩展presentation并排除生成Typeface自身。UUID/许可不变，新字节须实际重新导入和构建。
