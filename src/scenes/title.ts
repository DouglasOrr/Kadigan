import Phaser from "phaser";
import {defaultSettings as gameDefaultSettings} from "./game";

export default class TitleScreen extends Phaser.Scene {
    constructor() {
        super("title");
    }
    preload(): void {
        this.load.image("background", "/assets/background0.png");
    }
    create(): void {
        // [Dev utility] support loading a scene immediately using the
        // query string scene=NAME
        const params = new URLSearchParams(window.location.search);
        if (params.has("scene")) {
            const settings = gameDefaultSettings();
            if (params.has("pointerpan")) {
                settings.pointerPan = {true: true, false: false}[params.get("pointerpan")];
            }
            this.scene.transition({
                "target": params.get("scene"),
                "data": settings,
                "duration": 0
            })
        }

        const sprite = this.add.tileSprite(0, 0, 800, 600, "background");
        sprite.setOrigin(0, 0);

        const text = this.add.text(400, 300, "Unnamed game.");
        text.setOrigin(0.5, 0.5);
        text.setFontSize(40);

        this.input.on("pointerdown", () => {
            this.scene.transition({
                "target": "game",
                "data": gameDefaultSettings(),
                "duration": 0
            });
        });
    }
}
