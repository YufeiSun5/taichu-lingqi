import { _decorator, Component, Node, Canvas, Camera, UITransform, Graphics, Color, Label, Layers, view, ResolutionPolicy, director, sys, resources, SpriteFrame, Sprite, tween, Vec3, Mask, LabelOutline, Button, BlockInputEvents, UIOpacity, Texture2D, Rect, Size, Vec2, isValid } from 'cc';
import { createSave, HEROES, getUnlockedSlots, getStage, simulateBattle, settleBattle, setFormation, recruit, upgradeCommander, selectCommanderSkill, commanderUpgradeCost, RECRUIT_COST, getStrategy, setStrategy, STRATEGY_SKILLS, STRATEGY_CONDITIONS, STRATEGY_TARGETS } from './core/game';
import type { Save, BattleUnit, BattleResult, BattleEvent, StrategyRule } from './core/game';
import { stageFocus, stageCell, stageCover, preparationBackdrop } from './presentation/BattleStage';
import type { StageFocus } from './presentation/BattleStage';
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
  private stageMode = false;
  private stageLayer: Node | null = null;
  private stageUnits: BattleUnit[] = [];
  private stagePlacements = new Map<string, StageFocus>();
  private stageNames: Node | null = null;
  private stageLabels = new Map<string, Label>();
  private miniPortraits = new Map<string, Node>();
  private miniMarkers = new Map<string, Graphics>();
  private stageCommander: Node | null = null;
  private status!: Label;
  private generation = 0;
  private resultAwarded = false;
  private swordFrames: SpriteFrame[] = [];
  private swordTexture: Texture2D | null = null;
  private unitActors = new Map<string, { heroId: string; mirror: number; scale: number; pose?: number }>();
  private preloadSwordActions() {
    resources.load('art/fighter-sword-actions/texture', Texture2D, (err, texture) => {
      if (err || !texture || !isValid(texture) || !isValid(this, true) || !isValid(this.node, true)) return;
      if (texture.width !== 1254 || texture.height !== 1254) return;
      texture.addRef(); this.swordTexture?.decRef(); this.swordTexture = texture;
      for (const frame of this.swordFrames) frame.decRef();
      this.swordFrames = [0, 1, 2, 3].map(i => {
        const frame = new SpriteFrame();
        frame.reset({ texture, rect: new Rect((i % 2) * 627, Math.floor(i / 2) * 627, 627, 627), originalSize: new Size(627, 627), offset: new Vec2(0, 0), isRotate: false });
        frame.packable = false; frame.addRef(); return frame;
      });
      // Never interrupt a running action or restore a dead unit on a late load.
      if (!this.running) for (const uid of this.unitActors.keys()) this.swordPose(uid, 0);
    });
  }
  private swordPose(uid: string, pose: number) {
    const actor = this.unitActors.get(uid), portrait = this.unitPortraits.get(uid), frame = this.swordFrames[pose];
    if (actor?.heroId !== 'sword' || !portrait || !isValid(portrait, true) || this.unitHealth.get(uid)?.dead || !frame || !isValid(frame)) return false;
    const feet = [[275, 562], [311.5, 562], [268, 545], [276, 546]][pose];
    const sprite = portrait.getComponent(Sprite) || portrait.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.trim = false; sprite.spriteFrame = frame;
    portrait.getComponent(UITransform)!.setContentSize(627 * actor.scale, 627 * actor.scale);
    portrait.setPosition((313.5 - feet[0]) * actor.scale * actor.mirror, -40 + (feet[1] - 313.5) * actor.scale);
    portrait.setScale(actor.mirror, 1, 1); actor.pose = pose; return true;
  }
  private playSwordAction(uid: string, impact: () => void) {
    if (!this.swordPose(uid, 1)) return false;
    const token = this.generation, portrait = this.unitPortraits.get(uid)!;
    const valid = () => token === this.generation && isValid(this, true) && isValid(portrait, true) && !this.unitHealth.get(uid)?.dead;
    this.scheduleOnce(() => { if (valid()) { this.swordPose(uid, 2); impact(); } }, .14 / this.speed);
    this.scheduleOnce(() => { if (valid()) this.swordPose(uid, 3); }, .25 / this.speed);
    this.scheduleOnce(() => { if (valid()) this.swordPose(uid, 0); }, .34 / this.speed);
    return true;
  }
  private unitArtReady = new Set<string>();
  private unitArtFailed = new Set<string>();
  private presentationFailures = new Set<string>();
  private spellFrames = new Map<string, SpriteFrame>();
  private cachePresentationFrame(name: string, frame: SpriteFrame) {
    if (this.spellFrames.get(name) === frame) return;
    frame.addRef(); this.spellFrames.get(name)?.decRef(); this.spellFrames.set(name, frame);
  }
  private preloadSpells() {
    for (const name of ['fx-sword', 'fx-fireball', 'battle-bamboo-stage', 'commander', 'ui-skill-banner']) resources.load(`art/${name}/spriteFrame`, SpriteFrame, (err, frame) => {
      if (err) this.presentationFailures.add(name);
      if (!err && frame && isValid(frame) && isValid(this, true) && isValid(this.node, true)) {
        this.presentationFailures.delete(name);
        this.cachePresentationFrame(name, frame);
      }
    });
  }
  onLoad() {
    this.preloadSpells();
    this.preloadSwordActions();
    view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);
    this.root = this.make('Canvas', this.node, 0, 0, 720, 1280);
    const canvas = this.root.addComponent(Canvas);
    // SHOW_ALL may expose a wider camera view: constrain all scene artwork to portrait bounds.
    this.root.addComponent(Mask);
    const cameraNode = new Node('UICamera'); cameraNode.parent = this.node;
    const camera = cameraNode.addComponent(Camera); camera.projection = Camera.ProjectionType.ORTHO;
    camera.orthoHeight = 640; camera.near = 0.1; camera.far = 2000; camera.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    camera.clearColor = this.color(INK); camera.visibility = Layers.Enum.UI_2D;
    cameraNode.setPosition(0, 0, 1000); canvas.cameraComponent = camera;
    const shared = GameApp.session;
    if (shared) { this.store = shared.store; this.save = shared.save; this.saveState = shared.state; this.lastSaveError = shared.error || ''; this.renderEntry(); }
    else { this.store = new LocalSaveStore(sys.localStorage, STORE); this.load(); }
  }
  onDestroy() {
    this.generation++; this.unscheduleAllCallbacks();
    for (const frame of this.spellFrames.values()) frame.decRef();
    this.spellFrames.clear();
    for (const frame of this.swordFrames) frame.decRef();
    this.swordFrames = []; this.swordTexture?.decRef(); this.swordTexture = null;
  }
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
  private ribbon(parent: Node, x: number, y: number, w: number, h: number, primary = false) {
    const n = this.make('JadeFrame', parent, x, y, w, h); const g = n.addComponent(Graphics);
    const bevel = Math.min(13, h / 4);
    const shape = (inset: number) => {
      const l = -w / 2 + inset, r = w / 2 - inset, b = -h / 2 + inset, t = h / 2 - inset;
      g.moveTo(l + bevel, b); g.lineTo(r - bevel, b); g.lineTo(r, b + bevel); g.lineTo(r, t - bevel);
      g.lineTo(r - bevel, t); g.lineTo(l + bevel, t); g.lineTo(l, t - bevel); g.lineTo(l, b + bevel); g.close();
    };
    g.fillColor = this.color(primary ? '#725833' : '#142d35'); shape(0); g.fill();
    g.strokeColor = this.color(primary ? '#ebd296' : '#a18a5d'); g.lineWidth = 2; shape(1); g.stroke();
    g.strokeColor = this.color(primary ? '#a68c52' : '#31545b'); g.lineWidth = 1; shape(6); g.stroke();
    // Restrained lacquer highlights and gold corner inlays, not a flat form field.
    g.fillColor = new Color(222, 231, 208, primary ? 30 : 13); g.rect(-w / 2 + 15, 3, w - 30, h / 2 - 13); g.fill();
    g.strokeColor = this.color('#d6b979'); g.lineWidth = 2;
    for (const direction of [-1, 1]) {
      const px = direction * (w / 2 - 12); g.moveTo(px, -9); g.lineTo(px - direction * 5, 0); g.lineTo(px, 9);
    }
    g.stroke(); return n;
  }
  private shadowText(parent: Node, value: string, x: number, y: number, size = 24, color = PAPER, w = 640) {
    const label = this.label(parent, value, x, y, size, color, w);
    const outline = label.node.addComponent(LabelOutline); outline.color = this.color('#0a1a22'); outline.width = 2;
    return label;
  }
  private button(parent: Node, value: string, x: number, y: number, w: number, action: () => void, active = true) {
    const primary = value === '开始战斗' || value === '踏入仙途';
    const n = this.ribbon(parent, x, y, w, 80, primary);
    const label = this.shadowText(n, value, 0, 0, primary ? 28 : 24, active ? PAPER : '#82918f', w - 22);
    label.isBold = primary;
    const button = n.addComponent(Button); button.transition = Button.Transition.NONE; button.interactable = active;
    n.on(Button.EventType.CLICK, () => { if (active && !this.running && isValid(n, true)) action(); }); return n;
  }
  private clear() { this.unitArtReady.clear(); this.unitArtFailed.clear(); const clip = this.root.getComponent(Mask); if (clip) clip.enabled = true; this.stageMode = false; this.stageLayer = null; this.stageUnits = []; this.stagePlacements.clear(); this.stageLabels.clear(); this.miniPortraits.clear(); this.miniMarkers.clear(); this.stageNames = null; this.stageCommander = null; this.generation++; this.unitActors.clear(); for (const child of [...this.root.children]) child.destroy(); this.root.removeAllChildren(); this.modal = null; this.saveStatusLabel = null; this.unitNodes.clear(); this.hpLabels.clear(); this.hpBars.clear(); this.unitPortraits.clear(); this.unitMarkers.clear(); this.feedbackLabels.clear(); this.unitHealth.clear(); this.unitEnergy.clear(); }
  private background(region = 0) {
    this.box(this.root, 0, 0, 720, 1280, '#142c32', '#142c32');
    const art = this.make('BackgroundArt', this.root, 0, 0, 720, 1280);
    const apply = (sf: SpriteFrame, portrait: boolean) => {
      if (!isValid(art, true)) return;
      const sp = art.addComponent(Sprite); sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.spriteFrame = sf;
      // Portrait art has its walkable ground in the central/lower field. The legacy
      // landscape fallback crops to its lower quarter instead of floating actors in sky.
      const scale = portrait ? Math.max(720 / sf.originalSize.width, 1280 / sf.originalSize.height)
        : Math.max(720 / sf.originalSize.width, 1000 / (sf.originalSize.height * .25));
      art.getComponent(UITransform)!.setContentSize(sf.originalSize.width * scale, sf.originalSize.height * scale);
      art.setPosition(0, portrait ? 0 : -640 + sf.originalSize.height * scale / 2);
    };
    const legacy = () => resources.load(`art/${region % 2 ? 'battle-temple' : 'battle-bamboo'}/spriteFrame`, SpriteFrame, (err, sf) => { if (!err) apply(sf, false); });
    resources.load(`art/${preparationBackdrop(region)}/spriteFrame`, SpriteFrame, (err, sf) => { if (err) legacy(); else apply(sf, true); });
  }
  private edgeVeil(parent: Node, top: boolean, depth = 200) {
    const n = this.make(top ? 'TopVignette' : 'BottomVignette', parent, 0, 0); const g = n.addComponent(Graphics);
    for (let i = 0; i < 16; i++) {
      const strip = depth / 16; g.fillColor = new Color(8, 24, 30, Math.round(225 * (1 - i / 16)));
      g.rect(-360, top ? 640 - (i + 1) * strip : -640 + i * strip, 720, strip + 1); g.fill();
    }
  }
  private login() {
    this.clear(); this.background(); this.edgeVeil(this.root, true, 300);
    const portrait = this.make('LoginCommander', this.root, 35, 20, 700, 700);
    resources.load('art/commander/spriteFrame', SpriteFrame, (err, sf) => {
      if (!err && isValid(portrait, true)) {
        const scale = Math.min(760 / sf.originalSize.width, 760 / sf.originalSize.height);
        const sp = portrait.getComponent(Sprite) || portrait.addComponent(Sprite); sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.spriteFrame = sf;
        portrait.getComponent(UITransform)!.setContentSize(sf.originalSize.width * scale, sf.originalSize.height * scale);
      }
    });
    this.edgeVeil(this.root, false, 430);
    this.shadowText(this.root, '太 初 灵 契', 0, 490, 64, GOLD, 660);
    this.shadowText(this.root, '结契同道 · 以阵问天', 0, 390, 28, PAPER, 620);
    this.shadowText(this.root, '灵契仙使 · 邀君共赴山海', 0, -310, 24, PAPER, 620);
    this.button(this.root, '踏入仙途', 0, -425, 490, () => director.loadScene('Game'));
    this.shadowText(this.root, '本地游客｜未接入平台登录及支付', 0, -510, 20, '#d2d9ce', 620);
    this.saveStatusLabel = this.shadowText(this.root, this.saveDescription(), 0, -580, 18, GOLD);
  }
  private game() {
    this.clear(); const stage = getStage(this.save.stage); this.background(stage.regionIndex);
    this.edgeVeil(this.root, true, 160);
    const top = this.ribbon(this.root, 0, 555, 672, 70);
    this.shadowText(top, '太初灵契', -205, 0, 26, GOLD, 230);
    this.shadowText(top, `第 ${stage.number} 关`, 20, 0, 24, PAPER, 200);
    this.shadowText(top, `灵石 ${this.save.coins}`, 225, 0, 24, GOLD, 180);
    const chapter = this.ribbon(this.root, 0, 475, 470, 52);
    this.shadowText(chapter, `${stage.regionName} · ${stage.wave} / 6`, 0, 0, 24, PAPER, 430);
    let battle;
    try { battle = simulateBattle(this.save); } catch { battle = { initialUnits: [] as BattleUnit[] }; }
    // Back rows first, front rows last: lower ground figures overlap upper ones naturally.
    for (const u of [...battle.initialUnits].sort((a, b) => a.row - b.row || b.col - a.col)) this.drawUnit({ ...u, hp: u.maxHp });
    this.edgeVeil(this.root, false, 280);
    const empty = getUnlockedSlots(this.save.stage).filter(i => !this.save.formation[i]).length;
    const statusBand = this.ribbon(this.root, 0, -355, 660, 54);
    this.status = this.shadowText(statusBand, empty ? `已解锁 ${getUnlockedSlots(this.save.stage).length} 阵位 · ${empty} 个空位可上阵` : '战前布阵 · 点击角色查看详情', 0, 0, 22, PAPER, 620);
    this.button(this.root, '布阵', -246, -425, 146, () => this.formation());
    this.button(this.root, '招募', -82, -425, 146, () => this.recruitment());
    this.button(this.root, '指挥官', 82, -425, 146, () => this.commander());
    this.button(this.root, '策略', 246, -425, 146, () => this.strategies());
    this.button(this.root, this.saveState === 'unsaved' ? '重试保存' : `速度 ×${this.speed}`, -240, -520, 160, () => {
      if (this.saveState === 'unsaved') this.savePanel(); else { this.speed = this.speed === 1 ? 2 : 1; this.game(); }
    });
    this.button(this.root, '开始战斗', 0, -520, 280, () => this.fight());
    this.button(this.root, '返回', 240, -520, 160, () => director.loadScene('Login'));
    this.saveStatusLabel = this.shadowText(this.root, this.saveDescription(), 0, -585, 20, GOLD, 640);
  }
  private enterBattleStage(units: BattleUnit[]) {
    this.stageMode = true; this.stageUnits = units;
    const clip = this.root.getComponent(Mask); if (clip) clip.enabled = false;
    const screen = view.getFrameSize(), cover = stageCover(screen.width, screen.height);
    const previousBackdrop = this.root.children.find(child => child.name === 'BackgroundArt');
    for (const child of [...this.root.children]) child.active = child === previousBackdrop;
    const layer = this.make('BattleStage', this.root, 0, 0, 720, 1280); this.stageLayer = layer;
    const backdrop = this.make('StageBackdrop', layer, 0, 0, 720, 1280);
    const loading = this.shadowText(layer, '舞台加载中…', 0, 300, 24, PAPER, 400);
    const applyBackground = (sf: SpriteFrame, final: boolean) => {
      if (!isValid(backdrop, true)) return;
      loading.node.destroy(); if (previousBackdrop && isValid(previousBackdrop, true)) previousBackdrop.active = false;
      const sprite = backdrop.addComponent(Sprite); sprite.spriteFrame = sf; sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      const scale = Math.max(cover.width / sf.originalSize.width, (final ? cover.height : Math.max(1664, cover.height)) / sf.originalSize.height);
      backdrop.getComponent(UITransform)!.setContentSize(sf.originalSize.width * scale, sf.originalSize.height * scale);
      backdrop.setPosition(0, final ? 0 : 180);
    };
    const cachedStage = this.spellFrames.get('battle-bamboo-stage');
    if (cachedStage && isValid(cachedStage)) applyBackground(cachedStage, true);
    else resources.load('art/battle-bamboo-stage/spriteFrame', SpriteFrame, (error, frame) => {
      if (!error) applyBackground(frame, true);
      else resources.load('art/battle-bamboo/spriteFrame', SpriteFrame, (err, fallback) => { if (!err) applyBackground(fallback, false); });
    });
    // No full-screen dark slabs or stepped vignette bands in the performance view.
    const figures = this.make('StageFigures', layer, 0, 0);
    for (const unit of units) {
      const figure = this.unitNodes.get(unit.uid); if (!figure) continue;
      figure.parent = figures; figure.active = false;
      figure.children.find(child => child.name === 'GroundShadow')?.setScale(2.2, 2.2, 1);
      figure.children.find(child => child.name === 'EventMarker')?.setScale(1.7, 1.7, 1);
      const hud = figure.children.find(child => child.name === 'UnitHUD');
      const cell = stageCell(unit), tile = this.make('FormationCell', layer, cell.x, cell.y, 94, 56);
      const pedestal = this.make('FormationPedestal', tile, 0, -8, 94, 34).addComponent(Graphics);
      pedestal.fillColor = new Color(16, 42, 49, 215); pedestal.strokeColor = this.color('#9c8657'); pedestal.lineWidth = 1;
      pedestal.moveTo(-45, 0); pedestal.lineTo(0, 16); pedestal.lineTo(45, 0); pedestal.lineTo(0, -16); pedestal.close(); pedestal.fill(); pedestal.stroke();
      const marker = tile.addComponent(Graphics); this.miniMarkers.set(unit.uid, marker);
      if (hud) {
        hud.parent = tile; hud.setPosition(0, 0);
        for (const child of hud.children) child.active = false;
        const bar = hud.children.find(child => child.name === 'HealthBar'); if (bar) { bar.active = true; bar.setPosition(0, -17); }
        const pips = hud.children.find(child => child.name === 'EnergyPips'); if (pips) { pips.active = true; pips.setPosition(0, -28); }
      }
      const mini = this.make('FormationPortrait', tile, 0, 9, 44, 46); this.miniPortraits.set(unit.uid, mini);
      const applyMini = (frame: SpriteFrame) => {
        if (!isValid(mini, true)) return;
        const sprite = mini.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        const scale = Math.min(48 / frame.originalSize.width, 46 / frame.originalSize.height);
        mini.getComponent(UITransform)!.setContentSize(frame.originalSize.width * scale, frame.originalSize.height * scale);
        if (this.unitHealth.get(unit.uid)?.dead) sprite.color = new Color(120, 120, 120, 85);
      };
      const cachedMini = this.spellFrames.get(this.fighterArt(unit.role, unit.heroId).name);
      if (cachedMini && isValid(cachedMini)) applyMini(cachedMini);
    }
    const title = this.ribbon(layer, 0, 550, 460, 64);
    const stage = getStage(this.save.stage);
    this.shadowText(title, `${stage.regionName} · 第 ${stage.number} 关`, 0, 0, 28, PAPER, 430);
    this.shadowText(layer, '我 方 灵 阵', -170, -365, 24, GOLD, 280);
    this.shadowText(layer, '敌 方 灵 阵', 170, -365, 24, '#e2b6a0', 280);
    const skill = this.make('SkillBanner', layer, 0, -305, 620, 90);
    const fallbackBanner = this.ribbon(skill, 0, 0, 620, 60);
    const applyBanner = (frame: SpriteFrame) => {
      if (!isValid(skill, true)) return;
      fallbackBanner.active = false;
      const sprite = skill.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      // Source alpha bounds are 2118×340 inside the 2172×724 transparent canvas.
      const scale = 620 / 2118;
      skill.getComponent(UITransform)!.setContentSize(frame.originalSize.width * scale, frame.originalSize.height * scale);
    };
    const cachedBanner = this.spellFrames.get('ui-skill-banner');
    if (cachedBanner && isValid(cachedBanner)) applyBanner(cachedBanner);
    this.status = this.shadowText(skill, '灵契交锋', 0, 0, 26, PAPER, 420);
    this.shadowText(layer, `演出中 · 速度 ×${this.speed}`, 0, -580, 22, '#d8d9c8', 620);
    this.stageNames = this.make('StageNames', layer, 0, 0);
    this.stageCommander = this.make('StageCommander', layer, -170, -210, 420, 500); this.stageCommander.active = false;
    const commanderNode = this.stageCommander;
    const applyCommander = (frame: SpriteFrame) => {
      const node = commanderNode;
      if (!node || !isValid(node, true)) return;
      const sprite = node.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      const scale = Math.min(420 / frame.originalSize.width, 500 / frame.originalSize.height);
      node.getComponent(UITransform)!.setContentSize(frame.originalSize.width * scale, frame.originalSize.height * scale);
      node.setPosition(-170, 20);
    };
    const cachedCommander = this.spellFrames.get('commander');
    if (cachedCommander && isValid(cachedCommander)) applyCommander(cachedCommander);
    const ally = units.find(unit => unit.side === 'ally'), enemy = units.find(unit => unit.side === 'enemy');
    this.focusBattle(ally?.uid, enemy ? [enemy.uid] : []);
  }
  private applyStageArt(uid: string) {
    const placement = this.stagePlacements.get(uid), unit = this.stageUnits.find(unit => unit.uid === uid);
    const portrait = this.unitPortraits.get(uid), actor = this.unitActors.get(uid);
    if (!placement || !unit || !portrait || !actor) return;
    actor.scale = placement.bodyHeight / 428;
    if (actor.pose !== undefined) {
      if (!this.unitHealth.get(uid)?.dead) this.swordPose(uid, actor.pose);
      return;
    }
    const frame = portrait.getComponent(Sprite)?.spriteFrame; if (!frame) return;
    const art = this.fighterArt(unit.role, unit.heroId), scale = placement.bodyHeight / (art.groundY - art.bodyTop);
    portrait.getComponent(UITransform)!.setContentSize(frame.originalSize.width * scale, frame.originalSize.height * scale);
    portrait.setPosition((frame.originalSize.width / 2 - art.groundX) * scale * actor.mirror, -40 + (art.groundY - frame.originalSize.height / 2) * scale);
  }
  private focusBattle(actor?: string, targets: string[] = [], commander = false) {
    if (!this.stageMode) return;
    this.stagePlacements = new Map(stageFocus(this.stageUnits, actor, targets).map(item => [item.uid, item]));
    for (const [uid, node] of this.unitNodes) {
      const placement = this.stagePlacements.get(uid); node.active = !!placement;
      if (placement) { node.setPosition(placement.x, placement.footY + 40); this.applyStageArt(uid); }
    }
    [...this.stagePlacements.values()].sort((a, b) => b.footY - a.footY).forEach((placement, index) => this.unitNodes.get(placement.uid)?.setSiblingIndex(index));
    if (this.stageCommander) this.stageCommander.active = commander;
    this.stageLabels.clear();
    if (this.stageNames) { for (const child of [...this.stageNames.children]) child.destroy(); this.stageNames.removeAllChildren(); }
    const nameRows = new Map<string, number[]>();
    for (const placement of this.stagePlacements.values()) {
      const unit = this.stageUnits.find(unit => unit.uid === placement.uid)!;
      let nameY = placement.footY + placement.bodyHeight + (unit.heroId === 'sword' ? 120 : 80);
      const occupied = nameRows.get(unit.side) || [];
      while (occupied.some(y => Math.abs(y - nameY) < 75)) nameY += 75;
      occupied.push(nameY); nameRows.set(unit.side, occupied);
      const label = this.shadowText(this.stageNames!, '', unit.side === 'ally' ? -175 : 175, nameY, 26, PAPER, 300); this.stageLabels.set(unit.uid, label); this.updateStageLabel(unit.uid);
    }
    for (const [uid, marker] of this.miniMarkers) {
      marker.clear();
      if (uid === actor || targets.includes(uid)) {
        marker.strokeColor = this.color(uid === actor ? GOLD : '#f5c2a3'); marker.lineWidth = 2;
        marker.roundRect(-46, -30, 92, 60, 7); marker.stroke();
      }
    }
  }
  private updateStageLabel(uid: string) {
    const label = this.stageLabels.get(uid), unit = this.stageUnits.find(unit => unit.uid === uid), health = this.unitHealth.get(uid);
    if (label && unit && health) label.string = `${unit.name}  ${health.dead ? '已退场' : `${health.hp}/${health.maxHp}`}  ${this.unitEnergy.get(uid)?.value ?? 0}灵`;
  }
  private battlePlacement(u: BattleUnit) {
    const slots = getUnlockedSlots(this.save.stage);
    const columns = Math.max(...slots.map(i => i % 3)) + 1;
    const rows = Math.max(...slots.map(i => Math.floor(i / 3))) + 1;
    const side = u.side === 'ally' ? -1 : 1;
    const bodyHeight = columns === 3 ? 132 : rows === 3 ? 156 : 170;
    return { bodyHeight, width: columns === 3 ? 98 : 126,
      x: side * (columns === 3 ? 86 + u.col * 100 : 110 + u.col * 140),
      y: (rows === 2 ? 200 - u.row * 310 : 250 - u.row * 250) + 40 };
  }
  // Source-pixel anchors visually checked against the current full-body originals.
  // bodyTop excludes projecting weapons; ground is between the two boot contacts.
  // Future hero-specific illustrations supply their own anchors, not a shared crop.
  private fighterArt(role: string, heroId?: string) {
    if (heroId === 'archer') return { name: 'fighter-archer', groundX: 484, groundY: 1389, bodyTop: 25 };
    if (heroId === 'mage') return { name: 'fighter-mage', groundX: 552, groundY: 1285, bodyTop: 70 };
    if (heroId === 'blade') return { name: 'fighter-blade', groundX: 459, groundY: 1183, bodyTop: 20 };
    if (heroId === 'lotus') return { name: 'fighter-lotus', groundX: 504, groundY: 1282, bodyTop: 45 };
    if (heroId === 'frost') return { name: 'fighter-frost', groundX: 528, groundY: 1283, bodyTop: 42 };
    if (heroId === 'monk') return { name: 'fighter-monk', groundX: 578, groundY: 1264, bodyTop: 13 };
    if (role === 'guard') return { name: 'fighter-guardian', groundX: 625, groundY: 1240, bodyTop: 105 };
    if (role === 'healer' || role === 'mage') return { name: 'fighter-healer', groundX: 590, groundY: 1265, bodyTop: 50 };
    return { name: 'fighter-sword', groundX: 470, groundY: 1254, bodyTop: 6 };
  }
  private drawUnit(u: BattleUnit) {
    const layout = this.battlePlacement(u);
    this.unitActors.set(u.uid, { heroId: u.heroId, mirror: u.side === 'enemy' ? -1 : 1, scale: layout.bodyHeight / (562 - 134) });
    const n = this.make(u.uid, this.root, layout.x, layout.y, layout.width, layout.bodyHeight + 100); this.unitNodes.set(u.uid, n);
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
    const art = this.fighterArt(u.role, u.heroId);
    const loading = this.label(n, '载入角色…', 0, 15, 18, GOLD, 96);
    resources.load(`art/${art.name}/spriteFrame`, SpriteFrame, (err, sf) => {
      if (!isValid(portrait, true)) return;
      if (err) { this.unitArtFailed.add(u.uid); loading.string = '角色图未载入'; return; }
      this.cachePresentationFrame(art.name, sf);
      this.unitArtReady.add(u.uid); this.unitArtFailed.delete(u.uid);
      loading.node.destroy();
      if (this.unitActors.get(u.uid)?.pose !== undefined || this.swordPose(u.uid, 0)) return;
      const scale = layout.bodyHeight / (art.groundY - art.bodyTop);
      const mirror = u.side === 'enemy' ? -1 : 1;
      // Mirror the anchor offset together with the image so both feet stay grounded.
      portrait.setPosition((sf.originalSize.width / 2 - art.groundX) * scale * mirror,
        -40 + (art.groundY - sf.originalSize.height / 2) * scale);
      const sp = portrait.getComponent(Sprite) || portrait.addComponent(Sprite); sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.spriteFrame = sf;
      portrait.getComponent(UITransform)!.setContentSize(sf.originalSize.width * scale, sf.originalSize.height * scale);
      portrait.setScale(mirror, 1, 1);
      if (this.unitHealth.get(u.uid)?.dead) sp.color = new Color(140, 145, 150, 90);
      if (this.stageMode) this.applyStageArt(u.uid);
    });
    const hud = this.make('UnitHUD', n, 0, 0);
    const plaque = this.ribbon(hud, 0, -64, layout.width, 34);
    this.shadowText(plaque, u.name, 0, 0, 24, PAPER, layout.width - 8);
    const bar = this.make('HealthBar', hud, 0, -86, 86, 10).addComponent(Graphics); this.hpBars.set(u.uid, bar);
    const hp = this.label(hud, '', 0, -108, 20, '#d1f4d4', 98); this.hpLabels.set(u.uid, hp);
    this.feedbackLabels.set(u.uid, this.shadowText(hud, '', 0, layout.bodyHeight - 20, 18, GOLD, layout.width));
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
    this.updateStageLabel(uid);
    if (state.dead) {
      const mini = this.miniPortraits.get(uid)?.getComponent(Sprite); if (mini) mini.color = new Color(120, 120, 120, 85);
      this.unitMarkers.get(uid)?.clear();
      this.unitEnergy.get(uid)?.graphic.clear();
      const feedback = this.feedbackLabels.get(uid); if (feedback) feedback.string = '';
      const sp = this.unitPortraits.get(uid)?.getComponent(Sprite);
      if (sp) sp.color = new Color(140, 145, 150, 90);
    }
  }
  private updateEnergy(uid: string, value: number) {
    const entry = this.unitEnergy.get(uid); if (!entry || !Number.isInteger(value) || value < 0 || value > 2) return;
    entry.value = value; this.updateStageLabel(uid); const g = entry.graphic; g.clear();
    if (this.unitHealth.get(uid)?.dead) return;
    for (let i = 0; i < 2; i++) {
      g.fillColor = this.color(i < value ? '#f3d892' : '#29414a');
      g.strokeColor = this.color('#d6b979'); g.lineWidth = 1; g.circle(i ? 9 : -9, 0, 5); g.fill(); g.stroke();
    }
  }
  private eventFeedback(actor?: string, target?: string, healing = false, actionSkill?: string, keepTargets = false) {
    if (!keepTargets) for (const g of this.unitMarkers.values()) g.clear();
    for (const label of this.feedbackLabels.values()) label.string = '';
    const mark = (uid: string | undefined, text: string, color: string) => {
      if (!uid || this.unitHealth.get(uid)?.dead) return;
      const g = this.unitMarkers.get(uid); if (g) {
        g.strokeColor = this.color(color); g.lineWidth = 3; g.ellipse(0, 0, 42, 10); g.stroke();
      }
      // Actor/target are shown by their ground rings; avoid debug words over fine art.
    };
    mark(actor, actionSkill === 'classSkill' ? '技能' : actionSkill === 'attack' ? '普攻' : '行动', '#ffe6a4'); mark(target, healing ? '治疗' : '受击', healing ? '#b0f5bd' : '#ffbb9e');
  }
  private unitDetail(u: BattleUnit) {
    const p = this.open(`${u.name} · ${u.side === 'ally' ? '我方' : '敌方'}`); if (!p) return;
    const art = this.make('UnitDetailArt', p, 0, 205, 420, 440);
    const artName = this.fighterArt(u.role, u.heroId).name;
    resources.load(`art/${artName}/spriteFrame`, SpriteFrame, (err, sf) => {
      if (!err && isValid(art, true)) {
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
    mask.addComponent(BlockInputEvents);
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
      if (!err && isValid(portrait, true)) {
        const sp = portrait.getComponent(Sprite) || portrait.addComponent(Sprite); sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.spriteFrame = sf;
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
    if (this.unitNodes.size) this.awaitBattleAssets(result.initialUnits, token, () => this.replayBattle(result, token));
    else this.replayBattle(result, token);
  }
  private awaitBattleAssets(units: BattleUnit[], token: number, ready: () => void) {
    const required = ['battle-bamboo-stage', 'commander', 'ui-skill-banner', this.save.commanderSkill === 'swordRain' ? 'fx-sword' : 'fx-fireball'];
    let elapsed = 0, completed = false;
    const check = () => {
      if (completed || token !== this.generation || !isValid(this, true) || !isValid(this.root, true)) return;
      const artReady = units.every(unit => this.unitArtReady.has(unit.uid) && isValid(this.spellFrames.get(this.fighterArt(unit.role, unit.heroId).name)));
      const presentationReady = required.every(name => { const frame = this.spellFrames.get(name); return !!frame && isValid(frame); });
      if (artReady && presentationReady) { completed = true; ready(); return; }
      const failed = units.some(unit => this.unitArtFailed.has(unit.uid)) || required.some(name => this.presentationFailures.has(name));
      if (failed || elapsed >= 10) {
        completed = true; this.running = false;
        const panel = this.open('战斗素材加载未完成'); if (!panel) return;
        this.label(panel, '本场尚未开始，没有结算或扣除资源。请检查连接后重试。', 0, 90, 26, PAPER, 600);
        this.button(panel, '重试加载并开始', 0, -70, 520, () => {
          this.presentationFailures.clear(); this.preloadSpells(); this.game(); this.fight();
        });
        this.button(panel, '返回战前准备', 0, -180, 520, () => this.game());
        return;
      }
      this.status.string = '正在准备战斗素材… 尚未开始演出';
      elapsed += .1; this.scheduleOnce(() => check(), .1);
    };
    check();
  }
  private replayBattle(result: BattleResult, token: number) {
    if (token !== this.generation || !isValid(this, true)) return;
    if (this.unitNodes.size) this.enterBattleStage(result.initialUnits);
    let index = 0;
    let commanderFocused = false;
    let pendingAction: { actor: string; energyAfter: number; actionSkill?: string } | null = null;
    const finishAction = () => {
      if (pendingAction) this.updateEnergy(pendingAction.actor, pendingAction.energyAfter);
      pendingAction = null;
    };
    // Block navigation while replay is running: results must only be settled once.
    const blocker = this.make('BattleInputGuard', this.root, 0, -475, 720, 300);
    blocker.on(Node.EventType.TOUCH_END, (e: any) => e.propagationStopped = true);
    const impactFor = (e: BattleEvent, grouped = false) => {
      let displayed = false;
      const displayImpact = () => {
        if (displayed || !this.isValid || token !== this.generation || !isValid(this.root, true)) return;
        const target = e.target ? this.unitNodes.get(e.target) : undefined;
        if (target && !isValid(target, true)) return;
        displayed = true;
        this.status.string = e.text;
        this.eventFeedback(e.actor || pendingAction?.actor, e.target, e.type === 'heal', pendingAction?.actionSkill, grouped);
        if (e.target) {
          const target = this.unitNodes.get(e.target);
          if (typeof e.hp === 'number') this.updateHealth(e.target, e.hp, e.type === 'death');
          else if (e.type === 'death') this.updateHealth(e.target, 0, true);
          const feedbackTarget = this.stageMode && !this.stagePlacements.has(e.target) ? this.miniPortraits.get(e.target) : target;
          if (feedbackTarget && e.amount) {
            // Event feedback only: this is not a character's authored body animation.
            const v = this.label(feedbackTarget, `${e.type === 'heal' ? '+' : '-'}${e.amount}`, 0, 58, 26, e.type === 'heal' ? '#a8f0ad' : '#ffe2a2', 110);
            tween(v.node).by((grouped ? .2 : .3) / this.speed, { position: new Vec3(0, 24, 0) }).call(() => v.node.destroy()).start();
          }
        }
      };
      return displayImpact;
    };
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
        const targets = result.events.slice(index, result.events.findIndex((next, i) => i >= index && (next.type === 'action' || next.type === 'end'))).flatMap(effect => effect.target ? [effect.target] : []);
        this.focusBattle(e.actor, targets);
        if (e.actor && typeof e.energyAfter === 'number') pendingAction = { actor: e.actor, energyAfter: e.energyAfter, actionSkill: e.actionSkill };
        if (e.actor && this.unitActors.get(e.actor)?.heroId === 'sword' && this.swordFrames.length === 4) {
          let last = index;
          while (last < result.events.length && ['attack', 'heal', 'death'].includes(result.events[last].type)) last++;
          const effects = result.events.slice(index, last), impacts = effects.map(effect => impactFor(effect, true));
          if (effects.length && this.playSwordAction(e.actor, () => { for (const impact of impacts) impact(); })) {
            index = last;
            this.status.string = `${this.unitHealth.get(e.actor)?.side === 'ally' ? '凌霄' : '敌方凌霄'} · 起剑`;
            this.eventFeedback(e.actor);
            // The pose sequence fits INSIDE the existing effect budget, never adds an action delay.
            this.scheduleOnce(() => advance(), effects.length * .38 / this.speed);
            return;
          }
        }
        advance(); return;
      }
      if (e.type === 'commander' && !commanderFocused) {
        commanderFocused = true; this.focusBattle(undefined, result.events.filter(event => event.type === 'commander').flatMap(event => event.target ? [event.target] : []), true);
      }
      if (e.type === 'end') finishAction();
      this.status.string = e.type === 'commander' ? `${e.skill || '指挥官神通'} · 施法` : e.text;
      const displayImpact = impactFor(e);
      if (e.type === 'commander' && e.target) {
        this.eventFeedback(); // Clear previous feedback while the new projectile is travelling.
        this.spellEffect(e.target, this.save.commanderSkill, displayImpact);
      } else displayImpact();
      // A fresh callback avoids re-scheduling the currently executing one-shot timer.
      this.scheduleOnce(() => advance(), (e.type === 'commander' ? .65 : .38) / this.speed);
    }; advance();
  }
  private spellImpactPoint(uid: string) {
    const placement = this.stagePlacements.get(uid);
    const miniature = this.stageMode && !placement;
    const node = miniature ? this.miniPortraits.get(uid) : this.unitNodes.get(uid);
    if (!node || !isValid(node, true)) return null;
    const point = this.root.getComponent(UITransform)!.convertToNodeSpaceAR(node.worldPosition);
    point.y += miniature ? 0 : placement ? placement.bodyHeight * .55 - 40 : 22;
    return point;
  }
  private spellEffect(uid: string, skill: string, onImpact: () => void = () => {}) {
    const target = this.unitNodes.get(uid), token = this.generation;
    let impacted = false;
    const hit = () => {
      if (impacted || token !== this.generation || !isValid(this.root, true) || (target && !isValid(target, true))) return;
      impacted = true; onImpact();
    };
    if (!target || !isValid(target, true)) { hit(); return; }
    const sword = skill === 'swordRain';
    const frame = this.spellFrames.get(sword ? 'fx-sword' : 'fx-fireball');
    if (!frame || !isValid(frame)) {
      // Explicit loading fallback, not a geometric substitute represented as final art.
      const note = this.shadowText(target, '法术图未就绪', 0, 76, 20, PAPER, 160).node;
      this.scheduleOnce(() => { if (isValid(note, true)) note.destroy(); }, .36 / this.speed);
      hit(); return;
    }
    // Authored static source sprites with travel/fade only, NOT skeletal or frame animation.
    // Local origin is the sword tip / fireball core, so every trajectory ends on this event's target.
    const offsets = sword ? [-22, 0, 22] : [0];
    for (const offset of offsets) {
      const impact = this.spellImpactPoint(uid); if (!impact) { hit(); return; }
      const impactX = impact.x + offset, impactY = impact.y;
      const dx = sword ? 115 : 240, dy = sword ? -150 : 0;
      const fx = this.make('CommanderSpell', this.root, impactX - dx, impactY - dy, 1, 1);
      const miniature = this.stageMode && !this.stagePlacements.has(uid);
      const width = miniature ? (sword ? 70 : 100) : (sword ? 145 : 220), height = width * frame.originalSize.height / frame.originalSize.width;
      const anchorX = sword ? .89 : .84, anchorY = sword ? .89 : .53;
      const art = this.make('SpellSource', fx, (.5 - anchorX) * width, (anchorY - .5) * height, width, height);
      const sprite = art.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      art.getComponent(UITransform)!.setContentSize(width, height);
      const opacity = fx.addComponent(UIOpacity); opacity.opacity = 235;
      tween(fx).to(.24 / this.speed, { position: new Vec3(impactX, impactY, 0) }).call(hit)
        .to(.12 / this.speed, { scale: new Vec3(1.12, 1.12, 1) })
        .call(() => { if (isValid(fx, true)) fx.destroy(); }).start();
      tween(opacity).delay(.24 / this.speed).to(.12 / this.speed, { opacity: 0 }).start();
    }
  }
  private toast(message: string) {
    const n = this.box(this.root, 0, -530, 656, 80, '#5b3430', '#dba990');
    this.label(n, message.replace(/^Error:\s*/, ''), 0, 0, 22, PAPER, 620); this.scheduleOnce(() => { if (n.isValid) n.destroy(); }, 3);
  }
}
