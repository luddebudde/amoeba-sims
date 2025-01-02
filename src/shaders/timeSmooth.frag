varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform sampler2D uCurrentRenderTexture;

const float alpha = 0.03;


void main(void) {
    vec3 previousFrame = texture2D(uCurrentRenderTexture, vTextureCoord).rgb;
    vec3 currentColor = texture2D(uSampler, vTextureCoord).rgb;

    vec3 color = (1.0 - alpha) * previousFrame + alpha * currentColor;
    gl_FragColor = vec4(color, 1.0);
}