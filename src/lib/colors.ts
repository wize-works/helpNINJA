/**
 * Color utility functions for converting DaisyUI/Tailwind CSS variables to hex values
 */

/**
 * Converts HSL color values to hex format
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 * @returns Hex color string (e.g., "#ff6b6b")
 */
function hslToHex(h: number, s: number, l: number): string {
    const sNorm = s / 100;
    const lNorm = l / 100;

    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lNorm - c / 2;

    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }

    // Convert to 0-255 range and add the lightness offset
    const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
    const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
    const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
}

/**
 * Gets the computed HSL value from a CSS custom property and converts it to hex
 * @param cssVariable The CSS variable name (e.g., '--p', '--s', '--a')
 * @returns Hex color string or fallback color if variable not found
 */
export function getThemeColorHex(cssVariable: string, fallback: string = '#6366f1'): string {
    if (typeof window === 'undefined') {
        // Server-side fallback
        return fallback;
    }

    try {
        const computedStyle = getComputedStyle(document.documentElement);
        const hslValue = computedStyle.getPropertyValue(cssVariable).trim();
        
        if (!hslValue) {
            return fallback;
        }

        // Parse HSL values from the CSS variable (e.g., "259 94% 51%" or "259deg 94% 51%")
        const hslMatch = hslValue.match(/(\d+(?:\.\d+)?)\s*(?:deg)?\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
        
        if (!hslMatch) {
            // Try alternative format without percentages (some DaisyUI themes use this)
            const altMatch = hslValue.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/);
            if (altMatch) {
                const h = parseFloat(altMatch[1]);
                const s = parseFloat(altMatch[2]);
                const l = parseFloat(altMatch[3]);
                return hslToHex(h, s, l);
            }
            return fallback;
        }

        const h = parseFloat(hslMatch[1]);
        const s = parseFloat(hslMatch[2]);
        const l = parseFloat(hslMatch[3]);

        return hslToHex(h, s, l);
    } catch (error) {
        console.warn(`Failed to convert theme color ${cssVariable}:`, error);
        return fallback;
    }
}

/**
 * Predefined DaisyUI theme color mappings for easy access
 */
export const themeColors = {
    primary: () => getThemeColorHex('--p', '#6366f1'),
    secondary: () => getThemeColorHex('--s', '#7c3aed'),
    accent: () => getThemeColorHex('--a', '#f59e0b'),
    neutral: () => getThemeColorHex('--n', '#374151'),
    base100: () => getThemeColorHex('--b1', '#ffffff'),
    base200: () => getThemeColorHex('--b2', '#f9fafb'),
    base300: () => getThemeColorHex('--b3', '#e5e7eb'),
    info: () => getThemeColorHex('--in', '#0ea5e9'),
    success: () => getThemeColorHex('--su', '#10b981'),
    warning: () => getThemeColorHex('--wa', '#f59e0b'),
    error: () => getThemeColorHex('--er', '#ef4444'),
} as const;

/**
 * Generate a color palette with variations (lighter/darker shades)
 * @param baseColor Hex color string
 * @param variations Number of variations to generate
 * @returns Array of hex color strings
 */
export function generateColorPalette(baseColor: string, variations: number = 5): string[] {
    // Convert hex to HSL first
    const hexToHsl = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return [h * 360, s * 100, l * 100];
    };

    const [h, s, l] = hexToHsl(baseColor);
    const palette: string[] = [];

    // Generate variations by adjusting lightness
    for (let i = 0; i < variations; i++) {
        const lightness = Math.max(10, Math.min(90, l + (i - Math.floor(variations / 2)) * 15));
        palette.push(hslToHex(h, s, lightness));
    }

    return palette;
}

/**
 * Get chart-friendly colors for data visualization
 * @returns Object with commonly used chart colors in hex format
 */
export function getChartColors() {
    return {
        primary: themeColors.primary(),
        secondary: themeColors.secondary(),
        accent: themeColors.accent(),
        success: themeColors.success(),
        warning: themeColors.warning(),
        error: themeColors.error(),
        info: themeColors.info(),
        neutral: themeColors.neutral(),
        // Additional chart-specific colors
        gradients: {
            primaryToSecondary: [themeColors.primary(), themeColors.secondary()],
            successToInfo: [themeColors.success(), themeColors.info()],
            warningToError: [themeColors.warning(), themeColors.error()],
        },
        palette: generateColorPalette(themeColors.primary(), 8),
    };
}
