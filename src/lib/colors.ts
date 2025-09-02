
/**
 * Color utility functions for working with CSS variables in the helpNINJA theme system
 * This file provides functions that work with the CSS variables defined in 
 * ninja-light.css and ninja-dark.css for proper theme support.
 */

/**
 * CSS variable names used in our theme system (ninja-light.css and ninja-dark.css)
 * These are the standard variable names we use throughout the application
 */
export const cssVariables = {
    // Core colors
    primary: '--color-primary',
    primaryContent: '--color-primary-content',
    secondary: '--color-secondary',
    secondaryContent: '--color-secondary-content',
    accent: '--color-accent',
    accentContent: '--color-accent-content',
    neutral: '--color-neutral',
    neutralContent: '--color-neutral-content',

    // Base colors
    base100: '--color-base-100',
    base200: '--color-base-200',
    base300: '--color-base-300',
    baseContent: '--color-base-content',

    // Semantic colors
    info: '--color-info',
    infoContent: '--color-info-content',
    success: '--color-success',
    successContent: '--color-success-content',
    warning: '--color-warning',
    warningContent: '--color-warning-content',
    error: '--color-error',
    errorContent: '--color-error-content',
};

/**
 * Gets the CSS variable reference in HSL format
 * @param cssVariable The CSS variable name (e.g., '--primary', '--secondary')
 * @returns CSS variable reference string that can be used directly in styles
 */
export function getCssVariableRef(cssVariable: string): string {
    return `var(${cssVariable})`;
}

/**
 * Predefined theme color mappings for helpNINJA theme
 * Using CSS variables directly for better theme support
 */
export const themeColors = {
    // Core colors
    primary: () => getCssVariableRef(cssVariables.primary),
    primaryContent: () => getCssVariableRef(cssVariables.primaryContent),
    secondary: () => getCssVariableRef(cssVariables.secondary),
    secondaryContent: () => getCssVariableRef(cssVariables.secondaryContent),
    accent: () => getCssVariableRef(cssVariables.accent),
    accentContent: () => getCssVariableRef(cssVariables.accentContent),
    neutral: () => getCssVariableRef(cssVariables.neutral),
    neutralContent: () => getCssVariableRef(cssVariables.neutralContent),

    // Base colors
    base100: () => getCssVariableRef(cssVariables.base100),
    base200: () => getCssVariableRef(cssVariables.base200),
    base300: () => getCssVariableRef(cssVariables.base300),
    baseContent: () => getCssVariableRef(cssVariables.baseContent),

    // Semantic colors
    info: () => getCssVariableRef(cssVariables.info),
    infoContent: () => getCssVariableRef(cssVariables.infoContent),
    success: () => getCssVariableRef(cssVariables.success),
    successContent: () => getCssVariableRef(cssVariables.successContent),
    warning: () => getCssVariableRef(cssVariables.warning),
    warningContent: () => getCssVariableRef(cssVariables.warningContent),
    error: () => getCssVariableRef(cssVariables.error),
    errorContent: () => getCssVariableRef(cssVariables.errorContent),
} as const;

/**
 * Get chart-friendly colors for data visualization
 * @returns Object with commonly used theme colors as CSS variable references
 */
export function getChartColors() {
    return {
        // Core colors
        primary: themeColors.primary(),
        primaryContent: themeColors.primaryContent(),
        secondary: themeColors.secondary(),
        secondaryContent: themeColors.secondaryContent(),
        accent: themeColors.accent(),
        accentContent: themeColors.accentContent(),

        // Semantic colors
        success: themeColors.success(),
        successContent: themeColors.successContent(),
        warning: themeColors.warning(),
        warningContent: themeColors.warningContent(),
        error: themeColors.error(),
        errorContent: themeColors.errorContent(),
        info: themeColors.info(),
        infoContent: themeColors.infoContent(),

        // Base colors
        neutral: themeColors.neutral(),
        neutralContent: themeColors.neutralContent(),
        base100: themeColors.base100(),
        base200: themeColors.base200(),
        base300: themeColors.base300(),
        baseContent: themeColors.baseContent(),

        // Additional chart-specific colors as CSS variable references
        gradients: {
            primaryToSecondary: [themeColors.primary(), themeColors.secondary()],
            successToInfo: [themeColors.success(), themeColors.info()],
            warningToError: [themeColors.warning(), themeColors.error()],
        },
    };
}
