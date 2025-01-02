#version 300 es

precision mediump float;

in vec2 aPosition;
in vec2 aUv;

out vec2 vUv;
out vec2 vPosition;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform mat3 uTransformMatrix;


void main() {
    vUv = aUv;
    vPosition = aPosition;
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
}