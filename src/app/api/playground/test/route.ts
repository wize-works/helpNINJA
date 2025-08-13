import { NextRequest, NextResponse } from 'next/server';
import { searchWithCuratedAnswers, searchHybrid } from '@/lib/rag';
import { resolveTenantIdFromRequest } from '@/lib/auth';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const tenantId = body.tenantId || req.headers.get('x-tenant-id') || process.env.DEMO_TENANT_ID || process.env.NEXT_PUBLIC_DEMO_TENANT_ID;

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
        }
        const {
            query: userQuery,
            siteId,
            includeAI = true,
            maxResults = 8,
            voice = 'friendly'
        } = body;

        if (!userQuery?.trim()) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY && includeAI) {
            return NextResponse.json({
                error: 'OpenAI API key not configured - AI responses disabled'
            }, { status: 500 });
        }

        const startTime = Date.now();

        // Search for curated answers and RAG results
        const { curatedAnswers, ragResults } = await searchWithCuratedAnswers(
            tenantId,
            userQuery.trim(),
            maxResults,
            siteId || undefined
        );

        const searchTime = Date.now() - startTime;

        // Prepare response data
        const responseData: {
            query: string;
            search_time_ms: number;
            curated_answers: Array<{
                id: string;
                question: string;
                answer: string;
                priority: number;
                keywords: string[];
                tags: string[];
                confidence: number;
                source: string;
            }>;
            rag_results: Array<{
                id: string;
                title: string;
                content: string;
                url: string;
                snippet: string;
                relevance_score: number;
                source: string;
            }>;
            site_id?: string;
            total_sources: number;
            ai_response?: {
                answer?: string;
                confidence: number;
                response_time_ms?: number;
                source?: string;
                model?: string;
                tokens_used?: number;
                error?: string;
            };
            total_time_ms: number;
            metadata: {
                tenant_id: string;
                site_id?: string;
                timestamp: string;
                search_method: string;
                curated_count: number;
                document_count: number;
                ai_enabled: boolean;
            };
        } = {
            query: userQuery.trim(),
            search_time_ms: searchTime,
            curated_answers: curatedAnswers.map(answer => ({
                id: answer.id,
                question: answer.question,
                answer: answer.answer,
                priority: answer.priority,
                keywords: answer.keywords,
                tags: answer.tags,
                confidence: 0.95, // High confidence for curated answers
                source: 'curated'
            })),
            rag_results: ragResults.map((result, index) => ({
                id: result.id || result.document_id || `chunk_${index}`,
                title: result.title || 'Untitled',
                content: result.content,
                url: result.url,
                snippet: result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''),
                relevance_score: Math.max(0.1, 0.9 - (index * 0.1)), // Simulated relevance
                source: 'documents'
            })),
            site_id: siteId,
            total_sources: curatedAnswers.length + ragResults.length,
            total_time_ms: searchTime,
            metadata: {
                tenant_id: tenantId,
                site_id: siteId,
                timestamp: new Date().toISOString(),
                search_method: 'hybrid',
                curated_count: curatedAnswers.length,
                document_count: ragResults.length,
                ai_enabled: includeAI
            }
        };

        // Generate AI response if requested
        if (includeAI && (curatedAnswers.length > 0 || ragResults.length > 0)) {
            try {
                const aiStartTime = Date.now();

                let aiResponse: string;
                let confidence: number;

                if (curatedAnswers.length > 0) {
                    // Use curated answer directly
                    aiResponse = curatedAnswers[0].answer;
                    confidence = 0.95;
                } else {
                    // Generate AI response from RAG context
                    const contextText = ragResults
                        .map((c, i) => `[[${i + 1}]] ${c.url || 'Source'}\n${c.content}`)
                        .join('\n\n');

                    const systemPrompt = `You are helpNINJA, a helpful AI assistant. Use only the provided Context to answer the user's question. 
If the context doesn't contain relevant information, say you don't know and offer to connect them with support.
Voice: ${voice}. Keep answers concise and helpful.`;

                    const chat = await openai.chat.completions.create({
                        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: `Question: ${userQuery}\n\nContext:\n${contextText}` }
                        ],
                        temperature: 0.7,
                        max_tokens: 500
                    });

                    aiResponse = chat.choices[0]?.message?.content?.trim() ||
                        "I don't have enough information to answer that question. Would you like me to connect you with support?";
                    confidence = chat.choices[0]?.finish_reason === 'stop' ? 0.7 : 0.4;
                }

                const aiTime = Date.now() - aiStartTime;

                responseData.ai_response = {
                    answer: aiResponse,
                    confidence,
                    response_time_ms: aiTime,
                    source: curatedAnswers.length > 0 ? 'curated' : 'generated',
                    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
                    tokens_used: aiResponse.length / 4 // Rough estimate
                };

                responseData.total_time_ms = searchTime + aiTime;
            } catch (aiError) {
                console.error('AI generation error:', aiError);
                responseData.ai_response = {
                    error: 'Failed to generate AI response',
                    confidence: 0
                };
                responseData.total_time_ms = searchTime;
            }
        } else {
            responseData.total_time_ms = searchTime;
            if (includeAI) {
                responseData.ai_response = {
                    answer: "No relevant content found to generate a response.",
                    confidence: 0,
                    source: 'none'
                };
            }
        }

        // Add search metadata
        responseData.metadata = {
            tenant_id: tenantId,
            site_id: siteId,
            timestamp: new Date().toISOString(),
            search_method: 'hybrid',
            curated_count: curatedAnswers.length,
            document_count: ragResults.length,
            ai_enabled: includeAI
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('Playground test error:', error);
        return NextResponse.json({
            error: 'Failed to process test query',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
