import Phaser from "phaser";

export default class TitleScreen extends Phaser.Scene {
    preload(): void {
        this.load.image("background", "/assets/background0.png");
    }
    create(): void {
        const sprite = this.add.tileSprite(0, 0, 800, 600, "background");
        sprite.setOrigin(0, 0);

        const text = this.add.text(400, 300, "Unnamed game.");
        text.setOrigin(0.5, 0.5);
        text.setFontSize(40);

        this.input.on("pointerdown", () => {
            this.scene.transition({
                "target": "game",
                "duration": 0
            });
        });
    }
}
