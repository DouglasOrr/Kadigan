import Phaser from "phaser";
import * as player from "./player";
import * as economy from "./economy";
import * as objects from "./objects";
import * as unitai from "./unitai";


// UI Utilities

type SliderCallback = (value: number) => void;

class Slider extends Phaser.GameObjects.Container {
    slider: Phaser.GameObjects.Sprite;
    dragging: boolean;
    trackLength: number;
    callback: SliderCallback;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number,
            callback: SliderCallback) {
        super(scene, x, y);
        this.trackLength = height;
        this.callback = callback;

        this.add(new Phaser.GameObjects.Rectangle(scene, 0, 0, 0.20 * width, height)
            .setStrokeStyle(3, 0x222222)
            .setOrigin(0.5, 0));
        this.slider = new Phaser.GameObjects.Sprite(scene, 0, height/2, "slider").setOrigin(0.5, 0.5);
        this.slider.setScale(width / this.slider.width);
        this.add(this.slider);

        const vMargin = 35;
        const hMargin = 10;
        this.setInteractive(
            new Phaser.Geom.Rectangle(
                -width/2 - hMargin, -vMargin,
                width + 2 * hMargin, height + 2 * vMargin),
            Phaser.Geom.Rectangle.Contains,
        );
        this.dragging = true;
        this.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
        this.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
        this.on(Phaser.Input.Events.POINTER_OUT, this.onPointerOut, this);
    }
    emitValue() {
        this.callback(Phaser.Math.Clamp(1 - this.slider.y / this.trackLength, 0, 1));
    }
    onPointerDown(pointer: Phaser.Input.Pointer, x: number, y: number) {
        if (pointer.leftButtonDown()) {
            this.dragging = true;
            this.slider.y = Phaser.Math.Clamp(y, 0, this.trackLength);
            this.emitValue();
        }
    }
    onPointerMove(pointer: Phaser.Input.Pointer, x: number, y: number) {
        if (pointer.leftButtonDown() && this.dragging) {
            this.slider.y = Phaser.Math.Clamp(y, 0, this.trackLength);
            this.emitValue();
        }
    }
    onPointerOut() {
        this.dragging = false;
    }
}

class ProgressColumn extends Phaser.GameObjects.Container {
    bar: Phaser.GameObjects.Rectangle;
    barLength: number;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, color: number) {
        super(scene, x, y);
        this.barLength = height;

        this.bar = new Phaser.GameObjects.Rectangle(
            scene, 0, height, width, height, color
        ).setOrigin(0.5, 1);
        this.add(this.bar);
        this.add(new Phaser.GameObjects.Rectangle(
            scene, 0, height, width, height
        ).setOrigin(0.5, 1).setStrokeStyle(3, 0x000000));
    }
    update(value: number) {
        this.bar.height = this.barLength * Phaser.Math.Clamp(value, 0, 1);
        this.bar.setOrigin(0.5, 1);
    }
}

const ToggleOffColor = 0x880000;
const ToggleOnColor = 0xff0000;
type ToggleCallback = (value: boolean) => void;

class Toggle extends Phaser.GameObjects.Rectangle {
    enabled: boolean;
    callback: ToggleCallback;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number,
        callback: ToggleCallback) {
        super(scene, x, y, width, height);
        this.callback = callback;

        this.enabled = false;
        this.setFillStyle(ToggleOffColor).setStrokeStyle(3, 0x000000);

        this.setInteractive().on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    }
    onPointerUp() {
        this.enabled = !this.enabled;
        this.fillColor = this.enabled ? ToggleOnColor : ToggleOffColor;
        this.callback(this.enabled);
    }
}

// Game logic

const HudWidth = 200;  // px
const HudHeight = 100;  // px
const ProductionBalanceFillColor = 0xff0000;
const IncomeFillColor = 0x00ff00;

class Hud extends Phaser.GameObjects.Container {
    time: Phaser.GameObjects.BitmapText;
    slider: Slider;
    sliderText: Phaser.GameObjects.BitmapText;
    income: ProgressColumn;
    incomeText: Phaser.GameObjects.BitmapText;
    productionBalance: ProgressColumn;
    productionBalanceText: Phaser.GameObjects.BitmapText;
    rewardFlash: number | undefined;
    builtShips: Phaser.GameObjects.Arc[];
    player: player.ActivePlayer;

