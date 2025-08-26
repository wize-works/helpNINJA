import { parseStringPromise } from 'xml2js';
import { JSDOM } from 'jsdom';
import { buildDynamicRenderer } from './dynamic-renderer';

export type CrawledDoc = { url: string; title?: string; content: string };

// User-agent & headers to reduce chance of anti-bot minimal responses
async function fetchHtml(url: string): Promise<string> {
    const res = await fetch(url, {
        redirect: 'follow',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) helpNINJA-bot/1.0 (+https://helpninja.ai)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    });
    if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
    return await res.text();
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
        console.error('crawl error', e);
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
                console.warn('crawl sitemap page failed', u, err);
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
