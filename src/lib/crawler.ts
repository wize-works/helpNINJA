import { parseStringPromise } from 'xml2js';
import { JSDOM } from 'jsdom';
import { buildDynamicRenderer } from './dynamic-renderer';

export type CrawledDoc = { url: string; title?: string; content: string };

// User-agent & headers to reduce chance of anti-bot minimal responses
async function fetchHtml(url: string, retries = 3): Promise<string> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, {
                redirect: 'follow',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) helpNINJA-bot/1.0 (+https://helpninja.ai)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });

            if (!res.ok) {
                // Handle authentication/authorization errors gracefully - these are expected
                if (res.status === 401 || res.status === 403) {
                    throw new Error(`ACCESS_DENIED:${res.status}`);
                }
                throw new Error(`fetch ${url} -> ${res.status}`);
            }
            return await res.text();
        } catch (error) {
            const isRedirectError = error instanceof Error &&
                (error.message.includes('redirect count exceeded') ||
                    error.cause?.toString().includes('redirect count exceeded'));

            if (isRedirectError) {
                console.warn(`[crawler] Redirect limit exceeded for ${url}, attempting manual redirect handling`);
                try {
                    // Try with manual redirect handling
                    const res = await fetch(url, {
                        redirect: 'manual',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) helpNINJA-bot/1.0 (+https://helpninja.ai)',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.9'
                        }
                    });

                    // Handle manual redirects with a limit
                    let finalUrl = url;
                    let response = res;
                    let redirectCount = 0;
                    const maxRedirects = 5;

                    while (response.status >= 300 && response.status < 400 && redirectCount < maxRedirects) {
                        const location = response.headers.get('location');
                        if (!location) break;

                        finalUrl = new URL(location, finalUrl).href;
                        redirectCount++;

                        response = await fetch(finalUrl, {
                            redirect: 'manual',
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) helpNINJA-bot/1.0 (+https://helpninja.ai)',
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                'Accept-Language': 'en-US,en;q=0.9'
                            }
                        });
                    }

                    if (response.ok) {
                        return await response.text();
                    } else {
                        // Handle authentication/authorization errors gracefully in manual redirect handling too
                        if (response.status === 401 || response.status === 403) {
                            throw new Error(`ACCESS_DENIED:${response.status}`);
                        }
                        throw new Error(`fetch ${finalUrl} -> ${response.status}`);
                    }
                } catch (manualError) {
                    if (attempt === retries) {
                        // Preserve access denied errors
                        const errorMessage = manualError instanceof Error ? manualError.message : 'Unknown error';
                        if (errorMessage.startsWith('ACCESS_DENIED:')) {
                            throw manualError;
                        }
                        throw new Error(`Failed to fetch ${url} after ${retries + 1} attempts. Last error: ${errorMessage}`);
                    }
                }
            } else {
                // Don't retry access denied errors - they won't succeed on retry
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (errorMessage.startsWith('ACCESS_DENIED:')) {
                    throw error;
                }

                if (attempt === retries) {
                    throw error;
                }
                // Wait before retrying (exponential backoff)
                const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw new Error(`Failed to fetch ${url} after ${retries + 1} attempts`);
}

const dynamicRenderer = buildDynamicRenderer();
const MIN_STATIC_LEN = parseInt(process.env.HEADLESS_MIN_STATIC_LEN || '120', 10);
if (dynamicRenderer) {
    // dynamic renderer enabled
} else {
    if (process.env.ENABLE_HEADLESS_CRAWL === '1') {
        console.warn('[crawler] ENABLE_HEADLESS_CRAWL=1 but dynamic renderer failed to initialize (playwright missing?)');
    }
}
export const crawlerConfig = { headlessEnabled: !!dynamicRenderer, minStaticLen: MIN_STATIC_LEN };

