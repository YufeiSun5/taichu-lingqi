# Original generated artwork

Generated with the built-in image generation tool on 2026-11-17 for 太初灵契. These are original raster backgrounds, not extracted game assets. Both are 1672 × 941 RGB PNG and were visually inspected.

- `battle-bamboo.png`: side-on slightly elevated hand-painted xianxia bamboo grove; distant misty mountains and shrine; warm afternoon rays; unobstructed lower clearing for left/right formations.
- `battle-temple.png`: side-on slightly elevated hand-painted xianxia mountaintop courtyard; sea of clouds, autumn maple edges, lanterns, blue-violet twilight; unobstructed lower stone paving.

Prompt constraints for both: landscape 16:9; refined 2D painted brushwork; original scene; no characters, UI, text, grid, logos or watermark. Compose broad flat lower half for two 3×3 formations. Bamboo prompt specified pale stone and earth clearing with gold light; temple prompt specified distant pavilion, cloud sea, amber lanterns and twilight.

These are static backgrounds. They do not constitute animated character art, Cocos import/build verification, or platform acceptance. Preserve source files when making optimized runtime derivatives.

- `commander.png`: 1312 × 1199 RGBA original adult female xianxia commander, half-body portrait, transparent background. Visually inspected. Exact prompt: "Original Chinese xianxia fantasy game commander character portrait, transparent background. One adult woman commander age about 28, elegant confident calm expression, waist-up three-quarter view facing slightly right, long ink-black hair with small jade-and-gold hair ornaments, refined ivory and muted teal layered silk robes with structured shoulder mantle, subtle gold embroidery, practical graceful martial silhouette, holding two fingers raised in a sword-command gesture. Detailed hand-painted 2D fantasy illustration with expressive clean face and beautiful painterly fabric, softly luminous edges, not photorealistic, not chibi, not pixel art, not 3D. Isolated single character with full hair silhouette and hands completely inside the canvas, ample padding. No text, no symbols in background, no scenery, no frame, no logos. This is original art, do not copy existing game characters."

## Full-body battle characters (2026-11-17)

Built-in image generation produced three original painted characters for the playable prototype. Files were copied into this project and visually checked. They face right; enemy teams may mirror their node X scale. These are static full-body sprites, not sprite-sheet animations.

- `fighter-sword.png`: 1229 × 1280 RGBA. Adult male xianxia swordsman, tied long hair, ivory/teal robes, boots and sword low toward right.
- `fighter-guardian.png`: 1238 × 1271 RGBA. Adult male guardian with jade/bronze armor, round shield and spear.
- `fighter-healer.png`: 1199 × 1312 RGBA. Adult female healer, ivory/lavender robes, jade lotus staff. Hair and aura contain soft transparency.

All three have real alpha extrema 0–255 and completely transparent corner pixels. Their alpha≥240 pixel counts are respectively 446591, 542702 and 526861. Match displayed body height, not identical image width; anchor feet at ground and preserve space for the sword. Current use of healer artwork for a caster or sword artwork for an archer is prototype reuse, not distinct class art.

Shared generation specification: one original adult character, full head-to-toe figure facing right in side three-quarter profile, nearly side-on slightly elevated battle camera; hand-painted 2D fantasy, clear silhouettes, bold small-size readable costume shapes, normal adult proportions. Isolated genuine transparent background; no scenery, ground backdrop, text, icons, watermark or duplicate figure; no copying existing game characters. Role-specific descriptions are listed above.

## 叶流风与赤璃独立角色（2026-11-17）

内置 image_gen 原创生成，最终透明 PNG 原始字节直接保存。未使用第三方拆包或脚本抠图。两图经实际像素查看，透明 alpha 0–255、四角全透明；带大幅光晕的首稿弃用。仍为静态角色，尚不等于完整动作或游戏画面品质验收。

- `fighter-archer.png`：1125×1398，叶流风，成年男性灵弓，墨绿/象牙白轻装、金色竹纹、玉饰高马尾、箭囊及右向拉弓。alpha>16 bbox (47,8,1091,1389)，弓顶8px余量较紧但未裁切。脚底中心约(484,1389)，头顶约25（像素原点左上）。UUID `12554d19-574f-5169-b526-c0668a0a1e62`。
- `fighter-mage.png`：1199×1312，赤璃，成年女性火术士，朱砂/酒红分层法衣、精细金色火纹、红宝石火焰法杖与右向施法手势。alpha>16 bbox (158,29,980,1285)，脚底中心约(552,1285)，头顶约70；法杖高于头顶，不用整图高确定身体比例。UUID `9d506b90-25cf-551b-8d36-0a9315a46d37`。

最终生成规范：精细手绘仙侠，正常成年比例，完整头至足、面朝右三分之四战斗视角，人物身份和材质层次明确，真实透明背景，无场景/地面/文本/边框/水印，无大幅雾状光晕，武器与脚部完整。按项目UUID与文件名生成稳定UUIDv5，SpriteFrame无裁切。实际引擎锚点需按地面复核。

## 白凝霜 / 玄照与法术源图（2026-11-17）

