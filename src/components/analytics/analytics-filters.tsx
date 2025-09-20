'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SiteSelector from '@/components/site-selector'

type Range = '7d' | '30d' | '90d' | 'all'

const LS_RANGE_KEY = 'hn_analytics_range'
const LS_SITE_KEY = 'hn_analytics_site'

export function AnalyticsFilters({ initialRange, initialSiteId }: { initialRange: Range; initialSiteId?: string | null }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const currentRange = (searchParams.get('range') as Range) || initialRange
    const currentSite = searchParams.get('siteId') || (initialSiteId || '')

    const setParam = (key: string, value?: string | null) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value && value.length > 0) params.set(key, value)
        else params.delete(key)
        router.push(`/dashboard/analytics?${params.toString()}`)
    }

    const onRange = (r: Range) => {
        try { localStorage.setItem(LS_RANGE_KEY, r) } catch { /* ignore */ }
        setParam('range', r)
    }
    const onSiteChange = (siteId: string | null) => {
        try { localStorage.setItem(LS_SITE_KEY, siteId || '') } catch { /* ignore */ }
        setParam('siteId', siteId || null)
    }

    const isActive = (r: Range) => currentRange === r

    // Initialize from localStorage if URL lacks params
    useEffect(() => {
        const hasRange = !!searchParams.get('range')
        const hasSite = !!searchParams.get('siteId')
        const next = new URLSearchParams(searchParams.toString())
        let changed = false
        if (!hasRange) {
            const storedRange = (typeof window !== 'undefined' ? (localStorage.getItem(LS_RANGE_KEY) as Range | null) : null)
            if (storedRange) { next.set('range', storedRange); changed = true }
        }
        if (!hasSite) {
            const storedSite = typeof window !== 'undefined' ? localStorage.getItem(LS_SITE_KEY) : null
            if (storedSite != null && storedSite.length > 0) { next.set('siteId', storedSite); changed = true }
        }
        if (changed) router.replace(`/dashboard/analytics?${next.toString()}`)
    }, [router, searchParams])

    // Keep localStorage in sync with current params
    useEffect(() => {
        try { if (currentRange) localStorage.setItem(LS_RANGE_KEY, currentRange) } catch { /* ignore */ }
        try { localStorage.setItem(LS_SITE_KEY, currentSite || '') } catch { /* ignore */ }
    }, [currentRange, currentSite])

    return (
        <div className="flex items-center gap-3">
            <div className="join">
                {(['7d', '30d', '90d', 'all'] as Range[]).map(r => (
                    <button key={r} onClick={() => onRange(r)} className={`join-item btn btn-sm ${isActive(r) ? 'btn-primary' : ''}`}>
                        {r === 'all' ? 'ALL' : r.toUpperCase()}
                    </button>
                ))}
            </div>
            <SiteSelector value={currentSite || ''} onChange={onSiteChange} allowNone noneLabel="All sites" className="select-sm" />
        </div>
    )
}
