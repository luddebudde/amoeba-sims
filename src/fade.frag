#version 300 es

precision mediump float;

in vec2 vUv;
in vec2 vPosition;
in vec2 vCoord;
in vec2 vTextureCoord;
out vec4 fragColor;

uniform float time;
uniform vec2 mousePosition;
uniform vec2 mouseVelocity;
uniform sampler2D emField;  // Texture containing the electric field

// TODO uniform
const vec2 resolution = vec2(512.0, 512.0);
const float pi = 3.14159265359;

// struct Particle {
//     vec2 pos;
//     vec3 color;
// };

uniform float[204 * 5] particles;
uniform int particlesCount;

const float variance = 1.0;
const float colorStrength = 0.1;

void main() {

    vec3 totalWeight = vec3(0.0, 0.0, 0.0);
    for(int i = 0; i < particlesCount; i++) {
        float x = particles[i * 5];
        float y = particles[i * 5 + 1];

        float r = particles[i * 5 + 2];
        float g = particles[i * 5 + 3];
        float b = particles[i * 5 + 4];
        vec3 color = vec3(r, g, b);

        vec2 p = vec2(x, y);
        float d = length(vPosition - p);
        float weight = exp(-d * d / (2.0 * variance));
        totalWeight += weight * color;
    }
    // float color = totalWeight * colorStrength / (pi * 2.0 * variance);

    fragColor = vec4(totalWeight * colorStrength / (pi * 2.0 * variance), 1.0);
}
