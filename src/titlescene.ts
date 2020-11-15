import Phaser from "phaser";
import * as game from "./game/scene";

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
            const scene = params.get("scene");
            if (scene === "game") {
                const settings = {...game.DEFAULT_SETTINGS};
                if (params.has("pointerpan")) {
                    settings.pointerPan = {true: true, false: false}[params.get("pointerpan")];
                }
                this.scene.transition({
                    "target": params.get("scene"),
                    "data": settings,
                    "duration": 0
                });
            }
            if (scene === "end") {
                const winner = params.has("winner") ? parseInt(params.get("winner")) : 0;
                this.scene.transition({
                    "target": "end",
                    "data": winner,
                    "duration": 0
                });
            }
        }

        const camera = this.cameras.main;
        this.add.tileSprite(0, 0, camera.width, camera.height, "background").setOrigin(0, 0);
        this.add.text(camera.width/2, camera.height/2, "Unnamed game.").setOrigin(0.5, 0.5).setFontSize(40);

        this.input.on("pointerdown", () => {
            this.scene.transition({
                "target": "game",
                "data": game.DEFAULT_SETTINGS,
                "duration": 0
            });
        });
    }
}
