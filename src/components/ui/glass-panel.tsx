'use client';

import { forwardRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    intensity?: 'light' | 'medium' | 'strong';
    animated?: boolean;
    respectMotionPreference?: boolean;
    className?: string;
}

/**
 * Hook to detect user's accessibility preferences
 */
export function useAccessibilityPreferences() {
    const [preferences, setPreferences] = useState({
        reducedMotion: false,
        reducedTransparency: false,
        highContrast: false,
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const updatePreferences = () => {
            setPreferences({
                reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                reducedTransparency: window.matchMedia('(prefers-reduced-transparency: reduce)').matches,
                highContrast: window.matchMedia('(prefers-contrast: high)').matches,
            });
        };

        updatePreferences();

        const mediaQueries = [
            window.matchMedia('(prefers-reduced-motion: reduce)'),
            window.matchMedia('(prefers-reduced-transparency: reduce)'),
            window.matchMedia('(prefers-contrast: high)'),
        ];

        mediaQueries.forEach(mq => mq.addEventListener('change', updatePreferences));

        return () => {
            mediaQueries.forEach(mq => mq.removeEventListener('change', updatePreferences));
        };
    }, []);

    return preferences;
}

/**
 * GlassPanel component that creates liquid glass effects with accessibility support
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
    ({
        children,
        intensity = 'medium',
        animated = false,
        respectMotionPreference = true,
        className = '',
        ...props
    }, ref) => {
        const { reducedMotion, reducedTransparency, highContrast } = useAccessibilityPreferences();

        const intensityClasses = {
            light: '[--glass-opacity:0.15] [--glass-blur:10px]',
            medium: '[--glass-opacity:0.25] [--glass-blur:20px]',
            strong: '[--glass-opacity:0.35] [--glass-blur:30px]'
        };

        // Use solid background when transparency is reduced or high contrast is preferred
        const shouldUseGlass = !reducedTransparency && !highContrast;

        const baseClasses = shouldUseGlass
            ? `glass `
            : ' border border-base-300 shadow-lg';

        const combinedClassName = `${baseClasses} ${className}`;

        // Use motion.div only if animation is enabled and motion is not reduced
        if (animated && !reducedMotion && respectMotionPreference) {
            // Create safe props for motion.div
            const motionProps = {
                style: props.style,
                onClick: props.onClick,
                onMouseEnter: props.onMouseEnter,
                onMouseLeave: props.onMouseLeave,
                id: props.id,
                role: props.role,
                ...(props['aria-label'] && { 'aria-label': props['aria-label'] }),
            };

            return (
                <motion.div
                    ref={ref}
                    className={combinedClassName}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    whileHover={shouldUseGlass ? {
                        '--glass-opacity': intensity === 'light' ? 0.2 :
                            intensity === 'medium' ? 0.3 : 0.4,
                        transition: { duration: 0.2 }
                    } : undefined}
                    {...motionProps}
                >
                    {children}
                </motion.div>
            );
        }

        return (
            <div
                ref={ref}
                className={`${combinedClassName} ${animated && shouldUseGlass ? 'hover:[--glass-opacity:0.3] transition-all duration-200' : ''}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);

GlassPanel.displayName = 'GlassPanel';

/**
 * Predefined GlassPanel variants for common use cases
 */
export const GlassCard = {
    Light: forwardRef<HTMLDivElement, Omit<GlassPanelProps, 'intensity'>>(
        ({ className = '', ...props }, ref) => (
            <GlassPanel
                ref={ref}
                intensity="light"
                className={`rounded-2xl p-6 ${className}`}
                {...props}
            />
        )
    ),

    Medium: forwardRef<HTMLDivElement, Omit<GlassPanelProps, 'intensity'>>(
        ({ className = '', ...props }, ref) => (
            <GlassPanel
                ref={ref}
                intensity="medium"
                className={`rounded-2xl p-6 ${className}`}
                {...props}
            />
        )
    ),

    Strong: forwardRef<HTMLDivElement, Omit<GlassPanelProps, 'intensity'>>(
        ({ className = '', ...props }, ref) => (
            <GlassPanel
                ref={ref}
                intensity="strong"
                className={`rounded-2xl p-6 ${className}`}
                {...props}
            />
        )
    )
};

// Set display names for better debugging
GlassCard.Light.displayName = 'GlassCard.Light';
GlassCard.Medium.displayName = 'GlassCard.Medium';
GlassCard.Strong.displayName = 'GlassCard.Strong';

/**
 * Glass button component that works with DaisyUI
 */
export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'default' | 'prominent';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
    ({ children, variant = 'default', size = 'md', className = '', ...props }, ref) => {
        const { reducedTransparency } = useAccessibilityPreferences();

        const sizeClasses = {
            sm: 'btn-sm',
            md: 'btn-md',
            lg: 'btn-lg'
        };

        const variantClasses = variant === 'prominent' ? 'btn-glass-prominent' : 'btn-glass';
        const fallbackClasses = 'btn btn-primary';

        const buttonClasses = reducedTransparency
            ? `btn ${sizeClasses[size]} ${fallbackClasses}`
            : `btn ${sizeClasses[size]} ${variantClasses}`;

        return (
            <button
                ref={ref}
                className={`${buttonClasses} ${className}`}
                {...props}
            >
                {children}
            </button>
        );
    }
);

GlassButton.displayName = 'GlassButton';

export default GlassPanel;