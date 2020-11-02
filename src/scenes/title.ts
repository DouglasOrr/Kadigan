import Phaser from 'phaser';

export default class TitleScreen extends Phaser.Scene {
    preload() {
        this.load.image("background", "/assets/background0.png");
    }
    create() {
        const sprite = this.add.tileSprite(0, 0, 800, 600, "background");
        sprite.setOrigin(0, 0);

        const text = this.add.text(400, 300, "Welcome to the game.");
        text.setOrigin(0.5, 0.5);
        text.setFontSize(40);
    }
    update() {
    }
};
