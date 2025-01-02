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

uniform vec2 particle;
uniform vec2[512] particles;
uniform int particlesCount;

const float dispersion = 0.01;
const float colorStrength = 10.0;

void main() {
    float distance = length(vPosition - particle);

    float totalWeight = 0.0;
    for(int i = 0; i < particlesCount; i++) {
        vec2 p = particles[i];
        float d = length(vPosition - p);
        float weight = exp(-d * d * dispersion);
        totalWeight += weight;
    }
    float color = totalWeight * colorStrength / (pi * 2.0);

    fragColor = vec4(color, color, color, 1.0);
}
