import Phaser from "phaser";

class LinkText extends Phaser.GameObjects.Text {
    constructor(scene: Phaser.Scene, y: number, text: string) {
        super(scene, scene.cameras.main.centerX, y, text, {});
        this.setOrigin(0.5, 0);
        this.setFontSize(20);
        scene.scale.on("resize", () => this.x = scene.cameras.main.centerX, this);
        this.setInteractive()
            .on("pointerover", () => this.setFontStyle("bold").setColor("#ffff00"), this)
            .on("pointerout", () => this.setFontStyle("normal").setColor("#ffffff"), this)
            .on("pointerdown", this.onPointerDown, this);
    }
    onPointerDown(): void {
        this.emit("click");
    }
}

interface ToggleTextOption {
    value: any;  // eslint-disable-line @typescript-eslint/no-explicit-any
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
    onPointerDown(): void {
        this.current = (this.current + 1) % this.alternatives.length;
        const selected = this.alternatives[this.current];
        this.setText(selected.description);
        this.emit("valuechange", selected.value);
    }
}

export default class InGameOptionsScene extends Phaser.Scene {
    background: Phaser.GameObjects.Rectangle;
    text: Phaser.GameObjects.Text;

    constructor() {
        super("ingameoptions");
    }
    create(): void {
        this.background = this.add.rectangle(0, 0, 1, 1, 0x000000, 0.75).setOrigin(0, 0);
        this.text = this.add.text(0, 0, "Options").setOrigin(0.5, 0).setFontSize(40);
        this.scale.on("resize", this.onResize, this);
        this.onResize();

        this.add.existing(new LinkText(this, 150, "Resume")
            .on("click", this.clickResumeGame, this));
        this.add.existing(new LinkText(this, 190, "New game")
            .on("click", this.clickNewGame, this));
        this.add.existing(new LinkText(this, 230, "Help [\u2197]")
            .on("click", this.clickHelp, this));
        this.add.existing(new ToggleText(this, 300, [
            {value: true, description: "Music: On"},
            {value: false, description: "Music: Off"},
        ]).on("valuechange", this.toggleMusic, this));
        this.add.existing(new ToggleText(this, 340, [
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
    clickHelp(): void {
        window.open("/help.html", "_blank");
    }
    toggleMusic(value: boolean): void {
        this.scene.manager.getScene("game").events.emit("togglemusic", value);
    }
    toggleSounds(value: boolean): void {
        this.scene.manager.getScene("game").events.emit("togglesounds", value);
    }
}
