'use client'

type TopQuestionLike = {
    question: string
    count: number
    avgConfidence: number
    lowConfidenceCount: number
    exampleConversationId?: string
}

export function TopQuestionsExportButton({ items, filename }: { items: TopQuestionLike[]; filename: string }) {
    const handleExport = () => {
        const header = ['question', 'count', 'avg_confidence_percent', 'low_conf_count', 'example_conversation_id']
        const rows = items.map(i => [
            // Escape quotes and wrap in quotes to keep commas safe
            '"' + (i.question ?? '').replaceAll('"', '""') + '"',
            String(i.count ?? 0),
            String(i.avgConfidence ?? 0),
            String(i.lowConfidenceCount ?? 0),
            i.exampleConversationId ? '"' + i.exampleConversationId.replaceAll('"', '""') + '"' : ''
        ].join(','))
        const csv = [header.join(','), ...rows].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <button onClick={handleExport} className="btn btn-ghost btn-xs">
            <i className="fa-duotone fa-solid fa-download text-xs" aria-hidden />
            Export CSV
        </button>
    )
}
