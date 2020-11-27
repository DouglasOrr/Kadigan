precision mediump float;

varying vec2 outTexCoord;
varying vec4 outTint;

const float nBands = 7.;
const vec4 freq = vec4(2., 3., 7., 13.);
const vec4 mag = vec4(0.03, 0.02, 0.02, 0.008);

void main() {
    vec2 z = 2. * outTexCoord - vec2(1.);
    float r = length(z);
    float a = atan(z.y, z.x);

    // Poor man's generative diversity - generate different shapes based on tint
    vec4 phase = 10. * outTint;
    float da = .4 * cos(6.3 * r);
    float d = dot(mag, sin(freq * (a + da) + phase));

    float bounds = float(r + d <= 0.9);
    float intensity = max(1.0 - floor((r + d) * (r + d) * nBands) / nBands, 0.);

    gl_FragColor = vec4(mix(vec3(1.), outTint.rgb, 0.25 + 0.75 * intensity) * intensity, 1.) * bounds;
}
