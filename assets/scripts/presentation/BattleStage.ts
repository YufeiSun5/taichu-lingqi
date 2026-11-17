/** Pure presentation: selection and coordinates only, never battle rules. */
export type StageMember = { uid: string; heroId?: string; side: string; row: number; col: number };
export type StageFocus = { uid: string; x: number; footY: number; bodyHeight: number };
export function stageFocus(units: StageMember[], actor?: string, targets: string[] = []): StageFocus[] {
  const byId = new Map(units.map(unit => [unit.uid, unit]));
  const ids = [...new Set([actor, ...targets].filter((id): id is string => !!id && byId.has(id)))].slice(0, 2);
  const members = ids.map(id => byId.get(id)!);
  const sameSide = members.length === 2 && members[0].side === members[1].side;
  return members.map((unit, index) => ({ uid: unit.uid,
    x: (unit.side === 'ally' ? -1 : 1) * (sameSide ? (index === 1 ? 220 : 100) : unit.heroId === 'sword' ? 150 : 170),
    footY: sameSide ? (index === 1 ? -130 : -270) : (unit.side === 'ally' ? -250 : -220),
    bodyHeight: sameSide ? (index === 1 ? 330 : 410) : 440 }));
}
export function stageCell(unit: StageMember) {
  // Front column faces the center; deaths keep their original, uncompressed cell.
  return { x: (unit.side === 'ally' ? -1 : 1) * (70 + unit.col * 100), y: -420 - unit.row * 58 };
}

export function stageCover(width: number, height: number) {
  return { width: Math.max(720, 1280 * width / height), height: Math.max(1280, 720 * height / width) };
}
export function preparationBackdrop(region: number) {
  return ['battle-bamboo-portrait', 'battle-temple-portrait', 'battle-underworld-portrait'][((region % 3) + 3) % 3];
}
/** Same six-wave region as preparation, but a distinct close-up stage asset. */
export function stageBackdrop(region: number) {
  return ['battle-bamboo-stage', 'battle-temple-stage', 'battle-underworld-stage'][((region % 3) + 3) % 3];
}
