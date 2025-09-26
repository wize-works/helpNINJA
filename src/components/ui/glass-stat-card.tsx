'use client';

import { HoverScale } from './animated-page';
import { GlassPanel, useAccessibilityPreferences } from './glass-panel';

export interface GlassStatCardProps {
    title: string;
    value: string | number;
    description?: React.ReactNode;
    action?: React.ReactNode;
    icon?: string;
    color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
    className?: string;
    glassIntensity?: 'light' | 'medium' | 'strong';
}

/**
 * Client-side glass stat card component
 */
export function GlassStatCard({
    title,
    value,
    description,
    action,
    icon = 'fa-chart-line',
    color = 'primary',
    className = '',
    glassIntensity = 'medium'
}: GlassStatCardProps) {
    const { reducedTransparency } = useAccessibilityPreferences();

    // Fall back to non-glass version if accessibility preferences dictate
    if (reducedTransparency) {
        return (
            <HoverScale scale={1.01}>
                <div className={`stats shadow-lg hover:shadow-xl transition-all duration-300 w-full rounded-2xl ${className}`}>
                    <div className="stat bg-base-100 rounded-2xl">
                        <div className="stat-title font-bold uppercase overflow-hidden">{title}</div>
                        {icon && (
                            <div className="stat-figure">
                                <div className={`w-12 h-12 bg-${color}/10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0`}>
                                    <i className={`fa-duotone fa-solid ${icon} text-lg text-${color}`} aria-hidden />
                                </div>
                            </div>
                        )}
                        <div className={`stat-value text-${color}`}>
                            {value}
                        </div>
                        {description && (
                            <div className="stat-desc">{description}</div>
                        )}
                        {action && (
                            <div className="stat-action">
                                {action}
                            </div>
                        )}
                    </div>
                </div>
            </HoverScale>
        );
    }

    return (
        <HoverScale scale={1.01}>
            <GlassPanel
                intensity={glassIntensity}
                animated={true}
                className={`rounded-2xl overflow-hidden w-full ${className}`}
            >
                <div className="p-6">
                    <div className="flex items-center gap-4">
                        {icon && (
                            <div className={`w-12 h-12 bg-${color}/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0`}>
                                <i className={`fa-duotone fa-solid ${icon} text-lg text-${color}`} aria-hidden />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold tracking-wide uppercase mb-1 opacity-80">
                                {title}
                            </div>
                            <div className={`text-2xl font-bold tracking-tight text-${color}`}>
                                {value}
                            </div>
                            {description && (
                                <div className="text-xs mt-1 opacity-60">{description}</div>
                            )}
                        </div>
                    </div>
                    {action && (
                        <div className="mt-4">
                            {action}
                        </div>
                    )}
                </div>
            </GlassPanel>
        </HoverScale>
    );
}