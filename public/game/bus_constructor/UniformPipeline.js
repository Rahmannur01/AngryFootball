class UniformPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {

    constructor(game) {
        super({
            game,
            renderTarget: true,

            fragShader: `
                precision mediump float;

                uniform sampler2D uMainSampler;
                uniform vec3 uTeamColor;

                varying vec2 outTexCoord;

                void main()
                {
                    vec4 pixel = texture2D(uMainSampler, outTexCoord);
                    vec3 color = pixel.rgb;

                    // Насколько цвет близок к серому
                    float maxC = max(color.r, max(color.g, color.b));
                    float minC = min(color.r, min(color.g, color.b));
                    float diff = maxC - minC;

                    // Яркость
                    float brightness = (
                        color.r +
                        color.g +
                        color.b
                    ) / 3.0;

                    // Серый цвет + диапазон нашей формы
                    bool isGray = diff < 0.025;
                    bool isUniform = brightness >= 0.35;

                    if (isGray && isUniform)
                    {
                        // Перекрашиваем, сохраняя свет / тень
                        color = uTeamColor * brightness;
                    }

                    gl_FragColor = vec4(color, pixel.a);
                }
            `
        });

        // Красный по умолчанию
        this.teamColor = {
            r: 1.0,
            g: 0.0,
            b: 0.0
        };
    }

    onPreRender() {
        this.set3f(
            'uTeamColor',
            this.teamColor.r,
            this.teamColor.g,
            this.teamColor.b
        );
    }

    setTeamColor(hex) {
        this.teamColor.r = ((hex >> 16) & 255) / 255;
        this.teamColor.g = ((hex >> 8) & 255) / 255;
        this.teamColor.b = (hex & 255) / 255;

        return this;
    }
}