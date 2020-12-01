import Phaser from "phaser";

export default class ShaderTestScreen extends Phaser.Scene {
    constructor() {
        super("shadertest");
    }
    preload(): void {
        this.load.image("ship", "assets/ship0.png");
        this.load.glsl("radial", "assets/radial.frag");
        // this.load.glsl("greenscreen", "assets/greenscreen.frag");
    }
    create(): void {
        this.add.text(10, 10, "Shader test.").setOrigin(0, 0).setFontSize(20);

        // Generative planets
        const shader = <Phaser.Display.BaseShader>this.cache.shader.get("radial");
        const pipeline = new Phaser.Renderer.WebGL.Pipelines.TextureTintPipeline({
            game: this.game,
            renderer: this.game.renderer,
            fragShader: shader.fragmentSrc,
        });
        const renderer = <Phaser.Renderer.WebGL.WebGLRenderer>this.game.renderer;
        renderer.addPipeline("radial", pipeline);

        const sprite = this.add.sprite(256, 256, undefined)
            .setOrigin(0.5, 0.5).setTint(0x008888).setPipeline("radial");
        sprite.setScale(256/sprite.width);
        const sprite1 = this.add.sprite(512, 256, undefined)
            .setOrigin(0.5, 0.5).setTint(0xff8888).setPipeline("radial");
        sprite1.setScale(256/sprite1.width);
        const sprite2 = this.add.sprite(768, 256, undefined)
            .setOrigin(0.5, 0.5).setTint(0xffffff).setPipeline("radial");
        sprite2.setScale(256/sprite2.width);

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
