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
        const switchScene = function(key: string, data: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            this.scene.transition({
                "target": key,
                "data": data,
                "duration": 0
            });
        }.bind(this);

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
                switchScene("game", settings);
            }
            if (scene === "end") {
                const winner = params.has("winner") ? parseInt(params.get("winner")) : 0;
                switchScene("end", {winner: winner});
            }
            if (scene === "starfield") {
                switchScene("starfield", undefined);
            }
        }

        const camera = this.cameras.main;
        this.add.tileSprite(0, 0, camera.width, camera.height, "background").setOrigin(0, 0);
        this.add.text(camera.width/2, camera.height/2, "Unnamed game.").setOrigin(0.5, 0.5).setFontSize(40);

        this.input.on("pointerdown", () => {
            switchScene("game", game.DEFAULT_SETTINGS);
        });
    }
}
