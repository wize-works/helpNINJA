import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withCORS } from '@/lib/cors';

export const runtime = 'nodejs';

export async function OPTIONS() {
    return withCORS(new Response(null, { status: 204 }));
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tenantPublicKey = searchParams.get('t');
    const siteId = searchParams.get('s');
    // Parameter 'k' contains the verification_token (not script_key)
    // This is what clients currently send and expect to work
    const verificationToken = searchParams.get('k');
    const voice = searchParams.get('voice') || 'friendly';

    // Host info for robust preview-origin detection behind proxies
    const xfHost = req.headers.get('x-forwarded-host') || '';
    const host = xfHost || req.headers.get('host') || '';

    // Validate required params (tenant always; site/key validated after we know preview mode)
    if (!tenantPublicKey) return new Response('Missing tenant parameter "t"', { status: 400 });

    // Get referer to validate domain
    const referer = req.headers.get('referer');
    console.log('Referer:', referer);
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

    console.log('Widget script request:', {
        tenantPublicKey,
        siteId,
        verificationToken,
        voice,
        host,
        refererDomain,
    });

    // Validate domain + site + key if referer is provided
    const previewMode = skipDomainValidation === true;
    let validatedTenantId = '';
    if (refererDomain && !skipDomainValidation) {
        try {
            // Using hostname from referer URL already removes protocol (http/https)
            // We just need to handle cases where the domain is stored with/without www
            // Note: The 'k' parameter contains the verification_token, not script_key
            const { rows: siteRows } = await query<{ tenant_id: string }>(
                `SELECT ts.tenant_id
         FROM public.tenant_sites ts
         JOIN public.tenants t ON t.id = ts.tenant_id
         WHERE t.public_key = $1 AND ts.id = $2 AND ts.verification_token = $3 
               AND (
                   ts.domain = $4 
                   OR REPLACE(ts.domain, 'www.', '') = REPLACE($4, 'www.', '')
                   OR $4 LIKE CONCAT('%', ts.domain) -- Handle cases where domain is stored without protocol
                )
               AND ts.verified = true AND ts.status = 'active'
         LIMIT 1`,
                [tenantPublicKey, siteId, verificationToken, refererDomain]
            );

            if (siteRows.length === 0) {
                // Provide more granular errors for troubleshooting
                const { rows: meta } = await query(
                    `SELECT ts.domain, ts.verified, ts.status, (ts.verification_token = $3) as key_match
           FROM public.tenant_sites ts
           JOIN public.tenants t ON t.id = ts.tenant_id
           WHERE t.public_key = $1 AND ts.id = $2
           LIMIT 1`,
                    [tenantPublicKey, siteId, verificationToken]
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
                console.log('m.domain:', m.domain, 'refererDomain:', refererDomain, 'key_match:', m.key_match, 'status:', m.status, 'verified:', m.verified);
                if (m.domain !== refererDomain) {
                    // Normalize domains by removing www. prefix and any protocol for comparison
                    const normalizedDomain = m.domain.replace(/^www\./, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
                    const normalizedReferer = refererDomain.replace(/^www\./, '').replace(/^https?:\/\//, '').replace(/\/$/, '');

                    // Also check if one is a substring of the other (handles domain.com vs. subdomain.domain.com)
                    if (normalizedDomain !== normalizedReferer &&
                        !normalizedReferer.endsWith(normalizedDomain) &&
                        !normalizedDomain.endsWith(normalizedReferer)) {
                        return new Response(`Domain mismatch: Expected ${m.domain}, got ${refererDomain}`, { status: 403 });
                    }
                }
                if (!m.key_match) return new Response('Invalid verification token', { status: 403 });
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

    // Require siteId + verification token when not in preview mode
    if (!previewMode) {
        if (!siteId) return new Response('Missing site parameter "s"', { status: 400 });
        if (!verificationToken) return new Response('Missing verification token parameter "k"', { status: 400 });
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
    
    // Read configuration from helpNINJAConfig if available
    const config = window.helpNINJAConfig || {};
    const tenantId = ${TENANT_JSON}; // From URL parameters
    const sessionId = (() => {
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
    const voiceStyle = ${VOICE_JSON}; // From URL parameters
    
    // Extract styling from config with defaults
    const primaryColor = config.primaryColor || '#7C3AED';
    const styles = {
      bubbleBackground: config.bubbleBackground || '#111',
      bubbleColor: config.bubbleColor || '#fff',
      panelBackground: config.panelBackground || '#fff', 
      panelHeaderBackground: config.panelHeaderBackground || primaryColor,
      messagesBackground: config.messagesBackground || '#f8fafc',
      userBubbleBackground: config.userBubbleBackground || primaryColor,
      userBubbleColor: config.userBubbleColor || '#fff',
      assistantBubbleBackground: config.assistantBubbleBackground || '#e5e7eb',
      assistantBubbleColor: config.assistantBubbleColor || '#111',
      buttonBackground: config.buttonBackground || primaryColor,
      buttonColor: config.buttonColor || '#fff'
    };

    // Load DaisyUI CSS if not already present
    if (!document.querySelector('link[href*="daisyui"]') && !document.querySelector('link[data-hn-styles]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/daisyui@5.0.50/dist/full.css';
      link.setAttribute('data-hn-styles', 'true');
      document.head.appendChild(link);
    }

    // Session ID is already defined above

    // Get position from config
    const position = config.position || 'bottom-right';
    const positionStyles = {
      'bottom-right': 'bottom:20px;right:20px;',
      'bottom-left': 'bottom:20px;left:20px;',
      'top-right': 'top:20px;right:20px;',
      'top-left': 'top:20px;left:20px;'
    };
    
    const bubble = document.createElement('div');
    bubble.style.cssText = 'position:fixed;' + positionStyles[position] + 'width:60px;height:60px;border-radius:30px;box-shadow:0 10px 30px rgba(0,0,0,.2);background:' + styles.bubbleBackground + ';color:' + styles.bubbleColor + ';display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:999999;transition:all 0.3s ease;';
    bubble.innerHTML = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 956.64 755.1" style="width:35px;height:35px;fill:currentColor;transition:transform 0.3s ease;">
      <path d="M881.79,312.74c39.7-2.7,69.63,32.16,72.85,69.65,2.49,28.99,2.84,71.14,0,99.98-3.32,33.71-25.27,64.29-60.77,68.23-3.79.42-15.01-.53-16.75,1.25-1.57,1.6-3.92,11.56-5.29,14.71-36.91,85.11-121.05,139.58-212.45,148.55-21.08,34.37-64.81,45.83-102.74,37.28-73.64-16.61-62.97-110.41,15.52-118.5,30.57-3.15,53.55-.69,77.04,19.95,4.58,4.03.85,4.59,9.83,3.91,150.57-11.41,192.52-154.99,173.45-284.2-31.77-215.33-222.58-341.22-435.02-298.35C205.65,113.9,108.17,278.52,121.66,467.37c1.64,22.9,8.34,46.43,9.97,68.02,1.48,19.58-12.44,13.97-25.52,14.45-29.32,1.07-49.44,6.57-75.18-11.74-13.35-9.5-21.84-21.17-25.79-37.21-3.43-33.3-6.48-73.04-4.53-106.55,1.9-32.51,14.65-68,48.5-78.5,4.27-1.33,21.8-3.24,23.04-4.96,1.41-1.97,5.57-22.28,7.01-26.99C145.21,69.49,373.1-40.91,587.08,13.95c145.03,37.18,261.97,151.64,294.72,298.79Z"/>
      <path d="M428.45,329.17c42.73-1.25,88.12-1.04,130.7,1.72,66.55,4.31,205.78,20.26,213.38,106.62,8.53,96.89-108.27,127.26-183.69,109.69-28.27-6.59-51.79-21.81-78.66-30.34-68.8-21.84-107.58,30.48-171.03,35.01-65.52,4.67-173.87-28.91-159.04-113.04,17.6-99.83,168.87-107.34,248.34-109.66ZM322.44,399.16c-48.11,6.17-52.08,102.36,2.84,107.6,65.56,6.25,68.28-116.71-2.84-107.6ZM620.45,399.17c-51,5.3-55.76,92.59-5.58,105.99,68.17,18.2,78.14-113.52,5.58-105.99Z"/>
    </svg>\`;
    bubble.onmouseover = () => { 
      bubble.style.transform = 'scale(1.1)'; 
      const svgElement = bubble.querySelector('svg');
      if (svgElement) svgElement.style.transform = 'scale(1.1)';
    };
    bubble.onmouseout = () => { 
      bubble.style.transform = 'scale(1)';
      const svgElement = bubble.querySelector('svg');
      if (svgElement) svgElement.style.transform = 'scale(1)';
    };
    document.body.appendChild(bubble);

    // Set panel position based on bubble position
    const panelPositionStyles = {
      'bottom-right': 'bottom:90px;right:20px;',
      'bottom-left': 'bottom:90px;left:20px;',
      'top-right': 'top:90px;right:20px;',
      'top-left': 'top:90px;left:20px;'
    };
    
    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;' + panelPositionStyles[position] + 'width:360px;max-height:70vh;background:' + styles.panelBackground + ';border:none;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.2);display:none;flex-direction:column;overflow:hidden;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif;z-index:999998;';
    // Create header element with AI name from config
    const aiName = config.aiName || 'helpNINJA';
    const header = document.createElement('div');
    header.style.cssText = 'padding:12px 16px;border-bottom:1px solid rgba(0,0,0,0.1);font-weight:600;color:#fff;background:' + styles.panelHeaderBackground + ';display:flex;align-items:center;justify-content:space-between;';
    
    const headerLeft = document.createElement('div');
    headerLeft.style.cssText = 'display:flex;align-items:center;gap:8px;';
    
    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = 'width:24px;height:24px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;';
    
    iconContainer.innerHTML = \`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 956.64 755.1" style="width:16px;height:16px;fill:white">
          <path d="M881.79,312.74c39.7-2.7,69.63,32.16,72.85,69.65,2.49,28.99,2.84,71.14,0,99.98-3.32,33.71-25.27,64.29-60.77,68.23-3.79.42-15.01-.53-16.75,1.25-1.57,1.6-3.92,11.56-5.29,14.71-36.91,85.11-121.05,139.58-212.45,148.55-21.08,34.37-64.81,45.83-102.74,37.28-73.64-16.61-62.97-110.41,15.52-118.5,30.57-3.15,53.55-.69,77.04,19.95,4.58,4.03.85,4.59,9.83,3.91,150.57-11.41,192.52-154.99,173.45-284.2-31.77-215.33-222.58-341.22-435.02-298.35C205.65,113.9,108.17,278.52,121.66,467.37c1.64,22.9,8.34,46.43,9.97,68.02,1.48,19.58-12.44,13.97-25.52,14.45-29.32,1.07-49.44,6.57-75.18-11.74-13.35-9.5-21.84-21.17-25.79-37.21-3.43-33.3-6.48-73.04-4.53-106.55,1.9-32.51,14.65-68,48.5-78.5,4.27-1.33,21.8-3.24,23.04-4.96,1.41-1.97,5.57-22.28,7.01-26.99C145.21,69.49,373.1-40.91,587.08,13.95c145.03,37.18,261.97,151.64,294.72,298.79Z"/>
          <path d="M428.45,329.17c42.73-1.25,88.12-1.04,130.7,1.72,66.55,4.31,205.78,20.26,213.38,106.62,8.53,96.89-108.27,127.26-183.69,109.69-28.27-6.59-51.79-21.81-78.66-30.34-68.8-21.84-107.58,30.48-171.03,35.01-65.52,4.67-173.87-28.91-159.04-113.04,17.6-99.83,168.87-107.34,248.34-109.66ZM322.44,399.16c-48.11,6.17-52.08,102.36,2.84,107.6,65.56,6.25,68.28-116.71-2.84-107.6ZM620.45,399.17c-51,5.3-55.76,92.59-5.58,105.99,68.17,18.2,78.14-113.52,5.58-105.99Z"/>
        </svg>
    \`;
    
    const headerTitle = document.createElement('span');
    headerTitle.textContent = aiName;
    
    headerLeft.appendChild(iconContainer);
    headerLeft.appendChild(headerTitle);
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    closeButton.style.cssText = 'background:transparent;border:none;color:rgba(255,255,255,0.8);cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;';
    closeButton.onmouseover = () => { closeButton.style.color = '#fff'; };
    closeButton.onmouseout = () => { closeButton.style.color = 'rgba(255,255,255,0.8)'; };
    
    header.appendChild(headerLeft);
    header.appendChild(closeButton);
    
    closeButton.onclick = () => {
      panel.style.display = 'none';
      bubble.style.display = 'flex';
    };
    
    // Create messages container
    const messages = document.createElement('div');
    messages.id = 'hn_msgs';
    messages.style.cssText = 'padding:16px;gap:12px;display:flex;flex-direction:column;overflow-y:auto;height:360px;background:' + styles.messagesBackground + ';scroll-behavior:smooth;';
    
    // Create input area
    const inputArea = document.createElement('div');
    inputArea.style.cssText = 'display:flex;border-top:1px solid #e5e7eb;background:' + styles.panelBackground + ';padding:8px;';
    
    const input = document.createElement('input');
    input.id = 'hn_input';
    input.placeholder = 'Ask a question...';
    input.style.cssText = 'flex:1;padding:10px 16px;border:1px solid #e5e7eb;border-radius:20px;outline:none;background:transparent;margin-right:8px;';
    
    const sendButton = document.createElement('button');
    sendButton.id = 'hn_send';
    sendButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
    sendButton.style.cssText = 'display:flex;align-items:center;justify-content:center;width:40px;height:40px;border:0;background:' + styles.buttonBackground + ';color:' + styles.buttonColor + ';cursor:pointer;border-radius:20px;';
    
    // Assemble everything
    inputArea.appendChild(input);
    inputArea.appendChild(sendButton);
    
    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(inputArea);
    document.body.appendChild(panel);

    function add(role, text){
      const wrap = document.getElementById('hn_msgs');
      const chatDiv = document.createElement('div');
      chatDiv.className = role === 'user' ? 'chat chat-end' : 'chat chat-start';
      chatDiv.style.cssText = 'margin-bottom:12px;';
      
      const bubble = document.createElement('div');
      
      if (role === 'user') {
        bubble.className = 'chat-bubble';
        bubble.style.cssText = 'white-space:pre-wrap;max-width:280px;background:' + styles.userBubbleBackground + 
          ';color:' + styles.userBubbleColor + ';border-radius:18px;padding:12px 16px;box-shadow:0 1px 2px rgba(0,0,0,0.1);';
      } else {
        bubble.className = 'chat-bubble';
        bubble.style.cssText = 'white-space:pre-wrap;max-width:280px;background:' + styles.assistantBubbleBackground + 
          ';color:' + styles.assistantBubbleColor + ';border-radius:18px;padding:12px 16px;box-shadow:0 1px 2px rgba(0,0,0,0.1);';
      }
      
      // Use simple text rendering for now, without markdown
      // The issue is with template literals and escaping inside them
      let formattedText = text.replace(/\n/g, '<br>');
      
      bubble.innerHTML = formattedText;
      chatDiv.appendChild(bubble);
      wrap.appendChild(chatDiv);
      wrap.scrollTop = wrap.scrollHeight;
    }

    async function send(){
      const inputElem = document.getElementById('hn_input'); 
      const sendBtn = document.getElementById('hn_send');
      const text = inputElem.value.trim(); 
      if(!text) return;
      
      // Clear input and disable button while processing
      inputElem.value = ''; 
      add('user', text);
      
      // Add loading indicator
      const loadingId = 'hn_loading_' + Date.now();
      const wrap = document.getElementById('hn_msgs');
      const loadingDiv = document.createElement('div');
      loadingDiv.id = loadingId;
      loadingDiv.className = 'chat chat-start';
      loadingDiv.style.cssText = 'margin-bottom:12px;';
      
      const loadingBubble = document.createElement('div');
      loadingBubble.className = 'chat-bubble';
      loadingBubble.style.cssText = 'white-space:pre-wrap;max-width:280px;background:' + styles.assistantBubbleBackground + 
        ';color:' + styles.assistantBubbleColor + ';border-radius:18px;padding:12px 16px;box-shadow:0 1px 2px rgba(0,0,0,0.1);';
      loadingBubble.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
      
      // Add styles for typing indicator
      const style = document.createElement('style');
      style.textContent = \`
        .typing-indicator {
          display: flex;
          gap: 4px;
        }
        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #888;
          display: block;
          animation: typing 1.4s infinite ease-in-out;
        }
        .typing-indicator span:nth-child(1) { animation-delay: 0s; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing {
          0%, 100% { transform: scale(0.7); opacity: 0.5; }
          50% { transform: scale(1); opacity: 1; }
        }
      \`;
      document.head.appendChild(style);
      
      loadingDiv.appendChild(loadingBubble);
      wrap.appendChild(loadingDiv);
      wrap.scrollTop = wrap.scrollHeight;
      
      // Disable input and button during processing
      inputElem.disabled = true;
      sendBtn.disabled = true;
      
      try {
        const r = await fetch(__base + '/api/chat', {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({ 
            tenantId: config.tenantId || tenantId, 
            sessionId: sessionId, 
            message: text, 
            voice: config.voice || voiceStyle 
          })
        });
        
        // Remove loading indicator
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();
        
        let j = null; 
        try { j = await r.json(); } catch(_) {}
        
        if(!r.ok) { 
          add('assistant', (j && (j.message || j.error)) || 'Sorry, something went wrong.'); 
        } else {
          add('assistant', (j && j.answer) || 'I didn\'t understand that. Could you try asking in a different way?');
        }
      } catch (error) {
        // Remove loading indicator
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();
        
        add('assistant', 'Sorry, there was an error connecting to the server. Please try again later.');
      } finally {
        // Re-enable input and button
        inputElem.disabled = false;
        sendBtn.disabled = false;
        inputElem.focus();
      }
    }

    // Set up click handler for bubble
    bubble.onclick = () => {
        // Toggle panel visibility
        const isHidden = panel.style.display === 'none' || !panel.style.display;
        panel.style.display = isHidden ? 'flex' : 'none';
        bubble.style.display = isHidden ? 'none' : 'flex';
        
        // When showing panel for first time, display welcome message
        const chatMessages = document.getElementById('hn_msgs');
        if (isHidden && chatMessages && chatMessages.children.length === 0) {
            // Show welcome message on first open
            add('assistant', config.welcomeMessage || 'Hi there! How can I help you today?');
            
            // Focus the input field
            setTimeout(() => {
                const inputField = document.getElementById('hn_input');
                if (inputField) inputField.focus();
            }, 100);
        }
    };
    panel.querySelector('#hn_send').addEventListener('click', send);
    panel.querySelector('#hn_input').addEventListener('keydown', (e)=>{ if(e.key==='Enter') send(); });
  })();`;

    return withCORS(new Response(js, {
        headers: {
            'content-type': 'application/javascript; charset=utf-8',
            'cache-control': 'public, max-age=3600'
        }
    }));
}
