import Phaser from "phaser";
import * as player from "./player";
import * as economy from "./economy";
import * as objects from "./objects";
import * as unitai from "./unitai";


// UI Utilities

class Slider extends Phaser.GameObjects.Container {
    slider: Phaser.GameObjects.Sprite;
    dragging: boolean;
    trackLength: number;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
        super(scene, x, y);
        this.trackLength = height;

        // Keep this around for positioning
        // this.add(new Phaser.GameObjects.Rectangle(scene, 0, 0, 0.20 * width, height)
        //     .setStrokeStyle(3, 0x222222)
        //     .setOrigin(0.5, 0));
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
        this.emit("valuechange", Phaser.Math.Clamp(1 - this.slider.y / this.trackLength, 0, 1));
    }
    setValue(value: number) {
        // This must not emitValue() as it could be caused by emitValue()
        this.slider.y = Phaser.Math.Clamp(1 - value, 0, 1) * this.trackLength;
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

class Toggle extends Phaser.GameObjects.Rectangle {
    enabled: boolean;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
        super(scene, x, y, width, height);
        this.enabled = false;
        this.setFillStyle(ToggleOffColor).setStrokeStyle(3, 0x000000);
        this.setInteractive().on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    }
    setEnabledState(state: boolean): void {
        this.enabled = state;
        this.fillColor = this.enabled ? ToggleOnColor : ToggleOffColor;
    }
    onPointerUp() {
        this.setEnabledState(!this.enabled);
        this.emit("statechange", this.enabled);
    }
}

// Game logic

const ProductionBalanceFillColor = 0xff0000;
const IncomeFillColor = 0x00ff00;

function getSliderColor(v: number): integer {
    return (
        (Math.round(255 * v) << 16) +
        (Math.round(255 * (1-v)) << 8)
    );
}

class Hud extends Phaser.GameObjects.Container {
    time: Phaser.GameObjects.BitmapText;
    slider: Slider;
    sliderText: Phaser.GameObjects.BitmapText;
    holdToggle: Toggle;
    income: ProgressColumn;
    incomeText: Phaser.GameObjects.BitmapText;
    productionBalance: ProgressColumn;
    productionBalanceText: Phaser.GameObjects.BitmapText;
    rewardFlash: number | undefined;
    builtShips: Phaser.GameObjects.Sprite[];
    player: player.ActivePlayer;

