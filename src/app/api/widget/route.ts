import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tenantPublicKey = searchParams.get('t');
    const siteId = searchParams.get('s');
    const siteKey = searchParams.get('k');
    const voice = searchParams.get('voice') || 'friendly';

    // Host info for robust preview-origin detection behind proxies
    const xfHost = req.headers.get('x-forwarded-host') || '';
    const host = xfHost || req.headers.get('host') || '';

    console.log('Widget script request:', {
        tenantPublicKey,
        siteId,
        siteKey,
        voice,
        host,
    });

    // Validate required params (tenant always; site/key validated after we know preview mode)
    if (!tenantPublicKey) return new Response('Missing tenant parameter "t"', { status: 400 });

    // Get referer to validate domain
    const referer = req.headers.get('referer');
    let refererDomain = '';
    let skipDomainValidation = false;

    if (referer) {
        try {
            const refUrl = new URL(referer);
            refererDomain = refUrl.hostname;

            // If the widget script is being loaded from the same host as this API (dashboard preview),
            // skip domain checks. Compare HOST headers, not req.url origin (which can be internal).
            if (refUrl.host === host) {
                skipDomainValidation = true;
            }
        } catch {
            // Invalid referer URL, continue without domain validation
        }
    }

    // Validate domain + site + key if referer is provided
    const previewMode = skipDomainValidation === true;
    let validatedTenantId = '';
    if (refererDomain && !skipDomainValidation) {
        try {
            const { rows: siteRows } = await query<{ tenant_id: string }>(
                `SELECT ts.tenant_id
         FROM public.tenant_sites ts
         JOIN public.tenants t ON t.id = ts.tenant_id
         WHERE t.public_key = $1 AND ts.id = $2 AND ts.script_key = $3 AND ts.domain = $4
               AND ts.verified = true AND ts.status = 'active'
         LIMIT 1`,
                [tenantPublicKey, siteId, siteKey, refererDomain]
            );

            if (siteRows.length === 0) {
                // Provide more granular errors for troubleshooting
                const { rows: meta } = await query(
                    `SELECT ts.domain, ts.verified, ts.status, (ts.script_key = $3) as key_match
           FROM public.tenant_sites ts
           JOIN public.tenants t ON t.id = ts.tenant_id
           WHERE t.public_key = $1 AND ts.id = $2
           LIMIT 1`,
                    [tenantPublicKey, siteId, siteKey]
                );
                if (!meta.length) return new Response('Site not found for tenant', { status: 404 });
                const m = meta[0] as { domain: string; verified: boolean; status: string; key_match: boolean };

                // Detailed error response with debugging info
                const debug = {
                    registeredDomain: m.domain,
                    refererDomain,
                    keyMatch: m.key_match,
                    status: m.status,
                    verified: m.verified
                };

                if (m.domain !== refererDomain) return new Response(`Domain mismatch: Expected ${m.domain}, got ${refererDomain}`, { status: 403 });
                if (!m.key_match) return new Response('Invalid site key', { status: 403 });
                if (m.status !== 'active') return new Response(`Site not active: ${m.status}`, { status: 403 });
                if (!m.verified) return new Response('Domain not verified', { status: 403 });
                return new Response(`Unauthorized: ${JSON.stringify(debug)}`, { status: 403 });
            }
            validatedTenantId = siteRows[0].tenant_id;
        } catch (error) {
            console.error('Domain/site validation error:', error);
            return new Response('Server error', { status: 500 });
        }
    }

    // Require siteId + siteKey when not in preview
    if (!previewMode) {
        if (!siteId) return new Response('Missing site parameter "s"', { status: 400 });
        if (!siteKey) return new Response('Missing site key parameter "k"', { status: 400 });
    }

    // Get tenant ID for the widget (fallback if loaded in preview where referer validation was skipped)
    let tenantId = validatedTenantId;
    if (!tenantId) {
        try {
            const { rows: tenantRows } = await query(
                'SELECT id FROM public.tenants WHERE public_key = $1',
                [tenantPublicKey]
            );
            if (tenantRows.length === 0) return new Response('Invalid tenant', { status: 404 });
            tenantId = (tenantRows[0] as { id: string }).id;
        } catch (error) {
            console.error('Tenant lookup error:', error);
            return new Response('Server error', { status: 500 });
        }
    }

    const TENANT_JSON = JSON.stringify(tenantId);
    const VOICE_JSON = JSON.stringify(voice);

    // NOTE: We no longer embed a server-derived origin. We compute it client-side from the *script's own src*.
    const js = `(() => {
    // compute base from the script tag that loaded this widget (most robust behind proxies)
    const __script = document.currentScript;
    const __base = (() => {
      try {
        if (__script && __script.src) return new URL(__script.src).origin;
        // Fallback: last script tag that points to /api/widget
        const scripts = document.getElementsByTagName('script');
        for (let i = scripts.length - 1; i >= 0; i--) {
          const s = scripts[i];
          if (s.src && s.src.includes('/api/widget')) return new URL(s.src).origin;
        }
        return window.location.origin; // last resort
      } catch (_) { return window.location.origin; }
    })();

    // Load DaisyUI CSS if not already present
    if (!document.querySelector('link[href*="daisyui"]') && !document.querySelector('link[data-hn-styles]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/daisyui@5.0.50/dist/full.css';
      link.setAttribute('data-hn-styles', 'true');
      document.head.appendChild(link);
    }

    const sid = (() => {
      try {
        const existing = localStorage.getItem('hn_sid');
        if (existing) return existing;
        const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'sid_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('hn_sid', uuid);
        return uuid;
      } catch (_) {
        return 'sid_' + Math.random().toString(36).slice(2);
      }
    })();

    const bubble = document.createElement('div');
    bubble.style.cssText = 'position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:30px;box-shadow:0 10px 30px rgba(0,0,0,.2);background:#111;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:999999;transition:all 0.3s ease;';
    bubble.innerHTML = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 956.64 755.1" style="width:35px;height:35px;fill:currentColor;transition:transform 0.3s ease;">
      <path d="M881.79,312.74c39.7-2.7,69.63,32.16,72.85,69.65,2.49,28.99,2.84,71.14,0,99.98-3.32,33.71-25.27,64.29-60.77,68.23-3.79.42-15.01-.53-16.75,1.25-1.57,1.6-3.92,11.56-5.29,14.71-36.91,85.11-121.05,139.58-212.45,148.55-21.08,34.37-64.81,45.83-102.74,37.28-73.64-16.61-62.97-110.41,15.52-118.5,30.57-3.15,53.55-.69,77.04,19.95,4.58,4.03.85,4.59,9.83,3.91,150.57-11.41,192.52-154.99,173.45-284.2-31.77-215.33-222.58-341.22-435.02-298.35C205.65,113.9,108.17,278.52,121.66,467.37c1.64,22.9,8.34,46.43,9.97,68.02,1.48,19.58-12.44,13.97-25.52,14.45-29.32,1.07-49.44,6.57-75.18-11.74-13.35-9.5-21.84-21.17-25.79-37.21-3.43-33.3-6.48-73.04-4.53-106.55,1.9-32.51,14.65-68,48.5-78.5,4.27-1.33,21.8-3.24,23.04-4.96,1.41-1.97,5.57-22.28,7.01-26.99C145.21,69.49,373.1-40.91,587.08,13.95c145.03,37.18,261.97,151.64,294.72,298.79Z"/>
      <path d="M428.45,329.17c42.73-1.25,88.12-1.04,130.7,1.72,66.55,4.31,205.78,20.26,213.38,106.62,8.53,96.89-108.27,127.26-183.69,109.69-28.27-6.59-51.79-21.81-78.66-30.34-68.8-21.84-107.58,30.48-171.03,35.01-65.52,4.67-173.87-28.91-159.04-113.04,17.6-99.83,168.87-107.34,248.34-109.66ZM322.44,399.16c-48.11,6.17-52.08,102.36,2.84,107.6,65.56,6.25,68.28-116.71-2.84-107.6ZM620.45,399.17c-51,5.3-55.76,92.59-5.58,105.99,68.17,18.2,78.14-113.52,5.58-105.99Z"/>
    </svg>\`;
    bubble.onmouseover = () => { bubble.style.transform = 'scale(1.1)'; bubble.querySelector('svg')!.style.transform = 'scale(1.1)'; };
    bubble.onmouseout  = () => { bubble.style.transform = 'scale(1)';     bubble.querySelector('svg')!.style.transform = 'scale(1)'; };
    document.body.appendChild(bubble);

    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;bottom:90px;right:20px;width:360px;max-height:70vh;background:#fff;border:1px solid #ddd;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.15);display:none;flex-direction:column;overflow:hidden;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif;';
    panel.innerHTML = \`
      <div style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;background:#f8fafc;display:flex;align-items:center;gap:8px">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 956.64 755.1" style="width:20px;height:20px">
          <path d="M881.79,312.74c39.7-2.7,69.63,32.16,72.85,69.65,2.49,28.99,2.84,71.14,0,99.98-3.32,33.71-25.27,64.29-60.77,68.23-3.79.42-15.01-.53-16.75,1.25-1.57,1.6-3.92,11.56-5.29,14.71-36.91,85.11-121.05,139.58-212.45,148.55-21.08,34.37-64.81,45.83-102.74,37.28-73.64-16.61-62.97-110.41,15.52-118.5,30.57-3.15,53.55-.69,77.04,19.95,4.58,4.03.85,4.59,9.83,3.91,150.57-11.41,192.52-154.99,173.45-284.2-31.77-215.33-222.58-341.22-435.02-298.35C205.65,113.9,108.17,278.52,121.66,467.37c1.64,22.9,8.34,46.43,9.97,68.02,1.48,19.58-12.44,13.97-25.52,14.45-29.32,1.07-49.44,6.57-75.18-11.74-13.35-9.5-21.84-21.17-25.79-37.21-3.43-33.3-6.48-73.04-4.53-106.55,1.9-32.51,14.65-68,48.5-78.5,4.27-1.33,21.8-3.24,23.04-4.96,1.41-1.97,5.57-22.28,7.01-26.99C145.21,69.49,373.1-40.91,587.08,13.95c145.03,37.18,261.97,151.64,294.72,298.79Z"/>
          <path d="M428.45,329.17c42.73-1.25,88.12-1.04,130.7,1.72,66.55,4.31,205.78,20.26,213.38,106.62,8.53,96.89-108.27,127.26-183.69,109.69-28.27-6.59-51.79-21.81-78.66-30.34-68.8-21.84-107.58,30.48-171.03,35.01-65.52,4.67-173.87-28.91-159.04-113.04,17.6-99.83,168.87-107.34,248.34-109.66ZM322.44,399.16c-48.11,6.17-52.08,102.36,2.84,107.6,65.56,6.25,68.28-116.71-2.84-107.6ZM620.45,399.17c-51,5.3-55.76,92.59-5.58,105.99,68.17,18.2,78.14-113.52,5.58-105.99Z"/>
        </svg>
        helpNINJA
      </div>
      <div id="hn_msgs" style="padding:16px;gap:12px;display:flex;flex-direction:column;overflow-y:auto;max-height:400px;background:#f8fafc"></div>
      <div style="display:flex;border-top:1px solid #e5e7eb;background:#fff">
        <input id="hn_input" placeholder="Ask a question..." style="flex:1;padding:12px 16px;border:0;outline:none;background:transparent" />
        <button id="hn_send" style="padding:12px 16px;border:0;background:#111;color:#fff;cursor:pointer;border-radius:0 0 12px 0">Send</button>
      </div>\`;
    document.body.appendChild(panel);

    function add(role, text){
      const wrap = document.getElementById('hn_msgs');
      const chatDiv = document.createElement('div');
      chatDiv.className = role === 'user' ? 'chat chat-end' : 'chat chat-start';
      const bubble = document.createElement('div');
      bubble.className = role === 'user' ? 'chat-bubble chat-bubble-primary' : 'chat-bubble';
      bubble.style.cssText = 'white-space:pre-wrap;max-width:280px;';
      bubble.textContent = text;
      chatDiv.appendChild(bubble);
      wrap.appendChild(chatDiv);
      wrap.scrollTop = wrap.scrollHeight;
    }

    async function send(){
      const i = document.getElementById('hn_input'); const text = i.value.trim(); if(!text) return;
      i.value=''; add('user', text);
      const r = await fetch(__base + '/api/chat', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body: JSON.stringify({ tenantId: ${TENANT_JSON}, sessionId: sid, message: text, voice: ${VOICE_JSON} })
      });
      let j = null; try { j = await r.json(); } catch(_) {}
      if(!r.ok){ add('assistant', (j && (j.message||j.error)) || 'Sorry, something went wrong.'); return; }
      add('assistant', (j && j.answer) || '…');
    }

    bubble.onclick = () => { panel.style.display = panel.style.display==='none'?'flex':'none'; };
    panel.querySelector('#hn_send').addEventListener('click', send);
    panel.querySelector('#hn_input').addEventListener('keydown', (e)=>{ if(e.key==='Enter') send(); });
  })();`;

    return new Response(js, {
        headers: {
            'content-type': 'application/javascript; charset=utf-8',
            'cache-control': 'public, max-age=3600'
        }
    });
}
