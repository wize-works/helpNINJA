import { query } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AnimatedPage, StaggerContainer, StaggerChild } from '@/components/ui/animated-page';

export const runtime = 'nodejs';

interface SharedConversationData {
    conversation: {
        id: string;
        session_id: string;
        created_at: string;
        updated_at: string;
        tenant_name: string;
    };
    messages: {
        id: string;
        role: string;
        content: string;
        created_at: string;
        confidence: number | null;
        is_human_response: boolean;
    }[];
    share: {
        created_at: string;
        expires_at: string;
    };
}

async function getSharedConversation(token: string): Promise<SharedConversationData | null> {
    try {
        // Get share info and verify it's not expired
        const shareResult = await query<{
            conversation_id: string;
            tenant_id: string;
            created_at: string;
            expires_at: string;
        }>(
            'SELECT conversation_id, tenant_id, created_at, expires_at FROM public.conversation_shares WHERE token = $1 AND expires_at > NOW()',
            [token]
        );

        if (!shareResult.rows[0]) {
            return null;
        }

        const { conversation_id, tenant_id, created_at: share_created, expires_at: share_expires } = shareResult.rows[0];

        // Get conversation details with tenant name
        const conversationResult = await query<{
            id: string;
            session_id: string;
            created_at: string;
            updated_at: string;
            tenant_name: string;
        }>(
            `SELECT c.id, c.session_id, c.created_at, c.updated_at, t.name as tenant_name
             FROM public.conversations c
             JOIN public.tenants t ON t.id = c.tenant_id
             WHERE c.id = $1 AND c.tenant_id = $2`,
            [conversation_id, tenant_id]
        );

        if (!conversationResult.rows[0]) {
            return null;
        }

        // Get all messages for this conversation
        const messagesResult = await query<{
            id: string;
            role: string;
            content: string;
            created_at: string;
            confidence: number | null;
            is_human_response: boolean;
        }>(
            `SELECT id, role, content, created_at, confidence, COALESCE(is_human_response, false) as is_human_response
             FROM public.messages
             WHERE conversation_id = $1 AND tenant_id = $2
             ORDER BY created_at ASC`,
            [conversation_id, tenant_id]
        );

        return {
            conversation: conversationResult.rows[0],
            messages: messagesResult.rows,
            share: {
                created_at: share_created,
                expires_at: share_expires
            }
        };

    } catch (error) {
        console.error('Error fetching shared conversation:', error);
        return null;
    }
}

export default async function SharedConversationPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    const data = await getSharedConversation(token);

    if (!data) {
        notFound();
    }

    const { conversation, messages, share } = data;
    const expiresAt = new Date(share.expires_at);
    const isExpiringSoon = expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000; // Less than 24 hours

    return (
        <AnimatedPage>
            <div className="min-h-screen bg-base-200">
                {/* Header */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="bg-base-100 border-b border-base-300 px-6 py-4">
                            <div className="max-w-4xl mx-auto">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-share text-lg text-primary" />
                                        </div>
                                        <div>
                                            <h1 className="text-xl font-bold text-base-content">Shared Conversation</h1>
                                            <p className="text-sm text-base-content/60">
                                                From {conversation.tenant_name} • {new Date(conversation.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className={`badge gap-1 ${isExpiringSoon ? 'badge-warning' : 'badge-info'}`}>
                                            <i className="fa-duotone fa-solid fa-clock text-xs" />
                                            Expires {expiresAt.toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Content */}
                <div className="max-w-4xl mx-auto px-6 py-8">
                    <StaggerContainer>
                        {/* Conversation Info */}
                        <StaggerChild>
                            <div className="card bg-base-100 rounded-xl shadow-sm border border-base-300/40 mb-6">
                                <div className="p-6">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <div className="text-base-content/60">Session ID</div>
                                            <div className="font-mono text-base-content">{conversation.session_id.slice(0, 12)}...</div>
                                        </div>
                                        <div>
                                            <div className="text-base-content/60">Messages</div>
                                            <div className="font-semibold text-base-content">{messages.length}</div>
                                        </div>
                                        <div>
                                            <div className="text-base-content/60">Started</div>
                                            <div className="text-base-content">{new Date(conversation.created_at).toLocaleTimeString()}</div>
                                        </div>
                                        <div>
                                            <div className="text-base-content/60">Last Activity</div>
                                            <div className="text-base-content">{new Date(conversation.updated_at).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </StaggerChild>

                        {/* Messages */}
                        <StaggerChild>
                            <div className="card bg-base-100 rounded-xl shadow-sm border border-base-300/40">
                                <div className="border-b border-base-300/40 p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-messages text-sm text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="font-semibold text-base-content">Conversation Transcript</h2>
                                            <p className="text-sm text-base-content/60">{messages.length} messages</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="space-y-4">
                                        {messages.map((message) => (
                                            <div key={message.id} className="flex gap-3">
                                                {/* Avatar */}
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${message.role === 'user'
                                                        ? 'bg-info/10'
                                                        : message.is_human_response
                                                            ? 'bg-success/10'
                                                            : 'bg-primary/10'
                                                    }`}>
                                                    <i className={`text-sm ${message.role === 'user'
                                                            ? 'fa-duotone fa-solid fa-user text-info'
                                                            : message.is_human_response
                                                                ? 'fa-duotone fa-solid fa-headset text-success'
                                                                : 'fa-duotone fa-solid fa-robot text-primary'
                                                        }`} />
                                                </div>

                                                {/* Message Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-sm">
                                                            {message.role === 'user'
                                                                ? 'Customer'
                                                                : message.is_human_response
                                                                    ? 'Support Agent'
                                                                    : 'AI Assistant'
                                                            }
                                                        </span>

                                                        {message.role === 'assistant' && (
                                                            <div className={`badge badge-xs ${message.is_human_response ? 'badge-success' : 'badge-primary'}`}>
                                                                {message.is_human_response ? 'Human' : 'AI'}
                                                            </div>
                                                        )}

                                                        {message.confidence !== null && message.confidence < 0.55 && (
                                                            <div className="badge badge-warning badge-xs">
                                                                Low Confidence
                                                            </div>
                                                        )}

                                                        <span className="text-xs text-base-content/60">
                                                            {new Date(message.created_at).toLocaleTimeString()}
                                                        </span>
                                                    </div>

                                                    <div className="prose prose-sm max-w-none text-base-content/80">
                                                        {message.content.split('\n').map((line, lineIndex) => (
                                                            <p key={lineIndex} className="mb-2 last:mb-0">
                                                                {line}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </StaggerChild>

                        {/* Footer */}
                        <StaggerChild>
                            <div className="text-center py-8 text-sm text-base-content/60">
                                <p>This conversation was shared securely and expires on {expiresAt.toLocaleDateString()} at {expiresAt.toLocaleTimeString()}.</p>
                                <p className="mt-2">
                                    Powered by{' '}
                                    <Link href="https://helpninja.com" className="link link-primary font-medium">
                                        helpNINJA
                                    </Link>
                                </p>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                </div>
            </div>
        </AnimatedPage>
    );
}
