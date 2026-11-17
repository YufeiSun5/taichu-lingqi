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
