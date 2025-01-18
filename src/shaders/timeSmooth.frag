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

    float a = exp(-0.01 / tailFade * dt );
    vec3 color = a * previousFrame + (1.0 - 0.0) * currentColor;
    gl_FragColor = vec4(color, 1.0);
}

float round(float x ) {
    return floor(x * 256.0) / 256.0;
}