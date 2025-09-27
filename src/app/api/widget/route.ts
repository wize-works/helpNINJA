import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withWidgetCORS } from '@/lib/cors';

export const runtime = 'nodejs';

export async function OPTIONS(req: NextRequest) {
    return withWidgetCORS(new Response(null, { status: 204 }), req);
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

    let refererDomain = '';
    let skipDomainValidation = false;

    if (referer) {
        try {
            const refUrl = new URL(referer);
            refererDomain = refUrl.hostname;

            // If the widget script is being loaded from the same host as this API (dashboard preview),
            // skip domain checks. Compare HOST headers, not req.url origin (which can be internal).
            if (refUrl.host === host || referer.includes("localhost")) {
                skipDomainValidation = true;
            }
        } catch {
            // Invalid referer URL, continue without domain validation
        }
    } else {
        // No referer header provided (some browsers / CSP setups). Allow preview (skip validation)
        // ONLY if siteId or verification token were not supplied – signals likely dashboard or local test usage.
        if (!siteId || !verificationToken) {
            skipDomainValidation = true;
        }
    }

    // Widget script request parameters captured (debug logging removed)

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
                // Domain validation debug details removed
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

    // Fetch widget configuration from the database if site is provided
    interface WidgetConfig {
        siteId?: string;        // Added siteId to pass through to the chat API
        primaryColor?: string;
        advancedColors?: boolean;
        position?: string;
        welcomeMessage?: string;
        aiName?: string;
        showBranding?: boolean;
        autoOpenDelay?: number;
        buttonIcon?: string;
        customIconUrl?: string;
        theme?: string;
        fontFamily?: string;
        voice?: string;
        bubbleBackground?: string;
        bubbleColor?: string;
        panelBackground?: string;
        panelHeaderBackground?: string;
        panelColor?: string;
        panelHeaderColor?: string;
        messagesBackground?: string;
        messagesColor?: string;
        userBubbleBackground?: string;
        userBubbleColor?: string;
        assistantBubbleBackground?: string;
        assistantBubbleColor?: string;
        buttonBackground?: string;
        buttonColor?: string;
    }

    let widgetConfig: WidgetConfig = {};
    if (siteId) {
        try {
            const { rows } = await query(
                `SELECT * FROM widget_configurations WHERE site_id = $1`,
                [siteId]
            );

            if (rows.length > 0) {
                const dbConfig = rows[0];
                // Map database fields to client configuration
                widgetConfig = {
                    siteId: siteId, // Include siteId in widget config
                    primaryColor: dbConfig.primary_color,
                    advancedColors: dbConfig.advanced_colors || false,
                    position: dbConfig.position,
                    welcomeMessage: dbConfig.welcome_message,
                    aiName: dbConfig.ai_name,
                    showBranding: dbConfig.show_branding,
                    autoOpenDelay: dbConfig.auto_open_delay,
                    buttonIcon: dbConfig.button_icon,
                    customIconUrl: dbConfig.custom_icon_url,
                    theme: dbConfig.theme,
                    fontFamily: dbConfig.font_family !== null && dbConfig.font_family !== undefined && dbConfig.font_family !== "undefined" ? dbConfig.font_family : 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
                    voice: dbConfig.voice || voice,
                    bubbleBackground: dbConfig.bubble_background || '#111',
                    bubbleColor: dbConfig.bubble_color || '#fff',
                    panelBackground: dbConfig.panel_background || '#fff',
                    panelHeaderBackground: dbConfig.panel_header_background || '#f8fafc',
                    panelColor: dbConfig.panel_color || '#333333',
                    panelHeaderColor: dbConfig.panel_header_color || '#ffffff',
                    messagesBackground: dbConfig.messages_background || '#f8fafc',
                    messagesColor: dbConfig.messages_color || '#333333',
                    userBubbleBackground: dbConfig.user_bubble_background || '#3b82f6',
                    userBubbleColor: dbConfig.user_bubble_color || '#fff',
                    assistantBubbleBackground: dbConfig.assistant_bubble_background || '#e5e7eb',
                    assistantBubbleColor: dbConfig.assistant_bubble_color || '#111',
                    buttonBackground: dbConfig.button_background || '#111',
                    buttonColor: dbConfig.button_color || '#fff'
                };
            }
        } catch (error) {
            console.error('Widget configuration lookup error:', error);
            // Continue with default configuration if fetch fails
        }
    }

    // --- Server-side color derivation to keep client script minimal ---
    function hexToRgbServer(hex?: string): [number, number, number] {
        if (!hex) return [0, 0, 0];
        if (hex.startsWith('rgb')) {
            const m = hex.match(/\d+/g); if (m && m.length >= 3) return [parseInt(m[0]), parseInt(m[1]), parseInt(m[2])];
            return [0, 0, 0];
        }
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length < 6) return [0, 0, 0];
        return [parseInt(hex.slice(0, 2), 16) || 0, parseInt(hex.slice(2, 4), 16) || 0, parseInt(hex.slice(4, 6), 16) || 0];
    }

    function rgbaFrom(hex: string | undefined, alpha: number) {
        const [r, g, b] = hexToRgbServer(hex); return `rgba(${r},${g},${b},${alpha})`;
    }

    // Helper function to determine if a color is light or dark
    function isLightColor(hex: string): boolean {
        const [r, g, b] = hexToRgbServer(hex);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5;
    }

    // Helper function to get contrasting color for text readability
    function getContrastingColor(backgroundColor: string): string {
        return isLightColor(backgroundColor) ? '#111111' : '#ffffff';
    }

    function derivePalette(baseConfig: any, dark: boolean) { // eslint-disable-line @typescript-eslint/no-explicit-any
        const primary: string = (baseConfig.primaryColor as string) || '#0077b6';
        const advanced = baseConfig.advancedColors === true;

        // Light / dark contextual overrides (mirrors prior client logic)
        const themed: Record<string, unknown> = { ...baseConfig };
        if (dark) {
            if (!themed.bubbleBackground) themed.bubbleBackground = '#1E293B';
            if (!themed.bubbleColor) themed.bubbleColor = '#fff';
            if (!themed.panelBackground) themed.panelBackground = '#1E293B';
            if (!themed.panelHeaderBackground) themed.panelHeaderBackground = '#0f172a';
            if (!themed.messagesBackground) themed.messagesBackground = '#334155';
            if (!themed.assistantBubbleBackground) themed.assistantBubbleBackground = '#475569';
            if (!themed.assistantBubbleColor) themed.assistantBubbleColor = '#f8fafc';
        }

        const buttonBackground: string = advanced ? (themed.buttonBackground as string || primary) : primary;
        const userBubbleBackground: string = advanced ? (themed.userBubbleBackground as string || primary) : primary;
        const assistantBubbleBackground: string = advanced
            ? (themed.assistantBubbleBackground as string || (dark ? '#475569' : '#e6f2ff'))
            : rgbaFrom(primary, 0.13);
        const assistantBubbleColor: string = advanced ? (themed.assistantBubbleColor as string || primary) : primary;
        const avatarBaseColor: string = advanced ? (themed.assistantBubbleColor as string || primary) : primary;

        // Get dynamic fallback colors based on theme
        const defaultPanelBackground = dark ? '#1E293B' : '#ffffff';
        const defaultMessagesBackground = dark ? '#334155' : '#f8fafc';

        return {
            fontFamily: baseConfig.fontFamily,
            primaryColor: primary,
            buttonBackground,
            buttonColor: themed.buttonColor as string || getContrastingColor(buttonBackground),
            buttonHoverBackground: rgbaFrom(buttonBackground, 0.8),
            bubbleBackground: advanced ? (themed.bubbleBackground as string || primary) : primary,
            bubbleColor: themed.bubbleColor as string || getContrastingColor(advanced ? (themed.bubbleBackground as string || primary) : primary),
            panelBackground: advanced ? (themed.panelBackground as string || defaultPanelBackground) : defaultPanelBackground,
            panelHeaderBackground: advanced ? (themed.panelHeaderBackground as string || primary) : primary,
            panelColor: advanced ? (themed.panelColor as string || getContrastingColor(advanced ? (themed.panelBackground as string || defaultPanelBackground) : defaultPanelBackground)) : getContrastingColor(defaultPanelBackground),
            panelHeaderColor: advanced ? (themed.panelHeaderColor as string || getContrastingColor(advanced ? (themed.panelHeaderBackground as string || primary) : primary)) : getContrastingColor(primary),
            messagesBackground: advanced ? (themed.messagesBackground as string || defaultMessagesBackground) : defaultMessagesBackground,
            messagesColor: advanced ? (themed.messagesColor as string || getContrastingColor(advanced ? (themed.messagesBackground as string || defaultMessagesBackground) : defaultMessagesBackground)) : getContrastingColor(defaultMessagesBackground),
            userBubbleBackground,
            userBubbleColor: advanced ? (themed.userBubbleColor as string || getContrastingColor(userBubbleBackground)) : getContrastingColor(userBubbleBackground),
            assistantBubbleBackground,
            assistantBubbleColor,
            focusOutlineColor: rgbaFrom(buttonBackground, 0.5),
            headerIconBackground: rgbaFrom(getContrastingColor(primary), 0.2),
            avatarBackground: rgbaFrom(avatarBaseColor, 0.15),
            // Use buttonBackground for input since they're part of the same send interface
            inputBackground: buttonBackground,
            borderColor: rgbaFrom(buttonBackground, 0.3),
            inputBorder: rgbaFrom(buttonBackground, 0.3),
            // Use buttonColor for input text since they're part of the same send interface
            textColor: themed.buttonColor as string || getContrastingColor(buttonBackground),
            mutedTextColor: rgbaFrom(themed.buttonColor as string || getContrastingColor(buttonBackground), 0.6)
        };
    }

    const paletteLight = derivePalette(widgetConfig, false);
    const paletteDark = derivePalette(widgetConfig, true);

    const payload = {
        tenantId,
        siteId: widgetConfig.siteId || siteId || '',
        voice,
        theme: widgetConfig.theme || 'auto',
        config: widgetConfig,
        paletteLight,
        paletteDark,
    };

    const js = `(() => {
      // Find the origin of this script tag -> safest base for same-host API
      const s = document.currentScript;
      const baseOrigin = (() => {
        try {
          if (s && s.src) return new URL(s.src).origin;
          const scripts = document.getElementsByTagName('script');
          for (let i = scripts.length - 1; i >= 0; i--) {
            const si = scripts[i];
            if (si.src && si.src.includes('/api/widget')) return new URL(si.src).origin;
          }
          return window.location.origin;
        } catch { return window.location.origin; }
      })();
    
      const payload = ${JSON.stringify(payload)};
      payload.baseOrigin = baseOrigin;
    
      // Load the real widget module (cache-busted by version if you like)
      const script = document.createElement('script');
      script.src = baseOrigin + '/api/widget/v1/client.js';
      script.onload = () => {
        if (window.mountChatWidget && typeof window.mountChatWidget === 'function') {
          window.mountChatWidget(payload);
        } else {
          console.error('helpNINJA: Failed to load widget module');
        }
      };
      script.onerror = (err) => {
        console.error('helpNINJA: Error loading widget:', err);
      };
      document.head.appendChild(script);
    })();`;

    return withWidgetCORS(
        new Response(js, {
            headers: {
                'content-type': 'application/javascript; charset=utf-8',
                'cache-control': 'public, max-age=3600'
            }
        }),
        req,
        tenantId
    );
}

