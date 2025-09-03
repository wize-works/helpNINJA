"use client";

import { Suspense } from 'react';
import OutboxTable from '@/components/outbox-table';

export default function OutboxContent() {
    return (
        <Suspense fallback={
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }, (_, i) => (
                        <div key={i} className="animate-pulse bg-base-300/60 h-24 rounded-xl"></div>
                    ))}
                </div>
                <div className="animate-pulse bg-base-300/60 h-96 rounded-2xl"></div>
            </div>
        }>
            <OutboxTable />
        </Suspense>
    );
}
