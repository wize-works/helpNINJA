import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from '@/components/ui/animated-page';
import CopySessionIdButton from '@/components/copy-session-id-button';
import ConversationTranscript from '@/components/conversation-transcript';
import Link from 'next/link';

export const runtime = 'nodejs';

interface Params { id: string }

async function getConversation(tenantId: string, id: string) {
    const convo = await query<{ id: string; session_id: string; created_at: string }>(
        'select id, session_id, created_at from public.conversations where tenant_id=$1 and id=$2 limit 1',
        [tenantId, id]
    );
    // first page (initial)
    const messages = await query<{
        id: string; role: string; content: string; created_at: string; confidence: number | null;
    }>(
        `select id, role, content, created_at, confidence
         from public.messages where tenant_id=$1 and conversation_id=$2
         order by created_at asc limit 50`,
        [tenantId, id]
    );
    const total = await query<{ count: number }>('select count(*)::int as count from public.messages where tenant_id=$1 and conversation_id=$2', [tenantId, id]);
    return { convo: convo.rows[0] || null, messages: messages.rows, total: total.rows[0]?.count || 0 };
}


export default async function ConversationDetailPage({ params }: { params: Promise<Params> }) {
    const { id } = await params;
    const tenantId = await getTenantIdStrict();
    const { convo, messages, total } = await getConversation(tenantId, id);

    const breadcrumbItems = [
        { label: 'Dashboard', href: '/dashboard', icon: 'fa-gauge-high' },
        { label: 'Conversations', href: '/dashboard/conversations', icon: 'fa-messages' },
        { label: convo ? convo.session_id.slice(0, 12) + '…' : 'Not found', icon: 'fa-eye' }
    ];

    return (
        <AnimatedPage>
            <div className="space-y-8">
                <StaggerContainer><StaggerChild><Breadcrumb items={breadcrumbItems} /></StaggerChild></StaggerContainer>
                {!convo && (
                    <div className="alert alert-warning">
                        <i className="fa-duotone fa-solid fa-triangle-exclamation" /> Conversation not found
                    </div>
                )}
                {convo && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold">Conversation</h1>
                                    <p className="text-sm opacity-60 mt-1 font-mono">Session: {convo.session_id}</p>
                                    <p className="text-xs opacity-50 mt-0.5">Started {new Date(convo.created_at).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <HoverScale scale={1.02}>
                                        <Link href="/dashboard/conversations" className="btn btn-sm btn-ghost rounded-lg"><i className="fa-duotone fa-solid fa-arrow-left" /> Back</Link>
                                    </HoverScale>
                                    <CopySessionIdButton sessionId={convo.session_id} />
                                </div>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )}
                {convo && (
                    <div className="card bg-base-100 rounded-2xl shadow-sm p-6">
                        <ConversationTranscript conversationId={convo.id} initialMessages={messages} total={total} />
                    </div>
                )}
            </div>
        </AnimatedPage>
    );
}
