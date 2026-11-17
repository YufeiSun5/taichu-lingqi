# 赤璃受控 A/B 候选，未视觉验收

基线：b356e30a48c2ad64523d2de368dba79ec58bb55b，独立 detached 工作树。没有复制主工作树的未提交动作修改。

仅换用仓库外 character-review/mage-painterly-candidate-v1.png 原始像素；未编辑、重采样或重新生成。
候选 SHA256：8f0f36a5d2b0389c80b1ede7a8926aa518531afee03a9277b5e8500ae990aeb9。
PNG 1199×1312 RGBA；alpha ≥16 bbox (134,16)-(1012,1292)，≥32 bbox (135,16)-(1012,1292)。保留原 UUID/meta，trim none，画布尺寸相同。

角色映射仅由 groundX552/groundY1285/bodyTop70 改成 560/1292/66；运行 bodyHeight 不变。H440 时 scale 0.358891。几何测试更新为更宽的实际 alpha 边界，没有放宽屏幕边界门槛；角色映射另有精确断言。

字体按本候选源码运行 tools/fonts/build.py，生成目录在仓库外 font-review/rebuild-mage-ab；characters/codepoints/TTF 与基线逐字节一致，仅复制重新生成 manifest。未改字体像素或主树字体清单。

待验收：同构建设置、同人物身体高度/脚点/队友，竹林明场与寺院暗场各 A/B，左右朝向、脸/手实际手机尺寸、双足接地、透明边缘、技能起点/峰值/收束。候选顶部杖焰16px、底部20px边距偏紧，姿态仍静态，尚不能称动作或画风统一通过。正式截图不得用源图或离线合成替代。

本候选未经 Creator 构建、Mac 运行或真实游戏截图验收；不得直接上 main。没有提交或推送。
