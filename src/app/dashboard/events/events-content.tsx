import { loadEvents, Event } from '@/lib/events';

interface Props {
    search?: string;
    event?: string;
    dateRange?: string;
    tenantId: string;
}

export default async function EventsContent({
    search,
    event,
    dateRange,
    tenantId
}: Props) {
    const events = await loadEvents(tenantId, { search, event, dateRange });

    if (events.length === 0) {
        const hasFilters = search || event || dateRange;
        return (
            <div className="text-center py-10 text-base-content/60">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-base-200 flex items-center justify-center">
                        <i className="fa-duotone fa-solid fa-waveform-lines text-xl text-base-content/40" aria-hidden />
                    </div>
                    <div>
                        <p className="font-medium">
                            {hasFilters ? 'No matching events' : 'No events yet'}
                        </p>
                        <p className="text-xs text-base-content/50">
                            {hasFilters
                                ? 'Try adjusting your filters or search terms'
                                : 'Events will appear as users interact & data ingests'
                            }
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="table table-sm">
                <thead>
                    <tr>
                        <th className="w-40">Time</th>
                        <th className="w-56">Event</th>
                        <th>Data</th>
                    </tr>
                </thead>
                <tbody>
                    {events.map((event: Event) => {
                        const ts = new Date(event.created_at);
                        return (
                            <tr key={event.id} className="hover">
                                <td className="align-top whitespace-nowrap text-xs text-base-content/70">
                                    {ts.toLocaleString()}
                                </td>
                                <td className="align-top">
                                    <span className="badge badge-outline badge-sm font-mono uppercase tracking-wide">
                                        {event.name}
                                    </span>
                                </td>
                                <td className="align-top font-mono text-xs whitespace-pre-wrap max-w-[0]">
                                    <pre className="m-0 p-0 leading-snug overflow-x-auto max-w-xl">
                                        {JSON.stringify(event.data as Record<string, unknown>, null, 2)}
                                    </pre>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
