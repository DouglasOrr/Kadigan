import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
    create(): void {
        const text = this.add.text(400, 300, "Main game screen.");
        text.setOrigin(0.5, 0.5);
        text.setFontSize(40);
    }
}
