// Copied from shiny-js-fx/Manta hero-art.html, exposed as window.createManta.
(() => {

const DEFAULTS = {
    hornLength: 15, hornSpacing: 26, hornNotchDepth: 30,
    tailSpread: 0.34, tailLength: 0.9, tailFade: 0.8, tailOpacity: 0.45, tailSpeed: 1,
    bodyCount: 5200, tailCount: 3400, dotSize: 1, color: '142,132,238',
    flapSpeed: 1.5, flapAmount: 1,
    repelRadius: 34, repelStrength: 0.45,
};

const hexToRgbString = (hex) => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `${r},${g},${b}`;
};

const createManta = (canvas, options = {}) => {
    const cfg = { ...DEFAULTS, ...options };
    const ctx = canvas.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0, H = 0, M = 0, ox = 0, oy = 0, dpr = 1;
    let rafId = 0;
    const mouse = { x: -999, y: -999 };

    const resize = () => {
        dpr = Math.min(devicePixelRatio || 1, 2);
        W = innerWidth;
        H = innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        M = Math.min(H * 0.9, W * 0.75);
        ox = W - M * 1.02 - W * 0.03;
        oy = (H - M) / 2;
    };

    const onPointerMove = (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    };

    const onPointerLeave = () => {
        mouse.x = -999;
        mouse.y = -999;
    };

    resize();
    addEventListener('resize', resize);
    addEventListener('pointermove', onPointerMove);
    addEventListener('pointerleave', onPointerLeave);

    const sc = 0.95 / 580;
    let poly = [];
    let body = [];
    let trail = [];

    const buildShape = () => {
        const tipX = 677 + cfg.hornLength;
        const tipY = 428 - cfg.hornSpacing;
        const d = cfg.hornNotchDepth;
        const sp = cfg.hornSpacing;
        const raw = [
            [365, 428], [385, 408], [420, 375], [445, 345], [462, 310], [468, 260], [468, 200], [467, 140],
            [490, 143], [525, 158], [560, 195], [595, 250], [620, 310], [640, 360], [660, 385],
            [tipX, tipY], [tipX - 0.2 * d, tipY + 0.42 * sp], [tipX - 0.73 * d, tipY + 0.81 * sp], [tipX - d, 428],
        ];
        const top = raw.map((p) => [0.835 - (678 - p[0]) * sc, (p[1] - 428) * sc]);
        poly = top.slice();
        for (let i = top.length - 2; i > 0; i--) poly.push([top[i][0], -top[i][1]]);
    };

    const inside = (x, y) => {
        let c = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const a = poly[i], b = poly[j];
            if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
        }
        return c;
    };

    const buildBody = () => {
        body = [];
        while (body.length < cfg.bodyCount) {
            const u = 0.31 + Math.random() * 0.6;
            const dv = (Math.random() * 2 - 1) * 0.48;
            if (!inside(u, dv)) continue;
            if (Math.random() > 0.5 + 0.5 * (1 - Math.abs(dv) / 0.48)) continue;
            body.push({
                u, dv,
                x: ox + u * M,
                y: oy + (0.5 + dv) * M,
                ph: Math.random() * 6.28,
                sp: 0.5 + Math.random() * 1.3,
                r: 0.6 + Math.random() * 0.7,
                a: 0.3 + Math.random() * 0.6,
            });
        }
    };

    const newTrailDot = (init) => ({
        d: init ? Math.random() : 0,
        off: Math.random() + Math.random() - 1,
        sp: 0.08 + Math.random() * 0.25,
        r: 0.5 + Math.random() * 0.6,
        ph: Math.random() * 6.28,
    });

    const buildTrail = () => {
        trail = [];
        for (let k = 0; k < cfg.tailCount; k++) trail.push(newTrailDot(true));
    };

    const set = (o = {}) => {
        let shape = false, bodyN = false, tailN = false;
        Object.keys(o).forEach((k) => {
            if (!(k in DEFAULTS)) return;
            cfg[k] = o[k];
            if (/^horn/.test(k)) shape = true;
            if (k === 'bodyCount') bodyN = true;
            if (k === 'tailCount') tailN = true;
        });
        if (shape) { buildShape(); buildBody(); }
        else if (bodyN) buildBody();
        if (tailN) buildTrail();
        return { ...cfg };
    };

    buildShape();
    buildBody();
    buildTrail();

    const t0 = performance.now();
    const frame = (now) => {
        const t = reduce ? 0 : (now - t0) / 1000;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = `rgb(${cfg.color})`;

        const fs = cfg.flapSpeed;
        const f = Math.sin(t * fs) * cfg.flapAmount;
        const k = (M / 380) * cfg.dotSize;
        const mr = (cfg.repelRadius * M) / 380;

        for (let i = 0; i < body.length; i++) {
            const p = body[i];
            const a = Math.abs(p.dv) / 0.48;
            const wave = Math.sin(t * fs - p.u * 5) * cfg.flapAmount;
            const tu = p.u - a * a * 0.035 * f + Math.cos(t * p.sp + p.ph) * 0.003;
            const tv = 0.5 + p.dv * (1 + 0.04 * f * a) + 0.01 * Math.sin(t * 0.9) + wave * 0.008 * (1 - p.u) + Math.sin(t * p.sp + p.ph) * 0.003;
            let gx = ox + tu * M;
            let gy = oy + tv * M;
            const dx = gx - mouse.x;
            const dy = gy - mouse.y;
            const d2 = dx * dx + dy * dy;
            if (mr > 0 && d2 < mr * mr) {
                const dist = Math.sqrt(d2) || 1;
                const e = 1 - dist / mr;
                const m = e * e * mr * cfg.repelStrength;
                gx += (dx / dist) * m;
                gy += (dy / dist) * m;
            }
            p.x += (gx - p.x) * 0.1;
            p.y += (gy - p.y) * 0.1;
            ctx.globalAlpha = p.a * (0.8 + 0.2 * Math.sin(t * 2.2 * p.sp + p.ph));
            const r = p.r * k;
            ctx.fillRect(p.x, p.y, r, r);
        }

        const tailX = ox + 0.322 * M;
        const Ld = Math.max(tailX, M * cfg.tailLength);
        const cy = oy + 0.5 * M + 0.01 * Math.sin(t * 0.9) * M;
        for (let j = 0; j < trail.length; j++) {
            const q = trail[j];
            if (!reduce) q.d += q.sp * 0.0025 * cfg.tailSpeed;
            if (q.d > 1) Object.assign(q, newTrailDot(false));
            const x = tailX - q.d * Ld;
            const y = cy + q.off * (0.01 + (q.d * Ld / M) * cfg.tailSpread) * M + Math.sin(t * 1.2 - q.d * 6 + q.ph) * 0.012 * q.d * M;
            ctx.globalAlpha = Math.pow(1 - q.d, cfg.tailFade) * cfg.tailOpacity;
            const r2 = q.r * k;
            ctx.fillRect(x, y, r2, r2);
        }

        ctx.globalAlpha = 1;
        if (!reduce) rafId = requestAnimationFrame(frame);
    };

    if (reduce) frame(0);
    else rafId = requestAnimationFrame(frame);

    return {
        set,
        setColors: (shades) => {
            if (!shades?.length) return;
            const baseHex = shades[Math.floor(shades.length / 2)];
            set({ color: hexToRgbString(baseHex) });
        },
        destroy: () => {
            cancelAnimationFrame(rafId);
            removeEventListener('resize', resize);
            removeEventListener('pointermove', onPointerMove);
            removeEventListener('pointerleave', onPointerLeave);
        },
    };
};

window.createManta = createManta;
})();
