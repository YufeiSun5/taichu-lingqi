# 太初灵契 · 项目工作入口

Cocos Creator 3.8.7 / TypeScript 仙侠布阵与自动战斗原型，只有 Login / Game 两个场景。不是网页套壳；平台接入与正式美术尚未验收。

## 操作边界
- 所有代码创建和修改只在云端。用户电脑仅用于调试；调试不自动授权安装、删除、凭据或发布操作。
- 文档初始化不授权产品重构、迁移、平台上线或改变仓库权限。保护已有文件；不提交缓存、凭据或废弃 `preview/` 草稿。
- 单个文件同一时间只有一个写入者；共享规则、功能地图、看板和摘要由本轮集成负责人串行维护。并行前在看板明确写入范围、依赖和调试资源所有权。

## 必读与导航
1. 每次工作先读 [当前摘要](MEMORY.md)、[唯一活跃看板](AI_BOARD.md)。
2. 修改前读 [分层契约](.ai/docs/architecture.md)、[开发约束](.ai/instructions/development.md)，明确规则归属和目标路径。
3. 定位能力、修改或验证用户可见行为前读 [功能地图](COCOS-SETUP.md#feature-map) 中对应条目。
4. 执行验证前读 [验证契约](COCOS-SETUP.md#verification-contract)。验证记录见 [独立检查](docs/independent-review.md)。

| 位置 | 用途 |
| --- | --- |
| `assets/scripts/core/game.ts` | 纯规则唯一实现；接口说明在同目录 README，不能把 UI 作为另一套规则源 |
| `assets/scripts/GameApp.ts` | 当前 Cocos 展示、用例编排与存储入口；混合职责是已记录现状，不是长期目标 |
| `assets/scenes/` / `assets/resources/art/` | 两场景与原创资源；资源来源见 art/README.md |
| `tests/` | Node 规则与工程结构测试，不等于引擎或真机验证 |

源码依赖：核心不得导入 `cc`、DOM、存储或平台 SDK。界面只调用核心公开入口，不重算伤害、奖励、解锁。接口/存档变化先协调调用方与兼容约定。

云端可运行 `npm test`（Node 24）。Creator 导入、类型编译、真实交互及平台构建必须实际执行后才计为通过。报告明确版本、环境、通过/失败/受阻/未执行；目录齐全不代表工程化或玩法验收完成。
