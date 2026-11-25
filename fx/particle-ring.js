// Copied from shiny-js-fx/particle-ring-playground (1).html, exposed as window.createParticleRing.
(() => {

class Noise1D {
    constructor() {
        this.N = 256;
        this.r = Array.from({ length: this.N }, () => Math.random());
    }

    getVal(x) {
        const n = Math.floor(x);
        const f = x - n;
        const s = f * f * (3 - 2 * f);
        const a = this.r[n % this.N];
        const b = this.r[(n + 1) % this.N];
        return a * (1 - s) + b * s;
    }
}

const poissonDisc = (width, height, minDist, tries) => {
    const cell = minDist / Math.SQRT2;
    const gw = Math.ceil(width / cell);
    const gh = Math.ceil(height / cell);
    const grid = new Array(gw * gh).fill(null);
    const points = [];
    const active = [];

    const gridIndex = (x, y) => ((y / cell) | 0) * gw + ((x / cell) | 0);
    const farEnough = (x, y) => {
        const gx = (x / cell) | 0;
        const gy = (y / cell) | 0;
        for (let j = Math.max(0, gy - 2); j <= Math.min(gh - 1, gy + 2); j++) {
            for (let i = Math.max(0, gx - 2); i <= Math.min(gw - 1, gx + 2); i++) {
                const p = grid[j * gw + i];
                if (p) {
                    const dx = p[0] - x;
                    const dy = p[1] - y;
                    if (dx * dx + dy * dy < minDist * minDist) return false;
                }
            }
        }
        return true;
    };

    const first = [Math.random() * width, Math.random() * height];
    points.push(first);
    active.push(first);
    grid[gridIndex(first[0], first[1])] = first;

    while (active.length) {
        const idx = (Math.random() * active.length) | 0;
        const p = active[idx];
        let found = false;
        for (let t = 0; t < tries; t++) {
            const ang = Math.random() * Math.PI * 2;
            const rad = minDist * (1 + Math.random());
            const nx = p[0] + Math.cos(ang) * rad;
            const ny = p[1] + Math.sin(ang) * rad;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            if (farEnough(nx, ny)) {
                const np = [nx, ny];
                points.push(np);
                active.push(np);
                grid[gridIndex(nx, ny)] = np;
                found = true;
                break;
            }
        }
        if (!found) active.splice(idx, 1);
    }
    return points;
};

const SNOISE = `
vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+1.0*C.xxx; vec3 x2=x0-i2+2.0*C.xxx; vec3 x3=x0-1.0+3.0*C.xxx;
  i=mod(i,289.0);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=1.79284291400159-0.85373472095314*vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const SIM_FRAG = `
precision highp float;
uniform sampler2D uPosition, uPosRefs;
uniform vec2 uRingPos;
uniform float uTime, uDeltaTime, uRingRadius, uRingWidth, uRingWidth2, uRingDisplacement;
${SNOISE}
void main(){
  vec2 simTexCoords = gl_FragCoord.xy / vec2(SIZE, SIZE);
  vec4 pFrame = texture2D(uPosition, simTexCoords);
  float scale = pFrame.z, velocity = pFrame.w;
  vec2 refPos = texture2D(uPosRefs, simTexCoords).xy;
  float time = uTime * 0.5;
  vec2 curentPos = refPos;
  vec2 pos = pFrame.xy; pos *= 0.8;

  float dist = distance(curentPos.xy, uRingPos);
  float noise0 = snoise(vec3(curentPos.xy*0.2+vec2(18.4924,72.9744), time*0.5));
  float dist1 = distance(curentPos.xy+(noise0*0.005), uRingPos);

  float t  = smoothstep(uRingRadius-(uRingWidth*2.0), uRingRadius, dist)  - smoothstep(uRingRadius, uRingRadius+uRingWidth, dist1);
  float t2 = smoothstep(uRingRadius-(uRingWidth2*2.0), uRingRadius, dist) - smoothstep(uRingRadius, uRingRadius+uRingWidth2, dist1);
  float t3 = smoothstep(uRingRadius+uRingWidth2, uRingRadius, dist);
  t = pow(t,2.0); t2 = pow(t2,3.0);
  t += t2*3.0; t += t3*0.4;
  t += snoise(vec3(curentPos.xy*30.0+vec2(11.4924,12.9744), time*0.5))*t3*0.5;

  float nS = snoise(vec3(curentPos.xy*2.0+vec2(18.4924,72.9744), time*0.5));
  t += pow((nS+1.5)*0.5,2.0)*0.6;

  float noise1 = snoise(vec3(curentPos.xy*4.0+vec2(88.494,32.4397), time*0.35));
  float noise2 = snoise(vec3(curentPos.xy*4.0+vec2(50.904,120.947), time*0.35));
  float noise3 = snoise(vec3(curentPos.xy*20.0+vec2(18.4924,72.9744), time*0.5));
  float noise4 = snoise(vec3(curentPos.xy*20.0+vec2(50.904,120.947), time*0.5));

  vec2 disp = vec2(noise1,noise2)*0.03;
  disp += vec2(noise3,noise4)*0.005;
  disp.x += sin((refPos.x*20.0)+(time*4.0))*0.02*clamp(dist,0.0,1.0);
  disp.y += cos((refPos.y*20.0)+(time*3.0))*0.02*clamp(dist,0.0,1.0);

  pos -= (uRingPos-(curentPos+disp)) * pow(t2,0.75) * uRingDisplacement;

  float scaleDiff = (t-scale)*0.2; scale += scaleDiff;
  vec2 finalPos = curentPos + disp + (pos*0.25);
  velocity *= 0.5; velocity += scale*0.25;
  gl_FragColor = vec4(finalPos, scale, velocity);
}`;

const RENDER_VERT = `
precision highp float;
attribute vec4 seeds;
uniform sampler2D uPosition;
uniform float uParticleScale, uPixelRatio;
varying vec4 vSeeds; varying float vVelocity, vScale; varying vec2 vLocalPos;
void main(){
  vec4 pos = texture2D(uPosition, uv);
  vSeeds = seeds; vVelocity = pos.w; vScale = pos.z; vLocalPos = pos.xy;
  vec4 viewSpace = modelViewMatrix * vec4(vec3(pos.xy,0.0), 1.0);
  gl_Position = projectionMatrix * viewSpace;
  gl_PointSize = (vScale*7.0) * (uPixelRatio*0.5) * uParticleScale;
}`;

const RENDER_FRAG = `
precision highp float;
varying vec4 vSeeds; varying vec2 vLocalPos; varying float vScale, vVelocity;
uniform vec3 uColor1, uColor2, uColor3; uniform vec2 uRingPos, uRez;
uniform float uAlpha, uTime; uniform int uColorScheme;
${SNOISE}
float sdRoundBox(vec2 p, vec2 b, vec4 r){
  r.xy=(p.x>0.0)?r.xy:r.zw; r.x=(p.y>0.0)?r.x:r.y;
  vec2 q=abs(p)-b+r.x; return min(max(q.x,q.y),0.0)+length(max(q,0.0))-r.x;
}
vec2 rotate(vec2 v, float a){ float s=sin(a), c=cos(a); mat2 m=mat2(c,s,-s,c); return m*v; }
void main(){
  float noiseAngle = snoise(vec3(vLocalPos*10.0+vec2(18.4924,72.9744), uTime*0.85));
  float noiseColor = snoise(vec3(vLocalPos*2.0+vec2(74.664,91.556), uTime*0.5));
  noiseColor = (noiseColor+1.0)*0.5;
  float angle = atan(vLocalPos.y-uRingPos.y, vLocalPos.x-uRingPos.x);
  vec2 uv = gl_PointCoord.xy; uv -= vec2(0.5); uv.y *= -1.0;
  uv = rotate(uv, -angle + (noiseAngle*0.5));
  float h = 0.8;
  float progress = smoothstep(0.0,0.75,pow(noiseColor,2.0));
  vec3 col = mix(mix(uColor1,uColor2,progress/h), mix(uColor2,uColor3,(progress-h)/(1.0-h)), step(h,progress));
  vec3 color = clamp(col,0.0,1.0);
  float rounded = sdRoundBox(uv, vec2(0.5,0.2), vec4(0.25));
  rounded = smoothstep(0.1,0.0,rounded);
  float a = uAlpha * rounded * smoothstep(0.1,0.2,vScale);
  if(a < 0.01) discard;
  color = mix(color, color*clamp(vVelocity,0.0,1.0), float(uColorScheme));
  gl_FragColor = vec4(color, clamp(a,0.0,1.0));
}`;

const lerpRange = (x, t, n, r, i) => ((x - t) * (i - r)) / (n - t) + r;

const createParticleRing = (canvas, options = {}) => {
    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(innerWidth, innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 1000);
    camera.position.z = 3.1;

    const clock = new THREE.Clock();
    const noise1D = new Noise1D();
    const mouse = new THREE.Vector2(0, 0);
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hit = new THREE.Vector3();
    let mouseIsOver = false;

    const onMouseMove = (e) => {
        mouse.x = (e.clientX / innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / innerHeight) * 2 + 1;
        mouseIsOver = true;
    };
    const onMouseLeave = () => { mouseIsOver = false; };
    addEventListener('mousemove', onMouseMove);
    addEventListener('mouseleave', onMouseLeave);

    const SIZE = 256;
    const COUNT = SIZE * SIZE;
    const state = {
        ringWidth: options.ringWidth ?? 0.107,
        ringWidth2: options.ringWidth2 ?? 0.05,
        ringDisplacement: options.ringDisplacement ?? 0.53,
        particlesScale: options.particlesScale ?? 0.59,
        density: options.density ?? 230,
        color1: new THREE.Color(options.color1 ?? '#2c64ed'),
        color2: new THREE.Color(options.color2 ?? '#f84242'),
        color3: new THREE.Color(options.color3 ?? '#ffcf03'),
    };

    const ringPos = new THREE.Vector2();
    const cursorPos = new THREE.Vector2();

    const minD = lerpRange(state.density, 0, 300, 10, 2);
    const maxD = lerpRange(state.density, 0, 300, 11, 3);
    const pts = poissonDisc(500, 500, (minD + maxD) / 2, 20);

    const data = new Float32Array(COUNT * 4);
    for (let i = 0; i < pts.length && i < COUNT; i++) {
        data[i * 4 + 0] = (pts[i][0] - 250) / 250;
        data[i * 4 + 1] = (pts[i][1] - 250) / 250;
    }
    const posTex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType);
    posTex.needsUpdate = true;

    let rt1 = new THREE.WebGLRenderTarget(SIZE, SIZE, {
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        depthBuffer: false,
        stencilBuffer: false,
    });
    let rt2 = rt1.clone();
    let everRendered = false;

    const simScene = new THREE.Scene();
    const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const simMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uPosition: { value: posTex },
            uPosRefs: { value: posTex },
            uRingPos: { value: new THREE.Vector2(0, 0) },
            uRingRadius: { value: 0.2 },
            uDeltaTime: { value: 0 },
            uRingWidth: { value: state.ringWidth },
            uRingWidth2: { value: state.ringWidth2 },
            uRingDisplacement: { value: state.ringDisplacement },
            uTime: { value: 0 },
        },
        vertexShader: 'void main(){ gl_Position = vec4(position,1.0); }',
        fragmentShader: SIM_FRAG.replace(/SIZE/g, SIZE.toFixed(1)),
    });
    simScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial));

    const geo = new THREE.BufferGeometry();
    const uvArr = new Float32Array(COUNT * 2);
    const posArr = new Float32Array(COUNT * 3);
    const seedArr = new Float32Array(COUNT * 4);
    for (let i = 0; i < COUNT; i++) {
        uvArr[i * 2] = (i % SIZE) / SIZE;
        uvArr[i * 2 + 1] = Math.floor(i / SIZE) / SIZE;
        seedArr[i * 4] = Math.random();
        seedArr[i * 4 + 1] = Math.random();
        seedArr[i * 4 + 2] = Math.random();
        seedArr[i * 4 + 3] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
    geo.setAttribute('seeds', new THREE.BufferAttribute(seedArr, 4));

    const renderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uPosition: { value: posTex },
            uTime: { value: 0 },
            uColor1: { value: state.color1 },
            uColor2: { value: state.color2 },
            uColor3: { value: state.color3 },
            uAlpha: { value: 1 },
            uRingPos: { value: new THREE.Vector2(0, 0) },
            uRez: { value: new THREE.Vector2(innerWidth, innerHeight) },
            uParticleScale: { value: (innerWidth / renderer.getPixelRatio() / 2000) * state.particlesScale },
            uPixelRatio: { value: renderer.getPixelRatio() },
            uColorScheme: { value: 0 },
        },
        vertexShader: RENDER_VERT,
        fragmentShader: RENDER_FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
    });

    const points = new THREE.Points(geo, renderMaterial);
    points.scale.set(5, 5, 5);
    scene.add(points);

    const resize = () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
        renderMaterial.uniforms.uRez.value.set(innerWidth, innerHeight);
        renderMaterial.uniforms.uParticleScale.value = (innerWidth / renderer.getPixelRatio() / 2000) * state.particlesScale;
    };
    addEventListener('resize', resize);

    let lastTime = 0;
    let rafId = 0;
    const animate = () => {
        rafId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        const dt = t - lastTime;
        lastTime = t;

        const nx = (noise1D.getVal(t * 0.66 + 94.234) - 0.5) * 2;
        const ny = (noise1D.getVal(t * 0.75 + 21.028) - 0.5) * 2;

        if (mouseIsOver) {
            ray.setFromCamera(mouse, camera);
            ray.ray.intersectPlane(plane, hit);
            cursorPos.set(hit.x * 0.175 + nx * 0.1, hit.y * 0.175 + ny * 0.1);
            ringPos.lerp(cursorPos, 0.02);
        } else {
            cursorPos.set(nx * 0.2, ny * 0.1);
            ringPos.lerp(cursorPos, 0.01);
        }

        simMaterial.uniforms.uPosition.value = everRendered ? rt1.texture : posTex;
        simMaterial.uniforms.uTime.value = t;
        simMaterial.uniforms.uDeltaTime.value = dt;
        simMaterial.uniforms.uRingRadius.value = 0.175 + Math.sin(t) * 0.03 + Math.cos(t * 3) * 0.02;
        simMaterial.uniforms.uRingPos.value.copy(ringPos);

        renderer.setRenderTarget(rt2);
        renderer.render(simScene, simCamera);
        renderer.setRenderTarget(null);

        renderMaterial.uniforms.uPosition.value = rt2.texture;
        renderMaterial.uniforms.uTime.value = t;
        renderMaterial.uniforms.uRingPos.value.copy(ringPos);

        renderer.render(scene, camera);

        [rt1, rt2] = [rt2, rt1];
        everRendered = true;
    };
    animate();

    return {
        setColors: (shades) => {
            if (!shades?.length) return;
            const mid = Math.floor(shades.length / 2);
            state.color1.set(shades[Math.max(0, mid - 2)]);
            state.color2.set(shades[mid]);
            state.color3.set(shades[Math.min(shades.length - 1, mid + 2)]);
        },
        destroy: () => {
            cancelAnimationFrame(rafId);
            removeEventListener('resize', resize);
            removeEventListener('mousemove', onMouseMove);
            removeEventListener('mouseleave', onMouseLeave);
            geo.dispose();
            simMaterial.dispose();
            renderMaterial.dispose();
            posTex.dispose();
            rt1.dispose();
            rt2.dispose();
            renderer.dispose();
        },
    };
};

window.createParticleRing = createParticleRing;
})();
