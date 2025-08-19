import { parseStringPromise } from 'xml2js';
import { JSDOM } from 'jsdom';

export type CrawledDoc = { url: string; title?: string; content: string };

export async function crawl(input: string, maxPages = 40): Promise<CrawledDoc[]> {
    if (input.endsWith('sitemap.xml')) return crawlSitemap(input, maxPages);
    try {
        const res = await fetch(input, { redirect: 'follow' });
        const html = await res.text();
        const doc = extractFromHtml(input, html);
        return [doc];
    } catch { return []; }
}

async function crawlSitemap(url: string, maxPages: number): Promise<CrawledDoc[]> {
    const res = await fetch(url);
    const xml = await res.text();
    const parsed = await parseStringPromise(xml) as { urlset?: { url?: Array<{ loc?: string[] }> } };
    const urls: string[] = (parsed.urlset?.url ?? []).map(u => (u.loc?.[0] || '')).filter(Boolean).slice(0, maxPages);
    const out: CrawledDoc[] = [];
    for (const u of urls) {
        try {
            const r = await fetch(u, { redirect: 'follow' });
            const html = await r.text();
            out.push(extractFromHtml(u, html));
        } catch { }
    }
    return out;
}

function extractFromHtml(url: string, html: string): CrawledDoc {
    const { document } = new JSDOM(html).window;
    const title = document.querySelector('title')?.textContent?.trim() ?? url;
    document.querySelectorAll('script,style,noscript,header,footer,nav').forEach((n: Element) => n.remove());
    const content = document.body?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

    // Ensure we have some meaningful content - if empty, use the title as content
    const finalContent = content.length > 0 ? content : `${title} - No content extracted from this page`;

    return { url, title, content: finalContent };
}
