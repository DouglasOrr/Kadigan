import Phaser from "phaser";
import * as game from "./game/scene";
import * as playerai from "./game/playerai";
import * as maps from "./game/maps";

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

class NewGameLinkText extends LinkText {
    constructor(scene: Phaser.Scene, y: number) {
        super(scene, y, "New game");
        this.on("click", () => {
            // Using Scene APIs is quite tricky - there are a few "tendrils" between scenes
            // that are hard to fix.
            // So we just refresh the page, skipping the title sequence.
            const params = new URLSearchParams(window.location.search);
            params.set("skiptitle", "true");
            window.location.href = `${window.location.protocol}//${window.location.host}${window.location.pathname}?${params}`;
        });
    }
}

class TranslucentBackground extends Phaser.GameObjects.Rectangle {
    constructor(scene: Phaser.Scene, alpha: number) {
        const camera = scene.cameras.main;
        super(scene, 0, 0, camera.width, camera.height, 0x000000, alpha);
        this.setOrigin(0, 0);
        scene.scale.on("resize", () => {
            const camera = this.scene.cameras.main;
            this.setSize(camera.width, camera.height);
        });
    }
}

class CenterText extends Phaser.GameObjects.Text {
    constructor(scene: Phaser.Scene, y: number, text: string) {
        super(scene, scene.cameras.main.width/2, y, text, FONT_SETTINGS);
        this.setOrigin(0.5, 0);
        this.setFontSize(40);
        scene.scale.on("resize", () => {
            this.x = this.scene.cameras.main.width/2;
        });
    }
}

class FootnoteText extends Phaser.GameObjects.Text {
    constructor(scene: Phaser.Scene, text: string) {
        const camera = scene.cameras.main;
        super(scene, camera.width / 2, camera.height - 30, text, FONT_SETTINGS);
        this.setOrigin(0.5, 1);
        this.setFontSize(16);
        scene.scale.on("resize", () => {
            const camera = scene.cameras.main;
            this.setPosition(camera.width / 2, camera.height - 30);
        });
    }
}

// Scenes & screens

export class LaunchScreen extends Phaser.Scene {
    settings: game.Settings;

    constructor() {
        super("launch");
    }
    create(): void {
        this.settings = {...game.DEFAULT_SETTINGS}; // defensive copy
        game.parseSettings(this.settings, new URLSearchParams(window.location.search));

        this.scene.manager.start("starfield", this).sendToBack("starfield");
        this.add.existing(new CenterText(this, 50, "[Kadigan]"))

        this.add.existing(new LinkText(this, 150, "Start Game")
            .on("click", this.clickStartGame, this));
        this.add.existing(new OpenInNewTabLinkText(this, 190, "Help", "/help.html"));
        this.add.existing(new OpenInNewTabLinkText(this, 230, "Credits", "/credits.html"));

        this.add.existing(new ToggleText(this, 310, [
            {value: playerai.Difficulty.Medium, description: "Enemy AI: Medium"},
            {value: playerai.Difficulty.Hard, description: "Enemy AI: Hard"},
            {value: playerai.Difficulty.Easy, description: "Enemy AI: Easy"},
        ]).setValue(this.settings.aidifficulty).on("valuechange", this.toggleDifficulty, this));

        const bonusAlternatives = [100, 125, 150, 175, 200, 50, 75].map(percent => {
            return {value: percent/100, description: `Enemy income: ${percent}%`};
        });
        this.add.existing(new ToggleText(this, 350, bonusAlternatives)
            .setValue(this.settings.aibonus).on("valuechange", this.toggleBonus, this));

        const mapAlternatives = maps.MapList.map(item => {
            return {value: item.name, description: `Map: ${item.name}`};
        });
        this.add.existing(new ToggleText(this, 390, mapAlternatives)
            .setValue(this.settings.map).on("valuechange", this.toggleMap, this));

        this.add.existing(new FootnoteText(this,
            "Hint: Press ESC in-game to access the menu"));
    }
    // Handlers
    clickStartGame(): void {
        // Don't stop() - or we might cause a crash in onResize()
        this.scene.sleep();
        this.scene.run("game", this.settings);
    }
    toggleDifficulty(value: playerai.Difficulty): void {
        this.settings.aidifficulty = value;
    }
    toggleBonus(value: number): void {
        this.settings.aibonus = value;
    }
    toggleMap(value: string): void {
        this.settings.map = value;
    }
}

export class InGameOptionsScene extends Phaser.Scene {
    constructor() {
        super("ingameoptions");
    }
    create(): void {
        this.add.existing(new TranslucentBackground(this, 0.75));
        this.add.existing(new CenterText(this, 50, "Options"));

        this.add.existing(new LinkText(this, 150, "Resume")
            .on("click", this.clickResumeGame, this));
        this.add.existing(new NewGameLinkText(this, 190));
        this.add.existing(new OpenInNewTabLinkText(this, 230, "Help", "/help.html"));
        this.add.existing(new ToggleText(this, 310, [
            {value: true, description: "Music: On"},
            {value: false, description: "Music: Off"},
        ]).on("valuechange", this.toggleMusic, this));
        this.add.existing(new ToggleText(this, 350, [
            {value: true, description: "Sounds: On"},
            {value: false, description: "Sounds: Off"},
        ]).on("valuechange", this.toggleSounds, this));
        this.add.existing(new ToggleText(this, 390, [
            {value: false, description: "Pan camera at edge of screen: No"},
            {value: true, description: "Pan camera at edge of screen: Yes"},
        ]).on("valuechange", this.togglePointerPan, this));
    }
    // Handlers
    clickResumeGame(): void {
        // Match main.ts
        this.scene.resume("game");
        this.scene.resume("hud");
        this.scene.sleep();
    }
    toggleMusic(value: boolean): void {
        this.scene.manager.getScene("game").events.emit("togglemusic", value);
    }
    toggleSounds(value: boolean): void {
        this.scene.manager.getScene("game").events.emit("togglesounds", value);
    }
    togglePointerPan(value: boolean): void {
        this.scene.manager.getScene("game").events.emit("togglepointerpan", value);
    }
}

export class EndScene extends Phaser.Scene {
    constructor() {
        super("end");
    }
    create(data: {winner: number}): void {
        let outcome = "Draw.";
        let outcomeFadeDuration = 1000;
        if (data.winner === 1) {
            outcome = "Victory.";
            outcomeFadeDuration = 500;
        }
        if (data.winner === -1) {
            outcome = "Defeat.";
            outcomeFadeDuration = 3000;
        }

        // Create layout
        const background = this.add.existing(new TranslucentBackground(this, 0.5).setAlpha(0));
        const text = this.add.existing(new CenterText(this, 100, outcome).setAlpha(0));
        const newGame = this.add.existing(new NewGameLinkText(this, 250).setAlpha(0));

        // Animate
        this.tweens.timeline()
            .add({
                targets: background,
                alpha: {from: 0, to: 1},
                duration: 2000,
                ease: "Power1",
            })
            .add({
                targets: text,
                alpha: {from: 0, to: 1},
                duration: outcomeFadeDuration,
                ease: "Power2",
            })
            .add({
                targets: newGame,
                delay: 1000,
                alpha: {from: 0, to: 1},
                duration: 500,
                ease: "Power2",
            })
            .play();
    }
}
