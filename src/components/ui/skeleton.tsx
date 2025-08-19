export function Skeleton({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`animate-pulse bg-base-300 rounded ${className}`}
            {...props}
        />
    );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
    return (
        <div className="space-y-2">
            {/* Header skeleton */}
            <div className="flex gap-4 p-4 border-b border-base-300">
                {Array.from({ length: columns }, (_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                ))}
            </div>
            {/* Row skeletons */}
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="flex gap-4 p-4">
                    {Array.from({ length: columns }, (_, j) => (
                        <Skeleton key={j} className="h-4 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function StatCardSkeleton() {
    return (
        <div className="card bg-base-100 shadow-xl rounded-2xl">
            <div className="card-body">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <div className="mt-2 flex items-end justify-between">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-6 w-12 rounded-full" />
                </div>
            </div>
        </div>
    );
}

export function ChartSkeleton({ height = "h-52" }: { height?: string }) {
    return (
        <div className={`${height} w-full flex items-center justify-center bg-base-200/60 border border-dashed border-base-300 rounded-xl`}>
            <div className="text-center">
                <Skeleton className="w-16 h-16 rounded-full mx-auto mb-2" />
                <Skeleton className="h-4 w-32 mx-auto" />
            </div>
        </div>
    );
} 