    constructor(scene: Phaser.Scene, player: player.ActivePlayer) {
        super(scene);
        this.player = player;
        this.rewardFlash = undefined;

        // Background
        const strokeW = 6;
        this.add(new Phaser.GameObjects.Rectangle(scene, 0, 0, HudWidth + strokeW, HudHeight + strokeW)
            .setFillStyle(0xaaaaaa)
            .setOrigin(0, 0)
            .setStrokeStyle(strokeW, 0xffffff));

        // Game time
        this.time = new Phaser.GameObjects.BitmapText(
            scene, HudWidth - 6, -6, "upheaval", "TT:TT", 14).setOrigin(1, 1).setTint(0xffffff);
        this.add(this.time);

        // Sliders
        const textPadTop = 6;
        const padTop = 30;
        const padBottom = 10;
        const colHeight = HudHeight - padTop - padBottom;
        this.slider = new Slider(scene, 30, padTop, 50, colHeight, this.onSpendingChange.bind(this));
        this.sliderText = new Phaser.GameObjects.BitmapText(
            scene, 30, textPadTop, "upheaval", "-- %", 14).setOrigin(0.5, 0).setTint(0x000000);
        this.income = new ProgressColumn(scene, 80, padTop, 25, colHeight, IncomeFillColor);
        this.incomeText = new Phaser.GameObjects.BitmapText(
            scene, 80, textPadTop, "upheaval", "-.-", 14).setOrigin(0.5, 0).setTint(0x000000);
        this.productionBalance = new ProgressColumn(scene, 115, padTop, 15, colHeight, ProductionBalanceFillColor);
        this.productionBalanceText = new Phaser.GameObjects.BitmapText(
            scene, 115, textPadTop, "upheaval", "- s", 14).setOrigin(0.5, 0).setTint(0x000000);
        this.add([
            this.slider, this.sliderText,
            this.income, this.incomeText,
            this.productionBalance, this.productionBalanceText]);

        // Hold
        this.add(new Toggle(scene, 140, HudHeight - padBottom, 50, 30,
            this.onHoldTogggle.bind(this)).setOrigin(0, 1));
        this.add(new Phaser.GameObjects.BitmapText(
            scene, 165, HudHeight - padBottom - 15, "upheaval", "HOLD", 14
        ).setTint(0x000000).setOrigin(0.5, 0.5));
        const pipSpacing = 10;
        const pipOffset = HudHeight - padBottom - 40;
        this.builtShips = [];
        for (let j = 0; j < 4; ++j) {
            for (let i = 0; i < 5; ++i) {
                    this.builtShips.push(
                    new Phaser.GameObjects.Arc(
                        scene, 145 + pipSpacing*i, pipOffset - pipSpacing*j,
                        3, 0 ,360, false, 0xff0000
                    ).setStrokeStyle(.5, 0x000000).setVisible(false)
                );
            }
        }
        this.add(this.builtShips);

        // Set initial state
        this.tick(0);
    }
    onSpendingChange(value: number) {
        this.player.account.spending = value;
        this.updateSliders();
    }
    onHoldTogggle(value: boolean) {
        this.player.account.hold = value;
    }
    updatePosition(camera: Phaser.Cameras.Scene2D.Camera) {
        this.setPosition(camera.width - HudWidth, camera.height - HudHeight);
    }
    tick(gameTime: integer) {
        // Time
        const minutes = String(Math.floor(gameTime / 60)).padStart(2, "0");
        const seconds = String(gameTime % 60).padStart(2, "0");
        this.time.setText(minutes + ":" + seconds);

        // Sliders
        this.updateSliders();
    }
    updateSliders() {
        const account = this.player.account;
        const ships = account.production / economy.ShipCost;
        const completeShips = Math.floor(ships);
        const income = economy.capitalToIncome(account.capital);
        const shipRate = economy.ShipCost / (income * account.spending);

        this.productionBalance.update(ships - completeShips);
        for (let i = 0; i < this.builtShips.length; ++i) {
            this.builtShips[i].setVisible(i < completeShips);
        }
        this.income.update(income / economy.MaxIncome);

        this.sliderText.setText((100 * account.spending).toFixed(0) + " %");
        this.incomeText.setText(income.toFixed(1));
        this.productionBalanceText.setText(
            shipRate >= 100 ? "? s" : shipRate.toFixed(0) + " s");
    }
    neutralKill() {
        if (this.rewardFlash === undefined) {
            this.rewardFlash = 3.0;  // s
        }
    }
    update(dt: number) {
        if (this.rewardFlash !== undefined) {
            this.rewardFlash -= dt;
            if (this.rewardFlash < 0) {
                this.rewardFlash = undefined;
                this.productionBalance.bar.fillColor = ProductionBalanceFillColor;
                this.income.bar.fillColor = IncomeFillColor;
            } else {
                const state = this.scene.time.now % 200 < 100;  // ms
                this.productionBalance.bar.fillColor = state ? 0xffffff : ProductionBalanceFillColor;
                this.income.bar.fillColor = state ? 0xffffff : IncomeFillColor;
            }
        }
    }
}

export default class HudScene extends Phaser.Scene {
    hud: Hud;

    constructor() {
        super("hud");
    }
    preload(): void {
        this.load.image("slider", "/assets/slider0.png");
        this.load.bitmapFont("upheaval", "/assets/upheaval_0.png", "/assets/upheaval.xml");
    }
    create(data: {player: player.ActivePlayer}): void {
        this.hud = new Hud(this, data.player);
        this.add.existing(this.hud);
        this.hud.updatePosition(this.cameras.main);
        this.scale.on("resize", () => {
            this.hud.updatePosition(this.cameras.main);
        }, this);

        const game = this.scene.manager.getScene("game");
        game.events.on("tickeconomy", (time: integer) => {
            this.hud.tick(time);
        }, this);
        game.events.on("shipdestroyed", (destroyed: objects.Ship, destroyer: objects.Ship) => {
            if (destroyed.unit.player === unitai.PlayerId.Neutral &&
                destroyer.unit.player === unitai.PlayerId.Player) {
                    this.hud.neutralKill();
            }
        }, this);
    }
    update(_time: number, delta: number): void {
        const dt = delta/1000;
        this.hud.update(dt);
    }
}
