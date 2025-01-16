#version 300 es

precision mediump float;

in vec2 vUv;
in vec2 vPosition;
in vec2 vCoord;
in vec2 vTextureCoord;
out vec4 fragColor;

// TODO uniform
const vec2 resolution = vec2(512.0, 512.0);
const float pi = 3.14159265359;

// struct Particle {
//     vec2 pos;
//     vec3 color;
// };

uniform float dt;

const int particle_rx_offset = 0;
const int particle_ry_offset = 1;
const int particle_vx_offset = 2;
const int particle_vy_offset = 3;
const int particle_color_r_offset = 4;
const int particle_color_g_offset = 5;
const int particle_color_b_offset = 6;
const int particle_size = 7;

uniform float[100 * particle_size] particles;

uniform int particlesCount;
uniform float colorStrength;

vec2 variance = vec2(30.0, 3.0);


mat2 adjugate(mat2 m) {
    return mat2(m[1][1], -m[0][1], -m[1][0], m[0][0]);
}

mat2 sqrtDiagonal(mat2 D) {
    return mat2(
        sqrt(D[0][0]), 0.0,
        0.0, sqrt(D[1][1])
    );
}

void main() {
    float sigmaBase = 1.0;

    // Use if the particle is moving slowly
    mat2 covBase = mat2(
        sigmaBase, 0.0,
        0.0, sigmaBase
    );
    float covDetBase = determinant(covBase);
    mat2 covBaseInv = adjugate(covBase) / covDetBase;

    vec3 totalWeight = vec3(0.0, 0.0, 0.0);
    for(int i = 0; i < particlesCount; i++) {
        int offset = i * particle_size;
        vec2 particlePos = vec2(particles[offset + particle_rx_offset], particles[offset + particle_ry_offset]);
        vec2 vel = vec2(particles[offset + particle_vx_offset], particles[offset + particle_vy_offset]);
        vec3 color = vec3(
            particles[offset + particle_color_r_offset],
            particles[offset + particle_color_g_offset],
            particles[offset + particle_color_b_offset]
        );

        vec2 dr = dt * vel;
        float drAbs = length(dr);
        float velAbs = length(vel);

        mat2 covInv = covBaseInv;
        float covDet = covDetBase;

        if(drAbs > sigmaBase * 0.5) {
            // The eigenvalues represent the strech in 1) the moving direction and 2) the orthogonal direction
            mat2 cov_stretched = mat2(
                // The variance in the moving direction is stretched
                sigmaBase * (1.0 + 2.0 * drAbs), 0.0,
                // The variance orthogonally to the moving direction
                0.0, sigmaBase
            );

            vec2 velNorm = normalize(vel);

            // Rotation matrix to align with the velocity vector
            mat2 R = mat2(
                // cos(angle), -sin(angle),
                velNorm.x , velNorm.y ,
                // sin(angle), cos(angle)
                -velNorm.y, velNorm.x
            );

            // The new covariance matrix is the rotated diagonal matrix
            mat2 cov_rotated = R * cov_stretched * transpose(R);
            float cov_rotated_det = determinant(cov_rotated);
            mat2 cov_rotated_inv = adjugate(cov_rotated) / cov_rotated_det;

            covInv = cov_rotated_inv;
            covDet = cov_rotated_det;
        }

        vec2 r = vPosition - particlePos;
        vec2 rNorm = normalize(r);
        float rAbs = length(r);

        // rT * covInv * r
        // The transformed r squared
        vec2 covInvTimesR = covInv * r;
        float r2Q = dot(r, covInvTimesR);

        float normalDistributionWeight = exp(-0.5 * r2Q) / (2.0 * pi * sqrt(covDet));

        float permittivity = 0.07;
        float E_abs = 1.0 / (r2Q * permittivity * sqrt(covDet));

//        totalWeight += normalDistributionWeight * color;

//        float permeability = 0.0;
        float permeability = 2e2;
        // The transformed r (non-squared)
        // I expected to have to multiply the sqaure root of the covariance, but this seems to work better
        vec2 rQ = covInvTimesR;
        float B_abs = abs(cross(vec3(vel, 0.0), vec3(covInv * rNorm, 0.0)) * permeability / ( 4.0 * pi * dot(rQ, rQ))).z;

        totalWeight += vec3(0.0, 0.0, B_abs) + E_abs * color * 0.01;

    }
    vec3 color = colorStrength * totalWeight;

    fragColor = vec4(color, 1.0);
}
