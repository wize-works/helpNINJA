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

    // Fetch widget configuration from the database if site is provided
    interface WidgetConfig {
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
        messagesBackground?: string;
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
                    fontFamily: dbConfig.font_family,
                    voice: dbConfig.voice || voice,
                    bubbleBackground: dbConfig.bubble_background || '#111',
                    bubbleColor: dbConfig.bubble_color || '#fff',
                    panelBackground: dbConfig.panel_background || '#fff',
                    panelHeaderBackground: dbConfig.panel_header_background || '#f8fafc',
                    messagesBackground: dbConfig.messages_background || '#f8fafc',
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

    const TENANT_JSON = JSON.stringify(tenantId);
    const VOICE_JSON = JSON.stringify(voice);
    const SERVER_CONFIG_JSON = JSON.stringify(widgetConfig);

    // NOTE: We no longer embed a server-derived origin. We compute it client-side from the *script's own src*.
    const js = `(() => {
    // Enhanced utility function to convert hex color to RGB for use with rgba
    function hexToRgb(hex) {
      if (!hex) return '0,0,0'; // Default to black if no color provided
      
      // Handle colors that are already in rgb/rgba format
      if (hex.startsWith('rgb')) {
        const rgbValues = hex.match(/\d+/g);
        if (rgbValues && rgbValues.length >= 3) {
          return rgbValues.slice(0, 3).join(',');
        }
        return '0,0,0';
      }
      
      // Remove the # if present
      hex = hex.replace('#', '');
      
      // Convert 3-digit hex to 6-digit
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      
      // Handle 8-digit hex (with alpha) by removing alpha component
      if (hex.length === 8) {
        hex = hex.substring(0, 6);
      }
      
      // Make sure we have a valid 6-digit hex
      if (hex.length !== 6) {
        return '0,0,0'; // Default to black for invalid hex
      }
      
      try {
        // Extract the RGB components
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        // Check if values are NaN
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
          return '0,0,0';
        }
        
        return r + ',' + g + ',' + b;
      } catch (e) {
        console.error('Error parsing color:', hex, e);
        return '0,0,0';
      }
    }
    
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
    
    // Server-provided configuration from database
    const serverConfig = ${SERVER_CONFIG_JSON};
    
    // Read configuration from helpNINJAConfig if available
    // Client-side config takes precedence over server config for backward compatibility
    const config = Object.assign({}, serverConfig, window.helpNINJAConfig || {});
    
    // Detect system theme preference for 'auto' theme setting
    const prefersDarkTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = config.theme || 'auto';
    const isDarkMode = theme === 'dark' || (theme === 'auto' && prefersDarkTheme);
    
    // Update config with theme-aware colors if needed
    if (isDarkMode && theme === 'auto') {
        // Apply dark mode colors for auto theme
        if (!config.bubbleBackground) config.bubbleBackground = '#1E293B';
        if (!config.bubbleColor) config.bubbleColor = '#fff';
        if (!config.panelBackground) config.panelBackground = '#1E293B';
        if (!config.panelHeaderBackground) config.panelHeaderBackground = '#0f172a';
        if (!config.messagesBackground) config.messagesBackground = '#334155';
        if (!config.assistantBubbleBackground) config.assistantBubbleBackground = '#475569';
        if (!config.assistantBubbleColor) config.assistantBubbleColor = '#f8fafc';
    }
    
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
    const primaryColor = config.primaryColor || '#0077b6';
    
    // Use advancedColors flag to determine whether to use primary color or specific colors
    const useAdvancedColors = config.advancedColors === true;
    
    // Define all colors once at the top to ensure consistency throughout the widget
    const styles = {
      // Base colors - If advancedColors is true, use the specific colors from config; otherwise derive from primaryColor
      primaryColor: primaryColor,
      
      // Button colors
      buttonBackground: useAdvancedColors ? (config.buttonBackground || '#0077b6') : primaryColor,
      buttonColor: config.buttonColor || '#fff',
      buttonHoverBackground: function() {
        const baseColor = useAdvancedColors ? (config.buttonBackground || '#0077b6') : primaryColor;
        return 'rgba(' + hexToRgb(baseColor) + ', 0.8)';
      }(),
      
      // Bubble/widget button colors
      bubbleBackground: useAdvancedColors ? (config.bubbleBackground || '#0077b6') : primaryColor,
      bubbleColor: config.bubbleColor || '#fff',
      
      // Panel colors
      panelBackground: useAdvancedColors ? config.panelBackground || '#fff' : primaryColor,
      panelHeaderBackground: useAdvancedColors ? (config.panelHeaderBackground || '#0077b6') : primaryColor,
      messagesBackground: useAdvancedColors ? config.messagesBackground || '#f8fafc' : '#f8fafc',
      
      // User message colors
      userBubbleBackground: useAdvancedColors ? (config.userBubbleBackground || '#0077b6') : primaryColor,
      userBubbleColor: useAdvancedColors ? config.userBubbleColor || '#fff' : '#fff',
      
      // Assistant message colors
      assistantBubbleBackground: useAdvancedColors 
        ? (config.assistantBubbleBackground || '#e6f2ff') 
        : 'rgba(' + hexToRgb(primaryColor) + ', 0.13)', // Proper transparency using rgba
      assistantBubbleColor: useAdvancedColors ? (config.assistantBubbleColor || '#0077b6') : primaryColor,
      
      // UI Element colors
      focusOutlineColor: 'rgba(' + hexToRgb(useAdvancedColors 
        ? (config.buttonBackground || '#0077b6') 
        : primaryColor) + ', 0.5)',
      headerIconBackground: 'rgba(255,255,255,0.2)',
      avatarBackground: function() {
        const avatarColor = useAdvancedColors ? (config.assistantBubbleColor || '#0077b6') : primaryColor;
        return 'rgba(' + hexToRgb(avatarColor) + ', 0.15)';
      }(),
      borderColor: config.theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      inputBorder: config.theme === 'dark' ? '#374151' : '#e5e7eb'
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
    
    // Add hover effect for the chat bubble
    bubble.addEventListener('mouseover', () => {
      bubble.style.transform = 'scale(1.05)';
      bubble.style.boxShadow = '0 15px 35px rgba(0,0,0,.25)';
    });
    
    bubble.addEventListener('mouseout', () => {
      bubble.style.transform = 'scale(1)';
      bubble.style.boxShadow = '0 10px 30px rgba(0,0,0,.2)';
    });
    
    // Set the button icon based on the configured option
    let iconSvg = '';
    const buttonIcon = config.buttonIcon || 'default';
    
    switch(buttonIcon) {
      case 'chat':
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
        break;
      case 'help':
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        break;
      case 'message':
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
        break;
      default:
        iconSvg = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 956.64 755.1" style="width:35px;height:35px;fill:currentColor;transition:transform 0.3s ease;">
          <path d="M881.79,312.74c39.7-2.7,69.63,32.16,72.85,69.65,2.49,28.99,2.84,71.14,0,99.98-3.32,33.71-25.27,64.29-60.77,68.23-3.79.42-15.01-.53-16.75,1.25-1.57,1.6-3.92,11.56-5.29,14.71-36.91,85.11-121.05,139.58-212.45,148.55-21.08,34.37-64.81,45.83-102.74,37.28-73.64-16.61-62.97-110.41,15.52-118.5,30.57-3.15,53.55-.69,77.04,19.95,4.58,4.03.85,4.59,9.83,3.91,150.57-11.41,192.52-154.99,173.45-284.2-31.77-215.33-222.58-341.22-435.02-298.35C205.65,113.9,108.17,278.52,121.66,467.37c1.64,22.9,8.34,46.43,9.97,68.02,1.48,19.58-12.44,13.97-25.52,14.45-29.32,1.07-49.44,6.57-75.18-11.74-13.35-9.5-21.84-21.17-25.79-37.21-3.43-33.3-6.48-73.04-4.53-106.55,1.9-32.51,14.65-68,48.5-78.5,4.27-1.33,21.8-3.24,23.04-4.96,1.41-1.97,5.57-22.28,7.01-26.99C145.21,69.49,373.1-40.91,587.08,13.95c145.03,37.18,261.97,151.64,294.72,298.79Z"/>
          <path d="M428.45,329.17c42.73-1.25,88.12-1.04,130.7,1.72,66.55,4.31,205.78,20.26,213.38,106.62,8.53,96.89-108.27,127.26-183.69,109.69-28.27-6.59-51.79-21.81-78.66-30.34-68.8-21.84-107.58,30.48-171.03,35.01-65.52,4.67-173.87-28.91-159.04-113.04,17.6-99.83,168.87-107.34,248.34-109.66ZM322.44,399.16c-48.11,6.17-52.08,102.36,2.84,107.6,65.56,6.25,68.28-116.71-2.84-107.6ZM620.45,399.17c-51,5.3-55.76,92.59-5.58,105.99,68.17,18.2,78.14-113.52,5.58-105.99Z"/>
        </svg>\`;
        break;
    }
    
    bubble.innerHTML = iconSvg;
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
    // Helper function to convert hex color to RGB for use with rgba
    function hexToRgb(hex) {
      // Remove the # if present
      hex = hex.replace('#', '');
      
      // Convert 3-digit hex to 6-digit
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      
      // Extract the RGB components
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      
      return r + ',' + g + ',' + b;
    }
    
    const panelPositionStyles = {
      'bottom-right': 'bottom:90px;right:20px;',
      'bottom-left': 'bottom:90px;left:20px;',
      'top-right': 'top:90px;right:20px;',
      'top-left': 'top:90px;left:20px;'
    };
    
    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;' + panelPositionStyles[position] + 'width:360px;max-height:70vh;background:' + styles.panelBackground + ';border:1px solid ' + (config.theme === 'dark' ? '#1e293b' : '#f1f5f9') + ';border-radius:16px;box-shadow:0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);display:none;flex-direction:column;overflow:hidden;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif;z-index:999998;transition:all 0.3s ease;transform-origin:bottom right;animation:fadeInUp 0.3s ease-out forwards;';
    // Create header element with AI name from config
    const aiName = config.aiName || 'helpNINJA';
    const header = document.createElement('div');
        header.style.cssText = 'padding:14px 16px;border-bottom:1px solid ' + styles.borderColor + ';font-weight:600;color:#fff;background:' + styles.panelHeaderBackground + ';display:flex;align-items:center;justify-content:space-between;border-radius:16px 16px 0 0;';
    
    const headerLeft = document.createElement('div');
    headerLeft.style.cssText = 'display:flex;align-items:center;gap:8px;';
    
    const iconContainer = document.createElement('div');
    // Using our predefined headerIconBackground style
    iconContainer.style.cssText = 'width:28px;height:28px;background:' + styles.headerIconBackground + ';border-radius:50%;display:flex;align-items:center;justify-content:center;';
    
    // Use custom SVG based on the configuration
    if (buttonIcon === "chat") {
      iconContainer.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    } else if (buttonIcon === "help") {
      iconContainer.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    } else if (buttonIcon === "message") {
      iconContainer.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
    } else {
      // Default logo
      iconContainer.innerHTML = \`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 956.64 755.1" style="width:16px;height:16px;fill:white">
          <path d="M881.79,312.74c39.7-2.7,69.63,32.16,72.85,69.65,2.49,28.99,2.84,71.14,0,99.98-3.32,33.71-25.27,64.29-60.77,68.23-3.79.42-15.01-.53-16.75,1.25-1.57,1.6-3.92,11.56-5.29,14.71-36.91,85.11-121.05,139.58-212.45,148.55-21.08,34.37-64.81,45.83-102.74,37.28-73.64-16.61-62.97-110.41,15.52-118.5,30.57-3.15,53.55-.69,77.04,19.95,4.58,4.03.85,4.59,9.83,3.91,150.57-11.41,192.52-154.99,173.45-284.2-31.77-215.33-222.58-341.22-435.02-298.35C205.65,113.9,108.17,278.52,121.66,467.37c1.64,22.9,8.34,46.43,9.97,68.02,1.48,19.58-12.44,13.97-25.52,14.45-29.32,1.07-49.44,6.57-75.18-11.74-13.35-9.5-21.84-21.17-25.79-37.21-3.43-33.3-6.48-73.04-4.53-106.55,1.9-32.51,14.65-68,48.5-78.5,4.27-1.33,21.8-3.24,23.04-4.96,1.41-1.97,5.57-22.28,7.01-26.99C145.21,69.49,373.1-40.91,587.08,13.95c145.03,37.18,261.97,151.64,294.72,298.79Z"/>
          <path d="M428.45,329.17c42.73-1.25,88.12-1.04,130.7,1.72,66.55,4.31,205.78,20.26,213.38,106.62,8.53,96.89-108.27,127.26-183.69,109.69-28.27-6.59-51.79-21.81-78.66-30.34-68.8-21.84-107.58,30.48-171.03,35.01-65.52,4.67-173.87-28.91-159.04-113.04,17.6-99.83,168.87-107.34,248.34-109.66ZM322.44,399.16c-48.11,6.17-52.08,102.36,2.84,107.6,65.56,6.25,68.28-116.71-2.84-107.6ZM620.45,399.17c-51,5.3-55.76,92.59-5.58,105.99,68.17,18.2,78.14-113.52,5.58-105.99Z"/>
        </svg>
      \`;
    }
    
    const headerTitle = document.createElement('span');
    headerTitle.textContent = aiName;
    
    headerLeft.appendChild(iconContainer);
    headerLeft.appendChild(headerTitle);
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    closeButton.style.cssText = 'background:rgba(255,255,255,0.1);border:none;color:rgba(255,255,255,0.8);cursor:pointer;padding:6px;border-radius:50%;display:flex;align-items:center;justify-content:center;';
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
    messages.style.cssText = 'padding:16px;gap:16px;display:flex;flex-direction:column;overflow-y:auto;height:360px;background:' + styles.messagesBackground + ';scroll-behavior:smooth;';
    
    // Create input area
    const inputArea = document.createElement('div');
    inputArea.style.cssText = 'display:flex;flex-direction:column;border-top:1px solid ' + styles.inputBorder + ';background:' + styles.panelBackground + ';padding:12px 16px 16px;border-radius:0 0 16px 16px;';
    
    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'display:flex;width:100%;';
    
    const input = document.createElement('input');
    input.id = 'hn_input';
    input.placeholder = 'Type your message...';
    input.style.cssText = 'flex:1;padding:12px 16px;border:1px solid ' + styles.inputBorder + ';border-radius:20px;outline:none;background:#ffffff88;margin-right:8px;transition:border-color 0.2s ease;font-size:14px;';
    input.addEventListener('focus', () => {
      input.style.borderColor = styles.primaryColor;
      input.style.boxShadow = '0 0 0 3px ' + styles.focusOutlineColor;
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = styles.inputBorder;
      input.style.boxShadow = 'none';
    });
    
    const sendButton = document.createElement('button');
    sendButton.id = 'hn_send';
    sendButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
    sendButton.style.cssText = 'display:flex;align-items:center;justify-content:center;width:40px;height:40px;border:0;background:' + styles.buttonBackground + ';color:' + styles.buttonColor + ';cursor:pointer;border-radius:20px;transition:background 0.2s ease;';
    
    // Add hover effect for the send button
    sendButton.addEventListener('mouseover', () => {
      sendButton.style.backgroundColor = styles.buttonHoverBackground;
    });
    
    sendButton.addEventListener('mouseout', () => {
      sendButton.style.backgroundColor = styles.buttonBackground;
    });
    
    // Assemble input row
    inputRow.appendChild(input);
    inputRow.appendChild(sendButton);
    
    // Add input row to input area
    inputArea.appendChild(inputRow);
    
    // Add branding if enabled
    if (config.showBranding !== false) { // Show branding by default unless explicitly disabled
        const brandingDiv = document.createElement('div');
        brandingDiv.style.cssText = 'text-align:center;margin-top:8px;font-size:0.75rem;color:rgba(107, 114, 128, ' + (config.theme === 'dark' ? '0.9' : '0.7') + ');';
        brandingDiv.innerHTML = 'Powered by <a href="https://helpNINJA.ai" target="_blank" style="color:inherit;text-decoration:underline;">helpNINJA</a>';
        inputArea.appendChild(brandingDiv);
    }
    
    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(inputArea);
    document.body.appendChild(panel);

    function add(role, text){
      const wrap = document.getElementById('hn_msgs');
      const chatDiv = document.createElement('div');
      chatDiv.className = role === 'user' ? 'chat chat-end' : 'chat chat-start';
      chatDiv.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;';
      
      // Add avatar icon
      const avatar = document.createElement('div');
      avatar.className = 'chat-avatar';
      avatar.style.cssText = 'width:32px;height:32px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;';
      
      if (role === 'user') {
        avatar.style.backgroundColor = '#e5e7eb';
        avatar.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
      } else {
        // Calculate the color for the assistant avatar background - use the primaryColor with opacity
        const avatarColor = styles.assistantBubbleColor;
        avatar.style.backgroundColor = styles.avatarBackground;
        avatar.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="' + avatarColor + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>';
      }
      
      const bubbleContainer = document.createElement('div');
      bubbleContainer.style.cssText = 'display:flex;flex-direction:column;' + (role === 'user' ? 'align-items:flex-end;' : 'align-items:flex-start;');
      
      const bubble = document.createElement('div');
      
      if (role === 'user') {
        bubble.className = 'chat-bubble';
        bubble.style.cssText = 'white-space:pre-wrap;max-width:280px;background:' + styles.userBubbleBackground + 
          ';color:' + styles.userBubbleColor + ';border-radius:18px;border-top-right-radius:4px;padding:12px 16px;' + 
          'box-shadow:0 1px 2px rgba(0,0,0,0.1);animation:fadeIn 0.3s ease-out;font-size:14px;line-height:1.5;';
        bubbleContainer.appendChild(bubble);
        chatDiv.appendChild(bubbleContainer);
        chatDiv.appendChild(avatar);
      } else {
        // For assistant bubbles, use the assistantBubbleBackground and assistantBubbleColor from styles
        bubble.className = 'chat-bubble';
        bubble.style.cssText = 'white-space:pre-wrap;max-width:280px;background:' + styles.assistantBubbleBackground + 
          ';color:' + styles.assistantBubbleColor + ';border-radius:18px;border-top-left-radius:4px;padding:12px 16px;' + 
          'box-shadow:0 1px 2px rgba(0,0,0,0.1);animation:fadeIn 0.3s ease-out;font-size:14px;line-height:1.5;';
        bubbleContainer.appendChild(bubble);
        chatDiv.appendChild(avatar);
        chatDiv.appendChild(bubbleContainer);
      }
      
      // Simple solution: just set the text directly and use CSS for line breaks
      bubble.textContent = text;
      
      // Use CSS white-space to respect line breaks
      // This avoids any need for innerHTML or splitting on \n
      bubble.style.whiteSpace = 'pre-wrap';
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
        ';color:' + styles.assistantBubbleColor + ';border-radius:18px;border-top-left-radius:4px;padding:12px 16px;box-shadow:0 1px 2px rgba(0,0,0,0.1);';
      
      // Create the typing indicator with dynamic color based on the assistant bubble color
      // Use the same color as the text in the assistant bubble for better visibility
      const indicatorColor = styles.assistantBubbleColor || styles.primaryColor || '#0077b6';
      loadingBubble.innerHTML = '<div class="typing-indicator"><span style="background-color: ' + indicatorColor + '"></span><span style="background-color: ' + indicatorColor + '"></span><span style="background-color: ' + indicatorColor + '"></span></div>';
      
      // Add styles for animations
      const style = document.createElement('style');
      style.textContent = \`
        @keyframes typing {
          0%, 100% { transform: scale(0.7); opacity: 0.5; }
          50% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        input:focus {
          outline: none;
          border-color: ' + config.primaryColor + ';
          box-shadow: 0 0 0 2px ' + config.primaryColor + '20;
        }
        
        .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 4px 8px;
        }
        
        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          /* Color is now set inline for each span */
          opacity: 0.7;
          display: block;
          animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-indicator span:nth-child(1) { animation-delay: 0s; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        
        .chat-bubble {
          animation: fadeIn 0.3s ease-out forwards;
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
          add('assistant', (j && j.answer) || 'I didn&apos;t understand that. Could you try asking in a different way?');
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

    // Function to open the chat panel
    function openChatPanel() {
        const chatMessages = document.getElementById('hn_msgs');
        panel.style.display = 'flex';
        bubble.style.display = 'none';
        
        // When showing panel for first time, display welcome message
        if (chatMessages && chatMessages.children.length === 0) {
            // Show welcome message on first open
            add('assistant', config.welcomeMessage || 'Hi there! How can I help you today?');
            
            // Focus the input field
            setTimeout(() => {
                const inputField = document.getElementById('hn_input');
                if (inputField) inputField.focus();
            }, 100);
        }
    }
    
    // Function to close the chat panel
    function closeChatPanel() {
        panel.style.display = 'none';
        bubble.style.display = 'flex';
    }
    
    // Set up click handler for bubble
    bubble.onclick = () => {
        // Toggle panel visibility
        const isHidden = panel.style.display === 'none' || !panel.style.display;
        if (isHidden) {
            openChatPanel();
        } else {
            closeChatPanel();
        }
    };
    
    // Auto-open chat after delay if configured
    const autoOpenDelay = parseInt(config.autoOpenDelay) || 0;
    if (autoOpenDelay > 0) {
        setTimeout(() => {
            openChatPanel();
        }, autoOpenDelay);
    }
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
