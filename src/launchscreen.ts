import Phaser from "phaser";
import * as game from "./game/scene";

export default class LaunchScreen extends Phaser.Scene {
    text: Phaser.GameObjects.Text;

    constructor() {
        super("launch");
    }
    create(): void {
        const camera = this.cameras.main;
        this.text = this.add.text(camera.width/2, camera.height/2, "Launch screen.")
            .setOrigin(0.5, 0.5)
            .setFontSize(40);

        this.input.on("pointerdown", () => {
            this.scene.transition({
                target: "game",
                data: game.DEFAULT_SETTINGS,
                duration: 0,
            });
        }, this);
    }
}