    constructor(scene: Phaser.Scene, player: player.ActivePlayer) {
        super(scene);
        this.player = player;
        this.rewardFlash = undefined;

        // Background
        const bg = new Phaser.GameObjects.Sprite(scene, 0, 0, "hud").setOrigin(0, 0);
        this.width = bg.width;
        this.height = bg.height;
        this.add(bg);

        // Game time
        this.time = new Phaser.GameObjects.BitmapText(
            scene, this.width - 10, 5, "dimbo", "TT:TT", 22).setOrigin(1, 1).setTint(0xffffff);
        this.add(this.time);

        // Sliders
        const textPadTop = 24;
        const padTop = 48;
        const padBottom = 5;
        const colHeight = this.height - padTop - padBottom;
        this.slider = new Slider(
            scene, 67, padTop + 5, 50, colHeight - 10);
        this.sliderText = new Phaser.GameObjects.BitmapText(
            scene, 67, textPadTop, "dimbo", "-- %", 20).setOrigin(0.5, 0).setTint(0x000000);
        this.income = new ProgressColumn(
            scene, 115, padTop, 25, colHeight, IncomeFillColor);
        this.incomeText = new Phaser.GameObjects.BitmapText(
            scene, 115, textPadTop, "dimbo", "-.-", 20).setOrigin(0.5, 0).setTint(0x000000);
        this.productionBalance = new ProgressColumn(
            scene, 155, padTop, 15, colHeight, ProductionBalanceFillColor);
        this.productionBalanceText = new Phaser.GameObjects.BitmapText(
            scene, 155, textPadTop, "dimbo", "- s", 20).setOrigin(0.5, 0).setTint(0x000000);
        this.add([
            this.slider, this.sliderText,
            this.income, this.incomeText,
            this.productionBalance, this.productionBalanceText]);

        // Hold
        this.holdToggle = new Toggle(
            scene, 190, this.height - padBottom, 50, 30).setOrigin(0, 1);
        this.add(this.holdToggle);
        this.add(new Phaser.GameObjects.BitmapText(
            scene, 190+50/2, this.height - padBottom - 15, "dimbo", "HOLD", 22
        ).setTint(0x000000).setOrigin(0.5, 0.5));
        const pipSpacing = 9.2;
        const pipOffset = this.height - padBottom - 52;
        this.builtShips = [];
        for (let j = 0; j < 4; ++j) {
            for (let i = 0; i < 6; ++i) {
                this.builtShips.push(
                    new Phaser.GameObjects.Sprite(
                        scene, 191 + pipSpacing*i, pipOffset - pipSpacing*j, "ship",
                    ).setScale(0.3)
                );
            }
        }
        // We want `this.ships` in the order defined above, but added to scene in reverse
        // order so that the overlaps are correct (earlier ships on top)
        this.add([...this.builtShips].reverse());

        // Set initial state
        this.tick(0);
    }
    updatePosition(camera: Phaser.Cameras.Scene2D.Camera) {
        this.setPosition(camera.width - this.width, camera.height - this.height);
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
        const income = economy.capitalToIncome(account.capital, account.bonus);
        const shipRate = economy.ShipCost / (income * account.spending);

        this.productionBalance.update(ships - completeShips);
        for (let i = 0; i < this.builtShips.length; ++i) {
            this.builtShips[i].setVisible(i < completeShips);
        }
        this.income.update(income / economy.MaxIncome);

        this.slider.setValue(account.spending);
        this.slider.slider.setTint(getSliderColor(account.spending));
        this.sliderText.setText((100 * account.spending).toFixed(0) + " %");
        this.incomeText.setText(income.toFixed(1) + " /s");
        this.productionBalanceText.setText(
            shipRate >= 100 ? "? s" : shipRate.toFixed(0) + " s");

        this.holdToggle.setEnabledState(account.hold);
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
    debugText?: Phaser.GameObjects.Text;

    constructor() {
        super("hud");
    }
    preload(): void {
        this.load.image("hud", "/assets/hud0.png");
        this.load.image("slider", "/assets/slider0.png");
        this.load.spritesheet("ship", "/assets/ship0.png", {frameWidth: 64});
        this.load.bitmapFont("dimbo", "/assets/dimbo_0.png", "/assets/dimbo.xml");
    }
    create(data: {player: player.ActivePlayer}): void {
        this.input.manager.globalTopOnly = false;

        this.hud = new Hud(this, data.player);
        this.add.existing(this.hud);
        this.hud.updatePosition(this.cameras.main);
        this.scale.on("resize", () => {
            this.hud.updatePosition(this.cameras.main);
        }, this);

        const game = this.scene.manager.getScene("game");

        // Listen to hud
        this.hud.slider.on("valuechange", value => {
            game.events.emit("setplayerspending", value);
        }, this);
        this.hud.holdToggle.on("statechange", () => {
            game.events.emit("toggleplayerholdproduction");
        }, this);

        // Listen to game
        game.events.on("playerspendingchanged", this.hud.updateSliders, this.hud);
        game.events.on("playerholdproductionchanged", this.hud.updateSliders, this.hud);
        game.events.on("tickeconomy", this.hud.tick, this.hud);
        game.events.on("shipdestroyed", (killer: objects.Ship, victim: objects.Ship) => {
            if (killer.unit.player === unitai.PlayerId.Player &&
                victim.unit.player === unitai.PlayerId.Neutral) {
                this.hud.neutralKill();
            }
        }, this);
        game.events.on("aidebugtext", (text: string[]) => {
            // Lazy creation - the text object doesn't exist unless this event is fired
            if (this.debugText === undefined) {
                this.debugText = this.add.text(this.cameras.main.width - 10, 10, "<debug>", {
                    fontSize: 13,
                }).setOrigin(1, 0);
            }
            this.debugText.setText(text);
        }, this);
    }
    update(_time: number, delta: number): void {
        const dt = delta/1000;
        this.hud.update(dt);
    }
}
