export function tagClass(tag: string): string {
    const t = (tag || '').toLowerCase();
    if (t === 'human') return 'badge-info badge-soft';
    if (t === 'ai') return 'badge-secondary badge-soft';
    if (t === 'escalated') return 'badge-warning badge-soft';
    if (t === 'low-confidence') return 'badge-error badge-soft';
    if (t === 'shared') return 'badge-success badge-soft';
    if (t === 'pending-escalation') return 'badge-warning badge-soft';
    if (t === 'contact') return 'badge-primary badge-soft';
    if (t === 'resolved') return 'badge-success badge-soft';
    if (t === 'human_handling') return 'badge-accent badge-soft';
    return 'badge-ghost badge-soft';
}
