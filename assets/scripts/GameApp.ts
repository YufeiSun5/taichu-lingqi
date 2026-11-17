import { _decorator, Component, Node, Canvas, Camera, UITransform, Graphics, Color, Label, Layers, view, ResolutionPolicy, director, sys, resources, SpriteFrame, Sprite, tween, Vec3 } from 'cc';
import { createSave, HEROES, getUnlockedSlots, getStage, simulateBattle, settleBattle, setFormation, recruit, upgradeCommander, selectCommanderSkill, validateSave, commanderUpgradeCost, RECRUIT_COST, getStrategy, setStrategy, STRATEGY_SKILLS, STRATEGY_CONDITIONS, STRATEGY_TARGETS } from './core/game';
import type { Save, BattleUnit, StrategyRule } from './core/game';
const { ccclass, property } = _decorator;
const INK = '#102a31', GOLD = '#d6b979', PAPER = '#f4e7c8';
const STORE = 'taichu-lingqi-v1';
/** Cocos renderer only. All game rules live in core/game.ts. */
@ccclass('GameApp')
export class GameApp extends Component {
  @property startInGame = false;
  private root!: Node;
  private modal: Node | null = null;
  private save!: Save;
  private running = false;
  private speed = 1;
  private selected: number | null = null;
  private unitNodes = new Map<string, Node>();
  private hpLabels = new Map<string, Label>();
  private status!: Label;
  private generation = 0;
  private resultAwarded = false;
  onLoad() {
    view.setDesignResolutionSize(1280, 720, ResolutionPolicy.SHOW_ALL);
    this.root = this.make('Canvas', this.node, 0, 0, 1280, 720);
    const canvas = this.root.addComponent(Canvas);
    const cameraNode = new Node('UICamera'); cameraNode.parent = this.node;
    const camera = cameraNode.addComponent(Camera); camera.projection = Camera.ProjectionType.ORTHO;
    camera.orthoHeight = 360; camera.near = 0.1; camera.far = 2000; camera.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    camera.clearColor = this.color(INK); camera.visibility = Layers.Enum.UI_2D;
    cameraNode.setPosition(0, 0, 1000); canvas.cameraComponent = camera;
    this.save = this.load();
    this.startInGame ? this.game() : this.login();
  }
  onDestroy() { this.generation++; this.unscheduleAllCallbacks(); }
  private load(): Save {
    try {
      const s = JSON.parse(sys.localStorage.getItem(STORE) || 'null');
      if (s) return validateSave(s);
    } catch { /* local storage unavailable or malformed */ }
    return createSave();
  }
  private persist() { try { sys.localStorage.setItem(STORE, JSON.stringify(this.save)); } catch { this.toast('存档不可用，本次进度仅保留在内存'); } }
  private color(hex: string) { return new Color().fromHEX(hex); }
  private make(name: string, parent: Node, x: number, y: number, w = 0, h = 0) {
    const n = new Node(name); n.layer = Layers.Enum.UI_2D; n.parent = parent;
    n.setPosition(x, y); n.addComponent(UITransform).setContentSize(w, h); return n;
  }
  private box(parent: Node, x: number, y: number, w: number, h: number, fill = INK, stroke = GOLD) {
    const n = this.make('Panel', parent, x, y, w, h); const g = n.addComponent(Graphics);
    g.fillColor = this.color(fill); g.strokeColor = this.color(stroke); g.lineWidth = 1;
    g.roundRect(-w / 2, -h / 2, w, h, 7); g.fill(); g.stroke(); return n;
  }
  private label(parent: Node, value: string, x: number, y: number, size = 22, color = PAPER, w = 1000) {
    const n = this.make('Text', parent, x, y, w, size * 2.5); const l = n.addComponent(Label);
    l.string = value; l.fontSize = size; l.lineHeight = size * 1.4; l.color = this.color(color);
    l.horizontalAlign = Label.HorizontalAlign.CENTER; l.verticalAlign = Label.VerticalAlign.CENTER;
    l.overflow = Label.Overflow.SHRINK; return l;
  }
  private button(parent: Node, value: string, x: number, y: number, w: number, action: () => void, active = true) {
    const n = this.box(parent, x, y, w, 44, active ? '#28434a' : '#263235', active ? GOLD : '#586466');
    this.label(n, value, 0, 0, 18, active ? PAPER : '#82918f', w - 14);
    n.on(Node.EventType.TOUCH_END, () => { if (active) action(); }); return n;
  }
  private clear() { for (const child of [...this.root.children]) child.destroy(); this.root.removeAllChildren(); this.modal = null; this.unitNodes.clear(); this.hpLabels.clear(); }
  private background(region = 0) {
    this.box(this.root, 0, 0, 1280, 720, ['#31545b', '#4b5367', '#4b454c'][region % 3], '#31545b');
    // Original procedural landscape fallback, not extracted artwork.
    const n = this.make('Landscape', this.root, 0, 0); const g = n.addComponent(Graphics);
    for (let j = 0; j < 3; j++) {
      g.fillColor = this.color(['#6d8b89', '#456d73', '#254b54'][j]);
      g.moveTo(-650, -190); for (let i = 0; i <= 12; i++) g.lineTo(-650 + i * 110, 40 + Math.sin(i * 2.1 + j) * 80 + (2 - j) * 65);
      g.lineTo(650, -260); g.close(); g.fill();
    }
    g.fillColor = this.color('#334d43'); g.rect(-640, -360, 1280, 190); g.fill();
    const art = this.make('BackgroundArt', this.root, 0, 0, 1280, 720);
    resources.load(`art/${region % 2 ? 'battle-temple' : 'battle-bamboo'}/spriteFrame`, SpriteFrame, (err, sf) => {
      if (!err && art.isValid) { const sp = art.addComponent(Sprite); sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.spriteFrame = sf; art.getComponent(UITransform)!.setContentSize(1280, 720); }
    });
  }
  private login() {
    this.clear(); this.background();
    this.box(this.root, 0, 15, 520, 410, '#173038');
    this.label(this.root, '太 初 灵 契', 0, 120, 62, GOLD);
    this.label(this.root, '结契同道 · 以阵问天', 0, 45, 24);
    this.label(this.root, '仙侠策略自动战斗 · 云端原型', 0, -5, 17, '#a8c2bb');
    this.button(this.root, '踏入仙途', 0, -85, 260, () => director.loadScene('Game'));
    this.label(this.root, '本地游客存档｜未接入平台登录及支付', 0, -165, 14, '#a8c2bb');
  }
  private game() {
    this.clear(); const stage = getStage(this.save.stage); this.background(stage.regionIndex);
    this.box(this.root, 0, 310, 1240, 66);
    this.label(this.root, '太初灵契', -490, 310, 28, GOLD, 220);
    this.label(this.root, `${stage.regionName} · ${stage.wave}/6    第 ${stage.number} 关`, 0, 310, 23, PAPER, 600);
    this.label(this.root, `灵石 ${this.save.coins}`, 485, 310, 20, GOLD, 220);
    this.label(this.root, '我方阵容', -405, 245, 20); this.label(this.root, '敌方阵容', 405, 245, 20);
    let battle;
    try { battle = simulateBattle(this.save); } catch { battle = { initialUnits: [] as BattleUnit[] }; }
    for (const u of battle.initialUnits) this.drawUnit({ ...u, hp: u.maxHp });
    this.box(this.root, 0, -267, 1240, 142);
    this.status = this.label(this.root, '战前布阵，战中自动执行策略', 0, -225, 18, '#bfcdc1', 1120);
    this.button(this.root, '布阵', -520, -285, 110, () => this.formation());
    this.button(this.root, '招募', -390, -285, 110, () => this.recruitment());
    this.button(this.root, '指挥官', -260, -285, 110, () => this.commander());
    this.button(this.root, '策略', -130, -285, 110, () => this.strategies());
    this.button(this.root, `速度 ×${this.speed}`, 10, -285, 130, () => { this.speed = this.speed === 1 ? 2 : 1; this.game(); });
    this.button(this.root, '开始战斗', 250, -285, 280, () => this.fight());
    this.button(this.root, '返回', 520, -285, 110, () => director.loadScene('Login'));
  }
  private drawUnit(u: BattleUnit) {
    const side = u.side === 'ally' ? -1 : 1;
    const x = side * (235 + u.col * 125); const y = 135 - u.row * 105;
    const n = this.make(u.uid, this.root, x, y, 110, 100); this.unitNodes.set(u.uid, n);
    const g = n.addComponent(Graphics); g.fillColor = new Color(0, 0, 0, 70); g.ellipse(0, -35, 44, 9); g.fill();
    const hero = HEROES.find(h => h.id === u.heroId);
    g.fillColor = this.color(hero?.color || (side < 0 ? '#90bfc1' : '#cd8277'));
    g.moveTo(-15, 18); g.lineTo(15, 18); g.lineTo(30, -28); g.lineTo(-25, -28); g.close(); g.fill();
    g.fillColor = this.color('#e2c1a2'); g.circle(0, 30, 12); g.fill();
    g.fillColor = this.color('#172a32'); g.arc(0, 35, 13, 0, Math.PI, false); g.fill();
    g.strokeColor = this.color(GOLD); g.lineWidth = 3; g.moveTo(side * -13, 5); g.lineTo(side * -43, 39); g.stroke();
    this.label(n, u.name, 0, -50, 17, PAPER, 120);
    const hp = this.label(n, `${u.hp}/${u.maxHp}`, 0, -72, 13, '#b5dfbf', 120); this.hpLabels.set(u.uid, hp);
  }
  private open(title: string) {
    if (this.running) return null;
    if (this.modal) this.modal.destroy();
    const mask = this.box(this.root, 0, 0, 1280, 720, '#142b32', '#142b32');
    mask.on(Node.EventType.TOUCH_END, (e: any) => e.propagationStopped = true);
    this.modal = mask; this.label(mask, title, 0, 290, 30, GOLD);
    this.button(mask, '关闭', 510, 290, 120, () => { this.selected = null; this.modal?.destroy(); this.modal = null; this.game(); }); return mask;
  }
  private formation() {
    const p = this.open('布阵 · 点击两格交换'); if (!p) return;
    this.label(p, '靠近敌人的是前排｜解锁顺序：2×2 → 3×2 → 3×3', 0, 235, 18, '#b6c6bd');
    const slots = getUnlockedSlots(this.save.stage);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const i = row * 3 + col; const id = this.save.formation[i]; const h = HEROES.find(v => v.id === id);
      this.button(p, slots.includes(i) ? `${this.selected === i ? '◆ ' : ''}${h?.name || '空位'}` : '未解锁', 270 - col * 225, 135 - row * 90, 190, () => {
        if (this.selected === null) { this.selected = i; this.formation(); return; }
        const from = this.selected; this.selected = null;
        try { const a = this.save.formation[from]; const b = this.save.formation[i];
          let next = setFormation(this.save, from, null); next = setFormation(next, i, a); next = setFormation(next, from, b);
          this.save = next; this.persist(); this.formation();
        } catch (e) { this.toast(String(e)); }
      }, slots.includes(i));
    }
    this.label(p, '后排 ←                           → 前排 / 敌人', 40, -150, 18);
    this.button(p, '保存并返回战场', 0, -260, 300, () => { this.selected = null; this.game(); });
  }
  private recruitment() {
    const p = this.open('招募同道'); if (!p) return;
    this.label(p, `灵石 ${this.save.coins} · 每位 ${RECRUIT_COST} 灵石 · 招募后点击上阵`, 0, 235, 18);
    HEROES.forEach((h, i) => {
      const owned = this.save.owned.includes(h.id); const x = -420 + (i % 4) * 280; const y = 150 - Math.floor(i / 4) * 130;
      this.label(p, `${h.name} · ${{guard:'守御',sword:'剑修',mage:'术士',healer:'医修',archer:'灵弓'}[h.role]}`, x, y, 20, GOLD, 250);
      this.button(p, owned ? '上阵 / 替换' : '招募', x, y - 45, 220, () => {
        try { if (!owned) { this.save = recruit(this.save, h.id); this.persist(); this.recruitment(); }
          else this.placeHero(h.id);
        } catch (e) { this.toast(String(e)); }
      });
    });
  }
  private placeHero(id: string) {
    const p = this.open('选择上阵位置'); if (!p) return;
    const slots = getUnlockedSlots(this.save.stage);
    slots.forEach(i => this.button(p, HEROES.find(h => h.id === this.save.formation[i])?.name || '空位', 230 - (i % 3) * 230, 150 - Math.floor(i / 3) * 110, 200, () => {
      try { this.save = setFormation(this.save, i, id); this.persist(); this.game(); } catch (e) { this.toast(String(e)); }
    }));
  }
  private strategies(heroId = this.save.owned[0]) {
    const p = this.open('战斗策略 · 条件与优先级'); if (!p) return;
    if (!heroId) { this.label(p, '尚无可配置的队友', 0, 0, 24); return; }
    const hero = HEROES.find(h => h.id === heroId)!;
    this.label(p, '选择同道', -500, 225, 20, GOLD, 180);
    this.save.owned.forEach((id, index) => {
      const h = HEROES.find(v => v.id === id)!;
      this.button(p, `${id === heroId ? '◆ ' : ''}${h.name}`, -500, 175 - index * 49, 180, () => this.strategies(id));
    });
    this.label(p, `${hero.name} · 从上到下检查，执行首个满足条件的有效技能`, 120, 235, 18, PAPER, 880);
    this.label(p, '技能                       触发条件                     目标偏好', 90, 185, 17, '#b6c6bd', 780);
    const rules = getStrategy(this.save, heroId).map(r => ({ ...r }));
    const commit = (next: StrategyRule[]) => {
      try { this.save = setStrategy(this.save, heroId, next); this.persist(); this.strategies(heroId); }
      catch (e) { this.toast(String(e)); }
    };
    const cycle = (index: number, key: keyof StrategyRule, options: readonly { id: string; label: string }[]) => {
      const next = rules.map(r => ({ ...r }));
      const current = options.findIndex(o => o.id === next[index][key]);
      // IDs come only from core-validated option tables, never from free text.
      (next[index] as unknown as Record<string, string>)[key] = options[(current + 1) % options.length].id;
      commit(next);
    };
    rules.forEach((r, index) => {
      const y = 120 - index * 105;
      this.label(p, `${index + 1}`, -365, y, 22, GOLD, 40);
      this.button(p, STRATEGY_SKILLS.find(o => o.id === r.skill)?.label || r.skill, -230, y, 210, () => cycle(index, 'skill', STRATEGY_SKILLS));
      this.button(p, STRATEGY_CONDITIONS.find(o => o.id === r.condition)?.label || r.condition, 10, y, 230, () => cycle(index, 'condition', STRATEGY_CONDITIONS));
      this.button(p, STRATEGY_TARGETS.find(o => o.id === r.target)?.label || r.target, 245, y, 210, () => cycle(index, 'target', STRATEGY_TARGETS));
      this.button(p, '↑', 385, y, 45, () => { const next = [...rules]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; commit(next); }, index > 0);
      this.button(p, '↓', 440, y, 45, () => { const next = [...rules]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; commit(next); }, index < rules.length - 1);
      this.button(p, '删', 495, y, 45, () => commit(rules.filter((_, i) => i !== index)), rules.length > 1);
    });
    this.label(p, '点击选项切换 · 每次修改自动保存', 100, -210, 17, '#b6c6bd', 850);
    this.label(p, '近战仍受前排阻挡；治疗优先受伤友军；无规则命中则普攻前排', 100, -245, 16, '#b6c6bd', 900);
    this.button(p, '＋ 添加规则', 100, -295, 270, () => commit([...rules, { skill: 'attack', condition: 'always', target: 'front' }]), rules.length < 3);
  }
  private commander() {
    const p = this.open('指挥官 · 灵契仙使'); if (!p) return;
    const portrait = this.make('CommanderPortrait', p, -350, 0, 450, 410);
    resources.load('art/commander/spriteFrame', SpriteFrame, (err, sf) => {
      if (!err && portrait.isValid) { const sp = portrait.addComponent(Sprite); sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.spriteFrame = sf; portrait.getComponent(UITransform)!.setContentSize(450, 410); }
    });
    this.label(p, '灵契仙使', -350, -230, 28, GOLD, 350);
    this.label(p, `境界 ${this.save.commanderLevel}    灵石 ${this.save.coins}`, 220, 200, 25, PAPER, 620);
    this.label(p, '不占阵位 · 每场开局释放一次选定神通', 220, 140, 19, PAPER, 620);
    this.button(p, `${this.save.commanderSkill === 'swordRain' ? '◆ ' : ''}万剑归宗 · 全阵压制`, 220, 55, 460, () => { this.save = selectCommanderSkill(this.save, 'swordRain'); this.persist(); this.commander(); });
    this.button(p, `${this.save.commanderSkill === 'fireball' ? '◆ ' : ''}天火焚阵 · 横排轰击`, 220, -10, 460, () => { this.save = selectCommanderSkill(this.save, 'fireball'); this.persist(); this.commander(); });
    this.label(p, '修炼可增强开场神通威力', 220, -85, 19, '#b6c6bd', 620);
    this.button(p, `修炼升阶 · ${commanderUpgradeCost(this.save)} 灵石`, 220, -160, 460, () => { try { this.save = upgradeCommander(this.save); this.persist(); this.commander(); } catch (e) { this.toast(String(e)); } });
  }
  private fight() {
    if (this.running) return;
    this.running = true; this.resultAwarded = false; const token = ++this.generation;
    let result;
    try { result = simulateBattle(this.save); } catch (e) { this.running = false; this.toast(String(e)); return; }
    let index = 0;
    // Block navigation while replay is running: results must only be settled once.
    const blocker = this.make('BattleInputGuard', this.root, 0, -280, 1280, 140);
    blocker.on(Node.EventType.TOUCH_END, (e: any) => e.propagationStopped = true);
    const advance = () => {
      if (!this.isValid || token !== this.generation) return;
      if (index >= result.events.length) {
        this.running = false;
        if (!this.resultAwarded) { this.resultAwarded = true; this.save = settleBattle(this.save, result); this.persist(); }
        blocker.destroy(); const p = this.open(result.winner === 'ally' ? '破阵成功' : '胜败乃修行常事'); if (!p) return;
        this.label(p, result.winner === 'ally' ? '奖励已结算，新的关卡已开启' : '调整站位、招募同道或提升指挥官后再战', 0, 70, 24);
        this.button(p, result.winner === 'ally' ? '前往下一关' : '重新布阵', 0, -70, 320, () => this.game()); return;
      }
      const e = result.events[index++]; this.status.string = e.text;
      if (e.type === 'commander' && e.target) this.spellEffect(e.target, this.save.commanderSkill);
      if (e.type === 'attack' && e.actor) {
        const actor = this.unitNodes.get(e.actor);
        if (actor) { const origin = actor.position.clone(); tween(actor).to(.1, { position: new Vec3(origin.x + (e.actor.startsWith('ally') ? 22 : -22), origin.y, 0) }).to(.12, { position: origin }).start(); }
      }
      if (e.target) {
        const target = this.unitNodes.get(e.target); const hp = this.hpLabels.get(e.target);
        if (hp && typeof e.hp === 'number') hp.string = `${Math.max(0, e.hp)} / ${result.units.find(u => u.uid === e.target)?.maxHp || ''}`;
        if (target) {
          if (e.type === 'death') target.setScale(0.85, 0.85, 1);
          else { const origin = target.position.clone(); tween(target).to(.08, { position: new Vec3(origin.x + 7, origin.y, 0) }).to(.08, { position: origin }).start(); }
          if (e.amount) { const v = this.label(target, `${e.type === 'heal' ? '+' : '-'}${e.amount}`, 0, 70, 27, e.type === 'heal' ? '#a8f0ad' : '#ffe2a2', 150); tween(v.node).by(.5, { position: new Vec3(0, 35, 0) }).call(() => v.node.destroy()).start(); }
        }
      }
      this.scheduleOnce(advance, (e.type === 'commander' ? .65 : .38) / this.speed);
    }; advance();
  }
  private spellEffect(uid: string, skill: string) {
    const target = this.unitNodes.get(uid); if (!target) return;
    const fx = this.make('CommanderSpell', this.root, target.position.x, target.position.y + 160);
    const g = fx.addComponent(Graphics);
    if (skill === 'swordRain') {
      g.strokeColor = this.color('#c6f8ff'); g.lineWidth = 5;
      for (let i = -1; i <= 1; i++) { g.moveTo(i * 20 - 18, 70); g.lineTo(i * 20 + 10, 0); } g.stroke();
    } else { g.fillColor = this.color('#ffae4e'); g.circle(0, 0, 29); g.fill(); g.fillColor = this.color('#fff0ad'); g.circle(-7, 6, 14); g.fill(); }
    tween(fx).by(.24, { position: new Vec3(0, -160, 0) }).to(.12, { scale: new Vec3(1.8, .6, 1) }).call(() => fx.destroy()).start();
  }
  private toast(message: string) {
    const n = this.box(this.root, 0, -340, 1040, 32, '#5b3430', '#dba990');
    this.label(n, message.replace(/^Error:\s*/, ''), 0, 0, 16, PAPER, 1000); this.scheduleOnce(() => { if (n.isValid) n.destroy(); }, 3);
  }
}
