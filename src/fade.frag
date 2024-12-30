#version 300 es

precision mediump float;

in vec2 vCoord;
in vec2 vTextureCoord;
out vec4 fragColor;

uniform float time;
uniform vec2 mousePosition;
uniform vec2 mouseVelocity;
uniform sampler2D emField;  // Texture containing the electric field

// TODO uniform
const vec2 resolution = vec2(512.0, 512.0);
const vec2 worldDim = vec2(10.0, 10.0);
const float pi = 3.14159265359;

void main() {
//     ivec2 textureCoord = ivec2(floor(gl_FragCoord.xy));
//     vec2 uv = gl_FragCoord.xy / resolution; // Normalize fragment coordinates

//     vec4 emFieldValue = texture(emField, uv);

//     vec2 mouseUv = mousePosition / worldDim;
//     float distance = length(uv - mouseUv);
//     float charge = 1.0;
//     float weight = exp(-distance * distance * 10000.0); // Adjustable scale factor
//     float normalizedWeight = weight / (3.14159 * 2.0 * charge); // Approximation for total sum
// //    return;

//     //    vec3 E = vec3(emFieldValue.xy, 0.0);
// //    vec3 Bz = vec3(0.0, 0.0, emFieldValue.z);

//     vec2 rMouse = mousePosition - vCoord;

//     ivec2 mouseTextureCoord = ivec2(floor(mousePosition / worldDim * resolution));

// //    if(textureCoord.x == mouseTextureCoord.x) {
// //        fragColor = vec4(1.0, 0.0, 0.0, 1.0);
// //        return;
// //    }

//     float rMouseAbs = length(rMouse);

//     float q = 1.0;
//     float epsilon0 = 1e1;
//     float EAbs = q / (4.0 * pi * epsilon0 * rMouseAbs * rMouseAbs);

//     float mu = 6e-1;
//     vec3 mouseVel = vec3(mouseVelocity, 0.0);
//     vec3 rMouse3 = vec3(rMouse, 0.0);
//     vec3 B = cross(mouseVel, rMouse3) * q * mu / (4.0 * pi * rMouseAbs * rMouseAbs * rMouseAbs);


//     vec4 magneticInstantColor = vec4(B.z, EAbs, -B.z, 1.0);
//     vec4 distributedChargeColor = vec4(normalizedWeight * charge, 0.0, 0.0, 1.0);
//     fragColor = emFieldValue * 0.9 + distributedChargeColor; // Visualize the charge distribution

    fragColor = vec4(0.0, 1.0, 0.0, 1.0)
}
