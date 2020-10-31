import Phaser from 'phaser'
import TitleScreen from './scenes/title'

const config = {
    width: 800,
    height: 500,
    type: Phaser.AUTO
};

const game = new Phaser.Game(config);
game.scene.add('title', TitleScreen);

game.scene.start('title');
