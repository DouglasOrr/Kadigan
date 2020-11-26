import Phaser from "phaser";

export default class ShaderTestScreen extends Phaser.Scene {
    constructor() {
        super("shadertest");
    }
    preload(): void {
        this.load.image("ship", "/assets/ship0.png");
        // this.load.glsl("radial", "/assets/local/radial.frag");
        // this.load.glsl("greenscreen", "/assets/local/greenscreen.frag");
    }
    create(): void {
        const camera = this.cameras.main;
        this.add.text(10, 10, "Shader test.").setOrigin(0, 0).setFontSize(20);
        this.add.sprite(camera.width/2, camera.height/2, "ship");

        // Shader generative
        // this.add.rectangle(50, 50, 100, 100, 0xff0000).setOrigin(0, 0);
        // const shader = this.add.shader("radial", 100, 100, 100, 100).setOrigin(0, 0);
        // console.log(this.cache.shader.get("radial").vertexSrc);

        // Green screen
        // const sprite = this.add.sprite(camera.width/2, camera.height/2, "ship")
        //     .setOrigin(0.5, 0.5)
        //     .setTint(0xff0000);
        // const shader = <Phaser.Display.BaseShader>this.cache.shader.get("greenscreen");
        // const pipeline = new Phaser.Renderer.WebGL.Pipelines.TextureTintPipeline({
        //     game: this.game,
        //     renderer: this.game.renderer,
        //     fragShader: shader.fragmentSrc,
        // });
        // const renderer = <Phaser.Renderer.WebGL.WebGLRenderer>this.game.renderer;
        // renderer.addPipeline("greenscreen", pipeline);
        // sprite.setPipeline("greenscreen");
    }
}