export async function crawl(input: string, maxPages = 40): Promise<CrawledDoc[]> {
    if (input.endsWith('sitemap.xml')) return crawlSitemap(input, maxPages);
    try {
        const html = await fetchHtml(input);
        let doc = extractFromHtml(input, html);
        if (dynamicRenderer && (!doc.content || doc.content.length < MIN_STATIC_LEN)) {
            try {
                const rendered = await dynamicRenderer.render(input);
                if (rendered.html) {
                    const rdoc = extractFromHtml(input, rendered.html);
                    if (rdoc.content.length > doc.content.length) {
                        doc = rdoc;
                        // headless improved content
                    }
                }
            } catch (err) {
                console.warn('[crawler] dynamic render failed', err);
            }
        }
        return [doc];
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        if (errorMessage.startsWith('ACCESS_DENIED:')) {
            const status = errorMessage.split(':')[1];
            console.info(`[crawler] Cannot access protected page (${status}): ${input}`);
            return [];
        }
        console.error('[crawler] Crawl error:', e);
        return [];
    }
}

async function crawlSitemap(url: string, maxPages: number): Promise<CrawledDoc[]> {
    try {
        const xml = await fetchHtml(url);
        const parsed = await parseStringPromise(xml) as { urlset?: { url?: Array<{ loc?: string[] }> } };
        const urls: string[] = (parsed.urlset?.url ?? []).map(u => (u.loc?.[0] || '')).filter(Boolean).slice(0, maxPages);
        const out: CrawledDoc[] = [];
        for (const u of urls) {
            try {
                const html = await fetchHtml(u);
                let doc = extractFromHtml(u, html);
                if (dynamicRenderer && (!doc.content || doc.content.length < MIN_STATIC_LEN)) {
                    try {
                        const rendered = await dynamicRenderer.render(u);
                        if (rendered.html) {
                            const rdoc = extractFromHtml(u, rendered.html);
                            if (rdoc.content.length > doc.content.length) {
                                doc = rdoc;
                                // headless improved content
                            }
                        }
                    } catch (err) { console.warn('[crawler] dynamic render failed', err); }
                }
                out.push(doc);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                if (errorMessage.startsWith('ACCESS_DENIED:')) {
                    const status = errorMessage.split(':')[1];
                    console.info(`[crawler] Skipping protected page (${status}): ${u}`);
                } else {
                    console.warn('[crawler] Failed to crawl sitemap page:', u, err);
                }
            }
        }
        return out;
    } catch (e) {
        console.error('crawl sitemap error', e);
        return [];
    }
}

function extractFromHtml(url: string, html: string): CrawledDoc {
    const { document } = new JSDOM(html).window;
    const title = document.querySelector('title')?.textContent?.trim() ?? url;
    // Remove noisy nodes first
    document.querySelectorAll('script,style,noscript,iframe,svg,canvas,header,footer,nav,form').forEach(n => n.remove());

    const content = extractReadableText(document);
    return { url, title, content };
}

function extractReadableText(document: Document): string {
    const blocks: string[] = [];
    const push = (txt?: string | null) => {
        if (!txt) return;
        const t = txt.replace(/\s+/g, ' ').trim();
        if (t.length >= 30) blocks.push(t);
    };

    // Headings carry high-signal feature words
    document.querySelectorAll('h1,h2,h3').forEach(h => push(h.textContent));
    // Paragraphs & list items
    document.querySelectorAll('p,li').forEach(el => push(el.textContent));

    // If still sparse, pull meta descriptions / og tags
    if (blocks.length < 3) {
        document.querySelectorAll('meta[name=description],meta[property="og:description"],meta[property="og:title"]').forEach(m => {
            const c = m.getAttribute('content');
            push(c);
        });
    }

    // Deduplicate while preserving order
    const seen = new Set<string>();
    const dedup: string[] = [];
    for (const b of blocks) { if (!seen.has(b)) { seen.add(b); dedup.push(b); } }

    return dedup.join('\n\n').trim();
}
