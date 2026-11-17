# 太初灵契规则模块

纯 TypeScript，无 Node 或 Cocos API 依赖；Cocos UI 从 `./core/game` 导入。

- `createSave()`：初始 4 人，80 灵石，2×2（索引 0/1/3/4）。
- `getUnlockedSlots(stage)`：第 7 关解锁三行两列，第 13 关三行三列。索引 `row*3+col`，两方 `col=0` 均为前排，UI 镜像显示敌方。
- `setFormation(save,slot,heroId|null)`：已占位角色交换；拒绝锁格、未招募队友。不修改输入。
- `recruit`、`upgradeCommander`、`selectCommanderSkill`：返回新存档，错误抛中文消息。
- `simulateBattle(save)`：返回 `initialUnits` 初始状态、`events` 顺序回放、`units` 最终状态及 `winner/stage/rounds`。
- 回放依次显示 `event.text`；有 `target/hp` 时更新对应单位。伤害事件之后可能紧接 `death`。指挥官对每个目标产生一条 `commander` 事件。
- `settleBattle(save,result)`：仅当前关胜利可结算一次。结算后存储新存档。退出、重进不能只保留奖励而不保存关卡，应一次写入完整 Save。
- `validateSave(JSON.parse(raw))`：校验并复制存档，损坏时由 UI 提示用户，不应悄悄覆盖旧存档。

默认设计（不是用户额外确认）：三行两列、指挥官每场开场释放一次、第 7/13 关解锁阵位。剑雨覆盖全部敌人；火球攻击人数最多的一行，伤害更高。近战攻击前排最近行，弓手寻找最低血量比例目标，法师横扫一行，治疗优先救血量比例最低队友。40 回合无胜者为平局，不奖励、不推进。前后排位置是策略的一部分。

每张背景六关，`regionIndex` 单调递增，`regionName` 在 3 个示例区域轮换；背景名称是可替换的示例。无限层数为规则支持，不代表无限美术内容。敌我成长和经济均为原型数值，未经长期商业平衡验证。

测试：从项目根运行 `node --experimental-strip-types --test tests/core.test.mjs`（Node 24）。此测试验证纯逻辑，不等于 Creator 构建、真机或平台发布通过。

## 玩家可编辑自动策略

`Save.strategies` 可选映射队友 ID 到 1～3 条 `StrategyRule`，旧存档缺失时按职业生成默认规则。`getStrategy(save,id)` 返回深拷贝；`setStrategy(save,id,rules)` 校验且复制保存。数组顺序就是优先级。

- `skill`：`attack` 普攻 / `classSkill` 职业技能。
- `condition`：无条件、友方受伤、友方低于半血、敌方低于半血、首回合。
- `target`：前排、最低血量比例、后排优先。近战仍无法穿过前排，远程可打后排。半血敌方规则若无可攻击的半血目标则跳过。
- 首条满足条件且有合法目标的规则执行；均不满足则前排普通攻击。治疗职业技能只能治疗受伤存活单位；半血治疗只挑低于半血的队友。
- 前端使用 `STRATEGY_SKILLS / STRATEGY_CONDITIONS / STRATEGY_TARGETS` 的带类型 `id/label` 列表显示选项。

默认策略先尝试职业技能，再以无条件前排普攻兜底。守御和剑修同样默认使用职业技能，治疗仍以友方受伤为条件；已有自定义规则完全保留，未增加存档字段；灵力仅存在单场战斗运行时。敌方缺少遭遇专属策略时也使用同一职业默认策略；专属策略只按敌方阵位覆盖。

## 单场灵力与行动回放

敌我每名角色 `BattleUnit.energy` 初始/上限均为 2；职业技能耗 2，普通攻击完成后回复 1（封顶 2），无回合回复。指挥官不参与。策略按顺序寻找条件满足、资源足够且存在合法目标的规则，否则普通攻击兜底。未执行的技能不扣费，群攻只扣一次；每场重置，失败不损失存档资源。Save/StrategyRule 与旧档格式均不变。

每次角色行动先产生一个 `action` 事件：`actor/round/actionSkill/energyBefore/energyAfter/ruleIndex/text`，`ruleIndex=-1` 表示普攻兜底。随后是该行动的 `attack/heal/death` 效果，下一个 `action` 或 `end` 划分结束；`energyAfter` 表示整次行动完成后的灵力。`start/commander` 只出现在首个行动之前，所有战斗均以 `end` 结束。UI 应以行动为播放组，仅发动一次角色动作，效果完成后显示事件给定的灵力；不得从最终 units 提前显示未来状态，也不得自行重新计算扣费。新增行动记录无需增加独立播放等待。

