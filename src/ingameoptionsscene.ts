import Phaser from "phaser";
import * as keys from "./game/keys";

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

        keys.addKeys(this.input.keyboard, k => k.command === "toggleOptions")
            .toggleOptions.on("down", this.resumeGame, this);
    }
    onResize(): void {
        const camera = this.cameras.main;
        this.background.setSize(camera.width, camera.height);
        this.text.setPosition(camera.width/2, 50);
    }
    resumeGame(): void {
        // This should be the opposite of `Game.startOptions()`
        this.scene.resume("game");
        this.scene.resume("hud");
        this.scene.sleep();
    }
}
