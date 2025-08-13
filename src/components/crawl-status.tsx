"use client";

interface CrawlStatusProps {
    status: 'ready' | 'crawling' | 'error' | 'disabled';
    className?: string;
}

export default function CrawlStatus({ status, className = '' }: CrawlStatusProps) {
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'ready':
                return {
                    color: 'bg-success/10 text-success border-success/20',
                    icon: 'fa-check-circle',
                    label: 'Ready'
                };
            case 'crawling':
                return {
                    color: 'bg-info/10 text-info border-info/20',
                    icon: 'fa-spinner-third fa-spin',
                    label: 'Crawling'
                };
            case 'error':
                return {
                    color: 'bg-error/10 text-error border-error/20',
                    icon: 'fa-exclamation-circle',
                    label: 'Error'
                };
            case 'disabled':
                return {
                    color: 'bg-base-300/60 text-base-content/60 border-base-300',
                    icon: 'fa-pause-circle',
                    label: 'Disabled'
                };
            default:
                return {
                    color: 'bg-base-300/60 text-base-content/60 border-base-300',
                    icon: 'fa-question-circle',
                    label: 'Unknown'
                };
        }
    };

    const config = getStatusConfig(status);

    return (
        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium border ${config.color} ${className}`}>
            <i className={`fa-duotone fa-solid ${config.icon}`} aria-hidden />
            <span>{config.label}</span>
        </div>
    );
}
