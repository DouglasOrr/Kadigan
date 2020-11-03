import Phaser from 'phaser'
import TitleScreen from './scenes/title'
import GameScene from './scenes/game'

const config = {
    width: 800,
    height: 600,
    type: Phaser.AUTO
};

const game = new Phaser.Game(config);
game.scene.add("title", TitleScreen);
game.scene.add("game", GameScene);

const params = new URLSearchParams(window.location.search);
game.scene.start(params.get("scene") || "title");
