import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tenantPublicKey = searchParams.get('t');
    const siteId = searchParams.get('s');
    const siteKey = searchParams.get('k');
    const voice = searchParams.get('voice') || 'friendly';
    const originUrl = new URL(req.url);
    const origin = originUrl.origin;

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
            // If the widget script is being loaded from the same origin as the API
            // (e.g., inside the dashboard preview iframe), skip domain checks.
            if (refUrl.origin === origin) {
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
                 WHERE t.public_key = $1 AND ts.id = $2 AND ts.script_key = $3 AND ts.domain = $4 AND ts.verified = true AND ts.status = 'active'
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
                if (m.domain !== refererDomain) return new Response('Domain mismatch for site', { status: 403 });
                if (!m.key_match) return new Response('Invalid site key', { status: 403 });
                if (m.status !== 'active') return new Response('Site not active', { status: 403 });
                if (!m.verified) return new Response('Domain not verified', { status: 403 });
                return new Response('Unauthorized', { status: 403 });
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
            tenantId = tenantRows[0].id;
        } catch (error) {
            console.error('Tenant lookup error:', error);
            return new Response('Server error', { status: 500 });
        }
    }
    const TENANT_JSON = JSON.stringify(tenantId);
    const VOICE_JSON = JSON.stringify(voice);
    const ORIGIN_JSON = JSON.stringify(origin);
    const js = `(() => {
        // Load DaisyUI CSS if not already present
        if (!document.querySelector('link[href*="daisyui"]') && !document.querySelector('script[data-hn-styles]')) {
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
    bubble.style.cssText = 'position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:28px;box-shadow:0 10px 30px rgba(0,0,0,.2);background:#111;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:999999;';
    bubble.innerText = '🗨️';
    document.body.appendChild(bubble);

    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;bottom:90px;right:20px;width:360px;max-height:70vh;background:#fff;border:1px solid #ddd;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.15);display:none;flex-direction:column;overflow:hidden;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif;';

    panel.innerHTML = \`
      <div style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;background:#f8fafc">helpNINJA</div>
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
    const r = await fetch(${ORIGIN_JSON} + '/api/chat', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ tenantId: ${TENANT_JSON}, sessionId: sid, message: text, voice: ${VOICE_JSON} })});
  let j = null; try { j = await r.json(); } catch(_) {}
  if(!r.ok){ add('assistant', (j && (j.message||j.error)) || 'Sorry, something went wrong.'); return; }
  add('assistant', (j && j.answer) || '…');
    }

    bubble.onclick = () => { panel.style.display = panel.style.display==='none'?'flex':'none'; };
    panel.querySelector('#hn_send').addEventListener('click', send);
    panel.querySelector('#hn_input').addEventListener('keydown', (e)=>{ if(e.key==='Enter') send(); });
  })();`;

    return new Response(js, { headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
