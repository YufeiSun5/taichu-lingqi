/** Generated from tools/fonts/characters.txt; font SHA256 59e0afd4b7846e591fb9ce602622363cd52901c7e6f5cf3de72f1c83b318c19d. */
export const TYPEFACE_CHARACTERS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~·×÷—‘’“”…‹›←↑→↓◆★☆、。《》「」【】一万三上下不与且业丢两个中临为之九也二于云五交人仍从他付仙代以件份优会伤位低体使例保修倒先入全六共关其养内再军冥决况准凌凝出击分切列则初删到制前剑割力功加动励募区医升半单占卡即压原及友双反发取受变口古只可台叶号合同名后君启命哪回图在地场均坏型域填境增士备复多夜够天太失奏契奖始威字存守完宗官定实客害容密察寻将少尚就局层展属山岳已布平并幽序度延开弃式弓弱强归当录影往径得御循心必急恢情意戏成我或战截所手打扣执扫找承技把护招择持指按挑挡挥损换掉排接掩支收改攻放效敌救数整斗斩断新方施无早时明春是显普暂更替最有未本术机材束条来果某查标样格档检横次正此殿每比沉没治法活流海消深添游源满演火灵点炼焚焰照玄玩球璃生用界留略疏疗痕登白的盖盘目相盾看知石破确磁示神离种秘移程空穿窗立站竹第等策算箭素级纵线终经结继绪续缔编置耐耗职能脆脚至舍舞色节苏若莲获血行补表被要覆观规角解认设诀识试该详误说请读调资赤赴起足跳踏轮轰载较过近返还进远连追退选逐途通速道遵邀配重量锁锋错镇闭问间队防阵阶阻限除集雨需霄霜青静非靠音页顺须风首默！％（）＋，－：；？｜";
const coverage = new Set(TYPEFACE_CHARACTERS);
export function supportsTypeface(text: string): boolean {
  return Array.from(text).every(character => /\s/u.test(character) || coverage.has(character));
}
