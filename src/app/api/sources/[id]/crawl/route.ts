import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { crawl, type CrawledDoc } from '@/lib/crawler';
import { chunkText } from '@/lib/chunk';
import { embedQuery } from '@/lib/embeddings';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await getTenantIdStrict();
        const params = await ctx.params;
        const { id } = params;

        if (!id) {
            return NextResponse.json({ error: 'Source ID required' }, { status: 400 });
        }

        // Get source details
        const { rows: sourceRows } = await query(
            'SELECT id, kind, url, title, site_id FROM public.sources WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (sourceRows.length === 0) {
            return NextResponse.json({ error: 'Source not found' }, { status: 404 });
        }

        const source = sourceRows[0];

        if (source.kind === 'manual') {
            return NextResponse.json({ error: 'Manual sources cannot be crawled' }, { status: 400 });
        }

        if (!source.url) {
            return NextResponse.json({ error: 'Source has no URL to crawl' }, { status: 400 });
        }

        // Update status to crawling
        await query(
            'UPDATE public.sources SET status = $1 WHERE id = $2',
            ['crawling', id]
        );

        try {
            let documents: CrawledDoc[] = [];

            // Crawl the source URL - the crawl function handles both single pages and sitemaps
            documents = await crawl(source.url);

            if (documents.length === 0) {
                await query(
                    'UPDATE public.sources SET status = $1 WHERE id = $2',
                    ['error', id]
                );
                return NextResponse.json({ error: 'No documents found during crawl' }, { status: 400 });
            }

            let documentsCreated = 0;
            let chunksCreated = 0;

            // Process each document
            for (const doc of documents) {
                // Check if document already exists
                const existing = await query(
                    'SELECT id FROM public.documents WHERE url = $1 AND tenant_id = $2',
                    [doc.url, tenantId]
                );

                let documentId: string;

                if (existing.rowCount === 0) {
                    // Insert new document
                    const docResult = await query(
                        `INSERT INTO public.documents (tenant_id, source_id, url, title, content, site_id) 
                         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                        [tenantId, source.id, doc.url, doc.title, doc.content, source.site_id || null]
                    );
                    documentId = docResult.rows[0].id;
                    documentsCreated++;
                } else {
                    // Update existing document
                    await query(
                        `UPDATE public.documents 
                         SET title = $1, content = $2, source_id = $3, site_id = $4, updated_at = NOW()
                         WHERE id = $5`,
                        [doc.title, doc.content, source.id, source.site_id || null, existing.rows[0].id]
                    );
                    documentId = existing.rows[0].id;

                    // Delete existing chunks for re-processing
                    await query('DELETE FROM public.chunks WHERE document_id = $1', [documentId]);
                }

                // Generate chunks and embeddings
                const chunks = chunkText(doc.content);

                for (const chunk of chunks) {
                    try {
                        const embedding = await embedQuery(chunk);
                        await query(
                            `INSERT INTO public.chunks (tenant_id, document_id, url, content, token_count, embedding, site_id)
                             VALUES ($1, $2, $3, $4, $5, $6::vector, $7)`,
                            [
                                tenantId,
                                documentId,
                                doc.url,
                                chunk,
                                Math.ceil(chunk.length / 4), // Rough token estimate
                                `[${embedding.join(',')}]`,
                                source.site_id || null
                            ]
                        );
                        chunksCreated++;
                    } catch (embeddingError) {
                        console.error('Error generating embedding for chunk:', embeddingError);
                        // Continue with other chunks even if one fails
                    }
                }

                // Update document search vector
                await query(
                    `UPDATE public.documents 
                     SET tsv = to_tsvector('english', coalesce(title,'') || ' ' || content)
                     WHERE id = $1`,
                    [documentId]
                );
            }

            // Update source status and last crawled time
            await query(
                'UPDATE public.sources SET status = $1, last_crawled_at = NOW() WHERE id = $2',
                ['ready', id]
            );

            return NextResponse.json({
                message: 'Crawl completed successfully',
                documentsCreated,
                chunksCreated,
                totalDocuments: documents.length
            });

        } catch (crawlError) {
            console.error('Crawl error:', crawlError);

            // Update status to error
            await query(
                'UPDATE public.sources SET status = $1 WHERE id = $2',
                ['error', id]
            );

            return NextResponse.json({
                error: 'Crawl failed',
                details: crawlError instanceof Error ? crawlError.message : 'Unknown error'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Error triggering crawl:', error);
        return NextResponse.json({ error: 'Failed to trigger crawl' }, { status: 500 });
    }
}
