// Dynamic rendering abstraction to support local headless (Playwright) or future queued external service.
// This allows swapping implementation (e.g., Azure Service Bus job) without changing crawler logic.

export interface DynamicRenderResult {
    html: string;
    mode: 'static' | 'headless' | 'queue';
}

export interface DynamicRenderer {
    render(url: string): Promise<DynamicRenderResult>;
}

// Local headless implementation (Playwright). Loaded lazily so dependency stays optional when disabled.
class PlaywrightRenderer implements DynamicRenderer {
    private timeout: number;
    constructor(timeoutMs: number) { this.timeout = timeoutMs; }
    async render(url: string): Promise<DynamicRenderResult> {
        // Dynamic import so build does not hard-require playwright when disabled
        const mod: unknown = await import('playwright').catch(() => null);
        interface ChromiumLike { launch(opts: { headless: boolean }): Promise<{ newContext(o: { userAgent: string }): Promise<{ newPage(): Promise<PageLike>; }>; close(): Promise<void>; }>; }
        interface PageLike {
            route(pattern: string, handler: (route: RouteLike) => void): Promise<void>;
            goto(u: string, opts: { waitUntil: string; timeout: number }): Promise<void>;
            waitForTimeout(ms: number): Promise<void>;
            waitForSelector(selector: string, opts: { timeout: number }): Promise<void>;
            content(): Promise<string>;
        }
        interface RouteLike { request(): { resourceType?(): string }; abort(): void; continue(): void; }

        const chromium = (mod && typeof mod === 'object' && (mod as Record<string, unknown>).chromium) as unknown as ChromiumLike | undefined;
        if (!chromium) throw new Error('playwright not installed');
        const browser = await chromium.launch({ headless: true });
        const start = Date.now();
        try {
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) helpNINJA-bot/1.0 (+https://helpninja.ai)'
            });
            const page: PageLike = await context.newPage();
            // Block heavy assets to speed up render
            await page.route('**/*', (route: RouteLike) => {
                try {
                    const type = route.request().resourceType?.() || '';
                    if (['image', 'font', 'media', 'stylesheet'].includes(type)) return route.abort();
                } catch { /* ignore */ }
                route.continue();
            });
            await page.goto(url, { waitUntil: 'networkidle', timeout: this.timeout });
            await page.waitForTimeout(500);
            try { await page.waitForSelector('main,article,#root,#__next', { timeout: 1500 }); } catch { /* ignore */ }
            const html = await page.content();
            return { html, mode: 'headless' };
        } finally {
            await browser.close();
            const dur = Date.now() - start;
            if (dur > 4000) console.log(`[dynamic-render] headless render took ${dur}ms ${url}`);
        }
    }
}

// Queue stub (future). For now returns empty html; crawler will treat as no improvement.
class QueueRenderer implements DynamicRenderer {
    async render(url: string): Promise<DynamicRenderResult> {
        void url; // placeholder to satisfy lint
        // TODO: Implement enqueue to Azure Service Bus and polling for result.
        console.warn('[dynamic-render] queue mode selected but not implemented');
        return { html: '', mode: 'queue' };
    }
}

export function buildDynamicRenderer(): DynamicRenderer | null {
    const enabled = process.env.ENABLE_HEADLESS_CRAWL === '1';
    if (!enabled) return null;
    const mode = process.env.DYNAMIC_RENDER_MODE || 'local'; // 'local' | 'queue'
    const timeout = parseInt(process.env.HEADLESS_TIMEOUT_MS || '18000', 10);
    if (mode === 'queue') return new QueueRenderer();
    return new PlaywrightRenderer(timeout);
}