均使用内置 image_gen，真实透明、原创设计；生成原始PNG字节直接保存，未脚本重绘。角色和法术均已实际查看并检查 alpha 与 SpriteFrame UUID 引用。场景边缘、比例、时序仍须引擎验收。

- `fighter-frost.png`：1199×1312，成年女性白凝霜，银白编发盘髻、冷蓝银白分层服装、晶环短法器。以已有原创赤璃图作材质/绘画风格参考，重设计脸、发型、剪裁与法器，不只是换色。alpha>16 bbox (150,41,988,1284)，脚底中心约(528,1283)、头顶42。细发丝/衣缘浅边须暗场复核。UUID `85f3e543-bd5e-5fe8-b35a-18bbf4684701`。
- `fighter-monk.png`：1230×1278，成年男性玄照，剃发宽肩、赭金深棕僧衣、铜护臂、大佛珠、双掌护阵低姿态。alpha>16 bbox (52,12,1150,1265)，脚底中心约(578,1264)、头顶13。UUID `f56ca10d-5364-5f10-a2f6-b803970c947a`。
- `fx-sword.png`：1156×1361，冰青金色灵剑能量刃，向右下。alpha>16 bbox (124,130,1042,1223)，命中尖端左上归一化约(.89,.89)。
- `fx-fireball.png`：1774×887，右向金橙火球，明亮核心、层叠火舌与尾迹。alpha>16 bbox (121,162,1618,701)，核心左上归一化约(.84,.53)。

两法术图边缘最大 alpha 1，没有可见背景矩形或裁切。它们是供轨迹和组合播放的静态VFX源资产，不冒充完整逐帧动画。生成规范强调无人物/场景/UI/文字、透明边缘和足够完整边距；剑采用精细灵刃、金玉饰与碎光，火球采用清晰手绘火舌而非简单圆球。

## 夜无痕与莲心（2026-11-17）

内置 image_gen 以现有原创角色为绘画/视角参考重新设计，原始透明 PNG 直接保存，集成者已逐张查看。夜无痕为短靛紫披风、黑色贴身劲装、束发与窄刀的成年男性；莲心为金莲盘髻、粉白莲纹层叠衣裙、短实体莲枝的成年女性。两者均非其他角色换色，全部头手武器及脚部完整。

- `fighter-blade.png`：1312×1199，alpha>16 bbox (92,20,1261,1184)，脚点(459,1183)、头顶20，UUID `a8ade9f1-be03-53e4-a953-6f37ba370118`。刀尖距右边51px，浅色刀缘需在引擎暗背景检查。
- `fighter-lotus.png`：1199×1312，alpha>16 bbox (170,45,1007,1283)，脚点(504,1282)、头顶45，UUID `6d7e090c-34e6-5e18-a1ed-8759170113a5`。带雾背景首稿弃用，最终四角透明，衣缘仍须场景复核。

生成要求：精细手绘仙侠、正常成年比例、右向全身战斗视角、明确身份与材质、完整武器/双脚、真实空白透明 alpha，无地面/背景/光晕/文字/水印。静态九人名册补齐不代表身体动画或最终美术通过。

## 竖屏青竹幽径（2026-11-17）

`battle-bamboo-portrait.png`：941×1672 RGB，2,974,207 bytes；内置 image_gen 原始字节，非横图拉伸。顶部约24%为竹林、云山与朱檐亭，其下连续浅石地适配左右布阵；低对比竹影与边缘植被，无人物、UI、文字、网格或纵深道路。集成者已实际查看；PNG完整解码及IEND检查通过。UUID `a039c2ce-b713-59fe-8c2e-3f1fb0ae9d4f`，SHA256 `0f1f236f5f4f8758e3c6f46050fdd1986e75946e8a7afbc48674b8945c2cdd05`。源分辨率不是4K；真实引擎接地、缩放和精细度仍待验收。

## 凌霄四姿势研发图集（2026-11-17，未完成动画验收）

`fighter-sword-actions.png`：1254×1254 RGBA，2×2固定627格，原图SHA256 `f74b1dee2f89bb876ae7bb6d25020629b61c7cdaa93ad59101cc54d9d5d4c663`。内置image_gen以原创fighter-sword锁定身份/衣饰/武器，经历格内完整性与脚点修订，原始字节保存，不脚本修改像素。提示要求同一成年角色、右向同机位、白青金长袍、完整长剑/双脚、真实透明空格、无文字/地面/网格。四格为待机、蓄力、踏步出剑、恢复。

已由独立审阅者与集成者实际看图：身份/服装/剑一致，未跨格或断肢，允许进入运行接入，不等于最终动画。固定源rect依序(0,0,627,627)、(627,0,627,627)、(0,627,627,627)、(627,627,627,627)；局部脚点依序(275,562)、(311.5,562)、(268,545)、(276,546)。保持共同像素尺度并按脚点偏移，不挪裁切格或把弯身姿势拉成等高。必须在真实尺寸验证脚步、衣摆首尾衔接、动作和命中时序；四个关键姿势不冒充完整流畅帧动画。

## 其余整备场景与近景舞台（2026-11-17）

内置image_gen原创、原始PNG字节保存，集成者逐张查看并核验meta；没有复制官方游戏素材。

