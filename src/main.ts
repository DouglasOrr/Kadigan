import Phaser from "phaser"
import TitleScreen from "./titlescene"
import GameScene from "./game/scene"
import StarfieldScene from "./starfieldscene"
import EndScene from "./endscene";

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scale: {
        mode: Phaser.Scale.RESIZE,
    },
    scene: [
        TitleScreen,
        GameScene,
        StarfieldScene,
        EndScene
    ],
    physics: {
        default: "arcade",
        arcade: {
            gravity: { x: 0, y: 0 }
        }
    },
    disableContextMenu: true,
};

new Phaser.Game(config);
