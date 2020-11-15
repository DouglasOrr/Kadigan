import Phaser from "phaser"
import TitleScreen from "./titlescene"
import GameScene from "./game/scene"

const config = {
    width: 800,
    height: 600,
    type: Phaser.AUTO,
    scene: [
        TitleScreen,
        GameScene,
    ],
    physics: {
        default: "arcade",
        arcade: {
            gravity: { x: 0, y: 0 }
        }
    },
    disableContextMenu: true
};

new Phaser.Game(config);