- `battle-temple-portrait.png`：941×1672，暮色云海山寺、枫叶/月光与暖金灯，后沿约24%；SHA256 `d2e9f5b37e730631718b1f5a873965dc4e2587c07f028f543f0514bb6fba2184`，UUID `169846a7-afcd-51ff-b9f9-ef3e768ff386`。
- `battle-underworld-portrait.png`：941×1672，青蓝古仙殿/紫灯与连续石台，后沿约22.5%；SHA256 `b7ef9014902277db1662e5966fcafe600a4a944f19eb6a4b8b3cb5760cfb1381`，UUID `19d973f2-9c50-5daf-a281-3b090d6b588c`。

以上大空地资产用于战前整备/全阵，不作为新近景战斗的最终背景。提示强调完整竖屏、上部环境、连续无障碍石地、无人物/UI/文字，仍需整备画面实际验收。

- `battle-bamboo-stage.png`：941×1670，古树/青竹/中景青石/远山雾瀑、左上暖光与青绿影，后沿约58.1%，70–75%落脚带无障碍，底角植物约95%以下。提示在实际研究官方实机的舞台层次后重新设计原创仙侠环境，第二轮降低对比/修正后沿，不是旧图裁切。SHA256 `ca276be0aee407ae38499cca27cf2ddd39887156d95834426361e187224017ae`，UUID `d55a9052-1f16-5a96-8a57-000177abfcb8`。

新舞台只完成源图，必须与大角色、阵盘及演出一起在Creator截图验证，素材合格不等于成品视觉合格。

## 原创技能名横幅（2026-11-17）

`ui-skill-banner.png`：2172×724 RGBA，858,069 bytes，SHA256 `159111da2589bf13d3146ce504107b42499a92540f2fca293763c619cda43cbb`。内置image_gen高精细手绘仙侠UI，深玉青漆底中央70%留白，窄暖金边与两端原创云纹玉环，无文字、符文、logo或现成游戏纹样。原始透明PNG保留，集成者已实看。alpha≥8主体bbox (27,196)-(2145,536)，2118×340约6.23:1；原画布3:1，含上下透明留白，不能按整图高度压扁。四角alpha0、中央252–254近不透明；以主体宽620等比显示时整纹理约636×212、可见横幅约620×100。实际字/框/背景整体对比仍须引擎确认。

## 幽冥古殿近景舞台（2026-11-17）

`battle-underworld-stage.png`：941×1672 RGB，2,311,488 bytes，SHA256 `4df83d8099c86376bdbbcb6bed9c4ad058627be1cdea8211df4f871462ecb1e5`，UUID `9c0e2753-301f-597a-8152-b80ab5807f46`。内置image_gen原创，参考本项目竹林近景镜头、重新设计蓝紫古门/悬灯/远雾，经历两轮生成，保留原始PNG字节。后沿约58.2%，70–75%连续落脚带；无角色、UI或文字。集成者已实际查看，非旧整备大空地图。门柱与人物肩部轮廓是否干扰、冷色服饰是否充分突出仍须实际引擎验收，不能由源图合格代替。

`battle-temple-stage.png`：941×1670 RGB，2,988,814 bytes，SHA256 `5f9e38e9b8c87df6a1ad3f044008071d5b4466785e7d58765fc9875582c12970`，UUID `15e4fac0-8b2b-51f0-81cc-6f2179710c28`。内置image_gen原创、原始字节保存；同竹林近景机位，左巨枫、右古寺暖灯，中远景蓝紫云海/月与仙山。地面后沿约57.5%，70–75%落脚带无遮挡。集成者已实际查看，全PNG块CRC、IEND与像素解码检查通过。仍须实际角色/环境光、轮廓遮挡与文字对比验收，不是完成品截图。

## 战果玉简与指挥官前景（PRESENTATION-04）

两图均由内置image_gen原创生成，输入只参考本项目ui-skill-banner色系/材质，不使用参考游戏纹样；保留原始PNG字节。集成者逐张实际查看，完整PNG/meta与透明度检查通过，但尚无此批真实引擎截图。

- `ui-result-letter.png`：2120×742 RGBA，SHA256 `0d42a93dc65e3ae4f4f4ed57a898a3bdec80ef7378a484b7f4ccb9b620a7da77`，UUID `ae226a25-daf0-551e-b7f2-c10a578f2255`。深玉青低噪中央、暖金线与云玉边角，无生成文字。alpha>16框(25,27)至(2095,696)，净文字区(382,200)至(1738,534)。整图620宽等比约217高，承载两条真实战报。
- `ui-commander-trim.png`：2079×756 RGBA，SHA256 `013291453b88f8ee94726023f3e87bb4d7e9e6cf80737fc770835ccd6f6009e1`，UUID `17e83470-6646-54bc-b380-d2218dc784e5`。薄仙云与雕玉案边，无人物或文字。实际alpha>16框(63,260)至(2026,500)，源图上下透明留白保留，不将整画布拉成目标轮廓比例；整图440×160等比映射，可见薄收口约415×51，按玉案线位置与肖像窗底对齐。
