/** Stage displacement only. Never changes attack timing, damage, pose pixels or HUD. */
export function contactOffsets(time: number): { actor: number; target: number } {
  const ramp = (a: number, b: number) => Math.max(0, Math.min(1, (time - a) / (b - a)));
  return { actor: 12 * ramp(.06, .14) * (1 - ramp(.185, .34)),
    target: 6 * ramp(.185, .22) * (1 - ramp(.22, .28)) };
}
export function boundedRetreat(edge: number, direction: number): number {
  return Math.max(0, Math.min(6, direction > 0 ? 360 - edge : edge + 360));
}
