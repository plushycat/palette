// How much each shade changes. Bigger number = bigger jump between shades.
const STEP_SIZE = 0.15;

// STEP 1: Split "#3b82f6" into three numbers.
const hexToRgbNumbers = (hexCode) => {
    const withoutHash = hexCode.replace('#', '');

    const red = parseInt(withoutHash.slice(0, 2), 16);   // "3b" → 59
    const green = parseInt(withoutHash.slice(2, 4), 16); // "82" → 130
    const blue = parseInt(withoutHash.slice(4, 6), 16);  // "f6" → 246

    return { red, green, blue };
};

// STEP 2: Turn three numbers back into a hex code.
const rgbNumbersToHex = ({ red, green, blue }) => {
    // Each number becomes 2 hex digits. "f" becomes "0f".
    const toTwoDigitHex = (number) =>
        Math.round(number).toString(16).padStart(2, '0');

    return `#${toTwoDigitHex(red)}${toTwoDigitHex(green)}${toTwoDigitHex(blue)}`;
};

// STEP 3: Mix a color with white. amount 0 = no change, 1 = pure white.
const mixWithWhite = ({ red, green, blue }, amount) => ({
    red: red + (255 - red) * amount,
    green: green + (255 - green) * amount,
    blue: blue + (255 - blue) * amount,
});

// STEP 4: Mix a color with black. amount 0 = no change, 1 = pure black.
const mixWithBlack = ({ red, green, blue }, amount) => ({
    red: red * (1 - amount),
    green: green * (1 - amount),
    blue: blue * (1 - amount),
});

// STEP 5: Build the full list of shades.
const generateShades = (baseHexCode, shadeCount = 9) => {
    const baseColor = hexToRgbNumbers(baseHexCode);

    // The base color goes in the middle position.
    // Example: 9 shades → middle is position 4 (counting from 0).
    const middleIndex = Math.floor(shadeCount / 2);

    const shades = [];

    for (let shadeIndex = 0; shadeIndex < shadeCount; shadeIndex++) {
        // Negative = darker side. Positive = lighter side. Zero = base color.
        const distanceFromMiddle = shadeIndex - middleIndex;

        // Farther from the middle = stronger mix.
        const mixAmount = Math.abs(distanceFromMiddle) * STEP_SIZE;

        let shadeColor;

        if (distanceFromMiddle < 0) {
            shadeColor = mixWithBlack(baseColor, mixAmount);
        } else if (distanceFromMiddle > 0) {
            shadeColor = mixWithWhite(baseColor, mixAmount);
        } else {
            shadeColor = baseColor;
        }

        shades.push(rgbNumbersToHex(shadeColor));
    }

    return shades; // darkest first, lightest last
};

// EXAMPLE
// generateShades('#3b82f6');     // 9 shades
// generateShades('#3b82f6', 5);  // 5 shades