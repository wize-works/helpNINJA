"use client";

interface ConfidenceDisplayProps {
    confidence: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    showPercentage?: boolean;
}

export default function ConfidenceDisplay({ 
    confidence, 
    size = 'md', 
    showLabel = true,
    showPercentage = true 
}: ConfidenceDisplayProps) {
    const percentage = Math.round(confidence * 100);
    
    const getConfidenceLevel = (conf: number) => {
        if (conf >= 0.9) return { level: 'Very High', color: 'success', icon: 'fa-check-circle' };
        if (conf >= 0.7) return { level: 'High', color: 'success', icon: 'fa-thumbs-up' };
        if (conf >= 0.5) return { level: 'Medium', color: 'warning', icon: 'fa-exclamation-triangle' };
        if (conf >= 0.3) return { level: 'Low', color: 'error', icon: 'fa-thumbs-down' };
        return { level: 'Very Low', color: 'error', icon: 'fa-times-circle' };
    };
    
    const { level, color, icon } = getConfidenceLevel(confidence);
    
    const sizeClasses = {
        sm: { progress: 'progress-sm', text: 'text-xs', icon: 'text-xs' },
        md: { progress: '', text: 'text-sm', icon: 'text-sm' },
        lg: { progress: 'progress-lg', text: 'text-base', icon: 'text-base' }
    };
    
    const colorClasses = {
        success: 'progress-success',
        warning: 'progress-warning', 
        error: 'progress-error'
    };
    
    return (
        <div className="space-y-2">
            {/* Progress Bar */}
            <div className="relative">
                <progress 
                    className={`progress ${colorClasses[color as keyof typeof colorClasses]} ${sizeClasses[size].progress} w-full`}
                    value={percentage} 
                    max="100"
                ></progress>
                
                {/* Percentage Overlay */}
                {showPercentage && (
                    <div className={`absolute inset-0 flex items-center justify-center ${sizeClasses[size].text} font-medium text-base-content`}>
                        {percentage}%
                    </div>
                )}
            </div>
            
            {/* Confidence Label */}
            {showLabel && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <i className={`fa-duotone fa-solid ${icon} ${sizeClasses[size].icon} text-${color}`} aria-hidden />
                        <span className={`${sizeClasses[size].text} font-medium text-${color}`}>
                            {level} Confidence
                        </span>
                    </div>
                    
                    <div className={`${sizeClasses[size].text} text-base-content/60`}>
                        {confidence.toFixed(2)}
                    </div>
                </div>
            )}
            
            {/* Confidence Scale Reference */}
            {size === 'lg' && (
                <div className="mt-4 p-3 bg-base-200/40 rounded-lg">
                    <div className="text-xs font-medium text-base-content/80 mb-2">Confidence Scale:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-base-content/60">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-success rounded-full"></div>
                            <span>90-100%: Very High</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-success rounded-full"></div>
                            <span>70-89%: High</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-warning rounded-full"></div>
                            <span>50-69%: Medium</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-error rounded-full"></div>
                            <span>Below 50%: Low</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function ConfidenceBadge({ confidence, size = 'md' }: { confidence: number; size?: 'sm' | 'md' | 'lg' }) {
    const percentage = Math.round(confidence * 100);
    const { level, color } = confidence >= 0.9 
        ? { level: 'Very High', color: 'success' }
        : confidence >= 0.7 
            ? { level: 'High', color: 'success' }
            : confidence >= 0.5 
                ? { level: 'Medium', color: 'warning' }
                : { level: 'Low', color: 'error' };
    
    const sizeClasses = {
        sm: 'badge-sm text-xs',
        md: 'text-sm',
        lg: 'badge-lg text-base'
    };
    
    const colorClasses = {
        success: 'badge-success',
        warning: 'badge-warning',
        error: 'badge-error'
    };
    
    return (
        <div className={`badge ${colorClasses[color as keyof typeof colorClasses]} ${sizeClasses[size]} gap-1`}>
            <span>{percentage}%</span>
            <span className="opacity-80">{level}</span>
        </div>
    );
}
