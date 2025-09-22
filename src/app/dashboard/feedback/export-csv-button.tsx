"use client";
import { useSearchParams } from 'next/navigation';

export default function ExportCsvButton() {
    const params = useSearchParams();
    const onClick = () => {
        const q = new URLSearchParams();
        const keys = ['type', 'status', 'priority', 'search', 'siteId', 'days'] as const;
        keys.forEach((k) => {
            const v = params.get(k);
            if (v) q.set(k, v);
        });
        const url = `/api/feedback/export${q.toString() ? `?${q.toString()}` : ''}`;
        window.open(url, '_blank');
    };
    return (
        <button onClick={onClick} className="btn btn-primary rounded-xl">
            <i className="fa-duotone fa-solid fa-download" />
            Export CSV
        </button>
    );
}
