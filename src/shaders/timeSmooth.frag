varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform sampler2D uCurrentRenderTexture;

const float alpha = 1.0;
uniform float dt;

uniform float tailFade;
const float radius = 1.0;

void main(void) {
    vec3 previousFrame = texture2D(uCurrentRenderTexture, vTextureCoord).rgb;
    vec3 currentColor = texture2D(uSampler, vTextureCoord).rgb;

    float a = tailFade * exp(-0.01 * dt);
    vec3 color = a * previousFrame + 20.0 * (1.0 - a) * currentColor  * radius;
    gl_FragColor = vec4(color, 1.0);
}

float round(float x ) {
    return floor(x * 256.0) / 256.0;
}