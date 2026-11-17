/** Read-only presentation copy. Suggestions are not failure diagnoses or guaranteed wins. */
export interface EncounterGuide { readonly lessonId: string; readonly beforeBattle: string; readonly suggestion: string }
export const GUIDE_SUGGESTION_HEADING = '可以试试';
export const ENCOUNTER_GUIDES: Readonly<Record<string, EncounterGuide>> = Object.freeze({
  "energy-cycle": Object.freeze({"lessonId": "energy-cycle", "beforeBattle": "开局灵力二点，技能耗二，普攻回一。", "suggestion": "查看行动灵力，技能后用普攻回能。"}),
  "front-and-back": Object.freeze({"lessonId": "front-and-back", "beforeBattle": "近战只能攻击全场最前存活列。", "suggestion": "将守御移到前列，再检查医修站位。"}),
  "choose-target-row": Object.freeze({"lessonId": "choose-target-row", "beforeBattle": "赤璃站上行并选后排，可横扫敌方医修行。", "suggestion": "把赤璃移至上行后列，技能设后排优先。"}),
  "healing-cycle": Object.freeze({"lessonId": "healing-cycle", "beforeBattle": "医修只治疗受伤队友，满血不会空耗技能。", "suggestion": "将医修技能设为友方受伤、最低血量比例。"}),
  "commander-targets": Object.freeze({"lessonId": "commander-targets", "beforeBattle": "火球打人数最多行，平手优先上行。", "suggestion": "切换开场神通，比较集中伤害与全体伤害。"}),
  "bamboo-trial": Object.freeze({"lessonId": "bamboo-trial", "beforeBattle": "前列承伤、治疗与选行，一起决定战局。", "suggestion": "调整前列承伤队友与医修站位，再次试阵。"}),
  "third-row": Object.freeze({"lessonId": "third-row", "beforeBattle": "第三行已开放，不必立即填满六格。", "suggestion": "进入布阵，将已有队友移到新行试阵。"}),
  "row-sweep": Object.freeze({"lessonId": "row-sweep", "beforeBattle": "术士先选目标，再横扫目标所在行。", "suggestion": "改变术士站行，再比较首轮横扫目标。"}),
  "enemy-back-target": Object.freeze({"lessonId": "enemy-back-target", "beforeBattle": "敌方灵弓优先攻击最深存活列。", "suggestion": "检查最深列队友，换上更耐打的已有同道。"}),
  "healing-threshold": Object.freeze({"lessonId": "healing-threshold", "beforeBattle": "受伤即治与半血再治，出手时机不同。", "suggestion": "若队友等不到半血治疗，改用友方受伤。"}),
  "rule-priority": Object.freeze({"lessonId": "rule-priority", "beforeBattle": "策略从上往下检查，只执行首条可用规则。", "suggestion": "把首回合技能放前，后接无条件普攻。"}),
  "cloud-trial": Object.freeze({"lessonId": "cloud-trial", "beforeBattle": "九位同道分属五种职业，白凝霜也是术士。", "suggestion": "检查上阵名单，补上已有医修或守御。"}),
  "third-column": Object.freeze({"lessonId": "third-column", "beforeBattle": "第三列已开放，远程仍可攻击深列。", "suggestion": "将脆弱队友后移，同时留意敌方远程。"}),
  "global-front-column": Object.freeze({"lessonId": "global-front-column", "beforeBattle": "某行前列倒下，不代表近战能穿过其他前列。", "suggestion": "要攻击深列，调整术士的目标策略。"}),
  "dense-row": Object.freeze({"lessonId": "dense-row", "beforeBattle": "敌阵人数为二、三、三，火球命中中行。", "suggestion": "切换火球，观察中行三名敌人的开场掉血。"}),
  "ranged-pressure": Object.freeze({"lessonId": "ranged-pressure", "beforeBattle": "敌方灵弓与赤璃均优先寻找深列目标。", "suggestion": "查看敌赤璃横扫哪行，再调整该行阵容。"}),
  "legal-half-health": Object.freeze({"lessonId": "legal-half-health", "beforeBattle": "近战半血追击，也必须遵守前列阻挡。", "suggestion": "检查半血策略的合法目标，再比较普攻结果。"}),
  "final-trial": Object.freeze({"lessonId": "final-trial", "beforeBattle": "先检查阵位与策略，再决定招募或修炼。", "suggestion": "先调整已有队友阵位，再比较两种开场神通。"}),
});
/** Unknown or continuation content has no authored teaching; never invent a fallback. */
export function getEncounterGuide(lessonId: string): EncounterGuide | null {
  return Object.prototype.hasOwnProperty.call(ENCOUNTER_GUIDES, lessonId) ? ENCOUNTER_GUIDES[lessonId] : null;
}
