import Phaser from "phaser";
import * as game from "./game/scene";
import * as playerai from "./game/playerai";

// UI Components

const FONT_SETTINGS = {}; // default fonts

class LinkText extends Phaser.GameObjects.Text {
    constructor(scene: Phaser.Scene, y: number, text: string) {
        super(scene, scene.cameras.main.centerX, y, text, FONT_SETTINGS);
        this.setOrigin(0.5, 0);
        this.setFontSize(20);
        scene.scale.on("resize", () => this.x = scene.cameras.main.centerX, this);
        this.setInteractive()
            .on("pointerover", () => this.setFontStyle("bold").setColor("#ffff00"), this)
            .on("pointerout", () => this.setFontStyle("normal").setColor("#ffffff"), this)
            .on("pointerdown", this.onPointerDown, this);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onPointerDown(pointer: Phaser.Input.Pointer): void {
        this.emit("click");
    }
}

class OpenInNewTabLinkText extends LinkText {
    url: string;

    constructor(scene: Phaser.Scene, y: number, text: string, url: string) {
        super(scene, y, text + " [\u2197]");
        this.url = url;
    }
    onPointerDown(): void {
        window.open(this.url, "_blank");
    }
}

interface ToggleTextOption {
    value;
    description: string;
}

class ToggleText extends LinkText {
    alternatives: ToggleTextOption[];
    current: integer;

    constructor(scene: Phaser.Scene, y: number, alternatives: ToggleTextOption[]) {
        super(scene, y, alternatives[0].description);
        this.alternatives = alternatives;
        this.current = 0;
    }
    onPointerDown(pointer: Phaser.Input.Pointer): void {
        if (pointer.leftButtonDown()) {
            this.current = (this.current + 1) % this.alternatives.length;
        } else if (pointer.rightButtonDown()) {
            // Move backwards through the list
            this.current = (this.current + this.alternatives.length - 1) % this.alternatives.length;
        }
        const selected = this.alternatives[this.current];
        this.setText(selected.description);
        this.emit("valuechange", selected.value);
    }
    setValue(value): ToggleText {
        for (let i = 0; i < this.alternatives.length; ++i) {
            if (this.alternatives[i].value === value) {
                this.current = i;
                this.setText(this.alternatives[i].description);
                break;
            }
        }
        return this;
    }
}

// Scenes & screens

export class InGameOptionsScene extends Phaser.Scene {
    background: Phaser.GameObjects.Rectangle;
    text: Phaser.GameObjects.Text;

    constructor() {
        super("ingameoptions");
    }
    create(): void {
        this.background = this.add.rectangle(0, 0, 1, 1, 0x000000, 0.75).setOrigin(0, 0);
        this.text = this.add.text(0, 0, "Options", FONT_SETTINGS).setOrigin(0.5, 0).setFontSize(40);
        this.scale.on("resize", this.onResize, this);
        this.onResize();

        this.add.existing(new LinkText(this, 150, "Resume")
            .on("click", this.clickResumeGame, this));
        this.add.existing(new LinkText(this, 190, "New game")
            .on("click", this.clickNewGame, this));
        this.add.existing(new OpenInNewTabLinkText(this, 230, "Help", "/help.html"));
        this.add.existing(new ToggleText(this, 310, [
            {value: true, description: "Music: On"},
            {value: false, description: "Music: Off"},
        ]).on("valuechange", this.toggleMusic, this));
        this.add.existing(new ToggleText(this, 350, [
            {value: true, description: "Sounds: On"},
            {value: false, description: "Sounds: Off"},
        ]).on("valuechange", this.toggleSounds, this));
    }
    onResize(): void {
        const camera = this.cameras.main;
        this.background.setSize(camera.width, camera.height);
        this.text.setPosition(camera.width/2, 50);
    }
    // Handlers
    clickResumeGame(): void {
        // Match main.ts
        this.scene.resume("game");
        this.scene.resume("hud");
        this.scene.sleep();
    }
    clickNewGame(): void {
        // Using Scene APIs is quite tricky - there are a few "tendrils" between scenes
        // that are hard to fix.
        // So we just refresh the page, skipping the title sequence.
        const params = new URLSearchParams(window.location.search);
        params.set("skiptitle", "true");
        window.location.href = `${window.location.protocol}//${window.location.host}${window.location.pathname}?${params.toString()}`;
    }
    toggleMusic(value: boolean): void {
        this.scene.manager.getScene("game").events.emit("togglemusic", value);
    }
    toggleSounds(value: boolean): void {
        this.scene.manager.getScene("game").events.emit("togglesounds", value);
    }
}

export class LaunchScreen extends Phaser.Scene {
    settings: game.Settings;
    text: Phaser.GameObjects.Text;

    constructor() {
        super("launch");
    }
    create(): void {
        this.scene.manager.start("starfield", this).sendToBack("starfield");

        this.settings = {...game.DEFAULT_SETTINGS}; // defensive copy
        this.text = this.add.text(0, 0, "Unnamed Game", FONT_SETTINGS)
            .setOrigin(0.5, 0).setFontSize(40);
        this.scale.on("resize", this.onResize, this);
        this.onResize();

        this.add.existing(new LinkText(this, 150, "Start Game")
            .on("click", this.clickStartGame, this));
        this.add.existing(new OpenInNewTabLinkText(this, 190, "Help", "/help.html"));
        this.add.existing(new OpenInNewTabLinkText(this, 230, "Credits", "/credits.html"));

        this.add.existing(new ToggleText(this, 310, [
            {value: playerai.Difficulty.Medium, description: "Enemy AI: Medium"},
            {value: playerai.Difficulty.Hard, description: "Enemy AI: Hard"},
            {value: playerai.Difficulty.Easy, description: "Enemy AI: Easy"},
        ]).setValue(this.settings.aidifficulty).on("valuechange", this.toggleDifficulty, this));

        const alts: ToggleTextOption[] = [100, 125, 150, 175, 200, 50, 75].map(percent => {
            return {value: percent/100, description: `Enemy bonus: ${percent}%`};
        });
        this.add.existing(new ToggleText(this, 350, alts)
            .setValue(this.settings.aibonus).on("valuechange", this.toggleBonus, this));
    }
    onResize(): void {
        const camera = this.cameras.main;
        this.text.setPosition(camera.width/2, 50);
    }
    // Handlers
    clickStartGame(): void {
        this.scene.transition({
            target: "game",
            data: this.settings,
            duration: 0,
        });
    }
    toggleDifficulty(value: playerai.Difficulty): void {
        this.settings.aidifficulty = value;
    }
    toggleBonus(value: number): void {
        this.settings.aibonus = value;
    }
}
