import Phaser from "phaser"
import TitleScreen from "./titlescene"
import GameScene from "./game/scene"
import EndScene from "./endscene";

const config = {
    width: 800,
    height: 600,
    type: Phaser.AUTO,
    scene: [
        TitleScreen,
        GameScene,
        EndScene
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
