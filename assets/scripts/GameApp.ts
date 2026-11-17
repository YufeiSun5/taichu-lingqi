import { _decorator, Component, Node, Canvas, Camera, UITransform, Graphics, Color, Label, Layers, view, ResolutionPolicy, director, sys, resources, SpriteFrame, Sprite, tween, Vec3 } from 'cc';
import { createSave, HEROES, getUnlockedSlots, getStage, simulateBattle, settleBattle, setFormation, recruit, upgradeCommander, selectCommanderSkill, commanderUpgradeCost, RECRUIT_COST, getStrategy, setStrategy, STRATEGY_SKILLS, STRATEGY_CONDITIONS, STRATEGY_TARGETS } from './core/game';
import type { Save, BattleUnit, BattleResult, StrategyRule } from './core/game';
import { LocalSaveStore } from './infrastructure/LocalSaveStore';
const { ccclass, property } = _decorator;
const INK = '#102a31', GOLD = '#d6b979', PAPER = '#f4e7c8';
const STORE = 'taichu-lingqi-v1';
/** Cocos renderer only. All game rules live in core/game.ts. */
@ccclass('GameApp')
export class GameApp extends Component {
  @property startInGame = false;
  private static session: { store: LocalSaveStore; save: Save; state: 'saved'|'unsaved'|'session'; error?: string } | null = null;
  private root!: Node;
  private store!: LocalSaveStore;
  private saveState: 'saved'|'unsaved'|'session' = 'saved';
  private lastSaveError = '';
  private saveStatusLabel: Label | null = null;
  private modal: Node | null = null;
  private save!: Save;
  private running = false;
  private speed = 1;
  private selected: number | null = null;
  private unitNodes = new Map<string, Node>();
  private hpLabels = new Map<string, Label>();
  private hpBars = new Map<string, Graphics>();
  private unitPortraits = new Map<string, Node>();
  private unitMarkers = new Map<string, Graphics>();
  private feedbackLabels = new Map<string, Label>();
  private unitEnergy = new Map<string, { value: number; graphic: Graphics }>();
  private unitHealth = new Map<string, { hp: number; maxHp: number; dead: boolean; side: string }>();
  private status!: Label;
  private generation = 0;
  private resultAwarded = false;
  onLoad() {
    view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);
    this.root = this.make('Canvas', this.node, 0, 0, 720, 1280);
    const canvas = this.root.addComponent(Canvas);
    const cameraNode = new Node('UICamera'); cameraNode.parent = this.node;
    const camera = cameraNode.addComponent(Camera); camera.projection = Camera.ProjectionType.ORTHO;
    camera.orthoHeight = 640; camera.near = 0.1; camera.far = 2000; camera.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    camera.clearColor = this.color(INK); camera.visibility = Layers.Enum.UI_2D;
    cameraNode.setPosition(0, 0, 1000); canvas.cameraComponent = camera;
    const shared = GameApp.session;
    if (shared) { this.store = shared.store; this.save = shared.save; this.saveState = shared.state; this.lastSaveError = shared.error || ''; this.renderEntry(); }
    else { this.store = new LocalSaveStore(sys.localStorage, STORE); this.load(); }
  }
  onDestroy() { this.generation++; this.unscheduleAllCallbacks(); }
  private renderEntry() { this.startInGame ? this.game() : this.login(); }
  private retainSession() { GameApp.session = { store: this.store, save: this.save, state: this.saveState, error: this.lastSaveError }; }
  private load() {
    const result = this.store.load();
    if ('save' in result) {
      this.save = result.save; this.saveState = 'saved'; this.lastSaveError = ''; this.retainSession();
      if (result.status === 'fresh') this.persist();
      this.renderEntry();
    } else this.recovery(result.status, result.message);
  }
  private recovery(kind: 'corrupt'|'unavailable', message: string) {
    this.clear(); this.background(); this.box(this.root, 0, 0, 672, 920);
    this.label(this.root, kind === 'corrupt' ? '存档需要恢复' : '暂时无法读取存档', 0, 330, 32, GOLD, 620);
    this.label(this.root, message, 0, 210, 24, PAPER, 620);
    this.label(this.root, '原存档不会被静默覆盖。可重试，或开启不保存的临时试玩。', 0, 110, 24, PAPER, 620);
    this.button(this.root, '重新读取', 0, -20, 560, () => this.load());
    this.button(this.root, '临时试玩（不保存）', 0, -130, 560, () => {
      this.store.useSessionOnly(); this.save = createSave(); this.saveState = 'session'; this.lastSaveError = ''; this.retainSession(); this.renderEntry();
    });
    if (kind === 'corrupt') this.button(this.root, '备份原始损坏存档后，开始新进度', 0, -250, 620, () => {
      const result = this.store.startNewWithBackup();
      if (result.status === 'saved') { this.save = result.save; this.saveState = 'saved'; this.lastSaveError = ''; this.retainSession(); this.renderEntry(); }
      else this.toast(result.message);
    });
    this.label(this.root, '临时试玩关闭后进度丢失，原始存档保持不变', 0, -370, 22, '#c8bd9f', 620);
  }
  private saveDescription() {
    return this.saveState === 'session' ? '临时试玩 · 进度不会保存' : this.saveState === 'unsaved' ? (this.lastSaveError || '有未保存进度 · 请重试保存，关闭可能丢失本次进度') : '进度已保存在本机';
  }
  private persist(): boolean {
    const result = this.store.write(this.save);
    if (result.status === 'saved') { this.saveState = 'saved'; this.lastSaveError = ''; }
    else if (this.saveState !== 'session') { this.saveState = 'unsaved'; this.lastSaveError = result.message; }
    this.retainSession();
    if (this.saveStatusLabel?.isValid) this.saveStatusLabel.string = this.saveDescription();
    if (result.status !== 'saved' && this.saveState !== 'session') this.toast(result.message);
    return result.status === 'saved';
  }
  private savePanel() {
    const p = this.open('进度尚未保存'); if (!p) return;
    this.label(p, '请保留当前窗口。重试保存不会重复发放奖励。', 0, 220, 26, PAPER, 620);
    this.label(p, '若其他实例已修改存档，需要确认后重新读取，不能覆盖较新的内容。', 0, 100, 24, GOLD, 620);
    this.button(p, '重试保存', 0, -80, 560, () => { if (this.persist()) this.game(); });
    this.button(p, '重新读取…', 0, -200, 560, () => {
      const confirm = this.open('确认重新读取'); if (!confirm) return;
      this.label(confirm, '重新读取会舍弃当前窗口尚未保存的进度。', 0, 200, 28, GOLD, 620);
      this.label(confirm, '磁盘中的原存档不会被删除或覆盖。', 0, 90, 24, PAPER, 620);
      this.button(confirm, '保留当前进度', 0, -90, 560, () => this.savePanel());
      this.button(confirm, '确认舍弃并重新读取', 0, -210, 560, () => { GameApp.session = null; this.load(); });
    });
  }
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
  private label(parent: Node, value: string, x: number, y: number, size = 24, color = PAPER, w = 640) {
    const n = this.make('Text', parent, x, y, w, size * 2.5); const l = n.addComponent(Label);
    l.string = value; l.fontSize = size; l.lineHeight = size * 1.4; l.color = this.color(color);
    l.horizontalAlign = Label.HorizontalAlign.CENTER; l.verticalAlign = Label.VerticalAlign.CENTER;
    l.overflow = Label.Overflow.SHRINK; return l;
  }
  private button(parent: Node, value: string, x: number, y: number, w: number, action: () => void, active = true) {
    const n = this.box(parent, x, y, w, 80, active ? '#28434a' : '#263235', active ? GOLD : '#586466');
    this.label(n, value, 0, 0, 24, active ? PAPER : '#82918f', w - 14);
    n.on(Node.EventType.TOUCH_END, () => { if (active && !this.running) action(); }); return n;
  }
  private clear() { for (const child of [...this.root.children]) child.destroy(); this.root.removeAllChildren(); this.modal = null; this.saveStatusLabel = null; this.unitNodes.clear(); this.hpLabels.clear(); this.hpBars.clear(); this.unitPortraits.clear(); this.unitMarkers.clear(); this.feedbackLabels.clear(); this.unitHealth.clear(); this.unitEnergy.clear(); }
  private background(region = 0) {
    this.box(this.root, 0, 0, 720, 1280, ['#31545b', '#4b5367', '#4b454c'][region % 3], '#31545b');
    // Keep the landscape's original ratio; the portrait viewport crops its sides.
    const art = this.make('BackgroundArt', this.root, 0, 0, 720, 1280);
    resources.load(`art/${region % 2 ? 'battle-temple' : 'battle-bamboo'}/spriteFrame`, SpriteFrame, (err, sf) => {
      if (!err && art.isValid) {
        const sp = art.addComponent(Sprite); sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.spriteFrame = sf;
        const scale = Math.max(720 / sf.originalSize.width, 1280 / sf.originalSize.height);
        art.getComponent(UITransform)!.setContentSize(sf.originalSize.width * scale, sf.originalSize.height * scale);
      }
    });
  }
  private login() {
    this.clear(); this.background();
    this.box(this.root, 0, 10, 640, 700, '#173038');
    this.label(this.root, '太 初 灵 契', 0, 220, 58, GOLD, 600);
    this.label(this.root, '结契同道 · 以阵问天', 0, 100, 28);
    this.label(this.root, '仙侠策略 · 自动战斗', 0, 25, 24, '#c4d8ce');
    this.button(this.root, '踏入仙途', 0, -120, 440, () => director.loadScene('Game'));
    this.label(this.root, '本地游客｜未接入平台登录及支付', 0, -250, 22, '#c4d8ce', 580);
    this.saveStatusLabel = this.label(this.root, this.saveDescription(), 0, -580, 22, GOLD);
  }
  private game() {
    this.clear(); const stage = getStage(this.save.stage); this.background(stage.regionIndex);
    this.box(this.root, 0, 525, 672, 150);
    this.label(this.root, '太初灵契', -170, 555, 30, GOLD, 280);
    this.label(this.root, `灵石 ${this.save.coins}`, 190, 555, 24, GOLD, 260);
    this.label(this.root, `${stage.regionName} · ${stage.wave}/6    第 ${stage.number} 关`, 0, 490, 24, PAPER, 640);
    this.label(this.root, '我方阵容', -185, 430, 18, PAPER, 280);
    this.label(this.root, '敌方阵容', 185, 430, 18, PAPER, 280);
    let battle;
    try { battle = simulateBattle(this.save); } catch { battle = { initialUnits: [] as BattleUnit[] }; }
    for (const u of battle.initialUnits) this.drawUnit({ ...u, hp: u.maxHp });
    this.box(this.root, 0, -420, 672, 350);
    const empty = getUnlockedSlots(this.save.stage).filter(i => !this.save.formation[i]).length;
    this.status = this.label(this.root, empty ? `已解锁 ${getUnlockedSlots(this.save.stage).length} 阵位 · ${empty} 个空位可上阵` : '战前布阵 · 点击角色查看详情', 0, -290, 24, '#d5e1d8', 620);
    this.button(this.root, '布阵', -246, -380, 146, () => this.formation());
    this.button(this.root, '招募', -82, -380, 146, () => this.recruitment());
    this.button(this.root, '指挥官', 82, -380, 146, () => this.commander());
    this.button(this.root, '策略', 246, -380, 146, () => this.strategies());
    this.button(this.root, this.saveState === 'unsaved' ? '重试保存' : `速度 ×${this.speed}`, -240, -480, 160, () => {
      if (this.saveState === 'unsaved') this.savePanel(); else { this.speed = this.speed === 1 ? 2 : 1; this.game(); }
    });
    this.button(this.root, '开始战斗', 0, -480, 280, () => this.fight());
    this.button(this.root, '返回', 240, -480, 160, () => director.loadScene('Login'));
    this.saveStatusLabel = this.label(this.root, this.saveDescription(), 0, -565, 20, GOLD, 640);
  }
  // Source-pixel anchors visually checked against the current full-body originals.
  // bodyTop excludes projecting weapons; ground is between the two boot contacts.
  // Future hero-specific illustrations supply their own anchors, not a shared crop.
  private fighterArt(role: string) {
    if (role === 'guard') return { name: 'fighter-guardian', groundX: 625, groundY: 1240, bodyTop: 105 };
    if (role === 'healer' || role === 'mage') return { name: 'fighter-healer', groundX: 590, groundY: 1265, bodyTop: 50 };
    return { name: 'fighter-sword', groundX: 470, groundY: 1254, bodyTop: 6 };
  }
  private drawUnit(u: BattleUnit) {
    const side = u.side === 'ally' ? -1 : 1;
    const x = side * (70 + u.col * 100); const y = 280 - u.row * 200;
    const n = this.make(u.uid, this.root, x, y, 96, 150); this.unitNodes.set(u.uid, n);
    n.on(Node.EventType.TOUCH_END, () => { if (!this.running) this.unitDetail(u); });
    this.unitHealth.set(u.uid, { hp: u.hp, maxHp: u.maxHp, dead: u.hp <= 0, side: u.side });
    // Shadow survives successful art loading and stays on the formation ground.
    const ground = this.make('GroundShadow', n, 0, -40, 84, 18);
    const shadow = ground.addComponent(Graphics); shadow.fillColor = new Color(0, 0, 0, 95);
    shadow.ellipse(0, 0, 37, 8); shadow.fill();
    const marker = this.make('EventMarker', n, 0, -40, 90, 22).addComponent(Graphics);
    this.unitMarkers.set(u.uid, marker);
    // Art, HUD and ground are separate; feedback never moves or scales the HUD.
    const portrait = this.make('FighterArt', n, 0, 14, 90, 112); this.unitPortraits.set(u.uid, portrait);
    const art = this.fighterArt(u.role);
    const loading = this.label(n, '载入角色…', 0, 15, 18, GOLD, 96);
    resources.load(`art/${art.name}/spriteFrame`, SpriteFrame, (err, sf) => {
      if (!portrait.isValid) return;
      if (err) { loading.string = '角色图未载入'; return; }
      loading.node.destroy();
      const scale = 112 / (art.groundY - art.bodyTop);
      const mirror = u.side === 'enemy' ? -1 : 1;
      // Mirror the anchor offset together with the image so both feet stay grounded.
      portrait.setPosition((sf.originalSize.width / 2 - art.groundX) * scale * mirror,
        -40 + (art.groundY - sf.originalSize.height / 2) * scale);
      const sp = portrait.addComponent(Sprite); sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.spriteFrame = sf;
      portrait.getComponent(UITransform)!.setContentSize(sf.originalSize.width * scale, sf.originalSize.height * scale);
      portrait.setScale(mirror, 1, 1);
      if (this.unitHealth.get(u.uid)?.dead) sp.color = new Color(140, 145, 150, 90);
    });
    const hud = this.make('UnitHUD', n, 0, 0);
    this.label(hud, u.name, 0, -63, 24, PAPER, 98);
    const bar = this.make('HealthBar', hud, 0, -86, 86, 10).addComponent(Graphics); this.hpBars.set(u.uid, bar);
    const hp = this.label(hud, '', 0, -108, 20, '#d1f4d4', 98); this.hpLabels.set(u.uid, hp);
    this.feedbackLabels.set(u.uid, this.label(hud, '', 0, 96, 18, GOLD, 98));
    const energy = this.make('EnergyPips', hud, 0, -108, 32, 12).addComponent(Graphics);
    this.unitEnergy.set(u.uid, { value: u.energy, graphic: energy });
    this.updateHealth(u.uid, u.hp);
    this.updateEnergy(u.uid, u.energy);
  }
  private updateHealth(uid: string, hp: number, dead = false) {
    const state = this.unitHealth.get(uid); if (!state) return;
    state.hp = Math.max(0, Math.min(state.maxHp, hp)); state.dead = dead || state.hp <= 0;
    const label = this.hpLabels.get(uid); if (label) label.string = state.dead ? '已退场' : '';
    const g = this.hpBars.get(uid);
    if (g) {
      g.clear(); g.fillColor = this.color('#12212a'); g.rect(-43, -5, 86, 10); g.fill();
      g.fillColor = this.color(state.side === 'ally' ? '#8cd5ab' : '#d98e83');
      g.rect(-41, -3, 82 * state.hp / state.maxHp, 6); g.fill();
      g.strokeColor = this.color('#d6b979'); g.lineWidth = 1; g.rect(-43, -5, 86, 10); g.stroke();
    }
    if (state.dead) {
      this.unitMarkers.get(uid)?.clear();
      this.unitEnergy.get(uid)?.graphic.clear();
      const feedback = this.feedbackLabels.get(uid); if (feedback) feedback.string = '';
      const sp = this.unitPortraits.get(uid)?.getComponent(Sprite);
      if (sp) sp.color = new Color(140, 145, 150, 90);
    }
  }
  private updateEnergy(uid: string, value: number) {
    const entry = this.unitEnergy.get(uid); if (!entry || !Number.isInteger(value) || value < 0 || value > 2) return;
    entry.value = value; const g = entry.graphic; g.clear();
    if (this.unitHealth.get(uid)?.dead) return;
    for (let i = 0; i < 2; i++) {
      g.fillColor = this.color(i < value ? '#f3d892' : '#29414a');
      g.strokeColor = this.color('#d6b979'); g.lineWidth = 1; g.circle(i ? 9 : -9, 0, 5); g.fill(); g.stroke();
    }
  }
  private eventFeedback(actor?: string, target?: string, healing = false, actionSkill?: string) {
    for (const g of this.unitMarkers.values()) g.clear();
    for (const label of this.feedbackLabels.values()) label.string = '';
    const mark = (uid: string | undefined, text: string, color: string) => {
      if (!uid || this.unitHealth.get(uid)?.dead) return;
      const g = this.unitMarkers.get(uid); if (g) {
        g.strokeColor = this.color(color); g.lineWidth = 3; g.ellipse(0, 0, 42, 10); g.stroke();
      }
      const label = this.feedbackLabels.get(uid); if (label) { label.string = text; label.color = this.color(color); }
    };
    mark(actor, actionSkill === 'classSkill' ? '技能' : actionSkill === 'attack' ? '普攻' : '行动', '#ffe6a4'); mark(target, healing ? '治疗' : '受击', healing ? '#b0f5bd' : '#ffbb9e');
  }
  private unitDetail(u: BattleUnit) {
    const p = this.open(`${u.name} · ${u.side === 'ally' ? '我方' : '敌方'}`); if (!p) return;
    const art = this.make('UnitDetailArt', p, 0, 205, 420, 440);
    const artName = this.fighterArt(u.role).name;
    resources.load(`art/${artName}/spriteFrame`, SpriteFrame, (err, sf) => {
      if (!err && art.isValid) {
        const sp = art.addComponent(Sprite); sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.spriteFrame = sf;
        const scale = Math.min(420 / sf.originalSize.width, 440 / sf.originalSize.height);
        art.getComponent(UITransform)!.setContentSize(sf.originalSize.width * scale, sf.originalSize.height * scale);
      }
    });
    this.label(p, `生命 ${u.hp}/${u.maxHp}    攻击 ${u.attack}`, 0, -80, 28, PAPER, 620);
    this.label(p, `防御 ${u.defense}    速度 ${u.speed}`, 0, -155, 28, PAPER, 620);
    this.label(p, '靠近敌人的列为前排，近战优先攻击前排', 0, -250, 22, '#c8d6cf', 620);
    if (u.side === 'ally') this.button(p, '配置此同道策略', 0, -360, 540, () => this.strategies(u.heroId));
    this.button(p, '返回战场', 0, -465, 540, () => this.game());
  }
  private open(title: string) {
    if (this.running) return null;
    if (this.modal) this.modal.destroy();
    const mask = this.box(this.root, 0, 0, 720, 1280, '#142b32', '#142b32');
    mask.on(Node.EventType.TOUCH_END, (e: any) => e.propagationStopped = true);
    this.modal = mask; this.label(mask, title, -60, 550, 30, GOLD, 470);
    this.saveStatusLabel = this.label(mask, this.saveDescription(), 0, -580, 20, GOLD, 640);
    this.button(mask, '关闭', 260, 550, 120, () => { this.selected = null; this.modal?.destroy(); this.modal = null; this.game(); }); return mask;
  }
  private formation() {
    const p = this.open('布阵 · 点击两格交换'); if (!p) return;
    this.label(p, '靠近敌人的是前排｜解锁顺序：2×2 → 3×2 → 3×3', 0, 440, 24, '#c8d6cf', 630);
    const slots = getUnlockedSlots(this.save.stage);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const i = row * 3 + col; const id = this.save.formation[i]; const h = HEROES.find(v => v.id === id);
      this.button(p, slots.includes(i) ? `${this.selected === i ? '◆ ' : ''}${h?.name || '空位'}` : '未解锁', 220 - col * 220, 270 - row * 200, 195, () => {
        if (this.selected === null) { this.selected = i; this.formation(); return; }
        const from = this.selected; this.selected = null;
        try { const a = this.save.formation[from]; const b = this.save.formation[i];
          let next = setFormation(this.save, from, null); next = setFormation(next, i, a); next = setFormation(next, from, b);
          this.save = next; this.persist(); this.formation();
        } catch (e) { this.toast(String(e)); }
      }, slots.includes(i));
    }
    this.label(p, '后排 ←                 → 前排 / 敌人', 0, -280, 24, PAPER, 620);
    this.button(p, '返回战场', 0, -440, 440, () => { this.selected = null; this.game(); });
  }
  private recruitment(page = 0) {
    const p = this.open('招募同道'); if (!p) return;
    const pages = Math.ceil(HEROES.length / 6); page = Math.max(0, Math.min(page, pages - 1));
    this.label(p, `灵石 ${this.save.coins} · 每位 ${RECRUIT_COST} 灵石`, 0, 445, 24);
    HEROES.slice(page * 6, page * 6 + 6).forEach((h, i) => {
      const owned = this.save.owned.includes(h.id); const x = i % 2 ? 165 : -165; const y = 330 - Math.floor(i / 2) * 235;
      this.box(p, x, y - 40, 306, 200, '#203b43');
      this.label(p, h.name, x, y + 12, 27, GOLD, 280);
      this.label(p, {guard:'守御',sword:'剑修',mage:'术士',healer:'医修',archer:'灵弓'}[h.role], x, y - 35, 22, PAPER, 280);
      this.button(p, owned ? '上阵 / 替换' : '招募', x, y - 100, 270, () => {
        try { if (!owned) { this.save = recruit(this.save, h.id); this.persist(); this.recruitment(page); }
          else this.placeHero(h.id);
        } catch (e) { this.toast(String(e)); }
      });
    });
    this.button(p, '上一页', -220, -445, 180, () => this.recruitment(page - 1), page > 0);
    this.label(p, `${page + 1} / ${pages}`, 0, -445, 24, PAPER, 150);
    this.button(p, '下一页', 220, -445, 180, () => this.recruitment(page + 1), page < pages - 1);
  }
  private placeHero(id: string) {
    const p = this.open('选择上阵位置'); if (!p) return;
    const slots = getUnlockedSlots(this.save.stage);
    slots.forEach(i => this.button(p, HEROES.find(h => h.id === this.save.formation[i])?.name || '空位', 220 - (i % 3) * 220, 270 - Math.floor(i / 3) * 200, 195, () => {
      try { this.save = setFormation(this.save, i, id); this.persist(); this.game(); } catch (e) { this.toast(String(e)); }
    }));
  }
  private strategies(heroId = this.save.owned[0]) {
    const p = this.open('战斗策略 · 条件与优先级'); if (!p) return;
    if (!heroId) { this.label(p, '尚无可配置的队友', 0, 0, 24); return; }
    const hero = HEROES.find(h => h.id === heroId)!;
    const heroIndex = this.save.owned.indexOf(heroId);
    this.button(p, '‹', -275, 445, 80, () => this.strategies(this.save.owned[heroIndex - 1]), heroIndex > 0);
    this.label(p, `${hero.name}  ${heroIndex + 1}/${this.save.owned.length}`, 0, 445, 27, GOLD, 440);
    this.button(p, '›', 275, 445, 80, () => this.strategies(this.save.owned[heroIndex + 1]), heroIndex < this.save.owned.length - 1);
    this.label(p, '从上到下检查 · 灵力不足则继续下一条', 0, 380, 20, PAPER, 640);
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
      const y = 240 - index * 245;
      this.box(p, 0, y, 650, 230, '#203b43');
      this.label(p, `规则 ${index + 1} · 技能 / 条件 / 目标`, 0, y + 100, 18, GOLD, 620);
      this.button(p, STRATEGY_SKILLS.find(o => o.id === r.skill)?.label || r.skill, -155, y + 30, 290, () => cycle(index, 'skill', STRATEGY_SKILLS));
      this.button(p, STRATEGY_CONDITIONS.find(o => o.id === r.condition)?.label || r.condition, 155, y + 30, 290, () => cycle(index, 'condition', STRATEGY_CONDITIONS));
      this.button(p, STRATEGY_TARGETS.find(o => o.id === r.target)?.label || r.target, -170, y - 60, 260, () => cycle(index, 'target', STRATEGY_TARGETS));
      this.button(p, '↑', 10, y - 60, 80, () => { const next = [...rules]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; commit(next); }, index > 0);
      this.button(p, '↓', 110, y - 60, 80, () => { const next = [...rules]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; commit(next); }, index < rules.length - 1);
      this.button(p, '删', 210, y - 60, 80, () => commit(rules.filter((_, i) => i !== index)), rules.length > 1);
    });
    this.button(p, '＋ 添加规则', -90, -450, 400, () => commit([...rules, { skill: 'attack', condition: 'always', target: 'front' }]), rules.length < 3);
    this.button(p, '说明', 230, -450, 160, () => this.strategyHelp(heroId));
    this.label(p, '每场灵力 2 点 · 技能耗 2 · 普攻回 1', 0, -525, 22, '#c8d6cf', 640);
  }
  private strategyHelp(heroId: string) {
    const p = this.open('策略与灵力'); if (!p) return;
    this.label(p, '每场战斗重新获得 2 点灵力，上限 2 点。', 0, 390, 26, GOLD, 620);
    this.label(p, '职业技能消耗 2 点；普通攻击回复 1 点。', 0, 290, 26, PAPER, 620);
    this.label(p, '按从上到下的优先级，选择条件满足且资源足够的一条规则。', 0, 160, 24, PAPER, 620);
    this.label(p, '灵力不足会跳过该条，继续检查后续规则；没有可执行规则时使用普通攻击。', 0, 30, 24, PAPER, 620);
    this.label(p, '治疗技能需要受伤友军；近战攻击仍受前排阻挡。', 0, -100, 24, PAPER, 620);
    this.label(p, '脚下双点显示灵力。当前行动结束后更新；敌我遵循相同规则。', 0, -230, 24, '#c8d6cf', 620);
    this.button(p, '返回策略', 0, -440, 540, () => this.strategies(heroId));
  }
  private commander() {
    const p = this.open('指挥官 · 灵契仙使'); if (!p) return;
    const portrait = this.make('CommanderPortrait', p, 0, 230, 470, 430);
    resources.load('art/commander/spriteFrame', SpriteFrame, (err, sf) => {
      if (!err && portrait.isValid) {
        const sp = portrait.addComponent(Sprite); sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.spriteFrame = sf;
        const scale = Math.min(470 / sf.originalSize.width, 430 / sf.originalSize.height);
        portrait.getComponent(UITransform)!.setContentSize(sf.originalSize.width * scale, sf.originalSize.height * scale);
      }
    });
    this.label(p, `境界 ${this.save.commanderLevel}    灵石 ${this.save.coins}`, 0, -35, 28, PAPER, 620);
    this.label(p, '不占阵位 · 每场开局释放一次选定神通', 0, -100, 22, PAPER, 640);
    this.button(p, `${this.save.commanderSkill === 'swordRain' ? '◆ ' : ''}万剑归宗 · 全阵压制`, 0, -190, 600, () => { this.save = selectCommanderSkill(this.save, 'swordRain'); this.persist(); this.commander(); });
    this.button(p, `${this.save.commanderSkill === 'fireball' ? '◆ ' : ''}天火焚阵 · 横排轰击`, 0, -290, 600, () => { this.save = selectCommanderSkill(this.save, 'fireball'); this.persist(); this.commander(); });
    this.label(p, '修炼可增强开场神通威力', 0, -375, 22, '#c8d6cf', 620);
    this.button(p, `修炼升阶 · ${commanderUpgradeCost(this.save)} 灵石`, 0, -460, 600, () => { try { this.save = upgradeCommander(this.save); this.persist(); this.commander(); } catch (e) { this.toast(String(e)); } });
  }
  private fight() {
    if (this.running) return;
    this.running = true; this.resultAwarded = false; const token = ++this.generation;
    let result: BattleResult;
    try { result = simulateBattle(this.save); } catch (e) { this.running = false; this.toast(String(e)); return; }
    let index = 0;
    let pendingAction: { actor: string; energyAfter: number; actionSkill?: string } | null = null;
    const finishAction = () => {
      if (pendingAction) this.updateEnergy(pendingAction.actor, pendingAction.energyAfter);
      pendingAction = null;
    };
    // Block navigation while replay is running: results must only be settled once.
    const blocker = this.make('BattleInputGuard', this.root, 0, -420, 720, 400);
    blocker.on(Node.EventType.TOUCH_END, (e: any) => e.propagationStopped = true);
    const advance = () => {
      if (!this.isValid || token !== this.generation) return;
      if (index >= result.events.length) {
        finishAction();
        this.running = false; this.eventFeedback();
        if (!this.resultAwarded) { this.resultAwarded = true; this.save = settleBattle(this.save, result); this.persist(); }
        blocker.destroy(); const p = this.open(result.winner === 'ally' ? '破阵成功' : '胜败乃修行常事'); if (!p) return;
        this.label(p, result.winner === 'ally' ? (this.saveState === 'saved' ? '奖励已结算并保存，新的关卡已开启' : '奖励已在本次会话生效，但尚未保存') : '调整站位、招募同道或提升指挥官后再战', 0, 150, 28, PAPER, 620);
        this.label(p, this.saveDescription(), 0, 40, 22, GOLD, 620);
        if (this.saveState === 'unsaved') this.button(p, '重试保存（不重复发奖）', 0, -200, 560, () => { if (this.persist()) this.game(); });
        this.button(p, result.winner === 'ally' ? '前往下一关' : '查看阵位', 0, -80, 520, () => result.winner === 'ally' ? this.game() : this.formation());
        if (result.winner !== 'ally') {
          this.button(p, '招募同道', -165, -320, 300, () => this.recruitment());
          this.button(p, '指挥官养成', 165, -320, 300, () => this.commander());
        }
        return;
      }
      const e = result.events[index++];
      if (e.type === 'action') {
        // action is a descriptor, not an extra timed frame. Previous effects have finished.
        finishAction();
        if (e.actor && typeof e.energyAfter === 'number') pendingAction = { actor: e.actor, energyAfter: e.energyAfter, actionSkill: e.actionSkill };
        advance(); return;
      }
      if (e.type === 'end') finishAction();
      this.status.string = e.text;
      this.eventFeedback(e.actor || pendingAction?.actor, e.target, e.type === 'heal', pendingAction?.actionSkill);
      if (e.type === 'commander' && e.target) this.spellEffect(e.target, this.save.commanderSkill);
      if (e.target) {
        const target = this.unitNodes.get(e.target);
        if (typeof e.hp === 'number') this.updateHealth(e.target, e.hp, e.type === 'death');
        else if (e.type === 'death') this.updateHealth(e.target, 0, true);
        if (target && e.amount) {
          // Event feedback only: this is not a character's authored body animation.
          const v = this.label(target, `${e.type === 'heal' ? '+' : '-'}${e.amount}`, 0, 58, 26, e.type === 'heal' ? '#a8f0ad' : '#ffe2a2', 110);
          tween(v.node).by(.3 / this.speed, { position: new Vec3(0, 24, 0) }).call(() => v.node.destroy()).start();
        }
      }
      // A fresh callback avoids re-scheduling the currently executing one-shot timer.
      this.scheduleOnce(() => advance(), (e.type === 'commander' ? .65 : .38) / this.speed);
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
    const n = this.box(this.root, 0, -530, 656, 80, '#5b3430', '#dba990');
    this.label(n, message.replace(/^Error:\s*/, ''), 0, 0, 22, PAPER, 620); this.scheduleOnce(() => { if (n.isValid) n.destroy(); }, 3);
  }
}
