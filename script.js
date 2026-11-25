document.title = 'palette';

// Pick background effect before running: 'ring' | 'manta'
const BACKGROUND_FX = 'manta';

const fxMap = {
    ring: window.createParticleRing,
    manta: window.createManta,
};

const bgCanvas = document.querySelector('#bgCanvas');
const bgFx = fxMap[BACKGROUND_FX](bgCanvas);

const colorInput = document.querySelector('#colorInput');
const colorPicker = document.querySelector('#colorPicker');
const pickDot = document.querySelector('#pickDot');
const colorSubmit = document.querySelector('#colorSubmit');
const resultBox = document.querySelector('.result');

const normalizeHex = (raw) => {
    const clean = raw.trim().replace(/^#/, '');
    if (/^[0-9a-f]{6}$/i.test(clean)) return `#${clean.toLowerCase()}`;
    if (/^[0-9a-f]{3}$/i.test(clean)) {
        return `#${clean.split('').map((c) => c + c).join('').toLowerCase()}`;
    }
    return null;
};

const renderPalette = (rawHex) => {
    const hex = normalizeHex(rawHex);
    colorInput.classList.toggle('invalid', !hex);
    if (!hex) return;

    colorPicker.value = hex;
    pickDot.style.backgroundColor = hex;
    const shades = generateShades(hex);
    resultBox.replaceChildren(...shades.map((shade) => {
        const swatch = document.createElement('div');
        swatch.className = 'swatch';
        swatch.style.backgroundColor = shade;

        const label = document.createElement('p');
        label.textContent = shade;
        swatch.append(label);

        swatch.addEventListener('click', () => {
            navigator.clipboard?.writeText(shade);
            label.textContent = 'copied';
            setTimeout(() => { label.textContent = shade; }, 800);
        });

        return swatch;
    }));

    bgFx.setColors(shades);
};

colorPicker.addEventListener('input', () => {
    colorInput.value = colorPicker.value;
    pickDot.style.backgroundColor = colorPicker.value;
});
colorSubmit.addEventListener('click', () => renderPalette(colorInput.value));
colorInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') renderPalette(colorInput.value);
});
