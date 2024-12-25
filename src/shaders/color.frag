precision mediump float;

varying vec2 vUvs;

uniform sampler2D uSampler2;
uniform vec2 time;

void main() {
  gl_FragColor = texture2D(uSampler2, vUvs);
//  gl_FragColor = vec4(vUvs.x,0,time.x,1);
}