`tests/energy.test.mjs` 覆盖事件重建 HP/灵力、敌我对称、兜底/资源不足/封顶/群攻、确定性、失败免费，以及使用真实初始资金和结算收入推进前 13 关及首败恢复。规则测试不代表 GUI 或 Creator 验收，也不证明任意消费组合均无软锁。


## 首 18 关明确遭遇（ENCOUNTERS-01）

`getStage(number).encounter` 提供深冻结的 `Encounter {id,title,lessonId,enemies}`；`EnemySpawn {slot,heroId,strategy?}` 的策略数组及规则也冻结。`ENCOUNTERS[1..18]` 为明确配置，不存入 Save。`Stage.enemyIds` 保留为独立派生数组，仅作兼容名单，不能用其紧凑索引推断阵位。展示优先直接使用 `BattleResult.initialUnits` 的 uid/row/col，或读取 encounter.enemies 的显式 slot。`lessonId` 只标记展示层教学主题，核心不决定教学面板或文案。

第 7 关为 5 敌，第 13 关为 7 敌，第 15 关为 8 敌；第 14 关起存在完整九敌阵。缺位保持原 slot，不压紧。敌方 UID 仍为 `enemy-${slot}`。第 9 关 slot1、第 16 关 slot1/2 使用后排优先，其余沿用职业默认；玩家同名角色自定义策略不能泄漏给敌人。九名角色仍只有五种职业机制，不宣称九套独立技能。

伤害、灵力、成长曲线、招募 80、升级费用、结算奖励完全不变。旧 version1 存档原样读写，无迁移、无进度回退、无额外补奖；旧存档处于前 18 关时会遇到新敌阵，这是内容更新，不保证旧回放逐字相同。第 19 关以后保留旧轮换名单、阵位、策略与数值，遭遇标题为“延续试阵”、lessonId 为 continuation，不能称作新制作章节。19/30/100 的完整确定性 BattleResult 哈希与 c78cd7d 基线一致。

`tests/encounters.test.mjs` 验证 18 个具体阵指纹、深冻结、稀疏 slot、敌策略覆盖、事件 HP/灵力重建、火球最密行和平手、全场前列阻挡、旧档与后续关卡兼容。第 3 关实际选行示例：赤璃移至 slot1 并选后排时，首轮横扫 enemy0/1；留在 slot4 时打 enemy3/4。仅切换前/后排目标在完整等深敌阵不保证改行，教学不得作这种承诺。

### 公开 API 经济模拟（不是 GUI 正常旅程）

三个路线均从 createSave 开始，不加钱、改等级或跳关，逐关结算并 JSON 重读，分别用剑雨与火球通至第 19 关入口。统一招募顺序 blade→monk→lotus→archer→frost；整队优先 monk/lotus/blade/frost/guard/mage/archer/sword/healer，按已解锁槽合法摆放。三路线末均为 115 灵石、指挥官 5 级、九人已拥有。

- 招募优先：1 关 blade；3 关 monk；4 关升 2 级；6 关 lotus；7 关 archer；8 关 frost；11/13/18 关分别升 3/4/5 级。两神通均无败。
- 适度升阶：1 关升 2 级；3 关 blade；4 关 monk；6 关升 3 级；7 关 lotus；9 关 archer；11 关 frost；13/18 关升 4/5 级。两神通均无败。
- 混合恢复：先在 1/4/7 关升 2/3/4 级、不招募。剑雨在 10 关首败，余 215；火球在 9 关首败，余 160。失败不扣资源，当关招募 blade+monk 并重新布阵后获胜；11 关 lotus、12 关 archer、13 关 frost、18 关升 5 级。未改敌阵来消除合理失败。

零消费旧首败断言从 11 关/635 灵石改为 6 关/355；用已有资金升至 3 级、余 175 后能恢复。纯升阶剑雨旧首败从 14 关改为 10 关、均余 215；招募两人后余 55 并恢复。原灵力、治疗及免费失败语义断言保留。这些路线不证明任意消费/阵容组合均无软锁，也不替代真实 Creator 操作、完整美术或长期平衡验收。
