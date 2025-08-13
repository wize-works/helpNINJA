import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tenantPublicKey = searchParams.get('t');
    const voice = searchParams.get('voice') || 'friendly';
    const originUrl = new URL(req.url);
    const origin = originUrl.origin;

    // Validate tenant public key
    if (!tenantPublicKey) {
        return new Response('Missing tenant parameter', { status: 400 });
    }

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

    // Validate domain if referer is provided
    if (refererDomain && !skipDomainValidation) {
        try {
            const { rows: siteRows } = await query(
                `SELECT ts.domain, ts.verified, t.id as tenant_id
                 FROM public.tenant_sites ts
                 JOIN public.tenants t ON t.id = ts.tenant_id
                 WHERE t.public_key = $1 AND ts.domain = $2 AND ts.verified = true AND ts.status = 'active'`,
                [tenantPublicKey, refererDomain]
            );

            if (siteRows.length === 0) {
                // Check if domain exists but is not verified
                const { rows: unverifiedRows } = await query(
                    `SELECT ts.domain
                     FROM public.tenant_sites ts
                     JOIN public.tenants t ON t.id = ts.tenant_id
                     WHERE t.public_key = $1 AND ts.domain = $2`,
                    [tenantPublicKey, refererDomain]
                );

                if (unverifiedRows.length > 0) {
                    return new Response('Domain not verified', { status: 403 });
                } else {
                    return new Response('Domain not registered', { status: 403 });
                }
            }
        } catch (error) {
            console.error('Domain validation error:', error);
            // Continue without domain validation if DB error occurs
        }
    }

    // Get tenant ID for the widget
    let tenantId = '';
    try {
        const { rows: tenantRows } = await query(
            'SELECT id FROM public.tenants WHERE public_key = $1',
            [tenantPublicKey]
        );

        if (tenantRows.length === 0) {
            return new Response('Invalid tenant', { status: 404 });
        }

        tenantId = tenantRows[0].id;
    } catch (error) {
        console.error('Tenant lookup error:', error);
        return new Response('Server error', { status: 500 });
    }
    // sanitize variables for embedding into inline JS
    const TENANT_JSON = JSON.stringify(tenantId);
    const VOICE_JSON = JSON.stringify(voice);
    const ORIGIN_JSON = JSON.stringify(origin);
    const js = `(() => {
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
    panel.style.cssText = 'position:fixed;bottom:90px;right:20px;width:340px;max-height:70vh;background:#fff;border:1px solid #ddd;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.15);display:none;flex-direction:column;overflow:hidden;';

    panel.innerHTML = \`
      <div style="padding:10px 12px;border-bottom:1px solid #eee;font-weight:600">HelpNinja</div>
      <div id="hn_msgs" style="padding:12px;gap:8px;display:flex;flex-direction:column;overflow:auto"></div>
      <div style="display:flex;border-top:1px solid #eee">
        <input id="hn_input" placeholder="Ask a question..." style="flex:1;padding:10px;border:0;outline:none" />
        <button id="hn_send" style="padding:10px 14px;border:0;background:#111;color:#fff;cursor:pointer">Send</button>
      </div>\`;
    document.body.appendChild(panel);

    function add(role, text){
      const wrap = document.getElementById('hn_msgs');
      const b = document.createElement('div');
      b.style.cssText = 'background:'+(role==='user'?'#eef2ff':'#f8fafc')+';padding:10px;border-radius:8px;white-space:pre-wrap;';
      b.textContent = text; wrap.appendChild(b); wrap.scrollTop = wrap.scrollHeight;
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
