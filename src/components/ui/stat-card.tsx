import { HoverScale } from './animated-page';
import { GlassStatCard } from './glass-stat-card';
import { Suspense } from 'react';

export interface StatCardProps {
    title: string;
    value: string | number;
    description?: React.ReactNode;
    action?: React.ReactNode;
    icon?: string;
    color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
    className?: string;
    glass?: boolean;
    glassIntensity?: 'light' | 'medium' | 'strong';
}

/**
 * DaisyUI-based stat card component
 * Provides consistent styling and behavior across the application
 */
export default function StatCard({
    title,
    value,
    description,
    action,
    icon = 'fa-chart-line',
    color = 'primary',
    className = '',
    glass = false,
    glassIntensity = 'medium'
}: StatCardProps) {
    // Use glass effect if requested - delegate to client component
    if (glass) {
        return (
            <Suspense fallback={
                <HoverScale scale={1.01}>
                    <div className={`stats shadow-lg hover:shadow-xl transition-all duration-300 w-full rounded-2xl ${className}`}>
                        <div className="stat glass rounded-2xl">
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
                                <div className="stat-action">{action}</div>
                            )}
                        </div>
                    </div>
                </HoverScale>
            }>
                <GlassStatCard
                    title={title}
                    value={value}
                    description={description}
                    action={action}
                    icon={icon}
                    color={color}
                    className={className}
                    glassIntensity={glassIntensity}
                />
            </Suspense>
        );
    }

    // Default design when glass is disabled
    return (
        <HoverScale scale={1.01}>
            <div className={`stats shadow-lg hover:shadow-xl transition-all duration-300 w-full rounded-2xl ${className}`}>
                <div className="stat glass rounded-2xl">
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

/**
 * Simple stat card without DaisyUI stats wrapper - for inline usage
 */
export function SimpleStatCard({
    title,
    value,
    description,
    icon = 'fa-chart-line',
    color = 'primary',
    className = '',
    glass = false,
    glassIntensity = 'medium'
}: StatCardProps) {
    if (glass) {
        return (
            <Suspense fallback={
                <HoverScale scale={1.01}>
                    <div className={`card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
                        <div className="card-body p-6">
                            <div className="flex items-center gap-4">
                                {icon && (
                                    <div className={`w-12 h-12 bg-${color}/10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0`}>
                                        <i className={`fa-duotone fa-solid ${icon} text-lg text-${color}`} aria-hidden />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-base-content/70 font-semibold tracking-wide uppercase mb-1">{title}</div>
                                    <div className={`text-2xl font-bold text-${color} tracking-tight`}>{value}</div>
                                    {description && (
                                        <div className="text-xs text-base-content/60 mt-1">{description}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </HoverScale>
            }>
                <GlassStatCard
                    title={title}
                    value={value}
                    description={description}
                    icon={icon}
                    color={color}
                    className={className}
                    glassIntensity={glassIntensity}
                />
            </Suspense>
        );
    }

    return (
        <HoverScale scale={1.01}>
            <div className={`card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
                <div className="card-body p-6">
                    <div className="flex items-center gap-4">
                        {icon && (
                            <div className={`w-12 h-12 bg-${color}/10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0`}>
                                <i className={`fa-duotone fa-solid ${icon} text-lg text-${color}`} aria-hidden />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="text-sm text-base-content/70 font-semibold tracking-wide uppercase mb-1">{title}</div>
                            <div className={`text-2xl font-bold text-${color} tracking-tight`}>{value}</div>
                            {description && (
                                <div className="text-xs text-base-content/60 mt-1">{description}</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </HoverScale>
    );
}
